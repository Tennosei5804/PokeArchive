// Menus deroulants stylises.
// Script classique (pas de module ES) : l'app reste ouvrable en file://

// La liste ouverte d'un <select> natif est dessinee par le systeme : ni sa
// forme, ni ses couleurs, ni son surlignage ne sont modifiables en CSS. On
// garde donc le <select> — invisible mais bien present, pour que tout le reste
// du code continue de lire sa .value — et on affiche par-dessus un bouton et
// une liste que l'on maitrise entierement.
const enhancedSelects = [];

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

  function open(){
    // La liste est reconstruite a chaque ouverture : les options changent
    // (types charges a la demande, « N° du jeu » masque hors d'un jeu).
    list.innerHTML = '';
    Array.prototype.forEach.call(sel.options, function(opt){
      if(opt.hidden || opt.disabled) return;
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'select-item' + (opt.value === sel.value ? ' selected' : '');
      item.textContent = opt.textContent;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', String(opt.value === sel.value));
      item.addEventListener('click', function(){
        close();
        if(sel.value === opt.value) return;
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        sync();
      });
      list.appendChild(item);
    });
    // Un seul menu ouvert a la fois.
    enhancedSelects.forEach(function(o){ if(o.wrap !== wrap) o.close(); });
    wrap.classList.add('open');
    btn.setAttribute('aria-expanded', 'true');
    const current = list.querySelector('.selected');
    if(current) current.focus();
  }

  btn.addEventListener('click', function(){
    if(wrap.classList.contains('open')) close(); else open();
  });
  btn.addEventListener('keydown', function(e){
    if(e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' '){ e.preventDefault(); open(); }
  });
  list.addEventListener('keydown', function(e){
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
