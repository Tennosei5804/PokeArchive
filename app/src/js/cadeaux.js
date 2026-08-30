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
const DISTRIB_CHROMA_DIT = {
  non_applicable: { court: '—', long: 'Pas de mécanique chromatique à cette époque.' },
  non_shiny: { court: 'Non chromatique', long: 'Distribué en forme normale, sans possibilité de chromatique.' },
  shiny_possible: { court: '✨ Chromatique possible', long: 'La distribution pouvait donner un chromatique.' },
  shiny_garanti: { court: '✨ Chromatique garanti', long: 'Distribué directement en chromatique.' }
};

const DISTRIB_CAT_DIT = {
  normal: '',
  legendaire: '👑 Légendaire',
  fabuleux: '✴ Fabuleux'
};

/**
 * Le nom français d'un type vers son identifiant.
 *
 * INVERSÉ DEPUIS TYPES_FR, jamais recopié : c'est cette table-là qui fait foi
 * dans toute l'application, et une seconde correspondance écrite à la main
 * finirait par en différer. Le relevé écrit les types en toutes lettres — « Psy »,
 * « Électrik » — et c'est ici qu'ils redeviennent des numéros.
 */
function typeParNom(nom){
  if(typeof TYPES_FR === 'undefined' || !nom) return null;
  const cible = (typeof sansAccents === 'function' ? sansAccents : function(s){
    return String(s).toLowerCase();
  })(nom);
  const cles = Object.keys(TYPES_FR);
  for(let i = 0; i < cles.length; i++){
    const n = TYPES_FR[cles[i]];
    const c = (typeof sansAccents === 'function' ? sansAccents(n) : n.toLowerCase());
    if(c === cible) return Number(cles[i]);
  }
  return null;
}

/**
 * Les huit Balls que le relevé cite, vers leur nom chez PokeAPI.
 *
 * HUIT, ET PAS TRENTE : c'est ce que la source emploie réellement, mesuré. Une
 * table exhaustive des Balls du jeu serait une liste à tenir pour rien.
 *
 * Le dépôt de sprites PokeAPI est déjà celui du repli des vignettes : aucun
 * domaine nouveau, rien à ajouter à la politique de sécurité.
 */
const BALLS_POKEAPI = {
  'Mémoire': 'cherish-ball', 'Poké': 'poke-ball', 'Sombre': 'dusk-ball',
  'Soin': 'heal-ball', 'Hyper': 'ultra-ball', 'Luxe': 'luxury-ball',
  'Safari': 'safari-ball', 'Rêve': 'dream-ball', 'Lune': 'moon-ball',
  'Rapide': 'fast-ball', 'Chrono': 'timer-ball', 'Masse': 'heavy-ball',
  'Filet': 'net-ball', 'Scuba': 'dive-ball', 'Faste': 'luxury-ball',
  'Appât': 'lure-ball', 'Premier': 'premier-ball'
};

function imageBall(nom){
  if(!nom) return null;
  const cle = (typeof sansAccents === 'function' ? sansAccents(nom) : nom.toLowerCase());
  let slug = null;
  Object.keys(BALLS_POKEAPI).forEach(function(k){
    const c = (typeof sansAccents === 'function' ? sansAccents(k) : k.toLowerCase());
    if(c === cle) slug = BALLS_POKEAPI[k];
  });
  if(!slug) return null;
  const img = document.createElement('img');
  img.className = 'cadeau-ball-img';
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  img.src = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/'
    + slug + '.png';
  // Une image absente ne laisse pas de trou : le nom reste écrit à côté.
  img.addEventListener('error', function(){ img.remove(); });
  return img;
}

const cadeauxQEl = document.getElementById('cadeauxQ');
const cadeauxGenEl = document.getElementById('cadeauxGen');
const cadeauxJeuEl = document.getElementById('cadeauxJeu');
const cadeauxRareteEl = document.getElementById('cadeauxRarete');
const cadeauxCompteEl = document.getElementById('cadeauxCompte');
const cadeauxListeEl = document.getElementById('cadeauxListe');
const cadeauOverlayEl = document.getElementById('cadeauOverlay');
const cadeauTitreEl = document.getElementById('cadeauTitre');
const cadeauEyebrowEl = document.getElementById('cadeauEyebrow');
const cadeauCorpsEl = document.getElementById('cadeauCorps');
const cadeauFermerEl = document.getElementById('cadeauFermer');

// CE QUE LE RELEVÉ NE DIT PAS, et qu'il faut nommer plutôt que laisser deviner.
//
// Le fichier source porte l'évènement, la méthode, la région et la date. Il ne
// porte NI le Dresseur d'Origine, NI la langue, NI les attaques, NI la Ball, NI
// le niveau — mesuré colonne par colonne : zéro ligne sur 552 pour le niveau et
// les statistiques, une seule pour la Ball.
//
// La carte le dit en toutes lettres. Une section vide serait lue comme « ce
// Pokémon n'avait pas de Ball » au lieu de « on ne l'a pas encore relevé », et
// c'est la différence entre une lacune et une erreur.
const CADEAU_A_RELEVER = ['ni Dresseur d’Origine, ni ID, ni niveau, ni Ball, '
                           + 'ni attaques'];

// ---- Lire la réserve ---------------------------------------------------------

/** Une entrée brute devient un objet nommé : le reste du fichier se lit mieux. */
function cadeauLu(x){
  const texte = function(i){ return i >= 0 ? DISTRIBUTIONS_TEXTES[i] : ''; };
  return {
    nom: x[0], espece: x[1], gen: x[2], jeux: x[3],
    categorie: DISTRIBUTIONS_CATEGORIES[x[4]],
    chromatique: DISTRIBUTIONS_CHROMA[x[5]],
    evenement: x[6],
    methode: texte(x[7]),
    regions: texte(x[8]),
    periode: x[9],
    source: texte(x[10]),
    // L'id de FORME, distinct du numéro national quand l'espèce en a plusieurs.
    forme: x[11],
    // Le détail relevé chez Poképédia, ou null : deux tiers seulement des
    // distributions ont pu être appariées.
    detail: (x[12] >= 0 && typeof DISTRIBUTIONS_DETAILS !== 'undefined')
      ? DISTRIBUTIONS_DETAILS[x[12]] : null
  };
}

function cadeauxTous(){
  if(typeof DISTRIBUTIONS === 'undefined') return [];
  return DISTRIBUTIONS.map(cadeauLu);
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
  // Un bouton, pas un div : la carte s'ouvre aussi au clavier, et le rôle est
  // annoncé sans qu'on ait à le déclarer à la main.
  const ligne = document.createElement('button');
  ligne.type = 'button';
  ligne.className = 'cadeau-ligne';
  ligne.title = 'Ouvrir la carte de cette distribution';
  ligne.addEventListener('click', function(){ ouvrirCarteCadeau(c); });
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

  marquer(DISTRIB_CAT_DIT[c.categorie], 'categorie');
  const ch = DISTRIB_CHROMA_DIT[c.chromatique];
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
  // Un repère discret : cette ligne a son détail, cliquer en vaut la peine.
  if(c.detail) marquer('détaillé', 'detaille');

  infos.appendChild(etiq);
  ligne.appendChild(infos);
  return ligne;
}

// ---- La carte d'une distribution ---------------------------------------------

/**
 * Un bloc titré, encadré comme les blocs d'obtention d'une fiche d'espèce.
 *
 * `sorte` colore le liseré de gauche, exactement comme .obt-ligne le fait sur la
 * fiche : rouge pour la distribution, vert pour ce qu'on a reçu, neutre pour ce
 * qui vient de la réserve. Trois cadres qui se ressemblent trop se lisent comme
 * un seul bloc long.
 */
function cadeauBloc(titre, sorte){
  const b = document.createElement('div');
  b.className = 'cadeau-bloc' + (sorte ? ' cadeau-bloc-' + sorte : '');
  const h = document.createElement('div');
  h.className = 'cadeau-bloc-titre';
  h.textContent = titre;
  b.appendChild(h);
  return b;
}

/**
 * La grille d'un bloc, créée à la demande.
 *
 * TROIS COLONNES : la clé, une icône, la valeur. Les mesures disaient que les
 * valeurs étaient déjà alignées — toutes au même pixel — mais le TEXTE ne
 * l'était pas : une icône posée devant lui le poussait de trente et un pixels,
 * et « Poké Ball » ne tombait plus sous « Synchro ». Donner sa colonne à
 * l'icône aligne les trois, et la colonne reste vide sur les lignes sans image.
 */
function cadeauGrille(bloc){
  let g = bloc.querySelector('.cadeau-champs');
  if(!g){
    g = document.createElement('div');
    g.className = 'cadeau-champs';
    bloc.appendChild(g);
  }
  return g;
}

/**
 * Une ligne : la clé, l'icône si elle existe, la valeur.
 *
 * `valeur` accepte un texte ou un élément — les types, la Ball et les capacités
 * en fournissent un. Une même fonction pour toutes les lignes, sinon les
 * variantes divergent et c'est de là que vient un désalignement.
 */
function cadeauChamp(bloc, cle, valeur, icone){
  if(!valeur) return;
  const g = cadeauGrille(bloc);

  const k = document.createElement('span');
  k.className = 'cadeau-champ-cle';
  k.textContent = cle;
  g.appendChild(k);

  const i = document.createElement('span');
  i.className = 'cadeau-champ-icone';
  if(icone) i.appendChild(icone);
  g.appendChild(i);

  const v = document.createElement('span');
  v.className = 'cadeau-champ-val';
  if(typeof valeur === 'string') v.textContent = valeur;
  else v.appendChild(valeur);
  g.appendChild(v);
}

/** L'entrée de la réserve qui correspond à cette distribution, ou null. */
function cadeauEntree(c){
  if(typeof allEntries === 'undefined' || !allEntries) return null;
  return allEntries.find(function(e){ return e.id === c.forme; })
      || allEntries.find(function(e){ return e.speciesId === c.espece; })
      || null;
}

function ouvrirCarteCadeau(c){
  if(!cadeauOverlayEl) return;
  const entree = cadeauEntree(c);

  cadeauEyebrowEl.textContent = c.evenement;
  cadeauTitreEl.textContent = c.nom;
  cadeauCorpsEl.innerHTML = '';

  // ---- L'en-tête : ce qu'on a reçu, et à quoi il ressemblait --------------
  const tete = document.createElement('div');
  tete.className = 'cadeau-carte-tete';
  const vignette = cadeauImage(c);
  vignette.className = 'cadeau-carte-sprite';
  tete.appendChild(vignette);

  const resume = document.createElement('div');
  resume.className = 'cadeau-carte-resume';
  if(c.espece){
    const no = document.createElement('div');
    no.className = 'cadeau-carte-no';
    no.textContent = 'N° ' + String(c.espece).padStart(4, '0');
    resume.appendChild(no);
  }
  const ch = DISTRIB_CHROMA_DIT[c.chromatique];
  if(ch){
    const s = document.createElement('div');
    s.className = 'cadeau-carte-chroma';
    s.textContent = ch.long;
    resume.appendChild(s);
  }
  tete.appendChild(resume);
  cadeauCorpsEl.appendChild(tete);

  // ---- La distribution ----------------------------------------------------
  const dist = cadeauBloc('La distribution', 'quand');
  cadeauChamp(dist, 'Méthode', c.methode);
  if(typeof gameByKey !== 'undefined'){
    const noms = c.jeux.map(function(k){
      const g = gameByKey[k];
      return g ? g.tab : k;
    });
    cadeauChamp(dist, 'Jeux', noms.join('  ·  '));
  }
  cadeauChamp(dist, 'Région', c.regions);
  cadeauChamp(dist, 'Période', c.periode);
  cadeauChamp(dist, 'Génération', 'Génération ' + c.gen);
  // La source ne s'affiche plus sur la carte — elle reste dans la réserve,
  // où le relevé des champs manquants ira la chercher.

  cadeauCorpsEl.appendChild(dist);

  // ---- L'espèce, depuis la réserve embarquée ------------------------------
  //
  // CE SONT LES STATISTIQUES DE BASE DE L'ESPÈCE, pas celles de l'exemplaire
  // distribué — le titre du bloc le dit. Un Pikachu d'évènement a les mêmes
  // bases que n'importe quel Pikachu ; ce qui le distingue (IV, niveau, nature)
  // n'est pas dans le relevé.
  const fiche = entree && typeof ficheEmbarquee === 'function'
    ? ficheEmbarquee(entree) : null;
  if(fiche && fiche.stats){
    const esp = cadeauBloc('L’espèce — statistiques de base', 'espece');
    const barres = document.createElement('div');
    barres.className = 'cadeau-stats';
    const maxi = (typeof STAT_MAX !== 'undefined') ? STAT_MAX : 180;
    (typeof STATS_NOMS_LONGS !== 'undefined' ? STATS_NOMS_LONGS : [])
      .forEach(function(nom, i){
        const v = fiche.stats[i] || 0;
        const l = document.createElement('div');
        l.className = 'cadeau-stat';
        const n = document.createElement('span');
        n.className = 'cadeau-stat-nom';
        n.textContent = nom;
        const j = document.createElement('span');
        j.className = 'cadeau-stat-jauge';
        const rempli = document.createElement('span');
        rempli.style.width = Math.min(100, (v / maxi) * 100) + '%';
        j.appendChild(rempli);
        const c2 = document.createElement('span');
        c2.className = 'cadeau-stat-val';
        c2.textContent = v;
        l.appendChild(n); l.appendChild(j); l.appendChild(c2);
        barres.appendChild(l);
      });
    esp.appendChild(barres);
    cadeauCorpsEl.appendChild(esp);
  }

  // ---- L'exemplaire distribué, quand on a pu l'apparier -------------------
  //
  // CE BLOC PARLE DE CE QU'ON A REÇU, pas de l'espèce : le Dresseur d'Origine,
  // son ID, le niveau, la Ball, la nature, le ruban, l'objet tenu et les quatre
  // attaques. C'est ce qui distingue un exemplaire d'évènement d'un Pokémon
  // ordinaire, et ce qui sert à vérifier qu'un échange est légitime.
  const d = c.detail;
  if(d){
    const ex = cadeauBloc('L’exemplaire distribué', 'recu');
    // LE NOM ANGLAIS EST LA SEULE TRACE DE LANGUE QUE LES SOURCES PORTENT. Le
    // même évènement s'appelle autrement outre-Atlantique, et c'est sous ce
    // nom-là qu'on le retrouve dans la plupart des discussions.
    cadeauChamp(ex, 'Nom (US)', d.nom_us);

    // LES TYPES PAR puceType(), la fonction qui les dessine partout ailleurs :
    // fiche, faiblesses, tableau des attaques, Stratégie. Elle porte déjà son
    // repli en pastille colorée quand l'image manque.
    if(d.types && d.types.length && typeof puceType === 'function'){
      const v = document.createElement('span');
      v.className = 'cadeau-types';
      d.types.forEach(function(nom){
        const id = typeParNom(nom);
        if(id) v.appendChild(puceType(id));
      });
      if(v.childNodes.length) cadeauChamp(ex, 'Type', v);
    }

    cadeauChamp(ex, 'Genre', d.genre);
    cadeauChamp(ex, 'Niveau', d.niveau);
    cadeauChamp(ex, 'Talent', d.talent);
    cadeauChamp(ex, 'Nature', d.nature);

    // La Ball avec son image quand on l'a, son nom dans tous les cas.
    // L'image part dans la colonne d'icône, le nom reste dans celle des
    // valeurs : c'est ce qui le remet sous « Synchro » et « Pression ».
    cadeauChamp(ex, 'Ball', d.ball ? d.ball + ' Ball' : '', imageBall(d.ball));

    cadeauChamp(ex, 'Objet tenu', d.objet);
    cadeauChamp(ex, 'Ruban', d.ruban);
    cadeauChamp(ex, 'Dresseur', d.do);
    cadeauChamp(ex, 'N° ID', d.id);
    cadeauChamp(ex, 'Surnom', d.surnom);

    if(d.capacites && d.capacites.length){
      const v = document.createElement('span');
      v.className = 'cadeau-capacites';
      d.capacites.forEach(function(cap){
        const e = document.createElement('span');
        // Une attaque que l'espèce n'apprend pas autrement : c'est souvent la
        // raison d'être de la distribution, elle mérite d'être signalée.
        e.className = 'cadeau-capacite' + (cap.even ? ' exclusive' : '');
        if(cap.even) e.title = 'Attaque exclusive à cette distribution';
        const n = document.createElement('span');
        n.className = 'cadeau-capacite-nom';
        n.textContent = cap.nom;
        e.appendChild(n);
        const id = typeParNom(cap.type);
        if(id && typeof puceType === 'function') e.appendChild(puceType(id));
        v.appendChild(e);
      });
      cadeauChamp(ex, 'Capacités', v);
    }
    cadeauCorpsEl.appendChild(ex);
  }

  // ---- Ce qui manque, dit en toutes lettres -------------------------------
  //
  // SEULEMENT QUAND IL MANQUE VRAIMENT. Le message général a disparu le jour où
  // les deux tiers des cartes ont reçu leur détail : le laisser partout aurait
  // fait douter des cartes complètes.
  if(!d){
    const manque = cadeauBloc('L’exemplaire distribué', 'absent');
    const p = document.createElement('p');
    p.className = 'cadeau-manque';
    p.textContent = 'Non relevé pour cette distribution — ' + CADEAU_A_RELEVER.join(', ')
      + '. Poképédia les documente évènement par évènement, mais le titre de sa '
      + 'section ne s’apparie pas toujours au libellé d’ici, et associer la '
      + 'mauvaise distribution serait pire que de n’en associer aucune.';
    manque.appendChild(p);
    cadeauCorpsEl.appendChild(manque);
  }

  cadeauOverlayEl.style.display = 'flex';
  setTimeout(function(){ if(cadeauFermerEl) cadeauFermerEl.focus(); }, 10);
}

function fermerCarteCadeau(){
  if(cadeauOverlayEl) cadeauOverlayEl.style.display = 'none';
}

// ---- Le câblage ---------------------------------------------------------------

[cadeauxGenEl, cadeauxJeuEl, cadeauxRareteEl].forEach(function(el){
  if(el) el.addEventListener('change', dessinerCadeaux);
});
if(cadeauxQEl) cadeauxQEl.addEventListener('input', dessinerCadeaux);

if(cadeauFermerEl) cadeauFermerEl.addEventListener('click', fermerCarteCadeau);
if(cadeauOverlayEl){
  cadeauOverlayEl.addEventListener('click', function(e){
    if(e.target === cadeauOverlayEl) fermerCarteCadeau();
  });
}
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && cadeauOverlayEl
     && cadeauOverlayEl.style.display === 'flex') fermerCarteCadeau();
});
