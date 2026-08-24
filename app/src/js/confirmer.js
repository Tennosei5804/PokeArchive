// Les dialogues de l'application : confirmer, saisir, prévenir.
// Script classique (pas de module ES), chargé avant tous ses appelants — la
// modale qu'il pilote est déjà dans le HTML quand il s'exécute.
//
// Ils remplacent confirm(), prompt() et alert(), qui ont les mêmes trois
// défauts : la boîte est dessinée par Windows et ne ressemble à rien du reste ;
// elle ne peut afficher que du texte, donc jamais ce qui est en jeu ; et elle
// se valide d'un « Entrée » réflexe. Sur une suppression de dex, le dernier
// point est disqualifiant.
//
// Une seule fenêtre pour les trois : ce sont les mêmes pièces — un titre, un
// corps, éventuellement un champ, deux boutons — et trois fenêtres séparées
// auraient dérivé l'une de l'autre.

const confirmOverlay = document.getElementById('confirmOverlay');
const confirmEyebrow = document.getElementById('confirmEyebrow');
const confirmTitre = document.getElementById('confirmTitre');
const confirmCorps = document.getElementById('confirmCorps');
const confirmSaisieBloc = document.getElementById('confirmSaisieBloc');
const confirmSaisieLabel = document.getElementById('confirmSaisieLabel');
const confirmSaisie = document.getElementById('confirmSaisie');
const confirmSaisieErreur = document.getElementById('confirmSaisieErreur');
const confirmAnnuler = document.getElementById('confirmAnnuler');
const confirmValider = document.getElementById('confirmValider');

let dlgResoudre = null;
let dlgMode = 'confirmer';     // confirmer · saisie · info
let dlgMotAttendu = null;      // le nom à recopier, en mode confirmer
let dlgValider = null;         // la validation, en mode saisie
let dlgApercu = null;          // ce que la valeur deviendra, en mode saisie
let dlgFocusRendu = null;      // l'élément qui avait le focus avant l'ouverture

// ---- La fenêtre ------------------------------------------------------------

function ouvrirDialogue(options){
  // Sans la fenêtre — page de génération, ou HTML plus ancien — on retombe sur
  // les boîtes du système plutôt que de ne rien demander du tout.
  if(!confirmOverlay){
    if(options.mode === 'saisie') return Promise.resolve(window.prompt(options.titre, options.valeur || ''));
    if(options.mode === 'info'){ window.alert(options.titre); return Promise.resolve(true); }
    return Promise.resolve(window.confirm(options.titre));
  }

  return new Promise(function(resoudre){
    dlgFocusRendu = document.activeElement;
    dlgResoudre = resoudre;
    dlgMode = options.mode;
    dlgMotAttendu = options.motAEcrire || null;
    dlgValider = options.valider || null;
    dlgApercu = options.apercu || null;

    const genre = options.genre || (options.danger ? 'danger' : '');
    confirmEyebrow.textContent = options.eyebrow || 'Confirmation';
    confirmEyebrow.className = 'modal-eyebrow' + (genre ? ' ' + genre : '');
    confirmTitre.textContent = options.titre || '';

    dessinerCorps(options);
    dessinerChamp(options);

    // En mode information, il n'y a rien à refuser : un seul bouton.
    confirmAnnuler.style.display = options.mode === 'info' ? 'none' : '';
    confirmAnnuler.textContent = options.libelleAnnuler || 'Annuler';
    confirmValider.textContent = options.libelleAction
      || (options.mode === 'info' ? 'Compris' : 'Confirmer');
    confirmValider.className = 'toggle-btn '
      + (genre === 'danger' ? 'danger' : 'primary');
    majEtatValider();

    confirmOverlay.style.display = 'flex';
    setTimeout(function(){
      if(options.mode === 'saisie' || dlgMotAttendu) confirmSaisie.focus();
      else confirmValider.focus();
      if(options.mode === 'saisie') confirmSaisie.select();
    }, 10);
  });
}

function dessinerCorps(options){
  confirmCorps.innerHTML = '';

  // Ce dont on parle, chiffré. Une suppression se décide sur des nombres :
  // « 152 capturés » arrête la main, « ton Pokédex » ne l'arrête pas.
  if(options.resume && options.resume.length){
    const bloc = document.createElement('div');
    bloc.className = 'confirm-resume';
    options.resume.forEach(function(r){
      const l = document.createElement('span');
      l.className = 'confirm-resume-ligne';
      l.innerHTML = '<b>' + r.valeur + '</b> ' + r.cle;
      bloc.appendChild(l);
    });
    confirmCorps.appendChild(bloc);
  }

  if(options.pertes && options.pertes.length){
    const titre = document.createElement('div');
    titre.className = 'confirm-sous-titre';
    titre.textContent = options.titrePertes || 'Ce qui disparaît avec elle';
    confirmCorps.appendChild(titre);

    const liste = document.createElement('ul');
    liste.className = 'confirm-pertes';
    options.pertes.forEach(function(p){
      const li = document.createElement('li');
      li.textContent = p;
      liste.appendChild(li);
    });
    confirmCorps.appendChild(liste);
  }

  if(options.note){
    const note = document.createElement('p');
    note.className = 'confirm-note' + (options.genre ? ' ' + options.genre : '')
      + (options.danger ? ' danger' : '');
    note.textContent = options.note;
    confirmCorps.appendChild(note);
  }
}

function dessinerChamp(options){
  confirmSaisieErreur.textContent = '';
  if(options.mode === 'saisie'){
    confirmSaisieBloc.style.display = '';
    confirmSaisieLabel.textContent = options.libelleChamp || '';
    confirmSaisie.value = options.valeur || '';
    confirmSaisie.placeholder = options.placeholder || '';
    confirmSaisie.maxLength = options.maxlength || 200;
  } else if(dlgMotAttendu){
    // Recopier le nom : le seul garde-fou qui résiste à un clic distrait. On ne
    // le demande que pour ce qui ne se récupère pas.
    confirmSaisieBloc.style.display = '';
    confirmSaisieLabel.textContent = 'Pour confirmer, écris « ' + dlgMotAttendu + ' »';
    confirmSaisie.value = '';
    confirmSaisie.placeholder = dlgMotAttendu;
    confirmSaisie.maxLength = 200;
  } else {
    confirmSaisieBloc.style.display = 'none';
  }
}

/**
 * Le bouton d'action est-il ouvert.
 *
 * En confirmation : tant que le nom n'est pas exact. On tolère la casse et les
 * espaces autour — c'est une confirmation, pas une dictée.
 * En saisie : tant que la valeur ne passe pas la validation, dont le message
 * s'affiche sous le champ plutôt que d'attendre un clic pour se manifester.
 */
function majEtatValider(){
  if(dlgMode === 'saisie'){
    const v = confirmSaisie.value;
    const souci = dlgValider ? dlgValider(v) : (v.trim() ? null : 'Le champ est vide.');
    // Un aperçu n'est pas une erreur : quand le serveur va nettoyer la saisie,
    // on montre le résultat plutôt que de refuser une valeur qu'il accepterait.
    const apercu = (!souci && dlgApercu) ? dlgApercu(v) : null;
    confirmSaisieErreur.textContent = (v && souci) ? souci : (apercu || '');
    confirmSaisieErreur.className = 'confirm-saisie-erreur' + (souci ? '' : ' apercu');
    confirmValider.disabled = !!souci;
    return;
  }
  if(dlgMotAttendu){
    const saisi = confirmSaisie.value.trim().toLowerCase();
    confirmValider.disabled = saisi !== dlgMotAttendu.trim().toLowerCase();
    return;
  }
  confirmValider.disabled = false;
}

/**
 * Les éléments sur lesquels la tabulation a le droit de s'arrêter, dans l'ordre
 * où ils apparaissent. Le champ n'existe pas toujours ; le bouton « Annuler »
 * disparaît en mode information.
 */
function elementsFocusables(){
  return [confirmSaisie, confirmAnnuler, confirmValider].filter(function(e){
    return e && e.offsetParent !== null && !e.disabled;
  });
}

/**
 * Retient la tabulation dans la fenêtre.
 *
 * Sans ça, Tab sortait de la modale et allait se promener dans la page
 * derrière — qui reste cliquable. Sur une suppression, on pouvait avoir le
 * focus sur un bouton du Pokédex tout en croyant être dans la confirmation.
 */
function piegerTabulation(e){
  if(e.key !== 'Tab') return;
  const liste = elementsFocusables();
  if(!liste.length) return;
  const premier = liste[0];
  const dernier = liste[liste.length - 1];
  const actif = document.activeElement;
  if(e.shiftKey && (actif === premier || !liste.includes(actif))){
    e.preventDefault();
    dernier.focus();
  } else if(!e.shiftKey && actif === dernier){
    e.preventDefault();
    premier.focus();
  }
}

function fermerDialogue(valide){
  if(!confirmOverlay) return;
  confirmOverlay.style.display = 'none';
  // On rend le focus à ce qui l'avait : sinon il retombe sur <body> et la
  // tabulation suivante repart du haut de la page.
  if(dlgFocusRendu && document.contains(dlgFocusRendu)){
    try{ dlgFocusRendu.focus(); }catch(e){}
  }
  dlgFocusRendu = null;
  const f = dlgResoudre;
  const mode = dlgMode;
  const valeur = confirmSaisie.value;
  dlgResoudre = null;
  dlgMotAttendu = null;
  dlgValider = null;
  dlgApercu = null;
  if(!f) return;
  if(mode === 'saisie') f(valide ? valeur.trim() : null);
  else f(!!valide);
}

// ---- Les trois portes d'entrée ---------------------------------------------

/**
 * Demande confirmation. Rend vrai si l'on va au bout.
 *
 * options : eyebrow, titre, resume [{cle,valeur}], pertes [texte], note,
 *           motAEcrire, libelleAction, danger
 */
function demanderConfirmation(options){
  return ouvrirDialogue(Object.assign({}, options, { mode: 'confirmer' }));
}

/**
 * Demande un texte. Rend la valeur saisie, ou null si l'on renonce.
 *
 * options : eyebrow, titre, note, libelleChamp, valeur, placeholder,
 *           maxlength, valider(v) → message d'erreur ou null, libelleAction
 */
function demanderSaisie(options){
  return ouvrirDialogue(Object.assign({}, options, { mode: 'saisie' }));
}

/**
 * Dit quelque chose, et attend qu'on ait lu.
 *
 * options : eyebrow, titre, note, resume, genre ('succes' | 'danger' | '')
 */
function prevenir(options){
  return ouvrirDialogue(Object.assign({}, options, { mode: 'info' }));
}

// Un raccourci pour le cas le plus courant : une opération qui a échoué.
function prevenirErreur(titre, note){
  return prevenir({ eyebrow: 'Rien n\'a été fait', titre: titre, note: note, genre: 'danger' });
}

// ---- Le câblage ------------------------------------------------------------

if(confirmOverlay){
  confirmSaisie.addEventListener('input', majEtatValider);
  confirmSaisie.addEventListener('keydown', function(e){
    if(e.key === 'Enter' && !confirmValider.disabled) fermerDialogue(true);
  });
  confirmValider.addEventListener('click', function(){
    if(!confirmValider.disabled) fermerDialogue(true);
  });
  confirmAnnuler.addEventListener('click', function(){ fermerDialogue(false); });
  // Sur la fenêtre elle-même : la capture attrape la tabulation avant que le
  // navigateur ne déplace le focus.
  confirmOverlay.addEventListener('keydown', piegerTabulation);
  // Cliquer à côté ou faire Échap revient à renoncer : pour une suppression,
  // le refus doit toujours être le geste le plus facile. En information, il n'y
  // a rien à refuser — fermer suffit.
  confirmOverlay.addEventListener('click', function(e){
    if(e.target === confirmOverlay) fermerDialogue(dlgMode === 'info');
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && confirmOverlay.style.display === 'flex'){
      fermerDialogue(dlgMode === 'info');
    }
  });
}
