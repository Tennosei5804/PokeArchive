// Les objectifs sur mesure : se fixer un but que personne n'a prévu.
// Script classique (pas de module ES), chargé après dex.js et accueil.js.
//
// POURQUOI. Les vingt-quatre collections sont données d'avance. Rien ne
// permettait de suivre « le living dex de Johto en balls d'Apricorne », « tous
// les Spectre chromatiques » ou « les 151 de Kanto, mais dans Écarlate » — or
// c'est exactement ce que se fixent les gens qui restent.
//
// PRESQUE RIEN À ÉCRIRE, et c'est le point : la barre de filtres produit DÉJÀ
// l'ensemble. Jeu, génération, type, obtention, recherche, forme : tout est
// là, et il ne manquait qu'un bouton pour figer le résultat.
//
// L'ENSEMBLE EST FIGÉ À LA CRÉATION, pas recalculé. On garde la liste des noms
// plutôt que les filtres, pour deux raisons :
//   · un objectif ne doit pas bouger sous les pieds de celui qui se l'est
//     fixé. Le jour où le relevé gagne une ligne, « les 151 de Kanto » restent
//     cent cinquante-et-un ;
//   · le calcul est alors une intersection d'ensembles — instantané, hors
//     ligne, et sans avoir à rouvrir le Pokédex du jeu concerné pour compter.
//
// Le coût est mesuré : mille deux cent quatre-vingt-un noms font douze kilo-
// octets de JSON, et la plupart des objectifs sont vingt fois plus petits.

let objectifs = [];

// Au-delà, ce n'est plus un objectif mais une seconde collection : les
// Pokédex existent pour ça, et ils comptent mieux.
const OBJECTIF_MAX_ENTREES = 2000;
const OBJECTIF_MAX = 12;

const objectifBtn = document.getElementById('objectifBtn');
const objectifsBloc = document.getElementById('objectifsBloc');
const objectifsTitre = document.getElementById('objectifsTitre');

/** Le seau où se lit l'avancement d'un objectif. */
function seauObjectif(o){
  const b = bucketFor(o.dex || 'national');
  return o.shiny ? b.shiny : b.caught;
}

function avancementObjectif(o){
  const seau = seauObjectif(o);
  let pris = 0;
  (o.entrees || []).forEach(function(n){ if(seau.has(n)) pris++; });
  return { pris: pris, total: (o.entrees || []).length };
}

// ---- Créer ------------------------------------------------------------------

/**
 * Ce que la barre de filtres dit, en toutes lettres.
 *
 * Sert de nom proposé et de sous-titre : un objectif nommé « Objectif 3 » ne
 * rappellerait à personne ce qu'il contient six mois plus tard.
 */
function decrireFiltres(){
  const bouts = [];
  const jeu = gameByKey[currentTab];
  bouts.push(jeu ? jeu.tab : '🏡 Pokémon HOME');
  if(shinyView) bouts.push('✨ chromatiques');
  if(genFilterEl.value !== 'all'){
    const o = genFilterEl.options[genFilterEl.selectedIndex];
    if(o) bouts.push(o.textContent.replace(/\s*—.*$/, ''));
  }
  if(typeFilterEl.value !== 'all' && typeof TYPES_FR !== 'undefined'){
    bouts.push('type ' + TYPES_FR[typeFilterEl.value]);
  }
  if(filterEl.value !== 'all'){
    const o = filterEl.options[filterEl.selectedIndex];
    if(o) bouts.push(o.textContent.replace(/\s*\(.*\)$/, ''));
  }
  const q = searchEl.value.trim();
  if(q) bouts.push('« ' + q + ' »');
  return bouts.join(' · ');
}

async function enregistrerObjectif(){
  if(!playerName){
    prevenirErreur('Aucune aventure ouverte',
      'Connecte-toi d\'abord : un objectif appartient à une aventure.');
    return;
  }
  if(objectifs.length >= OBJECTIF_MAX){
    prevenirErreur('Douze objectifs, c\'est déjà beaucoup',
      'Supprimes-en un depuis l\'accueil pour en ajouter un autre.');
    return;
  }

  // La liste filtrée telle qu'elle est à l'écran — pas le périmètre entier.
  // C'est ce que la personne voit, et c'est donc ce qu'elle croit enregistrer.
  const liste = currentFiltered.slice();
  if(!liste.length){
    prevenirErreur('Rien à enregistrer',
      'La grille est vide : aucun Pokémon ne correspond à ces filtres.');
    return;
  }
  if(liste.length > OBJECTIF_MAX_ENTREES){
    prevenirErreur('Trop large pour un objectif',
      liste.length + ' entrées : au-delà de ' + OBJECTIF_MAX_ENTREES + ', ce n\'est '
      + 'plus un objectif mais une seconde collection — et les Pokédex la '
      + 'comptent déjà mieux. Resserre les filtres.');
    return;
  }

  const description = decrireFiltres();
  const nom = await demanderSaisie({
    eyebrow: 'Nouvel objectif',
    titre: 'Comment l\'appelles-tu ?',
    resume: [
      { cle: 'entrées retenues', valeur: liste.length },
      { cle: 'forme', valeur: shinyView ? '✨' : '⬤' }
    ],
    note: 'Ce que tes filtres retiennent en ce moment : ' + description + '. '
      + 'L\'ensemble est figé maintenant — il ne bougera plus, même si le relevé '
      + 'change.',
    libelleChamp: 'Nom de l\'objectif',
    valeur: description.slice(0, 40),
    maxlength: 40,
    valider: function(v){
      const t = String(v || '').trim();
      if(t.length < 2) return 'Deux caractères au minimum.';
      if(t.length > 40) return 'Quarante caractères au maximum.';
      return null;
    },
    libelleAction: 'Enregistrer'
  });
  if(!nom) return;

  objectifs.push({
    id: Date.now(),
    nom: String(nom).trim().slice(0, 40),
    quoi: description,
    dex: currentTab === 'home' ? 'national' : currentTab,
    shiny: !!shinyView,
    entrees: liste.map(function(e){ return e.name; }),
    cree: new Date().toISOString()
  });
  queueSave();
  dessinerObjectifs();

  prevenir({
    eyebrow: 'Objectif enregistré',
    genre: 'succes',
    titre: nom,
    resume: [{ cle: 'entrées', valeur: liste.length }],
    note: 'Il t\'attend sur l\'accueil, avec sa propre jauge. Un clic dessus '
      + 'rouvre exactement cette sélection.',
    libelleAction: 'Parfait'
  });
}

// ---- Rouvrir ----------------------------------------------------------------

/**
 * Réafficher un objectif.
 *
 * On n'essaie PAS de rejouer les filtres : ils pourraient ne plus rendre le
 * même ensemble, et l'objectif est précisément ce qui ne bouge pas. On pose
 * donc la liste figée telle quelle dans la grille.
 */
function ouvrirObjectif(o){
  // showPage remet les filtres à zéro et efface l'objectif affiché : on le
  // repose donc APRÈS, sinon il serait balayé par son propre changement de page.
  showPage(o.dex === 'national' ? 'national' : o.dex);
  vueShiny(!!o.shiny);
  resetFilters();
  objectifAffiche = o;
  majBarreObjectif();
  renderList(true);
  listEl.scrollTop = 0;
}

const objectifBarre = document.getElementById('objectifBarre');
const objectifLabel = document.getElementById('objectifLabel');
const objectifQuitter = document.getElementById('objectifQuitter');

function majBarreObjectif(){
  if(!objectifBarre) return;
  if(!objectifAffiche){ objectifBarre.style.display = 'none'; return; }
  const a = avancementObjectif(objectifAffiche);
  objectifBarre.style.display = '';
  objectifLabel.innerHTML = '🎯 <b>' + escapeHtml(objectifAffiche.nom) + '</b>'
    + ' &nbsp;·&nbsp; ' + a.pris + ' / ' + a.total
    + ' &nbsp;·&nbsp; la grille ne montre que cette sélection';
}

// L'objectif dont la grille montre le contenu, ou null. getFiltered() le lit :
// c'est le seul endroit d'où l'on peut restreindre la liste sans toucher aux
// menus, qui doivent continuer de dire la vérité sur eux-mêmes.
let objectifAffiche = null;

function quitterObjectif(){
  if(!objectifAffiche) return;
  objectifAffiche = null;
  majBarreObjectif();
  renderList(true);
}

// ---- L'accueil --------------------------------------------------------------

function carteObjectif(o){
  const a = avancementObjectif(o);
  const part = a.total ? a.pris / a.total : 0;

  const carte = document.createElement('div');
  carte.className = 'objectif-carte' + (a.pris >= a.total ? ' fini' : '');

  const ouvrir = document.createElement('button');
  ouvrir.type = 'button';
  ouvrir.className = 'objectif-ouvrir';
  ouvrir.title = 'Revoir exactement cette sélection';

  const haut = document.createElement('span');
  haut.className = 'objectif-haut';
  const nom = document.createElement('span');
  nom.className = 'objectif-nom';
  nom.textContent = (o.shiny ? '✨ ' : '') + o.nom;
  const chiffre = document.createElement('span');
  chiffre.className = 'objectif-chiffre';
  chiffre.textContent = a.pris + ' / ' + a.total;
  haut.appendChild(nom);
  haut.appendChild(chiffre);
  ouvrir.appendChild(haut);

  const barre = document.createElement('span');
  barre.className = 'objectif-barre';
  const rempli = document.createElement('i');
  rempli.style.width = Math.round(part * 100) + '%';
  barre.appendChild(rempli);
  ouvrir.appendChild(barre);

  const bas = document.createElement('span');
  bas.className = 'objectif-bas';
  bas.textContent = Math.round(part * 100) + ' %'
    + (a.pris >= a.total ? '  ·  terminé' : '  ·  il en reste ' + (a.total - a.pris))
    + '  ·  ' + (o.quoi || '');
  ouvrir.appendChild(bas);

  ouvrir.addEventListener('click', function(){ ouvrirObjectif(o); });
  carte.appendChild(ouvrir);

  const oter = document.createElement('button');
  oter.type = 'button';
  oter.className = 'objectif-oter';
  oter.textContent = '✕';
  oter.title = 'Retirer cet objectif';
  oter.setAttribute('aria-label', 'Retirer l\'objectif ' + o.nom);
  oter.addEventListener('click', async function(){
    const ok = await demanderConfirmation({
      eyebrow: 'Objectif',
      titre: 'Retirer « ' + o.nom + ' » ?',
      danger: true,
      resume: [{ cle: 'avancement', valeur: a.pris + ' / ' + a.total }],
      note: 'Seul l\'objectif disparaît. Rien n\'est décoché : les Pokémon '
        + 'restent dans ton Pokédex.',
      libelleAction: 'Retirer'
    });
    if(!ok) return;
    objectifs = objectifs.filter(function(x){ return x !== o; });
    if(objectifAffiche === o) quitterObjectif();
    queueSave();
    dessinerObjectifs();
  });
  carte.appendChild(oter);

  return carte;
}

function dessinerObjectifs(){
  if(!objectifsBloc) return;
  const vide = !objectifs.length;
  objectifsBloc.hidden = vide;
  if(objectifsTitre) objectifsTitre.hidden = vide;
  if(vide){ objectifsBloc.innerHTML = ''; return; }
  objectifsBloc.innerHTML = '';
  objectifs.forEach(function(o){ objectifsBloc.appendChild(carteObjectif(o)); });
}

if(objectifBtn) objectifBtn.addEventListener('click', enregistrerObjectif);
if(objectifQuitter) objectifQuitter.addEventListener('click', quitterObjectif);
