// La fiche de capture : ce que TON exemplaire a de particulier.
// Script classique (pas de module ES), chargé après grille.js — il complète la
// fenêtre d'aperçu et lit caughtSet, currentTab et previewEntry.
//
// POURQUOI, ET POURQUOI ICI. Un collectionneur ne possède pas « un Ronflex ».
// Il possède un Ronflex en Honor Ball, attrapé dans Cristal en 2001, avec son
// ruban. La progression ne gardait que le nom et le chromatique : toute la
// valeur sentimentale d'une collection de vingt ans tombait dans une case à
// cocher. Le produit s'appelle Archive ; il ne gardait rien.
//
// REPLIÉE PAR DÉFAUT, ET ABSENTE TANT QUE L'ENTRÉE N'EST PAS COCHÉE. C'est la
// condition pour que ça n'abîme rien : quelqu'un qui découvre l'application ne
// doit pas se voir demander une Ball et une nature au troisième clic. On ne
// remplit la fiche que d'un Pokémon qu'on a déjà.
//
// UNE COLONNE DE PLUS, ZÉRO TABLE DE PLUS. Les détails voyagent dans la
// sauvegarde du dex, comme les chasses et les objectifs : l'API les range
// verbatim, compterEspeces() les ignore, et pokearchive-1 les emporte
// gratuitement.

// Les Poké Balls, par familles. La liste est écrite à la main : elle ne se
// relève nulle part, et ne bouge qu'à la sortie d'une génération.
const BALLS = [
  '', 'Poké Ball', 'Super Ball', 'Hyper Ball', 'Master Ball', 'Safari Ball',
  'Filet Ball', 'Scuba Ball', 'Chrono Ball', 'Répète Ball', 'Bis Ball',
  'Sombre Ball', 'Faiblo Ball', 'Luxe Ball', 'Honor Ball', 'Soin Ball',
  'Rapide Ball', 'Appât Ball', 'Speed Ball', 'Copain Ball', 'Love Ball',
  'Lune Ball', 'Niveau Ball', 'Piège Ball', 'Poké Ball Ancienne',
  'Ultra Ball Ancienne', 'Rêve Ball', 'Beast Ball', 'Origin Ball',
  'Strange Ball', 'Fête Ball'
];

// Les rubans les plus courants. Un champ libre les accompagne : la liste
// exhaustive fait plus de cent entrées et personne ne la lirait.
const RUBANS = [
  '', 'Ruban Effort', 'Ruban Meilleur Ami', 'Ruban Champion de Kanto',
  'Ruban Champion de Hoenn', 'Ruban Champion de Sinnoh', 'Ruban Champion d\'Unys',
  'Ruban Champion de Kalos', 'Ruban Champion d\'Alola', 'Ruban Champion de Galar',
  'Ruban Champion de Paldea', 'Ruban Souvenir', 'Ruban Alpha', 'Ruban Royal',
  'Ruban National', 'Marque (Tera, Rare, etc.)'
];

// ---- Où il est en ce moment -------------------------------------------------
//
// Trois endroits, et un seul clic. « Où l'obtenir » dit où le Pokémon se
// trouve dans le monde ; « comment le faire remonter » dit par quel chemin il
// rejoint HOME. Il manquait la seule chose que l'application ne pouvait pas
// deviner : OÙ IL EST DÉJÀ. Sans elle, le chemin part toujours du jeu, même
// quand le Pokémon dort dans la Banque depuis 2019.
//
// Un groupe de trois boutons plutôt qu'un menu : c'est le champ qu'on met à
// jour le plus souvent — à chaque transfert — et un menu déroulant demande
// trois gestes là où un bouton en demande un.
const EMPLACEMENTS = [
  { cle: 'jeu',    icone: '🎮', nom: 'Dans le jeu',
    aide: 'Il est encore sur la cartouche ou la console d\'origine.' },
  { cle: 'banque', icone: '🏦', nom: 'Banque Pokémon',
    aide: 'Déposé dans la Banque Pokémon. Le service s\'arrête : va voir '
        + 'Outils → Transferts pour le temps qu\'il reste.' },
  { cle: 'home',   icone: '🏡', nom: 'Pokémon HOME',
    aide: 'Arrivé à destination — il ne bougera plus.' }
];

const captureOuvrir = document.getElementById('captureOuvrir');
const captureBloc = document.getElementById('captureBloc');
const captureEmplacement = document.getElementById('captureEmplacement');

// dexKey -> nom -> { ball, nature, surnom, origine, date, ruban, ot, note }
let detailsCapture = {};

/** La clé d'une entrée dans le Pokédex ouvert. */
function seauCapture(){
  return currentTab === 'home' ? 'national' : currentTab;
}

function detailDe(cleDex, nom){
  return (detailsCapture[cleDex] && detailsCapture[cleDex][nom]) || null;
}

function poserDetail(cleDex, nom, champ, valeur){
  if(!exigeCompte('noter les details d’une capture')) return;
  const propre = String(valeur || '').slice(0, 60).trim();
  if(!detailsCapture[cleDex]) detailsCapture[cleDex] = {};
  const d = detailsCapture[cleDex][nom] || {};
  if(propre) d[champ] = propre;
  else delete d[champ];
  // Une fiche vidée de tout disparaît : garder des objets vides ferait grossir
  // la sauvegarde d'autant d'entrées qu'on aurait seulement ouvertes.
  if(Object.keys(d).length) detailsCapture[cleDex][nom] = d;
  else delete detailsCapture[cleDex][nom];
  if(!Object.keys(detailsCapture[cleDex]).length) delete detailsCapture[cleDex];
  queueSave();
}

/** Combien de champs sont renseignés — sert au libellé de la poignée. */
function remplissageDetail(d){
  return d ? Object.keys(d).length : 0;
}

// ---- Les champs -------------------------------------------------------------

const CHAMPS_CAPTURE = [
  { cle: 'ball',    label: 'Ball',              type: 'liste', options: BALLS },
  { cle: 'nature',  label: 'Nature',            type: 'nature' },
  { cle: 'surnom',  label: 'Surnom',            type: 'texte', taille: 12,
    placeholder: 'Le nom que tu lui as donné' },
  { cle: 'origine', label: 'Jeu d\'origine',    type: 'jeu' },
  { cle: 'date',    label: 'Date de capture',   type: 'date' },
  { cle: 'ruban',   label: 'Ruban ou marque',   type: 'liste', options: RUBANS },
  { cle: 'ot',      label: 'Dresseur d\'origine', type: 'texte', taille: 12,
    placeholder: 'Toi, ou celui qui te l\'a échangé' },
  { cle: 'note',    label: 'Note',              type: 'texte', taille: 60,
    placeholder: 'Ce que tu veux en garder' }
];

function champCapture(def, cleDex, nom, d){
  const bloc = document.createElement('label');
  bloc.className = 'capture-champ' + (def.cle === 'note' ? ' large' : '');

  const titre = document.createElement('span');
  titre.className = 'capture-label';
  titre.textContent = def.label;
  bloc.appendChild(titre);

  let saisie;
  if(def.type === 'liste' || def.type === 'nature' || def.type === 'jeu'){
    saisie = document.createElement('select');
    let valeurs;
    if(def.type === 'nature'){
      valeurs = [''].concat((typeof NATURES !== 'undefined' ? NATURES : [])
        .map(function(n){ return n.nom; }));
    } else if(def.type === 'jeu'){
      valeurs = [''].concat(GAMES.map(function(g){ return g.title; }));
    } else {
      valeurs = def.options;
    }
    valeurs.forEach(function(v){
      const o = document.createElement('option');
      o.value = v;
      o.textContent = v || '—';
      saisie.appendChild(o);
    });
    saisie.value = (d && d[def.cle]) || '';
    // Une valeur venue d'un import ou d'une version plus ancienne peut ne pas
    // figurer dans la liste : on l'ajoute plutôt que de la perdre au premier
    // affichage, ce qui reviendrait à effacer sans le dire.
    if(saisie.value !== ((d && d[def.cle]) || '')){
      const o = document.createElement('option');
      o.value = d[def.cle];
      o.textContent = d[def.cle];
      saisie.appendChild(o);
      saisie.value = d[def.cle];
    }
  } else if(def.type === 'date'){
    saisie = document.createElement('input');
    saisie.type = 'date';
    saisie.value = (d && d.date) || '';
  } else {
    saisie = document.createElement('input');
    saisie.type = 'text';
    saisie.maxLength = def.taille || 40;
    saisie.placeholder = def.placeholder || '';
    saisie.value = (d && d[def.cle]) || '';
  }

  saisie.className = 'capture-saisie';
  saisie.setAttribute('aria-label', def.label + ' — ' + nomAffiche(previewEntry));
  // « change » et non « input » : on n'écrit pas une sauvegarde à chaque
  // caractère frappé, et queueSave attend déjà 400 ms.
  saisie.addEventListener('change', function(){
    poserDetail(cleDex, nom, def.cle, saisie.value);
    majPoigneeCapture();
  });
  bloc.appendChild(saisie);
  return bloc;
}

// ---- Le bloc ----------------------------------------------------------------

let captureOuverte = false;

/**
 * Les trois boutons « où il est ».
 *
 * Recliquer sur celui qui est actif l'efface : c'est le seul moyen de revenir
 * à « je ne sais pas », et un quatrième bouton « aucun » aurait encombré une
 * rangée qu'on veut lire d'un coup d'œil.
 */
function dessinerEmplacement(){
  if(!captureEmplacement || !previewEntry) return;
  const cleDex = seauCapture();
  const nom = previewEntry.name;
  const d = detailDe(cleDex, nom);
  const actuel = (d && d.emplacement) || '';

  captureEmplacement.innerHTML = '';

  const titre = document.createElement('span');
  titre.className = 'capture-ou-titre';
  titre.textContent = '📍 Où il est';
  captureEmplacement.appendChild(titre);

  EMPLACEMENTS.forEach(function(e){
    const b = document.createElement('button');
    b.type = 'button';
    // La Banque se colore en avertissement — elle s'arrête, et un Pokémon qui
    // y dort demande une action. Une fois la date passée, c'est une impasse :
    // etatRoute() décide, pour que la fiche et la page des transferts ne
    // disent jamais deux choses différentes.
    const alerte = e.cle === 'banque' && actuel === 'banque'
      && typeof banqueFermee === 'function';
    b.className = 'capture-ou-btn' + (actuel === e.cle ? ' actif' : '')
      + (alerte ? (banqueFermee() ? ' bloque' : ' sursis') : '');
    b.textContent = e.icone + ' ' + e.nom;
    b.setAttribute('aria-pressed', String(actuel === e.cle));
    b.title = e.aide;
    b.addEventListener('click', function(){
      poserDetail(cleDex, nom, 'emplacement', actuel === e.cle ? '' : e.cle);
      // majPoigneeCapture() redessine la rangée : l'appeler seule suffit, et
      // appeler les deux redessinerait deux fois pour rien.
      majPoigneeCapture();
      if(captureOuverte) dessinerCapture();
    });
    captureEmplacement.appendChild(b);
  });
}

function majPoigneeCapture(){
  if(!captureOuvrir || !previewEntry) return;
  const cleDex = seauCapture();
  const possede = caughtSet.has(previewEntry.name) || shinySet.has(previewEntry.name);
  // Tant que l'entrée n'est pas cochée, la poignée n'existe pas : on ne remplit
  // pas la fiche d'un Pokémon qu'on n'a pas.
  captureOuvrir.hidden = !possede;
  if(captureEmplacement) captureEmplacement.hidden = !possede;
  if(!possede){
    captureBloc.hidden = true;
    captureOuverte = false;
    return;
  }
  dessinerEmplacement();
  const n = remplissageDetail(detailDe(cleDex, previewEntry.name));
  captureOuvrir.textContent = '🎴 Fiche de capture'
    + (n ? '  ·  ' + n + ' champ' + (n > 1 ? 's' : '') : '');
  captureOuvrir.setAttribute('aria-expanded', String(captureOuverte));
  captureOuvrir.title = 'Ball, nature, surnom, ruban… ce que cet exemplaire-là a '
    + 'de particulier. Enregistré dans ' + currentDexLabel() + '.';
}

function dessinerCapture(){
  if(!captureBloc || !previewEntry) return;
  const cleDex = seauCapture();
  const nom = previewEntry.name;
  const d = detailDe(cleDex, nom);

  captureBloc.innerHTML = '';

  const note = document.createElement('p');
  note.className = 'capture-note';
  note.textContent = 'Cet exemplaire-là, dans ' + currentDexLabel()
    + '. Tout est facultatif, et rien n\'entre dans les compteurs.';
  captureBloc.appendChild(note);

  const grille = document.createElement('div');
  grille.className = 'capture-grille';
  CHAMPS_CAPTURE.forEach(function(def){
    grille.appendChild(champCapture(def, cleDex, nom, d));
  });
  captureBloc.appendChild(grille);

  if(d && Object.keys(d).length){
    const vider = document.createElement('button');
    vider.type = 'button';
    vider.className = 'toggle-btn capture-vider';
    vider.textContent = 'Effacer la fiche';
    vider.addEventListener('click', async function(){
      const ok = await demanderConfirmation({
        eyebrow: 'Fiche de capture',
        titre: 'Effacer la fiche de ' + nomAffiche(previewEntry) + ' ?',
        danger: true,
        pertes: Object.keys(d).map(function(c){
          const def = CHAMPS_CAPTURE.find(function(x){ return x.cle === c; });
          return (def ? def.label : c) + ' : ' + d[c];
        }),
        note: 'Le Pokémon reste coché. Seuls ces détails partent.',
        libelleAction: 'Effacer'
      });
      if(!ok) return;
      if(detailsCapture[cleDex]) delete detailsCapture[cleDex][nom];
      if(detailsCapture[cleDex] && !Object.keys(detailsCapture[cleDex]).length){
        delete detailsCapture[cleDex];
      }
      queueSave();
      dessinerCapture();
      majPoigneeCapture();
    });
    captureBloc.appendChild(vider);
  }
}

if(captureOuvrir){
  captureOuvrir.addEventListener('click', function(){
    captureOuverte = !captureOuverte;
    captureBloc.hidden = !captureOuverte;
    if(captureOuverte) dessinerCapture();
    majPoigneeCapture();
  });
}

/**
 * Appelé à l'ouverture d'une fiche, et à chaque fois qu'on coche depuis elle.
 *
 * Le bloc se referme d'un Pokémon à l'autre : laisser ouverte la fiche du
 * précédent donnerait l'impression que les champs appartiennent au nouveau.
 */
function reinitCapture(){
  captureOuverte = false;
  if(captureBloc){ captureBloc.hidden = true; captureBloc.innerHTML = ''; }
  majPoigneeCapture();
}
