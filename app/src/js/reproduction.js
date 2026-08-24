// La reproduction : groupes d'œufs et recherche de co-parent.
// Script classique (pas de module ES), chargé APRÈS fiche.js — d'où viennent
// ficheEmbarquee, motDico et puceType.
//
// Deux questions, un seul écran :
//
//   · « avec qui puis-je faire pondre celui-là ? » — c'est la question qu'on se
//     pose vraiment, et elle n'a pas de réponse dans le jeu : il faut connaître
//     les groupes des deux par cœur ;
//   · « qui est dans le groupe Amorphe ? » — l'inverse, pour explorer.
//
// Les groupes viennent de la réserve embarquée (dico.oeufs), regénérée depuis
// pokemon_egg_groups.csv. Ils sont attachés à l'espèce et non à la forme : un
// Raichu d'Alola pond comme un Raichu.

// Deux groupes ne se comportent pas comme les autres, et c'est toute la règle.
const GROUPE_METAMORPH = 13;   // se reproduit avec presque tout
const GROUPE_INCONNU = 15;     // ne se reproduit avec rien

const REPRO_LOT = 60;          // on dessine par paquets : Terrestre en compte 369

function oeufsDe(entry){
  const f = ficheEmbarquee(entry);
  return (f && f.oeufs) ? f.oeufs : [];
}

function nomGroupe(id){
  return motDico('oeufs', id) || ('groupe ' + id);
}

function genreDe(entry){
  const f = ficheEmbarquee(entry);
  return lireGenre(f ? f.genre : -1);
}

function estMetamorph(entry){
  return oeufsDe(entry).indexOf(GROUPE_METAMORPH) !== -1;
}

/**
 * Les sexes s'accordent-ils.
 *
 * Il faut un mâle et une femelle. Deux espèces à sexe unique et identique ne
 * pondront donc jamais ensemble, quels que soient leurs groupes — c'est le cas
 * de deux Leveinard, tous deux femelles. Un asexué ne se reproduit qu'avec
 * Métamorph, et Métamorph passe outre.
 */
function genresCompatibles(a, b){
  if(estMetamorph(a) || estMetamorph(b)) return true;
  const ga = genreDe(a), gb = genreDe(b);
  if(ga.asexue || gb.asexue) return false;
  if(ga.male === 100 && gb.male === 100) return false;
  if(ga.femelle === 100 && gb.femelle === 100) return false;
  return true;
}

/**
 * Deux Pokémon peuvent-ils pondre ensemble.
 *
 * La règle tient en trois lignes : le groupe Inconnu ne se reproduit jamais,
 * Métamorph se reproduit avec tout le reste, et sinon il faut un groupe en
 * commun. Le sexe entre aussi en jeu dans le jeu, mais la réserve ne porte
 * aucun taux de genre — l'interface le dit plutôt que de faire semblant.
 */
function peutPondreAvec(a, b){
  const ga = oeufsDe(a), gb = oeufsDe(b);
  if(!ga.length || !gb.length) return false;
  if(ga.indexOf(GROUPE_INCONNU) !== -1 || gb.indexOf(GROUPE_INCONNU) !== -1) return false;
  if(ga.indexOf(GROUPE_METAMORPH) !== -1 || gb.indexOf(GROUPE_METAMORPH) !== -1) return true;
  if(!ga.some(function(g){ return gb.indexOf(g) !== -1; })) return false;
  return genresCompatibles(a, b);
}

// Une entrée par espèce : les formes régionales partagent les groupes de leur
// espèce, et les lister toutes tripleraient la liste sans rien apprendre.
function especesDeBase(){
  return allEntries.filter(function(e){ return e.id === e.speciesId; });
}

// ---- Les sous-onglets --------------------------------------------------------

const reproOnglets = document.getElementById('reproOnglets');
const reproSections = {
  parent:  document.getElementById('repro-parent'),
  groupes: document.getElementById('repro-groupes')
};
let reproOutil = 'parent';

function montrerOutilRepro(nom){
  if(!reproSections[nom]) return;
  reproOutil = nom;
  Object.keys(reproSections).forEach(function(cle){
    reproSections[cle].classList.toggle('active', cle === nom);
  });
  reproOnglets.querySelectorAll('.strat-onglet').forEach(function(b){
    const on = b.dataset.outil === nom;
    b.classList.toggle('active', on);
    b.setAttribute('aria-selected', String(on));
  });
  if(nom === 'groupes') dessinerGroupes();
}

if(reproOnglets){
  reproOnglets.addEventListener('click', function(e){
    const b = e.target.closest('.strat-onglet');
    if(b) montrerOutilRepro(b.dataset.outil);
  });
}

function dessinerReproduction(){
  if(reproOutil === 'groupes') dessinerGroupes();
  else dessinerCoParents();
}

// Appelé depuis une fiche : on arrive sur la page avec le parent déjà posé.
function ouvrirCoParent(entry){
  reproParent = entry;
  reproNomEl.value = nomAffiche(entry);
  reproFiltreEl.value = '';
  montrerOutilRepro('parent');
  dessinerCoParents();
}

// ---- Outil 1 : le co-parent --------------------------------------------------

const reproNomEl = document.getElementById('reproNom');
const reproSugEl = document.getElementById('reproSug');
const reproChoisiEl = document.getElementById('reproChoisi');
const reproFiltreEl = document.getElementById('reproFiltre');
const reproPossedesEl = document.getElementById('reproPossedes');
const reproSexeEl = document.getElementById('reproSexe');
const reproListeEl = document.getElementById('reproListe');
const reproPlusEl = document.getElementById('reproPlus');

let reproParent = null;
let reproTrouves = [];
let reproDessines = 0;

creerSelecteur(reproNomEl, reproSugEl, async function(e){
  await loadTypes();
  reproParent = e;
  dessinerCoParents();
});

if(reproSexeEl) reproSexeEl.addEventListener('change', dessinerCoParents);

[reproFiltreEl, reproPossedesEl].filter(Boolean).forEach(function(el){
  const ev = el.tagName === 'INPUT' && el.type === 'search' ? 'input' : 'click';
  el.addEventListener(ev, function(){
    if(ev === 'click'){
      const on = el.getAttribute('aria-pressed') !== 'true';
      el.setAttribute('aria-pressed', String(on));
      el.classList.toggle('on', on);
    }
    dessinerCoParents();
  });
});

if(reproPlusEl) reproPlusEl.addEventListener('click', function(){ peindreLot(); });

function dessinerCoParents(){
  if(!reproListeEl) return;

  if(!reproParent){
    reproChoisiEl.innerHTML = '';
    reproChoisiEl.style.display = 'none';
    reproListeEl.innerHTML = '<div class="state-msg">Choisis un Pokémon pour voir '
      + 'qui peut pondre avec lui.</div>';
    reproPlusEl.style.display = 'none';
    return;
  }

  const groupes = oeufsDe(reproParent);
  dessinerParentChoisi(groupes);

  if(!groupes.length){
    reproListeEl.innerHTML = '<div class="state-msg">Aucun groupe d\'œuf répertorié '
      + 'pour cette forme.</div>';
    reproPlusEl.style.display = 'none';
    return;
  }
  if(groupes.indexOf(GROUPE_INCONNU) !== -1){
    reproListeEl.innerHTML = '<div class="state-msg">' + nomAffiche(reproParent)
      + ' appartient au groupe Inconnu : il ne se reproduit avec personne. '
      + 'C\'est le cas des légendaires, des fabuleux et des bébés.</div>';
    reproPlusEl.style.display = 'none';
    return;
  }

  const q = (reproFiltreEl.value || '').trim().toLowerCase();
  const seulementPossedes = reproPossedesEl.getAttribute('aria-pressed') === 'true';
  const sexe = reproSexeEl ? reproSexeEl.value : 'all';
  const home = (typeof bucketFor === 'function') ? bucketFor('national') : null;

  reproTrouves = especesDeBase().filter(function(e){
    if(e.speciesId === reproParent.speciesId) return false;
    if(!peutPondreAvec(reproParent, e)) return false;
    if(q && nomAffiche(e).toLowerCase().indexOf(q) === -1) return false;
    if(seulementPossedes && home && !home.caught.has(e.name)) return false;
    // Le sexe du tien décide de celui qu'il faut en face. Métamorph reste
    // proposé quel que soit le filtre : il s'accommode des deux.
    if(sexe !== 'all' && !estMetamorph(e)){
      const g = genreDe(e);
      if(g.asexue) return false;
      if(sexe === 'male' && g.male === 100) return false;      // il faut une femelle
      if(sexe === 'femelle' && g.femelle === 100) return false; // il faut un mâle
    }
    return true;
  });

  reproDessines = 0;
  reproListeEl.innerHTML = '';
  if(!reproTrouves.length){
    reproListeEl.innerHTML = '<div class="state-msg">Aucun partenaire ne correspond.</div>';
    reproPlusEl.style.display = 'none';
    return;
  }
  peindreLot();
}

function dessinerParentChoisi(groupes){
  reproChoisiEl.style.display = '';
  reproChoisiEl.innerHTML = '';

  const img = document.createElement('img');
  img.src = pokeosHomeUrl(reproParent.id, false);
  img.alt = '';
  reproChoisiEl.appendChild(img);

  const bloc = document.createElement('div');
  const nom = document.createElement('div');
  nom.className = 'repro-choisi-nom';
  nom.textContent = nomAffiche(reproParent);
  bloc.appendChild(nom);

  const puces = document.createElement('div');
  puces.className = 'repro-groupes-puces';
  if(!groupes.length){
    const rien = document.createElement('span');
    rien.className = 'repro-puce vide';
    rien.textContent = 'aucun groupe';
    puces.appendChild(rien);
  }
  groupes.forEach(function(g){
    const p = document.createElement('span');
    p.className = 'repro-puce g' + g;
    p.textContent = nomGroupe(g);
    puces.appendChild(p);
  });
  bloc.appendChild(puces);

  const g = genreDe(reproParent);
  const sexe = document.createElement('div');
  sexe.className = 'repro-choisi-genre';
  sexe.textContent = g.asexue
    ? 'Asexué — ne pond qu\'avec Métamorph'
    : 'Taux de genre : ' + g.texte;
  bloc.appendChild(sexe);

  reproChoisiEl.appendChild(bloc);
}

function peindreLot(){
  const home = (typeof bucketFor === 'function') ? bucketFor('national') : null;
  const suite = reproTrouves.slice(reproDessines, reproDessines + REPRO_LOT);
  const frag = document.createDocumentFragment();

  suite.forEach(function(e){
    const carte = document.createElement('button');
    carte.type = 'button';
    const eu = home && home.caught.has(e.name);
    carte.className = 'repro-carte' + (eu ? ' possede' : '');
    carte.title = 'Ouvrir la fiche de ' + nomAffiche(e);

    const img = document.createElement('img');
    img.src = pokeosHomeUrl(e.id, false);
    img.alt = '';
    img.loading = 'lazy';
    carte.appendChild(img);

    const infos = document.createElement('span');
    const nom = document.createElement('span');
    nom.className = 'repro-carte-nom';
    nom.textContent = nomAffiche(e);
    infos.appendChild(nom);

    const communs = document.createElement('span');
    communs.className = 'repro-carte-groupes';
    const partages = oeufsDe(e).filter(function(g){
      return oeufsDe(reproParent).indexOf(g) !== -1;
    });
    // Métamorph n'a aucun groupe en commun avec qui que ce soit : c'est lui la
    // règle, pas l'exception qu'on aurait oubliée.
    const g = genreDe(e);
    communs.textContent = (partages.length
      ? partages.map(nomGroupe).join(' · ')
      : 'Métamorph : compatible avec tous')
      + (estMetamorph(e) ? '' : '  ·  ' + (g.asexue ? 'asexué' : g.texte));
    infos.appendChild(communs);
    carte.appendChild(infos);

    carte.addEventListener('click', function(){ openPreview(e, null); });
    frag.appendChild(carte);
  });

  reproListeEl.appendChild(frag);
  reproDessines += suite.length;
  reproPlusEl.style.display = reproDessines < reproTrouves.length ? 'block' : 'none';
  reproPlusEl.textContent = 'Afficher plus (' + (reproTrouves.length - reproDessines) + ' restants)';

  const compte = document.getElementById('reproCompte');
  if(compte) compte.textContent = reproTrouves.length + ' partenaire'
    + (reproTrouves.length > 1 ? 's' : '') + ' compatible'
    + (reproTrouves.length > 1 ? 's' : '');
}

// ---- Outil 2 : les groupes d'œufs --------------------------------------------

const reproGroupesEl = document.getElementById('reproGroupes');
let groupesDessines = false;

function dessinerGroupes(){
  if(!reproGroupesEl || groupesDessines) return;

  const parGroupe = new Map();
  especesDeBase().forEach(function(e){
    oeufsDe(e).forEach(function(g){
      if(!parGroupe.has(g)) parGroupe.set(g, []);
      parGroupe.get(g).push(e);
    });
  });

  reproGroupesEl.innerHTML = '';
  Array.from(parGroupe.keys()).sort(function(a, b){ return a - b; }).forEach(function(g){
    const membres = parGroupe.get(g);
    const bloc = document.createElement('details');
    bloc.className = 'repro-groupe';

    const resume = document.createElement('summary');
    const titre = document.createElement('span');
    titre.className = 'repro-puce g' + g;
    titre.textContent = nomGroupe(g);
    resume.appendChild(titre);
    const compte = document.createElement('span');
    compte.className = 'repro-groupe-compte';
    compte.textContent = membres.length + ' espèces';
    resume.appendChild(compte);
    if(g === GROUPE_INCONNU){
      const note = document.createElement('em');
      note.textContent = 'ne se reproduit avec personne';
      resume.appendChild(note);
    }
    if(g === GROUPE_METAMORPH){
      const note = document.createElement('em');
      note.textContent = 'compatible avec tous les autres groupes';
      resume.appendChild(note);
    }
    bloc.appendChild(resume);

    // Le contenu ne se construit qu'à l'ouverture : quinze groupes dépliés
    // d'un coup, c'est 1620 vignettes à dessiner pour rien.
    let rempli = false;
    bloc.addEventListener('toggle', function(){
      if(!bloc.open || rempli) return;
      rempli = true;
      const liste = document.createElement('div');
      liste.className = 'repro-groupe-membres';
      membres.forEach(function(e){
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'repro-membre';
        b.title = nomAffiche(e);
        const img = document.createElement('img');
        img.src = pokeosHomeUrl(e.id, false);
        img.alt = nomAffiche(e);
        img.loading = 'lazy';
        b.appendChild(img);
        b.addEventListener('click', function(){ openPreview(e, null); });
        liste.appendChild(b);
      });
      bloc.appendChild(liste);
    });

    reproGroupesEl.appendChild(bloc);
  });
  groupesDessines = true;
}
