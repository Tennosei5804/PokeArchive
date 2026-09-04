// La carte de dresseur — ce que tu aimes, et ce que tu as joué.
//
// DEUX COUCHES, DEUX FORMES. « Ta carte de dresseur » ne dépend d'aucun jeu :
// le jeu préféré, le spin-off, trois Pokémon, une phrase. « Données jeux » en
// tient une ligne PAR jeu. Elles vivent dans le même fichier parce qu'elles
// partagent tout — le choisisseur d'espèce, les vignettes, le stockage — et
// dans deux clés séparées parce qu'elles partiront un jour dans deux tables.
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
// ELLE VIT DONC DANS SES PROPRES TABLES — `pa_cartes` et `pa_parties`, une
// ligne par dresseur pour l'une, une par dresseur et par jeu pour l'autre — et
// elle est PUBLIQUE : c'est ce que les autres lisent en ouvrant ta fiche, sous
// tes aventures. Le localStorage reste, en premier écran et en filet hors
// ligne ; le serveur tranche dès qu'il répond. Voir partiesSynchroniser().
//
// Script classique, chargé après donnees-perso.js : il se sert de GAMES, de
// allEntries, de nomAffiche et de pokeosHomeUrl, tous déjà là.

const CARTE_CLE = 'pokearchive-carte';
const PARTIES_CLE = 'pokearchive-parties';
const CARTE_FAVORIS_MAX = 3;
const PARTIES_EQUIPE_MAX = 6;

// Les trois états d'un jeu. La clé est enregistrée, le mot est affiché : les
// renommer plus tard ne cassera pas ce qui est déjà écrit sur les machines.
const PARTIES_ETATS = [
  ['en-cours', 'En cours'],
  ['fini',     'Fini'],
  ['abandon',  'Abandonné']
];

/**
 * « mars 2024 », à partir d'un « 2024-03-17 ».
 *
 * Le jour ne figure pas : on ne se souvient pas d'avoir commencé Émeraude un
 * mardi, et le mois suffit à situer. À midi UTC pour que le fuseau ne fasse
 * pas reculer la date d'un jour — et donc parfois d'un mois.
 */
function partiesMoisAnnee(jour, avecAnnee){
  const d = new Date(String(jour) + 'T12:00:00Z');
  if(isNaN(d)) return '';
  return d.toLocaleDateString('fr-FR',
    avecAnnee === false ? { month: 'long', timeZone: 'UTC' }
                        : { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/**
 * Le temps passé et la période, en une ligne — ou rien du tout.
 *
 * ÉCRITE UNE FOIS, LUE DES DEUX CÔTÉS : sur sa propre liste et sur la fiche
 * publique. Deux mises en forme auraient fini par ne plus dire la même chose de
 * la même partie.
 *
 * Rend une chaîne vide quand il n'y a rien : l'appelant saute alors l'élément
 * plutôt que d'afficher un séparateur seul.
 */
function partiesResume(partie){
  const bouts = [];
  if(partie.heures !== null && partie.heures !== undefined && partie.heures !== ''){
    bouts.push(partie.heures + ' h');
  }
  const d = partie.debut, f = partie.fin;
  if(d && f){
    // Même année : on ne l'écrit qu'une fois — « mars → juin 2024 ».
    const memeAnnee = String(d).slice(0, 4) === String(f).slice(0, 4);
    bouts.push(partiesMoisAnnee(d, !memeAnnee) + ' → ' + partiesMoisAnnee(f));
  } else if(d){
    bouts.push('depuis ' + partiesMoisAnnee(d));
  } else if(f){
    bouts.push('jusqu’en ' + partiesMoisAnnee(f));
  }
  return bouts.join(' · ');
}

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

function partiesEnregistrer(){ carteRanger(PARTIES_CLE, parties); carteMonter(); }

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

/*
 * ON NE RETIENT JAMAIS UNE TABLE VIDE, et c'est tout le sens de la condition.
 *
 * `allEntries` est remplie par app.js, qui est chargé APRÈS ce fichier : au
 * moment où le premier dessin appelle cette fonction, elle vaut []. La Map
 * mémorisée à cet instant restait vide pour toute la session — les vignettes
 * d'équipe ne sortaient plus, et les Pokémon préférés s'affichaient sous leur
 * slug. Le défaut ne se voyait que chez ceux qui avaient DES données : sans
 * jeu enregistré, la boucle de dessin n'appelait rien, et la Map se
 * construisait plus tard, correctement.
 *
 * Comparer la taille plutôt que tester la présence sert une seconde fois : le
 * niveau de formes reconstruit `allEntries`, et une table figée sur l'ancienne
 * ne connaîtrait pas les nouvelles entrées.
 */
function partiesEntree(slug){
  if(typeof allEntries === 'undefined' || !allEntries || !allEntries.length) return null;
  if(!partiesParNom || partiesParNom.size !== allEntries.length){
    partiesParNom = new Map();
    allEntries.forEach(function(e){ partiesParNom.set(e.name, e); });
  }
  return partiesParNom.get(slug) || null;
}

/**
 * Les espèces dont le nom commence par ce qu'on tape. Huit au plus.
 *
 * `ou` restreint la recherche à un jeu — c'est ce que rend partiesPoolJeu().
 * Sans lui, on cherche dans toute la réserve : c'est ce qu'il faut pour les
 * Pokémon préférés, qui n'appartiennent à aucune partie.
 */
function partiesChercher(q, ou){
  const source = ou || (typeof allEntries !== 'undefined' ? allEntries : null);
  if(!source || !q) return [];
  const clef = replierLieu(q);
  const debut = [], dedans = [];
  for(let i = 0; i < source.length; i++){
    const e = source[i];
    const n = replierLieu(nomAffiche(e));
    const ou2 = n.indexOf(clef);
    if(ou2 === 0) debut.push(e);
    else if(ou2 > 0) dedans.push(e);
    if(debut.length >= 8) break;
  }
  return debut.concat(dedans).slice(0, 8);
}

// ---- Ce que le jeu contient -------------------------------------------------
//
// PROPOSER ARCANIN DE HISUI POUR ROUGE / BLEU EST UNE ERREUR, et pas une petite :
// on note ici une équipe qu'on a VRAIMENT eue. Une liste qui propose des
// Pokémon absents du jeu invite à écrire un souvenir faux, et personne ne
// relira sa fiche en se demandant si Hisui existait sur Game Boy.
//
// ON NE REFAIT AUCUN RÉFÉRENTIEL. La grille répond déjà à cette question à
// chaque changement d'onglet : `speciesForVariant()` donne les espèces du
// Pokédex du jeu, `formAllowedInGame()` tranche forme par forme. Les deux sont
// dans formes.js, et c'est le même couple qui bâtit `scopeEntries`.
//
// La liste est RETENUE PAR JEU : elle ne change pas tant que la réserve ne
// change pas, et la reconstruire à chaque frappe coûterait un parcours des
// treize cents entrées pour rien.

const partiesPools = new Map();      // cleJeu -> Promise<entrées>

function partiesPoolJeu(cle){
  const taille = (typeof allEntries !== 'undefined' && allEntries) ? allEntries.length : 0;
  const retenu = partiesPools.get(cle);
  // Comme partiesEntree : une liste bâtie sur une réserve plus courte est
  // périmée dès que le niveau de formes la rallonge.
  if(retenu && retenu.taille === taille) return retenu.promesse;

  const promesse = (async function(){
    const jeu = partiesJeu(cle);
    if(!jeu || !taille) return null;                  // rien à restreindre
    const variante = jeu.regional || jeu.second;
    if(!variante || typeof speciesForVariant !== 'function') return null;
    try{
      const dex = await speciesForVariant(variante);
      if(!dex || !dex.rank || !dex.rank.size) return null;
      return allEntries.filter(function(e){
        if(!dex.rank.has(e.speciesId)) return false;
        return typeof formAllowedInGame !== 'function' || formAllowedInGame(e, jeu);
      });
    }catch(e){
      // Pokédex injoignable et rien en réserve. ON REND null, ce qui rouvre la
      // recherche à tout : un souvenir doit pouvoir s'écrire hors ligne, et
      // une liste vide empêcherait d'ajouter le moindre Pokémon.
      return null;
    }
  })();

  partiesPools.set(cle, { taille: taille, promesse: promesse });
  return promesse;
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

  // Le temps et la période se lisent AVANT d'ouvrir, comme l'équipe : c'est ce
  // qu'on vient revoir. Rien ne s'affiche quand rien n'est saisi.
  const resume = partiesResume(partie);
  if(resume){
    const r = document.createElement('span');
    r.className = 'partie-resume';
    r.textContent = resume;
    tete.appendChild(r);
  }

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

  // --- Le temps passé, et quand ---------------------------------------------
  //
  // TOUT EST FACULTATIF ICI, et les champs vides le restent : un souvenir
  // ancien n'a souvent ni compteur d'heures ni dates, et un formulaire qui
  // réclamerait les trois ferait renoncer à noter le reste.
  const mesures = document.createElement('div');
  mesures.className = 'partie-mesures';

  const champ = function(titre, entree){
    const l = document.createElement('label');
    l.className = 'partie-champ';
    const t = document.createElement('span');
    t.className = 'partie-champ-nom';
    t.textContent = titre;
    l.appendChild(t); l.appendChild(entree);
    return l;
  };

  const heures = document.createElement('input');
  heures.type = 'number';
  heures.className = 'partie-heures';
  heures.min = '0'; heures.max = '9999'; heures.step = '1';
  heures.placeholder = '—';
  heures.value = (partie.heures === null || partie.heures === undefined)
    ? '' : String(partie.heures);
  heures.addEventListener('change', function(){
    const v = heures.value.trim();
    // Vider le champ REMET À « je ne sais plus », et n'écrit pas zéro.
    partie.heures = v === '' ? null : Math.max(0, Math.min(9999, parseInt(v, 10) || 0));
    heures.value = partie.heures === null ? '' : String(partie.heures);
    partiesEnregistrer();
  });
  const boite = document.createElement('span');
  boite.className = 'partie-heures-boite';
  boite.appendChild(heures);
  const unite = document.createElement('span');
  unite.className = 'partie-unite';
  unite.textContent = 'h';
  boite.appendChild(unite);
  mesures.appendChild(champ('Temps de jeu', boite));

  const debut = document.createElement('input');
  debut.type = 'date';
  debut.className = 'partie-date';
  debut.value = partie.debut || '';
  const fin = document.createElement('input');
  fin.type = 'date';
  fin.className = 'partie-date';
  fin.value = partie.fin || '';

  // La fin ne peut pas précéder le début : le navigateur le dit lui-même, avec
  // son propre calendrier, plutôt qu'un message d'erreur après coup.
  const accorder = function(){
    if(debut.value) fin.min = debut.value; else fin.removeAttribute('min');
    if(fin.value) debut.max = fin.value; else debut.removeAttribute('max');
  };
  accorder();
  debut.addEventListener('change', function(){
    partie.debut = debut.value || null;
    accorder();
    partiesEnregistrer();
  });
  fin.addEventListener('change', function(){
    partie.fin = fin.value || null;
    accorder();
    partiesEnregistrer();
  });
  mesures.appendChild(champ('Début', debut));
  mesures.appendChild(champ('Fin', fin));
  corps.appendChild(mesures);

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

    // Un jeton par frappe : la liste du jeu arrive par une promesse, et une
    // réponse lente ne doit pas repeindre les résultats d'une frappe suivante.
    let tour = 0;
    const majTrouves = async function(){
      const mien = ++tour;
      const pool = await partiesPoolJeu(cle);
      if(mien !== tour) return;
      trouves.innerHTML = '';
      partiesChercher(cherche.value.trim(), pool).forEach(function(e){
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

// ---- La carte de dresseur ---------------------------------------------------
//
// TROIS PRÉFÉRENCES ET UNE PHRASE. Rien ici ne se déduit de la collection, et
// c'est voulu : le Pokémon qu'on a le plus attrapé n'est pas le Pokémon qu'on
// préfère, et une application qui le devinerait se tromperait sur ce qui compte
// le plus pour la personne.

let carte = (function(){
  try{
    const brut = localStorage.getItem(CARTE_CLE);
    const lu = brut ? JSON.parse(brut) : null;
    if(lu && typeof lu === 'object') return lu;
  }catch(e){ /* illisible : on repart d'une carte vide */ }
  return { jeu: '', spinoff: '', favoris: [], phrase: '' };
})();

function carteEnregistrer(){ carteRanger(CARTE_CLE, carte); carteMonter(); }

const identiteJeu = document.getElementById('identiteJeu');
const identiteSpinoff = document.getElementById('identiteSpinoff');
const identiteFavoris = document.getElementById('identiteFavoris');
const identiteFavorisTitre = document.getElementById('identiteFavorisTitre');
const identiteCherche = document.getElementById('identiteCherche');
const identiteTrouves = document.getElementById('identiteTrouves');
const identitePhrase = document.getElementById('identitePhrase');

function identiteRemplirJeux(){
  if(!identiteJeu) return;
  identiteJeu.innerHTML = '';
  const vide = document.createElement('option');
  vide.value = '';
  vide.textContent = '— aucun —';
  identiteJeu.appendChild(vide);
  (typeof GAMES !== 'undefined' ? GAMES : []).forEach(function(g){
    const o = document.createElement('option');
    o.value = g.key;
    o.textContent = g.tab;
    identiteJeu.appendChild(o);
  });
  identiteJeu.value = carte.jeu || '';
  if(typeof syncSelects === 'function') syncSelects();
}

/**
 * Le menu des spin-offs, tiré de SPINOFFS.
 *
 * IL AJOUTE CE QU'IL NE CONNAÎT PAS. Le champ était libre avant : des titres
 * tapés à la main dorment dans des cartes déjà enregistrées, et une liste
 * fermée les aurait fait disparaître du menu — donc de la carte, à la première
 * ouverture de la page. Un titre inconnu s'ajoute donc en fin de liste, et
 * reste choisi.
 *
 * C'est aussi ce qui rend la liste tenable : un jeu qui sort se rajoute d'une
 * ligne dans donnees.js, sans que personne n'ait rien à migrer.
 */
function identiteRemplirSpinoffs(){
  if(!identiteSpinoff) return;
  identiteSpinoff.innerHTML = '';
  const vide = document.createElement('option');
  vide.value = '';
  vide.textContent = '— aucun —';
  identiteSpinoff.appendChild(vide);

  const liste = (typeof SPINOFFS !== 'undefined' ? SPINOFFS : []).slice();
  const garde = carte.spinoff || '';
  if(garde && liste.indexOf(garde) === -1) liste.push(garde);

  liste.forEach(function(titre){
    const o = document.createElement('option');
    o.value = titre;
    o.textContent = titre;
    identiteSpinoff.appendChild(o);
  });
  identiteSpinoff.value = garde;
  if(typeof syncSelects === 'function') syncSelects();
}

function dessinerFavoris(){
  if(!identiteFavoris) return;
  const liste = carte.favoris || [];
  identiteFavoris.innerHTML = '';
  liste.forEach(function(slug, i){
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
      carte.favoris.splice(i, 1);
      carteEnregistrer();
      dessinerFavoris();
    });
    puce.appendChild(ote);
    identiteFavoris.appendChild(puce);
  });

  if(identiteFavorisTitre){
    identiteFavorisTitre.textContent = 'Pokémon préférés — ' + liste.length
      + ' sur ' + CARTE_FAVORIS_MAX;
  }
  // Le champ disparaît à trois, comme celui de l'équipe à six : un champ qui
  // refuse vaut moins qu'un champ qui n'est pas là.
  if(identiteCherche){
    identiteCherche.hidden = liste.length >= CARTE_FAVORIS_MAX;
    if(identiteCherche.hidden && identiteTrouves) identiteTrouves.innerHTML = '';
  }
}

function identiteMajTrouves(){
  if(!identiteTrouves || !identiteCherche) return;
  identiteTrouves.innerHTML = '';
  partiesChercher(identiteCherche.value.trim()).forEach(function(e){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'partie-trouve';
    b.appendChild(partiesVignette(e, 24));
    const n = document.createElement('span');
    n.textContent = nomAffiche(e);
    b.appendChild(n);
    b.addEventListener('click', function(){
      if(!carte.favoris) carte.favoris = [];
      if(carte.favoris.indexOf(e.name) === -1
         && carte.favoris.length < CARTE_FAVORIS_MAX){
        carte.favoris.push(e.name);
        carteEnregistrer();
        identiteCherche.value = '';
        identiteTrouves.innerHTML = '';
        dessinerFavoris();
      }
    });
    identiteTrouves.appendChild(b);
  });
}

if(identiteJeu){
  identiteJeu.addEventListener('change', function(){
    carte.jeu = identiteJeu.value;
    carteEnregistrer();
  });
}
if(identiteSpinoff){
  // La valeur n'est plus posée ici : identiteRemplirSpinoffs() la choisit une
  // fois les options en place — un <select> ne retient pas une valeur dont
  // l'option n'existe pas encore.
  identiteSpinoff.addEventListener('change', function(){
    carte.spinoff = identiteSpinoff.value;
    carteEnregistrer();
  });
}
if(identitePhrase){
  identitePhrase.value = carte.phrase || '';
  identitePhrase.addEventListener('change', function(){
    carte.phrase = identitePhrase.value.trim();
    carteEnregistrer();
  });
}
if(identiteCherche) identiteCherche.addEventListener('input', identiteMajTrouves);

// ---- Le serveur -------------------------------------------------------------
//
// LE LOCAL DESSINE, LE SERVEUR TRANCHE. La carte est lue du localStorage à la
// première ligne de ce fichier, donc la page Profil est remplie avant le
// moindre aller-retour. `partiesSynchroniser()` passe derrière et adopte la
// version du serveur, qui est la seule à valoir d'une machine à l'autre.
//
// LE PREMIER ENVOI EST UN CAS À PART, et c'est le seul endroit où l'on ne
// prend pas le serveur au mot. Une carte remplie avant que les tables
// n'existent ne vit que sur ce disque : l'adopter aveuglément l'effacerait
// pour de bon. Quand le serveur ne connaît RIEN et que le local dit quelque
// chose, c'est le local qui monte.
//
// Le sens inverse — serveur rempli, local vide — est une machine neuve : on
// adopte, c'est exactement ce qu'on vient chercher en se connectant ailleurs.

const carteInvoke = window.__TAURI__ && window.__TAURI__.core
                  && window.__TAURI__.core.invoke;

// Tant qu'on n'a pas lu le serveur une fois, on ne lui écrit pas : sans ce
// verrou, la première frappe monterait une carte que la lecture n'a pas encore
// eu le temps de compléter, et l'écraserait avec ce que cette machine avait.
let carteEnLigne = false;
let carteMinuteur = null;

function carteRanger(cle, valeur){
  try{ localStorage.setItem(cle, JSON.stringify(valeur)); }
  catch(e){ /* stockage refusé : la session en garde la trace, pas le disque */ }
}

/** Y a-t-il quelque chose à montrer ? Sert des deux côtés du premier envoi. */
function carteEstVide(c, p){
  const remplie = c && (c.jeu || c.spinoff || c.phrase
                        || (c.favoris && c.favoris.length));
  return !remplie && !(p && Object.keys(p).length);
}

/**
 * Monte la carte, une fois les frappes retombées.
 *
 * GROUPÉ, comme l'enregistrement du dex : cocher trois Pokémon d'affilée dans
 * une équipe ne doit pas faire trois écritures. Le dernier appel gagne, et il
 * emporte l'état complet — il n'y a donc rien à perdre à annuler les autres.
 */
function carteMonter(){
  if(!carteInvoke || !carteEnLigne) return;
  clearTimeout(carteMinuteur);
  carteMinuteur = setTimeout(function(){
    carteInvoke('carte_ecrire', { donnees: { carte: carte, parties: parties } })
      .catch(function(){ /* hors ligne : le local garde tout, on remontera */ });
  }, 700);
}

/** Redessine les quatre morceaux d'un coup, après adoption comme au chargement. */
function partiesToutDessiner(){
  identiteRemplirJeux();
  identiteRemplirSpinoffs();
  if(identitePhrase) identitePhrase.value = carte.phrase || '';
  dessinerFavoris();
  partiesRemplirMenu();
  dessinerParties();
}

/**
 * Va chercher la carte du serveur. Appelée par compte.js à l'ouverture de
 * session, et silencieuse en cas d'échec : sans réseau, le local suffit.
 */
async function partiesSynchroniser(){
  if(!carteInvoke) return;
  let distant;
  try{
    distant = await carteInvoke('carte');
  }catch(e){
    return;   // pas de session, ou API injoignable : le local reste la vérité
  }
  if(!distant) return;
  carteEnLigne = true;

  const d = distant.carte || {};
  const dp = (distant.parties && typeof distant.parties === 'object')
    ? distant.parties : {};

  if(carteEstVide(d, dp) && !carteEstVide(carte, parties)){
    carteMonter();          // premier envoi : c'est cette machine qui a raison
    return;
  }

  carte = {
    jeu: d.jeu || '',
    spinoff: d.spinoff || '',
    favoris: Array.isArray(d.favoris) ? d.favoris : [],
    phrase: d.phrase || ''
  };
  parties = dp;
  partieOuverte = null;     // le jeu déplié n'existe peut-être plus
  carteRanger(CARTE_CLE, carte);
  carteRanger(PARTIES_CLE, parties);
  partiesToutDessiner();
}

// ---- Chez les autres --------------------------------------------------------

/**
 * La carte de quelqu'un d'autre, en lecture seule.
 *
 * ELLE VIT ICI ET NON DANS compte.js, parce que c'est ici que sont le
 * vocabulaire — « Fini », « Abandonné » —, les vignettes d'espèce et la
 * résolution d'un slug en Pokémon. Les redéfinir là-bas aurait fait deux
 * référentiels à tenir d'accord, et le second aurait dérivé au premier jeu
 * ajouté.
 *
 * Rend `null` quand il n'y a rien à montrer : la fiche saute alors le bloc au
 * lieu d'afficher un cadre vide.
 */
function carteBlocPublic(c, p){
  c = c || {};
  p = (p && typeof p === 'object') ? p : {};
  if(carteEstVide(c, p)) return null;

  const bloc = document.createElement('div');
  bloc.className = 'carte-publique';

  // --- Ce qu'il aime --------------------------------------------------------
  const jeu = (typeof partiesJeu === 'function') ? partiesJeu(c.jeu) : null;
  const gouts = [];
  if(jeu) gouts.push(['Jeu préféré', jeu.tab]);
  if(c.spinoff) gouts.push(['Spin-off préféré', c.spinoff]);

  if(gouts.length){
    const rangee = document.createElement('div');
    rangee.className = 'carte-publique-gouts';
    gouts.forEach(function(g){
      const cell = document.createElement('div');
      const t = document.createElement('span');
      t.className = 'partie-champ-nom';
      t.textContent = g[0];
      const v = document.createElement('strong');
      v.textContent = g[1];
      cell.appendChild(t); cell.appendChild(v);
      rangee.appendChild(cell);
    });
    bloc.appendChild(rangee);
  }

  // --- Ses Pokémon préférés -------------------------------------------------
  if(c.favoris && c.favoris.length){
    const zone = document.createElement('div');
    zone.className = 'carte-publique-zone';
    const t = document.createElement('div');
    t.className = 'partie-champ-nom';
    t.textContent = c.favoris.length > 1 ? 'Ses Pokémon préférés' : 'Son Pokémon préféré';
    zone.appendChild(t);
    const rangee = document.createElement('div');
    rangee.className = 'partie-rangee';
    c.favoris.forEach(function(slug){
      const e = partiesEntree(slug);
      const puce = document.createElement('span');
      puce.className = 'partie-membre';
      if(e) puce.appendChild(partiesVignette(e, 34));
      const n = document.createElement('span');
      n.textContent = e ? nomAffiche(e) : slug;
      puce.appendChild(n);
      // La fiche s'ouvre au clic : un nom de Pokémon affiché ailleurs dans
      // l'application est toujours cliquable, celui-ci ne fera pas exception.
      if(e && typeof openPreview === 'function'){
        puce.classList.add('cliquable');
        puce.setAttribute('role', 'button');
        puce.setAttribute('tabindex', '0');
        puce.title = 'Voir la fiche de ' + nomAffiche(e);
        const ouvrir = function(){ openPreview(e); };
        puce.addEventListener('click', ouvrir);
        puce.addEventListener('keydown', function(ev){
          if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); ouvrir(); }
        });
      }
      rangee.appendChild(puce);
    });
    zone.appendChild(rangee);
    bloc.appendChild(zone);
  }

  // --- Sa phrase ------------------------------------------------------------
  if(c.phrase){
    const ph = document.createElement('p');
    ph.className = 'carte-publique-phrase';
    ph.textContent = c.phrase;
    bloc.appendChild(ph);
  }

  // --- Ses jeux -------------------------------------------------------------
  //
  // Même ordre que chez soi : celui de GAMES, donc celui de sortie. Une liste
  // triée autrement chez les autres se lirait comme une autre liste.
  const cles = Object.keys(p);
  if(cles.length){
    if(typeof GAMES !== 'undefined'){
      const rang = {};
      GAMES.forEach(function(g, i){ rang[g.key] = i; });
      cles.sort(function(a, b){
        return (rang[a] === undefined ? 999 : rang[a])
             - (rang[b] === undefined ? 999 : rang[b]);
      });
    }
    const zone = document.createElement('div');
    zone.className = 'carte-publique-zone';
    const t = document.createElement('div');
    t.className = 'partie-champ-nom';
    t.textContent = cles.length > 1 ? 'Ses ' + cles.length + ' jeux' : 'Son jeu';
    zone.appendChild(t);

    cles.forEach(function(cle){
      const partie = p[cle] || {};
      const g = (typeof partiesJeu === 'function') ? partiesJeu(cle) : null;
      const ligne = document.createElement('div');
      ligne.className = 'carte-publique-jeu';

      const nom = document.createElement('span');
      nom.className = 'partie-nom';
      nom.textContent = g ? g.tab : cle;
      ligne.appendChild(nom);

      const equipe = document.createElement('span');
      equipe.className = 'partie-equipe-mini';
      (partie.equipe || []).forEach(function(slug){
        const e = partiesEntree(slug);
        if(!e) return;
        const v = partiesVignette(e, 26);
        v.title = nomAffiche(e);       // pas de place pour les noms : ils passent au survol
        equipe.appendChild(v);
      });
      ligne.appendChild(equipe);

      const resume = partiesResume(partie);
      if(resume){
        const r = document.createElement('span');
        r.className = 'partie-resume';
        r.textContent = resume;
        ligne.appendChild(r);
      }

      const etat = document.createElement('span');
      etat.className = 'partie-etat partie-etat-' + (partie.etat || 'en-cours');
      etat.textContent = partiesMotEtat(partie.etat);
      ligne.appendChild(etat);
      zone.appendChild(ligne);

      if(partie.note){
        const note = document.createElement('p');
        note.className = 'carte-publique-note';
        note.textContent = partie.note;
        zone.appendChild(note);
      }
    });
    bloc.appendChild(zone);
  }

  return bloc;
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
  // heures, debut et fin a null : « je ne sais plus » est l'etat normal d'un
  // souvenir, et ce n'est pas « zero heure le 1er janvier ».
  return { etat: 'en-cours', equipe: [], note: '', heures: null, debut: null, fin: null };
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

// Un premier dessin au chargement : les menus et les champs n'attendent
// personne, et ce que la machine a déjà vaut mieux qu'un cadre vide.
//
// IL EST INCOMPLET, ET C'EST ATTENDU. `allEntries` se remplit dans app.js,
// chargé après celui-ci : les vignettes manquent encore à cet instant. C'est
// showPage('profil') qui redessine — on ne peut pas atteindre la page avant que
// l'application ait fini de démarrer. partiesSynchroniser() repasse une
// troisième fois quand la session s'ouvre, avec ce que dit le serveur.
partiesToutDessiner();
