// Cache local des donnees PokeAPI.
// Script classique (pas de module ES) : l'app reste ouvrable en file://
//
// Sans lui, l'application interroge le reseau a chaque lancement et devient
// inutilisable hors ligne — un defaut acceptable pour un usage personnel,
// beaucoup moins des qu'on la distribue.
//
// Ce qui est conserve : les listes (Pokemon, noms francais, Pokedex par jeu,
// types, formes supplementaires). Pas les images : 1351 sprites peseraient
// plus de 100 Mo, hors de portee du stockage navigateur. Elles restent donc
// servies par le cache HTTP habituel.

const CACHE_PREFIX = 'living-dex-cache-';

function cacheKey(nom){ return CACHE_PREFIX + nom; }

// La cle portait autrefois un numero de version a incrementer a la main quand
// la forme des donnees changeait. Il faisait double emploi avec
// purgerSiReserveePlusRecente(), plus bas : celui-ci compare la date de la
// reserve embarquee a ce que le stockage local a deja vu, et vide tout des
// qu'elles different. Une regeneration se propage donc d'elle-meme, sans que
// personne ait a penser a incrementer quoi que ce soit.
//
// Ce que l'on perd : changer la FORME des donnees sans regenerer la reserve
// n'invalide plus rien tout seul. Le cas est rare — la forme et le contenu
// bougent ensemble en pratique — et il se regle en regenerant la reserve, ce
// qui remet la date a jour.
//
// Les cles ecrites sous l'ancien format resteraient orphelines : on les efface
// une fois. Sans ca elles occuperaient le stockage indefiniment, sans jamais
// etre relues.
(function oublierAncienFormatDeCle(){
  try{
    const vieilles = [];
    for(let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && /^living-dex-cache-\d+-/.test(k)) vieilles.push(k);
    }
    vieilles.forEach(function(k){ localStorage.removeItem(k); });
    if(vieilles.length){
      console.log('Cache : ' + vieilles.length + ' entrée(s) à l\'ancien format effacée(s).');
    }
  }catch(e){ /* stockage refusé : rien à nettoyer de toute façon */ }
})();

// ---- Reserve embarquee ----------------------------------------------------
// donnees-embarquees.js, charge juste avant ce fichier, contient les listes de
// reference generees a la compilation. Elles ne dependent d'aucun dresseur et
// ne changent qu'a la sortie d'un jeu : les embarquer evite d'aller les
// chercher sur le reseau au premier lancement — ce qui echouait des que
// PokeAPI, GitHub ou la connexion manquaient a l'appel.

function reserveEmbarquee(nom){
  if(typeof DONNEES_EMBARQUEES === 'undefined') return null;
  if(nom.indexOf('dex-') === 0){
    return DONNEES_EMBARQUEES.dex[nom.slice(4)] || null;
  }
  const valeur = DONNEES_EMBARQUEES[nom];
  return valeur === undefined ? null : valeur;
}

function cacheLire(nom){
  try{
    const brut = localStorage.getItem(cacheKey(nom));
    if(brut){
      const paquet = JSON.parse(brut);
      if(paquet && paquet.d !== undefined) return paquet.d;
    }
  }catch(e){
    // stockage refuse, quota, ou JSON abime : la reserve embarquee, elle,
    // reste lisible dans tous les cas.
  }
  return reserveEmbarquee(nom);
}

function cacheEcrire(nom, valeur){
  try{
    localStorage.setItem(cacheKey(nom), JSON.stringify({ t: Date.now(), d: valeur }));
    return true;
  }catch(e){
    // Quota depasse : on purge nos propres entrees et on reessaie une fois.
    console.warn('Cache plein, purge et nouvel essai :', e);
    cacheVider();
    try{
      localStorage.setItem(cacheKey(nom), JSON.stringify({ t: Date.now(), d: valeur }));
      return true;
    }catch(e2){ return false; }
  }
}

// ---- La réserve embarquée prime sur un stockage local plus ancien ----------
// C'est le seul mécanisme d'invalidation depuis que le numéro de version a
// disparu de la clé, et il se suffit à lui-même : la réserve porte sa date de
// génération, on la compare à ce que le stockage a déjà vu.
//
// cacheLire consulte localStorage en premier : c'est voulu, une réserve
// rafraîchie doit l'emporter. Mais une nouvelle version de l'application
// apporte, elle, des données neuves — et sans cette purge, le stockage d'hier
// les masquait indéfiniment.
//
// Le cas s'est réellement produit : tant que la CSP bloquait GitHub, ni les
// noms français ni la table des espèces n'arrivaient. Les entrées ont donc été
// enregistrées avec des noms anglais et, faute de correspondance d'espèce,
// chaque forme alternative a pris son propre numéro — si bien que les seize
// formes de Hisui ne correspondaient plus à aucune entrée du Pokédex du jeu et
// disparaissaient de la grille.
const CACHE_MARQUEUR = CACHE_PREFIX + 'reserve-embarquee';

function purgerSiReserveePlusRecente(){
  if(typeof DONNEES_EMBARQUEES === 'undefined') return;
  const attendu = DONNEES_EMBARQUEES.genereLe || '';
  try{
    if(localStorage.getItem(CACHE_MARQUEUR) === attendu) return;
    const efface = cacheVider();
    // Le marqueur se pose après la purge : cacheVider efface tout ce qui porte
    // le préfixe, lui compris.
    localStorage.setItem(CACHE_MARQUEUR, attendu);
    if(efface) console.log('Réserve embarquée plus récente : ' + efface
      + ' entrée(s) périmée(s) effacée(s) du stockage local.');
  }catch(e){ /* stockage refusé : la réserve embarquée sert quand même */ }
}

function cacheDate(nom){
  try{
    const brut = localStorage.getItem(cacheKey(nom));
    return brut ? (JSON.parse(brut).t || 0) : 0;
  }catch(e){ return 0; }
}

function cacheVider(){
  try{
    const aSupprimer = [];
    for(let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && k.indexOf(CACHE_PREFIX) === 0) aSupprimer.push(k);
    }
    aSupprimer.forEach(function(k){ localStorage.removeItem(k); });
    return aSupprimer.length;
  }catch(e){ return 0; }
}

// Affiche en bas de fenetre ce que l'application garde en reserve, et depuis
// quand. Sans ca, « fonctionne hors ligne » resterait une promesse invisible.
function majEtatCache(){
  const el = document.getElementById('cacheLabel');
  if(!el) return;
  const quand = cacheDate('entrees');
  if(!quand){
    // Plus rien en stockage local ne veut plus dire « il faut une connexion » :
    // les listes voyagent avec l'application.
    const embarquee = reserveEmbarquee('entrees');
    if(embarquee){
      // Prudence sur la formule : ces listes-là ne demandent aucun réseau, mais
      // l'application en a besoin pour enregistrer la progression sur le compte.
      // Annoncer « aucune connexion nécessaire » laisserait croire le contraire.
      el.textContent = 'Réserve embarquée : ' + embarquee.length
        + ' entrées livrées avec l\'application — la connexion ne sert qu\'à enregistrer';
      el.classList.add('connected');
    } else {
      el.textContent = 'Réserve locale : vide — une connexion est nécessaire';
      el.classList.remove('connected');
    }
    return;
  }
  const jours = Math.floor((Date.now() - quand) / 86400000);
  const age = jours === 0 ? "aujourd'hui" : (jours === 1 ? 'hier' : 'il y a ' + jours + ' jours');
  // Formulé comme une capacité, pas comme un état : l'ancienne version disait
  // « Hors ligne : … » et se lisait comme une panne de connexion.
  el.textContent = 'Réserve locale : ' + Math.round(cacheTaille() / 1024)
    + ' Ko, constituée ' + age + ' — l\'app fonctionne sans connexion';
  el.classList.add('connected');
}

// ---- L'age du releve ------------------------------------------------------
//
// Toute la matiere de l'application vient d'un releve date : les especes et
// leurs statistiques de PokeAPI, les lieux et les notices de Pokepedia. Rien
// ne le disait a l'ecran. Un jeu sort, le releve vieillit, et le joueur croit
// lire l'etat du monde alors qu'il lit celui d'un jour precis.
//
// Chaque reserve porte son « genereLe » — c'est deja lui qui declenche la
// purge du cache. On affiche le plus RECENT de ceux qui sont charges : les
// reserves a la demande arrivent apres coup, et la ligne se remet a jour
// quand elles arrivent (fiche.js rappelle la fonction).
//
// Les reserves se nomment une par une et non par window[nom] : un « const »
// de premier niveau ne pose PAS de propriete sur window dans un script
// classique, et la boucle n'aurait jamais rien trouve.
function reservesChargees(){
  const out = [];
  if(typeof DONNEES_EMBARQUEES   !== 'undefined') out.push(DONNEES_EMBARQUEES);
  if(typeof DONNEES_LIEUX        !== 'undefined') out.push(DONNEES_LIEUX);
  if(typeof DONNEES_DESCRIPTIONS !== 'undefined') out.push(DONNEES_DESCRIPTIONS);
  if(typeof DONNEES_COBBLEMON    !== 'undefined') out.push(DONNEES_COBBLEMON);
  if(typeof DONNEES_ATTAQUES     !== 'undefined') out.push(DONNEES_ATTAQUES);
  return out;
}

const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet',
                 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

// « 2026-08-23T22:37:23.740Z » ou « 2026-08-23 » → « 23 août 2026 ».
function dateReleve(iso){
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if(!m) return null;
  return parseInt(m[3], 10) + ' ' + MOIS_FR[parseInt(m[2], 10) - 1] + ' ' + m[1];
}

// La date de la reserve la plus recente parmi celles qui sont chargees, en
// clair, ou null si aucune ne l'est.
function releveLePlusRecent(){
  let meilleur = '';
  reservesChargees().forEach(function(reserve){
    const quand = reserve && reserve.genereLe;
    if(quand && String(quand) > meilleur) meilleur = String(quand);
  });
  return meilleur || null;
}

function majEtatReleve(){
  const el = document.getElementById('releveLabel');
  if(!el) return;
  const quand = dateReleve(releveLePlusRecent());
  if(!quand){ el.textContent = ''; return; }
  el.textContent = 'Relevé du ' + quand + ' · Poképédia, PokeAPI'
    + (typeof DONNEES_COBBLEMON !== 'undefined' ? ', tableur Cobblemon' : '');
  el.title = 'Les lieux, les notices et les Pokédex viennent d\'un relevé fait '
    + 'ce jour-là. Un jeu sorti depuis n\'y est pas.';
}

// Taille approximative occupee par le cache, pour l'afficher a l'utilisateur.
function cacheTaille(){
  let total = 0;
  try{
    for(let i = 0; i < localStorage.length; i++){
      const k = localStorage.key(i);
      if(k && k.indexOf(CACHE_PREFIX) === 0){
        total += k.length + (localStorage.getItem(k) || '').length;
      }
    }
  }catch(e){ /* ignore */ }
  return total;   // en caracteres, ~1 octet chacun pour de l'ASCII
}

// Au chargement : une application fraichement installee ne doit jamais afficher
// les donnees de la precedente.
purgerSiReserveePlusRecente();
