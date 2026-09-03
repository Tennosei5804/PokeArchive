// Données jeux — ce que tu as joué, et avec qui.
//
// Une ligne par jeu : où tu en es, l'équipe que tu y avais, et ce que tu veux
// en dire. C'est du SOUVENIR, pas de la progression. Le Pokédex compte déjà ce
// qui est coché ; ici rien n'est calculé, tout est saisi — parce qu'une équipe
// de fin de partie ne se déduit d'aucune case.
//
// POURQUOI CE N'EST PAS DANS LA SAUVEGARDE DE L'AVENTURE. buildSavePayload()
// emporte le dex, les chasses, les objectifs, les fiches de capture : tout ce
// qui appartient à UNE aventure. Or ton équipe de Pokémon Jaune est la tienne,
// que tu sois sur « Aventure 1 » ou sur « Chasse shiny ». La ranger là aurait
// donné une réponse différente selon l'aventure ouverte.
//
// ELLE RESTE DONC EN LOCAL, ET C'EST UNE ÉTAPE ASSUMÉE. Le pas suivant est une
// table `pa_parties` (une ligne par dresseur et par jeu) avec `carte`,
// `carte_ecrire`, `carte_de` sur le pont, et le bloc repris dans
// visiterDresseur(). Rien de ce qui est écrit ici ne sera à refaire : la forme
// enregistrée est déjà celle qui partira au serveur. On vérifie d'abord qu'on
// s'en sert.
//
// Script classique, chargé après donnees-perso.js : il se sert de GAMES, de
// allEntries, de nomAffiche et de pokeosHomeUrl, tous déjà là.

const PARTIES_CLE = 'pokearchive-parties';
const PARTIES_EQUIPE_MAX = 6;

// Les trois états d'un jeu. La clé est enregistrée, le mot est affiché : les
// renommer plus tard ne cassera pas ce qui est déjà écrit sur les machines.
const PARTIES_ETATS = [
  ['en-cours', 'En cours'],
  ['fini',     'Fini'],
  ['abandon',  'Abandonné']
];

function partiesMotEtat(cle){
  for(let i = 0; i < PARTIES_ETATS.length; i++){
    if(PARTIES_ETATS[i][0] === cle) return PARTIES_ETATS[i][1];
  }
  return PARTIES_ETATS[0][1];
}

// { cleJeu: { etat, equipe:[slug], note } }
let parties = (function(){
  try{
    const brut = localStorage.getItem(PARTIES_CLE);
    const lu = brut ? JSON.parse(brut) : null;
    return (lu && typeof lu === 'object') ? lu : {};
  }catch(e){ return {}; }
})();

let partieOuverte = null;         // le jeu déplié

function partiesEnregistrer(){
  try{ localStorage.setItem(PARTIES_CLE, JSON.stringify(parties)); }
  catch(e){ /* stockage refusé : la session en garde la trace, pas le disque */ }
}

const partiesListe = document.getElementById('partiesListe');
const partiesAjout = document.getElementById('partiesAjout');
const partiesAjouter = document.getElementById('partiesAjouter');
const partiesDeduire = document.getElementById('partiesDeduire');

/** Le jeu, tel que GAMES le nomme. Rend null pour une clé qui n'existe plus. */
function partiesJeu(cle){
  if(typeof gameByKey !== 'undefined' && gameByKey) return gameByKey[cle] || null;
  return null;
}

// ---- Ce que l'application sait déjà -----------------------------------------
//
// ELLE SAIT À QUELS JEUX TU AS JOUÉ. allProgress porte une entrée par Pokédex
// ouvert : proposer de les ajouter d'un clic évite le formulaire de vingt-trois
// jeux vides, qui ne se remplit jamais.
//
// L'ÉTAT PROPOSÉ RESTE PRUDENT : « en cours », jamais « fini ». Un Pokédex
// complet ne dit pas qu'on a fini le jeu, et l'inverse non plus — on peut
// terminer la Ligue sans avoir coché trente espèces. Deviner l'un depuis
// l'autre écrirait des souvenirs faux dans le dos de la personne.
function partiesDeduites(){
  if(typeof allProgress === 'undefined' || !allProgress) return [];
  return Object.keys(allProgress).filter(function(cle){
    if(parties[cle]) return false;
    if(!partiesJeu(cle)) return false;
    const b = allProgress[cle];
    return !!(b && b.caught && b.caught.size);
  });
}

function partiesMajDeduire(){
  if(!partiesDeduire) return;
  const trouves = partiesDeduites();
  partiesDeduire.hidden = !trouves.length;
  if(trouves.length){
    partiesDeduire.textContent = 'Ajouter les ' + trouves.length + ' jeu'
      + (trouves.length > 1 ? 'x' : '') + ' où tu as déjà coché quelque chose';
  }
}

// ---- Le menu d'ajout --------------------------------------------------------

function partiesRemplirMenu(){
  if(!partiesAjout) return;
  const garde = partiesAjout.value;
  partiesAjout.innerHTML = '';
  (typeof GAMES !== 'undefined' ? GAMES : []).forEach(function(g){
    if(parties[g.key]) return;                     // déjà dans la liste
    const o = document.createElement('option');
    o.value = g.key;
    o.textContent = g.tab;
    partiesAjout.appendChild(o);
  });
  if(!partiesAjout.options.length){
    const o = document.createElement('option');
    o.value = '';
    o.textContent = 'Tous les jeux sont déjà là';
    o.disabled = true;
    partiesAjout.appendChild(o);
  }
  if(garde) partiesAjout.value = garde;
  if(typeof syncSelects === 'function') syncSelects();
  if(partiesAjouter) partiesAjouter.disabled = !partiesAjout.value;
}

// ---- L'équipe ---------------------------------------------------------------

/**
 * L'entrée d'espèce derrière un slug enregistré.
 *
 * On enregistre le SLUG — « venusaur » — et non le nom français ni le numéro :
 * c'est la clé que porte déjà `caught`, celle de pa_historique.pokemon, et la
 * seule que le jour du passage au serveur n'obligera pas à convertir.
 */
let partiesParNom = null;

function partiesEntree(slug){
  if(typeof allEntries === 'undefined') return null;
  if(!partiesParNom){
    partiesParNom = new Map();
    allEntries.forEach(function(e){ partiesParNom.set(e.name, e); });
  }
  return partiesParNom.get(slug) || null;
}

/** Les espèces dont le nom commence par ce qu'on tape. Huit au plus. */
function partiesChercher(q){
  if(typeof allEntries === 'undefined' || !q) return [];
  const clef = replierLieu(q);
  const debut = [], dedans = [];
  for(let i = 0; i < allEntries.length; i++){
    const e = allEntries[i];
    const n = replierLieu(nomAffiche(e));
    const ou = n.indexOf(clef);
    if(ou === 0) debut.push(e);
    else if(ou > 0) dedans.push(e);
    if(debut.length >= 8) break;
  }
  return debut.concat(dedans).slice(0, 8);
}

function partiesVignette(entry, taille){
  const img = document.createElement('img');
  img.className = 'partie-vignette';
  img.loading = 'lazy';
  img.width = taille; img.height = taille;
  img.alt = '';
  img.src = pokeosHomeUrl(entry.id, false);
  // Une espèce sans rendu PokeOS ne doit pas laisser un cadre vide : on retombe
  // sur la chaîne courte, celle qui sert partout ailleurs.
  img.addEventListener('error', function(){
    if(img.dataset.replie) return;
    img.dataset.replie = '1';
    img.src = officialArtworkUrl(entry.id, false);
  });
  return img;
}

// ---- Une ligne de jeu -------------------------------------------------------

function partieEnTete(cle, partie){
  const jeu = partiesJeu(cle);
  const tete = document.createElement('button');
  tete.type = 'button';
  tete.className = 'partie-tete';
  tete.setAttribute('aria-expanded', String(partieOuverte === cle));

  const nom = document.createElement('span');
  nom.className = 'partie-nom';
  nom.textContent = jeu ? jeu.tab : cle;
  tete.appendChild(nom);

  // L'équipe se lit AVANT d'ouvrir : c'est ce qu'on vient revoir, et six
  // vignettes se reconnaissent plus vite que six noms.
  const equipe = document.createElement('span');
  equipe.className = 'partie-equipe-mini';
  (partie.equipe || []).forEach(function(slug){
    const e = partiesEntree(slug);
    if(e) equipe.appendChild(partiesVignette(e, 26));
  });
  tete.appendChild(equipe);

  const etat = document.createElement('span');
  etat.className = 'partie-etat partie-etat-' + (partie.etat || 'en-cours');
  etat.textContent = partiesMotEtat(partie.etat);
  tete.appendChild(etat);

  tete.addEventListener('click', function(){
    partieOuverte = (partieOuverte === cle) ? null : cle;
    dessinerParties();
  });
  return tete;
}

function partieCorps(cle, partie){
  const corps = document.createElement('div');
  corps.className = 'partie-corps';
  corps.hidden = partieOuverte !== cle;
  if(corps.hidden) return corps;                 // rien à construire tant qu'il est replié

  // --- L'état ---------------------------------------------------------------
  const rangEtat = document.createElement('label');
  rangEtat.className = 'partie-champ';
  const titreEtat = document.createElement('span');
  titreEtat.className = 'partie-champ-nom';
  titreEtat.textContent = 'Où tu en es';
  rangEtat.appendChild(titreEtat);
  const selEtat = document.createElement('select');
  PARTIES_ETATS.forEach(function(p){
    const o = document.createElement('option');
    o.value = p[0]; o.textContent = p[1];
    selEtat.appendChild(o);
  });
  selEtat.value = partie.etat || 'en-cours';
  selEtat.addEventListener('change', function(){
    partie.etat = selEtat.value;
    partiesEnregistrer();
    dessinerParties();
  });
  rangEtat.appendChild(selEtat);
  corps.appendChild(rangEtat);

  // --- L'équipe -------------------------------------------------------------
  const bloc = document.createElement('div');
  bloc.className = 'partie-equipe';
  const titreEq = document.createElement('div');
  titreEq.className = 'partie-champ-nom';
  titreEq.textContent = 'Ton équipe — ' + (partie.equipe || []).length
    + ' sur ' + PARTIES_EQUIPE_MAX;
  bloc.appendChild(titreEq);

  const rangee = document.createElement('div');
  rangee.className = 'partie-rangee';
  (partie.equipe || []).forEach(function(slug, i){
    const e = partiesEntree(slug);
    const puce = document.createElement('span');
    puce.className = 'partie-membre';
    if(e){
      puce.appendChild(partiesVignette(e, 34));
      const n = document.createElement('span');
      n.textContent = nomAffiche(e);
      puce.appendChild(n);
    } else {
      const n = document.createElement('span');
      n.textContent = slug;
      puce.appendChild(n);
    }
    const ote = document.createElement('button');
    ote.type = 'button';
    ote.className = 'partie-oter';
    ote.textContent = '×';
    ote.setAttribute('aria-label', 'Retirer ' + (e ? nomAffiche(e) : slug));
    ote.addEventListener('click', function(){
      partie.equipe.splice(i, 1);
      partiesEnregistrer();
      dessinerParties();
    });
    puce.appendChild(ote);
    rangee.appendChild(puce);
  });
  bloc.appendChild(rangee);

  // Le champ de recherche disparaît à six : une équipe n'en compte pas sept, et
  // un champ qui refuse vaut moins qu'un champ qui n'est pas là.
  if((partie.equipe || []).length < PARTIES_EQUIPE_MAX){
    const cherche = document.createElement('input');
    cherche.type = 'search';
    cherche.className = 'partie-cherche';
    cherche.placeholder = 'Ajouter un Pokémon…';
    cherche.autocomplete = 'off';
    const trouves = document.createElement('div');
    trouves.className = 'partie-trouves';

    const majTrouves = function(){
      trouves.innerHTML = '';
      partiesChercher(cherche.value.trim()).forEach(function(e){
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'partie-trouve';
        b.appendChild(partiesVignette(e, 24));
        const n = document.createElement('span');
        n.textContent = nomAffiche(e);
        b.appendChild(n);
        b.addEventListener('click', function(){
          if(!partie.equipe) partie.equipe = [];
          if(partie.equipe.indexOf(e.name) === -1
             && partie.equipe.length < PARTIES_EQUIPE_MAX){
            partie.equipe.push(e.name);
            partiesEnregistrer();
            dessinerParties();
          }
        });
        trouves.appendChild(b);
      });
    };
    cherche.addEventListener('input', majTrouves);
    bloc.appendChild(cherche);
    bloc.appendChild(trouves);
  }
  corps.appendChild(bloc);

  // --- La note --------------------------------------------------------------
  const note = document.createElement('textarea');
  note.className = 'partie-note';
  note.rows = 2;
  note.maxLength = 300;
  note.placeholder = 'Ce que tu veux en dire — « premier run, jamais fini le Pokédex »';
  note.value = partie.note || '';
  // À la sortie du champ et non à chaque frappe : réécrire le stockage à chaque
  // lettre n'apporte rien, et redessiner sous les doigts ferait perdre le curseur.
  note.addEventListener('change', function(){
    partie.note = note.value.trim();
    partiesEnregistrer();
  });
  corps.appendChild(note);

  // --- Retirer le jeu -------------------------------------------------------
  const oter = document.createElement('button');
  oter.type = 'button';
  oter.className = 'partie-retirer';
  oter.textContent = 'Retirer ce jeu de la liste';
  oter.addEventListener('click', function(){
    delete parties[cle];
    if(partieOuverte === cle) partieOuverte = null;
    partiesEnregistrer();
    partiesRemplirMenu();
    dessinerParties();
  });
  corps.appendChild(oter);

  return corps;
}

// ---- L'affichage ------------------------------------------------------------

/**
 * L'ordre des jeux suit GAMES, et non l'ordre d'ajout.
 *
 * C'est l'ordre de sortie des jeux : celui dans lequel on les a joués, et celui
 * qu'on a en tête en cherchant Jaune ou Émeraude dans une liste.
 */
function partiesOrdonnees(){
  const cles = Object.keys(parties);
  if(typeof GAMES === 'undefined') return cles;
  const rang = {};
  GAMES.forEach(function(g, i){ rang[g.key] = i; });
  return cles.sort(function(a, b){
    return (rang[a] === undefined ? 999 : rang[a])
         - (rang[b] === undefined ? 999 : rang[b]);
  });
}

function dessinerParties(){
  if(!partiesListe) return;
  partiesListe.innerHTML = '';
  const cles = partiesOrdonnees();

  if(!cles.length){
    const vide = document.createElement('p');
    vide.className = 'profil-bloc-note';
    vide.textContent = 'Aucun jeu pour l’instant. Ajoute-en un ci-dessus : '
      + 'tu pourras y noter ton équipe et où tu en es.';
    partiesListe.appendChild(vide);
  }

  cles.forEach(function(cle){
    const partie = parties[cle];
    const bloc = document.createElement('div');
    bloc.className = 'partie' + (partieOuverte === cle ? ' ouverte' : '');
    bloc.appendChild(partieEnTete(cle, partie));
    bloc.appendChild(partieCorps(cle, partie));
    partiesListe.appendChild(bloc);
  });

  partiesMajDeduire();
}

function partieNeuve(){
  return { etat: 'en-cours', equipe: [], note: '' };
}

if(partiesAjouter){
  partiesAjouter.addEventListener('click', function(){
    const cle = partiesAjout && partiesAjout.value;
    if(!cle || parties[cle]) return;
    parties[cle] = partieNeuve();
    partieOuverte = cle;                     // ouvert d'emblée : on vient le remplir
    partiesEnregistrer();
    partiesRemplirMenu();
    dessinerParties();
  });
}

if(partiesAjout){
  partiesAjout.addEventListener('change', function(){
    if(partiesAjouter) partiesAjouter.disabled = !partiesAjout.value;
  });
}

if(partiesDeduire){
  partiesDeduire.addEventListener('click', function(){
    partiesDeduites().forEach(function(cle){ parties[cle] = partieNeuve(); });
    partiesEnregistrer();
    partiesRemplirMenu();
    dessinerParties();
  });
}

// Le menu et la liste se dressent au chargement : la page Profil n'a pas de
// fonction d'ouverture propre, et ces deux appels ne coûtent rien.
partiesRemplirMenu();
dessinerParties();
