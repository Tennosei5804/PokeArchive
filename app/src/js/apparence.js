// Les couleurs, choisies par la personne qui regarde.
//
// Script classique, chargé APRÈS app.js : il lit les valeurs par défaut avec
// getComputedStyle, et celles-ci dépendent de l'attribut data-theme qu'app.js
// pose au chargement.
//
// CINQ CHOIX, ET NEUF VARIABLES. La feuille de style en compte plus que cinq,
// mais les autres se déduisent : un rouge de cadran seul, sans ses deux teintes
// sombres, donnerait un boîtier plat, et une écriture seule, sans ses gris,
// rendrait les notes illisibles. On les calcule plutôt que de les demander —
// cinq questions valent mieux que neuf, et les réponses resteraient cohérentes
// dans les deux cas.
//
// LES RAPPORTS SONT MESURÉS, PAS INVENTÉS. Ils viennent de la palette déjà en
// place, relevée sur les deux thèmes :
//
//   --dex-red-deep      luminosité HSL du rouge × 0,72
//                       clair  58 % → 42 % (0,72)   sombre  36 % → 25,5 % (0,71)
//   --dex-red-darker    luminosité HSL du rouge × 0,45
//                       clair  58 % → 28 % (0,48)   sombre  36 % → 15,5 % (0,43)
//   --ink-soft          l'encre mélangée au fond à 35 %
//   --ink-faint         l'encre mélangée au fond à 55 %
//   --screen-edge       le fond assombri de 7 %
//
// Un facteur multiplicatif et non une soustraction : d'un thème à l'autre les
// écarts absolus divergent (−16 et −10,5 points de luminosité) là où les
// rapports se rejoignent. C'est ce qui fait tenir un rouge clair comme un rouge
// sombre.
//
// CE QUE LES FORMULES NE FONT PAS. Rejouées sur la palette livrée, elles la
// retrouvent de près sans la retrouver exactement — écart maximum par canal,
// sur 255 :
//
//                        sombre   clair
//   --screen-edge           3       3
//   --dex-red-deep          4      16
//   --dex-red-darker        3      11
//   --ink-soft             11      17
//   --ink-faint             9      26
//
// L'écart va toujours dans le même sens : les gris de la feuille sont plus
// bleus qu'un mélange droit, et son rouge sombre plus désaturé qu'une simple
// baisse de luminosité. Ce sont des choix de graphiste, pas une règle qu'on
// puisse retrouver par le calcul. Pour une couleur choisie par quelqu'un, le
// mélange neutre est de toute façon le comportement prévisible — et c'est
// pourquoi une famille n'est recalculée que si on y a touché : voir
// APPARENCE_FAMILLES.
//
// LE CHOIX VIT PAR THÈME. Une encre presque blanche choisie dans le sombre
// deviendrait invisible en clair. Les deux jeux de couleurs sont donc rangés
// séparément, et changer de thème rappelle le bon.
//
// Comme le thème et la langue, tout cela vit dans localStorage : c'est une
// préférence d'appareil, pas une donnée de progression, et cela n'a rien à
// faire dans l'export du compte.

const APPARENCE_KEY = 'pokearchive-couleurs';

// Ce qu'on demande, dans l'ordre où la page le présente.
const APPARENCE_CIBLES = [
  { cle:'fond',     variable:'--screen',      nom:'Le fond',
    note:'Le grand aplat derrière tout le reste.' },
  { cle:'rouge',    variable:'--dex-red',     nom:'Le cadran rouge',
    note:'Le boîtier du Pokédex, et ce qui se surligne au survol.' },
  { cle:'ecriture', variable:'--ink',         nom:"L'écriture",
    note:'Les titres et le texte. Les gris des notes en découlent.' },
  { cle:'cartes',   variable:'--card',        nom:'Le fond des cartes',
    note:'Les vignettes, les panneaux, les fiches.' },
  { cle:'bordures', variable:'--card-border', nom:'Les bordures',
    note:'Le trait autour des cartes de jeu et des blocs.' },
];

// Cinq propositions par cible, en plus de la couleur d'origine. Celle-ci n'est
// PAS écrite ici : elle est lue dans la feuille au démarrage, sinon la même
// valeur vivrait à deux endroits et l'un des deux finirait périmé.
const APPARENCE_SUGGESTIONS = {
  dark: {
    fond:     ['#101116', '#14201c', '#1c1620', '#201a14', '#141b26'],
    rouge:    ['#2b5b8e', '#2b7a54', '#6b3d8e', '#a0662a', '#4a4f5c'],
    ecriture: ['#ffffff', '#d9d2c4', '#cfe3f5', '#d7f0d9', '#f0dcc8'],
    cartes:   ['#1a1d25', '#2b2f3b', '#252030', '#1f2a26', '#2a241c'],
    bordures: ['#282b36', '#414658', '#4a3f5a', '#3f4a3f', '#5a4a3f'],
  },
  light: {
    fond:     ['#ffffff', '#f0f4f8', '#f4f0e6', '#eef4ee', '#f5eef2'],
    rouge:    ['#3a7aee', '#2f9e63', '#8e4ad6', '#f2a900', '#5a6172'],
    ecriture: ['#000000', '#2b2419', '#16283a', '#1c2e22', '#301c2a'],
    cartes:   ['#fbfaf6', '#f7f9fc', '#fdf8ee', '#f6faf6', '#fdf6fa'],
    bordures: ['#d8d6e2', '#e0e6ee', '#eae2d2', '#dfe9df', '#ece0e8'],
  },
};

// Les valeurs d'origine du thème courant, lues une fois, feuille de style
// nettoyée de nos réglages. Remplies par relireDefauts().
let apparenceDefauts = {};

// ---- Couleurs : le strict nécessaire ---------------------------------------

function versRvb(hex){
  const h = String(hex).trim().replace('#', '');
  const plein = h.length === 3 ? h[0]+h[0]+h[1]+h[1]+h[2]+h[2] : h;
  const n = parseInt(plein, 16);
  return isNaN(n) || plein.length !== 6
    ? null
    : { r:(n >> 16) & 255, v:(n >> 8) & 255, b:n & 255 };
}

function versHex(c){
  const d = function(x){
    return Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0');
  };
  return '#' + d(c.r) + d(c.v) + d(c.b);
}

/** a et b mélangés : t = 0 rend a, t = 1 rend b. */
function melanger(a, b, t){
  const x = versRvb(a), y = versRvb(b);
  if(!x || !y) return a;
  return versHex({
    r: x.r + (y.r - x.r) * t,
    v: x.v + (y.v - x.v) * t,
    b: x.b + (y.b - x.b) * t,
  });
}

/** La même couleur, sa luminosité HSL multipliée. Garde la teinte. */
function luminositeFois(hex, facteur){
  const c = versRvb(hex);
  if(!c) return hex;
  const r = c.r/255, v = c.v/255, b = c.b/255;
  const max = Math.max(r, v, b), min = Math.min(r, v, b);
  const l = (max + min) / 2;
  const d = max - min;
  let h = 0, s = 0;
  if(d !== 0){
    s = d / (1 - Math.abs(2*l - 1));
    if(max === r)      h = 60 * (((v - b) / d) % 6);
    else if(max === v) h = 60 * (((b - r) / d) + 2);
    else               h = 60 * (((r - v) / d) + 4);
  }
  const l2 = Math.max(0, Math.min(1, l * facteur));
  const c2 = (1 - Math.abs(2*l2 - 1)) * s;
  const x2 = c2 * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l2 - c2/2;
  let rvb;
  if(h < 60)       rvb = [c2, x2, 0];
  else if(h < 120) rvb = [x2, c2, 0];
  else if(h < 180) rvb = [0, c2, x2];
  else if(h < 240) rvb = [0, x2, c2];
  else if(h < 300) rvb = [x2, 0, c2];
  else             rvb = [c2, 0, x2];
  return versHex({ r:(rvb[0]+m)*255, v:(rvb[1]+m)*255, b:(rvb[2]+m)*255 });
}

/** Luminance relative, au sens des règles d'accessibilité. */
function luminance(hex){
  const c = versRvb(hex);
  if(!c) return 0;
  const lin = function(v){
    const x = v / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126*lin(c.r) + 0.7152*lin(c.v) + 0.0722*lin(c.b);
}

/** Le rapport de contraste entre deux couleurs : de 1 à 21. */
function contraste(a, b){
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

// ---- Appliquer --------------------------------------------------------------

function themeCourant(){
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

function cleDuTheme(){
  return APPARENCE_KEY + '-' + themeCourant();
}

function couleursRangees(){
  let brut = null;
  try{ brut = localStorage.getItem(cleDuTheme()); }catch(e){ /* stockage refusé */ }
  if(!brut) return {};
  try{
    const o = JSON.parse(brut);
    return (o && typeof o === 'object') ? o : {};
  }catch(e){ return {}; }
}

function rangerCouleurs(o){
  try{
    if(Object.keys(o).length) localStorage.setItem(cleDuTheme(), JSON.stringify(o));
    else localStorage.removeItem(cleDuTheme());
  }catch(e){ /* stockage refusé */ }
}

/**
 * Ce qu'on pose, par famille.
 *
 * Une famille n'est écrite QUE si l'une de ses cibles a été choisie. La raison
 * tient à la précision des formules : mesurées contre la palette livrée, elles
 * la retrouvent de près sans la retrouver exactement — au pire 26 sur 255 pour
 * --ink-faint en clair, les gris de la feuille étant plus bleus qu'un mélange
 * droit. Poser les neuf valeurs dès qu'on touche à une seule décalerait donc
 * légèrement les huit autres, pour rien. Famille par famille, ce qu'on ne
 * touche pas garde exactement sa couleur d'origine.
 *
 * L'encre dépend du fond, et pas seulement d'elle-même : ses deux gris sont des
 * mélanges vers le fond. Changer le fond seul doit les recalculer, sans quoi ils
 * resteraient accordés à l'ancien.
 */
const APPARENCE_FAMILLES = [
  { declencheurs:['fond'],            proprietes:['--screen', '--screen-edge'] },
  { declencheurs:['rouge'],           proprietes:['--dex-red', '--dex-red-deep', '--dex-red-darker'] },
  { declencheurs:['ecriture','fond'], proprietes:['--ink', '--ink-soft', '--ink-faint'] },
  { declencheurs:['cartes'],          proprietes:['--card'] },
  { declencheurs:['bordures'],        proprietes:['--card-border'] },
];

/** Toutes les propriétés que nous posons, y compris celles qu'on ne demande pas. */
const APPARENCE_POSEES = APPARENCE_FAMILLES.reduce(function(a, f){
  return a.concat(f.proprietes);
}, []);

/** Retire nos réglages, sans rien relire. */
function effacerNosProprietes(){
  const racine = document.documentElement;
  APPARENCE_POSEES.forEach(function(p){ racine.style.removeProperty(p); });
}

// Le thème pour lequel apparenceDefauts a été rempli. Relire coûte un
// getComputedStyle, donc un calcul de mise en page forcé — supportable une fois,
// pas soixante fois par seconde pendant qu'on tire le sélecteur.
let apparenceDefautsTheme = null;

/**
 * Relit la feuille de style pour connaître les couleurs d'origine du thème.
 *
 * Nos réglages sont retirés d'abord : sans cela on relirait ce qu'on vient
 * d'écrire, et le premier changement de thème figerait les couleurs du
 * précédent pour de bon.
 */
function relireDefauts(){
  if(apparenceDefautsTheme === themeCourant()) return;
  effacerNosProprietes();
  const calcule = getComputedStyle(document.documentElement);
  apparenceDefauts = {};
  APPARENCE_POSEES.forEach(function(p){
    apparenceDefauts[p] = (calcule.getPropertyValue(p) || '').trim();
  });
  apparenceDefautsTheme = themeCourant();
}

/** Les neuf valeurs, à partir des cinq choisies. */
function deriverCouleurs(choix){
  const v = function(cible){
    const c = APPARENCE_CIBLES.find(function(x){ return x.cle === cible; });
    return choix[cible] || apparenceDefauts[c.variable];
  };
  const fond = v('fond'), rouge = v('rouge'), encre = v('ecriture');
  return {
    '--screen':          fond,
    '--screen-edge':     melanger(fond, '#000000', 0.07),
    '--dex-red':         rouge,
    '--dex-red-deep':    luminositeFois(rouge, 0.72),
    '--dex-red-darker':  luminositeFois(rouge, 0.45),
    '--ink':             encre,
    '--ink-soft':        melanger(encre, fond, 0.35),
    '--ink-faint':       melanger(encre, fond, 0.55),
    '--card':            v('cartes'),
    '--card-border':     v('bordures'),
  };
}

/**
 * Pose les couleurs, ou les retire si rien n'est choisi.
 *
 * En style en ligne sur <html> : c'est le seul endroit qui l'emporte à la fois
 * sur :root et sur html[data-theme="dark"], sans avoir à compter les points de
 * spécificité ni à semer des !important.
 *
 * « apercu » est un choix de plus, posé par-dessus les réglages rangés mais pas
 * enregistré : c'est ce qui fait que l'application se repeint pendant qu'on
 * tire le sélecteur, et qu'annuler ne laisse aucune trace.
 */
function appliquerApparence(apercu){
  relireDefauts();
  const choix = Object.assign({}, couleursRangees(), apercu || {});
  // Toujours repartir des couleurs d'origine : sans cet effacement, retirer un
  // réglage laisserait sa valeur en place, plus rien ne l'écrasant.
  effacerNosProprietes();
  if(!Object.keys(choix).length) return;      // rien de choisi : le thème suffit
  const valeurs = deriverCouleurs(choix);
  const racine = document.documentElement;
  APPARENCE_FAMILLES.forEach(function(f){
    const touchee = f.declencheurs.some(function(d){ return choix[d]; });
    if(!touchee) return;
    f.proprietes.forEach(function(p){ racine.style.setProperty(p, valeurs[p]); });
  });
}

/**
 * Contre quoi la couleur choisie va se retrouver.
 *
 * Sert la ligne de contraste du sélecteur. Les valeurs sont lues en direct
 * plutôt que déduites : c'est bien l'état de l'écran qui intéresse.
 *
 * LA PAIRE COMPTE PLUS QUE LE NOMBRE. Le premier jet comparait chaque couleur
 * au fond des cartes, ce qui donnait des verdicts faux sur ses propres valeurs
 * d'origine — relevé sur le thème sombre :
 *
 *   rouge du cadran contre la carte     1,82   « illisible »
 *   bordure contre la carte             1,29   « illisible »
 *
 * Or le rouge ne se lit jamais sur une carte : partout où il sert de fond, la
 * feuille écrit color:#fff par-dessus — dix endroits, vérifiés. La bonne paire
 * est donc le blanc sur le rouge, et elle vaut 8,3. Quant à la bordure, c'est
 * un trait et non du texte : la régle des 4,5 ne la concerne pas, et son 1,29
 * est un choix délibéré de trait discret. On ne dit rien plutôt que de dire
 * faux — un indicateur qui recale les valeurs livrées n'apprend qu'à s'ignorer.
 */
function surfacesDe(cle){
  const lu = function(p){
    return getComputedStyle(document.documentElement).getPropertyValue(p).trim();
  };
  if(cle === 'ecriture') return [
    { couleur: lu('--card'),   nom: 'sur les cartes' },
    { couleur: lu('--screen'), nom: 'sur le fond' },
  ];
  // Un fond se juge contre ce qu'on écrit dessus.
  if(cle === 'fond' || cle === 'cartes') return [{ couleur: lu('--ink'), nom: 'avec l’écriture' }];
  if(cle === 'rouge') return [{ couleur: '#ffffff', nom: 'sous le texte blanc' }];
  return [];                      // bordures : aucun verdict n'aurait de sens
}

// ---- La page ----------------------------------------------------------------

function pastille(couleur, titre, actuelle, auChoix){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'pastille' + (couleur.toLowerCase() === String(actuelle).toLowerCase() ? ' choisie' : '');
  b.style.background = couleur;
  b.title = titre;
  b.setAttribute('aria-label', titre);
  b.addEventListener('click', function(){ auChoix(couleur); });
  return b;
}

function ligneApparence(cible){
  const choix = couleursRangees();
  const defaut = apparenceDefauts[cible.variable];
  const actuelle = choix[cible.cle] || defaut;

  const ligne = document.createElement('div');
  ligne.className = 'apparence-ligne';

  const tete = document.createElement('div');
  tete.className = 'apparence-tete';
  const nom = document.createElement('span');
  nom.className = 'apparence-nom';
  nom.textContent = cible.nom;
  const val = document.createElement('span');
  val.className = 'apparence-valeur';
  val.textContent = actuelle;
  tete.appendChild(nom);
  tete.appendChild(val);

  const note = document.createElement('p');
  note.className = 'apparence-note';
  note.textContent = cible.note;

  const rangee = document.createElement('div');
  rangee.className = 'apparence-pastilles';

  const poser = function(couleur){
    const c = couleursRangees();
    if(String(couleur).toLowerCase() === String(defaut).toLowerCase()) delete c[cible.cle];
    else c[cible.cle] = couleur;
    rangerCouleurs(c);
    appliquerApparence();
    dessinerApparence();
  };

  rangee.appendChild(pastille(defaut, 'Couleur d’origine', actuelle, poser));
  (APPARENCE_SUGGESTIONS[themeCourant()][cible.cle] || []).forEach(function(c){
    rangee.appendChild(pastille(c, c, actuelle, poser));
  });

  // Le choix libre, qui ouvre notre sélecteur — voir selecteur-couleur.js.
  // L'input type="color" du navigateur faisait le travail, mais il ouvre la
  // boîte du système : elle s'affiche dans son propre thème, elle ne sait pas à
  // quoi la couleur sert, et elle ne dit pas si le résultat restera lisible.
  const libre = document.createElement('button');
  libre.type = 'button';
  libre.className = 'pastille libre';
  libre.title = 'Choisir une autre couleur';
  libre.setAttribute('aria-label', 'Autre couleur pour ' + cible.nom.toLowerCase());
  libre.addEventListener('click', function(){
    const rvb = versRvb(actuelle);
    ouvrirSelecteur({
      ancre: libre,
      couleur: rvb ? versHex(rvb) : '#000000',
      surfaces: surfacesDe(cible.cle),
      defaut: defaut,
      // Le panneau garde les couleurs d'origine du thème pendant qu'on
      // choisit : sans quoi il prend la teinte qu'il sert à juger.
      palette: apparenceDefauts,
      // Pendant qu'on tire : l'application se repeint, mais rien n'est rangé.
      auChangement: function(hex){ appliquerApparence({ [cible.cle]: hex }); },
      // À la fermeture seulement. Annuler rend la couleur de départ, et poser()
      // la reconnaît comme celle d'origine s'il s'agit d'elle — le réglage
      // disparaît alors au lieu d'être enregistré à l'identique.
      aLaFin: function(hex){ poser(hex); },
    });
  });
  rangee.appendChild(libre);

  ligne.appendChild(tete);
  ligne.appendChild(note);
  ligne.appendChild(rangee);
  return ligne;
}

/**
 * L'avertissement de lisibilité.
 *
 * On ne bloque rien : c'est le choix de la personne, et un réglage qui refuse
 * ce qu'on lui demande est plus agaçant qu'utile. Mais une encre trop proche de
 * son fond ne se voit pas — et si elle disparaît complètement, retrouver le
 * bouton pour revenir en arrière devient difficile. Autant le dire avant.
 *
 * 4,5 est le seuil des règles d'accessibilité pour du texte courant.
 */
function avertissementLisibilite(){
  const choix = couleursRangees();
  if(!Object.keys(choix).length) return null;
  const v = deriverCouleurs(choix);
  const paires = [
    [contraste(v['--ink'], v['--card']),   'sur les cartes'],
    [contraste(v['--ink'], v['--screen']), 'sur le fond'],
  ];
  const faibles = paires.filter(function(p){ return p[0] < 4.5; });
  if(!faibles.length) return null;

  const p = document.createElement('p');
  p.className = 'apparence-alerte';
  p.textContent = 'L’écriture se lit mal ' + faibles.map(function(f){ return f[1]; }).join(' et ')
    + ' : contraste de ' + faibles.map(function(f){ return f[0].toFixed(1).replace('.', ','); }).join(' et ')
    + ', pour 4,5 recommandé.';
  return p;
}

function dessinerApparence(){
  if(!apparenceListe) return;
  apparenceListe.innerHTML = '';
  APPARENCE_CIBLES.forEach(function(c){
    apparenceListe.appendChild(ligneApparence(c));
  });
  const alerte = avertissementLisibilite();
  if(alerte) apparenceListe.appendChild(alerte);
  if(apparenceRaz) apparenceRaz.disabled = !Object.keys(couleursRangees()).length;
}

function razApparence(){
  rangerCouleurs({});
  appliquerApparence();
  dessinerApparence();
}

// ---- Branchements -----------------------------------------------------------

// Au chargement du script, avant que la page ne soit dessinée : les couleurs
// sont posées tout de suite, comme le thème l'est dans app.js.
appliquerApparence();

document.addEventListener('DOMContentLoaded', function(){
  if(apparenceRaz) apparenceRaz.addEventListener('click', razApparence);

  // Changer de thème change les couleurs d'origine ET le jeu de réglages à
  // rappeler. On enveloppe applyTheme plutôt que d'ajouter un appel dans le
  // gestionnaire du bouton : c'est le procédé de presence.js, et il tient si
  // quelqu'un appelle applyTheme depuis ailleurs un jour.
  if(typeof applyTheme === 'function'){
    const original = applyTheme;
    window.applyTheme = function(){
      const r = original.apply(this, arguments);
      appliquerApparence();
      dessinerApparence();
      return r;
    };
  }
});

/** Appelé par chargerProfil() : la page vient de s'ouvrir. */
function chargerApparence(){
  dessinerApparence();
}
