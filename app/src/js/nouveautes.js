// Ce qui a changé, écrit pour quelqu'un qui joue.
//
// Script classique, chargé après confirmer.js dont il reprend le gabarit de
// modale.
//
// CE N'EST PAS LE JOURNAL DE GIT, et c'est tout l'intérêt. Les messages de
// commit disent pourquoi le code est ce qu'il est — utile pour qui l'écrit,
// illisible pour qui l'utilise. « efficaciteOffensive accepte une table en
// troisième argument » n'apprend rien à personne ; « la table des types
// s'adapte au jeu que tu lis » si.
//
// D'où une liste écrite à la main. Elle se tient à jour à chaque version, au
// même endroit que le numéro : c'est le prix d'un texte qui parle vraiment à
// celui qui le lit.
//
// Chaque entrée porte une date au format ISO — elle s'affiche en français, mais
// se compare et se trie sans ambiguïté sous cette forme.

const NOUVEAUTES_VUES_KEY = 'pokearchive-nouveautes-vues';

const NOUVEAUTES = [
  {
    version: '0.14.0', date: '2026-08-25', titre: 'Où aller, et ce que tu as fait',
    points: [
      'Un onglet **Lieux** : choisis un jeu, et chaque route dit ce qu’il te reste '
      + 'à y prendre — avec le taux d’apparition, le niveau, l’heure et la météo.',
      'Les 23 jeux y sont, Cobblemon compris par ses biomes.',
      'Dans le Profil, **ta rétrospective** : tes captures de la semaine, ton '
      + 'meilleur jour, ta plus longue série, et les trente derniers jours en un '
      + 'coup d’œil.',
      'Un **carnet de bord** par aventure : ta règle de Nuzlocke, tes surnoms, où '
      + 'tu en es.',
    ],
  },
  {
    version: '0.13.0', date: '2026-08-25', titre: 'Le nom Discord, pas l’identifiant',
    points: [
      'C’est ton **nom affiché** sur Discord qui s’affiche — « Tennôsei » — et non '
      + 'le pseudo technique « tennosei5804 ».',
      'Il se met à jour à chaque connexion, donc si tu changes de nom sur Discord, '
      + 'il suivra.',
    ],
  },
  {
    version: '0.12.0', date: '2026-08-25', titre: 'Reconnaître quelqu’un sans cliquer',
    points: [
      'Le pseudo Discord apparaît aussi dans **le classement, la recherche et ta '
      + 'liste d’amis** — plus seulement sur la fiche d’un dresseur.',
      'Le pseudo choisi passe au-dessus, le pseudo Discord en dessous, et les deux '
      + 'à la même taille.',
      'Les changelogs se lisent à gauche au lieu d’être centrés.',
    ],
  },
  {
    version: '0.11.0', date: '2026-08-25', titre: 'Le pseudo Discord, en plus du tien',
    points: [
      'Le profil d’un dresseur montre maintenant **trois lignes** : son pseudo '
      + 'Discord, son pseudo PokéArchive, puis son aventure.',
      'Ce nom ne se change pas depuis l’application — c’est ce qui permet de '
      + 'reconnaître quelqu’un qui s’est renommé ici.',
      'Il n’apparaît qu’après une reconnexion : on ne le gardait pas jusqu’ici.',
    ],
  },
  {
    version: '0.10.0', date: '2026-08-25', titre: 'L’aventure d’un dresseur, nommée',
    points: [
      'Quand tu ouvres le profil de quelqu’un, tu vois **le nom de son aventure** '
      + 'au lieu de « 1 aventure publique » — qui n’apprenait rien, puisque la '
      + 'liste juste en dessous les compte déjà.',
      'Un pseudo trop long ne déborde plus de la carte.',
    ],
  },
  {
    version: '0.9.0', date: '2026-08-25', titre: 'Les visages, et des pseudos plus courts',
    points: [
      'Les **photos de profil Discord** s’affichent enfin dans la liste d’amis et '
      + 'dans le fil — elles étaient cassées.',
      'Chaque ami montre **son aventure** à côté de son pseudo : « Tennosei — '
      + 'Chasse shiny ».',
      'Les pseudos passent à **douze caractères**. Les plus longs restent valides, '
      + 'mais l’affichage les raccourcit au lieu de déborder.',
      'Les époques de la table des types se lisent dans l’ordre : 1ʳᵉ génération, '
      + 'puis 2ᵉ à 5ᵉ, puis 6ᵉ à 9ᵉ.',
      'La case « apparaître dans la liste des dresseurs » devient un vrai '
      + 'interrupteur.',
    ],
  },
  {
    version: '0.8.0', date: '2026-08-25', titre: 'Les amis',
    points: [
      'Une page **Amis** : suis qui tu veux, et vois passer ce qu’ils attrapent. '
      + 'Une bulle apparaît quand un ami avance — une seule par synchronisation, '
      + 'jamais une par Pokémon.',
      'Les chromatiques de tes amis ont droit à leur propre annonce.',
      'Dans le Profil, tu peux **te retirer de la liste des dresseurs** : tu sors '
      + 'du classement et de la recherche.',
      'La table complète des types s’adapte à l’époque : trois boutons pour lire '
      + 'les règles de la 1ʳᵉ génération, de la 2ᵉ à la 5ᵉ, ou d’aujourd’hui.',
      'Ce bouton-ci, qui te dit ce qui a changé.',
    ],
  },
  {
    version: '0.7.0', date: '2026-08-25', titre: 'Le sélecteur garde ses couleurs',
    points: [
      'Le sélecteur de couleur ne prend plus la teinte qu’on est en train de '
      + 'choisir : on jugeait un vert vif dans une fenêtre elle-même verte.',
    ],
  },
  {
    version: '0.6.0', date: '2026-08-25', titre: 'Un vrai sélecteur de couleur',
    points: [
      'Le choix libre des couleurs n’ouvre plus la boîte de Windows mais un '
      + 'sélecteur maison : carré de teintes, ruban, code hexadécimal, canaux '
      + 'rouge/vert/bleu, et la pipette.',
      'Il affiche le contraste de la couleur choisie, pour dire si le résultat '
      + 'restera lisible.',
    ],
  },
  {
    version: '0.5.0', date: '2026-08-25', titre: 'Le volume, et tes couleurs',
    points: [
      'Le cri a un **volume réglable** — le curseur se déplie quand on approche '
      + 'du bouton. L’icône montre le niveau.',
      'Dans le Profil, **cinq couleurs à choisir** : le fond, le cadran rouge, '
      + 'l’écriture, le fond des cartes, les bordures. Le reste de la palette '
      + 'se déduit toute seule.',
      'Le choix appartient au thème : ce que tu poses en sombre ne suit pas en clair.',
    ],
  },
  {
    version: '0.4.0', date: '2026-08-25', titre: 'Le cri, et les faiblesses d’époque',
    points: [
      'Un bouton dans le coin du portrait **joue le cri du Pokémon**. Sur un '
      + 'Pokédex d’avant la 6ᵉ génération, c’est le cri de la Game Boy.',
      'Les faiblesses suivent la génération du jeu ouvert. Sur Rouge et Bleu, '
      + 'Abra n’est plus annoncé faible au Spectre — qui ne lui faisait aucun '
      + 'dégât — ni aux Ténèbres, qui n’existaient pas.',
    ],
  },
  {
    version: '0.3.0', date: '2026-08-25', titre: 'Discord, et ce qui t’appartient',
    points: [
      'Ta **présence Discord** montre le Pokédex ouvert, ton pseudo et ton aventure.',
      '**Emporter tes données** dans un fichier, depuis le Profil.',
      'Voir et fermer tes **connexions ouvertes** sur d’autres machines.',
      'Un **journal** qui réunit toutes tes aventures, pas seulement celle en cours.',
      'Un bouton pour chercher les mises à jour quand ça te chante.',
    ],
  },
  {
    version: '0.2.0', date: '2026-08-24', titre: 'Cobblemon et les pseudos',
    points: [
      '**Cobblemon** entre dans la Chasse aux chromatiques.',
      'Chaque apparition dit la part qu’elle prend dans son palier de rareté.',
      'Les pseudos et noms d’aventure insultants sont refusés — sans refuser '
      + 'Cassandre ni Scunthorpe.',
    ],
  },
  {
    version: '0.1.0', date: '2026-08-24', titre: 'Première version',
    points: [
      'PokéArchive s’installe et se met à jour tout seul.',
    ],
  },
];

// ---- Ce qui est nouveau pour cette personne ---------------------------------

/** Compare deux « x.y.z ». Rend un nombre négatif, nul ou positif. */
function comparerVersions(a, b){
  const x = String(a).split('.').map(Number);
  const y = String(b).split('.').map(Number);
  for(let i = 0; i < 3; i++){
    const d = (x[i] || 0) - (y[i] || 0);
    if(d) return d;
  }
  return 0;
}

function nouveautesVues(){
  try{ return localStorage.getItem(NOUVEAUTES_VUES_KEY); }catch(e){ return null; }
}

function marquerNouveautesVues(){
  try{ localStorage.setItem(NOUVEAUTES_VUES_KEY, NOUVEAUTES[0].version); }
  catch(e){ /* stockage refusé */ }
}

/**
 * Les versions que cette personne n'a pas encore lues.
 *
 * Sur une installation neuve, rien n'est marqué : on ne va pas accueillir
 * quelqu'un par la liste de ce qu'il a manqué avant d'arriver. On note
 * simplement où il en est, et la pastille servira à la prochaine version.
 */
function nouveautesNonLues(){
  const vues = nouveautesVues();
  if(!vues){ marquerNouveautesVues(); return []; }
  return NOUVEAUTES.filter(function(n){ return comparerVersions(n.version, vues) > 0; });
}

function majPastilleNouveautes(){
  if(!nouveautesBtn) return;
  nouveautesBtn.classList.toggle('a-du-neuf', nouveautesNonLues().length > 0);
}

// ---- L'affichage -------------------------------------------------------------

const NOUVEAUTES_MOIS = ['janvier','février','mars','avril','mai','juin','juillet',
                         'août','septembre','octobre','novembre','décembre'];

function dateNouveaute(iso){
  const p = String(iso).split('-');
  if(p.length !== 3) return iso;
  return Number(p[2]) + ' ' + NOUVEAUTES_MOIS[Number(p[1]) - 1] + ' ' + p[0];
}

/**
 * Le gras d'un point, sans innerHTML.
 *
 * Les textes sont écrits ici, donc sûrs — mais les passer par innerHTML
 * ouvrirait la porte au jour où l'un d'eux viendrait d'ailleurs. Deux
 * astérisques encadrent ce qui compte, et on découpe dessus.
 */
function texteAvecGras(texte){
  const frag = document.createDocumentFragment();
  String(texte).split('**').forEach(function(bout, i){
    if(!bout) return;
    if(i % 2){
      const b = document.createElement('strong');
      b.textContent = bout;
      frag.appendChild(b);
    } else {
      frag.appendChild(document.createTextNode(bout));
    }
  });
  return frag;
}

function blocVersion(n, estNouveau){
  const bloc = document.createElement('div');
  bloc.className = 'nouv-version' + (estNouveau ? ' neuve' : '');

  const tete = document.createElement('div');
  tete.className = 'nouv-tete';

  const num = document.createElement('span');
  num.className = 'nouv-num';
  num.textContent = n.version;

  const titre = document.createElement('span');
  titre.className = 'nouv-titre';
  titre.textContent = n.titre;

  const quand = document.createElement('span');
  quand.className = 'nouv-date';
  quand.textContent = dateNouveaute(n.date);

  tete.appendChild(num);
  tete.appendChild(titre);
  if(estNouveau){
    const marque = document.createElement('span');
    marque.className = 'nouv-marque';
    marque.textContent = 'Nouveau';
    tete.appendChild(marque);
  }
  tete.appendChild(quand);

  const liste = document.createElement('ul');
  liste.className = 'nouv-points';
  n.points.forEach(function(p){
    const li = document.createElement('li');
    li.appendChild(texteAvecGras(p));
    liste.appendChild(li);
  });

  bloc.appendChild(tete);
  bloc.appendChild(liste);
  return bloc;
}

function ouvrirNouveautes(){
  if(!nouveautesOverlay) return;
  const vues = nouveautesVues();
  nouveautesListe.innerHTML = '';
  NOUVEAUTES.forEach(function(n){
    const neuf = !!vues && comparerVersions(n.version, vues) > 0;
    nouveautesListe.appendChild(blocVersion(n, neuf));
  });

  nouveautesOverlay.style.display = 'flex';
  // Lire vaut lecture : la pastille retombe, mais seulement une fois la liste
  // réellement affichée.
  marquerNouveautesVues();
  majPastilleNouveautes();
  setTimeout(function(){ nouveautesFermer.focus(); }, 10);
}

function fermerNouveautes(){
  if(nouveautesOverlay) nouveautesOverlay.style.display = 'none';
}

// ---- Branchements -----------------------------------------------------------

document.addEventListener('DOMContentLoaded', function(){
  if(nouveautesBtn) nouveautesBtn.addEventListener('click', ouvrirNouveautes);
  if(nouveautesFermer) nouveautesFermer.addEventListener('click', fermerNouveautes);
  if(nouveautesOverlay){
    nouveautesOverlay.addEventListener('click', function(e){
      if(e.target === nouveautesOverlay) fermerNouveautes();
    });
  }
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && nouveautesOverlay
       && nouveautesOverlay.style.display === 'flex') fermerNouveautes();
  });
  majPastilleNouveautes();
});
