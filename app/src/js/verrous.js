// L'écran des verrous chromatiques.
// Script classique (pas de module ES) : l'application reste ouvrable en file://
//
// Il se consulte AVANT de lancer une chasse — d'où le bouton posé à côté de
// « Créer une chasse » et non dans un menu de réglages. Trois mille rencontres
// sur une espèce verrouillée, c'est l'erreur qu'on ne fait qu'une fois, et
// seulement si personne ne l'a dite avant.
//
// ---------------------------------------------------------------------------
// LE CLASSEMENT EST PAR JEU, PAS PAR GÉNÉRATION.
//
// La question qu'on se pose n'est jamais « qu'est-ce qui est verrouillé en
// cinquième génération » : c'est « je lance Épée, qu'est-ce que je ne dois pas
// chasser ». Ranger par génération obligeait à savoir de quelle génération est
// Épée avant de pouvoir chercher — un détour que personne ne fait de bon cœur.
//
// L'ordre des groupes est celui de GAMES : le référentiel existe, et deux
// listes de jeux finiraient par diverger.
//
// ---------------------------------------------------------------------------
// UNE RENCONTRE, PAS UNE ESPÈCE. Chaque ligne nomme CE QUI est verrouillé.
// « Ronflex » ne veut rien dire ; « le Ronflex qui bloque la Route 6 » se
// vérifie d'un coup d'œil, et laisse les Ronflex sauvages tranquilles.

const verrousNav = document.getElementById('verrousNav');
const verrousQ = document.getElementById('verrousQ');
const verrousCompte = document.getElementById('verrousCompte');
const verrousListe = document.getElementById('verrousListe');
const verrousBtn = document.getElementById('verrousBtn');

// Ce que dit chaque portée, en une étiquette et une phrase. Les trois ne
// disent pas la même chose, et les confondre fait renoncer à une chasse
// possible — c'est arrivé, d'où ce tableau plutôt qu'un booléen.
const PORTEES = {
  partout: {
    etiquette: 'Verrouillé partout',
    classe: 'ferme',
    phrase: 'Aucun exemplaire chromatique légitime n\'existe, dans aucun jeu.'
  },
  jeu: {
    etiquette: 'Verrouillé ici',
    classe: 'ferme',
    phrase: 'Verrouillé sur cette rencontre. L\'espèce reste chassable ailleurs.'
  },
  taux: {
    etiquette: 'Taux de base seulement',
    classe: 'tiede',
    phrase: 'La couleur est possible : ce sont les bonus de taux qui ne s\'appliquent pas.'
  }
};

// Le jeu affiché. Vide = tous. Il vit ici plutôt que dans le DOM : lire l'état
// d'un écran depuis la classe d'un bouton, c'est le perdre au premier redessin.
let verrouJeuActif = '';

// Les entrées sans jeu nommé — les fabuleux, qui n'arrivent que par
// distribution. Elles ne se rattachent à aucune version : leur donner un
// groupe à elles vaut mieux que de les recopier sous chacune des vingt-trois.
const GROUPE_HORS_JEU = {
  cle: '__distribution',
  titre: 'Par distribution, toutes versions',
  note: 'Ces Pokémon ne se rencontrent nulle part : la distribution impose leur couleur.'
};

function verrouEntree(numero){
  if(typeof allEntries === 'undefined' || !allEntries) return null;
  return allEntries.find(function(e){ return e.id === numero; }) || null;
}

// L'image, à l'époque du jeu quand elle existe.
//
// Un verrou de Rubis et Saphir montré en rendu HOME moderne, c'est un Pokémon
// qu'on ne reconnaît pas dans le jeu où on le cherche. spriteEpoqueUrl couvre
// Rouge/Bleu jusqu'à Noir 2/Blanc 2 ; au-delà il n'existe plus de sprite 2D et
// les rendus HOME sont les bons. La chaîne de repli est celle du reste de
// l'application, pas une seconde à tenir d'accord.
function verrouImage(entree, cleJeu){
  const img = document.createElement('img');
  img.loading = 'lazy';
  img.alt = '';
  img.setAttribute('aria-hidden', 'true');
  if(!entree) return img;

  const slug = (typeof toShowdownSlug === 'function') ? toShowdownSlug(entree.name) : entree.name;
  const chaine = [];
  if(cleJeu && typeof spriteEpoqueUrl === 'function'){
    const epoque = spriteEpoqueUrl(cleJeu, slug, false);
    if(epoque) chaine.push(epoque);
  }
  if(typeof pokeosHomeUrl === 'function') chaine.push(pokeosHomeUrl(entree.id, false));
  if(typeof officialArtworkUrl === 'function') chaine.push(officialArtworkUrl(entree.id, false));
  if(typeof showdownSpriteUrl === 'function') chaine.push(showdownSpriteUrl(slug, false));

  let etape = 0;
  img.addEventListener('error', function(){
    etape++;
    if(etape < chaine.length) img.src = chaine[etape];
    else img.style.visibility = 'hidden';
  });
  if(chaine.length) img.src = chaine[0];
  return img;
}

function verrouLigne(v, cleJeu){
  const entree = verrouEntree(v.espece);
  const portee = PORTEES[v.portee] || PORTEES.jeu;

  // La ligne ouvre LA CARTE, et la carte DU JEU concerné — sans quitter cet
  // écran. On revient à la liste en la fermant, ce qui est le geste qu'on
  // répète : vérifier une ligne, revenir, en vérifier une autre. Passer par le
  // Pokédex obligeait à refaire le chemin en sens inverse à chaque fois.
  //
  // LE CONTEXTE DU JEU SE RÈGLE AVANT L'OUVERTURE. remplirFiche() lit
  // currentTab d'un bout à l'autre : numéro régional mis en avant, boîte et
  // son ordre, description de l'espèce, bonheur de départ, sprite d'époque.
  // Ouvrir la carte sans l'avoir posé montrerait le Caratroc de Johto avec le
  // numéro national et la boîte du jeu précédent.
  //
  // useDexProgress() suit, parce que chaque Pokédex a sa propre collection :
  // sans lui, cocher « capturé » depuis la carte écrirait dans celle d'à côté.
  const nomPkmn = entree
    ? (typeof nomAffiche === 'function' ? nomAffiche(entree) : entree.display)
    : null;
  const ligne = document.createElement('button');
  ligne.type = 'button';
  ligne.className = 'verrou-ligne';
  if(!entree){
    ligne.disabled = true;
  } else {
    ligne.title = cleJeu
      ? 'Ouvrir la carte de ' + nomPkmn + ' pour ce jeu'
      : 'Ouvrir la carte de ' + nomPkmn;
    ligne.addEventListener('click', function(){
      if(cleJeu && typeof currentTab !== 'undefined' && currentTab !== cleJeu){
        currentTab = cleJeu;
        if(typeof useDexProgress === 'function') useDexProgress(cleJeu);
      }
      if(typeof openPreview === 'function') openPreview(entree);
    });
  }

  const vignette = document.createElement('div');
  vignette.className = 'verrou-sprite';
  vignette.appendChild(verrouImage(entree, cleJeu));
  ligne.appendChild(vignette);

  const infos = document.createElement('div');
  infos.className = 'verrou-infos';

  const titre = document.createElement('div');
  const nom = document.createElement('span');
  nom.className = 'verrou-nom';
  nom.textContent = entree
    ? (typeof nomAffiche === 'function' ? nomAffiche(entree) : entree.display)
    : ('N° ' + v.espece);
  titre.appendChild(nom);
  const num = document.createElement('span');
  num.className = 'verrou-no';
  num.textContent = '#' + String(v.espece).padStart(4, '0');
  titre.appendChild(num);
  infos.appendChild(titre);

  // LA LIGNE QUI PORTE TOUT : ce qui est verrouillé, pas qui.
  const quoi = document.createElement('div');
  quoi.className = 'verrou-quoi';
  quoi.textContent = v.rencontre;
  infos.appendChild(quoi);

  const etiq = document.createElement('div');
  etiq.className = 'verrou-jeux';
  const badge = document.createElement('span');
  badge.className = 'verrou-etiq ' + portee.classe;
  badge.textContent = portee.etiquette;
  badge.title = portee.phrase;
  etiq.appendChild(badge);

  // Une seule des deux versions ? Le dire ici, sinon on cherche un Groudon
  // dans Saphir Alpha en se demandant pourquoi la ligne le promettait.
  if(v.version){
    const ver = document.createElement('span');
    ver.className = 'verrou-libelle version';
    ver.textContent = v.version;
    etiq.appendChild(ver);
  }

  // Sous « Tous les jeux », on ne sait pas de quelle version on parle : les
  // versions concernées s'affichent. Dans le groupe d'un jeu, ce serait répéter
  // le titre juste au-dessus.
  if(!cleJeu && v.jeux && v.jeux.length && typeof GAMES !== 'undefined'){
    v.jeux.forEach(function(k){
      const g = GAMES.find(function(x){ return x.key === k; });
      if(!g) return;
      const t = document.createElement('span');
      t.className = 'verrou-libelle';
      t.textContent = g.title;
      etiq.appendChild(t);
    });
  }
  infos.appendChild(etiq);

  // Ce qui décrit l'APPARITION et non l'espèce. Absent tant que le relevé n'a
  // pas été fait — mieux vaut un champ vide qu'un niveau inventé.
  if(v.niveau || (v.attaques && v.attaques.length)){
    const app = document.createElement('div');
    app.className = 'verrou-apparition';
    if(v.niveau){
      const n = document.createElement('span');
      n.className = 'verrou-niveau';
      n.textContent = 'N. ' + v.niveau;
      app.appendChild(n);
    }
    (v.attaques || []).forEach(function(a){
      const s = document.createElement('span');
      s.className = 'verrou-attaque';
      s.textContent = a;
      app.appendChild(s);
    });
    infos.appendChild(app);
  }

  if(v.exception){
    const ex = document.createElement('div');
    ex.className = 'verrou-exception';
    ex.textContent = v.exception;
    infos.appendChild(ex);
  }
  if(v.note){
    const n = document.createElement('div');
    n.className = 'verrou-note-ligne';
    n.textContent = v.note;
    infos.appendChild(n);
  }

  ligne.appendChild(infos);
  return ligne;
}

// Les groupes, dans l'ordre de GAMES, puis les sans-jeu.
function verrousGroupes(){
  const groupes = [];
  if(typeof GAMES !== 'undefined'){
    GAMES.forEach(function(g){
      const lot = VERROUS.filter(function(v){
        return v.jeux && v.jeux.indexOf(g.key) !== -1;
      });
      const regles = (typeof REGLES_VERROU !== 'undefined' ? REGLES_VERROU : [])
        .filter(function(r){ return r.jeux.indexOf(g.key) !== -1; });
      if(lot.length || regles.length){
        groupes.push({ cle: g.key, titre: g.title, lot: lot, regles: regles });
      }
    });
  }
  const horsJeu = VERROUS.filter(function(v){ return !v.jeux || !v.jeux.length; });
  if(horsJeu.length){
    groupes.push({
      cle: GROUPE_HORS_JEU.cle, titre: GROUPE_HORS_JEU.titre,
      note: GROUPE_HORS_JEU.note, lot: horsJeu, regles: []
    });
  }
  return groupes;
}

function verrouCorrespond(v, q){
  if(!q) return true;
  const e = verrouEntree(v.espece);
  const nom = e ? (typeof nomAffiche === 'function' ? nomAffiche(e) : e.display) : '';
  const cible = (typeof sansAccents === 'function' ? sansAccents : function(s){
    return String(s).toLowerCase();
  });
  return cible(nom + ' ' + v.rencontre + ' #' + v.espece).indexOf(cible(q)) !== -1;
}

function dessinerVerrous(){
  if(!verrousListe) return;
  verrousListe.innerHTML = '';

  const jeuVoulu = verrouJeuActif;
  const q = verrousQ ? verrousQ.value.trim() : '';
  let montrees = 0;

  verrousGroupes().forEach(function(g){
    if(jeuVoulu && g.cle !== jeuVoulu) return;
    const lot = g.lot.filter(function(v){ return verrouCorrespond(v, q); });
    if(!lot.length && !(g.regles.length && !q)) return;

    const section = document.createElement('div');
    section.className = 'verrou-section';

    const titre = document.createElement('div');
    titre.className = 'verrou-section-titre';
    titre.textContent = g.titre;
    section.appendChild(titre);

    if(g.note){
      const n = document.createElement('div');
      n.className = 'verrou-section-note';
      n.textContent = g.note;
      section.appendChild(n);
    }

    // Les règles de moteur d'abord : elles ne visent aucune espèce, mais elles
    // condamnent des chasses entières. Les mettre après la liste, c'était les
    // faire lire une fois la décision prise.
    g.regles.forEach(function(r){
      const el = document.createElement('div');
      el.className = 'verrou-regle';
      el.textContent = r.texte;
      section.appendChild(el);
    });

    const cleSprite = (g.cle === GROUPE_HORS_JEU.cle) ? null : g.cle;
    lot.forEach(function(v){
      section.appendChild(verrouLigne(v, cleSprite));
      montrees++;
    });

    verrousListe.appendChild(section);
  });

  if(verrousCompte){
    verrousCompte.textContent = montrees
      ? montrees + (montrees > 1 ? ' rencontres verrouillées' : ' rencontre verrouillée')
      : 'Aucune rencontre ne correspond.';
  }

  // CE QUI MANQUE EST ÉCRIT À L'ÉCRAN, pas seulement dans le fichier. Une liste
  // incomplète qui se présente comme complète est pire qu'une liste absente :
  // on cesse de vérifier ailleurs.
  if(typeof VERROUS_A_VERIFIER !== 'undefined' && VERROUS_A_VERIFIER.length && !q && !jeuVoulu){
    const bloc = document.createElement('div');
    bloc.className = 'verrou-incomplet';
    const t = document.createElement('div');
    t.className = 'verrou-incomplet-titre';
    t.textContent = 'Relevé encore incomplet';
    bloc.appendChild(t);
    VERROUS_A_VERIFIER.forEach(function(x){
      const l = document.createElement('div');
      l.className = 'verrou-incomplet-ligne';
      l.textContent = (x.quoi || ('N° ' + x.espece)) + ' — ' + x.pourquoi;
      bloc.appendChild(l);
    });
    verrousListe.appendChild(bloc);
  }
}

// La colonne des jeux. Elle se remplit depuis GAMES, et seulement avec ceux qui
// ont quelque chose à montrer : proposer « Pokémon Cristal » pour n'obtenir
// qu'un écran vide est une promesse non tenue.
//
// PAS UN MENU DÉROULANT ICI, ET C'EST DÉLIBÉRÉ. Un menu fermé ne dit pas
// combien de jeux ont des verrous, ni lesquels — or c'est la première chose
// qu'on veut savoir en arrivant. La molette reste la bonne réponse quand la
// liste doit s'effacer ; ici elle doit rester lisible.
function dessinerVerrousNav(){
  if(!verrousNav) return;
  verrousNav.innerHTML = '';
  const groupes = verrousGroupes();

  function bouton(cle, libelle, compte){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'verrou-onglet' + (verrouJeuActif === cle ? ' actif' : '');
    b.setAttribute('aria-pressed', String(verrouJeuActif === cle));
    const t = document.createElement('span');
    t.className = 'verrou-onglet-nom';
    t.textContent = libelle;
    b.appendChild(t);
    const n = document.createElement('span');
    n.className = 'verrou-onglet-compte';
    // « 0 » à côté d'un jeu qui affiche pourtant une règle de moteur se lit
    // comme une erreur. Ces jeux-là n'ont pas d'espèce nommée : ils ont une
    // règle, et c'est ce que dit l'étiquette.
    n.textContent = compte ? String(compte) : 'règle';
    if(!compte) n.classList.add('regle-seule');
    b.appendChild(n);
    b.addEventListener('click', function(){
      verrouJeuActif = cle;
      dessinerVerrousNav();
      dessinerVerrous();
    });
    return b;
  }

  let total = 0;
  groupes.forEach(function(g){ total += g.lot.length; });
  verrousNav.appendChild(bouton('', 'Tous les jeux', total));
  groupes.forEach(function(g){
    verrousNav.appendChild(bouton(g.cle, g.titre, g.lot.length));
  });
}

// C'EST UNE PAGE, PLUS UNE FENÊTRE. On la garde ouverte à côté pendant qu'on
// prépare une chasse, on y revient, on la laisse dans son état. Une modale
// obligeait à tout rouvrir à chaque fois qu'on voulait revérifier une ligne.
function dessinerVerrousPage(){
  dessinerVerrousNav();
  dessinerVerrous();
}

if(verrousBtn){
  verrousBtn.addEventListener('click', function(){
    if(typeof showPage === 'function') showPage('verrous');
  });
}
const verrousRetour = document.getElementById('verrousRetour');
if(verrousRetour){
  verrousRetour.addEventListener('click', function(){
    if(typeof showPage === 'function') showPage('chasse');
  });
}
if(verrousQ) verrousQ.addEventListener('input', dessinerVerrous);

// Échap renvoie aussi à Chasse : le réflexe reste celui de la fenêtre qu'on
// vient de remplacer, et le contredire ne rendrait service à personne.
document.addEventListener('keydown', function(e){
  if(e.key !== 'Escape') return;
  if(!pageVerrousEl || !pageVerrousEl.classList.contains('active')) return;
  if(document.activeElement === verrousQ && verrousQ.value){
    verrousQ.value = '';
    dessinerVerrous();
    return;
  }
  if(typeof showPage === 'function') showPage('chasse');
});
