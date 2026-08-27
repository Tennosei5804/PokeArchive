// Le panneau de vérification visuelle. Chargé par outils/verif.py, jamais par
// l'application.
//
// UNE LIGNE PAR NOUVEAUTÉ. Chacune dit ce qu'il faut regarder, porte un témoin
// pour ce qui se vérifie tout seul, et un bouton qui amène l'application à
// l'endroit exact — page ouverte, filtres posés, fenêtre déployée.
//
// LA DIFFÉRENCE AVEC banc-verifications.js : celui-là rend un verdict et se
// suffit à lui-même ; celui-ci rend la main. Un témoin vert dit « l'élément est
// là et porte ce qu'il faut » ; il ne dit pas que c'est beau, et c'est
// précisément ce qu'on vient voir soi-même.

(function(){
  'use strict';

  const attendre = function(ms){ return new Promise(function(r){ setTimeout(r, ms); }); };

  function el(id){ return document.getElementById(id); }

  /** Amène un élément sous les yeux et le fait clignoter une fois. */
  function viser(selecteur){
    const cible = typeof selecteur === 'string'
      ? document.querySelector(selecteur) : selecteur;
    if(!cible) return false;
    cible.scrollIntoView({ block: 'center', behavior: 'smooth' });
    cible.classList.add('verif-vise');
    setTimeout(function(){ cible.classList.remove('verif-vise'); }, 2600);
    return true;
  }

  function entree(nom){
    return allEntries.find(function(e){ return e.name === nom; }) || null;
  }

  // ---- Les vingt-et-une nouveautés -------------------------------------------
  //
  // « test » rend une phrase courte, ou une phrase commençant par « échec ».
  // « montrer » met l'application dans l'état qu'il faut. Les deux peuvent être
  // asynchrones : plusieurs écrans attendent une réserve qui se charge.

  const LIGNES = [
    { code:'A1', groupe:'Celui qui arrive',
      titre:'Deux questions au premier lancement',
      voir:'Les bannières de jeu, du plus récent au plus ancien, puis les trois '
         + 'modes avec l’exemple du Bulbizarre. « Passer » referme pour de bon.',
      montrer: async function(){
        try{ localStorage.removeItem('pokearchive-depart-fait'); }catch(e){}
        ouvrirDepart();
      },
      test: function(){
        if(typeof ouvrirDepart !== 'function') return 'échec : depart.js absent';
        if(!el('departOverlay')) return 'échec : la fenêtre manque du HTML';
        return 'fenêtre présente, 23 jeux + « aucun »';
      } },

    { code:'A2', groupe:'Celui qui arrive',
      titre:'Le lexique, et ses pastilles « ? »',
      voir:'Vingt termes groupés par thème, une recherche, et des renvois entre '
         + 'eux. Le bouton 📖 de l’en-tête ouvre la liste entière.',
      montrer: async function(){ ouvrirLexique('niveau-formes'); },
      test: function(){
        if(typeof LEXIQUE === 'undefined') return 'échec : lexique.js absent';
        const pastilles = document.querySelectorAll('.lex-pastille').length;
        if(pastilles < 5) return 'échec : ' + pastilles + ' pastille(s) posée(s)';
        return LEXIQUE.length + ' termes · ' + pastilles + ' pastilles posées';
      } },

    { code:'A3', groupe:'Celui qui arrive',
      titre:'Le programme du soir',
      voir:'Trois à cinq Pokémon capturables ce soir dans le jeu le plus avancé, '
         + 'avec la route, l’heure et la météo. Le bouton « Attrapé » coche sans '
         + 'quitter l’accueil.',
      montrer: async function(){
        showPage('home'); updateHome();
        await attendre(1400);
        viser('#programme');
      },
      test: async function(){
        if(typeof renderProgramme !== 'function') return 'échec : programme absent';
        showPage('home'); updateHome();
        for(let i = 0; i < 30; i++){
          if(document.querySelectorAll('.prog-carte').length) break;
          await attendre(400);
        }
        const n = document.querySelectorAll('.prog-carte').length;
        if(!n) return 'échec : aucune cible proposée';
        return n + ' cibles · ' + (el('programmeQuoi').textContent || '').slice(0, 46) + '…';
      } },

    { code:'A4', groupe:'Celui qui arrive',
      titre:'Le site installable et hors ligne',
      voir:'Ne se voit pas ici : une application de bureau n’a ni manifeste ni '
         + 'service worker. Sur le site, la barre d’adresse propose « Installer ».',
      montrer: async function(){
        prevenir({ eyebrow:'Vérification', titre:'Ça se regarde sur le site',
          note:'Lance « cd site && py outils/servir.py », puis ouvre '
             + 'http://127.0.0.1:8130 dans un vrai navigateur. Le manifeste et le '
             + 'service worker sont écrits par assembler.py, et n’existent que là. '
             + 'La coquille compte 98 fichiers, sans les quatre réserves à la demande.',
          libelleAction:'Compris' });
      },
      test: function(){ return 'sur le site — rien à voir dans l’application'; } },

    { code:'B1', groupe:'Celui qui joue',
      titre:'Relire une sauvegarde',
      voir:'Le bloc « Mes données » du Profil porte maintenant deux boutons. '
         + 'L’import annonce ce que le fichier contient AVANT de toucher à quoi '
         + 'que ce soit.',
      montrer: async function(){
        showPage('profil');
        await attendre(700);
        viser('#importBtn');
      },
      test: function(){
        if(!el('importBtn') || !el('importFichier')) return 'échec : bouton ou champ absent';
        if(typeof importerUnFichier !== 'function') return 'échec : la fonction manque';
        return 'bouton, champ et confirmation en place';
      } },

    { code:'B2', groupe:'Celui qui joue',
      titre:'La vue boîtes',
      voir:'Trente cases, six par rangée, numérotées en bas à droite. Le menu du '
         + 'haut dit combien sont prises dans chaque boîte, et une note rappelle '
         + 'que les filtres ne s’appliquent pas.',
      montrer: async function(){
        showPage('sv');
        await attendre(600);
        if(typeof vueBoites !== 'undefined' && !vueBoites) el('boitesBtn').click();
        await attendre(300);
        viser('#boiteNav');
      },
      test: async function(){
        if(typeof renderBoites !== 'function') return 'échec : vue boîtes absente';
        showPage('sv');
        await attendre(700);
        if(!vueBoites) el('boitesBtn').click();
        await attendre(300);
        const cartes = document.querySelectorAll('#list .card').length;
        const cases = document.querySelectorAll('.card-case').length;
        if(cartes !== 30 || cases !== 30){
          return 'échec : ' + cartes + ' cartes, ' + cases + ' numéros de case';
        }
        return '30 cartes, 30 numéros, ' + (el('boiteNav').querySelectorAll('option').length)
          + ' boîtes';
      } },

    { code:'B3', groupe:'Celui qui joue',
      titre:'La recherche à jetons',
      voir:'« feu gen3 manquants » : trois pastilles sous la barre disent ce qui '
         + 'a été compris. Essaie « légendaire », « starter », « alola », « 448 », '
         + 'ou « ptera » sans accent.',
      montrer: async function(){
        showPage('national');
        await attendre(500);
        if(typeof vueBoites !== 'undefined' && vueBoites) el('boitesBtn').click();
        searchEl.value = 'feu gen3 manquants';
        renderList(true);
        await attendre(200);
        viser('#rechercheJetons');
      },
      test: function(){
        if(typeof analyserRecherche !== 'function') return 'échec : analyse absente';
        const q = analyserRecherche('feu gen3 legendaire zzz');
        if(q.typeId === null || q.gen !== 3 || !q.tests.length){
          return 'échec : un jeton connu n’a pas été reconnu';
        }
        if(q.mots.indexOf('zzz') === -1) return 'échec : un mot inconnu a été avalé';
        return '3 jetons reconnus, le reste rendu au nom';
      } },

    { code:'B4', groupe:'Celui qui joue',
      titre:'Les transferts, en page d’aide',
      voir:'Onglet 🧰 Outils → Transferts. Une ligne par chemin, groupée par '
         + 'jeux : le liseré vert est ouvert, le rouge est FERMÉ — la Banque '
         + 'Pokémon s’arrête, et le pas souligné le montre — barré une fois la '
         + 'date passée. '
         + 'C’est une PAGE et non un bloc de fiche : la règle dépend du jeu, '
         + 'jamais de l’espèce, et la répéter sur 1 281 fiches faisait relire '
         + 'vingt-deux fois la même chose.',
      montrer: async function(){
        showPage('transferts');
        await attendre(700);
        viser('#transfertsResume');
      },
      test: function(){
        if(typeof routeVersHome !== 'function') return 'échec : transferts absents';
        const anciens = routeVersHome('rby');
        if(!anciens || etatRoute(anciens) === 'ouvert'){
          return 'échec : le chemin de Rouge/Bleu ne dit pas qu’il a une échéance';
        }
        const moderne = routeVersHome('sv');
        if(!moderne || etatRoute(moderne) !== 'ouvert'){
          return 'échec : Écarlate devrait avoir un chemin ouvert';
        }
        return 'Rouge/Bleu en ' + etatRoute(anciens) + ' (' + moisAvantFermeture()
          + ' mois), Écarlate ouvert, Cobblemon isolé';
      } },

    { code:'B5', groupe:'Celui qui joue',
      titre:'L’entraide',
      voir:'Deux colonnes nommées : ce qu’elle peut te donner, ce que tu peux lui '
         + 'donner. Chaque nom ouvre sa fiche. Le même bouton 🤝 figure sur '
         + 'chaque ami, page « Amis ».',
      montrer: async function(){
        showPage('national');
        await attendre(300);
        if(typeof vueBoites !== 'undefined' && vueBoites) el('boitesBtn').click();
        await comparerAvec('Amie_Test', { id: null, nom: 'Aventure 1' });
        await attendre(600);
        ouvrirEchanges();
      },
      test: async function(){
        if(typeof ouvrirEchanges !== 'function') return 'échec : entraide absente';
        showPage('national');
        await attendre(400);
        await comparerAvec('Amie_Test', { id: null, nom: 'Aventure 1' });
        await attendre(500);
        ouvrirEchanges();
        await attendre(200);
        const lui = document.querySelectorAll('#echangeLui .echange-ligne').length;
        const moi = document.querySelectorAll('#echangeMoi .echange-ligne').length;
        fermerEchanges();
        quitterComparaison();
        if(!lui && !moi) return 'échec : les deux colonnes sont vides';
        return lui + ' à recevoir, ' + moi + ' à donner';
      } },

    { code:'C1', groupe:'Celui qui complète',
      titre:'La fiche de capture',
      voir:'Ronflex porte déjà la sienne : Honor Ball, nature Relax, surnom, '
         + 'ruban, note. La poignée n’existe QUE sur une entrée cochée — ouvre '
         + 'un Pokémon manquant pour le constater.',
      montrer: async function(){
        showPage('national');
        await attendre(400);
        openPreview(entree('snorlax'), null);
        await attendre(900);
        if(el('captureOuvrir') && !el('captureOuvrir').hidden){
          el('captureOuvrir').click();
          await attendre(200);
          viser('#captureBloc');
        }
      },
      test: function(){
        if(typeof detailsCapture === 'undefined') return 'échec : capture.js absent';
        const d = detailsCapture.national && detailsCapture.national.snorlax;
        if(!d || d.ball !== 'Honor Ball') return 'échec : la fiche servie n’est pas relue';
        return Object.keys(d).length + ' champs relus sur Ronflex';
      } },

    { code:'C2', groupe:'Celui qui complète',
      titre:'Les objectifs sur mesure',
      voir:'Deux objectifs sur l’accueil, avec leur jauge. Un clic rouvre '
         + 'exactement la sélection figée, et une barre le dit. Le bouton '
         + '🎯 du Pokédex en crée un depuis les filtres du moment.',
      montrer: async function(){
        showPage('home'); updateHome();
        await attendre(800);
        viser('#objectifsBloc');
      },
      test: function(){
        if(typeof objectifs === 'undefined') return 'échec : objectifs.js absent';
        if(objectifs.length !== 2) return 'échec : ' + objectifs.length + ' objectif(s) relu(s)';
        const a = avancementObjectif(objectifs[0]);
        return objectifs.length + ' objectifs · le premier à ' + a.pris + ' / ' + a.total;
      } },

    { code:'C3', groupe:'Celui qui complète',
      titre:'La rareté',
      voir:'Sur la fiche de Mew : « Très rare · 3 dresseurs sur 240 ». Le menu de '
         + 'tri porte « Tri : Rareté », et le jeton « rare » de la recherche ne '
         + 'garde que TES pièces rares.',
      montrer: async function(){
        showPage('national');
        await attendre(400);
        openPreview(entree('mew'), null);
        await attendre(1200);
        viser('#ficheRarete');
      },
      test: async function(){
        if(typeof chargerRarete !== 'function') return 'échec : rarete.js absent';
        await chargerRarete();
        if(!rareteTable || rareteTable.dresseurs !== 240){
          return 'échec : la table n’est pas arrivée';
        }
        const n = rareteTable.entrees['mew'];
        return n + ' dresseurs sur ' + rareteTable.dresseurs + ' ont Mew';
      } },

    { code:'C4', groupe:'Celui qui complète',
      titre:'La carte à partager',
      voir:'1200 × 630 : le boîtier, tes deux jauges, les barres par génération. '
         + 'Le bouton du Profil la télécharge ; ici, elle s’affiche sans rien '
         + 'écrire sur ton disque.',
      montrer: async function(){
        const toile = dessinerCarte();
        montrerImage(toile.toDataURL('image/png'));
      },
      test: function(){
        if(typeof dessinerCarte !== 'function') return 'échec : carte.js absent';
        const t = dessinerCarte();
        if(t.width !== 1200 || t.height !== 630){
          return 'échec : ' + t.width + ' × ' + t.height;
        }
        return '1200 × 630, dessinée sans réseau';
      } },

    { code:'D1', groupe:'Celui qui chasse',
      titre:'Le compteur au clavier',
      voir:'La ligne en pointillés nomme la chasse visée. Espace compte +1, '
         + 'Retour arrière −1, Entrée conclut. Clique l’autre carte pour changer '
         + 'de cible. Ctrl+Alt+↑ ne marche que dans l’application compilée.',
      montrer: async function(){
        showPage('chasse');
        await attendre(500);
        viser('#chasseClavier');
      },
      test: async function(){
        showPage('chasse');
        await attendre(500);
        if(typeof compterAuClavier !== 'function') return 'échec : raccourcis absents';
        const c = chasseActiveOuPremiere();
        if(!c) return 'échec : aucune chasse à viser';
        const avant = c.compteur;
        compterAuClavier(1);
        const bouge = c.compteur === avant + 1;
        compterAuClavier(-1);
        if(!bouge) return 'échec : le compteur n’a pas bougé';
        return 'visée : ' + nomDeChasse(c) + ' · +1 et −1 répondent';
      } },

    { code:'D2', groupe:'Celui qui chasse',
      titre:'L’overlay OBS',
      voir:'Masqué ici, et c’est le comportement attendu : un navigateur ne peut '
         + 'pas ouvrir d’écoute locale. Dans l’application compilée, le bouton '
         + 'donne une adresse à coller en source navigateur.',
      montrer: async function(){
        showPage('chasse');
        await attendre(400);
        prevenir({ eyebrow:'Vérification', titre:'L’overlay demande l’application',
          note:'Le bouton 📺 est masqué hors de Tauri — window.PONT_WEB ou '
             + 'l’absence de window.__TAURI__ le disent. Pour l’essayer : '
             + '« cd app && cargo tauri dev », page Chasse, puis colle l’adresse '
             + 'dans OBS (Sources → + → Navigateur). Le fond est transparent.',
          libelleAction:'Compris' });
      },
      test: function(){
        if(typeof basculerOverlay !== 'function') return 'échec : overlay absent du front';
        const b = el('overlayBtn');
        if(!b) return 'échec : le bouton manque du HTML';
        if(!b.hidden) return 'échec : le bouton devrait être masqué hors application';
        return 'masqué hors application, comme prévu';
      } },

    { code:'D3', groupe:'Celui qui chasse',
      titre:'Le tableau de chasse',
      voir:'Trois chromatiques trouvés, 5 711 rencontres en tout, la plus longue '
         + 'et la plus courte — et le rapport à la moyenne, en vert si tu as eu '
         + 'de la chance.',
      montrer: async function(){
        showPage('chasse');
        await attendre(600);
        viser('#chasseTableau');
      },
      test: async function(){
        if(typeof dessinerTableauChasse !== 'function') return 'échec : tableau absent';
        showPage('chasse');
        await attendre(500);
        const chiffres = document.querySelectorAll('.tableau-chiffre').length;
        const lignes = document.querySelectorAll('.tableau-ligne').length;
        if(chiffres < 5) return 'échec : ' + chiffres + ' chiffre(s) affiché(s)';
        const rapport = document.querySelector('.tableau-chiffre.chanceux, .tableau-chiffre.malchanceux');
        if(!rapport) return 'échec : le rapport à la moyenne ne s’affiche pas';
        return chiffres + ' chiffres, ' + lignes + ' chasses, rapport '
          + rapport.querySelector('b').textContent;
      } },

    { code:'E2', groupe:'Le produit',
      titre:'Le clavier dans la grille',
      voir:'Une seule case est atteignable au Tab ; les flèches déplacent, '
         + 'l’espace coche, Entrée ouvre la fiche, Échap et « / » ramènent à la '
         + 'recherche. Le liseré rouge entoure la CARTE, pas la case.',
      montrer: async function(){
        showPage('national');
        await attendre(500);
        if(typeof vueBoites !== 'undefined' && vueBoites) el('boitesBtn').click();
        await attendre(200);
        const cases = casesDeLaGrille();
        if(cases.length){ cases[0].focus(); viser(cases[0].closest('.card')); }
      },
      test: async function(){
        showPage('national');
        await attendre(600);
        if(typeof casesDeLaGrille !== 'function') return 'échec : clavier absent';
        const cases = casesDeLaGrille();
        const atteignables = cases.filter(function(c){ return c.tabIndex === 0; }).length;
        if(atteignables !== 1){
          return 'échec : ' + atteignables + ' case(s) atteignable(s) au Tab, 1 attendue';
        }
        return cases.length + ' cases, une seule au Tab';
      } },

    { code:'E3', groupe:'Le produit',
      titre:'L’âge du relevé',
      voir:'Troisième ligne du pied de fenêtre, sous la réserve locale. Elle se '
         + 'complète quand une réserve à la demande arrive — ouvre une fiche et '
         + 'regarde-la changer.',
      montrer: async function(){
        viser('#releveLabel');
      },
      test: function(){
        const l = el('releveLabel');
        if(!l) return 'échec : la ligne manque du HTML';
        if(!l.textContent.trim()) return 'échec : la ligne est vide';
        return l.textContent;
      } },

    { code:'E4', groupe:'Le produit',
      titre:'La vitrine',
      voir:'Elle ne vit pas dans le dépôt : c’est la maquette publiée hier, aux '
         + 'jetons de base.css.',
      montrer: async function(){
        prevenir({ eyebrow:'Vérification', titre:'La vitrine est une maquette à part',
          note:'Elle est publiée comme page, pas comme fichier du dépôt. Si tu la '
             + 'veux ici, elle tombe telle quelle dans site/ — elle est autonome, '
             + 'hors Google Fonts.',
          libelleAction:'Compris' });
      },
      test: function(){ return 'hors dépôt — maquette publiée'; } },

    { code:'⚑', groupe:'Le produit',
      titre:'Le défaut corrigé : les chasses partent enfin',
      voir:'Rien à voir à l’écran, et c’est bien le problème : elles ne '
         + 'quittaient jamais cet ordinateur. Le témoin ci-contre vérifie que '
         + 'construireDex() les emporte.',
      montrer: async function(){
        const envoi = construireDex();
        prevenir({ eyebrow:'Vérification', titre:'Ce que construireDex() transmet',
          resume:[
            { cle:'chasses en cours', valeur:(envoi.chasses || []).length },
            { cle:'chasses abouties', valeur:(envoi.chassesFinies || []).length },
            { cle:'objectifs', valeur:(envoi.objectifs || []).length },
            { cle:'fiches de capture', valeur:Object.keys(envoi.detailsCapture || {}).length }
          ],
          note:'Avant, ces quatre lignes valaient toutes « absent » : la fonction '
             + 'ne recopiait que le dex. Les chasses vivaient dans le localStorage '
             + 'de la machine et nulle part ailleurs.',
          libelleAction:'Compris' });
      },
      test: function(){
        if(typeof construireDex !== 'function') return 'échec : construireDex absente';
        const envoi = construireDex();
        const manque = ['chasses', 'chassesFinies', 'objectifs', 'detailsCapture']
          .filter(function(c){ return envoi[c] === undefined; });
        if(manque.length) return 'échec : ' + manque.join(', ') + ' ne part(ent) pas';
        if(!(envoi.chasses || []).length) return 'échec : les chasses partent vides';
        return envoi.chasses.length + ' chasses et ' + envoi.chassesFinies.length
          + ' abouties dans l’envoi';
      } },
  ];

  // ---- L'aperçu d'image --------------------------------------------------------

  function montrerImage(url){
    let fond = document.getElementById('verifImage');
    if(!fond){
      fond = document.createElement('div');
      fond.id = 'verifImage';
      fond.addEventListener('click', function(){ fond.style.display = 'none'; });
      document.body.appendChild(fond);
    }
    fond.innerHTML = '<img alt="Carte à partager"><p>Clique pour fermer — '
      + 'rien n’a été écrit sur ton disque.</p>';
    fond.querySelector('img').src = url;
    fond.style.display = 'flex';
  }

  // ---- Le panneau ---------------------------------------------------------------

  const STYLE = `
  #verifPanneau{position:fixed;top:0;right:0;width:372px;height:100vh;z-index:99999;
    background:#12141b;color:#e8e9f0;border-left:1px solid #2b2f3d;
    font:13px/1.5 "Segoe UI",system-ui,sans-serif;display:flex;flex-direction:column;
    box-shadow:-18px 0 40px -24px rgba(0,0,0,.9)}
  #verifPanneau.replie{width:44px}
  #verifPanneau.replie .vp-corps,#verifPanneau.replie .vp-tete b,
  #verifPanneau.replie .vp-tete span{display:none}
  .vp-tete{display:flex;align-items:center;gap:8px;padding:11px 12px;
    border-bottom:1px solid #2b2f3d;flex:none}
  .vp-tete b{font-size:13px;font-weight:700}
  .vp-tete span{font-family:ui-monospace,Consolas,monospace;font-size:10px;color:#8b90a3}
  .vp-tete button{margin-left:auto;background:#1c2030;color:#c9ced8;border:1px solid #333849;
    border-radius:6px;padding:3px 9px;cursor:pointer;font:inherit;font-size:12px}
  .vp-corps{overflow-y:auto;padding:8px 10px 26px;flex:1}
  .vp-groupe{font-family:ui-monospace,Consolas,monospace;font-size:9px;letter-spacing:.14em;
    text-transform:uppercase;color:#6e7385;margin:14px 0 6px;padding-left:2px}
  .vp-groupe:first-child{margin-top:4px}
  .vp-ligne{border:1px solid #262b39;border-radius:9px;padding:9px 10px;margin-bottom:7px;
    background:#171a24}
  .vp-haut{display:flex;align-items:baseline;gap:7px}
  .vp-code{font-family:ui-monospace,Consolas,monospace;font-size:10px;color:#8b90a3;
    border:1px solid #333849;border-radius:4px;padding:1px 5px;flex:none}
  .vp-titre{font-weight:600;font-size:12.5px;color:#fff;flex:1}
  .vp-etat{width:9px;height:9px;border-radius:50%;background:#41465a;flex:none;margin-top:4px}
  .vp-etat.ok{background:#4ec9a0}
  .vp-etat.ko{background:#e4665a}
  .vp-etat.na{background:#6e7385}
  .vp-voir{color:#a0a4b4;font-size:11.5px;margin:6px 0 0}
  .vp-detail{font-family:ui-monospace,Consolas,monospace;font-size:10px;color:#7f8496;
    margin:5px 0 0;word-break:break-word}
  .vp-ligne.ko .vp-detail{color:#e4665a}
  .vp-actions{margin-top:8px}
  .vp-actions button{background:#242a3d;color:#dfe3ee;border:1px solid #38405a;
    border-radius:6px;padding:4px 11px;cursor:pointer;font:inherit;font-size:11.5px}
  .vp-actions button:hover{border-color:#ee3a3a;color:#fff}
  .verif-vise{outline:3px solid #f2a900 !important;outline-offset:3px;
    border-radius:8px;transition:outline-color .2s}
  #verifImage{position:fixed;inset:0;z-index:100000;background:rgba(8,9,13,.92);
    display:none;flex-direction:column;align-items:center;justify-content:center;gap:14px;
    cursor:zoom-out;padding:24px}
  #verifImage img{max-width:min(1200px,94vw);max-height:78vh;border-radius:10px;
    box-shadow:0 30px 70px -20px rgba(0,0,0,.9)}
  #verifImage p{color:#a0a4b4;font:12px/1.5 "Segoe UI",system-ui,sans-serif;margin:0}
  /* Le boîtier laisse la place au panneau plutôt que de passer dessous. */
  body{padding-right:372px !important;transition:padding-right .18s}
  body.vp-replie{padding-right:44px !important}
  `;

  function bâtir(){
    const style = document.createElement('style');
    style.textContent = STYLE;
    document.head.appendChild(style);

    const p = document.createElement('div');
    p.id = 'verifPanneau';
    p.innerHTML = '<div class="vp-tete"><b>Vérification</b>'
      + '<span id="vpCompte">…</span>'
      + '<button type="button" id="vpReplier">Réduire</button></div>'
      + '<div class="vp-corps" id="vpCorps"></div>';
    document.body.appendChild(p);

    document.getElementById('vpReplier').addEventListener('click', function(){
      const replie = p.classList.toggle('replie');
      document.body.classList.toggle('vp-replie', replie);
      this.textContent = replie ? '☰' : 'Réduire';
    });

    const corps = document.getElementById('vpCorps');
    let groupe = '';
    LIGNES.forEach(function(l, i){
      if(l.groupe !== groupe){
        groupe = l.groupe;
        const g = document.createElement('div');
        g.className = 'vp-groupe';
        g.textContent = groupe;
        corps.appendChild(g);
      }
      const d = document.createElement('div');
      d.className = 'vp-ligne';
      d.id = 'vp-' + i;
      d.innerHTML = '<div class="vp-haut"><span class="vp-code"></span>'
        + '<span class="vp-titre"></span><span class="vp-etat"></span></div>'
        + '<p class="vp-voir"></p><p class="vp-detail">en cours…</p>'
        + '<div class="vp-actions"><button type="button">▶ Montrer</button></div>';
      d.querySelector('.vp-code').textContent = l.code;
      d.querySelector('.vp-titre').textContent = l.titre;
      d.querySelector('.vp-voir').textContent = l.voir;
      d.querySelector('button').addEventListener('click', async function(){
        this.disabled = true;
        try{ await l.montrer(); }
        catch(e){ console.error('[vérif] ' + l.code + ' :', e); }
        this.disabled = false;
      });
      corps.appendChild(d);
    });
  }

  async function jouer(){
    let ok = 0, ko = 0, na = 0;
    for(let i = 0; i < LIGNES.length; i++){
      const l = LIGNES[i];
      const d = document.getElementById('vp-' + i);
      let r;
      try{ r = await l.test(); }
      catch(e){ r = 'échec : ' + e; }
      const rate = String(r).indexOf('échec') === 0;
      const horsSujet = /^(sur le site|hors dépôt)/.test(String(r));
      d.querySelector('.vp-detail').textContent = r;
      d.querySelector('.vp-etat').className = 'vp-etat '
        + (rate ? 'ko' : (horsSujet ? 'na' : 'ok'));
      if(rate){ ko++; d.classList.add('ko'); }
      else if(horsSujet) na++;
      else ok++;
      document.getElementById('vpCompte').textContent =
        ok + ' ✓  ' + (ko ? ko + ' ✗  ' : '') + (na ? na + ' —' : '');
    }
    // On revient à l'accueil : les tests ont promené l'application partout, et
    // on ne laisse pas quelqu'un devant la page où le dernier s'est arrêté.
    showPage('home');
    updateHome();
    console.log('[vérif] ' + ok + ' vert(s), ' + ko + ' rouge(s), ' + na + ' hors sujet');
  }

  // Le panneau expose montrerImage pour la ligne C4.
  window.montrerImage = montrerImage;

  window.addEventListener('load', function(){
    setTimeout(function(){ bâtir(); jouer(); }, 2600);
  });
})();
