// Les verrous chromatiques — DONNÉES SEULES, aucun rendu.
// Script classique (pas de module ES) : l'application reste ouvrable en file://
//
// ---------------------------------------------------------------------------
// LE CRITÈRE, ET CE QU'IL ÉCARTE
//
// Une entrée d'ici est un VERROU DÉLIBÉRÉ posé sur une RENCONTRE fixe ou
// offerte. Rien d'autre.
//
// N'y sont donc pas — et ne doivent pas y revenir :
//   · les impossibilités de première et deuxième générations (hautes herbes
//     dont les DV n'atteignent jamais la combinaison, Zarbi hors des lettres
//     I et V, femelles des espèces à 12,5 %). Elles sont réelles, mais rien
//     n'a été verrouillé : c'est le moteur de l'époque qui ne sait pas
//     produire ce résultat. Les mélanger ferait passer une limite technique
//     pour une décision de Game Freak ;
//   · la troisième génération entière, qui n'a aucun verrou hors évènements et
//     échanges internes — Groudon, Kyogre, Rayquaza, les starters et les
//     fossiles peuvent tous briller ;
//   · Diamant, Perle et Platine, pour la même raison : Dialga, Palkia,
//     Giratina, Heatran, Regigigas et les fées du lac sont chassables ;
//   · les distributions par Cadeau Mystère, qui ont leur propre écran.
//
// ---------------------------------------------------------------------------
// UNE RENCONTRE, PAS UNE ESPÈCE — la règle qui commande tout le reste.
//
// « Électhor est shiny-lock » est faux. L'Électhor de l'Antre Néréen dans X et
// Y l'est ; celui de Couronneige ne l'est pas ; celui des friandises
// d'Écarlate et Violet l'est de nouveau. Trois rencontres, trois réponses.
//
// Chaque entrée nomme donc CE QUI est verrouillé, et l'espèce n'en est qu'un
// champ. C'est ce qui permet à l'écran de dire « verrouillé ici, chassable
// là » au lieu de condamner l'espèce entière — et de ne pas faire renoncer à
// une chasse parfaitement possible.
//
// ---------------------------------------------------------------------------
// LE SCHÉMA
//
//   jeux        [clé, …]  Les clés de GAMES (donnees.js). Jamais un libellé
//                         écrit à la main : le nom d'un jeu change, sa clé non.
//                         Vide = aucune rencontre en jeu, seulement distribué.
//   espece      n         Numéro national, résolu contre donnees-embarquees.js.
//   rencontre   texte     CE QUI est verrouillé, et où.
//   portee      'partout' aucun exemplaire légitime, dans aucun jeu ;
//               'jeu'     verrouillé sur cette rencontre seulement ;
//               'taux'    chromatique possible, mais sans les bonus de taux.
//   version     texte?    Quand une seule des deux versions est concernée.
//   exception   texte?    Ce qui échappe au verrou.
//   note        texte?    Précision utile à la décision de chasser.
//   source      clé       Une entrée de SOURCES_VERROUS. Toute ligne en a une.
//
//   niveau      n?        Le niveau de CETTE apparition. Fixe par définition —
//                         une rencontre scénarisée sort toujours au même.
//   attaques    [texte]?  Les capacités qu'elle porte à la rencontre.
//
//   CES DEUX-LÀ SONT VIDES POUR L'INSTANT, et c'est volontaire. Ils décrivent
//   l'apparition, pas l'espèce : le reste de la fiche — statistiques, types,
//   talents, évolutions — vient de la réserve embarquée et s'affiche déjà en
//   cliquant la ligne. Niveau et attaques, eux, ne se déduisent d'aucune donnée
//   déjà présente ; il faut les relever rencontre par rencontre. Les inventer
//   serait pire que de les laisser vides : un niveau faux se recopie.
//
// ---------------------------------------------------------------------------

const SOURCES_VERROUS = {
  'pokebip-impossibles': {
    nom: 'Pokébip — Dossier Shasse, « Les Pokémon Shiny Lock »',
    url: 'https://www.pokebip.com/page/jeux-video/dossier-shasse/impossibles',
    releve: '2026-08-30'
  },
  'pokepedia-shinylock': {
    nom: 'Poképédia — « Shiny Lock »',
    url: 'https://www.pokepedia.fr/Shiny_Lock',
    releve: '2026-08-30'
  },
  // Le relevé jeu par jeu, communiqué le 30 août 2026 et repris tel quel. Les
  // numéros nationaux ont été résolus contre donnees-embarquees.js, jamais
  // écrits de mémoire : cent un noms, zéro introuvable. Les lignes qui portent
  // cette clé n'ont pas été recoupées une à une à la source — celles qui l'ont
  // été portent 'pokebip-impossibles' ou 'pokepedia-shinylock'.
  'releve-communique': {
    nom: 'Relevé jeu par jeu communiqué le 30 août 2026',
    url: null,
    releve: '2026-08-30'
  }
};

const VERROUS = [

  // ---- HeartGold / SoulSilver ---------------------------------------------
  { jeux: ['hgss'], espece: 213, rencontre: 'le Caratroc offert à Irisia',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['hgss'], espece: 21, rencontre: 'le Piafabec offert à Doublonville',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['hgss'], espece: 172,
    rencontre: 'le Pichu Troizépi du Bois aux Chênes — rencontre évènementielle',
    portee: 'jeu', source: 'releve-communique' },

  // ---- Noir / Blanc — croisé sur trois sources ----------------------------
  { jeux: ['bw'], espece: 494, rencontre: 'la rencontre fixe de l\'Île Liberté',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: ['bw'], espece: 570,
    rencontre: 'le Zorua offert à Volucité — il demande le Celebi évènementiel',
    portee: 'jeu',
    note: 'Poképédia : les Pokémon liés à un évènement ont leur chromatique verrouillé.',
    source: 'pokebip-impossibles' },
  { jeux: ['bw'], espece: 571,
    rencontre: 'le Zoroark du Bois des Illusions — il demande le trio évènementiel',
    portee: 'jeu',
    note: 'L\'illusion suit la couleur du Pokémon imité, pas celle de Zoroark.',
    source: 'pokebip-impossibles' },
  { jeux: ['bw'], espece: 643,
    rencontre: 'le légendaire du scénario — Palais de N, puis Tour Dragospire',
    portee: 'jeu',
    exception: 'Le Reshiram de Noir 2 / Blanc 2 n\'est PAS verrouillé.',
    source: 'pokebip-impossibles' },
  { jeux: ['bw'], espece: 644,
    rencontre: 'le légendaire du scénario — Palais de N, puis Tour Dragospire',
    portee: 'jeu',
    exception: 'Le Zekrom de Noir 2 / Blanc 2 n\'est PAS verrouillé.',
    source: 'pokebip-impossibles' },

  // ---- Noir 2 / Blanc 2 ----------------------------------------------------
  { jeux: ['b2w2'], espece: 133,
    rencontre: 'l\'Évoli offert par Boletta — talent caché',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['b2w2'], espece: 585,
    rencontre: 'le Vivaldaim offert par le scientifique — talent caché',
    portee: 'jeu', source: 'releve-communique' },

  // ---- X / Y ---------------------------------------------------------------
  { jeux: ['xy'], espece: 16, rencontre: 'le Roucool scripté de la Route 2',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['xy'], espece: 143, rencontre: 'le Ronflex endormi de la Route 7',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['xy'], espece: 448, rencontre: 'le Lucario offert par Cornélia, Tour Maîtrise',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['xy'], espece: 144, rencontre: 'la rencontre de l\'Antre Néréen',
    portee: 'jeu',
    note: 'Celui de Couronneige, lui, se chasse. La rencontre décide, pas l\'espèce.',
    source: 'releve-communique' },
  { jeux: ['xy'], espece: 145, rencontre: 'la rencontre de l\'Antre Néréen',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['xy'], espece: 146, rencontre: 'la rencontre de l\'Antre Néréen',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['xy'], espece: 150, rencontre: 'la rencontre fixe de la Grotte Inconnue',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['xy'], espece: 716, rencontre: 'la rencontre du Repaire de la Team Flare',
    portee: 'jeu', version: 'Pokémon X', source: 'releve-communique' },
  { jeux: ['xy'], espece: 717, rencontre: 'la rencontre du Repaire de la Team Flare',
    portee: 'jeu', version: 'Pokémon Y', source: 'releve-communique' },
  { jeux: ['xy'], espece: 718, rencontre: 'la rencontre fixe de la Grotte Coda',
    portee: 'jeu', source: 'releve-communique' },

  // ---- Rubis Oméga / Saphir Alpha -----------------------------------------
  { jeux: ['oras'], espece: 265, rencontre: 'le Chenipotte scripté de la Route 101',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['oras'], espece: 261,
    rencontre: 'le Medhyèna scripté de la Route 101 — non capturable',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['oras'], espece: 25, rencontre: 'le Pikachu Cosplay offert à Poivressel',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['oras'], espece: 383, rencontre: 'la rencontre fixe de la Grotte Origine',
    portee: 'jeu', version: 'Rubis Oméga', source: 'releve-communique' },
  { jeux: ['oras'], espece: 382, rencontre: 'la rencontre fixe de la Grotte Origine',
    portee: 'jeu', version: 'Saphir Alpha', source: 'releve-communique' },
  { jeux: ['oras'], espece: 384, rencontre: 'la rencontre fixe du Pilier Céleste',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['oras'], espece: 386,
    rencontre: 'la rencontre scénarisée de l\'Épisode Delta — Voyage Spatial',
    portee: 'jeu',
    exception: 'Les légendaires des Miroirs Astraux ne sont pas concernés.',
    source: 'releve-communique' },

  // ---- Soleil / Lune et Ultra-Soleil / Ultra-Lune --------------------------
  { jeux: ['sm', 'usum'], espece: 718, rencontre: 'la rencontre fixe de la Route 16 / Grotte Coda',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sm', 'usum'], espece: 789, rencontre: 'le Cosmog du Lac du Halo alternatif',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: ['sm', 'usum'], espece: 785, rencontre: 'la rencontre des Ruines du Conflit',
    portee: 'taux', exception: 'Chassable en Aura Rencontre à partir de la 7G.',
    source: 'pokebip-impossibles' },
  { jeux: ['sm', 'usum'], espece: 786, rencontre: 'la rencontre des Ruines de l\'Éveil',
    portee: 'taux', exception: 'Chassable en Aura Rencontre à partir de la 7G.',
    source: 'pokebip-impossibles' },
  { jeux: ['sm', 'usum'], espece: 787, rencontre: 'la rencontre des Ruines de l\'Essor',
    portee: 'taux', exception: 'Chassable en Aura Rencontre à partir de la 7G.',
    source: 'pokebip-impossibles' },
  { jeux: ['sm', 'usum'], espece: 788, rencontre: 'la rencontre des Ruines de l\'Au-Delà',
    portee: 'taux', exception: 'Chassable en Aura Rencontre à partir de la 7G.',
    source: 'pokebip-impossibles' },
  { jeux: ['sm', 'usum'], espece: 791, rencontre: 'la rencontre de l\'Autel du Soleil',
    portee: 'taux', exception: 'Chassable en Aura Rencontre à partir de la 7G.',
    source: 'pokebip-impossibles' },
  { jeux: ['sm', 'usum'], espece: 792, rencontre: 'la rencontre de l\'Autel de la Lune',
    portee: 'taux', exception: 'Chassable en Aura Rencontre à partir de la 7G.',
    source: 'pokebip-impossibles' },
  { jeux: ['sm'], espece: 800, rencontre: 'la rencontre fixe de la Colline Dicarat',
    portee: 'taux', exception: 'Chassable en Aura Rencontre à partir de la 7G.',
    source: 'pokebip-impossibles' },
  { jeux: ['usum'], espece: 800, rencontre: 'la rencontre fixe du Mont Lanakila',
    portee: 'taux', exception: 'Chassable en Aura Rencontre à partir de la 7G.',
    source: 'pokebip-impossibles' },

  // Les Ultra-Chimères de Soleil / Lune — et elles seules. Celles rencontrées
  // par les Ultra-Brèches d'Ultra-Soleil / Ultra-Lune ne sont PAS verrouillées,
  // et c'est la différence qui décide d'y jouer.
  { jeux: ['sm'], espece: 793, rencontre: 'l\'Ultra-Chimère de la rencontre scénarisée',
    portee: 'jeu', exception: 'Non verrouillée via les Ultra-Brèches d\'US/UL.',
    source: 'releve-communique' },
  { jeux: ['sm'], espece: 794, rencontre: 'l\'Ultra-Chimère scénarisée',
    portee: 'jeu', version: 'Pokémon Soleil',
    exception: 'Non verrouillée via les Ultra-Brèches d\'US/UL.',
    source: 'releve-communique' },
  { jeux: ['sm'], espece: 795, rencontre: 'l\'Ultra-Chimère scénarisée',
    portee: 'jeu', version: 'Pokémon Lune',
    exception: 'Non verrouillée via les Ultra-Brèches d\'US/UL.',
    source: 'releve-communique' },
  { jeux: ['sm'], espece: 796, rencontre: 'l\'Ultra-Chimère scénarisée',
    portee: 'jeu', exception: 'Non verrouillée via les Ultra-Brèches d\'US/UL.',
    source: 'releve-communique' },
  { jeux: ['sm'], espece: 797, rencontre: 'l\'Ultra-Chimère scénarisée',
    portee: 'jeu', version: 'Pokémon Lune',
    exception: 'Non verrouillée via les Ultra-Brèches d\'US/UL.',
    source: 'releve-communique' },
  { jeux: ['sm'], espece: 798, rencontre: 'l\'Ultra-Chimère scénarisée',
    portee: 'jeu', version: 'Pokémon Soleil',
    exception: 'Non verrouillée via les Ultra-Brèches d\'US/UL.',
    source: 'releve-communique' },
  { jeux: ['sm'], espece: 799, rencontre: 'l\'Ultra-Chimère scénarisée',
    portee: 'jeu', exception: 'Non verrouillée via les Ultra-Brèches d\'US/UL.',
    source: 'releve-communique' },

  // Ultra-Soleil / Ultra-Lune, rencontres propres
  { jeux: ['usum'], espece: 101, rencontre: 'les Électrode fixes du Château Rocket',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['usum'], espece: 127, rencontre: 'les Scarabrute fixes de l\'Île Noadkoko',
    portee: 'jeu', source: 'releve-communique' },

  // ---- Let's Go ------------------------------------------------------------
  { jeux: ['letsgo'], espece: 25, rencontre: 'le Pikachu de départ, à Bourg Palette',
    portee: 'jeu', version: 'Let\'s Go Pikachu',
    exception: 'Artikodin, Électhor, Sulfura et Mewtwo, eux, se chassent.',
    source: 'releve-communique' },
  { jeux: ['letsgo'], espece: 133, rencontre: 'l\'Évoli de départ, à Bourg Palette',
    portee: 'jeu', version: 'Let\'s Go Évoli',
    exception: 'Artikodin, Électhor, Sulfura et Mewtwo, eux, se chassent.',
    source: 'releve-communique' },

  // ---- Épée / Bouclier -----------------------------------------------------
  { jeux: ['swsh'], espece: 810, rencontre: 'le starter offert', portee: 'jeu',
    source: 'releve-communique' },
  { jeux: ['swsh'], espece: 813, rencontre: 'le starter offert', portee: 'jeu',
    source: 'releve-communique' },
  { jeux: ['swsh'], espece: 816, rencontre: 'le starter offert', portee: 'jeu',
    source: 'releve-communique' },
  { jeux: ['swsh'], espece: 79, rencontre: 'le Ramoloss de Galar, Gare de Brasswick',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['swsh'], espece: 822, rencontre: 'le Bleuseille sauvage scripté de la Route 3',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['swsh'], espece: 888, rencontre: 'la rencontre de la Tour du Stade de Kickenham',
    portee: 'partout', version: 'Pokémon Épée', source: 'pokebip-impossibles' },
  { jeux: ['swsh'], espece: 889, rencontre: 'la rencontre de la Tour du Stade de Kickenham',
    portee: 'partout', version: 'Pokémon Bouclier', source: 'pokebip-impossibles' },
  { jeux: ['swsh'], espece: 890, rencontre: 'la rencontre scénarisée de la Tour du Stade',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: ['swsh'], espece: 891, rencontre: 'le Wushours offert au Dojo de la Maîtrise',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['swsh'], espece: 144, rencontre: 'l\'Artikodin de Galar, à Couronneige',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['swsh'], espece: 145, rencontre: 'l\'Électhor de Galar, aux Terres Sauvages',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['swsh'], espece: 146, rencontre: 'le Sulfura de Galar, à Isolarmure',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['swsh'], espece: 647, rencontre: 'la rencontre du Lac Poké Ball',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: ['swsh'], espece: 896, rencontre: 'la rencontre du Hameau Gelé / Temple Couronne',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['swsh'], espece: 897, rencontre: 'la rencontre du Hameau Gelé / Temple Couronne',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['swsh'], espece: 898, rencontre: 'la rencontre du Hameau Gelé / Temple Couronne',
    portee: 'jeu', source: 'releve-communique' },

  // ---- Diamant Étincelant / Perle Scintillante ----------------------------
  { jeux: ['bdsp'], espece: 151,
    rencontre: 'le Mew offert à Floraville — demande une sauvegarde Let\'s Go',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['bdsp'], espece: 385,
    rencontre: 'le Jirachi offert à Floraville — demande une sauvegarde Épée / Bouclier',
    portee: 'jeu', source: 'releve-communique' },

  // ---- Écarlate / Violet — début de partie --------------------------------
  { jeux: ['sv'], espece: 906, rencontre: 'le starter offert', portee: 'jeu',
    source: 'releve-communique' },
  { jeux: ['sv'], espece: 909, rencontre: 'le starter offert', portee: 'jeu',
    source: 'releve-communique' },
  { jeux: ['sv'], espece: 912, rencontre: 'le starter offert', portee: 'jeu',
    source: 'releve-communique' },
  { jeux: ['sv'], espece: 915, rencontre: 'le Gourmelet scripté du tutoriel de capture',
    portee: 'jeu', source: 'releve-communique' },

  // Pokémon Dominants — les instances uniques, pas les espèces sauvages.
  { jeux: ['sv'], espece: 950, rencontre: 'le Dominant — rencontre unique',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 968, rencontre: 'le Dominant — rencontre unique',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 962, rencontre: 'le Dominant — rencontre unique',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 984, rencontre: 'le Dominant — rencontre unique',
    portee: 'jeu', version: 'Pokémon Écarlate', source: 'releve-communique' },
  { jeux: ['sv'], espece: 990, rencontre: 'le Dominant — rencontre unique',
    portee: 'jeu', version: 'Pokémon Violet', source: 'releve-communique' },
  { jeux: ['sv'], espece: 978, rencontre: 'le Dominant — rencontre unique',
    portee: 'jeu', source: 'releve-communique' },

  { jeux: ['sv'], espece: 999,
    rencontre: 'les Mordudor forme Coffre des tours et ruines de Paldea',
    portee: 'jeu',
    note: 'Ce sont ces rencontres fixes-là, pas l\'espèce en général.',
    source: 'releve-communique' },

  // Trésors du Fléau
  { jeux: ['sv'], espece: 1001, rencontre: 'la rencontre du Sanctuaire du Bois Mourant',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 1002, rencontre: 'la rencontre du Sanctuaire du Sol Gelé',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 1003, rencontre: 'la rencontre du Sanctuaire du Sol Corrompu',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 1004, rencontre: 'la rencontre du Sanctuaire du Feu Dévastateur',
    portee: 'jeu', source: 'releve-communique' },

  { jeux: ['sv'], espece: 1007, rencontre: 'la rencontre scénarisée du légendaire',
    portee: 'jeu', version: 'Pokémon Écarlate', source: 'releve-communique' },
  { jeux: ['sv'], espece: 1008, rencontre: 'la rencontre scénarisée du légendaire',
    portee: 'jeu', version: 'Pokémon Violet', source: 'releve-communique' },

  // Le Masque Turquoise
  { jeux: ['sv'], espece: 58, rencontre: 'le Caninos de Hisui offert — Masque Turquoise',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 901,
    rencontre: 'l\'Ursaking Lune Vermeille de la quête de Lithia — rencontre unique',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 1014, rencontre: 'la rencontre fixe de Septentria',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 1015, rencontre: 'la rencontre fixe de Septentria',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 1016, rencontre: 'la rencontre fixe de Septentria',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 1017, rencontre: 'la rencontre scénarisée du Mont Strueux',
    portee: 'jeu', source: 'releve-communique' },

  // Le Disque Indigo
  { jeux: ['sv'], espece: 387, rencontre: 'le Tortipouss offert — Disque Indigo',
    portee: 'jeu',
    note: 'Le Tortipouss sauvage, lui, se chasse. C\'est l\'exemplaire offert qui est verrouillé.',
    source: 'releve-communique' },
  { jeux: ['sv'], espece: 390, rencontre: 'l\'Ouisticram offert — Disque Indigo',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 393, rencontre: 'le Tiplouf offert — Disque Indigo',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 891, rencontre: 'le Wushours obtenu par évènement interne',
    portee: 'jeu', source: 'releve-communique' },

  // Paradoxes uniques de la Zone Zéro
  { jeux: ['sv'], espece: 1020, rencontre: 'la rencontre fixe de la Zone Zéro',
    portee: 'jeu', version: 'Pokémon Écarlate', source: 'releve-communique' },
  { jeux: ['sv'], espece: 1021, rencontre: 'la rencontre fixe de la Zone Zéro',
    portee: 'jeu', version: 'Pokémon Écarlate', source: 'releve-communique' },
  { jeux: ['sv'], espece: 1022, rencontre: 'la rencontre fixe de la Zone Zéro',
    portee: 'jeu', version: 'Pokémon Violet', source: 'releve-communique' },
  { jeux: ['sv'], espece: 1023, rencontre: 'la rencontre fixe de la Zone Zéro',
    portee: 'jeu', version: 'Pokémon Violet', source: 'releve-communique' },

  { jeux: ['sv'], espece: 1024,
    rencontre: 'la rencontre scénarisée des Profondeurs de la Zone Zéro',
    portee: 'partout', source: 'pokebip-impossibles' },
  { jeux: ['sv'], espece: 648, rencontre: 'la rencontre spéciale du Terra-Dôme',
    portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 1025, rencontre: 'la rencontre scénarisée de l\'épilogue, Septentria',
    portee: 'jeu', source: 'releve-communique' },

  // Les légendaires débloqués par les friandises de Jeffry Andise. Vingt-quatre
  // rencontres fixes, toutes verrouillées — et c'est ici que l'exemple
  // d'Électhor se referme : verrouillé dans X et Y, verrouillé ici, chassable
  // à Couronneige.
  { jeux: ['sv'], espece: 144, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 145, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 146, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 243, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 244, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 245, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 249, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 250, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 380, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 381, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 382, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 383, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 384, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 638, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 639, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 640, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 643, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 644, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 646, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 791, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 792, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 800, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 896, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },
  { jeux: ['sv'], espece: 897, rencontre: 'la rencontre fixe des friandises', portee: 'jeu', source: 'releve-communique' },

  // ---- Sans rencontre en jeu : seulement distribués ------------------------
  { jeux: [], espece: 648, rencontre: 'toute distribution', portee: 'partout',
    source: 'pokebip-impossibles' },
  { jeux: [], espece: 649, rencontre: 'toute distribution', portee: 'partout',
    source: 'pokebip-impossibles' },
  { jeux: [], espece: 719, rencontre: 'toute distribution', portee: 'partout',
    source: 'pokebip-impossibles' },
  { jeux: [], espece: 720, rencontre: 'toute distribution', portee: 'partout',
    source: 'pokebip-impossibles' },
  { jeux: [], espece: 721, rencontre: 'toute distribution', portee: 'partout',
    source: 'pokebip-impossibles' },
  { jeux: [], espece: 801, rencontre: 'la distribution par QR Code', portee: 'partout',
    source: 'pokebip-impossibles' },
  { jeux: [], espece: 802, rencontre: 'toute distribution', portee: 'partout',
    source: 'pokebip-impossibles' },
  { jeux: [], espece: 807, rencontre: 'toute distribution', portee: 'partout',
    note: 'Un Zeraora chromatique a existé via l\'évènement Pokémon HOME de 2020 : c\'est une distribution, pas une chasse.',
    source: 'pokebip-impossibles' },
  { jeux: [], espece: 808, rencontre: 'la Boîte Mystère de Pokémon GO', portee: 'partout',
    source: 'pokebip-impossibles' },
  { jeux: [], espece: 809, rencontre: 'l\'évolution depuis Pokémon GO', portee: 'partout',
    source: 'pokebip-impossibles' },
  { jeux: [], espece: 893, rencontre: 'toute distribution', portee: 'partout',
    source: 'pokebip-impossibles' }
];

// ---------------------------------------------------------------------------
// LES RÈGLES. Elles ne visent aucune espèce en particulier : c'est une
// catégorie entière de rencontres qui est verrouillée. Les écrire espèce par
// espèce aurait demandé des centaines de lignes pour répéter la même phrase.
const REGLES_VERROU = [
  { jeux: ['hgss'],
    texte: 'Aucun Pokémon obtenu par le Pokéwalker ne peut être chromatique.',
    source: 'releve-communique' },
  { jeux: ['bw', 'b2w2'],
    texte: 'Les Pokémon de la Forêt du Heylink ne peuvent pas être chromatiques. '
      + 'Ceux qui portent une capacité exclusive ne le deviennent que par reproduction.',
    source: 'pokepedia-shinylock' },
  { jeux: ['b2w2'],
    texte: 'Aucun des Pokémon de N ne peut être chromatique, où qu\'on les '
      + 'rencontre à Unys : leur DO, leur ID, leurs IV et leur PID sont écrits '
      + 'd\'avance dans le jeu.',
    source: 'pokepedia-shinylock' },
  { jeux: ['b2w2'],
    texte: 'Les Pokémon des Trouées Cachées suivent la même règle : pas de '
      + 'chromatique sur place, et seulement par reproduction pour ceux à '
      + 'capacité exclusive.',
    source: 'pokepedia-shinylock' },
  { jeux: ['sm', 'usum'],
    texte: 'Les Pokémon capturables pendant les Épreuves d\'Alola sont '
      + 'verrouillés — ce sont des rencontres scénarisées.',
    source: 'releve-communique' },
  { jeux: ['usum'],
    texte: 'Les Pokémon Dominants offerts par Chen en récompense des Emblèmes '
      + 'sont verrouillés, ainsi que ceux des mini-quêtes — sauf les Métamorph '
      + 'd\'Akala.',
    source: 'releve-communique' },
  { jeux: ['usum'],
    texte: 'Les Ultra-Chimères rencontrées par les Ultra-Brèches, elles, ne '
      + 'sont PAS verrouillées. C\'est la différence avec Soleil et Lune.',
    source: 'releve-communique' },
  { jeux: ['swsh'],
    texte: 'Tous les Pokémon directement donnés sont verrouillés — sauf les '
      + 'fossiles, qui se chassent.',
    source: 'releve-communique' },
  { jeux: ['swsh'],
    texte: 'Un Pokémon sauvage trop fort pour votre nombre de badges ne peut '
      + 'pas être chromatique. Les rencontres fixes, comme l\'Onix de la Plaine '
      + 'Verdoyante, ne sont pas concernées.',
    source: 'releve-communique' },
  { jeux: ['swsh'],
    texte: 'Les légendaires des Expéditions Dynamax, les Regi et le trio '
      + 'Cobaltium / Terrakium / Viridium échappent au verrou général : ils se '
      + 'chassent.',
    source: 'releve-communique' },
  { jeux: ['pla'],
    texte: 'Tous les Pokémon offerts sont verrouillés, ainsi que tous ceux que '
      + 'font apparaître les missions principales et les requêtes secondaires.',
    source: 'releve-communique' },
  { jeux: ['pla'],
    texte: 'Les vingt-huit Zarbi disséminés dans Hisui sont tous verrouillés.',
    source: 'releve-communique' },
  { jeux: ['pla'],
    texte: 'Tous les légendaires et fabuleux d\'Hisui sont verrouillés : les '
      + 'fées du lac, Heatran, Cresselia, Regigigas, Dialga, Palkia, '
      + 'Giratina, le trio des génies, Amovénus, Shaymin, Darkrai et Arceus.',
    source: 'releve-communique' }
];

// ---------------------------------------------------------------------------
// À VÉRIFIER — ce qui n'est pas tranché, et qui ne doit pas se faire oublier.
/**
 * Cette espèce est-elle verrouillée, et où ?
 *
 * UNE FONCTION DANS UN FICHIER DE DONNÉES, et c'est réfléchi : elle ne dessine
 * rien, elle répond à une question SUR la table. Deux écrans la posent — le
 * Pokédex pour son filtre, et l'écran des verrous — et la loger dans l'un des
 * deux ferait dépendre l'autre d'un écran.
 *
 * CE QUE « VERROUILLÉ » VEUT DIRE DÉPEND D'OÙ L'ON REGARDE. C'est toute la
 * nuance que cette table a coûté à établir, et le filtre doit la porter :
 *
 *   · dans le Pokédex d'un JEU, c'est « une rencontre d'ici est verrouillée ».
 *     La question qu'on se pose en y jouant, et la seule qui aide ;
 *   · au National, où aucun jeu n'est ouvert, seul « partout » se soutient.
 *     Y faire apparaître Roucool parce que le scripté de la Route 2 de X et Y
 *     est verrouillé laisserait croire l'espèce condamnée — alors qu'elle se
 *     chasse dans à peu près tous les jeux où elle figure.
 */
function verrouillePour(speciesId, cleJeu){
  if(typeof VERROUS === 'undefined') return false;
  return VERROUS.some(function(v){
    if(v.espece !== speciesId) return false;
    if(!cleJeu) return v.portee === 'partout';
    return !!v.jeux && v.jeux.indexOf(cleJeu) !== -1;
  });
}

const VERROUS_A_VERIFIER = [
  { quoi: 'Les quatre Tokorico, Solgaleo, Lunala et Necrozma',
    pourquoi: 'Deux lectures s\'opposent. Pokébip les donne « verrouillés au '
      + 'taux plein seulement », donc chassables en Aura Rencontre ; le relevé '
      + 'communiqué les donne verrouillés tout court. Ils sont rangés en '
      + '« taux » — la lecture la moins décourageante des deux, et la seule '
      + 'que j\'aie lue à la source. À trancher.' },
  { espece: 718, quoi: 'Zygarde en « taux plein seul »',
    pourquoi: 'L\'ancienne table le classait ainsi. La page relue ne le cite '
      + 'pas parmi les sept concernés. Sa rencontre de X/Y et celle d\'Alola '
      + 'sont, elles, bien verrouillées.' },
  { quoi: 'Manaphy, l\'œuf du Pokémon Ranger et celui de DEPS',
    pourquoi: 'Écarté d\'ici : l\'œuf se shasse par la mécanique d\'échange, et '
      + 'la distribution relève de l\'écran Cadeau Mystère.' },
  { quoi: 'Les lignes marquées « relevé communiqué »',
    pourquoi: 'Reprises telles quelles et non recoupées ligne à ligne à la '
      + 'source. Les numéros, eux, sont résolus contre la réserve embarquée.' }
];
