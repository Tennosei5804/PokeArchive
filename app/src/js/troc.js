// Les échanges : « je te donne celui-ci contre celui-là, sur ce jeu ».
//
// Script classique, chargé APRÈS compte.js et partage.js : il se sert d'invoke,
// de perdreSession, de nomJournal, de libelleDex, d'avatarDiscord et de
// dateLisible, qui viennent de là.
//
// CE QUE PokéArchive PEUT ET NE PEUT PAS. Aucun Pokémon ne bouge ici : c'est un
// carnet, pas une console. Ce qui est enregistré est un ACCORD — vous vous
// retrouvez ensuite dans le jeu pour le faire vraiment. D'où le bouton « c'est
// fait », posé à la main : personne d'autre ne peut le constater à votre place.
//
// OÙ SE PROPOSE UN ÉCHANGE. Dans le panneau d'entraide (🤝), et nulle part
// ailleurs. C'est le seul endroit de l'application qui sache déjà répondre à la
// question « qu'est-ce que vous pouvez vous apporter ? » : deux colonnes, ce
// qu'il a et que tu n'as pas, ce que tu as et qu'il n'a pas. Un formulaire à
// part aurait redemandé à la main ce que ces colonnes savent déjà.

const TROC_ETATS = {
  propose:  { mot: 'en attente', classe: 'attente' },
  accepte:  { mot: 'accepté',    classe: 'ok' },
  refuse:   { mot: 'refusé',     classe: 'non' },
  annule:   { mot: 'retiré',     classe: 'non' },
  fait:     { mot: 'fait',       classe: 'fini' },
};

// Le choix en cours dans le panneau d'entraide.
let trocSel = { veux: null, donne: null };
// L'échange dont la discussion est ouverte.
let trocDiscussion = null;

// ---- Les noms ---------------------------------------------------------------

function trocNom(slug){
  return (typeof nomJournal === 'function') ? nomJournal(slug) : slug;
}

function trocJeuNom(cle){
  return (typeof libelleDex === 'function') ? libelleDex(cle) : cle;
}

/**
 * La phrase d'un échange, du point de vue de celui qui lit.
 *
 * L'API a déjà retourné les deux noms dans son sens — `jeDonne` et `jeRecois`
 * veulent dire la même chose pour les deux parties. Il n'y a donc pas ici de
 * « si je suis le demandeur » : cette question a été tranchée une fois, côté
 * serveur, plutôt que dans chaque écran qui affiche un échange.
 */
function trocPhrase(e){
  return trocNom(e.jeRecois) + ' contre ' + trocNom(e.jeDonne);
}

// ---- Choisir, dans le panneau d'entraide ------------------------------------

/** Remet la barre à zéro, et la montre si l'on a quelqu'un en face. */
function trocPreparer(){
  trocSel = { veux: null, donne: null };
  if(!trocBarre) return;

  const possible = typeof amiProgression !== 'undefined' && amiProgression
                   && !!amiProgression.pseudo;
  trocBarre.hidden = !possible;
  if(!possible) return;

  if(trocMot) trocMot.value = '';
  if(trocEtat) trocEtat.textContent = '';
  if(trocJeu){
    const jeu = (typeof currentTab !== 'undefined') ? currentTab : null;
    trocJeu.textContent = jeu ? 'sur ' + trocJeuNom(jeu) : '';
  }
  trocMajBarre();
}

/**
 * Un clic dans une colonne.
 *
 * Recliquer le même nom le désélectionne : c'est la seule façon de revenir en
 * arrière sans refermer le panneau, et un choix qu'on ne peut pas défaire finit
 * toujours par être le mauvais.
 */
function trocChoisir(cote, entry, ligne){
  if(cote !== 'veux' && cote !== 'donne') return;
  const memeNom = trocSel[cote] && trocSel[cote].name === entry.name;

  // La colonne n'a qu'un élu : on éteint l'ancien avant d'allumer le nouveau.
  const colonne = cote === 'veux' ? echangeLui : echangeMoi;
  if(colonne){
    colonne.querySelectorAll('.echange-ligne.choisi').forEach(function(l){
      l.classList.remove('choisi');
    });
  }

  trocSel[cote] = memeNom ? null : entry;
  if(!memeNom && ligne) ligne.classList.add('choisi');
  trocMajBarre();
}

function trocMajBarre(){
  if(!trocVeux || !trocDonne || !trocEnvoyer) return;

  trocVeux.textContent = trocSel.veux
    ? nomAffiche(trocSel.veux) : 'Choisis ce que tu veux à gauche';
  trocVeux.classList.toggle('rempli', !!trocSel.veux);

  trocDonne.textContent = trocSel.donne
    ? nomAffiche(trocSel.donne) : 'et ce que tu donnes à droite';
  trocDonne.classList.toggle('rempli', !!trocSel.donne);

  trocEnvoyer.disabled = !(trocSel.veux && trocSel.donne);
}

async function trocProposer(){
  if(!trocSel.veux || !trocSel.donne) return;
  if(typeof amiProgression === 'undefined' || !amiProgression || !amiProgression.pseudo) return;

  trocEnvoyer.disabled = true;
  if(trocEtat) trocEtat.textContent = 'Envoi…';
  try{
    await invoke('echange_proposer', {
      pseudo: amiProgression.pseudo,
      dex: (typeof currentTab !== 'undefined' && currentTab) ? currentTab : 'national',
      // Ce qu'IL me donne est ce que JE demande : les deux noms partent dans le
      // sens du demandeur, qui est moi puisque c'est moi qui propose.
      offert: trocSel.donne.name,
      demande: trocSel.veux.name,
      mot: (trocMot && trocMot.value.trim()) || null,
    });
    if(trocEtat) trocEtat.textContent = 'Proposition envoyée.';
    trocSel = { veux: null, donne: null };
    if(trocMot) trocMot.value = '';
    [echangeLui, echangeMoi].forEach(function(c){
      if(c) c.querySelectorAll('.echange-ligne.choisi').forEach(function(l){
        l.classList.remove('choisi');
      });
    });
    trocMajBarre();
    // La liste de la page des amis doit refléter ce qui vient de partir, même
    // si on ne s'y rend que plus tard.
    chargerTroc();
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    if(trocEtat) trocEtat.textContent = String(e);
    trocEnvoyer.disabled = false;
  }
}

// ---- La liste, sur la page des amis -----------------------------------------

async function chargerTroc(){
  if(!trocListe) return;
  if(typeof invoke !== 'function') return;

  let r;
  try{
    r = await invoke('echanges');
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    trocListe.innerHTML = '<div class="state-msg">Échanges indisponibles pour le moment.</div>';
    return;
  }

  const liste = (r && r.echanges) || [];
  trocListe.innerHTML = '';
  if(!liste.length){
    trocListe.innerHTML = '<div class="state-msg">Aucun échange pour l’instant.</div>';
    return;
  }
  liste.forEach(function(e){ trocListe.appendChild(ligneTroc(e)); });
}

function ligneTroc(e){
  const ligne = document.createElement('div');
  ligne.className = 'troc-ligne etat-' + (TROC_ETATS[e.etat] || {}).classe;

  const img = document.createElement('img');
  img.className = 'troc-avatar';
  img.alt = '';
  img.src = (typeof avatarDiscord === 'function')
    ? avatarDiscord(e.avec.discordId, e.avec.avatar, 64) : '';
  ligne.appendChild(img);

  const corps = document.createElement('div');
  corps.className = 'troc-corps';

  const titre = document.createElement('div');
  titre.className = 'troc-titre';
  // Qui a proposé, et à qui. Sans cette moitié de phrase, un échange refusé ne
  // dit pas qui a refusé — et ce n'est pas la même nouvelle selon le côté.
  titre.textContent = e.sens === 'propose'
    ? 'Tu proposes à ' + e.avec.pseudo
    : e.avec.pseudo + ' te propose';
  corps.appendChild(titre);

  const quoi = document.createElement('div');
  quoi.className = 'troc-quoi';
  quoi.textContent = trocPhrase(e) + '  ·  sur ' + trocJeuNom(e.dex);
  corps.appendChild(quoi);

  if(e.mot){
    const mot = document.createElement('div');
    mot.className = 'troc-mot';
    mot.textContent = '« ' + e.mot + ' »';
    corps.appendChild(mot);
  }

  const bas = document.createElement('div');
  bas.className = 'troc-bas';
  const etiq = document.createElement('span');
  etiq.className = 'troc-etat';
  etiq.textContent = (TROC_ETATS[e.etat] || { mot: e.etat }).mot;
  bas.appendChild(etiq);
  if(typeof dateLisible === 'function'){
    const quand = document.createElement('span');
    quand.className = 'troc-quand';
    quand.textContent = dateLisible(e.majLe || e.quand);
    bas.appendChild(quand);
  }
  corps.appendChild(bas);
  ligne.appendChild(corps);

  const actions = document.createElement('div');
  actions.className = 'troc-actions-ligne';

  // CE QU'ON PEUT FAIRE DÉPEND DU CÔTÉ ET DE L'ÉTAT, et de rien d'autre. Un
  // bouton grisé « Accepter » sur sa propre proposition n'apprendrait rien :
  // ceux qui n'ont pas lieu d'être ne sont pas dessinés.
  if(e.etat === 'propose' && e.sens === 'recu'){
    actions.appendChild(boutonTroc('Accepter', 'primary', function(){
      repondreTroc(e.id, 'accepte');
    }));
    actions.appendChild(boutonTroc('Refuser', '', function(){
      repondreTroc(e.id, 'refuse');
    }));
  }
  if(e.etat === 'propose' && e.sens === 'propose'){
    actions.appendChild(boutonTroc('Retirer', '', function(){ annulerTroc(e.id); }));
  }
  if(e.etat === 'accepte' || e.etat === 'fait'){
    const parler = boutonTroc('💬 Discuter', '', function(){ ouvrirDiscussion(e.id); });
    if(e.messages){
      parler.textContent = '💬 Discuter (' + e.messages + ')';
      // Le TOTAL, pas les non lus : rien ici ne sait ce qu'on a déjà lu. C'est la
      // cloche qui annonce ce qui vient d'arriver ; ce nombre-là dit seulement
      // combien on s'est écrit, et l'infobulle le précise pour qu'on ne le
      // prenne pas pour un compteur de messages neufs.
      parler.title = e.messages + ' message' + (e.messages > 1 ? 's' : '') + ' dans cette discussion';
    }
    actions.appendChild(parler);
  }
  if(e.etat === 'accepte'){
    actions.appendChild(boutonTroc('C’est fait', '', function(){ conclureTroc(e.id); }));
  }

  if(actions.childNodes.length) ligne.appendChild(actions);
  return ligne;
}

function boutonTroc(texte, classe, action){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'toggle-btn' + (classe ? ' ' + classe : '');
  b.textContent = texte;
  b.addEventListener('click', action);
  return b;
}

async function repondreTroc(id, reponse){
  try{
    await invoke('echange_reponse', { id: id, reponse: reponse });
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    prevenirErreur('Réponse impossible', String(e));
    return;
  }
  chargerTroc();
}

async function annulerTroc(id){
  try{
    await invoke('echange_annuler', { id: id });
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    prevenirErreur('Retrait impossible', String(e));
    return;
  }
  chargerTroc();
}

async function conclureTroc(id){
  // On demande, parce que c'est le seul geste irréversible de cet écran : un
  // échange marqué fait ferme la discussion à toute nouvelle proposition.
  const veut = await demanderConfirmation({
    eyebrow: 'Échange',
    titre: 'Marquer cet échange comme fait ?',
    note: 'À cocher une fois que vous l’avez réellement effectué dans le jeu. '
        + 'La discussion se ferme, mais reste lisible.',
    libelleAction: 'C’est fait',
  });
  if(!veut) return;
  try{
    await invoke('echange_fait', { id: id });
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    prevenirErreur('Impossible', String(e));
    return;
  }
  chargerTroc();
}

// ---- La discussion ----------------------------------------------------------

async function ouvrirDiscussion(id){
  if(!discussionOverlay) return;
  trocDiscussion = id;
  discussionFil.innerHTML = '<div class="state-msg">Chargement…</div>';
  discussionResume.textContent = '';
  discussionEtat.textContent = '';
  discussionTexte.value = '';
  discussionOverlay.style.display = 'flex';
  setTimeout(function(){ discussionTexte.focus(); }, 10);
  await dessinerDiscussion();
}

async function dessinerDiscussion(){
  if(trocDiscussion === null) return;
  let r;
  try{
    r = await invoke('echange_messages', { id: trocDiscussion });
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    discussionFil.innerHTML = '<div class="state-msg">' + String(e) + '</div>';
    return;
  }

  const e = r.echange;
  discussionEyebrow.textContent = 'Échange avec ' + e.avec.pseudo;
  discussionTitre.textContent = trocPhrase(e);
  discussionResume.textContent = 'Sur ' + trocJeuNom(e.dex)
    + '  ·  ' + (TROC_ETATS[e.etat] || { mot: e.etat }).mot;

  discussionFil.innerHTML = '';
  if(!r.messages.length){
    discussionFil.innerHTML = '<div class="state-msg">Rien encore. '
      + 'Dites-vous quand vous serez tous les deux en ligne.</div>';
  }
  r.messages.forEach(function(m){
    const bulle = document.createElement('div');
    bulle.className = 'discussion-bulle' + (m.deMoi ? ' de-moi' : '');
    const qui = document.createElement('span');
    qui.className = 'discussion-qui';
    qui.textContent = m.deMoi ? 'Toi' : m.pseudo;
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
    discussionFil.appendChild(bulle);
  });
  // Le dernier message est celui qu'on vient lire : la vue s'y pose.
  discussionFil.scrollTop = discussionFil.scrollHeight;

  // Un échange conclu se relit, mais ne se poursuit pas.
  const clos = e.etat === 'fait';
  discussionTexte.disabled = clos;
  discussionEnvoyer.disabled = clos;
  discussionTexte.placeholder = clos ? 'Cet échange est terminé.' : 'Écrire…';
}

async function envoyerMessage(){
  if(trocDiscussion === null) return;
  const texte = discussionTexte.value.trim();
  if(!texte) return;

  discussionEnvoyer.disabled = true;
  try{
    await invoke('echange_ecrire', { id: trocDiscussion, texte: texte });
    discussionTexte.value = '';
    discussionEtat.textContent = '';
    await dessinerDiscussion();
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    discussionEtat.textContent = String(e);
  }finally{
    discussionEnvoyer.disabled = false;
  }
}

function fermerDiscussion(){
  if(discussionOverlay) discussionOverlay.style.display = 'none';
  trocDiscussion = null;
  // La liste porte le nombre de messages : elle est fausse dès qu'on en a lu
  // ou écrit un.
  chargerTroc();
}

// ---- Le câblage -------------------------------------------------------------

if(trocEnvoyer) trocEnvoyer.addEventListener('click', trocProposer);
if(trocMot){
  trocMot.addEventListener('keydown', function(e){
    if(e.key === 'Enter' && !trocEnvoyer.disabled) trocProposer();
  });
}
if(discussionEnvoyer) discussionEnvoyer.addEventListener('click', envoyerMessage);
if(discussionTexte){
  discussionTexte.addEventListener('keydown', function(e){
    if(e.key === 'Enter') envoyerMessage();
  });
}
if(discussionFermer) discussionFermer.addEventListener('click', fermerDiscussion);
if(discussionOverlay){
  discussionOverlay.addEventListener('click', function(e){
    if(e.target === discussionOverlay) fermerDiscussion();
  });
}
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && discussionOverlay
     && discussionOverlay.style.display === 'flex') fermerDiscussion();
});
