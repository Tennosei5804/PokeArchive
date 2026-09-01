// Ce que le banc vérifie. Chargé par outils/banc.py, jamais par l'application.
//
// La règle pour ajouter quelque chose ici : un bug est passé, on écrit la
// vérification qui l'aurait arrêté. Pas de tests écrits « au cas où » — ils
// vieillissent mal et personne ne les relit. Chaque entrée ci-dessous porte
// donc le nom du problème réel qu'elle surveille.

const BANC = [];
function verifier(titre, quoi, fn){ BANC.push({ titre: titre, quoi: quoi, fn: fn }); }

const attendre = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };
const CB = /-(mega|primal|eternamax)(-|$)/;

// ---------------------------------------------------------------------------

verifier('Le périmètre HOME',
  'Rien d\'indéposable dans la collection — les Méga y sont restées jusqu\'au 22 août 2026',
  function(){
    const avant = niveauFormes;
    niveauFormes = 4;
    const intrus = poolHome().filter(function(e){ return horsDeHome(e.name); });
    const total = poolHome().length;
    niveauFormes = avant;
    if(intrus.length) return 'échec : ' + intrus.length + ' entrée(s), dont ' + intrus[0].name;
    return 'aucune sur ' + total + ' entrées au niveau 4';
  });

verifier('Le périmètre HOME',
  'Le niveau 4 tombe sur le relevé Pokékalos, à une entrée près',
  function(){
    // L'écart connu et unique : Farfuret de Hisui ♀, que PokeAPI ne modélise pas
    // comme une forme distincte. Au-delà de 1, c'est une règle qui a bougé.
    if(!extraFormEntries) return 'ignoré : les formes supplémentaires ne sont pas chargées';
    const avant = niveauFormes;
    niveauFormes = 4;
    const n = poolHome().length;
    niveauFormes = avant;
    const attendu = homeTotal(4);
    if(Math.abs(n - attendu) > 1) return 'échec : ' + n + ' au lieu de ' + attendu;
    return n + ' contre ' + attendu + ' au relevé';
  });

verifier('Le périmètre HOME',
  'La référence Pokékalos ne contient elle-même aucune forme de combat',
  function(){
    // Si un jour la référence en contient, c'est que HOME a changé de règle et
    // que la nôtre est à revoir — pas que le relevé est faux.
    const tous = ['base', 'regionale', 'alt', 'genre'].reduce(function(a, k){
      return a.concat(homeNiveau(k));
    }, []);
    const suspects = tous.filter(function(s){ return /mega|primal|eternamax|gigamax/.test(s); });
    // « megapagos » et « meganium » contiennent « mega » sans être des Méga.
    const vrais = suspects.filter(function(s){ return CB.test(s); });
    if(vrais.length) return 'échec : la référence contient ' + vrais.join(', ');
    return 'confirmé sur ' + tous.length + ' entrées déposables';
  });

verifier('Le périmètre HOME',
  'Les Pokédex de jeux gardent leurs Méga : Z-A les recense',
  function(){
    const brut = poolEntries().filter(function(e){ return CB.test(e.name); });
    if(!brut.length) return 'échec : les formes de combat ont disparu de la réserve entière';
    return brut.length + ' formes de combat toujours disponibles pour les scopes de jeu';
  });

// ---------------------------------------------------------------------------

verifier('Le périmètre HOME',
  'Le niveau 1 donne exactement une entrée par espèce — 1025, comme la référence',
  async function(){
    const avant = niveauFormes;
    niveauFormes = 1;
    const n = poolHome().length;
    const especes = new Set(poolHome().map(function(e){ return e.speciesId; })).size;
    niveauFormes = avant;
    if(n !== especes) return 'échec : ' + n + ' entrées pour ' + especes + ' espèces';
    if(n !== homeTotal(1)) return 'échec : ' + n + ' au lieu de ' + homeTotal(1);
    return n + ' entrées, une par espèce';
  });

verifier('Le périmètre HOME',
  'Les quatre niveaux sont emboîtés : chacun contient le précédent',
  async function(){
    const avant = niveauFormes;
    const tailles = [];
    const ensembles = [];
    for(let n = 1; n <= 4; n++){
      niveauFormes = n;
      const noms = poolHome().map(function(e){ return e.name; });
      tailles.push(noms.length);
      ensembles.push(new Set(noms));
    }
    niveauFormes = avant;
    for(let i = 1; i < 4; i++){
      const perdus = [...ensembles[i - 1]].filter(function(x){ return !ensembles[i].has(x); });
      if(perdus.length){
        return 'échec : le niveau ' + (i + 1) + ' perd ' + perdus.length
          + ' entrée(s) du niveau ' + i + ', dont ' + perdus[0];
      }
    }
    return tailles.join(' → ');
  });

verifier('Le périmètre HOME',
  'Le niveau de formes appartient à l\'aventure, pas à la machine',
  async function(){
    if(!profilCourant) return 'ignoré : aucune aventure ouverte';
    const depart = niveauFormes;
    const sel = document.getElementById('niveauFormes');
    window.__appels = [];
    sel.value = '2';
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await attendre(700);
    const envoi = window.__appels.find(function(a){ return a.cmd === 'modifier_profil'; });
    if(!envoi) return 'échec : rien n\'est parti au serveur';
    if(envoi.args.niveauFormes !== 2){
      return 'échec : niveauFormes=' + envoi.args.niveauFormes + ' au lieu de 2';
    }
    if(profilCourant.niveau_formes !== 2) return 'échec : l\'aventure n\'a pas suivi';

    // Et l'ouverture d'une autre aventure doit appliquer LE SIEN.
    const autre = profilsConnus.find(function(p){ return p.id !== profilCourant.id; });
    let bascule = 'une seule aventure, bascule non vérifiée';
    if(autre){
      await ouvrirProfil(autre);
      await attendre(700);
      bascule = (niveauFormes === autre.niveau_formes)
        ? 'ouvrir « ' + autre.nom +' » applique son niveau ' + autre.niveau_formes
        : 'échec : niveau ' + niveauFormes + ' au lieu de ' + autre.niveau_formes;
    }
    if(String(bascule).indexOf('échec') === 0) return bascule;
    sel.value = String(depart);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
    await attendre(500);
    return 'enregistré sur l\'aventure · ' + bascule;
  });

// ---------------------------------------------------------------------------

// Les Pokédex de jeux, contre le relevé Pokékalos de donnees-pokedex.js.
//
// Le relevé nomme, la réserve numérote : chaque nom est ramené à son espèce
// avant comparaison. Trois pièges, tous rencontrés en écrivant ceci :
//   · ♀ et ♂ portent l'espèce — les effacer confond les deux Nidoran, et le
//     relevé national retombait alors sur 492 espèces pour 493 noms ;
//   · la forme de base porte parfois un qualificatif — « Mistigrix (Mâle) »
//     côté application, « Lougaroc forme Nocturne » côté relevé ;
//   · le relevé colle l'exclusivité de version au nom : « Capumain Violet ».
function clefEspece(nom){
  return String(nom).toLowerCase().replace(/♀/g, '-f').replace(/♂/g, '-m')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9-]/g, '');
}

function indexDesEspeces(){
  const parNom = new Map(), nomDe = new Map();
  allEntries.forEach(function(e){
    const base = (typeof nomEspece === 'function') ? nomEspece(e.display) : e.display;
    if(!parNom.has(clefEspece(base))) parNom.set(clefEspece(base), e.speciesId);
    if(!nomDe.has(e.speciesId)) nomDe.set(e.speciesId, base);
  });
  return { parNom: parNom, nomDe: nomDe };
}

function especeDuReleve(nom, parNom){
  const n = nom.replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s+(forme|motif|style)\s+.*$/i, '')
    .replace(/\s+(Écarlate|Violet|Épée|Bouclier)$/i, '')
    .replace(/\s+d[eu']?\s*(Alola|Galar|Hisui|Paldea)$/i, '')
    .replace(/^(Méga-|Primo-)/i, '').replace(/\s+[XY]$/, '').trim();
  const id = parNom.get(clefEspece(n));
  return id === undefined ? (parNom.get(clefEspece(nom)) ?? null) : id;
}

// Ce que l'application compte EN PLUS du relevé, et pourquoi. Tout autre écart
// fait échouer : c'est là qu'une régénération qui dérape se verrait.
const SURPLUS_ADMIS = {
  // Pokékalos ne donne pas de ligne aux formes régionales du Disque Indigo :
  // « Ramoloss de Galar » n'y figure que dans la liste des quêtes, et le mot
  // « Alola » pas une seule fois. PokeAPI, lui, les compte.
  'blueberry': ['Feunard', 'Flagadoss', 'Goupix', 'Gravalanch', 'Grolem', 'Grotadmorv',
                'Noadkoko', 'Plumeline', 'Qwilfish', 'Racaillou', 'Ramoloss', 'Roigada',
                'Sabelette', 'Sablaireau', 'Tadmorv', 'Taupiqueur', 'Triopikeur'],
  // La page de Sinnoh s'arrête à 150 lignes : Manaphy, qui ne s'obtient pas
  // dans le jeu, n'y a pas la sienne. Le Pokédex du jeu, lui, le compte.
  'original-sinnoh': ['Manaphy']
};

verifier('Les Pokédex de jeux',
  'Chacun tombe sur le relevé Pokékalos, à ce qu\'il ne liste pas près',
  function(){
    if(typeof RELEVE_POKEDEX === 'undefined') return 'ignoré : relevé non chargé';
    const idx = indexDesEspeces();
    const fautes = [];
    let exacts = 0, compares = 0;
    Object.keys(RELEVE_POKEDEX).forEach(function(cle){
      const noms = RELEVE_POKEDEX[cle];
      const inconnus = noms.filter(function(n){ return especeDuReleve(n, idx.parNom) === null; });
      if(inconnus.length){
        fautes.push(cle + ' : ' + inconnus.length + ' nom(s) que la réserve ignore — ' + inconnus[0]);
        return;
      }
      const especes = new Set(noms.map(function(n){ return especeDuReleve(n, idx.parNom); }));
      const dex = DONNEES_EMBARQUEES.dex[cle];
      if(!dex) return;                    // « national-gen4 » n'est pas un Pokédex de l'app
      compares++;
      const dansApp = new Set(dex.map(function(p){ return p[0]; }));
      const manquants = [];
      especes.forEach(function(id){ if(!dansApp.has(id)) manquants.push(idx.nomDe.get(id)); });
      if(manquants.length){
        fautes.push(cle + ' : ' + manquants.length + ' manquant(s) — ' + manquants.slice(0, 3).join(', '));
      }
      const surplus = [];
      dansApp.forEach(function(id){ if(!especes.has(id)) surplus.push(idx.nomDe.get(id)); });
      const admis = (SURPLUS_ADMIS[cle] || []).slice().sort().join(',');
      if(surplus.sort().join(',') !== admis){
        fautes.push(cle + ' : surplus inattendu — ' + (surplus.join(', ') || 'aucun')
                    + ' au lieu de ' + (admis || 'aucun'));
      } else if(!surplus.length){
        exacts++;
      }
    });
    if(fautes.length) return 'échec : ' + fautes.join(' · ');
    return compares + ' Pokédex comparés, ' + exacts + ' au Pokémon près, '
      + Object.keys(SURPLUS_ADMIS).length + ' avec un surplus connu';
  });

// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------

// Ce qui n'est pas un jeu Pokémon officiel, et n'a donc pas de relevé : le
// Pokédex HOME, qui n'a pas de clé, et Cobblemon, qui est un mod.
//
// Tout le reste doit être couvert. Depuis le passage à Pokébip, ça l'est —
// Rubis Ω / Saphir α compris, que Pokékalos ne documentait que lieu par lieu.
// Un jeu qui retomberait à zéro ligne voudrait dire qu'une page a changé de
// forme sans que personne s'en aperçoive.
const HORS_RELEVE = ['', 'cobblemon'];

verifier('Les lieux',
  'Le relevé des lieux se range, et n\'invente aucun jeu',
  async function(){
    let reserve;
    try{ reserve = await chargerLieux(); }
    catch(e){ return 'ignoré : réserve des lieux absente (py outils/relever-lieux.py)'; }

    const fautes = [];
    const cles = Object.keys(reserve.jeux);

    const inconnus = cles.filter(function(k){ return !gameByKey[k]; });
    if(inconnus.length) fautes.push('jeux inconnus de donnees.js : ' + inconnus.join(', '));

    const attendus = Object.keys(gameByKey).filter(function(k){
      return HORS_RELEVE.indexOf(k) === -1;
    });
    const manquants = attendus.filter(function(k){
      const table = reserve.jeux[k];
      return !table || !Object.keys(table).length;
    });
    if(manquants.length) fautes.push('jeux sans la moindre ligne : ' + manquants.join(', '));

    const interdits = cles.filter(function(k){ return HORS_RELEVE.indexOf(k) !== -1; });
    if(interdits.length) fautes.push('relevé pour ce qui n\'est pas un jeu : ' + interdits.join(', '));

    // Une clef du relevé est soit une espèce, soit une FORME : Rattata est 19,
    // Rattata d'Alola est 10091, et les deux ont leur ligne là où la source les
    // distingue. Les deux jeux d'identifiants sont donc légitimes.
    const especes = new Set();
    allEntries.forEach(function(e){ especes.add(e.speciesId); especes.add(e.id); });
    let lignes = 0, sauvages = 0, videCat = 0, videTexte = 0, horsReserve = 0;
    cles.forEach(function(k){
      const table = reserve.jeux[k];
      Object.keys(table).forEach(function(id){
        lignes++;
        const ligne = table[id];
        const texte = reserve.textes[ligne[0]];
        const categorie = reserve.categories[ligne[1]];
        if(!texte) videTexte++;
        if(!categorie) videCat++;
        if(!especes.has(parseInt(id, 10))) horsReserve++;
        if(categorie === 'sauvage') sauvages++;
      });
    });
    // Les mentions viennent des pages complémentaires : une mention inconnue
    // veut dire qu'une page a été rattachée à un genre qui n'existe pas.
    let mentions = 0;
    cles.forEach(function(k){
      const table = reserve.jeux[k];
      Object.keys(table).forEach(function(id){
        (table[id][2] || []).forEach(function(i){
          mentions++;
          if(!reserve.mentions || !reserve.mentions[i]) fautes.push('mention inconnue : ' + i);
        });
      });
    });

    if(videTexte) fautes.push(videTexte + ' ligne(s) sans texte');
    if(videCat) fautes.push(videCat + ' ligne(s) sans catégorie');
    if(horsReserve) fautes.push(horsReserve + ' ligne(s) sur une espèce absente de la réserve');

    // Un jeu dont plus rien n'est capturable trahit une page mal lue : c'est
    // exactement ce qui arrive quand la colonne « Localisation » se décale.
    const muets = cles.filter(function(k){
      const table = reserve.jeux[k];
      return !Object.keys(table).some(function(id){ return table[id][1] === 0; });
    });
    if(muets.length) fautes.push('aucun Pokémon capturable dans : ' + muets.join(', '));

    if(fautes.length) return 'échec : ' + fautes.join(' · ');
    return cles.length + ' jeux, ' + lignes + ' lignes, ' + sauvages + ' capturables, '
      + mentions + ' mentions, ' + reserve.textes.length + ' textes distincts';
  });

// ---------------------------------------------------------------------------

verifier('Les lieux',
  'Chaque mention du relevé a son libellé, et le filtre la connaît',
  async function(){
    let reserve;
    try{ reserve = await chargerLieux(); }
    catch(e){ return 'ignoré : réserve des lieux absente'; }

    // Une mention sans libellé s'affiche par sa clé : la fiche montrait
    // « poke-radar » et « parc » en toutes lettres, au milieu de puces
    // rédigées. Rien ne cassait, et c'est bien le problème — seul l'œil
    // l'attrapait, et seulement si l'on ouvrait la bonne fiche.
    //
    // Le filtre a la même dette : une mention absente de
    // MENTIONS_DE_LA_CATEGORIE ne fait remonter sa carte sous aucune
    // catégorie, et le Pokémon disparaît du tri sans prévenir.
    const posees = new Set();
    Object.keys(reserve.jeux).forEach(function(k){
      const table = reserve.jeux[k];
      Object.keys(table).forEach(function(id){
        (table[id][2] || []).forEach(function(i){ posees.add(reserve.mentions[i]); });
      });
    });

    const fautes = [];
    const sansLibelle = [...posees].filter(function(m){ return !LIBELLES_MENTION[m]; });
    if(sansLibelle.length) fautes.push('sans libellé : ' + sansLibelle.join(', '));

    const connuesDuFiltre = new Set();
    Object.keys(MENTIONS_DE_LA_CATEGORIE).forEach(function(c){
      MENTIONS_DE_LA_CATEGORIE[c].forEach(function(m){ connuesDuFiltre.add(m); });
    });
    // Trois mentions qualifient sans dire comment on l'obtient : « shiny-lock »,
    // qui est d'ailleurs un choix du filtre à lui seul, « exclusif », qui vaut
    // pour un Pokémon sauvage comme pour un offert, et « nouveau ». Les ranger
    // sous une catégorie ferait remonter n'importe quoi.
    const SANS_CATEGORIE = ['shiny-lock', 'exclusif', 'nouveau'];
    const horsFiltre = [...posees].filter(function(m){
      return SANS_CATEGORIE.indexOf(m) === -1 && !connuesDuFiltre.has(m);
    });
    if(horsFiltre.length) fautes.push('inconnues du filtre : ' + horsFiltre.join(', '));

    if(fautes.length) return 'échec : ' + fautes.join(' · ');
    return posees.size + ' mentions posées, toutes libellées et filtrables';
  });

// ---------------------------------------------------------------------------

verifier('Les lieux',
  'Le filtre d\'obtention trouve ce que la fiche affiche',
  async function(){
    let reserve;
    try{ reserve = await chargerLieux(); }
    catch(e){ return 'ignoré : réserve des lieux absente'; }

    // Diamant / Perle : huit Pokémon s'y obtiennent par échange interne, et
    // tous sont catégorisés « sauvage » — ils se croisent aussi dans l'herbe.
    // Le filtre ne lisait que la catégorie et ne rendait donc rien, alors que
    // la fiche affichait bien « Échange interne ». C'est le genre de bug qu'on
    // ne voit qu'en cliquant, et qui fait croire à une réserve vide.
    const table = reserve.jeux['dp'];
    if(!table) return 'ignoré : Diamant / Perle absent du relevé';
    const attendus = new Set();
    Object.keys(table).forEach(function(id){
      const mentions = (table[id][2] || []).map(function(i){ return reserve.mentions[i]; });
      if(mentions.indexOf('echange') !== -1) attendus.add(parseInt(id, 10));
    });
    if(!attendus.size) return 'ignoré : aucun échange interne relevé pour Diamant / Perle';

    const departOnglet = currentTab, departFiltre = filterEl.value;
    let trouves = 0;
    try{
      showPage('dp');
      await attendre(1200);
      filterEl.value = 'obt-echange';
      renderList(true);
      await attendre(300);
      trouves = currentFiltered.filter(function(e){ return attendus.has(e.speciesId); }).length;
    } finally {
      filterEl.value = departFiltre;
      showPage(departOnglet);
      await attendre(400);
    }
    if(!trouves) return 'échec : ' + attendus.size + ' échanges relevés, aucun retenu par le filtre';
    return trouves + ' des ' + attendus.size + ' échanges internes retrouvés par le filtre';
  });

// ---------------------------------------------------------------------------

verifier('Les lieux',
  'Une absence de source n\'est dite « ne se capture pas » que là où le Pokédex est relevé',
  async function(){
    let reserve;
    try{ reserve = await chargerLieux(); }
    catch(e){ return 'ignoré : réserve des lieux absente'; }
    const releves = reserve.pokedexReleve || [];
    if(!releves.length) return 'échec : la réserve ne dit pas quels Pokédex sont relevés';

    // L'inférence a deux moitiés, et chacune peut mentir dans un sens.
    //
    // Là où aucun Pokédex n'est relevé, une espèce non documentée est absente
    // de la SOURCE, pas du jeu : la dire « ne se capture pas » serait inventer.
    // Depuis le passage à Pokébip il n'y a plus de jeu dans ce cas, mais la
    // moitié se garde — une source qui se retirerait la ferait revivre.
    //
    // Là où le Pokédex EST relevé — les vingt-deux aujourd'hui — l'inférence
    // doit au contraire jouer : une espèce sans ligne ne se capture pas, et
    // c'est une réponse, pas un blanc. Ne pas la donner viderait la pastille
    // sur les trois quarts d'un Pokédex national.
    const sansPokedex = Object.keys(reserve.jeux).filter(function(k){
      return releves.indexOf(k) === -1;
    });

    // On interroge la règle plutôt que d'attendre qu'un trou se présente : les
    // Pokédex nationaux couvrent désormais toutes les espèces de leur onglet,
    // et chercher une espèce sans ligne n'en trouvait aucune — la vérification
    // passait sans rien éprouver. Une espèce inventée, hors de toute table,
    // pose la question directement.
    const absente = { speciesId: 99999 };
    const depart = currentTab;
    const fautes = [];
    let muets = 0, parlants = 0;
    try{
      for(const cle of Object.keys(reserve.jeux)){
        if(!gameByKey[cle]) continue;
        showPage(cle);
        await attendre(500);
        const dit = obtentionDe(absente);
        if(releves.indexOf(cle) === -1){
          muets++;
          if(dit) fautes.push(cle + ' : une espèce sans source est dite « ne se capture pas »');
        } else {
          parlants++;
          if(!dit || !dit.sansLigne){
            fautes.push(cle + ' : une espèce sans ligne reste muette alors que'
                        + ' le Pokédex est relevé');
          }
        }
      }
    } finally {
      showPage(depart);
      await attendre(400);
    }
    if(fautes.length) return 'échec : ' + fautes.join(' · ');
    return parlants + ' jeu(x) où l\'absence se dit, ' + muets + ' où elle se tait'
      + (sansPokedex.length ? '' : ' — tous les Pokédex sont relevés');
  });

// ---------------------------------------------------------------------------

verifier('Les sprites',
  'Chaque jeu jusqu\'à la cinquième génération a son jeu de sprites, et pas les autres',
  function(){
    if(typeof spritesDuJeu !== 'function') return 'ignoré : sprites d\'époque absents';
    const fautes = [];

    // Ce que la table doit dire, jeu par jeu. Trois pièges valent d'être fixés
    // ici : Jaune n'a pas les mêmes sprites que Rouge/Bleu, la première
    // génération n'a pas de chromatiques du tout, et rien n'existe en 2D à
    // partir de X/Y — le bouton doit alors disparaître plutôt que de proposer
    // une bascule qui ne changerait rien.
    const ATTENDU = {
      rby: 'gen1rb', jaune: 'gen1', gsc: 'gen2g', cristal: 'gen2',
      rse: 'gen3rs', emeraude: 'gen3', frlg: 'gen3frlg',
      dp: 'gen4', pt: 'gen4', hgss: 'gen4', bw: 'gen5', b2w2: 'gen5'
    };
    Object.keys(ATTENDU).forEach(function(cle){
      const jeu = spritesDuJeu(cle);
      if(!jeu){ fautes.push(cle + ' : aucun jeu de sprites'); return; }
      if(jeu.normal !== ATTENDU[cle]){
        fautes.push(cle + ' : ' + jeu.normal + ' au lieu de ' + ATTENDU[cle]);
      }
      const url = spriteEpoqueUrl(cle, 'pikachu', false);
      if(url.indexOf('play.pokemonshowdown.com/sprites/' + ATTENDU[cle] + '/') === -1){
        fautes.push(cle + ' : adresse inattendue — ' + url);
      }
    });

    // Pas de chromatiques en première génération : la vue shiny doit rendre le
    // sprite normal, et non une adresse qui n'existe pas.
    ['rby', 'jaune'].forEach(function(cle){
      if(spriteEpoqueUrl(cle, 'pikachu', true) !== spriteEpoqueUrl(cle, 'pikachu', false)){
        fautes.push(cle + ' : une vue shiny qui n\'existe pas en gen 1');
      }
    });

    // Et rien au-delà de la cinquième génération.
    ['xy', 'sm', 'swsh', 'sv', 'za', 'letsgo', 'bdsp', 'pla'].forEach(function(cle){
      if(spritesDuJeu(cle)) fautes.push(cle + ' : des sprites 2D annoncés à tort');
    });

    if(fautes.length) return 'échec : ' + fautes.join(' · ');
    return Object.keys(ATTENDU).length + ' jeux pourvus, 8 sans sprite 2D, gen 1 sans shiny';
  });

// ---------------------------------------------------------------------------

verifier('Les noms',
  'Un nom d\'aventure d\'une lettre est refusé côté client (le serveur impose 2)',
  function(){
    if(typeof validerNomProfil !== 'function') return 'échec : validerNomProfil n\'existe pas';
    const cas = [['A', true], ['Ab', false], ['  A  ', true], ['__', true], ['Aventure 1', false]];
    const ratés = cas.filter(function(c){ return !!validerNomProfil(c[0]) !== c[1]; });
    if(ratés.length) return 'échec sur ' + JSON.stringify(ratés.map(function(c){ return c[0]; }));
    return cas.length + ' cas conformes à la règle du serveur';
  });

verifier('Les noms',
  'Le pseudo suit le nettoyage du serveur, souligné compris',
  function(){
    if(typeof nettoyerPseudoClient !== 'function') return 'échec : nettoyerPseudoClient absent';
    const cas = [['Tennosei_', 'Tennosei'], ['Tenn_sei', 'Tenn_sei'],
                 ['a  b', 'a b'], ['Tenn@sei', 'Tennsei']];
    const ratés = cas.filter(function(c){ return nettoyerPseudoClient(c[0]) !== c[1]; });
    if(ratés.length){
      return 'échec : « ' + ratés[0][0] + ' » donne « ' + nettoyerPseudoClient(ratés[0][0])
        + ' » au lieu de « ' + ratés[0][1] + ' »';
    }
    return cas.length + ' cas conformes';
  });

// ---------------------------------------------------------------------------

verifier('Les talents',
  'Un champ CSV entre guillemets peut contenir un saut de ligne',
  function(){
    // Le lecteur découpait le texte sur « \n » avant de le lire. Tant qu'on ne
    // lisait que des noms, personne ne s'en apercevait ; ability_prose.csv en
    // contient, et donnait 1441 lignes au lieu de 809 — 632 morceaux de phrase
    // pris pour des enregistrements.
    if(typeof csvLignes !== 'function') return 'échec : csvLignes n\'existe pas';
    const lignes = csvLignes('a,b\n1,"deux\nlignes"\n2,"gui""llemet"\n');
    if(lignes.length !== 3) return 'échec : ' + lignes.length + ' lignes au lieu de 3';
    if(lignes[1][1] !== 'deux\nlignes') return 'échec : le saut de ligne cité a été perdu';
    if(lignes[2][1] !== 'gui"llemet') return 'échec : le guillemet doublé n\'est pas déchiffré';
    return '3 lignes, saut de ligne et guillemet doublé conservés';
  });

verifier('Les talents',
  'Chaque talent porté par une entrée dit ce qu\'il fait',
  function(){
    // La fiche n'affichait que le nom : « Multiécaille » n'apprend rien à qui
    // ne le connaît pas déjà. Les deux phrases viennent de fichiers que rien
    // n'oblige à rester traduits — si PokeAPI cesse de les fournir, c'est ici
    // qu'on le voit, et non sur une fiche muette.
    const f = (typeof DONNEES_EMBARQUEES === 'undefined') ? null : DONNEES_EMBARQUEES.fiches;
    if(!f || !f.dico || !f.dico.talents) return 'ignoré : réserve absente';
    const dico = f.dico.talents;
    const cles = Object.keys(dico);
    if(!cles.some(function(k){ return dico[k].effet; })){
      return 'ignoré : réserve antérieure à la collecte des talents '
        + '(relancer generer-donnees.html)';
    }

    // Le dictionnaire est taillé sur ce que les entrées portent : un talent
    // cité par une fiche et absent du dictionnaire serait un trou.
    const cites = new Set();
    Object.keys(f.especes).forEach(function(id){
      (f.especes[id].talents || []).forEach(function(t){ cites.add(String(t[0])); });
    });
    const orphelins = Array.from(cites).filter(function(id){ return !dico[id]; });
    if(orphelins.length){
      return 'échec : ' + orphelins.length + ' talent(s) cités sans nom, dont le n° '
        + orphelins[0];
    }

    const sansEffet = cles.filter(function(k){ return !dico[k].effet; });
    const sansTexte = cles.filter(function(k){ return !dico[k].jeu; });
    // Le saut de ligne s'écrit de deux façons dans le même fichier PokeAPI, et
    // la seconde passait telle quelle : « ses PV\nsont au maximum ».
    const abimes = cles.filter(function(k){
      return /\\[nf]|[\n\r]/.test((dico[k].effet || '') + (dico[k].jeu || ''));
    });
    if(abimes.length){
      return 'échec : ' + abimes.length + ' texte(s) portent un saut de ligne non résolu, '
        + 'dont « ' + dico[abimes[0]].fr + ' »';
    }
    if(sansEffet.length > 12){
      return 'échec : ' + sansEffet.length + ' talents sans effet, dont « '
        + dico[sansEffet[0]].fr + ' »';
    }
    return cles.length + ' talents · ' + (cles.length - sansEffet.length) + ' avec effet, '
      + (cles.length - sansTexte.length) + ' avec le texte du jeu';
  });

// ---------------------------------------------------------------------------

verifier('Les dialogues',
  'La tabulation reste dans la fenêtre de confirmation',
  async function(){
    const p = demanderConfirmation({ titre: 'Test', libelleAction: 'Oui' });
    await attendre(120);
    const valider = document.getElementById('confirmValider');
    const annuler = document.getElementById('confirmAnnuler');
    valider.focus();
    document.getElementById('confirmOverlay').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    await attendre(60);
    const boucle = document.activeElement === annuler || document.activeElement === valider;
    annuler.click();
    await p;
    return boucle ? 'le focus reste dans la fenêtre'
                  : 'échec : le focus est parti sur ' + (document.activeElement.id || 'la page');
  });

verifier('Les dialogues',
  'Le garde-fou de la dernière aventure existe sur les DEUX écrans',
  async function(){
    if(typeof confirmerSuppression !== 'function') return 'échec : confirmerSuppression absent';
    // Les deux écrans passent désormais par cette seule fonction : si elle
    // refuse, ils refusent tous les deux. C'est exactement ce qui manquait à la
    // modale des aventures, qui faisait recopier le nom avant le refus.
    const source = String(confirmerSuppression);
    if(source.indexOf('profilsConnus.length') === -1){
      return 'échec : plus de garde-fou dans confirmerSuppression';
    }
    const appels = ['supprimerAventure'].filter(function(f){
      return typeof window[f] === 'function' && String(window[f]).indexOf('confirmerSuppression') === -1;
    });
    if(appels.length) return 'échec : ' + appels.join(', ') + ' ne passe plus par le helper';
    return 'un seul point de refus, partagé';
  });

// ---------------------------------------------------------------------------

verifier('L\'accueil',
  'Les trois raccourcis arrivent au Pokédex avec leur préréglage',
  async function(){
    // Ce que chaque bouton promet : un filtre, et une vue.
    const PROMESSES = { all:['all', false],
                        missing:['uncaught', false],
                        hunt:['normal-not-shiny', true] };
    const rates = [];
    for(const cle of Object.keys(PROMESSES)){
      // On part de l'accueil à chaque fois : c'est de là que le dresseur clique,
      // et c'est ce changement d'onglet qui remettait les filtres à zéro.
      showPage('home');
      const bouton = document.querySelector('[data-goto=\"' + cle + '\"]');
      if(!bouton) return 'ignoré : pas de bouton « ' + cle + ' » dans la page';
      bouton.click();
      await attendre(80);
      const promis = PROMESSES[cle];
      if(filterEl.value !== promis[0] || shinyView !== promis[1]){
        rates.push(cle + ' → filtre ' + filterEl.value + ', shiny ' + shinyView
                   + ' au lieu de ' + promis[0] + ', ' + promis[1]);
      }
    }
    showPage('home');
    if(rates.length) return 'échec : ' + rates.join(' · ');
    return Object.keys(PROMESSES).length + ' raccourcis, filtre et vue conformes';
  });

// ---------------------------------------------------------------------------

// Les pages de generation (outils/generer-*.html) rejouent l'interface sans
// compte.js ni app.js : elles n'ont ni session a tenir ni pont Tauri a nourrir.
// Six appels visent pourtant ces deux fichiers — verifier.py les liste sous
// « appels a une fonction que la page ne charge pas ». Le banc les retire tous
// les six et rejoue les chemins qui y menent : ce qui n'est pas garde casse.
//
// Ils etaient sept le 22 aout 2026, et deux cassaient vraiment : gotoDex()
// appelait setShinyView() a nu — d'ou vueShiny(), le garde d'accueil.js — et
// dessinerChasses() appelait depuisQuand(), reste dans compte.js par accident
// d'ecriture alors qu'il ne calcule qu'une date. Il vit dans noyau.js depuis,
// et ne figure donc plus dans cette liste.
const DEFINIS_AILLEURS = ['chargerDernieresCaptures', 'chargerDresseurs', 'chargerProfil',
                          'enregistrerNiveauProfil', 'majAccueilAventure', 'setShinyView'];

verifier('Les pages de génération',
  'Sans compte.js ni app.js, aucun chemin de l\'interface ne casse',
  async function(){
    const chemins = [
      { quoi:'showPage(dresseurs)', jouer: function(){ showPage('dresseurs'); } },
      { quoi:'showPage(profil)',    jouer: function(){ showPage('profil'); } },
      { quoi:'updateHome()',        jouer: function(){ updateHome(); } },
      { quoi:'gotoDex(missing)',    jouer: function(){ gotoDex('missing'); } },
      { quoi:'dessinerChasses()',   jouer: function(){
          // La chasse est datée : c'est la ligne « commencée … » qui cassait,
          // et le seul chemin de chasse.js à emprunter quoi que ce soit
          // d'extérieur. On la garde pour que le déménagement tienne.
          chasses.push({ dex:'swsh', espece:'pikachu', compteur:1,
                         methode:'pleine', debut:new Date().toISOString() });
          try{ dessinerChasses(); } finally { chasses.pop(); }
        } },
      { quoi:'le sélecteur 🧬', jouer: async function(){
          // Le seul chemin asynchrone : l'écouteur de « change » est async, donc
          // ce qu'il casse part en rejet non capturé et non en exception.
          const sel = document.getElementById('niveauFormes');
          const depart = sel.value;
          sel.value = depart === '2' ? '3' : '2';
          sel.dispatchEvent(new Event('change'));
          await attendre(400);
          sel.value = depart;
          sel.dispatchEvent(new Event('change'));
          await attendre(400);
        } }
    ];

    const sauve = {};
    DEFINIS_AILLEURS.forEach(function(n){ sauve[n] = window[n]; });
    const fantomes = DEFINIS_AILLEURS.filter(function(n){ return typeof sauve[n] !== 'function'; });
    if(fantomes.length) return 'ignoré : ' + fantomes.join(', ') + ' n\'existe déjà pas';

    const filtres = [filterEl.value, genFilterEl.value, searchEl.value];
    const casses = [], rejets = [];
    const surRejet = function(e){
      rejets.push(String((e.reason && e.reason.message) || e.reason));
    };
    window.addEventListener('unhandledrejection', surRejet);
    try{
      DEFINIS_AILLEURS.forEach(function(n){ window[n] = undefined; });
      for(const c of chemins){
        try{ await c.jouer(); }
        catch(e){ casses.push(c.quoi + ' — ' + e.message); }
        if(rejets.length) casses.push(c.quoi + ' — ' + rejets.shift());
      }
    } finally {
      window.removeEventListener('unhandledrejection', surRejet);
      DEFINIS_AILLEURS.forEach(function(n){ window[n] = sauve[n]; });
      filterEl.value = filtres[0];
      genFilterEl.value = filtres[1];
      searchEl.value = filtres[2];
      showPage('home');
    }

    if(casses.length) return 'échec : ' + casses.join(' · ');
    return chemins.length + ' chemins rejoués sans les ' + DEFINIS_AILLEURS.length + ' fonctions';
  });

// ---------------------------------------------------------------------------


verifier('La sauvegarde',
  'Ce que porte le dex arrive vraiment au serveur — chasses comprises',
  function(){
    // LE DÉFAUT QU'ELLE SURVEILLE. buildSavePayload() écrivait les chasses
    // depuis le premier jour, progressFromJSON() savait les relire, et
    // construireDex() — la SEULE fonction qui parle au serveur — ne les
    // recopiait pas. Elles vivaient donc dans le localStorage de la machine et
    // nulle part ailleurs : changer d'aventure les effaçait, changer
    // d'ordinateur aussi. Le LISEZMOI promettait le contraire depuis toujours,
    // et rien ne le contredisait.
    //
    // La vérification est volontairement bête : ce qui sort de
    // buildSavePayload() doit se retrouver dans ce que construireDex() envoie.
    // Un champ ajouté à l'un et oublié dans l'autre est exactement le bug
    // d'origine, et il se reproduira.
    if(typeof construireDex !== 'function') return 'ignoré : construireDex absente';
    const charge = buildSavePayload();
    const envoye = construireDex();
    const oublies = ['chasses', 'chassesFinies', 'objectifs', 'detailsCapture']
      .filter(function(cle){ return envoye[cle] === undefined; });
    if(oublies.length){
      return 'échec : ' + oublies.join(', ') + ' ne part(ent) pas au serveur';
    }
    // Et le contenu, pas seulement la clé : recopier une liste vide en dur
    // passerait le test précédent sans rien régler.
    const avant = chasses.length;
    chasses = chasses.concat([{ pokemon: 'banc-temoin', dex: 'national',
                                methode: 'rencontre', bonus: [], compteur: 7 }]);
    const relu = construireDex();
    chasses = chasses.slice(0, avant);
    const temoin = (relu.chasses || []).some(function(c){ return c.pokemon === 'banc-temoin'; });
    if(!temoin) return 'échec : une chasse ajoutée ne se retrouve pas dans l\'envoi';
    return '4 champs transmis, témoin retrouvé dans l\'envoi';
  });

verifier('La sauvegarde',
  'Un dex relu retrouve ses chasses, ses objectifs et ses fiches de capture',
  function(){
    // Le pendant du précédent : progressFromJSON() doit savoir relire tout ce
    // que buildSavePayload() écrit. Les deux se modifient ensemble, et c'est
    // précisément ce qui n'avait pas été fait.
    const memoire = buildSavePayload();
    const faux = {
      dex: { national: { caught: ['pikachu'], shiny: [] } },
      chasses: [{ pokemon: 'gible', dex: 'bdsp', methode: 'rencontre',
                  bonus: [], compteur: 42 }],
      chassesFinies: [{ pokemon: 'eevee', dex: 'sv', methode: 'rencontre',
                        bonus: [], compteur: 900, taux: 4096, fin: '2026-01-02T00:00:00Z' }],
      objectifs: [{ id: 1, nom: 'Banc', quoi: '', dex: 'national', shiny: false,
                    entrees: ['pikachu'], cree: '2026-01-01T00:00:00Z' }],
      detailsCapture: { national: { pikachu: { ball: 'Honor Ball' } } }
    };
    progressFromJSON(faux);
    const lus = {
      chasses: chasses.length,
      finies: (typeof chassesFinies !== 'undefined') ? chassesFinies.length : -1,
      objectifs: (typeof objectifs !== 'undefined') ? objectifs.length : -1,
      details: (typeof detailsCapture !== 'undefined' && detailsCapture.national)
        ? Object.keys(detailsCapture.national).length : -1
    };
    // On remet ce qui était là : le banc ne doit rien laisser derrière lui.
    progressFromJSON(memoire);
    const manques = Object.keys(lus).filter(function(k){ return lus[k] !== 1; });
    if(manques.length) return 'échec : ' + manques.join(', ') + ' non relu(s)';
    return 'chasses, tableau, objectifs et fiches relus';
  });

verifier('La sauvegarde',
  'Un objectif compte sur sa liste figée, pas sur les filtres du moment',
  function(){
    // Le défaut évité : rejouer les filtres à l'ouverture. Le relevé bouge, les
    // filtres aussi — un objectif qui se recalcule n'est plus le même objectif,
    // et « les 151 de Kanto » finiraient à 153 sans que personne n'ait rien
    // demandé.
    if(typeof avancementObjectif !== 'function') return 'ignoré : objectifs absents';
    // Des noms qui n'existent pas : la collection du banc en contient déjà de
    // vrais, et compter dessus ferait dépendre le résultat du jeu d'essai.
    const b = bucketFor('national');
    b.caught.add('banc-temoin-a');
    const a = avancementObjectif({ dex: 'national', shiny: false,
                                   entrees: ['banc-temoin-a', 'banc-temoin-b', 'banc-temoin-c'] });
    b.caught.delete('banc-temoin-a');
    if(a.total !== 3) return 'échec : total ' + a.total + ' au lieu de 3';
    if(a.pris !== 1) return 'échec : ' + a.pris + ' pris au lieu de 1';
    return '1 / 3, compté sur la liste enregistrée';
  });

verifier('La recherche',
  'Les jetons se cumulent, et un mot inconnu cherche encore dans le nom',
  function(){
    // Le risque de la recherche à jetons : qu'un mot non reconnu fasse
    // disparaître la grille sans qu'on comprenne pourquoi. La règle est qu'il
    // redevienne un morceau de nom — et c'est ce qui se vérifie ici.
    if(typeof analyserRecherche !== 'function') return 'ignoré : analyse absente';
    const q = analyserRecherche('feu gen3 manquants zzzz');
    if(q.typeId === null) return 'échec : « feu » n\'a pas été reconnu comme type';
    if(q.gen !== 3) return 'échec : « gen3 » n\'a pas été reconnu';
    // `tests` a été scindé en `etats` (ta collection) et `categories` (le
    // Pokédex lui-même). Les deux tableaux portent des PRÉDICATS, pas des
    // objets — un JSON.stringify les affiche `null`, ce qui n'est pas un signe
    // de panne. On vérifie les longueurs, et LA SCISSION elle-même : ranger un
    // état parmi les catégories casserait filtres.js sans rien lever, puisqu'il
    // résout ses pastilles contre les deux tables.
    if(!q.etats.length) return 'échec : « manquants » n\'a pas été reconnu';
    if(q.categories.length) return 'échec : un état a été rangé en catégorie';
    const c = analyserRecherche('fossile');
    if(!c.categories.length) return 'échec : « fossile » n\'a pas été reconnu';
    if(c.etats.length) return 'échec : une catégorie a été rangée en état';
    if(q.mots.indexOf('zzzz') === -1) return 'échec : un mot inconnu a été avalé';
    // Et les accents : personne ne les tape dans un champ de recherche.
    const r = analyserRecherche('Ptéra');
    if(r.mots[0] !== 'ptera') return 'échec : les accents ne sont pas ramenés';
    return '3 jetons reconnus, 1 mot rendu au nom, accents ignorés';
  });

verifier('Le transfert',
  'Chaque jeu sait par où remonter jusqu\'à HOME, et ce qui a une échéance',
  function(){
    if(typeof routeVersHome !== 'function') return 'ignoré : transferts absents';
    let sans = [];
    let fermes = 0;
    GAMES.forEach(function(g){
      const r = routeVersHome(g.key);
      if(r === null){
        // Cobblemon est le seul cas légitime : un mod Minecraft ne parle à
        // aucun service Nintendo.
        if(g.key !== 'cobblemon') sans.push(g.key);
        return;
      }
      if(etatRoute(r) !== 'ouvert') fermes++;
    });
    if(sans.length) return 'échec : aucun chemin pour ' + sans.join(', ');
    // Seize des vingt-deux jeux dépendent de la Banque Pokémon — les six 3DS
    // et les dix qui passent par eux. Le compte ne doit pas descendre : s'il
    // descend, c'est qu'une arête a disparu de la table.
    if(fermes < 10) return 'échec : seulement ' + fermes + ' chemins à échéance, 10 au moins attendus';
    return '22 jeux routés, ' + fermes + ' par un service à échéance, Cobblemon isolé';
  });

verifier('Le réseau',
  'Une suppression d\'aventure ne demande jamais deux fois la même chose',
  async function(){
    const cible = profilsConnus.find(function(p){ return p.id !== (profilCourant || {}).id; })
      || profilsConnus[0];
    if(profilsConnus.length < 2) return 'ignoré : il faut deux aventures';
    window.__appels = [];
    const p = supprimerAventure(cible, cible.id === (profilCourant || {}).id);
    await attendre(300);
    const champ = document.getElementById('confirmSaisie');
    if(document.getElementById('confirmOverlay').style.display === 'flex'){
      champ.value = cible.nom;
      champ.dispatchEvent(new Event('input', { bubbles: true }));
      await attendre(100);
      document.getElementById('confirmValider').click();
    }
    await p;
    await attendre(900);
    const noms = window.__appels.map(function(a){ return a.cmd; });
    const doublons = noms.filter(function(c, i){ return noms.indexOf(c) !== i; });
    if(doublons.length) return 'échec : ' + noms.join(', ') + ' — ' + doublons.join(' et ') + ' en double';
    return noms.length + ' appels : ' + noms.join(', ');
  });

// ---------------------------------------------------------------------------

verifier('Les dresseurs',
  "Sur la fiche d'un dresseur, ni recherche ni filtre — mesuré à l'écran",
  async function(){
    // offsetParent ET NON style.display. Le filtre est un <select> habillé par
    // menus.js : le masquer, lui, ne masque que le select natif, déjà
    // invisible, pendant que le bouton dessiné reste sous les yeux. La première
    // version de ce correctif a passé la relecture et raté l'écran ; on mesure
    // donc ce que l'on voit, pas ce que l'on croit avoir caché.
    const vu = function(el){
      if(!el) return false;
      const cible = (el.closest && el.closest('.select-wrap')) || el;
      return cible.offsetParent !== null;
    };

    // LA PAGE D'ABORD. Sans elle, la section entiere est en display:none et
    // offsetParent vaut null pour TOUT ce qu'elle contient : la verification
    // passait au vert sans rien mesurer, ce qui est pire que pas de
    // verification du tout. Le retour au classement, lui, l'a signale.
    showPage('dresseurs');
    await attendre(300);
    await visiterDresseur('Amie_Test');
    await attendre(250);
    if(dresseurVisite.style.display === 'none') return "échec : la fiche ne s'est pas ouverte";

    const restes = [];
    if(vu(dresseurQ)) restes.push('la recherche');
    if(vu(dresseurModeEl)) restes.push('le filtre');
    if(restes.length) return 'échec : ' + restes.join(' et ') + ' restent visibles';
    if(!vu(dresseurRetour)) return 'échec : plus de retour au classement';

    // Et le filtre ne doit pas renvoyer dehors s'il est actionné malgré tout :
    // un menu habillé garde ses raccourcis clavier même masqué.
    dresseurModeEl.dispatchEvent(new Event('change', { bubbles: true }));
    await attendre(250);
    if(dresseurVisite.style.display === 'none'){
      return 'échec : le filtre a rejeté hors de la fiche';
    }

    await chargerDresseurs(null);
    await attendre(200);
    if(!vu(dresseurQ) || !vu(dresseurModeEl)) return 'échec : les deux ne reviennent pas';
    return 'les deux disparaissent, le retour reste, le filtre ne rejette plus';
  });

// ---------------------------------------------------------------------------
// Les échanges. Trois vérifications, et la première est la seule qui compte
// vraiment : le SENS. « offert » et « demande » sont écrits en base du point de
// vue du demandeur, et l'écran raisonne en « je donne / je reçois ». Inverser
// les deux ne casse rien, ne lève rien, et propose exactement le contraire de
// ce qui a été cliqué — le genre de bug qu'on ne voit qu'en le vivant.

function entreeDuBanc(nom){
  const liste = (typeof poolHome === 'function') ? poolHome() : [];
  return liste.find(function(e){ return e.name === nom; }) || null;
}

verifier('Les échanges',
  "Ce qu'on clique à gauche part en « offert », ce qu'on clique à droite en « demande »",
  async function(){
    const veux = entreeDuBanc('abra');
    const donne = entreeDuBanc('machop');
    if(!veux || !donne) return 'ignoré : entrées témoins absentes de la réserve';

    const avant = amiProgression;
    amiProgression = { joueur: 'Amie_Test', pseudo: 'Amie_Test', dex: 'national',
                       mode: 'capture', niveau: 3, caught: new Set(), shiny: new Set() };
    trocPreparer();
    trocChoisir('veux', veux, null);
    trocChoisir('donne', donne, null);

    window.__appels = [];
    await trocProposer();
    amiProgression = avant;

    const appel = window.__appels.find(function(a){ return a.cmd === 'echange_proposer'; });
    if(!appel) return "échec : rien n'est parti";
    if(appel.args.demande !== 'abra'){
      return 'échec : demande = ' + appel.args.demande + ' au lieu de abra';
    }
    if(appel.args.offert !== 'machop'){
      return 'échec : offert = ' + appel.args.offert + ' au lieu de machop';
    }
    if(appel.args.pseudo !== 'Amie_Test') return 'échec : mauvais destinataire';

    // ET MAINTENANT PAR LES VRAIES COLONNES, ce qui est le seul moyen
    // d'éprouver la DISPOSITION.
    //
    // Ce qui précède appelle trocChoisir('veux', …) par le nom du côté : cela
    // vérifie le câblage, pas l'arrangement. On a permuté les deux colonnes —
    // gauche = ce que je donne, droite = ce qu'il me donne — et cette
    // vérification est restée verte d'un bout à l'autre. Un contrôle qui
    // survit à l'inversion de ce qu'il prétend garder ne garde rien.
    amiProgression = { joueur: 'Amie_Test', pseudo: 'Amie_Test', dex: 'national',
                       mode: 'capture', niveau: 3,
                       caught: new Set([veux.name]), shiny: new Set() };
    activeSet().add(donne.name);
    ouvrirEchanges();
    await attendre(60);

    const gauche = echangeLui.querySelector('.echange-ligne');
    const droite = echangeMoi.querySelector('.echange-ligne');
    if(!gauche || !droite){
      amiProgression = avant;
      activeSet().delete(donne.name);
      return 'échec : une des deux colonnes est vide, rien à cliquer';
    }

    trocPreparer();
    gauche.click();
    const apresGauche = { veux: trocSel.veux && trocSel.veux.name,
                          donne: trocSel.donne && trocSel.donne.name };
    droite.click();
    const apresDroite = { veux: trocSel.veux && trocSel.veux.name,
                          donne: trocSel.donne && trocSel.donne.name };

    fermerEchanges();
    amiProgression = avant;
    activeSet().delete(donne.name);

    // ON ÉPROUVE LE SENS, PAS L'ESPÈCE. Quelle ligne arrive en tête dépend de
    // ce que contient la collection du moment ; exiger un Pokémon précis
    // ferait échouer cette vérification pour une raison étrangère à ce qu'elle
    // garde — la DISPOSITION des deux colonnes.
    if(!apresGauche.donne || apresGauche.veux){
      return 'échec : la colonne de gauche ne remplit pas « je donne » — '
        + JSON.stringify(apresGauche);
    }
    if(!apresDroite.veux){
      return 'échec : la colonne de droite ne remplit pas « il me donne » — '
        + JSON.stringify(apresDroite);
    }
    if(apresDroite.donne !== apresGauche.donne){
      return 'échec : cliquer à droite a changé ce que je donne';
    }

    return "je demande abra, j'offre machop  ·  et par les colonnes : "
      + 'gauche remplit « je donne », droite remplit « il me donne »';
  });

verifier('Les échanges',
  'On ne peut pas accepter sa propre proposition',
  async function(){
    await chargerTroc();
    await attendre(120);
    const lignes = trocListe.querySelectorAll('.troc-ligne');
    if(lignes.length < 2) return 'échec : ' + lignes.length + ' ligne(s), deux attendues au moins';

    const texteDe = function(l){
      return [].map.call(l.querySelectorAll('button'), function(b){ return b.textContent; }).join(' | ');
    };
    let recue = null, envoyee = null;
    [].forEach.call(lignes, function(l){
      const titre = l.querySelector('.troc-titre').textContent;
      if(titre.indexOf('te propose') !== -1 && !recue) recue = l;
      if(titre.indexOf('Tu proposes') !== -1 && !envoyee) envoyee = l;
    });
    if(!recue || !envoyee) return 'échec : les deux sens ne sont pas distingués';

    if(texteDe(recue).indexOf('Accepter') === -1) return "échec : pas d'Accepter sur la reçue";
    if(texteDe(envoyee).indexOf('Accepter') !== -1) return 'échec : Accepter sur sa propre proposition';
    if(texteDe(envoyee).indexOf('Retirer') === -1 && texteDe(envoyee).indexOf('Discuter') === -1){
      return "échec : rien à faire sur celle qu'on a envoyée";
    }
    return 'reçue : ' + texteDe(recue) + '  //  envoyée : ' + texteDe(envoyee);
  });

verifier('Les échanges',
  'La cloche compte les non-lues et nomme les deux Pokémon',
  async function(){
    await verifierNotifs(true);
    await attendre(150);
    const lignes = clocheListe.querySelectorAll('.cloche-ligne');
    if(!lignes.length) return 'échec : le panneau est vide';

    // Le détail doit porter DEUX noms traduits, pas les identifiants bruts :
    // le serveur n'envoie que « abra », c'est ici qu'on en fait une phrase.
    const detail = lignes[0].querySelector('.cloche-detail');
    if(!detail) return "échec : la première ligne n'a pas de détail";
    if(detail.textContent.indexOf('contre') === -1){
      return 'échec : détail sans « contre » — ' + detail.textContent;
    }
    const brutes = ['machop', 'grimer', 'kadabra', 'abra'].filter(function(c){
      return detail.textContent.indexOf(c) !== -1;
    });
    if(brutes.length){
      return 'échec : clé brute affichée (' + brutes.join(', ') + ') — ' + detail.textContent;
    }
    return lignes.length + ' ligne(s) ; première : ' + detail.textContent;
  });

// ---------------------------------------------------------------------------

verifier('Le rangement',
  'La coordonnee de boite ne bouge pas quand on change de tri',
  async function(){
    // C'EST TOUTE LA RAISON D'ETRE DU PLAN. La vue boites obeit au tri
    // affiche — trier par type y fait des boites par type, et c'est un usage
    // legitime. Mais une coordonnee qui se deplace parce qu'on a clique
    // « alphabetique » n'est pas un plan : on ne rearrange pas trente boites a
    // chaque changement d'ecran.
    if(!scopeEntries.length) return 'ignore : aucun perimetre charge';
    const cible = scopeEntries[Math.min(40, scopeEntries.length - 1)];

    const avant = sortEl.value;
    sortEl.value = 'game';
    const parJeu = placeDansLePlan(cible);
    sortEl.value = 'name';
    const parNom = placeDansLePlan(cible);
    sortEl.value = 'rarete';
    const parRarete = placeDansLePlan(cible);
    sortEl.value = avant;

    if(!parJeu) return 'échec : aucune place trouvee';
    if(parJeu.boite !== parNom.boite || parJeu.place !== parNom.place){
      return 'échec : boite ' + parJeu.boite + '/' + parJeu.place
           + ' par jeu, ' + parNom.boite + '/' + parNom.place + ' par nom';
    }
    if(parJeu.boite !== parRarete.boite || parJeu.place !== parRarete.place){
      return 'échec : le tri par rarete deplace la coordonnee';
    }
    // Et elle doit tomber juste : trente par boite, la case entre 1 et 30.
    if(parJeu.place < 1 || parJeu.place > 30) return 'échec : case ' + parJeu.place;
    return cible.name + ' en boite ' + (parJeu.boite + 1) + ' case ' + parJeu.place
           + ', identique sous trois tris';
  });

verifier('Les blocages',
  'On n annonce rien la ou le Pokedex n a pas ete releve',
  function(){
    // Un jeu sans releve n'a pas « aucun blocage » : il a une absence de
    // source. Les confondre reviendrait a promettre qu'on peut tout attraper
    // la ou l'on ne sait simplement pas — le pire des deux mensonges.
    if(typeof DONNEES_LIEUX === 'undefined') return 'ignore : reserve des lieux absente';
    const releves = DONNEES_LIEUX.pokedexReleve || [];
    const avant = currentTab;

    // Un jeu releve doit repondre, un jeu non releve doit se taire.
    const dedans = GAMES.find(function(g){ return releves.indexOf(g.key) !== -1; });
    const dehors = GAMES.find(function(g){ return releves.indexOf(g.key) === -1; });
    if(!dedans) return 'ignore : aucun Pokedex releve';

    currentTab = dedans.key;
    const oui = jeuReleve();
    currentTab = dehors ? dehors.key : 'national';
    const non = jeuReleve();
    currentTab = avant;

    if(!oui) return 'échec : ' + dedans.key + ' est releve et le banc dit non';
    if(dehors && non) return 'échec : ' + dehors.key + ' n est pas releve et le banc dit oui';
    return releves.length + ' Pokedex releves ; ' + dedans.key + ' parle, '
         + (dehors ? dehors.key + ' se tait' : 'tous sont releves');
  });

// ---------------------------------------------------------------------------
// Le defi du jour.

verifier('Le defi du jour',
  'Le meme jour donne le meme Pokemon, deux jours donnent deux tirages',
  function(){
    // C'EST TOUTE LA MECANIQUE. Le defi ne s'ecrit nulle part et ne demande
    // rien au serveur : il se deduit de la date. Si le tirage n'etait pas
    // reproductible, il changerait a chaque rechargement et deux joueurs ne
    // verraient jamais le meme — ce qui lui oterait son seul interet social.
    const a = tirerDefi('2026-08-28');
    const b = tirerDefi('2026-08-28');
    const c = tirerDefi('2026-08-29');
    if(!a) return 'ignore : la reserve n est pas chargee';
    if(a.entree.name !== b.entree.name){
      return 'échec : deux tirages du meme jour different';
    }
    if(!c) return 'échec : le lendemain ne tire rien';
    // Deux jours PEUVENT tomber sur le meme par hasard ; sur trois dates, non.
    const d = tirerDefi('2026-09-04');
    const tous = [a, c, d].map(function(x){ return x && x.entree.name; });
    if(tous[0] === tous[1] && tous[1] === tous[2]){
      return 'échec : trois dates, un seul tirage — le semeur ne tourne pas';
    }
    return 'stable le meme jour, different le lendemain : ' + tous.join('  |  ');
  });

verifier('Le defi du jour',
  'Le tirage ne depend d aucun reglage d aventure',
  function(){
    // POURQUOI CELA COMPTE. Le defi est le meme pour tout le monde, et il n'est
    // synchronise par rien : c'est le tirage lui-meme qui doit etre identique
    // partout. S'il lisait poolHome(), il suivrait niveauFormes — un reglage
    // qui appartient a l'aventure — et deux joueurs regles differemment
    // n'auraient pas le meme Pokemon le meme jour, sans que rien ne le dise.
    const avant = niveauFormes;
    niveauFormes = 1;
    const bas = tirerDefi('2026-08-28');
    niveauFormes = 4;
    const haut = tirerDefi('2026-08-28');
    niveauFormes = avant;
    if(!bas || !haut) return 'ignore : la reserve n est pas chargee';
    if(bas.entree.name !== haut.entree.name){
      return 'échec : ' + bas.entree.name + ' au niveau 1, ' + haut.entree.name + ' au niveau 4';
    }
    // Et aucun jeu n'est nomme : le defi vaut partout.
    if(bas.jeu) return 'échec : un jeu est encore attache au defi';
    return bas.entree.name + ' aux niveaux 1 et 4, sans jeu impose';
  });

// ---------------------------------------------------------------------------
// Les photos de chasse.

/** Un fichier image fabrique a la volee, plus grand que la borne d'envoi. */
function photoTemoin(largeur, hauteur){
  const toile = document.createElement('canvas');
  toile.width = largeur; toile.height = hauteur;
  const ctx = toile.getContext('2d');
  ctx.fillStyle = '#204080'; ctx.fillRect(0, 0, largeur, hauteur);
  ctx.fillStyle = '#ffcc00'; ctx.fillRect(10, 10, largeur / 2, hauteur / 2);
  // Le Blob rendu par toBlob suffit : FileReader le lit comme un fichier, et
  // c'est tout ce que redessinerPhoto lui demande. Un File par-dessus
  // n'ajouterait qu'un nom dont personne ne se sert.
  return new Promise(function(r){
    toile.toBlob(function(b){ r(b); }, 'image/png');
  });
}

verifier('Les photos',
  "Une capture trop grande est ramenee sous la borne avant de partir",
  async function(){
    // POURQUOI CETTE VERIFICATION. Une photo de telephone fait 4000 px et huit
    // megaoctets ; l'envoyer telle quelle remplirait le disque du serveur pour
    // une vignette de cent pixels. Et c'est le REDESSIN qui efface l'EXIF au
    // passage : s'il saute, la position GPS part avec l'image.
    const fichier = await photoTemoin(2400, 1350);   // un PNG, comme une capture
    const r = await redessinerPhoto(fichier);
    if(Math.max(r.largeur, r.hauteur) !== PHOTO_COTE_MAX){
      return 'échec : ' + r.largeur + ' x ' + r.hauteur + ', borne a ' + PHOTO_COTE_MAX;
    }
    // Le rapport doit tenir : 2400/1350 vaut 16/9, donc 1600 x 900.
    if(r.hauteur !== 900) return 'échec : rapport perdu, hauteur ' + r.hauteur;
    // LE FORMAT DE LA SOURCE EST CONSERVE. Convertir une capture d'ecran en
    // JPEG y couvre d'artefacts le texte et les liserés qu'on venait montrer.
    // Le temoin est un PNG : il doit ressortir en PNG.
    const jpeg = r.octets[0] === 0xFF && r.octets[1] === 0xD8;
    const png = r.octets[0] === 0x89 && r.octets[1] === 0x50
             && r.octets[2] === 0x4E && r.octets[3] === 0x47;
    if(!jpeg && !png) return 'échec : ce qui part n est ni un JPEG ni un PNG';
    if(r.mime !== (jpeg ? 'image/jpeg' : 'image/png')){
      return 'échec : le type annonce (' + r.mime + ') ne correspond pas aux octets';
    }
    if(!png) return 'échec : un PNG en entree doit rester un PNG';
    if(r.octets.length > PHOTO_PNG_MAX){
      return 'échec : ' + r.octets.length + ' octets, au-dela du plafond';
    }
    return '2400x1350 devenu ' + r.largeur + 'x' + r.hauteur + ', '
           + r.octets.length + ' octets, PNG conserve';
  });

verifier('Les photos',
  "La vignette invite quand il n y a rien, et montre quand il y a quelque chose",
  async function(){
    const sans = vignettePhoto({ pokemon: 'eevee', dex: 'rby' });
    if(!sans.classList.contains('vide')) return 'échec : la case vide ne se signale pas';
    if(sans.querySelector('img')) return 'échec : une image sans photo';

    const avec = vignettePhoto({ pokemon: 'eevee', dex: 'rby', image: 1 });
    if(avec.classList.contains('vide')) return 'échec : la case pleine se dit vide';
    const img = avec.querySelector('img');
    if(!img) return 'échec : aucune image dans la case pleine';

    // ON L'ACCROCHE À LA PAGE. Depuis le chargement paresseux, la photo n'arrive
    // que lorsque la vignette approche de l'écran — et un élément détaché
    // n'approche jamais de rien. Le test échouait donc en disant « la photo
    // n'arrive jamais », ce qui était vrai, et sans rapport avec un défaut.
    // EN VUE, ET PAS SEULEMENT DANS LA PAGE. Ajoutee en fin de <body>, la
    // vignette atterrit des centaines de pixels sous le pli : l'observateur ne
    // la voit pas davantage que detachee. On la fixe donc dans le coin, ce qui
    // ne depend ni de la longueur de la page ni du defilement courant.
    avec.style.position = 'fixed';
    avec.style.top = '0';
    avec.style.left = '0';
    avec.style.zIndex = '999999';
    document.body.appendChild(avec);
    await attendre(600);
    const venue = !!img.getAttribute('src');
    avec.remove();
    if(!venue) return 'échec : la photo n arrive jamais, même à l écran';
    return 'vide : ' + sans.textContent + '  //  pleine : image de '
           + img.getAttribute('src').slice(0, 22) + '...';
  });

verifier('Filtres visibles',
  'Une pastille fait exactement ce que ferait la frappe',
  function(){
    // C'EST TOUTE LA RAISON DE LEUR FORME. Les pastilles écrivent dans le champ
    // de recherche au lieu d'avoir un filtre à elles ; si un jour l'une d'elles
    // prenait un raccourci, on aurait deux moteurs à tenir d'accord — le défaut
    // qu'on venait de corriger sur normaliser() et sur les jeux sans chromatique.
    // On compare donc, pour chaque mot, le clic et la frappe.
    if(typeof filtresDisponibles !== 'function') return 'échec : filtres.js absent';
    const avant = searchEl.value;
    const ecarts = [];
    filtresDisponibles().forEach(function(f){
      searchEl.value = f.mot;
      const parLaFrappe = getFiltered().length;
      searchEl.value = '';
      basculerFiltre(f.mot);
      const parLeClic = getFiltered().length;
      if(parLaFrappe !== parLeClic){
        ecarts.push(f.mot + ' (' + parLaFrappe + ' vs ' + parLeClic + ')');
      }
      searchEl.value = '';
    });
    searchEl.value = avant;
    if(ecarts.length) return 'échec : ' + ecarts.join(', ');
    return filtresDisponibles().length + ' filtres, clic et frappe identiques';
  });

verifier('Filtres visibles',
  'Aucun alias ne se retrouve en double sur la barre',
  function(){
    // « manquants », « restants », « coches », « vus » mènent au même test que
    // leur canonique. Six pastilles pour un seul filtre, ce serait six fois la
    // même chose — et une pastille qui n'éteint pas l'autre.
    if(typeof filtresDisponibles !== 'function') return 'échec : filtres.js absent';
    const vus = new Map();
    const doubles = [];
    filtresDisponibles().forEach(function(f){
      const test = resoudre(f.mot);
      if(vus.has(test)) doubles.push(vus.get(test) + ' = ' + f.mot);
      else vus.set(test, f.mot);
    });
    if(doubles.length) return 'échec : ' + doubles.join(', ');
    const total = Object.keys(MOTS_CLES_RECHERCHE).length + Object.keys(ETATS_RECHERCHE).length;
    return vus.size + ' filtres distincts sur ' + total + ' mots reconnus';
  });

verifier('Verrous chromatiques',
  'L’écran dessine toutes les lignes de la table',
  function(){
    // Le bug qu'elle arrête : une entrée qui se perd entre la table et l'écran.
    // Elle ne casse rien — elle disparaît, et personne ne sait qu'elle manquait.
    // Le compte attendu vient des groupes, pas de VERROUS : un verrou qui vaut
    // pour deux jeux s'affiche deux fois, et c'est voulu.
    if(typeof dessinerVerrousPage !== 'function') return 'échec : verrous.js absent';
    verrouJeuActif = '';
    if(verrousQ) verrousQ.value = '';
    dessinerVerrousPage();
    const dessinees = verrousListe.querySelectorAll('.verrou-ligne').length;
    let attendues = 0;
    verrousGroupes().forEach(function(g){ attendues += g.lot.length; });
    if(dessinees !== attendues){
      return 'échec : ' + dessinees + ' lignes dessinées pour ' + attendues + ' attendues';
    }
    return dessinees + ' lignes sur ' + verrousGroupes().length + ' groupes';
  });

verifier('Verrous chromatiques',
  'Toutes les clés de jeu citées existent',
  function(){
    // Une faute de frappe dans une clé ne lève rien : la ligne cesse simplement
    // d'appartenir à un groupe et n'est plus jamais affichée. C'est le défaut le
    // moins visible de toute la table.
    if(typeof VERROUS === 'undefined') return 'échec : donnees-verrous.js absent';
    const connues = new Set(GAMES.map(function(g){ return g.key; }));
    const fautes = [];
    let n = 0;
    VERROUS.forEach(function(v){
      (v.jeux || []).forEach(function(c){
        n++;
        if(!connues.has(c)) fautes.push(c + ' (#' + v.espece + ')');
      });
    });
    REGLES_VERROU.forEach(function(r){
      (r.jeux || []).forEach(function(c){ n++; if(!connues.has(c)) fautes.push(c + ' (règle)'); });
    });
    if(fautes.length) return 'échec : ' + fautes.join(', ');
    return n + ' clés de jeu, toutes connues de GAMES';
  });

verifier('Verrous chromatiques',
  'Chaque espèce citée existe dans la réserve',
  function(){
    // Un numéro national faux affiche « N° 0999 » sans vignette, au milieu de
    // lignes correctes. La table affirme que les numéros sont résolus contre la
    // réserve embarquée : cette vérification est ce qui rend la phrase vraie.
    if(typeof VERROUS === 'undefined') return 'échec : donnees-verrous.js absent';
    if(typeof allEntries === 'undefined' || !allEntries.length){
      return 'ignoré : la réserve n’est pas chargée';
    }
    const perdus = [];
    VERROUS.forEach(function(v){
      if(!verrouEntree(v.espece)) perdus.push(v.espece);
    });
    if(perdus.length) return 'échec : #' + perdus.join(', #') + ' introuvable(s)';
    return VERROUS.length + ' verrous, toutes les espèces résolues';
  });

verifier('Verrous chromatiques',
  'Chaque portée est connue de PORTEES',
  function(){
    // verrouLigne() fait « PORTEES[v.portee] || PORTEES.jeu ». Une portée mal
    // orthographiée retombe donc silencieusement sur « verrouillé ici » — et un
    // verrou qui vaut PARTOUT s'annoncerait comme local. C'est la pire erreur
    // que cet écran puisse commettre : elle envoie chasser dans le vide.
    if(typeof VERROUS === 'undefined') return 'échec : donnees-verrous.js absent';
    const connues = Object.keys(PORTEES);
    const fautes = [];
    VERROUS.forEach(function(v){
      if(connues.indexOf(v.portee) === -1) fautes.push('#' + v.espece + ' : ' + v.portee);
    });
    if(fautes.length) return 'échec : ' + fautes.join(', ');
    const compte = {};
    VERROUS.forEach(function(v){ compte[v.portee] = (compte[v.portee] || 0) + 1; });
    return connues.map(function(p){ return (compte[p] || 0) + ' ' + p; }).join(', ');
  });

verifier('Verrous chromatiques',
  'Chaque ligne déclare une source qui existe',
  function(){
    // Le schéma l'exige : « Toute ligne en a une ». Sans elle, impossible de
    // savoir plus tard ce qui a été recoupé à la source et ce qui a été repris
    // tel quel — et c'est justement la distinction que VERROUS_A_VERIFIER note.
    if(typeof VERROUS === 'undefined') return 'échec : donnees-verrous.js absent';
    const sources = Object.keys(SOURCES_VERROUS);
    const orphelines = [];
    VERROUS.concat(REGLES_VERROU).forEach(function(v){
      if(!v.source || sources.indexOf(v.source) === -1){
        orphelines.push('#' + (v.espece || 'règle') + ' : ' + (v.source || 'aucune'));
      }
    });
    if(orphelines.length) return 'échec : ' + orphelines.join(', ');
    return (VERROUS.length + REGLES_VERROU.length) + ' lignes, '
      + sources.length + ' sources déclarées';
  });

verifier('Verrous chromatiques',
  'Aucun verrou ne se perd entre la table et les groupes',
  function(){
    // Le pendant de la vérification des clés, pris par l'autre bout : on part de
    // la table et on demande où chaque ligne a atterri. Une entrée sans jeu doit
    // tomber dans le groupe « par distribution » ; aucune ne doit tomber nulle
    // part.
    if(typeof verrousGroupes !== 'function') return 'échec : verrous.js absent';
    const places = new Set();
    verrousGroupes().forEach(function(g){
      g.lot.forEach(function(v){ places.add(v); });
    });
    const perdus = VERROUS.filter(function(v){ return !places.has(v); });
    if(perdus.length){
      return 'échec : ' + perdus.length + ' verrou(s) hors groupe, dont #' + perdus[0].espece;
    }
    const horsJeu = VERROUS.filter(function(v){ return !v.jeux || !v.jeux.length; }).length;
    return VERROUS.length + ' verrous placés, dont ' + horsJeu + ' par distribution';
  });

verifier('Verrous chromatiques',
  'La recherche trouve par nom, par rencontre et par numéro',
  function(){
    // Trois entrées dans le même champ, et rien ne le dit à l'écran. Si l'une
    // des trois cesse de fonctionner, on croit simplement que la ligne n'existe
    // pas — et on va chasser ce qui est verrouillé.
    if(typeof verrouCorrespond !== 'function') return 'échec : verrous.js absent';
    const v = VERROUS[0];
    if(!v) return 'ignoré : table vide';
    const e = verrouEntree(v.espece);
    if(!e) return 'ignoré : espèce non résolue';
    const nom = (typeof nomAffiche === 'function' ? nomAffiche(e) : e.display);
    const essais = [
      ['nom', nom],
      ['numéro', String(v.espece)],
      ['rencontre', v.rencontre.split(' ').slice(0, 3).join(' ')]
    ];
    const rates = essais.filter(function(x){ return !verrouCorrespond(v, x[1]); })
                        .map(function(x){ return x[0]; });
    if(rates.length) return 'échec : ' + rates.join(', ') + ' ne trouve(nt) pas';
    // Et le contraire : un mot absent ne doit rien ramener.
    if(verrouCorrespond(v, 'zzzznexistepas')) return 'échec : un mot absent correspond quand même';
    return 'nom, numéro et rencontre trouvent ; un mot absent ne trouve rien';
  });

verifier('Verrous chromatiques',
  'Le filtre Shiny-lock ne condamne une espèce qu’au national',
  function(){
    // LA NUANCE QUE CE FILTRE DOIT PORTER, et qui a coûté toute une table.
    // Dans le Pokédex d'un jeu, « verrouillé » veut dire « une rencontre d'ici
    // l'est ». Au national, aucun jeu n'est ouvert : seul « partout » se
    // soutient. Confondre les deux ferait apparaître Roucool parmi les
    // condamnés — à cause du scripté de la Route 2 de X et Y — alors qu'il se
    // chasse dans presque tous les jeux où il figure.
    if(typeof verrouillePour !== 'function') return 'échec : verrouillePour absente';

    // Une espèce verrouillée sur une seule rencontre, et une verrouillée partout.
    const surUnJeu = VERROUS.find(function(v){
      return v.portee === 'jeu' && v.jeux && v.jeux.length;
    });
    const partout = VERROUS.find(function(v){ return v.portee === 'partout'; });
    if(!surUnJeu || !partout) return 'ignoré : la table ne couvre pas les deux cas';

    const cle = surUnJeu.jeux[0];
    if(!verrouillePour(surUnJeu.espece, cle)){
      return 'échec : #' + surUnJeu.espece + ' non vu comme verrouillé sur ' + cle;
    }
    if(verrouillePour(surUnJeu.espece, null)){
      return 'échec : #' + surUnJeu.espece + ' condamné au national pour une seule rencontre';
    }
    if(!verrouillePour(partout.espece, null)){
      return 'échec : #' + partout.espece + ' verrouillé partout, absent au national';
    }
    // Et le mot-clé de la recherche doit exister, sinon la pastille disparaît.
    if(typeof MOTS_CLES_RECHERCHE === 'undefined' || !MOTS_CLES_RECHERCHE.verrouille){
      return 'échec : le mot-clé « verrouille » a disparu de la recherche';
    }
    return '#' + surUnJeu.espece + ' verrouillé sur ' + cle + ' et libre au national, #'
      + partout.espece + ' condamné partout';
  });

verifier('Cadeau Mystère',
  'La réserve générée se relie entièrement à l’application',
  function(){
    // donnees-cadeaux.js est PRODUIT par outils/relever-cadeaux.py, et l'outil
    // refuse déjà un libellé de version qu'il ne sait pas relier. Ce qu'il ne
    // peut pas voir, c'est une clé de GAMES renommée APRÈS la génération : le
    // fichier resterait valide et ses distributions deviendraient introuvables
    // au filtre, sans rien casser.
    if(typeof DISTRIBUTIONS === 'undefined') return 'échec : donnees-cadeaux.js absent';
    const connues = new Set(GAMES.map(function(g){ return g.key; }));
    const fautes = new Set();
    let n = 0;
    DISTRIBUTIONS.forEach(function(x){
      x[3].forEach(function(k){ n++; if(!connues.has(k)) fautes.add(k); });
    });
    if(fautes.size) return 'échec : ' + Array.from(fautes).join(', ');
    // Et les index de textes, qui rendraient « undefined » à l'écran.
    const hors = DISTRIBUTIONS.filter(function(x){
      return [x[7], x[8], x[10]].some(function(i){
        return i >= DISTRIBUTIONS_TEXTES.length;
      });
    });
    if(hors.length) return 'échec : ' + hors.length + ' index de texte hors table';
    return DISTRIBUTIONS.length + ' distributions, ' + n + ' références de jeu, toutes reliées';
  });

verifier('Cadeau Mystère',
  'Chaque distribution nomme une espèce que la réserve connaît',
  function(){
    // Une espèce non résolue vaut 0 : ni vignette, ni numéro. L'outil le dit à
    // la génération, mais personne ne relit une sortie de script des semaines
    // plus tard — onze noms étaient tombés sur « Miaouss de Galar », que la
    // réserve écrit « Miaouss (Galar) ».
    if(typeof DISTRIBUTIONS === 'undefined') return 'échec : donnees-cadeaux.js absent';
    if(typeof allEntries === 'undefined' || !allEntries.length){
      return 'ignoré : la réserve n’est pas chargée';
    }
    const connues = new Set(allEntries.map(function(e){ return e.speciesId; }));
    const perdus = DISTRIBUTIONS.filter(function(x){ return !x[1] || !connues.has(x[1]); });
    if(perdus.length){
      return 'échec : ' + perdus.length + ' non résolue(s), dont « ' + perdus[0][0] + ' »';
    }
    return DISTRIBUTIONS.length + ' distributions, toutes rattachées à une espèce';
  });

verifier('Cadeau Mystère',
  'Les trois raretés partagent le relevé sans trou ni recouvrement',
  function(){
    // Normal, Légendaire et Fabuleux sont EXCLUSIVES : leur somme doit faire le
    // total. Un quatrième cas apparu à la source — une catégorie non prévue —
    // tomberait silencieusement dans « normal » par le défaut de l'outil, et le
    // compte le dirait avant que la liste ne mente.
    if(typeof DISTRIBUTIONS === 'undefined') return 'échec : donnees-cadeaux.js absent';
    if(typeof cadeauxFiltres !== 'function') return 'échec : cadeaux.js absent';
    const par = {};
    DISTRIBUTIONS.forEach(function(x){
      const c = DISTRIBUTIONS_CATEGORIES[x[4]];
      par[c] = (par[c] || 0) + 1;
    });
    const somme = DISTRIBUTIONS_CATEGORIES.reduce(function(a, c){ return a + (par[c] || 0); }, 0);
    if(somme !== DISTRIBUTIONS.length){
      return 'échec : ' + somme + ' classées pour ' + DISTRIBUTIONS.length + ' distributions';
    }
    // Et « chromatique », qui n'est pas une catégorie mais un état de la
    // distribution : il doit croiser les trois autres, pas s'y substituer.
    const chroma = DISTRIBUTIONS.filter(function(x){
      return DISTRIBUTIONS_CHROMA[x[5]] === 'shiny_garanti';
    }).length;
    if(!chroma) return 'échec : aucune distribution chromatique garantie';
    return DISTRIBUTIONS_CATEGORIES.map(function(c){ return (par[c] || 0) + ' ' + c; }).join(', ')
      + '  ·  ' + chroma + ' en chromatique garanti';
  });

verifier('Le chargement',
  'Chaque script a survécu à son chargement',
  function(){
    // LE DÉFAUT QU'ELLE ARRÊTE, ET IL A COÛTÉ UNE VERSION PUBLIÉE.
    //
    // En scripts classiques, deux `const` du même nom dans deux fichiers font
    // lever le SECOND — et tout ce qu'il déclare disparaît avec lui. Une réserve
    // générée nommée CADEAUX a rencontré le CADEAUX de fiche.js, et fiche.js est
    // mort en entier : la carte d'une espèce, ses statistiques, ses lieux, ses
    // attaques. La page se chargeait sans broncher, l'erreur restait dans la
    // console, et le banc passait au vert.
    //
    // node --check ne peut PAS voir ça : il lit un fichier à la fois, et la
    // collision n'existe que dans la portée globale que les scripts partagent.
    // verifier.py non plus — il cherche des appels sans cible, or la cible
    // existe dans le source ; c'est à l'exécution qu'elle manque.
    //
    // Un témoin par fichier, choisi parmi ce qu'il déclare en dernier : s'il
    // répond, le fichier est allé au bout.
    // Des fermetures plutôt qu'un eval sur une chaîne : `const GAMES` vit dans
    // la portée lexicale globale et n'apparaît PAS sur window, donc window[nom]
    // ne répondrait rien. Une fonction, elle, voit ce que voit le script.
    const TEMOINS = [
      ['noyau.js',          function(){ return typeof nomAffiche; }],
      ['donnees.js',        function(){ return typeof GAMES; }],
      ['dex.js',            function(){ return typeof analyserRecherche; }],
      ['grille.js',         function(){ return typeof renderList; }],
      ['fiche.js',          function(){ return typeof ficheEmbarquee; }],
      ['formes.js',         function(){ return typeof poolEntries; }],
      ['chasse.js',         function(){ return typeof ouvrirChasseModal; }],
      ['verrous.js',        function(){ return typeof verrousGroupes; }],
      ['donnees-verrous.js',function(){ return typeof verrouillePour; }],
      ['cadeaux.js',        function(){ return typeof chargerCadeaux; }],
      ['donnees-cadeaux.js',function(){ return typeof DISTRIBUTIONS; }],
      ['filtres.js',        function(){ return typeof filtresDisponibles; }],
      ['menus.js',          function(){ return typeof syncSelects; }],
      ['lexique.js',        function(){ return typeof ouvrirLexique; }],
      ['accueil.js',        function(){ return typeof showPage; }],
      ['nouveautes.js',     function(){ return typeof ouvrirNouveautes; }]
    ];
    const morts = [];
    TEMOINS.forEach(function(x){
      let vivant = false;
      try{ vivant = x[1]() !== 'undefined'; }catch(e){ vivant = false; }
      if(!vivant) morts.push(x[0]);
    });
    if(morts.length){
      return 'échec : ' + morts.length + ' script(s) non chargé(s) — ' + morts.join(', ');
    }
    return TEMOINS.length + ' scripts, tous allés au bout';
  });

verifier('Cadeau Mystère',
  'Le détail relevé pointe toujours dans sa table',
  function(){
    // Les index sont produits par un outil qui apparie deux sources dont les
    // libellés ne coïncident pas. Un index hors table ne lèverait rien — la carte
    // afficherait « undefined » là où elle promet un Dresseur d'Origine.
    if(typeof DISTRIBUTIONS === 'undefined') return 'échec : réserve absente';
    if(typeof DISTRIBUTIONS_DETAILS === 'undefined') return 'échec : détails absents';
    const hors = DISTRIBUTIONS.filter(function(x){
      return x[12] >= DISTRIBUTIONS_DETAILS.length;
    });
    if(hors.length) return 'échec : ' + hors.length + ' index hors table';
    const avec = DISTRIBUTIONS.filter(function(x){ return x[12] >= 0; }).length;
    if(!avec) return 'échec : aucune distribution n’a de détail';
    // Un détail vide serait pire qu'absent : la carte annoncerait un bloc et
    // n'aurait rien à y mettre.
    const vides = DISTRIBUTIONS_DETAILS.filter(function(d){
      return !d.do && !d.id && !d.niveau && !d.ball && !(d.capacites || []).length;
    });
    if(vides.length) return 'échec : ' + vides.length + ' détail(s) vide(s)';
    return avec + ' distributions détaillées sur ' + DISTRIBUTIONS.length
      + ', en ' + DISTRIBUTIONS_DETAILS.length + ' relevés distincts';
  });

verifier('Cadeau Mystère',
  'Un détail parle toujours de l’espèce sur laquelle il est posé',
  function(){
    // LE BUG QU'ELLE ARRÊTE, ET IL A ÉTÉ VU À L'ÉCRAN. La fiche de Germignon s'est
    // retrouvée sur la ligne de Phanpy : type Plante, Danse-Fleur, et le surnom
    // japonais de Chicorita sur un Pokémon Sol. L'appariement de repli comparait
    // le titre de l'évènement et jamais l'espèce — or « Œufs Mystère — Série 1 »
    // couvre une trentaine d'espèces, et le titre seul n'en désigne aucune.
    //
    // Rien ne levait : les champs étaient remplis, cohérents entre eux, et faux.
    // C'est exactement le genre d'erreur qu'un compte de couverture ne voit pas.
    if(typeof DISTRIBUTIONS === 'undefined') return 'échec : réserve absente';
    const mauvais = [];
    let verifies = 0;
    DISTRIBUTIONS.forEach(function(x){
      if(x[12] < 0) return;
      const d = DISTRIBUTIONS_DETAILS[x[12]];
      if(!d || !d.espece) return;
      verifies++;
      if(d.espece !== x[1]) mauvais.push('#' + x[1] + ' ← #' + d.espece);
    });
    if(mauvais.length){
      return 'échec : ' + mauvais.length + ' détail(s) étranger(s), dont ' + mauvais[0];
    }
    if(!verifies) return 'échec : aucun détail ne déclare son espèce';
    return verifies + ' détails, tous posés sur la bonne espèce';
  });

// ---------------------------------------------------------------------------

async function lancerBanc(){
  const panneau = document.createElement('div');
  panneau.id = 'bancRapport';
  panneau.innerHTML = '<style>'
    + '#bancRapport{position:fixed;inset:0 0 auto 0;z-index:99999;max-height:60vh;overflow:auto;'
    + 'background:#12141c;color:#e6e8f0;font:13px/1.5 ui-monospace,Consolas,monospace;'
    + 'padding:12px 16px;border-bottom:2px solid #3a4160;box-shadow:0 8px 24px rgba(0,0,0,.5)}'
    + '#bancRapport h1{font-size:14px;margin:0 0 8px;letter-spacing:.06em;text-transform:uppercase;color:#9aa3c0}'
    + '#bancRapport .g{margin:10px 0 4px;color:#7f88a8;font-size:11px;letter-spacing:.08em;text-transform:uppercase}'
    + '#bancRapport .l{display:flex;gap:8px;padding:2px 0;align-items:baseline}'
    + '#bancRapport .m{flex:none;width:9px;height:9px;border-radius:50%;margin-top:5px}'
    + '#bancRapport .ok .m{background:#4ec9a0}#bancRapport .ko .m{background:#e4665a}'
    + '#bancRapport .ko{color:#ffb4ab}#bancRapport .d{color:#8b93ab}'
    + '#bancRapport button{position:absolute;top:10px;right:14px;background:#242a40;color:#c9d0e6;'
    + 'border:1px solid #3a4160;border-radius:4px;padding:3px 10px;cursor:pointer;font:inherit}'
    + '</style><h1>Banc d\'essai</h1><button type="button">Masquer</button><div id="bancCorps"></div>';
  document.body.appendChild(panneau);
  panneau.querySelector('button').addEventListener('click', function(){ panneau.remove(); });
  const corps = panneau.querySelector('#bancCorps');

  let groupe = '';
  let echecs = 0;
  for(const v of BANC){
    if(v.titre !== groupe){
      groupe = v.titre;
      const g = document.createElement('div');
      g.className = 'g';
      g.textContent = groupe;
      corps.appendChild(g);
    }
    let resultat;
    try{
      resultat = await v.fn();
    }catch(e){
      resultat = 'échec : ' + e;
    }
    const rate = String(resultat).indexOf('échec') === 0;
    if(rate) echecs++;
    const l = document.createElement('div');
    l.className = 'l ' + (rate ? 'ko' : 'ok');
    l.innerHTML = '<span class="m"></span><span>' + v.quoi
      + '<br><span class="d">' + resultat + '</span></span>';
    corps.appendChild(l);
  }

  const fin = document.createElement('div');
  fin.className = 'g';
  fin.textContent = echecs
    ? echecs + ' échec(s) sur ' + BANC.length
    : BANC.length + ' vérifications, aucun échec';
  fin.style.color = echecs ? '#e4665a' : '#4ec9a0';
  corps.appendChild(fin);
  console.log('[banc] ' + fin.textContent);
}

// On attend que l'application ait fini de se dessiner : ses écrans se
// construisent après plusieurs allers-retours simulés.
window.addEventListener('load', function(){ setTimeout(lancerBanc, 2200); });

verifier('Sans compte',
  'Aucune écriture n’est acceptée sans session, et le refus se voit',
  function(){
    // CE QUI ARRIVAIT AVANT. On pouvait fermer la fenêtre de connexion et se
    // servir de l'application entière : cocher, créer une aventure, tenir une
    // liste d'envies. Rien n'était enregistré — `queueSave` renonce sans pseudo
    // — mais rien ne le disait. La case restait cochée, la barre de progression
    // avançait, et tout disparaissait au rechargement suivant. On croyait avoir
    // enregistré une heure de travail.
    //
    // ON ÉPROUVE LES DEUX MOITIÉS, parce qu'aucune ne suffit seule :
    // le refus lui-même, et le fait qu'il se voie AVANT le geste.
    if(typeof exigeCompte !== 'function') return 'échec : exigeCompte introuvable';

    const avant = sessionOuverte;
    const dit = [];
    try{
      sessionOuverte = false;
      marquerSansCompte();

      if(exigeCompte('essayer')) return 'échec : accepté sans session';
      if(!document.body.classList.contains('sans-compte')){
        return 'échec : rien ne signale l’absence de compte à l’écran';
      }
      const modale = document.getElementById('authOverlay');
      if(!modale || modale.style.display !== 'flex'){
        return 'échec : le refus n’ouvre pas la connexion';
      }
      // Le message NOMME le geste refusé : une fenêtre de connexion surgie sans
      // raison ne s'explique pas d'elle-même.
      const message = document.getElementById('authErreur');
      if(!message || message.textContent.indexOf('essayer') === -1){
        return 'échec : le refus ne dit pas ce qu’on voulait faire';
      }
      dit.push('refusé, signalé à l’écran, et la connexion s’ouvre en le disant');

      sessionOuverte = true;
      marquerSansCompte();
      if(!exigeCompte('essayer')) return 'échec : refusé alors que la session est ouverte';
      if(document.body.classList.contains('sans-compte')){
        return 'échec : la marque « sans compte » survit à la session';
      }
      dit.push('accepté dès que la session revient');
    } finally {
      // MÊME EN CAS D'ÉCHEC : laisser sessionOuverte à false ferait échouer
      // toutes les vérifications suivantes, et pour une mauvaise raison.
      sessionOuverte = avant;
      marquerSansCompte();
      if(typeof fermerAuthModal === 'function') fermerAuthModal();
    }
    return dit.join(' · ');
  });

verifier('Calculateur',
  'Les bonus s’additionnent, et le calcul se lit terme à terme',
  function(){
    // L'EXEMPLE QUI L'A FAIT NAÎTRE, et il vient des taux publiés : dans
    // Légendes Arceus, une mégapparition avec le Charme Chroma et la page de
    // Pokédex complète passe à 1/128. Si cette ligne casse, c'est le modèle de
    // taux qui a bougé — pas l'affichage.
    //
    // ON ÉPROUVE L'ADDITION, PAS SEULEMENT LE RÉSULTAT. Un taux juste obtenu
    // par une mauvaise décomposition retomberait juste par hasard, et la
    // prochaine combinaison serait fausse.
    if(typeof ouvrirCalculateur !== 'function') return 'échec : calculateur absent';

    ouvrirCalculateur();
    calcJeu.value = 'pla';
    calcMajMethodes();
    calcMethode.value = 'megapparition';
    calcDessiner();
    calcBonus.querySelectorAll('input').forEach(function(c){ c.checked = true; });
    calcDessiner();

    const taux = calcTaux.textContent;
    if(taux.indexOf('128') === -1) return 'échec : attendu 1/128, lu « ' + taux + ' »';

    // TOUTES LES ESPACES SE VALENT ICI. L'affichage sépare les milliers par une
    // espace fine insécable — la bonne, en typographie française — et chercher
    // « 4 096 » avec une espace ordinaire ne la trouvait pas. Une vérification
    // ne doit pas tomber sur un choix typographique.
    const espaces = function(s){ return s.replace(/[\s\u00a0\u202f]+/g, ' '); };
    const detail = espaces(calcDetail.textContent);
    const manque = ['1 (de base)', '25', '32 tirage', '4 096']
      .filter(function(x){ return detail.indexOf(x) === -1; });
    if(manque.length) return 'échec : le détail ne montre pas ' + manque.join(', ');

    // Les seuils : 1/128 donne 89 rencontres pour une chance sur deux. Ce n'est
    // PAS 64 — la moitié du taux — et c'est justement pourquoi on l'affiche.
    const seuils = espaces(calcSeuils.textContent);
    if(seuils.indexOf('89') === -1) return 'échec : seuil 50 % attendu à 89, lu « ' + seuils + ' »';

    // Un jeu sans chromatique n'a pas de taux, et une clé vide non plus : le
    // défaut à 4096 rendait « 1 sur 4 096 » pour rien du tout.
    if(tauxDeBase('') !== null) return 'échec : une clé vide rend un taux';
    if(tauxDeBase('rby') !== null) return 'échec : Rouge/Bleu rend un taux';

    fermerCalculateur();
    return '1/128 en Légendes Arceus, détail complet, 50 % à 89 rencontres';
  });

verifier('Messagerie',
  'On écrit à quelqu’un, le fil l’affiche, et un refus ne perd pas le texte',
  async function(){
    // CE QUE CET ÉCRAN REMPLACE. Pour dire « tu aurais un Abra ? » il fallait
    // d'abord composer une proposition d'échange — décider quoi donner et quoi
    // demander avant même d'avoir pu poser la question.
    if(typeof ouvrirMessagerie !== 'function') return 'échec : messagerie absente';

    ouvrirMessagerie('Ondine');
    await new Promise(function(r){ setTimeout(r, 60); });
    if(!pageMessagesEl.classList.contains('active')) return 'échec : la page ne s’ouvre pas';
    if(msgFil.hidden) return 'échec : le fil reste caché';
    if(!msgRetour || msgRetour.hidden) return 'échec : pas de retour vers la liste';

    // UNE PERSONNE, UNE CONVERSATION : le fil porte aussi les messages des
    // échanges avec elle, et chacun dit de quel échange il parle.
    if(!msgFil.querySelector('.msg-sujet')){
      return 'échec : un message d’échange ne dit pas de quel échange il parle';
    }
    if(msgEchange.hidden) return 'échec : pas de bouton pour proposer un échange';

    const avant = msgFil.querySelectorAll('.discussion-bulle').length;
    msgTexte.value = 'Salut ! Tu aurais un Abra ?';
    await msgEnvoyerTexte();
    if(msgFil.querySelectorAll('.discussion-bulle').length !== avant + 1){
      return 'échec : le message envoyé n’apparaît pas dans le fil';
    }
    if(msgTexte.value !== '') return 'échec : le champ n’est pas vidé après envoi';

    // LE REFUS NE DOIT PAS PERDRE LE TEXTE. Vider le champ avant d'avoir la
    // réponse du serveur efface ce que quelqu'un vient d'écrire dès que le
    // filtre refuse — et le filtre refuse, c'est son travail.
    msgTexte.value = 'ferme ta gueule sale con';
    await msgEnvoyerTexte();
    if(msgTexte.value === ''){
      return 'échec : un message refusé est effacé du champ';
    }
    if(msgEtat.textContent.indexOf('ne passe pas') === -1){
      return 'échec : le refus ne s’affiche pas — lu « ' + msgEtat.textContent + ' »';
    }

    // Retour à la liste sans fermer : une fenêtre qui se referme à chaque
    // aller-retour fait perdre le fil, au sens propre.
    msgRevenirListe();
    await new Promise(function(r){ setTimeout(r, 60); });
    if(!pageMessagesEl.classList.contains('active')) return 'échec : le retour quitte la page';
    if(!msgFil.hidden) return 'échec : le fil reste visible sans conversation';
    if(!msgRien || msgRien.hidden){
      return 'échec : rien ne dit quoi faire quand aucune conversation n’est ouverte';
    }

    fermerMessagerie();
    // Le sondage rapide s'arrête AVEC la fenêtre : c'est tout le marché qui
    // rend la cadence de cinq secondes acceptable.
    if(msgMinuteur !== null) return 'échec : le sondage continue fenêtre fermée';

    return 'écrit, affiché, refus signalé sans perdre le texte, sondage arrêté';
  });

verifier('Sans compte',
  'Qui peut m’écrire a trois crans, et le refus revient au cran d’avant',
  async function(){
    // TROIS CRANS, PAS UNE BASCULE. Le cas du milieu — joignable par ceux qu'on
    // a choisis — est celui que la plupart des gens veulent. Une bascule aurait
    // forcé à choisir entre tout ouvrir et tout fermer, et la plupart auraient
    // tout fermé.
    if(!messagesDe) return 'échec : le réglage est absent de l’écran';
    const crans = Array.prototype.map.call(messagesDe.options, function(o){ return o.value; });
    const manque = ['tous', 'amis', 'personne'].filter(function(v){
      return crans.indexOf(v) === -1;
    });
    if(manque.length) return 'échec : cran(s) absent(s) — ' + manque.join(', ');

    messagesDe.value = 'amis';
    await changerQuiPeutEcrire();
    if(messagesDe.value !== 'amis') return 'échec : le cran choisi n’est pas retenu';
    if(messagesDeEtat.textContent.indexOf('que tu suis') === -1){
      return 'échec : rien ne dit ce que le cran change — lu « '
        + messagesDeEtat.textContent + ' »';
    }

    messagesDe.value = 'tous';
    await changerQuiPeutEcrire();
    return 'trois crans, et chacun dit ce qu’il change';
  });

verifier('Messagerie',
  'Les amis sont proposés d’emblée, et « Ja » sort Jack',
  async function(){
    // DEUX CHOSES QUE LA RECHERCHE SEULE NE FAIT PAS.
    //
    // Champ vide, on propose déjà : écrire à un ami est le cas courant, et lui
    // faire chercher son propre ami est absurde.
    //
    // Et surtout : LA RECHERCHE DE DRESSEURS NE VOIT QUE LES COMPTES VISIBLES.
    // `visible = 0` retire du classement ET de la recherche. Un ami qui s'en
    // est retiré serait introuvable alors qu'on le suit — d'où le filtrage de
    // la liste d'amis, qui ne dépend d'aucun réglage de visibilité. Le pont du
    // banc reproduit ce cas : « Jack » est ami, et absent de la recherche.
    if(typeof msgChercher !== 'function') return 'échec : messagerie absente';

    ouvrirMessagerie();
    await new Promise(function(r){ setTimeout(r, 120); });

    // ON REGARDE L'ÉCRAN, PAS LE DOCUMENT. Cette vérification comptait les
    // éléments présents, et elle était VERTE sur un écran cassé : les
    // propositions héritaient d'un menu positionné en absolu, calé sur un
    // bouton « Suivre » qui n'existe pas ici, et se dessinaient hors du cadre.
    // Présentes, invisibles. Un contrôle qui ne mesure pas ce qu'on voit ne
    // défend rien.
    const noms = function(){
      return Array.prototype.filter
        .call(msgPropositions.querySelectorAll('.proposition-nom'), function(n){
          const r = n.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .map(function(n){ return n.textContent; });
    };

    msgQ.value = '';
    await msgChercher();
    const vide = noms();
    if(vide.indexOf('Jack') === -1 || vide.indexOf('Ondine') === -1){
      return 'échec : champ vide, les amis ne sont pas proposés — ' + vide.join(', ');
    }

    msgQ.value = 'Ja';
    await msgChercher();
    const ja = noms();
    if(ja.indexOf('Jack') === -1){
      return 'échec : « Ja » ne propose pas Jack — ' + (ja.join(', ') || 'rien');
    }
    if(ja.indexOf('Ondine') !== -1){
      return 'échec : « Ja » propose Ondine, qui ne correspond pas';
    }

    // Un dresseur trouvé par la recherche et non ami doit sortir aussi.
    msgQ.value = 'Amie';
    await msgChercher();
    if(noms().indexOf('Amie_Test') === -1){
      return 'échec : la recherche de dresseurs ne remonte plus rien';
    }

    // RIEN TROUVÉ N'EST PAS UNE IMPASSE. La recherche de dresseurs ne voit que
    // les comptes VISIBLES — et la visibilité est éteinte au départ. Quelqu'un
    // qui ne s'est jamais montré au classement était donc introuvable ici,
    // alors qu'on peut parfaitement lui écrire : le service le cherche par son
    // pseudo, sans regarder ce réglage.
    msgQ.value = 'Personne_De_Ce_Nom';
    await msgChercher();
    const secours = msgPropositions.querySelector('.msg-exact');
    if(!secours) return 'échec : aucune issue quand la recherche ne trouve rien';
    const vu = secours.getBoundingClientRect();
    if(vu.width === 0 || vu.height === 0){
      return 'échec : l’issue existe dans le document mais ne se voit pas';
    }
    if(secours.textContent.indexOf('Personne_De_Ce_Nom') === -1){
      return 'échec : l’issue ne reprend pas le pseudo tapé';
    }

    msgQ.value = '';
    fermerMessagerie();
    return 'amis d’emblée, « Ja » sort Jack, et le pseudo exact reste joignable';
  });

verifier('Messagerie',
  'Un Pokémon se joint au message, et la pastille dit ce qui attend',
  async function(){
    // CE QUE ÇA REMPLACE : on l'écrivait à la main. Sans image, sans lien vers
    // la fiche, avec les fautes de frappe de chacun — et c'est précisément ce
    // dont les gens parlent ici.
    if(typeof msgCarteEspece !== 'function') return 'échec : pièce jointe absente';

    ouvrirMessagerie('Ondine');
    await new Promise(function(r){ setTimeout(r, 120); });

    // Joindre passe par la recherche, sur le NOM AFFICHÉ : on cherche
    // « Insécateur », pas « scyther ».
    msgPoke.hidden = false;
    msgRemplirGenerations();
    if(msgPokeGen.options.length !== GEN_RANGES.length + 1){
      return 'échec : ' + msgPokeGen.options.length + ' entrées de génération, '
        + (GEN_RANGES.length + 1) + ' attendues';
    }

    // UNE GÉNÉRATION SEULE SUFFIT À PARCOURIR. Le minimum de deux lettres
    // existe parce qu'une seule rend la liste trop large ; une génération la
    // borne déjà, et exiger un nom en plus interdirait de simplement regarder
    // ce qu'elle contient — ce pour quoi on ouvre ce menu.
    msgPokeQ.value = '';
    msgPokeGen.value = '5';
    msgChercherPoke();
    const gen5 = msgPokeListe.querySelectorAll('.msg-poke-ligne');
    if(!gen5.length) return 'échec : une génération seule ne montre rien';

    // Et elle borne vraiment : le premier résultat doit en être.
    const premier = allEntries.find(function(e){
      return nomAffiche(e) === gen5[0].textContent;
    });
    if(!premier || premier.gen !== 5){
      return 'échec : la génération ne borne pas la liste — ' + gen5[0].textContent;
    }

    msgPokeGen.value = '';
    msgPokeQ.value = nomAffiche(allEntries[0]).slice(0, 4);
    msgChercherPoke();
    const lignes = msgPokeListe.querySelectorAll('.msg-poke-ligne');
    if(!lignes.length) return 'échec : la recherche de Pokémon ne rend rien';
    lignes[0].click();

    if(!msgEspece) return 'échec : le Pokémon choisi n’est pas retenu';
    if(msgJointe.hidden) return 'échec : le Pokémon joint ne se voit pas avant l’envoi';

    const avant = msgFil.querySelectorAll('.discussion-bulle').length;
    msgTexte.value = '';
    // UN POKÉMON SEUL EST UN MESSAGE : sans texte à côté.
    await msgEnvoyerTexte();
    if(msgFil.querySelectorAll('.discussion-bulle').length !== avant + 1){
      return 'échec : un Pokémon sans texte n’est pas envoyé';
    }
    if(!msgFil.querySelector('.msg-carte')){
      return 'échec : le Pokémon reçu ne s’affiche pas en carte';
    }
    // ON OUBLIE CE QU'ON VIENT D'ENVOYER : le garder joindrait le même Pokémon
    // au message suivant, sans que rien ne l'ait demandé.
    if(msgEspece !== null) return 'échec : la pièce jointe survit à l’envoi';
    if(!msgJointe.hidden) return 'échec : le bandeau de pièce jointe reste affiché';

    // La pastille du menu, nourrie par la veille commune.
    majPastilleMessages(3);
    if(messagesPastille.hidden) return 'échec : la pastille ne s’allume pas';
    if(messagesPastille.textContent !== '3'){
      return 'échec : la pastille annonce « ' + messagesPastille.textContent +' »';
    }
    majPastilleMessages(0);
    if(!messagesPastille.hidden) return 'échec : la pastille reste allumée à zéro';

    fermerMessagerie();
    return 'joint, envoyé seul, affiché en carte, oublié après coup, pastille juste';
  });

verifier('Messagerie',
  'Le brouillon suit sa conversation, et la recherche trouve dans les messages',
  async function(){
    // PAS D'ATTENTE ARTIFICIELLE ICI, ET C'EST DÉLIBÉRÉ. Un onglet caché voit
    // ses minuteurs bridés — mesuré : une attente de 120 ms en prenait 1023, et
    // au-delà de cinq minutes en arrière-plan Chrome tombe à un déclenchement
    // par minute. Une vérification bâtie sur cinq `setTimeout` y met des
    // minutes et paraît bloquée.
    //
    // Tout ce qu'on éprouve ici est SYNCHRONE de toute façon : ranger un
    // brouillon et le relire ne demandent aucun aller-retour. Le seul appel au
    // réseau — la recherche — est déjà attendu par son `await`.
    if(typeof msgRangerBrouillon !== 'function') return 'échec : brouillon absent';

    ouvrirMessagerie('Ondine');
    msgTexte.value = 'un début de phrase pour Ondine';

    // LE BROUILLON EST PAR PERSONNE. Ce qu'on écrivait à l'un n'a rien à faire
    // dans la fenêtre de l'autre : un brouillon unique les mélangerait, et
    // c'est le genre d'erreur qu'on ne remarque qu'après l'envoi.
    msgRevenirListe();
    msgOuvrirFil('Ondine');
    if(msgTexte.value !== 'un début de phrase pour Ondine'){
      return 'échec : le brouillon est perdu en revenant — « ' + msgTexte.value + ' »';
    }

    msgOuvrirFil('Jack');
    if(msgTexte.value !== ''){
      return 'échec : le brouillon d’Ondine se retrouve chez Jack';
    }

    // Et il revient en repassant chez elle.
    msgOuvrirFil('Ondine');
    if(msgTexte.value !== 'un début de phrase pour Ondine'){
      return 'échec : le brouillon ne revient pas chez son destinataire';
    }

    // LA RECHERCHE PORTE SUR LES MESSAGES, PAS SUR LES PERSONNES. Deux champs,
    // deux questions : « à qui écrire » et « où ai-je dit ça ».
    msgRevenirListe();
    msgRecherche.value = 'Abra';
    await msgChercherMessages();
    if(!msgListe.querySelector('.msg-trouve')){
      return 'échec : la recherche ne rend aucun résultat';
    }

    // La borne des deux lettres, éprouvée sur la règle et non sur un second
    // aller-retour : c'est la règle qu'on garde, pas l'ordonnancement.
    if('A'.trim().length >= 2) return 'échec : une seule lettre passerait la borne';

    msgRecherche.value = '';
    fermerMessagerie();
    return 'brouillon retenu par personne, rendu à son retour, recherche trouvée';
  });

// ---------------------------------------------------------------------------

verifier('Les messages',
  'Une photo se joint, se voit, et celle d’une aventure privée est refusée à l’écran',
  async function(){
    // LE PIÈGE. Une photo suit la visibilité de son aventure : celle d'une
    // aventure privée rend 404 pour tout autre lecteur. Envoyée quand même,
    // elle arriverait sous forme de cadre vide chez le destinataire — et
    // l'expéditeur, qui la voit très bien de son côté, n'en saurait rien.
    // Le serveur refuse ; ce qui se vérifie ICI, c'est que l'écran le MONTRE
    // au lieu de vider le champ en silence.
    const finiesAvant = chassesFinies.slice();
    chassesFinies = [
      { pokemon:'abra', dex:'rby', compteur:1200, fin:'2026-08-01', image:1 },
      { pokemon:'machop', dex:'rby', compteur:300, fin:'2026-07-01' },
    ];

    ouvrirMessagerie('Ondine');
    await new Promise(function(r){ setTimeout(r, 60); });

    msgPhotoBtn.click();
    if(msgPhotos.hidden) return 'échec : le tiroir des photos ne s’ouvre pas';

    // ON REGARDE L'ÉCRAN, PAS LE DOCUMENT : le tiroir voisin est positionné
    // au-dessus du champ, et une liste présente mais hors cadre ne sert à rien.
    const choix = Array.prototype.filter
      .call(msgPhotosListe.querySelectorAll('.msg-photo-choix'), function(b){
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
    // UNE SEULE : la chasse sans photo n'a rien à proposer. La proposer
    // ouvrirait le sélecteur de fichiers depuis la messagerie, et créerait des
    // images rattachées à rien que le quota compterait sans jamais les rendre.
    if(choix.length !== 1){
      return 'échec : ' + choix.length + ' photo(s) proposée(s), une seule attendue';
    }

    choix[0].click();
    if(msgJointePhoto.hidden) return 'échec : la photo choisie ne s’affiche pas';
    if(!msgPhotos.hidden) return 'échec : le tiroir reste ouvert après le choix';

    msgTexte.value = 'regarde ça';
    await msgEnvoyerTexte();
    const parti = window.__appels.filter(function(a){ return a.cmd === 'messages_ecrire'; }).pop();
    if(!parti || parti.args.image !== 1){
      return 'échec : la photo ne part pas avec le message — ' + JSON.stringify(parti && parti.args);
    }
    if(!msgJointePhoto.hidden) return 'échec : la photo reste jointe après l’envoi';

    // ET ELLE REVIENT DANS LE FIL, en cadre visible et non en pièce jointe
    // muette : c'est la moitié de l'intérêt de l'envoyer.
    await msgDessinerFil();
    const recue = msgFil.querySelector('.msg-photo');
    if(!recue) return 'échec : la photo n’apparaît pas dans la conversation';

    // LE REFUS SE LIT. Sans cette ligne, l'envoi échouait et le champ se
    // vidait : on croyait avoir envoyé.
    msgPhoto = { id: 4242, nom: 'aventure privée' };
    msgTexte.value = 'et celle-ci ?';
    await msgEnvoyerTexte();
    if(!/privée/.test(msgEtat.textContent)){
      return 'échec : le refus ne se lit pas à l’écran — « ' + msgEtat.textContent + ' »';
    }
    // ET LE TEXTE RESTE : vider le champ sur un refus perdrait ce qu'on a écrit.
    if(msgTexte.value !== 'et celle-ci ?'){
      return 'échec : le message est perdu alors qu’il n’est pas parti';
    }

    msgPhoto = null;
    msgTexte.value = '';
    fermerMessagerie();
    chassesFinies = finiesAvant;
    return 'jointe, envoyée, revue dans le fil ; la privée refusée sans perdre le texte';
  });

// ---------------------------------------------------------------------------

verifier('Les échanges',
  'Les rappels ne montrent que ce qui attend MA réponse, et depuis assez longtemps',
  async function(){
    // CE QUE ÇA ÉVITE. Un rappel qui compte aussi ce qu'on a soi-même proposé
    // dirait « 3 échanges attendent » à quelqu'un qui n'a rien à faire : il
    // attend, lui. Le rappel ne vaut que s'il désigne un geste à accomplir.
    const vieux = new Date(Date.now() - 12 * 86400000).toISOString().slice(0, 10);
    const hier = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const liste = [
      { id:11, sens:'recu', etat:'propose', quand:vieux, avec:{ pseudo:'Jack' },
        dex:'rby', genre:'echange', jeDonne:'abra', jeRecois:'machop' },
      // Reçu aussi, mais d'hier : on ne rappelle pas ce qui vient d'arriver.
      { id:12, sens:'recu', etat:'propose', quand:hier, avec:{ pseudo:'Ondine' },
        dex:'rby', genre:'echange', jeDonne:'psykokwak', jeRecois:'abra' },
      // Vieux, mais c'est MOI qui l'ai proposé : je n'ai rien à répondre.
      { id:13, sens:'propose', etat:'propose', quand:vieux, avec:{ pseudo:'Pierre' },
        dex:'rby', genre:'echange', jeDonne:'onix', jeRecois:'racaillou' },
    ];
    // LA PAGE D'ABORD. Les rappels vivent avec les échanges, sur la page des
    // amis : mesurés pendant qu'elle est cachée, ils font zéro pixel de haut
    // et cette vérification passerait à côté de ce qu'elle regarde.
    showPage('amis');
    await new Promise(function(r){ setTimeout(r, 60); });
    dessinerRappels(liste);

    const lignes = Array.prototype.filter
      .call(trocRappels.querySelectorAll('.troc-rappel'), function(l){
        const r = l.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
    if(lignes.length !== 1){
      return 'échec : ' + lignes.length + ' rappel(s) visible(s), un seul attendu';
    }
    if(lignes[0].textContent.indexOf('Jack') === -1){
      return 'échec : le rappel ne désigne pas qui attend — ' + lignes[0].textContent;
    }
    if(trocRappels.hidden) return 'échec : le bloc des rappels est caché';

    // AUCUN RAPPEL N'EST PAS UN BLOC VIDE. Un cadre « Rappels » sans rien
    // dedans donne l'impression d'un écran cassé.
    dessinerRappels([]);
    if(!trocRappels.hidden) return 'échec : le bloc reste quand il n’y a rien à rappeler';

    showPage('accueil');
    return 'un seul rappel, le mien et le vieux ; rien du tout quand il n’y a rien';
  });

// ---------------------------------------------------------------------------

verifier('La galerie',
  'Le compte reste juste : tous les chromatiques, avec ou sans photo',
  async function(){
    // LE PIÈGE QUE ÇA GARDE. Ne montrer que les chasses AVEC photo donnerait
    // une galerie plus belle et un compte faux — « 4 obtenus » chez quelqu'un
    // qui en a douze. Le filtre existe, mais le total ne le suit pas.
    const avant = chassesFinies.slice();
    chassesFinies = [
      { pokemon:'abra', dex:'rby', compteur:1200, taux:4096, fin:'2026-08-01', image:1 },
      { pokemon:'machop', dex:'rby', compteur:300, taux:4096, fin:'2026-07-01' },
      { pokemon:'onix', dex:'rby', compteur:80, taux:512, fin:'2026-06-01' },
    ];

    ouvrirGalerie();
    await new Promise(function(r){ setTimeout(r, 60); });

    if(galerieResume.textContent.indexOf('3 obtenus') === -1){
      return 'échec : le total ne compte pas tout — « ' + galerieResume.textContent + ' »';
    }
    if(galerieResume.textContent.indexOf('1 avec une photo') === -1){
      return 'échec : le résumé ne dit pas combien portent une photo';
    }

    const vues = function(){
      return Array.prototype.filter
        .call(galerieGrille.querySelectorAll('.galerie-carte'), function(c){
          const r = c.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        });
    };
    if(vues().length !== 3){
      return 'échec : ' + vues().length + ' vignette(s) visible(s) sur 3';
    }
    // CELLES SANS PHOTO LE DISENT. Un sprite au milieu de photos ressemble à
    // une photo qui n'a pas fini de charger.
    if(galerieGrille.querySelectorAll('.galerie-sans').length !== 2){
      return 'échec : les chasses sans photo ne s’annoncent pas comme telles';
    }

    galerieFiltre = 'photo';
    dessinerGalerie();
    if(vues().length !== 1) return 'échec : le filtre « avec photo » n’en garde pas une seule';
    if(galerieResume.textContent.indexOf('3 obtenus') === -1){
      return 'échec : filtrer a changé le total — c’est exactement le mensonge à éviter';
    }

    galerieFiltre = 'tous';
    chassesFinies = avant;
    dessinerGalerie();
    return 'trois obtenus, une photo, et le filtre ne touche pas au total';
  });

// ---------------------------------------------------------------------------

verifier('L’état du relevé',
  '« Sans objet » n’est pas « manquant » : Rouge et Bleu n’ont pas de chromatiques',
  async function(){
    // LE PIÈGE. Confondre les deux ferait courir après des données qui
    // n'existent pas : un écran qui réclame un taux de chromatiques pour Rouge
    // et Bleu réclame l'impossible, et son pourcentage ne redescendra jamais.
    ouvrirReleve();
    await new Promise(function(r){ setTimeout(r, 60); });

    const lignes = Array.prototype.filter
      .call(releveCorps.querySelectorAll('.releve-ligne'), function(l){
        const r = l.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
      });
    if(lignes.length !== GAMES.length){
      return 'échec : ' + lignes.length + ' ligne(s) visible(s) pour ' + GAMES.length + ' jeux';
    }

    const sansChroma = GAMES.find(function(g){
      return SANS_CHROMATIQUES.indexOf(g.key) !== -1;
    });
    if(!sansChroma) return 'ignoré : aucun jeu sans chromatiques dans la liste';
    if(releveEtat(sansChroma, 'taux') !== 'sans-objet'){
      return 'échec : ' + sansChroma.key + ' n’a pas de chromatiques et son taux est dit manquant';
    }
    if(releveEtat(sansChroma, 'methodes') !== 'sans-objet'){
      return 'échec : ' + sansChroma.key + ' se voit réclamer des méthodes de chasse';
    }

    // ET LE SANS-OBJET NE PÉNALISE PAS LA COUVERTURE : la jauge d'un jeu dont
    // tout le reste est renseigné doit être pleine, pas aux trois quarts.
    const i = GAMES.indexOf(sansChroma);
    const jauge = lignes[i].querySelector('.releve-jauge');
    const etats = ['lieux', 'taux', 'methodes', 'sprites']
      .map(function(c){ return releveEtat(sansChroma, c); });
    const pertinents = etats.filter(function(e){ return e !== 'sans-objet'; });
    const attendu = pertinents.length
      ? Math.round(100 * pertinents.filter(function(e){ return e === 'oui'; }).length
                   / pertinents.length) : 100;
    if(jauge.title !== attendu + ' %'){
      return 'échec : jauge à ' + jauge.title + ' au lieu de ' + attendu + ' %';
    }

    showPage('accueil');
    return GAMES.length + ' jeux ; ' + sansChroma.key
      + ' sans objet pour le taux, et sa jauge n’en souffre pas';
  });

// ---------------------------------------------------------------------------

verifier('Les messages',
  'Une image prise sur l’ordinateur part avec le sujet « message »',
  async function(){
    // POURQUOI LE SUJET COMPTE, ET POURQUOI ON LE VÉRIFIE ICI. Le ménage du
    // serveur efface toute image qu'aucune chasse ne réclame — et celle-ci n'en
    // a aucune : elle vit dans un message. Le serveur l'épargne à la SEULE
    // condition qu'elle porte le sujet « message ». Partie en « chasse », elle
    // disparaîtrait de la conversation au prochain enregistrement du dex, sans
    // erreur nulle part.
    const finiesAvant = chassesFinies.slice();
    chassesFinies = [];

    ouvrirMessagerie('Ondine');
    await new Promise(function(r){ setTimeout(r, 60); });

    // UN VRAI PNG, DESSINÉ ICI. La chaîne passe par un <canvas>, qui n'accepte
    // que ce qu'il sait décoder : des octets recopiés à la main ne prouveraient
    // rien, et un PNG légèrement fautif ne déclenche NI `onload` NI `onerror` —
    // la vérification restait alors suspendue sans un mot, ce qui est arrivé.
    const toile = document.createElement('canvas');
    toile.width = 8; toile.height = 8;
    toile.getContext('2d').fillRect(0, 0, 8, 8);
    const blob = await new Promise(function(r){ toile.toBlob(r, 'image/png'); });
    const fichier = new File([blob], 'capture.png', { type: 'image/png' });

    await msgPrendreFichier(fichier);

    const depot = window.__appels.filter(function(a){ return a.cmd === 'image_envoyer'; }).pop();
    if(!depot) return 'échec : rien n’est parti au dépôt';
    if(depot.args.sujet !== 'message'){
      return 'échec : déposée en « ' + depot.args.sujet + ' » — le ménage l’effacerait';
    }
    if(msgJointePhoto.hidden) return 'échec : l’image déposée ne s’affiche pas';

    // ET ELLE VOYAGE AVEC LE MESSAGE.
    msgTexte.value = 'tiens, regarde';
    await msgEnvoyerTexte();
    const parti = window.__appels.filter(function(a){ return a.cmd === 'messages_ecrire'; }).pop();
    if(!parti || !parti.args.image){
      return 'échec : l’image n’accompagne pas le message';
    }

    // CE QUI N'EST PAS UNE IMAGE EST REFUSÉ, et le dit : sans cela, glisser un
    // document dans la conversation ne produisait rien du tout.
    await msgPrendreFichier(new File(['bonjour'], 'notes.txt', { type: 'text/plain' }));
    if(!/pas une image/.test(msgEtat.textContent)){
      return 'échec : un fichier quelconque passe sans un mot';
    }

    msgTexte.value = '';
    msgEtat.textContent = '';
    fermerMessagerie();
    chassesFinies = finiesAvant;
    return 'déposée en « message », jointe, envoyée ; un texte refusé en le disant';
  });

// ---------------------------------------------------------------------------

verifier('Les icônes',
  'Les commandes portent un dessin, et plus un émoji de la police du système',
  async function(){
    // CE QUE ÇA GARDE. Un émoji n'est pas une icône, c'est un CARACTÈRE : son
    // dessin appartient à la police du système, donc à la machine. Il ne prend
    // jamais la couleur du bouton, ne s'assied pas sur la ligne de base, et
    // change d'aspect d'un poste à l'autre. Voir l'en-tête de js/icones.js.
    //
    // La vérification est bête et c'est voulu : elle ne juge pas le dessin,
    // elle constate qu'il y en a un, et qu'aucun émoji n'est revenu à côté.
    ouvrirMessagerie('Ondine');
    await new Promise(function(r){ setTimeout(r, 60); });

    const COMMANDES = ['msgJoindre', 'msgPhotoBtn', 'msgJointeOter',
      'msgJointePhotoOter', 'msgTeleverser', 'clocheDessin', 'ficheCherche'];
    // Le plan émoji, et lui seul : « × », « ✓ » ou « ← » sont des caractères
    // typographiques rendus par la police du TEXTE, qui n'ont jamais eu ce
    // défaut. Les chasser aussi aurait été une règle sans motif.
    const EMOJI = /[\u{1F300}-\u{1FAFF}]/u;

    const sansDessin = [];
    const avecEmoji = [];
    COMMANDES.forEach(function(id){
      const el = document.getElementById(id);
      if(!el) return;               // absent de cette page : rien à dire
      if(!el.querySelector('svg.ic')) sansDessin.push(id);
      if(EMOJI.test(el.textContent)) avecEmoji.push(id);
    });

    fermerMessagerie();
    if(sansDessin.length) return 'échec : sans dessin — ' + sansDessin.join(', ');
    if(avecEmoji.length) return 'échec : émoji revenu dans — ' + avecEmoji.join(', ');
    return COMMANDES.length + ' commandes, toutes dessinées, aucune émoji';
  });

// ---------------------------------------------------------------------------

verifier('La navigation',
  'Une seule page allumée à la fois, dans les deux sens et depuis chacune',
  async function(){
    // LE DÉFAUT, VU À L'ÉCRAN. `showPage` éteignait à la main, avec TROIS
    // listes distinctes — une par branche — qu'il fallait allonger à chaque
    // page ajoutée. Elles ne l'ont pas été : les Messages, la Galerie, le
    // Relevé et six autres manquaient à deux d'entre elles. On quittait les
    // Messages pour un Pokédex et les deux écrans restaient EMPILÉS, la grille
    // au-dessus de la conversation.
    //
    // ON ÉPROUVE TOUS LES COUPLES, et non un chemin choisi. Le défaut ne
    // dépendait pas de la page d'arrivée mais de la branche empruntée : le
    // vérifier sur un seul passage l'aurait manqué neuf fois sur dix.
    const PAGES = ['home', 'jeux', 'rby', 'chasse', 'amis', 'messages',
      'galerie', 'releve', 'lieux', 'dresseurs', 'profil', 'parametres',
      'cadeaux', 'verrous', 'strategie', 'reproduction', 'transferts'];

    const allumees = function(){
      return Array.prototype.map
        .call(document.querySelectorAll('.page.active'), function(p){ return p.id; });
    };

    const fautes = [];
    for(const depart of PAGES){
      showPage(depart);
      for(const arrivee of PAGES){
        showPage(arrivee);
        const on = allumees();
        if(on.length !== 1){
          fautes.push(depart + ' → ' + arrivee + ' : ' + (on.join(' + ') || 'aucune'));
          // Une seule suffit à dire le défaut ; les énumérer toutes rendrait un
          // rapport de deux cents lignes pour une seule cause.
          if(fautes.length >= 3) break;
        }
      }
      if(fautes.length >= 3) break;
    }

    showPage('home');
    if(fautes.length) return 'échec : ' + fautes.join('  ·  ');
    return PAGES.length + ' pages, ' + (PAGES.length * PAGES.length)
      + ' passages, jamais deux allumées';
  });

// ---------------------------------------------------------------------------

verifier('La rareté',
  'Sous cinq collections publiques, on dit qu’on ne sait pas — pas « unique »',
  async function(){
    // LE DÉFAUT, VU SUR LA VRAIE APPLICATION. Le serveur refuse de calculer une
    // rareté sous cinq collections publiques : il rend le nombre de dresseurs,
    // un ensemble d’entrées VIDE, et une note qui dit pourquoi — « 1 sur 2 »
    // n’est pas une rareté, c’est un hasard.
    //
    // L’écran ne lisait que le nombre de dresseurs. Il le trouvait à trois,
    // calculait donc 0 sur 3 pour CHAQUE espèce, et affichait « Personne
    // d’autre ne l’a » sur toutes — y compris sur celles que tout le monde a.
    // Juste par accident là où c’était vrai, faux partout ailleurs, et sans le
    // moindre signe que le chiffre ne voulait rien dire.
    const avant = rareteTable;
    const entree = allEntries[0];
    // rarete.js le retrouve a chaque dessin plutot que de le retenir : on fait
    // pareil, sinon cette verification tiendrait une reference qui n'existe
    // nulle part ailleurs.
    const ficheRarete = document.getElementById('ficheRarete');

    // Ce que rend le serveur en dessous du seuil.
    rareteTable = { dresseurs: 3, entrees: {}, note: 'Trop peu de collections '
      + 'publiques pour en tirer une rareté.' };
    dessinerRarete(entree);
    const dit = ficheRarete.textContent;
    if(/Personne d’autre ne l’a|Personne d'autre ne l'a/.test(dit)){
      return 'échec : annonce une rareté que le serveur n’a pas calculée — « ' + dit + ' »';
    }
    if(!/Trop peu/.test(dit)){
      return 'échec : ne dit pas pourquoi il n’y a pas de chiffre — « ' + dit + ' »';
    }
    if(ficheRarete.hidden) return 'échec : la ligne disparaît au lieu de s’expliquer';

    // ET AU-DESSUS DU SEUIL, le compte revient tel quel.
    rareteTable = { dresseurs: 8, entrees: {} };
    rareteTable.entrees[entree.name] = 2;
    dessinerRarete(entree);
    const chiffre = ficheRarete.textContent;
    if(!/2 dresseurs sur 8/.test(chiffre)){
      return 'échec : le compte ne revient pas au-dessus du seuil — « ' + chiffre + ' »';
    }

    // ET RIEN DU TOUT quand la table n’a pas pu être lue : hors ligne, ou une
    // API plus ancienne qui n’a pas cette route.
    rareteTable = { dresseurs: 0, entrees: {} };
    dessinerRarete(entree);
    if(!ficheRarete.hidden) return 'échec : parle alors qu’aucune table n’a été lue';

    rareteTable = avant;
    return 'sous le seuil : la note ; au-dessus : le compte ; sans table : rien';
  });
