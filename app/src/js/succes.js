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
let succesDex = null;         // { cleJeu: { total, normal } }, calculé une fois
let succesPour = null;        // le pseudo regardé, ou null pour soi
// L'agrégat de quelqu'un d'autre vit ici et NON dans retroDonnees : cette
// variable-là est celle du Profil, et la rétrospective s'en sert pour
// dessiner nos propres chiffres. Y poser les siens ferait dire à notre page
// ce qui est vrai de lui.
let succesVisite = null;      // { jours, jeux, total, aventures } d'un visité
let succesRares = { legendaires: 0, fabuleux: 0, legendairesChromatiques: 0 };
let succesLieux = null;       // { couverts, total, arpentes, jeux }
let succesTypes = null;       // { combien, total }

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

  { groupe: 'Les rares',
    cle: 'leg1', nom: 'Face à la légende', quoi: 'Capturer un Pokémon légendaire',
    mesurer: (e) => ({ ou: e.legendaires, but: 1, fait: e.legendaires >= 1 }) },
  { groupe: 'Les rares',
    cle: 'leg10', nom: 'Le panthéon', quoi: 'Dix Pokémon légendaires',
    mesurer: (e) => ({ ou: e.legendaires, but: 10, fait: e.legendaires >= 10 }) },
  { groupe: 'Les rares',
    cle: 'legTous', nom: 'Toutes les légendes',
    quoi: 'Les soixante-et-onze légendaires',
    mesurer: (e) => ({ ou: e.legendaires, but: e.legendairesEnTout,
                       fait: e.legendaires >= e.legendairesEnTout }) },
  { groupe: 'Les rares',
    cle: 'fab1', nom: 'L’introuvable', quoi: 'Capturer un Pokémon fabuleux',
    mesurer: (e) => ({ ou: e.fabuleux, but: 1, fait: e.fabuleux >= 1 }) },

  { groupe: 'À plusieurs',
    cle: 'ami1', nom: 'Bien accompagné', quoi: 'Suivre un dresseur',
    mesurer: (e) => seuilAmis(e, 1) },
  { groupe: 'À plusieurs',
    cle: 'ami5', nom: 'Toute une bande', quoi: 'Suivre cinq dresseurs',
    mesurer: (e) => seuilAmis(e, SUCCES_AMIS_MAX) },

  { groupe: 'Les grandes sessions',
    cle: 'jour100', nom: 'La razzia', quoi: 'Cent captures en un jour',
    mesurer: (e) => seuilJournee(e, 100) },

  { groupe: 'L’exploration',
    cle: 'expl250', nom: 'Le goût du voyage', quoi: 'Deux cent cinquante lieux',
    mesurer: (e) => ({ ou: e.lieux, but: 250, fait: e.lieux >= 250 }) },
  { groupe: 'L’exploration',
    cle: 'expl1500', nom: 'Le grand tour', quoi: 'Mille cinq cents lieux',
    mesurer: (e) => ({ ou: e.lieux, but: 1500, fait: e.lieux >= 1500 }) },
  { groupe: 'L’exploration',
    cle: 'arp1', nom: 'Carte complète',
    quoi: 'Un Pokémon dans chaque lieu d’un jeu',
    mesurer: (e) => ({ ou: e.jeuxArpentes, but: 1, fait: e.jeuxArpentes >= 1 }) },
  { groupe: 'L’exploration',
    cle: 'arp5', nom: 'Cartographe', quoi: 'Cinq jeux arpentés de bout en bout',
    mesurer: (e) => ({ ou: e.jeuxArpentes, but: 5, fait: e.jeuxArpentes >= 5 }) },
  { groupe: 'L’exploration',
    cle: 'arpTous', nom: 'Rien d’inexploré', quoi: 'Tous les jeux arpentés',
    mesurer: (e) => ({ ou: e.jeuxArpentes, but: e.jeuxAvecLieux,
                       fait: e.jeuxAvecLieux > 0 && e.jeuxArpentes >= e.jeuxAvecLieux }) },

  { groupe: 'Les types',
    cle: 'type9', nom: 'La moitié du tableau', quoi: 'Neuf types différents',
    mesurer: (e) => ({ ou: e.types, but: 9, fait: e.types >= 9 }) },
  { groupe: 'Les types',
    cle: 'type18', nom: 'Les dix-huit types',
    quoi: 'Un Pokémon de chacun des dix-huit types',
    mesurer: (e) => ({ ou: e.types, but: e.typesEnTout,
                       fait: e.typesEnTout > 0 && e.types >= e.typesEnTout }) },

  { groupe: 'Les chromatiques',
    cle: 'chrom50', nom: 'Chasseur obstiné', quoi: 'Cinquante Pokémon chromatiques',
    mesurer: (e) => seuilChromatique(e, 50) },
  { groupe: 'Les chromatiques',
    cle: 'chrom100', nom: 'La centaine brillante', quoi: 'Cent Pokémon chromatiques',
    mesurer: (e) => seuilChromatique(e, 100) },
  { groupe: 'Les chromatiques',
    cle: 'chrom2j', nom: 'Coup double', quoi: 'Deux chromatiques le même jour',
    mesurer: (e) => ({ ou: e.chromJour.combien, but: 2,
                       fait: e.chromJour.combien >= 2, quand: e.chromJour.quand }) },
  { groupe: 'Les chromatiques',
    cle: 'chromLeg', nom: 'La légende brillante',
    quoi: 'Un Pokémon légendaire chromatique',
    mesurer: (e) => ({ ou: e.legendairesChromatiques, but: 1,
                       fait: e.legendairesChromatiques >= 1 }) },

  { groupe: 'Le temps long',
    cle: 'an1', nom: 'Un an d’archive',
    quoi: 'Un an entre la première capture et la dernière',
    mesurer: (e) => ({ ou: e.duree.jours, but: 365,
                       fait: e.duree.jours >= 365, quand: e.duree.quand }) },
  { groupe: 'Le temps long',
    cle: 'retour', nom: 'Le retour', quoi: 'Reprendre après trente jours sans rien',
    mesurer: (e) => ({ ou: e.absence.jours, but: 30,
                       fait: e.absence.jours >= 30, quand: e.absence.quand }) },
];


/**
 * Un succès par Pokédex, et un pour les avoir tous.
 *
 * Construits depuis GAMES plutôt qu'écrits un par un : la réserve a gagné
 * Cobblemon aujourd'hui même, et une liste tapée à la main aurait manqué le
 * vingt-troisième sans que rien ne le dise.
 *
 * CE QUE « FINIR » VEUT DIRE ICI : le Pokédex RÉGIONAL du jeu, pas le National
 * ni les formes alternatives. C'est ce que le jeu lui-même demande, et c'est
 * déjà ce que compte la section « À portée » de l'accueil.
 *
 * Ils n'ont pas de date : le journal dit quand chaque Pokémon est arrivé, mais
 * savoir quand un Pokédex s'est refermé demanderait de rejouer toute la
 * collection jour par jour contre la liste de chaque jeu. On se tait plutôt que
 * d'approcher.
 */
function succesDesPokedex(){
  const jeux = (typeof GAMES !== 'undefined') ? GAMES : [];
  const liste = jeux.map(function(g){
    return {
      groupe: 'Les Pokédex',
      cle: 'dex-' + g.key,
      nom: g.title || g.tab || g.key,
      quoi: 'Compléter son Pokédex régional',
      mesurer: function(e){
        const a = e.dex[g.key] || { total: 0, normal: 0 };
        // Un jeu dont on ne connaît pas encore la liste vaut « pas commencé »,
        // pas « fini » : sans total, le seuil serait franchi par le vide.
        return { ou: a.normal, but: a.total || 1,
                 fait: a.total > 0 && a.normal >= a.total };
      },
    };
  });

  liste.push({
    groupe: 'Les Pokédex',
    cle: 'dex-tous',
    nom: 'Tous les Pokédex',
    quoi: 'Compléter les ' + jeux.length + ' Pokédex régionaux',
    mesurer: function(e){
      const finis = jeux.filter(function(g){
        const a = e.dex[g.key];
        return a && a.total > 0 && a.normal >= a.total;
      }).length;
      return { ou: finis, but: jeux.length, fait: finis >= jeux.length };
    },
  });
  return liste;
}

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

/**
 * Combien de légendaires et de fabuleux dans une collection.
 *
 * Les deux listes sont des identifiants d'ESPÈCE ; la collection, elle, retient
 * des noms de forme. On passe donc par les entrées pour retrouver l'espèce, et
 * on dédoublonne : Artikodin de Galar et Artikodin sont la même légende, et
 * l'avoir deux fois n'en fait pas deux.
 */
function compterRares(collection){
  const sortie = { legendaires: 0, fabuleux: 0, legendairesChromatiques: 0 };
  if(typeof allEntries === 'undefined' || !collection) return sortie;
  const legs = new Set(), fabs = new Set(), brillantes = new Set();
  const chroma = collection.shiny || new Set();
  allEntries.forEach(function(en){
    const estLeg = (typeof LEGENDAIRES !== 'undefined') && LEGENDAIRES.has(en.speciesId);
    // Une legende chromatique se compte sur le relevé des chromatiques, qui est
    // un ensemble a part : elle n'a aucune raison de figurer aussi dans caught.
    if(estLeg && chroma.has(en.name)) brillantes.add(en.speciesId);
    if(!collection.caught.has(en.name)) return;
    if(estLeg) legs.add(en.speciesId);
    if(typeof FABULEUX !== 'undefined' && FABULEUX.has(en.speciesId)) fabs.add(en.speciesId);
  });
  sortie.legendaires = legs.size;
  sortie.fabuleux = fabs.size;
  sortie.legendairesChromatiques = brillantes.size;
  return sortie;
}


// ---- L'exploration ------------------------------------------------------------
//
// « Un Pokémon sur chaque route » : un lieu compte dès qu'une seule de ses
// espèces est prise. Ce n'est pas le Pokédex sous un autre nom — c'est un
// jalon qui tombe AVANT lui, et mesuré : sur Rouge / Bleu, onze espèces bien
// choisies couvrent les cinquante lieux, quand il en faut cent-une pour les
// avoir toutes. On récompense d'aller partout, pas d'avoir tout.
//
// LE COMPTE CUMULÉ SATURE VITE, et les seuils en tiennent compte : cent
// espèces couvrent déjà mille sept cents des trois mille trois cents lieux,
// parce que les communes sont partout. Au-delà, c'est l'arpentage jeu par jeu
// qui demande encore quelque chose.

/**
 * Ce qui est pris dans un jeu.
 *
 * Pour soi, le relevé de CE jeu — arpenter Rouge / Bleu, c'est y être allé,
 * pas posséder l'espèce ailleurs. Pour quelqu'un d'autre, on n'a que son dex
 * d'ensemble : la mesure est alors plus généreuse, faute de mieux, exactement
 * comme les succès par Pokédex le font déjà.
 */
function prisesPourSucces(cleJeu, collection){
  if(collection) return collection.caught;
  if(typeof prisesDe === 'function') return prisesDe(cleJeu);
  return new Set();
}

async function calculerLieux(collection){
  const vide = { couverts: 0, total: 0, arpentes: 0, jeux: 0 };
  if(typeof indexerLieux !== 'function' || typeof GAMES === 'undefined') return vide;
  // La réserve du mod se charge à la demande, et sans elle Cobblemon
  // compterait zéro lieu : le total annoncé serait faux de soixante biomes.
  if(typeof chargerCobblemon === 'function'){
    try{ await chargerCobblemon(); }catch(e){ /* hors ligne : soixante de moins */ }
  }
  const sortie = { couverts: 0, total: 0, arpentes: 0, jeux: 0 };
  GAMES.forEach(function(g){
    let lieux = [];
    try{ lieux = indexerLieux(g.key) || []; }catch(e){ return; }
    if(!lieux.length) return;                  // jeu sans relevé de lieux
    const pris = prisesPourSucces(g.key, collection);
    let couverts = 0;
    lieux.forEach(function(l){
      const ok = l.especes.some(function(x){
        const en = (typeof entreeParId === 'function') ? entreeParId(x.id) : null;
        return en && pris.has(en.name);
      });
      if(ok) couverts++;
    });
    sortie.couverts += couverts;
    sortie.total += lieux.length;
    sortie.jeux++;
    if(couverts === lieux.length) sortie.arpentes++;
  });
  return sortie;
}

// ---- Les types ----------------------------------------------------------------
//
// La réserve embarque déjà les types — mille trois cent cinquante-et-une
// entrées, chargées à la demande par le filtre du dex. Rien à relever.

async function calculerTypes(collection){
  const vide = { combien: 0, total: 18 };
  if(typeof loadTypes !== 'function' || typeof allEntries === 'undefined') return vide;
  let table;
  try{ table = await loadTypes(); }catch(e){ return vide; }
  if(!table) return vide;
  const pris = collection ? collection.caught
             : (typeof bucketFor === 'function' ? bucketFor('home').caught : new Set());
  const vus = new Set();
  allEntries.forEach(function(en){
    if(!pris.has(en.name)) return;
    (table.get(en.id) || []).forEach(function(t){ vus.add(t); });
  });
  return { combien: vus.size,
           total: (typeof TYPES_FR !== 'undefined') ? Object.keys(TYPES_FR).length : 18 };
}

// ---- Le temps -----------------------------------------------------------------

/** Le nombre de jours entre deux « AAAA-MM-JJ ». Midi UTC : hors d'atteinte des fuseaux. */
function ecartEnJours(depuis, jusqua){
  const a = Date.parse(String(depuis).slice(0, 10) + 'T12:00:00Z');
  const b = Date.parse(String(jusqua).slice(0, 10) + 'T12:00:00Z');
  if(isNaN(a) || isNaN(b)) return 0;
  return Math.round((b - a) / 86400000);
}

/**
 * La plus longue absence, et le jour du retour.
 *
 * Les jours arrivent du plus récent au plus ancien et sans trou : un jour sans
 * capture n'a pas de ligne. L'écart entre deux lignes voisines est donc
 * exactement le temps passé loin.
 */
function plusLongueAbsence(jours){
  let record = 0, quand = null;
  for(let i = 0; i < jours.length - 1; i++){
    const trou = ecartEnJours(jours[i + 1].jour, jours[i].jour);
    if(trou > record){ record = trou; quand = jours[i].jour; }
  }
  return { jours: record, quand: quand };
}

/** Le plus grand nombre de chromatiques pris dans une même journée. */
function meilleurJourChromatique(jours){
  let record = 0, quand = null;
  jours.forEach(function(j){
    if(j.chromatiques > record){ record = j.chromatiques; quand = j.jour; }
  });
  return { combien: record, quand: quand };
}

/**
 * Depuis combien de temps l'archive dure.
 *
 * Du premier jour au DERNIER enregistré, et non à aujourd'hui : le mérite est
 * d'avoir tenu un an, pas d'avoir laissé un an passer.
 */
function dureeArchive(e){
  if(!e.premier || !e.jours.length) return { jours: 0, quand: null };
  const dernier = e.jours[0].jour;
  return { jours: ecartEnJours(e.premier, dernier), quand: dernier };
}

// ---- L'état -------------------------------------------------------------------

function etatSucces(){
  const d = succesVisite || retroDonnees || { jours: [], jeux: [], total: 0 };
  return {
    jours: d.jours || [],
    total: d.total || 0,
    chromatiques: (d.jours || []).reduce(function(s, j){ return s + j.chromatiques; }, 0),
    jeux: (d.jeux || []).length,
    // Le nombre de jeux vient de la réserve, pas d'un chiffre écrit ici : elle
    // en a gagné un aujourd'hui même avec Cobblemon.
    jeuxEnTout: (typeof GAMES !== 'undefined') ? GAMES.length : 23,
    aventures: succesVisite ? (succesVisite.aventures || 0)
             : ((typeof profilsConnus !== 'undefined') ? profilsConnus.length : 0),
    amis: succesAmis || [],
    amisCombien: (succesAmis || []).length,
    dex: succesDex || {},
    legendaires: succesRares.legendaires,
    fabuleux: succesRares.fabuleux,
    legendairesEnTout: (typeof LEGENDAIRES !== 'undefined') ? LEGENDAIRES.size : 0,
    legendairesChromatiques: succesRares.legendairesChromatiques || 0,
    lieux: succesLieux ? succesLieux.couverts : 0,
    lieuxEnTout: succesLieux ? succesLieux.total : 0,
    jeuxArpentes: succesLieux ? succesLieux.arpentes : 0,
    jeuxAvecLieux: succesLieux ? succesLieux.jeux : 0,
    types: succesTypes ? succesTypes.combien : 0,
    typesEnTout: succesTypes ? succesTypes.total : 18,
    premier: d.premier || null,
    duree: dureeArchive({ premier: d.premier || null, jours: d.jours || [] }),
    absence: plusLongueAbsence(d.jours || []),
    chromJour: meilleurJourChromatique(d.jours || []),
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
  const tous = SUCCES.concat(succesDesPokedex());
  const mesures = tous.map(function(s){ return { s: s, m: s.mesurer(e) }; });
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

/**
 * L'avancement de chaque Pokédex, pour la personne regardée.
 *
 * avancementDuJeu() accepte une collection en second argument : c'est ce qui
 * permet de calculer les mêmes succès pour quelqu'un d'autre à partir de son
 * dex, sans que l'API ait à connaître la composition des Pokédex — elle ne la
 * connaît pas, et n'a aucune raison de l'apprendre.
 *
 * Vingt-trois jeux, chacun pouvant demander ses listes : c'est le calcul le
 * plus long, et c'est pourquoi il n'a lieu qu'à l'ouverture de la pop-up et
 * non au chargement du Profil.
 */
async function calculerDex(collection){
  if(typeof avancementDuJeu !== 'function' || typeof GAMES === 'undefined') return {};
  const sortie = {};
  for(const g of GAMES){
    try{
      sortie[g.key] = await avancementDuJeu(g, collection);
    }catch(e){
      sortie[g.key] = { total: 0, normal: 0, shiny: 0 };
    }
  }
  return sortie;
}

/** La collection d'un dresseur, dans la forme qu'attend avancementDuJeu. */
function collectionDepuisDex(dex){
  return {
    caught: new Set((dex && dex.caught) || []),
    shiny: new Set((dex && dex.shiny) || []),
  };
}

// ---- Ouvrir ---------------------------------------------------------------------

async function ouvrirSucces(pseudo){
  if(!succesOverlay) return;
  succesPour = pseudo || null;
  succesOverlay.style.display = 'flex';
  succesBloc.innerHTML = '<div class="state-msg">Calcul en cours…</div>';
  succesTitre.textContent = pseudo ? 'Les succès de ' + pseudo : 'Tes succès';
  setTimeout(function(){ succesFermer.focus(); }, 10);

  try{
    if(pseudo){
      const r = await invoke('succes_de', { pseudo: pseudo });
      succesVisite = r.resume || { jours: [], jeux: [], total: 0 };
      succesVisite.aventures = r.aventures || 0;
      succesAmis = new Array(r.amis || 0).fill({ depuis: '' });
      const col = collectionDepuisDex(r.dex);
      succesRares = compterRares(col);
      succesDex = await calculerDex(col);
      succesLieux = await calculerLieux(col);
      succesTypes = await calculerTypes(col);
    } else {
      if(!retroDonnees) retroDonnees = await invoke('retrospective');
      if(succesAmis === null){
        const a = await invoke('amis');
        succesAmis = a.amis || [];
      }
      // La collection d'ensemble : celle de Pokémon HOME, qui réunit tout.
      succesRares = compterRares(bucketFor('home'));
      succesDex = await calculerDex(null);
      // null : chaque jeu se mesure sur SON relevé. Arpenter Rouge / Bleu,
      // c'est y être allé, pas posséder l'espèce sur un autre jeu.
      succesLieux = await calculerLieux(null);
      succesTypes = await calculerTypes(null);
    }
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    succesBloc.innerHTML = '<div class="state-msg">Succès indisponibles.</div>';
    return;
  }
  dessinerSucces();
}

function fermerSucces(){
  if(succesOverlay) succesOverlay.style.display = 'none';
  // Ce qui a été chargé pour quelqu'un d'autre ne doit pas rester : la
  // prochaine ouverture parlerait de lui sous notre nom.
  if(succesPour){
    succesVisite = null; succesAmis = null; succesDex = null; succesPour = null;
    succesLieux = null; succesTypes = null;
    succesRares = { legendaires: 0, fabuleux: 0, legendairesChromatiques: 0 };
  }
}

document.addEventListener('DOMContentLoaded', function(){
  if(succesBtn) succesBtn.addEventListener('click', function(){ ouvrirSucces(null); });
  if(succesFermer) succesFermer.addEventListener('click', fermerSucces);
  if(succesOverlay){
    succesOverlay.addEventListener('click', function(e){
      if(e.target === succesOverlay) fermerSucces();
    });
  }
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && succesOverlay
       && succesOverlay.style.display === 'flex') fermerSucces();
  });
});

/**
 * Le résumé sous le bouton, sans ouvrir la pop-up.
 *
 * Il ne compte que les succès qui ne demandent aucun calcul long : les Pokédex
 * en sont donc absents, et la phrase le dit plutôt que de laisser croire à un
 * total complet.
 */
function resumerSucces(){
  if(!succesResume || !retroDonnees || succesPour) return;
  const e = etatSucces();
  const acquis = SUCCES.filter(function(s){ return s.mesurer(e).fait; }).length;
  succesResume.textContent = acquis + ' sur ' + SUCCES.length
    + ' — les Pokédex se comptent à l’ouverture.';
  succesResume.title = 'Les vingt-trois Pokédex, plus « Tous les Pokédex », '
    + 'demandent de parcourir chaque jeu : ils s’ajoutent quand tu ouvres le tableau.';
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
  // Les lieux, les types et les rares se calculent ici aussi, et pas seulement
  // a l'ouverture de la pop-up : sans eux le resume compterait comme perdus
  // treize succes qui sont peut-etre acquis. Mesure : quatre millisecondes pour
  // indexer les vingt-trois jeux, et les types sont embarques.
  if(succesLieux === null){
    try{
      const col = (typeof bucketFor === 'function') ? bucketFor('home') : null;
      if(col) succesRares = compterRares(col);
      succesLieux = await calculerLieux(null);
      succesTypes = await calculerTypes(null);
    }catch(e){
      // Une reserve absente ne doit pas emporter le Profil : le resume dira
      // moins que la verite, la pop-up rattrapera.
      succesLieux = { couverts: 0, total: 0, arpentes: 0, jeux: 0 };
      succesTypes = { combien: 0, total: 18 };
    }
  }
  resumerSucces();
}
