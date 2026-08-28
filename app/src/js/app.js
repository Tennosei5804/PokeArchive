// Theme clair/sombre, cablage des controles et demarrage.
// Script classique (pas de module ES) : l'app reste ouvrable en file://

// ---- Thème clair / sombre ----------------------------------------------
// Le choix vit dans localStorage et non dans la sauvegarde : c'est une
// préférence d'affichage propre à l'appareil, pas une donnée de progression.
const THEME_KEY = 'living-dex-theme';

function applyTheme(dark){
  document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
  if(!themeBtn) return;
  // Le bouton est passé dans le menu du compte : il porte un libellé, pas une
  // icône seule. Le <span> existe là-bas et pas ailleurs, d'où le repli — les
  // pages de génération gardent leur pastille ronde.
  const nom = themeBtn.querySelector('.compte-item-nom');
  const dit = dark ? '☀️ Passer en clair' : '🌙 Passer en sombre';
  if(nom) nom.textContent = dit;
  else themeBtn.textContent = dark ? '☀️' : '🌙';
  themeBtn.setAttribute('aria-pressed', String(dark));
  themeBtn.title = dark ? 'Passer en clair' : 'Passer en sombre';
}

function initTheme(){
  let stored = null;
  try{ stored = localStorage.getItem(THEME_KEY); }catch(e){ /* stockage refusé */ }
  // Le sombre est le thème par défaut de l'application ; le réglage système
  // n'est pas consulté. Le choix de l'utilisateur, lui, est toujours respecté.
  const dark = stored ? stored === 'dark' : true;
  applyTheme(dark);
}

if(themeBtn) themeBtn.addEventListener('click', function(){
  const dark = document.documentElement.getAttribute('data-theme') !== 'dark';
  applyTheme(dark);
  try{ localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light'); }catch(e){ /* ignore */ }
});

initTheme();

// ---- Langue des noms de Pokémon ----------------------------------------
// Seuls les noms d'espèces changent : l'interface reste en français, c'est
// exactement ce qui est demandé.
//
// LE RÉGLAGE A QUITTÉ L'EN-TÊTE. Un bouton qui disait « Français » sans dire
// de quoi ne se comprenait qu'en cliquant dessus, et il occupait la barre en
// permanence pour une chose qu'on règle une fois. Il vit maintenant dans les
// Paramètres, sous une étiquette qui nomme les deux options — le libellé dit
// « Dracaufeu » et « Charizard » plutôt que « français » et « anglais », parce
// que c'est le nom qu'on cherche, pas la langue.
function appliquerLangue(langue){
  langueNoms = (langue === 'en') ? 'en' : 'fr';
  if(langueChoix) langueChoix.value = langueNoms;
}

function initLangue(){
  let stored = null;
  try{ stored = localStorage.getItem(LANGUE_KEY); }catch(e){ /* stockage refusé */ }
  appliquerLangue(stored || 'fr');
}

/** Le changement, d'où qu'il vienne : le tri, la recherche et la fiche suivent. */
function changerLangue(vers){
  appliquerLangue(vers);
  try{ localStorage.setItem(LANGUE_KEY, langueNoms); }catch(e){ /* ignore */ }
  // Le tri alphabétique et la recherche portent sur le nom affiché : les deux
  // changent de sens avec la langue, il faut donc refiltrer et non repeindre.
  renderList(true);
  // La pop-up ouverte doit suivre, sinon elle garde le nom de l'autre langue.
  if(previewEntry && previewOverlay.style.display === 'flex'){
    previewName.textContent = nomAffiche(previewEntry);
  }
}

if(langueChoix){
  langueChoix.addEventListener('change', function(){ changerLangue(langueChoix.value); });
}

initLangue();

async function init(){
  // Les navigateurs restaurent la valeur des champs au rechargement : sans
  // ce nettoyage, on retrouve une recherche ou un filtre de la session
  // précédente, et la grille paraît vide sans raison visible.
  // Le tri suit l'onglet tant qu'on n'en a pas choisi un : « N° du jeu » dans
  // un jeu, où l'on suit le Pokédex tel que la console le numérote, et
  // alphabétique ailleurs — sur HOME, « N° du jeu » ne veut rien dire.
  // updateSortOptions() pose la bonne valeur ; celle-ci n'est que le point de
  // départ, avant qu'un onglet soit ouvert.
  sortEl.value = 'name';
  triChoisi = false;
  resetFilters();          // resynchronise aussi les menus stylisés
  updateSaveModeLabel();
  await loadProgress();

  // Dans PokéArchive, l'identité vient de Discord : plus de pseudo à saisir ni
  // de profil à choisir. La session décide, et c'est l'API qui détient la
  // progression — le dossier « save » local n'a plus de raison d'être.
  serverMode = true;

  const connecte = await ouvrirSession();   // défini dans compte.js
  if(connecte){
    // Les aventures du compte, et l'ouverture de celle qui doit l'être. C'est
    // aussi ce qui charge la progression depuis le serveur : un dresseur qui
    // change d'ordinateur retrouve tout, sans rien avoir emporté.
    await demarrerProfils();
  } else {
    // Sans compte, il n'y a rien à afficher ni à enregistrer : la modale de
    // connexion reste ouverte. Le reste du démarrage continue quand même, pour
    // que la grille soit déjà prête au moment où la connexion aboutit.
    resetAllProgress();
  }

  updateSaveModeLabel();
  updatePlayerBadge();
  // Le cache d'abord : l'application démarre instantanément et fonctionne
  // hors ligne. Le réseau n'est sollicité que s'il n'y a rien en réserve.
  const enCache = cacheLire('entrees');
  if(enCache && enCache.length){
    allEntries = enCache;
    // Le périmètre HOME, pas la réserve brute : les formes de combat n'y
    // entrent pas, au démarrage comme après un changement d'onglet.
    scopeEntries = poolHome();
    // « hors ligne » était trompeur ici : l'application lit sa réserve locale
    // même quand la connexion est parfaitement disponible.
    readoutLeft.textContent = 'Pokémon HOME — ' + scopeEntries.length + ' entrées · réserve locale';
    updateProgress();
    renderList(true);
    majEtatCache();
    majEtatReleve();
    return;
  }

  try{
    allEntries = await construireEntrees();
    cacheEcrire('entrees', allEntries);
    readoutLeft.textContent = 'Pokémon HOME — collection complète';
    scopeEntries = poolHome();   // le scope de départ est le Dex National
    updateProgress();
    renderList(true);
    majEtatCache();
    majEtatReleve();
  }catch(err){
    stateMsg.textContent = "Connexion au PokéAPI impossible, et aucune donnée en réserve. "
      + "Connecte-toi une fois : tout sera ensuite disponible hors ligne.";
    readoutLeft.textContent = 'Erreur de connexion';
    listEl.innerHTML = '';
    listEl.appendChild(stateMsg);
    // L'accueil est la page d'atterrissage : sans ça il resterait bloqué sur
    // « Chargement… » sans jamais dire pourquoi.
    homeSummaryEl.textContent = "Connexion au PokéAPI impossible et aucune donnée en réserve. "
      + "Connecte-toi une fois pour que l'application fonctionne ensuite hors ligne.";
    homeGensEl.innerHTML = '<div class="state-msg">Indisponible hors ligne.</div>';
  }
}

searchEl.addEventListener('input', function(){ renderList(true); });
sortEl.addEventListener('change', function(){ triChoisi = true; renderList(true); });
filterEl.addEventListener('change', function(){ markActiveFilters(); renderList(true); });
genFilterEl.addEventListener('change', function(){ markActiveFilters(); renderList(true); });
loadMoreBtn.addEventListener('click', function(){ renderList(false); });

// Le bas de fenêtre n'a plus de boutons : les aventures se gèrent dans le menu
// du compte et la page Profil, et les listes de référence sont embarquées — il
// n'y a plus rien à rafraîchir depuis l'interface.

function filteredSignature(){
  return currentFiltered.map(function(e){ return e.name; }).join('|');
}

function setShinyView(value){
  if(shinyView === value) return;
  shinyView = value;
  shinyViewBtn.setAttribute('aria-pressed', String(shinyView));
  shinyViewBtn.textContent = shinyView ? 'Vue normale' : 'Vue ✨ shiny';
  pageDexEl.classList.toggle('mode-shiny', shinyView);
  updateProgress();
}

shinyViewBtn.addEventListener('click', function(){
  // On bascule sans arrêt entre les deux formes : repartir en haut de la
  // grille à chaque fois rendrait l'app pénible. On restaure donc la position
  // et le nombre de cartes déjà chargées — sauf si le filtre actif change la
  // liste elle-même, auquel cas la position n'aurait plus de sens.
  const prevScroll = listEl.scrollTop;
  const prevRendered = renderedCount;
  const prevSignature = filteredSignature();

  setShinyView(!shinyView);
  renderList(true);

  if(filteredSignature() === prevSignature){
    while(renderedCount < prevRendered && renderedCount < currentFiltered.length){
      renderList(false);
    }
    const previous = listEl.style.scrollBehavior;
    listEl.style.scrollBehavior = 'auto'; // pas d'animation sur une restauration
    listEl.scrollTop = prevScroll;
    listEl.style.scrollBehavior = previous;
  }
});

// Exporter et importer un fichier n'ont plus lieu d'être : la progression vit
// sur le compte, et se retrouve sur n'importe quel ordinateur en se connectant.
// La réinitialisation, elle, a rejoint le menu du compte — c'est là qu'on
// s'attend à trouver ce qui touche à ses données (voir compte.js).

init();
