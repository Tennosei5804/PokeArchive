// Les règles de combat : statistiques, natures, objets, talents, dégâts.
// Script classique (pas de module ES), chargé APRÈS fiche.js — d'où viennent
// TYPES_FR, puceType, fichesEmbarquees et motDico — et AVANT strategie.js, qui
// n'est que l'écran posé par-dessus.
//
// Ce fichier ne dessine que la modale de configuration d'un Pokémon ; tout le
// reste est du calcul. La séparation tient parce que l'équipe et le
// calculateur de dégâts posent exactement la même question — « ce Pokémon,
// avec quelles statistiques ? » — et méritent donc le même écran.

// ---- Les types, côté règles -------------------------------------------------
// Ces trois-là vivaient dans strategie.js, qui est un écran. Ce sont des règles :
// l'équipe, la fiche et le calculateur en dépendent tous, et aucun n'a à savoir
// qui les a écrites en premier.

const MULT_LIBELLE = { 4: '×4', 2: '×2', 1: '×1', 0.5: '×0.5', 0.25: '×0.25', 0: '×0' };

// Les types d'une entrée, une fois loadTypes() passé.
function typesDe(entry){
  if(!entry || typeof typesByPokemonId === 'undefined' || !typesByPokemonId) return [];
  return typesByPokemonId.get(entry.id) || [];
}

/**
 * Ce que donne une attaque de type « attaque » sur un défenseur de ces types.
 *
 * On renvoie aussi le détail type par type : sans lui, un ×1 sur un double type
 * reste incompréhensible — c'est un ×2 et un ×0.5 qui s'annulent, et le dire
 * évite de croire à un bug.
 */
function efficaciteOffensive(attaque, typesDef){
  const rel = TYPE_RELATIONS[attaque];
  if(!rel) return { mult: 1, detail: [] };
  let mult = 1;
  const detail = [];
  typesDef.forEach(function(def){
    let f = 1;
    if(rel.nul.indexOf(def) !== -1) f = 0;
    else if(rel.double.indexOf(def) !== -1) f = 2;
    else if(rel.moitie.indexOf(def) !== -1) f = 0.5;
    mult *= f;
    detail.push({ type: def, facteur: f });
  });
  return { mult: mult, detail: detail };
}

// ---- Les statistiques -------------------------------------------------------
// Les noms vivent dans donnees.js (STATS_NOMS), avec les types : ce sont des
// données de référence, pas des règles de combat. L'ordre est celui de la
// réserve et ne change nulle part, sous peine de tout décaler.

const EV_MAX_TOTAL = 508;   // ce que le jeu autorise sur les six réunies
const EV_MAX_STAT = 252;
const IV_MAX = 31;

// ---- Les changements de statistiques ---------------------------------------
// Danse-Lames, Grincement, Intimidation… Le jeu ne multiplie pas par un nombre
// à virgule : il applique une fraction, et tronque. (2+n)/2 vers le haut,
// 2/(2−n) vers le bas — d'où un −1 qui vaut ×2/3 et non ×0,5, contrairement à
// ce qu'on lit souvent.
const BOOST_MIN = -6;
const BOOST_MAX = 6;

function fractionBoost(n){
  return n >= 0 ? { num: 2 + n, den: 2 } : { num: 2, den: 2 - n };
}

function statAvecBoost(valeur, n){
  if(!n) return valeur;
  const f = fractionBoost(n);
  return Math.floor(valeur * f.num / f.den);
}

// « +2 (×2) », « −1 (×0.67) » : le palier seul ne dit pas ce qu'il vaut.
function libelleBoost(n){
  const f = fractionBoost(n);
  const x = f.num / f.den;
  return (n > 0 ? '+' : '') + n + ' (×' + (Math.round(x * 100) / 100) + ')';
}

// ---- Les natures ------------------------------------------------------------
// Vingt-cinq natures, dont cinq neutres. Le libellé porte l'effet en clair :
// personne ne choisit « Modeste » de mémoire, on choisit « +Atk Spé ».
const NATURES = [
  { cle:'hardi',    nom:'Hardi',    plus:null, moins:null },
  { cle:'docile',   nom:'Docile',   plus:null, moins:null },
  { cle:'serieux',  nom:'Sérieux',  plus:null, moins:null },
  { cle:'pudique',  nom:'Pudique',  plus:null, moins:null },
  { cle:'bizarre',  nom:'Bizarre',  plus:null, moins:null },
  { cle:'solo',     nom:'Solo',     plus:1, moins:2 },
  { cle:'brave',    nom:'Brave',    plus:1, moins:5 },
  { cle:'assure',   nom:'Assuré',   plus:1, moins:3 },
  { cle:'malin',    nom:'Malin',    plus:1, moins:4 },
  { cle:'assidu',   nom:'Assidu',   plus:2, moins:1 },
  { cle:'relax',    nom:'Relax',    plus:2, moins:5 },
  { cle:'malpoli',  nom:'Malpoli',  plus:2, moins:3 },
  { cle:'lache',    nom:'Lâche',    plus:2, moins:4 },
  { cle:'modeste',  nom:'Modeste',  plus:3, moins:1 },
  { cle:'doux',     nom:'Doux',     plus:3, moins:2 },
  { cle:'discret',  nom:'Discret',  plus:3, moins:5 },
  { cle:'foufou',   nom:'Foufou',   plus:3, moins:4 },
  { cle:'calme',    nom:'Calme',    plus:4, moins:1 },
  { cle:'gentil',   nom:'Gentil',   plus:4, moins:2 },
  { cle:'prudent',  nom:'Prudent',  plus:4, moins:3 },
  { cle:'sage',     nom:'Sage',     plus:4, moins:5 },
  { cle:'timide',   nom:'Timide',   plus:5, moins:1 },
  { cle:'presse',   nom:'Pressé',   plus:5, moins:2 },
  { cle:'jovial',   nom:'Jovial',   plus:5, moins:3 },
  { cle:'naif',     nom:'Naïf',     plus:5, moins:4 }
];

function natureParCle(cle){
  return NATURES.find(function(n){ return n.cle === cle; }) || NATURES[0];
}

function libelleNature(n){
  if(n.plus === null) return n.nom + '  (neutre)';
  return n.nom + '  (+' + STATS_NOMS[n.plus] + ' / −' + STATS_NOMS[n.moins] + ')';
}

// Le coefficient appliqué à une statistique donnée.
function multNature(n, indexStat){
  if(n.plus === null || indexStat === 0) return 1;
  if(indexStat === n.plus) return 1.1;
  if(indexStat === n.moins) return 0.9;
  return 1;
}

// ---- Les objets tenus -------------------------------------------------------
// Volontairement une liste courte : ceux qui changent vraiment un calcul de
// dégâts. Les autres existent dans le jeu mais ne feraient qu'allonger un menu
// déjà long sans rien changer au résultat.
const OBJETS = {
  '':          { nom:'— aucun —' },
  'bandeau':   { nom:'Bandeau Choix',  aide:'Atk ×1,5', statOff:1, mult:1.5 },
  'mouchoir':  { nom:'Mouchoir Choix', aide:'Atk Spé ×1,5', statOff:3, mult:1.5 },
  'orbevie':   { nom:'Orbe Vie',       aide:'Dégâts ×1,3', degats:1.3 },
  'ceinture':  { nom:'Ceinture Pro',   aide:'×1,2 si c\'est super efficace', siSuperEfficace:1.2 },
  'typeboost': { nom:'Objet de type',  aide:'Charbon, Mystiherbe… : puissance ×1,2', puissance:1.2 },
  'baton':     { nom:'Bâton',          aide:'Pikachu : Atk et Atk Spé ×2', pikachu:2 },
  'veste':     { nom:'Veste de Combat', aide:'Def Spé ×1,5', statDef:4, multDef:1.5 },
  'evoluroc':  { nom:'Évoluroc',       aide:'Def et Def Spé ×1,5', statDef:'deux', multDef:1.5 }
};

// ---- Les talents qui pèsent sur les dégâts ---------------------------------
// Indexés par l'identifiant PokeAPI, c'est-à-dire celui que porte la réserve.
// Un talent absent de cette table reste sélectionnable : il n'a simplement
// aucun effet ici, et l'interface le dit plutôt que de le cacher.
const TALENTS_COMBAT = {
  91:  { nom:'Adaptabilité', aide:'STAB ×2 au lieu de ×1,5', stab:2 },
  74:  { nom:'Force Pure',   aide:'Atk ×2', statOff:1, mult:2 },
  37:  { nom:'Coloforce',    aide:'Atk ×2', statOff:1, mult:2 },
  62:  { nom:'Cran',         aide:'Atk ×1,5 si brûlé, et ignore le malus', siBrule:1.5, ignoreBrulure:true },
  101: { nom:'Technicien',   aide:'Puissance ×1,5 si elle vaut 60 ou moins', technicien:true },
  // Défense
  26:  { nom:'Lévitation',   aide:'Immunisé contre le Sol', immunise:5 },
  10:  { nom:'Absorbe-Volt', aide:'Immunisé contre l\'Électrik', immunise:13 },
  11:  { nom:'Absorbe-Eau',  aide:'Immunisé contre l\'Eau', immunise:11 },
  18:  { nom:'Torche',       aide:'Immunisé contre le Feu', immunise:10 },
  157: { nom:'Herbivore',    aide:'Immunisé contre la Plante', immunise:12 },
  78:  { nom:'Motorisé',     aide:'Immunisé contre l\'Électrik', immunise:13 },
  31:  { nom:'Paratonnerre', aide:'Immunisé contre l\'Électrik', immunise:13 },
  114: { nom:'Lavabo',       aide:'Immunisé contre l\'Eau', immunise:11 },
  47:  { nom:'Isograisse',   aide:'Feu et Glace ×0,5', attenue:[10, 15], facteur:0.5 },
  136: { nom:'Multiécaille', aide:'×0,5 à pleins PV', degatsSubis:0.5 },
  116: { nom:'Solide Roc',   aide:'×0,75 sur ce qui est super efficace', siSuperEfficaceSubi:0.75 },
  111: { nom:'Filtre',       aide:'×0,75 sur ce qui est super efficace', siSuperEfficaceSubi:0.75 },
  75:  { nom:'Coque Armure', aide:'Aucun coup critique possible', sansCritique:true },
  25:  { nom:'Garde Mystik', aide:'Aucun coup critique possible', sansCritique:true },
  87:  { nom:'Peau Sèche',   aide:'Feu ×1,25, immunisé contre l\'Eau', immunise:11, amplifie:[10], facteurAmpli:1.25 }
};

// ---- La météo ---------------------------------------------------------------
// Deux d'entre elles multiplient les dégâts, deux renforcent une défense. Le
// sable et la neige ne « font » rien à l'attaque : ils protègent un type.
const METEOS = {
  '':       { nom:'— aucune —' },
  'soleil': { nom:'Soleil',   aide:'Feu ×1,5 · Eau ×0,5', double:10, moitie:11 },
  'pluie':  { nom:'Pluie',    aide:'Eau ×1,5 · Feu ×0,5', double:11, moitie:10 },
  'sable':  { nom:'Tempête de sable', aide:'Def Spé ×1,5 pour un Roche', defType:6, defStat:4, defMult:1.5 },
  'neige':  { nom:'Neige',    aide:'Def ×1,5 pour un Glace', defType:15, defStat:2, defMult:1.5 }
};

// ---- Le terrain -------------------------------------------------------------
// Un terrain ne touche que ce qui a les pieds dessus. Un Vol, un Lévitation :
// rien ne les atteint, et c'est la moitié de l'intérêt de la mécanique.
const TERRAINS = {
  '':            { nom:'— aucun —' },
  'electrifie':  { nom:'Champ Électrifié', aide:'Électrik ×1,3 si l\'attaquant est au sol', boostAtt:13, mult:1.3 },
  'herbu':       { nom:'Champ Herbu',      aide:'Plante ×1,3 au sol · Séisme ×0,5', boostAtt:12, mult:1.3, attenueSol:true },
  'psychique':   { nom:'Champ Psychique',  aide:'Psy ×1,3 si l\'attaquant est au sol', boostAtt:14, mult:1.3 },
  'brumeux':     { nom:'Champ Brumeux',    aide:'Dragon ×0,5 si le défenseur est au sol', attenueDef:16, multDef:0.5 }
};

// Les attaques du sol que le Champ Herbu amortit.
const ATTAQUES_TERRESTRES = [89, 222, 523];   // Séisme, Magnitude, Tremblement

/**
 * Au sol ou pas.
 *
 * Un type Vol et un Lévitation flottent : ni terrain ni Séisme ne les touchent.
 * C'est la seule chose qui décide, dans ce calculateur — les objets et les
 * capacités qui font léviter passagèrement ne s'y trouvent pas.
 */
function estAuSol(jeu){
  if(!jeu) return true;
  if(typesDe(jeu.entry).indexOf(3) !== -1) return false;      // type Vol
  const t = effetTalent(jeu);
  return !(t && t.immunise === 5);                            // Lévitation
}

// ---- Les attaques à dégâts fixes --------------------------------------------
// Elles ne passent pas par la formule : leur puissance est nulle dans la
// réserve, et c'est pour ça qu'elles étaient absentes du menu. On les y remet,
// avec leur règle propre.
const DEGATS_FIXES = {
  82:  { genre:'fixe',   valeur:40, aide:'Inflige toujours 40 PV' },
  49:  { genre:'fixe',   valeur:20, aide:'Inflige toujours 20 PV' },
  69:  { genre:'niveau', aide:'Inflige autant de PV que le niveau de l\'attaquant' },
  283: { genre:'moitie', aide:'Retire la moitié des PV du défenseur' },
  12:  { genre:'ko',     aide:'K.O. en un coup, si ça touche' },
  32:  { genre:'ko',     aide:'K.O. en un coup, si ça touche' },
  90:  { genre:'ko',     aide:'K.O. en un coup, si ça touche' },
  329: { genre:'ko',     aide:'K.O. en un coup, si ça touche' }
};

// ---- Le « jeu » d'un Pokémon ------------------------------------------------
// Tout ce qui, en plus de l'espèce, décide de ce qu'il encaisse et de ce qu'il
// inflige. Un objet unique, partagé par l'équipe et le calculateur.
function nouveauJeu(entry){
  const fiche = ficheDe(entry);
  const talents = fiche && fiche.talents ? fiche.talents : [];
  return {
    entry: entry,
    niveau: 50,
    nature: 'hardi',
    ivs: [IV_MAX, IV_MAX, IV_MAX, IV_MAX, IV_MAX, IV_MAX],
    evs: [0, 0, 0, 0, 0, 0],
    // Les PV n'ont pas de palier : la case 0 reste à zéro et n'est jamais lue.
    boosts: [0, 0, 0, 0, 0, 0],
    objet: '',
    talent: talents.length ? talents[0][0] : null,
    // Quatre emplacements, comme en jeu. Un null veut dire « vide » et non
    // « pas encore choisi » : on ne remplit rien à la place du joueur.
    capacites: [null, null, null, null]
  };
}

function ficheDe(entry){
  const f = fichesEmbarquees();
  if(!f || !entry) return null;
  return f.especes[entry.id] || f.especes[entry.speciesId] || null;
}

function basesDe(entry){
  const fiche = ficheDe(entry);
  return fiche && fiche.stats ? fiche.stats : null;
}

/**
 * La formule officielle des statistiques.
 *
 * Les PV ont la leur : ils ne subissent pas la nature, et gagnent le niveau
 * plus dix. Oublier ce cas particulier donne un Pokémon deux fois trop frêle.
 */
function calculerStat(base, iv, ev, niveau, mult, estPV){
  const socle = Math.floor((2 * base + iv + Math.floor(ev / 4)) * niveau / 100);
  if(estPV) return socle + niveau + 10;
  return Math.floor((socle + 5) * mult);
}

function statsCalculees(jeu){
  const bases = basesDe(jeu.entry);
  if(!bases) return null;
  const n = natureParCle(jeu.nature);
  return bases.map(function(base, i){
    return calculerStat(base, jeu.ivs[i], jeu.evs[i], jeu.niveau, multNature(n, i), i === 0);
  });
}

function totalEV(jeu){
  return jeu.evs.reduce(function(a, b){ return a + b; }, 0);
}

// Le talent retenu, sous sa forme « effet » — null s'il n'en a aucun ici.
function effetTalent(jeu){
  return jeu && jeu.talent != null ? (TALENTS_COMBAT[jeu.talent] || null) : null;
}

function effetObjet(jeu){
  return jeu ? (OBJETS[jeu.objet] || null) : null;
}

// ---- Les dégâts -------------------------------------------------------------

/**
 * L'efficacité subie, talents compris.
 *
 * Un talent peut annuler complètement un type (Lévitation contre le Sol), en
 * diviser un autre (Isograisse) ou l'amplifier (Peau Sèche). Ces cas-là passent
 * avant tout le reste : un Pokémon immunisé ne prend rien, quel que soit le
 * calcul qui aurait suivi.
 */
function efficaciteSubie(typeAttaque, typesDef, talent){
  const notes = [];
  if(talent && talent.immunise === typeAttaque){
    return { mult: 0, notes: [talent.nom + ' : immunisé'] };
  }
  let mult = efficaciteOffensive(typeAttaque, typesDef).mult;
  if(talent && talent.attenue && talent.attenue.indexOf(typeAttaque) !== -1){
    mult *= talent.facteur;
    notes.push(talent.nom + ' ×' + talent.facteur);
  }
  if(talent && talent.amplifie && talent.amplifie.indexOf(typeAttaque) !== -1){
    mult *= talent.facteurAmpli;
    notes.push(talent.nom + ' ×' + talent.facteurAmpli);
  }
  return { mult: mult, notes: notes };
}

/**
 * Un jet, dans l'ordre exact du jeu : chaque multiplication est tronquée avant
 * la suivante. Refaire le calcul en flottant donne des valeurs fausses de un ou
 * deux points, et ce sont justement celles qui décident d'un K.O.
 */
function unJetDegats(base, alea, m){
  let d = Math.floor(base * alea / 100);
  if(m.crit) d = Math.floor(d * 1.5);
  if(m.stab !== 1) d = Math.floor(d * m.stab);
  d = Math.floor(d * m.eff);
  if(m.brulure) d = Math.floor(d * 0.5);
  m.apres.forEach(function(f){ d = Math.floor(d * f); });
  return m.eff === 0 ? 0 : Math.max(1, d);
}

/**
 * Le calcul complet, du jeu de l'attaquant à la fourchette des seize jets.
 *
 * Renvoie aussi « notes » : la liste, en clair, de tout ce qui a joué. Sans
 * elle, un résultat qui double sans raison visible ressemble à un bug — alors
 * que c'est un Bandeau Choix ou une Adaptabilité qu'on avait oubliés.
 */
function analyseDegats(att, def, idCapacite, reserve, options){
  const c = reserve && reserve.capacites ? reserve.capacites[idCapacite] : null;
  const statsA = statsCalculees(att);
  const statsD = statsCalculees(def);
  if(!c || !statsA || !statsD) return null;

  const physique = c[3] === 2;
  const typeAttaque = c[2];
  const talentA = effetTalent(att);
  const talentD = effetTalent(def);
  const objetA = effetObjet(att);
  const objetD = effetObjet(def);
  const notes = [];
  const meteo = METEOS[(options && options.meteo) || ''] || METEOS[''];
  const terrain = TERRAINS[(options && options.terrain) || ''] || TERRAINS[''];
  const coups = Math.max(1, (options && options.coups) || 1);

  // --- Les attaques à dégâts fixes sortent avant la formule ---
  // Elles ne se calculent pas, elles se lisent. Les faire passer par le reste
  // aurait produit un nombre, et un nombre faux.
  const fixe = DEGATS_FIXES[idCapacite];
  if(fixe){
    const typesDefFixe = typesDe(def.entry);
    const effFixe = efficaciteSubie(typeAttaque, typesDefFixe, talentD);
    const PVfixe = statsD[0];
    if(effFixe.mult === 0){
      return { capacite: c, physique: physique, puissance: 0, A: 0, D: 0, PV: PVfixe,
        typesD: typesDefFixe, eff: 0, stab: 1, crit: false, brulure: false,
        min: 0, max: 0, coups: 1, fixe: fixe,
        notes: effFixe.notes.length ? effFixe.notes : ['Aucun effet sur ce type'] };
    }
    let v;
    if(fixe.genre === 'fixe') v = fixe.valeur;
    else if(fixe.genre === 'niveau') v = att.niveau;
    else if(fixe.genre === 'moitie') v = Math.max(1, Math.floor(PVfixe / 2));
    else v = PVfixe;                       // K.O. en un coup
    v = Math.min(v, PVfixe) * coups;
    return { capacite: c, physique: physique, puissance: 0, A: 0, D: 0, PV: PVfixe,
      typesD: typesDefFixe, eff: effFixe.mult, stab: 1, crit: false, brulure: false,
      min: v, max: v, coups: coups, fixe: fixe,
      notes: [fixe.aide].concat(effFixe.notes) };
  }

  // --- Puissance ---
  let puissance = c[4];
  if(talentA && talentA.technicien && puissance <= 60){
    puissance = Math.floor(puissance * 1.5);
    notes.push('Technicien ×1,5');
  }
  if(objetA && objetA.puissance){
    puissance = Math.floor(puissance * objetA.puissance);
    notes.push(objetA.nom + ' ×' + objetA.puissance);
  }
  // Le terrain porte le type qu'il partage, à condition que l'attaquant y
  // touche : un Dracaufeu ne profite d'aucun terrain.
  if(terrain.boostAtt === typeAttaque && estAuSol(att)){
    puissance = Math.floor(puissance * terrain.mult);
    notes.push(terrain.nom + ' ×' + terrain.mult);
  }
  if(terrain.attenueSol && ATTAQUES_TERRESTRES.indexOf(idCapacite) !== -1 && estAuSol(def)){
    puissance = Math.floor(puissance * 0.5);
    notes.push(terrain.nom + ' : attaque du sol ×0,5');
  }

  // --- Coup critique ---
  // Il se décide avant les statistiques : un critique ignore les paliers qui
  // arrangeraient le défenseur — les baisses de l'attaquant et les hausses du
  // défenseur. C'est ce qui fait qu'on frappe en critique après un Grincement.
  let crit = !!(options && options.critique);
  if(crit && talentD && talentD.sansCritique){
    crit = false;
    notes.push(talentD.nom + ' : critique impossible');
  }

  // --- Statistique offensive ---
  const iOff = physique ? 1 : 3;
  let A = statsA[iOff];
  const boostA = (att.boosts && att.boosts[iOff]) || 0;
  const boostAretenu = (crit && boostA < 0) ? 0 : boostA;
  if(boostAretenu){
    A = statAvecBoost(A, boostAretenu);
    notes.push(STATS_NOMS[iOff] + ' ' + libelleBoost(boostAretenu));
  } else if(boostA < 0 && crit){
    notes.push('critique : baisse d\'' + STATS_NOMS[iOff] + ' ignorée');
  }
  const brule = !!(options && options.brulure) && physique;
  if(talentA && talentA.statOff === iOff && talentA.mult){
    A = Math.floor(A * talentA.mult);
    notes.push(talentA.nom + ' ×' + talentA.mult);
  }
  if(talentA && talentA.siBrule && brule){
    A = Math.floor(A * talentA.siBrule);
    notes.push(talentA.nom + ' ×' + talentA.siBrule);
  }
  if(objetA && objetA.statOff === iOff && objetA.mult){
    A = Math.floor(A * objetA.mult);
    notes.push(objetA.nom + ' ×' + objetA.mult);
  }
  // Le Bâton ne vaut que pour Pikachu, et c'est tout son intérêt.
  if(objetA && objetA.pikachu && att.entry.speciesId === 25){
    A = Math.floor(A * objetA.pikachu);
    notes.push(objetA.nom + ' ×' + objetA.pikachu);
  }

  // --- Statistique défensive ---
  const iDef = physique ? 2 : 4;
  let D = statsD[iDef];
  const boostD = (def.boosts && def.boosts[iDef]) || 0;
  const boostDretenu = (crit && boostD > 0) ? 0 : boostD;
  if(boostDretenu){
    D = statAvecBoost(D, boostDretenu);
    notes.push(STATS_NOMS[iDef] + ' ' + libelleBoost(boostDretenu));
  } else if(boostD > 0 && crit){
    notes.push('critique : hausse de ' + STATS_NOMS[iDef] + ' ignorée');
  }
  if(objetD && objetD.multDef
     && (objetD.statDef === iDef || objetD.statDef === 'deux')){
    D = Math.floor(D * objetD.multDef);
    notes.push(objetD.nom + ' ×' + objetD.multDef);
  }
  if(meteo.defType !== undefined && meteo.defStat === iDef
     && typesDe(def.entry).indexOf(meteo.defType) !== -1){
    D = Math.floor(D * meteo.defMult);
    notes.push(meteo.nom + ' ×' + meteo.defMult);
  }

  // --- Efficacité et STAB ---
  const typesD = typesDe(def.entry);
  const eff = efficaciteSubie(typeAttaque, typesD, talentD);
  eff.notes.forEach(function(n){ notes.push(n); });

  let stab = 1;
  if(typesDe(att.entry).indexOf(typeAttaque) !== -1){
    stab = (talentA && talentA.stab) ? talentA.stab : 1.5;
    notes.push(stab === 2 ? 'Adaptabilité STAB ×2' : 'STAB ×1,5');
  }

  // --- Ce qui s'applique après l'efficacité ---
  const apres = [];
  if(meteo.double === typeAttaque){ apres.push(1.5); notes.push(meteo.nom + ' ×1,5'); }
  if(meteo.moitie === typeAttaque){ apres.push(0.5); notes.push(meteo.nom + ' ×0,5'); }
  if(terrain.attenueDef === typeAttaque && estAuSol(def)){
    apres.push(terrain.multDef);
    notes.push(terrain.nom + ' ×' + terrain.multDef);
  }
  if(objetA && objetA.degats){ apres.push(objetA.degats); notes.push(objetA.nom + ' ×' + objetA.degats); }
  if(objetA && objetA.siSuperEfficace && eff.mult > 1){
    apres.push(objetA.siSuperEfficace);
    notes.push(objetA.nom + ' ×' + objetA.siSuperEfficace);
  }
  if(talentD && talentD.siSuperEfficaceSubi && eff.mult > 1){
    apres.push(talentD.siSuperEfficaceSubi);
    notes.push(talentD.nom + ' ×' + talentD.siSuperEfficaceSubi);
  }
  if(talentD && talentD.degatsSubis){
    apres.push(talentD.degatsSubis);
    notes.push(talentD.nom + ' ×' + talentD.degatsSubis + ' (à pleins PV)');
  }

  const brulureActive = brule && !(talentA && talentA.ignoreBrulure);
  if(brule && talentA && talentA.ignoreBrulure) notes.push(talentA.nom + ' : pas de malus de brûlure');

  const mods = { crit: crit, stab: stab, eff: eff.mult, brulure: brulureActive, apres: apres };
  const base = Math.floor(Math.floor(Math.floor(2 * att.niveau / 5 + 2) * puissance * A / D) / 50) + 2;

  const jets = [];
  for(let r = 85; r <= 100; r++) jets.push(unJetDegats(base, r, mods));

  if(coups > 1) notes.push(coups + ' coups');
  return {
    capacite: c, physique: physique, puissance: puissance,
    A: A, D: D, PV: statsD[0], typesD: typesD,
    eff: eff.mult, stab: stab, crit: crit, brulure: brulureActive,
    // Chaque coup tire son propre aléa : la fourchette totale va donc de N fois
    // le minimum à N fois le maximum.
    min: jets[0] * coups, max: jets[jets.length - 1] * coups,
    coups: coups, fixe: null, notes: notes
  };
}

// ---- Le champ « − valeur + » ------------------------------------------------
// Les flèches natives d'un <input type="number"> sont dessinées par le système :
// minuscules, invisibles en thème sombre, et impossibles à viser. On garde donc
// un champ texte entre deux vrais boutons.

function champNombre(opts){
  const boite = document.createElement('div');
  boite.className = 'pas-a-pas' + (opts.classe ? ' ' + opts.classe : '');

  const champ = document.createElement('input');
  champ.type = 'text';
  champ.inputMode = 'numeric';
  champ.className = 'pas-valeur';
  if(opts.aria) champ.setAttribute('aria-label', opts.aria);

  let valeur = opts.valeur;

  function borne(v){
    if(isNaN(v)) v = opts.min;
    return Math.max(opts.min, Math.min(opts.max, v));
  }
  function poser(v, prevenir){
    valeur = borne(v);
    // Un palier se lit « +2 » ou « −1 » : sans le signe, un « 2 » ne dit pas
    // s'il s'agit d'une hausse ou d'une valeur brute.
    champ.value = (opts.signe && valeur > 0 ? '+' : '') + valeur;
    if(prevenir !== false) opts.onChange(valeur);
  }

  function bouton(signe, libelle, titre){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pas-btn';
    b.textContent = libelle;
    b.title = titre;
    // Maintenir accélère : passer de 0 à 252 EV par pas de quatre demanderait
    // soixante-trois clics.
    let minuteur = null, repete = null;
    function pas(){ poser(valeur + signe * opts.pas); }
    b.addEventListener('mousedown', function(){
      pas();
      minuteur = setTimeout(function(){ repete = setInterval(pas, 60); }, 420);
    });
    ['mouseup', 'mouseleave', 'blur'].forEach(function(ev){
      b.addEventListener(ev, function(){
        clearTimeout(minuteur); clearInterval(repete); minuteur = repete = null;
      });
    });
    return b;
  }

  champ.addEventListener('change', function(){ poser(parseInt(champ.value, 10)); });
  champ.addEventListener('blur', function(){ poser(parseInt(champ.value, 10)); });

  boite.appendChild(bouton(-1, '−', 'Diminuer de ' + opts.pas));
  boite.appendChild(champ);
  boite.appendChild(bouton(1, '+', 'Augmenter de ' + opts.pas));

  poser(valeur, false);
  boite.poser = function(v){ poser(v, false); };
  return boite;
}

// ---- La modale de configuration ---------------------------------------------

const jeuOverlay = document.getElementById('jeuOverlay');
const jeuTitre = document.getElementById('jeuTitre');
const jeuRole = document.getElementById('jeuRole');
const jeuSprite = document.getElementById('jeuSprite');
const jeuTypesEl = document.getElementById('jeuTypes');
const jeuNiveauEl = document.getElementById('jeuNiveau');
const jeuNatureEl = document.getElementById('jeuNature');
const jeuTalentEl = document.getElementById('jeuTalent');
const jeuObjetEl = document.getElementById('jeuObjet');
const jeuCapaciteEls = [1, 2, 3, 4].map(function(n){
  return document.getElementById('jeuCapacite' + n);
});
const jeuBlocCapacite = document.getElementById('jeuBlocCapacite');
const jeuStatsEl = document.getElementById('jeuStats');
const jeuEvTotalEl = document.getElementById('jeuEvTotal');

let jeuEnCours = null;      // la copie qu'on modifie
let jeuValide = null;       // ce qu'on appelle en validant

// La réserve des capacités, une fois chargée. Partagée : l'équipe et le
// calculateur affichent tous deux le nom de la capacité retenue, et la
// télécharger deux fois pour 1,9 Mo n'aurait aucun sens.
let reserveCapacites = null;

// Les capacités réellement définies, dans l'ordre des emplacements.
function capacitesRetenues(jeu){
  return (jeu && jeu.capacites ? jeu.capacites : []).filter(function(id){ return !!id; });
}

// Le résumé des attaques d'un jeu, pour la ligne d'un emplacement d'équipe.
function resumeCapacite(jeu){
  const noms = capacitesRetenues(jeu).map(function(id){
    const c = reserveCapacites && reserveCapacites.capacites[id];
    return c ? c[0] : '';
  }).filter(Boolean);
  return noms.length ? noms.join(' / ') : '';
}

function copierJeu(j){
  return {
    entry: j.entry, niveau: j.niveau, nature: j.nature,
    ivs: j.ivs.slice(), evs: j.evs.slice(), boosts: (j.boosts || [0,0,0,0,0,0]).slice(),
    objet: j.objet, talent: j.talent,
    capacites: (j.capacites || [null, null, null, null]).slice()
  };
}

function majTotalEV(){
  const total = totalEV(jeuEnCours);
  const reste = EV_MAX_TOTAL - total;
  jeuEvTotalEl.textContent = total + ' / ' + EV_MAX_TOTAL + ' EV répartis'
    + (reste >= 0 ? '  ·  ' + reste + ' restants' : '  ·  ' + (-reste) + ' de trop');
  jeuEvTotalEl.classList.toggle('depasse', reste < 0);
}

function dessinerStatsModale(){
  const bases = basesDe(jeuEnCours.entry);
  jeuStatsEl.innerHTML = '';
  if(!bases){
    jeuStatsEl.innerHTML = '<p class="fiche-vide">Statistiques indisponibles pour cette forme.</p>';
    return;
  }
  const n = natureParCle(jeuEnCours.nature);

  bases.forEach(function(base, i){
    const ligne = document.createElement('div');
    ligne.className = 'jeu-stat';

    const nom = document.createElement('span');
    nom.className = 'jeu-stat-nom';
    nom.textContent = STATS_NOMS[i];
    if(n.plus === i) { nom.classList.add('boost'); nom.textContent += ' +'; }
    if(n.moins === i){ nom.classList.add('malus'); nom.textContent += ' −'; }
    ligne.appendChild(nom);

    const b = document.createElement('span');
    b.className = 'jeu-stat-base';
    b.textContent = String(base);
    ligne.appendChild(b);

    const total = document.createElement('span');
    total.className = 'jeu-stat-total';

    function recalculer(){
      const brut = calculerStat(
        base, jeuEnCours.ivs[i], jeuEnCours.evs[i], jeuEnCours.niveau,
        multNature(natureParCle(jeuEnCours.nature), i), i === 0);
      const n = i === 0 ? 0 : (jeuEnCours.boosts[i] || 0);
      // Avec un palier, on montre les deux : la statistique de la fiche, et ce
      // qu'elle vaut réellement une fois sur le terrain.
      total.textContent = n ? brut + ' → ' + statAvecBoost(brut, n) : String(brut);
      total.classList.toggle('booste', n > 0);
      total.classList.toggle('baisse', n < 0);
    }

    const iv = champNombre({
      valeur: jeuEnCours.ivs[i], min: 0, max: IV_MAX, pas: 1, classe: 'court',
      aria: 'IV ' + STATS_NOMS[i],
      onChange: function(v){ jeuEnCours.ivs[i] = v; recalculer(); }
    });
    ligne.appendChild(iv);

    const ev = champNombre({
      valeur: jeuEnCours.evs[i], min: 0, max: EV_MAX_STAT, pas: 4, classe: 'court',
      aria: 'EV ' + STATS_NOMS[i],
      onChange: function(v){ jeuEnCours.evs[i] = v; recalculer(); majTotalEV(); }
    });
    ligne.appendChild(ev);

    // Les PV n'ont pas de palier : la case reste vide plutôt que de proposer un
    // réglage qui ne servirait à rien.
    if(i === 0){
      const rien = document.createElement('span');
      rien.className = 'jeu-stat-sans-boost';
      rien.textContent = '—';
      rien.title = 'Les PV ne changent pas de palier';
      ligne.appendChild(rien);
    } else {
      ligne.appendChild(champNombre({
        valeur: jeuEnCours.boosts[i], min: BOOST_MIN, max: BOOST_MAX, pas: 1,
        classe: 'court', signe: true,
        aria: 'Palier ' + STATS_NOMS[i],
        onChange: function(v){ jeuEnCours.boosts[i] = v; recalculer(); }
      }));
    }

    ligne.appendChild(total);
    recalculer();
    ligne._recalculer = recalculer;
    jeuStatsEl.appendChild(ligne);
  });
  majTotalEV();
}

function recalculerToutesLesStats(){
  [].forEach.call(jeuStatsEl.children, function(l){
    if(l._recalculer) l._recalculer();
  });
}

function remplirTalents(){
  jeuTalentEl.innerHTML = '';
  const fiche = ficheDe(jeuEnCours.entry);
  const talents = (fiche && fiche.talents) ? fiche.talents : [];
  if(!talents.length){
    jeuTalentEl.appendChild(new Option('Aucun talent répertorié', ''));
    jeuEnCours.talent = null;
  } else {
    talents.forEach(function(t){
      const nom = motDico('talents', t[0]) || ('talent ' + t[0]);
      const effet = TALENTS_COMBAT[t[0]];
      const o = new Option(
        nom + (t[1] === 1 ? ' (caché)' : '') + (effet ? '  —  ' + effet.aide : ''),
        String(t[0]));
      jeuTalentEl.appendChild(o);
    });
    if(jeuEnCours.talent == null) jeuEnCours.talent = talents[0][0];
    jeuTalentEl.value = String(jeuEnCours.talent);
  }
}

function remplirObjets(){
  jeuObjetEl.innerHTML = '';
  Object.keys(OBJETS).forEach(function(cle){
    const o = OBJETS[cle];
    jeuObjetEl.appendChild(new Option(o.nom + (o.aide ? '  —  ' + o.aide : ''), cle));
  });
  jeuObjetEl.value = jeuEnCours.objet;
}

function remplirNatures(){
  if(jeuNatureEl.options.length) return;
  NATURES.forEach(function(n){
    jeuNatureEl.appendChild(new Option(libelleNature(n), n.cle));
  });
}

async function remplirCapacitesModale(){
  jeuCapaciteEls.forEach(function(sel){
    sel.innerHTML = '';
    sel.appendChild(new Option('Chargement…', ''));
  });
  if(typeof syncSelects === 'function') syncSelects();

  let reserve;
  try{ reserve = await chargerAttaques(); }
  catch(e){
    jeuCapaciteEls.forEach(function(sel){
      sel.innerHTML = '';
      sel.appendChild(new Option('Réserve des capacités indisponible', ''));
    });
    if(typeof syncSelects === 'function') syncSelects();
    return;
  }
  reserveCapacites = reserve;

  const ids = capacitesOffensivesDe(jeuEnCours.entry, reserve);
  jeuCapaciteEls.forEach(function(sel, n){
    sel.innerHTML = '';
    // Un emplacement peut rester vide : c'est un choix, pas un oubli.
    sel.appendChild(new Option('— emplacement ' + (n + 1) + ' libre —', ''));
    if(!ids.length){
      sel.appendChild(new Option('Aucune capacité offensive répertoriée', ''));
      return;
    }
    ids.forEach(function(id){
      const c = reserve.capacites[id];
      const fixe = DEGATS_FIXES[id];
      sel.appendChild(new Option(
        c[0] + '  —  ' + TYPES_FR[c[2]] + ' ' + (c[3] === 2 ? 'Phys.' : 'Spé.') + ' '
          + (fixe ? fixe.aide : c[4]),
        String(id)));
    });
    const voulu = jeuEnCours.capacites[n];
    sel.value = (voulu && ids.indexOf(voulu) !== -1) ? String(voulu) : '';
    if(sel.value === '') jeuEnCours.capacites[n] = null;
  });
  if(typeof syncSelects === 'function') syncSelects();
}

// Les capacités offensives d'une entrée, tous jeux confondus. Le calculateur
// n'est attaché à aucune version : restreindre au jeu ouvert priverait de la
// moitié des options sans le dire.
function capacitesOffensivesDe(entry, reserve){
  const parGroupe = reserve.especes[entry.id];
  const vues = {};
  if(parGroupe){
    Object.keys(parGroupe).forEach(function(g){
      const bloc = reserve.blocs[parGroupe[g]];
      if(!bloc) return;
      decoderBloc(bloc, g, reserve).forEach(function(m){ vues[m.capacite] = true; });
    });
  }
  return Object.keys(vues).map(Number).filter(function(id){
    const c = reserve.capacites[id];
    // Les attaques à dégâts fixes ont une puissance nulle : sans cette
    // exception elles restaient invisibles, alors qu'on veut justement savoir
    // ce que fait un Draco-Rage.
    return c && (c[3] === 2 || c[3] === 3) && (c[4] > 0 || DEGATS_FIXES[id]);
  }).sort(function(a, b){
    return reserve.capacites[a][0].localeCompare(reserve.capacites[b][0], 'fr');
  });
}

/**
 * Ouvre la modale sur une copie du jeu : tant qu'on n'a pas validé, rien ne
 * bouge à l'écran d'où l'on vient. « Annuler » doit vraiment annuler.
 */
async function ouvrirJeuModal(jeu, options, onValider){
  jeuEnCours = copierJeu(jeu);
  jeuValide = onValider;
  const avecCapacite = !!(options && options.avecCapacite);

  jeuRole.textContent = (options && options.role) || 'Configuration';
  jeuTitre.textContent = nomAffiche(jeu.entry);
  jeuSprite.src = pokeosHomeUrl(jeu.entry.id, false);
  jeuSprite.alt = '';

  await loadTypes();
  jeuTypesEl.innerHTML = '';
  typesDe(jeu.entry).forEach(function(t){ jeuTypesEl.appendChild(puceType(t)); });

  jeuNiveauEl.innerHTML = '';
  jeuNiveauEl.appendChild(champNombre({
    valeur: jeuEnCours.niveau, min: 1, max: 100, pas: 1, aria: 'Niveau',
    onChange: function(v){ jeuEnCours.niveau = v; recalculerToutesLesStats(); }
  }));

  remplirNatures();
  jeuNatureEl.value = jeuEnCours.nature;
  remplirTalents();
  remplirObjets();

  jeuBlocCapacite.style.display = avecCapacite ? '' : 'none';
  dessinerStatsModale();
  if(typeof syncSelects === 'function') syncSelects();

  jeuOverlay.style.display = 'flex';
  if(avecCapacite) remplirCapacitesModale();
  setTimeout(function(){ jeuNatureEl.focus(); }, 10);
}

function fermerJeuModal(){
  jeuOverlay.style.display = 'none';
  jeuEnCours = null;
  jeuValide = null;
}

if(jeuOverlay){
  jeuNatureEl.addEventListener('change', function(){
    jeuEnCours.nature = jeuNatureEl.value;
    // Le nom de la statistique porte le + et le − : les deux se déplacent.
    dessinerStatsModale();
  });
  jeuTalentEl.addEventListener('change', function(){
    const v = parseInt(jeuTalentEl.value, 10);
    jeuEnCours.talent = isNaN(v) ? null : v;
  });
  jeuObjetEl.addEventListener('change', function(){ jeuEnCours.objet = jeuObjetEl.value; });
  jeuCapaciteEls.forEach(function(sel, n){
    sel.addEventListener('change', function(){
      const v = parseInt(sel.value, 10);
      jeuEnCours.capacites[n] = isNaN(v) ? null : v;
    });
  });

  document.getElementById('jeuValider').addEventListener('click', function(){
    const f = jeuValide, j = jeuEnCours;
    fermerJeuModal();
    if(f) f(j);
  });
  document.getElementById('jeuAnnuler').addEventListener('click', fermerJeuModal);
  jeuOverlay.addEventListener('click', function(e){
    if(e.target === jeuOverlay) fermerJeuModal();
  });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && jeuOverlay.style.display === 'flex') fermerJeuModal();
  });
}
