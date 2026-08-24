// Les Pokémon fabuleux, et la page qui les rassemble.
// Script classique (pas de module ES), chargé après evenements.js — d'où vient
// l'historique des distributions françaises — et avant fiche.js, qui lit les
// mêmes listes pour son bloc « Où l'obtenir ».
//
// Ces Pokémon forment un cas à part dans une collection : ils ne se rencontrent
// nulle part, aucun Pokédex régional ne les contient, et rien dans les données
// de PokeAPI ne dit comment les obtenir. Ils se distribuent lors d'évènements
// datés, souvent longtemps révolus — d'où cette page, qui les liste par
// génération et dit pour chacun quand il est passé par la France.

// Les fabuleux, dans l'ordre du Pokédex national. La génération se déduit du
// numéro (voir GEN_RANGES) : pas de liste à tenir en double.
const FABULEUX = new Set([
  151, 251, 385, 386, 489, 490, 491, 492, 493, 494, 647, 648, 649,
  719, 720, 721, 801, 802, 807, 808, 809, 893, 1025
]);

// Le cas ordinaire : une distribution officielle.
const CADEAU_MYSTERE = {
  titre: '🎁 Cadeau Mystère',
  court: 'Distribution officielle',
  texte: 'Pokémon fabuleux : il ne se rencontre nulle part. Il s\'obtient lors '
    + 'd\'une distribution officielle — par Internet, en boutique ou lors d\'un '
    + 'évènement — puis se transfère de jeu en jeu.',
  note: 'Hors distribution : par échange uniquement'
};

// Quatre fabuleux ne se distribuent pas. Les ranger avec les autres enverrait
// attendre un évènement qui n'aura jamais lieu.
const FABULEUX_A_PART = {
  489: { titre:'🥚 Par reproduction', court:'Œuf de Manaphy',
         texte:'Phione éclot d\'un Œuf de Manaphy, à la Pension. C\'est le seul '
             + 'moyen de l\'obtenir : il ne fait l\'objet d\'aucune distribution.',
         note:'Il faut donc d\'abord un Manaphy' },
  808: { titre:'📦 Depuis Pokémon GO', court:'Boîte Mystère (Pokémon GO)',
         texte:'Meltan sort de la Boîte Mystère de Pokémon GO, ouverte en '
             + 'transférant un Pokémon vers Let\'s Go ou Pokémon HOME.',
         note:'Aucune distribution ne le donne directement' },
  809: { titre:'📦 Depuis Pokémon GO', court:'Évolution dans Pokémon GO',
         texte:'Melmetal s\'obtient en faisant évoluer Meltan dans Pokémon GO, '
             + 'avec 400 bonbons, puis en le transférant vers Pokémon HOME.',
         note:'Ne se fait pas évoluer dans les jeux principaux' },
  // Pecharunt était rangé avec les distributions, et la page promettait donc
  // un évènement qui n'existe pas : il s'attrape en jeu, comme n'importe quel
  // Pokémon de l'épilogue.
  1025:{ titre:'🍡 Dans le jeu', court:'Épilogue du Disque Indigo',
         texte:'Pecharunt ne se distribue pas : il s\'obtient dans Écarlate et '
             + 'Violet, au terme de l\'épilogue qui suit le Disque Indigo.',
         note:'Aucune distribution officielle ne le donne' }
};

// Les formes qui n'existent que par une distribution. Elles ne sont pas
// fabuleuses — Pikachu et Amphinobi se capturent partout — mais ces formes-là,
// non : elles n'ont jamais été obtenables autrement.
// Indexées par l'identifiant PokeAPI de la forme, pas par l'espèce.
//
// Le libellé dit ce QU'EST la forme, jamais quand elle est passée : les dates
// vivent dans evenements.js, et les répéter ici les ferait diverger. C'est
// déjà arrivé — la casquette partenaire était datée de 2019, alors que la
// France l'a eue en 2017 puis en 2020.
const FORMES_EVENEMENT = {
  10094: 'Casquette d\'origine',
  10095: 'Casquette de Hoenn',
  10096: 'Casquette de Sinnoh',
  10097: 'Casquette d\'Unys',
  10098: 'Casquette de Kalos',
  10099: 'Casquette d\'Alola',
  10148: 'Casquette partenaire',
  10160: 'Casquette du monde',
  10117: 'Amphinobi d\'Ash',
  10147: 'Magearna, couleur d\'origine',
  10192: 'Zarude Dada'
};

// Pichu Troizépi n'a pas d'identifiant à lui : PokeAPI ne numérote pas les
// formes purement cosmétiques, et il porte donc celui de Pichu ordinaire. Le
// repérer par son numéro aurait étiqueté tous les Pichu comme évènementiels —
// d'où ce second index, par nom. Il n'apparaît qu'en mode « Toutes les formes »,
// seule vue où l'application le connaît.
const NOMS_EVENEMENT = { 'pichu-spiky-eared': 'Pichu Troizépi' };

function sourceEvenement(entree){
  return FORMES_EVENEMENT[entree.id] || NOMS_EVENEMENT[entree.name] || null;
}

function casFabuleux(speciesId){
  return FABULEUX_A_PART[speciesId] || CADEAU_MYSTERE;
}

// Une forme évènementielle n'est pas un fabuleux : Pikachu se capture partout,
// et lui appliquer le texte « il ne se rencontre nulle part » serait faux. Ce
// qui n'existe que par distribution, ici, c'est l'apparence.
const FORME_EVENEMENT_CAS = {
  titre: '🎁 Cadeau Mystère',
  court: 'Forme exclusive à une distribution',
  texte: 'Cette forme n\'a existé que le temps d\'une distribution officielle : '
    + 'elle ne se rencontre nulle part et ne s\'obtient pas en jeu. L\'espèce, '
    + 'elle, se capture normalement — mais jamais sous cette apparence.',
  note: 'Hors distribution : par échange uniquement'
};

// Le bon cas pour une entrée, forme ou espèce. C'est ce qu'appelle la fiche.
function casObtention(entree){
  return sourceEvenement(entree) ? FORME_EVENEMENT_CAS : casFabuleux(entree.speciesId);
}

// ---- La page ---------------------------------------------------------------

const cadeauxListe = document.getElementById('cadeauxListe');
const cadeauxResume = document.getElementById('cadeauxResume');
const cadeauxGenEl = document.getElementById('cadeauxGen');
const cadeauxEtatEl = document.getElementById('cadeauxEtat');
const cadeauxVoieEl = document.getElementById('cadeauxVoie');

// Ce que la page liste : tout ce qui ne s'obtient QUE par une distribution.
//
//   · les fabuleux, une entrée par espèce — Deoxys a quatre formes, Shaymin
//     deux, mais la collection n'en compte qu'une chacun ;
//   · les formes exclusives aux évènements, qui sont bien des cartes à part :
//     Pikachu se capture partout, Pikachu à la casquette de Kalos, jamais.
function entreesEvenement(){
  const vues = {};
  const out = [];
  allEntries.forEach(function(e){
    if(sourceEvenement(e)){ out.push(e); return; }
    if(!FABULEUX.has(e.speciesId) || vues[e.speciesId]) return;
    if(e.id !== e.speciesId) return;      // on veut la forme de base
    vues[e.speciesId] = true;
    out.push(e);
  });
  // Par numéro national, puis par identifiant : les formes d'une espèce se
  // suivent, juste après elle.
  return out.sort(function(a, b){
    return a.speciesId !== b.speciesId ? a.speciesId - b.speciesId : a.id - b.id;
  });
}

// ---- Les filtres -----------------------------------------------------------
// Trois questions, et une seule réponse à la fois pour chacune : « de quelle
// génération ? », « je l'ai ou pas ? », « par quel moyen ? ». La troisième est
// la plus utile de la page : elle répond à « qu'est-ce que je peux encore
// aller chercher moi-même, maintenant ? ».

function remplirFiltresCadeaux(entrees){
  if(!cadeauxGenEl || cadeauxGenEl._remplis) return;

  const gens = Array.from(new Set(entrees.map(function(e){
    return e.gen || getGeneration(e.speciesId);
  }))).sort(function(a, b){ return a - b; });
  gens.forEach(function(g){
    const info = GEN_RANGES.find(function(x){ return x.gen === g; });
    const o = document.createElement('option');
    o.value = String(g);
    o.textContent = info ? info.name : ('Génération ' + g);
    cadeauxGenEl.appendChild(o);
  });

  // Seules les voies réellement empruntées : proposer « Poké Ball Plus » sur
  // une page qui n'en contient aucun serait un cul-de-sac.
  const voies = {};
  entrees.forEach(function(e){
    voiesDe(distributionsFr(e)).forEach(function(v){ voies[v] = true; });
  });
  Object.keys(voies).sort(function(a, b){
    return libelleVoie(a).localeCompare(libelleVoie(b), 'fr');
  }).forEach(function(v){
    const o = document.createElement('option');
    o.value = v;
    o.textContent = libelleVoie(v);
    cadeauxVoieEl.appendChild(o);
  });

  cadeauxGenEl._remplis = true;
  if(typeof syncSelects === 'function') syncSelects();
}

function filtreCadeaux(entree, home){
  const dist = distributionsFr(entree);

  const gen = cadeauxGenEl ? cadeauxGenEl.value : 'all';
  if(gen !== 'all' && String(entree.gen || getGeneration(entree.speciesId)) !== gen) return false;

  const etat = cadeauxEtatEl ? cadeauxEtatEl.value : 'all';
  if(etat === 'obtenu' && !home.caught.has(entree.name)) return false;
  if(etat === 'manquant' && home.caught.has(entree.name)) return false;
  if(etat === 'shiny' && !home.shiny.has(entree.name)) return false;
  // « Encore disponible » : une distribution permanente, ou un Pokémon dont
  // l'obtention ne dépend d'aucune date (Phione, Meltan, Pecharunt…).
  if(etat === 'dispo' && !encoreDisponible(dist) && !FABULEUX_A_PART[entree.speciesId]) return false;

  const voie = cadeauxVoieEl ? cadeauxVoieEl.value : 'all';
  if(voie !== 'all' && voiesDe(dist).indexOf(voie) === -1) return false;

  return true;
}

function marquerFiltresCadeaux(){
  [cadeauxGenEl, cadeauxEtatEl, cadeauxVoieEl].forEach(function(el){
    if(el) el.classList.toggle('filtering', el.value !== 'all');
  });
  if(typeof syncSelects === 'function') syncSelects();
}

// ---- Le dessin -------------------------------------------------------------

function dessinerCadeaux(){
  if(!cadeauxListe) return;
  const toutes = entreesEvenement();

  if(!toutes.length){
    cadeauxListe.innerHTML = '<div class="state-msg">Liste indisponible : '
      + 'la réserve des espèces n\'est pas chargée.</div>';
    if(cadeauxResume) cadeauxResume.textContent = '';
    return;
  }

  remplirFiltresCadeaux(toutes);
  marquerFiltresCadeaux();

  // La collection Pokémon HOME fait foi : un fabuleux ne se range pas dans le
  // Pokédex d'un jeu, il se transfère.
  const home = bucketFor('national');
  const entrees = toutes.filter(function(e){ return filtreCadeaux(e, home); });

  // Le résumé porte sur la page entière, pas sur le filtre : on veut savoir où
  // on en est de sa collection, pas de sa recherche du moment.
  if(cadeauxResume){
    let possedes = 0, chromatiques = 0, dispo = 0;
    toutes.forEach(function(e){
      if(home.caught.has(e.name)) possedes++;
      if(home.shiny.has(e.name)) chromatiques++;
      if(encoreDisponible(distributionsFr(e)) || FABULEUX_A_PART[e.speciesId]) dispo++;
    });
    const manquants = toutes.length - possedes;
    cadeauxResume.textContent = possedes + ' / ' + toutes.length + ' obtenus'
      + (chromatiques ? '  ·  ' + chromatiques + ' en chromatique' : '')
      + (manquants && dispo ? '  ·  ' + dispo + ' encore obtenables aujourd\'hui' : '');
  }

  cadeauxListe.innerHTML = '';
  if(!entrees.length){
    cadeauxListe.innerHTML = '<div class="state-msg">Aucun Pokémon ne correspond '
      + 'à ces filtres.</div>';
    return;
  }

  // Regroupement par génération, dans l'ordre. GEN_RANGES porte déjà le nom de
  // chacune : « Génération 4 — Sinnoh » plutôt qu'un chiffre nu.
  const parGen = new Map();
  entrees.forEach(function(e){
    const g = e.gen || getGeneration(e.speciesId);
    if(!parGen.has(g)) parGen.set(g, []);
    parGen.get(g).push(e);
  });

  Array.from(parGen.keys()).sort(function(a, b){ return a - b; }).forEach(function(gen){
    const bloc = document.createElement('section');
    bloc.className = 'cadeaux-gen';

    const infoGen = GEN_RANGES.find(function(g){ return g.gen === gen; });
    const titre = document.createElement('div');
    titre.className = 'cadeaux-gen-titre';
    const nom = document.createElement('span');
    nom.textContent = infoGen ? infoGen.name : ('Génération ' + gen);
    const compte = document.createElement('span');
    compte.className = 'cadeaux-gen-compte';
    const liste = parGen.get(gen);
    const eus = liste.filter(function(e){ return home.caught.has(e.name); }).length;
    compte.textContent = eus + ' / ' + liste.length;
    titre.appendChild(nom); titre.appendChild(compte);
    bloc.appendChild(titre);

    const cartes = document.createElement('div');
    cartes.className = 'cadeaux-cartes';
    liste.forEach(function(e){ cartes.appendChild(carteFabuleux(e, home)); });
    bloc.appendChild(cartes);

    cadeauxListe.appendChild(bloc);
  });
}

// La ligne qui résume l'historique français d'une entrée. Elle remplace le
// « Distribution officielle » d'avant, qui était vrai pour tout le monde et
// n'apprenait donc rien.
function resumeDistributions(entree){
  const dist = distributionsFr(entree);
  if(!dist.length){
    // Un fabuleux qui s'obtient autrement (Phione, Meltan…) n'a pas à être
    // signalé comme un manque : son cas explique déjà tout.
    if(FABULEUX_A_PART[entree.speciesId]) return { texte: casFabuleux(entree.speciesId).court };
    return { texte: 'Aucune distribution française recensée', absent: true };
  }
  const derniere = derniereDistribution(dist);
  const reelles = dist.filter(function(d){ return !d.jamais; }).length;
  if(!derniere) return { texte: 'Jamais distribué officiellement', absent: true };
  if(derniere.permanent){
    return { texte: derniere.ev + ' · toujours ouvert', dispo: true };
  }
  const pluriel = reelles > 1 ? reelles + ' distributions · ' : '';
  return { texte: pluriel + derniere.ev + (derniere.annee ? ' (' + derniere.annee + ')' : '') };
}

function carteFabuleux(entree, home){
  const cas = casFabuleux(entree.speciesId);
  const eu = home.caught.has(entree.name);
  const shiny = home.shiny.has(entree.name);
  const resume = resumeDistributions(entree);

  // Un bouton : la carte entière ouvre la fiche, comme dans la grille.
  const carte = document.createElement('button');
  carte.type = 'button';
  carte.className = 'cadeau-carte' + (eu ? ' obtenu' : '')
    + (resume.dispo ? ' dispo' : '') + (resume.absent ? ' sans-distribution' : '');
  carte.title = 'Ouvrir la fiche de ' + nomAffiche(entree);

  const cadre = document.createElement('span');
  cadre.className = 'cadeau-sprite';
  const img = document.createElement('img');
  // En chromatique si on l'a en chromatique : la vignette montre ce qu'on a.
  img.src = pokeosHomeUrl(entree.id, shiny);
  img.alt = '';
  img.loading = 'lazy';
  img.addEventListener('error', function(){ img.src = officialArtworkUrl(entree.id, shiny); });
  cadre.appendChild(img);
  carte.appendChild(cadre);

  const infos = document.createElement('span');
  infos.className = 'cadeau-infos';

  const nom = document.createElement('span');
  nom.className = 'cadeau-nom';
  nom.textContent = nomAffiche(entree);
  infos.appendChild(nom);

  // Ce qu'est cette entrée : une forme précise, ou le cas général du fabuleux.
  const source = document.createElement('span');
  source.className = 'cadeau-source';
  source.textContent = sourceEvenement(entree) || cas.court;
  infos.appendChild(source);

  // Ce qui est nouveau : quand la France l'a eu.
  const quand = document.createElement('span');
  quand.className = 'cadeau-distrib' + (resume.dispo ? ' dispo' : '')
    + (resume.absent ? ' absent' : '');
  quand.textContent = resume.texte;
  infos.appendChild(quand);

  const etat = document.createElement('span');
  etat.className = 'cadeau-etat' + (eu ? ' oui' : '');
  etat.textContent = shiny ? '✨ obtenu en chromatique' : (eu ? '⬤ obtenu' : 'pas encore obtenu');
  infos.appendChild(etat);

  carte.appendChild(infos);
  carte.addEventListener('click', function(){ openPreview(entree, null); });
  return carte;
}

[cadeauxGenEl, cadeauxEtatEl, cadeauxVoieEl].filter(Boolean).forEach(function(el){
  el.addEventListener('change', dessinerCadeaux);
});
