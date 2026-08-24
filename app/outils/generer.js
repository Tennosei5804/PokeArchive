// Pilote de génération des données embarquées.
//
// La page qui le charge est index.html privé de sa couche Tauri et de son
// démarrage : tout le reste de l'application est là, avec son DOM. On appelle
// donc les vraies fonctions de chargement — celles-là mêmes que l'application
// utilise — et on récupère ce qu'elles produisent.
//
// Écrire ces données à la main, ou les recalculer dans un script séparé,
// reviendrait à tenir deux fois le même code : l'écart ne se verrait qu'au
// moment où l'app afficherait un nom faux.

// Impératif, et avant tout le reste : sans ce drapeau, cacheLire servirait la
// réserve déjà embarquée et le générateur se contenterait de recopier sa propre
// sortie. Il ne rafraîchirait alors plus jamais rien, sans que rien ne le dise.
try{ sessionStorage.setItem('pokearchive-ignorer-embarque', '1'); }
catch(e){ alert('sessionStorage indisponible : la génération relirait la réserve embarquée.'); throw e; }

const sortie = document.createElement('pre');
sortie.style.cssText = 'position:fixed;inset:0;z-index:9999;margin:0;padding:24px;'
  + 'background:#0e0f14;color:#e8e9f0;font:13px/1.7 monospace;overflow:auto;white-space:pre-wrap';
document.body.appendChild(sortie);

const journal = [];
function dire(texte){
  journal.push(texte);
  sortie.textContent = journal.join('\n');
}

// La réserve déjà embarquée, telle qu'elle est sur le disque. Elle sert de
// filet : GitHub répond 429 dès qu'on enchaîne les CSV, et rien ne justifie de
// tout perdre parce qu'un fichier sur cinq a été refusé.
const PRECEDENTE = (typeof DONNEES_EMBARQUEES === 'undefined') ? null : DONNEES_EMBARQUEES;
const reprises = [];

async function etape(numero, titre, cle, charger){
  dire('\n' + numero + '  ' + titre + '…');
  try{
    const valeur = await charger();
    dire('     ' + valeur.length + ' éléments');
    return valeur;
  }catch(e){
    const ancien = PRECEDENTE && PRECEDENTE[cle];
    if(!ancien || !ancien.length){
      throw new Error(titre + ' : ' + e.message
        + ' — et la réserve précédente n\'a rien sur « ' + cle + ' »');
    }
    reprises.push(cle);
    dire('     ÉCHEC : ' + e.message);
    dire('     → on conserve les ' + ancien.length + ' éléments déjà embarqués');
    return ancien;
  }
}

// Les Pokédex à embarquer : ceux que les jeux déclarent, plus ceux que la
// fiche interroge pour la disponibilité. On prend l'union des deux, sans
// recopier de liste — elles sont déjà dans le code.
function tousLesPokedex(){
  const noms = new Set(DEX_DISPONIBILITE);
  GAMES.forEach(function(g){
    (g.regional && g.regional.dexes || []).forEach(function(d){ noms.add(d); });
    (g.second && g.second.dexes || []).forEach(function(d){ noms.add(d); });
  });
  return Array.from(noms).sort();
}

// ---- Fiches détaillées, pour toutes les entrées -----------------------------
// Une requête par Pokémon coûterait vingt appels chacun, soit plus de vingt
// mille : intenable. On passe donc par les fichiers en vrac de PokeAPI, une
// douzaine de CSV, et on assemble tout localement.
//
// Le stockage est indexé : les noms de lieux, de jeux, de méthodes et de
// talents vivent dans des dictionnaires, les fiches n'en gardent que le numéro.
// Sans cela, les mêmes chaînes seraient recopiées des dizaines de milliers de
// fois et la réserve pèserait plusieurs mégaoctets.

const LANGUE_FR = '5';
const LANGUE_EN = '9';

// Deux colonnes de noms (fr, en) rangees par identifiant.
function tableNoms(lignes, colId, colNom, colLangue){
  const out = {};
  lignes.forEach(function(r){
    const id = r[colId], langue = r[colLangue], nom = (r[colNom] || '').trim();
    if(!nom) return;
    if(langue !== LANGUE_FR && langue !== LANGUE_EN) return;
    if(!out[id]) out[id] = {};
    out[id][langue === LANGUE_FR ? 'fr' : 'en'] = nom;
  });
  // Une traduction manquante retombe sur l'autre langue plutot que sur du vide.
  Object.keys(out).forEach(function(id){
    out[id].fr = out[id].fr || out[id].en;
    out[id].en = out[id].en || out[id].fr;
  });
  return out;
}

// ---- Le texte d'un talent ---------------------------------------------------
// Deux encodages du saut de ligne cohabitent dans le meme fichier : un vrai
// saut pour les anciennes generations, la suite « \n » ecrite en toutes lettres
// pour Ecarlate/Violet. Sans les deux, la fiche affichait « ses PV\nsont au
// maximum ». Le « \f » vient des textes d'origine, coupes en deux ecrans.
function texteTalent(brut){
  return String(brut || '').replace(/\\[nf]/g, ' ').replace(/\s+/g, ' ').trim();
}

async function construireFiches(){
  const [statsRaw, talentsRaw, talentsNoms, talentsEffets, talentsPhrases,
         especesRaw, evoRaw, evoNoms, objetsNoms, attaquesNoms,
         rencontres, creneaux, zones, lieuxNoms, versions, versionsNoms, methodesNoms,
         oeufsRaw, oeufsNoms, pokemonRaw, courbesNoms] =
    await Promise.all([
      fetchCsvRows('pokemon_stats.csv'), fetchCsvRows('pokemon_abilities.csv'),
      fetchCsvRows('ability_names.csv'),
      // Les deux fichiers qui disent ce qu'un talent FAIT, et non comment il
      // s'appelle. Voir le bloc « Les talents » plus bas.
      fetchCsvRows('ability_prose.csv'), fetchCsvRows('ability_flavor_text.csv'),
      fetchCsvRows('pokemon_species.csv'),
      fetchCsvRows('pokemon_evolution.csv'), fetchCsvRows('evolution_trigger_prose.csv'),
      fetchCsvRows('item_names.csv'), fetchCsvRows('move_names.csv'),
      fetchCsvRows('encounters.csv'),
      fetchCsvRows('encounter_slots.csv'), fetchCsvRows('location_areas.csv'),
      fetchCsvRows('location_names.csv'), fetchCsvRows('versions.csv'),
      fetchCsvRows('version_names.csv'), fetchCsvRows('encounter_method_prose.csv'),
      fetchCsvRows('pokemon_egg_groups.csv'), fetchCsvRows('egg_group_prose.csv'),
      // Le gabarit : la taille et le poids vivent dans pokemon.csv, la courbe
      // d'experience dans growth_rate_prose.csv. Les trois autres champs
      // (eclosion, bonheur, courbe) etaient deja sous la main, dans
      // pokemon_species.csv, et n'avaient jamais ete lus.
      fetchCsvRows('pokemon.csv'), fetchCsvRows('growth_rate_prose.csv')
    ]);

  const dico = {
    talents: tableNoms(talentsNoms, 0, 2, 1),
    lieux: tableNoms(lieuxNoms, 0, 2, 1),
    methodes: tableNoms(methodesNoms, 0, 2, 1),
    versions: {},
    declencheurs: tableNoms(evoNoms, 0, 2, 1),
    objets: tableNoms(objetsNoms, 0, 2, 1),
    attaques: tableNoms(attaquesNoms, 0, 2, 1),
    // Quinze groupes en tout : la table tient dans un mouchoir, et c'est elle
    // qui rend la reproduction lisible sans aller voir ailleurs.
    oeufs: tableNoms(oeufsNoms, 0, 2, 1),
    courbes: {}
  };

  // Les versions gardent leur identifiant textuel : c'est lui qui rattache un
  // lieu a un onglet de jeu (GAMES.versions).
  const nomsVersion = tableNoms(versionsNoms, 0, 2, 1);
  versions.forEach(function(r){
    const id = r[0];
    dico.versions[id] = {
      slug: r[2],
      fr: (nomsVersion[id] && nomsVersion[id].fr) || r[2],
      en: (nomsVersion[id] && nomsVersion[id].en) || r[2]
    };
  });

  // --- Les talents : le nom ne suffit pas ---
  // « Multiecaille » ne dit rien a qui ne le connait pas deja, et la fiche n'en
  // affichait que le nom. PokeAPI a les deux phrases qui manquent, toutes deux
  // en francais :
  //
  //   ability_prose.csv        l'effet, chiffre    « Divise par deux les degats
  //                                                  subis en ayant tous ses PV. »
  //   ability_flavor_text.csv  le texte du jeu     « Le Pokemon subit moins de
  //                                                  degats quand ses PV sont au
  //                                                  maximum. »
  //
  // Les deux, et pas l'un ou l'autre. Le jeu reste vague la ou la fiche doit
  // etre exacte — mais c'est sa formule qu'on lit a l'ecran, et la reconnaitre
  // vaut mieux que de la corriger en silence.
  //
  // Un piege : l'API web de PokeAPI ne publie ses « effect_entries » qu'en
  // anglais, et l'on croit donc l'effet intraduit. Le CSV, lui, l'est — 304 des
  // 312 talents qu'une espece porte reellement. Les huit restants retombent sur
  // l'anglais, comme motDico() le fait partout ailleurs.

  // ability_prose.csv : 0 talent · 1 langue · 2 effet court · 3 effet complet.
  // On ne garde que le court : le long tient en trois phrases et decrit des cas
  // limites qu'aucune fiche n'a la place d'exposer.
  const effets = {};
  talentsEffets.forEach(function(r){
    const langue = r[1], texte = texteTalent(r[2]);
    if(!texte) return;
    if(langue !== LANGUE_FR && langue !== LANGUE_EN) return;
    if(!effets[r[0]]) effets[r[0]] = {};
    effets[r[0]][langue === LANGUE_FR ? 'fr' : 'en'] = texte;
  });

  // ability_flavor_text.csv : 0 talent · 1 version group · 2 langue · 3 texte.
  // Un talent en a une par jeu. On garde le plus recent : la premiere
  // generation ecrit en capitales et abrege tout — « Repousse POKeMON
  // sauvage. » pour Puanteur.
  const phrases = {};
  talentsPhrases.forEach(function(r){
    const langue = r[2], texte = texteTalent(r[3]);
    if(!texte) return;
    if(langue !== LANGUE_FR && langue !== LANGUE_EN) return;
    const cle = langue === LANGUE_FR ? 'fr' : 'en';
    const jeu = parseInt(r[1], 10) || 0;
    if(!phrases[r[0]]) phrases[r[0]] = {};
    const vu = phrases[r[0]][cle];
    if(!vu || jeu >= vu.jeu) phrases[r[0]][cle] = { jeu: jeu, texte: texte };
  });

  // --- Ce qui se rattache a l'espece ---
  // pokemon_species.csv : 3 vient_de · 4 lignee d'evolution · 8 taux de genre
  //  · 9 taux de capture · 10 bonheur de base · 12 cycles d'eclosion
  //  · 14 courbe d'experience.
  //
  // Les trois derniers n'avaient jamais ete lus : ils dormaient dans le meme
  // fichier, a trois colonnes de la ou l'on prenait deja le taux de capture.
  //
  // Le taux de genre est un huitieme de femelles : 0 = toujours male, 8 =
  // toujours femelle, -1 = asexue. Le stocker brut evite d'avoir a choisir un
  // arrondi ici, et l'affichage fait la division au moment de l'ecrire.
  const especes = {};
  especesRaw.forEach(function(r){
    const genre = r[8] === '' || r[8] === undefined ? -1 : parseInt(r[8], 10);
    especes[r[0]] = {
      capture: parseInt(r[9], 10) || 0,
      vientDe: r[3] || null,
      genre: isNaN(genre) ? -1 : genre,
      lignee: r[4] ? parseInt(r[4], 10) : null,
      bonheur: r[10] === '' || r[10] === undefined ? null : parseInt(r[10], 10),
      eclosion: r[12] ? parseInt(r[12], 10) : null,
      courbe: r[14] ? parseInt(r[14], 10) : null
    };
  });

  // pokemon.csv : 3 taille en decimetres · 4 poids en hectogrammes. On garde
  // l'unite brute de PokeAPI et l'affichage divise par dix : arrondir ici
  // perdrait le dixieme des especes qui pesent moins d'un kilo.
  //
  // Par ENTREE et non par espece : un Raichu d'Alola ne fait ni la taille ni
  // le poids d'un Raichu, et c'est exactement ce qu'une fiche de forme doit
  // montrer.
  dico.courbes = tableNoms(courbesNoms, 0, 2, 1);

  const gabarits = {};
  pokemonRaw.forEach(function(r){
    gabarits[r[0]] = {
      taille: r[3] ? parseInt(r[3], 10) : null,
      poids: r[4] ? parseInt(r[4], 10) : null
    };
  });

  // pokemon_evolution.csv, colonnes utiles :
  //  2 declencheur · 4 is_default · 5 objet utilise · 6 niveau · 7 genre
  //  8 lieu · 9 objet tenu · 10 moment · 11 capacite connue · 12 type de capacite
  //  13 bonheur · 15 affection · 23 pres d'un rocher particulier
  //
  // Deux pieges. Le bonheur se lit en 13 et non en 11 — la colonne 11 est la
  // capacite connue, si bien qu'aucune condition de bonheur ne s'affichait.
  // Et une espece a souvent plusieurs lignes, une par generation : Phyllali
  // evolue au rocher moussu en quatrieme, a la Pierre Plante aujourd'hui. La
  // ligne marquee « is_default » porte la condition en vigueur ; garder la
  // premiere venue affichait une regle abandonnee.
  const evolutions = {};
  evoRaw.forEach(function(r){
    const vers = r[1];
    const detail = {
      declencheur: r[2], niveau: parseInt(r[6], 10) || null,
      objet: r[5] || null, objetTenu: r[9] || null,
      lieu: r[8] || null, rocher: r[23] === '1',
      capacite: r[11] || null, typeCapacite: parseInt(r[12], 10) || null,
      bonheur: parseInt(r[13], 10) || null,
      affection: parseInt(r[15], 10) || null,
      genre: parseInt(r[7], 10) || null,
      moment: r[10] || null,
      officielle: r[4] === '1'
    };
    if(!evolutions[vers] || (detail.officielle && !evolutions[vers].officielle)){
      evolutions[vers] = detail;
    }
  });

  // --- Ce qui se rattache a une entree (forme comprise) ---
  const stats = {};
  // La quatrieme colonne de pokemon_stats.csv porte les points d'effort donnes
  // quand on bat ce Pokemon. Elle etait la depuis le debut, ignoree : c'est ce
  // qu'on cherche quand on demande « ou entrainer pour de la Vitesse ? ».
  const effort = {};
  statsRaw.forEach(function(r){
    const id = r[0], indice = parseInt(r[1], 10) - 1, valeur = parseInt(r[2], 10);
    if(indice < 0 || indice > 5) return;   // 7+ : statistiques de combat obsoletes
    if(!stats[id]) stats[id] = [0, 0, 0, 0, 0, 0];
    stats[id][indice] = valeur;
    const ev = parseInt(r[3], 10) || 0;
    if(ev){
      if(!effort[id]) effort[id] = [0, 0, 0, 0, 0, 0];
      effort[id][indice] = ev;
    }
  });

  // --- Les groupes d'oeufs, par espece et non par forme ---
  // pokemon_egg_groups.csv est indexe par species_id : Raichu d'Alola pond
  // exactement comme Raichu. Deux groupes au plus, souvent un seul.
  const oeufs = {};
  oeufsRaw.forEach(function(r){
    const esp = r[0], groupe = parseInt(r[1], 10);
    if(!oeufs[esp]) oeufs[esp] = [];
    if(oeufs[esp].indexOf(groupe) === -1) oeufs[esp].push(groupe);
  });

  const talents = {};
  talentsRaw.forEach(function(r){
    const id = r[0];
    if(!talents[id]) talents[id] = [];
    talents[id].push([parseInt(r[1], 10), r[2] === '1' ? 1 : 0]);
  });

  // --- Les rencontres ---
  const zoneVersLieu = {};
  zones.forEach(function(r){ zoneVersLieu[r[0]] = r[1]; });

  const creneauInfo = {};
  creneaux.forEach(function(r){
    creneauInfo[r[0]] = { methode: r[2], rarete: parseInt(r[4], 10) || 0 };
  });

  // Regroupement : un Pokemon peut apparaitre dans dix zones d'un meme lieu,
  // sur autant de creneaux. On additionne les raretes et on garde l'amplitude
  // de niveaux — une ligne par (entree, version, lieu, methode).
  const groupes = new Map();
  rencontres.forEach(function(r){
    const creneau = creneauInfo[r[3]];
    if(!creneau) return;
    const lieu = zoneVersLieu[r[2]];
    if(!lieu) return;
    const cle = r[4] + '|' + r[1] + '|' + lieu + '|' + creneau.methode;
    const min = parseInt(r[5], 10), max = parseInt(r[6], 10);
    const g = groupes.get(cle);
    if(g){
      g[3] = Math.min(g[3], min);
      g[4] = Math.max(g[4], max);
      g[5] += creneau.rarete;
    } else {
      groupes.set(cle, [parseInt(r[1], 10), parseInt(lieu, 10),
                        parseInt(creneau.methode, 10), min, max, creneau.rarete]);
    }
  });

  const obtention = {};
  groupes.forEach(function(valeur, cle){
    const entree = cle.split('|')[0];
    if(!obtention[entree]) obtention[entree] = [];
    // La rarete cumulee ne peut pas depasser 100 % d'un tirage.
    valeur[5] = Math.min(100, valeur[5]);
    obtention[entree].push(valeur);
  });

  // --- Assemblage, une fiche par entree connue de l'application ---
  const fiches = {};
  allEntries.forEach(function(e){
    const id = String(e.id), esp = String(e.speciesId);
    const infoEspece = especes[esp] || {};
    const evo = evolutions[esp];
    fiches[id] = {
      stats: stats[id] || null,
      // Absent quand l'espece ne donne aucun point d'effort : un tableau de
      // zeros pour 1351 entrees pesait pour rien.
      effort: effort[id] || null,
      oeufs: oeufs[esp] || null,
      // -1 = asexue. Zero est une valeur legitime (toujours male), on ne peut
      // donc pas se contenter d'un « || null » comme ailleurs.
      genre: infoEspece.genre === undefined ? -1 : infoEspece.genre,
      // La lignee reunit une famille entiere : c'est elle qui dit qu'un Living
      // Dex demande trois Pokemon la ou un Pokedex ordinaire en demande un.
      lignee: infoEspece.lignee || null,
      talents: talents[id] || [],
      capture: infoEspece.capture || 0,
      // Le gabarit. Taille et poids viennent de l'entree, le reste de
      // l'espece : deux formes d'une meme espece eclosent au meme rythme.
      taille: (gabarits[id] || {}).taille || null,
      poids: (gabarits[id] || {}).poids || null,
      eclosion: infoEspece.eclosion === undefined ? null : infoEspece.eclosion,
      bonheur: infoEspece.bonheur === undefined ? null : infoEspece.bonheur,
      courbe: infoEspece.courbe || null,
      // Une seule etape : celle qui MENE a ce Pokemon. La chaine complete se
      // reconstruit d'entree en entree, sans stocker d'arbre.
      evo: evo ? {
        de: infoEspece.vientDe ? parseInt(infoEspece.vientDe, 10) : null,
        declencheur: parseInt(evo.declencheur, 10),
        niveau: evo.niveau,
        objet: evo.objet ? parseInt(evo.objet, 10) : null,
        objetTenu: evo.objetTenu ? parseInt(evo.objetTenu, 10) : null,
        lieu: evo.lieu ? parseInt(evo.lieu, 10) : null,
        rocher: evo.rocher || undefined,
        capacite: evo.capacite ? parseInt(evo.capacite, 10) : null,
        typeCapacite: evo.typeCapacite,
        bonheur: evo.bonheur,
        affection: evo.affection,
        genre: evo.genre,
        moment: evo.moment || null
      } : null,
      obt: obtention[id] || []
    };
  });

  // Objets et capacites ne servent qu'aux evolutions : garder les 20 000 noms
  // d'objets et les 900 capacites gonflerait la reserve pour rien.
  const citesObjets = new Set(), citesAttaques = new Set();
  Object.keys(fiches).forEach(function(cle){
    const e = fiches[cle].evo;
    if(!e) return;
    if(e.objet) citesObjets.add(String(e.objet));
    if(e.objetTenu) citesObjets.add(String(e.objetTenu));
    if(e.capacite) citesAttaques.add(String(e.capacite));
  });
  const garder = (table, cites) => {
    const out = {};
    cites.forEach(function(id){ if(table[id]) out[id] = table[id]; });
    return out;
  };
  dico.objets = garder(dico.objets, citesObjets);
  dico.attaques = garder(dico.attaques, citesAttaques);

  // Les talents suivent la meme regle, et elle compte davantage depuis qu'ils
  // portent deux phrases : sur les 373 noms d'ability_names.csv, soixante et un
  // ne sont portes par aucune espece. Les decrire coutait 11 Ko a personne.
  const citesTalents = new Set();
  Object.keys(fiches).forEach(function(cle){
    fiches[cle].talents.forEach(function(t){ citesTalents.add(String(t[0])); });
  });
  const talentsGardes = {};
  citesTalents.forEach(function(id){
    const nom = dico.talents[id];
    if(!nom) return;
    const entree = { fr: nom.fr, en: nom.en };
    // Une langue manquante retombe sur l'autre, jamais sur du vide : mieux vaut
    // une phrase anglaise qu'un talent muet.
    const effet = effets[id];
    if(effet) entree.effet = effet.fr || effet.en;
    const phrase = phrases[id];
    if(phrase) entree.jeu = (phrase.fr || phrase.en).texte;
    talentsGardes[id] = entree;
  });
  dico.talents = talentsGardes;

  return { dico: dico, especes: fiches };
}

async function generer(){
  const debut = Date.now();
  // On part d'une réserve vide : sinon on ré-embarquerait ce qu'une session
  // précédente avait mis en localStorage, sans jamais interroger le réseau.
  cacheVider();
  dire('Réserve locale vidée.'
    + (PRECEDENTE ? ' Réserve embarquée existante : filet en cas de refus.' : ''));

  // allEntries alimente loadExtraForms : il lui faut les espèces avant tout.
  const entrees = await etape('1/5', 'Espèces, noms français et anglais', 'entrees',
    async function(){ return await construireEntrees(); });
  allEntries = entrees;

  const types = await etape('2/5', 'Types', 'types',
    async function(){ return Array.from((await loadTypes()).entries()); });

  const formes = await etape('3/5', 'Formes cosmétiques et variantes ♀', 'formes',
    async function(){ return await loadExtraForms(); });

  const dispo = await etape('4/5', 'Disponibilité par jeu', 'dispo',
    async function(){ return Array.from((await chargerDisponibilite()).entries()); });

  const noms = tousLesPokedex();
  dire('\n5/5  Pokédex régionaux (' + noms.length + ')…');
  const dex = {};
  for(const nom of noms){
    try{
      dex[nom] = Array.from((await fetchDex(nom)).entries());
      dire('     ' + nom + ' : ' + dex[nom].length);
    }catch(e){
      const ancien = PRECEDENTE && PRECEDENTE.dex && PRECEDENTE.dex[nom];
      if(!ancien) throw new Error('Pokédex ' + nom + ' : ' + e.message);
      dex[nom] = ancien;
      reprises.push('dex-' + nom);
      dire('     ' + nom + ' : ÉCHEC, on conserve les ' + ancien.length + ' déjà embarqués');
    }
  }

  dire('\n6/6  Fiches détaillées (stats, talents, évolution, lieux)…');
  let fiches;
  try{
    fiches = await construireFiches();
    const nb = Object.keys(fiches.especes).length;
    const avecLieux = Object.keys(fiches.especes)
      .filter(function(k){ return fiches.especes[k].obt.length; }).length;
    const lieux = Object.keys(fiches.especes)
      .reduce(function(n, k){ return n + fiches.especes[k].obt.length; }, 0);
    dire('     ' + nb + ' fiches, ' + avecLieux + ' avec au moins un lieu, '
      + lieux + ' lignes de rencontre');
    dire('     dictionnaires : ' + Object.keys(fiches.dico.lieux).length + ' lieux, '
      + Object.keys(fiches.dico.talents).length + ' talents, '
      + Object.keys(fiches.dico.versions).length + ' versions');
    // Les deux phrases d'un talent viennent de fichiers que rien n'oblige a
    // rester traduits : on compte, plutot que de le supposer. Une chute nette
    // d'un lancement a l'autre se lit ici, et nulle part ailleurs.
    const tal = Object.keys(fiches.dico.talents);
    const avecEffet = tal.filter(function(k){ return fiches.dico.talents[k].effet; }).length;
    const avecTexte = tal.filter(function(k){ return fiches.dico.talents[k].jeu; }).length;
    dire('     talents décrits : ' + avecEffet + ' avec effet, '
      + avecTexte + ' avec le texte du jeu, sur ' + tal.length);
  }catch(e){
    if(!PRECEDENTE || !PRECEDENTE.fiches) throw new Error('fiches : ' + e.message);
    fiches = PRECEDENTE.fiches;
    reprises.push('fiches');
    dire('     ÉCHEC : ' + e.message + ' — on conserve les fiches déjà embarquées');
  }

  const paquet = {
    genereLe: new Date().toISOString(),
    entrees: entrees, types: types, formes: formes, dispo: dispo, dex: dex,
    fiches: fiches
  };

  const json = JSON.stringify(paquet);
  dire('\nRécolté en ' + Math.round((Date.now() - debut) / 1000) + ' s — '
    + Math.round(json.length / 1024) + ' Ko.');
  if(reprises.length){
    dire('Repris de la réserve précédente : ' + reprises.join(', ')
      + '\n(relance plus tard pour les rafraîchir ; rien n\'est perdu entre-temps)');
  }

  dire('\nÉcriture dans src/js/donnees-embarquees.js…');
  const res = await fetch('/enregistrer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: json
  });
  const compte = await res.json();
  if(!res.ok) throw new Error(compte.erreur || ('HTTP ' + res.status));
  dire('     écrit : ' + compte.ko + ' Ko');
  dire('\nTerminé. Recompile l\'application pour embarquer cette réserve.');

  window.__reprises = reprises;
  window.__fini = true;
}

generer().catch(function(e){
  dire('\nÉCHEC : ' + (e && e.message ? e.message : e));
  window.__erreur = String(e && e.message ? e.message : e);
  window.__fini = true;
});
