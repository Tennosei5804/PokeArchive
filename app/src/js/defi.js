// Le défi du jour : un Pokémon, un jeu, et rien d'obligatoire.
//
// Script classique, chargé APRÈS formes.js (speciesForVariant, poolEntries) et
// photos.js (demanderPhoto, vignettePhoto).
//
// CE QUE C'EST, ET CE QUE CE N'EST PAS. Ce n'est pas une tâche, pas une série à
// tenir, pas un compteur qui rougit quand on saute un jour. C'est un prétexte —
// « tiens, celui-là, aujourd'hui » — et son vrai objet est la photo qu'on en
// sort. Un carnet de collection n'a pas à se comporter comme une application
// d'habitudes.
//
// D'où l'absence de série consécutive. On compte combien de défis ont été
// relevés, jamais combien de jours d'affilée : le second chiffre punit ceux qui
// ne jouent pas tous les soirs, et ils sont la majorité.
//
// LE TIRAGE N'APPELLE AUCUN SERVEUR. Il se déduit de la date, par le même
// générateur amorcé que le programme du soir : deux machines, deux pays, la
// même journée donnent le même Pokémon. Rien à synchroniser, rien à stocker,
// et cela marche hors ligne — ce qui est la moitié de l'intérêt.
//
// AUCUN JEU N'EST NOMMÉ, et c'est voulu. Le défi dit « celui-là », pas « celui-là
// dans Rouge/Bleu » : n'importe quel jeu fait l'affaire, y compris celui auquel
// on joue ce soir. Nommer un jeu écartait d'office ceux qui ne l'ont pas, pour
// un défi qui n'a rien d'obligatoire — le coût était réel, le gain nul.
//
// Le tirage porte donc sur TOUTES les espèces, et non sur ce qui manque. Un défi
// qui ne piocherait que dans les manquants deviendrait une corvée déguisée, et
// s'éteindrait le jour où l'on finit son dex. Tomber sur un Pokémon qu'on
// possède déjà n'est pas un défaut : c'est l'occasion de le montrer.

const DEFI_CLE_JOUR = function(d){
  // La date locale, pas l'UTC : le défi doit changer à MINUIT CHEZ SOI. En UTC,
  // il basculerait à deux heures du matin en France, en pleine session.
  const p = function(n){ return (n < 10 ? '0' : '') + n; };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
};

// Les défis relevés, gardés dans la sauvegarde comme les chasses et les
// objectifs : { jour, pokemon, dex, releve, image }. Aucune table de plus, et
// ça voyage avec l'export.
let defis = [];

// Le défi du jour, gardé le temps de la session : le tirage est bon marché,
// mais le refaire à chaque redessin de l'accueil ne servirait à rien.
let defiDuJour = null;

// ---- Le tirage --------------------------------------------------------------

/**
 * Le défi d'une date.
 *
 * SYNCHRONE, et c'est le fruit d'avoir retiré le jeu : plus rien à charger, plus
 * de Pokédex à attendre, plus de branche « liste indisponible ». Le défi paraît
 * du premier coup, hors ligne comme en ligne.
 *
 * `allEntries` et non `poolHome()` : le second dépend de `niveauFormes`, qui
 * appartient à l'aventure. Deux joueurs réglés différemment n'auraient alors pas
 * le même tirage, et le « même pour tout le monde » serait faux.
 *
 * Les espèces sont TRIÉES avant qu'on y puise : l'ordre naturel de la réserve
 * n'est garanti par rien, et il suffirait qu'il bouge d'une version à l'autre
 * pour que deux machines tombent sur deux Pokémon différents le même jour.
 */
function tirerDefi(jour){
  if(typeof allEntries === 'undefined' || !allEntries.length) return null;
  const alea = semeur(hachage('defi:' + jour));

  const especes = Array.from(new Set(allEntries.map(function(e){ return e.speciesId; })))
    .sort(function(a, b){ return a - b; });
  if(!especes.length) return null;

  const id = especes[Math.floor(alea() * especes.length)];
  // La forme de base : c'est elle qu'on montre. La réserve range les formes
  // après leur espèce, la première trouvée est donc la bonne.
  const entree = allEntries.find(function(e){ return e.speciesId === id; });
  if(!entree) return null;

  return { jour: jour, entree: entree };
}

/** Ce qui a été retenu pour ce jour-là, s'il y a quelque chose. */
function defiGarde(jour){
  return defis.find(function(d){ return d.jour === jour; }) || null;
}

/** La ligne du jour, créée à la demande — pas avant qu'on en ait besoin. */
function defiOuvrir(){
  if(!defiDuJour) return null;
  let d = defiGarde(defiDuJour.jour);
  if(!d){
    d = { jour: defiDuJour.jour, pokemon: defiDuJour.entree.name, releve: false };
    defis.push(d);
    // ON ENREGISTRE TOUT DE SUITE, et c'est ce qui manquait. La ligne était
    // créée à l'affichage mais jamais sauvegardée : elle ne partait que si
    // QUELQUE CHOSE D'AUTRE déclenchait une sauvegarde ce jour-là. L'historique
    // ne gardait donc pas les jours où l'on avait joué, mais ceux où l'on avait
    // coché un Pokémon par ailleurs — un critère qui n'a rien à voir, et des
    // trous impossibles à expliquer.
    //
    // C'est un journal : un jour où l'on a ouvert l'application et laissé filer
    // le défi en fait partie. Une sauvegarde par jour, au premier affichage.
    queueSave();
    // Deux ans de défis suffisent largement à la page ; au-delà on oublie les
    // plus vieux, sinon la sauvegarde enfle sans que personne ne les relise.
    if(defis.length > 730) defis = defis.slice(-730);
  }
  return d;
}

// ---- L'écran ----------------------------------------------------------------

function dessinerDefi(){
  if(!defiBloc) return;

  const jour = DEFI_CLE_JOUR(new Date());
  if(!defiDuJour || defiDuJour.jour !== jour) defiDuJour = tirerDefi(jour);

  defiBloc.innerHTML = '';
  // La réserve n'est pas encore chargée : l'accueil se redessine après elle, et
  // le défi paraîtra à ce moment-là. Rien à annoncer d'ici.
  if(!defiDuJour) return;

  const garde = defiGarde(jour);
  const carte = document.createElement('div');
  carte.className = 'defi-carte' + (garde && garde.releve ? ' releve' : '');

  // Le sprite, en chromatique si on l'a en chromatique : le défi montre CE
  // QU'ON A, quand on l'a.
  const chroma = possedeDefi(true);
  const cadre = document.createElement('div');
  cadre.className = 'defi-sprite';
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.alt = '';
  img.src = pokeosHomeUrl(defiDuJour.entree.id, chroma);
  img.addEventListener('error', function(){
    img.src = officialArtworkUrl(defiDuJour.entree.id, chroma);
  });
  cadre.appendChild(img);
  carte.appendChild(cadre);

  const corps = document.createElement('div');
  corps.className = 'defi-corps';

  const nom = document.createElement('div');
  nom.className = 'defi-nom';
  nom.textContent = nomAffiche(defiDuJour.entree);
  corps.appendChild(nom);

  const ou = document.createElement('div');
  ou.className = 'defi-jeu';
  // Aucun jeu nommé : le défi vaut partout. La ligne dit donc la seule chose qui
  // reste utile — d'où il sort, et qu'il ne t'impose pas de cartouche.
  ou.textContent = 'Tiré au sort pour aujourd’hui  ·  n’importe quel jeu';
  corps.appendChild(ou);

  const etat = document.createElement('div');
  etat.className = 'defi-etat';
  etat.textContent = possedeDefi(false)
    ? (chroma ? 'Tu l’as, et en chromatique.' : 'Tu l’as déjà — montre-le.')
    : 'Il te manque encore. Aujourd’hui, peut-être.';
  corps.appendChild(etat);
  carte.appendChild(corps);

  const actions = document.createElement('div');
  actions.className = 'defi-actions';

  // La photo, facultative — c'est le mot du cahier des charges et c'est aussi
  // le bon réglage : un défi qui EXIGE une photo devient une corvée.
  if(typeof vignettePhoto === 'function'){
    const d = defiOuvrir();
    actions.appendChild(vignettePhoto(d, function(){
      d.releve = true;               // poser une photo, c'est relever
      queueSave();
      dessinerDefi();
    }, 'defi'));
  }

  const bouton = document.createElement('button');
  bouton.type = 'button';
  bouton.className = 'toggle-btn' + (garde && garde.releve ? '' : ' primary');
  bouton.textContent = (garde && garde.releve) ? '✓ Relevé' : 'Relever';
  bouton.title = (garde && garde.releve)
    ? 'Clique pour revenir en arrière'
    : 'Sans photo, si tu préfères';
  bouton.addEventListener('click', function(){
    const d = defiOuvrir();
    d.releve = !d.releve;
    queueSave();
    dessinerDefi();
  });
  actions.appendChild(bouton);
  carte.appendChild(actions);

  defiBloc.appendChild(carte);

  // Le compte, et la porte vers les précédents. Pas de série consécutive :
  // voir l'en-tête de ce fichier.
  const faits = defis.filter(function(d){ return d.releve; }).length;
  const passes = defis.filter(function(d){ return d.jour !== jour; }).length;
  if(faits || passes){
    const note = document.createElement('p');
    note.className = 'defi-compte';
    note.textContent = faits
      ? faits + (faits > 1 ? ' défis relevés' : ' défi relevé') + ' en tout.'
      : 'Aucun défi relevé pour l’instant.';
    if(passes){
      const lien = document.createElement('button');
      lien.type = 'button';
      lien.className = 'defi-lien';
      lien.textContent = 'Voir les précédents';
      lien.addEventListener('click', ouvrirDefisPasses);
      note.appendChild(document.createTextNode('  '));
      note.appendChild(lien);
    }
    defiBloc.appendChild(note);
  }
}

// ---- Les précédents ---------------------------------------------------------

/**
 * L'historique.
 *
 * Il montre TOUT ce qui est gardé, relevé ou non. Ne lister que les réussites
 * ferait un palmarès ; c'est un journal qu'on veut — savoir ce qui est passé
 * un mardi de septembre, et qu'on a laissé filer, fait partie de l'histoire.
 *
 * Le jour en cours en est exclu : il est déjà en grand juste au-dessus.
 */
function ouvrirDefisPasses(){
  if(!defisOverlay) return;
  const aujourdhui = DEFI_CLE_JOUR(new Date());
  const passes = defis.filter(function(d){ return d.jour !== aujourdhui; })
    .slice().reverse();

  const faits = passes.filter(function(d){ return d.releve; }).length;
  defisNote.textContent = passes.length + (passes.length > 1 ? ' jours gardés' : ' jour gardé')
    + '  ·  ' + faits + (faits > 1 ? ' relevés' : ' relevé');

  defisGrille.innerHTML = '';
  if(!passes.length){
    defisGrille.innerHTML = '<div class="state-msg">Rien encore. Reviens demain.</div>';
  }
  passes.forEach(function(d){ defisGrille.appendChild(carteDefiPasse(d)); });

  defisOverlay.style.display = 'flex';
  setTimeout(function(){ defisFermer.focus(); }, 10);
}

function carteDefiPasse(d){
  const carte = document.createElement('div');
  carte.className = 'defi-passe' + (d.releve ? ' releve' : '');

  // La photo si elle existe, le sprite sinon. C'est tout l'intérêt de garder
  // l'historique : la vignette d'un chromatique vaut mieux qu'une ligne de
  // texte, et c'est elle qu'on revient regarder.
  if(typeof vignettePhoto === 'function'){
    carte.appendChild(vignettePhoto(d, ouvrirDefisPasses, 'defi'));
  }

  const nom = document.createElement('span');
  nom.className = 'defi-passe-nom';
  nom.textContent = (typeof nomJournal === 'function') ? nomJournal(d.pokemon) : d.pokemon;
  carte.appendChild(nom);

  const quand = document.createElement('span');
  quand.className = 'defi-passe-jour';
  quand.textContent = d.jour;
  carte.appendChild(quand);

  return carte;
}

function fermerDefisPasses(){
  if(defisOverlay) defisOverlay.style.display = 'none';
}

if(defisFermer) defisFermer.addEventListener('click', fermerDefisPasses);
if(defisOverlay){
  defisOverlay.addEventListener('click', function(e){
    if(e.target === defisOverlay) fermerDefisPasses();
  });
}
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && defisOverlay && defisOverlay.style.display === 'flex'){
    fermerDefisPasses();
  }
});

/**
 * Le Pokémon du jour est-il coché QUELQUE PART.
 *
 * N'importe quel Pokédex compte, la collection HOME comprise : puisque le défi
 * ne nomme aucun jeu, l'avoir coché dans un seul suffit à l'avoir.
 */
function possedeDefi(chromatique){
  if(!defiDuJour) return false;
  const nom = defiDuJour.entree.name;
  const champ = chromatique ? 'shiny' : 'caught';
  return DEX_KEYS.some(function(cle){ return bucketFor(cle)[champ].has(nom); });
}
