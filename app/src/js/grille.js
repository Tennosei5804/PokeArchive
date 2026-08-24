// Grille, modales pseudo et profils, apercu d un Pokemon.
// Script classique (pas de module ES) : l'app reste ouvrable en file://

function renderList(reset){
  if(reset){
    currentFiltered = getFiltered();
    renderedCount = 0;
    lastGenHeader = null;
    listEl.innerHTML = '';
  }
  if(currentFiltered.length === 0){
    listEl.innerHTML = '<div class="state-msg">Aucun Pokémon ne correspond à ta recherche.</div>';
    loadMoreBtn.style.display = 'none';
    updateBulkBar();
    return;
  }
  // Un Pokédex de jeu affiche les pastilles d'obtention : on demande la
  // réserve des lieux au premier dessin, et la grille se redessine seule quand
  // elle arrive.
  if(typeof gameByKey !== 'undefined' && gameByKey[currentTab]
     && typeof assurerLieux === 'function') assurerLieux();

  const showHeaders = sortEl.value === 'gen';
  const fragment = document.createDocumentFragment();
  const next = currentFiltered.slice(renderedCount, renderedCount + BATCH_SIZE);
  next.forEach(function(entry){
    if(showHeaders && entry.gen !== lastGenHeader){
      const header = document.createElement('div');
      header.className = 'gen-header';
      header.textContent = genHeaderLabel(entry.gen);
      fragment.appendChild(header);
      lastGenHeader = entry.gen;
    }
    fragment.appendChild(renderCard(entry));
  });
  listEl.appendChild(fragment);
  if(typeof majLegendeObtention === 'function') majLegendeObtention();
  if(typeof majBoutonSprites === 'function') majBoutonSprites();
  renderedCount += next.length;
  loadMoreBtn.style.display = renderedCount < currentFiltered.length ? 'block' : 'none';
  updateBulkBar();
}

// Le pseudo vient du compte Discord ; l'en-tête et l'accueil s'y accordent.
function updatePlayerBadge(){
  playerNameText.textContent = playerName || 'Dresseur';
  homePlayerEl.textContent = playerName || 'Dresseur';
}

// escapeHtml sert encore à la fiche et à la visite d'un dresseur.
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, function(c){
    return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c];
  });
}

// ---- Aperçu d'un Pokémon ------------------------------------------------
// Le clic sur une carte agrandit le sprite. On réutilise la même chaîne de
// repli que la grille, en repartant du sprite déjà résolu quand il existe :
// l'image est alors déjà en cache et s'affiche instantanément.
// L'aperçu a sa propre bascule normal / shiny, indépendante de la vue de la
// grille : on veut pouvoir regarder un chromatique sans changer de mode.
let previewEntry = null;
let previewShiny = false;

// Deux sources pour le portrait : le sprite animé de Showdown, ou le rendu
// HOME. Un GIF ne sait pas se mettre en pause — si le système demande moins de
// mouvement, on ouvre sur le rendu fixe, le bouton restant disponible pour
// demander l'animation malgré tout.
let previewSource = window.matchMedia
  && window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'rendu' : 'anime';

function majBoutonsSource(){
  if(!portraitSource) return;
  portraitSource.querySelectorAll('button').forEach(function(b){
    b.classList.toggle('actif', b.dataset.source === previewSource);
  });
}

if(portraitSource){
  portraitSource.addEventListener('click', function(e){
    const b = e.target.closest('button[data-source]');
    if(!b || b.dataset.source === previewSource) return;
    previewSource = b.dataset.source;
    majBoutonsSource();
    dessinerPreviewImage(null);
  });
}

// Showdown ne sert pas ses GIF à une taille unique : Bulbizarre fait 45 × 49,
// Dracolosse 85 × 98, Kyogre 234 × 55. La fiche les posait tous en 170 × 196 —
// la taille relevée sur Dracolosse seul — ce qui gonflait les petits de quatre
// fois et écrasait Kyogre d'un rapport de 4,25:1 à 0,87:1.
//
// On double donc chaque sprite d'après SA taille. Quand le double déborderait
// du cadre, on se contente du facteur qui tient : mieux vaut un Lugia à 1,7×
// qu'un Lugia rogné. Le rapport est gardé dans les deux cas.
function dimensionnerSpriteAnime(){
  if(!previewFrame.classList.contains('anime')) return;
  const l = previewImg.naturalWidth, h = previewImg.naturalHeight;
  if(!l || !h) return;
  // La modale peut être encore masquée quand le GIF arrive : on retombe alors
  // sur la largeur que le CSS donne au portrait.
  const cadre = (previewFrame.clientWidth || 264) * 0.92;
  const haut  = (previewFrame.clientHeight || 264) * 0.92;
  const facteur = Math.min(2, cadre / l, haut / h);
  previewImg.style.width  = Math.round(l * facteur) + 'px';
  previewImg.style.height = Math.round(h * facteur) + 'px';
  // Le plus proche voisin ne sert que le double exact ; sur une réduction il
  // donne des pixels de tailles inégales, et le lissage rend mieux.
  previewFrame.classList.toggle('ajuste', facteur < 2);
}

function oublierDimensionAnime(){
  previewImg.style.width = '';
  previewImg.style.height = '';
  previewFrame.classList.remove('ajuste');
}

function dessinerPreviewImage(resolvedSrc){
  previewFrame.classList.toggle('chromatique', previewShiny);
  previewImg.alt = nomAffiche(previewEntry);
  previewImg.style.display = '';
  oublierDimensionAnime();
  majBoutonsSource();
  // La carte a peut-être déjà trouvé son image : on la réutilise (elle est en
  // cache, l'affichage est instantané). Sinon on rejoue la même cascade que la
  // grille, sans quoi la pop-up resterait sur une URL qui n'existe pas.
  const chain = [];
  // Le sprite animé passe devant quand on le demande. Il n'existe pas pour
  // toutes les formes : la chaîne habituelle reprend derrière, et la classe
  // « anime » ne tient que tant qu'on est sur cette première image.
  const anime = previewSource === 'anime'
    ? spriteAnimeUrl(toShowdownSlug(previewEntry.name), previewShiny) : null;
  if(anime) chain.push(anime);
  previewFrame.classList.toggle('anime', !!anime);
  if(resolvedSrc && resolvedSrc !== anime) chain.push(resolvedSrc);
  if(!previewEntry.spriteOnly){
    chain.push(pokeosHomeUrl(previewEntry.id, previewShiny));
    chain.push(officialArtworkUrl(previewEntry.id, previewShiny));
  }
  const slugs = previewEntry.spriteOnly
    ? showdownFormCandidates(previewEntry.name)
    : [toShowdownSlug(previewEntry.name)];
  slugs.forEach(function(s){ chain.push(showdownSpriteUrl(s, previewShiny)); });

  let step = 0;
  previewImg.onerror = function(){
    step++;
    // Dès qu'on quitte le sprite animé, l'image n'est plus un GIF doublé :
    // sans ça un rendu HOME héritait du rendu pixelisé et de sa taille calculée.
    previewFrame.classList.remove('anime');
    oublierDimensionAnime();
    if(step < chain.length) previewImg.src = chain[step];
    else previewImg.style.display = 'none';
  };
  // Le GIF ne dit sa taille qu'une fois chargé : c'est là qu'on la double.
  previewImg.onload = dimensionnerSpriteAnime;
  previewImg.src = chain[0];

  const gen = GEN_RANGES.find(function(g){ return g.gen === previewEntry.gen; });
  previewMeta.innerHTML = '';
  [
    'Pokédex national',
    null,                                   // la puce de génération, à part
    previewShiny ? 'forme chromatique' : 'forme normale'
  ].forEach(function(t, i){
    const el = document.createElement('span');
    if(i === 1){
      el.className = 'gen-puce';
      el.textContent = 'Gén. ' + previewEntry.gen;
    } else {
      el.textContent = t;
    }
    previewMeta.appendChild(el);
  });
}

function dessinerPreviewEtats(){
  previewStates.innerHTML = '';
  const locked = isShinyLocked(previewEntry);
  const modeApercu = infoMode(modeCourant());
  [
    { cle:'normal', label:'⬤ Normal', on: caughtSet.has(previewEntry.name), gold:false, off:false },
    { cle:'shiny',  label:'✨ Shiny',  on: shinySet.has(previewEntry.name),  gold:true,  off:locked }
  ].forEach(function(s){
    const el = document.createElement('button');
    el.type = 'button';
    const actif = (s.cle === 'shiny') === previewShiny;
    el.className = 'etat' + (s.on ? ' on' : '') + (s.gold ? ' or' : '')
      + (s.off && !s.on ? ' verrouille' : '') + (actif ? ' actif' : '');
    el.textContent = s.off && !s.on ? '🔒 Shiny-locké' : (s.label + (s.on ? ' ✓' : ''));
    // La coche dit « je l'ai » ; ce que « avoir » veut dire dépend de l'aventure.
    el.title = 'Afficher la forme ' + (s.cle === 'shiny' ? 'chromatique' : 'normale')
      + (s.on ? '  ·  ' + modeApercu.verbe : '');
    // Cliquer bascule l'image affichée, sans toucher à la progression.
    el.addEventListener('click', function(){
      previewShiny = (s.cle === 'shiny');
      dessinerPreviewImage(null);
      dessinerPreviewEtats();
    });
    previewStates.appendChild(el);
  });
}

function openPreview(entry, resolvedSrc){
  previewEntry = entry;
  previewShiny = shinyView;      // on ouvre sur la forme de la vue courante
  previewName.textContent = nomAffiche(entry);
  previewNo.textContent = '#' + String(entry.speciesId || entry.id).padStart(4, '0');
  dessinerPreviewImage(resolvedSrc);
  dessinerPreviewEtats();

  previewOverlay.style.display = 'flex';
  setTimeout(function(){ previewClose.focus(); }, 10);
  // Types, première apparition et disponibilité arrivent après l'affichage :
  // la pop-up s'ouvre instantanément, les données se remplissent ensuite.
  remplirFiche(entry);
}

function closePreview(){
  previewOverlay.style.display = 'none';
  previewImg.removeAttribute('src');
  arreterCri();
}

previewClose.addEventListener('click', closePreview);
previewOverlay.addEventListener('click', function(e){
  if(e.target === previewOverlay) closePreview();
});
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && previewOverlay.style.display === 'flex') closePreview();
});

