// Le premier lancement : deux questions, puis on est dedans.
// Script classique (pas de module ES), chargé APRÈS compte.js — il se sert de
// profilCourant, profilsConnus, invoke et ouvrirProfil, qui viennent de là.
//
// CE QU'IL Y AVAIT AVANT. Après Discord, on tombait sur un accueil à 0 / 1 281
// et dix onglets. Les trois mots qui décident de tout — aventure, mode, niveau
// de formes — étaient demandés dans une modale, avant d'avoir vu un seul
// Pokémon. Le LISEZMOI énonçait déjà la règle pour le niveau de formes : « on
// ne fait pas choisir avant d'avoir vu ». Elle vaut pour le reste.
//
// DEUX QUESTIONS, PAS TROIS. Le jeu, puis ce qu'on compte. Le niveau de formes
// ne se demande PAS ici : il se règle depuis la barre du Pokédex, une fois
// qu'on a une grille sous les yeux et que les mots veulent dire quelque chose.
//
// ON PEUT PASSER, et ça ne revient pas. Une aide qui se rouvre à chaque
// lancement devient un obstacle ; celle-ci se pose une fois et se tait.

const departOverlay = document.getElementById('departOverlay');
const departEtape = document.getElementById('departEtape');
const departTitre = document.getElementById('departTitre');
const departSous = document.getElementById('departSous');
const departJeux = document.getElementById('departJeux');
const departModes = document.getElementById('departModes');
const departPasser = document.getElementById('departPasser');
const departRetour = document.getElementById('departRetour');

// La marque est posée par compte, pas par machine : quelqu'un qui se connecte
// chez un ami n'a pas à revoir l'accueil du premier jour. Elle vit dans
// localStorage faute d'endroit prévu côté serveur — et ce n'est qu'une aide,
// la reperdre ne coûte qu'une fenêtre de trop.
const DEPART_CLE = 'pokearchive-depart-fait';

let departJeuChoisi = null;

function departDejaFait(pseudo){
  try{
    const brut = localStorage.getItem(DEPART_CLE);
    if(!brut) return false;
    return JSON.parse(brut).indexOf(pseudo) !== -1;
  }catch(e){ return false; }
}

function marquerDepartFait(pseudo){
  try{
    const brut = localStorage.getItem(DEPART_CLE);
    const liste = brut ? JSON.parse(brut) : [];
    if(liste.indexOf(pseudo) === -1) liste.push(pseudo);
    localStorage.setItem(DEPART_CLE, JSON.stringify(liste));
  }catch(e){ /* stockage refusé : la fenêtre reviendra, sans plus */ }
}

/**
 * Est-ce vraiment un premier lancement ?
 *
 * Trois conditions, et les trois comptent : une seule aventure, rien de coché
 * dedans, et la marque absente. Quelqu'un qui a déjà six cents Pokémon n'a pas
 * besoin qu'on lui demande à quoi il joue — et se le faire demander donnerait
 * le sentiment que l'application a oublié qui il est.
 */
function estPremierLancement(){
  if(!departOverlay) return false;
  if(typeof profilsConnus === 'undefined' || !profilsConnus) return false;
  if(profilsConnus.length !== 1) return false;
  const p = profilsConnus[0];
  if((p.captures || 0) > 0 || (p.shiny || 0) > 0) return false;
  return !departDejaFait(playerName || '');
}

// ---- Première question : le jeu ---------------------------------------------

function carteJeuDepart(game){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'depart-jeu';
  b.title = game.title;

  const cadre = document.createElement('span');
  cadre.className = 'depart-jaquette';
  if(typeof remplirJaquette === 'function') remplirJaquette(cadre, game);
  b.appendChild(cadre);

  const nom = document.createElement('span');
  nom.className = 'depart-jeu-nom';
  nom.textContent = game.tab;
  b.appendChild(nom);

  b.addEventListener('click', function(){
    departJeuChoisi = game.key;
    montrerEtapeMode();
  });
  return b;
}

function montrerEtapeJeu(){
  departEtape.textContent = 'Première question sur deux';
  departTitre.textContent = 'À quoi tu joues en ce moment ?';
  departSous.textContent = 'Ça décide seulement du Pokédex qui s\'ouvrira en '
    + 'premier. Tous les autres restent là, et tu peux en changer quand tu veux.';
  departJeux.hidden = false;
  departModes.hidden = true;
  departRetour.hidden = true;

  if(departJeux.children.length) return;    // déjà construite
  // Du plus récent au plus ancien : c'est au jeu qui vient de sortir qu'on
  // joue, pas à Rouge/Bleu. La liste GAMES est dans l'ordre de sortie.
  //
  // Cobblemon passe en dernier malgré tout : il ferme la liste parce qu'il est
  // le vingt-troisième onglet, et se retrouvait donc en tête d'une liste
  // inversée. Un mod Minecraft n'est pas la réponse la plus probable à « à quoi
  // tu joues », et la première case d'une grille se lit comme une suggestion.
  const ordre = GAMES.slice().reverse();
  const mod = ordre.filter(function(g){ return g.key === 'cobblemon'; });
  ordre.filter(function(g){ return g.key !== 'cobblemon'; })
       .concat(mod)
       .forEach(function(g){ departJeux.appendChild(carteJeuDepart(g)); });

  // Et la sortie honnête : on ne joue pas forcément.
  const aucun = document.createElement('button');
  aucun.type = 'button';
  aucun.className = 'depart-jeu depart-aucun';
  aucun.innerHTML = '<span class="depart-jeu-nom">🏡 Aucun pour l\'instant</span>'
    + '<span class="depart-aucun-note">Je range dans Pokémon HOME</span>';
  aucun.addEventListener('click', function(){
    departJeuChoisi = null;
    montrerEtapeMode();
  });
  departJeux.appendChild(aucun);
}

// ---- Deuxième question : ce qu'on compte ------------------------------------

function carteModeDepart(cle){
  const info = MODES_DEX[cle];
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'depart-mode';

  const titre = document.createElement('span');
  titre.className = 'depart-mode-titre';
  titre.textContent = info.icone + '  ' + info.court;
  b.appendChild(titre);

  const aide = document.createElement('span');
  aide.className = 'depart-mode-aide';
  aide.textContent = info.aide;
  b.appendChild(aide);

  // L'exemple du Bulbizarre, le même que le LISEZMOI : c'est lui qui rend les
  // trois modes évidents en une phrase, et personne ne l'avait jamais lu.
  const exemple = document.createElement('span');
  exemple.className = 'depart-mode-exemple';
  exemple.textContent = {
    capture: 'Tu fais évoluer un Bulbizarre : les trois stades comptent.',
    vu: 'Tu croises un Bulbizarre sans l\'attraper : il compte.',
    living: 'Tu fais évoluer ton Bulbizarre : tu n\'as plus de Bulbizarre.'
  }[cle];
  b.appendChild(exemple);

  b.addEventListener('click', function(){ terminerDepart(cle); });
  return b;
}

function montrerEtapeMode(){
  departEtape.textContent = 'Deuxième question sur deux';
  departTitre.textContent = 'Tu comptes quoi, au juste ?';
  departSous.textContent = 'Trois personnes disent « j\'ai 400 Pokémon » et ne '
    + 'parlent pas de la même chose. Ce choix ne change pas ce que tu coches, '
    + 'mais ce que cocher veut dire — et le vocabulaire de l\'application suit.';
  departJeux.hidden = true;
  departModes.hidden = false;
  departRetour.hidden = false;

  if(departModes.children.length) return;
  ['capture', 'vu', 'living'].forEach(function(cle){
    departModes.appendChild(carteModeDepart(cle));
  });
}

// ---- La fin -----------------------------------------------------------------

async function terminerDepart(mode){
  fermerDepart();

  // Le mode s'écrit sur l'aventure existante plutôt que d'en créer une : le
  // compte en a déjà une, et en ajouter une seconde vide au premier lancement
  // serait exactement le genre de rangement qu'on n'a pas demandé.
  try{
    if(typeof profilCourant !== 'undefined' && profilCourant){
      await invoke('modifier_profil', { id: profilCourant.id, mode: mode });
      profilCourant.mode = mode;
      if(typeof majBoutonProfil === 'function') majBoutonProfil();
      if(typeof updateHome === 'function') updateHome();
    }
  }catch(e){
    // Un mode qui ne s'enregistre pas ne doit pas gâcher une première minute :
    // il se rerègle en deux clics depuis la page Profil.
    console.error('mode du premier lancement :', e);
  }

  // Puis on ouvre le Pokédex demandé, et on dit la seule chose utile à savoir.
  //
  // ON ATTEND QUE LE PÉRIMÈTRE SOIT POSÉ. showPage() rend la main tout de
  // suite, mais applyScope() va chercher le Pokédex du jeu par le réseau ou le
  // cache : lire scopeEntries dans la foulée donnait le total de la collection
  // HOME — « 1 281 à cocher » pour un Pokédex qui en compte 744.
  if(departJeuChoisi && typeof showPage === 'function'){
    const avant = (typeof scopeEntries !== 'undefined') ? scopeEntries.length : 0;
    showPage(departJeuChoisi);
    for(let i = 0; i < 25; i++){
      if(scopeEntries.length !== avant) break;
      await new Promise(function(r){ setTimeout(r, 80); });
    }
  }

  const info = MODES_DEX[mode];
  const jeu = departJeuChoisi && typeof gameByKey !== 'undefined'
    ? gameByKey[departJeuChoisi] : null;
  prevenir({
    eyebrow: 'C\'est parti',
    genre: 'succes',
    titre: jeu ? 'Voilà ' + jeu.title : 'Voilà ta collection',
    resume: [
      { cle: 'ce que tu comptes', valeur: info.court },
      { cle: 'à cocher', valeur: (typeof scopeEntries !== 'undefined')
          ? scopeEntries.length : '—' }
    ],
    note: 'Coche ce que tu as déjà. Pour aller vite : le filtre « Manquants » '
      + 'puis le bouton « Tout coché » de la barre grise en remplissent une '
      + 'sélection entière d\'un coup. Un mot te manque ? Le bouton 📖 en haut '
      + 'ouvre le lexique.',
    libelleAction: 'Compris'
  });
}

function ouvrirDepart(){
  if(!departOverlay) return;
  departJeuChoisi = null;
  montrerEtapeJeu();
  departOverlay.style.display = 'flex';
  setTimeout(function(){ departPasser.focus(); }, 10);
}

function fermerDepart(){
  if(!departOverlay) return;
  departOverlay.style.display = 'none';
  marquerDepartFait(playerName || '');
}

/**
 * Appelé par demarrerProfils(), une fois les aventures connues.
 *
 * On attend un temps avant d'ouvrir : la grille se dessine, et une fenêtre qui
 * s'ouvre sur un écran encore vide donne l'impression que rien ne marche.
 */
function peutEtrePremierLancement(){
  if(!estPremierLancement()) return;
  setTimeout(ouvrirDepart, 600);
}

if(departPasser) departPasser.addEventListener('click', fermerDepart);
if(departRetour) departRetour.addEventListener('click', montrerEtapeJeu);
// Ni Échap ni le clic à côté ne referment : deux questions valent la peine
// d'être lues, et « Passer » est là, en toutes lettres, pour qui n'en veut pas.
