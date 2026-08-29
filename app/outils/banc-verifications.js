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
    if(!q.tests.length) return 'échec : « manquants » n\'a pas été reconnu';
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
  "Ce qu'on clique à gauche part en « demande », ce qu'on clique à droite en « offert »",
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
    return "je demande abra, j'offre machop, à Amie_Test";
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
    const fichier = await photoTemoin(2400, 1350);
    const r = await redessinerPhoto(fichier);
    if(Math.max(r.largeur, r.hauteur) !== PHOTO_COTE_MAX){
      return 'échec : ' + r.largeur + ' x ' + r.hauteur + ', borne a ' + PHOTO_COTE_MAX;
    }
    // Le rapport doit tenir : 2400/1350 vaut 16/9, donc 1600 x 900.
    if(r.hauteur !== 900) return 'échec : rapport perdu, hauteur ' + r.hauteur;
    // Et le resultat doit etre un JPEG, pas le PNG d'origine : les deux
    // premiers octets d'un JPEG sont FF D8.
    if(r.octets[0] !== 0xFF || r.octets[1] !== 0xD8){
      return 'échec : ce qui part n est pas un JPEG';
    }
    return '2400x1350 devenu ' + r.largeur + 'x' + r.hauteur + ', ' + r.octets.length + ' octets en JPEG';
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
    await attendre(300);
    if(!img.getAttribute('src')) return 'échec : la photo n arrive jamais';
    return 'vide : ' + sans.textContent + '  //  pleine : image de '
           + img.getAttribute('src').slice(0, 22) + '...';
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
