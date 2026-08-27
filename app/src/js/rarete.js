// La rareté : ce que possèdent les autres, et ce que ça dit du tien.
// Script classique (pas de module ES), chargé après compte.js — il se sert
// d'invoke, et après fiche.js, dont il complète le portrait.
//
// POURQUOI. Le classement compte le NOMBRE. Il ne dit rien de la rareté : avoir
// un Mew et avoir un Roucool y pèsent pareil, ce qui est faux pour tout le
// monde sauf pour le compteur. « Trois dresseurs sur deux cent quarante l'ont »
// est un vrai motif de fierté, et c'était déjà dans la base.
//
// LE CALCUL EST FAIT PAR L'API, PAS ICI : il relit chaque collection publique,
// ce qui suppose de les avoir. On ne demande la table qu'une fois par session,
// et elle ne bouge pas plus souvent que ça — voir rarete() dans comptes.js.
//
// RIEN NE S'AFFICHE SOUS CINQ COLLECTIONS. « Un dresseur sur deux » n'est pas
// une rareté, c'est un hasard, et l'API renvoie alors une table vide. Un
// chiffre faux serait pire que pas de chiffre.

let rareteTable = null;      // { dresseurs, entrees: { nom: n } }
let rareteEnVol = null;

function chargerRarete(){
  if(rareteTable) return Promise.resolve(rareteTable);
  if(rareteEnVol) return rareteEnVol;
  rareteEnVol = invoke('rarete').then(function(r){
    rareteTable = r || { dresseurs: 0, entrees: {} };
    return rareteTable;
  }).catch(function(){
    // Hors ligne, ou route absente d'une API plus ancienne : on retient
    // l'échec sous forme de table vide, pour ne pas redemander à chaque fiche.
    rareteTable = { dresseurs: 0, entrees: {} };
    return rareteTable;
  });
  return rareteEnVol;
}

/** La part des dresseurs qui possèdent cette entrée, ou null. */
function partRarete(entry){
  if(!rareteTable || !rareteTable.dresseurs) return null;
  const n = rareteTable.entrees[entry.name] || 0;
  return { combien: n, sur: rareteTable.dresseurs, part: n / rareteTable.dresseurs };
}

// Les seuils. Trois paliers seulement : au-delà, la nuance ne se lit plus et
// on aurait l'air de mesurer ce qu'on ne mesure pas.
function motRarete(part){
  if(part <= 0) return { mot: 'Personne d\'autre ne l\'a', classe: 'unique' };
  if(part < 0.05) return { mot: 'Très rare', classe: 'tres-rare' };
  if(part < 0.20) return { mot: 'Rare', classe: 'rare' };
  if(part < 0.60) return { mot: 'Peu répandu', classe: 'moyen' };
  return { mot: 'Répandu', classe: 'commun' };
}

/**
 * La ligne de rareté, dans la bande d'identité de la fiche.
 *
 * Appelée après le dessin : la table arrive par le réseau, et la fiche ne doit
 * pas l'attendre pour s'afficher.
 */
function dessinerRarete(entry){
  const cible = document.getElementById('ficheRarete');
  if(!cible) return;
  const r = partRarete(entry);
  if(!r){ cible.hidden = true; cible.textContent = ''; return; }

  const m = motRarete(r.part);
  cible.hidden = false;
  cible.className = 'fiche-rarete ' + m.classe;
  const pourcent = r.part > 0 && r.part < 0.01
    ? '< 1 %' : Math.round(r.part * 100) + ' %';
  cible.textContent = m.mot + '  ·  ' + r.combien + ' dresseur'
    + (r.combien > 1 ? 's' : '') + ' sur ' + r.sur + '  ·  ' + pourcent;
  cible.title = 'Calculé sur les collections publiques des autres dresseurs, '
    + 'leur aventure principale seulement. Mis à jour deux fois par jour.';
}

/** Appelée par remplirFiche() : demande la table, puis dessine. */
function assurerRarete(entry){
  chargerRarete().then(function(){
    // On vérifie qu'on parle toujours du même Pokémon : deux fiches ouvertes
    // coup sur coup feraient sinon écrire la seconde par-dessus la première.
    if(typeof previewEntry !== 'undefined' && previewEntry === entry){
      dessinerRarete(entry);
    }
  });
}

// ---- Le tri « mes pièces rares » ---------------------------------------------
//
// Il vit ici plutôt que dans dex.js, avec le reste de la rareté : c'est le même
// chiffre, lu autrement. dex.js n'a qu'à l'appeler.

function rangRarete(entry){
  if(!rareteTable || !rareteTable.dresseurs) return 1;
  return (rareteTable.entrees[entry.name] || 0) / rareteTable.dresseurs;
}
