// Deux écrans qui REGARDENT ce qui existe déjà, sans rien produire de neuf.
//
// Script classique, chargé APRÈS chasse.js et photos.js : il lit `chassesFinies`,
// `GAMES`, le relevé des lieux et les taux, et n'en tient aucune copie. Un
// écran qui recalcule ses propres chiffres finit toujours par en donner de
// différents de ceux qu'affiche le reste de l'application.
//
//   la galerie   ce qu'on a mis des mois à obtenir, en un seul endroit ;
//   le relevé    ce qui est renseigné pour chaque jeu, et ce qui manque.
//
// AUCUN DES DEUX N'ÉCRIT QUOI QUE CE SOIT. Ils se contentent de mettre en forme
// — d'où l'absence de queueSave dans tout le fichier.

// ---- La galerie des chromatiques ---------------------------------------------
//
// LE COMPTE RESTE JUSTE, ET C'EST LA SEULE DÉCISION QUI COMPTE ICI. On montre
// TOUS les chromatiques obtenus, avec ou sans photo : les cacher donnerait une
// galerie plus belle et un compte faux. L'en-tête annonce donc les deux nombres
// — obtenus, et parmi eux ceux qui ont une image — pour qu'on sache toujours ce
// qu'on regarde.

let galerieFiltre = 'tous';

const GALERIE_FILTRES = [
  { cle: 'tous',   nom: 'Tous' },
  { cle: 'photo',  nom: 'Avec photo' },
  { cle: 'longs',  nom: 'Les plus longs' },
];

/** Les chasses conclues, dans l'ordre demandé par le filtre. */
function galerieEntrees(){
  if(typeof chassesFinies === 'undefined') return [];
  let liste = chassesFinies.slice();
  if(galerieFiltre === 'photo'){
    liste = liste.filter(function(c){ return Number.isInteger(c.image); });
  }
  if(galerieFiltre === 'longs'){
    liste.sort(function(a, b){ return (b.compteur || 0) - (a.compteur || 0); });
  } else {
    // Du plus récent au plus ancien : c'est le dernier obtenu qu'on vient voir.
    liste.sort(function(a, b){ return String(b.fin || '').localeCompare(String(a.fin || '')); });
  }
  return liste;
}

function galerieNom(c){
  if(typeof allEntries === 'undefined') return c.pokemon;
  const e = allEntries.find(function(x){ return x.name === c.pokemon; });
  return e ? nomAffiche(e) : c.pokemon;
}

/** Une vignette. La photo si elle existe, le sprite sinon. */
function galerieVignette(c){
  const carte = document.createElement('button');
  carte.type = 'button';
  carte.className = 'galerie-carte';

  const cadre = document.createElement('div');
  cadre.className = 'galerie-image';
  const e = (typeof allEntries !== 'undefined')
    ? allEntries.find(function(x){ return x.name === c.pokemon; }) : null;

  if(Number.isInteger(c.image) && typeof vignettePhoto === 'function'){
    // LA MÊME VIGNETTE QUE LE TABLEAU DE CHASSE. Elle sait charger une image
    // derrière un jeton — une balise <img> ne saurait pas la demander seule —
    // et elle attend d'être visible pour le faire. En écrire une seconde ici
    // aurait divergé au premier ajustement.
    cadre.appendChild(vignettePhoto(c));
  } else if(e){
    const img = document.createElement('img');
    img.alt = '';
    img.src = pokeosHomeUrl(e.id, true);         // la forme CHROMATIQUE
    img.addEventListener('error', function(){
      if(img.dataset.repli) return;
      img.dataset.repli = '1';
      img.src = officialArtworkUrl(e.id, true);
    });
    cadre.appendChild(img);
    // SANS PHOTO, ON LE DIT. Une vignette de sprite au milieu de photos
    // ressemble à une photo manquante — ce qu'elle est, autant l'écrire.
    const sans = document.createElement('span');
    sans.className = 'galerie-sans';
    sans.textContent = 'pas de photo';
    cadre.appendChild(sans);
  }
  carte.appendChild(cadre);

  const bas = document.createElement('div');
  bas.className = 'galerie-bas';
  const nom = document.createElement('div');
  nom.className = 'galerie-nom';
  nom.textContent = galerieNom(c);
  bas.appendChild(nom);

  const chiffres = document.createElement('div');
  chiffres.className = 'galerie-chiffres';
  const taux = c.taux ? '1/' + Math.round(c.taux) : '—';
  chiffres.textContent = (c.compteur || 0) + ' · ' + taux;
  bas.appendChild(chiffres);
  carte.appendChild(bas);

  if(e && typeof openPreview === 'function'){
    carte.addEventListener('click', function(){ openPreview(e, null); });
  } else {
    carte.disabled = true;
  }
  return carte;
}

function dessinerGalerie(){
  if(!galerieGrille || !galerieResume || !galerieFiltres) return;

  const toutes = (typeof chassesFinies !== 'undefined') ? chassesFinies : [];
  const avecPhoto = toutes.filter(function(c){ return Number.isInteger(c.image); }).length;
  const rencontres = toutes.reduce(function(n, c){ return n + (c.compteur || 0); }, 0);

  galerieResume.textContent = toutes.length
    ? toutes.length + ' obtenu' + (toutes.length > 1 ? 's' : '')
      + '  ·  ' + avecPhoto + ' avec une photo'
      + '  ·  ' + rencontres.toLocaleString('fr-FR') + ' rencontres en tout'
    : 'Aucune chasse conclue pour l’instant.';

  galerieFiltres.innerHTML = '';
  GALERIE_FILTRES.forEach(function(f){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'galerie-puce' + (galerieFiltre === f.cle ? ' on' : '');
    b.textContent = f.nom;
    b.addEventListener('click', function(){ galerieFiltre = f.cle; dessinerGalerie(); });
    galerieFiltres.appendChild(b);
  });

  galerieGrille.innerHTML = '';
  const liste = galerieEntrees();
  if(!liste.length){
    galerieGrille.innerHTML = '<div class="state-msg">Rien à montrer avec ce filtre.</div>';
    return;
  }
  liste.forEach(function(c){ galerieGrille.appendChild(galerieVignette(c)); });
}

// ---- L'état du relevé ---------------------------------------------------------
//
// « PAS RELEVÉ » ET « SANS OBJET » NE SONT PAS LA MÊME CHOSE, et c'est toute la
// difficulté de cet écran. Rouge et Bleu n'ont AUCUN chromatique : l'absence de
// taux n'y est pas un trou à combler. Les confondre ferait courir après des
// données qui n'existent pas — exactement ce que le relevé des lieux évite déjà
// en distinguant « ne se capture pas » d'« on ne sait pas ».
//
// D'où trois états et non deux : renseigné, absent, sans objet.

// QUATRE SIGNAUX, ET CHACUN SE LIT D'UNE DONNÉE QUI EXISTE. Un écran d'état
// qui inventerait ses propres critères mentirait deux fois : sur ce qui manque,
// et sur ce que « complet » veut dire.
const RELEVE_COLONNES = [
  { cle: 'lieux',    nom: 'Lieux' },
  { cle: 'taux',     nom: 'Taux' },
  { cle: 'methodes', nom: 'Méthodes' },
  { cle: 'sprites',  nom: 'Sprites' },
];

/** L'état d'une colonne pour un jeu : 'oui', 'non' ou 'sans-objet'. */
function releveEtat(jeu, colonne){
  const cle = jeu.key;
  if(colonne === 'lieux'){
    // `pokedexReleve` est la liste que le relevé déclare lui-même — la même
    // que consulte la fiche pour décider si elle a le droit de dire « ne se
    // capture pas » plutôt que « on ne sait pas ».
    if(typeof DONNEES_LIEUX === 'undefined') return 'non';
    return (DONNEES_LIEUX.pokedexReleve || []).indexOf(cle) !== -1 ? 'oui' : 'non';
  }
  if(colonne === 'taux'){
    // SANS OBJET là où les chromatiques n'existent pas.
    if(typeof SANS_CHROMATIQUES !== 'undefined' && SANS_CHROMATIQUES.indexOf(cle) !== -1){
      return 'sans-objet';
    }
    return (typeof tauxDeBase === 'function' && tauxDeBase(cle)) ? 'oui' : 'non';
  }
  if(colonne === 'methodes'){
    // « Autre méthode » existe partout : un jeu qui n'a qu'elle n'a rien de
    // relevé. C'est le deuxième qui prouve qu'on s'est penché dessus.
    if(typeof methodesPour !== 'function') return 'non';
    if(typeof SANS_CHROMATIQUES !== 'undefined' && SANS_CHROMATIQUES.indexOf(cle) !== -1){
      return 'sans-objet';
    }
    return methodesPour(cle).length > 1 ? 'oui' : 'non';
  }
  if(colonne === 'sprites'){
    // Les sprites d'époque n'existent que jusqu'à la cinquième génération :
    // leur absence ailleurs est normale, pas un manque.
    //
    // `spritesDuJeu` ET NON `spritesEpoque` : le second est le BOOLÉEN du
    // réglage d'affichage, pas une question sur un jeu. Écrite ainsi, la
    // condition `typeof … !== 'function'` était toujours vraie et la colonne
    // répondait « sans objet » pour les vingt-trois jeux — une colonne entière
    // qui ne disait rien, sans que rien ne s'en plaigne.
    if(typeof spritesDuJeu !== 'function') return 'sans-objet';
    return spritesDuJeu(cle) ? 'oui' : 'sans-objet';
  }
  return 'non';
}

function dessinerReleve(){
  if(!releveCorps || !releveResume) return;
  const jeux = (typeof GAMES !== 'undefined') ? GAMES : [];

  let complets = 0;
  releveCorps.innerHTML = '';

  jeux.forEach(function(jeu){
    const etats = RELEVE_COLONNES.map(function(c){ return releveEtat(jeu, c.cle); });
    // SANS OBJET NE COMPTE PAS COMME UN MANQUE : une couverture qui pénalise
    // Rouge et Bleu pour ne pas avoir de chromatiques serait fausse.
    const pertinents = etats.filter(function(e){ return e !== 'sans-objet'; });
    const bons = pertinents.filter(function(e){ return e === 'oui'; }).length;
    const part = pertinents.length ? Math.round(100 * bons / pertinents.length) : 100;
    if(part === 100) complets++;

    const ligne = document.createElement('div');
    ligne.className = 'releve-ligne';

    const nom = document.createElement('span');
    nom.className = 'releve-jeu';
    nom.textContent = jeu.tab;
    ligne.appendChild(nom);

    etats.forEach(function(e){
      const p = document.createElement('span');
      p.className = 'releve-etat ' + e;
      p.textContent = e === 'oui' ? '✓' : (e === 'non' ? '✕' : '—');
      p.title = e === 'oui' ? 'renseigné'
        : (e === 'non' ? 'manquant' : 'sans objet pour ce jeu');
      ligne.appendChild(p);
    });

    const jauge = document.createElement('span');
    jauge.className = 'releve-jauge' + (part === 100 ? '' : (part >= 50 ? ' partiel' : ' vide'));
    const barre = document.createElement('i');
    barre.style.width = part + '%';
    jauge.appendChild(barre);
    jauge.title = part + ' %';
    ligne.appendChild(jauge);

    releveCorps.appendChild(ligne);
  });

  releveResume.textContent = jeux.length
    ? jeux.length + ' jeux  ·  ' + complets + ' complets  ·  '
      + (jeux.length - complets) + ' avec au moins un manque'
    : 'Aucun jeu.';
}

// ---- Les portes ---------------------------------------------------------------

function ouvrirGalerie(){
  if(typeof showPage === 'function') showPage('galerie');
  dessinerGalerie();
}
function ouvrirReleve(){
  if(typeof showPage === 'function') showPage('releve');
  dessinerReleve();
}

document.addEventListener('DOMContentLoaded', function(){
  const bg = document.getElementById('galerieBtn');
  if(bg) bg.addEventListener('click', ouvrirGalerie);
  const br = document.getElementById('releveBtn');
  if(br) br.addEventListener('click', ouvrirReleve);
});
