// Les verrous chromatiques — DONNÉES SEULES, aucun rendu.
// Script classique (pas de module ES) : l'application reste ouvrable en file://
//
// CE FICHIER NE CONTIENT QUE DES FAITS RELEVÉS. La règle du chantier est de ne
// jamais écrire une valeur qu'aucune source n'affirme : ce qui n'a pas été
// relevé n'est pas ici, et la liste À VÉRIFIER en bas dit lesquels manquent.
// Une table qu'on complète « de mémoire » est indiscernable d'une table juste.
//
// ---------------------------------------------------------------------------
// POURQUOI UNE RENCONTRE, ET PAS UNE ESPÈCE
//
// « Ronflex est shiny-lock » est faux. Le Ronflex qui bloque la Route 6 dans X
// et Y l'est ; les Ronflex sauvages ne le sont pas. Un joueur qui lit la
// première phrase renonce à une chasse parfaitement possible.
//
// Chaque entrée décrit donc UNE RENCONTRE dans UN JEU, et l'espèce n'est qu'un
// de ses champs. C'est ce qui permet à l'écran de dire « verrouillé ici,
// chassable là » au lieu de condamner l'espèce entière.
//
// ---------------------------------------------------------------------------
// LE SCHÉMA
//
//   jeux        [clé, …]  Les clés de GAMES (donnees.js). Jamais un libellé
//                         écrit à la main : le nom d'un jeu change, sa clé non.
//   espece      n         Numéro national. Relié à donnees-embarquees.js.
//   rencontre   texte     CE QUI est verrouillé. « le starter », « le
//                         légendaire du scénario », « offert à Doublonville ».
//                         C'est le champ qui fait la différence avec l'espèce.
//   portee      'partout' aucun exemplaire légitime n'existe, dans aucun jeu ;
//               'jeu'     verrouillé dans ces jeux-là seulement ;
//               'taux'    chromatique possible, mais les bonus de taux
//                         (Charme Chroma, chaînes) ne s'y appliquent pas.
//   exception   texte?    Ce qui échappe au verrou, quand la source le dit.
//   note        texte?    Précision utile à la décision de chasser.
//   source      clé       Une entrée de SOURCES_VERROUS. Toute ligne en a une.
//
// ---------------------------------------------------------------------------

// D'où vient chaque affirmation. Une ligne sans source n'entre pas dans la
// table — c'est ce qui permet de rejouer une vérification dans six mois.
const SOURCES_VERROUS = {
  'pokebip-impossibles': {
    nom: 'Pokébip — Dossier Shasse, « Les Pokémon Shiny Lock »',
    url: 'https://www.pokebip.com/page/jeux-video/dossier-shasse/impossibles',
    releve: '2026-08-30'
  }
};

// 1. VERROUILLÉ PARTOUT. La seule table qui autorise la phrase « nulle part ».
//    Presque tous sont des fabuleux : ils n'existent que par distribution, et
//    la distribution impose la couleur.
const VERROUS = [
  { jeux: ['bw', 'b2w2'], espece: 494, rencontre: 'l\'évènement de l\'Île Liberté',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: [], espece: 647, rencontre: 'toute distribution',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: [], espece: 648, rencontre: 'toute distribution',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: [], espece: 649, rencontre: 'toute distribution',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: [], espece: 719, rencontre: 'toute distribution',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: [], espece: 720, rencontre: 'toute distribution',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: [], espece: 721, rencontre: 'toute distribution',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: ['sm', 'usum'], espece: 789, rencontre: 'la rencontre fixe du scénario',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: [], espece: 801, rencontre: 'la distribution par QR Code',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: [], espece: 802, rencontre: 'toute distribution',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: [], espece: 807, rencontre: 'toute distribution',
    portee: 'partout',
    note: 'Un Zeraora chromatique a existé, via l\'évènement Pokémon HOME de 2020 : c\'est une distribution, pas une chasse.',
    source: 'pokebip-impossibles' },
  { jeux: [], espece: 808, rencontre: 'la Boîte Mystère de Pokémon GO',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: [], espece: 809, rencontre: 'l\'évolution depuis Pokémon GO',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: ['swsh'], espece: 888, rencontre: 'le légendaire du scénario',
    portee: 'partout',
    note: 'Un Zacian chromatique a été distribué en 2021 : par code, pas par chasse.',
    source: 'pokebip-impossibles' },
  { jeux: ['swsh'], espece: 889, rencontre: 'le légendaire du scénario',
    portee: 'partout',
    note: 'Un Zamazenta chromatique a été distribué en 2021 : par code, pas par chasse.',
    source: 'pokebip-impossibles' },
  { jeux: ['swsh'], espece: 890, rencontre: 'le légendaire du scénario',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: [], espece: 893, rencontre: 'toute distribution',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: ['sv'], espece: 1024, rencontre: 'le légendaire du scénario',
    portee: 'partout', source: 'pokebip-impossibles' },

  // 2. PAS AU TAUX AMÉLIORÉ. Ceux-là PEUVENT briller : c'est le bonus qui ne
  //    s'applique pas, pas la couleur qui est interdite. La distinction n'est
  //    pas cosmétique — les ranger avec les précédents ferait renoncer à une
  //    chasse possible, seulement plus longue.
  { jeux: ['sm', 'usum'], espece: 785, rencontre: 'la rencontre fixe des ruines',
    portee: 'taux', exception: 'Chassable en Aura Rencontre à partir de la 7G.',
    source: 'pokebip-impossibles' },
  { jeux: ['sm', 'usum'], espece: 786, rencontre: 'la rencontre fixe des ruines',
    portee: 'taux', exception: 'Chassable en Aura Rencontre à partir de la 7G.',
    source: 'pokebip-impossibles' },
  { jeux: ['sm', 'usum'], espece: 787, rencontre: 'la rencontre fixe des ruines',
    portee: 'taux', exception: 'Chassable en Aura Rencontre à partir de la 7G.',
    source: 'pokebip-impossibles' },
  { jeux: ['sm', 'usum'], espece: 788, rencontre: 'la rencontre fixe des ruines',
    portee: 'taux', exception: 'Chassable en Aura Rencontre à partir de la 7G.',
    source: 'pokebip-impossibles' },
  { jeux: ['sm', 'usum'], espece: 791, rencontre: 'le légendaire du scénario',
    portee: 'taux', exception: 'Chassable en Aura Rencontre à partir de la 7G.',
    source: 'pokebip-impossibles' },
  { jeux: ['sm', 'usum'], espece: 792, rencontre: 'le légendaire du scénario',
    portee: 'taux', exception: 'Chassable en Aura Rencontre à partir de la 7G.',
    source: 'pokebip-impossibles' },
  { jeux: ['sm', 'usum'], espece: 800, rencontre: 'le légendaire du scénario',
    portee: 'taux', exception: 'Chassable en Aura Rencontre à partir de la 7G.',
    source: 'pokebip-impossibles' }
];

// 3. LES RÈGLES DE MOTEUR. Elles ne visent aucune espèce en particulier : c'est
//    le jeu lui-même qui empêche la couleur, par la façon dont il tire ses
//    statistiques. Les mettre dans VERROUS aurait demandé une ligne par espèce
//    du Pokédex.
const REGLES_VERROU = [
  { jeux: ['rby', 'jaune'],
    texte: 'Les Pokémon des hautes herbes ne peuvent pas être chromatiques : la '
      + 'couleur se déduit des DV, et le tirage sauvage n\'atteint jamais la '
      + 'combinaison requise.',
    source: 'pokebip-impossibles' },
  { jeux: ['gsc', 'cristal'],
    texte: 'Zarbi n\'est chromatique que sous les lettres I et V. Les espèces à '
      + '12,5 % de femelles ne peuvent pas l\'être au féminin.',
    source: 'pokebip-impossibles' }
];

// ---------------------------------------------------------------------------
// À VÉRIFIER — ce que le relevé du 30 août 2026 n'a PAS confirmé.
//
// Ces lignes ne sont pas dans la table, et c'est volontaire. Elles figuraient
// dans l'implémentation précédente ; la source relue ce jour ne les mentionne
// pas. Plutôt que de les recopier — ce qui aurait transformé une supposition en
// fait vérifié —, elles attendent une seconde lecture.
const VERROUS_A_VERIFIER = [
  { espece: 718, quoi: 'Zygarde',
    pourquoi: 'Rangé en « taux plein seul » par l\'ancienne table. La page relue '
      + 'ne cite que les quatre Tokorico, Solgaleo, Lunala et Necrozma.' },
  { quoi: 'Les verrous par rencontre, jeu par jeu',
    pourquoi: 'L\'ancienne table en comptait environ soixante-dix-neuf — le '
      + 'Ronflex de la Route 6, le Ramoloss de Brasswick, les cadeaux de '
      + 'scénario. Ils n\'ont pas encore été relevés à la source : la page les '
      + 'liste, l\'extraction reste à faire.' },
  { quoi: 'Les distributions ayant pu être chromatiques',
    pourquoi: 'La page « Liste des Cadeaux Mystères pouvant être shassés » est '
      + 'la dérogation à la règle. Elle n\'a pas encore été relue.' }
];
