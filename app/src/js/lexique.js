// Le lexique : ce que veulent dire les mots de l'écran.
// Script classique (pas de module ES) : l'app reste ouvrable en file://
//
// POURQUOI CE FICHIER. Quelqu'un qui arrive croise six mots de jargon dans sa
// première minute — living dex, niveau de formes, shiny-lock, points d'effort,
// STAB, Masuda — et aucun n'était défini nulle part dans l'interface. Les
// définitions justes existaient : elles étaient dans le LISEZMOI, que personne
// n'ouvre. Elles sont ici.
//
// DEUX PORTES, UNE SEULE SOURCE. Le bouton 📖 de l'en-tête ouvre la liste
// entière ; une pastille « ? » posée à côté d'un réglage ouvre la même liste
// sur le bon terme. Écrire la définition deux fois l'aurait fait diverger, et
// c'est exactement ce qui était arrivé aux dates du Cadeau Mystère.
//
// POSER UNE PASTILLE ne demande pas de JavaScript : on écrit
// data-lexique="niveau-formes" sur l'élément, et brancherPastilles() s'en
// charge au chargement. Un réglage ajouté demain n'a qu'un attribut à porter.

const LEXIQUE = [
  {
    groupe: 'Ta collection',
    cle: 'mode-aventure',
    terme: 'Ce que compte une aventure',
    court: 'Pokédex, Pokémon vus, ou Living Dex',
    texte: 'Trois personnes disent « j\'ai 400 Pokémon » et ne parlent pas de '
      + 'la même chose. Le mode se choisit à la création d\'une aventure et ne '
      + 'change pas ce qu\'on enregistre — c\'est la même liste de noms — mais '
      + 'il change ce que cocher VEUT DIRE, et le vocabulaire suit.',
    points: [
      '<b>Pokédex</b> — capturer chaque Pokémon. Faire évoluer un Bulbizarre '
        + 'enregistre les trois stades : une capture remplit trois cases.',
      '<b>Pokémon vus</b> — les avoir croisés, rien de plus. C\'est le compte '
        + 'que tient la console, et ce n\'est pas le même que le tien.',
      '<b>Living Dex</b> — les posséder tous EN MÊME TEMPS. Faire évoluer son '
        + 'Bulbizarre ne laisse plus de Bulbizarre.'
    ],
    voir: ['niveau-formes', 'home']
  },
  {
    groupe: 'Ta collection',
    cle: 'niveau-formes',
    terme: 'Niveau de formes',
    court: 'Jusqu\'où l\'on compte les formes d\'une même espèce',
    texte: 'Combien de cases ton Pokédex contient. Les quatre niveaux sont '
      + 'emboîtés : chacun contient le précédent. Le réglage appartient à '
      + 'l\'aventure et non à l\'ordinateur — c\'est lui qui décide de ton '
      + 'total, et donc de ce à quoi tes amis se comparent.',
    points: [
      '<b>1 · Une forme par espèce</b> — 1 025 entrées.',
      '<b>2 · Avec les régionales</b> — 1 082 : Alola, Galar, Hisui, Paldea.',
      '<b>3 · Avec les alternatives</b> — 1 281 : les noyaux de Météno, les '
        + 'lettres de Zarbi, les motifs de Prismillon. C\'est le niveau par défaut.',
      '<b>4 · Avec mâle / femelle</b> — 1 383 : les espèces dont la femelle se '
        + 'distingue à l\'œil.'
    ],
    voir: ['forme-regionale', 'home']
  },
  {
    groupe: 'Ta collection',
    cle: 'home',
    terme: 'Le périmètre Pokémon HOME',
    court: 'Ce qui se range dans une boîte',
    texte: 'La collection HOME ne montre que ce qui se range dans une boîte. '
      + 'Les formes de combat en sont donc exclues : HOME range le Pokémon, pas '
      + 'ce qu\'il devient le temps d\'un tour. Cela fait 206 entrées écartées '
      + 'sur les 1 351 de la réserve.',
    points: [
      'Elles ne disparaissent pas des Pokédex de jeux pour autant : celui de '
        + 'Légendes Z-A affiche bien ses Méga-Évolutions.'
    ],
    voir: ['forme-combat', 'pokedex-regional']
  },
  {
    groupe: 'Ta collection',
    cle: 'pokedex-regional',
    terme: 'Pokédex régional et Pokédex national',
    court: 'Ceux du jeu, et celui de tous les jeux',
    texte: 'Le <b>Pokédex régional</b> est celui du jeu ouvert : les 151 de '
      + 'Kanto dans Rouge, les 744 de Paldea dans Écarlate. Ses numéros sont '
      + 'ceux de la console, et c\'est dans cet ordre que la grille se trie.<br>'
      + 'Le <b>Pokédex national</b> numérote toutes les espèces d\'affilée, '
      + 'toutes générations confondues. C\'est celui de la collection HOME.',
    voir: ['home']
  },

  {
    groupe: 'Les formes',
    cle: 'forme-regionale',
    terme: 'Forme régionale',
    court: 'Le même Pokémon, un autre climat',
    texte: 'Une espèce qui a pris un autre aspect — et souvent un autre type — '
      + 'dans une région donnée : Raichu d\'Alola, Miaouss de Galar, Feuiloutre '
      + 'de Hisui, Tauros de Paldea. Elle garde le numéro national de son '
      + 'espèce mais compte pour une entrée à part dès le niveau de formes 2.',
    points: [
      'La reproduction, elle, appartient à l\'espèce : un Raichu d\'Alola pond '
        + 'comme un Raichu.'
    ],
    voir: ['niveau-formes', 'groupe-oeuf']
  },
  {
    groupe: 'Les formes',
    cle: 'forme-combat',
    terme: 'Forme de combat',
    court: 'Un état, pas un Pokémon',
    texte: 'Méga-Évolutions, Primo-Résurgences, Gigamax, Totem, Éthernamax, '
      + 'Mode Transe, Palarticho Héros, Terapagos Terastal : des états qui ne '
      + 'durent qu\'un combat. Ils s\'affichent dans le Pokédex des jeux qui '
      + 'les connaissent, mais ne se rangent pas dans une boîte.',
    voir: ['home']
  },

  {
    groupe: 'La chasse',
    cle: 'chromatique',
    terme: 'Pokémon chromatique (« shiny »)',
    court: 'La variante de couleur, une sur quelques milliers',
    texte: 'Un exemplaire à la coloration différente, sans aucun effet en '
      + 'combat. Il se suit ici comme une seconde collection : chaque entrée a '
      + 'sa case normale et sa case chromatique, et les deux sont indépendantes.',
    points: [
      'Le taux de base était de 1 sur 8 192 jusqu\'à la cinquième génération, '
        + 'puis 1 sur 4 096.'
    ],
    voir: ['shiny-lock', 'taux-chasse', 'masuda']
  },
  {
    groupe: 'La chasse',
    cle: 'shiny-lock',
    terme: 'Shiny-lock',
    court: 'Aucun chromatique légitime n\'existe',
    texte: 'Certains Pokémon — les cadeaux du scénario, les légendaires de '
      + 'certains jeux — sont programmés pour ne jamais sortir en chromatique. '
      + 'Les chasser est perdu d\'avance.',
    points: [
      'L\'application les sort du dénominateur chromatique et refuse de les '
        + 'cocher : sans ça, le compteur ne pourrait jamais atteindre son maximum.'
    ],
    voir: ['chromatique']
  },
  {
    groupe: 'La chasse',
    cle: 'taux-chasse',
    terme: 'Taux et probabilité cumulée',
    court: 'Où tu en es, pas ce que dit la boîte',
    texte: 'Le taux dit la chance d\'une rencontre ; la probabilité cumulée dit '
      + 'la chance d\'en avoir eu <b>au moins un</b> après N rencontres. C\'est '
      + 'la seule des deux qui réponde à la vraie question.',
    points: [
      'À 1 sur 4 096, on a 63 % de chances après 4 096 rencontres — et non 100 %. '
        + 'Chaque rencontre est indépendante : le jeu ne se souvient pas.'
    ],
    voir: ['chromatique', 'masuda', 'charme-chroma']
  },
  {
    groupe: 'La chasse',
    cle: 'masuda',
    terme: 'Méthode Masuda',
    court: 'Deux parents de langues différentes',
    texte: 'Faire pondre deux Pokémon venus de jeux de langues différentes '
      + 'multiplie les chances d\'un œuf chromatique — six tirages au lieu d\'un '
      + 'depuis la cinquième génération.',
    points: [
      'Elle ne vaut que pour les œufs : une rencontre sauvage n\'en profite pas.'
    ],
    voir: ['charme-chroma', 'taux-chasse', 'groupe-oeuf']
  },
  {
    groupe: 'La chasse',
    cle: 'charme-chroma',
    terme: 'Charme Chroma',
    court: 'L\'objet qui triple les tirages',
    texte: 'Un objet-clé obtenu en complétant le Pokédex. Il ajoute deux '
      + 'tirages à chaque rencontre — trois au lieu d\'un —, et se cumule avec '
      + 'la méthode Masuda.',
    voir: ['masuda', 'taux-chasse']
  },

  {
    groupe: 'Le combat',
    cle: 'ev',
    terme: 'Points d\'effort (EV)',
    court: 'Ce qu\'un Pokémon gagne en battant les autres',
    texte: 'Chaque adversaire vaincu rapporte de 1 à 3 points dans une '
      + 'statistique précise. Un Pokémon peut en accumuler 252 par statistique '
      + 'et 510 en tout : c\'est ce qui distingue deux exemplaires de la même '
      + 'espèce au même niveau.',
    points: [
      'Quatre points d\'effort valent un point de statistique au niveau 100.',
      'L\'écran <b>Stratégie › Entraînement EV</b> répond à l\'envers : « il me '
        + 'faut de la Vitesse, je bats quoi ? »'
    ],
    voir: ['iv', 'nature']
  },
  {
    groupe: 'Le combat',
    cle: 'iv',
    terme: 'IV (valeurs individuelles)',
    court: 'Le tirage de naissance, de 0 à 31',
    texte: 'Six valeurs tirées au sort à la rencontre ou à l\'éclosion, une par '
      + 'statistique, entre 0 et 31. Elles ne changent jamais. Un 31 vaut 31 '
      + 'points de statistique de plus qu\'un 0 au niveau 100.',
    voir: ['ev', 'nature']
  },
  {
    groupe: 'Le combat',
    cle: 'nature',
    terme: 'Nature',
    court: '+10 % ici, −10 % là',
    texte: 'Vingt-cinq natures. Vingt augmentent une statistique de 10 % et en '
      + 'baissent une autre d\'autant ; cinq sont neutres. Elles ne touchent '
      + 'jamais les PV.',
    voir: ['ev', 'iv']
  },
  {
    groupe: 'Le combat',
    cle: 'stab',
    terme: 'STAB',
    court: 'Bonus de même type',
    texte: '« Same Type Attack Bonus » : une attaque du même type que celui de '
      + 'son lanceur frappe 50 % plus fort. Un Dracaufeu qui utilise '
      + 'Lance-Flammes en profite ; le même Lance-Flammes lancé par un Pikachu, non.',
    voir: ['palier']
  },
  {
    groupe: 'Le combat',
    cle: 'palier',
    terme: 'Palier de statistique',
    court: 'De −6 à +6, et ce n\'est pas ×0,5',
    texte: 'Les changements de statistiques appliquent une fraction et non un '
      + 'nombre à virgule : (2+n)/2 vers le haut, 2/(2−n) vers le bas. Un −1 '
      + 'vaut donc <b>×2/3</b>, et non ×0,5 comme on le lit souvent.',
    points: [
      'Un coup critique ignore les paliers qui arrangeraient le défenseur : les '
        + 'baisses de l\'attaquant et les hausses du défenseur.'
    ],
    voir: ['stab']
  },
  {
    groupe: 'Le combat',
    cle: 'groupe-oeuf',
    terme: 'Groupe d\'œufs',
    court: 'Qui peut pondre avec qui',
    texte: 'Chaque espèce appartient à un ou deux groupes. Pour qu\'une ponte '
      + 'ait lieu, il faut un groupe en commun ET un mâle avec une femelle. Le '
      + 'groupe <b>Inconnu</b> ne se reproduit jamais ; <b>Métamorph</b> se '
      + 'reproduit avec tout le reste.',
    points: [
      'Deux Leveinard, toutes deux femelles, ne pondront donc jamais ensemble '
        + 'malgré leur groupe partagé.'
    ],
    voir: ['masuda', 'forme-regionale']
  },

  {
    groupe: 'Trouver un Pokémon',
    cle: 'taux-rencontre',
    terme: 'Taux de rencontre',
    court: 'La part des rencontres d\'une zone',
    texte: 'Sur une route donnée, chaque espèce occupe un pourcentage des '
      + 'rencontres. Un taux de 5 % veut dire une rencontre sur vingt dans '
      + 'CETTE zone, avec CETTE méthode — pas une chance sur vingt de le '
      + 'trouver dans le jeu.',
    points: [
      'Le relevé donne aussi l\'heure, la météo et la saison quand le jeu les '
        + 'fait compter.'
    ],
    voir: ['chromatique']
  },
  {
    groupe: 'Trouver un Pokémon',
    cle: 'cadeau-mystere',
    terme: 'Cadeau Mystère',
    court: 'Les distributions officielles',
    texte: 'Un Pokémon qui ne se rencontre nulle part et n\'arrive que par une '
      + 'distribution — code sur Internet, boutique, évènement. La page '
      + '« Cadeau Mystère » liste celles qu\'a eues la France, avec leurs dates.',
    points: [
      'Ce qui est passé ne revient pas : un fabuleux manqué ne s\'obtient plus '
        + 'que par échange.'
    ],
    voir: ['transfert']
  },
  {
    groupe: 'Trouver un Pokémon',
    cle: 'transfert',
    terme: 'Transfert',
    court: 'Comment un Pokémon remonte jusqu\'à aujourd\'hui',
    texte: 'Un Pokémon ne se déplace qu\'en avant, et seulement par certains '
      + 'chemins. La page <b>Outils → Transferts</b> donne l\'itinéraire de '
      + 'chaque jeu jusqu\'à Pokémon HOME, et dit lesquels s\'arrêtent.',
    points: [
      'Certains chemins sont à sens unique : ce qui monte dans HOME depuis '
        + 'Let\'s Go, Légendes Arceus ou Pokémon GO n\'en redescend pas.',
      '<b>Les seize jeux 3DS passent tous par la Banque Pokémon</b>, et elle '
        + 's\'arrête. Tant que la date n\'est pas passée, le chemin marche ; '
        + 'après, ce qui y dort n\'a plus aucun moyen de remonter.'
    ],
    voir: ['home', 'cadeau-mystere']
  }
];

const lexiquePar = (function(){
  const m = {};
  LEXIQUE.forEach(function(t){ m[t.cle] = t; });
  return m;
})();

const lexiqueOverlay = document.getElementById('lexiqueOverlay');
const lexiqueListe = document.getElementById('lexiqueListe');
const lexiqueFermer = document.getElementById('lexiqueFermer');
const lexiqueBtn = document.getElementById('lexiqueBtn');
const lexiqueQ = document.getElementById('lexiqueQ');

function blocLexique(t){
  const bloc = document.createElement('div');
  bloc.className = 'lex-terme';
  bloc.id = 'lex-' + t.cle;
  bloc.dataset.cle = t.cle;

  const tete = document.createElement('div');
  tete.className = 'lex-tete';
  const h = document.createElement('h3');
  h.textContent = t.terme;
  const court = document.createElement('span');
  court.className = 'lex-court';
  court.textContent = t.court;
  tete.appendChild(h);
  tete.appendChild(court);
  bloc.appendChild(tete);

  const p = document.createElement('p');
  p.className = 'lex-texte';
  // Les définitions sont écrites ici, dans ce fichier : aucune ne vient d'une
  // saisie. Le HTML n'y sert qu'à mettre trois mots en gras.
  p.innerHTML = t.texte;
  bloc.appendChild(p);

  if(t.points && t.points.length){
    const ul = document.createElement('ul');
    ul.className = 'lex-points';
    t.points.forEach(function(x){
      const li = document.createElement('li');
      li.innerHTML = x;
      ul.appendChild(li);
    });
    bloc.appendChild(ul);
  }

  if(t.voir && t.voir.length){
    const voir = document.createElement('div');
    voir.className = 'lex-voir';
    t.voir.forEach(function(cle){
      const autre = lexiquePar[cle];
      if(!autre) return;
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'lex-lien';
      b.textContent = autre.terme;
      b.addEventListener('click', function(){ viserTerme(cle); });
      voir.appendChild(b);
    });
    if(voir.children.length) bloc.appendChild(voir);
  }
  return bloc;
}

function dessinerLexique(filtre){
  if(!lexiqueListe) return;
  lexiqueListe.innerHTML = '';
  const q = (filtre || '').trim().toLowerCase();
  let groupe = null;
  let combien = 0;
  LEXIQUE.forEach(function(t){
    if(q){
      const dansLeTexte = (t.terme + ' ' + t.court + ' ' + t.texte).toLowerCase();
      if(dansLeTexte.indexOf(q) === -1) return;
    }
    if(t.groupe !== groupe){
      groupe = t.groupe;
      const titre = document.createElement('div');
      titre.className = 'lex-groupe';
      titre.textContent = groupe;
      lexiqueListe.appendChild(titre);
    }
    lexiqueListe.appendChild(blocLexique(t));
    combien++;
  });
  if(!combien){
    lexiqueListe.innerHTML = '<div class="state-msg">Aucun terme ne correspond.</div>';
  }
}

// Met un terme en évidence et l'amène sous les yeux. La surbrillance retombe
// d'elle-même : elle sert à retrouver le terme, pas à le marquer.
function viserTerme(cle){
  const bloc = document.getElementById('lex-' + cle);
  if(!bloc) return;
  lexiqueListe.querySelectorAll('.lex-terme.vise')
    .forEach(function(x){ x.classList.remove('vise'); });
  bloc.classList.add('vise');
  bloc.scrollIntoView({ block: 'center', behavior: 'smooth' });
  setTimeout(function(){ bloc.classList.remove('vise'); }, 2400);
}

function ouvrirLexique(cle){
  if(!lexiqueOverlay) return;
  if(lexiqueQ) lexiqueQ.value = '';
  dessinerLexique('');
  lexiqueOverlay.style.display = 'flex';
  if(cle && lexiquePar[cle]){
    // Après l'affichage : un scrollIntoView sur un élément encore masqué ne
    // fait rien du tout, et le terme visé restait hors de l'écran.
    setTimeout(function(){ viserTerme(cle); }, 20);
  }
  setTimeout(function(){ (lexiqueQ || lexiqueFermer).focus(); }, 10);
}

function fermerLexique(){
  if(lexiqueOverlay) lexiqueOverlay.style.display = 'none';
}

// ---- Les pastilles ----------------------------------------------------------
//
// Un attribut suffit : data-lexique="niveau-formes". La pastille se pose après
// l'élément, jamais dedans — un <select> n'accepte pas d'enfant, et la moitié
// des réglages en sont.

function brancherPastilles(racine){
  (racine || document).querySelectorAll('[data-lexique]').forEach(function(el){
    if(el.dataset.lexiquePosee) return;
    const cle = el.dataset.lexique;
    const t = lexiquePar[cle];
    if(!t) return;                       // clé inconnue : on ne pose rien
    el.dataset.lexiquePosee = '1';
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'lex-pastille';
    b.textContent = '?';
    b.title = t.terme + ' — ' + t.court;
    b.setAttribute('aria-label', 'Qu\'est-ce que « ' + t.terme + '» ?');
    b.addEventListener('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      ouvrirLexique(cle);
    });
    // Le parent d'un <select> stylisé peut être un .select-wrap : on se pose
    // après lui, sinon la pastille se retrouve à l'intérieur du cadre.
    const ancre = el.parentElement && el.parentElement.classList.contains('select-wrap')
      ? el.parentElement : el;
    ancre.insertAdjacentElement('afterend', b);
  });
}

// ---- Branchements -----------------------------------------------------------

document.addEventListener('DOMContentLoaded', function(){
  brancherPastilles(document);
  if(lexiqueBtn) lexiqueBtn.addEventListener('click', function(){ ouvrirLexique(null); });
  if(lexiqueFermer) lexiqueFermer.addEventListener('click', fermerLexique);
  if(lexiqueOverlay){
    lexiqueOverlay.addEventListener('click', function(e){
      if(e.target === lexiqueOverlay) fermerLexique();
    });
  }
  if(lexiqueQ){
    lexiqueQ.addEventListener('input', function(){ dessinerLexique(lexiqueQ.value); });
  }
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && lexiqueOverlay
       && lexiqueOverlay.style.display === 'flex') fermerLexique();
  });
});
