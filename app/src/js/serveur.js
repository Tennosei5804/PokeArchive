// Dialogue avec serveur.py : profils, heartbeat, dossier save.
// Script classique (pas de module ES) : l'app reste ouvrable en file://

// ---- Mode "application" (serveur.py) -----------------------------------
// Quand la page est servie par serveur.py, c'est lui qui possède le dossier
// « save » : il l'a déjà créé au démarrage et écrit le JSON pour nous. Plus
// aucun sélecteur de dossier n'est nécessaire — le navigateur, lui, n'a
// jamais le droit d'écrire à côté de index.html tout seul.
let serverMode = false;

async function detectServer(){
  if(location.protocol !== 'http:' && location.protocol !== 'https:') return false;
  try{
    const res = await fetch('api/ping', { cache: 'no-store' });
    if(!res.ok) return false;
    const info = await res.json();
    return !!(info && info.app === 'living-dex');
  }catch(e){ return false; }
}

// Chaque dresseur a son fichier dans save/profils/ : le pseudo, déjà
// obligatoire, sert donc aussi de nom de profil.
let knownProfiles = [];

async function readServerProfiles(){
  try{
    const res = await fetch('api/profiles', { cache: 'no-store' });
    if(!res.ok) return [];
    const data = await res.json();
    return data.profiles || [];
  }catch(e){ return []; }
}

async function readServerSave(name){
  try{
    const who = name || playerName;
    if(!who) return null;
    const res = await fetch('api/save?p=' + encodeURIComponent(who), { cache: 'no-store' });
    if(!res.ok) return null;
    return await res.json();
  }catch(e){ return null; }
}

async function writeServerSave(){
  try{
    const res = await fetch('api/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildSavePayload())
    });
    if(!res.ok) throw new Error('HTTP ' + res.status);
  }catch(e){
    console.error('Écriture dans le dossier « save » impossible :', e);
  }
}

// serveur.py s'éteint dès que plus personne ne l'utilise : tant que la page
// est ouverte on lui donne signe de vie, et on le prévient à la fermeture.
// Sans ça, il resterait un processus en fond après la partie.
function startHeartbeat(){
  setInterval(function(){
    fetch('api/heartbeat', { method: 'POST', keepalive: true }).catch(function(){});
  }, 10000);
  window.addEventListener('pagehide', function(){
    try{ navigator.sendBeacon('api/bye', ''); }catch(e){ /* ignore */ }
  });
}

function buildSavePayload(){
  const dex = progressToJSON();
  return {
    exportedAt: new Date().toISOString(),
    player: playerName,
    dex: dex,
    // Les deux listes historiques restent présentes, alimentées par la
    // collection Pokémon HOME : les anciens exports restent lisibles, et
    // serveur.py continue d'afficher un nombre de captures cohérent.
    caught: (dex.national && dex.national.caught) || [],
    shiny: (dex.national && dex.national.shiny) || [],
    // Les chasses en cours voyagent avec le reste : elles appartiennent à
    // l'aventure, et changer de machine doit les retrouver. Aucune table ni
    // route de plus — la sauvegarde du profil les emporte.
    chasses: (typeof chasses !== 'undefined') ? chasses : [],
    // Et les chasses abouties : le tableau de chasse n'a pas d'autre source.
    // Elles suivent le même chemin que les autres — aucune table de plus.
    chassesFinies: (typeof chassesFinies !== 'undefined') ? chassesFinies : [],
    // Les objectifs sur mesure : un filtre nomme, fige en liste de noms.
    objectifs: (typeof objectifs !== 'undefined') ? objectifs : [],
    // Les fiches de capture : ce que chaque exemplaire a de particulier.
    detailsCapture: (typeof detailsCapture !== 'undefined') ? detailsCapture : {},
    // Les défis relevés. Le défi du JOUR, lui, ne s'écrit pas : il se
    // recalcule à partir de la date. Seul le passé doit être gardé, parce
    // qu'il n'est plus reproductible — le tirage d'il y a trois semaines
    // dependait de listes qui ont pu changer depuis.
    defis: (typeof defis !== 'undefined') ? defis : [],
    // Ce qu'on cherche. Dans la sauvegarde comme le reste : c'est une envie de
    // CETTE aventure, et elle voyage avec elle d'une machine à l'autre.
    recherches: (typeof recherches !== 'undefined') ? recherches : []
  };
}

async function loadProgress(){
  try{
    const raw = await storageGet(STORAGE_KEY);
    if(raw){
      const parsed = JSON.parse(raw);
      progressFromJSON(parsed);
      playerName = parsed.player || '';
    }
  }catch(e){
    resetAllProgress();
  }
}

// Rien n'est enregistré tant que le dresseur n'a pas de pseudo : c'est lui
// qui identifie la sauvegarde, donc aucune écriture ne part sans lui.
function queueSave(){
  // LE DERNIER FILET, ET LE SEUL QUI SOIT COMPLET PAR CONSTRUCTION. Chaque
  // modification de l'aventure finit ici, d'ou qu'elle vienne : on ne peut donc
  // pas en oublier une. Les portes principales — cocher une capture, proposer
  // un echange, creer une aventure — refusent plus tot et plus proprement, avant
  // que rien ne bouge ; celles qu'on n'a pas nommees une a une echouent au
  // moins EN LE DISANT, au lieu de laisser croire a un enregistrement.
  //
  // noyau.js en pose un defaut permissif, que compte.js ecrase : les pages de
  // generation, qui retirent compte.js, gardent donc une fonction a appeler.
  if(!exigeCompte('enregistrer ta progression')) return;
  if(!playerName) return;
  if(saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(function(){
    storageSet(STORAGE_KEY, JSON.stringify(buildSavePayload()));
    // Il n'y a plus qu'une destination : le compte. Le stockage local ne sert
    // qu'à ne pas perdre une case cochée si le réseau lâche entre deux écritures.
    writeServerSave();
  }, 400);
}

