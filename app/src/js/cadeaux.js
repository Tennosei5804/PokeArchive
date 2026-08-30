// L'écran des cadeaux mystères.
// Script classique (pas de module ES) : l'application reste ouvrable en file://
//
// Il lit donnees-cadeaux.js, produit par outils/relever-cadeaux.py depuis un
// relevé de 552 distributions sur les neuf générations.
//
// ---------------------------------------------------------------------------
// LE RELEVÉ EST MONDIAL, ET L'ÉCRAN LE DIT.
//
// Beaucoup de ces distributions n'ont jamais touché l'Europe : la première
// ligne est un concours CoroCoro de 1996. Chaque carte porte donc sa région.
// Taire cette colonne aurait fait promettre à l'écran des évènements auxquels
// personne ici n'a eu accès — le défaut exact que l'ancien historique évitait
// en ne retenant que la France.
//
// ---------------------------------------------------------------------------
// TROIS FILTRES, ET « RARETÉ » EN MÉLANGE DEUX.
//
// Génération et jeu se lisent tels quels. La rareté propose Normal, Légendaire
// et Fabuleux — qui sont les trois valeurs de la catégorie, exclusives entre
// elles — plus « distribué en chromatique », qui n'en est pas une : c'est une
// propriété de la DISTRIBUTION, pas de l'espèce. Les mettre dans le même menu
// est un raccourci d'usage, pas une classification ; d'où l'intitulé complet
// dans la liste, et le statut chromatique répété sur chaque carte.

// Ce que dit le statut chromatique. Quatre valeurs, quatre phrases : « non
// applicable » n'est pas « non chromatique », et la première génération n'a
// simplement pas la mécanique.
const CADEAUX_CHROMA_DIT = {
  non_applicable: { court: '—', long: 'Pas de mécanique chromatique à cette époque.' },
  non_shiny: { court: 'Non chromatique', long: 'Distribué en forme normale, sans possibilité de chromatique.' },
  shiny_possible: { court: '✨ Chromatique possible', long: 'La distribution pouvait donner un chromatique.' },
  shiny_garanti: { court: '✨ Chromatique garanti', long: 'Distribué directement en chromatique.' }
};

const CADEAUX_CAT_DIT = {
  normal: '',
  legendaire: '👑 Légendaire',
  fabuleux: '✴ Fabuleux'
};

const cadeauxQEl = document.getElementById('cadeauxQ');
const cadeauxGenEl = document.getElementById('cadeauxGen');
const cadeauxJeuEl = document.getElementById('cadeauxJeu');
const cadeauxRareteEl = document.getElementById('cadeauxRarete');
const cadeauxCompteEl = document.getElementById('cadeauxCompte');
const cadeauxListeEl = document.getElementById('cadeauxListe');

// ---- Lire la réserve ---------------------------------------------------------

/** Une entrée brute devient un objet nommé : le reste du fichier se lit mieux. */
function cadeauLu(x){
  const texte = function(i){ return i >= 0 ? CADEAUX_TEXTES[i] : ''; };
  return {
    nom: x[0], espece: x[1], gen: x[2], jeux: x[3],
    categorie: CADEAUX_CATEGORIES[x[4]],
    chromatique: CADEAUX_CHROMA[x[5]],
    evenement: x[6],
    methode: texte(x[7]),
    regions: texte(x[8]),
    periode: x[9],
    source: texte(x[10]),
    // L'id de FORME, distinct du numéro national quand l'espèce en a plusieurs.
    forme: x[11]
  };
}

function cadeauxTous(){
  if(typeof CADEAUX === 'undefined') return [];
  return CADEAUX.map(cadeauLu);
}

// ---- Les filtres -------------------------------------------------------------

/**
 * Les jeux qui apparaissent réellement dans le relevé, dans l'ordre de GAMES.
 *
 * Bâti sur les données, pas sur GAMES en entier : proposer « Légendes Arceus »
 * dans un menu qui ne rendrait jamais rien ferait douter du filtre. L'ordre,
 * lui, vient de GAMES — c'est celui que le reste de l'application emploie.
 */
function cadeauxJeuxPresents(){
  const vus = new Set();
  cadeauxTous().forEach(function(c){ c.jeux.forEach(function(j){ vus.add(j); }); });
  if(typeof GAMES === 'undefined') return Array.from(vus);
  return GAMES.filter(function(g){ return vus.has(g.key); });
}

function remplirFiltresCadeaux(){
  if(!cadeauxGenEl || cadeauxGenEl.dataset.pret) return;

  const gens = Array.from(new Set(cadeauxTous().map(function(c){ return c.gen; })))
    .sort(function(a, b){ return a - b; });
  gens.forEach(function(g){
    const o = document.createElement('option');
    o.value = String(g);
    o.textContent = 'Génération ' + g;
    cadeauxGenEl.appendChild(o);
  });

  cadeauxJeuxPresents().forEach(function(g){
    const o = document.createElement('option');
    o.value = g.key;
    o.textContent = g.tab;
    cadeauxJeuEl.appendChild(o);
  });

  cadeauxGenEl.dataset.pret = '1';
}

/**
 * Le texte cherché, sans accents ni casse.
 *
 * On emprunte sansAccents() au Pokédex plutôt que d'en réécrire une : personne
 * ne tape « Pêchaminus » avec son accent circonflexe dans un champ de
 * recherche, et deux normalisations sur un même écran finiraient par diverger.
 */
function cadeauNormalise(s){
  if(typeof sansAccents === 'function') return sansAccents(s);
  return String(s || '').toLowerCase();
}

function cadeauxFiltres(){
  const q = cadeauNormalise((cadeauxQEl && cadeauxQEl.value) || '').trim();
  const gen = cadeauxGenEl ? cadeauxGenEl.value : 'all';
  const jeu = cadeauxJeuEl ? cadeauxJeuEl.value : 'all';
  const rarete = cadeauxRareteEl ? cadeauxRareteEl.value : 'all';

  return cadeauxTous().filter(function(c){
    // TROIS ENDROITS : le nom du Pokémon, son numéro, et le titre de
    // l'évènement. Le troisième a été ajouté après coup, en connaissance de
    // cause : « Pikachu » figure dans des dizaines de titres, et une recherche
    // sur ce mot ramène donc aussi des lignes où l'espèce distribuée est une
    // autre. C'est le prix de pouvoir retrouver « Tanabata » ou « Yokohama »,
    // qui ne se trouvaient autrement nulle part.
    if(q){
      const nom = cadeauNormalise(c.nom);
      const ev = cadeauNormalise(c.evenement);
      const no = String(c.espece);
      if(nom.indexOf(q) === -1 && ev.indexOf(q) === -1 && no.indexOf(q) === -1) return false;
    }
    if(gen !== 'all' && String(c.gen) !== gen) return false;
    if(jeu !== 'all' && c.jeux.indexOf(jeu) === -1) return false;
    if(rarete === 'all') return true;
    // « Chromatique » ne vit pas dans la même colonne que les trois autres :
    // c'est une propriété de la distribution, pas de l'espèce.
    if(rarete === 'chromatique') return c.chromatique === 'shiny_garanti';
    return c.categorie === rarete;
  });
}

// ---- L'écran -----------------------------------------------------------------

function chargerCadeaux(){
  if(!cadeauxListeEl) return;
  remplirFiltresCadeaux();
  dessinerCadeaux();
}

function dessinerCadeaux(){
  if(!cadeauxListeEl) return;
  const lot = cadeauxFiltres();

  cadeauxListeEl.innerHTML = '';
  if(!lot.length){
    cadeauxListeEl.innerHTML =
      '<div class="state-msg">Aucune distribution ne correspond.</div>';
  }
  lot.forEach(function(c){ cadeauxListeEl.appendChild(ligneCadeau(c)); });

  if(cadeauxCompteEl){
    const total = cadeauxTous().length;
    cadeauxCompteEl.textContent = lot.length === total
      ? total + ' distributions'
      : lot.length + ' sur ' + total + ' distributions';
  }
  marquerFiltresCadeaux();
}

function marquerFiltresCadeaux(){
  if(cadeauxQEl) cadeauxQEl.classList.toggle('filtering', !!cadeauxQEl.value.trim());
  [cadeauxGenEl, cadeauxJeuEl, cadeauxRareteEl].forEach(function(el){
    if(el) el.classList.toggle('filtering', el.value !== 'all');
  });
  if(typeof syncSelects === 'function') syncSelects();
}

/**
 * La vignette. Chaîne de repli habituelle, jamais une seconde à tenir d'accord.
 *
 * Le sprite est CHROMATIQUE quand la distribution l'était : c'est ce qu'on
 * recevait, et le montrer normal donnerait une fausse idée de la carte.
 */
function cadeauImage(c){
  const cadre = document.createElement('span');
  cadre.className = 'cadeau-sprite';
  if(!c.espece) return cadre;

  const brille = c.chromatique === 'shiny_garanti';
  // PAR L'ID DE FORME, jamais par le numéro national. Zoroark de Hisui porte le
  // 571 comme le Zoroark ordinaire : demander le rendu par ce numéro affichait
  // la bête d'Unys sous le nom de celle de Hisui. Miaouss a trois formes pour un
  // seul numéro, et le même piège.
  const rendu = c.forme || c.espece;
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  if(typeof pokeosHomeUrl === 'function') img.src = pokeosHomeUrl(rendu, brille);
  img.addEventListener('error', function(){
    if(typeof officialArtworkUrl === 'function'){
      img.src = officialArtworkUrl(rendu, brille);
    }
  });
  cadre.appendChild(img);
  return cadre;
}

function ligneCadeau(c){
  const ligne = document.createElement('div');
  ligne.className = 'cadeau-ligne';
  ligne.appendChild(cadeauImage(c));

  const infos = document.createElement('div');
  infos.className = 'cadeau-infos';

  const titre = document.createElement('div');
  titre.className = 'cadeau-nom';
  titre.textContent = c.nom;
  if(c.espece){
    const no = document.createElement('span');
    no.className = 'cadeau-no';
    no.textContent = '#' + String(c.espece).padStart(4, '0');
    titre.appendChild(no);
  }
  infos.appendChild(titre);

  const ev = document.createElement('div');
  ev.className = 'cadeau-event';
  ev.textContent = c.evenement;
  infos.appendChild(ev);

  if(c.methode){
    const m = document.createElement('div');
    m.className = 'cadeau-methode';
    m.textContent = c.methode;
    infos.appendChild(m);
  }

  const etiq = document.createElement('div');
  etiq.className = 'cadeau-etiquettes';

  const marquer = function(texte, classe, titreAide){
    if(!texte) return;
    const e = document.createElement('span');
    e.className = 'cadeau-etiq ' + classe;
    e.textContent = texte;
    if(titreAide) e.title = titreAide;
    etiq.appendChild(e);
  };

  marquer(CADEAUX_CAT_DIT[c.categorie], 'categorie');
  const ch = CADEAUX_CHROMA_DIT[c.chromatique];
  if(ch && c.chromatique !== 'non_applicable' && c.chromatique !== 'non_shiny'){
    marquer(ch.court, 'chroma', ch.long);
  }
  // LES JEUX, par leur onglet : le relevé nomme les versions une par une, mais
  // l'application raisonne par Pokédex, et deux vocabulaires sur un même écran
  // se paient toujours.
  if(typeof gameByKey !== 'undefined'){
    c.jeux.forEach(function(k){
      const g = gameByKey[k];
      if(g) marquer(g.tab, 'jeu');
    });
  }
  // La région : la seule chose qui dise si l'évènement a pu concerner qui lit.
  marquer(c.regions, 'region');
  if(c.periode) marquer(c.periode, 'periode');

  infos.appendChild(etiq);
  ligne.appendChild(infos);
  return ligne;
}

// ---- Le câblage ---------------------------------------------------------------

[cadeauxGenEl, cadeauxJeuEl, cadeauxRareteEl].forEach(function(el){
  if(el) el.addEventListener('change', dessinerCadeaux);
});
if(cadeauxQEl) cadeauxQEl.addEventListener('input', dessinerCadeaux);
