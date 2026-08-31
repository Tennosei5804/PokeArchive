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
  // UN DON N'A PAS DE « CONTRE ». Un côté vide veut dire « rien en retour » —
  // le serveur le redit avec `don`, et l'on s'appuie sur lui plutôt que sur une
  // chaîne vide, qui pourrait aussi bien signaler une donnée manquante.
  //
  // La phrase change de sens selon le côté où l'on se trouve, et c'est le seul
  // endroit de ce fichier où cela arrive : recevoir un don et en faire un ne se
  // racontent pas pareil, alors qu'un échange se raconte pareil des deux côtés.
  // TROIS GENRES, ET LE POINT DE VUE COMPTE POUR DEUX D'ENTRE EUX. Un échange
  // se raconte pareil des deux côtés ; un don et une demande, non — recevoir un
  // cadeau et en faire un ne sont pas la même phrase.
  if(e.genre === 'don'){
    return e.jeRecois ? trocNom(e.jeRecois) + ', offert'
                      : trocNom(e.jeDonne) + ', en cadeau';
  }
  if(e.genre === 'demande'){
    return e.jeDonne ? trocNom(e.jeDonne) + ', demandé'
                     : trocNom(e.jeRecois) + ', tu le demandes';
  }
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

  // L'UN OU L'AUTRE SUFFIT, ET LES DEUX SENS SE VALENT.
  //
  //   les deux    un échange ;
  //   à droite    un DON — j'offre, je ne demande rien ;
  //   à gauche    une DEMANDE — je demande, je n'offre rien.
  //
  // Seul le don existait, et l'asymétrie n'avait aucune raison d'être : « tu me
  // le donnerais ? » est une proposition comme une autre.
  const don = trocSel.donne && !trocSel.veux;
  const demande = trocSel.veux && !trocSel.donne;

  trocVeux.textContent = trocSel.veux
    ? nomAffiche(trocSel.veux) : 'Sans rien demander en retour';
  trocVeux.classList.toggle('rempli', !!trocSel.veux);

  trocDonne.textContent = trocSel.donne
    ? nomAffiche(trocSel.donne) : 'Sans rien offrir en échange';
  trocDonne.classList.toggle('rempli', !!trocSel.donne);

  // « contre » n'a pas de sens quand il n'y a rien en face.
  if(trocContre) trocContre.textContent = (don || demande) ? '·' : 'contre';

  // Le bouton dit LEQUEL DES TROIS GESTES on s'apprête à faire. C'est le
  // dernier mot qu'on lit avant d'envoyer ; « Proposer l'échange » sous une
  // demande serait faux.
  trocEnvoyer.textContent = don ? 'Offrir ce Pokémon'
    : demande ? 'Demander ce Pokémon' : 'Proposer l’échange';
  trocEnvoyer.disabled = !(trocSel.donne || trocSel.veux);
}

async function trocProposer(){
  if(!exigeCompte('proposer un échange')) return;
  if(!trocSel.donne && !trocSel.veux) return;
  if(typeof amiProgression === 'undefined' || !amiProgression || !amiProgression.pseudo) return;

  trocEnvoyer.disabled = true;
  if(trocEtat) trocEtat.textContent = 'Envoi…';
  try{
    await invoke('echange_proposer', {
      pseudo: amiProgression.pseudo,
      dex: (typeof currentTab !== 'undefined' && currentTab) ? currentTab : 'national',
      // Ce qu'IL me donne est ce que JE demande : les deux noms partent dans le
      // sens du demandeur, qui est moi puisque c'est moi qui propose.
      // Vide d'un côté ou de l'autre : le serveur y lit un don ou une demande.
      offert: trocSel.donne ? trocSel.donne.name : '',
      demande: trocSel.veux ? trocSel.veux.name : '',
      mot: (trocMot && trocMot.value.trim()) || null,
    });
    if(trocEtat) {
      trocEtat.textContent = !trocSel.veux ? 'Don envoyé.'
        : !trocSel.donne ? 'Demande envoyée.' : 'Proposition envoyée.';
    }
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

  // CE QUI ATTEND UNE RÉPONSE DE MOI, D'ABORD. Une proposition reçue depuis
  // plus d'une semaine n'est pas un élément de liste parmi d'autres : c'est
  // quelqu'un qui attend, et qui ne sait pas s'il a été refusé ou oublié.
  dessinerRappels(liste);

  // LES CONCLUS SE RANGENT À PART. Ils ne demandent plus rien et n'ont pas à
  // encombrer ce qui est encore vivant — mais les perdre effacerait la seule
  // trace qu'on a déjà échangé avec quelqu'un.
  const vivants = liste.filter(function(e){ return e.etat !== 'fait'; });
  const conclus = liste.filter(function(e){ return e.etat === 'fait'; });

  if(!vivants.length){
    trocListe.innerHTML += '<div class="state-msg">Aucun échange en cours.</div>';
  } else {
    vivants.forEach(function(e){ trocListe.appendChild(ligneTroc(e)); });
  }
  dessinerHistorique(conclus);
}

// ---- Ce qui attend une réponse ----------------------------------------------
//
// LE RAPPEL S'ADRESSE À CELUI QUI DOIT RÉPONDRE, pas à celui qui attend : c'est
// lui qui peut débloquer la situation. Et il ne SONNE PAS — un bandeau vu en
// ouvrant l'écran ne dérange personne, une notification qui se déclenche toute
// seule au bout d'une semaine devient du harcèlement à retardement.

const RAPPEL_JOURS = 7;

function joursDepuis(quand){
  const t = Date.parse(quand || '');
  if(!t) return 0;
  return Math.floor((Date.now() - t) / 86400000);
}

function dessinerRappels(liste){
  if(!trocRappels) return;
  const dus = liste.filter(function(e){
    return e.etat === 'propose' && e.sens === 'recu'
      && joursDepuis(e.quand) >= RAPPEL_JOURS;
  });

  trocRappels.innerHTML = '';
  trocRappels.hidden = !dus.length;
  if(!dus.length) return;

  dus.forEach(function(e){
    const bloc = document.createElement('div');
    bloc.className = 'troc-rappel';

    const pict = document.createElement('span');
    pict.className = 'troc-rappel-pict';
    pict.innerHTML = iconeHtml('sablier', 18);
    bloc.appendChild(pict);

    const txt = document.createElement('div');
    txt.className = 'troc-rappel-txt';
    const qui = document.createElement('b');
    qui.textContent = e.avec.pseudo;
    txt.appendChild(qui);
    txt.appendChild(document.createTextNode(
      ' attend depuis ' + joursDepuis(e.quand) + ' jours  ·  '
      + trocPhrase(e) + ', sur ' + trocJeuNom(e.dex)));

    const actions = document.createElement('div');
    actions.className = 'troc-rappel-actions';
    actions.appendChild(boutonTroc('Accepter', 'primary', function(){
      repondreTroc(e.id, 'accepte');
    }));
    actions.appendChild(boutonTroc('Refuser', '', function(){
      repondreTroc(e.id, 'refuse');
    }));
    txt.appendChild(actions);
    bloc.appendChild(txt);
    trocRappels.appendChild(bloc);
  });
}

// ---- Avec qui on a déjà échangé ---------------------------------------------
//
// « CONCLU » EST POSÉ À LA MAIN par l'un des deux : l'application ne constate
// rien, elle enregistre une intention. On écrit donc « d'après lui » plutôt que
// de présenter un fait — sans quoi ce compte deviendrait une réputation que
// personne n'a vérifiée.

function dessinerHistorique(conclus){
  if(!trocHistorique || !trocHistoriqueBloc) return;
  trocHistoriqueBloc.hidden = !conclus.length;
  trocHistorique.innerHTML = '';
  if(!conclus.length) return;

  const gens = new Set(conclus.map(function(e){ return e.avec.pseudo; }));
  const resume = document.createElement('p');
  resume.className = 'troc-histo-resume';
  resume.textContent = conclus.length + (conclus.length > 1 ? ' échanges conclus' : ' échange conclu')
    + ' avec ' + gens.size + (gens.size > 1 ? ' dresseurs' : ' dresseur')
    + '  ·  marqués faits à la main, de part ou d’autre';
  trocHistorique.appendChild(resume);

  conclus.forEach(function(e){
    const ligne = document.createElement('div');
    ligne.className = 'troc-histo-ligne';

    const quoi = document.createElement('span');
    quoi.className = 'troc-histo-quoi';
    const qui = document.createElement('b');
    qui.textContent = e.avec.pseudo;
    quoi.appendChild(qui);
    quoi.appendChild(document.createTextNode(
      '  ·  ' + trocPhrase(e) + '  ·  ' + trocJeuNom(e.dex)));
    ligne.appendChild(quoi);

    if(typeof dateLisible === 'function'){
      const quand = document.createElement('span');
      quand.className = 'troc-histo-quand';
      quand.textContent = dateLisible(e.majLe || e.quand);
      ligne.appendChild(quand);
    }
    trocHistorique.appendChild(ligne);
  });
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
  // ON PARLE DÈS LA PROPOSITION. Le bouton n'apparaissait qu'après un oui,
  // ce qui laissait le destinataire sans un mot à répondre — voir l'en-tête
  // de api/src/echanges.js pour la règle et son renversement.
  //
  // Refusé ou retiré, le bouton reste : la conversation est LISIBLE, elle
  // n'est plus ouverte. Le serveur refuse l'écriture, et l'écran le dira.
  {
    // UNE PERSONNE, UNE CONVERSATION. Ce bouton ouvrait un fil propre à cet
    // échange : on se retrouvait avec deux boîtes pour le même interlocuteur,
    // dont l'une ne s'ouvrait qu'en passant par la fiche d'un troc — et rien ne
    // disait qu'elle existait. Les messages d'un échange apparaissent désormais
    // dans la conversation avec la personne, chacun portant l'échange dont il
    // parle.
    //
    // Le repli sur l'ancienne fenêtre sert les pages qui n'ont pas la
    // messagerie : le site n'a pas de compte, donc personne à qui écrire.
    const parler = boutonTroc('Discuter', '', function(){
      if(e.avec && e.avec.pseudo) ouvrirMessagerie(e.avec.pseudo);
    });
    boutonIcone(parler, 'bulle');
    if(e.messages){
      boutonIcone(parler, 'bulle', 'Discuter (' + e.messages + ')');
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
  if(!exigeCompte('répondre à un échange')) return;
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

// ---- La discussion d'un échange ---------------------------------------------
//
// ELLE N'EXISTE PLUS ICI. C'était une fenêtre modale propre à UN échange : on
// se retrouvait avec deux boîtes pour le même interlocuteur, dont l'une ne
// s'ouvrait qu'en passant par la fiche d'un troc.
//
// Les messages d'un échange vivent désormais dans la conversation de la
// personne — voir js/messagerie.js et api/src/messagerie.js. Le bouton
// « Discuter » et la cloche y mènent tous les deux, et plus aucun chemin ne
// rouvre une fenêtre par-dessus l'écran.
