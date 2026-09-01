// « Je cherche » : dire ce qu'on veut, et voir chez qui c'est.
//
// Script classique, chargé APRÈS compte.js et amis.js : il se sert d'invoke, de
// perdreSession, de queueSave, de nomJournal et de nomAffiche.
//
// LA QUESTION QUE LES ÉCHANGES NE SAVAIENT PAS POSER. Ils marchaient à
// condition de savoir déjà à qui demander : il fallait ouvrir chaque ami, un
// par un, pour voir ce qu'il pouvait donner. Une liste d'envies renverse le
// sens — on dit ce qu'on cherche, l'application dit chez qui c'est, et il ne
// reste qu'à proposer.
//
// CE N'EST PAS LA LISTE DES MANQUANTS, et c'est toute la différence. Le Pokédex
// sait déjà, et mieux que quiconque, ce qui te manque : mille deux cents lignes.
// Ceci dit ce que tu veux VRAIMENT — les cinq ou dix que tu demanderais à
// quelqu'un. Une intention, pas un inventaire. D'où le plafond : au-delà de
// cinquante, ce n'est plus une envie, c'est de nouveau l'inventaire.

const RECHERCHES_MAX = 50;

// Les envies, gardées dans la sauvegarde comme les chasses et les objectifs :
// elles appartiennent à l'aventure, et changer de machine doit les retrouver.
let recherches = [];

// Ce que la dernière interrogation a rendu : { nom -> [pseudos] }.
let recherchesChez = {};

// ---- La liste ---------------------------------------------------------------

function chercheDeja(nom){
  return recherches.indexOf(nom) !== -1;
}

/**
 * Ajoute ou retire une envie.
 *
 * Rend vrai si l'envie est désormais inscrite. Le plafond se signale plutôt
 * que d'échouer en silence : une liste qui refuse sans rien dire donne
 * l'impression d'un bouton cassé.
 */
function basculerRecherche(nom){
  if(!exigeCompte('tenir une liste d’envies')) return false;
  const i = recherches.indexOf(nom);
  if(i !== -1){
    recherches.splice(i, 1);
    queueSave();
    rafraichirRecherches();
    return false;
  }
  if(recherches.length >= RECHERCHES_MAX){
    prevenirErreur('Cinquante envies, c’est le maximum',
      'Au-delà, ce n’est plus une liste d’envies : c’est ton Pokédex des '
      + 'manquants, et il est déjà quelque part.');
    return false;
  }
  recherches.push(nom);
  queueSave();
  rafraichirRecherches();
  return true;
}

function rafraichirRecherches(){
  dessinerBoutonRecherche();
  dessinerRecherches();
}

// ---- Sur la fiche -----------------------------------------------------------

/** Appelée par remplirFiche(), et après chaque bascule. */
function dessinerBoutonRecherche(){
  if(!ficheCherche) return;
  if(typeof previewEntry === 'undefined' || !previewEntry){
    ficheCherche.hidden = true;
    return;
  }
  const nom = previewEntry.name;
  // Sur ce qu'on possède déjà, le bouton n'a rien à dire — et le proposer
  // inviterait à demander ce qu'on a. Il reste visible si l'envie est déjà
  // inscrite, pour qu'on puisse la retirer après avoir attrapé la bête.
  const possede = (typeof activeSet === 'function') && activeSet().has(nom);
  if(possede && !chercheDeja(nom)){
    ficheCherche.hidden = true;
    majFicheActions();
    return;
  }

  ficheCherche.hidden = false;
  const veut = chercheDeja(nom);
  boutonIcone(ficheCherche, 'loupe', veut ? 'Tu le cherches' : 'Je le cherche');
  ficheCherche.classList.toggle('actif', veut);
  ficheCherche.setAttribute('aria-pressed', veut ? 'true' : 'false');
  ficheCherche.title = veut
    ? 'Retirer de ta liste d’envies'
    : 'L’inscrire dans ta liste d’envies, sur la page des amis';
  majFicheActions();
}

/**
 * La carte des actions disparaît quand elle n'a plus rien à porter.
 *
 * SES DEUX BOUTONS SE CACHENT CHACUN POUR SA RAISON : « Je le cherche » sur ce
 * qu'on possède déjà, « L'envoyer à quelqu'un » là où il n'y a pas de
 * messagerie — le site, les pages de génération. Les deux peuvent donc tomber
 * en même temps, et un cadre vide serait pire que pas de cadre du tout.
 */
function majFicheActions(){
  const carte = document.getElementById('ficheActions');
  if(!carte) return;
  const vivants = Array.prototype.filter
    .call(carte.querySelectorAll('button'), function(b){ return !b.hidden; });
  carte.hidden = vivants.length === 0;
}

// ---- Sur la page des amis ---------------------------------------------------

function dessinerRecherches(){
  if(!rechercheListe) return;

  if(rechercheTitre) rechercheTitre.hidden = false;
  rechercheListe.innerHTML = '';

  if(!recherches.length){
    rechercheListe.innerHTML = '<div class="state-msg">Rien pour l’instant. '
      + 'Ouvre la fiche d’un Pokémon et clique « Je le cherche ».</div>';
    return;
  }

  recherches.forEach(function(nom){
    const ligne = document.createElement('div');
    ligne.className = 'cherche-ligne';

    const quoi = document.createElement('span');
    quoi.className = 'cherche-nom';
    quoi.textContent = (typeof nomJournal === 'function') ? nomJournal(nom) : nom;
    ligne.appendChild(quoi);

    const chez = recherchesChez[nom] || [];
    const ou = document.createElement('span');
    ou.className = 'cherche-chez' + (chez.length ? ' trouve' : '');
    // NOMMER LES GENS, pas les compter. « 2 amis l'ont » oblige à ouvrir pour
    // savoir qui ; le nom, lui, permet d'aller lui parler tout de suite.
    ou.textContent = chez.length
      ? (chez.length > 3
          ? chez.slice(0, 3).join(', ') + ' et ' + (chez.length - 3) + ' autres'
          : chez.join(', '))
      : 'personne pour l’instant';
    ligne.appendChild(ou);

    const oter = document.createElement('button');
    oter.type = 'button';
    oter.className = 'cherche-oter';
    oter.textContent = '✕';
    oter.title = 'Retirer de la liste';
    oter.addEventListener('click', function(){ basculerRecherche(nom); });
    ligne.appendChild(oter);

    rechercheListe.appendChild(ligne);
  });
}

/**
 * Demande au serveur qui possède ce qu'on cherche.
 *
 * Appelée à l'ouverture de la page des amis, et pas à chaque bascule : la
 * réponse ne change pas parce qu'on vient d'ajouter une ligne, et interroger
 * la base à chaque clic serait bavard pour rien.
 */
async function chargerQuiA(){
  if(!recherches.length){ recherchesChez = {}; dessinerRecherches(); return; }
  if(typeof invoke !== 'function') return;
  try{
    const r = await invoke('qui_a', { noms: recherches.slice() });
    recherchesChez = (r && r.chez) || {};
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    // Hors ligne : la liste s'affiche quand même, sans le « chez qui ». Elle
    // vit dans la sauvegarde et n'a pas besoin du réseau pour exister.
    recherchesChez = {};
  }
  dessinerRecherches();
}

// ---- Le câblage -------------------------------------------------------------

if(ficheCherche){
  // L'ICÔNE DÈS LE DÉPART, et non à la première fiche ouverte. `majFicheCherche`
  // la repose à chaque bascule du libellé, mais tant qu'aucune fiche n'avait été
  // ouverte le bouton restait dans son état de départ : le mot seul, sans rien
  // devant. Il est caché à ce moment-là, donc personne ne le voyait — raison de
  // plus pour ne pas laisser un demi-bouton dans la page.
  boutonIcone(ficheCherche, 'loupe');
  ficheCherche.addEventListener('click', function(){
    if(typeof previewEntry === 'undefined' || !previewEntry) return;
    basculerRecherche(previewEntry.name);
  });
}
