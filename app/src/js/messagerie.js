// L'écran des messages.
//
// Script classique, chargé APRÈS compte.js (il lui prend `invoke`,
// `avatarDiscord`, `dateLisible`, `perdreSession`) et après troc.js, dont il
// reprend les bulles de discussion — les mêmes classes, parce que c'est la même
// chose à l'écran et qu'un second jeu de styles aurait divergé.
//
// DEUX ÉTATS, UNE SEULE FENÊTRE :
//
//   la liste   avec qui l'on parle, le dernier mot, ce qu'on n'a pas lu, et un
//              champ « À qui ? » pour en commencer une ;
//   le fil     la conversation avec quelqu'un, et de quoi répondre.
//
// On passe de l'une à l'autre sans fermer : une fenêtre qui se referme à chaque
// aller-retour fait perdre le fil, au sens propre.
//
// LA CADENCE. La veille commune bat toutes les deux minutes — c'est écrit dans
// amis.js, et la raison est bonne : l'API tourne sur un hébergement gratuit.
// Deux minutes sont pourtant une éternité dans une conversation, où l'on attend
// la réponse en regardant l'écran. D'où un sondage rapide QUI NE TOURNE QUE
// FENÊTRE OUVERTE, et s'arrête en la fermant. Le coût est borné par le temps
// qu'on passe à parler, pas par le nombre de gens connectés.

/**
 * La messagerie a-t-elle un sens ici ?
 *
 * OUI PARTOUT OÙ IL Y A UN COMPTE, et c'est désormais le cas du site aussi : il
 * parle à la même API que l'application, donc aux mêmes dresseurs et aux mêmes
 * conversations.
 *
 * Cette fonction refusait autrefois sur le site, qui simulait tout dans le
 * navigateur et n'avait personne à qui écrire. Elle ne garde que la condition
 * de fond : un pont, quel qu'il soit. Sans lui — une page de génération, un
 * fichier ouvert à la main — il n'y a pas de session, donc pas de messagerie.
 */
function messagerieDisponible(){
  return !!window.__TAURI__;
}

const msgOverlay = document.getElementById('msgOverlay');
const msgTitre = document.getElementById('msgTitre');
const msgRetour = document.getElementById('msgRetour');
const msgRien = document.getElementById('msgRien');
const msgEchange = document.getElementById('msgEchange');
const msgListe = document.getElementById('msgListe');
const msgNouveau = document.getElementById('msgNouveau');
const msgQ = document.getElementById('msgQ');
const msgPropositions = document.getElementById('msgPropositions');
const msgFil = document.getElementById('msgFil');
const msgZone = document.getElementById('msgZone');
const msgTexte = document.getElementById('msgTexte');
const msgEnvoyer = document.getElementById('msgEnvoyer');
const msgEtat = document.getElementById('msgEtat');

// Les brouillons, par interlocuteur.
//
// PAR PERSONNE ET NON PAR ÉCRAN. Ce qu'on écrivait à Jack n'a rien à faire dans
// la fenêtre d'Ondine : garder un seul brouillon les mélangerait, et c'est
// précisément le genre d'erreur qu'on ne remarque qu'après l'envoi.
//
// EN MÉMOIRE ET NON DANS LE STOCKAGE. Un brouillon vit le temps d'une session :
// le poser sur le disque le ferait ressurgir des semaines plus tard, sous une
// conversation dont on a oublié le contexte. Fermer l'application l'oublie,
// et c'est le bon comportement.
const msgBrouillons = new Map();

// Avec qui la fenêtre est ouverte, ou null quand on est sur la liste.
let msgAvec = null;
let msgMinuteur = null;

// Les gens qu'on suit, relus à chaque ouverture de la fenêtre.
//
// POURQUOI LES GARDER ICI PLUTÔT QUE DE CHERCHER À CHAQUE FRAPPE. Deux raisons,
// et la seconde est la vraie :
//
//   ils s'affichent AVANT qu'on ait tapé quoi que ce soit — écrire à un ami est
//   le cas courant, et le faire chercher son propre ami est absurde ;
//
//   LA RECHERCHE DE DRESSEURS NE VOIT QUE LES COMPTES VISIBLES. `visible = 0`
//   retire du classement ET de la recherche : un ami qui s'en est retiré serait
//   introuvable, alors qu'on le suit. On filtre donc aussi cette liste-ci, qui
//   ne dépend d'aucun réglage de visibilité.
let msgMesAmis = [];

// Cinq secondes : assez pour qu'une réponse arrive « pendant » qu'on parle,
// assez peu pour que douze conversations simultanées ne pèsent rien.
const MSG_CADENCE = 5000;

function msgArreterSondage(){
  if(msgMinuteur){ clearInterval(msgMinuteur); msgMinuteur = null; }
}

/**
 * Le sondage rapide, réarmé à chaque changement d'état.
 *
 * Un seul minuteur à la fois : sans le `clearInterval` d'abord, ouvrir trois
 * conversations d'affilée en laisserait trois qui tournent, et le dernier fil
 * ouvert recevrait trois requêtes par cycle.
 */
function msgSonder(){
  msgArreterSondage();
  msgMinuteur = setInterval(function(){
    if(msgAvec) msgDessinerFil(true);
    else msgDessinerListe(true);
  }, MSG_CADENCE);
}

// ---- La liste ----------------------------------------------------------------

async function msgDessinerListe(discret){
  if(!msgListe) return;
  let r;
  try{
    r = await invoke('messages_liste');
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    // DISCRET : un sondage de fond qui échoue ne doit pas effacer ce qu'on lit.
    // Le réseau tombe, on garde l'écran ; c'est le clic suivant qui parlera.
    if(!discret) msgListe.innerHTML = '<div class="state-msg">' + String(e) + '</div>';
    return;
  }

  const liste = r.conversations || [];
  msgListe.innerHTML = '';
  if(!liste.length){
    msgListe.innerHTML = '<div class="state-msg">Aucune conversation. '
      + 'Écris à quelqu’un ci-dessus.</div>';
    return;
  }

  liste.forEach(function(c){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'msg-conv' + (c.nonLus ? ' non-lu' : '');

    if(typeof avatarDiscord === 'function'){
      const img = document.createElement('img');
      img.className = 'msg-conv-avatar';
      img.alt = '';
      img.src = avatarDiscord(c.discordId, c.avatar, 32);
      b.appendChild(img);
    }

    const corps = document.createElement('span');
    corps.className = 'msg-conv-corps';

    const nom = document.createElement('span');
    nom.className = 'msg-conv-nom';
    nom.textContent = c.pseudo;
    corps.appendChild(nom);

    // « Toi : » devant ses propres messages. Sans cela on relit son dernier mot
    // en croyant que l'autre a répondu.
    const apercu = document.createElement('span');
    apercu.className = 'msg-conv-apercu';
    apercu.textContent = (c.deMoi ? 'Toi : ' : '') + c.dernier;
    corps.appendChild(apercu);

    b.appendChild(corps);

    if(c.nonLus){
      const pastille = document.createElement('span');
      pastille.className = 'msg-conv-pastille';
      pastille.textContent = c.nonLus > 9 ? '9+' : String(c.nonLus);
      b.appendChild(pastille);
    }

    b.addEventListener('click', function(){ msgOuvrirFil(c.pseudo); });
    msgListe.appendChild(b);
  });
}

// ---- Chercher dans ce qu'on s'est dit ----------------------------------------
//
// DEUX QUESTIONS DIFFÉRENTES, DEUX CHAMPS. « À qui écrire » cherche des
// personnes ; celui-ci cherche des mots. Les mêler dans un seul champ
// obligerait à deviner laquelle des deux on pose, et à se tromper une fois
// sur deux.
//
// La recherche remplace la liste des conversations le temps qu'elle dure : ce
// sont deux façons de trouver la même chose, elles n'ont pas à cohabiter.

async function msgChercherMessages(){
  if(!msgListe || !msgRecherche) return;
  const q = (msgRecherche.value || '').trim();
  if(q.length < 2){ msgDessinerListe(); return; }

  let r;
  try{ r = await invoke('messages_chercher', { q: q }); }
  catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    msgListe.innerHTML = '<div class="state-msg">' + String(e) + '</div>';
    return;
  }
  // La frappe a pu continuer pendant l'aller-retour.
  if((msgRecherche.value || '').trim() !== q) return;

  const trouves = r.resultats || [];
  msgListe.innerHTML = '';
  if(!trouves.length){
    msgListe.innerHTML = '<div class="state-msg">Rien avec « '
      + q +' ».</div>';
    return;
  }

  trouves.forEach(function(m){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'msg-conv msg-trouve';

    const corps = document.createElement('span');
    corps.className = 'msg-conv-corps';

    const qui = document.createElement('span');
    qui.className = 'msg-conv-nom';
    // AVEC QUI, ET DANS QUEL SENS. « Toi : » devant ses propres mots — sans
    // cela on relit sa propre phrase en croyant que l'autre l'a écrite.
    qui.textContent = (m.deMoi ? 'Toi → ' : '') + m.avec;
    corps.appendChild(qui);

    const extrait = document.createElement('span');
    extrait.className = 'msg-conv-apercu';
    extrait.textContent = m.espece && !m.texte ? 'Un Pokémon' : m.texte;
    corps.appendChild(extrait);

    b.appendChild(corps);

    if(typeof dateLisible === 'function'){
      const quand = document.createElement('span');
      quand.className = 'msg-trouve-quand';
      quand.textContent = dateLisible(m.quand);
      b.appendChild(quand);
    }

    b.addEventListener('click', function(){
      msgRecherche.value = '';
      msgOuvrirFil(m.avec);
    });
    msgListe.appendChild(b);
  });
}

// ---- Choisir à qui écrire ----------------------------------------------------

function msgFermerPropositions(){
  if(msgPropositions) msgPropositions.innerHTML = '';
}

/** Charge une fois la liste des gens qu'on suit. */
async function msgChargerAmis(){
  try{
    const r = await invoke('amis');
    msgMesAmis = r.amis || [];
  }catch(e){
    // Hors ligne : le champ reste utilisable, la recherche prendra le relais.
    msgMesAmis = [];
  }
}

/** Une ligne cliquable, pour un ami comme pour un résultat de recherche. */
function msgProposition(pseudo, discordId, avatar, note){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'amis-proposition';
  if(typeof avatarDiscord === 'function'){
    const img = document.createElement('img');
    img.alt = '';
    img.src = avatarDiscord(discordId, avatar, 32);
    b.appendChild(img);
  }
  const nom = document.createElement('span');
  nom.className = 'proposition-nom';
  nom.textContent = pseudo;
  b.appendChild(nom);
  if(note){
    const etat = document.createElement('em');
    etat.className = 'proposition-etat';
    etat.textContent = note;
    b.appendChild(etat);
  }
  b.addEventListener('click', function(){
    msgQ.value = '';
    msgFermerPropositions();
    msgOuvrirFil(pseudo);
  });
  return b;
}

function msgMoiMeme(){
  return (typeof dresseurCourant !== 'undefined' && dresseurCourant)
    ? dresseurCourant.pseudo.toLowerCase() : null;
}

async function msgChercher(){
  if(!msgPropositions || !msgQ) return;
  const q = (msgQ.value || '').trim();
  const moi = msgMoiMeme();

  // --- Champ vide : les amis, sans rien demander au serveur -----------------
  if(!q){
    msgPropositions.innerHTML = '';
    msgMesAmis.slice(0, 8).forEach(function(a){
      msgPropositions.appendChild(
        msgProposition(a.pseudo, a.discord_id, a.avatar, 'ami'));
    });
    return;
  }
  if(q.length < 2){ msgFermerPropositions(); return; }

  // --- Deux lettres ou plus : les amis QUI CORRESPONDENT, puis le reste -----
  //
  // Les amis d'abord et sans aller-retour : ce sont eux qu'on cherche neuf fois
  // sur dix, et ils sortent avant même que le serveur ait répondu.
  const bas = q.toLowerCase();
  const amis = msgMesAmis.filter(function(a){
    return a.pseudo.toLowerCase().indexOf(bas) !== -1;
  }).slice(0, 6);

  msgPropositions.innerHTML = '';
  const dejaVus = {};
  amis.forEach(function(a){
    dejaVus[a.pseudo.toLowerCase()] = true;
    msgPropositions.appendChild(
      msgProposition(a.pseudo, a.discord_id, a.avatar, 'ami'));
  });

  let r;
  try{ r = await invoke('dresseurs', { recherche: q }); }
  catch(e){ return; }              // les amis restent affichés
  // La frappe a pu continuer pendant l'aller-retour : une réponse en retard ne
  // doit pas écraser ce qu'on est en train d'écrire.
  if((msgQ.value || '').trim() !== q) return;

  (r.dresseurs || [])
    .filter(function(d){
      const p = d.pseudo.toLowerCase();
      return p !== moi && !dejaVus[p];
    })
    .slice(0, 6)
    .forEach(function(d){
      msgPropositions.appendChild(
        msgProposition(d.pseudo, d.discord_id, d.avatar, d.discord_nom || ''));
    });

  // RIEN TROUVÉ N'EST PAS UNE IMPASSE.
  //
  // La recherche de dresseurs ne voit que les comptes VISIBLES — et la
  // visibilité est éteinte au départ, délibérément. Quelqu'un qui ne s'est
  // jamais montré au classement était donc introuvable ici, alors qu'on peut
  // parfaitement lui écrire : `ecrireA` le cherche par son pseudo, sans
  // regarder ce réglage.
  //
  // C'est d'ailleurs la règle que les Paramètres annoncent déjà : « même
  // éteint, qui connaît ton pseudo exact peut voir tes aventures publiques ».
  // On l'applique aux messages.
  //
  // Si personne ne porte ce nom, le fil le dira — « Ce dresseur n'existe
  // pas. » — ce qui reste plus clair qu'une liste vide sans explication.
  if(!msgPropositions.children.length){
    const exact = document.createElement('button');
    exact.type = 'button';
    exact.className = 'amis-proposition msg-exact';
    const nom = document.createElement('span');
    nom.className = 'proposition-nom';
    nom.textContent = 'Écrire à « ' + q + ' »';
    exact.appendChild(nom);
    const etat = document.createElement('em');
    etat.className = 'proposition-etat';
    etat.textContent = 'pseudo exact';
    exact.appendChild(etat);
    exact.addEventListener('click', function(){
      msgQ.value = '';
      msgFermerPropositions();
      msgOuvrirFil(q);
    });
    msgPropositions.appendChild(exact);
  }
}

/**
 * De quel échange parle ce message.
 *
 * On reprend `trocNom` et `trocPhrase` de troc.js quand ils sont là : ils
 * traduisent les identifiants d'espèce dans la langue choisie, et un second
 * jeu de règles aurait divergé. Sans eux — sur une page qui ne charge pas
 * troc.js — on rend l'identifiant brut, qui reste lisible.
 */
function msgSujetEchange(e){
  if(typeof trocPhrase === 'function') return trocPhrase(e);
  if(e.don) return (e.jeRecois || e.jeDonne) + (e.jeRecois ? ', offert' : ', en cadeau');
  return e.jeRecois + ' contre ' + e.jeDonne;
}

// ---- Joindre un Pokémon ------------------------------------------------------
//
// CE QUE ÇA REMPLACE : on l'écrivait à la main. Donc sans image, sans lien vers
// la fiche, et avec les fautes de frappe de chacun — « Insecateur », « scyther »,
// « l'insecte vert ». Or c'est précisément ce dont les gens parlent ici.
//
// L'IDENTIFIANT VOYAGE, PAS LE NOM. Le serveur garde « mr-mime », jamais
// « M. Mime » : la langue est un réglage de celui qui LIT, et un message écrit
// en français doit se lire en anglais chez qui a choisi l'anglais.

const msgJoindre = document.getElementById('msgJoindre');
const msgPoke = document.getElementById('msgPoke');
const msgPokeQ = document.getElementById('msgPokeQ');
const msgPokeListe = document.getElementById('msgPokeListe');
const msgJointe = document.getElementById('msgJointe');
const msgJointeImg = document.getElementById('msgJointeImg');
const msgJointeNom = document.getElementById('msgJointeNom');
const msgJointeOter = document.getElementById('msgJointeOter');

// L'espèce attachée au prochain message, ou null.
let msgEspece = null;

/** L'entrée du Pokédex portant ce nom, ou rien. */
function msgEntree(nom){
  if(typeof allEntries === 'undefined') return null;
  return allEntries.find(function(e){ return e.name === nom; }) || null;
}

/**
 * Une image pour la carte.
 *
 * On ne rejoue pas la chaîne de replis du Pokédex — cinq étapes, faites pour
 * une grille de mille vignettes. Ici il y en a une par message : le rendu
 * distant suffit, avec l'artwork officiel derrière lui.
 */
function msgImageEspece(img, entree){
  if(!entree) return;
  img.src = pokeosHomeUrl(entree.id, false);
  img.addEventListener('error', function(){
    if(img.dataset.repli) return;
    img.dataset.repli = '1';
    img.src = officialArtworkUrl(entree.id, false);
  });
}

function msgFermerPoke(){
  if(msgPoke) msgPoke.hidden = true;
  if(msgPokeQ) msgPokeQ.value = '';
  // La génération aussi : la garder ferait rouvrir le menu sur une liste déjà
  // restreinte, sans qu'on se souvienne l'avoir demandé.
  if(msgPokeGen) msgPokeGen.value = '';
  if(msgPokeListe) msgPokeListe.innerHTML = '';
}

/** Montre — ou retire — le Pokémon joint, au-dessus du champ. */
function msgMajJointe(){
  if(!msgJointe) return;
  const e = msgEspece ? msgEntree(msgEspece) : null;
  msgJointe.hidden = !e;
  if(!e) return;
  msgJointeNom.textContent = nomAffiche(e);
  msgImageEspece(msgJointeImg, e);
}

/**
 * Le menu des générations, rempli une fois.
 *
 * DEPUIS GEN_RANGES, jamais retapé : les noms — « Génération 5 — Unys » — y
 * sont déjà, et trois autres fichiers s'en servent. Une seconde liste écrite à
 * la main divergerait à la dixième génération.
 */
function msgRemplirGenerations(){
  if(!msgPokeGen || msgPokeGen.options.length) return;
  if(typeof GEN_RANGES === 'undefined') return;
  const toutes = document.createElement('option');
  toutes.value = '';
  toutes.textContent = 'Toutes les générations';
  msgPokeGen.appendChild(toutes);
  GEN_RANGES.forEach(function(g){
    const o = document.createElement('option');
    o.value = String(g.gen);
    o.textContent = g.name;
    msgPokeGen.appendChild(o);
  });
}

function msgChercherPoke(){
  if(!msgPokeListe || !msgPokeQ) return;
  const q = (msgPokeQ.value || '').trim().toLowerCase();
  const gen = msgPokeGen ? msgPokeGen.value : '';
  msgPokeListe.innerHTML = '';
  if(typeof allEntries === 'undefined') return;

  // DEUX LETTRES, SAUF SI UNE GÉNÉRATION EST CHOISIE. Le minimum existe parce
  // qu'une seule lettre rend une liste trop large pour aider. Une génération la
  // borne déjà : exiger un nom en plus interdirait de PARCOURIR, qui est
  // justement ce pour quoi on ouvre ce menu.
  if(q.length < 2 && !gen) return;

  // SUR LE NOM AFFICHÉ, comme partout ailleurs : on cherche « Insécateur »,
  // pas « scyther ».
  allEntries
    .filter(function(e){
      if(gen && String(e.gen) !== gen) return false;
      return !q || nomAffiche(e).toLowerCase().indexOf(q) !== -1;
    })
    .slice(0, 8)
    .forEach(function(e){
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'msg-poke-ligne';
      const img = document.createElement('img');
      img.alt = '';
      msgImageEspece(img, e);
      const nom = document.createElement('span');
      nom.textContent = nomAffiche(e);
      b.appendChild(img);
      b.appendChild(nom);
      b.addEventListener('click', function(){
        msgEspece = e.name;
        msgFermerPoke();
        msgMajJointe();
        if(msgTexte) msgTexte.focus();
      });
      msgPokeListe.appendChild(b);
    });
}

/** La carte d'un Pokémon, dans une bulle. Elle mène à sa fiche. */
function msgCarteEspece(nom){
  const e = msgEntree(nom);
  const carte = document.createElement('button');
  carte.type = 'button';
  carte.className = 'msg-carte';

  const img = document.createElement('img');
  img.alt = '';
  msgImageEspece(img, e);
  carte.appendChild(img);

  const texte = document.createElement('span');
  // UN POKÉMON QUE CETTE VERSION NE CONNAÎT PAS reste lisible : on montre son
  // identifiant plutôt qu'une carte vide. Cela arrive à qui reçoit un message
  // d'une version plus récente que la sienne.
  texte.textContent = e ? nomAffiche(e) : nom;
  carte.appendChild(texte);

  if(e && typeof openPreview === 'function'){
    carte.addEventListener('click', function(){ openPreview(e, null); });
  } else {
    carte.disabled = true;
  }
  return carte;
}


// ---- Joindre une photo de chasse ---------------------------------------------
//
// UNE PHOTO SUIT LA VISIBILITÉ DE SON AVENTURE, et c'est toute la question de
// cet écran. Le serveur rend 404 sur la photo d'une aventure privée à qui n'en
// est pas l'auteur : envoyée quand même, elle arriverait chez l'autre sous
// forme de cadre vide, sans que ni lui ni nous ne comprenions pourquoi.
//
// ON REFUSE DONC, EN LE DISANT — ici avant l'envoi, et de nouveau côté serveur
// qui seul fait autorité. C'est plus surprenant que de laisser partir, mais un
// refus qui s'explique vaut mieux qu'une image muette.
//
// PAS DE NOUVEL ENVOI DEPUIS LE DISQUE non plus : on choisit parmi les photos
// DÉJÀ POSÉES sur ses chasses. Poser une photo depuis la messagerie créerait
// des images rattachées à rien, que le quota compterait et que rien
// n'effacerait jamais.

const msgPhotoBtn = document.getElementById('msgPhotoBtn');
const msgPhotos = document.getElementById('msgPhotos');
const msgPhotosMot = document.getElementById('msgPhotosMot');
const msgPhotosListe = document.getElementById('msgPhotosListe');
const msgJointePhoto = document.getElementById('msgJointePhoto');
const msgJointePhotoImg = document.getElementById('msgJointePhotoImg');
const msgJointePhotoNom = document.getElementById('msgJointePhotoNom');
const msgJointePhotoOter = document.getElementById('msgJointePhotoOter');

// La photo attachée au prochain message : { id, nom }, ou null.
let msgPhoto = null;

/** Les chasses conclues qui portent une photo. */
function msgPhotosPosees(){
  if(typeof chassesFinies === 'undefined') return [];
  return chassesFinies
    .filter(function(c){ return Number.isInteger(c.image); })
    .slice()
    // La dernière posée en premier : c'est celle dont on vient parler.
    .sort(function(a, b){ return String(b.fin || '').localeCompare(String(a.fin || '')); });
}

function msgNomChasse(c){
  if(typeof nomDeChasse === 'function') return nomDeChasse(c);
  return c.pokemon;
}

function msgFermerPhotos(){
  if(msgPhotos) msgPhotos.hidden = true;
}

/** Montre — ou retire — la photo jointe, au-dessus du champ. */
function msgMajJointePhoto(){
  if(!msgJointePhoto) return;
  msgJointePhoto.hidden = !msgPhoto;
  if(!msgPhoto) return;
  msgJointePhotoNom.textContent = msgPhoto.nom;
  msgJointePhotoImg.removeAttribute('src');
  if(typeof chargerPhoto === 'function'){
    chargerPhoto(msgPhoto.id).then(function(url){ msgJointePhotoImg.src = url; },
      function(){ /* la vignette reste vide ; l'envoi dira pourquoi */ });
  }
}

function msgDessinerPhotos(){
  if(!msgPhotosListe || !msgPhotosMot) return;
  msgPhotosListe.innerHTML = '';

  // L'AVERTISSEMENT AVANT LE CHOIX, pas après l'échec. Une aventure privée
  // rend toutes ses photos inenvoyables : le dire d'abord évite de choisir
  // une image pour se voir refuser ensuite.
  const privee = (typeof profilCourant !== 'undefined')
    && profilCourant && !profilCourant.public;
  const liste = msgPhotosPosees();

  if(privee){
    msgPhotosMot.textContent = 'Cette aventure est privée : tes photos ne sont '
      + 'visibles que par toi. Rends-la publique depuis le Profil pour pouvoir '
      + 'en envoyer.';
    return;
  }
  if(!liste.length){
    msgPhotosMot.textContent = 'Aucune photo posée sur tes chasses pour '
      + 'l’instant. Ajoute-la depuis le tableau de chasse, puis reviens.';
    return;
  }

  msgPhotosMot.textContent = 'Une photo de tes chasses :';
  liste.forEach(function(c){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'msg-photo-choix';
    const img = document.createElement('img');
    img.alt = '';
    b.appendChild(img);
    const nom = document.createElement('span');
    nom.textContent = msgNomChasse(c);
    b.appendChild(nom);
    // MÊME PARESSE QUE LE TABLEAU DE CHASSE : chaque photo est un aller-retour
    // derrière un jeton, et l'on n'ouvre pas ce tiroir pour toutes les voir.
    if(typeof chargerQuandVisible === 'function'){
      chargerQuandVisible(b, function(){
        chargerPhoto(c.image).then(function(url){ img.src = url; }, function(){});
      });
    }
    b.addEventListener('click', function(){
      msgPhoto = { id: c.image, nom: msgNomChasse(c) };
      msgFermerPhotos();
      msgMajJointePhoto();
      if(msgTexte) msgTexte.focus();
    });
    msgPhotosListe.appendChild(b);
  });
}

/**
 * La photo d'un message, dans une bulle.
 *
 * Le cadre est posé vide et rempli après coup, comme partout ailleurs : la
 * photo arrive du pont, et attendre chaque image avant d'afficher le moindre
 * mot ferait clignoter la conversation entière à chaque battement de veille.
 */
function msgCartePhoto(id, deQui, quand){
  const carte = document.createElement('button');
  carte.type = 'button';
  carte.className = 'msg-photo';
  const img = document.createElement('img');
  img.alt = '';
  carte.appendChild(img);

  const legende = 'Photo de ' + deQui + (quand ? '  ·  ' + quand : '');
  carte.title = 'Voir en grand';

  const remplir = function(){
    chargerPhoto(id).then(function(url){ img.src = url; }, function(e){
      if(String(e) === 'SESSION_INVALIDE'){ perdreSession(); return; }
      // ELLE A PU DISPARAÎTRE DEPUIS : effacée, ou l'aventure repassée en
      // privé. Le message reste lisible, et dit ce qui manque plutôt que de
      // montrer un carré cassé.
      carte.classList.add('vide');
      carte.textContent = '📷 photo indisponible';
      carte.disabled = true;
    });
  };
  if(typeof chargerQuandVisible === 'function') chargerQuandVisible(carte, remplir);
  else remplir();

  carte.addEventListener('click', function(){
    if(typeof ouvrirPhotoSeule === 'function') ouvrirPhotoSeule({ id: id, legende: legende });
  });
  return carte;
}

// ---- Le fil ------------------------------------------------------------------

/**
 * Proposer un échange à la personne avec qui l'on parle.
 *
 * ON NE REFAIT PAS DE COMPOSITEUR. Celui qui existe vit dans le panneau
 * d'entraide, et il a besoin des deux dex pour dire qui peut donner quoi —
 * c'est justement ce qui le rend utile. Le bouton ouvre donc la comparaison
 * avec cette personne, qui EST le chemin vers ce compositeur.
 *
 * La fenêtre se ferme : la comparaison s'affiche derrière, et la garder ouverte
 * la cacherait entièrement.
 */
async function msgProposerEchange(){
  if(!msgAvec) return;
  const qui = msgAvec;
  msgEtat.textContent = 'Ouverture de la comparaison…';
  try{
    const r = await invoke('profils_de', { pseudo: qui });
    const profils = (r && r.profils) || [];
    // Celle qu'il met en avant, comme le classement : par défaut d'abord.
    const profil = profils.find(function(p){ return p.par_defaut; }) || profils[0];
    if(!profil){
      msgEtat.textContent = qui + ' n’a aucune aventure publique à comparer.';
      return;
    }
    fermerMessagerie();
    if(typeof comparerAvec === 'function') await comparerAvec(qui, profil);
    if(typeof ouvrirEchanges === 'function') ouvrirEchanges();
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    msgEtat.textContent = String(e);
  }
}

/** Range ce qu'on était en train d'écrire, sous le nom de son destinataire. */
function msgRangerBrouillon(){
  if(!msgAvec || !msgTexte) return;
  const t = msgTexte.value;
  if(t.trim()) msgBrouillons.set(msgAvec, t);
  else msgBrouillons.delete(msgAvec);
}

function msgOuvrirFil(pseudo){
  // AVANT DE CHANGER D'INTERLOCUTEUR : ce qui est dans le champ appartient
  // encore au précédent.
  msgRangerBrouillon();
  msgAvec = pseudo;
  // CE QU'ON ALLAIT JOINDRE APPARTIENT À LA CONVERSATION QU'ON QUITTE. Le
  // garder enverrait l'Abra préparé pour Jack à la figure d'Ondine.
  msgEspece = null;
  msgPhoto = null;
  msgMajJointe();
  msgMajJointePhoto();
  msgFermerPoke();
  msgFermerPhotos();
  msgBasculer();
  if(msgTexte) msgTexte.value = msgBrouillons.get(pseudo) || '';
  msgDessinerFil();
  msgSonder();
  if(msgTexte) setTimeout(function(){ msgTexte.focus(); }, 10);
}

function msgRevenirListe(){
  msgRangerBrouillon();
  // On revient à la LISTE, pas à d'anciens résultats : sans cela on retombe
  // sur une sélection dont on a oublié le motif.
  if(msgRecherche) msgRecherche.value = '';
  msgAvec = null;
  msgBasculer();
  msgDessinerListe();
  // Les amis se réaffichent en revenant : le champ est vide, donc la liste
  // reprend sa place de proposition par défaut.
  msgChercher();
  msgSonder();
}

/**
 * Ouvrir un fil, ou revenir à rien.
 *
 * DEUX COLONNES QUI COHABITENT, et non deux états qui s'excluent. La liste
 * reste à gauche pendant qu'on lit à droite : passer d'une conversation à
 * l'autre ne demande plus d'aller-retour, ce qui était le défaut de la modale.
 *
 * `fil-ouvert` ne cache rien par lui-même — c'est la feuille de style qui
 * décide, et seulement sous une certaine largeur, de laisser la place au fil.
 * Le JavaScript n'a pas à connaître le point de bascule.
 */
function msgBasculer(){
  const fil = Boolean(msgAvec);
  if(msgOverlay) msgOverlay.classList.toggle('fil-ouvert', fil);

  if(msgRien) msgRien.hidden = fil;
  if(msgFil) msgFil.hidden = !fil;
  if(msgZone) msgZone.hidden = !fil;
  if(msgRetour) msgRetour.hidden = !fil;
  // Le bouton n'a de sens que dans un fil : sans interlocuteur, on ne sait pas
  // à qui l'on proposerait quoi que ce soit.
  if(msgEchange) msgEchange.hidden = !fil;
  // VIDE ET NON « MESSAGES » : le titre de la page le dit déjà, et l'écrire
  // deux fois donnait deux « Messages » l'un sous l'autre.
  if(msgTitre) msgTitre.textContent = fil ? msgAvec : '';
  if(msgEtat) msgEtat.textContent = '';
  msgFermerPropositions();
}

async function msgDessinerFil(discret){
  if(!msgFil || !msgAvec) return;
  let r;
  try{
    r = await invoke('messages_avec', { pseudo: msgAvec });
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    if(!discret) msgFil.innerHTML = '<div class="state-msg">' + String(e) + '</div>';
    return;
  }

  // AU FOND SI L'ON Y ÉTAIT DÉJÀ. Redescendre alors qu'on relit un vieux
  // message plus haut arracherait l'écran des mains ; ne jamais descendre
  // cacherait la réponse qui vient d'arriver.
  const enBas = msgFil.scrollHeight - msgFil.scrollTop - msgFil.clientHeight < 40;

  msgFil.innerHTML = '';
  if(!(r.messages || []).length){
    msgFil.innerHTML = '<div class="state-msg">Rien encore. '
      + 'Écris le premier mot.</div>';
  }
  (r.messages || []).forEach(function(m){
    const bulle = document.createElement('div');
    bulle.className = 'discussion-bulle' + (m.deMoi ? ' de-moi' : '');
    const qui = document.createElement('span');
    qui.className = 'discussion-qui';
    qui.textContent = m.deMoi ? 'Toi' : msgAvec;
    const texte = document.createElement('p');
    texte.className = 'discussion-texte';
    texte.textContent = m.texte;
    bulle.appendChild(qui);

    // UN MESSAGE D'ÉCHANGE DIT DE QUEL ÉCHANGE IL PARLE. Sans cela, « d'accord
    // pour demain » arrive au milieu d'une conversation sans qu'on sache de
    // quel troc il s'agit — et deux échanges avec la même personne sont
    // courants.
    // La carte AVANT le texte : « il te manque, non ? » n'a de sens qu'une fois
    // qu'on sait de qui l'on parle.
    if(m.espece) bulle.appendChild(msgCarteEspece(m.espece));
    if(m.image){
      bulle.appendChild(msgCartePhoto(m.image, m.deMoi ? 'toi' : msgAvec,
        (typeof dateLisible === 'function') ? dateLisible(m.quand) : ''));
    }

    if(m.echange){
      const sujet = document.createElement('span');
      sujet.className = 'msg-sujet';
      sujet.textContent = '🔁 ' + msgSujetEchange(m.echange);
      bulle.appendChild(sujet);
    }

    // Un Pokémon — ou une photo — seul EST un message : on n'ajoute pas de
    // paragraphe vide, qui laisserait une ligne blanche sous la carte.
    if(m.texte) bulle.appendChild(texte);
    if(typeof dateLisible === 'function'){
      const quand = document.createElement('span');
      quand.className = 'discussion-quand';
      quand.textContent = dateLisible(m.quand);
      bulle.appendChild(quand);
    }
    msgFil.appendChild(bulle);
  });

  if(enBas || !discret) msgFil.scrollTop = msgFil.scrollHeight;
}

async function msgEnvoyerTexte(){
  if(!msgTexte || !msgAvec) return;
  const texte = (msgTexte.value || '').trim();
  if(!texte && !msgEspece && !msgPhoto) return;

  msgEnvoyer.disabled = true;
  msgEtat.textContent = '';
  try{
    await invoke('messages_ecrire',
      { pseudo: msgAvec, texte: texte, espece: msgEspece,
        image: msgPhoto ? msgPhoto.id : null });
    // On vide APRÈS l'envoi réussi. Vider avant perdrait le texte au moindre
    // refus — et le filtre en refuse, c'est son travail.
    msgTexte.value = '';
    msgBrouillons.delete(msgAvec);
    msgEspece = null;
    msgPhoto = null;
    msgMajJointe();
    msgMajJointePhoto();
    await msgDessinerFil();
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    msgEtat.textContent = String(e);
  }finally{
    msgEnvoyer.disabled = false;
    msgTexte.focus();
  }
}

// ---- Ouvrir, fermer ----------------------------------------------------------

/**
 * Ouvrir l'écran des messages.
 *
 * UNE PAGE, PLUS UNE FENÊTRE. C'était une modale : trop étroite pour une liste
 * de conversations et un fil, et surtout elle empruntait le menu déroulant de
 * la page des amis — positionné en absolu, calé sur un bouton « Suivre » qui
 * n'existe pas ici. Les propositions se dessinaient hors du cadre : présentes
 * dans le document, invisibles à l'écran.
 *
 * Une page a la place, le défilement, et un onglet à elle dans la barre.
 */
function ouvrirMessagerie(pseudo){
  if(!msgOverlay || !messagerieDisponible()) return;
  if(!exigeCompte('écrire à quelqu’un')) return;
  if(typeof showPage === 'function') showPage('messages');
  // Relue à chaque ouverture : on a pu suivre quelqu'un depuis la dernière fois.
  msgChargerAmis().then(function(){
    if(!msgAvec) msgChercher();
  });
  if(pseudo) msgOuvrirFil(pseudo);
  else msgRevenirListe();
}

/**
 * Quitter l'écran des messages : appelée en changeant de page, et non par un
 * bouton « Fermer ». Une page se quitte par la barre, comme toutes les autres.
 */
function fermerMessagerie(){
  msgRangerBrouillon();
  // La pastille compte ce qu'on n'a pas lu. Sortir d'une conversation qu'on
  // vient d'ouvrir doit l'éteindre tout de suite, sans attendre les deux
  // minutes de la veille — sinon elle annonce des messages déjà lus.
  if(msgAvec) majPastilleMessages(0);
  // LE SONDAGE S'ARRÊTE AVEC LA FENÊTRE, et c'est tout le marché : la cadence
  // rapide ne coûte que pendant qu'on parle.
  msgArreterSondage();
  msgAvec = null;
}

/**
 * Combien de messages attendent, dit hors de la fenêtre.
 *
 * LA CLOCHE ET CETTE PASTILLE NE DISENT PAS LA MÊME CHOSE. La cloche annonce
 * ce qui vient d'ARRIVER et s'éteint dès qu'on l'a ouverte ; la pastille dit ce
 * qui attend encore une lecture. On peut avoir vu passer la cloche sans avoir
 * ouvert la conversation — c'est même le cas courant.
 *
 * Le compte vient de la veille commune, dans la même requête que le reste : il
 * méritait un aller-retour toutes les deux minutes, pas un à lui seul.
 */
/**
 * Le compte, demandé tout de suite plutôt qu'attendu.
 *
 * LA VEILLE BAT TOUTES LES DEUX MINUTES. C'est la bonne cadence pour un fond
 * de tâche, et la mauvaise pour un premier affichage : la pastille restait
 * éteinte jusqu'au premier battement, donc jusqu'à deux minutes après
 * l'ouverture. On la voyait s'allumer sans raison apparente, ou pas du tout si
 * l'on avait déjà fermé.
 *
 * Un appel au démarrage coûte un aller-retour, une fois par session.
 */
async function msgCompterAuDemarrage(){
  if(!messagerieDisponible()) return;
  try{
    const r = await invoke('veille');
    majPastilleMessages(r && r.messagesNonLus);
  }catch(e){ /* hors ligne : la veille reprendra le relais */ }
}

function majPastilleMessages(combien){
  if(!messagesPastille) return;
  const n = Number(combien) || 0;
  messagesPastille.hidden = n === 0;
  messagesPastille.textContent = n > 9 ? '9+' : String(n);
}

/**
 * Ouvrir la messagerie avec un Pokémon déjà joint.
 *
 * DEPUIS L'ÉCRAN OÙ L'ON EN PARLE. Il fallait quitter la fiche, ouvrir les
 * Messages, puis rechercher l'espèce qu'on avait sous les yeux — trois gestes
 * pour dire « tiens, regarde ».
 *
 * On atterrit sur la LISTE et non dans un fil : le Pokémon est choisi, le
 * destinataire ne l'est pas encore. C'est la seule question qui reste.
 */
function envoyerEspeceAQuelquun(nom){
  if(!messagerieDisponible() || !nom) return;
  ouvrirMessagerie();
  msgEspece = nom;
  msgMajJointe();
  if(msgQ) setTimeout(function(){ msgQ.focus(); }, 60);
}

document.addEventListener('DOMContentLoaded', function(){
  // L'onglet, comme le reste : absent du site, qui n'a pas de compte.
  const onglet = document.querySelector('.page-tab[data-page="messages"]');
  if(onglet) onglet.hidden = !messagerieDisponible();

  // Le compte, sans attendre le premier battement de la veille.
  msgCompterAuDemarrage();

  if(menuMessages){
    // Cachée sur le site, comme les autres portes de la messagerie : il n'y a
    // personne à qui écrire quand il n'y a pas de compte.
    menuMessages.hidden = !messagerieDisponible();
    menuMessages.addEventListener('click', function(){
      if(typeof fermerCompteMenu === 'function') fermerCompteMenu();
      ouvrirMessagerie();
    });
  }
  if(msgRetour) msgRetour.addEventListener('click', msgRevenirListe);
  if(msgEchange) msgEchange.addEventListener('click', msgProposerEchange);
  if(msgJoindre){
    msgJoindre.addEventListener('click', function(){
      if(!msgPoke) return;
      msgPoke.hidden = !msgPoke.hidden;
      if(!msgPoke.hidden){ msgFermerPhotos(); msgRemplirGenerations(); msgPokeQ.focus(); }
      else msgFermerPoke();
    });
  }
  if(msgPhotoBtn){
    msgPhotoBtn.addEventListener('click', function(){
      if(!msgPhotos) return;
      msgPhotos.hidden = !msgPhotos.hidden;
      // L'AUTRE TIROIR SE FERME : deux panneaux ouverts l'un sur l'autre
      // repoussent le champ hors de l'écran sur une petite fenêtre.
      if(!msgPhotos.hidden){ msgFermerPoke(); msgDessinerPhotos(); }
    });
  }
  if(msgJointePhotoOter){
    msgJointePhotoOter.addEventListener('click', function(){
      msgPhoto = null;
      msgMajJointePhoto();
    });
  }
  if(msgPokeQ) msgPokeQ.addEventListener('input', msgChercherPoke);
  if(msgPokeGen) msgPokeGen.addEventListener('change', msgChercherPoke);
  if(msgJointeOter){
    msgJointeOter.addEventListener('click', function(){
      msgEspece = null;
      msgMajJointe();
    });
  }
  if(msgEnvoyer) msgEnvoyer.addEventListener('click', msgEnvoyerTexte);
  if(msgQ) msgQ.addEventListener('input', msgChercher);
  if(msgRecherche) msgRecherche.addEventListener('input', msgChercherMessages);
  if(msgTexte){
    msgTexte.addEventListener('keydown', function(e){
      // Entrée envoie, Maj+Entrée passe à la ligne : c'est ce que fait tout le
      // monde, et l'inverse surprend à chaque fois.
      if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); msgEnvoyerTexte(); }
    });
  }
  const bouton = document.getElementById('amisMessage');
  if(bouton){
    // Caché plutôt que désactivé : un bouton grisé promet quelque chose qui
    // viendra, et sur le site il ne viendra pas.
    bouton.hidden = !messagerieDisponible();
    bouton.addEventListener('click', function(){ ouvrirMessagerie(); });
  }
});

document.addEventListener('keydown', function(e){
  // Échap revient à la LISTE, jamais à la page précédente : on quitte une
  // conversation bien plus souvent qu'on ne quitte l'écran, et la barre de
  // navigation est là pour l'autre geste.
  if(e.key === 'Escape' && msgAvec
     && typeof currentPage !== 'undefined' && currentPage === 'messages'){
    msgRevenirListe();
  }
});
