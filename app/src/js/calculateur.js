// Le calculateur de taux chromatique.
//
// Script classique, chargé APRÈS chasse.js : il ne porte aucune donnée propre
// et se sert de son modèle — METHODES, BONUS, tauxDeChasse, probabiliteCumulee.
// Dupliquer les taux ici serait la garantie qu'ils divergent le jour où l'un
// des deux est corrigé.
//
// POURQUOI UN ÉCRAN À PART, PUISQUE LA CRÉATION DE CHASSE AFFICHE DÉJÀ LE TAUX.
// Parce qu'on ne calcule pas au même moment. La fenêtre de création demande
// d'abord QUELLE ESPÈCE, et n'a de sens qu'une fois qu'on a décidé de chasser.
// La question « est-ce que ça vaut le coup de finir le Pokédex avant de me
// lancer ? » se pose AVANT, et n'a pas d'espèce. Il fallait pouvoir comparer
// deux situations sans rien créer.
//
// CE QU'IL AJOUTE, ET QUI N'EXISTAIT NULLE PART :
//
//   la décomposition  « 1 + 25 + 3 + 3 = 32 tirages, 4096 ÷ 32 = 1/128 ». Un
//                     taux nu ne s'explique pas ; celui-là se vérifie.
//   les seuils        combien de rencontres pour 50, 90, 99 %. C'est le chiffre
//                     qu'on cherche vraiment — « combien de temps ça va me
//                     prendre » — et personne ne le calcule de tête.

const calcOverlay = document.getElementById('calcOverlay');
const calcJeu = document.getElementById('calcJeu');
const calcMethode = document.getElementById('calcMethode');
const calcBlocBonus = document.getElementById('calcBlocBonus');
const calcBonus = document.getElementById('calcBonus');
const calcDetail = document.getElementById('calcDetail');
const calcTaux = document.getElementById('calcTaux');
const calcSeuils = document.getElementById('calcSeuils');
const calcRencontres = document.getElementById('calcRencontres');
const calcProba = document.getElementById('calcProba');

// Les paliers qu'on annonce. Pas 100 % : il n'existe pas, et le dire est la
// moitié de l'intérêt — chaque rencontre est indépendante des précédentes, le
// compteur ne « rapproche » de rien.
const CALC_PALIERS = [0.5, 0.9, 0.99];

/**
 * Combien de rencontres pour atteindre cette probabilité.
 *
 * 1 − (1 − p)^n = P  se renverse en  n = ln(1 − P) / ln(1 − p).
 *
 * LE PALIER 50 % N'EST PAS « LA MOITIÉ DU TAUX ». À 1/4096 il tombe à 2838
 * rencontres, pas 2048 — et c'est exactement le genre d'écart qu'on ne devine
 * pas, d'où l'intérêt de l'afficher plutôt que de laisser chacun l'estimer.
 */
function calcRencontresPour(probabilite, taux){
  if(!taux) return null;
  return Math.ceil(Math.log(1 - probabilite) / Math.log(1 - 1 / taux));
}

/**
 * « 12 345 » plutôt que « 12345 » : on lit ces nombres, on ne les calcule pas.
 *
 * LE SÉPARATEUR EST UNE ESPACE FINE INSÉCABLE (U+202F), pas une espace
 * ordinaire. C'est la règle typographique française, et surtout cela empêche
 * « 4 096 » de se couper en fin de ligne. Elle est INVISIBLE À LA RELECTURE :
 * on la prendra un jour pour une coquille et on la remplacera par une espace
 * normale. Ce commentaire est là pour que ce jour-là on sache que c'est
 * volontaire — et le banc, qui compare en normalisant les espaces, ne le
 * remarquera pas.
 */
function calcNombre(n){
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

function calcBonusCoches(){
  if(!calcBonus) return [];
  return Array.prototype.slice
    .call(calcBonus.querySelectorAll('input:checked'))
    .map(function(c){ return c.value; });
}

/** Les méthodes que ce jeu connaît, dans le menu. */
function calcMajMethodes(){
  if(!calcMethode || !calcJeu) return;
  const jeu = calcJeu.value;
  const avant = calcMethode.value;
  const dispo = methodesPour(jeu);

  calcMethode.innerHTML = '';
  dispo.forEach(function(cle){
    const opt = document.createElement('option');
    opt.value = cle;
    opt.textContent = METHODES[cle].nom;
    calcMethode.appendChild(opt);
  });
  // Garder la méthode choisie SI le nouveau jeu la connaît. Changer de jeu pour
  // comparer deux situations ne doit pas remettre le menu à zéro à chaque fois.
  if(dispo.indexOf(avant) !== -1) calcMethode.value = avant;
  calcMajBonus();
}

/** Les bonus que ce jeu connaît. Mêmes règles que l'écran de chasse. */
function calcMajBonus(){
  if(!calcBonus || !calcJeu) return;
  const jeu = calcJeu.value;
  const avant = calcBonusCoches();
  const dispo = bonusPour(jeu);

  calcBonus.innerHTML = '';
  if(calcBlocBonus) calcBlocBonus.style.display = dispo.length ? '' : 'none';

  dispo.forEach(function(cle){
    const info = BONUS[cle];
    const etiquette = document.createElement('label');
    etiquette.className = 'chasse-bonus-case';

    const case_ = document.createElement('input');
    case_.type = 'checkbox';
    case_.value = cle;
    // Une case cochée qui n'existe plus dans le nouveau jeu se décoche : sinon
    // le taux mentirait sans qu'on voie pourquoi.
    case_.checked = avant.indexOf(cle) !== -1;
    case_.addEventListener('change', calcDessiner);

    const nom = document.createElement('span');
    nom.className = 'chasse-bonus-nom';
    nom.textContent = info.nom;

    const gain = document.createElement('span');
    gain.className = 'chasse-bonus-gain';
    const t = tiragesDe(info, jeu);
    gain.textContent = '+' + t + ' tirage' + (t > 1 ? 's' : '');

    etiquette.appendChild(case_);
    etiquette.appendChild(nom);
    etiquette.appendChild(gain);
    if(info.aide) etiquette.title = info.aide;
    calcBonus.appendChild(etiquette);
  });
  calcDessiner();
}

/**
 * Le calcul, écrit terme à terme.
 *
 * Rend null pour une méthode à règle propre — Combo Capture, Distorsion,
 * machine à fossiles. Celles-là ne comptent pas en tirages : elles tirent leur
 * propre dé, et détailler une addition qui n'a pas lieu serait un mensonge.
 */
function calcDecomposition(methode, jeu, bonus){
  const m = METHODES[methode] || METHODES['autre'];
  if(m.taux) return null;

  const termes = [{ quoi: 'De base', combien: 1 }];
  const tm = tiragesDe(m, jeu);
  if(tm) termes.push({ quoi: m.nom, combien: tm });
  (bonus || []).forEach(function(cle){
    const info = BONUS[cle];
    if(!estPourCeJeu(info, jeu)) return;
    const t = tiragesDe(info, jeu);
    if(t) termes.push({ quoi: info.nom, combien: t });
  });
  return termes;
}

function calcDessiner(){
  if(!calcJeu || !calcTaux) return;
  const jeu = calcJeu.value;
  const methode = calcMethode ? calcMethode.value : 'rencontre';
  const bonus = calcBonusCoches();

  const base = tauxDeBase(jeu);
  if(base === null){
    calcTaux.textContent = 'Aucun chromatique dans ce jeu.';
    calcDetail.textContent = 'Les Pokémon chromatiques n’existent qu’à partir '
      + 'de la deuxième génération.';
    calcSeuils.innerHTML = '';
    if(calcProba) calcProba.textContent = '';
    return;
  }

  const taux = tauxDeChasse(methode, jeu, bonus);
  calcTaux.innerHTML = 'Un chromatique sur <b>' + calcNombre(Math.round(taux)) + '</b>';

  // --- Le détail du calcul ---------------------------------------------------
  const termes = calcDecomposition(methode, jeu, bonus);
  if(!termes){
    calcDetail.textContent = 'Cette méthode a son propre taux : elle ne passe '
      + 'pas par les tirages, et aucun bonus ne s’y ajoute.';
  } else {
    const total = termes.reduce(function(n, t){ return n + t.combien; }, 0);
    const somme = termes.map(function(t){
      return t.combien + ' (' + t.quoi.toLowerCase() + ')';
    }).join('  +  ');
    calcDetail.innerHTML = somme + '  =  <b>' + total + ' tirage'
      + (total > 1 ? 's' : '') + '</b><br>'
      + calcNombre(base) + ' ÷ ' + total + '  =  <b>1 sur '
      + calcNombre(Math.round(base / total)) + '</b>';
  }

  // --- Les seuils ------------------------------------------------------------
  calcSeuils.innerHTML = '';
  CALC_PALIERS.forEach(function(p){
    const n = calcRencontresPour(p, taux);
    const ligne = document.createElement('div');
    ligne.className = 'calc-seuil';
    ligne.innerHTML = '<span class="calc-seuil-part">' + Math.round(p * 100)
      + '&nbsp;% de chances</span><span class="calc-seuil-n">après '
      + calcNombre(n) + ' rencontres</span>';
    calcSeuils.appendChild(ligne);
  });

  calcMajProba();
}

/** « Après n rencontres, j'ai tant de chances d'en avoir vu un. » */
function calcMajProba(){
  if(!calcProba || !calcRencontres) return;
  const n = parseInt(calcRencontres.value, 10);
  if(!n || n < 0){ calcProba.textContent = ''; return; }

  const taux = tauxDeChasse(
    calcMethode ? calcMethode.value : 'rencontre',
    calcJeu.value,
    calcBonusCoches());
  if(!taux){ calcProba.textContent = ''; return; }

  const p = probabiliteCumulee(n, taux) * 100;
  // Un chiffre après la virgule sous 10 %, aucun au-dessus : « 3,4 % » se lit,
  // « 87,3 % » fait croire à une précision que le hasard n'a pas.
  calcProba.innerHTML = 'Après ' + calcNombre(n) + ' rencontres : <b>'
    + (p < 10 ? p.toFixed(1).replace('.', ',') : Math.round(p)) + '&nbsp;%</b> '
    + 'd’en avoir croisé au moins un.';
}

function ouvrirCalculateur(){
  if(!calcOverlay) return;
  // Le jeu ouvert, s'il se chasse : on arrive presque toujours pour celui-là.
  if(calcJeu && typeof currentTab !== 'undefined' && currentTab){
    const existe = Array.prototype.some.call(calcJeu.options, function(o){
      return o.value === currentTab;
    });
    if(existe) calcJeu.value = currentTab;
  }
  calcMajMethodes();
  calcOverlay.style.display = 'flex';
}

function fermerCalculateur(){
  if(calcOverlay) calcOverlay.style.display = 'none';
}

if(calcJeu){
  jeuxChassables().forEach(function(g){
    const opt = document.createElement('option');
    opt.value = g.key;
    opt.textContent = g.tab;
    calcJeu.appendChild(opt);
  });
  calcJeu.addEventListener('change', calcMajMethodes);
}
if(calcMethode) calcMethode.addEventListener('change', calcDessiner);
if(calcRencontres) calcRencontres.addEventListener('input', calcMajProba);

document.addEventListener('DOMContentLoaded', function(){
  const bouton = document.getElementById('calcBtn');
  if(bouton) bouton.addEventListener('click', ouvrirCalculateur);
  const fermer = document.getElementById('calcFermer');
  if(fermer) fermer.addEventListener('click', fermerCalculateur);
  if(calcOverlay){
    calcOverlay.addEventListener('click', function(e){
      if(e.target === calcOverlay) fermerCalculateur();
    });
  }
});

document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && calcOverlay && calcOverlay.style.display === 'flex'){
    fermerCalculateur();
  }
});
