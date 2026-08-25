// Les lieux — où aller maintenant.
//
// Le relevé répond à « où trouve-t-on Abra ? ». Quand on joue, la question est
// l'inverse : on est SUR une route, et on veut savoir ce qu'il reste à y
// attraper. Cette page retourne l'index.
//
// LE DÉCOUPAGE, ET POURQUOI IL MARCHE. Un texte de lieux est une rencontre par
// ligne, chacune de la forme « lieu (niveaux, fréquence) » — c'est texte_de()
// dans relever-lieux.py qui les assemble ainsi. Découper sur les sauts de ligne
// rend donc les rencontres une à une, sans rien deviner.
//
// Le « • » sépare ensuite le lieu de sa sous-zone : « Lac Ouragan • Hautes
// herbes » et « Lac Ouragan • Pokémon cachés » sont le même endroit. On
// regroupe sur la partie de gauche, et la sous-zone devient un détail. Mesuré
// sur les vingt-deux jeux : 3 243 lieux ainsi regroupés, contre près du double
// sans. Rouge et Bleu passe de 197 à 50 — et cinquante lieux, ça se parcourt.
//
// SEULEMENT LES RENCONTRES SAUVAGES. Une évolution, un œuf ou un échange n'ont
// pas de lieu où se rendre ; les faire figurer dans une liste d'endroits où
// aller serait un contresens. La catégorie 0 du relevé est la seule retenue.
//
// LA COLLECTION N'EST PAS CELLE DU DEX OUVERT. Cette page a son propre choix de
// jeu, indépendant de l'onglet du Pokédex : on lit donc allProgress[jeu] et non
// caughtSet, qui ne parle que du dex affiché ailleurs.

const LIEUX_MONTRES = 60;             // au-delà, la liste ne se parcourt plus

let lieuxIndex = null;                // { cleJeu: [lieu, ...] }, à la demande
let lieuxJeuCourant = null;
let lieuxOuvert = null;               // le lieu déplié
let lieuxParId = null;                // id d'espèce -> entrée

// Un taux lisible sans equivoque : une seule valeur dans la parenthese.
//
// Le releve y met aussi la VERSION — « 1 %R, 25 %B » se lit un pour cent dans
// Rouge, vingt-cinq dans Bleu. Deux valeurs ne peuvent donc pas se resumer en
// une : on les laisse alors telles quelles, ou elles se lisent tres bien.
//
// Mesure sur les vingt-deux jeux : 20 580 rencontres portent au moins un taux,
// sur 33 576 — soit 61 %. Les autres n'en ont pas du tout : un echange, un
// achat au casino ou un Pokemon fixe n'ont pas de frequence.
// À quoi renvoient les lettres qui suivent un pourcentage.
//
// « 10 %R » se lit dix pour cent dans Rouge. La lettre est propre au jeu, et
// c'est pourquoi la table l'est aussi : B vaut Bleu dans Rouge/Bleu, Blanc dans
// Noir/Blanc et Bouclier dans Épée/Bouclier. Une table unique se serait
// trompée deux fois sur trois.
//
// Relevé sur les vingt-deux jeux : seuls ceux qui suivent portent des taux
// suffixés. Les autres n'ont qu'une version, ou aucun taux propre à l'une
// d'elles. Une lettre inconnue est laissée telle quelle plutôt que devinée.
const LIEUX_VERSIONS = {
  rby:    { R:'Rouge', B:'Bleu' },
  gsc:    { O:'Or', A:'Argent' },
  rse:    { R:'Rubis', S:'Saphir' },
  frlg:   { RF:'Rouge Feu', VF:'Vert Feuille' },
  dp:     { D:'Diamant', P:'Perle' },
  hgss:   { HG:'Or HeartGold', SS:'Argent SoulSilver' },
  bw:     { N:'Noir', B:'Blanc' },
  b2w2:   { N:'Noir 2', B:'Blanc 2' },
  xy:     { X:'X', Y:'Y' },
  oras:   { RO:'Rubis Oméga', SA:'Saphir Alpha' },
  sm:     { S:'Soleil', L:'Lune' },
  usum:   { US:'Ultra-Soleil', UL:'Ultra-Lune' },
  letsgo: { LGP:'Let’s Go Pikachu', LGE:'Let’s Go Évoli' },
  swsh:   { E:'Épée', B:'Bouclier' },
  bdsp:   { DE:'Diamant Étincelant', PS:'Perle Scintillante' },
};

// La lettre qui suit un pourcentage est la VERSION — « 10 %R » se lit dix
// pour cent dans Rouge. Elle fait partie du taux et se garde avec lui : sans
// elle, une frequence propre a une version passerait pour la regle.
const LIEUX_TAUX = /\d+(?:[.,]\d+)?\s*%\s*[A-ZÉÈÀ]{0,3}/g;

/**
 * Le lieu, sa sous-zone, ses taux et ses niveaux.
 *
 * La parenthèse porte les deux — « (5–7, 30 %) » — et il faut les séparer pour
 * les dire proprement : un taux se met en avant, un niveau se préfixe.
 *
 * LE RESTE N'EST PAS TOUJOURS UN NIVEAU. « Unique », « Peu commun », « 1200
 * jetons », « ★, ★★ » se logent au même endroit. On ne préfixe donc « Niv. »
 * que si ce qui reste n'est fait que de chiffres, de tirets et de virgules —
 * sinon on l'affiche tel quel, ce qui reste juste dans tous les cas.
 */
function decouperLieu(morceau, cleJeu){
  const brut = String(morceau).trim();
  const g = brut.match(/\(([^()]*)\)\s*$/);
  const dedans = g ? g[1].trim() : '';
  const nu = brut.replace(/\s*\([^()]*\)\s*$/, '').trim();

  const versions = LIEUX_VERSIONS[cleJeu] || {};
  const taux = [];
  let reste = dedans;
  (dedans.match(LIEUX_TAUX) || []).forEach(function(jeton){
    reste = reste.replace(jeton, '');
    const m = jeton.trim().match(/^(\d+(?:[.,]\d+)?\s*%)\s*([A-ZÉÈÀ]{0,3})$/);
    if(!m) { taux.push({ valeur: jeton.trim(), version: '' }); return; }
    taux.push({
      valeur: m[1].replace(/\s+/g, ' ').trim(),
      // Une lettre qu'on ne sait pas traduire est gardée telle quelle : mieux
      // vaut « 10 %Z » qu'un nom de jeu inventé.
      version: m[2] ? (versions[m[2]] || m[2]) : '',
    });
  });
  reste = reste.replace(/,\s*,/g, ',').replace(/^[,\s]+|[,\s]+$/g, '');

  // Les niveaux aussi peuvent dépendre de la version — « 7R, 9B ». Écrire
  // « 1 % Rouge » puis « 7R » sur la même ligne serait bancal : on développe
  // les deux de la même façon.
  //
  // Le motif exige des chiffres COLLÉS aux capitales, ce qui laisse tranquilles
  // « 1200 jetonsR » — le mot s'intercale — et « ★, ★★ », qui n'a pas de
  // chiffre du tout.
  const lisible = reste.replace(
    /(\d+(?:\s*[–—-]\s*\d+)?)([A-ZÉÈÀ]{1,3})\b/g,
    function(tout, nombre, lettres){
      return versions[lettres] ? nombre + ' ' + versions[lettres] : tout;
    });

  // Une fourchette se lit mieux en toutes lettres : « Niv. 10 à 45 » plutôt
  // que « Niv. 10–45 ».
  const enToutesLettres = function(s){
    return s.replace(/(\d+)\s*[–—-]\s*(\d+)/g, '$1 à $2');
  };

  // « Niv. » dès que ça COMMENCE par un chiffre, et pas seulement quand tout
  // en est un. La parenthèse s'écrit « niveaux, puis qualificatif » — « 30,
  // Unique », « 58–63, Peu commun », « 17, 1200 jetons » —, et exiger que la
  // fin en soit aussi chiffrée privait ces cas-là du préfixe sans raison.
  //
  // Relevé sur les 33 000 rencontres du fichier : aucune forme où le premier
  // nombre ne soit pas un niveau. « ★, ★★ » ne commence pas par un chiffre et
  // reste donc intact, ce qui est le seul cas à protéger.
  const niveaux = /^\d/.test(lisible)
    ? 'Niv. ' + enToutesLettres(lisible)
    : enToutesLettres(lisible);

  const i = nu.indexOf('•');
  return {
    lieu: i === -1 ? nu : nu.slice(0, i).trim(),
    sous: i === -1 ? '' : nu.slice(i + 1).trim(),
    taux: taux,
    niveaux: niveaux,
  };
}

/**
 * Cobblemon : ses biomes tiennent lieu de routes.
 *
 * Ce n'est pas un jeu Pokémon et il n'a pas de relevé de lieux — mais il a
 * mieux adapté à lui : soixante biomes Minecraft, avec qui s'y trouve. La
 * question « où aller » y a exactement le même sens.
 *
 * La dimension prend la place de la sous-zone : savoir qu'un Pokémon est dans
 * le Nether change tout au trajet.
 *
 * CE QUI N'Y FIGURE PAS. Cent deux espèces sur 874 n'ont aucun biome vanille —
 * elles n'apparaissent que dans des familles de biomes apportées par des mods,
 * ou dans des structures. Les faire figurer sous un nom de mod que la personne
 * n'a peut-être pas installé induirait en erreur ; leur fiche, elle, le dit en
 * détail.
 */
function indexerCobblemon(){
  const d = DONNEES_COBBLEMON;
  const parBiome = new Map();
  Object.keys(d.especes).forEach(function(sid){
    const id = parseInt(sid, 10);
    const vus = new Set();
    d.especes[sid].forEach(function(a){
      const dimension = DIMENSION_PUCE[a[15]] || '';
      (a[0] || []).forEach(function(ib){
        const nom = d.biomes[ib];
        if(!nom || vus.has(nom)) return;
        vus.add(nom);
        if(!parBiome.has(nom)) parBiome.set(nom, { nom: nom, especes: [] });
        parBiome.get(nom).especes.push({ id: id, sous: dimension });
      });
    });
  });
  return [...parBiome.values()];
}

/**
 * L'index d'un jeu : ses lieux, et qui s'y trouve.
 *
 * Construit une fois par jeu et gardé — parcourir sept cents espèces à chaque
 * changement de filtre serait du gaspillage, et la réserve ne bouge pas en
 * cours de session.
 */
function indexerLieux(cleJeu){
  if(!lieuxIndex) lieuxIndex = {};
  if(lieuxIndex[cleJeu]) return lieuxIndex[cleJeu];

  if(cleJeu === 'cobblemon'){
    lieuxIndex[cleJeu] = indexerCobblemon();
    return lieuxIndex[cleJeu];
  }

  const table = DONNEES_LIEUX.jeux[cleJeu];
  const parLieu = new Map();
  if(table){
    Object.keys(table).forEach(function(sid){
      const ligne = table[sid];
      if(ligne[1] !== 0) return;                 // sauvage uniquement
      const id = parseInt(sid, 10);
      const texte = DONNEES_LIEUX.textes[ligne[0]] || '';
      // L'heure, la météo et la saison sont portées par l'espèce dans ce jeu,
      // et non par chacune de ses rencontres : le relevé ne descend pas plus
      // bas. Elles s'affichent donc sur l'espèce, ce qui reste juste.
      const quand = (ligne[3] || [])
        .map(function(i){ return DONNEES_LIEUX.textes[i]; })
        .filter(Boolean).join(' · ');
      const vus = new Set();
      texte.split('\n').forEach(function(morceau){
        const d = decouperLieu(morceau, cleJeu);
        if(!d.lieu) return;
        // Une espèce peut tenir plusieurs sous-zones du même lieu : elle ne doit
        // y compter qu'une fois, sinon « 30 espèces » en annonce le double.
        if(vus.has(d.lieu)) return;
        vus.add(d.lieu);
        if(!parLieu.has(d.lieu)) parLieu.set(d.lieu, { nom: d.lieu, especes: [] });
        parLieu.get(d.lieu).especes.push({ id: id, sous: d.sous,
                                           taux: d.taux, niveaux: d.niveaux,
                                           quand: quand });
      });
    });
  }
  lieuxIndex[cleJeu] = [...parLieu.values()];
  return lieuxIndex[cleJeu];
}

/** L'entrée d'une espèce, par son identifiant. */
function entreeParId(id){
  if(typeof allEntries === 'undefined') return null;
  if(!lieuxParId){
    lieuxParId = new Map();
    allEntries.forEach(function(e){ lieuxParId.set(e.id, e); });
  }
  return lieuxParId.get(id) || null;
}

/**
 * Ce qui est déjà pris dans ce jeu.
 *
 * allProgress ne contient une entrée que pour les Pokédex déjà ouverts : un jeu
 * auquel on n'a pas touché n'y figure pas, et c'est bien « rien de pris ».
 */
function prisesDe(cleJeu){
  if(typeof allProgress === 'undefined') return new Set();
  const b = allProgress[cleJeu];
  return (b && b.caught) ? b.caught : new Set();
}

/** Ce qu'il reste à prendre dans un lieu. */
function manquantsDe(lieu, pris){
  const manque = [], deja = [];
  lieu.especes.forEach(function(e){
    const entry = entreeParId(e.id);
    if(!entry) return;                            // forme absente de la réserve
    (pris.has(entry.name) ? deja : manque).push({ entry: entry, sous: e.sous,
                                                  taux: e.taux, niveaux: e.niveaux,
                                                  quand: e.quand });
  });
  return { manque: manque, deja: deja };
}

// ---- L'affichage -------------------------------------------------------------

function puceEspece(x, estPris){
  const l = document.createElement('button');
  l.type = 'button';
  l.className = 'lieu-espece' + (estPris ? ' pris' : '');
  l.title = 'Ouvrir la fiche de ' + nomAffiche(x.entry)
          + (x.sous ? ' — ' + x.sous : '');
  l.addEventListener('click', function(){ openPreview(x.entry); });

  const nom = document.createElement('span');
  nom.className = 'lieu-espece-nom';
  nom.textContent = nomAffiche(x.entry);
  l.appendChild(nom);

  // La sous-zone dit COMMENT on l'attrape ici : « Hautes herbes », « Pêche »,
  // « Pokémon cachés ». Sans elle, on cherche au mauvais endroit du même lieu.
  if(x.sous){
    const s = document.createElement('span');
    s.className = 'lieu-sous';
    s.textContent = x.sous;
    l.appendChild(s);
  }

  // Le taux : c'est le chiffre qui décide si l'on reste ou si l'on passe son
  // chemin. Quand il dépend de la version, elle est écrite en toutes lettres —
  // « 1 % Rouge » et non « 1 %R », qu'il fallait déchiffrer.
  x.taux.forEach(function(tx){
    const p = document.createElement('span');
    p.className = 'lieu-taux';
    p.textContent = tx.version ? tx.valeur + ' ' + tx.version : tx.valeur;
    l.appendChild(p);
  });

  if(x.niveaux){
    const n = document.createElement('span');
    n.className = 'lieu-niveaux';
    n.textContent = x.niveaux;
    l.appendChild(n);
  }

  // L'heure, la météo, la saison. Elles ne se répètent pas sur chaque
  // rencontre du relevé — elles valent pour l'espèce dans ce jeu.
  if(x.quand){
    const q = document.createElement('span');
    q.className = 'lieu-quand';
    q.textContent = x.quand;
    l.appendChild(q);
  }
  return l;
}

function blocLieu(lieu, pris){
  const compte = manquantsDe(lieu, pris);
  const bloc = document.createElement('div');
  bloc.className = 'lieu' + (compte.manque.length ? '' : ' complet');

  const tete = document.createElement('button');
  tete.type = 'button';
  tete.className = 'lieu-tete';
  tete.setAttribute('aria-expanded', String(lieuxOuvert === lieu.nom));

  const nom = document.createElement('span');
  nom.className = 'lieu-nom';
  nom.textContent = lieu.nom;

  const total = document.createElement('span');
  total.className = 'lieu-total';
  total.textContent = (compte.manque.length + compte.deja.length) + ' espèces';

  const compteur = document.createElement('span');
  compteur.className = 'lieu-compteur';
  compteur.textContent = compte.manque.length
    ? compte.manque.length + ' à prendre'
    : 'tout est pris';

  tete.appendChild(nom);
  tete.appendChild(total);
  tete.appendChild(compteur);
  bloc.appendChild(tete);

  const corps = document.createElement('div');
  corps.className = 'lieu-corps';
  corps.hidden = lieuxOuvert !== lieu.nom;
  // Ce qui manque d'abord : c'est la raison d'ouvrir. Ce qui est pris reste
  // visible en retrait — savoir qu'on a tout ratissé vaut ce qui reste.
  compte.manque.forEach(function(x){ corps.appendChild(puceEspece(x, false)); });

  // Un trait entre les deux. La pastille barrée et pâle disait déjà « pris »,
  // mais rien ne disait OÙ la bascule se faisait : sur trente espèces qui se
  // suivent, l'œil ne trouve pas la frontière. Le trait ne paraît que s'il y a
  // bien deux groupes à séparer.
  if(compte.manque.length && compte.deja.length){
    const sep = document.createElement('span');
    sep.className = 'lieu-separateur';
    sep.textContent = 'déjà pris';
    corps.appendChild(sep);
  }

  compte.deja.forEach(function(x){ corps.appendChild(puceEspece(x, true)); });
  bloc.appendChild(corps);

  tete.addEventListener('click', function(){
    lieuxOuvert = (lieuxOuvert === lieu.nom) ? null : lieu.nom;
    dessinerLieux();
  });
  return bloc;
}

/**
 * Replie une chaîne pour la comparer : sans accent, sans casse.
 *
 * « Foret » doit trouver « Forêt de Jade », et « pikachu » « Pikachu ». Sans ce
 * repli, il faudrait taper les accents pour chercher un lieu français — ce que
 * personne ne fait dans un champ de recherche.
 */
function replierLieu(s){
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/**
 * Le lieu répond-il à la recherche ?
 *
 * Sur son nom, OU sur celui d'un Pokémon qu'on y croise. Les deux dans le même
 * champ : on cherche « Route 25 » ou « Chenipan » sans avoir à dire lequel des
 * deux on tape, et le résultat est le même — la liste des lieux où aller.
 *
 * Le nom d'espèce passe par nomAffiche(), donc suit la langue choisie : qui
 * joue en anglais cherche « Caterpie », pas « Chenipan ».
 */
function lieuRepond(lieu, q){
  if(!q) return true;
  if(replierLieu(lieu.nom).indexOf(q) !== -1) return true;
  return lieu.especes.some(function(e){
    const entry = entreeParId(e.id);
    return entry && replierLieu(nomAffiche(entry)).indexOf(q) !== -1;
  });
}

function dessinerLieux(){
  if(!lieuxListe || !lieuxJeuCourant) return;
  const lieux = indexerLieux(lieuxJeuCourant);
  const pris = prisesDe(lieuxJeuCourant);

  const avec = lieux.map(function(l){
    return { lieu: l, manque: manquantsDe(l, pris).manque.length };
  });
  // Par ce qu'il reste à y prendre : c'est l'ordre de la question posée. À
  // égalité, le lieu le plus fourni d'abord — un détour vaut mieux quand il
  // rapporte plus.
  avec.sort(function(a, b){
    return (b.manque - a.manque) || (b.lieu.especes.length - a.lieu.especes.length)
        || a.lieu.nom.localeCompare(b.lieu.nom, 'fr');
  });

  const utiles = avec.filter(function(x){ return x.manque > 0; });
  const q = replierLieu(lieuxQ ? lieuxQ.value.trim() : '');
  const garder = ((lieuxRestants && lieuxRestants.checked) ? utiles : avec)
    .filter(function(x){ return lieuRepond(x.lieu, q); });
  const montres = garder.slice(0, LIEUX_MONTRES);

  lieuxListe.innerHTML = '';
  if(!lieux.length){
    lieuxListe.innerHTML = '<div class="state-msg">Les lieux de ce jeu ne sont pas relevés.</div>';
  } else if(!garder.length){
    lieuxListe.innerHTML = q
      ? '<div class="state-msg">Aucun lieu ni Pokémon ne correspond à cette '
        + 'recherche dans ce jeu.</div>'
      : '<div class="state-msg">Plus rien à attraper à l’état sauvage ici. '
        + 'Décoche le filtre pour revoir tous les lieux.</div>';
  } else {
    montres.forEach(function(x){ lieuxListe.appendChild(blocLieu(x.lieu, pris)); });
    if(garder.length > montres.length){
      const reste = document.createElement('div');
      reste.className = 'state-msg';
      reste.textContent = 'et ' + (garder.length - montres.length) + ' autres lieux.';
      lieuxListe.appendChild(reste);
    }
  }

  if(lieuxResume){
    const total = utiles.reduce(function(s, x){ return s + x.manque; }, 0);
    lieuxResume.textContent = utiles.length
      ? total + ' Pokémon à prendre, répartis sur ' + utiles.length + ' lieu'
        + (utiles.length > 1 ? 'x' : '') + ' — sur ' + lieux.length + ' au total.'
      : lieux.length + ' lieux relevés, et plus rien à y attraper à l’état sauvage.';
  }
}

/** Le menu des jeux : ceux dont les lieux sont relevés, et eux seuls. */
function remplirJeuxLieux(){
  if(!lieuxJeu) return;
  const releves = DONNEES_LIEUX.pokedexReleve || [];
  // « key » et non « tab » : le premier est l'identifiant du jeu — celui que le
  // relevé emploie —, le second son libellé avec son émoji.
  // Cobblemon n'est pas dans le relevé — il a sa propre réserve de biomes.
  const liste = (typeof GAMES !== 'undefined' ? GAMES : [])
    .filter(function(j){ return releves.indexOf(j.key) !== -1 || j.key === 'cobblemon'; });

  lieuxJeu.innerHTML = '';
  liste.forEach(function(j){
    const o = document.createElement('option');
    o.value = j.key;
    o.textContent = j.title || j.tab || j.key;
    lieuxJeu.appendChild(o);
  });
  // Le jeu ouvert dans le Pokédex si c'en est un, sinon le premier de la liste.
  // Arriver ici depuis Rouge et Bleu et tomber sur Écarlate serait déroutant.
  const voulu = (liste.some(function(j){ return j.key === currentTab; }))
    ? currentTab : (liste[0] && liste[0].key);
  if(voulu){ lieuxJeu.value = voulu; lieuxJeuCourant = voulu; }
}

// ---- Branchements -----------------------------------------------------------

document.addEventListener('DOMContentLoaded', function(){
  if(lieuxJeu) lieuxJeu.addEventListener('change', function(){
    lieuxJeuCourant = lieuxJeu.value;
    lieuxOuvert = null;
    dessinerLieux();
  });
  if(lieuxRestants) lieuxRestants.addEventListener('change', function(){
    lieuxOuvert = null;
    dessinerLieux();
  });
  // « input » et non « change » : la liste se resserre pendant qu'on tape.
  if(lieuxQ) lieuxQ.addEventListener('input', function(){
    // Chercher un Pokémon n'a de sens que si l'on voit où il est : le
    // premier lieu trouvé s'ouvre donc de lui-même.
    lieuxOuvert = null;
    dessinerLieux();
    const premier = lieuxListe.querySelector('.lieu-nom');
    if(lieuxQ.value.trim() && premier){
      lieuxOuvert = premier.textContent;
      dessinerLieux();
    }
  });
});

/** Appelé par showPage('lieux'). */
async function chargerPageLieux(){
  if(!lieuxListe) return;
  lieuxListe.innerHTML = '<div class="state-msg">Chargement du relevé…</div>';
  try{
    // Les deux réserves : celle des lieux pour les jeux, celle des spawns
    // pour Cobblemon. Toutes deux se chargent à la demande, et une seule
    // fois — c'est le menu qui a besoin des deux dès l'ouverture.
    await Promise.all([chargerLieux(), chargerCobblemon()]);
  }catch(e){
    lieuxListe.innerHTML = '<div class="state-msg">Le relevé des lieux n’a pas pu être lu.</div>';
    return;
  }
  if(!lieuxJeuCourant) remplirJeuxLieux();
  dessinerLieux();
}
