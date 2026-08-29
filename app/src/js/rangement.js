// Le plan de rangement : où celui-là va, dans tes boîtes.
//
// Script classique, chargé APRÈS grille.js (BOITE_TAILLE, allerBoite) et dex.js
// (trierEntrees).
//
// CE QUI MANQUAIT, ET CE QUI EXISTAIT DÉJÀ. La vue boîtes range trente par
// boîte et sa navigation dit déjà « Boîte 3 · 22 / 30 » : de quoi voir où en
// est la collection. Ce qu'elle ne disait pas, c'est la coordonnée D'UNE ESPÈCE
// — et c'est justement ce qu'on cherche quand on a la console en main et un
// Pokémon à ranger. « Motisma, il va où ? »
//
// LE PLAN NE SUIT PAS LE TRI, et c'est tout le point. La vue boîtes obéit au
// tri en cours : trier par type y fait des boîtes par type, ce qui est un usage
// légitime. Mais un PLAN qui se déplace quand on change de tri n'est pas un
// plan — on ne réarrange pas trente boîtes parce qu'on a cliqué « alphabétique ».
//
// L'ordre du plan est donc celui du Pokédex, toujours : « N° du jeu » sur un
// jeu, le national sur la collection HOME. C'est l'ordre dans lequel un Living
// Dex se range depuis toujours, et il ne dépend de rien de ce qu'on fait à
// l'écran.

// Le plan calculé, gardé tant que le périmètre ne change pas : trier mille deux
// cents entrées à chaque ouverture de fiche serait payer cher une réponse qui
// ne bouge pas.
let planCache = null;
let planCacheCle = '';

function planCle(){
  return (typeof currentTab !== 'undefined' ? currentTab : '?')
    + '|' + (typeof currentVariant !== 'undefined' ? currentVariant : '?')
    + '|' + (typeof allFormsMode !== 'undefined' ? allFormsMode : '?')
    + '|' + (typeof scopeEntries !== 'undefined' ? scopeEntries.length : 0);
}

/** L'ordre du rangement : celui du Pokédex, quel que soit le tri affiché. */
function planDeRangement(){
  const cle = planCle();
  if(planCache && planCacheCle === cle) return planCache;
  planCache = (typeof trierEntrees === 'function')
    ? trierEntrees(scopeEntries.slice(), 'game')
    : scopeEntries.slice();
  planCacheCle = cle;
  return planCache;
}

/** Où va cette entrée : la boîte, la case, et le rang absolu. */
function placeDansLePlan(entry){
  if(typeof scopeEntries === 'undefined' || !scopeEntries.length) return null;
  const plan = planDeRangement();
  const rang = plan.findIndex(function(e){ return e.name === entry.name; });
  if(rang === -1) return null;
  return {
    boite: Math.floor(rang / BOITE_TAILLE),      // à partir de zéro, pour allerBoite
    place: (rang % BOITE_TAILLE) + 1,            // affichée à partir de un
    boites: Math.max(1, Math.ceil(plan.length / BOITE_TAILLE)),
  };
}

// ---- Sur la fiche -----------------------------------------------------------

/** Appelée par remplirFiche(). */
function dessinerRangement(entry){
  if(!ficheRangement) return;

  // Sur la collection HOME, la coordonnée vaut pour la collection entière ; sur
  // un jeu, pour son Pokédex. Le libellé le dit, sinon deux nombres différents
  // pour le même Pokémon passeraient pour une erreur.
  const p = placeDansLePlan(entry);
  if(!p){
    ficheRangement.hidden = true;
    return;
  }

  ficheRangement.hidden = false;
  ficheRangement.innerHTML = '';

  const ou = document.createElement('span');
  ou.className = 'rangement-ou';
  ou.textContent = '📦 Boîte ' + (p.boite + 1) + ', case ' + p.place;
  ficheRangement.appendChild(ou);

  const quoi = document.createElement('span');
  quoi.className = 'rangement-quoi';
  const jeu = (typeof gameByKey !== 'undefined') && gameByKey[currentTab];
  quoi.textContent = 'rangé dans l’ordre '
    + (jeu ? 'du Pokédex de ' + jeu.tab.replace(/^\S+\s/, '') : 'national')
    + '  ·  ' + p.boites + ' boîtes en tout';
  ficheRangement.appendChild(quoi);

  // Y aller. C'est le geste qui suit la lecture : on a la coordonnée, on veut
  // voir la boîte — et de là, ce qui l'entoure.
  if(typeof allerBoite === 'function'){
    const y = document.createElement('button');
    y.type = 'button';
    y.className = 'rangement-y-aller';
    y.textContent = 'Voir la boîte';
    y.addEventListener('click', function(){
      if(typeof closePreview === 'function') closePreview();
      if(typeof vueBoites !== 'undefined' && !vueBoites
         && typeof basculerBoites === 'function') basculerBoites();
      allerBoite(p.boite);
    });
    ficheRangement.appendChild(y);
  }
}
