// La présence Discord — ce que vos amis voient sous votre nom.
//
// Script classique, chargé APRÈS accueil.js et compte.js : il enveloppe
// showPage() et lit profilCourant, qui n'existent qu'après eux.
//
// Deux lignes, pas plus. Discord n'en affiche pas davantage :
//
//     PokéArchive
//     Pokédex de Rouge / Bleu        ← ce qu'on fait
//     Tennosei — Aventure 1          ← qui
//     depuis 42 minutes
//
// CE QUI N'Y VA PAS. Une présence se lit par n'importe qui dans la liste
// d'amis, y compris par des gens qu'on ne connaît pas. Le pseudo et le nom
// d'aventure y sont parce qu'ils sont déjà publics dans l'application. Le reste
// n'y est pas : ni l'avancement chiffré — « 3 / 1025 » n'a pas à s'afficher
// devant tout Discord —, ni rien qui vienne de la session.
//
// Côté Rust, presence.rs se tait si Discord n'est pas ouvert. Ici, on ne
// vérifie donc rien : on annonce, et ce qui doit être ignoré l'est.

// Ce qu'on annonce pour chaque écran. Les libellés sont écrits pour être lus
// par quelqu'un d'autre — « Cherche un dresseur » plutôt que « Dresseurs ».
const PRESENCE_ECRANS = {
  home:         'Sur son tableau de bord',
  jeux:         'Choisit un Pokédex',
  dresseurs:    'Cherche un dresseur',
  chasse:       'À la chasse aux chromatiques',
  cadeaux:      'Consulte les Cadeaux Mystère',
  strategie:    'Prépare une équipe',
  reproduction: 'Consulte la reproduction',
  profil:       'Sur son profil',
};

// Deux mises à jour à quelques millisecondes d'écart ne servent à rien, et
// showPage() est appelée en rafale au démarrage. On laisse retomber.
let presenceMinuteur = null;
const PRESENCE_DELAI = 400;

/** Ce qu'on fait, en une ligne. */
function presenceQuoi(){
  if(typeof currentPage === 'undefined') return 'Ouvre PokéArchive';

  if(currentPage === 'dex' || currentPage === 'home'){
    // Sur un Pokédex de jeu, c'est le jeu qui compte. Sur celui d'ensemble,
    // dire « Pokémon HOME » serait obscur pour qui ne connaît pas.
    const jeu = (typeof gameByKey !== 'undefined') && gameByKey[currentTab];
    if(jeu) return 'Pokédex de ' + (jeu.title || jeu.tab || currentTab);
    if(currentPage === 'home') return PRESENCE_ECRANS.home;
    return 'Sa collection complète';
  }
  return PRESENCE_ECRANS[currentPage] || 'Sur PokéArchive';
}

/** Qui, en une ligne. */
function presenceQui(){
  const pseudo = (typeof dresseurCourant !== 'undefined' && dresseurCourant)
    ? dresseurCourant.pseudo : null;
  const aventure = (typeof profilCourant !== 'undefined' && profilCourant)
    ? profilCourant.nom : null;

  if(pseudo && aventure) return pseudo + ' — ' + aventure;
  if(pseudo) return pseudo;
  // Pas encore connecté : on ne laisse pas la ligne vide, Discord afficherait
  // un trou sous le titre.
  return 'Pas encore connecté';
}

/** Annonce l'état courant. Sans effet si Discord n'écoute pas. */
function presenceMaj(){
  const invoke = window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke;
  if(!invoke) return;                       // banc d'essai, ou page de génération
  invoke('presence_maj', { etat: { quoi: presenceQuoi(), qui: presenceQui() } })
    .catch(function(){ /* une décoration ne remonte pas d'erreur */ });
}

/** Groupe les appels rapprochés : un seul message part. */
function presencePlusTard(){
  if(presenceMinuteur) clearTimeout(presenceMinuteur);
  presenceMinuteur = setTimeout(presenceMaj, PRESENCE_DELAI);
}

/** Efface la présence — à la déconnexion. */
function presenceEffacer(){
  const invoke = window.__TAURI__ && window.__TAURI__.core && window.__TAURI__.core.invoke;
  if(!invoke) return;
  invoke('presence_effacer').catch(function(){});
}

// On enveloppe showPage plutôt que d'ajouter un appel à chacune de ses sorties :
// elle en compte trois, et une quatrième ajoutée un jour oublierait la
// présence sans que rien ne le signale. Le procédé est déjà celui de compte.js,
// qui remplace les fonctions parlant au serveur local.
document.addEventListener('DOMContentLoaded', function(){
  if(typeof showPage === 'function'){
    const original = showPage;
    window.showPage = function(){
      const r = original.apply(this, arguments);
      presencePlusTard();
      return r;
    };
  }
  presencePlusTard();
});
