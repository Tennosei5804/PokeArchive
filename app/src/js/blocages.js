// « Ce qui te bloquera » : ce qu'on ne finira pas seul, dans ce jeu-là.
//
// Script classique, chargé APRÈS dex.js, dont il reprend `obtentionDe()` et
// `MENTIONS_DE_LA_CATEGORIE`.
//
// LA QUESTION QU'ON SE POSE EN OUVRANT UN JEU. « Est-ce que je peux boucler ce
// Pokédex tout seul ? » L'application connaissait déjà la réponse et ne la
// disait à personne : le relevé des lieux range chaque entrée par mode
// d'obtention, et `ciblesDuJeu()` s'en sert depuis toujours — pour ÉCARTER ce
// qui n'est pas capturable. Il suffisait d'inverser le filtre.
//
// TROIS FAMILLES, ET ELLES NE SE VALENT PAS :
//
//   · ABSENT de cette version — il faut le faire venir d'ailleurs ;
//   · PAR ÉCHANGE — il faut quelqu'un en face ;
//   · UN SEUL EXEMPLAIRE — le scénario le donne une fois, et jamais deux.
//
// La troisième ne bloque pas un Pokédex ordinaire ; elle bloque un Living Dex,
// qui exige un exemplaire de chaque en même temps. On la montre donc à part
// plutôt que de la mêler aux deux autres, et l'écran dit laquelle te concerne.
//
// CE QU'ON NE DIT PAS. Un jeu dont le Pokédex n'a pas été relevé n'a pas de
// blocages « connus » : il a une absence de source. Les confondre reviendrait à
// annoncer que rien ne bloque là où l'on ne sait simplement pas — d'où le
// contrôle sur `pokedexReleve`, le même que celui de la fiche.

// Les catégories qui empêchent, et ce qu'on en dit.
const BLOCAGES = [
  { cle: 'absent', icone: '✖', titre: 'Absents de cette version',
    quoi: 'Il faut les faire venir d’un autre jeu — par échange, ou par Pokémon '
        + 'HOME. Voir 🧰 Outils → Transferts pour le chemin.' },
  { cle: 'echange', icone: '⇄', titre: 'Par échange seulement',
    quoi: 'Ils existent dans le jeu mais ne s’attrapent pas : il faut quelqu’un '
        + 'en face. C’est exactement ce à quoi sert « Je cherche ».' },
  { cle: 'unique', icone: '🎁', titre: 'Un seul exemplaire',
    quoi: 'Le scénario les donne une fois. Sans importance pour un Pokédex '
        + 'ordinaire ; décisif en Living Dex, qui les veut tous en même temps.' },
];

/**
 * Ce qui bloque une entrée, ou null si rien.
 *
 * L'ORDRE DES TESTS COMPTE. Une entrée peut porter plusieurs marques — les huit
 * échangeables de Diamant/Perle sont catégorisés « sauvage » et ne portent
 * l'échange qu'en mention, comme le dit déjà dex.js. On regarde donc du plus
 * bloquant au moins bloquant : absent l'emporte sur l'échange, qui l'emporte
 * sur l'exemplaire unique.
 */
function blocageDe(entry){
  const o = (typeof obtentionDe === 'function') ? obtentionDe(entry) : null;
  if(!o) return null;

  const a = function(m){ return o.mentions.indexOf(m) !== -1; };

  if(o.categorie === 'indisponible' || o.sansLigne || a('introuvable')) return 'absent';
  if(o.categorie === 'echange' || a('echange')) return 'echange';
  // Capturable dans l'herbe : « offert » n'est alors qu'un second chemin, et il
  // ne limite rien. Seul l'offert SEUL fait un exemplaire unique.
  if(o.categorie === 'offert' && !a('fixe') && !a('troupeau') && !a('rare')) return 'unique';
  return null;
}

/** Le jeu ouvert a-t-il un Pokédex relevé ? Sans lui, on ne conclut rien. */
function jeuReleve(){
  const releve = (typeof DONNEES_LIEUX !== 'undefined' && DONNEES_LIEUX.pokedexReleve) || [];
  return releve.indexOf(currentTab) !== -1;
}

/** Le bouton n'apparaît que là où l'on a de quoi répondre. */
function majBoutonBlocages(){
  if(!blocagesBtn) return;
  const jeu = (typeof gameByKey !== 'undefined') && gameByKey[currentTab];
  blocagesBtn.hidden = !jeu || typeof DONNEES_LIEUX === 'undefined' || !jeuReleve();
}

// ---- L'écran ----------------------------------------------------------------

async function ouvrirBlocages(){
  if(!blocagesOverlay) return;
  blocagesListe.innerHTML = '<div class="state-msg">Lecture du relevé…</div>';
  blocagesOverlay.style.display = 'flex';
  setTimeout(function(){ blocagesFermer.focus(); }, 10);

  // La réserve des lieux est chargée à la demande : sans elle, la question n'a
  // pas de réponse et l'écran resterait vide sans dire pourquoi.
  if(typeof DONNEES_LIEUX === 'undefined' && typeof chargerLieux === 'function'){
    try{ await chargerLieux(); }catch(e){ /* on le dira plus bas */ }
  }

  const jeu = gameByKey[currentTab];
  blocagesEyebrow.textContent = jeu ? jeu.title : 'Ce Pokédex';

  if(typeof DONNEES_LIEUX === 'undefined' || !jeuReleve()){
    blocagesTitre.textContent = 'Rien à dire ici';
    blocagesListe.innerHTML = '<div class="state-msg">Le Pokédex de ce jeu n’a pas '
      + 'été relevé : l’application ne sait pas ce qui s’y attrape, et ne va pas '
      + 'l’inventer.</div>';
    return;
  }

  // Sur la collection, chaque famille compte ce qu'il te MANQUE encore : un
  // blocage déjà franchi n'en est plus un.
  const b = bucketFor(currentTab);
  const paquets = {};
  BLOCAGES.forEach(function(f){ paquets[f.cle] = { tous: [], manquants: [] }; });

  scopeEntries.forEach(function(e){
    const cle = blocageDe(e);
    if(!cle || !paquets[cle]) return;
    paquets[cle].tous.push(e);
    if(!b.caught.has(e.name)) paquets[cle].manquants.push(e);
  });

  const bloquants = paquets.absent.manquants.length + paquets.echange.manquants.length;
  blocagesTitre.textContent = bloquants
    ? bloquants + (bloquants > 1 ? ' Pokémon te bloqueront' : ' Pokémon te bloquera')
    : 'Rien ne te bloque';

  blocagesListe.innerHTML = '';
  if(!bloquants && !paquets.unique.manquants.length){
    blocagesListe.innerHTML = '<div class="state-msg">Tout ce qui reste s’attrape '
      + 'dans ce jeu. Bonne chasse.</div>';
    return;
  }

  BLOCAGES.forEach(function(f){
    const p = paquets[f.cle];
    if(!p.manquants.length) return;
    blocagesListe.appendChild(familleBlocage(f, p));
  });
}

function familleBlocage(f, p){
  const bloc = document.createElement('div');
  bloc.className = 'blocage-famille';

  const titre = document.createElement('div');
  titre.className = 'blocage-titre';
  titre.textContent = f.icone + '  ' + f.titre + '  ·  ' + p.manquants.length;
  // Ce qu'on a déjà franchi, dit en passant : « 4 sur 12 » vaut mieux que 4,
  // parce qu'il dit aussi le chemin parcouru.
  if(p.tous.length > p.manquants.length){
    titre.textContent += ' sur ' + p.tous.length;
  }
  bloc.appendChild(titre);

  const quoi = document.createElement('p');
  quoi.className = 'blocage-quoi';
  quoi.textContent = f.quoi;
  bloc.appendChild(quoi);

  const liste = document.createElement('div');
  liste.className = 'blocage-liste';
  p.manquants.forEach(function(e){
    const l = document.createElement('button');
    l.type = 'button';
    l.className = 'blocage-entree';
    l.title = 'Ouvrir la fiche de ' + nomAffiche(e);

    const img = document.createElement('img');
    img.loading = 'lazy';
    img.alt = '';
    img.src = pokeosHomeUrl(e.id, false);
    img.addEventListener('error', function(){ img.src = officialArtworkUrl(e.id, false); });
    l.appendChild(img);

    const nom = document.createElement('span');
    nom.textContent = nomAffiche(e);
    l.appendChild(nom);

    // « Je cherche » est déjà inscrit : on le dit ici plutôt que d'obliger à
    // ouvrir la fiche pour le vérifier.
    if(typeof chercheDeja === 'function' && chercheDeja(e.name)){
      const marque = document.createElement('em');
      marque.className = 'blocage-cherche';
      marque.textContent = '🔎';
      marque.title = 'Dans ta liste d’envies';
      l.appendChild(marque);
    }

    l.addEventListener('click', function(){
      fermerBlocages();
      openPreview(e, null);
    });
    liste.appendChild(l);
  });
  bloc.appendChild(liste);
  return bloc;
}

function fermerBlocages(){
  if(blocagesOverlay) blocagesOverlay.style.display = 'none';
}

// ---- Le câblage -------------------------------------------------------------

if(blocagesBtn) blocagesBtn.addEventListener('click', ouvrirBlocages);
if(blocagesFermer) blocagesFermer.addEventListener('click', fermerBlocages);
if(blocagesOverlay){
  blocagesOverlay.addEventListener('click', function(e){
    if(e.target === blocagesOverlay) fermerBlocages();
  });
}
document.addEventListener('keydown', function(e){
  if(e.key === 'Escape' && blocagesOverlay
     && blocagesOverlay.style.display === 'flex') fermerBlocages();
});
