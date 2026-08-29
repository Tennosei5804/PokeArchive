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
  const retour = amiProgression && amiProgression.retour;
  amiProgression = null;
  compareBar.style.display = 'none';
  [...filterEl.options].forEach(function(o){
    if(o.value === 'ami-oui-moi-non' || o.value === 'moi-oui-ami-non') o.remove();
  });
  if(filterEl.value !== 'all'){ filterEl.value = 'all'; }
  markActiveFilters();
  // On repeint AVANT de partir : sans cela le Pokédex garderait ses témoins de
  // comparaison, et l'on retomberait dessus plus tard sans comprendre d'où ils
  // sortent.
  renderList(true);
  if(retour) retour();
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
/**
 * Ouvre une comparaison.
 *
 * `pseudoAmi` n'est PAS `nomAmi`. Le second est une étiquette d'affichage
 * — « Tenno · Aventure 1 » — et le premier le pseudo seul, le seul que l'API
 * sache résoudre en dresseur. Il vaut null quand la comparaison vient d'un code
 * de partage : on connaît alors une collection, pas quelqu'un, et il n'y a
 * personne à qui proposer un échange.
 *
 * `retour` dit OÙ REVENIR en quittant. Comparer fait basculer sur un Pokédex,
 * et en sortir laissait devant ce Pokédex — celui de personne en particulier,
 * puisque la comparaison venait de s'éteindre. On se retrouvait quelque part
 * sans savoir comment y était arrivé, et il fallait retraverser deux écrans
 * pour revenir chez le dresseur qu'on regardait.
 *
 * Une fonction plutôt qu'un nom de page : revenir chez quelqu'un demande
 * d'ouvrir sa fiche, pas seulement l'onglet qui la contient.
 */
function demarrerComparaison(nomAmi, dexDistant, modeAmi, niveauAmi, pseudoAmi, retour){
  const caught = new Set(dexDistant.captures || dexDistant.caught || []);
  const shiny = new Set(dexDistant.shiny || []);
  const parJeu = dexDistant.dex || {};
  Object.keys(parJeu).forEach(function(cle){
    (parJeu[cle].caught || []).forEach(function(n){ caught.add(n); });
    (parJeu[cle].shiny || []).forEach(function(n){ shiny.add(n); });
  });

  amiProgression = { joueur: nomAmi, pseudo: pseudoAmi || null, dex: 'national',
                     mode: modeAmi || null, niveau: niveauAmi || null,
                     caught: caught, shiny: shiny,
                     retour: (typeof retour === 'function') ? retour : null };

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

// ---- L'entraide --------------------------------------------------------------
//
// La barre de comparaison disait depuis toujours « il a 47 que tu n'as pas ».
// C'est un score, pas une action : personne n'a jamais échangé un chiffre.
//
// Pokédex Tracker met exactement cette promesse sur sa page d'accueil — « see
// how you can help each other out » — et PokéArchive en était à une
// soustraction : les deux collections sont déjà en mémoire, l'une dans
// activeSet(), l'autre dans amiProgression. Il ne manquait que la liste.
//
// LA LISTE EST NOMMÉE, ET CLIQUABLE. Un nom seul ne dit pas où le trouver ni
// s'il est échangeable ; ouvrir sa fiche répond aux deux, et la fiche existe.
//
// LE PÉRIMÈTRE EST CELUI DE L'ÉCRAN. Sur le Pokédex d'Écarlate, l'entraide ne
// parle que d'Écarlate — c'est là qu'un échange a lieu. Sur HOME, elle parle
// de tout. C'est scopeEntries qui décide, comme partout ailleurs.

const echangeOverlay = document.getElementById('echangeOverlay');
const echangeBtn = document.getElementById('echangeBtn');
const echangeFermer = document.getElementById('echangeFermer');
const echangeNote = document.getElementById('echangeNote');
const echangeLui = document.getElementById('echangeLui');
const echangeMoi = document.getElementById('echangeMoi');
const echangeTitreLui = document.getElementById('echangeTitreLui');
const echangeTitreMoi = document.getElementById('echangeTitreMoi');
const echangeEyebrow = document.getElementById('echangeEyebrow');

// Au-delà, la fenêtre devient un annuaire qu'on ne lit pas. La ligne du bas
// dit combien restent, ce qui est plus honnête qu'une liste tronquée en
// silence.
const ECHANGE_MAX = 60;

function ligneEchange(entry, cote){
  const l = document.createElement('button');
  l.type = 'button';
  l.className = 'echange-ligne';
  // Deux usages pour la meme ligne, et c'est le contexte qui tranche. Face a
  // un vrai dresseur, ce panneau sert a PROPOSER : le clic choisit. Face a un
  // code de partage il n'y a personne a qui proposer, et le clic garde son
  // ancien role, ouvrir la fiche.
  const pourTroc = typeof trocChoisir === 'function'
                   && amiProgression && amiProgression.pseudo;
  l.title = pourTroc
    ? 'Choisir ' + nomAffiche(entry) + ' pour l\'echange'
    : 'Ouvrir la fiche de ' + nomAffiche(entry);

  const cadre = document.createElement('span');
  cadre.className = 'echange-sprite';
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.alt = '';
  img.src = pokeosHomeUrl(entry.id, shinyView);
  img.addEventListener('error', function(){
    img.src = officialArtworkUrl(entry.id, shinyView);
  });
  cadre.appendChild(img);
  l.appendChild(cadre);

  const nom = document.createElement('span');
  nom.className = 'echange-nom';
  nom.textContent = nomAffiche(entry);
  l.appendChild(nom);

  const no = document.createElement('span');
  no.className = 'echange-no';
  no.textContent = '#' + String(entry.speciesId || entry.id).padStart(4, '0');
  l.appendChild(no);

  l.addEventListener('click', function(){
    if(pourTroc){ trocChoisir(cote, entry, l); return; }
    fermerEchanges();
    openPreview(entry, null);
  });
  return l;
}

function remplirColonne(cible, liste, cote){
  cible.innerHTML = '';
  if(!liste.length){
    cible.innerHTML = '<div class="state-msg">Rien de ce côté-là.</div>';
    return;
  }
  liste.slice(0, ECHANGE_MAX).forEach(function(e){ cible.appendChild(ligneEchange(e, cote)); });
  if(liste.length > ECHANGE_MAX){
    const reste = document.createElement('p');
    reste.className = 'echange-reste';
    reste.textContent = 'et ' + (liste.length - ECHANGE_MAX) + ' de plus.';
    cible.appendChild(reste);
  }
}

function ouvrirEchanges(){
  if(!echangeOverlay || !amiProgression) return;
  const moi = activeSet();
  const sienne = shinyView ? amiProgression.shiny : amiProgression.caught;

  const lui = [], mien = [];
  scopeEntries.forEach(function(e){
    const a = moi.has(e.name), b = sienne.has(e.name);
    if(b && !a) lui.push(e);
    if(a && !b) mien.push(e);
  });

  const forme = shinyView ? 'chromatique' : 'normale';
  echangeEyebrow.textContent = 'Entraide  ·  forme ' + forme;
  echangeTitreLui.textContent = amiProgression.joueur + ' peut te donner  ·  ' + lui.length;
  echangeTitreMoi.textContent = 'Tu peux lui donner  ·  ' + mien.length;
  echangeNote.textContent = 'Sur ' + currentDexLabel() + '. '
    + 'Ces listes disent qui possède quoi, pas ce qui est échangeable : un '
    + 'Pokémon offert par le scénario ne se donne qu\'en double. '
    + (typeof trocChoisir === 'function' && amiProgression.pseudo
        ? 'Clique un nom dans chaque colonne pour composer une proposition.'
        : 'Clique un nom pour ouvrir sa fiche.');

  remplirColonne(echangeLui, lui, 'veux');
  remplirColonne(echangeMoi, mien, 'donne');

  // La barre de proposition se remet a zero a chaque ouverture : garder le
  // choix d'une comparaison precedente ferait proposer le mauvais Pokemon a la
  // mauvaise personne.
  if(typeof trocPreparer === 'function') trocPreparer();

  echangeOverlay.style.display = 'flex';
  setTimeout(function(){ echangeFermer.focus(); }, 10);
}

function fermerEchanges(){
  if(echangeOverlay) echangeOverlay.style.display = 'none';
}

if(echangeBtn) echangeBtn.addEventListener('click', ouvrirEchanges);
if(echangeFermer) echangeFermer.addEventListener('click', fermerEchanges);
if(echangeOverlay){
  echangeOverlay.addEventListener('click', function(e){
    if(e.target === echangeOverlay) fermerEchanges();
  });
}
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && echangeOverlay
     && echangeOverlay.style.display === 'flex') fermerEchanges();
});
