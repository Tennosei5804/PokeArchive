// Les amis, et ce qu'ils viennent d'attraper.
//
// Script classique, chargé APRÈS compte.js : il se sert d'invoke, de
// perdreSession, de nomJournal et de libelleDex, qui viennent de là.
//
// ABONNEMENT À SENS UNIQUE. On suit qui l'on veut, sans demande ni
// acceptation. Ce n'est pas un raccourci : le classement et les profils
// publics montrent déjà la progression de tout le monde à tout le monde.
// S'abonner ne fait que filtrer ce qu'on pouvait déjà aller lire. Ce qui
// protège vraiment est le drapeau « public » d'une aventure, et il existait
// avant celle-ci.
//
// LE GROUPEMENT VIENT DE L'API. C'est api/src/amis.js qui rassemble un lot de
// captures en une seule annonce — la raison y est écrite. Ici on ne fait que
// mettre les annonces en phrases.

const AMIS_NOTIF_KEY = 'pokearchive-amis-notifications';
const AMIS_INTERVALLE = 120000;          // deux minutes
const AMIS_ATTENTE_AU_LANCEMENT = 8000;  // laisser la session s'établir

// Au plus quatre bulles d'un coup. Revenir après une semaine ne doit pas
// ensevelir le bureau : au-delà, le fil de la page dit le reste.
const AMIS_BULLES_MAX = 4;

let amisMinuteur = null;
let amisNonLus = 0;
let amisFilCurseur = null;

// ---- Le réglage -------------------------------------------------------------

/** 'tout', 'chromatiques' ou 'rien'. */
function amisReglage(){
  let v = null;
  try{ v = localStorage.getItem(AMIS_NOTIF_KEY); }catch(e){ /* stockage refusé */ }
  return (v === 'chromatiques' || v === 'rien') ? v : 'tout';
}

function poserAmisReglage(v){
  try{ localStorage.setItem(AMIS_NOTIF_KEY, v); }catch(e){ /* ignore */ }
  if(amisNotif) amisNotif.value = amisReglage();
}

// ---- Les phrases ------------------------------------------------------------

/**
 * Le nom d'un Pokémon tel qu'on l'affiche.
 *
 * nomJournal vit dans compte.js et traduit le nom interne — « abra » devient
 * « Abra », et la langue suit le réglage. Absent dans le banc, d'où le repli.
 */
function amisNom(slug){
  return (typeof nomJournal === 'function') ? nomJournal(slug) : slug;
}

function amisJeu(cle){
  return (typeof libelleDex === 'function') ? libelleDex(cle) : cle;
}

/**
 * Une annonce en deux lignes : le titre, et le détail.
 *
 * Trois formes, parce que trois choses différentes se sont passées :
 *
 *   une capture      « Tennosei_ a capturé Abra »
 *   un chromatique   « ✨ Tennosei_ a capturé Abra chromatique »
 *   un lot           « Tennosei_ a capturé 40 Pokémon », et les trois premiers
 *                    noms en dessous
 */
function phraseAnnonce(a){
  const jeu = amisJeu(a.dex);
  if(a.chromatique){
    return {
      titre: '✨ ' + a.pseudo + ' a capturé ' + amisNom(a.noms[0]) + ' chromatique',
      detail: 'sur ' + jeu,
    };
  }
  if(a.combien === 1){
    return {
      titre: a.pseudo + ' a capturé ' + amisNom(a.noms[0]),
      detail: 'sur ' + jeu,
    };
  }
  const cites = a.noms.map(amisNom);
  const reste = a.combien - cites.length;
  // « dont » n'a de sens que s'il en reste. Quand les noms cités sont tout le
  // lot, c'est une énumération et non un échantillon : on les relie par « et ».
  const liste = reste > 0
    ? 'dont ' + cites.join(', ') + ' et ' + reste + ' autre' + (reste > 1 ? 's' : '')
    : cites.slice(0, -1).join(', ') + ' et ' + cites[cites.length - 1];
  return {
    titre: a.pseudo + ' a capturé ' + a.combien + ' Pokémon',
    detail: 'sur ' + jeu + ' — ' + liste,
  };
}

// ---- Les bulles du système --------------------------------------------------

/**
 * Le pont vers le plugin de notifications.
 *
 * Absent dans le banc d'essai et dans les pages de génération, qui n'ont pas de
 * Tauri derrière — d'où la vérification plutôt qu'un plantage. Même procédé que
 * maj.js pour le plugin de mise à jour.
 */
function pontNotif(){
  const t = window.__TAURI__;
  return (t && t.notification && typeof t.notification.sendNotification === 'function')
    ? t.notification : null;
}

async function bullePermise(pont){
  try{
    if(await pont.isPermissionGranted()) return true;
    return (await pont.requestPermission()) === 'granted';
  }catch(e){
    return false;
  }
}

async function annoncerAuSysteme(annonces){
  const pont = pontNotif();
  if(!pont || !annonces.length) return;
  if(!(await bullePermise(pont))) return;

  const montrees = annonces.slice(0, AMIS_BULLES_MAX);
  for(const a of montrees){
    const p = phraseAnnonce(a);
    try{ pont.sendNotification({ title: p.titre, body: p.detail }); }
    catch(e){ /* une bulle refusée n'empêche pas les suivantes */ }
  }
  const reste = annonces.length - montrees.length;
  if(reste > 0){
    try{
      pont.sendNotification({
        title: 'PokéArchive',
        body: reste + ' autre' + (reste > 1 ? 's' : '') + ' nouveauté'
              + (reste > 1 ? 's' : '') + ' chez tes amis.',
      });
    }catch(e){ /* ignore */ }
  }
}

// ---- Le sondage -------------------------------------------------------------

/**
 * Regarde ce qui est arrivé depuis la dernière fois.
 *
 * L'ORDRE COMPTE. On annonce d'ABORD, on marque comme vu ENSUITE. Si
 * l'application se ferme entre les deux, la nouveauté sera reproposée — un
 * doublon se pardonne, une capture jamais annoncée ne se rattrape pas.
 */
async function verifierNouveautes(){
  if(typeof invoke !== 'function') return;
  if(typeof dresseurCourant !== 'undefined' && !dresseurCourant) return;

  let r;
  try{
    r = await invoke('amis_nouveautes');
  }catch(e){
    // Hors ligne, ou session expirée : on se tait. Un sondage de fond n'a pas à
    // faire surgir une erreur que personne n'a demandée.
    return;
  }
  const annonces = r.annonces || [];
  if(!annonces.length) return;

  const reglage = amisReglage();
  const aDire = reglage === 'rien' ? []
              : reglage === 'chromatiques' ? annonces.filter(function(a){ return a.chromatique; })
              : annonces;

  await annoncerAuSysteme(aDire);

  amisNonLus += annonces.length;
  majPastilleAmis();

  if(r.jusqua) {
    try{ await invoke('amis_vu', { jusqua: r.jusqua }); }catch(e){ /* on réessaiera */ }
  }
  // Si la page est ouverte sous les yeux, elle doit montrer ce qui vient
  // d'arriver plutôt que d'attendre qu'on en sorte et qu'on y revienne.
  if(typeof currentPage !== 'undefined' && currentPage === 'amis') chargerFil(false);
}

function lancerSondageAmis(){
  if(amisMinuteur) return;
  setTimeout(verifierNouveautes, AMIS_ATTENTE_AU_LANCEMENT);
  amisMinuteur = setInterval(verifierNouveautes, AMIS_INTERVALLE);
}

// ---- La pastille ------------------------------------------------------------

function majPastilleAmis(){
  const onglet = document.querySelector('[data-page="amis"]');
  if(!onglet) return;
  onglet.classList.toggle('a-du-neuf', amisNonLus > 0);
  onglet.dataset.combien = amisNonLus > 9 ? '9+' : String(amisNonLus);
}

// ---- La page ----------------------------------------------------------------

/**
 * L'image d'un ami.
 *
 * Le champ « avatar » est un condensé Discord, pas une adresse : le poser tel
 * quel dans src donnait une image cassée. avatarDiscord() vit dans compte.js et
 * en fait une URL — et calcule même l'avatar par défaut à partir de
 * l'identifiant quand la personne n'en a pas choisi.
 */
function avatarAmi(l, taille){
  const img = document.createElement('img');
  img.alt = '';
  img.loading = 'lazy';
  if(typeof avatarDiscord === 'function'){
    img.src = avatarDiscord(l.discord_id, l.avatar, taille || 64);
  }
  return img;
}

function ligneAmi(a){
  const l = document.createElement('div');
  l.className = 'ami';

  const av = avatarAmi(a, 64);
  av.className = 'ami-avatar';

  // « Discord — Aventure » : le pseudo seul ne dit pas laquelle de ses aventures
  // on regarde, et quelqu'un qui en mène trois n'a pas la même avance sur
  // chacune. L'aventure manque tant que la personne n'en a aucune publique.
  const nom = document.createElement('span');
  nom.className = 'ami-nom';
  const qui = document.createElement('strong');
  qui.textContent = a.pseudo;
  nom.appendChild(qui);
  // Le nom Discord sous le nom choisi : c'est lui qui identifie quand
  // quelqu'un s'est renommé ici. Absent tant qu'il ne s'est pas reconnecté
  // depuis que la colonne existe.
  if(a.discord_nom){
    const discord = document.createElement('span');
    discord.className = 'ami-discord';
    discord.textContent = a.discord_nom;
    nom.appendChild(discord);
  }
  if(a.aventure){
    const ou = document.createElement('span');
    ou.className = 'ami-aventure';
    ou.textContent = ' — ' + a.aventure;
    nom.appendChild(ou);
  }

  const chiffres = document.createElement('span');
  chiffres.className = 'ami-chiffres';
  chiffres.textContent = '⬤ ' + (a.captures || 0) + '   ✨ ' + (a.shiny || 0);

  // L'entraide, directement depuis la liste : c'est ici qu'on se demande « il
  // a quoi que je n'ai pas ». Le geste ouvrait jusqu'ici deux écrans et trois
  // clics, alors que le calcul est une soustraction de deux ensembles.
  const entraide = document.createElement('button');
  entraide.className = 'ami-entraide';
  entraide.type = 'button';
  entraide.textContent = '🤝';
  entraide.title = 'Ce que ' + a.pseudo + ' peut t\'apporter, et l\'inverse';
  entraide.setAttribute('aria-label', entraide.title);
  entraide.addEventListener('click', function(){ entraiderAvec(a); });

  const retirer = document.createElement('button');
  retirer.className = 'ami-retirer';
  retirer.type = 'button';
  retirer.textContent = '✕';
  retirer.title = 'Ne plus suivre ' + a.pseudo;
  retirer.setAttribute('aria-label', 'Ne plus suivre ' + a.pseudo);
  retirer.addEventListener('click', function(){ arreterDeSuivre(a.pseudo); });

  l.appendChild(av);
  l.appendChild(nom);
  l.appendChild(chiffres);
  l.appendChild(entraide);
  l.appendChild(retirer);
  return l;
}

/**
 * Ouvre l'entraide avec cet ami.
 *
 * On passe par la comparaison plutôt que d'aller chercher son dex ici : c'est
 * elle qui tient amiProgression, que la fenêtre d'entraide lit — et deux
 * chemins vers le même état auraient fini par en donner deux versions.
 *
 * L'aventure visée est la principale, celle que montre déjà le fil : c'est
 * aussi celle dont les chiffres figurent sur cette ligne.
 */
async function entraiderAvec(a){
  if(typeof comparerAvec !== 'function') return;
  await comparerAvec(a.pseudo, { id: null, nom: a.aventure || 'aventure principale' });
  // Après comparerAvec, qui a basculé sur le Pokédex : la fenêtre lit
  // scopeEntries, et l'ouvrir avant l'aurait fait compter sur l'ancien.
  if(typeof ouvrirEchanges === 'function' && typeof amiProgression !== 'undefined'
     && amiProgression) ouvrirEchanges();
}

function ligneFil(l){
  const d = document.createElement('div');
  d.className = 'fil-ligne' + (l.chromatique ? ' chromatique' : '');

  const av = avatarAmi(l, 64);
  av.className = 'fil-avatar';

  const texte = document.createElement('span');
  texte.className = 'fil-texte';
  const qui = document.createElement('strong');
  qui.textContent = l.pseudo;
  texte.appendChild(qui);
  texte.appendChild(document.createTextNode(
    ' a capturé ' + amisNom(l.pokemon) + (l.chromatique ? ' chromatique' : '')
    + ' sur ' + amisJeu(l.dex)));

  const quand = document.createElement('span');
  quand.className = 'fil-quand';
  quand.textContent = (typeof dateLisible === 'function') ? dateLisible(l.ajoute_le) : l.ajoute_le;

  d.appendChild(av);
  d.appendChild(texte);
  d.appendChild(quand);
  return d;
}

async function chargerListeAmis(){
  if(!amisListe) return;
  amisListe.innerHTML = '<div class="state-msg">Chargement…</div>';
  let r;
  try{
    r = await invoke('amis');
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    amisListe.innerHTML = '<div class="state-msg">Liste indisponible.</div>';
    return;
  }
  const liste = r.amis || [];
  amisListe.innerHTML = '';
  if(!liste.length){
    amisListe.innerHTML = '<div class="state-msg">Personne pour l’instant. '
      + 'Ajoute quelqu’un par son pseudo ci-dessus.</div>';
    return;
  }
  liste.forEach(function(a){ amisListe.appendChild(ligneAmi(a)); });
}

async function chargerFil(suite){
  if(!amisFil) return;
  if(!suite){
    amisFilCurseur = null;
    amisFil.innerHTML = '<div class="state-msg">Chargement…</div>';
  }
  let r;
  try{
    r = await invoke('amis_fil', { avant: suite ? amisFilCurseur : null });
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    if(!suite) amisFil.innerHTML = '<div class="state-msg">Fil indisponible.</div>';
    return;
  }
  const lignes = r.lignes || [];
  if(!suite) amisFil.innerHTML = '';
  if(!suite && !lignes.length){
    amisFil.innerHTML = '<div class="state-msg">Rien encore. '
      + 'Ce que tes amis attraperont s’affichera ici.</div>';
  }
  lignes.forEach(function(l){ amisFil.appendChild(ligneFil(l)); });
  if(lignes.length) amisFilCurseur = lignes[lignes.length - 1].id;
  if(amisPlus) amisPlus.style.display = r.encore ? '' : 'none';

  // Ouvrir la page vaut lecture : la pastille retombe.
  amisNonLus = 0;
  majPastilleAmis();
}

async function suivreQuelquun(){
  if(!amisQ) return;
  const pseudo = (amisQ.value || '').trim();
  if(!pseudo) return;
  amisSuivre.disabled = true;
  amisErreur.textContent = '';
  try{
    const r = await invoke('suivre', { pseudo: pseudo });
    amisQ.value = '';
    amisErreur.textContent = 'Tu suis désormais ' + r.pseudo + '.';
    await chargerListeAmis();
    await chargerFil(false);
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    amisErreur.textContent = String(e);
  }finally{
    amisSuivre.disabled = false;
  }
}

async function arreterDeSuivre(pseudo){
  const veut = await demanderConfirmation({
    eyebrow: 'Amis',
    titre: 'Ne plus suivre ' + pseudo + ' ?',
    note: 'Tu ne verras plus ses captures dans ton fil. Rien ne le lui dit, et '
        + 'tu peux le suivre à nouveau quand tu veux.',
    libelleAction: 'Ne plus suivre'
  });
  if(!veut) return;
  try{
    await invoke('ne_plus_suivre', { pseudo: pseudo });
    await chargerListeAmis();
    await chargerFil(false);
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    prevenirErreur('Impossible', String(e));
  }
}

// ---- Branchements -----------------------------------------------------------

document.addEventListener('DOMContentLoaded', function(){
  if(amisSuivre) amisSuivre.addEventListener('click', suivreQuelquun);
  if(amisQ) amisQ.addEventListener('keydown', function(e){
    if(e.key === 'Enter') suivreQuelquun();
  });
  if(amisPlus) amisPlus.addEventListener('click', function(){ chargerFil(true); });
  if(amisNotif){
    amisNotif.value = amisReglage();
    amisNotif.addEventListener('change', function(){ poserAmisReglage(amisNotif.value); });
  }
  lancerSondageAmis();
  // La cloche a son propre sondage : elle regarde une autre table, et son
  // délai de départ est décalé pour ne pas ouvrir deux requêtes ensemble au
  // lancement. Voir notifs.js.
  if(typeof lancerSondageNotifs === 'function') lancerSondageNotifs();
});

/** Appelé par showPage('amis'). */
function chargerAmis(){
  chargerListeAmis();
  chargerFil(false);
}
