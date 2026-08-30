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
 * NON SUR LE SITE, et c'est une question de fond plutôt que de plomberie. La
 * version web est délibérément sans compte — « tout ce que tu coches reste dans
 * ce navigateur » — donc il n'y a personne à qui écrire. Le pont y lèverait
 * « Commande absente du pont », ce qui est exact mais illisible pour qui clique.
 *
 * Même test que le bouton d'overlay OBS : `window.PONT_WEB` n'existe que sur le
 * site, et sa présence dit qu'on n'est pas dans Tauri quand bien même
 * `window.__TAURI__` est là — c'est le pont qui le pose.
 */
function messagerieDisponible(){
  return !!(window.__TAURI__ && !window.PONT_WEB);
}

const msgOverlay = document.getElementById('msgOverlay');
const msgTitre = document.getElementById('msgTitre');
const msgRetour = document.getElementById('msgRetour');
const msgListe = document.getElementById('msgListe');
const msgNouveau = document.getElementById('msgNouveau');
const msgQ = document.getElementById('msgQ');
const msgPropositions = document.getElementById('msgPropositions');
const msgFil = document.getElementById('msgFil');
const msgZone = document.getElementById('msgZone');
const msgTexte = document.getElementById('msgTexte');
const msgEnvoyer = document.getElementById('msgEnvoyer');
const msgEtat = document.getElementById('msgEtat');

// Avec qui la fenêtre est ouverte, ou null quand on est sur la liste.
let msgAvec = null;
let msgMinuteur = null;

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

// ---- Choisir à qui écrire ----------------------------------------------------

function msgFermerPropositions(){
  if(msgPropositions) msgPropositions.innerHTML = '';
}

async function msgChercher(){
  if(!msgPropositions || !msgQ) return;
  const q = (msgQ.value || '').trim();
  if(q.length < 2){ msgFermerPropositions(); return; }

  let r;
  try{ r = await invoke('dresseurs', { recherche: q }); }
  catch(e){ msgFermerPropositions(); return; }
  // La frappe a pu continuer pendant l'aller-retour : une réponse en retard ne
  // doit pas écraser ce qu'on est en train d'écrire.
  if((msgQ.value || '').trim() !== q) return;

  const moi = (typeof dresseurCourant !== 'undefined' && dresseurCourant)
    ? dresseurCourant.pseudo.toLowerCase() : null;
  const vus = (r.dresseurs || [])
    .filter(function(d){ return d.pseudo.toLowerCase() !== moi; })
    .slice(0, 6);

  msgPropositions.innerHTML = '';
  if(!vus.length){ msgFermerPropositions(); return; }

  vus.forEach(function(d){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'amis-proposition';
    if(typeof avatarDiscord === 'function'){
      const img = document.createElement('img');
      img.alt = '';
      img.src = avatarDiscord(d.discord_id, d.avatar, 32);
      b.appendChild(img);
    }
    const nom = document.createElement('span');
    nom.className = 'proposition-nom';
    nom.textContent = d.pseudo;
    b.appendChild(nom);
    b.addEventListener('click', function(){
      msgQ.value = '';
      msgFermerPropositions();
      msgOuvrirFil(d.pseudo);
    });
    msgPropositions.appendChild(b);
  });
}

// ---- Le fil ------------------------------------------------------------------

function msgOuvrirFil(pseudo){
  msgAvec = pseudo;
  msgBasculer();
  msgDessinerFil();
  msgSonder();
  if(msgTexte) setTimeout(function(){ msgTexte.focus(); }, 10);
}

function msgRevenirListe(){
  msgAvec = null;
  msgBasculer();
  msgDessinerListe();
  msgSonder();
}

/** Montre l'un des deux états, cache l'autre. */
function msgBasculer(){
  const fil = Boolean(msgAvec);
  if(msgNouveau) msgNouveau.hidden = fil;
  if(msgListe) msgListe.hidden = fil;
  if(msgFil) msgFil.hidden = !fil;
  if(msgZone) msgZone.hidden = !fil;
  if(msgRetour) msgRetour.hidden = !fil;
  if(msgTitre) msgTitre.textContent = fil ? msgAvec : 'Messages';
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
    bulle.appendChild(texte);
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
  if(!texte) return;

  msgEnvoyer.disabled = true;
  msgEtat.textContent = '';
  try{
    await invoke('messages_ecrire', { pseudo: msgAvec, texte: texte });
    // On vide APRÈS l'envoi réussi. Vider avant perdrait le texte au moindre
    // refus — et le filtre en refuse, c'est son travail.
    msgTexte.value = '';
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

function ouvrirMessagerie(pseudo){
  if(!msgOverlay || !messagerieDisponible()) return;
  if(!exigeCompte('écrire à quelqu’un')) return;
  msgOverlay.style.display = 'flex';
  if(pseudo) msgOuvrirFil(pseudo);
  else msgRevenirListe();
}

function fermerMessagerie(){
  if(msgOverlay) msgOverlay.style.display = 'none';
  // LE SONDAGE S'ARRÊTE AVEC LA FENÊTRE, et c'est tout le marché : la cadence
  // rapide ne coûte que pendant qu'on parle.
  msgArreterSondage();
  msgAvec = null;
}

document.addEventListener('DOMContentLoaded', function(){
  if(msgRetour) msgRetour.addEventListener('click', msgRevenirListe);
  if(msgEnvoyer) msgEnvoyer.addEventListener('click', msgEnvoyerTexte);
  if(msgQ) msgQ.addEventListener('input', msgChercher);
  if(msgTexte){
    msgTexte.addEventListener('keydown', function(e){
      // Entrée envoie, Maj+Entrée passe à la ligne : c'est ce que fait tout le
      // monde, et l'inverse surprend à chaque fois.
      if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); msgEnvoyerTexte(); }
    });
  }
  const fermer = document.getElementById('msgFermer');
  if(fermer) fermer.addEventListener('click', fermerMessagerie);
  if(msgOverlay){
    msgOverlay.addEventListener('click', function(e){
      if(e.target === msgOverlay) fermerMessagerie();
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
  if(e.key === 'Escape' && msgOverlay && msgOverlay.style.display === 'flex'){
    // Échap revient à la liste avant de fermer : on quitte une conversation
    // plus souvent qu'on ne quitte la messagerie.
    if(msgAvec) msgRevenirListe();
    else fermerMessagerie();
  }
});
