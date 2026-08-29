// Le catalogue des verrous chromatiques : ce qui ne peut pas briller, et où.
//
// Script classique, chargé APRÈS chasse.js — il lui emprunte ouvrirChasseModal
// pour le bouton « chasser sur… », et dex.js pour nomAffiche.
//
// LA QUESTION QU'IL RÉPOND. « Est-ce que je peux chasser celui-là ici ? » Elle se
// pose avant de lancer une chasse, et l'application connaissait déjà la moitié
// de la réponse sans jamais la donner : SHINY_LOCKED servait au Pokédex, et
// chasse.js ne la consultait pas — zéro occurrence. On pouvait lancer une chasse
// sur Zacian, voir le compteur monter à trois mille, et n'obtenir jamais rien.
//
// UN CATALOGUE, PAS UN GARDE-FOU. Il ne bloque rien : il se consulte. Barrer la
// création d'une chasse supposerait que la table est complète, et elle ne l'est
// pas — se taire là où l'on ne sait pas vaut mieux que d'interdire à tort.
//
// TROIS SOURCES, ET ELLES NE DISENT PAS LA MÊME CHOSE :
//
//   · SANS_CHROMATIQUES (chasse.js) — le jeu n'a pas de chromatique du tout.
//     Aucune table : c'est vrai pour les 151 espèces de Rouge/Bleu/Jaune.
//   · SHINY_LOCKED — l'espèce n'en a nulle part, dans aucun jeu.
//   · VERROUS_PAR_JEU — cette rencontre-ci est verrouillée, ailleurs non.
//
// La troisième est la seule qui demande un travail de saisie, et c'est celle qui
// sert le plus : elle dit où aller.

// Combien de jeux on nomme avant d'abréger. Au-delà, « et 18 autres » en dit
// autant en tenant sur une ligne.
const VERROU_JEUX_CITES = 3;

// ---- Ce que l'on sait d'une espèce ------------------------------------------

/**
 * Les jeux où une RENCONTRE de cette espèce est verrouillée.
 *
 * À ne pas confondre avec verrouJeuxSansEspoir() : le starter d'Épée/Bouclier
 * figure ici, et pourtant on peut en obtenir un chromatique dans ce même jeu,
 * par reproduction. Cette liste-là sert à AFFICHER l'avertissement ; l'autre
 * sert à répondre « où aller », et elles ne se recouvrent pas.
 *
 * ROUGE / BLEU / JAUNE N'Y SONT PAS, ET C'EST VOULU. Ils n'ont aucun chromatique,
 * donc les y ajouter rendait les 1025 espèces « verrouillées » : le catalogue
 * listait le Pokédex entier et noyait ses trente vraies lignes. Le fait vaut pour
 * le jeu, pas pour l'espèce ; la note de l'écran le dit une fois, et l'écran de
 * chasse écarte déjà ces jeux de son sélecteur.
 */
function verrouJeuxFermes(speciesId){
  const fermes = new Set();
  VERROUS_PAR_JEU.forEach(function(v){
    if(v.espece === speciesId) v.jeux.forEach(function(cle){ fermes.add(cle); });
  });
  return fermes;
}

/**
 * Les jeux où l'espèce ne peut PAS être obtenue chromatique, par aucune voie.
 *
 * C'est la question qui compte pour le bouton du bout de ligne. Un verrou dont on
 * connaît le contournement (`ailleurs`) ne ferme pas le jeu : il ferme une porte
 * dans un jeu qui en a d'autres. Confondre les deux désactivait le bouton sur
 * les six starters de Galar et de Paldea — en annonçant introuvable ce qui
 * s'obtient dans le jeu qu'on a sous la main.
 */
function verrouJeuxSansEspoir(speciesId){
  const sans = new Set(SANS_CHROMATIQUES);
  VERROUS_PAR_JEU.forEach(function(v){
    if(v.espece !== speciesId || v.ailleurs) return;
    v.jeux.forEach(function(cle){ sans.add(cle); });
  });
  return sans;
}

/**
 * La fiche d'une espèce verrouillée, ou null si rien ne la concerne.
 *
 * `partout` l'emporte sur le reste : nommer quatorze jeux fermés pour Zacian
 * dirait la même chose en moins clair qu'une phrase.
 */
function verrouDe(entry){
  const id = entry.speciesId;
  if(SHINY_LOCKED.has(id)){
    return { entry: entry, partout: true, fermes: [], ouverts: [], quoi: null, ailleurs: null };
  }

  const fermes = verrouJeuxFermes(id);
  if(!fermes.size) return null;

  // Les jeux où l'espèce EXISTE et reste obtenable chromatique. On ne cite pas un
  // jeu où elle n'apparaît pas : « chassable sur Rouge/Bleu » pour un Pokémon de
  // Galar serait faux deux fois. Le relévé des lieux ne couvre pas tous les jeux ;
  // ceux qu'il ignore ne sont pas proposés, faute de pouvoir l'affirmer.
  const sansEspoir = verrouJeuxSansEspoir(id);
  const ouverts = GAMES.filter(function(g){
    return !sansEspoir.has(g.key) && verrouEspecePresente(id, g.key);
  });

  const precis = VERROUS_PAR_JEU.find(function(v){ return v.espece === id; });
  return {
    entry: entry,
    partout: false,
    fermes: GAMES.filter(function(g){ return fermes.has(g.key); }),
    ouverts: ouverts,
    quoi: precis ? precis.quoi : null,
    ailleurs: precis ? (precis.ailleurs || null) : null,
  };
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

  remplirVerrouGens();
  remplirVerrouJeux();
  dessinerVerrous();
}

/** Le sélecteur de générations, bâti sur GEN_RANGES. */
function remplirVerrouGens(){
  if(!verrouGen || verrouGen.dataset.pret) return;
  GEN_RANGES.forEach(function(g){
    const o = document.createElement('option');
    o.value = String(g.gen);
    o.textContent = 'Génération ' + g.gen;
    verrouGen.appendChild(o);
  });
  verrouGen.dataset.pret = '1';
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
  const gen = (verrouGen && verrouGen.value) || 'tous';
  const jeu = (verrouJeu && verrouJeu.value) || 'tous';

  const gardes = verrousTous().filter(function(v){
    if(q){
      const nom = nomAffiche(v.entry).toLowerCase();
      const no = String(v.entry.speciesId);
      if(nom.indexOf(q) === -1 && no.indexOf(q) === -1) return false;
    }
    if(gen !== 'tous' && String(v.entry.gen) !== gen) return false;
    if(jeu !== 'tous'){
      // Un jeu choisi : on ne garde que ce qui y est verrouillé ET ce qui y
      // FIGURE. La condition d'existence n'est pas un détail : sans elle, filtrer
      // sur Rouge/Bleu annonçait vingt-huit espèces verrouillées, Victini et
      // Keldeo compris — aucun des deux n'existe dans ce jeu. « Verrouillé ici »
      // sur une espèce absente n'est pas une demi-vérité, c'est un contresens.
      if(!verrouEspecePresente(v.entry.speciesId, jeu)) return false;
      if(!v.partout && !v.fermes.some(function(g){ return g.key === jeu; })) return false;
    }
    return true;
  });

  verrousListe.innerHTML = '';
  if(!gardes.length){
    // Sur Rouge, Bleu ou Jaune, « rien de verrouillé » serait vrai et trompeur :
    // rien n'y est verrouillé parce que rien n'y brille. On le dit.
    const rienNeBrille = SANS_CHROMATIQUES.indexOf(jeu) !== -1;
    verrousListe.innerHTML = '<div class="state-msg">' + (rienNeBrille
      ? 'Aucun Pokémon n’est chromatique dans ce jeu : la forme apparaît en Or '
        + 'et Argent.'
      : 'Rien de verrouillé ici, d’après ce qu’on sait.') + '</div>';
  }
  gardes.forEach(function(v){ verrousListe.appendChild(ligneVerrou(v, jeu)); });

  if(verrouCompte){
    const partout = gardes.filter(function(v){ return v.partout; }).length;
    verrouCompte.textContent = gardes.length
      + (gardes.length > 1 ? ' espèces verrouillées' : ' espèce verrouillée')
      + (jeu !== 'tous' ? ' sur ce jeu' : '')
      + (partout && jeu === 'tous' ? '  ·  ' + partout + ' le sont partout' : '');
  }
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

  if(v.partout){
    const p = document.createElement('div');
    p.className = 'verrou-partout';
    p.textContent = 'Verrouillé partout — aucun exemplaire légitime n’existe.';
    infos.appendChild(p);
  } else {
    infos.appendChild(etiquettesVerrou(v, jeuFiltre));
  }
  ligne.appendChild(infos);

  ligne.appendChild(boutonVerrou(v));
  return ligne;
}

function etiquettesVerrou(v, jeuFiltre){
  const enveloppe = document.createElement('div');

  // De quelle rencontre il s'agit, quand on le sait. SUR SA PROPRE LIGNE : collée
  // aux étiquettes, elle se lisait « starter offert fermé » d'un seul tenant, deux
  // choses différentes soudées en une phrase qui n'existe pas. Elle dit pourquoi ;
  // les pastilles disent où.
  if(v.quoi){
    const q = document.createElement('div');
    q.className = 'verrou-quoi';
    q.textContent = v.quoi;
    enveloppe.appendChild(q);
  }

  const bloc = document.createElement('div');
  bloc.className = 'verrou-jeux';
  enveloppe.appendChild(bloc);

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

  // Sur un jeu choisi, les jeux fermés n'apprennent rien : on le regarde déjà.
  if(jeuFiltre === 'tous'){
    dire('fermé');
    v.fermes.slice(0, VERROU_JEUX_CITES).forEach(function(g){ etiq(g.tab, 'ferme'); });
    if(v.fermes.length > VERROU_JEUX_CITES){
      etiq('et ' + (v.fermes.length - VERROU_JEUX_CITES) + ' autres', 'ferme');
    }
  }

  if(v.ailleurs){
    dire('ouvert');
    etiq(v.ailleurs, 'ouvert');
  } else if(v.ouverts.length){
    dire('ouvert');
    v.ouverts.slice(0, VERROU_JEUX_CITES).forEach(function(g){ etiq(g.tab, 'ouvert'); });
    if(v.ouverts.length > VERROU_JEUX_CITES){
      etiq('et ' + (v.ouverts.length - VERROU_JEUX_CITES) + ' autres', 'ouvert');
    }
  }
  return enveloppe;
}

/**
 * Le bouton du bout de ligne, et le vrai service de cet écran.
 *
 * Savoir que c'est verrouillé ne sert à rien ; savoir où aller, si. Il ouvre la
 * création d'une chasse avec le premier jeu ouvert déjà choisi.
 */
function boutonVerrou(v){
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'verrou-chasser';

  const cible = v.partout ? null : v.ouverts[0];
  if(!cible){
    b.textContent = v.partout ? 'Nulle part' : '—';
    b.disabled = true;
    b.title = v.partout
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
const verrouGen = document.getElementById('verrouGen');
const verrouJeu = document.getElementById('verrouJeu');
const verrouCompte = document.getElementById('verrouCompte');

if(verrousBtn) verrousBtn.addEventListener('click', ouvrirVerrous);
if(verrousFermer) verrousFermer.addEventListener('click', fermerVerrous);
if(verrouQ) verrouQ.addEventListener('input', dessinerVerrous);
if(verrouGen) verrouGen.addEventListener('change', dessinerVerrous);
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
