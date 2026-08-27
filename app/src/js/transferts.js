// Les transferts : par quel chemin un Pokémon rejoint Pokémon HOME.
// Script classique (pas de module ES) : l'app reste ouvrable en file://
//
// POURQUOI UNE PAGE D'AIDE, ET NON UN BLOC DE FICHE. Ces règles dépendent du
// JEU, jamais de l'espèce : le chemin de Rubis est le même pour Nidoran que
// pour Rayquaza. Les répéter sur mille deux cent quatre-vingt-une fiches, c'est
// faire relire vingt-deux fois la même chose à quelqu'un qui cherchait autre
// chose — et allonger d'autant chaque ouverture de fiche.
//
// Une seule page, une fois, et on la rouvre quand on en a besoin.
//
// LA TABLE EST ÉCRITE À LA MAIN, comme les distributions du Cadeau Mystère.
// Elle ne se relève nulle part : ce sont des règles de service, pas des données
// de jeu. Une quinzaine d'arêtes, et elles ne bougent qu'à l'ouverture ou à la
// fermeture d'un service. C'est ici, et seulement ici, qu'on les corrige.
//
// CE QUE LA TABLE DIT DE PLUS QU'UNE FLÈCHE : un service peut avoir une DATE DE
// FIN. La Banque Pokémon est le seul pont entre les seize jeux 3DS et Pokémon
// HOME, et elle ferme. Tant que la date n'est pas passée, le chemin est
// praticable — mais il ne le restera pas, et c'est exactement ce qu'un
// complétiste a besoin de savoir avant de remettre à plus tard.
//
// TROIS ÉTATS ET NON DEUX. « Ouvert » et « fermé » ne suffisaient pas : entre
// les deux il y a le sursis, qui est le seul moment où l'information sert
// encore à quelque chose. Un chemin qu'on annonce fermé alors qu'il fonctionne
// fait renoncer pour rien ; un chemin qu'on annonce ouvert sans dire qu'il
// s'arrête laisse rater la fenêtre.
//
// LA DATE EST ÉCRITE ICI, ET NULLE PART AILLEURS. Elle se corrige d'une ligne
// le jour où le calendrier bouge, et tout le reste suit : le compte à rebours,
// les couleurs, et les trois textes de la page.
//
// ATTENTION À NE PAS LA CONFONDRE avec le 27 mars 2023 — c'est la fermeture de
// l'eShop 3DS, le jour où la Banque est devenue GRATUITE, pas celui où elle
// s'arrête. La première version de ce fichier prenait l'une pour l'autre et
// annonçait fermé un service qui tournait encore.
const BANQUE_FERME_LE = '2027-02-26';

/** Combien de mois pleins avant la fermeture, ou 0 si c'est passé. */
function moisAvantFermeture(){
  const fin = new Date(BANQUE_FERME_LE + 'T12:00:00Z');
  const reste = fin.getTime() - Date.now();
  if(reste <= 0) return 0;
  return Math.max(1, Math.round(reste / (30.44 * 86400000)));
}

function banqueFermee(){
  return moisAvantFermeture() === 0;
}

const MOIS_FR_T = ['janvier','février','mars','avril','mai','juin','juillet',
                   'août','septembre','octobre','novembre','décembre'];

function dateFermeture(){
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(BANQUE_FERME_LE);
  if(!m) return BANQUE_FERME_LE;
  return parseInt(m[3], 10) + ' ' + MOIS_FR_T[parseInt(m[2], 10) - 1] + ' ' + m[1];
}

// Un sommet = un jeu (clé de GAMES), ou un service. Une arête = un transfert
// possible, avec le nom de l'outil qui le fait.
const TRANSFERTS = {
  // Première et deuxième générations : uniquement depuis les rééditions
  // Console Virtuelle 3DS. Les cartouches d'origine n'ont aucun moyen de
  // parler à quoi que ce soit de moderne — leur pile n'est pas le problème,
  // l'absence de tout protocole commun l'est.
  rby:      [{ vers:'banque', outil:'Poké Transporter, depuis la Console Virtuelle 3DS' }],
  jaune:    [{ vers:'banque', outil:'Poké Transporter, depuis la Console Virtuelle 3DS' }],
  gsc:      [{ vers:'banque', outil:'Poké Transporter, depuis la Console Virtuelle 3DS' }],
  cristal:  [{ vers:'banque', outil:'Poké Transporter, depuis la Console Virtuelle 3DS' }],

  // Troisième génération : le Parc des Amis, dans un jeu de quatrième.
  rse:      [{ vers:'dp', outil:'Parc des Amis' }],
  emeraude: [{ vers:'dp', outil:'Parc des Amis' }],
  frlg:     [{ vers:'dp', outil:'Parc des Amis' }],

  // Quatrième : le Poké Fourgon, vers un jeu de cinquième.
  dp:       [{ vers:'bw', outil:'Poké Fourgon' }],
  pt:       [{ vers:'bw', outil:'Poké Fourgon' }],
  hgss:     [{ vers:'bw', outil:'Poké Fourgon' }],

  // Cinquième, sixième et septième : la Banque Pokémon, et rien d'autre.
  bw:       [{ vers:'banque', outil:'Poké Transporter' }],
  b2w2:     [{ vers:'banque', outil:'Poké Transporter' }],
  xy:       [{ vers:'banque', outil:'Banque Pokémon' }],
  oras:     [{ vers:'banque', outil:'Banque Pokémon' }],
  sm:       [{ vers:'banque', outil:'Banque Pokémon' }],
  usum:     [{ vers:'banque', outil:'Banque Pokémon' }],

  // Le pont fermé. Tout ce qui précède en dépend, et c'est pour ça qu'il est
  // un sommet à part plutôt qu'une arête de plus sur chaque jeu.
  banque:   [{ vers:'home', outil:'Transfert vers Pokémon HOME', sursis: true }],

  // Switch : dépôt direct dans HOME. Le retour, lui, dépend du Pokédex du jeu
  // — un Pokémon absent de Galar ne redescend pas dans Épée.
  letsgo:   [{ vers:'home', outil:'dépôt direct', retour:'limité aux 153 espèces de Let\'s Go' }],
  swsh:     [{ vers:'home', outil:'dépôt direct', retour:'limité au Pokédex de Galar' }],
  bdsp:     [{ vers:'home', outil:'dépôt direct', retour:'limité au Pokédex de Sinnoh' }],
  pla:      [{ vers:'home', outil:'dépôt direct', retour:'limité au Pokédex de Hisui' }],
  sv:       [{ vers:'home', outil:'dépôt direct', retour:'limité au Pokédex de Paldea' }],
  za:       [{ vers:'home', outil:'dépôt direct', retour:'limité au Pokédex d\'Illumis' }],

  // Cobblemon n'est pas un jeu Pokémon : un mod Minecraft ne parle à aucun
  // service Nintendo, et rien n'en sort. Le dire vaut mieux que de laisser
  // chercher.
  cobblemon: []
};

/**
 * De ce jeu jusqu'à HOME : la suite des étapes, ou null s'il n'y a pas de
 * chemin.
 *
 * Un parcours en largeur, parce qu'on veut le chemin le plus court — il n'y en
 * a qu'un en pratique, mais rien dans la table ne l'impose, et le jour où un
 * service en ouvrira un second on ne veut pas que l'ordre de déclaration
 * décide à notre place.
 */
function routeVersHome(depart){
  if(depart === 'home' || depart === 'national') return [];
  const vus = {};
  vus[depart] = true;
  let file = [{ ou: depart, chemin: [] }];
  while(file.length){
    const suivant = [];
    for(const etape of file){
      const sorties = TRANSFERTS[etape.ou] || [];
      for(const arete of sorties){
        const chemin = etape.chemin.concat([arete]);
        if(arete.vers === 'home') return chemin;
        if(vus[arete.vers]) continue;
        vus[arete.vers] = true;
        suivant.push({ ou: arete.vers, chemin: chemin });
      }
    }
    file = suivant;
  }
  return null;
}

const NOMS_ETAPES = {
  banque: 'Banque Pokémon',
  home: 'Pokémon HOME',
  dp: 'un jeu de 4ᵉ génération',
  bw: 'un jeu de 5ᵉ génération'
};

function nomEtape(cle){
  if(NOMS_ETAPES[cle]) return NOMS_ETAPES[cle];
  const g = gameByKey[cle];
  return g ? g.title : cle;
}

// Deux jeux qui empruntent exactement le même chemin se disent sur une seule
// ligne. Le retour fait partie de la signature : Let's Go, Épée et DÉ/PS
// empruntent le même chemin mais ne rendent pas les mêmes espèces, et les
// fondre en une ligne faisait dire « limité aux 153 espèces de Let's Go » à
// Épée.
function signatureRoute(route){
  if(!route) return 'aucune';
  return route.map(function(a){
    return a.vers + '|' + a.outil + '|' + (a.retour || '');
  }).join(' > ');
}

/**
 * L'état d'un chemin : 'ouvert', 'sursis' ou 'ferme'.
 *
 * Le sursis est le seul état qui demande d'agir — d'où le fait qu'il existe.
 */
function etatRoute(route){
  if(!route) return 'ouvert';
  if(!route.some(function(a){ return a.sursis; })) return 'ouvert';
  return banqueFermee() ? 'ferme' : 'sursis';
}

function routeFermee(route){
  return etatRoute(route) === 'ferme';
}

// ---- La page ----------------------------------------------------------------

const transfertsListe = document.getElementById('transfertsListe');
const transfertsResume = document.getElementById('transfertsResume');

/** Une ligne : les jeux qui partagent ce chemin, le chemin, et ce qu'il coûte. */
function ligneTransfert(groupe){
  const ligne = document.createElement('div');
  const etat = etatRoute(groupe.route);
  // La couleur porte l'information, pas seulement le texte : vert ouvert, or
  // en sursis, rouge fermé, gris sans issue.
  ligne.className = 'transfert-ligne'
    + (!groupe.route ? ' sans-chemin' : ' ' + etat);

  const depuis = document.createElement('div');
  depuis.className = 'transfert-depuis';
  depuis.textContent = groupe.jeux.map(function(c){
    return gameByKey[c] ? gameByKey[c].tab : c;
  }).join('  ·  ');
  ligne.appendChild(depuis);

  const chemin = document.createElement('div');
  chemin.className = 'transfert-chemin';
  if(!groupe.route){
    chemin.textContent = 'Aucun transfert possible — ce qui y est attrapé y reste.';
  } else {
    groupe.route.forEach(function(a, i){
      if(i){
        const fleche = document.createElement('span');
        fleche.className = 'transfert-fleche';
        fleche.textContent = '→';
        chemin.appendChild(fleche);
      }
      const pas = document.createElement('span');
      // Un service qui s'arrête se marque : barré une fois la date passée,
      // simplement souligné tant qu'il fonctionne encore.
      pas.className = 'transfert-pas'
        + (a.sursis ? (banqueFermee() ? ' barre' : ' compte') : '');
      pas.textContent = nomEtape(a.vers);
      pas.title = a.outil;
      chemin.appendChild(pas);
    });
  }
  ligne.appendChild(chemin);

  const note = document.createElement('div');
  note.className = 'transfert-note';
  if(!groupe.route){
    note.textContent = 'Un mod Minecraft ne parle à aucun service Nintendo.';
  } else if(etat === 'ferme'){
    note.textContent = 'Ce chemin est FERMÉ depuis le ' + dateFermeture()
      + '. Un Pokémon resté dans ces jeux n\'a plus aucun moyen de rejoindre '
      + 'Pokémon HOME.';
  } else if(etat === 'sursis'){
    const mois = moisAvantFermeture();
    note.textContent = 'Ça marche encore, et ça ne durera pas : la Banque '
      + 'Pokémon s\'arrête le ' + dateFermeture() + '. Il te reste ' + mois
      + ' mois pour faire remonter ce qui dort dans ces jeux — après, il n\'y '
      + 'aura plus de chemin du tout.';
  } else {
    const outils = groupe.route.map(function(a){ return a.outil; }).join(', puis ');
    const retour = groupe.route[groupe.route.length - 1].retour;
    note.textContent = 'Par ' + outils + '.'
      + (retour ? ' Le retour depuis HOME est ' + retour + '.' : '');
  }
  ligne.appendChild(note);
  return ligne;
}

function dessinerTransferts(){
  if(!transfertsListe) return;

  // Groupés par chemin identique, dans l'ordre de sortie des jeux.
  const groupes = [];
  const parSignature = {};
  (typeof GAMES !== 'undefined' ? GAMES : []).forEach(function(g){
    const route = routeVersHome(g.key);
    const sig = signatureRoute(route);
    if(!parSignature[sig]){
      parSignature[sig] = { route: route, jeux: [] };
      groupes.push(parSignature[sig]);
    }
    parSignature[sig].jeux.push(g.key);
  });

  // L'ordre suit l'urgence : ce qui s'arrête bientôt EN PREMIER, puis ce qui
  // marchera toujours, puis ce qui est perdu. Ranger l'urgent en bas d'une
  // liste de vingt-deux jeux, c'est le cacher.
  const RANG = { sursis: 0, ouvert: 1, ferme: 2 };
  groupes.sort(function(a, b){
    const ra = a.route ? RANG[etatRoute(a.route)] : 3;
    const rb = b.route ? RANG[etatRoute(b.route)] : 3;
    return ra - rb;
  });

  let ouverts = 0, enSursis = 0, fermes = 0;
  groupes.forEach(function(g){
    if(!g.route) return;
    const e = etatRoute(g.route);
    if(e === 'ferme') fermes += g.jeux.length;
    else if(e === 'sursis') enSursis += g.jeux.length;
    else ouverts += g.jeux.length;
  });

  if(transfertsResume){
    const mois = moisAvantFermeture();
    transfertsResume.innerHTML = '<b>' + ouverts + '</b> jeux déposent '
      + 'directement dans Pokémon HOME. '
      + (fermes
          ? '<b>' + fermes + '</b> passaient par la Banque Pokémon, fermée depuis '
            + 'le ' + dateFermeture() + ' — ce qui y est resté n\'en sort plus.'
          : '<b>' + enSursis + '</b> passent par la Banque Pokémon, qui '
            + '<b>s\'arrête le ' + dateFermeture() + '</b> : il te reste <b>'
            + mois + ' mois</b> pour les faire remonter.');
  }

  transfertsListe.innerHTML = '';
  groupes.forEach(function(g){ transfertsListe.appendChild(ligneTransfert(g)); });
}

// Rien à brancher : c'est une page, pas une fenêtre. showPage('transferts')
// appelle dessinerTransferts(), comme il appelle dessinerStrategie() pour la
// page voisine.
