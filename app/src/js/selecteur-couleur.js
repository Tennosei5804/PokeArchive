// Le sélecteur de couleur.
//
// Celui du navigateur — l'input type="color" — ouvre la boîte du système. Elle
// fait le travail, mais elle ne sait rien de l'application : elle s'affiche
// dans son propre thème, elle ne dit pas à quoi la couleur va servir, et
// surtout elle ne dit pas ce qui compte ici, à savoir si le résultat restera
// lisible. On voit trois nombres, R, G et B, et on devine.
//
// Celui-ci sait tout cela. Il tient dans la fenêtre, il prend les couleurs de
// l'application, et il affiche en direct le contraste de la couleur choisie
// contre la surface où elle va se retrouver.
//
// CE QU'IL FAUT GARDER DE L'ANCIEN. La boîte du système avait une pipette,
// c'est ce qu'elle avait de mieux. On la reprend par l'API EyeDropper, qui est
// celle du navigateur et non celle de la boîte — présente dans le moteur de
// l'application. Le bouton n'apparaît que si elle existe : proposer une pipette
// qui ne s'ouvre pas serait pire que de ne pas en proposer.
//
// LE CARRÉ ET LE RUBAN. Le carré donne la saturation en abscisse et la valeur
// en ordonnée, le ruban donne la teinte. C'est la disposition que tout le monde
// connaît, et ce n'est pas le moment d'inventer : on choisit une couleur bien
// plus vite en la voyant qu'en tapant des nombres.
//
// Trois fonds superposés suffisent à peindre le carré, sans canvas : le noir
// qui monte, le blanc qui va vers la droite, et la teinte pure dessous. Un
// canvas aurait demandé un redessin à chaque mouvement du ruban, et flouterait
// sur les écrans à forte densité.

let selecteurBoite = null;      // le panneau, construit une seule fois
let selecteurEtat = null;       // ce qu'on est en train de choisir

const SELECTEUR_PAS = 1;        // flèches
const SELECTEUR_PAS_LONG = 10;  // flèches + majuscule

// ---- Teinte, saturation, valeur ---------------------------------------------
//
// versRvb, versHex, luminance et contraste vivent dans apparence.js : ce sont
// les mêmes, et les dupliquer ferait diverger les deux copies un jour.

function hexVersTsv(hex){
  const c = versRvb(hex) || { r:0, v:0, b:0 };
  const r = c.r/255, v = c.v/255, b = c.b/255;
  const max = Math.max(r, v, b), min = Math.min(r, v, b), d = max - min;
  let t = 0;
  if(d !== 0){
    if(max === r)      t = 60 * (((v - b) / d) % 6);
    else if(max === v) t = 60 * (((b - r) / d) + 2);
    else               t = 60 * (((r - v) / d) + 4);
  }
  if(t < 0) t += 360;
  return { t: t, s: max === 0 ? 0 : d / max, v: max };
}

function tsvVersHex(t, s, v){
  const c = v * s;
  const x = c * (1 - Math.abs(((t / 60) % 2) - 1));
  const m = v - c;
  let p;
  if(t < 60)       p = [c, x, 0];
  else if(t < 120) p = [x, c, 0];
  else if(t < 180) p = [0, c, x];
  else if(t < 240) p = [0, x, c];
  else if(t < 300) p = [x, 0, c];
  else             p = [c, 0, x];
  return versHex({ r:(p[0]+m)*255, v:(p[1]+m)*255, b:(p[2]+m)*255 });
}

// ---- Construction ------------------------------------------------------------

function construireSelecteur(){
  const b = document.createElement('div');
  b.className = 'selecteur';
  b.setAttribute('role', 'dialog');
  b.setAttribute('aria-label', 'Choisir une couleur');
  b.hidden = true;
  b.innerHTML =
      '<div class="selecteur-carre" tabindex="0" role="slider"'
    + '     aria-label="Saturation et luminosité">'
    +   '<span class="selecteur-viseur"></span>'
    + '</div>'
    + '<div class="selecteur-ruban" tabindex="0" role="slider" aria-label="Teinte"'
    + '     aria-valuemin="0" aria-valuemax="359">'
    +   '<span class="selecteur-curseur"></span>'
    + '</div>'
    + '<div class="selecteur-bas">'
    +   '<button class="selecteur-pipette" type="button" hidden'
    +   '        title="Prendre une couleur à l’écran">'
    +     '<svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">'
    +       '<path d="M10.4 2.2a1.9 1.9 0 0 1 2.7 2.7l-1 1 .8.8-1.1 1.1-.8-.8'
    +             '-4.7 4.7-2.6.6.6-2.6 4.7-4.7-.8-.8L9.3 3.1l.8.8z"'
    +           ' fill="currentColor"/>'
    +     '</svg>'
    +   '</button>'
    +   '<div class="selecteur-avant-apres">'
    +     '<span class="selecteur-avant" title="Avant"></span>'
    +     '<span class="selecteur-apres" title="Après"></span>'
    +   '</div>'
    +   '<label class="selecteur-hex">'
    +     '<span class="selecteur-diese">#</span>'
    +     '<input type="text" maxlength="7" spellcheck="false" autocomplete="off"'
    +     '       aria-label="Code hexadécimal">'
    +   '</label>'
    + '</div>'
    + '<div class="selecteur-rvb">'
    +   '<label>R<input type="number" min="0" max="255" data-canal="r"></label>'
    +   '<label>V<input type="number" min="0" max="255" data-canal="v"></label>'
    +   '<label>B<input type="number" min="0" max="255" data-canal="b"></label>'
    + '</div>'
    + '<p class="selecteur-contraste" hidden></p>'
    + '<div class="selecteur-actions">'
    +   '<button class="selecteur-annuler" type="button">Annuler</button>'
    +   '<button class="selecteur-valider" type="button">Garder</button>'
    + '</div>';
  document.body.appendChild(b);

  const el = {
    boite:     b,
    carre:     b.querySelector('.selecteur-carre'),
    viseur:    b.querySelector('.selecteur-viseur'),
    ruban:     b.querySelector('.selecteur-ruban'),
    curseur:   b.querySelector('.selecteur-curseur'),
    pipette:   b.querySelector('.selecteur-pipette'),
    avant:     b.querySelector('.selecteur-avant'),
    apres:     b.querySelector('.selecteur-apres'),
    hex:       b.querySelector('.selecteur-hex input'),
    rvb:       [...b.querySelectorAll('.selecteur-rvb input')],
    contraste: b.querySelector('.selecteur-contraste'),
    annuler:   b.querySelector('.selecteur-annuler'),
    valider:   b.querySelector('.selecteur-valider'),
  };

  brancherCarre(el);
  brancherRuban(el);
  brancherChamps(el);

  // La pipette n'existe pas partout. Feature detection plutôt que pari sur le
  // moteur : le jour où l'application tournera ailleurs, le bouton s'effacera
  // de lui-même au lieu de mentir.
  if(typeof window.EyeDropper === 'function'){
    el.pipette.hidden = false;
    el.pipette.addEventListener('click', async function(){
      try{
        const r = await new window.EyeDropper().open();
        if(r && r.sRGBHex) poserCouleur(r.sRGBHex);
      }catch(e){ /* annulé par la personne : rien à dire */ }
    });
  }

  el.annuler.addEventListener('click', function(){ fermerSelecteur(true); });
  el.valider.addEventListener('click', function(){ fermerSelecteur(false); });

  selecteurBoite = el;
  return el;
}

// ---- Les deux surfaces qu'on tire -------------------------------------------

function positionRelative(evenement, element){
  const r = element.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(1, (evenement.clientX - r.left) / r.width)),
    y: Math.max(0, Math.min(1, (evenement.clientY - r.top) / r.height)),
  };
}

function brancherCarre(el){
  const suivre = function(e){
    const p = positionRelative(e, el.carre);
    selecteurEtat.s = p.x;
    selecteurEtat.v = 1 - p.y;
    rafraichirSelecteur();
  };
  el.carre.addEventListener('pointerdown', function(e){
    el.carre.setPointerCapture(e.pointerId);
    el.carre.focus();
    suivre(e);
    e.preventDefault();
  });
  el.carre.addEventListener('pointermove', function(e){
    if(el.carre.hasPointerCapture(e.pointerId)) suivre(e);
  });
  el.carre.addEventListener('keydown', function(e){
    const pas = (e.shiftKey ? SELECTEUR_PAS_LONG : SELECTEUR_PAS) / 100;
    let pris = true;
    if(e.key === 'ArrowRight')     selecteurEtat.s = Math.min(1, selecteurEtat.s + pas);
    else if(e.key === 'ArrowLeft') selecteurEtat.s = Math.max(0, selecteurEtat.s - pas);
    else if(e.key === 'ArrowUp')   selecteurEtat.v = Math.min(1, selecteurEtat.v + pas);
    else if(e.key === 'ArrowDown') selecteurEtat.v = Math.max(0, selecteurEtat.v - pas);
    else pris = false;
    if(pris){ e.preventDefault(); rafraichirSelecteur(); }
  });
}

function brancherRuban(el){
  const suivre = function(e){
    selecteurEtat.t = positionRelative(e, el.ruban).x * 359.99;
    rafraichirSelecteur();
  };
  el.ruban.addEventListener('pointerdown', function(e){
    el.ruban.setPointerCapture(e.pointerId);
    el.ruban.focus();
    suivre(e);
    e.preventDefault();
  });
  el.ruban.addEventListener('pointermove', function(e){
    if(el.ruban.hasPointerCapture(e.pointerId)) suivre(e);
  });
  el.ruban.addEventListener('keydown', function(e){
    const pas = e.shiftKey ? SELECTEUR_PAS_LONG : SELECTEUR_PAS;
    let pris = true;
    if(e.key === 'ArrowRight' || e.key === 'ArrowUp')        selecteurEtat.t = (selecteurEtat.t + pas) % 360;
    else if(e.key === 'ArrowLeft' || e.key === 'ArrowDown')  selecteurEtat.t = (selecteurEtat.t - pas + 360) % 360;
    else pris = false;
    if(pris){ e.preventDefault(); rafraichirSelecteur(); }
  });
}

function brancherChamps(el){
  el.hex.addEventListener('input', function(){
    const brut = el.hex.value.trim().replace(/^#/, '');
    if(!/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(brut)) return;   // en cours de frappe
    poserCouleur('#' + brut, true);
  });
  el.rvb.forEach(function(champ){
    champ.addEventListener('input', function(){
      const c = versRvb(couleurCourante());
      const n = parseInt(champ.value, 10);
      if(isNaN(n)) return;
      c[champ.dataset.canal] = Math.max(0, Math.min(255, n));
      poserCouleur(versHex(c), false, true);
    });
  });
}

// ---- L'état -----------------------------------------------------------------

function couleurCourante(){
  return tsvVersHex(selecteurEtat.t, selecteurEtat.s, selecteurEtat.v);
}

/**
 * Impose une couleur, d'où qu'elle vienne : pipette, champ, ou appelant.
 *
 * Les deux drapeaux disent quel champ NE PAS réécrire. Sans eux, taper « 1a » à
 * la suite d'un champ vide le verrait normalisé en « #1a1a1a » sous les doigts,
 * et le curseur sauterait à la fin à chaque frappe.
 */
function poserCouleur(hex, saufHex, saufRvb){
  const c = versRvb(hex);
  if(!c) return;
  const tsv = hexVersTsv(versHex(c));
  // Sur un gris, la teinte n'a pas de sens : le calcul rend zéro, ce qui ferait
  // sauter le ruban à l'extrême gauche. On garde celle d'avant.
  selecteurEtat.t = tsv.s === 0 ? selecteurEtat.t : tsv.t;
  selecteurEtat.s = tsv.s;
  selecteurEtat.v = tsv.v;
  rafraichirSelecteur(saufHex, saufRvb);
}

function rafraichirSelecteur(saufHex, saufRvb){
  const el = selecteurBoite;
  const couleur = couleurCourante();
  const c = versRvb(couleur);

  el.carre.style.setProperty('--teinte-pure', tsvVersHex(selecteurEtat.t, 1, 1));
  el.viseur.style.left = (selecteurEtat.s * 100) + '%';
  el.viseur.style.top  = ((1 - selecteurEtat.v) * 100) + '%';
  el.viseur.style.background = couleur;
  el.curseur.style.left = (selecteurEtat.t / 360 * 100) + '%';
  el.curseur.style.background = tsvVersHex(selecteurEtat.t, 1, 1);

  el.carre.setAttribute('aria-valuetext',
    'saturation ' + Math.round(selecteurEtat.s * 100) + ' %, luminosité '
    + Math.round(selecteurEtat.v * 100) + ' %');
  el.ruban.setAttribute('aria-valuenow', Math.round(selecteurEtat.t));

  el.apres.style.background = couleur;
  if(!saufHex) el.hex.value = couleur.slice(1).toUpperCase();
  if(!saufRvb) el.rvb.forEach(function(x){ x.value = String(c[x.dataset.canal]); });

  direLeContraste(couleur);
  if(selecteurEtat.auChangement) selecteurEtat.auChangement(couleur);
}

/**
 * Ce que la boîte du système ne pouvait pas dire.
 *
 * La couleur choisie se retrouvera contre une surface précise — l'écriture
 * contre les cartes, un fond contre l'écriture. On donne le rapport, et le mot
 * qui va avec : 4,5 est le seuil des règles d'accessibilité pour du texte
 * courant, 3 celui des grands caractères et des traits.
 */
function direLeContraste(couleur){
  const el = selecteurBoite;
  const s = selecteurEtat.surfaces;
  if(!s || !s.length){ el.contraste.hidden = true; return; }
  const pires = s.map(function(x){
    return { ratio: contraste(couleur, x.couleur), nom: x.nom };
  }).sort(function(a, b){ return a.ratio - b.ratio; });
  const p = pires[0];
  const mot = p.ratio >= 4.5 ? 'lisible' : (p.ratio >= 3 ? 'juste' : 'illisible');
  el.contraste.hidden = false;
  el.contraste.className = 'selecteur-contraste ' + mot;
  el.contraste.textContent = 'Contraste ' + p.ratio.toFixed(1).replace('.', ',')
    + ' ' + p.nom + ' — ' + mot;
}

// ---- Ouvrir, poser, fermer ---------------------------------------------------

/** Colle le panneau à la pastille, en le rentrant s'il déborde. */
function placerSelecteur(ancre){
  const el = selecteurBoite.boite;
  const a = ancre.getBoundingClientRect();
  const marge = 8;
  el.style.visibility = 'hidden';
  el.hidden = false;
  const p = el.getBoundingClientRect();

  let gauche = a.left + a.width/2 - p.width/2;
  gauche = Math.max(marge, Math.min(window.innerWidth - p.width - marge, gauche));
  // Dessous par défaut ; au-dessus s'il n'y a pas la place, ce qui arrive quand
  // la pastille est en bas d'une page longue comme le Profil.
  let haut = a.bottom + 6;
  if(haut + p.height > window.innerHeight - marge) haut = a.top - p.height - 6;
  haut = Math.max(marge, haut);

  el.style.left = Math.round(gauche) + 'px';
  el.style.top  = Math.round(haut) + 'px';
  el.style.visibility = '';
}

// Les propriétés que le panneau se repose à lui-même. Voir figerPalette().
let selecteurFigees = [];

/**
 * Met le panneau à l'abri des couleurs qu'on est en train de choisir.
 *
 * L'aperçu en direct pose les couleurs choisies sur <html>, et tout en hérite —
 * le panneau compris. On se retrouvait à juger un vert vif dans une fenêtre
 * elle-même devenue vert vif : le fond, les boutons, la ligne de contraste, et
 * jusqu'au texte. L'instrument prenait la couleur de ce qu'il mesure.
 *
 * On repose donc les valeurs d'origine du thème sur le panneau lui-même. Les
 * propriétés personnalisées héritent : celles-ci, plus proches, l'emportent sur
 * celles de <html> pour lui et pour tout ce qu'il contient.
 *
 * Ce qui montre la couleur choisie reste juste : la pastille « après », le
 * carré et le ruban la peignent en dur, sans passer par ces variables.
 *
 * Seules les propriétés listées sont touchées, jamais l'attribut style entier :
 * il porte aussi la position du panneau.
 */
function figerPalette(boite, palette){
  selecteurFigees.forEach(function(p){ boite.style.removeProperty(p); });
  selecteurFigees = [];
  if(!palette) return;
  Object.keys(palette).forEach(function(p){
    if(!palette[p]) return;
    boite.style.setProperty(p, palette[p]);
    selecteurFigees.push(p);
  });
}

/**
 * Ouvre le sélecteur.
 *
 *   ancre         la pastille sous laquelle se poser
 *   couleur       celle de départ
 *   surfaces      [{ couleur, nom }] pour la ligne de contraste, facultatif
 *   palette       les couleurs d'origine, reposées sur le panneau pour qu'il
 *                 ne prenne pas la teinte qu'on est en train de choisir
 *   auChangement  appelée à chaque mouvement — l'application se repeint en direct
 *   aLaFin        appelée à la fermeture, avec la couleur gardée ou celle d'avant
 */
function ouvrirSelecteur(options){
  const el = selecteurBoite || construireSelecteur();
  const depart = options.couleur || '#000000';
  selecteurEtat = {
    t: 0, s: 0, v: 0,
    depart: depart,
    ancre: options.ancre,
    surfaces: options.surfaces || [],
    auChangement: options.auChangement,
    aLaFin: options.aLaFin,
  };
  const tsv = hexVersTsv(depart);
  selecteurEtat.t = tsv.t; selecteurEtat.s = tsv.s; selecteurEtat.v = tsv.v;

  el.avant.style.background = depart;
  el.boite.hidden = false;
  figerPalette(el.boite, options.palette);
  rafraichirSelecteur();
  placerSelecteur(options.ancre);
  el.carre.focus();

  document.addEventListener('pointerdown', auClicDehors, true);
  document.addEventListener('keydown', auClavierSelecteur, true);
  window.addEventListener('resize', auRedimensionnement);
}

function fermerSelecteur(revenirEnArriere){
  if(!selecteurEtat) return;
  const el = selecteurBoite;
  const finale = revenirEnArriere ? selecteurEtat.depart : couleurCourante();
  const ancre = selecteurEtat.ancre;
  const aLaFin = selecteurEtat.aLaFin;

  document.removeEventListener('pointerdown', auClicDehors, true);
  document.removeEventListener('keydown', auClavierSelecteur, true);
  window.removeEventListener('resize', auRedimensionnement);
  el.boite.hidden = true;
  selecteurEtat = null;

  if(aLaFin) aLaFin(finale, revenirEnArriere);
  // Le focus revient d'où il venait : sans cela, la tabulation repart du haut
  // de la page après chaque couleur choisie.
  if(ancre && ancre.isConnected) ancre.focus();
}

function auClicDehors(e){
  if(!selecteurEtat) return;
  if(selecteurBoite.boite.contains(e.target)) return;
  if(selecteurEtat.ancre && selecteurEtat.ancre.contains(e.target)) return;
  // Cliquer ailleurs garde la couleur : c'est ce que fait tout panneau de ce
  // genre, et l'annulation reste sur Échap et sur son bouton.
  fermerSelecteur(false);
}

function auClavierSelecteur(e){
  if(!selecteurEtat) return;
  if(e.key === 'Escape'){ e.preventDefault(); fermerSelecteur(true); }
  else if(e.key === 'Enter' && e.target !== selecteurBoite.annuler){
    e.preventDefault(); fermerSelecteur(false);
  }
}

function auRedimensionnement(){
  if(selecteurEtat) placerSelecteur(selecteurEtat.ancre);
}
