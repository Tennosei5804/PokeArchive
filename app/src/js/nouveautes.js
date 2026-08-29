// Ce qui a changé, écrit pour quelqu'un qui joue.
//
// Script classique, chargé après confirmer.js dont il reprend le gabarit de
// modale.
//
// CE N'EST PAS LE JOURNAL DE GIT, et c'est tout l'intérêt. Les messages de
// commit disent pourquoi le code est ce qu'il est — utile pour qui l'écrit,
// illisible pour qui l'utilise. « efficaciteOffensive accepte une table en
// troisième argument » n'apprend rien à personne ; « la table des types
// s'adapte au jeu que tu lis » si.
//
// D'où une liste écrite à la main. Elle se tient à jour à chaque version, au
// même endroit que le numéro : c'est le prix d'un texte qui parle vraiment à
// celui qui le lit.
//
// Chaque entrée porte une date au format ISO — elle s'affiche en français, mais
// se compare et se trie sans ambiguïté sous cette forme.

const NOUVEAUTES_VUES_KEY = 'pokearchive-nouveautes-vues';

const NOUVEAUTES = [
  {
    version: '0.29.0', date: '2026-08-29',
    titre: 'Quinze filtres que tu ne pouvais pas trouver',
    points: [
      '**🔍 Un bouton « Plus de filtres » sur le Pokédex.** La recherche '
      + 'comprenait déjà trente mots — fossile, gigamax, légendaire, manquants, '
      + 'hisui, shiny-lock… — et chacun filtre aussi bien que les menus de la '
      + 'barre. Encore fallait-il les deviner. Ils sont maintenant là, en '
      + 'quinze pastilles à cliquer. Elles écrivent dans la recherche : c’est '
      + 'exactement comme taper le mot, en plus simple.',
      '**📍 Mew est encore obtenable, et on te le cachait.** Il s’obtient '
      + 'toujours, une fois par Poké Ball Plus neuve — mais le filtre « encore '
      + 'obtenables aujourd’hui » ne le montrait pas. Diancie non plus, alors '
      + 'qu’il se télécharge sur Légendes Z-A depuis novembre 2025, sans date de '
      + 'fin. Le filtre passe de six à huit.',
      '**Où ouvrir le Cadeau Mystère, jeu par jeu.** Le menu change à chaque '
      + 'génération et la plupart des jeux le gardent fermé jusqu’à un moment '
      + 'précis de l’aventure : carte Miracle en 2G, menu titre en 4G, Poké '
      + 'Portail sur Écarlate et Violet, mission principale 3 sur Z-A. Arriver '
      + 'avec un code et ne pas trouver le menu, c’est fini.',
    ],
  },
  {
    version: '0.28.0', date: '2026-08-29',
    titre: 'Les cadeaux mystères qui pouvaient briller',
    points: [
      '**🎁 Un cadeau mystère est verrouillé par défaut** — c’est la règle, et '
      + 'presque tous la suivent. Cent trente-trois distributions y échappaient : '
      + 'les œufs de la « Gotta catch ’em all! Station » de 2001, ceux des Pokémon '
      + 'Centers japonais, les Pikachu partenaires de 2017. L’écran Shiny-lock te '
      + 'les montre désormais.',
      'Elles n’encombrent pas la liste : elles apparaissent quand tu choisis un jeu '
      + 'ou tapes un nom. Cherche « ronflex » et tu verras les deux faces — celui '
      + 'qui bloque la Route 6, verrouillé sur X et Y, et l’œuf de 2003 qui, lui, '
      + 'pouvait éclore chromatique.',
      'Presque toutes exploitaient la même faille, vivante de Rubis et Saphir '
      + 'jusqu’à Ultra-Soleil : échanger l’œuf entre sauvegardes d’identifiants '
      + 'différents jusqu’à ce qu’il éclose chromatique. Aucune de ces distributions '
      + 'n’a plus cours — c’est de l’histoire, utile sur une vieille cartouche.',
    ],
  },
  {
    version: '0.27.0', date: '2026-08-29',
    titre: 'Trois Pokémon qu’on t’avait dit impossibles',
    points: [
      '**🎯 Solgaleo, Lunala et Necrozma sont chassables.** L’application '
      + 'affirmait le contraire, et elle avait tort. Ils ne profitent simplement '
      + 'jamais du taux amélioré — ni Charme Chroma, ni bonus de rencontre — mais '
      + 'un chromatique existe. Vémini et Mandrillon aussi, sauf sur Soleil et '
      + 'Lune. Si tu as renoncé à une chasse à cause de ça, elle était possible.',
      '**La liste Shiny-lock a doublé**, et elle te dit maintenant, jeu par jeu, '
      + 'ce qui va te bloquer : sur Épée et Bouclier, « tous les Pokémon offerts '
      + 'sauf les fossiles », par exemple. Dix-neuf espèces manquaient, dont les '
      + 'quatre Trésors Funestes. Relevé sur le Dossier Shasse de Pokébip.',
      '**🎡 Les menus tournent.** Dès six choix, un menu devient une '
      + 'molette qui défile et s’aimante au centre — plus agréable que de traquer '
      + 'une barre de défilement dans vingt-quatre jeux ou cent capacités. En '
      + 'dessous de six, la liste reste comme avant.',
    ],
  },
  {
    version: '0.26.0', date: '2026-08-29',
    titre: 'Ce qui ne peut pas briller',
    points: [
      '**🔒 Un bouton Shiny-lock à côté de Créer une chasse.** Certains '
      + 'Pokémon n’ont pas de forme chromatique — jamais, ou pas par la rencontre '
      + 'que tu vises. La liste te les montre, avec un filtre par nom, par '
      + 'génération et par jeu.',
      '**🧭 Elle te dit surtout où aller.** Ouistempo ne peut pas briller '
      + 'quand le professeur te l’offre, mais ses œufs, si : le bouton au bout de '
      + 'la ligne ouvre la création de chasse avec le bon jeu déjà choisi.',
      'Rien n’est bloqué. La liste est tenue à la main et reste incomplète : elle '
      + 't’avertit, elle ne t’interdit rien. Et Rouge, Bleu et Jaune n’y figurent '
      + 'pas — le chromatique apparaît en Or et Argent, ces trois jeux n’en ont '
      + 'aucun.',
    ],
  },
  {
    version: '0.25.0', date: '2026-08-29',
    titre: 'Le « ? » répond à ta question',
    points: [
      '**📖 La pastille ? ne montre plus que son terme.** Elle est posée à côté '
      + 'd’un réglage et répond à une question : ouvrir les vingt entrées et te '
      + 'faire chercher la bonne, c’était répondre à côté. Un bouton **Voir tout '
      + 'le lexique** reste dessous, et le 📖 de l’en-tête ouvre toujours tout.',
      'Les renvois « voir aussi » **basculent** désormais sur le terme lié, au lieu '
      + 'de faire défiler une liste qui n’est plus là.',
      '**Le bas de l’écran dit l’essentiel.** Trois lignes de coulisses — où va la '
      + 'sauvegarde, la taille de la réserve, la date du relevé — ont laissé la '
      + 'place à la mention qui doit y figurer : **PokéArchive est un projet '
      + 'indépendant, sans lien avec Nintendo, Game Freak ou The Pokémon '
      + 'Company.** Les sources restent créditées.',
    ],
  },
  {
    version: '0.24.0', date: '2026-08-29',
    titre: 'Un PNG reste un PNG',
    points: [
      '**🖼️ Tes captures ne sont plus reconverties.** L’application '
      + 'transformait toutes les photos en JPEG avant de les envoyer, et une '
      + 'capture d’écran y perdait : le texte d’une boîte, le liseré d’un '
      + 'chromatique, les aplats d’une interface s’y couvraient d’artefacts. Le '
      + 'format que tu donnes est désormais conservé — un PNG reste un PNG, '
      + 'sans perte.',
      'Au-delà d’un mégaoctet, le JPEG reprend la main : un PNG de plusieurs '
      + 'mégaoctets mangerait ton quota pour une différence que personne ne voit '
      + 'sur une photographie.',
      '**Arrêter de comparer te ramène d’où tu viens.** Comparer bascule sur un '
      + 'Pokédex ; en sortir te laissait devant ce Pokédex — celui de personne, '
      + 'puisque la comparaison venait de s’éteindre. Le bouton te repose '
      + 'maintenant sur la fiche du dresseur que tu regardais.',
      '**Le serveur nettoie aussi les PNG.** Ils portent eux aussi de quoi en '
      + 'dire trop — la position GPS, et des blocs de texte où certains '
      + 'logiciels écrivent le nom de ta machine. Ils sont retirés à l’arrivée, '
      + 'comme c’était déjà le cas pour les JPEG.',
    ],
  },
  {
    version: '0.23.0', date: '2026-08-29',
    titre: 'Ajouter quelqu’un sans retenir son pseudo',
    points: [
      '**➕ Ajouter en ami, depuis sa fiche.** Tu arrivais chez quelqu’un par '
      + 'la recherche, et il fallait retenir son pseudo pour aller le retaper '
      + 'deux onglets plus loin. Le bouton est maintenant là, entre ses succès '
      + 'et ses photos — et il sait où tu en es : « ✓ Tu le suis » quand c’est '
      + 'déjà fait, et un clic retire.',
      '**🔍 Le champ propose des noms.** « Suivre un dresseur par son pseudo » '
      + 'supposait que tu le connaisses **au caractère près**. Tape « Ja », il te '
      + 'sort « Jack ». Un clic remplit et suit dans la foulée.',
      '**Seuls les dresseurs visibles sont proposés.** Qui s’est retiré de la '
      + 'liste ne reparaît pas par une complétion — mais reste joignable : le '
      + 'champ accepte toujours un pseudo tapé en entier.',
      '**Correction :** sur le serveur, les photos de chasse atterrissaient dans '
      + 'un dossier voisin du bon. Rien n’était perdu, mais elles ne '
      + 's’affichaient pas. Le chemin ne dépend plus de la façon dont le service '
      + 'est lancé.',
    ],
  },
  {
    version: '0.22.0', date: '2026-08-28',
    titre: 'Montrer son Pokémon',
    points: [
      '**⛔ Ce qui te bloquera.** Sur le Pokédex d’un jeu, un bouton dit '
      + 'ce que tu **ne pourras pas** attraper : les exclusivités de version, ce '
      + 'qui ne s’obtient que par échange, ce que le scénario ne donne qu’une '
      + 'fois. Sur Rouge/Bleu : neuf par échange, onze en exemplaire unique. '
      + 'Chaque nom s’ajoute d’un clic à ta liste d’envies.',
      '**📦 Où le ranger.** La fiche d’un Pokémon porte sa **boîte et sa '
      + 'case** — « Boîte 2, case 11 » — dans l’ordre du Pokédex. Elle ne bouge '
      + 'pas quand tu changes de tri : un plan qui se déplace n’est pas un plan. '
      + 'Un lien t’emmène à la boîte.',
      '**🔎 Je cherche.** Ouvre la fiche d’un Pokémon, clique « Je le '
      + 'cherche » : il rejoint ta liste sur la page 📣 Amis, qui te dit **chez '
      + 'qui il est**. Les échanges marchaient à condition de savoir déjà à qui '
      + 'demander — il fallait ouvrir chaque ami un par un. C’est l’inverse '
      + 'maintenant.',
      '**📷 Les photos des autres se voient enfin.** Un bouton « Ses '
      + 'photos » sur la fiche de chaque dresseur ouvre son mur : ses chasses et '
      + 'ses défis en images. La règle n’a pas changé — aventure publique, elles '
      + 'se montrent ; privée, elles ne sortent pas.',
      '**L’historique des défis.** « Voir les précédents », sous la carte du '
      + 'jour : tous ceux qui sont passés, relevés ou non, avec leurs photos. Un '
      + 'journal, pas un palmarès — savoir ce qu’on a laissé filer un mardi de '
      + 'septembre fait partie de l’histoire.',
      '**Une aventure naît privée.** Toi seul la vois tant que tu n’as pas '
      + 'cliqué son cadenas. C’était l’inverse : un Pokédex devenait lisible par '
      + 'qui connaissait ton pseudo, sans que personne l’ait demandé. **Tes '
      + 'aventures existantes ne bougent pas** — seules les nouvelles démarrent '
      + 'fermées.',
      '**Conséquence, et elle est voulue :** un compte neuf n’apparaît nulle '
      + 'part. Ni classement, ni comparaison, ni entraide, tant que tu n’as rien '
      + 'ouvert. C’est un interrupteur à lever, plus un réglage à subir.',
      '**La présence Discord est éteinte au départ.** Elle se lit par **toute** '
      + 'ta liste d’amis, y compris par des gens que tu ne connais pas : c’est '
      + 'une décision à prendre, pas un réglage à subir. Si tu l’avais déjà '
      + 'réglée, ton choix est gardé.',
      '**Tes photos, et la place qu’elles prennent**, dans ⚙️ Paramètres.',
      '**🎲 Le défi du jour.** Un Pokémon tiré au hasard, chaque jour, sur '
      + 'l’accueil. **Le même pour tout le monde**, et il change à minuit. Rien '
      + 'd’obligatoire : c’est un prétexte à sortir une photo, pas une tâche — '
      + 'et il n’y a pas de série à tenir, donc rien à perdre quand tu sautes '
      + 'un jour.',
      '**Aucun jeu imposé.** Le défi dit « celui-là », pas « celui-là dans '
      + 'Rouge/Bleu » : n’importe quel jeu fait l’affaire, y compris celui '
      + 'auquel tu joues ce soir.',
      '**Il pioche parmi toutes les espèces**, pas seulement dans ce qui te '
      + 'manque. Tomber sur un Pokémon que tu as déjà n’est pas un défaut : '
      + 'c’est l’occasion de le montrer. Et le défi ne s’éteint pas le jour où '
      + 'tu finis ton dex.',
      '**📷 Une photo sur chaque chasse aboutie.** Le tableau de chasse '
      + 'alignait des chiffres — 2311 rencontres, 1/1365, treize jours. Ça dit '
      + 'l’effort, pas le moment. Clique la case en bout de ligne et attache la '
      + 'capture de l’apparition.',
      '**Et les autres la voient.** Une photo suit la visibilité de son aventure, '
      + 'comme le reste : publique, elle se montre à qui va voir ton tableau ; '
      + 'privée, elle ne sort pas. Aucun réglage de plus à comprendre.',
      '**Ta position ne part pas avec.** Une photo de téléphone porte ses '
      + 'métadonnées — modèle de l’appareil, heure exacte, et les coordonnées '
      + 'GPS. L’application redessine l’image avant de l’envoyer, ce qui les '
      + 'efface, et le serveur retire lui-même ce qui resterait. Montrer un '
      + 'chromatique ne publie pas ton salon.',
      '**Elles ne s’accumulent pas dans ton dos.** Une capture de Switch part à '
      + '1600 pixels de côté au lieu de sa taille d’origine, et supprimer une '
      + 'chasse emporte sa photo. Soixante photos et quarante mégaoctets par '
      + 'compte : de quoi tenir des années de chasse.',
      '**Sur la version web, non.** Elle range tout dans ton navigateur, dont le '
      + 'budget entier serait mangé par deux captures. L’appareil photo le dit '
      + 'franchement plutôt que d’avaler une image qui disparaîtrait au '
      + 'rechargement.',
    ],
  },
  {
    version: '0.21.0', date: '2026-08-27',
    titre: 'Proposer un échange, en discuter, et un en-tête qui respire',
    points: [
      '**⇄ Proposer un échange.** Dans 🤝 Entraide, face à un dresseur, '
      + 'clique un nom dans chaque colonne : ce que tu veux, ce que tu donnes. La '
      + 'proposition part avec le jeu, et un mot si tu veux. **Rien ne bouge tout '
      + 'seul** : PokéArchive note l’accord, vous vous retrouvez ensuite dans le '
      + 'jeu pour le faire.',
      '**Accepter, refuser, discuter.** Une proposition reçue s’accepte ou se '
      + 'refuse depuis la page 📣 Amis. Une fois **acceptée**, une discussion '
      + 's’ouvre entre vous deux, pour convenir d’une heure. Avant l’acceptation, '
      + 'personne ne peut t’écrire : suivre quelqu’un n’ouvre aucune porte.',
      '**🔔 Une cloche** dans l’en-tête. Ce qui s’adresse à toi et attend une '
      + 'réponse : une proposition, un accord, un message. À ne pas confondre avec '
      + 'les captures de tes amis, qui gardent leur pastille sur l’onglet.',
      '**L’en-tête s’est vidé.** Les cinq pastilles rondes — langue, lexique, '
      + 'nouveautés, mise à jour, thème — ont rejoint le menu de ton pseudo, où '
      + 'elles portent enfin un **nom**. Il ne reste que la cloche.',
      '**⚙️ Une page Paramètres.** La langue, les couleurs, ta présence, les '
      + 'notifications : tout ce qui règle l’application quitte le bas du Profil, '
      + 'où il fallait dépasser deux cents lignes de journal pour l’atteindre. Le '
      + 'Profil dit qui tu es, les Paramètres disent comment ça se tient.',
      '**Tu n’apparais plus au classement par défaut.** Un compte sert d’abord à '
      + 'garder ton Pokédex d’une machine à l’autre ; y figurer devant tout le '
      + 'monde est une seconde décision, et elle t’appartient. L’interrupteur est '
      + 'dans les Paramètres. Les comptes déjà visibles le restent.',
      '**Sur la fiche d’un dresseur**, le champ de recherche et le filtre '
      + 'disparaissent : ils appartenaient au classement, et toucher au filtre te '
      + 'rejetait dehors sans prévenir.',
    ],
  },
  {
    version: '0.20.0', date: '2026-08-27',
    titre: 'Relire une sauvegarde, ranger en boîtes, et s’entraider',
    points: [
      '**Importer une sauvegarde.** L’application exportait depuis toujours sans '
      + 'jamais savoir relire. Le bouton **⬆ Importer** de ton profil avale un '
      + 'fichier de l’application ou du site : les collections **se réunissent**, '
      + 'rien n’est écrasé, rien n’est décoché. Importer deux fois le même '
      + 'fichier ne change rien la seconde fois.',
      '**🤝 Entraide.** En comparant ton dex avec quelqu’un, un bouton donne la '
      + 'liste **nommée** de ce que vous pouvez vous apporter — pas seulement le '
      + 'nombre. Le même bouton figure sur chaque ami.',
      '**📦 Vue boîtes.** Trente par boîte, six par rangée, comme la console. En '
      + 'Living Dex, la question n’est pas « est-ce que je l’ai » mais « dans '
      + 'quelle boîte, quelle case ».',
      '**Le programme du soir**, sur l’accueil : trois à cinq Pokémon qui te '
      + 'manquent et que tu peux vraiment attraper ce soir, avec la route, '
      + 'l’heure, la météo et le taux. La liste change demain.',
      '**🎯 Objectifs sur mesure.** Tes filtres deviennent un but nommé, avec sa '
      + 'propre jauge sur l’accueil : « tous les Spectre chromatiques », « les '
      + '151 de Kanto dans Écarlate ».',
      '**🎴 Fiche de capture.** Sur un Pokémon déjà coché : la Ball, la nature, '
      + 'le surnom, le ruban, le dresseur d’origine. Repliée par défaut — c’est '
      + 'pour qui la cherche.',
      '**Une page Transferts**, dans le nouvel onglet 🧰 Outils : par quel chemin '
      + 'un Pokémon rejoint Pokémon HOME depuis chaque jeu, et **combien de temps '
      + 'il reste**. Les seize jeux 3DS passent tous par la Banque Pokémon, qui '
      + 's’arrête — la page compte les mois qui restent pour les faire remonter.',
      '**Stratégie, Reproduction et Transferts** tiennent désormais sous un seul '
      + 'onglet, **🧰 Outils** : la barre du haut débordait, elle tient de nouveau '
      + 'sur une rangée.',
      '**📍 Où il est**, sur la fiche d’un Pokémon coché : dans le jeu, dans la '
      + 'Banque, ou déjà dans HOME. Un clic — c’est ce qu’on met à jour à chaque '
      + 'transfert.',
      '**La recherche comprend plus qu’un nom** : un numéro, un type (« feu »), '
      + 'une génération (« gen3 »), un état (« manquants ») ou un mot-clé '
      + '(« légendaire », « starter », « méga »). Une ligne dit ce qui a été '
      + 'compris, et les accents ne comptent plus.',
      '**La grille se parcourt aux flèches**, se coche à l’espace, s’ouvre à '
      + 'Entrée. « / » saute à la recherche.',
      '**Un tableau de chasse.** Tes chromatiques trouvés ne disparaissent plus : '
      + 'la plus longue chasse, la plus courte, et si tu es au-dessus ou en '
      + 'dessous de la moyenne. **Espace**, **Retour arrière** et **Entrée** '
      + 'comptent au clavier — et **Ctrl+Alt+↑ / ↓** même pendant que tu joues, '
      + 'fenêtre en arrière-plan.',
      '**📺 Overlay OBS** : une adresse locale à coller en source navigateur. Le '
      + 'sprite, le compteur, le taux et la probabilité cumulée, sur fond '
      + 'transparent.',
      '**📖 Lexique**, en haut de la fenêtre : vingt mots de l’écran expliqués, '
      + 'et une pastille « ? » là où ils apparaissent.',
      '**Deux questions au premier lancement** plutôt que dix onglets et un '
      + 'compteur à zéro : à quoi tu joues, et ce que tu comptes.',
      '**🖼 Une image à partager** de ta collection, depuis ton profil.',
      '**La rareté** : la fiche dit combien de dresseurs possèdent cette entrée, '
      + 'et un tri met tes pièces rares en tête.',
      '**Le relevé dit son âge** en bas de fenêtre. Toute la matière vient d’un '
      + 'jour précis, et rien ne le disait.',
      '**Corrigé :** tes chasses ne quittaient jamais cet ordinateur — elles '
      + 'vivaient dans son stockage local et nulle part ailleurs. Elles partent '
      + 'maintenant avec le reste, et se retrouvent sur une autre machine.',
    ],
  },
  {
    version: '0.19.0', date: '2026-08-26', titre: 'Ta présence Discord, quand tu le veux',
    points: [
      'Un réglage **Ma présence Discord** dans ton profil, avec trois choix. '
      + 'Jusqu’ici c’était toujours actif, sans moyen de couper.',
      '**Discrète** est sans doute celui qu’il te faut : Discord montre l’écran '
      + 'que tu consultes, mais ni ton pseudo ni le nom de ton aventure. Une '
      + 'présence se lit par toute ta liste d’amis, y compris par des gens que tu '
      + 'ne connais pas.',
      'Couper l’**efface tout de suite** — la dernière présence envoyée ne reste '
      + 'pas affichée à ta liste d’amis.',
      'Le choix vaut **pour cette machine**, pas pour ton compte : tu peux '
      + 'l’afficher chez toi et pas ailleurs.',
    ],
  },
  {
    version: '0.18.0', date: '2026-08-25', titre: 'Le bon tri, et des scores qui se comparent',
    points: [
      'Dans un jeu, la liste se trie par **numéro du jeu** — l’ordre dans lequel '
      + 'la console présente son propre Pokédex. Si tu choisis un autre tri, il '
      + 'tient : rien ne le défait en changeant d’onglet.',
      'Au classement, chaque ligne dit **sur quelle base** elle compte : « Vus », '
      + '« Living dex », « Formes 4 ». Trois cents captures ne veulent pas dire la '
      + 'même chose d’une aventure à l’autre.',
      'Un **sélecteur** permet de ne comparer que les aventures du même type. '
      + 'Quand il est actif, une ligne dit combien de dresseurs il met de côté.',
      'Les succès par Pokédex d’un autre dresseur affichaient **zéro pour tout le '
      + 'monde**. Ils montrent désormais son vrai avancement, jeu par jeu.',
      'La fenêtre « Tu es à jour » s’affichait un mot par ligne. Réparée.',
      'Les barres de défilement se voient enfin, et ont perdu leurs deux petites '
      + 'flèches.',
    ],
  },
  {
    version: '0.17.0', date: '2026-08-25', titre: 'Un tableau de chasse, et les succès des autres',
    points: [
      'Un bouton **Voir mes succès** dans ton profil ouvre soixante succès : '
      + 'tes premiers pas, ta régularité, tes chromatiques, tes légendaires — '
      + 'et un par Pokédex.',
      'Rien à débloquer à la main : tout se déduit de ce que tu as déjà '
      + 'enregistré. Un succès ajouté plus tard s’acquiert **rétroactivement**, '
      + 'à sa vraie date.',
      '**L’exploration** : un lieu compte dès que tu y as pris un Pokémon. '
      + 'Trois mille trois cents lieux sur les vingt-trois jeux, et « Carte '
      + 'complète » pour un jeu arpenté de bout en bout.',
      'Les **dix-huit types**, le **temps long** — un an d’archive, ou reprendre '
      + 'après trente jours d’absence — et une **légende chromatique**.',
      'Les succès d’un autre dresseur se regardent depuis sa fiche, par '
      + '**Ses succès**. Son journal, lui, ne sort pas : seuls les totaux servent.',
    ],
  },
  {
    version: '0.16.0', date: '2026-08-25', titre: 'Ta présence Discord s’efface quand tu pars',
    points: [
      'En te déconnectant, ta présence Discord continuait d’afficher ton pseudo '
      + 'et ton aventure à toute ta liste d’amis. Elle s’efface désormais — que '
      + 'tu partes toi-même ou que ta session expire.',
      'Du ménage sous le capot : 123 lignes de styles qui ne servaient plus.',
    ],
  },
  {
    version: '0.15.0', date: '2026-08-25', titre: 'Chercher un lieu, ou un Pokémon',
    points: [
      'Une **barre de recherche** sur la page Lieux : tape le nom d’une route ou '
      + 'celui d’un Pokémon, c’est le même champ. Les accents ne comptent pas — '
      + '« foret » trouve la Forêt de Jade.',
      'Le premier lieu trouvé s’ouvre tout seul.',
      'Un **trait sépare** ce qu’il te reste à prendre de ce que tu as déjà.',
      'La fenêtre « à jour » dit désormais en quelle version tu es.',
    ],
  },
  {
    version: '0.14.0', date: '2026-08-25', titre: 'Où aller, et ce que tu as fait',
    points: [
      'Un onglet **Lieux** : choisis un jeu, et chaque route dit ce qu’il te reste '
      + 'à y prendre — avec le taux d’apparition, le niveau, l’heure et la météo.',
      'Les 23 jeux y sont, Cobblemon compris par ses biomes.',
      'Dans le Profil, **ta rétrospective** : tes captures de la semaine, ton '
      + 'meilleur jour, ta plus longue série, et les trente derniers jours en un '
      + 'coup d’œil.',
      'Un **carnet de bord** par aventure : ta règle de Nuzlocke, tes surnoms, où '
      + 'tu en es.',
    ],
  },
  {
    version: '0.13.0', date: '2026-08-25', titre: 'Le nom Discord, pas l’identifiant',
    points: [
      'C’est ton **nom affiché** sur Discord qui s’affiche — « Tennôsei » — et non '
      + 'le pseudo technique « tennosei5804 ».',
      'Il se met à jour à chaque connexion, donc si tu changes de nom sur Discord, '
      + 'il suivra.',
    ],
  },
  {
    version: '0.12.0', date: '2026-08-25', titre: 'Reconnaître quelqu’un sans cliquer',
    points: [
      'Le pseudo Discord apparaît aussi dans **le classement, la recherche et ta '
      + 'liste d’amis** — plus seulement sur la fiche d’un dresseur.',
      'Le pseudo choisi passe au-dessus, le pseudo Discord en dessous, et les deux '
      + 'à la même taille.',
      'Les changelogs se lisent à gauche au lieu d’être centrés.',
    ],
  },
  {
    version: '0.11.0', date: '2026-08-25', titre: 'Le pseudo Discord, en plus du tien',
    points: [
      'Le profil d’un dresseur montre maintenant **trois lignes** : son pseudo '
      + 'Discord, son pseudo PokéArchive, puis son aventure.',
      'Ce nom ne se change pas depuis l’application — c’est ce qui permet de '
      + 'reconnaître quelqu’un qui s’est renommé ici.',
      'Il n’apparaît qu’après une reconnexion : on ne le gardait pas jusqu’ici.',
    ],
  },
  {
    version: '0.10.0', date: '2026-08-25', titre: 'L’aventure d’un dresseur, nommée',
    points: [
      'Quand tu ouvres le profil de quelqu’un, tu vois **le nom de son aventure** '
      + 'au lieu de « 1 aventure publique » — qui n’apprenait rien, puisque la '
      + 'liste juste en dessous les compte déjà.',
      'Un pseudo trop long ne déborde plus de la carte.',
    ],
  },
  {
    version: '0.9.0', date: '2026-08-25', titre: 'Les visages, et des pseudos plus courts',
    points: [
      'Les **photos de profil Discord** s’affichent enfin dans la liste d’amis et '
      + 'dans le fil — elles étaient cassées.',
      'Chaque ami montre **son aventure** à côté de son pseudo : « Tennosei — '
      + 'Chasse shiny ».',
      'Les pseudos passent à **douze caractères**. Les plus longs restent valides, '
      + 'mais l’affichage les raccourcit au lieu de déborder.',
      'Les époques de la table des types se lisent dans l’ordre : 1ʳᵉ génération, '
      + 'puis 2ᵉ à 5ᵉ, puis 6ᵉ à 9ᵉ.',
      'La case « apparaître dans la liste des dresseurs » devient un vrai '
      + 'interrupteur.',
    ],
  },
  {
    version: '0.8.0', date: '2026-08-25', titre: 'Les amis',
    points: [
      'Une page **Amis** : suis qui tu veux, et vois passer ce qu’ils attrapent. '
      + 'Une bulle apparaît quand un ami avance — une seule par synchronisation, '
      + 'jamais une par Pokémon.',
      'Les chromatiques de tes amis ont droit à leur propre annonce.',
      'Dans le Profil, tu peux **te retirer de la liste des dresseurs** : tu sors '
      + 'du classement et de la recherche.',
      'La table complète des types s’adapte à l’époque : trois boutons pour lire '
      + 'les règles de la 1ʳᵉ génération, de la 2ᵉ à la 5ᵉ, ou d’aujourd’hui.',
      'Ce bouton-ci, qui te dit ce qui a changé.',
    ],
  },
  {
    version: '0.7.0', date: '2026-08-25', titre: 'Le sélecteur garde ses couleurs',
    points: [
      'Le sélecteur de couleur ne prend plus la teinte qu’on est en train de '
      + 'choisir : on jugeait un vert vif dans une fenêtre elle-même verte.',
    ],
  },
  {
    version: '0.6.0', date: '2026-08-25', titre: 'Un vrai sélecteur de couleur',
    points: [
      'Le choix libre des couleurs n’ouvre plus la boîte de Windows mais un '
      + 'sélecteur maison : carré de teintes, ruban, code hexadécimal, canaux '
      + 'rouge/vert/bleu, et la pipette.',
      'Il affiche le contraste de la couleur choisie, pour dire si le résultat '
      + 'restera lisible.',
    ],
  },
  {
    version: '0.5.0', date: '2026-08-25', titre: 'Le volume, et tes couleurs',
    points: [
      'Le cri a un **volume réglable** — le curseur se déplie quand on approche '
      + 'du bouton. L’icône montre le niveau.',
      'Dans le Profil, **cinq couleurs à choisir** : le fond, le cadran rouge, '
      + 'l’écriture, le fond des cartes, les bordures. Le reste de la palette '
      + 'se déduit toute seule.',
      'Le choix appartient au thème : ce que tu poses en sombre ne suit pas en clair.',
    ],
  },
  {
    version: '0.4.0', date: '2026-08-25', titre: 'Le cri, et les faiblesses d’époque',
    points: [
      'Un bouton dans le coin du portrait **joue le cri du Pokémon**. Sur un '
      + 'Pokédex d’avant la 6ᵉ génération, c’est le cri de la Game Boy.',
      'Les faiblesses suivent la génération du jeu ouvert. Sur Rouge et Bleu, '
      + 'Abra n’est plus annoncé faible au Spectre — qui ne lui faisait aucun '
      + 'dégât — ni aux Ténèbres, qui n’existaient pas.',
    ],
  },
  {
    version: '0.3.0', date: '2026-08-25', titre: 'Discord, et ce qui t’appartient',
    points: [
      'Ta **présence Discord** montre le Pokédex ouvert, ton pseudo et ton aventure.',
      '**Emporter tes données** dans un fichier, depuis le Profil.',
      'Voir et fermer tes **connexions ouvertes** sur d’autres machines.',
      'Un **journal** qui réunit toutes tes aventures, pas seulement celle en cours.',
      'Un bouton pour chercher les mises à jour quand ça te chante.',
    ],
  },
  {
    version: '0.2.0', date: '2026-08-24', titre: 'Cobblemon et les pseudos',
    points: [
      '**Cobblemon** entre dans la Chasse aux chromatiques.',
      'Chaque apparition dit la part qu’elle prend dans son palier de rareté.',
      'Les pseudos et noms d’aventure insultants sont refusés — sans refuser '
      + 'Cassandre ni Scunthorpe.',
    ],
  },
  {
    version: '0.1.0', date: '2026-08-24', titre: 'Première version',
    points: [
      'PokéArchive s’installe et se met à jour tout seul.',
    ],
  },
];

// ---- Ce qui est nouveau pour cette personne ---------------------------------

/** Compare deux « x.y.z ». Rend un nombre négatif, nul ou positif. */
function comparerVersions(a, b){
  const x = String(a).split('.').map(Number);
  const y = String(b).split('.').map(Number);
  for(let i = 0; i < 3; i++){
    const d = (x[i] || 0) - (y[i] || 0);
    if(d) return d;
  }
  return 0;
}

function nouveautesVues(){
  try{ return localStorage.getItem(NOUVEAUTES_VUES_KEY); }catch(e){ return null; }
}

function marquerNouveautesVues(){
  try{ localStorage.setItem(NOUVEAUTES_VUES_KEY, NOUVEAUTES[0].version); }
  catch(e){ /* stockage refusé */ }
}

/**
 * Les versions que cette personne n'a pas encore lues.
 *
 * Sur une installation neuve, rien n'est marqué : on ne va pas accueillir
 * quelqu'un par la liste de ce qu'il a manqué avant d'arriver. On note
 * simplement où il en est, et la pastille servira à la prochaine version.
 */
function nouveautesNonLues(){
  const vues = nouveautesVues();
  if(!vues){ marquerNouveautesVues(); return []; }
  return NOUVEAUTES.filter(function(n){ return comparerVersions(n.version, vues) > 0; });
}

function majPastilleNouveautes(){
  if(!nouveautesBtn) return;
  nouveautesBtn.classList.toggle('a-du-neuf', nouveautesNonLues().length > 0);
}

// ---- L'affichage -------------------------------------------------------------

const NOUVEAUTES_MOIS = ['janvier','février','mars','avril','mai','juin','juillet',
                         'août','septembre','octobre','novembre','décembre'];

function dateNouveaute(iso){
  const p = String(iso).split('-');
  if(p.length !== 3) return iso;
  return Number(p[2]) + ' ' + NOUVEAUTES_MOIS[Number(p[1]) - 1] + ' ' + p[0];
}

/**
 * Le gras d'un point, sans innerHTML.
 *
 * Les textes sont écrits ici, donc sûrs — mais les passer par innerHTML
 * ouvrirait la porte au jour où l'un d'eux viendrait d'ailleurs. Deux
 * astérisques encadrent ce qui compte, et on découpe dessus.
 */
function texteAvecGras(texte){
  const frag = document.createDocumentFragment();
  String(texte).split('**').forEach(function(bout, i){
    if(!bout) return;
    if(i % 2){
      const b = document.createElement('strong');
      b.textContent = bout;
      frag.appendChild(b);
    } else {
      frag.appendChild(document.createTextNode(bout));
    }
  });
  return frag;
}

function blocVersion(n, estNouveau){
  const bloc = document.createElement('div');
  bloc.className = 'nouv-version' + (estNouveau ? ' neuve' : '');

  const tete = document.createElement('div');
  tete.className = 'nouv-tete';

  const num = document.createElement('span');
  num.className = 'nouv-num';
  num.textContent = n.version;

  const titre = document.createElement('span');
  titre.className = 'nouv-titre';
  titre.textContent = n.titre;

  const quand = document.createElement('span');
  quand.className = 'nouv-date';
  quand.textContent = dateNouveaute(n.date);

  tete.appendChild(num);
  tete.appendChild(titre);
  if(estNouveau){
    const marque = document.createElement('span');
    marque.className = 'nouv-marque';
    marque.textContent = 'Nouveau';
    tete.appendChild(marque);
  }
  tete.appendChild(quand);

  const liste = document.createElement('ul');
  liste.className = 'nouv-points';
  n.points.forEach(function(p){
    const li = document.createElement('li');
    li.appendChild(texteAvecGras(p));
    liste.appendChild(li);
  });

  bloc.appendChild(tete);
  bloc.appendChild(liste);
  return bloc;
}

function ouvrirNouveautes(){
  if(!nouveautesOverlay) return;
  const vues = nouveautesVues();
  nouveautesListe.innerHTML = '';
  NOUVEAUTES.forEach(function(n){
    const neuf = !!vues && comparerVersions(n.version, vues) > 0;
    nouveautesListe.appendChild(blocVersion(n, neuf));
  });

  nouveautesOverlay.style.display = 'flex';
  // Lire vaut lecture : la pastille retombe, mais seulement une fois la liste
  // réellement affichée.
  marquerNouveautesVues();
  majPastilleNouveautes();
  setTimeout(function(){ nouveautesFermer.focus(); }, 10);
}

function fermerNouveautes(){
  if(nouveautesOverlay) nouveautesOverlay.style.display = 'none';
}

// ---- Branchements -----------------------------------------------------------

document.addEventListener('DOMContentLoaded', function(){
  if(nouveautesBtn) nouveautesBtn.addEventListener('click', ouvrirNouveautes);
  if(nouveautesFermer) nouveautesFermer.addEventListener('click', fermerNouveautes);
  if(nouveautesOverlay){
    nouveautesOverlay.addEventListener('click', function(e){
      if(e.target === nouveautesOverlay) fermerNouveautes();
    });
  }
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && nouveautesOverlay
       && nouveautesOverlay.style.display === 'flex') fermerNouveautes();
  });
  majPastilleNouveautes();
});
