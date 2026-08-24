// Pilote de génération des attaques apprises.
//
// Séparé de generer.js à dessein : la réserve principale (espèces, formes,
// Pokédex, fiches) et les attaques ne bougent pas au même rythme, et surtout
// elles ne pèsent pas le même poids. Tout regénérer pour rafraîchir les
// capacités reviendrait à réécrire 1,4 Mo déjà justes, et à risquer de les
// perdre parce qu'un CSV sur quinze a été refusé.
//
// La page qui charge ce script est l'application privée de sa couche Tauri :
// on dispose donc de fetchCsvRows et de la liste des entrées, sans les
// réécrire.
//
// Usage : cd app && py outils/serveur-generation.py
//         puis http://127.0.0.1:8124/outils/generer-attaques.html

const sortie = document.createElement('pre');
sortie.style.cssText = 'position:fixed;inset:0;z-index:9999;margin:0;padding:24px;'
  + 'background:#0e0f14;color:#e8e9f0;font:13px/1.7 monospace;overflow:auto;white-space:pre-wrap';
document.body.appendChild(sortie);

const journal = [];
function dire(texte){
  journal.push(texte);
  sortie.textContent = journal.join('\n');
}

// La méthode « machine » : c'est elle qu'on encode en drapeaux plutôt qu'en
// liste, parce qu'elle représente six lignes sur dix. Nommée autrement que la
// constante de fiche.js, que la page de génération charge aussi.
const PAR_MACHINE = 4;

const LANGUE_FR = '5';
const LANGUE_EN = '9';

// Deux colonnes de noms (fr, en) rangées par identifiant. Même règle que dans
// generer.js : une traduction absente retombe sur l'autre langue.
function nomsParId(lignes, colId, colNom, colLangue){
  const out = {};
  lignes.forEach(function(r){
    const id = r[colId], langue = r[colLangue], nom = (r[colNom] || '').trim();
    if(!nom) return;
    if(langue !== LANGUE_FR && langue !== LANGUE_EN) return;
    if(!out[id]) out[id] = {};
    out[id][langue === LANGUE_FR ? 'fr' : 'en'] = nom;
  });
  Object.keys(out).forEach(function(id){
    out[id].fr = out[id].fr || out[id].en;
    out[id].en = out[id].en || out[id].fr;
  });
  return out;
}

// Base 36 : un identifiant de capacité tient en deux caractères au lieu de
// trois, un niveau en deux au lieu de trois. Sur six cent mille lignes, la
// différence se compte en mégaoctets.
const CHIFFRES36 = '0123456789abcdefghijklmnopqrstuvwxyz';
function b36(n){
  if(n === 0) return '0';
  let s = '';
  while(n > 0){ s = CHIFFRES36[n % 36] + s; n = Math.floor(n / 36); }
  return s;
}

// Un tableau de bits en base64. Sert aux CT : « ce Pokémon apprend-il la CT
// n° i de ce jeu ? » est une question à un bit, et les machines représentent à
// elles seules six lignes sur dix.
function bitsEnBase64(octets){
  let brut = '';
  for(let i = 0; i < octets.length; i++) brut += String.fromCharCode(octets[i]);
  return btoa(brut).replace(/=+$/, '');
}

// « Épée: L'île solitaire de l'Armure » + « Bouclier: L'île solitaire de
// l'Armure » donne « Épée / Bouclier — L'île solitaire de l'Armure ». Sans
// cette mise en facteur, le nom du groupe ferait deux lignes dans la fiche.
function nomGroupe(noms){
  if(!noms.length) return '';
  if(noms.length === 1) return noms[0];
  const coupe = noms[0].indexOf(': ');
  if(coupe > 0){
    const suffixe = noms[0].slice(coupe + 2);
    const tousPareils = noms.every(function(n){ return n.slice(-suffixe.length - 2) === ': ' + suffixe; });
    if(tousPareils){
      return noms.map(function(n){ return n.slice(0, n.length - suffixe.length - 2); }).join(' / ')
        + ' — ' + suffixe;
    }
  }
  return noms.join(' / ');
}

// Les entrées que l'application connaît, lues dans la réserve principale
// plutôt que dans allEntries : la page de génération n'exécute pas le
// démarrage, et allEntries y reste vide.
function entreesEmbarquees(){
  if(typeof DONNEES_EMBARQUEES === 'undefined') return [];
  const ids = new Set();
  (DONNEES_EMBARQUEES.entrees || []).forEach(function(e){ ids.add(e.id); });
  (DONNEES_EMBARQUEES.formes || []).forEach(function(f){ ids.add(f.id); });
  return Array.from(ids);
}

async function construireAttaques(){
  dire('1/3  Téléchargement des tables…');
  const [capacitesRaw, capacitesNoms, apprises, machinesRaw, objets,
         groupesRaw, versionsRaw, versionsNoms] = await Promise.all([
    fetchCsvRows('moves.csv'),
    fetchCsvRows('move_names.csv'),
    fetchCsvRows('pokemon_moves.csv'),
    fetchCsvRows('machines.csv'),
    fetchCsvRows('items.csv'),
    fetchCsvRows('version_groups.csv'),
    fetchCsvRows('versions.csv'),
    fetchCsvRows('version_names.csv')
  ]);
  dire('     ' + apprises.length + ' lignes d\'apprentissage, '
    + capacitesRaw.length + ' capacités, ' + machinesRaw.length + ' machines');

  // --- Les capacités elles-mêmes ---
  // moves.csv : 0 id · 3 type · 4 puissance · 5 PP · 6 précision · 9 classe
  const noms = nomsParId(capacitesNoms, 0, 2, 1);
  const capacites = {};
  capacitesRaw.forEach(function(r){
    const n = noms[r[0]] || {};
    capacites[r[0]] = [
      n.fr || r[1], n.en || r[1],
      parseInt(r[3], 10) || 0,
      parseInt(r[9], 10) || 0,
      r[4] ? parseInt(r[4], 10) : null,
      r[5] ? parseInt(r[5], 10) : null,
      r[6] ? parseInt(r[6], 10) : null
    ];
  });

  // --- Groupes de versions, et le lien version -> groupe ---
  // Les noms de groupe n'existent nulle part chez PokeAPI : on les compose à
  // partir des versions qu'ils réunissent, dans les deux langues.
  const nomsVersion = nomsParId(versionsNoms, 0, 2, 1);
  const versionsDuGroupe = {};
  const versions = {};
  versionsRaw.forEach(function(r){
    const id = r[0], groupe = r[1], slug = r[2];
    versions[slug] = parseInt(groupe, 10);
    if(!versionsDuGroupe[groupe]) versionsDuGroupe[groupe] = [];
    versionsDuGroupe[groupe].push({
      fr: (nomsVersion[id] && nomsVersion[id].fr) || slug,
      en: (nomsVersion[id] && nomsVersion[id].en) || slug
    });
  });
  const groupes = {};
  groupesRaw.forEach(function(r){
    const id = r[0], slug = r[1];
    const liste = versionsDuGroupe[id] || [];
    // Rouge et Vert japonais portent les mêmes noms que nos versions : sans
    // marque, la liste des jeux afficherait deux « Rouge ».
    const jp = /-japan$/.test(slug) ? ' (JP)' : '';
    groupes[id] = [
      slug,
      nomGroupe(liste.map(function(v){ return v.fr; })) + jp,
      nomGroupe(liste.map(function(v){ return v.en; })) + jp,
      // La colonne « order » suit la chronologie ; l'identifiant, non
      // (Colosseum porte le 12, entre Noir/Blanc et Noir 2/Blanc 2).
      parseInt(r[3], 10) || parseInt(id, 10)
    ];
  });

  // --- CT, CS et DT ---
  // PokeAPI ne connaît qu'une méthode « machine » : c'est l'objet associé qui
  // dit s'il s'agit d'une Capsule Technique, d'une Capacité Secrète ou d'un
  // Disque Technique — et qui donne le numéro affiché dans le jeu.
  const identObjet = {};
  objets.forEach(function(r){ identObjet[r[0]] = r[1]; });
  const machines = {};
  machinesRaw.forEach(function(r){
    const coupe = /^(tm|hm|tr)(\d+)$/.exec(identObjet[r[2]] || '');
    if(!coupe) return;
    const prefixe = coupe[1] === 'hm' ? 'CS' : (coupe[1] === 'tr' ? 'DT' : 'CT');
    if(!machines[r[1]]) machines[r[1]] = {};
    machines[r[1]][r[3]] = prefixe + coupe[2];
  });

  // --- Ce que chaque entrée apprend ---
  // On se règle sur la réserve principale : embarquer les capacités d'une forme
  // que l'application n'affiche pas serait du poids mort, et en oublier une
  // qu'elle affiche laisserait un panneau vide.
  dire('\n2/3  Regroupement par entrée et par jeu…');
  const connues = {};
  entreesEmbarquees().forEach(function(id){ connues[id] = true; });

  // pokemon_moves.csv : 0 entrée · 1 groupe · 2 capacité · 3 méthode · 4 niveau
  const parEntree = new Map();
  const paletteParGroupe = new Map();   // groupe -> Set des capacités par machine
  let retenues = 0, ignorees = 0;
  apprises.forEach(function(r){
    const entree = parseInt(r[0], 10);
    if(!connues[entree]){ ignorees++; return; }     // forme absente de l'app
    retenues++;
    const groupe = parseInt(r[1], 10);
    const capacite = parseInt(r[2], 10);
    const methode = parseInt(r[3], 10);
    if(methode === PAR_MACHINE){
      if(!paletteParGroupe.has(groupe)) paletteParGroupe.set(groupe, new Set());
      paletteParGroupe.get(groupe).add(capacite);
    }
    if(!parEntree.has(entree)) parEntree.set(entree, new Map());
    const jeux = parEntree.get(entree);
    if(!jeux.has(groupe)) jeux.set(groupe, []);
    jeux.get(groupe).push([capacite, methode, parseInt(r[4], 10) || 0]);
  });
  dire('     ' + retenues + ' retenues, ' + ignorees + ' hors de l\'application');

  // L'ordre de la palette est celui auquel se réfèrent les bits : il doit être
  // stable, donc trié, et jamais recalculé autrement.
  const palettes = {};
  const rangDansPalette = new Map();
  paletteParGroupe.forEach(function(ensemble, groupe){
    const triee = Array.from(ensemble).sort(function(a, b){ return a - b; });
    palettes[groupe] = triee;
    const rangs = new Map();
    triee.forEach(function(capacite, i){ rangs.set(capacite, i); });
    rangDansPalette.set(groupe, rangs);
  });

  // --- Encodage ---
  // Un bloc par (entrée, jeu) : les CT en drapeaux, le reste en liste
  // « capacité.méthode[.niveau] », le tout en base 36.
  function encoder(groupe, liste){
    const rangs = rangDansPalette.get(groupe);
    const taille = rangs ? Math.ceil(rangs.size / 8) : 0;
    const octets = new Uint8Array(taille);
    let uneMachine = false;
    const autres = [];
    liste.sort(function(a, b){ return a[0] - b[0]; });
    liste.forEach(function(m){
      const rang = (m[1] === PAR_MACHINE && rangs) ? rangs.get(m[0]) : undefined;
      if(rang !== undefined){
        octets[rang >> 3] |= 1 << (rang & 7);
        uneMachine = true;
      } else {
        autres.push(b36(m[0]) + '.' + m[1] + (m[2] ? '.' + b36(m[2]) : ''));
      }
    });
    return (uneMachine ? bitsEnBase64(octets) : '') + '|' + autres.join(',');
  }

  // Mutualisation : Florizarre apprend exactement la même chose dans X et dans
  // Rubis Oméga. Douze mille couples (entrée, jeu) ne donnent que dix mille
  // blocs distincts — autant ne les écrire qu'une fois.
  const index = new Map();
  const blocs = [];
  const especes = {};
  parEntree.forEach(function(jeux, entree){
    const parJeu = {};
    jeux.forEach(function(liste, groupe){
      const bloc = encoder(groupe, liste);
      let i = index.get(bloc);
      if(i === undefined){ i = blocs.length; blocs.push(bloc); index.set(bloc, i); }
      parJeu[groupe] = i;
    });
    especes[entree] = parJeu;
  });

  // Une capacité jamais apprise par personne n'a pas à peser dans la réserve.
  dire('\n3/3  Élagage…');
  const citees = new Set();
  Object.keys(palettes).forEach(function(g){
    palettes[g].forEach(function(c){ citees.add(String(c)); });
  });
  blocs.forEach(function(bloc){
    const autres = bloc.slice(bloc.indexOf('|') + 1);
    if(!autres) return;
    autres.split(',').forEach(function(bout){
      citees.add(String(parseInt(bout.split('.')[0], 36)));
    });
  });
  const capacitesGardees = {};
  citees.forEach(function(id){ if(capacites[id]) capacitesGardees[id] = capacites[id]; });
  dire('     ' + Object.keys(capacitesGardees).length + ' capacités citées sur '
    + Object.keys(capacites).length);

  return {
    capacites: capacitesGardees,
    machines: machines,
    groupes: groupes,
    versions: versions,
    palettes: palettes,
    blocs: blocs,
    especes: especes
  };
}

async function generer(){
  const debut = Date.now();
  const connues = entreesEmbarquees();
  if(!connues.length){
    throw new Error('la réserve embarquée est vide : génère d\'abord donnees-embarquees.js');
  }
  dire('Entrées connues de l\'application : ' + connues.length + '\n');

  const attaques = await construireAttaques();
  const paquet = Object.assign({ genereLe: new Date().toISOString() }, attaques);
  const json = JSON.stringify(paquet);

  const couples = Object.keys(attaques.especes)
    .reduce(function(n, k){ return n + Object.keys(attaques.especes[k]).length; }, 0);
  dire('\n' + Object.keys(attaques.especes).length + ' entrées, ' + couples
    + ' couples (entrée, jeu), ' + attaques.blocs.length + ' blocs distincts');
  dire('Récolté en ' + Math.round((Date.now() - debut) / 1000) + ' s — '
    + Math.round(json.length / 1024) + ' Ko.');

  dire('\nÉcriture dans src/js/donnees-attaques.js…');
  const res = await fetch('/enregistrer-attaques', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json
  });
  const compte = await res.json();
  if(!res.ok) throw new Error(compte.erreur || ('HTTP ' + res.status));
  dire('     écrit : ' + compte.ko + ' Ko');
  dire('\nTerminé. Recompile l\'application pour embarquer cette réserve.');
  window.__fini = true;
}

generer().catch(function(e){
  dire('\nÉCHEC : ' + (e && e.message ? e.message : e));
  window.__erreur = String(e && e.message ? e.message : e);
  window.__fini = true;
});
