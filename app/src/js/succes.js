// Les succès.
//
// Script classique, chargé APRÈS retrospective.js : il lit retroDonnees, que
// celle-ci a déjà rapatrié. C'est tout l'intérêt — pas une requête de plus.
//
// AUCUNE DONNÉE NOUVELLE, ET C'EST VOULU. Un système de succès se bâtit
// d'ordinaire sur une table qui enregistre qui a débloqué quoi et quand. Ici
// tout se déduit de ce que le journal garde déjà : la date de chaque capture,
// son jeu, et si elle était chromatique. Rien à écrire, rien à tenir d'accord
// avec le reste, rien à migrer.
//
// La conséquence est agréable : un succès ajouté demain se débloque
// rétroactivement, sans rien recalculer. Quelqu'un qui joue depuis six mois le
// verra acquis, avec sa vraie date.
//
// LA DATE VIENT DU JOURNAL, PAS D'UN HORODATAGE DE DÉBLOCAGE. Pour un seuil
// cumulé, on parcourt les jours du plus ancien au plus récent et on retient
// celui où le compte a franchi la barre. C'est plus juste qu'une date de
// déblocage : celle-ci dirait quand l'application a remarqué la chose, pas
// quand elle est arrivée.

const SUCCES_AMIS_MAX = 5;

let succesAmis = null;        // [{ depuis }], rapatrié une fois

// ---- Les succès -------------------------------------------------------------
//
// Chaque succès sait se mesurer lui-même contre l'état. Il rend :
//
//   fait     acquis ou non
//   ou       où l'on en est, pour la barre
//   but      ce qu'il faut atteindre
//   quand    la date, quand on sait la retrouver
//
// Les seuils sont espacés pour que le suivant reste en vue sans être proche :
// 10, 100, 500, 1000 se franchissent à des moments qui ne se ressemblent pas.

const SUCCES = [
  { groupe: 'Les premiers pas',
    cle: 'premiere', nom: 'Première capture',
    quoi: 'Enregistrer sa première capture',
    mesurer: (e) => seuilCumule(e, 1) },

  { groupe: 'Les premiers pas',
    cle: 'aventures', nom: 'Une seconde vie',
    quoi: 'Mener deux aventures de front',
    mesurer: (e) => ({ ou: e.aventures, but: 2, fait: e.aventures >= 2 }) },

  { groupe: 'Les premiers pas',
    cle: 'chromatique', nom: 'Le premier brillant',
    quoi: 'Enregistrer un Pokémon chromatique',
    mesurer: (e) => seuilChromatique(e, 1) },

  { groupe: 'La collection',
    cle: 'dix', nom: 'Une poignée', quoi: 'Dix captures',
    mesurer: (e) => seuilCumule(e, 10) },
  { groupe: 'La collection',
    cle: 'cent', nom: 'Une centaine', quoi: 'Cent captures',
    mesurer: (e) => seuilCumule(e, 100) },
  { groupe: 'La collection',
    cle: 'cinqcents', nom: 'Une collection', quoi: 'Cinq cents captures',
    mesurer: (e) => seuilCumule(e, 500) },
  { groupe: 'La collection',
    cle: 'mille', nom: 'Une archive', quoi: 'Mille captures',
    mesurer: (e) => seuilCumule(e, 1000) },

  { groupe: 'La régularité',
    cle: 'serie3', nom: 'Trois jours', quoi: 'Trois jours d’affilée',
    mesurer: (e) => seuilSerie(e, 3) },
  { groupe: 'La régularité',
    cle: 'serie7', nom: 'Une semaine', quoi: 'Sept jours d’affilée',
    mesurer: (e) => seuilSerie(e, 7) },
  { groupe: 'La régularité',
    cle: 'serie30', nom: 'Un mois entier', quoi: 'Trente jours d’affilée',
    mesurer: (e) => seuilSerie(e, 30) },

  { groupe: 'Les grandes sessions',
    cle: 'jour20', nom: 'Bonne pioche', quoi: 'Vingt captures en un jour',
    mesurer: (e) => seuilJournee(e, 20) },
  { groupe: 'Les grandes sessions',
    cle: 'jour50', nom: 'La nuit blanche', quoi: 'Cinquante captures en un jour',
    mesurer: (e) => seuilJournee(e, 50) },

  { groupe: 'L’étendue',
    cle: 'jeux3', nom: 'Touche-à-tout', quoi: 'Avancer dans trois jeux',
    mesurer: (e) => ({ ou: e.jeux, but: 3, fait: e.jeux >= 3 }) },
  { groupe: 'L’étendue',
    cle: 'jeux10', nom: 'Le tour des consoles', quoi: 'Avancer dans dix jeux',
    mesurer: (e) => ({ ou: e.jeux, but: 10, fait: e.jeux >= 10 }) },
  { groupe: 'L’étendue',
    cle: 'jeuxTous', nom: 'Aucun oublié', quoi: 'Avancer dans les vingt-trois jeux',
    mesurer: (e) => ({ ou: e.jeux, but: e.jeuxEnTout, fait: e.jeux >= e.jeuxEnTout }) },

  { groupe: 'Les chromatiques',
    cle: 'chroma10', nom: 'Chasseur patient', quoi: 'Dix Pokémon chromatiques',
    mesurer: (e) => seuilChromatique(e, 10) },

  { groupe: 'À plusieurs',
    cle: 'ami1', nom: 'Bien accompagné', quoi: 'Suivre un dresseur',
    mesurer: (e) => seuilAmis(e, 1) },
  { groupe: 'À plusieurs',
    cle: 'ami5', nom: 'Toute une bande', quoi: 'Suivre cinq dresseurs',
    mesurer: (e) => seuilAmis(e, SUCCES_AMIS_MAX) },
];

// ---- Les mesures -------------------------------------------------------------

/**
 * Un total cumulé, et le jour où il a franchi la barre.
 *
 * Les jours arrivent du plus récent au plus ancien ; on les parcourt donc à
 * l'envers, dans le sens où ils ont été vécus.
 */
function seuilCumule(e, but){
  let n = 0;
  for(let i = e.jours.length - 1; i >= 0; i--){
    n += e.jours[i].combien;
    if(n >= but) return { ou: e.total, but: but, fait: true, quand: e.jours[i].jour };
  }
  return { ou: e.total, but: but, fait: e.total >= but };
}

function seuilChromatique(e, but){
  let n = 0;
  for(let i = e.jours.length - 1; i >= 0; i--){
    n += e.jours[i].chromatiques;
    if(n >= but) return { ou: e.chromatiques, but: but, fait: true, quand: e.jours[i].jour };
  }
  return { ou: e.chromatiques, but: but, fait: false };
}

/** La première fois qu'une journée a atteint ce compte. */
function seuilJournee(e, but){
  let meilleur = 0, quand = null;
  for(let i = e.jours.length - 1; i >= 0; i--){
    if(e.jours[i].combien > meilleur) meilleur = e.jours[i].combien;
    if(!quand && e.jours[i].combien >= but) quand = e.jours[i].jour;
  }
  return { ou: meilleur, but: but, fait: !!quand, quand: quand };
}

/**
 * La première fois qu'une série a atteint cette longueur.
 *
 * Un jour sans capture n'a pas de ligne : c'est l'écart entre deux lignes
 * voisines qui dit si la série se poursuit. retroVeille vit dans
 * retrospective.js, et fait le calcul de date en restant sur les chaînes.
 */
function seuilSerie(e, but){
  let courante = 0, meilleure = 0, precedent = null, quand = null;
  for(let i = e.jours.length - 1; i >= 0; i--){
    const j = e.jours[i].jour;
    courante = (precedent && retroVeille(j) === precedent) ? courante + 1 : 1;
    if(courante > meilleure) meilleure = courante;
    if(!quand && courante >= but) quand = j;
    precedent = j;
  }
  return { ou: meilleure, but: but, fait: !!quand, quand: quand };
}

/** Les amis portent leur date d'abonnement : le n-ième donne la sienne. */
function seuilAmis(e, but){
  const dates = (e.amis || []).map(function(a){ return String(a.depuis || '').slice(0, 10); })
    .filter(Boolean).sort();
  return { ou: e.amisCombien, but: but, fait: e.amisCombien >= but,
           quand: dates.length >= but ? dates[but - 1] : null };
}

// ---- L'état -------------------------------------------------------------------

function etatSucces(){
  const d = retroDonnees || { jours: [], jeux: [], total: 0 };
  return {
    jours: d.jours || [],
    total: d.total || 0,
    chromatiques: (d.jours || []).reduce(function(s, j){ return s + j.chromatiques; }, 0),
    jeux: (d.jeux || []).length,
    // Le nombre de jeux vient de la réserve, pas d'un chiffre écrit ici : elle
    // en a gagné un aujourd'hui même avec Cobblemon.
    jeuxEnTout: (typeof GAMES !== 'undefined') ? GAMES.length : 23,
    aventures: (typeof profilsConnus !== 'undefined') ? profilsConnus.length : 0,
    amis: succesAmis || [],
    amisCombien: (succesAmis || []).length,
  };
}

// ---- L'affichage ----------------------------------------------------------------

// ---- L'icone ------------------------------------------------------------------
//
// Une medaille dessinee plutot qu'une etoile de police. Meme raison que pour le
// cri : un caractere pris dans la police du systeme ne prend ni la teinte ni le
// theme, et change d'un poste a l'autre. Un trace suit currentColor.
//
// Elle dit son etat par sa forme et non par sa seule couleur : pleine une fois
// acquise, en trait creux tant qu'elle ne l'est pas. Qui ne distingue pas l'or
// du gris voit quand meme la difference.
const SUCCES_TRACES = {
  disque: 'M8 1.6a4.3 4.3 0 1 1 0 8.6 4.3 4.3 0 0 1 0-8.6z',
  rubans: 'M5.7 9.5 4.2 14.6 8 12.7l3.8 1.9-1.5-5.1',
};

function iconeSucces(acquis){
  const traits = 'stroke="currentColor" stroke-width="1.3" stroke-linejoin="round" '
               + 'stroke-linecap="round"';
  const parts = [
    '<path d="' + SUCCES_TRACES.rubans + '" fill="none" ' + traits + '/>',
    '<path d="' + SUCCES_TRACES.disque + '" '
      + (acquis ? 'fill="currentColor"/>' : 'fill="none" ' + traits + '/>'),
  ];
  return '<svg viewBox="0 0 16 16" width="15" height="15" aria-hidden="true" '
       + 'focusable="false">' + parts.join('') + '</svg>';
}

function carteSucces(s, m){
  const c = document.createElement('div');
  c.className = 'succes' + (m.fait ? ' acquis' : '');

  const marque = document.createElement('span');
  marque.className = 'succes-marque';
  marque.innerHTML = iconeSucces(m.fait);

  const corps = document.createElement('div');
  corps.className = 'succes-corps';

  const nom = document.createElement('span');
  nom.className = 'succes-nom';
  nom.textContent = s.nom;

  const quoi = document.createElement('span');
  quoi.className = 'succes-quoi';
  quoi.textContent = s.quoi;

  corps.appendChild(nom);
  corps.appendChild(quoi);

  // Acquis : la date, quand on sait la retrouver. En cours : où l'on en est.
  // Un succès acquis n'a plus besoin de sa barre — elle serait pleine, et une
  // barre pleine n'apprend rien.
  const pied = document.createElement('span');
  pied.className = 'succes-pied';
  if(m.fait){
    pied.textContent = m.quand ? retroDateLisible(m.quand) : 'acquis';
  } else {
    pied.textContent = Math.min(m.ou, m.but) + ' / ' + m.but;
    const barre = document.createElement('span');
    barre.className = 'succes-barre';
    const plein = document.createElement('i');
    plein.style.width = Math.max(2, Math.min(100, (m.ou / m.but) * 100)) + '%';
    barre.appendChild(plein);
    corps.appendChild(barre);
  }
  corps.appendChild(pied);

  c.appendChild(marque);
  c.appendChild(corps);
  return c;
}

function dessinerSucces(){
  if(!succesBloc) return;
  const e = etatSucces();
  const mesures = SUCCES.map(function(s){ return { s: s, m: s.mesurer(e) }; });
  const acquis = mesures.filter(function(x){ return x.m.fait; }).length;

  succesBloc.innerHTML = '';

  const tete = document.createElement('p');
  tete.className = 'succes-compte';
  tete.textContent = acquis + ' succès sur ' + mesures.length;
  succesBloc.appendChild(tete);

  // Groupés, et dans l'ordre de la liste : elle va des premiers pas au reste,
  // ce qui est aussi l'ordre où on les rencontre.
  const groupes = [];
  mesures.forEach(function(x){
    let g = groupes.find(function(y){ return y.nom === x.s.groupe; });
    if(!g){ g = { nom: x.s.groupe, items: [] }; groupes.push(g); }
    g.items.push(x);
  });

  groupes.forEach(function(g){
    const titre = document.createElement('div');
    titre.className = 'succes-groupe';
    titre.textContent = g.nom;
    succesBloc.appendChild(titre);

    const grille = document.createElement('div');
    grille.className = 'succes-grille';
    g.items.forEach(function(x){ grille.appendChild(carteSucces(x.s, x.m)); });
    succesBloc.appendChild(grille);
  });
}

/** Appelé par chargerRetrospective(), une fois ses chiffres arrivés. */
async function chargerSucces(){
  if(!succesBloc) return;
  // Les amis ne sont pas dans la rétrospective : un appel de plus, une fois.
  if(succesAmis === null && typeof invoke === 'function'){
    try{
      const r = await invoke('amis');
      succesAmis = r.amis || [];
    }catch(e){
      // Hors ligne ou route absente : les succès sociaux resteront à zéro,
      // ce qui est faux mais silencieux — mieux que de vider la page entière
      // pour deux cartes sur dix-huit.
      succesAmis = [];
    }
  }
  dessinerSucces();
}
