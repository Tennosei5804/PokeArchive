// Les icônes de l'interface, dessinées ici plutôt qu'empruntées au système.
//
// CE QUE ÇA REMPLACE, ET POURQUOI IL FALLAIT LE REMPLACER. Les boutons portaient
// des émojis : 📷, ➕, 🔎, 💬. Un émoji n'est pas une icône, c'est un CARACTÈRE —
// et son dessin appartient à la police du système. Windows le rend en clip art
// brillant et multicolore, macOS autrement, Linux autrement encore. Résultat :
// une pastille lustrée posée au milieu d'un boîtier mat, qui ne prend jamais la
// couleur du texte, ne s'aligne pas sur sa ligne de base, et change d'aspect
// d'une machine à l'autre sans qu'on puisse rien y faire.
//
// UN TRAIT, PAS UN APLAT. Toutes sont dessinées au même trait de 1,7 sur une
// grille de 24, sans remplissage, en `currentColor`. Elles héritent donc de la
// couleur du bouton — y compris au survol, en sombre, et sur un bouton actif —
// et il n'y a rien à repeindre nulle part.
//
// LA GRILLE EST LA MÊME POUR TOUTES : un dessin qui déborde de 24 ou qui n'en
// occupe que la moitié se voit immédiatement à côté d'un autre. Les tracés
// restent donc entre 3 et 21, et les formes pleines (le point d'un œil, le
// centre d'une Poké Ball) sont les seules exceptions, assumées.
//
// CE FICHIER NE CONNAÎT RIEN DE L'APPLICATION. Il rend du balisage, on le pose
// où l'on veut. Chargé tôt, avant tout ce qui dessine.

// Chaque entrée est le CONTENU d'un <svg> de 24 sur 24. Rien de plus : ni
// taille, ni couleur, ni classe — ces trois-là appartiennent à l'endroit qui
// pose l'icône, pas au dessin.
const ICONES = {
  // --- Les pièces jointes ---------------------------------------------------
  // La Poké Ball plutôt qu'un « + » : le bouton joint un POKÉMON, et un plus
  // ne dit pas quoi.
  //
  // LA SEULE ICONE À PORTER UN APLAT, et il a fallu deux essais pour l'admettre.
  // Dessinée au trait comme les autres — un cercle, un petit cercle au milieu,
  // deux barres sur les côtés — elle se lisait « réticule de visée » à vingt
  // pixels : c'est exactement la même figure. Ce qui distingue une Poké Ball
  // d'une mire, c'est que sa moitié HAUTE est pleine.
  //
  // Le trou du bouton est creusé dans l'aplat par `fill-rule="evenodd"` plutôt
  // que rebouché avec une couleur de fond : on ne sait pas sur quel fond
  // l'icône sera posée, et un rond peint en « blanc » se verrait en sombre.
  balle: '<circle cx="12" cy="12" r="8.5"/>'
       + '<path fill="currentColor" stroke="none" fill-rule="evenodd" '
       + 'd="M3.5 12a8.5 8.5 0 0 1 17 0Z M15.2 12a3.2 3.2 0 1 0-6.4 0 3.2 3.2 0 1 0 6.4 0Z"/>'
       + '<circle cx="12" cy="12" r="3.2"/>',
  appareil: '<path d="M4 8.5h3l1.5-2.5h7L17 8.5h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4'
          + 'a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1Z"/><circle cx="12" cy="13.5" r="3.5"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="2"/>'
       + '<circle cx="8.5" cy="10" r="1.5"/><path d="M4 17l5-5 3.5 3.5L16 12l4 4"/>',
  // Une flèche qui SORT du plateau : « depuis mon ordinateur ». La flèche vers
  // le bas dirait « télécharger », qui est le geste inverse.
  televerser: '<path d="M12 16V4M8 8l4-4 4 4"/><path d="M4 15v3a2 2 0 0 0 2 2h12'
            + 'a2 2 0 0 0 2-2v-3"/>',

  // --- Les gestes courants --------------------------------------------------
  loupe: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.2 15.2 21 21"/>',
  bulle: '<path d="M20 14.5a2.5 2.5 0 0 1-2.5 2.5H9l-4.5 3.5v-3.5H4a2 2 0 0 1-2-2'
       + 'v-8a2 2 0 0 1 2-2h13.5A2.5 2.5 0 0 1 20 7Z"/>',
  cloche: '<path d="M18 16V11a6 6 0 1 0-12 0v5l-1.5 2.5h15Z"/>'
        + '<path d="M10 19.5a2 2 0 0 0 4 0"/>',
  // Deux flèches qui se croisent : un échange, et non un envoi.
  echange: '<path d="M4 8.5h13M13.5 5 17 8.5 13.5 12"/>'
         + '<path d="M20 15.5H7M10.5 12 7 15.5 10.5 19"/>',
  cadeau: '<rect x="3" y="10" width="18" height="10" rx="1.5"/>'
        + '<path d="M2 7h20v3H2zM12 7v13"/>'
        + '<path d="M12 7S10.5 3 8.5 3.5 8 7 12 7ZM12 7s1.5-4 3.5-3.5S16 7 12 7Z"/>',
  oeil: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z"/>'
      + '<circle cx="12" cy="12" r="3"/>',
  cadenas: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/>'
         + '<path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  corbeille: '<path d="M4 6.5h16M9.5 6.5V4h5v2.5"/>'
           + '<path d="M6.5 6.5 7.5 20h9l1-13.5"/><path d="M10 10v6.5M14 10v6.5"/>',
  croix: '<path d="M6 6l12 12M18 6 6 18"/>',
  coche: '<path d="M4.5 12.5 9.5 17.5 19.5 6.5"/>',
  // Quatre branches, une grande et trois petites : l'étincelle du chromatique.
  etincelle: '<path d="M12 3.5 13.8 9.2 19.5 11 13.8 12.8 12 18.5 10.2 12.8 4.5 11'
           + 'l5.7-1.8Z"/><path d="M18.5 16.5 19.3 18.7 21.5 19.5 19.3 20.3 18.5 22.5'
           + 'l-.8-2.2-2.2-.8 2.2-.8Z"/>',
  // Le disque plein de la forme normale, en face de l'étincelle. Une forme
  // pleine, contrairement à toutes les autres : elle ne représente pas un objet
  // mais un état, et un cercle vide se serait lu « non coché ».
  disque: '<circle cx="12" cy="12" r="6.5" fill="currentColor" stroke="none"/>',
  sablier: '<path d="M7 3.5h10M7 20.5h10"/>'
         + '<path d="M8 3.5v3.2c0 2 4 3.6 4 5.3s-4 3.3-4 5.3v3.2"/>'
         + '<path d="M16 3.5v3.2c0 2-4 3.6-4 5.3s4 3.3 4 5.3v3.2"/>',
  boite: '<path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5Z"/><path d="M3 7.5 12 12l9-4.5"/>'
       + '<path d="M12 12v9"/>',
  // Un crayon posé sur sa ligne : renommer. Le « ✎ » typographique était rendu
  // par la police du texte, donc à une autre taille que ses deux voisins.
  crayon: '<path d="M4 20h4L20 8a2.5 2.5 0 0 0-3.5-3.5L4 16.5Z"/><path d="M15 6l3.5 3.5"/>',
  poignee: '<path d="M8.5 12.5 11 15l2-2 2.5 2.5"/>'
         + '<path d="M2.5 9.5 6 6.5l3.5 1.5h5L18 6.5l3.5 3-3 6.5-3 2-3.5-3-3.5 3-3-2Z"/>',
};

/**
 * Le balisage d'une icône.
 *
 * `aria-hidden` sur toutes, sans exception : une icône double toujours un mot,
 * soit dans le bouton, soit dans son `title`. La lire à voix haute reviendrait
 * à annoncer deux fois la même chose.
 */
function iconeHtml(nom, taille){
  const d = ICONES[nom];
  // UN NOM INCONNU NE REND RIEN plutôt qu'un carré vide : une icône manquante
  // doit laisser un bouton lisible, pas un trou dessiné.
  if(!d) return '';
  const t = taille || 18;
  return '<svg class="ic" viewBox="0 0 24 24" width="' + t + '" height="' + t + '" '
       + 'fill="none" stroke="currentColor" stroke-width="1.7" '
       + 'stroke-linecap="round" stroke-linejoin="round" '
       + 'aria-hidden="true" focusable="false">' + d + '</svg>';
}

/**
 * Pose une icône DEVANT le texte d'un bouton, sans y toucher.
 *
 * ON LIT LE TEXTE AVANT DE LE REMPLACER : les libellés changent au fil de
 * l'exécution — « Je le cherche » devient « Tu le cherches » — et cette
 * fonction est rappelée à chaque fois. Elle repart donc du texte courant plutôt
 * que d'un libellé figé à l'écriture.
 */
function boutonIcone(el, nom, texte){
  if(!el) return el;
  const mot = (texte !== undefined) ? texte : el.textContent.trim();
  el.classList.add('avec-ic');
  el.innerHTML = iconeHtml(nom) + (mot ? '<span>' + escapeHtml(mot) + '</span>' : '');
  return el;
}
