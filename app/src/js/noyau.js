// Elements du DOM, constantes, stockage local et sprites.
// Script classique (pas de module ES) : l'app reste ouvrable en file://

const listEl = document.getElementById('list');
const stateMsg = document.getElementById('state-msg');
const searchEl = document.getElementById('search');
const sortEl = document.getElementById('sort');
// Vrai des qu'on a touche au menu de tri soi-meme. Tant qu'il est faux, le tri
// suit l'onglet — « N° du jeu » dans un jeu, alphabetique ailleurs. Une fois
// vrai, plus rien ne le defait : un tri choisi est un choix.
let triChoisi = false;
const filterEl = document.getElementById('filter');
const genFilterEl = document.getElementById('genFilter');
const shinyViewBtn = document.getElementById('shinyView');
const niveauFormesEl = document.getElementById('niveauFormes');
const typeFilterEl = document.getElementById('typeFilter');
const bulkBar = document.getElementById('bulkBar');
const bulkLabel = document.getElementById('bulkLabel');
const bulkCheckBtn = document.getElementById('bulkCheck');
const bulkUncheckBtn = document.getElementById('bulkUncheck');
const themeBtn = document.getElementById('themeBtn');
// La langue se règle dans les Paramètres. Le bouton « Français » de l'en-tête
// n'existe plus : il disait une langue sans dire de quoi, et occupait la barre
// en permanence pour un choix qu'on fait une fois.
const langueChoix = document.getElementById('langueChoix');
const clocheBtn = document.getElementById('clocheBtn');
const clochePastille = document.getElementById('clochePastille');
const clochePanneau = document.getElementById('clochePanneau');
const clocheListe = document.getElementById('clocheListe');
const clocheToutLu = document.getElementById('clocheToutLu');

// Les échanges : la barre de proposition au pied de l'entraide, la liste sur la
// page des amis, et la discussion.
const trocBarre = document.getElementById('trocBarre');
const trocVeux = document.getElementById('trocVeux');
const trocDonne = document.getElementById('trocDonne');
const trocMot = document.getElementById('trocMot');
const trocJeu = document.getElementById('trocJeu');
const trocEnvoyer = document.getElementById('trocEnvoyer');
const trocEtat = document.getElementById('trocEtat');
const trocListe = document.getElementById('trocListe');
const discussionOverlay = document.getElementById('discussionOverlay');
const discussionEyebrow = document.getElementById('discussionEyebrow');
const discussionTitre = document.getElementById('discussionTitre');
const discussionResume = document.getElementById('discussionResume');
const discussionFil = document.getElementById('discussionFil');
const discussionTexte = document.getElementById('discussionTexte');
const discussionEnvoyer = document.getElementById('discussionEnvoyer');
const discussionFermer = document.getElementById('discussionFermer');
const discussionEtat = document.getElementById('discussionEtat');
const aPortee = document.getElementById('aPortee');
const accueilAventure = document.getElementById('accueilAventure');
const accueilJournal = document.getElementById('accueilJournal');

// Nombre de cartes de chaque Pokédex, renseigné au fur et à mesure qu'on les
// ouvre : l'accueil s'en sert pour dessiner ses barres.
const gameTotals = {};
const loadMoreBtn = document.getElementById('loadMore');
// Le menu du compte, en en-tête : identité, aventures, réinitialisation,
// déconnexion. Exporter et importer ont disparu — tout est sur le compte.
const compteMenu = document.getElementById('compteMenu');
const comptePanneau = document.getElementById('comptePanneau');
const comptePseudo = document.getElementById('comptePseudo');
const compteAventure = document.getElementById('compteAventure');
const gaugeFill = document.getElementById('gaugeFill');
const gaugeValue = document.getElementById('gaugeValue');
const caughtCountEl = document.getElementById('caughtCount');
const totalCountEl = document.getElementById('totalCount');
const shinyCountEl = document.getElementById('shinyCount');
const totalCountShinyEl = document.getElementById('totalCountShiny');
const statLineNormal = document.getElementById('statLineNormal');
const statLineShiny = document.getElementById('statLineShiny');
const pageNav = document.getElementById('pageNav');
const scopeHead = document.getElementById('scopeHead');
const scopeTitle = document.getElementById('scopeTitle');
const scopeVariant = document.getElementById('scopeVariant');
const scopeBascule = document.getElementById('scopeBascule');
const scopeSecondNom = document.getElementById('scopeSecondNom');
const scopeNote = document.getElementById('scopeNote');
const pageDexEl = document.getElementById('page-dex');
const pageHomeEl = document.getElementById('page-home');
// Propres à PokéArchive : la page de partage et la connexion Discord.
const pageDresseursEl = document.getElementById('page-dresseurs');
const pageAmisEl = document.getElementById('page-amis');
const amisQ = document.getElementById('amisQ');
const amisSuivre = document.getElementById('amisSuivre');
const amisErreur = document.getElementById('amisErreur');
const amisListe = document.getElementById('amisListe');
const amisFil = document.getElementById('amisFil');
const amisPlus = document.getElementById('amisPlus');
const amisNotif = document.getElementById('amisNotif');
const visibleDresseurs = document.getElementById('visibleDresseurs');
const visibleEtat = document.getElementById('visibleEtat');
const retroBloc = document.getElementById('retroBloc');
const succesBloc = document.getElementById('succesBloc');
const succesBtn = document.getElementById('succesBtn');
const succesResume = document.getElementById('succesResume');
const succesOverlay = document.getElementById('succesOverlay');
const succesTitre = document.getElementById('succesTitre');
const succesEyebrow = document.getElementById('succesEyebrow');
const succesFermer = document.getElementById('succesFermer');
const tableEre = document.getElementById('tableEre');
const tableEreNote = document.getElementById('tableEreNote');
const nouveautesBtn = document.getElementById('nouveautesBtn');
const nouveautesOverlay = document.getElementById('nouveautesOverlay');
const nouveautesListe = document.getElementById('nouveautesListe');
const nouveautesFermer = document.getElementById('nouveautesFermer');
const pageLieuxEl = document.getElementById('page-lieux');
const lieuxJeu = document.getElementById('lieuxJeu');
const lieuxRestants = document.getElementById('lieuxRestants');
const lieuxQ = document.getElementById('lieuxQ');
const lieuxResume = document.getElementById('lieuxResume');
const lieuxListe = document.getElementById('lieuxListe');
const pageProfilEl = document.getElementById('page-profil');
const pageParametresEl = document.getElementById('page-parametres');
const pageChasseEl = document.getElementById('page-chasse');
const pageJeuxEl = document.getElementById('page-jeux');
const pageCadeauxEl = document.getElementById('page-cadeaux');
const pageStrategieEl = document.getElementById('page-strategie');
const pageReproductionEl = document.getElementById('page-reproduction');
const pageTransfertsEl = document.getElementById('page-transferts');
const ficheEffort = document.getElementById('ficheEffort');
const ficheOeufs = document.getElementById('ficheOeufs');
const authOverlay = document.getElementById('authOverlay');
const authErreur = document.getElementById('authErreur');
const authConnexion = document.getElementById('authConnexion');
const authLibelle = document.getElementById('authLibelle');
const homePlayerEl = document.getElementById('homePlayer');
const homeSummaryEl = document.getElementById('homeSummary');
const homeGensEl = document.getElementById('homeGens');
const homeModeEl = document.getElementById('homeMode');
const homeGaugeNormal = document.getElementById('homeGaugeNormal');
const homeGaugeNormalValue = document.getElementById('homeGaugeNormalValue');
const homeGaugeShiny = document.getElementById('homeGaugeShiny');
const homeGaugeShinyValue = document.getElementById('homeGaugeShinyValue');
const homeNormalCount = document.getElementById('homeNormalCount');
const homeNormalTotal = document.getElementById('homeNormalTotal');
const homeShinyCount = document.getElementById('homeShinyCount');
const homeShinyTotal = document.getElementById('homeShinyTotal');
const readoutLeft = document.getElementById('readout-left');
const saveModeLabel = document.getElementById('saveModeLabel');
const playerBadge = document.getElementById('playerBadge');
const playerNameText = document.getElementById('playerNameText');
const importCodeBtn = document.getElementById('importCodeBtn');
const compareBar = document.getElementById('compareBar');
const compareLabel = document.getElementById('compareLabel');
const compareQuitBtn = document.getElementById('compareQuit');
const ficheTypes = document.getElementById('ficheTypes');
const ficheAffinites = document.getElementById('ficheAffinites');
const ficheStats = document.getElementById('ficheStats');
const ficheTalents = document.getElementById('ficheTalents');
const ficheEvolution = document.getElementById('ficheEvolution');
const ficheObtention = document.getElementById('ficheObtention');
const ficheBlocJeux = document.getElementById('ficheBlocJeux');
const fichePremier = document.getElementById('fichePremier');
const ficheJeux = document.getElementById('ficheJeux');
const ficheAttaquesJeux = document.getElementById('ficheAttaquesJeux');
const ficheAttaques = document.getElementById('ficheAttaques');
const ficheAttaquesNav = document.getElementById('ficheAttaquesNav');
const ficheAttaquesFiltre = document.getElementById('ficheAttaquesFiltre');
const ficheObtentionNav = document.getElementById('ficheObtentionNav');
const previewOverlay = document.getElementById('previewOverlay');
const previewClose = document.getElementById('previewClose');
const previewFrame = document.getElementById('previewFrame');
const portraitCri = document.getElementById('portraitCri');
const portraitSon = document.getElementById('portraitSon');
const portraitVolume = document.getElementById('portraitVolume');
const apparenceListe = document.getElementById('apparenceListe');
const apparenceRaz = document.getElementById('apparenceRaz');
const previewImg = document.getElementById('previewImg');
const previewNo = document.getElementById('previewNo');
const previewName = document.getElementById('previewName');
const previewMeta = document.getElementById('previewMeta');
const previewStates = document.getElementById('previewStates');
const ficheNomAutre = document.getElementById('ficheNomAutre');
const ficheGabarit = document.getElementById('ficheGabarit');
const ficheDexRegionaux = document.getElementById('ficheDexRegionaux');
const ficheNotice = document.getElementById('ficheNotice');
const ficheBlocNotice = document.getElementById('ficheBlocNotice');
const fichePaliers = document.getElementById('fichePaliers');
const portraitSource = document.getElementById('portraitSource');

const STORAGE_KEY = 'living-dex-progress';
const BATCH_SIZE = 60;
const GAUGE_CIRCUMFERENCE = 2 * Math.PI * 31; // matches r=31 in the SVG
const usingClaudeStorage = !!(window.storage && typeof window.storage.get === 'function');



let allEntries = [];       // {id, speciesId, name, display, gen}

// ---- Progression, séparée par Pokédex -----------------------------------
// Chaque onglet a sa propre collection : posséder Bulbizarre dans Épée ne le
// donne pas dans Écarlate. « national » est la collection Pokémon HOME, qui
// reste la vue d'ensemble mais ne se remplit plus toute seule.
// caughtSet / shinySet pointent toujours sur la collection de l'onglet
// courant : tout le reste du code continue de les utiliser sans rien savoir
// de ce découpage.
// Une collection par Pokedex, deduite de GAMES : ajouter un jeu suffit, il n'y
// a pas de seconde liste a tenir a jour. Elle etait figee sur les huit jeux
// d'origine, si bien que les douze ajoutes ensuite n'avaient pas de collection
// creee au demarrage.
const DEX_KEYS = ['national'].concat(GAMES.map(function(g){ return g.key; }));
let allProgress = {};
let caughtSet = new Set();
let shinySet = new Set();

function bucketFor(key){
  if(!allProgress[key]) allProgress[key] = { caught: new Set(), shiny: new Set() };
  return allProgress[key];
}

// Bascule les deux variables partagées sur la collection d'un Pokédex.
function useDexProgress(key){
  const b = bucketFor(key === 'home' ? 'national' : key);
  caughtSet = b.caught;
  shinySet = b.shiny;
}

// Repartir de zéro : aucune capture, aucune chasse. Cette fonction ne lit
// rien — elle vide.
//
// Elle portait un bloc qui tentait de recharger les chasses depuis « data »,
// recopié de progressFromJSON où ce paramètre existe. Ici il n'existait pas :
// l'appel levait un ReferenceError qui interrompait la fonction avant
// useDexProgress, et ouvrir une aventure laissait le dex à moitié réinitialisé.
function resetAllProgress(){
  allProgress = {};
  DEX_KEYS.forEach(bucketFor);
  if(typeof chasses !== 'undefined'){
    chasses = [];
    if(typeof chassesFinies !== 'undefined') chassesFinies = [];
    if(typeof dessinerChasses === 'function') dessinerChasses();
  }
  if(typeof objectifs !== 'undefined'){
    objectifs = [];
    if(typeof dessinerObjectifs === 'function') dessinerObjectifs();
  }
  if(typeof detailsCapture !== 'undefined') detailsCapture = {};
  useDexProgress(typeof currentTab !== 'undefined' ? currentTab : 'national');
}

function progressToJSON(){
  const out = {};
  Object.keys(allProgress).forEach(function(k){
    out[k] = {
      caught: Array.from(allProgress[k].caught),
      shiny: Array.from(allProgress[k].shiny)
    };
  });
  return out;
}

// Accepte le nouveau format (dex par dex) comme l'ancien (une seule liste,
// qui devient alors la collection Pokémon HOME).
function progressFromJSON(data){
  allProgress = {};
  DEX_KEYS.forEach(bucketFor);
  if(data && data.dex){
    Object.keys(data.dex).forEach(function(k){
      const b = bucketFor(k);
      b.caught = new Set(data.dex[k].caught || []);
      b.shiny = new Set(data.dex[k].shiny || []);
    });
  } else if(data && (data.caught || data.shiny)){
    const b = bucketFor('national');
    b.caught = new Set(data.caught || []);
    b.shiny = new Set(data.shiny || []);
  }

  // Les chasses voyagent avec le dex — buildSavePayload les y écrit depuis le
  // début. Personne ne les relisait : c'est ici leur place, la seule fonction
  // qui reçoive la sauvegarde.
  if(typeof chasses !== 'undefined'){
    chasses = Array.isArray(data && data.chasses) ? data.chasses : [];
    // Les chasses enregistrées avant la refonte des méthodes sont traduites à
    // la lecture : elles gardent leur compteur et retrouvent leur taux.
    if(typeof migrerChasse === 'function') chasses.forEach(migrerChasse);
    // Les chasses abouties suivent le même chemin. Une sauvegarde antérieure
    // au tableau de chasse n'en a pas : la liste vide est la bonne réponse,
    // et non une erreur — on n'a simplement rien gardé de ce temps-là.
    if(typeof chassesFinies !== 'undefined'){
      chassesFinies = Array.isArray(data && data.chassesFinies) ? data.chassesFinies : [];
      if(typeof migrerChasse === 'function') chassesFinies.forEach(migrerChasse);
    }
    if(typeof dessinerChasses === 'function') dessinerChasses();
  }

  // Les objectifs sur mesure voyagent avec le dex, pour la meme raison que les
  // chasses : ils appartiennent a l'aventure, et changer de machine doit les
  // retrouver. Une sauvegarde anterieure n'en a pas — la liste vide est alors
  // la bonne reponse, et non une erreur.
  if(typeof objectifs !== 'undefined'){
    objectifs = Array.isArray(data && data.objectifs) ? data.objectifs : [];
    if(typeof dessinerObjectifs === 'function') dessinerObjectifs();
  }

  // Les fiches de capture, rangées par Pokedex puis par nom. Une sauvegarde
  // qui n'en a pas rend un objet vide — c'est le cas de toutes celles d'avant.
  if(typeof detailsCapture !== 'undefined'){
    const d = data && data.detailsCapture;
    detailsCapture = (d && typeof d === 'object' && !Array.isArray(d)) ? d : {};
  }

  useDexProgress(typeof currentTab !== 'undefined' ? currentTab : 'national');
}

// ---- Langue des noms de Pokemon -----------------------------------------
// Elle ne touche QUE les noms d'especes et de formes : l'interface reste en
// francais. Le choix vit dans localStorage, comme le theme — c'est une
// preference d'affichage propre a l'appareil, pas une donnee de progression.
const LANGUE_KEY = 'pokearchive-langue-noms';
let langueNoms = 'fr';

// Le nom a afficher pour une entree. Les donnees embarquees anciennes n'ont
// pas de « displayEn » : on retombe alors sur le francais plutot que sur rien.
function nomAffiche(entry){
  if(langueNoms === 'en') return entry.displayEn || entry.display;
  return entry.display;
}

let playerName = '';
let shinyView = false;
let renderedCount = 0;
let currentFiltered = [];
let lastGenHeader = null;
let saveTimer = null;

// ---- Sprite resolution -------------------------------------------------
// Priority order, tried in the browser via onerror fallbacks:
//   1) A local file in ./Sprites/ (or ./Sprites/shiny/), for anyone who
//      dropped their own rips from spriters-resource.com next to this file
//   2) PokeOS's Pokémon HOME renders, keyed by PokeAPI id (forms included)
//   3) PokeAPI's official artwork mirror (high-resolution, ~475x475)
//   4) Pokémon Showdown's "home" sprite set (smaller, but very complete)
//   5) A generic placeholder icon if nothing loads
function localSpriteUrl(name, shiny){
  return 'Sprites/' + (shiny ? 'shiny/' : '') + name + '.png';
}
function pokeosHomeUrl(id, shiny){
  const base = 'https://s3.pokeos.com/pokeos-uploads/assets/pokemon/home/render/';
  return base + (shiny ? 'shiny/' : '') + id + '.png?v=3';
}
function officialArtworkUrl(id, shiny){
  const base = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/';
  return base + (shiny ? 'shiny/' : '') + id + '.png';
}
// ---- Les sprites d'époque -----------------------------------------------
// Showdown héberge un jeu de sprites par génération, sur le même domaine que
// celui déjà utilisé en dernier repli : rien à télécharger, rien à ajouter au
// CSP, et le nom de fichier se calcule avec toShowdownSlug() comme le reste.
//
// Deux limites tiennent à la source, pas au code :
//   · la première génération n'a pas de chromatiques — sur Rouge/Bleu et
//     Jaune, la vue shiny garde le sprite normal ;
//   · à partir de X/Y il n'existe plus de sprite 2D : le bouton disparaît, et
//     les rendus HOME restent seuls.
const SPRITES_DE_JEU = {
  rby:      { normal: 'gen1rb',   shiny: null },
  jaune:    { normal: 'gen1',     shiny: null },
  gsc:      { normal: 'gen2g',    shiny: 'gen2-shiny' },
  cristal:  { normal: 'gen2',     shiny: 'gen2-shiny' },
  rse:      { normal: 'gen3rs',   shiny: 'gen3-shiny' },
  emeraude: { normal: 'gen3',     shiny: 'gen3-shiny' },
  frlg:     { normal: 'gen3frlg', shiny: 'gen3-shiny' },
  dp:       { normal: 'gen4',     shiny: 'gen4-shiny' },
  pt:       { normal: 'gen4',     shiny: 'gen4-shiny' },
  hgss:     { normal: 'gen4',     shiny: 'gen4-shiny' },
  bw:       { normal: 'gen5',     shiny: 'gen5-shiny' },
  b2w2:     { normal: 'gen5',     shiny: 'gen5-shiny' }
};

function spritesDuJeu(cleJeu){
  return SPRITES_DE_JEU[cleJeu] || null;
}

// L'adresse du sprite d'époque, ou null si le jeu n'en a pas.
function spriteEpoqueUrl(cleJeu, slug, shiny){
  const jeu = spritesDuJeu(cleJeu);
  if(!jeu) return null;
  const dossier = (shiny && jeu.shiny) || jeu.normal;
  return 'https://play.pokemonshowdown.com/sprites/' + dossier + '/' + slug + '.png';
}

// Le sprite animé : 85 × 98, quarante-quatre images, sur le domaine déjà
// interrogé pour les sprites d'époque. La fiche le double exactement, au plus
// proche voisin — étiré à la taille d'un rendu HOME, il baverait.
function spriteAnimeUrl(slug, shiny){
  return 'https://play.pokemonshowdown.com/sprites/'
    + (shiny ? 'ani-shiny/' : 'ani/') + slug + '.gif';
}

function showdownSpriteUrl(slug, shiny){
  const base = 'https://play.pokemonshowdown.com/sprites/';
  return (shiny ? base + 'home-shiny/' : base + 'home/') + slug + '.png';
}


// Showdown colle en un seul bloc les suffixes de formes cosmétiques
// (« vivillon-icy-snow » devient « vivillon-icysnow ») et s'arrête parfois
// à une partie du suffixe : il dessine « alcremie-caramelswirl » sans le
// bonbon, faute d'illustration distincte. On propose donc des slugs de plus
// en plus courts, du plus précis au plus générique, et on garde le premier
// qui répond — ça couvre Charmilly, Météno ou Tapatoès sans cas particulier.
function showdownFormCandidates(pokeApiName){
  const parts = toShowdownSlug(pokeApiName).split('-');
  const out = [];
  for(let k = parts.length; k >= 2; k--){
    out.push(parts[0] + '-' + parts.slice(1, k).join(''));
  }
  out.push(parts[0]);
  return out;
}

function toShowdownSlug(pokeApiName){
  let s = pokeApiName;
  SHOWDOWN_COMPRESSIONS.forEach(function(pair){ s = s.split(pair[0]).join(pair[1]); });
  s = s.replace('mega-x','megax').replace('mega-y','megay');
  s = s.replace('-female','-f');
  return s;
}

function titleCase(word){
  return word.charAt(0).toUpperCase() + word.slice(1);
}

function getGeneration(speciesId){
  for(let i=0;i<GEN_RANGES.length;i++){
    if(speciesId >= GEN_RANGES[i].min && speciesId <= GEN_RANGES[i].max) return GEN_RANGES[i].gen;
  }
  return 0;
}

function extractId(url){
  const parts = url.split('/').filter(Boolean);
  return parseInt(parts[parts.length - 1], 10);
}

// ---- Depuis quand ---------------------------------------------------------
// Treize lignes de calcul de date, sans un mot de compte ni de session. Elle
// vivait dans compte.js, que les pages de génération ne chargent pas : une
// chasse datée y cassait la liste entière. Elle sert des deux côtés — la liste
// des chasses et le journal du profil — et sa place est donc ici.
function depuisQuand(iso){
  const d = new Date(iso);
  if(isNaN(d)) return '';
  const jours = Math.floor((Date.now() - d.getTime()) / 86400000);
  if(jours <= 0) return "aujourd'hui";
  if(jours === 1) return 'hier';
  if(jours < 31) return 'il y a ' + jours + ' jours';
  const mois = Math.floor(jours / 30);
  return 'il y a ' + mois + (mois === 1 ? ' mois' : ' mois');
}

// ---- Storage: uses Claude's persistent storage when available,
// falls back to the browser's own localStorage when the file is
// opened standalone (downloaded, or hosted outside claude.ai).
async function storageGet(key){
  if(usingClaudeStorage){
    try{
      const result = await window.storage.get(key, false);
      return result ? result.value : null;
    }catch(e){ return null; }
  }
  try{ return localStorage.getItem(key); }catch(e){ return null; }
}

async function storageSet(key, value){
  if(usingClaudeStorage){
    try{ await window.storage.set(key, value, false); }
    catch(e){ console.error('Erreur de sauvegarde :', e); }
    return;
  }
  try{ localStorage.setItem(key, value); }
  catch(e){ console.error('Erreur de sauvegarde locale :', e); }
}

function updateSaveModeLabel(){
  const prefix = 'Données : PokéAPI · Sprites : rendus Pokémon HOME · Suivi ';
  let where;
  if(serverMode) where = 'sauvegardé dans le dossier « save »';
  else if(usingClaudeStorage) where = 'sauvegardé automatiquement';
  else where = 'sauvegardé dans ce navigateur (localStorage)';
  saveModeLabel.textContent = prefix + where;
}
