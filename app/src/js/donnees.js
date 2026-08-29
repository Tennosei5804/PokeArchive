// Les Pokémon légendaires, par identifiant d'espèce.
//
// RELEVÉS SUR POKÉPÉDIA, catégorie « Pokémon légendaire », le 25 août 2026 —
// la même source que les lieux, et par la même API MediaWiki. Écrire
// soixante-et-onze numéros de mémoire aurait été le meilleur moyen d'en
// manquer trois et d'en inventer un.
//
// La catégorie compte 84 pages. Deux sont des pages de catégorie, et neuf
// sont des FORMES dont l'espèce figure déjà : Artikodin de Galar, Kyurem
// Blanc, Ultra-Necrozma… Elles se replient donc sur leur espèce, et aucune
// n'est perdue.
//
// Disjointe de FABULEUX, dans cadeaux.js : Poképédia les range dans deux
// catégories séparées, et le jeu aussi. Arceus est fabuleux, pas légendaire.
const LEGENDAIRES = new Set([
  144, 145, 146, 150, 243, 244, 245, 249, 250, 377, 378, 379,
  380, 381, 382, 383, 384, 480, 481, 482, 483, 484, 485, 486,
  487, 488, 638, 639, 640, 641, 642, 643, 644, 645, 646, 716,
  717, 718, 772, 773, 785, 786, 787, 788, 789, 790, 791, 792,
  800, 888, 889, 890, 891, 892, 894, 895, 896, 897, 898, 905,
  1001, 1002, 1003, 1004, 1007, 1008, 1014, 1015, 1016, 1017, 1024,
]);

// Types, en francais. Les 18 identifiants de PokeAPI sont stables depuis la
// generation 6, on peut donc les figer plutot que de telecharger types.csv.
// Ce que Pokémon HOME n'accepte pas en boîte.
//
// La règle est dérivée du relevé Pokékalos (voir donnees-home.js) : on a comparé
// espèce par espèce ce que l'application proposait et ce que HOME accepte
// vraiment, puis écrit les règles jusqu'à ce que l'écart tombe à zéro. Il reste
// une entrée d'écart sur 1384, faute de données — voir plus bas.
//
// Le fil conducteur : **HOME range le Pokémon, pas l'état dans lequel il
// combat.** Une Méga-Évolution, un Motif Zen, un Mimiqui démasqué, un Palarticho
// en mode héros : ce sont des états, pas des Pokémon distincts.
//
// Rien de tout cela ne quitte la réserve : les Pokédex de jeux continuent de
// lire poolEntries(), et celui de Légendes Z-A recense bien ses Méga. Seul le
// périmètre HOME est concerné.

// 1. Ce qui se reconnaît à son suffixe.
const HORS_HOME_SUFFIXES = [
  /-mega(-|$)/,          // Méga-Évolutions
  /-primal$/,            // Primo-Résurgences
  /-eternamax$/,         // Éthernatos
  /-gmax$/,              // Gigamax : un facteur porté par le Pokémon, pas une entrée
  /-totem(-|$)/,         // Totems d'Alola : ils reprennent leur taille, increcupérables
  /-power-construct$/,   // Synergie est un talent, pas une forme
  /-build$/,             // les montures de Koraidon
  /-mode$/               // celles de Miraidon
];

// 2. Les familles entières dont HOME ne garde que la forme de base : la forme
//    y dépend d'un objet tenu ou d'un talent, et se défait dès qu'on le retire.
const HORS_HOME_FAMILLES = [
  /^arceus-/,            // les 18 plaques
  /^silvally-/,          // les 17 disques ROM
  /^genesect-/,          // les 4 modules
  /^castform-/,          // les 3 climats
  /^mothim-/             // les capes de Papilord, invisibles de toute façon
];

// 3. Le reste, nommé un par un. Fusions, transformations en combat, et deux
//    variantes qu'un jeu précis ne laisse pas transférer.
const HORS_HOME_NOMMES = new Set((
  // Pikachu Cosplay (Rubis Oméga) et les partenaires de Let's Go : increcupérables.
  'pikachu-rock-star pikachu-belle pikachu-pop-star pikachu-phd pikachu-libre '
  + 'pikachu-cosplay pikachu-starter eevee-starter '
  // Fusions et formes légendaires alternatives.
  + 'zygarde-10-power-construct zygarde-50-power-construct zygarde-complete '
  + 'necrozma-dusk necrozma-dawn necrozma-ultra kyurem-black kyurem-white '
  + 'calyrex-ice calyrex-shadow zacian-crowned zamazenta-crowned '
  + 'dialga-origin palkia-origin giratina-origin '
  // Formes tenues à un objet ou à un masque.
  + 'ogerpon-wellspring-mask ogerpon-hearthflame-mask ogerpon-cornerstone-mask '
  + 'terapagos-terastal terapagos-stellar '
  // Transformations qui surviennent en combat.
  + 'darmanitan-zen darmanitan-galar-zen greninja-battle-bond greninja-ash '
  + 'cramorant-gulping cramorant-gorging meloetta-pirouette aegislash-blade '
  + 'wishiwashi-school eiscue-noice morpeko-hangry mimikyu-busted palafin-hero '
  // Contrefaçons et curiosités.
  + 'sinistea-antique poltchageist-artisan sinistcha-masterpiece '
  + 'pichu-spiky-eared rockruff-own-tempo '
  // Météno : le relevé compte sept noyaux, pas sept noyaux ET sept météores.
  + 'minior-red minior-orange minior-yellow minior-green minior-blue '
  + 'minior-indigo minior-violet'
).split(' '));

/**
 * Cette entrée peut-elle se ranger dans une boîte de Pokémon HOME ?
 *
 * Écart connu : Farfuret de Hisui ♀ manque, PokeAPI ne la modélisant pas comme
 * une forme distincte. Une entrée sur 1384 — c'est tout ce qui sépare le
 * périmètre de l'application du relevé.
 */
function horsDeHome(nom){
  const n = String(nom || '');
  if(HORS_HOME_SUFFIXES.some(function(r){ return r.test(n); })) return true;
  if(HORS_HOME_FAMILLES.some(function(r){ return r.test(n); })) return true;
  return HORS_HOME_NOMMES.has(n);
}

const TYPES_FR = {
  1: 'Normal', 2: 'Combat', 3: 'Vol', 4: 'Poison', 5: 'Sol', 6: 'Roche',
  7: 'Insecte', 8: 'Spectre', 9: 'Acier', 10: 'Feu', 11: 'Eau', 12: 'Plante',
  13: 'Électrik', 14: 'Psy', 15: 'Glace', 16: 'Dragon', 17: 'Ténèbres', 18: 'Fée'
};

// Les six statistiques, dans l'ordre de la reserve : PV, Attaque, Defense,
// Attaque Speciale, Defense Speciale, Vitesse.
//
// Une seule table pour toute l'application. Il y en avait trois — une par
// fichier qui en avait besoin — et elles avaient deja diverge : la fiche
// affichait « Attaque Spe. » quand le calculateur ecrivait « AtS ». Les noms
// courts a l'anglaise se lisent d'un coup d'oeil et tiennent dans une colonne
// de tableau, ce que « Attaque Speciale » ne fait pas.
const STATS_NOMS = ['HP', 'Atk', 'Def', 'Atk Spé', 'Def Spé', 'Spd'];

// Les mêmes en toutes lettres. Les abréviations vont bien à une grille serrée
// — la page Stratégie, le calculateur — mais une fiche a la place de nommer
// les choses, et « Atk Spé » n'est le nom d'une statistique dans aucun jeu.
const STATS_NOMS_LONGS = ['PV', 'Attaque', 'Défense', 'Atq. Spé.', 'Déf. Spé.', 'Vitesse'];

// Le taux de genre de PokeAPI se compte en huitiemes de femelles : 0 = toujours
// male, 8 = toujours femelle, -1 = asexue. On le traduit ici plutot qu'a chaque
// affichage, parce que la valeur brute ne se lit pas.
function lireGenre(taux){
  if(taux === undefined || taux === null || taux === -1){
    return { asexue: true, texte: 'Asexué', femelle: null, male: null };
  }
  const femelle = taux / 8 * 100;
  const male = 100 - femelle;
  let texte;
  if(taux === 0) texte = '100 % mâle';
  else if(taux === 8) texte = '100 % femelle';
  else {
    // Un seul chiffre apres la virgule : 12,5 et 87,5 sont exacts, et les
    // arrondir a l'entier donnerait 13 / 88, qui ne font pas 100.
    const f = Number.isInteger(femelle) ? femelle : femelle.toFixed(1).replace('.', ',');
    const m = Number.isInteger(male) ? male : male.toFixed(1).replace('.', ',');
    texte = m + ' % mâle · ' + f + ' % femelle';
  }
  return { asexue: false, texte: texte, femelle: femelle, male: male };
}

// Les trois facons de tenir un Pokedex, et le mot qui va avec.
//
// Le mode ne change pas ce qu'on enregistre — c'est la meme liste de noms —
// mais il change ce que cocher veut dire. Ecrire « Capture » a quelqu'un qui
// tient un Pokedex de rencontres est faux ; « En boite » a quelqu'un qui a fait
// evoluer son Bulbizarre l'est tout autant.
//
// La table vit ici, avec les types et les statistiques : compte.js n'est pas
// charge par les pages de generation, et la grille a besoin du mot.
const MODES_DEX = {
  capture: { court:'Pokédex', icone:'📕',
             titre:'Pokédex — capturer chaque Pokémon',
             aide:'Un Pokémon capturé compte, même si tu l\'as fait évoluer ensuite.',
             verbe:'Capturé', pluriel:'Capturés', verbeMin:'capturé', action:'Capturer' },
  vu:      { court:'Vus', icone:'👁️',
             titre:'Pokémon vus — les avoir rencontrés',
             aide:'Il suffit de l\'avoir croisé une fois.',
             verbe:'Vu', pluriel:'Vus', verbeMin:'vu', action:'Marquer comme vu' },
  living:  { court:'Living Dex', icone:'📦',
             titre:'Living Dex — les posséder tous en même temps',
             aide:'Chaque espèce présente en boîte, simultanément. Faire évoluer un '
                + 'Bulbizarre ne suffit plus : il en faut un de chaque stade.',
             // Invariable : « en boîtes » ne se dit pas.
             verbe:'En boîte', pluriel:'En boîte', verbeMin:'en boîte',
             action:'Ranger en boîte' }
};

function infoMode(cle){ return MODES_DEX[cle] || MODES_DEX.capture; }

// Le mode de l'aventure ouverte. profilCourant vit dans compte.js, absent des
// pages de generation : sans lui on retombe sur le Pokedex ordinaire.
function modeCourant(){
  return (typeof profilCourant !== 'undefined' && profilCourant && profilCourant.mode)
    ? profilCourant.mode : 'capture';
}

// Ce qui ne peut pas être chromatique — trois tables, trois affirmations
// différentes qu'il ne faut surtout pas confondre.
//
// SOURCE : le Dossier Shasse de Pokébip, page « Les Pokémon Shiny Lock ».
//   https://www.pokebip.com/page/jeux-video/dossier-shasse/impossibles
// C'est un relevé de dataminers : ni Nintendo, ni Game Freak, ni The Pokémon
// Company ne publient cette information. Elle se corrige donc de temps en temps,
// et ces tables se relisent à chaque nouveau jeu.
//
// RELEVÉ LE 29 AOÛT 2026. Les numéros nationaux ont été résolus depuis les noms
// français contre donnees-embarquees.js, jamais écrits de mémoire : c'est la
// réserve qui a répondu, et les quarante-deux noms sont tombés sans exception.

// 1. VERROUILLÉ PARTOUT : aucun exemplaire chromatique légitime n'existe, dans
//    aucun jeu, par aucune voie. C'est la seule table qui autorise la phrase
//    « nulle part ».
const SHINY_LOCKED = new Set([
  494,                    // Victini
  647, 648, 649,          // Keldeo, Meloetta, Genesect
  719, 720, 721,          // Diancie, Hoopa, Volcanion
  789, 790,               // Cosmog, Cosmovum
  801, 802,               // Magearna, Marshadow
  807, 808, 809,          // Zeraora, Meltan, Melmetal
  888, 889, 890,          // Zacian, Zamazenta, Éthernatos
  891, 892, 893,          // Wushours, Shifours, Zarude
  896, 897, 898,          // Blizzeval, Spectreval, Sylveroy
  905,                    // Amovénus
  1001, 1002, 1003, 1004, // Les quatre Trésors Funestes
  1007, 1008,             // Koraidon, Miraidon
  1009, 1010,             // Serpente-Eau, Vert-de-Fer
  1014, 1015, 1016, 1017, // Félicanis, Fortusimia, Favianos, Ogerpon
  1020, 1021, 1022, 1023, // Feu-Perçant, Ire-Foudre, Roc-de-Fer, Chef-de-Fer
  1024, 1025              // Terapagos, Pêchaminus
]);

// 2. PAS AU TAUX AMÉLIORÉ : ceux-là PEUVENT être chromatiques. Le Charme Chroma
//    et les autres bonus ne s'appliquent simplement pas à eux.
//
//    LA DISTINCTION N'EST PAS COSMÉTIQUE. Ces huit-là figuraient dans
//    SHINY_LOCKED, et l'application annonçait donc « aucun exemplaire légitime
//    n'existe » à propos de Solgaleo. C'est faux, et c'est le genre de fausseté
//    qui fait renoncer à une chasse parfaitement possible.
const TAUX_PLEIN_SEUL = new Set([
  718,                    // Zygarde
  785, 786, 787, 788,     // Tokorico, Tokopiyon, Tokotoro, Tokopisco
  791, 792, 800           // Solgaleo, Lunala, Necrozma
]);

// 3. VERROUILLÉ ICI, PAS AILLEURS — et le relevé NOMME l'espèce.
//
//    Le verrou porte sur une RENCONTRE : le Ronflex qui bloque la Route 6 est
//    verrouillé, les Ronflex sauvages ne le sont pas. D'où `quoi`, qui dit de
//    quelle rencontre il s'agit — sans lui, la ligne accuse l'espèce entière.
const VERROUS_PAR_JEU = [
  { espece: 16, jeux: ['xy'], quoi: 'le scripté de la Route 2' },
  { espece: 21, jeux: ['hgss'], quoi: 'offert à Doublonville' },
  { espece: 25, jeux: ['letsgo'], quoi: 'le starter, sur Let’s Go Pikachu' },
  { espece: 79, jeux: ['swsh'], quoi: 'celui de Galar, Gare de Brasswick' },
  { espece: 133, jeux: ['bw', 'b2w2'], quoi: 'celui de Boletta, capacité cachée' },
  { espece: 143, jeux: ['xy'], quoi: 'celui qui bloque la Route 6' },
  { espece: 144, jeux: ['xy'], quoi: 'Antre Néréen' },
  { espece: 145, jeux: ['xy'], quoi: 'Antre Néréen' },
  { espece: 146, jeux: ['xy'], quoi: 'Antre Néréen' },
  { espece: 150, jeux: ['xy'], quoi: 'Grotte Inconnue' },
  { espece: 151, jeux: ['bdsp'], quoi: 'offert avec une sauvegarde Let’s Go' },
  { espece: 213, jeux: ['hgss'], quoi: 'offert à Irisia' },
  { espece: 261, jeux: ['oras'], quoi: 'l’incapturable de la Route 101' },
  { espece: 265, jeux: ['oras'], quoi: 'le scripté de la Route 101' },
  { espece: 382, jeux: ['oras'], quoi: 'Grotte Origine, sur Saphir Alpha' },
  { espece: 383, jeux: ['oras'], quoi: 'Grotte Origine, sur Rubis Oméga' },
  { espece: 384, jeux: ['oras'], quoi: 'Pilier Céleste' },
  { espece: 385, jeux: ['bdsp'], quoi: 'offert avec une sauvegarde Épée / Bouclier' },
  { espece: 386, jeux: ['oras'], quoi: 'l’Espace ou le Pilier Céleste' },
  { espece: 448, jeux: ['xy'], quoi: 'offert par Cornélia' },
  { espece: 490, jeux: ['bdsp'], quoi: 'distribué au lancement' },
  { espece: 570, jeux: ['bw', 'b2w2'], quoi: 'celui de Volucité' },
  { espece: 571, jeux: ['bw', 'b2w2'], quoi: 'le sauvage du Bois des Illusions' },
  { espece: 585, jeux: ['bw', 'b2w2'], quoi: 'celui du Scientifique, capacité cachée' },
  { espece: 643, jeux: ['bw', 'b2w2'], quoi: 'Palais de N ou Tour Dragospire' },
  { espece: 644, jeux: ['bw', 'b2w2'], quoi: 'Palais de N ou Tour Dragospire' },
  { espece: 716, jeux: ['xy'], quoi: 'Repaire Team Flare, sur X' },
  { espece: 717, jeux: ['xy'], quoi: 'Repaire Team Flare, sur Y' },
  { espece: 822, jeux: ['swsh'], quoi: 'le sauvage de la Route 3' }
];

// 4. VERROUILLÉ ICI, PAS AILLEURS — mais le relevé décrit une CATÉGORIE.
//
//    « Tous les Pokémon offerts sur Épée et Bouclier, sauf les fossiles » ne se
//    convertit pas en lignes espèce par espèce : il faudrait d'abord savoir
//    lesquels sont offerts, et la réserve ne le dit pas. Prétendre le contraire
//    produirait une liste fausse à moitié.
//
//    ON GARDE DONC LA PHRASE. Elle ne se filtre pas, ne se compte pas, ne se
//    coche pas — elle s'affiche quand on choisit le jeu, et elle répond quand
//    même à la question posée : « qu'est-ce qui va me bloquer ici ». C'est de là
//    que venaient mes neuf lignes de starters, écrites de mémoire et à moitié
//    inexactes ; la phrase de la source vaut mieux que ma reconstitution.
const REGLES_VERROU = [
  { jeux: ['gsc', 'cristal'], texte: 'Tous les Zarbi, sauf les lettres I et V.' },
  { jeux: ['gsc', 'cristal'], texte: 'Toute femelle d’une espèce qui n’a que 12,5 % de chances de l’être — starters, Ronflex…' },
  { jeux: ['hgss'], texte: 'Tous les Pokémon du Pokéwalker.' },
  { jeux: ['dp', 'pt', 'hgss'], texte: 'L’œuf de Manaphy venu des jeux Pokémon Ranger.' },
  { jeux: ['bw', 'b2w2'], texte: 'Tous les Pokémon de la Forêt du Heylink, ceux de N, et ceux des Trouées Cachées.' },
  { jeux: ['xy'], texte: 'Les herbes rapides du Poké Radar.' },
  { jeux: ['sm', 'usum'], texte: 'Les Pokémon capturables pendant chaque Épreuve.' },
  { jeux: ['sm'], texte: 'Toutes les Ultra-Chimères.' },
  { jeux: ['usum'], texte: 'Les Pokémon Dominants donnés par Chen, les Électrode du Château Rocket, les Scarabrute fixes de l’Île Noadkoko, et les Pokémon des mini-quêtes — sauf les Métamorph d’Akala.' },
  { jeux: ['swsh'], texte: 'Tous les Pokémon offerts, sauf les fossiles.' },
  { jeux: ['swsh'], texte: 'Les Pokémon des Terres Sauvages trop forts pour tes badges — mais pas les fixes, comme l’Onix près de la Gare du Sentier.' },
  { jeux: ['swsh'], texte: 'Les Légendaires et Fabuleux, sauf ceux des Expéditions Dynamax, les six Titans (Regi-), Cobaltium, Terrakium et Viridium.' },
  { jeux: ['pla'], texte: 'Tous les Pokémon offerts, et tous ceux des missions principales et secondaires.' },
  { jeux: ['pla'], texte: 'Les Zarbi éparpillés dans Hisui, et tous les Légendaires et Fabuleux.' },
  { jeux: ['sv'], texte: 'Les Pokémon qui s’envolent au loin, les fixes uniques (Ursaking, tutoriels de capture…), et les Mordudor forme Coffre fixes.' },
  { jeux: ['sv'], texte: 'Tous les Légendaires et Fabuleux.' },
  { jeux: ['za'], texte: 'Tous les Pokémon offerts sauf les fossiles, et tous ceux des missions principales et secondaires.' },
  { jeux: ['za'], texte: 'Les Wattouat, tant que la mission secondaire 017 n’est pas finie.' },
  { jeux: ['za'], texte: 'Les Légendaires et Fabuleux, sauf Latias, Latios, Cobaltium, Terrakium et Viridium.' }
];

// Living Dex - donnees statiques.
// Charge avant app.js ; volontairement en script classique (pas de module ES)
// pour que l'application continue de fonctionner en ouverture directe file://.

  const GEN_RANGES = [
    { gen: 1, name: 'Génération 1 — Kanto', min: 1, max: 151 },
    { gen: 2, name: 'Génération 2 — Johto', min: 152, max: 251 },
    { gen: 3, name: 'Génération 3 — Hoenn', min: 252, max: 386 },
    { gen: 4, name: 'Génération 4 — Sinnoh', min: 387, max: 493 },
    { gen: 5, name: 'Génération 5 — Unys', min: 494, max: 649 },
    { gen: 6, name: 'Génération 6 — Kalos', min: 650, max: 721 },
    { gen: 7, name: 'Génération 7 — Alola', min: 722, max: 809 },
    { gen: 8, name: 'Génération 8 — Galar / Hisui', min: 810, max: 905 },
    { gen: 9, name: 'Génération 9 — Paldea', min: 906, max: 1025 }
  ];

  // Approximate French translations for common form/variant suffixes.
  // Official per-form French names aren't available in bulk, so this is
  // a best-effort translation, not a guaranteed exact match to the games.
  const SUFFIX_FR = {
    alola:'Alola', alolan:'Alola',
    galar:'Galar', galarian:'Galar',
    hisui:'Hisui', hisuian:'Hisui',
    paldea:'Paldea', paldean:'Paldea',
    mega:'Méga', gmax:'Gigamax', gigantamax:'Gigamax',
    totem:'Totem', female:'femelle', male:'mâle',
    origin:'origine', altered:'altérée', sky:'céleste', land:'terrestre',
    plant:'plante', sandy:'sable', trash:'détritus',
    heat:'feu', wash:'lavage', frost:'givre', fan:'ventilateur', mow:'tonte',
    zen:'zen', standard:'standard', blade:'lame', shield:'bouclier',
    sunny:'ensoleillée', rainy:'pluvieuse', snowy:'neigeuse',
    dawn:'aube', midnight:'minuit', dusk:'crépuscule', midday:'midi',
    ultra:'ultra', primal:'primale', eternamax:'Éternamax',
    crowned:'couronnée', hero:'héros', incarnate:'incarnation', therian:'avatar',
    complete:'complète', school:'banc', solo:'solo',
    small:'petite', large:'grande', super:'super', average:'moyenne',
    red:'rouge', blue:'bleu', white:'blanc', black:'noir', yellow:'jaune',
    east:'est', west:'ouest', noice:'Meugliomiam', ice:'glace', face:'visage',
    amped:'survolté', low:'placide', key:'', full:'plein', belly:'ventre',
    hangry:'affamé', roaming:'nomade', battle:'combat', x:'X', y:'Y',
    striped:'rayé', plumage:'plumage', family:'famille', cap:'casquette',
    starter:'starter', partner:'partenaire', own:'propre', tenant:'tenant'
  };

  // Pokémon Showdown's "home" sprite set uses its own slug convention,
  // slightly different from PokeAPI's. Most regional/mega/gmax suffixes
  // match directly; these are the known exceptions.
  const SHOWDOWN_COMPRESSIONS = [
    ['mr-mime','mrmime'], ['mr-rime','mrrime'], ['mime-jr','mimejr'],
    ['ho-oh','hooh'], ['porygon-z','porygonz'],
    ['jangmo-o','jangmoo'], ['hakamo-o','hakamoo'], ['kommo-o','kommoo'],
    ['type-null','typenull'],
    ['tapu-koko','tapukoko'], ['tapu-lele','tapulele'], ['tapu-bulu','tapubulu'], ['tapu-fini','tapufini'],
    ['nidoran-f','nidoranf'], ['nidoran-m','nidoranm'],
    ['wo-chien','wochien'], ['chien-pao','chienpao'], ['ting-lu','tinglu'], ['chi-yu','chiyu'],
    ['great-tusk','greattusk'], ['scream-tail','screamtail'], ['brute-bonnet','brutebonnet'],
    ['flutter-mane','fluttermane'], ['slither-wing','slitherwing'], ['sandy-shocks','sandyshocks'],
    ['iron-treads','irontreads'], ['iron-bundle','ironbundle'], ['iron-hands','ironhands'],
    ['iron-jugulis','ironjugulis'], ['iron-moth','ironmoth'], ['iron-thorns','ironthorns'],
    ['iron-valiant','ironvaliant'], ['iron-leaves','ironleaves'], ['iron-boulder','ironboulder'],
    ['iron-crown','ironcrown'], ['roaring-moon','roaringmoon'], ['walking-wake','walkingwake'],
    ['gouging-fire','gougingfire'], ['raging-bolt','ragingbolt']
  ];

  // ---- Pokédex par jeu ---------------------------------------------------
  // « regional » = le Pokédex régional du jeu. « national » = ce que le jeu
  // « second » = le deuxième Pokédex du jeu, quand il en a un :
  //   kind 'national' -> un vrai Pokédex National (Diamant/Perle : 493 espèces)
  //   kind 'dlc'      -> pas de Dex National, mais des extensions (Épée/Bouclier,
  //                      Écarlate/Violet) — le bouton s'appelle alors « DLC »
  //   second: null    -> le jeu s'arrête à son Pokédex régional : aucun bouton
  //                      n'est affiché
  //   noteRegionale   -> ce qu'il faut savoir du Pokédex régional. Elle
  //                      s'affiche toujours sur la vue régionale, et sert
  //                      d'avertissement quand il n'y a pas de second.
  //   dexes : listes officielles récupérées sur PokeAPI
  //   upTo  : « toutes les espèces jusqu'au n° X », pour les vrais Dex Nationaux
  const GAMES = [
    {
      // La clé date de l'époque où Jaune partageait cet onglet : c'est sous ce
      // nom que la progression est enregistrée, la renommer la perdrait.
      key: 'rby',
      tab: '🔴 Rouge / Bleu',
      title: 'Pokémon Rouge / Bleu',
      machine: 'Game Boy',
      visuels: ['rouge-bleu'],
      versions: ['red', 'blue'],
      region: null, mega: false, gmax: false,
      regional: { label: 'Pokédex de Kanto', dexes: ['kanto'] },
      second: null,
      noteRegionale: 'La première génération s\'arrête aux 151 espèces de Kanto.'
    },
    {
      key: 'jaune',
      tab: '🟡 Jaune',
      title: 'Pokémon Jaune',
      machine: 'Game Boy',
      visuels: ['jaune'],
      versions: ['yellow'],
      region: null, mega: false, gmax: false,
      regional: { label: 'Pokédex de Kanto', dexes: ['kanto'] },
      second: null,
      noteRegionale: 'Jaune reprend le Pokédex de Kanto : les mêmes 151 espèces.'
    },
    {
      // Même raison que pour 'rby' : la clé englobait Cristal, elle reste.
      key: 'gsc',
      tab: '🥇 Or / Argent',
      title: 'Pokémon Or / Argent',
      machine: 'Game Boy Color',
      visuels: ['or-argent'],
      versions: ['gold', 'silver'],
      region: null, mega: false, gmax: false,
      regional: { label: 'Pokédex de Johto', dexes: ['original-johto'] },
      second: null,
      noteRegionale: 'Le Pokédex de Johto contient les 251 espèces des deux premières générations.'
    },
    {
      key: 'cristal',
      tab: '🔷 Cristal',
      title: 'Pokémon Cristal',
      machine: 'Game Boy Color',
      visuels: ['cristal'],
      versions: ['crystal'],
      region: null, mega: false, gmax: false,
      regional: { label: 'Pokédex de Johto', dexes: ['original-johto'] },
      second: null,
      noteRegionale: 'Cristal reprend le Pokédex de Johto : les mêmes 251 espèces.'
    },
    {
      // Même raison que pour 'rby' : la clé englobait Émeraude, elle reste.
      key: 'rse',
      tab: '🟢 Rubis / Saphir',
      title: 'Pokémon Rubis / Saphir',
      machine: 'Game Boy Advance',
      visuels: ['rubis-saphir'],
      versions: ['ruby', 'sapphire'],
      region: null, mega: false, gmax: false,
      regional: { label: 'Pokédex de Hoenn', dexes: ['hoenn'] },
      second: null,
      noteRegionale: 'Le Pokédex de Hoenn compte 202 espèces ; le National ne s\'obtient qu\'en échangeant.'
    },
    {
      key: 'emeraude',
      tab: '💚 Émeraude',
      title: 'Pokémon Émeraude',
      machine: 'Game Boy Advance',
      visuels: ['emeraude'],
      versions: ['emerald'],
      region: null, mega: false, gmax: false,
      regional: { label: 'Pokédex de Hoenn', dexes: ['hoenn'] },
      second: null,
      noteRegionale: 'Émeraude reprend le Pokédex de Hoenn : les mêmes 202 espèces.'
    },
    {
      key: 'frlg',
      tab: '🔥 Rouge Feu / Vert Feuille',
      title: 'Pokémon Rouge Feu / Vert Feuille',
      machine: 'Game Boy Advance',
      visuels: ['rouge-feu-vert-feuille'],
      versions: ['firered', 'leafgreen'],
      region: null, mega: false, gmax: false,
      regional: { label: 'Pokédex de Kanto', dexes: ['kanto'] },
      second: {
        kind: 'national',
        label: 'Pokédex National',
        upTo: 386,
        note: 'Il s\'ouvre après la Ligue. Prudence toutefois : l\'essentiel de ce qu\'il liste ne se capture pas dans le jeu, seul le Pokédex de Kanto dit ce qui s\'y attrape vraiment.'
      },
      noteRegionale: 'Rouge Feu / Vert Feuille débloquent bien un Pokédex National après la Ligue, mais aucune espèce hors Kanto ne s\'y capture : seules les 151 de Kanto sont réellement obtenables dans le jeu.'
    },
    {
      key: 'dp',
      tab: '💠 Diamant / Perle',
      title: 'Pokémon Diamant / Perle',
      machine: 'Nintendo DS',
      visuels: ['diamant-perle'],
      versions: ['diamond', 'pearl'],
      region: null, mega: false, gmax: false,
      regional: { label: 'Pokédex de Sinnoh', dexes: ['original-sinnoh'] },
      second: {
        kind: 'national',
        label: 'Pokédex National',
        upTo: 493,
        note: 'Les 493 espèces des générations 1 à 4. Il s\'ouvre en cours de partie, une fois le Pokédex régional bien avancé.'
      },
      noteRegionale: 'Le Pokédex de Sinnoh d\'origine s\'arrête à 151 espèces ; Platine l\'étend à 210.'
    },
    {
      key: 'pt',
      tab: '⚪ Platine',
      title: 'Pokémon Platine',
      machine: 'Nintendo DS',
      visuels: ['platine'],
      versions: ['platinum'],
      region: null, mega: false, gmax: false,
      regional: { label: 'Pokédex de Sinnoh étendu', dexes: ['extended-sinnoh'] },
      second: {
        kind: 'national',
        label: 'Pokédex National',
        upTo: 493,
        note: 'Les 493 espèces des générations 1 à 4. Il s\'ouvre en cours de partie, une fois le Pokédex régional bien avancé.'
      },
      noteRegionale: 'Platine étend le Pokédex de Sinnoh à 210 espèces.'
    },
    {
      key: 'hgss',
      tab: '🔔 Or HeartGold / Argent SoulSilver',
      title: 'Pokémon Or HeartGold / Argent SoulSilver',
      machine: 'Nintendo DS',
      visuels: ['heartgold-soulsilver'],
      versions: ['heartgold', 'soulsilver'],
      region: null, mega: false, gmax: false,
      regional: { label: 'Pokédex de Johto mis à jour', dexes: ['updated-johto'] },
      second: {
        kind: 'national',
        label: 'Pokédex National',
        upTo: 493,
        note: 'Les 493 espèces des générations 1 à 4. Il s\'ouvre en cours de partie, une fois le Pokédex régional bien avancé.'
      },
      noteRegionale: 'Le Pokédex de Johto des remakes compte 256 espèces.'
    },
    {
      key: 'bw',
      tab: '⚫ Noir / Blanc',
      title: 'Pokémon Noir / Blanc',
      machine: 'Nintendo DS',
      visuels: ['noire-blanche'],
      versions: ['black', 'white'],
      region: null, mega: false, gmax: false,
      regional: { label: 'Pokédex d\'Unys', dexes: ['original-unova'] },
      second: {
        kind: 'national',
        label: 'Pokédex National',
        upTo: 649,
        note: 'Les 649 espèces des générations 1 à 5. Il s\'ouvre en cours de partie, une fois le Pokédex régional bien avancé.'
      },
      noteRegionale: 'Noir et Blanc n\'acceptent que les 156 espèces d\'Unys avant la Ligue.'
    },
    {
      key: 'b2w2',
      tab: '⬛ Noir 2 / Blanc 2',
      title: 'Pokémon Noir 2 / Blanc 2',
      machine: 'Nintendo DS',
      visuels: ['noire-2-blanche-2'],
      versions: ['black-2', 'white-2'],
      region: null, mega: false, gmax: false,
      regional: { label: 'Pokédex d\'Unys étendu', dexes: ['updated-unova'] },
      second: {
        kind: 'national',
        label: 'Pokédex National',
        upTo: 649,
        note: 'Les 649 espèces des générations 1 à 5. Il s\'ouvre en cours de partie, une fois le Pokédex régional bien avancé.'
      },
      noteRegionale: 'Les suites étendent le Pokédex d\'Unys à 301 espèces.'
    },
    {
      key: 'xy',
      tab: '🦋 X / Y',
      title: 'Pokémon X / Y',
      machine: 'Nintendo 3DS',
      visuels: ['x-y'],
      versions: ['x', 'y'],
      region: null, mega: true, gmax: false,
      regional: { label: 'Pokédex de Kalos', dexes: ['kalos-central', 'kalos-coastal', 'kalos-mountain'] },
      second: {
        kind: 'national',
        label: 'Pokédex National',
        upTo: 721,
        note: 'Les 721 espèces des générations 1 à 6. Il s\'ouvre en cours de partie, une fois le Pokédex régional bien avancé.'
      },
      noteRegionale: 'Kalos se divise en trois Pokédex — Centre, Côte et Montagne — réunis ici.'
    },
    {
      key: 'oras',
      tab: '🌊 Rubis Oméga / Saphir Alpha',
      title: 'Pokémon Rubis Oméga / Saphir Alpha',
      machine: 'Nintendo 3DS',
      visuels: ['rubis-omega-saphir-alpha'],
      versions: ['omega-ruby', 'alpha-sapphire'],
      region: null, mega: true, gmax: false,
      regional: { label: 'Pokédex de Hoenn mis à jour', dexes: ['updated-hoenn'] },
      second: {
        kind: 'national',
        label: 'Pokédex National',
        upTo: 721,
        note: 'Les 721 espèces des générations 1 à 6. Il s\'ouvre en cours de partie, une fois le Pokédex régional bien avancé.'
      },
      noteRegionale: 'Le Pokédex de Hoenn des remakes compte 211 espèces.'
    },
    {
      key: 'sm',
      tab: '🌺 Soleil / Lune',
      title: 'Pokémon Soleil / Lune',
      machine: 'Nintendo 3DS',
      visuels: ['soleil-lune'],
      versions: ['sun', 'moon'],
      region: 'alola', mega: true, gmax: false,
      regional: { label: 'Pokédex d\'Alola', dexes: ['original-alola'] },
      second: null,
      noteRegionale: 'Le Pokédex d\'Alola d\'origine compte 302 espèces, réparties sur quatre îles.'
    },
    {
      key: 'usum',
      tab: '🌞 Ultra-Soleil / Ultra-Lune',
      title: 'Pokémon Ultra-Soleil / Ultra-Lune',
      machine: 'Nintendo 3DS',
      visuels: ['ultra-soleil-ultra-lune'],
      versions: ['ultra-sun', 'ultra-moon'],
      region: 'alola', mega: true, gmax: false,
      regional: { label: 'Pokédex d\'Alola étendu', dexes: ['updated-alola'] },
      second: null,
      noteRegionale: 'Les versions Ultra étendent le Pokédex d\'Alola à 403 espèces.'
    },
    {
      key: 'letsgo',
      tab: '⚡ Let\'s Go Pikachu / Évoli',
      title: 'Pokémon Let\'s Go Pikachu / Évoli',
      machine: 'Nintendo Switch',
      visuels: ['lets-go-pikachu-evoli'],
      versions: ['lets-go-pikachu', 'lets-go-eevee'],
      region: null, mega: true, gmax: false,
      regional: { label: 'Pokédex de Kanto', dexes: ['letsgo-kanto'] },
      second: null,
      noteRegionale: 'Let\'s Go n\'a pas de Pokédex National : le jeu s\'arrête aux 153 espèces de Kanto — les 151 d\'origine, plus Meltan et Melmetal.'
    },
    {
      key: 'swsh',
      tab: '⚔️ Épée / Bouclier',
      title: 'Pokémon Épée / Bouclier',
      machine: 'Nintendo Switch',
      visuels: ['epee-bouclier'],
      versions: ['sword', 'shield', 'the-isle-of-armor-sword', 'the-isle-of-armor-shield', 'the-crown-tundra-sword', 'the-crown-tundra-shield'],
      region: 'galar', mega: false, gmax: true,
      regional: { label: 'Pokédex de Galar', dexes: ['galar'] },
      second: {
        kind: 'dlc',
        label: 'Galar + DLC',
        dexes: ['galar', 'isle-of-armor', 'crown-tundra'],
        note: 'Épée / Bouclier n\'ont pas de Pokédex National — c\'est le fameux « Dexit ». Voici tout ce que le jeu accepte, extensions comprises : Galar + Île solitaire de l\'Armure (Isolarmure) + les Terres Enneigées de la Couronne (Couronneige).'
      }
    },
    {
      key: 'bdsp',
      tab: '💎 Diamant Étincelant / Perle Scintillante',
      title: 'Pokémon Diamant Étincelant / Perle Scintillante',
      machine: 'Nintendo Switch',
      visuels: ['diamant-etincelant-perle-scintillante'],
      versions: ['brilliant-diamond', 'shining-pearl'],
      region: null, mega: false, gmax: false,
      regional: { label: 'Pokédex de Sinnoh', dexes: ['extended-sinnoh'] },
      second: {
        kind: 'national',
        label: 'Pokédex National',
        upTo: 493,
        note: 'Diamant Étincelant / Perle Scintillante rétablissent un vrai Pokédex National : les 493 espèces des générations 1 à 4.'
      }
    },
    {
      key: 'pla',
      tab: '🏹 Légendes Pokémon : Arceus',
      title: 'Légendes Pokémon : Arceus',
      machine: 'Nintendo Switch',
      visuels: ['legendes-arceus'],
      versions: ['legends-arceus'],
      region: 'hisui', mega: false, gmax: false,
      regional: { label: 'Pokédex de Hisui', dexes: ['hisui'] },
      second: null,
      noteRegionale: 'Légendes Arceus n\'a pas de Pokédex National : le jeu se limite aux 242 espèces du Pokédex de Hisui.'
    },
    {
      key: 'sv',
      tab: '🔮 Écarlate / Violet',
      title: 'Pokémon Écarlate / Violet',
      machine: 'Nintendo Switch',
      visuels: ['ecarlate-violet'],
      versions: ['scarlet', 'violet', 'the-teal-mask-scarlet', 'the-teal-mask-violet', 'the-indigo-disk-scarlet', 'the-indigo-disk-violet'],
      region: 'paldea', mega: false, gmax: false,
      regional: { label: 'Pokédex de Paldea', dexes: ['paldea'] },
      second: {
        kind: 'dlc',
        label: 'Paldea + DLC',
        dexes: ['paldea', 'kitakami', 'blueberry'],
        note: 'Écarlate / Violet n\'ont pas de Pokédex National. Voici tout ce que le jeu accepte, extensions comprises : Paldea + Le Masque Turquoise (Kitakami) + Le Disque Indigo (Blueberry).'
      }
    },
    {
      key: 'za',
      tab: '🌆 Légendes Pokémon : Z-A',
      title: 'Légendes Pokémon : Z-A',
      machine: 'Nintendo Switch',
      visuels: ['legendes-z-a'],
      versions: ['legends-z-a'],
      region: null, mega: true, gmax: false,
      regional: { label: 'Pokédex d\'Illumis', dexes: ['lumiose-city'] },
      second: {
        kind: 'dlc',
        label: 'Illumis + DLC',
        dexes: ['lumiose-city', 'hyperspace'],
        note: 'Légendes Z-A n\'a pas de Pokédex National. Voici tout ce que le jeu accepte, extension comprise : Illumis + Méga-Dimension (Pokédex Extra Illumis).'
      }
    },
    {
      // Cobblemon (mod Minecraft) implemente les 1025 especes des neuf
      // generations : son « Pokedex » est donc l'integralite du national.
      // Liste verifiee sur le depot du mod, dossier par dossier.
      // region '*' : le mod inclut toutes les formes regionales, sans
      // Mega-evolution ni Gigamax.
      key: 'cobblemon',
      tab: '⛏️ Cobblemon',
      title: 'Cobblemon (Minecraft)',
      machine: 'Mod Minecraft Java',
      visuels: ['cobblemon'],
      versions: [],
      region: '*', mega: false, gmax: false,
      regional: { label: 'Toutes les espèces', upTo: 1025 },
      second: null,
      noteRegionale: 'Cobblemon implémente les 1025 espèces des neuf générations. Les formes régionales sont incluses ; il n\'y a ni Méga-évolution ni Gigamax.'
    }
  ];

  // Une carte par espèce, comme dans le Pokédex du jeu. Sans ça, une espèce
  // présente entraînait avec elle TOUTES ses formes connues — d'où des Méga
  // et des formes d'Alola dans le Pokédex de Hisui, qui n'en contient aucune.
  // Listes de formes par jeu, extraites de Pokebip et converties en
  // identifiants PokeAPI (3723 / 3724 entrees appariees automatiquement).
  // Stockees en chaines separees par des espaces : bien plus compact que
  // des tableaux JSON, pour un fichier qui reste lisible.
  const GAME_FORMS_RAW = {
    frlg: 'abra absol aerodactyl aggron aipom alakazam altaria ampharos anorith arbok arcanine ariados armaldo aron articuno azumarill azurill bagon baltoy banette barboach bayleef beautifly beedrill beldum bellossom bellsprout blastoise blaziken blissey breloom bulbasaur butterfree cacnea cacturne camerupt carvanha cascoon castform castform-rainy castform-snowy castform-sunny caterpie celebi chansey charizard charmander charmeleon chikorita chimecho chinchou clamperl claydol clefable clefairy cleffa cloyster combusken corphish corsola cradily crawdaunt crobat croconaw cubone cyndaquil delcatty delibird deoxys-attack deoxys-defense deoxys-normal deoxys-speed dewgong diglett ditto dodrio doduo donphan dragonair dragonite dratini drowzee dugtrio dunsparce dusclops duskull dustox eevee ekans electabuzz electrike electrode elekid entei espeon exeggcute exeggutor exploud farfetchd fearow feebas feraligatr flaaffy flareon flygon forretress furret gardevoir gastly gengar geodude girafarig glalie gligar gloom golbat goldeen golduck golem gorebyss granbull graveler grimer groudon grovyle growlithe grumpig gulpin gyarados hariyama haunter heracross hitmonchan hitmonlee hitmontop ho-oh hoothoot hoppip horsea houndoom houndour huntail hypno igglybuff illumise ivysaur jigglypuff jirachi jolteon jumpluff jynx kabuto kabutops kadabra kakuna kangaskhan kecleon kingdra kingler kirlia koffing krabby kyogre lairon lanturn lapras larvitar latias latios ledian ledyba lickitung lileep linoone lombre lotad loudred ludicolo lugia lunatone luvdisc machamp machoke machop magby magcargo magikarp magmar magnemite magneton makuhita manectric mankey mantine mareep marill marowak marshtomp masquerain mawile medicham meditite meganium meowth metagross metang metapod mew mewtwo mightyena milotic miltank minun misdreavus moltres mr-mime mudkip muk murkrow natu nidoking nidoqueen nidoran-f nidoran-m nidorina nidorino nincada ninetales ninjask noctowl nosepass numel nuzleaf octillery oddish omanyte omastar onix paras parasect pelipper persian phanpy pichu pidgeot pidgeotto pidgey pikachu piloswine pineco pinsir plusle politoed poliwag poliwhirl poliwrath ponyta poochyena porygon porygon2 primeape psyduck pupitar quagsire quilava qwilfish raichu raikou ralts rapidash raticate rattata rayquaza regice regirock registeel relicanth remoraid rhydon rhyhorn roselia sableye salamence sandshrew sandslash sceptile scizor scyther seadra seaking sealeo seedot seel sentret seviper sharpedo shedinja shelgon shellder shiftry shroomish shuckle shuppet silcoon skarmory skiploom skitty slaking slakoth slowbro slowking slowpoke slugma smeargle smoochum sneasel snorlax snorunt snubbull solrock spearow spheal spinarak spinda spoink squirtle stantler starmie staryu steelix sudowoodo suicune sunflora sunkern surskit swablu swalot swampert swellow swinub taillow tangela tauros teddiursa tentacool tentacruel togepi togetic torchic torkoal totodile trapinch treecko tropius typhlosion tyranitar tyrogue umbreon unown unown-a unown-b unown-c unown-d unown-e unown-f unown-g unown-h unown-i unown-j unown-k unown-l unown-m unown-n unown-o unown-p unown-q unown-r unown-s unown-t unown-u unown-v unown-w unown-x unown-y unown-z ursaring vaporeon venomoth venonat venusaur vibrava victreebel vigoroth vileplume volbeat voltorb vulpix wailmer wailord walrein wartortle weedle weepinbell weezing whiscash whismur wigglytuff wingull wobbuffet wooper wurmple wynaut xatu yanma zangoose zapdos zigzagoon zubat',
    letsgo: 'abra aerodactyl aerodactyl-mega alakazam alakazam-mega arbok arcanine articuno beedrill beedrill-mega bellsprout blastoise blastoise-mega bulbasaur butterfree caterpie chansey charizard charizard-mega-x charizard-mega-y charmander charmeleon clefable clefairy cloyster cubone dewgong diglett diglett-alola ditto dodrio doduo dragonair dragonite dratini drowzee dugtrio dugtrio-alola eevee ekans electabuzz electrode exeggcute exeggutor exeggutor-alola farfetchd fearow flareon gastly gengar gengar-mega geodude geodude-alola gloom golbat goldeen golduck golem golem-alola graveler graveler-alola grimer grimer-alola growlithe gyarados gyarados-mega haunter hitmonchan hitmonlee horsea hypno ivysaur jigglypuff jolteon jynx kabuto kabutops kadabra kakuna kangaskhan kangaskhan-mega kingler koffing krabby lapras lickitung machamp machoke machop magikarp magmar magnemite magneton mankey marowak marowak-alola melmetal meltan meowth meowth-alola metapod mew mewtwo mewtwo-mega-x mewtwo-mega-y moltres mr-mime muk muk-alola nidoking nidoqueen nidoran-f nidoran-m nidorina nidorino ninetales ninetales-alola oddish omanyte omastar onix paras parasect persian persian-alola pidgeot pidgeot-mega pidgeotto pidgey pikachu pikachu-partner-cap pinsir pinsir-mega poliwag poliwhirl poliwrath ponyta porygon primeape psyduck raichu raichu-alola rapidash raticate raticate-alola rattata rattata-alola rhydon rhyhorn sandshrew sandshrew-alola sandslash sandslash-alola scyther seadra seaking seel shellder slowbro slowbro-mega slowpoke snorlax spearow squirtle starmie staryu tangela tauros tentacool tentacruel vaporeon venomoth venonat venusaur venusaur-mega victreebel vileplume voltorb vulpix vulpix-alola wartortle weedle weepinbell weezing wigglytuff zapdos zubat',
    swsh: 'abomasnow abra absol accelgor aegislash-blade aegislash-shield aerodactyl aggron alakazam alcremie-caramel-swirl-strawberry-sweet alcremie-gmax alcremie-lemon-cream-strawberry-sweet alcremie-matcha-cream-strawberry-sweet alcremie-mint-cream-strawberry-sweet alcremie-rainbow-swirl-strawberry-sweet alcremie-ruby-cream-strawberry-sweet alcremie-ruby-swirl-strawberry-sweet alcremie-salted-cream-strawberry-sweet alcremie-vanilla-cream-strawberry-sweet altaria amaura amoonguss anorith appletun appletun-gmax applin araquanid arcanine archen archeops arctovish arctozolt armaldo aromatisse aron arrokuda articuno articuno-galar audino aurorus avalugg axew azelf azumarill azurill bagon baltoy barbaracle barboach barraskewda basculin-blue-striped basculin-red-striped beartic beheeyem beldum bellossom bergmite bewear binacle bisharp blacephalon blastoise blastoise-gmax blaziken blipbug blissey boldore boltund bonsly bouffalant bounsweet braviary brionne bronzong bronzor budew bulbasaur buneary bunnelby butterfree butterfree-gmax buzzwole calyrex calyrex-ice calyrex-shadow carbink carkol carracosta carvanha caterpie celebi celesteela centiskorch centiskorch-gmax chandelure chansey charizard charizard-gmax charjabug charmander charmeleon cherrim-overcast cherrim-sunshine cherubi chewtle chinchou cinccino cinderace cinderace-gmax clauncher clawitzer claydol clefable clefairy cleffa clobbopus cloyster coalossal coalossal-gmax cobalion cofagrigus combee combusken comfey conkeldurr copperajah copperajah-gmax corphish corsola corsola-galar corviknight corviknight-gmax corvisquire cosmoem cosmog cottonee cradily cramorant cramorant-gorging cramorant-gulping crawdaunt cresselia croagunk crobat crustle cryogonal cubchoo cubone cufant cursola cutiefly darmanitan-galar-standard darmanitan-galar-zen darmanitan-standard darmanitan-zen dartrix darumaka darumaka-galar decidueye dedenne deino delibird dewpider dhelmise dialga diancie diggersby diglett diglett-alola ditto dottler doublade dracovish dracozolt dragalge dragapult dragonair dragonite drakloak drampa drapion dratini drednaw drednaw-gmax dreepy drifblim drifloon drilbur drizzile druddigon dubwool dugtrio dugtrio-alola dunsparce duosion duraludon duraludon-gmax durant dusclops dusknoir duskull dwebble eevee eevee-gmax eiscue-ice eiscue-noice eldegoss electabuzz electivire electrike elekid elgyem emolga entei escavalier espeon espurr eternatus eternatus-eternamax excadrill exeggcute exeggutor exeggutor-alola exploud falinks farfetchd farfetchd-galar feebas ferroseed ferrothorn flapple flapple-gmax flareon fletchinder fletchling flygon fomantis foongus fraxure frillish-female frillish-male froslass frosmoth gabite gallade galvantula garbodor garbodor-gmax garchomp gardevoir gastly gastrodon-east gastrodon-west genesect genesect-burn genesect-chill genesect-douse genesect-shock gengar gengar-gmax gible gigalith giratina-altered giratina-origin glaceon glalie glastrier gloom golbat goldeen golduck golett golisopod golurk goodra goomy gossifleur gothita gothitelle gothorita gourgeist-average gourgeist-large gourgeist-small gourgeist-super grapploct greedent grimmsnarl grimmsnarl-gmax grookey groudon grovyle growlithe grubbin gurdurr guzzlord gyarados hakamo-o happiny hatenna hatterene hatterene-gmax hattrem haunter hawlucha haxorus heatmor heatran heliolisk helioptile heracross herdier hippopotas hippowdon hitmonchan hitmonlee hitmontop honedge ho-oh hoothoot horsea hydreigon igglybuff impidimp incineroar indeedee-female indeedee-male inkay inteleon inteleon-gmax ivysaur jangmo-o jellicent-female jellicent-male jigglypuff jirachi jolteon joltik jynx kabuto kabutops kadabra kangaskhan karrablast kartana keldeo-ordinary keldeo-resolute kingdra kingler kingler-gmax kirlia klang klefki klink klinklang koffing kommo-o krabby krokorok krookodile kubfu kyogre kyurem kyurem-black kyurem-white lairon lampent landorus-incarnate landorus-therian lanturn lapras lapras-gmax larvesta larvitar latias latios leafeon lickilicky lickitung liepard lileep lilligant lillipup linoone linoone-galar litten litwick lombre lopunny lotad loudred lucario ludicolo lugia lunala lunatone lurantis luxio luxray lycanroc-dusk lycanroc-midday lycanroc-midnight machamp machamp-gmax machoke machop magby magearna magearna-original magikarp magmar magmortar magnemite magneton magnezone malamar mamoswine mandibuzz manectric mantine mantyke maractus mareanie marill marowak marowak-alola marshadow marshtomp mawile melmetal melmetal-gmax meltan meowstic-female meowstic-male meowth meowth-alola meowth-galar meowth-gmax mesprit metagross metang metapod mew mewtwo mienfoo mienshao milcery milotic miltank mime-jr mimikyu-busted mimikyu-disguised minccino moltres moltres-galar morelull morgrem morpeko-full-belly morpeko-hangry mr-mime mr-mime-galar mr-rime mudbray mudkip mudsdale munchlax munna musharna naganadel natu necrozma necrozma-dawn necrozma-dusk nickit nidoking nidoqueen nidoran-f nidoran-m nidorina nidorino nihilego nincada ninetales ninetales-alola ninjask noctowl noibat noivern nuzleaf obstagoon octillery oddish omanyte omastar onix oranguru orbeetle orbeetle-gmax palkia palossand palpitoad pancham pangoro passimian pawniard pelipper perrserker persian persian-alola petilil phantump pheromosa pichu pidove pikachu pikachu-alola-cap pikachu-gmax pikachu-hoenn-cap pikachu-kalos-cap pikachu-original-cap pikachu-partner-cap pikachu-sinnoh-cap pikachu-unova-cap pikachu-world-cap piloswine pincurchin pinsir poipole politoed poliwag poliwhirl poliwrath polteageist polteageist-antique ponyta ponyta-galar popplio porygon porygon2 porygon-z primarina psyduck pumpkaboo-average pumpkaboo-large pumpkaboo-small pumpkaboo-super pupitar purrloin pyukumuku quagsire qwilfish raboot raichu raichu-alola raikou ralts rapidash rapidash-galar rayquaza regice regidrago regieleki regigigas regirock registeel relicanth remoraid reshiram reuniclus rhydon rhyhorn rhyperior ribombee rillaboom rillaboom-gmax riolu rockruff rockruff-own-tempo roggenrola rolycoly rookidee roselia roserade rotom rotom-fan rotom-frost rotom-heat rotom-mow rotom-wash rowlet rufflet runerigus sableye salamence salandit salazzle sandaconda sandaconda-gmax sandile sandshrew sandshrew-alola sandslash sandslash-alola sandygast sawk sceptile scizor scolipede scorbunny scrafty scraggy scyther seadra seaking sealeo seedot seismitoad sharpedo shedinja shelgon shellder shellos-east shellos-west shelmet shiftry shiinotic shinx shuckle sigilyph silicobra silvally silvally-bug silvally-dark silvally-dragon silvally-electric silvally-fairy silvally-fighting silvally-fire silvally-flying silvally-ghost silvally-grass silvally-ground silvally-ice silvally-poison silvally-psychic silvally-rock silvally-steel silvally-water sinistea sinistea-antique sirfetchd sizzlipede skarmory skorupi skrelp skuntank skwovet sliggoo slowbro slowbro-galar slowking slowking-galar slowpoke slowpoke-galar slurpuff smoochum sneasel snom snorlax snorlax-gmax snorunt snover sobble solgaleo solosis solrock spectrier spheal spiritomb spritzee squirtle stakataka starmie staryu steelix steenee stonjourner stoutland stufful stunfisk stunfisk-galar stunky sudowoodo suicune swablu swampert swinub swirlix swoobat sylveon talonflame tangela tangrowth tapu-bulu tapu-fini tapu-koko tapu-lele tauros tentacool tentacruel terrakion thievul throh thundurus-incarnate thundurus-therian thwackey timburr tirtouga togedemaru togekiss togepi togetic torchic torkoal tornadus-incarnate tornadus-therian torracat toxapex toxel toxicroak toxtricity-amped toxtricity-amped-gmax toxtricity-low-key toxtricity-low-key-gmax tranquill trapinch treecko trevenant trubbish tsareena turtonator tympole type-null tyranitar tyrantrum tyrogue tyrunt umbreon unfezant urshifu-rapid-strike urshifu-rapid-strike-gmax urshifu-single-strike urshifu-single-strike-gmax uxie vanillish vanillite vanilluxe vaporeon venipede venusaur venusaur-gmax vespiquen vibrava victini vikavolt vileplume virizion volcanion volcarona vullaby vulpix vulpix-alola wailmer wailord walrein wartortle weavile weezing weezing-galar whimsicott whirlipede whiscash whismur wigglytuff wimpod wingull wishiwashi-school wishiwashi-solo wobbuffet woobat wooloo wooper wynaut xatu xerneas-active xerneas-neutral xurkitree yamask yamask-galar yamper yveltal zacian zacian-crowned zamazenta zamazenta-crowned zapdos zapdos-galar zarude zarude-dada zekrom zeraora zigzagoon zigzagoon-galar zoroark zorua zubat zweilous zygarde-10 zygarde-50 zygarde-complete',
    bdsp: 'abomasnow abra absol aerodactyl aggron aipom alakazam altaria ambipom ampharos anorith arbok arcanine arceus ariados armaldo aron articuno azelf azumarill azurill bagon baltoy banette barboach bastiodon bayleef beautifly beedrill beldum bellossom bellsprout bibarel bidoof blastoise blaziken blissey bonsly breloom bronzong bronzor budew buizel bulbasaur buneary burmy-plant butterfree cacnea cacturne camerupt carnivine carvanha cascoon castform caterpie celebi chansey charizard charmander charmeleon chatot cherrim-overcast cherubi chikorita chimchar chimecho chinchou chingling clamperl claydol clefable clefairy cleffa cloyster combee combusken corphish corsola cradily cranidos crawdaunt cresselia croagunk crobat croconaw cubone cyndaquil darkrai delcatty delibird deoxys-attack deoxys-defense deoxys-normal deoxys-speed dewgong dialga diglett ditto dodrio doduo donphan dragonair dragonite drapion dratini drifblim drifloon drowzee dugtrio dunsparce dusclops dusknoir duskull dustox eevee ekans electabuzz electivire electrike electrode elekid empoleon entei espeon exeggcute exeggutor exploud farfetchd fearow feebas feraligatr finneon flaaffy flareon floatzel flygon forretress froslass furret gabite gallade garchomp gardevoir gastly gastrodon-east gastrodon-west gengar geodude gible girafarig giratina-altered glaceon glalie glameow gligar gliscor gloom golbat goldeen golduck golem gorebyss granbull graveler grimer grotle groudon grovyle growlithe grumpig gulpin gyarados happiny hariyama haunter heatran heracross hippopotas hippowdon hitmonchan hitmonlee hitmontop honchkrow ho-oh hoothoot hoppip horsea houndoom houndour huntail hypno igglybuff illumise infernape ivysaur jigglypuff jirachi jolteon jumpluff jynx kabuto kabutops kadabra kakuna kangaskhan kecleon kingdra kingler kirlia koffing krabby kricketot kricketune kyogre lairon lanturn lapras larvitar latias latios leafeon ledian ledyba lickilicky lickitung lileep linoone lombre lopunny lotad loudred lucario ludicolo lugia lumineon lunatone luvdisc luxio luxray machamp machoke machop magby magcargo magikarp magmar magmortar magnemite magneton magnezone makuhita mamoswine manaphy manectric mankey mantine mantyke mareep marill marowak marshtomp masquerain mawile medicham meditite meganium meowth mesprit metagross metang metapod mew mewtwo mightyena milotic miltank mime-jr minun misdreavus mismagius moltres monferno mothim mr-mime mudkip muk munchlax murkrow natu nidoking nidoqueen nidoran-f nidoran-m nidorina nidorino nincada ninetales ninjask noctowl nosepass numel nuzleaf octillery oddish omanyte omastar onix pachirisu palkia paras parasect pelipper persian phanpy phione pichu pidgeot pidgeotto pidgey pikachu piloswine pineco pinsir piplup plusle politoed poliwag poliwhirl poliwrath ponyta poochyena porygon porygon2 porygon-z primeape prinplup probopass psyduck pupitar purugly quagsire quilava qwilfish raichu raikou ralts rampardos rapidash raticate rattata rayquaza regice regigigas regirock registeel relicanth remoraid rhydon rhyhorn rhyperior riolu roselia roserade rotom rotom-fan rotom-frost rotom-heat rotom-mow rotom-wash sableye salamence sandshrew sandslash sceptile scizor scyther seadra seaking sealeo seedot seel sentret seviper sharpedo shaymin-land shaymin-sky shedinja shelgon shellder shellos-east shellos-west shieldon shiftry shinx shroomish shuckle shuppet silcoon skarmory skiploom skitty skorupi skuntank slaking slakoth slowbro slowking slowpoke slugma smeargle smoochum sneasel snorlax snorunt snover snubbull solrock spearow spheal spinarak spinda spiritomb spoink squirtle stantler staraptor staravia starly starmie staryu steelix stunky sudowoodo suicune sunflora sunkern surskit swablu swalot swampert swellow swinub taillow tangela tangrowth tauros teddiursa tentacool tentacruel togekiss togepi togetic torchic torkoal torterra totodile toxicroak trapinch treecko tropius turtwig typhlosion tyranitar tyrogue umbreon unown unown-a unown-b unown-c unown-d unown-e unown-f unown-g unown-h unown-i unown-j unown-k unown-l unown-m unown-n unown-o unown-p unown-q unown-r unown-s unown-t unown-u unown-v unown-w unown-x unown-y unown-z ursaring uxie vaporeon venomoth venonat venusaur vespiquen vibrava victreebel vigoroth vileplume volbeat voltorb vulpix wailmer wailord walrein wartortle weavile weedle weepinbell weezing whiscash whismur wigglytuff wingull wobbuffet wooper wormadam-plant wormadam-sandy wormadam-trash wurmple wynaut xatu yanma yanmega zangoose zapdos zigzagoon zubat',
    pla: 'abomasnow abra aipom alakazam ambipom arcanine-hisui arceus arceus-bug arceus-dark arceus-dragon arceus-electric arceus-fairy arceus-fighting arceus-fire arceus-flying arceus-ghost arceus-grass arceus-ground arceus-ice arceus-poison arceus-psychic arceus-rock arceus-steel arceus-water avalugg-hisui azelf barboach basculegion-female basculegion-male basculin-white-striped bastiodon beautifly bergmite bibarel bidoof blissey bonsly braviary-hisui bronzong bronzor budew buizel buneary burmy-plant burmy-sandy burmy-trash carnivine cascoon chansey chatot cherrim-overcast cherrim-sunshine cherubi chimchar chimecho chingling clefable clefairy cleffa combee cranidos cresselia croagunk crobat cyndaquil darkrai dartrix decidueye-hisui dewott dialga dialga-origin drapion drifblim drifloon dusclops dusknoir duskull dustox eevee electabuzz electivire electrode-hisui elekid empoleon enamorus-incarnate enamorus-therian espeon finneon flareon floatzel froslass gabite gallade garchomp gardevoir gastly gastrodon-east gastrodon-west gengar geodude gible giratina-altered giratina-origin glaceon glalie glameow gligar gliscor golbat golduck golem goodra-hisui goomy graveler grotle growlithe-hisui gyarados happiny haunter heatran heracross hippopotas hippowdon honchkrow infernape jolteon kadabra kirlia kleavor kricketot kricketune landorus-incarnate landorus-therian leafeon lickilicky lickitung lilligant-hisui lopunny lucario lumineon luxio luxray machamp machoke machop magby magikarp magmar magmortar magnemite magneton magnezone mamoswine manaphy mantine mantyke mesprit mime-jr misdreavus mismagius monferno mothim mr-mime munchlax murkrow ninetales ninetales-alola nosepass octillery onix oshawott overqwil pachirisu palkia palkia-origin paras parasect petilil phione pichu pikachu piloswine piplup ponyta porygon porygon2 porygon-z prinplup probopass psyduck purugly quilava qwilfish-hisui raichu ralts rampardos rapidash regigigas remoraid rhydon rhyhorn rhyperior riolu roselia roserade rotom rotom-fan rotom-frost rotom-heat rotom-mow rotom-wash rowlet rufflet samurott-hisui scizor scyther sealeo shaymin-land shaymin-sky shellos-east shellos-west shieldon shinx silcoon skorupi skuntank sliggoo-hisui sneasel sneasel-hisui sneasler snorlax snorunt snover spheal spiritomb stantler staraptor staravia starly steelix stunky sudowoodo swinub sylveon tangela tangrowth teddiursa tentacool tentacruel thundurus-incarnate thundurus-therian togekiss togepi togetic tornadus-incarnate tornadus-therian torterra toxicroak turtwig typhlosion-hisui umbreon unown unown-a unown-b unown-c unown-d unown-e unown-f unown-g unown-h unown-i unown-j unown-k unown-l unown-m unown-n unown-o unown-p unown-q unown-r unown-s unown-t unown-u unown-v unown-w unown-x unown-y unown-z ursaluna ursaring uxie vaporeon vespiquen voltorb-hisui vulpix vulpix-alola walrein weavile whiscash wormadam-plant wormadam-sandy wormadam-trash wurmple wyrdeer yanma yanmega zoroark-hisui zorua-hisui zubat',
    sv: 'abomasnow aipom alcremie-caramel-swirl-strawberry-sweet alcremie-lemon-cream-strawberry-sweet alcremie-matcha-cream-strawberry-sweet alcremie-mint-cream-strawberry-sweet alcremie-rainbow-swirl-strawberry-sweet alcremie-ruby-cream-strawberry-sweet alcremie-ruby-swirl-strawberry-sweet alcremie-salted-cream-strawberry-sweet alcremie-vanilla-cream-strawberry-sweet alomomola altaria ambipom amoonguss ampharos annihilape appletun applin araquanid arbok arboliva arcanine arcanine-hisui arceus arceus-bug arceus-dark arceus-dragon arceus-electric arceus-fairy arceus-fighting arceus-fire arceus-flying arceus-ghost arceus-grass arceus-ground arceus-ice arceus-poison arceus-psychic arceus-rock arceus-steel arceus-water archaludon arctibax ariados armarouge arrokuda articuno articuno-galar avalugg avalugg-hisui axew azelf azumarill azurill bagon banette barboach barraskewda basculegion-female basculegion-male basculin-blue-striped basculin-red-striped basculin-white-striped bastiodon baxcalibur bayleef beartic beldum bellibolt bellossom bellsprout bergmite bisharp blastoise blaziken blissey blitzle bombirdier bonsly bounsweet braixen brambleghast bramblin braviary braviary-hisui breloom brionne bronzong bronzor brute-bonnet bruxish buizel bulbasaur cacnea cacturne calyrex calyrex-ice calyrex-shadow camerupt capsakid carbink carkol ceruledge cetitan cetoddle chandelure chansey charcadet charizard charjabug charmander charmeleon chesnaught chespin chewtle chien-pao chikorita chimchar chimecho chinchou chingling chi-yu cinccino cinderace clauncher clawitzer clefable clefairy cleffa clodsire cloyster coalossal cobalion combee combusken comfey conkeldurr copperajah corphish corviknight corvisquire cosmoem cosmog cottonee crabominable crabrawler cramorant cramorant-gorging cramorant-gulping cranidos crawdaunt cresselia croagunk crocalor croconaw cryogonal cubchoo cufant cutiefly cyclizar cyndaquil dachsbun darkrai dartrix decidueye decidueye-hisui dedenne deerling deerling-autumn deerling-summer deerling-winter deino delibird delphox deoxys-attack deoxys-defense deoxys-normal deoxys-speed dewgong dewott dewpider dialga dialga-origin diancie diglett diglett-alola dipplin ditto dodrio doduo dolliv dondozo donphan dragalge dragapult dragonair dragonite drakloak dratini drednaw dreepy drifblim drifloon drilbur drizzile drowzee ducklett dudunsparce-two-segment dugtrio dugtrio-alola dunsparce duosion duraludon dusclops dusknoir duskull eelektrik eelektross eevee eiscue-ice eiscue-noice ekans electabuzz electivire electrode electrode-hisui elekid emboar empoleon enamorus-incarnate enamorus-therian entei espathra espeon espurr eternatus excadrill exeggcute exeggutor exeggutor-alola falinks farigiraf feebas fennekin feraligatr fezandipiti fidough finizen finneon flaaffy flabebe flabebe-blue flabebe-orange flabebe-white flabebe-yellow flamigo flapple flareon fletchinder fletchling flittle floatzel floette floette-blue floette-orange floette-white floette-yellow floragato florges florges-blue florges-orange florges-white florges-yellow flutter-mane flygon fomantis foongus forretress fraxure frigibax froakie frogadier froslass frosmoth fuecoco furret gabite gallade galvantula garchomp gardevoir garganacl gastly gastrodon gastrodon-east gengar geodude geodude-alola gholdengo gible gimmighoul gimmighoul-roaming girafarig giratina-altered giratina-origin glaceon glalie glastrier gligar glimmet glimmora gliscor gloom gogoat golduck golem golem-alola golett golurk goodra goodra-hisui goomy gothita gothitelle gothorita gouging-fire grafaiai granbull graveler graveler-alola great-tusk greavard greedent greninja grimer grimer-alola grimmsnarl grookey grotle groudon grovyle growlithe growlithe-hisui grubbin grumpig gulpin gumshoos gurdurr gyarados hakamo-o happiny hariyama hatenna hatterene hattrem haunter hawlucha haxorus heatran heracross hippopotas hippowdon hitmonchan hitmonlee hitmontop honchkrow ho-oh hoopa hoopa-unbound hoothoot hoppip horsea houndoom houndour houndstone hydrapple hydreigon hypno igglybuff illumise impidimp incineroar indeedee-female indeedee-male infernape inkay inteleon iron-boulder iron-bundle iron-crown iron-hands iron-jugulis iron-leaves iron-moth iron-thorns iron-treads iron-valiant ivysaur jangmo-o jigglypuff jirachi jolteon joltik jumpluff keldeo-ordinary keldeo-resolute kilowattrel kingambit kingdra kirlia klawf kleavor klefki koffing komala kommo-o koraidon koraidon-gliding-build koraidon-limited-build koraidon-sprinting-build koraidon-swimming-build kricketot kricketune krokorok krookodile kubfu kyogre kyurem kyurem-black kyurem-white lampent landorus-incarnate landorus-therian lanturn lapras larvesta larvitar latias latios leafeon leavanny lechonk lilligant lilligant-hisui litleo litten litwick lokix lombre lotad lucario ludicolo lugia lumineon lunala lurantis luvdisc luxio luxray lycanroc-dusk lycanroc-midday lycanroc-midnight mabosstiff magby magcargo magearna magearna-original magikarp magmar magmortar magnemite magneton magnezone makuhita malamar mamoswine manaphy mandibuzz mankey mareanie mareep marill marshtomp maschiff masquerain maushold-family-of-four medicham meditite meganium meloetta-aria meloetta-pirouette meowscarada meowstic-female meowstic-male meowth meowth-alola meowth-galar mesprit metagross metang mew mewtwo mienfoo mienshao mightyena milcery milotic mimikyu-busted mimikyu-disguised minccino minior-red-meteor minun miraidon miraidon-aquatic-mode miraidon-glide-mode miraidon-low-power-mode misdreavus mismagius moltres moltres-galar monferno morgrem morpeko-full-belly morpeko-hangry mudbray mudkip mudsdale muk muk-alola munchlax munkidori murkrow nacli naclstack necrozma necrozma-dawn necrozma-dusk ninetales ninetales-alola noctowl noibat noivern nosepass numel nuzleaf nymble oddish ogerpon ogerpon-cornerstone-mask ogerpon-hearthflame-mask ogerpon-wellspring-mask oinkologne-female oinkologne-male okidogi oranguru oricorio-baile oricorio-pau oricorio-pom-pom oricorio-sensu orthworm oshawott overqwil pachirisu palafin-hero palafin-zero palkia palkia-origin palossand passimian pawmi pawmo pawmot pawniard pecharunt pelipper perrserker persian persian-alola petilil phanpy phantump phione pichu pignite pikachu pikachu-alola-cap pikachu-hoenn-cap pikachu-original-cap pikachu-sinnoh-cap pikachu-unova-cap pikipek piloswine pincurchin pineco piplup plusle politoed poliwag poliwhirl poliwrath poltchageist poltchageist-artisan polteageist polteageist-antique poochyena popplio porygon porygon2 porygon-z primarina primeape prinplup probopass psyduck pupitar pyroar-male quagsire quaquaval quaxly quaxwell quilava quilladin qwilfish qwilfish-hisui raboot rabsca raging-bolt raichu raichu-alola raikou ralts rampardos rayquaza regice regidrago regieleki regigigas regirock registeel rellor reshiram reuniclus revavroom rhydon rhyhorn rhyperior ribombee rillaboom riolu roaring-moon rockruff rockruff-own-tempo rolycoly rookidee rotom rotom-fan rotom-frost rotom-heat rotom-mow rotom-wash rowlet rufflet sableye salamence salandit salazzle samurott samurott-hisui sandaconda sandile sandshrew sandshrew-alola sandslash sandslash-alola sandygast sandy-shocks sawsbuck sawsbuck-autumn sawsbuck-summer sawsbuck-winter scatterbug sceptile scizor scorbunny scovillain scrafty scraggy scream-tail scyther seadra seedot seel sentret serperior servine seviper sewaddle shaymin-land shaymin-sky shelgon shellder shellos shellos-east shieldon shiftry shinx shroodle shroomish shuppet silicobra sinistcha sinistcha-masterpiece sinistea sinistea-antique skarmory skeledirge skiddo skiploom skrelp skuntank skwovet slaking slakoth sliggoo sliggoo-hisui slither-wing slowbro slowbro-galar slowking slowking-galar slowpoke slowpoke-galar slugma smeargle smoliv sneasel sneasel-hisui sneasler snivy snom snorlax snorunt snover snubbull sobble solgaleo solosis spectrier spewpa spidops spinarak spiritomb spoink sprigatito squawkabilly-blue-plumage squawkabilly-green-plumage squawkabilly-white-plumage squawkabilly-yellow-plumage squirtle stantler staraptor staravia starly steenee stonjourner stunky sudowoodo suicune sunflora sunkern surskit swablu swadloon swalot swampert swanna swinub sylveon tadbulb talonflame tandemaus tarountula tatsugiri-curly tatsugiri-droopy tatsugiri-stretchy tauros tauros-paldea-aqua-breed tauros-paldea-blaze-breed tauros-paldea-combat-breed teddiursa tentacool tentacruel tepig terapagos terapagos-stellar terrakion thundurus-incarnate thundurus-therian thwackey timburr ting-lu tinkatink tinkaton tinkatuff toedscool toedscruel torchic torkoal tornadus-incarnate tornadus-therian torracat torterra totodile toucannon toxapex toxel toxicroak toxtricity-amped toxtricity-low-key trapinch treecko trevenant tropius trumbeak tsareena turtwig tynamo typhlosion typhlosion-hisui tyranitar tyrogue umbreon ursaluna ursaluna-bloodmoon ursaring urshifu-rapid-strike urshifu-single-strike uxie vaporeon varoom veluza venomoth venonat venusaur vespiquen vibrava victreebel vigoroth vikavolt vileplume virizion vivillon-archipelago vivillon-continental vivillon-elegant vivillon-fancy vivillon-garden vivillon-high-plains vivillon-icy-snow vivillon-jungle vivillon-marine vivillon-meadow vivillon-modern vivillon-monsoon vivillon-ocean vivillon-poke-ball vivillon-polar vivillon-river vivillon-sandstorm vivillon-savanna vivillon-sun vivillon-tundra volbeat volcanion volcarona voltorb voltorb-hisui vullaby vulpix vulpix-alola walking-wake wartortle wattrel weavile weepinbell weezing weezing-galar whimsicott whiscash wigglytuff wiglett wingull wo-chien wooper wooper-paldea wugtrio wyrdeer yanma yanmega yungoos zacian zacian-crowned zamazenta zamazenta-crowned zangoose zapdos zapdos-galar zarude zarude-dada zebstrika zekrom zoroark zoroark-hisui zorua zorua-hisui zweilous',
    za: 'abomasnow abomasnow-mega abra absol absol-mega absol-mega-z aegislash-blade aegislash-shield aerodactyl aerodactyl-mega aggron aggron-mega alakazam alakazam-mega altaria altaria-mega amaura amoonguss ampharos ampharos-mega annihilape arbok arctibax ariados armarouge aromatisse aron audino audino-mega aurorus avalugg avalugg-hisui bagon banette banette-mega barbaracle barbaracle-mega baxcalibur baxcalibur-mega bayleef beedrill beedrill-mega beldum bellsprout bergmite binacle blastoise blastoise-mega blaziken blaziken-mega braixen budew bulbasaur buneary bunnelby camerupt camerupt-mega capsakid carbink carvanha ceruledge chandelure chandelure-mega charcadet charizard charizard-mega-x charizard-mega-y charmander charmeleon chesnaught chesnaught-mega chespin chikorita chimecho chimecho-mega chingling clauncher clawitzer clefable clefable-mega clefairy cleffa clobbopus cobalion cofagrigus combusken corviknight corvisquire crabominable crabominable-mega crabrawler crobat croconaw cryogonal cubone cyclizar dachsbun darkrai darkrai-mega dedenne delibird delphox delphox-mega diancie diancie-mega diggersby dondozo doublade dragalge dragalge-mega dragonair dragonite dragonite-mega drampa drampa-mega dratini drilbur eelektrik eelektross eelektross-mega eevee ekans electrike emboar emboar-mega emolga espeon espurr excadrill excadrill-mega falinks falinks-mega farfetchd farfetchd-galar feebas fennekin feraligatr feraligatr-mega fidough flaaffy flabebe flabebe-blue flabebe-orange flabebe-white flabebe-yellow flamigo flareon fletchinder fletchling floette floette-blue floette-eternal floette-mega floette-orange floette-white floette-yellow florges florges-blue florges-orange florges-white florges-yellow foongus frigibax froakie frogadier froslass froslass-mega furfrou furfrou-dandy furfrou-debutante furfrou-diamond furfrou-heart furfrou-kabuki furfrou-la-reine furfrou-matron furfrou-pharaoh furfrou-star gabite gallade gallade-mega garbodor garchomp garchomp-mega garchomp-mega-z gardevoir gardevoir-mega garganacl gastly genesect genesect-burn genesect-chill genesect-douse genesect-shock gengar gengar-mega gholdengo gible gimmighoul gimmighoul-roaming glaceon glalie glalie-mega glimmet glimmora glimmora-mega gogoat golbat golett golisopod golisopod-mega golurk golurk-mega goodra goodra-hisui goomy gourgeist-average gourgeist-large gourgeist-small gourgeist-super grafaiai grapploct greavard greninja greninja-mega groudon groudon-primal grovyle grumpig gulpin gyarados gyarados-mega haunter hawlucha hawlucha-mega heatran heatran-mega heliolisk helioptile heracross heracross-mega hippopotas hippowdon honedge hoopa hoopa-unbound houndoom houndoom-mega houndour houndstone igglybuff indeedee-female indeedee-male inkay ivysaur jigglypuff jolteon kadabra kakuna kangaskhan kangaskhan-mega kecleon keldeo-ordinary keldeo-resolute kirlia kleavor klefki krokorok krookodile kyogre kyogre-primal lairon lampent larvitar latias latias-mega latios latios-mega leafeon liepard litleo litwick lopunny lopunny-mega lucario lucario-mega lucario-mega-z mabosstiff machamp machoke machop magearna magearna-mega magearna-original magearna-original-mega magikarp malamar malamar-mega manectric manectric-mega mankey mareep marowak marowak-alola marshadow marshtomp maschiff mawile mawile-mega medicham medicham-mega meditite meganium meganium-mega melmetal meloetta-aria meloetta-pirouette meltan meowstic-female meowstic-female-mega meowstic-male meowstic-male-mega meowth meowth-alola meowth-galar metagross metagross-mega metang mewtwo mewtwo-mega-x mewtwo-mega-y milotic mime-jr mimikyu-busted mimikyu-disguised morpeko-full-belly morpeko-hangry mr-mime mr-mime-galar mr-rime mudkip munna musharna nacli naclstack nickit noibat noivern numel onix overqwil palossand pancham pangoro panpour pansage pansear patrat perrserker persian persian-alola phantump pichu pidgeot pidgeot-mega pidgeotto pidgey pignite pikachu pinsir pinsir-mega porygon porygon2 porygon-z primeape pumpkaboo-average pumpkaboo-large pumpkaboo-small pumpkaboo-super pupitar purrloin pyroar-male pyroar-mega quilladin qwilfish qwilfish-hisui raichu raichu-alola raichu-mega-x raichu-mega-y ralts rayquaza rayquaza-mega riolu rookidee roselia roserade rotom rotom-fan rotom-frost rotom-heat rotom-mow rotom-wash runerigus sableye sableye-mega salamence salamence-mega sandile sandygast sawk scatterbug sceptile sceptile-mega scizor scizor-mega scolipede scolipede-mega scovillain scovillain-mega scrafty scrafty-mega scraggy scyther seviper sharpedo sharpedo-mega shelgon shroodle shuppet simipour simisage simisear sirfetchd skarmory skarmory-mega skiddo skrelp sliggoo sliggoo-hisui slowbro slowbro-galar slowbro-mega slowking slowking-galar slowpoke slowpoke-galar slurpuff snorunt snover spewpa spinarak spoink spritzee squawkabilly-blue-plumage squawkabilly-green-plumage squawkabilly-white-plumage squawkabilly-yellow-plumage squirtle staraptor staraptor-mega staravia starly starmie starmie-mega staryu steelix steelix-mega stunfisk stunfisk-galar swablu swalot swampert swampert-mega swirlix sylveon talonflame tatsugiri-curly tatsugiri-curly-mega tatsugiri-droopy tatsugiri-droopy-mega tatsugiri-stretchy tatsugiri-stretchy-mega tepig terrakion thievul throh tinkatink tinkaton tinkatuff torchic totodile toxel toxtricity-amped toxtricity-low-key treecko trevenant trubbish tynamo tyranitar tyranitar-mega tyrantrum tyrunt umbreon vanillish vanillite vanilluxe vaporeon venipede venusaur venusaur-mega victreebel victreebel-mega virizion vivillon-garden vivillon-marine vivillon-meadow volcanion wartortle watchog weedle weepinbell whirlipede wigglytuff wimpod xerneas yamask yamask-galar yveltal zangoose zeraora zeraora-mega zubat zygarde-10 zygarde-50 zygarde-complete zygarde-mega'
  };

