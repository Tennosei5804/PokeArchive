// Les filtres du Pokédex, rendus visibles.
//
// Script classique, chargé APRÈS dex.js dont il lit les deux tables de mots.
//
// LE PROBLÈME QU'IL RÈGLE. La recherche comprend une vingtaine de mots —
// « fossile », « gigamax », « legendaire », « manquants » — et chacun est un
// vrai filtre, aussi puissant que les quatre menus de la barre. Aucun ne se
// devine. La ligne des jetons dit ce qu'on a compris APRÈS la frappe ; elle ne
// dit jamais ce qu'on AURAIT PU taper. Quinze filtres existaient donc sans que
// personne puisse les trouver autrement qu'en lisant le code.
//
// UNE SEULE VÉRITÉ, ET C'EST LA RAISON DE LA FORME CHOISIE. Les pastilles sont
// bâties sur MOTS_CLES_RECHERCHE et ETATS_RECHERCHE, qui portent déjà leur
// libellé, et elles écrivent DANS LE CHAMP DE RECHERCHE. Elles n'ont pas de
// moteur à elles : cliquer « Fossiles » revient exactement à taper le mot, au
// caractère près. Un second chemin de filtrage aurait été une seconde vérité à
// tenir d'accord avec la première — c'est le défaut qu'on vient de corriger sur
// normaliser() et sur la liste des jeux sans chromatique.
//
// LES ALIAS NE S'AFFICHENT PAS. « manquants », « restants », « coches », « vus »
// mènent au même test que leur canonique ; en faire six pastilles montrerait six
// fois le même filtre. Ils restent reconnus à la frappe, et une pastille
// s'allume quand on tape son alias : c'est le sens de resoudre() ci-dessous.

/**
 * Les filtres proposables, dans l'ordre où ils se lisent.
 *
 * Les états d'abord : « manquants » est la question qu'on se pose le plus
 * souvent devant un Pokédex, et ce qu'on vient y chercher avant tout le reste.
 */
function filtresDisponibles(){
  const out = [];
  const prendre = function(table, groupe){
    Object.keys(table).forEach(function(cle){
      const x = table[cle];
      if(!x || x.alias || !x.libelle) return;
      out.push({ mot: cle, libelle: x.libelle, groupe: groupe, table: table });
    });
  };
  if(typeof ETATS_RECHERCHE !== 'undefined') prendre(ETATS_RECHERCHE, 'etat');
  if(typeof MOTS_CLES_RECHERCHE !== 'undefined') prendre(MOTS_CLES_RECHERCHE, 'quoi');
  return out;
}

/** Le test derrière un mot, alias compris. Rend null si le mot n'en est pas un. */
function resoudre(mot){
  const nu = sansAccents(mot);
  if(typeof ETATS_RECHERCHE !== 'undefined'){
    const e = suivreAlias(ETATS_RECHERCHE, nu);
    if(e) return e;
  }
  if(typeof MOTS_CLES_RECHERCHE !== 'undefined'){
    const k = suivreAlias(MOTS_CLES_RECHERCHE, nu);
    if(k) return k;
  }
  return null;
}

/** Les mots actuellement dans le champ. */
function motsRecherche(){
  return searchEl.value.trim().split(/\s+/).filter(Boolean);
}

/**
 * Ajoute ou retire le mot, puis laisse le pipeline habituel travailler.
 *
 * On compare les TESTS, pas les chaînes : quelqu'un qui a tapé « restants »
 * doit voir la pastille « Manquants » allumée, et un clic dessus doit retirer
 * son mot à lui, pas en ajouter un synonyme à côté.
 */
function basculerFiltre(mot){
  const cible = resoudre(mot);
  const mots = motsRecherche();
  const i = mots.findIndex(function(m){ return resoudre(m) === cible; });
  if(i >= 0) mots.splice(i, 1); else mots.push(mot);
  searchEl.value = mots.join(' ');
  searchEl.dispatchEvent(new Event('input', { bubbles: true }));
}

function filtreActif(mot){
  const cible = resoudre(mot);
  return motsRecherche().some(function(m){ return resoudre(m) === cible; });
}

function dessinerFiltres(){
  const el = document.getElementById('filtresRapides');
  if(!el || el.dataset.pret) return;
  const liste = filtresDisponibles();
  if(!liste.length) return;

  liste.forEach(function(f){
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'filtre-chip filtre-' + f.groupe;
    b.textContent = f.libelle;
    b.dataset.mot = f.mot;
    b.setAttribute('aria-pressed', 'false');
    b.title = 'Revient à taper « ' + f.mot + ' » dans la recherche';
    b.addEventListener('click', function(){ basculerFiltre(f.mot); });
    el.appendChild(b);
  });
  el.dataset.pret = '1';
  majFiltresActifs();
}

/**
 * Les formes régionales que les jeux connaissent, d'après GAMES.
 *
 * Pas de liste écrite ici : chaque jeu porte déjà `region`, et les mots-clés de
 * la recherche emploient le même vocabulaire — « alola », « galar », « hisui »,
 * « paldea ». Une dixième génération ajoutera sa région dans donnees.js et la
 * pastille suivra sans qu'on y touche.
 */
function regionsConnues(){
  const out = new Set();
  if(typeof GAMES === 'undefined') return out;
  GAMES.forEach(function(g){ if(g.region && g.region !== '*') out.add(g.region); });
  return out;
}

/**
 * Ce filtre a-t-il un sens dans le Pokédex ouvert ?
 *
 * LE PROBLÈME. Proposer « Gigamax » sur Pokémon Jaune, ou « Formes de Hisui »
 * sur Rubis, c'est promettre un tri qui ne peut rien rendre. Quinze pastilles
 * dont six ne servent à rien font douter des neuf autres.
 *
 * TOUT VIENT DE GAMES, RIEN N'EST RECOPIÉ. `mega`, `gmax` et `region` sont déjà
 * renseignés jeu par jeu, et SANS_CHROMATIQUES dit où le chromatique n'existe
 * pas. Une seconde table aurait été une seconde vérité, et celle-là se serait
 * trompée au premier jeu ajouté.
 *
 * HORS D'UN JEU, TOUT RESTE. Le Pokédex national et la collection HOME
 * rassemblent toutes les formes : rien à masquer.
 */
function filtrePertinent(mot){
  const jeu = (typeof gameByKey !== 'undefined' && typeof currentTab !== 'undefined')
    ? gameByKey[currentTab] : null;
  if(!jeu) return true;

  if(mot === 'mega') return !!jeu.mega;
  if(mot === 'gigamax') return !!jeu.gmax;
  if(regionsConnues().has(mot)) return jeu.region === '*' || jeu.region === mot;
  // Rouge, Bleu et Jaune n'ont aucun chromatique : ni « obtenus », ni « lockés ».
  if(mot === 'shiny' || mot === 'verrouille'){
    return typeof SANS_CHROMATIQUES === 'undefined'
        || SANS_CHROMATIQUES.indexOf(jeu.key) === -1;
  }
  return true;
}

/**
 * Aligne les pastilles sur le champ, et sur le Pokédex ouvert.
 *
 * Appelée depuis majJetonsRecherche(), qui tourne à chaque dessin de la grille :
 * les pastilles suivent donc une recherche tapée à la main, une remise à zéro
 * venue d'un autre écran, et un changement d'onglet.
 */
function majFiltresActifs(){
  const el = document.getElementById('filtresRapides');
  if(!el) return;
  el.querySelectorAll('.filtre-chip').forEach(function(b){
    const actif = filtreActif(b.dataset.mot);
    b.setAttribute('aria-pressed', String(actif));
    // ON NE CACHE JAMAIS UN FILTRE QUI AGIT. Masquer une pastille allumée en
    // changeant de Pokédex laisserait son mot dans la recherche : la grille se
    // viderait sans que rien à l'écran n'en donne la raison. Tant qu'il est
    // posé, il reste visible — donc retirable.
    b.hidden = !actif && !filtrePertinent(b.dataset.mot);
  });
}

// ---- Le câblage -------------------------------------------------------------

const filtresBascule = document.getElementById('filtresBascule');
const filtresRapides = document.getElementById('filtresRapides');

if(filtresBascule && filtresRapides){
  filtresBascule.addEventListener('click', function(){
    const ouvert = filtresRapides.hidden;
    filtresRapides.hidden = !ouvert;
    filtresBascule.setAttribute('aria-expanded', String(ouvert));
    if(ouvert) dessinerFiltres();
    try{ localStorage.setItem('pokearchive-filtres-ouverts', ouvert ? '1' : '0'); }
    catch(e){ /* stockage refusé */ }
  });

  // On rouvre là où on en était. Quelqu'un qui s'en sert s'en sert à chaque
  // visite ; quelqu'un qui les a fermées ne veut pas les revoir à chaque fois.
  let ouvertAvant = false;
  try{ ouvertAvant = localStorage.getItem('pokearchive-filtres-ouverts') === '1'; }
  catch(e){ /* stockage refusé */ }
  if(ouvertAvant){
    filtresRapides.hidden = false;
    filtresBascule.setAttribute('aria-expanded', 'true');
    dessinerFiltres();
  }
}
