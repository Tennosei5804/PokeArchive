// Comparaison de deux Pokedex.
// Script classique (pas de module ES) : l'app reste ouvrable en file://
//
// Il n'y a plus de code a recopier : depuis que les dresseurs partagent une
// base, le dex de l'autre arrive tel quel par l'API (compte.js le demande a
// Rust, qui appelle GET /api/dex/:pseudo). Ce fichier ne fait que le mettre en
// regard du notre — un temoin par carte, deux filtres de plus, et une barre
// qui resume qui possede quoi.
//
// amiProgression est non nul pendant toute la comparaison : c'est a lui que le
// reste de l'application reconnait qu'il y a deux collections a l'ecran.
let amiProgression = null;   // { joueur, dex, mode, caught:Set, shiny:Set }

function amiPossede(entry){
  if(!amiProgression) return null;
  return shinyView ? amiProgression.shiny.has(entry.name)
                   : amiProgression.caught.has(entry.name);
}

// Le témoin porté par une carte : qui, de vous deux, possède ce Pokémon.
// Appelé à la construction de la carte, puis à chaque fois qu'on coche —
// sans quoi une case fraîchement cochée garderait son « Lui seul ».
function peindreTemoinComparaison(el, entry, moi){
  const chezAmi = amiPossede(entry);
  if(chezAmi === null) return;
  el.className = 'card-compare '
    + (moi && chezAmi ? 'deux' : (chezAmi ? 'lui' : (moi ? 'moi' : 'aucun')));
  el.textContent = moi && chezAmi ? 'Vous deux'
    : (chezAmi ? 'Lui seul' : (moi ? 'Toi seul' : 'Personne'));
  el.title = amiProgression.joueur + (chezAmi ? ' le possède' : ' ne l\'a pas');
}

function quitterComparaison(){
  amiProgression = null;
  compareBar.style.display = 'none';
  [...filterEl.options].forEach(function(o){
    if(o.value === 'ami-oui-moi-non' || o.value === 'moi-oui-ami-non') o.remove();
  });
  if(filterEl.value !== 'all'){ filterEl.value = 'all'; }
  markActiveFilters();
  renderList(true);
}

// Sans cet écouteur, on entrait en comparaison sans pouvoir en sortir : le
// bouton « Quitter » de la barre existait, mais ne déclenchait rien.
compareQuitBtn.addEventListener('click', quitterComparaison);

function majBarreComparaison(){
  if(!amiProgression){ compareBar.style.display = 'none'; return; }
  const moi = activeSet();
  let lui = 0, moiSeul = 0, luiSeul = 0, communs = 0;
  const sienne = shinyView ? amiProgression.shiny : amiProgression.caught;
  scopeEntries.forEach(function(e){
    const a = moi.has(e.name), b = sienne.has(e.name);
    if(b) lui++;
    if(a && !b) moiSeul++;
    if(b && !a) luiSeul++;
    if(a && b) communs++;
  });
  compareBar.style.display = '';
  compareLabel.innerHTML =
    '<b>' + escapeHtml(amiProgression.joueur) + '</b> : ' + lui + ' / ' + scopeEntries.length
    + ' &nbsp;·&nbsp; il a <b>' + luiSeul + '</b> que tu n\'as pas'
    + ' &nbsp;·&nbsp; tu as <b>' + moiSeul + '</b> qu\'il n\'a pas'
    + ' &nbsp;·&nbsp; <b>' + communs + '</b> en commun';

  // Deux dex qui ne comptent pas la même chose ne se comparent pas : un Living
  // Dex demande un Pokémon par espèce, un Pokédex ordinaire se contente d'une
  // évolution. Le dire ici évite de conclure trop vite d'un écart de chiffres.
  const mien = (typeof profilCourant !== 'undefined' && profilCourant)
    ? (profilCourant.mode || 'capture') : null;
  const sien = amiProgression.mode;
  if(mien && sien && mien !== sien && typeof MODES_DEX !== 'undefined'){
    const avert = document.createElement('span');
    avert.className = 'compare-avertissement';
    avert.textContent = 'Vos deux dex ne comptent pas la même chose : '
      + MODES_DEX[sien].court + ' contre ' + MODES_DEX[mien].court + '.';
    avert.title = MODES_DEX[sien].aide + '  /  ' + MODES_DEX[mien].aide;
    compareLabel.appendChild(avert);
  }

  // Le total ci-dessus se calcule sur TON périmètre. Si l'autre suit un niveau
  // de formes différent, son score paraît bas sans que rien ne l'explique : il
  // ne coche pas les mêmes cases que toi.
  const sienNiveau = amiProgression.niveau;
  if(sienNiveau && typeof niveauFormes !== 'undefined' && sienNiveau !== niveauFormes){
    const nom = function(n){
      const o = niveauFormesEl && niveauFormesEl.options[n - 1];
      const brut = o ? (o.dataset.libelle || o.textContent) : ('niveau ' + n);
      return brut.replace(/^\s*\S*\s*/, '').replace(/\s*:.*$/, '').trim() || ('niveau ' + n);
    };
    const avert = document.createElement('span');
    avert.className = 'compare-avertissement';
    avert.textContent = 'Vous ne comptez pas les mêmes formes : il est sur « '
      + nom(sienNiveau) + ' », toi sur « ' + nom(niveauFormes) + ' ».';
    avert.title = 'Le total affiché suit ton niveau. Mettez-vous au même pour '
      + 'que les deux chiffres se comparent.';
    compareLabel.appendChild(avert);
  }
}

// --- Modales ---------------------------------------------------------------
function demarrerComparaison(nomAmi, dexDistant, modeAmi, niveauAmi){
  const caught = new Set(dexDistant.captures || dexDistant.caught || []);
  const shiny = new Set(dexDistant.shiny || []);
  const parJeu = dexDistant.dex || {};
  Object.keys(parJeu).forEach(function(cle){
    (parJeu[cle].caught || []).forEach(function(n){ caught.add(n); });
    (parJeu[cle].shiny || []).forEach(function(n){ shiny.add(n); });
  });

  amiProgression = { joueur: nomAmi, dex: 'national', mode: modeAmi || null,
                     niveau: niveauAmi || null, caught: caught, shiny: shiny };

  if(!filterEl.querySelector('option[value="ami-oui-moi-non"]')){
    [['ami-oui-moi-non', 'Il l\'a, pas moi'], ['moi-oui-ami-non', 'Je l\'ai, pas lui']]
      .forEach(function(p){
        const o = document.createElement('option');
        o.value = p[0]; o.textContent = p[1];
        filterEl.appendChild(o);
      });
  }
  majBarreComparaison();
  renderList(true);
}
