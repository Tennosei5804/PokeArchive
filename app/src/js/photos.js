// Les photos de chasse : montrer son Pokémon, pas seulement le nommer.
//
// Script classique, chargé APRÈS chasse.js et compte.js : il se sert d'invoke,
// de perdreSession, de queueSave, de profilCourant et de dessinerTableauChasse.
//
// LE TABLEAU DE CHASSE ALIGNAIT DES CHIFFRES. 2311 rencontres, 1/1365, treize
// jours : cela dit l'effort, pas le moment. La capture d'écran de l'apparition,
// elle, dit le moment — et c'est elle qu'on montre aux autres.
//
// L'IMAGE EST REDESSINÉE ICI, avant de partir. Une capture de Switch fait
// 1280 × 720 et 200 Ko ; une photo de téléphone fait 4000 × 3000 et huit
// mégaoctets. Les envoyer telles quelles remplirait le disque du serveur pour
// une vignette de cent pixels. Le canvas les ramène à PHOTO_COTE_MAX et les
// réencode en JPEG.
//
// LE RÉENCODAGE EFFACE AUSSI LES MÉTADONNÉES, et c'est la vraie raison de le
// faire au plus tôt. Une photo de téléphone porte sa position GPS : publier un
// chromatique ne doit pas publier son salon. Le canvas ne recopie que les
// pixels — l'EXIF ne survit pas. Le serveur le revérifie de son côté, parce
// qu'un client modifié n'est pas obligé de passer par ici.
//
// UN PNG RESTE UN PNG. Tout convertir en JPEG était un choix par défaut, pas
// une décision : le JPEG écrase une photo de téléphone sans qu'on le voie, mais
// il abîme visiblement une capture d'écran — le texte d'une boîte, le liseré
// d'un chromatique, les aplats d'une interface s'y couvrent d'artefacts, et
// c'est justement ce qu'on venait montrer.
//
// La règle tient en une phrase : **le format de la source est conservé**, tant
// que le fichier reste sous PHOTO_PNG_MAX. Au-delà on repasse en JPEG, parce
// qu'un PNG de plusieurs mégaoctets mangerait le quota pour une différence que
// personne ne voit sur une photographie.
//
// J'AVAIS D'ABORD ÉCRIT « on garde le plus petit des deux », en supposant qu'un
// aplat donnerait un PNG plus léger. Mesuré : sur une image de 1600 px réduite
// depuis 2400, le PNG fait 31 ko contre 14 pour le JPEG — le redimensionnement
// lisse les bords et ruine la compression sans perte. La règle par la taille
// aurait donc reconverti en JPEG presque toutes les captures, c'est-à-dire
// exactement ce qu'on voulait éviter.

// Au-delà, on repasse en JPEG. Une capture de Switch réduite à 1600 px tient
// largement dessous ; ce plafond n'arrête qu'une image que le JPEG servirait
// tout aussi bien.
const PHOTO_PNG_MAX = 1024 * 1024;

const PHOTO_COTE_MAX = 1600;
const PHOTO_QUALITE = 0.82;

// Les data: rendues par le pont. Une photo ne change jamais — son identifiant
// est créé avec elle et n'est jamais réattribué — donc la relire à chaque
// ouverture du tableau serait un aller-retour pour un contenu déjà connu.
//
// MAIS LE CACHE OUBLIE, et il le faut. Une photo pèse deux cent mille octets, un
// tiers de plus une fois en base64 : garder tout ce qu'une session croise, c'est
// trente mégaoctets en mémoire au bout de trois murs parcourus, jusqu'à la
// fermeture de la fenêtre. On garde les dernières, et le reste se relit — c'est
// un aller-retour, pas une perte.
const PHOTOS_EN_CACHE_MAX = 30;
const photosEnCache = new Map();

function retenirPhoto(id, url){
  // Map garde l'ordre d'insertion : la plus ancienne est la première clé.
  if(photosEnCache.size >= PHOTOS_EN_CACHE_MAX){
    photosEnCache.delete(photosEnCache.keys().next().value);
  }
  photosEnCache.set(id, url);
}

// ---- Le chargement paresseux ------------------------------------------------
//
// LE MUR EN DEMANDAIT CENT VINGT D'UN COUP. Le serveur en rend jusqu'à cent
// vingt, chaque carte appelait le pont dès sa création : cent vingt requêtes
// simultanées, une trentaine de mégaoctets d'un bloc, sur un hébergement
// gratuit. L'historique des défis était pire — il dessine tout ce qui est
// gardé, jusqu'à deux ans.
//
// On ne charge donc que ce qui entre à l'écran. Un seul observateur pour toute
// la page : en créer un par vignette coûterait plus cher que le problème.

let guetteurPhotos = null;

function guetteur(){
  if(guetteurPhotos) return guetteurPhotos;
  if(typeof IntersectionObserver !== 'function') return null;
  guetteurPhotos = new IntersectionObserver(function(entrees, obs){
    entrees.forEach(function(e){
      if(!e.isIntersecting) return;
      obs.unobserve(e.target);        // une fois chargée, on ne la guette plus
      const charger = e.target._chargerPhoto;
      if(typeof charger === 'function') charger();
    });
  }, {
    // Un écran d'avance : la vignette est prête quand elle arrive sous les yeux,
    // au lieu d'apparaître vide puis de se remplir.
    rootMargin: '300px',
  });
  return guetteurPhotos;
}

/**
 * Charge quand l'élément approche — et un filet de sécurité derrière.
 *
 * L'OBSERVATEUR PEUT NE JAMAIS PARLER. Une page qui ne compose pas d'images —
 * fenêtre réduite, onglet occulté, volet de rendu inactif — ne produit aucune
 * intersection : mesuré, un observateur neuf y voit zéro passage pour un
 * élément pourtant fixé en haut à gauche. Sans filet, la vignette resterait
 * vide pour toujours, et l'attente paresseuse deviendrait une attente tout
 * court.
 *
 * On double donc d'un contrôle unique, un quart de seconde plus tard : si
 * l'élément est réellement dans la fenêtre au calcul des rectangles, on charge
 * sans attendre le rappel. Cela ne réveille que ce qui est visible — les cent
 * vingt vignettes d'un mur restent endormies.
 */
function chargerQuandVisible(el, charger){
  let fait = false;
  const uneFois = function(){
    if(fait) return;
    fait = true;
    charger();
  };

  const g = guetteur();
  if(!g){ uneFois(); return; }
  el._chargerPhoto = uneFois;
  g.observe(el);

  setTimeout(function(){
    if(fait || !el.isConnected) return;
    const r = el.getBoundingClientRect();
    const haut = window.innerHeight || document.documentElement.clientHeight;
    const large = window.innerWidth || document.documentElement.clientWidth;
    // La même marge que l'observateur, pour que les deux chemins s'accordent.
    if(r.bottom > -300 && r.top < haut + 300 && r.right > -300 && r.left < large + 300){
      g.unobserve(el);
      uneFois();
    }
  }, 250);
}

// Ce qui attend une photo, entre l'ouverture du sélecteur et son retour : le
// sujet, et ce qu'il faudra redessiner ensuite.
//
// UN SUJET, PAS UNE CHASSE. Le champ `image` et tout ce qui l'entoure valent
// pour n'importe quoi qui porte une photo — une chasse aboutie, un défi du
// jour. Le serveur le sait déjà : sa colonne `sujet` a été prévue pour ça.
let photoPourSujet = null;
let photoApres = null;
let photoGenre = 'chasse';

// ---- Fabriquer -------------------------------------------------------------

/**
 * Redessine une image dans un canvas, et rend ses octets en JPEG.
 *
 * Le rapport est conservé : on borne le plus grand côté, l'autre suit. Une
 * image déjà petite n'est pas agrandie — l'étirer n'ajouterait aucun détail et
 * ferait grossir le fichier.
 */
function redessinerPhoto(fichier){
  return new Promise(function(resoudre, rejeter){
    const lecteur = new FileReader();
    lecteur.onerror = function(){ rejeter(new Error('Fichier illisible.')); };
    lecteur.onload = function(){
      const img = new Image();
      img.onerror = function(){ rejeter(new Error('Ce fichier n’est pas une image.')); };
      img.onload = function(){
        const facteur = Math.min(1, PHOTO_COTE_MAX / Math.max(img.width, img.height));
        const l = Math.max(1, Math.round(img.width * facteur));
        const h = Math.max(1, Math.round(img.height * facteur));

        const toile = document.createElement('canvas');
        toile.width = l;
        toile.height = h;
        const ctx = toile.getContext('2d');
        // Un fond blanc sous le dessin : un PNG transparent réencodé en JPEG
        // sans cela rend un fond NOIR, et une capture à fond clair devient
        // méconnaissable.
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, l, h);
        ctx.drawImage(img, 0, 0, l, h);

        const encoder = function(mime, qualite){
          return new Promise(function(r){ toile.toBlob(r, mime, qualite); });
        };
        const rendre = function(blob){
          return blob.arrayBuffer().then(function(tampon){
            return { octets: Array.from(new Uint8Array(tampon)),
                     mime: blob.type, largeur: l, hauteur: h };
          });
        };

        // Le PNG d'abord si la source en était un, et on ne repasse en JPEG
        // que s'il dépasse le plafond.
        const versPng = (fichier.type === 'image/png');
        (versPng ? encoder('image/png') : Promise.resolve(null))
          .then(function(png){
            if(png && png.size <= PHOTO_PNG_MAX) return rendre(png);
            return encoder('image/jpeg', PHOTO_QUALITE).then(function(jpeg){
              if(!jpeg) return Promise.reject(new Error('Réencodage impossible.'));
              return rendre(jpeg);
            });
          })
          .then(resoudre, rejeter);
      };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(fichier);
  });
}

// ---- Envoyer ---------------------------------------------------------------

async function envoyerPhoto(sujet, fichier, apres, genre){
  if(!sujet || !fichier) return;
  if(typeof profilCourant === 'undefined' || !profilCourant){
    prevenirErreur('Aucune aventure ouverte',
      'Ouvre une aventure avant d’attacher une photo.');
    return;
  }

  let redessinee;
  try{
    redessinee = await redessinerPhoto(fichier);
  }catch(e){
    prevenirErreur('Photo illisible', String(e.message || e));
    return;
  }

  try{
    const r = await invoke('image_envoyer', {
      profil: profilCourant.id,
      sujet: genre || 'chasse',
      mime: redessinee.mime,
      octets: redessinee.octets,
    });
    // L'ancienne, s'il y en avait une, part maintenant : le ménage du serveur
    // s'en chargerait au prochain enregistrement, mais l'attendre laisserait le
    // quota gonflé pendant ce temps.
    if(Number.isInteger(sujet.image)) await oublierPhoto(sujet.image);

    sujet.image = r.id;
    queueSave();
    redessinerApres(apres);
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    prevenirErreur('Envoi impossible', String(e));
  }
}

async function oublierPhoto(id){
  photosEnCache.delete(id);
  try{ await invoke('image_supprimer', { id: id }); }
  catch(e){ /* déjà partie, ou hors ligne : le ménage du serveur rattrapera */ }
}

/** Ce qu'il faut repeindre : ce qu'on nous a dit, ou le tableau de chasse. */
function redessinerApres(apres){
  if(typeof apres === 'function') apres();
  else if(typeof dessinerTableauChasse === 'function') dessinerTableauChasse();
}

async function retirerPhoto(sujet, apres){
  if(!sujet || !Number.isInteger(sujet.image)) return;
  const veut = await demanderConfirmation({
    eyebrow: 'Photo',
    titre: 'Retirer cette photo ?',
    note: 'Elle est effacée du serveur, et ceux qui la voyaient ne la verront '
        + 'plus. Ce à quoi elle était attachée, lui, reste.',
    libelleAction: 'Retirer',
    danger: true,
  });
  if(!veut) return;

  const id = sujet.image;
  delete sujet.image;
  queueSave();
  redessinerApres(apres);
  await oublierPhoto(id);
}

// ---- Afficher --------------------------------------------------------------

/**
 * L'adresse `data:` d'une photo.
 *
 * Elle passe par le pont : la fenêtre ne peut pas aller la chercher elle-même,
 * l'adresse exige le jeton de session et celui-ci ne descend jamais dans la
 * page. Voir image_charger dans lib.rs.
 */
async function chargerPhoto(id){
  if(photosEnCache.has(id)) return photosEnCache.get(id);
  const url = await invoke('image_charger', { id: id });
  retenirPhoto(id, url);
  return url;
}

/**
 * La vignette d'une ligne du tableau.
 *
 * Rendue VIDE puis remplie, parce que la photo arrive du pont et que le tableau
 * se dessine d'un bloc : attendre huit allers-retours avant d'afficher la
 * moindre ligne ferait clignoter l'écran à chaque capture cochée.
 */
function vignettePhoto(c, apres, genre){
  const cadre = document.createElement('button');
  cadre.type = 'button';
  cadre.className = 'chasse-photo';

  if(!Number.isInteger(c.image)){
    cadre.classList.add('vide');
    cadre.textContent = '📷';
    cadre.title = 'Ajouter la photo de la rencontre';
    cadre.addEventListener('click', function(){ demanderPhoto(c, apres, genre); });
    return cadre;
  }

  cadre.title = 'Voir la photo en grand';
  const img = document.createElement('img');
  img.alt = '';
  cadre.appendChild(img);
  chargerQuandVisible(cadre, function(){
    chargerPhoto(c.image).then(function(url){
      img.src = url;
    }, function(e){
      if(String(e) === 'SESSION_INVALIDE'){ perdreSession(); return; }
      // Introuvable ou hors ligne : la case redevient un appareil photo plutôt
      // qu'un carré cassé, et reste cliquable pour en reposer une.
      cadre.classList.add('vide');
      cadre.textContent = '📷';
      cadre.title = 'Photo indisponible — clique pour en poser une autre';
    });
  });

  cadre.addEventListener('click', function(){
    if(cadre.classList.contains('vide')) demanderPhoto(c, apres, genre);
    else ouvrirPhoto(c, apres);
  });
  return cadre;
}

function demanderPhoto(c, apres, genre){
  if(!photoFichier) return;
  photoPourSujet = c;
  photoApres = apres || null;
  photoGenre = genre || 'chasse';
  photoFichier.value = '';       // sinon rechoisir le même fichier ne déclenche rien
  photoFichier.click();
}

// ---- La visionneuse --------------------------------------------------------

let photoOuverte = null;

async function ouvrirPhoto(c, apres){
  if(!photoOverlay || !Number.isInteger(c.image)) return;
  photoOuverte = c;
  photoApres = apres || null;
  photoImage.removeAttribute('src');
  // Une chasse porte un compteur de rencontres, un défi porte sa date. La
  // légende dit ce que le sujet a à dire, et rien s'il n'a rien.
  photoLegende.textContent = (typeof nomDeChasse === 'function' ? nomDeChasse(c) : '')
    + (c.compteur ? '  ·  ' + c.compteur.toLocaleString('fr-FR') + ' rencontres' : '')
    + (c.jour ? '  ·  défi du ' + c.jour : '');
  // Il a pu etre cache par la visionneuse d'une photo d'autrui.
  if(photoRetirer) photoRetirer.style.display = '';
  photoOverlay.style.display = 'flex';
  setTimeout(function(){ photoFermer.focus(); }, 10);
  try{
    photoImage.src = await chargerPhoto(c.image);
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    photoLegende.textContent = 'Photo indisponible.';
  }
}

function fermerPhoto(){
  if(photoOverlay) photoOverlay.style.display = 'none';
  photoOuverte = null;
}

// ---- Le mur d'un dresseur ---------------------------------------------------

/**
 * Les photos de quelqu'un, les siennes comprises.
 *
 * C'ÉTAIT LA PIÈCE MANQUANTE. Les photos étaient déposées, protégées, servies —
 * et invisibles : la règle d'accès autorisait un ami à les voir, mais aucun
 * écran ne les montrait. Un mécanisme sans vitrine ne montre rien, ce qui était
 * exactement le contraire du but.
 */
async function ouvrirMur(pseudo, cestMoi){
  if(!murOverlay) return;
  murEyebrow.textContent = cestMoi ? 'Tes photos' : 'Chez ' + pseudo;
  murTitre.textContent = cestMoi ? 'Tes Pokémon' : 'Ses Pokémon';
  murNote.textContent = '';
  murGrille.innerHTML = '<div class="state-msg">Chargement…</div>';
  murOverlay.style.display = 'flex';
  setTimeout(function(){ murFermer.focus(); }, 10);

  let r;
  try{
    r = await invoke('photos_de', { pseudo: pseudo });
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    murGrille.innerHTML = '<div class="state-msg">' + String(e) + '</div>';
    return;
  }

  const photos = (r && r.photos) || [];
  murGrille.innerHTML = '';
  if(!photos.length){
    murGrille.innerHTML = '<div class="state-msg">'
      + (cestMoi
          ? 'Aucune photo. Attache-en une à une chasse aboutie ou au défi du jour.'
          : 'Aucune photo à montrer.')
      + '</div>';
    return;
  }

  const chasses = photos.filter(function(p){ return p.genre === 'chasse'; }).length;
  murNote.textContent = photos.length + (photos.length > 1 ? ' photos' : ' photo')
    + (chasses ? '  ·  ' + chasses + ' de chasse' : '');

  photos.forEach(function(p){ murGrille.appendChild(carteMur(p)); });
}

function carteMur(p){
  const carte = document.createElement('div');
  carte.className = 'defi-passe';

  // Une vignette qu'on ne peut PAS remplacer : ce sont les photos de quelqu'un.
  // vignettePhoto proposerait d'en poser une sur une case vide, ce qui n'a
  // aucun sens ici — d'où une image nue, et sa propre visionneuse.
  const cadre = document.createElement('button');
  cadre.type = 'button';
  cadre.className = 'chasse-photo';
  cadre.title = 'Voir en grand';
  const img = document.createElement('img');
  img.alt = '';
  cadre.appendChild(img);
  chargerQuandVisible(cadre, function(){
    chargerPhoto(p.id).then(function(url){ img.src = url; }, function(){
      cadre.classList.add('vide');
      cadre.textContent = '📷';
    });
  });
  cadre.addEventListener('click', function(){ ouvrirPhotoSeule(p); });
  carte.appendChild(cadre);

  const nom = document.createElement('span');
  nom.className = 'defi-passe-nom';
  nom.textContent = (typeof nomJournal === 'function') ? nomJournal(p.pokemon) : p.pokemon;
  carte.appendChild(nom);

  const bas = document.createElement('span');
  bas.className = 'defi-passe-jour';
  bas.textContent = p.genre === 'chasse'
    ? (p.compteur ? p.compteur.toLocaleString('fr-FR') + ' rencontres' : 'chasse')
    : 'défi';
  carte.appendChild(bas);

  return carte;
}

/** La visionneuse, sans le bouton « Retirer » : on ne retire pas chez autrui. */
async function ouvrirPhotoSeule(p){
  if(!photoOverlay) return;
  photoOuverte = null;
  photoApres = null;
  photoImage.removeAttribute('src');
  // UNE LÉGENDE TOUTE FAITE L'EMPORTE. La photo d'un message ne parle pas
  // d'une capture mais d'une conversation : « Envoyée par Jack » y dit plus
  // que le nom d'une espèce que la photo montre déjà.
  photoLegende.textContent = p.legende
    || (((typeof nomJournal === 'function') ? nomJournal(p.pokemon) : p.pokemon)
        + (p.quand ? '  ·  ' + p.quand : ''));
  if(photoRetirer) photoRetirer.style.display = 'none';
  photoOverlay.style.display = 'flex';
  try{
    photoImage.src = await chargerPhoto(p.id);
  }catch(e){
    photoLegende.textContent = 'Photo indisponible.';
  }
}

// ---- La place occupée -------------------------------------------------------

/** Appelé par chargerParametres(). */
async function chargerPlacePhotos(){
  if(!photosPlace) return;
  try{
    const r = await invoke('images_place');
    const mo = function(o){ return (o / 1048576).toFixed(1).replace('.', ','); };
    photosPlace.textContent = r.combien
      ? r.combien + (r.combien > 1 ? ' photos' : ' photo') + ' sur ' + r.combienMax
        + '  ·  ' + mo(r.octets) + ' Mo sur ' + mo(r.octetsMax)
      : 'Aucune photo pour l’instant.';
  }catch(e){
    photosPlace.textContent = '';
  }
}

// ---- Le câblage ------------------------------------------------------------

if(murFermer) murFermer.addEventListener('click', function(){ fermerMur(); });
if(murOverlay){
  murOverlay.addEventListener('click', function(e){
    if(e.target === murOverlay) fermerMur();
  });
}
function fermerMur(){ if(murOverlay) murOverlay.style.display = 'none'; }
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && murOverlay && murOverlay.style.display === 'flex') fermerMur();
});

if(photoFichier){
  photoFichier.addEventListener('change', function(){
    const f = photoFichier.files && photoFichier.files[0];
    const c = photoPourSujet;
    const apres = photoApres;
    const genre = photoGenre;
    photoPourSujet = null;
    if(f && c) envoyerPhoto(c, f, apres, genre);
  });
}
if(photoFermer) photoFermer.addEventListener('click', fermerPhoto);
if(photoRetirer){
  photoRetirer.addEventListener('click', async function(){
    const c = photoOuverte;
    const apres = photoApres;
    fermerPhoto();
    if(c) await retirerPhoto(c, apres);
  });
}
if(photoOverlay){
  photoOverlay.addEventListener('click', function(e){
    if(e.target === photoOverlay) fermerPhoto();
  });
}
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && photoOverlay && photoOverlay.style.display === 'flex') fermerPhoto();
});
