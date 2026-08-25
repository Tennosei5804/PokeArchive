// Formes supplementaires, Pokedex par jeu et perimetre affiche.
// Script classique (pas de module ES) : l'app reste ouvrable en file://

// ---- Mode « Toutes les formes » ---------------------------------------
// La liste PokeAPI de base ignore deux catégories de variantes :
//   · les formes purement cosmétiques (les 20 motifs de Prismillon, les
//     coupes de Couafarel, les couleurs de Météno…), qui existent dans la
//     table « pokemon_forms » mais n'ont pas d'entrée « pokemon » à elles ;
//   · les différences mâle / femelle (Florizarre, Hélédelle, Mistigrix…),
//     signalées par has_gender_differences sur l'espèce.
// On les charge à la demande depuis les mêmes CSV ouverts que les noms
// français, en trois requêtes, puis on les garde en mémoire.
const CSV_BASE = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/';
// Jusqu'où l'on compte les formes d'une même espèce, de 1 à 4 :
//
//   1  forme normale     une entrée par espèce — un seul Météno
//   2  + régionales      Alola, Galar, Hisui, Paldea
//   3  + alternatives    noyaux de Météno, lettres de Zarbi, motifs de
//                        Prismillon, parfums de Charmilly, Motisma…
//   4  + mâle / femelle  les espèces dont la femelle se distingue à l'œil
//
// Le niveau 3 est le défaut, le 4 correspond à l'ancien bouton « Toutes les
// formes » enfoncé, et les deux premiers sont neufs.
//
// Le 3 n'est pas tout à fait l'ancien défaut, et l'écart va dans les deux sens :
// il ajoute les 140 formes cosmétiques que seul le mode « Toutes les formes »
// montrait, et il retire les cinq femelles que PokeAPI modélise en formes à part
// entière — Némélios, Mistigrix, Wimessir, Paragruel, Fragroin — qui remontent
// au niveau 4, où elles ont leur place. La collection tient donc 1281 entrées au
// niveau 3, contre 1383 au niveau 4 ; le banc mesure les quatre paliers à chaque
// passage, et c'est là qu'un écart se verrait.
let niveauFormes = 3;

// Conservé tel quel : les Pokédex de jeux s'en servent pour choisir entre une
// carte par espèce et toutes les formes. Le lier au niveau 4 leur garantit un
// comportement identique à celui d'avant.
let allFormsMode = false;
let extraFormEntries = null;   // null = pas encore chargé
let extraFormsLoading = null;

// Découpe une ligne CSV en tenant compte des champs entre guillemets.
// Un CSV ne se decoupe pas en lignes avant d'etre lu : un champ entre
// guillemets peut contenir un saut de ligne. Tant qu'on n'a lu que des noms —
// une colonne courte, jamais de retour a la ligne — decouper d'abord sur « \n »
// marchait. Les descriptions de talents ont mis fin a ca : ability_prose.csv
// donnait 1441 lignes au lieu de 809, dont 632 morceaux de phrase pris pour des
// enregistrements (« Ce talent ne s'accumule pas avec un objet porte. » comme
// numero de talent). On lit donc le texte d'un bout a l'autre, et c'est le
// meme automate qui decide ou finit un champ et ou finit une ligne.
function csvLignes(texte){
  const lignes = [];
  let ligne = [], cur = '', cite = false;

  // Une ligne n'en est une que si elle porte quelque chose : la derniere du
  // fichier est vide, et l'ancienne lecture la retirait avec un filter().
  function finLigne(){
    ligne.push(cur); cur = '';
    if(ligne.length > 1 || ligne[0] !== '') lignes.push(ligne);
    ligne = [];
  }

  for(let i = 0; i < texte.length; i++){
    const ch = texte[i];
    if(cite){
      if(ch === '"'){
        if(texte[i + 1] === '"'){ cur += '"'; i++; }   // guillemet double : echappement
        else cite = false;
      } else cur += ch;                                // saut de ligne compris
      continue;
    }
    if(ch === '"') cite = true;
    else if(ch === ',') { ligne.push(cur); cur = ''; }
    else if(ch === '\n') finLigne();
    else if(ch === '\r'){ if(texte[i + 1] === '\n') i++; finLigne(); }
    else cur += ch;
  }
  finLigne();
  return lignes;
}

// GitHub limite le debit et repond 429 des qu'on enchaine les CSV — pas une
// panne, juste une invitation a patienter. Sans nouvelle tentative, un seul
// refus faisait echouer tout le chargement, avec le message trompeur
// « Verifie ta connexion » alors que la connexion allait tres bien.
const CSV_ATTENTES = [1500, 4000, 9000];

async function fetchCsvRows(file){
  let dernier = '';
  for(let essai = 0; essai <= CSV_ATTENTES.length; essai++){
    if(essai) await new Promise(function(r){ setTimeout(r, CSV_ATTENTES[essai - 1]); });
    let res;
    try{
      res = await fetch(CSV_BASE + file);
    }catch(e){
      dernier = 'reseau';
      continue;                     // coupure passagere : on retente
    }
    if(res.ok){
      // La premiere ligne nomme les colonnes.
      return csvLignes(await res.text()).slice(1);
    }
    dernier = 'HTTP ' + res.status;
    // Un 404 ne s'arrangera pas en attendant : inutile d'insister.
    if(res.status !== 429 && res.status < 500) break;
  }
  throw new Error(file + ' indisponible (' + dernier + ')');
}

// Le nom d'une forme cosmétique. Les libellés de PokeAPI nomment tantôt
// l'ensemble (« Zarbi B »), tantôt la seule variante (« Femelle ») — ces
// derniers, pris tels quels, donnaient une carte intitulée « Femelle » sans
// dire de qui. On les fait alors précéder du nom de l'espèce.
// « espece » est le nom de l'espèce dans la langue du libellé : il faut le
// français avec un libellé français, l'anglais avec un libellé anglais.
function libelleForme(espece, label, identifier){
  const propre = (label || '').trim();
  if(!propre) return titleCase(identifier.split('-').join(' '));
  return propre.indexOf(espece) === -1 ? espece + ' (' + propre + ')' : propre;
}

// Le nom de l'espèce seul, débarrassé du suffixe de forme que porte parfois
// l'entrée de base (« Némélios (mâle) » n'est pas un préfixe utilisable).
function nomEspece(display){
  return String(display || '').split(' (')[0];
}

async function loadExtraForms(){
  if(extraFormEntries) return extraFormEntries;
  if(extraFormsLoading) return extraFormsLoading;

  extraFormsLoading = (async function(){
    // On conserve le resultat final plutot que les trois CSV bruts : c'est
    // vingt fois plus petit, et c'est tout ce dont l'application a besoin.
    const enCache = cacheLire('formes');
    if(enCache){
      extraFormEntries = enCache;
      return enCache;
    }

    const [forms, species, formNames] = await Promise.all([
      fetchCsvRows('pokemon_forms.csv'),
      fetchCsvRows('pokemon_species.csv'),
      fetchCsvRows('pokemon_form_names.csv')
    ]);

    // id d'entrée PokeAPI -> entrée déjà connue de l'app
    const byPokemonId = new Map();
    const knownNames = new Set();
    allEntries.forEach(function(e){ byPokemonId.set(e.id, e); knownNames.add(e.name); });

    // Noms français des formes : on préfère la colonne « pokemon_name »
    // (« Prismillon Blizzard ») au simple libellé de motif.
    const frForm = new Map();
    const enForm = new Map();
    formNames.forEach(function(r){
      const label = (r[3] || '').trim() || (r[2] || '').trim();
      if(!label) return;
      if(r[1] === '5') frForm.set(r[0], label);        // 5 = français
      else if(r[1] === '9') enForm.set(r[0], label);   // 9 = anglais
    });

    const out = [];

    // Lépidonille et Pérégrain portent les 20 motifs de Prismillon, mais
    // sans différence visible : on ne garde les motifs que sur Prismillon.
    const SKIP_PATTERNS = ['scatterbug-', 'spewpa-'];

    // 1) Formes cosmétiques (is_default = 0)
    forms.forEach(function(r){
      const formId = r[0], identifier = r[1], pokemonId = parseInt(r[3], 10);
      const isDefault = r[5] === '1', isBattleOnly = r[6] === '1';
      if(isDefault || isBattleOnly) return;
      if(SKIP_PATTERNS.some(function(p){ return identifier.indexOf(p) === 0; })) return;
      // On dédoublonne sur le NOM : les ids de « pokemon_forms » et de
      // « pokemon » sont deux numérotations distinctes qui se chevauchent
      // (l'id 10086 est vivillon-icy-snow ici, hoopa-unbound là-bas).
      if(knownNames.has(identifier)) return;
      const base = byPokemonId.get(pokemonId);
      if(!base) return;
      out.push({
        id: base.id,
        speciesId: base.speciesId,
        name: identifier,
        display: libelleForme(nomEspece(base.display), frForm.get(formId), identifier),
        displayEn: libelleForme(nomEspece(base.displayEn || base.display),
                                enForm.get(formId), identifier),
        gen: base.gen,
        spriteOnly: true              // pas d'artwork officiel pour ces formes
      });
    });

    // 2) Variantes femelles des espèces où les deux sexes diffèrent
    const genderSpecies = new Set();
    species.forEach(function(r){
      if(r[13] === '1') genderSpecies.add(parseInt(r[0], 10));
    });
    allEntries.forEach(function(e){
      if(!genderSpecies.has(e.speciesId)) return;
      // On ne double que la forme de base : une Méga ou une forme régionale
      // n'a pas à recevoir sa variante ♀ en plus.
      if(!estFormeDeBase(e)) return;
      // Sept espèces portent déjà le sexe dans leur nom (« pyroar-male ») et
      // PokeAPI livre leur femelle comme une forme à part : leur en fabriquer
      // une donnerait « pyroar-male-female », soit « Némélios (mâle) ♀ ».
      if(e.name.endsWith('-male')) return;
      out.push({
        id: e.id,
        speciesId: e.speciesId,
        name: e.name + '-female',
        display: e.display + ' ♀',
        displayEn: (e.displayEn || e.display) + ' ♀',
        gen: e.gen,
        spriteOnly: true
      });
    });

    extraFormEntries = out;
    cacheEcrire('formes', out);
    return out;
  })();

  return extraFormsLoading;
}

/**
 * À quel niveau une entrée apparaît.
 *
 * Les femelles d'abord : « pyroar-female » porte aussi un suffixe de forme, et
 * l'ordre des questions décide de son niveau.
 */
function niveauDeForme(entry){
  if(/-female$/.test(entry.name)) return 4;
  if(formSuffix(entry.name)) return 2;
  if(estFormeDeBase(entry)) return 1;
  return 3;
}

// La réserve dans laquelle les scopes puisent.
function poolEntries(){
  return (allFormsMode && extraFormEntries) ? allEntries.concat(extraFormEntries) : allEntries;
}

// Le périmètre de Pokémon HOME : ce qu'on peut réellement ranger dans une
// boîte. Les formes de combat en sortent, y compris en mode « Toutes les
// formes » — ce mode ouvre les variantes, il ne rend pas stockable ce qui ne
// l'est pas. Les scopes de jeu, eux, continuent de lire poolEntries().
function poolHome(){
  // Le concat se fait ici, et non dans poolEntries() : les Pokédex de jeux
  // lisent poolEntries(), et leur ajouter 283 entrées changerait la forme que
  // pickGameForm() retient pour chaque espèce.
  const base = (niveauFormes >= 3 && extraFormEntries)
    ? allEntries.concat(extraFormEntries)
    : allEntries;
  return base.filter(function(e){
    return !horsDeHome(e.name) && niveauDeForme(e) <= niveauFormes;
  });
}



const REGION_SUFFIXES = ['alola', 'galar', 'hisui', 'paldea'];

// Est-ce la forme ordinaire de l'espèce, celle qu'on montre par défaut ?
//
// On le lisait à l'absence de tiret dans le nom — un raccourci faux pour 76
// espèces : Mr. Mime, Ho-Oh, Porygon-Z, Tapu Koko, les Paradoxes (« iron-
// treads », « great-tusk »), et toutes celles dont PokeAPI nomme la forme de
// base avec un qualificatif (« darmanitan-standard », « aegislash-shield »).
// Aucune n'était reconnue comme forme de base, et la carte affichée tombait
// alors sur « la première venue » — parfois une forme régionale.
//
// PokeAPI numérote les formes alternatives au-delà de 10000 : une entrée dont
// l'id est celui de son espèce est donc la forme de base, sans exception. Les
// formes cosmétiques ajoutées par loadExtraForms empruntent l'id de leur base ;
// elles portent « spriteOnly », ce qui les écarte.
function estFormeDeBase(entry){
  return !entry.spriteOnly && entry.id === entry.speciesId;
}

// Pokébip nomme parfois uniquement les sous-formes d'une espèce (« Burmy
// Plant Cloak ») là où PokeAPI n'a qu'une entrée générique (« burmy »).
// On note donc les espèces dont seules des formes *cosmétiques* sont
// listées : leur forme de base les représentera. Une forme régionale, elle,
// ne vaut jamais pour la base — Caninos de Hisui n'autorise pas Caninos.
// Construit à la première demande, et non au chargement : il faut connaître la
// liste des espèces pour ne pas couper « mr-mime » en « mr », ni laisser
// « porygon-z » autoriser Porygon dans un jeu qui ne le contient pas.
let gameFormsCache = null;

function gameForms(){
  if(gameFormsCache) return gameFormsCache;
  const bases = new Set((allEntries || []).filter(estFormeDeBase)
    .map(function(e){ return e.name; }));

  const out = {};
  Object.keys(GAME_FORMS_RAW).forEach(function(key){
    const slugs = GAME_FORMS_RAW[key].split(' ');
    const standIn = new Set();
    slugs.forEach(function(slug){
      const cut = slug.indexOf('-');
      if(cut === -1) return;
      // Un nom d'espèce à tiret n'est pas une sous-forme : il ne désigne
      // personne d'autre que lui-même.
      if(bases.has(slug)) return;
      if(formSuffix(slug) || isMegaLike(slug) || slug.indexOf('-gmax') !== -1) return;
      standIn.add(slug.slice(0, cut));
    });
    out[key] = { set: new Set(slugs), standIn: standIn };
  });

  // Appelé avant que les espèces soient chargées, on rend un résultat utilisable
  // mais on ne le mémorise pas : sinon un standIn incomplet resterait figé.
  if(bases.size) gameFormsCache = out;
  return out;
}

// La région d'une forme, si elle en a une. On ne peut pas se contenter de la
// fin du nom : Darumacho de Galar s'appelle « darmanitan-galar-standard », avec
// « darmanitan-galar-zen » pour sa transe, et Tauros de Paldea porte en plus sa
// race (« tauros-paldea-blaze-breed »). Cherchée seulement en fin de nom, la
// région échappait à ces cinq formes, qui passaient pour ordinaires et
// s'invitaient dans les Pokédex des autres régions.
//
// Seule exception à écarter : les Pikachu à casquette (« pikachu-alola-cap »)
// portent le nom d'une région sans en être — c'est un couvre-chef, pas une
// variante régionale.
function formSuffix(name){
  if(name.endsWith('-cap')) return null;
  const morceaux = name.split('-');
  for(let i = 1; i < morceaux.length; i++){
    if(REGION_SUFFIXES.indexOf(morceaux[i]) !== -1) return morceaux[i];
  }
  return null;
}

// Les formes d'Arceus ne sont qu'un changement de type via une Plaque : on
// les traite comme des Méga-évolutions, c'est-à-dire un seul Pokémon.
// À ne pas confondre avec horsDeHome(), dans donnees.js : celui-ci sert aux
// scopes de jeu, l'autre décide de ce qui entre dans la collection HOME. Les
// deux se ressemblent et ne fusionnent pas.
function isMegaLike(name){
  return name.indexOf('-mega') !== -1 || name.indexOf('arceus-') === 0;
}

// La liste Pokébip fait foi sur ce que le jeu contient. À défaut (jeu sans
// liste), on retombe sur les règles : Méga hors des jeux qui les proposent,
// Gigamax hors d'Épée/Bouclier, formes régionales d'ailleurs.
function formAllowedInGame(entry, game){
  const n = entry.name;
  // Une variante ♀ suit sa forme de base : Pokébip ne liste pas les sexes
  // séparément, mais si le Pokémon est dans le jeu, sa femelle l'est aussi.
  if(n.endsWith('-female')){
    // On transmet les identifiants : la variante ♀ partage ceux de sa base, et
    // sans eux le test de forme de base ne pourrait pas se prononcer.
    return formAllowedInGame(
      { name: n.slice(0, -7), id: entry.id, speciesId: entry.speciesId }, game);
  }
  if(isMegaLike(n) && !game.mega) return false;
  if(n.indexOf('-gmax') !== -1 && !game.gmax) return false;
  const known = gameForms()[game.key];
  if(known){
    if(known.set.has(n)) return true;
    return estFormeDeBase(entry) && known.standIn.has(n);
  }
  const suffix = formSuffix(n);
  // region '*' : le jeu accepte toutes les formes régionales (Cobblemon).
  if(suffix && game.region !== '*' && suffix !== game.region) return false;
  return true;
}

// Parmi les formes restantes d'une espèce, celle que le jeu met en avant :
// sa variante régionale s'il en a une (Archéduc de Hisui dans Arceus),
// sinon la forme de base.
function pickGameForm(entries, game){
  if(game.region){
    const regional = entries.find(function(e){ return formSuffix(e.name) === game.region; });
    if(regional) return regional;
  }
  const base = entries.find(estFormeDeBase);
  return base || entries[0];
}

// Une forme qui vaut une capture à part : la forme ordinaire, ou une forme
// régionale. Une Méga-évolution ou un Gigamax n'est qu'un état passager du même
// Pokémon — il garde donc la carte de sa forme de base.
function varianteDeCapture(entry){
  if(isMegaLike(entry.name) || entry.name.indexOf('-gmax') !== -1) return false;
  return estFormeDeBase(entry) || !!formSuffix(entry.name);
}

function shapeForGame(entries, game){
  const allowed = entries.filter(function(e){ return formAllowedInGame(e, game); });
  if(allFormsMode) return allowed;

  const liste = gameForms()[game.key];
  const bySpecies = new Map();
  allowed.forEach(function(e){
    if(!bySpecies.has(e.speciesId)) bySpecies.set(e.speciesId, []);
    bySpecies.get(e.speciesId).push(e);
  });

  const out = [];
  bySpecies.forEach(function(list){
    // Un même jeu contient parfois deux formes d'une espèce, et une seule d'une
    // autre : dans Légendes Arceus, Farfuret se capture sous ses deux formes,
    // tandis qu'Efflèche n'évolue qu'en Archéduc de Hisui — la forme ordinaire
    // n'y existe pas. Quand la liste du jeu les nomme toutes les deux, n'en
    // garder qu'une cacherait un Pokémon réellement capturable.
    const nommees = liste
      ? list.filter(function(e){ return liste.set.has(e.name) && varianteDeCapture(e); })
      : [];
    if(nommees.length > 1){
      nommees.forEach(function(e){ out.push(e); });
      return;
    }
    out.push(pickGameForm(list, game));
  });
  return out;
}

const ONE_PER_SPECIES = 'Une carte par espèce, dans la variante du jeu. '
  + 'Active « Toutes les formes » pour ajouter les autres.';

const FORMS_CAVEAT = 'Toutes les formes de ce jeu, d\'après les listes Pokébip.';

const gameByKey = {};
GAMES.forEach(function(g){ gameByKey[g.key] = g; });

const dexCache = {};   // nom PokeAPI -> Set d'ids d'espèces
let currentTab = 'home';
let currentVariant = 'regional';
let scopeEntries = [];      // les entrées visibles dans le scope courant
let scopeLoadToken = 0;     // pour ignorer une réponse arrivée trop tard
let dexRank = null;         // espèce -> rang dans le Pokédex du jeu
let dexNumber = null;       // espèce -> numéro affiché sur la carte

// On garde le numéro d'ordre de chaque espèce dans son Pokédex : c'est lui
// qui met Brindibou en tête à Hisui plutôt que Bulbizarre.
async function fetchDex(name){
  if(dexCache[name]) return dexCache[name];

  // Une Map ne se serialise pas telle quelle : on la stocke en paires.
  const enCache = cacheLire('dex-' + name);
  if(enCache){
    const rejoue = new Map(enCache);
    dexCache[name] = rejoue;
    return rejoue;
  }

  const res = await fetch('https://pokeapi.co/api/v2/pokedex/' + name);
  if(!res.ok) throw new Error('Pokédex « ' + name + ' » indisponible');
  const data = await res.json();
  const order = new Map();
  data.pokemon_entries.forEach(function(pe){
    order.set(extractId(pe.pokemon_species.url), pe.entry_number);
  });
  dexCache[name] = order;
  cacheEcrire('dex-' + name, Array.from(order.entries()));
  return order;
}

// Renvoie, pour une variante, deux tables : le rang de tri et le numéro tel
// qu'affiché dans le jeu.
async function speciesForVariant(variant){
  const rank = new Map();     // espèce -> clé de tri
  const number = new Map();   // espèce -> n° affiché sur la carte

  if(variant.upTo){
    // Un vrai Pokédex National : son ordre est l'ordre national.
    poolEntries().forEach(function(e){
      if(e.speciesId <= variant.upTo){ rank.set(e.speciesId, e.speciesId); number.set(e.speciesId, e.speciesId); }
    });
    return { rank: rank, number: number };
  }

  const maps = await Promise.all(variant.dexes.map(fetchDex));
  // Les Pokédex d'un même jeu se suivent (Galar, puis Isolarmure,
  // puis Couronneige) : un décalage par bloc préserve cet
  // enchaînement, tandis que le numéro affiché reste celui du jeu.
  maps.forEach(function(m, i){
    m.forEach(function(num, id){
      if(rank.has(id)) return;   // première apparition = celle qui compte
      rank.set(id, i * 10000 + num);
      number.set(id, num);
    });
  });
  return { rank: rank, number: number };
}

// « N° du jeu » n'a de sens que sur un onglet de jeu : ailleurs on masque
// l'option, et on bascule sur le tri national pour ne pas laisser un choix
// sélectionné mais inopérant.
function updateSortOptions(){
  const onGame = !!gameByKey[currentTab];
  const gameOption = sortEl.querySelector('option[value="game"]');
  gameOption.hidden = !onGame;
  gameOption.disabled = !onGame;
  // La bascule ne touche que ces deux-là : un tri par nom ou par génération
  // est un choix, et entrer dans un jeu ne doit pas le défaire.
  if(onGame && sortEl.value === 'id') sortEl.value = 'game';
  else if(!onGame && sortEl.value === 'game') sortEl.value = 'name';
  if(typeof syncSelects === 'function') syncSelects();
}

function activeVariant(){
  const game = gameByKey[currentTab];
  if(!game) return null;
  return currentVariant === 'second' && game.second ? game.second : game.regional;
}

// Recalcule scopeEntries, puis redessine. Les jeux chargent leur liste à la
// demande (une seule fois), d'où le passage par une promesse.
async function applyScope(){
  const token = ++scopeLoadToken;
  const game = gameByKey[currentTab];

  if(!game){
    scopeEntries = poolHome();
    dexRank = null;
    dexNumber = null;
    scopeHead.style.display = 'none';
    scopeNote.style.display = 'none';
    updateSortOptions();
    readoutLeft.textContent = scopeEntries.length ? 'Pokémon HOME — collection complète' : 'Chargement…';
    updateAllFormsLabel();
    updateProgress();
    renderList(true);
    listEl.scrollTop = 0;
    return;
  }

  const variant = activeVariant();
  updateSortOptions();
  scopeHead.style.display = '';
  scopeTitle.innerHTML = escapeHtml(game.title) + '<small>' + escapeHtml(game.machine) + '</small>';

  // Pas de second Pokédex ? Le sélecteur disparaît complètement : une option
  // grisée ne ferait qu'inviter à choisir rien.
  //
  // Il vit dans la barre des modes, avec le tri et les filtres — c'est là qu'on
  // va quand on veut changer ce qu'on regarde. Il y était auparavant en deux
  // boutons, dans l'en-tête du jeu, où il se confondait avec le titre.
  if(scopeBascule){
    if(!game.second){
      scopeBascule.hidden = true;
    } else {
      scopeBascule.hidden = false;
      // « DLC » quand c'en est un : sur Épée/Bouclier, le second Pokédex n'est
      // pas le National mais l'Île Solitaire et la Toundra.
      scopeSecondNom.textContent =
        game.second.kind === 'dlc' ? 'DLC' : 'National';
      scopeBascule.title = game.second.label;
      // Coché = le second. Le régional est la position de repos, à gauche :
      // c'est le Pokédex du jeu, celui qu'on ouvre par défaut.
      scopeVariant.checked = currentVariant === 'second';
    }
  }

  // La note du régional vaut qu'un second Pokédex existe ou non : « Kalos se
  // divise en trois Pokédex » reste vrai maintenant que X/Y ont leur bouton
  // National. Elle ne s'affiche en avertissement que lorsqu'il n'y a pas de
  // second — là, elle explique une absence.
  const baseNote = (currentVariant === 'second' && game.second)
    ? game.second.note
    : (game.noteRegionale || 'Pokédex régional du jeu.');
  scopeNote.style.display = '';
  scopeNote.className = 'scope-note' + (game.second ? '' : ' warn');
  scopeNote.textContent = baseNote;

  listEl.innerHTML = '<div class="state-msg">Chargement du ' + variant.label + '…</div>';
  loadMoreBtn.style.display = 'none';
  readoutLeft.textContent = variant.label + ' — chargement…';

  let dex;
  try{
    dex = await speciesForVariant(variant);
  }catch(e){
    if(token !== scopeLoadToken) return;
    listEl.innerHTML = '<div class="state-msg">Liste indisponible : ' + escapeHtml(e.message)
      + '. Vérifie ta connexion.</div>';
    readoutLeft.textContent = 'Erreur de connexion';
    return;
  }
  if(token !== scopeLoadToken) return;  // l'utilisateur a déjà changé d'onglet

  dexRank = dex.rank;
  dexNumber = dex.number;
  const inDex = poolEntries().filter(function(entry){ return dexRank.has(entry.speciesId); });
  scopeEntries = shapeForGame(inDex, game);
  // On retient le total du Pokédex régional : c'est la référence affichée sur
  // l'accueil, indépendamment de la variante ou des filtres du moment.
  if(currentVariant === 'regional' && !allFormsMode) gameTotals[game.key] = scopeEntries.length;
  readoutLeft.textContent = variant.label + ' — ' + dexRank.size + ' espèces';
  scopeNote.textContent = baseNote + ' — ' + dexRank.size + ' espèces, '
    + scopeEntries.length + ' cartes. ' + (allFormsMode ? FORMS_CAVEAT : ONE_PER_SPECIES);
  updateAllFormsLabel();
  updateProgress();
  renderList(true);
  listEl.scrollTop = 0;
}

niveauFormesEl.addEventListener('change', async function(){
  const voulu = parseInt(niveauFormesEl.value, 10) || 3;

  // Les formes supplémentaires servent dès le niveau 3. Elles viennent de la
  // réserve embarquée — cacheLire('formes') n'a besoin d'aucun réseau — mais on
  // passe quand même par loadExtraForms(), qui sait aussi aller les chercher si
  // la réserve venait à manquer.
  if(voulu >= 3 && !extraFormEntries){
    niveauFormesEl.disabled = true;
    try{
      await loadExtraForms();
    }catch(e){
      console.error('Formes supplémentaires indisponibles :', e);
      niveauFormesEl.disabled = false;
      niveauFormesEl.value = String(niveauFormes);
      if(typeof syncSelects === 'function') syncSelects();
      prevenirErreur('Formes indisponibles',
        'La liste des formes supplémentaires est illisible. Les deux premiers '
        + 'niveaux fonctionnent sans elle.');
      return;
    }
    niveauFormesEl.disabled = false;
  }

  niveauFormes = voulu;
  allFormsMode = niveauFormes >= 4;
  // Le pis-aller de cette machine, pour le prochain démarrage avant connexion.
  try{ localStorage.setItem('pa-niveau-formes', String(niveauFormes)); }catch(e){}
  // Et surtout : sur l'aventure, qui est le vrai propriétaire du réglage. Une
  // comparaison entre dresseurs n'a de sens qu'à dénominateur égal.
  if(typeof enregistrerNiveauProfil === 'function') enregistrerNiveauProfil(voulu);
  applyScope();
});

// Le compte affiché est celui du Pokédex ouvert, pas un total national :
// « 290 » sur Légendes Arceus veut dire 290 cartes dans ce jeu.
function updateAllFormsLabel(){
  const choisi = niveauFormesEl.options[niveauFormes - 1];
  if(!choisi) return;
  const base = choisi.dataset.libelle || choisi.textContent;
  choisi.dataset.libelle = base;
  // On n'affiche le compte que sur la collection HOME : dans un jeu, le total
  // du scope se lit déjà sous l'en-tête.
  choisi.textContent = gameByKey[currentTab] ? base : base + ' : ' + scopeEntries.length;
  if(typeof syncSelects === 'function') syncSelects();
}

// Le choix survit au redémarrage : c'est un réglage, pas un filtre.
/**
 * Applique un niveau sans l'enregistrer nulle part.
 *
 * C'est par là que passe l'ouverture d'une aventure : le niveau vient d'elle,
 * il n'y a rien à réécrire. Rend une promesse, parce que les formes
 * supplémentaires peuvent avoir à se charger d'abord — depuis la réserve
 * embarquée, donc sans réseau, mais pas de façon synchrone.
 */
function appliquerNiveauFormes(n, redessiner){
  const v = (n >= 1 && n <= 4) ? Math.floor(n) : 3;
  niveauFormes = v;
  allFormsMode = v >= 4;
  if(niveauFormesEl) niveauFormesEl.value = String(v);
  if(typeof syncSelects === 'function') syncSelects();

  const suite = (v >= 3 && !extraFormEntries && typeof loadExtraForms === 'function')
    ? loadExtraForms().catch(function(){ return null; })
    : Promise.resolve(null);
  return suite.then(function(){ if(redessiner) return applyScope(); });
}

// Sans aventure ouverte — le temps de la connexion — le dernier niveau connu
// de cette machine sert de pis-aller. Il n'a plus valeur de réglage : dès
// qu'une aventure s'ouvre, c'est le sien qui décide.
//
// On ne redessine surtout pas d'ici : ce fichier se charge avant dex.js, donc
// avant que updateProgress() n'existe, et applyScope() partait en
// ReferenceError. Le premier dessin vient de toute façon du démarrage normal.
(function niveauDeSecours(){
  let garde = null;
  try{ garde = localStorage.getItem('pa-niveau-formes'); }catch(e){}
  const n = parseInt(garde, 10);
  if(n >= 1 && n <= 4) appliquerNiveauFormes(n, false);
})();

if(scopeVariant){
  scopeVariant.addEventListener('change', function(){
    const voulu = scopeVariant.checked ? 'second' : 'regional';
    if(voulu === currentVariant) return;
    currentVariant = voulu;
    applyScope();
  });
}

