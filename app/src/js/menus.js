// Menus deroulants stylises.
// Script classique (pas de module ES) : l'app reste ouvrable en file://

// La liste ouverte d'un <select> natif est dessinee par le systeme : ni sa
// forme, ni ses couleurs, ni son surlignage ne sont modifiables en CSS. On
// garde donc le <select> — invisible mais bien present, pour que tout le reste
// du code continue de lire sa .value — et on affiche par-dessus un bouton et
// une liste que l'on maitrise entierement.
const enhancedSelects = [];

// DEUX FORMES POUR UN MEME MENU, ET LE NOMBRE D'OPTIONS TRANCHE.
//
// La molette — une colonne qui defile et s'aimante au centre — vaut pour les
// longues listes : vingt-quatre jeux ou cent capacites ne tiennent pas a
// l'ecran, et la faire tourner est plus direct que traquer une barre de
// defilement. En dessous, elle nuit : faire pivoter une colonne pour choisir
// entre « Francais » et « English » demande un geste la ou deux lignes cote a
// cote se lisent d'un coup.
//
// Six est le seuil, et c'est un reglage, pas une loi : le baisser a 2 met la
// molette absolument partout, le monter a 99 la retire. Rien d'autre a changer.
const ROULETTE_MINIMUM = 6;

// Le mouvement doux derange certaines personnes, et le systeme le dit.
function sansAnimation(){
  return window.matchMedia
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function enhanceSelect(sel){
  const wrap = document.createElement('div');
  wrap.className = 'select-wrap';
  sel.parentNode.insertBefore(wrap, sel);
  wrap.appendChild(sel);
  sel.classList.add('select-native');

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'select-btn';
  btn.setAttribute('aria-haspopup', 'listbox');
  btn.setAttribute('aria-expanded', 'false');
  if(sel.getAttribute('aria-label')) btn.setAttribute('aria-label', sel.getAttribute('aria-label'));

  const label = document.createElement('span');
  label.className = 'select-label';
  const arrow = document.createElement('span');
  arrow.className = 'select-arrow';
  btn.appendChild(label);
  btn.appendChild(arrow);

  const list = document.createElement('div');
  list.className = 'select-list';
  list.setAttribute('role', 'listbox');

  wrap.appendChild(btn);
  wrap.appendChild(list);

  function sync(){
    const opt = sel.options[sel.selectedIndex];
    label.textContent = opt ? opt.textContent : '';
    btn.disabled = sel.disabled;
    btn.classList.toggle('filtering', sel.classList.contains('filtering'));
  }

  function close(){
    wrap.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  }

  // Les options reellement proposables. « N° du jeu » disparait hors d'un jeu,
  // et les types se chargent a la demande : la liste n'est jamais figee.
  function optionsVisibles(){
    return Array.prototype.filter.call(sel.options, function(opt){
      return !opt.hidden && !opt.disabled;
    });
  }

  // Le seul endroit qui ecrit dans le <select>. Le garde sur l'egalite evite de
  // signaler un changement qui n'en est pas un — la molette repasse par la
  // valeur courante des qu'on la fait osciller.
  function choisir(valeur){
    if(sel.value === valeur) return;
    sel.value = valeur;
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    sync();
  }

  // ---- La liste plate, pour les menus courts -------------------------------

  function dessinerListe(options){
    list.className = 'select-list';
    list.innerHTML = '';
    options.forEach(function(opt){
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'select-item' + (opt.value === sel.value ? ' selected' : '');
      item.textContent = opt.textContent;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(opt.value === sel.value));
      item.addEventListener('click', function(){
        close();
        choisir(opt.value);
      });
      list.appendChild(item);
    });
    const current = list.querySelector('.selected');
    if(current) current.focus();
  }

  // ---- La molette, pour les menus longs ------------------------------------

  /**
   * Une colonne qui defile et s'aimante au cran le plus proche.
   *
   * L'AIMANT EST EN CSS, PAS EN JAVASCRIPT. `scroll-snap-type: y mandatory`
   * fait le travail, et il le fait mieux : il suit le doigt sur un ecran
   * tactile, respecte l'inertie du systeme, et ne consomme rien entre deux
   * gestes. Une animation ecrite a la main aurait eu a reimplementer tout cela,
   * moins bien.
   *
   * LA GEOMETRIE SE MESURE, ELLE NE SE RECOPIE PAS. La hauteur d'un cran vient
   * du CSS ; le rembourrage qui permet au premier et au dernier d'atteindre le
   * centre s'en deduit ici. Ecrire les deux a la main, c'etait deux nombres a
   * tenir d'accord, et un decalage d'une ligne le jour ou l'un bouge.
   */
  function dessinerRoulette(options){
    list.className = 'select-list roulette';
    list.innerHTML = '';

    const piste = document.createElement('div');
    piste.className = 'roulette-piste';
    piste.tabIndex = 0;
    const fenetre = document.createElement('div');
    fenetre.className = 'roulette-fenetre';
    list.appendChild(piste);
    list.appendChild(fenetre);

    options.forEach(function(opt, i){
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'roulette-item';
      item.textContent = opt.textContent;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(opt.value === sel.value));
      item.addEventListener('click', function(){
        if(vise() === i){ close(); choisir(opt.value); }
        else pointer(i, true);
      });
      piste.appendChild(item);
    });

    const items = Array.prototype.slice.call(piste.children);
    if(!items.length) return;

    // Mesure, puis deduction. Le cran vient du CSS, le reste en decoule.
    const cran = items[0].offsetHeight;
    const marge = Math.max(0, (piste.clientHeight - cran) / 2);
    piste.style.paddingTop = marge + 'px';
    piste.style.paddingBottom = marge + 'px';
    fenetre.style.height = cran + 'px';

    function vise(){
      const i = Math.round(piste.scrollTop / cran);
      return Math.max(0, Math.min(options.length - 1, i));
    }

    function pointer(i, doux){
      piste.scrollTo({ top: i * cran, behavior: (doux && !sansAnimation()) ? 'smooth' : 'auto' });
    }

    // Le relief : l'ecart au centre commande l'opacite et l'echelle. Sans lui
    // on ne lit pas une molette mais une liste qui glisse, et le cran actif ne
    // se distingue de ses voisins que par la bande du milieu.
    function peindre(){
      const centre = piste.scrollTop / cran;
      const actif = Math.round(centre);
      items.forEach(function(it, i){
        const d = Math.min(Math.abs(i - centre), 3);
        it.style.opacity = String(1 - d * 0.26);
        it.style.transform = 'scale(' + (1 - d * 0.06) + ')';
        it.classList.toggle('au-centre', i === actif);
      });
    }

    // ON NE VALIDE QU'A L'ARRET. Emettre `change` a chaque cran traverse ferait
    // repartir le rendu de la page derriere — la grille du Pokedex, la liste des
    // verrous — a chaque pixel de defilement. L'arret est le moment ou le geste
    // veut dire quelque chose.
    let peinture = null;
    let repos = null;
    piste.addEventListener('scroll', function(){
      if(peinture) cancelAnimationFrame(peinture);
      peinture = requestAnimationFrame(peindre);
      if(repos) clearTimeout(repos);
      repos = setTimeout(function(){
        // Un gestionnaire de `change` a pu refermer la fenetre entre-temps :
        // on ne parle pas au nom d'un menu qui n'est plus a l'ecran.
        if(!piste.isConnected) return;
        const opt = options[vise()];
        if(opt) choisir(opt.value);
      }, 160);
    });

    piste.addEventListener('keydown', function(e){
      if(e.key === 'ArrowDown'){ e.preventDefault(); pointer(Math.min(vise() + 1, options.length - 1), true); }
      if(e.key === 'ArrowUp'){ e.preventDefault(); pointer(Math.max(vise() - 1, 0), true); }
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        const opt = options[vise()];
        close();
        if(opt) choisir(opt.value);
      }
      if(e.key === 'Escape'){ close(); btn.focus(); }
    });

    // Ouverture SUR la valeur courante, et sans animation : arriver en haut
    // puis defiler jusqu'a la bonne ligne donnerait le tournis a chaque clic.
    let depart = 0;
    options.forEach(function(o, i){ if(o.value === sel.value) depart = i; });
    pointer(depart, false);
    peindre();
    piste.focus();
  }

  // ---- L'ouverture ---------------------------------------------------------

  function open(){
    // Un seul menu ouvert a la fois.
    enhancedSelects.forEach(function(o){ if(o.wrap !== wrap) o.close(); });
    // AVANT de dessiner : la molette se mesure, et un element masque n'a pas de
    // hauteur. Ouvrir d'abord, remplir ensuite.
    wrap.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');

    // La liste est reconstruite a chaque ouverture : les options changent
    // (types charges a la demande, « N° du jeu » masque hors d'un jeu).
    const options = optionsVisibles();
    if(options.length >= ROULETTE_MINIMUM) dessinerRoulette(options);
    else dessinerListe(options);
  }

  btn.addEventListener('click', function(){
    if(wrap.classList.contains('open')) close(); else open();
  });
  btn.addEventListener('keydown', function(e){
    if(e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(); }
  });
  list.addEventListener('keydown', function(e){
    // La molette gere ses propres touches, sur la piste.
    if(list.classList.contains('roulette')) return;
    if(e.key === 'Escape'){ close(); btn.focus(); return; }
    const items = Array.prototype.slice.call(list.querySelectorAll('.select-item'));
    const i = items.indexOf(document.activeElement);
    if(e.key === 'ArrowDown'){ e.preventDefault(); (items[i + 1] || items[0]).focus(); }
    if(e.key === 'ArrowUp'){ e.preventDefault(); (items[i - 1] || items[items.length - 1]).focus(); }
  });

  sel.addEventListener('change', sync);
  enhancedSelects.push({ wrap: wrap, sync: sync, close: close });
  sync();
}

// Une valeur changee par le code (reinitialisation des filtres, bascule
// d'onglet) ne declenche pas d'evenement : on resynchronise a la demande.
function syncSelects(){
  enhancedSelects.forEach(function(o){ o.sync(); });
}

document.addEventListener('click', function(e){
  if(!e.target.closest('.select-wrap')){
    enhancedSelects.forEach(function(o){ o.close(); });
  }
});

// Tous les menus de l'application, sans exception. La liste native est
// dessinée par le système et ne se laisse ni colorer ni arrondir — d'où ce
// remplacement.
//
// C'était une liste tenue à la main, et elle a dérivé trois fois : chaque
// nouveau menu ressortait en gris système au milieu du reste, jusqu'à ce qu'on
// pense à l'ajouter ici. Le document sait quels menus il contient, pas nous.
document.querySelectorAll('select').forEach(enhanceSelect);
