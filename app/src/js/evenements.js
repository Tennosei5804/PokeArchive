// Les distributions françaises, évènement par évènement.
// Script classique (pas de module ES), chargé AVANT cadeaux.js et fiche.js,
// qui s'en servent tous les deux.
//
// D'où ça vient : les pages « Distributions ayant eu lieu en France » de
// l'Evendex de Pokébip, une par génération. C'est volontairement cette
// source-là et pas le catalogue mondial : un Zeraora distribué au Japon
// n'aidera jamais à compléter une collection ici, et faire miroiter un
// évènement auquel personne n'a eu accès rend la page trompeuse.
//
// Ce qui n'y figure pas, et n'y figurera pas :
//
//   · les Pokémon de tournoi (Worlds, VGC). Réservés aux participants, ils ne
//     concernent pas une collection ordinaire, et noieraient les vraies
//     distributions sous des Dracaufeu de compétition ;
//   · les espèces ordinaires distribuées en évènement. Cette page répond à
//     « qu'est-ce qui NE s'obtient QUE par distribution ? » — un Pikachu se
//     capture partout, sa casquette de Kalos non.
//
// Quand une entrée n'a aucune distribution française recensée, elle n'a pas de
// ligne ici du tout : « aucune » se dit en le disant, pas en inventant.

const VOIES = {
  local:    { court: "Sur place",        long: "Distribué sur place, lors d'un évènement ou en boutique" },
  wifi:     { court: "Wi-Fi",            long: "Téléchargement par Wi-Fi, depuis le Cadeau Mystère" },
  nintendo: { court: "Nintendo Network", long: "Téléchargement par le Nintendo Network" },
  code:     { court: "Code série",       long: "Code de série à saisir dans le Cadeau Mystère" },
  qr:       { court: "QR Code",          long: "QR Code à scanner dans le jeu" },
  banque:   { court: "Banque Pokémon",   long: "Réceptionné par la Banque Pokémon" },
  home:     { court: "Pokémon HOME",     long: "Réceptionné par Pokémon HOME" },
  ballplus: { court: "Poké Ball Plus",   long: "Contenu dans la Poké Ball Plus" },
  demo:     { court: "Démo",             long: "Réceptionné depuis la version de démonstration" },
  jeu:      { court: "En jeu",           long: "Objet distribué, puis rencontre dans le jeu" }
};

// Par identifiant PokeAPI : le numéro national pour un fabuleux, celui de la
// forme pour une forme évènementielle. Les deux ne se chevauchent jamais.
const DISTRIBUTIONS_FR = {
  // ---- Fabuleux ------------------------------------------------------------
  151: [ // Mew
    { ev: "Mew France", quand: "1er juillet 2000", annee: 2000, jeux: "Rouge · Bleu · Jaune", voie: "local",
      ou: "tournoi Pokémon, Paris Porte de Versailles" },
    { ev: "Mew France", quand: "2002", annee: 2002, jeux: "Rouge · Bleu · Jaune", voie: "local",
      ou: "pokemon.tm.fr — cartouche à renvoyer à Nintendo France" },
    { ev: "Mew Automne 2010", quand: "15 – 30 octobre 2010", annee: 2010, jeux: "HeartGold · SoulSilver", voie: "wifi" },
    { ev: "Mew GF", quand: "27 janvier – 30 juin 2016", annee: 2016, jeux: "X · Y · Rubis Oméga · Saphir Alpha",
      voie: "code", ou: "20 ans de Pokémon" },
    { ev: "Mew Poké Ball Plus", quand: "à partir du 16 novembre 2018", annee: 2018,
      jeux: "Let's Go Pikachu · Let's Go Évoli", voie: "ballplus" },
    { ev: "Mew Poké Ball Plus", quand: "à partir du 15 novembre 2019", annee: 2019, jeux: "Épée · Bouclier",
      voie: "ballplus" }
  ],
  251: [ // Celebi
    { ev: "Celebi Tour", quand: "2001", annee: 2001, jeux: "Or · Argent", voie: "local",
      ou: "Parc Floral de Vincennes, Paris" },
    { ev: "Celebi Hiver 2011", quand: "1er février – 3 mars 2011", annee: 2011,
      jeux: "Diamant · Perle · Platine · HeartGold · SoulSilver", voie: "local" },
    { ev: "Celebi Banque Pokémon", quand: "25 décembre 2013 – 30 septembre 2014", annee: 2014, jeux: "X · Y",
      voie: "banque" },
    { ev: "Celebi GF", quand: "1er – 24 mars 2016", annee: 2016, jeux: "X · Y · Rubis Oméga · Saphir Alpha",
      voie: "nintendo", ou: "20 ans de Pokémon" },
    { ev: "Celebi Or et Argent VC", quand: "22 septembre 2017 – 31 octobre 2018", annee: 2018,
      jeux: "Soleil · Lune · Ultra-Soleil · Ultra-Lune", voie: "code",
      ou: "achat d'Or ou Argent sur Console Virtuelle" },
    { ev: "Celebi Film 23", quand: "à partir du 7 octobre 2021", annee: 2021, jeux: "Épée · Bouclier",
      voie: "code", chromatique: true }
  ],
  385: [ // Jirachi
    { ev: "Jirachi Été 2010", quand: "26 juin – 16 juillet 2010", annee: 2010,
      jeux: "Diamant · Perle · Platine · HeartGold · SoulSilver", voie: "wifi" },
    { ev: "Jirachi GF", quand: "1er – 24 avril 2016", annee: 2016, jeux: "X · Y · Rubis Oméga · Saphir Alpha",
      voie: "nintendo", ou: "20 ans de Pokémon" }
  ],
  386: [ // Deoxys
    { ev: "Deoxys Île Aurore", quand: "2004 – 2006", annee: 2004,
      jeux: "Rouge Feu · Vert Feuille · Émeraude", voie: "jeu", ou: "Ticket Aurore, puis Île Aurore" },
    { ev: "Deoxys Plasma", quand: "1er – 22 juillet 2013", annee: 2013, jeux: "Noire 2 · Blanche 2", voie: "wifi" }
  ],
  490: [ // Manaphy
    { ev: "Manaphy GF", quand: "1er – 24 juin 2016", annee: 2016, jeux: "X · Y · Rubis Oméga · Saphir Alpha",
      voie: "nintendo", ou: "20 ans de Pokémon" }
  ],
  491: [ // Darkrai
    { ev: "Darkrai ALAMOS", quand: "3 – 6 juillet 2008", annee: 2008, jeux: "Diamant · Perle", voie: "local",
      ou: "Japan Expo, Paris" },
    { ev: "Darkrai Carte Membre", quand: "2008 – 2009", annee: 2008, jeux: "Platine", voie: "jeu",
      ou: "Carte Membre, puis Île de Fer" },
    { ev: "Darkrai Hiver 2011", quand: "2011", annee: 2011, jeux: "Noire · Blanche", voie: "local" },
    { ev: "Darkrai GF", quand: "1er mai – 30 septembre 2016", annee: 2016,
      jeux: "X · Y · Rubis Oméga · Saphir Alpha", voie: "code", ou: "20 ans de Pokémon" }
  ],
  492: [ // Shaymin
    { ev: "Shaymin Movie 11", quand: "9 mai – 15 juin 2009", annee: 2009, jeux: "Diamant · Perle", voie: "local" },
    { ev: "Shaymin Lettre Chen", quand: "2009", annee: 2009, jeux: "Platine", voie: "jeu",
      ou: "Lettre du Prof. Chen, puis Jardin Floral" },
    { ev: "Shaymin GF", quand: "1er – 24 juillet 2016", annee: 2016, jeux: "X · Y · Rubis Oméga · Saphir Alpha",
      voie: "nintendo", ou: "20 ans de Pokémon" }
  ],
  493: [ // Arceus
    { ev: "Arceus MICHINA", quand: "26 mars – 11 avril 2010", annee: 2010, jeux: "Diamant · Perle · Platine",
      voie: "local" },
    { ev: "Arceus Vote", quand: "5 novembre 2010 – 31 janvier 2011, puis 1er février – 1er mai 2012",
      annee: 2012, jeux: "Noire · Blanche", voie: "code" },
    { ev: "Arceus GF", quand: "30 juillet – 31 décembre 2016", annee: 2016,
      jeux: "X · Y · Rubis Oméga · Saphir Alpha", voie: "code", ou: "20 ans de Pokémon" },
    { ev: "Arceus Flûte Azur", quand: "jamais distribué officiellement", annee: null, jeux: "Platine",
      voie: "jeu", ou: "Flûte Azur, puis Colonne Lance", jamais: true }
  ],
  494: [ // Victini
    { ev: "Victini Île Liberté", quand: "2010 – 2011", annee: 2010, jeux: "Noire · Blanche", voie: "jeu",
      ou: "Ticket Liberté, puis Île Liberté" },
    { ev: "Victini Movie 14", quand: "1er – 30 juin 2012", annee: 2012, jeux: "Noire · Blanche", voie: "wifi" },
    { ev: "Victini GF", quand: "1er – 24 septembre 2016", annee: 2016, jeux: "X · Y · Rubis Oméga · Saphir Alpha",
      voie: "nintendo", ou: "20 ans de Pokémon" }
  ],
  647: [ // Keldeo
    { ev: "Keldeo Été 2012", quand: "2012 – 2013", annee: 2012, jeux: "Noire · Blanche", voie: "local" },
    { ev: "Keldeo Hiver 2013", quand: "16 janvier – 12 février 2013", annee: 2013, jeux: "Noire 2 · Blanche 2",
      voie: "wifi" },
    { ev: "Keldeo GF", quand: "1er – 24 octobre 2016", annee: 2016, jeux: "X · Y · Rubis Oméga · Saphir Alpha",
      voie: "nintendo", ou: "20 ans de Pokémon" }
  ],
  648: [ // Meloetta
    { ev: "Meloetta Printemps 2013", quand: "2013", annee: 2013,
      jeux: "Noire · Blanche · Noire 2 · Blanche 2", voie: "local" },
    { ev: "Meloetta GF", quand: "1er – 24 décembre 2016", annee: 2016, jeux: "X · Y · Rubis Oméga · Saphir Alpha",
      voie: "nintendo", ou: "20 ans de Pokémon" }
  ],
  649: [ // Genesect
    { ev: "Genesect Plasma", quand: "11 octobre – 12 novembre 2012", annee: 2012, jeux: "Noire 2 · Blanche 2",
      voie: "wifi" },
    { ev: "Genesect GF", quand: "1er novembre 2016 – 28 février 2017", annee: 2017,
      jeux: "X · Y · Rubis Oméga · Saphir Alpha", voie: "code", ou: "20 ans de Pokémon" }
  ],
  719: [ // Diancie
    { ev: "Diancie Automne 2014", quand: "23 octobre 2014 – 25 février 2015", annee: 2014, jeux: "X · Y",
      voie: "code" },
    { ev: "Diancie Hope", quand: "24 – 27 juillet 2015", annee: 2015, jeux: "Rubis Oméga · Saphir Alpha",
      voie: "nintendo" }
  ],
  720: [ // Hoopa
    { ev: "Hoopa Harry", quand: "10 octobre 2015 – 15 avril 2016", annee: 2016,
      jeux: "X · Y · Rubis Oméga · Saphir Alpha", voie: "code" }
  ],
  721: [ // Volcanion
    { ev: "Volcanion Helen", quand: "1er octobre 2016 – 31 janvier 2017", annee: 2017,
      jeux: "X · Y · Rubis Oméga · Saphir Alpha", voie: "code" }
  ],
  801: [ // Magearna
    { ev: "Magearna QR Code", quand: "à partir du 18 novembre 2016, en permanence", annee: 2016,
      jeux: "Soleil · Lune · Ultra-Soleil · Ultra-Lune", voie: "qr", permanent: true },
    { ev: "Magearna Pokémon HOME", quand: "une fois le haut fait accompli", annee: 2020,
      jeux: "Épée · Bouclier", voie: "home", permanent: true }
  ],
  807: [ // Zeraora
    { ev: "Zeraora Fula", quand: "1er octobre 2018 – 24 janvier 2019", annee: 2019,
      jeux: "Ultra-Soleil · Ultra-Lune", voie: "code" },
    { ev: "Zeraora Chromatique Pokémon HOME", quand: "30 juin – 7 juillet 2020", annee: 2020,
      jeux: "Épée · Bouclier", voie: "home", chromatique: true }
  ],
  893: [ // Zarude
    { ev: "Zarude Film 23", quand: "13 novembre 2020 – 31 mars 2021", annee: 2021, jeux: "Épée · Bouclier",
      voie: "code" }
  ],

  // ---- Formes qui n'existent que par une distribution -----------------------
  10094: [ // Pikachu, casquette d'origine
    { ev: "Pikachu de Sacha : Casquette Originale", quand: "19 – 25 septembre 2017", annee: 2017,
      jeux: "Soleil · Lune", voie: "code" },
    { ev: "Pikachu Célébration Couronneige", quand: "29 septembre – 30 novembre 2020", annee: 2020,
      jeux: "Épée · Bouclier", voie: "code" }
  ],
  10095: [ // Casquette de Hoenn
    { ev: "Pikachu de Sacha : Casquette d'Hoenn", quand: "26 septembre – 2 octobre 2017", annee: 2017,
      jeux: "Soleil · Lune", voie: "code" },
    { ev: "Pikachu de Sacha : Casquette d'Hoenn", quand: "9 – 30 novembre 2018", annee: 2018,
      jeux: "Ultra-Soleil · Ultra-Lune", voie: "code" },
    { ev: "Pikachu Célébration Couronneige", quand: "2 octobre – 30 novembre 2020", annee: 2020,
      jeux: "Épée · Bouclier", voie: "code" }
  ],
  10096: [ // Casquette de Sinnoh
    { ev: "Pikachu de Sacha : Casquette de Sinnoh", quand: "3 – 9 octobre 2017", annee: 2017,
      jeux: "Soleil · Lune", voie: "code" },
    { ev: "Pikachu de Sacha : Casquette de Sinnoh", quand: "9 – 30 novembre 2018", annee: 2018,
      jeux: "Ultra-Soleil · Ultra-Lune", voie: "code" },
    { ev: "Pikachu Célébration Couronneige", quand: "9 octobre – 30 novembre 2020", annee: 2020,
      jeux: "Épée · Bouclier", voie: "code" }
  ],
  10097: [ // Casquette d'Unys
    { ev: "Pikachu de Sacha : Casquette d'Unys", quand: "10 – 16 octobre 2017", annee: 2017,
      jeux: "Soleil · Lune", voie: "code" },
    { ev: "Pikachu de Sacha : Casquette d'Unys", quand: "9 – 30 novembre 2018", annee: 2018,
      jeux: "Ultra-Soleil · Ultra-Lune", voie: "code" },
    { ev: "Pikachu Célébration Couronneige", quand: "16 octobre – 30 novembre 2020", annee: 2020,
      jeux: "Épée · Bouclier", voie: "code" }
  ],
  10098: [ // Casquette de Kalos
    { ev: "Pikachu de Sacha : Casquette de Kalos", quand: "17 – 23 octobre 2017", annee: 2017,
      jeux: "Soleil · Lune", voie: "code" },
    { ev: "Pikachu de Sacha : Casquette de Kalos", quand: "9 – 30 novembre 2018", annee: 2018,
      jeux: "Ultra-Soleil · Ultra-Lune", voie: "code" },
    { ev: "Pikachu Célébration Couronneige", quand: "18 octobre – 30 novembre 2020", annee: 2020,
      jeux: "Épée · Bouclier", voie: "code" }
  ],
  10099: [ // Casquette d'Alola
    { ev: "Pikachu de Sacha : Casquette d'Alola", quand: "24 – 30 octobre 2017", annee: 2017,
      jeux: "Soleil · Lune", voie: "code",
      ou: "un bug de distribution l'a aussi rendu disponible du 10 au 12 octobre" },
    { ev: "Pikachu de Sacha : Casquette d'Alola", quand: "9 – 30 novembre 2018", annee: 2018,
      jeux: "Ultra-Soleil · Ultra-Lune", voie: "code" },
    { ev: "Pikachu Célébration Couronneige", quand: "23 octobre – 30 novembre 2020", annee: 2020,
      jeux: "Épée · Bouclier", voie: "code" }
  ],
  10148: [ // Casquette partenaire
    { ev: "Pikachu Casquette Partenaire du Film", quand: "à partir du 17 novembre 2017, en permanence",
      annee: 2017, jeux: "Ultra-Soleil · Ultra-Lune", voie: "qr", permanent: true },
    { ev: "Pikachu Célébration Couronneige", quand: "29 septembre – 30 novembre 2020", annee: 2020,
      jeux: "Épée · Bouclier", voie: "code" }
  ],
  10160: [ // Casquette du monde
    { ev: "Pikachu Célébration Couronneige", quand: "30 octobre – 30 novembre 2020", annee: 2020,
      jeux: "Épée · Bouclier", voie: "code" }
  ],
  10117: [ // Amphinobi de Sacha
    { ev: "Amphinobi de Sacha Démo", quand: "à partir du 18 novembre 2016", annee: 2016,
      jeux: "Soleil · Lune", voie: "demo", ou: "version de démonstration de Soleil et Lune" }
  ],
  10192: [ // Zarude Dada
    { ev: "Zarude Papa Film 23", quand: "à partir du 7 octobre 2021", annee: 2021, jeux: "Épée · Bouclier",
      voie: "code" }
  ]
};

// Pichu Troizépi n'a pas d'identifiant à lui (voir NOMS_EVENEMENT dans
// cadeaux.js) : il se repère par son nom, comme partout ailleurs.
const DISTRIBUTIONS_FR_PAR_NOM = {
  "pichu-spiky-eared": [
    { ev: "Pichu Troizépi", quand: "2010", annee: 2010, jeux: "HeartGold · SoulSilver", voie: "jeu",
      ou: "amener au Bois aux Chênes le Pichu chromatique distribué du 5 au 25 mars 2010" }
  ]
};

// Ce que l'application sait des distributions françaises d'une entrée.
// Un tableau vide veut dire « aucune recensée », et c'est une information :
// Marshadow, par exemple, n'a jamais été distribué en France.
function distributionsFr(entree){
  if(!entree) return [];
  return DISTRIBUTIONS_FR[entree.id]
      || DISTRIBUTIONS_FR_PAR_NOM[entree.name]
      || [];
}

function libelleVoie(cle){
  return (VOIES[cle] || {}).court || cle;
}

// La dernière en date, pour la ligne de résumé d'une carte. Les distributions
// permanentes passent devant : elles sont encore ouvertes aujourd'hui.
function derniereDistribution(liste){
  let meilleure = null;
  liste.forEach(function(d){
    if(d.jamais) return;
    if(!meilleure){ meilleure = d; return; }
    if(d.permanent && !meilleure.permanent){ meilleure = d; return; }
    if(meilleure.permanent && !d.permanent) return;
    if((d.annee || 0) > (meilleure.annee || 0)) meilleure = d;
  });
  return meilleure;
}

// Vrai si l'entrée s'obtient encore aujourd'hui sans passer par un échange.
function encoreDisponible(liste){
  return liste.some(function(d){ return d.permanent; });
}

// Les voies empruntées par une entrée, pour le filtre par méthode.
function voiesDe(liste){
  const vues = {};
  liste.forEach(function(d){ if(!d.jamais) vues[d.voie] = true; });
  return Object.keys(vues);
}
