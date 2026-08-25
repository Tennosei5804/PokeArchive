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

/** Le lieu et sa sous-zone, à partir d'une ligne de rencontre. */
function decouperLieu(morceau){
  // Les chiffres en queue — « (5-7, 30 %) » — ne font pas partie du nom.
  const nu = String(morceau).replace(/\s*\([^()]*\)\s*$/, '').trim();
  const i = nu.indexOf('•');
  if(i === -1) return { lieu: nu, sous: '' };
  return { lieu: nu.slice(0, i).trim(), sous: nu.slice(i + 1).trim() };
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
      const vus = new Set();
      texte.split('\n').forEach(function(morceau){
        const d = decouperLieu(morceau);
        if(!d.lieu) return;
        // Une espèce peut tenir plusieurs sous-zones du même lieu : elle ne doit
        // y compter qu'une fois, sinon « 30 espèces » en annonce le double.
        if(vus.has(d.lieu)) return;
        vus.add(d.lieu);
        if(!parLieu.has(d.lieu)) parLieu.set(d.lieu, { nom: d.lieu, especes: [] });
        parLieu.get(d.lieu).especes.push({ id: id, sous: d.sous });
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
    (pris.has(entry.name) ? deja : manque).push({ entry: entry, sous: e.sous });
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
  compte.deja.forEach(function(x){ corps.appendChild(puceEspece(x, true)); });
  bloc.appendChild(corps);

  tete.addEventListener('click', function(){
    lieuxOuvert = (lieuxOuvert === lieu.nom) ? null : lieu.nom;
    dessinerLieux();
  });
  return bloc;
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
  const garder = (lieuxRestants && lieuxRestants.checked) ? utiles : avec;
  const montres = garder.slice(0, LIEUX_MONTRES);

  lieuxListe.innerHTML = '';
  if(!lieux.length){
    lieuxListe.innerHTML = '<div class="state-msg">Les lieux de ce jeu ne sont pas relevés.</div>';
  } else if(!garder.length){
    lieuxListe.innerHTML = '<div class="state-msg">Plus rien à attraper à l’état '
      + 'sauvage ici. Décoche le filtre pour revoir tous les lieux.</div>';
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
