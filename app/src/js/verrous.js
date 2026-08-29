// Le catalogue des verrous chromatiques : ce qui ne peut pas briller, et où.
//
// Script classique, chargé APRÈS chasse.js — il lui emprunte ouvrirChasseModal
// pour le bouton « chasser sur… », et noyau.js pour nomAffiche.
//
// LA QUESTION QU'IL RÉPOND. « Est-ce que je peux chasser celui-là ici ? » Elle se
// pose avant de lancer une chasse, et l'application connaissait déjà la moitié
// de la réponse sans jamais la donner : SHINY_LOCKED servait au Pokédex, et
// chasse.js ne la consultait pas — zéro occurrence. On pouvait lancer une chasse
// sur Victini, voir le compteur monter à trois mille, et n'obtenir jamais rien.
//
// UN CATALOGUE, PAS UN GARDE-FOU. Il ne bloque rien : il se consulte. Barrer la
// création d'une chasse supposerait que les tables sont complètes, et elles ne le
// sont pas — le relevé vient de dataminers, pas de l'éditeur.
//
// CINQ SOURCES, CINQ AFFIRMATIONS DIFFÉRENTES (voir donnees.js) :
//
//   · SANS_CHROMATIQUES (chasse.js) — le jeu n'a aucun chromatique. Rouge, Bleu
//     et Jaune : la forme apparaît en Or et Argent.
//   · SHINY_LOCKED — l'espèce n'en a nulle part, dans aucun jeu.
//   · TAUX_PLEIN_SEUL — elle en a, mais jamais au taux amélioré.
//   · VERROUS_PAR_JEU — CETTE RENCONTRE-CI est verrouillée, les autres non.
//   · REGLES_VERROU — une catégorie entière l'est, sur ce jeu, et on ne peut
//     l'énumérer : elle s'affiche alors en toutes lettres.
//   · CADEAUX_SHASSABLES — l'exception à la règle des cadeaux mystères, qui va
//     dans l'autre sens : ce qui A PU être chromatique.

// Combien de jeux on nomme avant d'abréger.
const VERROU_JEUX_CITES = 3;

// ---- Ce que l'on sait d'une espèce ------------------------------------------

/**
 * La fiche d'une espèce, ou null si rien ne la concerne.
 *
 * `genre` porte toute la nuance, et il vaut mieux le lire que le deviner :
 * « partout » interdit, « taux » ralentit, « rencontre » ne vise qu'une porte
 * parmi d'autres.
 */
function verrouDe(entry){
  const id = entry.speciesId;

  if(SHINY_LOCKED.has(id)){
    return { entry: entry, genre: 'partout', fermes: [], ouverts: [], quoi: null };
  }
  if(TAUX_PLEIN_SEUL.has(id)){
    return { entry: entry, genre: 'taux', fermes: [], ouverts: jeuxOuverts(id), quoi: null };
  }

  const precis = VERROUS_PAR_JEU.filter(function(v){ return v.espece === id; });
  if(!precis.length) return null;

  const cles = new Set();
  precis.forEach(function(v){ v.jeux.forEach(function(c){ cles.add(c); }); });
  return {
    entry: entry,
    genre: 'rencontre',
    fermes: GAMES.filter(function(g){ return cles.has(g.key); }),
    ouverts: jeuxOuverts(id),
    quoi: precis.map(function(v){ return v.quoi; }).join(' · '),
  };
}

/**
 * Les jeux où l'espèce est chassable.
 *
 * UN VERROU DE RENCONTRE NE FERME PAS LE JEU, et c'est la correction qui a
 * demandé le plus de travail. Le Roucool scripté de la Route 2 est verrouillé
 * sur X et Y ; les Roucool sauvages du même jeu ne le sont pas. Traiter la
 * rencontre comme le jeu barrait vingt-neuf destinations parfaitement valides.
 *
 * Seule la première génération ferme vraiment, le chromatique n'y existant pas.
 */
function jeuxOuverts(speciesId){
  return GAMES.filter(function(g){
    return SANS_CHROMATIQUES.indexOf(g.key) === -1
        && verrouEspecePresente(speciesId, g.key);
  });
}

/**
 * L'espèce figure-t-elle au Pokédex de ce jeu ?
 *
 * Le relevé des lieux fait foi quand il existe ; ailleurs on s'abstient plutôt
 * que de supposer. Un « chassable ici » inventé est pire qu'un silence.
 */
function verrouEspecePresente(speciesId, cleJeu){
  if(typeof DONNEES_LIEUX === 'undefined') return false;
  const table = DONNEES_LIEUX.jeux[cleJeu];
  if(!table) return false;
  return table[speciesId] !== undefined;
}

/** Toutes les espèces concernées, dans l'ordre national. */
function verrousTous(){
  const vus = new Map();
  poolEntries().forEach(function(e){
    if(vus.has(e.speciesId)) return;
    const v = verrouDe(e);
    if(v) vus.set(e.speciesId, v);
  });
  return Array.from(vus.values()).sort(function(a, b){
    return a.entry.speciesId - b.entry.speciesId;
  });
}

/**
 * Les cadeaux mystères chassables, filtrés.
 *
 * SEULEMENT SUR DEMANDE, et c'est délibéré : cent cinquante-quatre distributions
 * ajoutées à la vue par défaut noieraient les soixante-dix-neuf verrous, qui sont
 * la raison d'être de l'écran. Un jeu choisi ou un nom tapé, c'est le moment où
 * la question se pose — avant, c'est du bruit.
 */
function cadeauxPour(cleJeu, q){
  if(cleJeu === 'tous' && !q) return [];
  const vus = new Map();
  CADEAUX_SHASSABLES.forEach(function(groupe){
    if(cleJeu !== 'tous' && groupe.jeux.indexOf(cleJeu) === -1) return;
    groupe.especes.forEach(function(id){
      if(vus.has(id)) return;
      const e = poolEntries().find(function(x){ return x.speciesId === id; });
      if(!e) return;
      if(q){
        const nom = nomAffiche(e).toLowerCase();
        if(nom.indexOf(q) === -1 && String(id).indexOf(q) === -1) return;
      }
      vus.set(id, { entry: e, genre: 'cadeau', fermes: [], ouverts: jeuxOuverts(id),
                    quoi: groupe.quoi });
    });
  });
  return Array.from(vus.values()).sort(function(a, b){
    return a.entry.speciesId - b.entry.speciesId;
  });
}

/** Les règles qui ne se comptent pas, pour un jeu donné. */
function reglesPour(cleJeu){
  if(cleJeu === 'tous') return [];
  return REGLES_VERROU.filter(function(r){ return r.jeux.indexOf(cleJeu) !== -1; });
}

// ---- L'écran ----------------------------------------------------------------

async function ouvrirVerrous(){
  if(!verrousOverlay) return;
  verrousListe.innerHTML = '<div class="state-msg">Lecture du relevé…</div>';
  verrousOverlay.style.display = 'flex';
  setTimeout(function(){ verrousFermer.focus(); }, 10);

  // Le relevé des lieux dit où chaque espèce apparaît : sans lui on ne peut pas
  // nommer les jeux ouverts, seulement les fermés.
  if(typeof DONNEES_LIEUX === 'undefined' && typeof chargerLieux === 'function'){
    try{ await chargerLieux(); }catch(e){ /* on dira ce qu'on peut */ }
  }

  remplirVerrouJeux();
  dessinerVerrous();
}

/** Le sélecteur de jeux, bâti sur GAMES : aucune liste à tenir en double. */
function remplirVerrouJeux(){
  if(!verrouJeu || verrouJeu.dataset.pret) return;
  GAMES.forEach(function(g){
    const o = document.createElement('option');
    o.value = g.key;
    o.textContent = g.tab;
    verrouJeu.appendChild(o);
  });
  verrouJeu.dataset.pret = '1';
}

function dessinerVerrous(){
  if(!verrousListe) return;

  const q = ((verrouQ && verrouQ.value) || '').trim().toLowerCase();
  const jeu = (verrouJeu && verrouJeu.value) || 'tous';

  const gardes = verrousTous().filter(function(v){
    if(q){
      const nom = nomAffiche(v.entry).toLowerCase();
      const no = String(v.entry.speciesId);
      if(nom.indexOf(q) === -1 && no.indexOf(q) === -1) return false;
    }
    if(jeu !== 'tous'){
      // Un jeu choisi : on ne garde que ce qui y est verrouillé ET ce qui y
      // FIGURE. La condition d'existence n'est pas un détail : sans elle,
      // filtrer sur Rouge/Bleu annonçait Victini et Keldeo verrouillés — aucun
      // des deux n'existe dans ce jeu.
      if(!verrouEspecePresente(v.entry.speciesId, jeu)) return false;
      if(v.genre === 'rencontre'
         && !v.fermes.some(function(g){ return g.key === jeu; })) return false;
    }
    return true;
  });

  verrousListe.innerHTML = '';

  // Les règles d'abord : sur Épée et Bouclier, « tous les Pokémon offerts »
  // pèse plus lourd que les deux espèces nommées en dessous.
  const regles = reglesPour(jeu);
  if(regles.length) verrousListe.appendChild(blocRegles(regles));

  if(!gardes.length && !regles.length && !cadeauxPour(jeu, q).length){
    const rienNeBrille = SANS_CHROMATIQUES.indexOf(jeu) !== -1;
    verrousListe.innerHTML = '<div class="state-msg">' + (rienNeBrille
      ? 'Aucun Pokémon n’est chromatique dans ce jeu : la forme apparaît en Or '
        + 'et Argent.'
      : 'Rien de verrouillé ici, d’après ce qu’on sait.') + '</div>';
  }
  gardes.forEach(function(v){ verrousListe.appendChild(ligneVerrou(v, jeu)); });

  // L'exception, tout en bas : elle dit le contraire du reste de l'écran, et
  // mélangée aux verrous elle se lirait à l'envers.
  const cadeaux = cadeauxPour(jeu, q);
  if(cadeaux.length){
    verrousListe.appendChild(titreSection('Cadeaux mystères — l’exception',
      'Un cadeau mystère est verrouillé par défaut. Ceux-ci ne l’étaient pas.'));
    cadeaux.forEach(function(v){ verrousListe.appendChild(ligneVerrou(v, jeu)); });
  }

  if(verrouCompte) verrouCompte.textContent = resumeVerrous(gardes, regles, cadeaux, jeu);
}

function titreSection(titre, note){
  const bloc = document.createElement('div');
  bloc.className = 'verrou-section';
  const h = document.createElement('div');
  h.className = 'verrou-section-titre';
  h.textContent = titre;
  const p = document.createElement('div');
  p.className = 'verrou-section-note';
  p.textContent = note;
  bloc.appendChild(h);
  bloc.appendChild(p);
  return bloc;
}

function resumeVerrous(gardes, regles, cadeaux, jeu){
  const bouts = [];
  if(gardes.length){
    bouts.push(gardes.length + (gardes.length > 1 ? ' espèces' : ' espèce'));
  }
  if(regles.length){
    bouts.push(regles.length + (regles.length > 1 ? ' règles' : ' règle'));
  }
  if(cadeaux.length){
    bouts.push(cadeaux.length + ' cadeau' + (cadeaux.length > 1 ? 'x' : ''));
  }
  if(!bouts.length) return '';
  return bouts.join('  ·  ') + (jeu !== 'tous' ? ' sur ce jeu' : ' au total');
}

/** Les catégories entières, celles qu'on ne peut pas énumérer. */
function blocRegles(regles){
  const bloc = document.createElement('div');
  bloc.className = 'verrou-regles';
  const titre = document.createElement('div');
  titre.className = 'verrou-regles-titre';
  titre.textContent = 'Sur ce jeu, ne peuvent pas être chromatiques';
  bloc.appendChild(titre);
  regles.forEach(function(r){
    const p = document.createElement('div');
    p.className = 'verrou-regle';
    p.textContent = r.texte;
    bloc.appendChild(p);
  });
  return bloc;
}

function ligneVerrou(v, jeuFiltre){
  const ligne = document.createElement('div');
  ligne.className = 'verrou-ligne';

  const cadre = document.createElement('span');
  cadre.className = 'verrou-sprite';
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.alt = '';
  // Le sprite CHROMATIQUE : on montre exactement ce qu'on n'aura pas.
  img.src = pokeosHomeUrl(v.entry.id, true);
  img.addEventListener('error', function(){ img.src = officialArtworkUrl(v.entry.id, true); });
  cadre.appendChild(img);
  ligne.appendChild(cadre);

  const infos = document.createElement('span');
  infos.className = 'verrou-infos';

  const nom = document.createElement('div');
  nom.className = 'verrou-nom';
  nom.textContent = nomAffiche(v.entry);
  const no = document.createElement('span');
  no.className = 'verrou-no';
  no.textContent = '#' + String(v.entry.speciesId).padStart(4, '0');
  nom.appendChild(no);
  infos.appendChild(nom);

  if(v.genre === 'partout'){
    infos.appendChild(phrase('verrou-partout',
      'Verrouillé partout — aucun exemplaire légitime n’existe.'));
  } else if(v.genre === 'cadeau'){
    infos.appendChild(phrase('verrou-cadeau',
      'Cadeau mystère — cette distribution pouvait être chromatique.'));
    if(v.quoi) infos.appendChild(phrase('verrou-quoi', v.quoi));
    infos.appendChild(etiquettesVerrou(v, jeuFiltre));
  } else if(v.genre === 'taux'){
    infos.appendChild(phrase('verrou-taux',
      'Chromatique possible, mais jamais au taux amélioré : ni Charme Chroma, '
      + 'ni bonus de rencontre.'));
    infos.appendChild(etiquettesVerrou(v, jeuFiltre));
  } else {
    if(v.quoi) infos.appendChild(phrase('verrou-quoi', v.quoi));
    infos.appendChild(etiquettesVerrou(v, jeuFiltre));
  }
  ligne.appendChild(infos);

  ligne.appendChild(boutonVerrou(v));
  return ligne;
}

function phrase(classe, texte){
  const p = document.createElement('div');
  p.className = classe;
  p.textContent = texte;
  return p;
}

function etiquettesVerrou(v, jeuFiltre){
  const bloc = document.createElement('div');
  bloc.className = 'verrou-jeux';

  const dire = function(texte){
    const l = document.createElement('span');
    l.className = 'verrou-libelle';
    l.textContent = texte;
    bloc.appendChild(l);
  };
  const etiq = function(texte, classe){
    const e = document.createElement('span');
    e.className = 'verrou-etiq ' + classe;
    e.textContent = texte;
    bloc.appendChild(e);
  };

  // Sur un jeu choisi, le nommer n'apprend rien : on le regarde déjà.
  if(jeuFiltre === 'tous' && v.fermes.length){
    dire('cette rencontre');
    v.fermes.slice(0, VERROU_JEUX_CITES).forEach(function(g){ etiq(g.tab, 'ferme'); });
    if(v.fermes.length > VERROU_JEUX_CITES){
      etiq('et ' + (v.fermes.length - VERROU_JEUX_CITES) + ' autres', 'ferme');
    }
  }

  // LES AUTRES RENCONTRES DU MÊME JEU RESTENT OUVERTES. Ne pas le dire laissait
  // croire que l'espèce entière était perdue là où seule une porte l'est.
  if(v.ouverts.length){
    dire('chassable');
    v.ouverts.slice(0, VERROU_JEUX_CITES).forEach(function(g){ etiq(g.tab, 'ouvert'); });
    if(v.ouverts.length > VERROU_JEUX_CITES){
      etiq('et ' + (v.ouverts.length - VERROU_JEUX_CITES) + ' autres', 'ouvert');
    }
  }
  return bloc;
}

/**
 * Le bouton du bout de ligne, et le vrai service de cet écran.
 *
 * Savoir que c'est verrouillé ne sert à rien ; savoir où aller, si.
 */
function boutonVerrou(v){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'verrou-chasser';

  const cible = v.genre === 'partout' ? null : v.ouverts[0];

  if(!cible){
    b.textContent = v.genre === 'partout' ? 'Nulle part' : '—';
    b.disabled = true;
    b.title = v.genre === 'partout'
      ? 'Aucun jeu ne permet d’en obtenir un chromatique'
      : 'On ne sait pas où le chasser';
    return b;
  }

  b.textContent = 'Chasser sur ' + cible.tab.replace(/^\S+\s/, '');
  b.title = 'Ouvrir « Créer une chasse » avec ce jeu déjà choisi';
  b.addEventListener('click', function(){
    fermerVerrous();
    if(typeof ouvrirChasseModal !== 'function') return;
    ouvrirChasseModal();
    // APRÈS l'ouverture, jamais avant : ouvrirChasseModal remet la sélection à
    // zéro et repositionne le jeu sur le Pokédex courant. Poser notre choix
    // d'abord reviendrait à l'effacer aussitôt.
    if(typeof choisirPourChasse === 'function') choisirPourChasse(v.entry);
    if(chasseJeu){
      chasseJeu.value = cible.key;
      // Le menu maison lit le <select> caché : sans cette resynchronisation, le
      // bouton continue d'afficher l'ancien jeu au-dessus de la bonne valeur.
      if(typeof syncSelects === 'function') syncSelects();
      if(typeof majMethodesDisponibles === 'function') majMethodesDisponibles();
    }
  });
  return b;
}

function fermerVerrous(){
  if(verrousOverlay) verrousOverlay.style.display = 'none';
}

// ---- Le câblage -------------------------------------------------------------

const verrousBtn = document.getElementById('verrousBtn');
const verrousOverlay = document.getElementById('verrousOverlay');
const verrousListe = document.getElementById('verrousListe');
const verrousFermer = document.getElementById('verrousFermer');
const verrouQ = document.getElementById('verrouQ');
const verrouJeu = document.getElementById('verrouJeu');
const verrouCompte = document.getElementById('verrouCompte');

if(verrousBtn) verrousBtn.addEventListener('click', ouvrirVerrous);
if(verrousFermer) verrousFermer.addEventListener('click', fermerVerrous);
if(verrouQ) verrouQ.addEventListener('input', dessinerVerrous);
if(verrouJeu) verrouJeu.addEventListener('change', dessinerVerrous);
if(verrousOverlay){
  verrousOverlay.addEventListener('click', function(e){
    if(e.target === verrousOverlay) fermerVerrous();
  });
}
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && verrousOverlay
     && verrousOverlay.style.display === 'flex') fermerVerrous();
});
