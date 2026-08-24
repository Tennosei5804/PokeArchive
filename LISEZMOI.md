# PokéArchive

Application de bureau de suivi de collection Pokémon, par **Tennosei_**.
Connexion par Discord, données en MySQL, partage de l'avancement entre amis.

## Comment c'est agencé

```
Application Tauri  ──── jeton de session ────►  API  ──── mot de passe ────►  MySQL
   (distribuée)                            (ton serveur)                  (jamais exposé)
                    └──── frontière de confiance ────┘
```

Le mot de passe MySQL vit **uniquement** dans `api/.env`, sur le serveur.
L'application distribuée à tes amis ne détient qu'un jeton de session, valable
pour un seul compte et révocable.

C'est toute la raison d'être de l'API. Sans elle, il faudrait embarquer les
identifiants MySQL dans le binaire — n'importe qui pourrait alors les extraire
(`strings appli.exe`), se connecter avec un client ordinaire et écraser le dex
des autres. La connexion Discord n'y changerait rien : elle vérifie l'identité
*dans l'interface*, et l'attaquant n'utilise pas l'interface.

## Le dossier

```
PokéArchive/
├── api/                  → le service (Node) : Discord, sessions, MySQL
│   ├── .env              → les secrets. JAMAIS partagé ni versionné
│   ├── .env.exemple
│   └── src/
│       ├── serveur.js    → routes
│       ├── config.js     → lecture de l'environnement
│       ├── base.js       → pool MySQL, schéma
│       ├── comptes.js    → dresseurs, sessions, dex
│       └── discord.js    → OAuth2
└── app/                  → l'application Tauri
    ├── src/              → l'interface (HTML, CSS, JS)
    │   ├── types/        → les 18 logos de type, 200 × 44 chacun
    │   │                   combat.js → règles de combat · strategie.js → l'écran
    │   │                   reproduction.js → groupes d'œufs et co-parents
    │   │                   confirmer.js → les dialogues (confirmer, saisir, prévenir)
    │   ├── logos/        → les bannières de jeu, 698 × 156 environ. Le cadre
    │   │                   n'impose pas de hauteur : une bannière plus carrée
    │   │                   grandit sa carte et décale son compteur
    │   └── js/
    │       ├── donnees-embarquees.js → GÉNÉRÉ : espèces, formes, Pokédex, fiches
    │       ├── donnees-attaques.js   → GÉNÉRÉ : capacités apprises (chargé à la demande)
    │       ├── donnees-descriptions.js → RELEVÉ : les notices du Pokédex, par jeu
    │       ├── donnees-cobblemon.js  → RELEVÉ : les biomes d'apparition du mod
    │       ├── donnees-home.js       → RELEVÉ : ce que HOME accepte, pour le banc
    │       ├── donnees-pokedex.js    → RELEVÉ : les Pokédex de jeux, pour le banc
    │       └── evenements.js         → À LA MAIN : les distributions françaises
    ├── outils/           → la génération des réserves, les deux relevés, et les
    │                       deux vérifications : verifier.py et banc.py
    └── src-tauri/        → le cœur Rust
        ├── src/lib.rs    → commandes, connexion Discord, appels à l'API
        └── tauri.conf.json
```

## Les réserves embarquées

L'application n'interroge PokeAPI à aucun moment : tout ce qui est identique
pour tous les dresseurs est calculé une fois, hors ligne, et embarqué. Il y en
a deux, volontairement séparées.

| Fichier | Contenu | Poids | Chargement |
|---|---|---|---|
| `donnees-embarquees.js` | espèces, formes, types, Pokédex, statistiques, talents, évolutions, lieux | ~1,4 Mo | au démarrage |
| `donnees-descriptions.js` | la notice du Pokédex, par espèce et par jeu | ~1,0 Mo | à l'ouverture de la première fiche |
| `donnees-attaques.js` | capacités apprises, par entrée et par jeu | ~1,9 Mo | à l'ouverture de la première fiche |
| `donnees-lieux.js` | où l'on croise chaque Pokémon, jeu par jeu | ~1,9 Mo | à l'ouverture de la première fiche |
| `donnees-cobblemon.js` | dans quels biomes le mod le fait apparaître | ~180 Ko | à l'ouverture d'une fiche Cobblemon |

Les notices viennent de **Poképédia**, et non de PokeAPI. La raison est
mesurée : `pokemon_species_flavor_text.csv` ne porte de français que pour
quatorze versions sur trente-cinq. Rouge, Bleu, Jaune, Or, Argent, Cristal,
Rubis, Saphir, Émeraude, Rouge Feu, Vert Feuille, Diamant, Perle, Platine,
HeartGold, SoulSilver, Noir 2, Blanc 2, Légendes Arceus, Écarlate et Violet
n'y existent qu'en anglais — alors que ces jeux ont bel et bien été traduits.
Poképédia les a tous, et une par jeu : le Pokédex de Rouge et Bleu peut donc
citer Rouge et Bleu.

Le relevé du 24 août 2026 donne **1 079 entrées pourvues** — les 1 025 espèces
plus les formes régionales, qui ont leur propre page — soit **10 393 couples
espèce/jeu** pour **7 149 textes distincts**. Aucune page relevée n'était
dépourvue de section « Descriptions du Pokédex ».

La couverture par onglet retombe exactement sur la taille des Pokédex, ce qui
est le meilleur contrôle qu'on ait que la lecture n'a rien perdu :

| onglet | espèces | onglet | espèces | onglet | espèces |
|---|---|---|---|---|---|
| Rouge/Bleu | 151 | Jaune | 151 | Or/Argent | 251 |
| Cristal | 251 | Rubis/Saphir | 386 | Émeraude | 386 |
| RF/VF | 384 | Diamant/Perle | 493 | Platine | 493 |
| HG/SS | 493 | Noir/Blanc | 649 | Noir 2/Blanc 2 | 491 |
| X/Y | 721 | RO/SA | 721 | Soleil/Lune | 820 |
| US/UL | 826 | Let's Go | 172 | Épée/Bouclier | 693 |
| DÉ/PS | 493 | Lég. Arceus | 245 | Écarlate/Violet | 744 |
| Lég. Z-A | 379 | | | | |

Les comptes de la septième génération dépassent les 809 espèces d'alors parce
que les formes d'Alola ont chez Poképédia leur page à elles.

Les attaques pèsent à elles seules plus que tout le reste : les embarquer dans
la réserve principale ralentirait chaque lancement pour un panneau qu'on
n'ouvre pas toujours. `fiche.js` va donc les chercher à la demande, une fois
par session.

Même brutes, elles ne tiendraient pas : `pokemon_moves.csv` fait 10,7 Mo pour
638 000 lignes. Trois compressions, cumulées, ramènent cela à 1,9 Mo :

- **les CT en drapeaux** — six lignes sur dix sont des « machine ». Chaque jeu
  a sa liste de CT ; « ce Pokémon apprend-il la n° *i* ? » est donc une
  question à un bit, et non à cinq caractères ;
- **le reste en base 36** — un identifiant de capacité tient en deux
  caractères, un niveau aussi ;
- **la mutualisation** — Florizarre apprend exactement la même chose dans X que
  dans Rubis Oméga. Douze mille couples (entrée, jeu) ne donnent que dix mille
  blocs distincts, écrits une seule fois.

### Regénérer

Après la sortie d'un jeu, ou d'un rééquilibrage :

```
cd app
py outils/fabriquer-page.py        → refabrique les pages depuis src/index.html
py outils/serveur-generation.py
```

Puis, selon ce qu'on rafraîchit :

- <http://127.0.0.1:8124/outils/generer-donnees.html> → la réserve principale ;
- <http://127.0.0.1:8124/outils/generer-attaques.html> → les attaques.

Les deux sont indépendantes : rafraîchir les attaques ne touche pas au reste,
et inversement. Recompile ensuite l'application pour embarquer le résultat.

Les notices du Pokédex ne passent pas par là : elles se relèvent sur Poképédia,
comme les lieux, et le script s'en charge seul.

```bash
cd app
py outils/relever-descriptions.py
```

Comptez une heure et demie au premier passage — près de quatre mille cinq cents
pages, avec la même pause de 0,15 s que `relever-lieux.py` : le wiki est
bénévole. Les pages sont mises en cache dans `outils/.pages/pokepedia`, donc un
second passage est immédiat.

## Où l'obtenir

Le bloc de la fiche répond à « celui-là, je le trouve où ? », et il puise à
**deux sources qui ne se recouvrent pas** :

- les **rencontres de PokeAPI**, embarquées dans la réserve principale : lieu,
  méthode, niveau et rareté, mais **rien au-delà de la septième génération** —
  Épée, Écarlate et Z-A n'y ont aucune ligne ;
- le **relevé**, dans `donnees-lieux.js` : **les vingt-deux jeux**, avec la
  sous-zone, le niveau, le taux, l'heure, la météo et la saison.

```
cd app
py outils/relever-lieux.py     → refait la réserve depuis Poképédia
```

### Cobblemon, qui n'a ni routes ni grottes

Le mod est le vingt-quatrième onglet, et le seul dont le relevé ne vienne pas
d'un wiki Pokémon : ses tables d'apparition vivent dans les fichiers JSON du
mod, une par espèce. La communauté en tient un **tableur**, et c'est la seule
lecture qui donne la ligne entière.

```
cd app
py outils/relever-cobblemon.py                → depuis le tableur en ligne
py outils/relever-cobblemon.py --fichier x.csv → depuis une copie locale
```

Le relevé tient en quelques secondes : 2 732 lignes du tableur, ramenées à
**2 638 apparitions sur 874 formes**, 178 Ko — 60 biomes de Minecraft,
22 familles hors-jeu et 24 structures.

On n'y cherche pas un lieu mais un **biome**, parce qu'il n'y a pas de carte :
le monde est engendré à chaque partie, et ce qui se répète d'un monde à
l'autre, c'est le biome.

### Les biomes sont résolus, pas traduits

Le tableur n'écrit pas des biomes mais des **étiquettes de Cobblemon** —
`is_arid`, `is_temperate`, `is_overworld` —, c'est-à-dire des familles. Les
traduire au sens donnait « Régions arides », ce qui ne dit à personne où aller.
Le script les **résout** en biomes de Minecraft, sous leur nom français du jeu :

> **Arid** → Badlands · Badlands boisées · Badlands érodées · Désert ·
> Plateau de savane · Savane · Savane venteuse

La résolution est mécanique, pas écrite à la main, et elle demande **quatre
sources** parce que le graphe des tags traverse trois projets :

| | |
|---|---|
| les tags du mod | GitLab, `cable-mc/cobblemon`, `data/cobblemon/tags/worldgen/biome` |
| les tags de Minecraft | `#minecraft:is_forest` et consorts, par le miroir `misode/mcmeta` |
| les tags conventionnels | `#c:is_*`, que ni l'un ni l'autre ne définit — NeoForge les génère et les versionne |
| les noms français | `fr.minecraft.wiki/w/Biome` |

Sans la troisième, la moitié des familles tombait à zéro biome : `is_jungle` ne
délègue qu'à des tags. Une étiquette que la table ne connaîtrait pas
**interrompt le relevé** plutôt que de passer en silence.

Trois conséquences que la fiche porte :

| | |
|---|---|
| une famille peut couvrir une **dimension entière** | « Overworld » vaut pour les 56 biomes de la surface : la fiche écrit « Partout en surface » plutôt que de les énumérer |
| **22 étiquettes ne recouvrent aucun biome du jeu de base** | île tropicale, zone volcanique, source chaude. **Vingt sur vingt-deux disent quand même quoi faire.** Onze nomment leurs biomes chez d'autres mods — « Îles tropicales » vaut pour Tropics (Biomes O' Plenty) et trois biomes de Wythers. Neuf autres ne sont pas des familles mais des noms de biomes que le tableur écrit en clair, et le mod qui les fournit est relevé dans les fichiers de spawn : Skyroot Forest chez **The Aether**, Howling Constructs chez **The Bumblezone**. Restent deux étiquettes muettes — « Nether gelé » est un tag que Cobblemon déclare et que rien ne remplit |
| au-delà de **six biomes**, la liste se replie | la plus fournie en compte trente-neuf, six cent cinquante-cinq caractères |

### Dans quel monde, avant où dans le monde

« Deltas de basalte » ne dit pas de lui-même qu'il faut bâtir un portail, ni
« Terres stériles de l'End » qu'il faut d'abord battre le dragon. Chaque ligne
porte donc sa **dimension**, deux fois : au liseré — vert l'Overworld, rouge le
Nether, violet l'End, gris tireté ce qui n'existe pas sans mod — et en pastille,
`🌍 Overworld`, `🔥 Nether`, `🌌 End`. Le liseré se voit de loin quand on
parcourt cinq lignes, la pastille se lit quand on n'en regarde qu'une.

L'Overworld n'avait d'abord que son liseré, au motif qu'il porte 2 268 lignes
sur 2 638 et que la couleur suffisait. Elle ne suffisait pas : une ligne lue
seule ne disait plus dans quel monde elle se trouvait, et rien n'explique le
code couleur. Les trois mondes se nomment.

Aucune ligne du relevé ne mélange deux mondes : 2 268 en surface, 93 dans le
Nether, 15 dans l'End, 262 nulle part sans mod.

Les apparitions sont **triées dans l'ordre où on atteint les mondes** — surface,
Nether, End, puis les moddées —, et à monde égal de la plus commune à la plus
rare. Sans cette règle, Métalosse ouvrait sur deux lignes de l'Aether avant
celle qu'on peut faire avec le jeu qu'on a.

Trois choses que le tableur sait et qu'on ne devine pas en jeu :

| | |
|---|---|
| la **rareté** | quatre paliers, de « Commun » à « Très rare » — la pastille de tête |
| le **biais régional** | un Pikachu des plages évoluera en Raichu d'Alola ; rien ne le montre |
| la **structure** | dans les arbres, dans un village, au fond d'un manoir — le seul « où » du tableur qui ressemble à une carte |
| le **sous-sol** | `canSeeSky = FALSE` : là où le ciel ne se voit pas. Aucun biome ne le dit, on creuse partout |
| les **biomes exclus** | « Partout en surface, sauf les Abîmes » |
| la **nature du sol** | « Muddy » n'est pas un biome mais `#cobblemon:has_block/mud` : une condition sur le sol, pas sur le monde. On creuse de la boue partout, et la ranger parmi les étiquettes qui demandent un mod était faux — c'est une pastille, « Sur la boue », et elle s'inverse en « sauf » quand le tableur l'exclut |

La clé est le **numéro national**, pas le nom : le tableur écrit « Basculin »
là où l'application, qui suit PokeAPI, connaît `basculin-red-striped`. Les
motifs (`striped=blue`, `maushold_family=three`) choisissent ensuite la forme
quand l'application la distingue — sans quoi les vingt-huit lignes de Bascoeur
s'entassaient sur la seule forme rouge. Quand elle ne la distingue pas, les
lignes **fusionnent** au lieu de se répéter : les vingt-quatre livrées de
Magicarpe se lisent en quatre apparitions.

### Une seule source

Le relevé a d'abord été bâti sur **Pokékalos**, puis sur **Pokébip**. Les deux
ont été abandonnés le 23 août 2026, après une journée passée à arbitrer leurs
désaccords : Méanville, les fossiles de Rubis Ω, l'Ultra-Dimension, Bargantua,
les sept de Hisui, le Scanner QR — **chaque fois, c'est Poképédia qui avait
raison**. Quarante-cinq corrections écrites à la main tenaient le relevé
debout ; elles n'étaient pas un accomplissement mais le symptôme d'un socle
trop faible. Elles ont toutes disparu avec lui.

Ce que Poképédia donne et qu'aucun des deux n'avait :

| | |
|---|---|
| la **sous-zone** | « Pente Enneigée • Hautes herbes », et non « Pente Enneigée » |
| le **niveau** et le **taux** | « (39–43, 40 %) » |
| la **version** | Rubis et Saphir séparés d'Émeraude, que Pokébip fusionnait |
| la **forme** | page dédiée pour Rattata d'Alola, Qwilfish de Hisui |
| l'**heure** | matin, jour, soir, nuit |
| la **météo** | pluie, neige, blizzard, brouillard, tempête de sable |
| la **saison** | printemps, été, automne, hiver — la mécanique de Noir/Blanc |

Deux limites que je présentais comme irréductibles tombent d'elles-mêmes : la
fusion des versions de Hoenn et la séparation des formes sont **natives** ici.

### Comment on la lit

Par l'**API de MediaWiki**, jamais en aspirant les pages, et en ne demandant
que la section « Localisations » : **cinq kilo-octets au lieu de six cents**
pour la page entière. Une requête par espèce **et par génération** — la page
principale ne montre que les dernières —, soit mille soixante-dix-neuf pages
sur dix générations, près de quatorze mille appels, mis en cache dans
`app/outils/.pages/pokepedia`. Le délai entre deux requêtes est à 0,15 s :
Poképédia est un wiki bénévole.

La section a **deux niveaux**, et il faut les deux :

- le **résumé** — « Épée et Bouclier | Isolarmure : Plaine Salutation »,
  « Ultra-Soleil | Faire évoluer Pikachu dans l'Ultra-Dimension ». C'est lui
  qui porte les évolutions, les échanges et les absences. Sans lui, le relevé
  n'avait pas **une seule** catégorie « évolution » ;
- le **détail** — un tableau par jeu : lieu, sous-zone, niveau, taux, et selon
  les jeux l'heure et la météo. Il ne couvre que les rencontres sauvages.

La présentation change d'un jeu à l'autre, et il faut s'y plier : Épée/Bouclier
donne le taux **sous chaque météo**, Légendes Arceus se contente d'un ✓
récapitulatif, le détail vivant dans un tableau repliable que l'API ne rend
pas.

### Le texte est composé

C'est un changement de doctrine, et il vaut d'être dit. Les deux sites
précédents donnaient de la **prose** qu'on recopiait telle quelle ; Poképédia
donne un **tableau**. On rend donc ses colonnes mécaniquement :

```
Route 8 (Sentier des Sources) • Hautes herbes (39–43, 40 %)
Route 8 (Sentier des Sources) • Pokémon cachés (38–41, 40 %)
Route 10 (route principale) • Pokémon cachés (44–46, 10 %)
```

Rendre des champs est plus fidèle que reformuler une phrase. Et **toutes** les
rencontres y sont, sans plafond : Roucool en a quatorze dans Rouge et Bleu,
Magicarpe trente-quatre. C'est long, mais un lieu qu'on n'écrirait pas est un
lieu qu'on irait chercher ailleurs.

### Une ligne par forme

Une espèce peut avoir **deux réalités dans le même jeu** : en Alola, Rattata
d'Alola court les routes tandis que celui de Kanto n'y existe pas. Poképédia
est nativement par forme — « Pour les localisations du Raichu d'Alola,
consultez sa page dédiée » —, et la réserve embarquée donne à chaque forme son
propre identifiant, au-delà de 10 000 : Rattata est 19, Rattata d'Alola
10 091. La fiche et la grille lisent **la forme d'abord, l'espèce à défaut**.

### Capturable, ou seulement vu

Le relevé n'ajoute qu'une chose au texte, une **catégorie** : `sauvage`,
`evolution`, `offert`, `echange`, `oeuf`, `indisponible`. Elle répond à la
seule question qui change un dex.

La logique est **inversée** par rapport à ce qu'on ferait d'instinct : on ne
cherche pas à reconnaître ce qui est sauvage, on liste ce qui ne l'est **pas**.
Le vocabulaire des sous-zones a été relevé dans le cache — **mille soixante-dix
formes distinctes** — et cent trente-sept seulement désignent autre chose
qu'une rencontre. Décrire les neuf cent trente autres serait sans fin ; les
nommer par exception tient en huit motifs.

Et **une seule vraie rencontre suffit**. Prendre la première ligne ne marchait
pas : Poképédia met « Route 4 • À acheter (500 P) » en tête de Magicarpe, qui
se pêche pourtant à trente-trois autres endroits. Un lieu réel l'emporte sur un
comptoir, où qu'il figure dans la liste.

### Dans la grille

Le relevé ne vit pas que dans la fiche. Sur le Pokédex d'un jeu, chaque carte
porte une **pastille d'obtention** — 🌿 capturable, ⬆ par évolution, 🎁 offert,
⇄ par échange, ✖ indisponible — et un ✨ grisé s'ajoute pour un **shiny-lock**,
l'information qui fait renoncer à une chasse avant de la commencer. Le titre au
survol dit la même chose en toutes lettres.

La barre des filtres gagne le groupe « Obtention » : *Capturable dans ce jeu*,
*Offert*, *Par échange*, *Par évolution*, *Indisponible — à transférer*,
*Shiny-lock*.

Trois règles encadrent tout ça :

- **rien de tout cela sur Pokémon HOME.** « Capturable ici » n'a pas de réponse
  hors d'un jeu : le filtre ne retient alors rien, plutôt que de mentir ;
- **une espèce sans ligne se dit « ne se capture pas »** — mais seulement dans
  un jeu dont le Pokédex a été relevé, puisqu'il les liste toutes. Ailleurs —
  HeartGold, Noire 2, Ultra-Soleil, dont seules les pages annexes existent —
  une absence de ligne n'est qu'une absence de source, et l'affirmer serait
  inventer. La réserve porte donc `pokedexReleve`, la liste des jeux où
  l'inférence est permise, et le banc vérifie qu'elle n'est jamais outrepassée ;
- **la réserve se charge à la première grille d'un jeu**, pas au démarrage. Ses
  355 Ko ne pèsent donc sur aucun lancement, et la grille se redessine d'elle-
  même quand ils arrivent. Sans ce détour, choisir « Capturable » n'aurait rien
  montré et l'on aurait cru le relevé vide.

### Ce que le relevé a demandé de dénouer

Rapprocher les noms de Poképédia et les espèces de la réserve tient en peu de
choses, parce que le wiki est régulier : le nom de page **est** le nom français
d'affichage, et les formes régionales suivent une règle unique — « Rattata
(Alola) » chez nous devient « Rattata d'Alola » chez lui, « de Galar », « de
Hisui », « de Paldea » pour les autres.

Trois détails ont quand même demandé du soin :

- **les modèles non rendus.** L'API ne développe pas le modèle du Pokédollar
  dans une section isolée, et « À acheter (500 ) » s'écrivait avec ses
  doubles accolades en toutes lettres. Le symbole est remplacé, les autres
  modèles effacés ;
- **les valeurs empilées.** Deux niveaux dans une cellule, séparés par un saut
  de ligne, se collaient en « 357 » — un niveau qui n'existe pas. Le lecteur
  insère désormais une virgule ;
- **les trois sortes d'en-têtes.** Un tableau de détail en a trois, et aucune
  ne se reconnaît pareil : les noms de colonnes (« Lieu | Niveau | Taux »), la
  rangée d'icônes où chaque cellule répète le nom de sa propre colonne, et le
  nom d'aire seul (« Isolarmure ») qui coiffe un groupe. Les écarter en
  exigeant un « • » dans le lieu marchait — mais jetait aussi les vraies
  lignes : Légendes Arceus écrit « Contrefort Couronné » sans sous-zone, et le
  relevé y tombait de 235 entrées à 37.

## Le calculateur de combat

`app/src/js/combat.js` porte les règles : les vingt-cinq natures, la formule des
statistiques, celle des dégâts, et les tables d'objets et de talents. Il dessine
aussi la modale de configuration — c'est le seul écran qu'il contient, et il y
est parce que l'équipe et le calculateur posent la même question : « ce Pokémon,
avec quelles statistiques ? ».

`strategie.js`, lui, ne fait que dessiner la page. Rien ne s'y calcule.

### Ce qui est pris en compte

Niveau, nature, IV, EV, **changements de statistiques (−6 à +6)**, objet tenu,
talent, STAB, efficacité, coup critique, brûlure, **météo**, **terrain**,
**coups multiples** et **attaques à dégâts fixes** (Draco-Rage, Frappe Atlas,
les K.O. en un coup…). Quatre attaques par Pokémon, une carte de résultat par
attaque : c'est la comparaison qu'on cherche vraiment. La formule est celle des
générations 5 et suivantes, tronquée à chaque étape comme le jeu le fait, et la
fourchette affichée est celle des seize jets.

Les paliers appliquent une fraction, pas un nombre à virgule : (2+n)/2 vers le
haut, 2/(2−n) vers le bas. Un −1 vaut donc **×2/3**, et non ×0,5 comme on le lit
souvent. Un coup critique ignore les paliers qui arrangeraient le défenseur —
les baisses de l'attaquant et les hausses du défenseur — et l'interface le dit
au lieu de simplement changer le chiffre.

Les tables `OBJETS` et `TALENTS_COMBAT` sont volontairement courtes : elles ne
contiennent que ce qui change un résultat. Un talent absent de la table reste
sélectionnable — il n'a simplement aucun effet, et le libellé du menu le dit en
ne portant aucune mention d'effet.

Le nombre de coups se règle à la main : la réserve des capacités ne dit pas si
une attaque en donne deux ou cinq. Un terrain ne touche que ce qui est au sol —
un type Vol ou un Lévitation y échappent, et c'est la moitié de l'intérêt de la
mécanique.

### Ce qui n'est pas pris en compte

Les talents qui dépendent des PV restants au-delà de Multiécaille, les attaques
réactives (Riposte, Voile Miroir), et les objets consommables. Les ajouter
demande un état de combat, pas seulement deux fiches.

## La reproduction

`app/src/js/reproduction.js` répond à deux questions : « avec qui puis-je faire
pondre celui-là ? » et « qui est dans le groupe Amorphe ? ». Les groupes d'œufs
viennent de la réserve (`dico.oeufs`, régénérée depuis `pokemon_egg_groups.csv`)
et appartiennent à **l'espèce**, pas à la forme : un Raichu d'Alola pond comme
un Raichu.

La règle tient en quatre lignes : le groupe **Inconnu** ne se reproduit jamais,
**Métamorph** se reproduit avec tout le reste, sinon il faut un groupe en commun
**et** un mâle avec une femelle. Deux Leveinard, tous deux femelles, ne pondront
donc jamais ensemble malgré leur groupe partagé ; un asexué n'a que Métamorph.

Le taux de genre vient de `pokemon_species.csv` (`gender_rate`, en huitièmes de
femelles). Il s'affiche sur la fiche, et un filtre dit de quel sexe est le tien
pour ne proposer que ce qui va en face.

## Les points d'effort

Tirés de la quatrième colonne de `pokemon_stats.csv` : elle était là depuis le
début, ignorée. Ils s'affichent aux deux bouts, parce que la question se pose
dans les deux sens :

- sur **la fiche** d'un Pokémon — « celui-là, il rapporte quoi ? » ;
- dans **Stratégie › Entraînement EV** — « il me faut de la Vitesse, je bats
  quoi ? ». On choisit la statistique et le nombre de points, on obtient la
  liste triée du plus généreux au moins, et un clic ouvre la fiche dont le bloc
  « Où l'obtenir » dit où le croiser.

## Les dialogues

`app/src/js/confirmer.js` remplace `confirm()`, `prompt()` et `alert()`, qui
partagent trois défauts : la boîte est dessinée par Windows et ne ressemble à
rien du reste, elle ne sait afficher que du texte — donc jamais ce qui est en
jeu — et elle se valide d'un « Entrée » réflexe. Sur une suppression de dex, le
dernier point suffisait à la disqualifier.

Trois portes d'entrée, une seule fenêtre :

| Fonction | Rend | Pour |
| --- | --- | --- |
| `demanderConfirmation(o)` | `true` / `false` | une action à confirmer |
| `demanderSaisie(o)` | le texte, ou `null` | un nom à saisir |
| `prevenir(o)` | `true` | une nouvelle à annoncer |
| `prevenirErreur(titre, note)` | `true` | le raccourci : une opération ratée |

Toutes sont des promesses : `if(!await demanderConfirmation({…})) return;`.

Ce qu'on peut mettre dans une fenêtre : un `resume` chiffré (« 152 capturés »
arrête la main, « ton Pokédex » ne l'arrête pas), une liste de `pertes`, une
`note`, et un `genre` (`danger` ou `succes`) qui colore le titre et le bouton.

Deux garde-fous, à ne pas confondre :

- `motAEcrire` demande de recopier un nom, et garde le bouton fermé tant qu'il
  n'est pas exact — casse et espaces tolérés, c'est une confirmation, pas une
  dictée. Réservé à ce qui ne se récupère pas : supprimer une aventure, vider un
  dex, abandonner une chasse de plus de cinq cents rencontres.
- `valider(v)` est la règle d'une saisie, vérifiée **pendant la frappe** :
  découvrir un refus après avoir validé, c'est refaire la saisie pour rien.

Quand le serveur nettoie ce qu'on lui envoie, `apercu(v)` dit ce que la valeur
va devenir plutôt que de la refuser. Le pseudo en dépend : l'API rogne les
soulignés des extrémités avant de valider, donc `Tennosei_` lui convient — une
règle client plus stricte que la sienne bloquait le dresseur sur son propre nom,
sans lui dire pourquoi. La règle de `changerMonPseudo()` recopie donc
`nettoyerPseudo()` de `api/src/comptes.js` à la lettre : **les deux se
modifient ensemble.**

Trois demandes sont partagées, dans `compte.js`, parce qu'elles se déclenchent
chacune depuis deux écrans — la page « Profil » et la modale « Mes aventures » :
`confirmerSuppression()`, `confirmerVidage()` et `demanderNouveauNom()`. Un texte
en double aurait dérivé, et c'est exactement ce qui était arrivé : le refus de
supprimer la dernière aventure n'existait que sur la page Profil, si bien que par
la modale on faisait recopier le nom avant de se prendre le 409 du serveur. Le
garde-fou vit maintenant dans `confirmerSuppression()`, donc aux deux endroits.

Échap et le clic à côté renoncent — pour une suppression, le refus doit rester
le geste le plus facile. Sans la fenêtre dans le HTML (les pages de génération,
par exemple), les trois fonctions retombent sur les boîtes du système plutôt que
de ne rien demander du tout.

## Les allers-retours au serveur

L'API est distante : chaque appel coûte un aller-retour réel, et deux fonctions
qui se suivent en demandaient facilement deux fois la même chose. Trois règles
évitent ça, sans jamais mettre de données en cache — le dex et le journal
changent dès qu'on coche un Pokémon, et servir une copie périmée serait pire
qu'un appel de plus.

- **`chargerProfil(dejaAJour)`** saute sa lecture de la liste quand l'appelant
  vient de la faire pour son propre compte.
- **`agirSurProfil(promesse)`** accepte que l'action lui rende la liste qu'elle
  a déjà lue : si la promesse résout sur un tableau, il ne relit pas. La
  suppression s'en sert — elle doit de toute façon lire la liste pour savoir sur
  quelle aventure retomber.
- **`lireHistorique(id, avant)`** partage la requête *encore en vol*. L'accueil
  veut les six dernières captures, la page Profil le journal entier : c'est le
  même appel. Une fois la réponse rendue, la promesse est oubliée et la lecture
  suivante repart au serveur.

Il y a aussi un garde-fou plus ancien, dans `dex.js` : `updateHome()` n'est
appelé que si l'accueil est la page visible. Inutile de recalculer ses barres —
et de recharger son journal — pendant qu'on est ailleurs.

Une suppression d'aventure coûte aujourd'hui **quatre appels** — supprimer,
relire la liste, charger le dex de l'aventure suivante, charger son journal —
contre six avant, quel que soit l'écran d'où on la déclenche.

## Le périmètre de Pokémon HOME

La collection HOME ne montre que ce qui se range dans une boîte. Les **formes de
combat** en sont exclues — Méga-Évolutions, Primo-Résurgences et Eternamax, mais
aussi les Gigamax, les Totem et les états qui ne durent qu'un combat (Mode
Transe, Palafin Héros, Terapagos Terastal) : HOME range le Pokémon, pas ce qu'il
devient le temps d'un tour. Cela fait **206 entrées** écartées sur les 1351 de la
réserve, et 45 de plus parmi les formes supplémentaires.

Ce qui reste dépend ensuite du niveau de formes de l'aventure : **1 281 entrées**
au niveau 3, celui par défaut. Le tableau de la section suivante donne les
quatre.

Elles ne disparaissent pas de la réserve pour autant, et c'est voulu : le
Pokédex de **Légendes Z-A** les affiche. Il ne leur donne pas de numéro à
elles — une Méga garde celui de sa forme de base, et les 232 entrées d'Illumis
se comptent sans elles — mais elles occupent bien une ligne à l'écran. Les
retirer de `allEntries` creuserait donc des trous dans un Pokédex réel.

La coupure se fait donc au périmètre, pas à la source :

- `poolEntries()` — la réserve entière. Ce que lisent les scopes de jeu.
- `poolHome()` — la même, moins ce qui ne se range pas dans une boîte, et
  coupée au niveau de formes de l'aventure. Ce que lisent la collection HOME,
  ses totaux et ses barres par génération.

### Les quatre niveaux de formes

Le sélecteur 🧬 de la barre de filtres décide jusqu'où l'on compte les formes
d'une même espèce. Les niveaux sont emboîtés : chacun contient le précédent.

| Niveau | Entrées | Relevé | Ce que ça ajoute |
| --- | --- | --- | --- |
| 1 · Une forme par espèce | **1 025** | 1 025 | un seul Météno |
| 2 · Avec les régionales | **1 082** | 1 082 | Alola, Galar, Hisui, Paldea |
| 3 · Avec les alternatives | 1 281 | 1 280 | noyaux de Météno, lettres de Zarbi, motifs de Prismillon, parfums de Charmilly… |
| 4 · Avec mâle / femelle | 1 383 | 1 384 | les espèces dont la femelle se distingue à l'œil |

Les deux premiers niveaux tombent **exactement** sur le relevé. Les deux autres
s'en écartent d'une entrée : le Farfuret de Hisui ♀ manque, PokeAPI ne le
modélisant pas comme une forme distincte, et une variante féminine est classée
en « alternative » plutôt qu'en « genre ». Le banc tolère un écart d'une entrée
et échouerait s'il grandissait — c'est là que se verrait une règle qui bouge.

Le **niveau 1 tombe exactement sur les 1 025 espèces du relevé Pokékalos** — le
banc le vérifie à chaque passage, et c'est le meilleur signe que le classement
est juste.

Le **niveau 3 est le défaut**. Aucun niveau n'a besoin du réseau : les formes
supplémentaires viennent de la réserve embarquée, `cacheLire('formes')` tombant
sur `DONNEES_EMBARQUEES.formes`.

### Le niveau appartient à l'aventure

Il est enregistré dans `pa_profils.niveau_formes`, pas dans le navigateur. Ce
n'est pas un détail de rangement : **le total de la barre de comparaison se
calcule sur ton périmètre**. Quand le réglage vivait dans `localStorage`, passer
du niveau 3 au niveau 1 faisait chuter le score de ton copain sans que rien
n'ait bougé chez lui.

Trois conséquences :

- ouvrir une aventure applique **son** niveau, avant le premier dessin de la
  grille — c'est `appliquerNiveauFormes()`, appelée depuis `ouvrirProfil()` ;
- changer de niveau l'écrit sur l'aventure ouverte. L'enregistrement est
  silencieux à dessein : c'est un réglage d'affichage, et faire échouer
  bruyamment quelqu'un qui regarde sa collection autrement serait pénible. Il
  repartira au prochain changement ;
- quand deux dresseurs se comparent à des niveaux différents, la barre le dit :
  « Vous ne comptez pas les mêmes formes ». Le même avertissement existait déjà
  pour les modes de dex, à côté.

`localStorage` garde encore le dernier niveau connu de la machine, mais comme
simple pis-aller : il sert le temps que la session Discord s'ouvre, et dès
qu'une aventure est là, c'est elle qui décide.

`allFormsMode`, que lisent les Pokédex de jeux pour choisir entre une carte par
espèce et toutes les formes, vaut simplement « niveau ≥ 4 ». Les scopes de jeu
se comportent donc exactement comme avant ce réglage.

Le sélecteur ne rend pas stockable ce qui ne l'est pas : quel que soit le
niveau, les formes de combat restent hors de HOME.

Sa largeur est fixée à `15rem` plutôt que laissée au texte. Les quatre libellés
n'ont pas la même longueur — et le compte affiché varie — si bien qu'il sautait
d'une vingtaine de pixels à chaque changement de niveau. Il ne s'étire pas non
plus comme les menus de la barre des filtres : ceux-là sont quatre à se partager
une ligne, celui-ci est seul entre deux boutons.

Deux prédicats se ressemblent sans se recouvrir, et il ne faut pas les fusionner :
`estFormeDeCombat()` (donnees.js) décide du périmètre HOME ; `isMegaLike()`
(formes.js) sert aux scopes de jeu, range Arceus avec les Méga et ignore Primal
et Eternamax.

## Les sprites d'époque

Par défaut, les cartes portent les **rendus Pokémon HOME** : une seule facture
graphique pour les 1 351 entrées, chromatiques comprises. Sur le Pokédex d'un
jeu, le bouton **🕹️ Sprites du jeu** les remplace par ceux de la version — les
Pokémon de Rubis/Saphir avec leurs sprites de Game Boy Advance.

Les images viennent de **Pokémon Showdown**, qui héberge un jeu de sprites par
génération. C'est déjà le quatrième repli de la chaîne d'images : rien à
télécharger, rien à ajouter au CSP, et le nom de fichier se calcule avec
`toShowdownSlug()` comme le reste.

| Jeu | Normal | Chromatique |
| --- | --- | --- |
| Rouge / Bleu · Jaune | `gen1rb` · `gen1` | — |
| Or / Argent · Cristal | `gen2g` · `gen2` | `gen2-shiny` |
| Rubis / Saphir · Émeraude · RF/VF | `gen3rs` · `gen3` · `gen3frlg` | `gen3-shiny` |
| Diamant / Perle · Platine · HGSS | `gen4` | `gen4-shiny` |
| Noire / Blanche · Noire 2 / Blanche 2 | `gen5` | `gen5-shiny` |

Trois limites tiennent à la source, pas au code, et le banc les surveille :

- **la première génération n'a pas de chromatiques.** Sur Rouge/Bleu et Jaune,
  la vue shiny rend le sprite normal plutôt qu'une adresse qui n'existe pas ;
- **à partir de X/Y, il n'y a plus de sprite 2D.** Le bouton disparaît au lieu
  de proposer une bascule sans effet — comme il disparaît sur Pokémon HOME, qui
  n'est pas un jeu ;
- **une espèce peut manquer à sa génération.** Un Pokémon de la cinquième n'a
  pas de sprite Rubis/Saphir : l'erreur de chargement ramène à la chaîne
  habituelle — rendu HOME, artwork, Showdown — qui n'a pas changé d'un
  caractère.

## Les logos de type

`app/src/types/` contient une image par type, nommée d'après le type en
minuscules sans accent : `normal.png`, `electrik.png`, `tenebres.png`, `fee.png`…
Toutes font **200 × 44**, et l'application les affiche à la moitié — une seule
taille partout : fiche, faiblesses, tableau des attaques, page Stratégie.

Tout passe par `puceType()`, dans `fiche.js`. C'est la seule fabrique de puces :
changer la taille se fait à un endroit, dans la règle `.type-img` de `dex.css`.

Un logo manquant ne casse rien — l'image bascule sur la pastille colorée d'avant,
qui occupe exactement le même encombrement pour que la ligne ne saute pas. Pour
remplacer un logo, il suffit donc d'écraser le fichier ; pour en changer tous,
de vider le dossier et d'y remettre les dix-huit.

## Le Cadeau Mystère

Les fabuleux et les formes évènementielles ne s'obtiennent que par
distribution. `app/src/js/evenements.js` dit, pour chacun, **quand la France
l'a eu** : l'évènement, ses dates, les jeux concernés, la méthode.

Ce fichier s'écrit à la main, contrairement aux deux réserves générées. Il tient
en trente-quatre entrées et soixante-dix distributions — inutile d'outiller ça.

### La règle

La source est l'[Evendex de Pokébip](https://www.pokebip.com/page/jeux-video/evendex/accueil),
et plus précisément ses pages **« Distributions ayant eu lieu en France »**, une
par génération. Pas le catalogue mondial : un Zeraora distribué au Japon n'a
jamais aidé personne ici, et l'afficher ferait espérer une piste qui n'existe
pas.

Deux exclusions volontaires :

- **les Pokémon de tournoi** (Worlds, VGC). Réservés aux participants, ils
  noieraient les vraies distributions sous des Dracaufeu de compétition ;
- **les espèces ordinaires distribuées en évènement.** La page répond à « qu'est-ce
  qui NE s'obtient QUE par distribution ? ». Un Pikachu se capture partout ; sa
  casquette de Kalos, jamais.

Une entrée sans distribution française n'a **aucune ligne** dans le fichier, et
l'application l'écrit noir sur blanc : « aucune distribution française
recensée ». C'est le cas de Marshadow. Ne jamais combler ce vide par un
évènement étranger — l'absence est elle-même l'information que le dresseur
cherche.

### Ajouter une distribution

Une ligne dans `DISTRIBUTIONS_FR`, sous le numéro national du fabuleux ou
l'identifiant PokeAPI de la forme :

```js
  719: [
    { ev:"Diancie Automne 2014", quand:"23 octobre 2014 – 25 février 2015",
      annee:2014, jeux:"X · Y", voie:"code" }
  ],
```

`voie` doit exister dans `VOIES` — c'est elle qui alimente le filtre par
méthode. `permanent:true` pour ce qui est encore ouvert aujourd'hui (le QR Code
de Magearna), `jamais:true` pour ce qui n'a jamais été distribué (la Flûte Azur
d'Arceus), `chromatique:true` pour un shiny.

Les libellés de `FORMES_EVENEMENT`, dans `cadeaux.js`, disent ce qu'**est** une
forme et jamais quand elle est passée : les dates vivent ici, et les écrire aux
deux endroits les fait diverger. C'est déjà arrivé — la casquette partenaire y
était datée de 2019, alors que la France l'a eue en 2017 puis en 2020.

## Le cache local

`cache.js` garde les listes de référence dans `localStorage` pour que
l'application démarre sans réseau. Un seul mécanisme décide quand les jeter :
la réserve embarquée porte sa date de génération (`genereLe`), et
`purgerSiReserveePlusRecente()` la compare à ce que le stockage a déjà vu. Si
elles diffèrent, tout part.

Une regénération se propage donc **d'elle-même** : `py outils/generer.js` change
la date, la date déclenche la purge, et personne n'a rien à penser.

La clé portait autrefois un numéro de version à incrémenter à la main. Il
faisait double emploi et a été retiré. Ce qu'il couvrait en propre — changer la
**forme** des données sans toucher à la réserve — se règle en regénérant celle-ci,
ce qui remet la date à jour. Le cas est rare : forme et contenu bougent ensemble
en pratique.

## Se relire, et se vérifier

Deux outils, aucune dépendance, rien à installer.

```
cd app
py outils/verifier.py     # relecture statique, deux secondes
py outils/banc.py         # l'application tourne et se vérifie
```

**`verifier.py`** lit les fichiers sans rien lancer. Il attrape trois choses :
un `getElementById` qui vise un identifiant absent du HTML, un appel à une
fonction qui n'existe nulle part, et du code mort. Il sort en erreur sur les
deux premières — celles-là cassent vraiment ; le code mort n'est qu'un rapport.

Il relit **quatre groupes**, parce qu'un fichier ne se juge que dans la page qui
le charge :

| Groupe | Ce qu'il relit | Ce qui s'y vérifie |
| --- | --- | --- |
| l'interface | `index.html` et ses vingt scripts | tout |
| l'API | `api/src/*.js` | les appels, le code mort |
| les pages de génération | `generer-donnees.html`, `generer-attaques.html` | les identifiants, les appels |
| le banc | `banc-verifications.js`, sur la page que sert `banc.py` | les identifiants, les appels |

L'API n'a pas de page : ni identifiant ni élément du DOM à y relire. Restent les
appels — et les noms qu'un module importe d'un autre y comptent comme déclarés,
sans quoi `creerSchema()` passerait pour introuvable dans `serveur.js`.

Les pages de génération, elles, portent tout le HTML de l'application mais ne
chargent ni `compte.js` ni `app.js`. Les six appels qui visent ces deux-là
sortent dans une liste à part — « appels à une fonction que la page ne charge
pas », qui dit pour chacun où la fonction vit. Ils ne cassent que si la page
emprunte ce chemin, et ne font donc pas échouer la relecture ; une faute de
frappe, elle, reste dans les introuvables et fait sortir en erreur.

Le banc se relit sur la page que `banc.py` sert vraiment, injections comprises :
`banc-verifications.js` n'appelle que des fonctions de l'application, et le lire
seul ferait passer chacun de ses appels pour manquant.

Il neutralise les commentaires et les chaînes avant de chercher, sans quoi « la
purification (voir plus bas) » d'un commentaire français passe pour un appel à
`purification()`. Il connaît aussi les paramètres de fonction : sans eux, le
`tenir`/`rejeter` d'une promesse ressemblait à deux fonctions manquantes.

**`banc.py`** sert `app/src` sur le port 8125 avec le pont Tauri remplacé par
des réponses en dur. Aucune connexion Discord, aucune écriture en base : on peut
supprimer, vider et renommer sans qu'une seule requête parte. Le rapport
s'affiche en haut de la page.

Pourquoi un banc plutôt que des tests unitaires : l'interface est faite de
scripts classiques qui se parlent par des variables globales, sans modules ni
exports. Il n'y a rien à importer isolément — le seul endroit où le câblage
existe vraiment, c'est la page chargée.

Les vérifications sont dans `outils/banc-verifications.js`, et la règle pour en
ajouter une est simple : **un bug est passé, on écrit ce qui l'aurait arrêté.**
Pas de tests écrits au cas où — ils vieillissent mal et personne ne les relit.
Chaque entrée porte donc le nom du problème réel qu'elle surveille.

### Ce que les deux dernières entrées surveillent

La première tient à une seule cause : **une fonction appelée depuis une page qui
ne la charge pas.** Les pages de génération rejouent l'interface sans `compte.js`
ni `app.js` — ni session à tenir, ni pont Tauri à nourrir. Six appels visent
pourtant ces deux fichiers ; `verifier.py` les liste, et le banc les retire tous
les six avant de rejouer les chemins qui y mènent. Deux cassaient vraiment :

- `gotoDex()` appelait `setShinyView()` à nu, alors qu'il vit dans `app.js`.
  Le garde tient maintenant dans `vueShiny()`, posé une fois pour trois appels ;
- `dessinerChasses()` appelait `depuisQuand()`, resté dans `compte.js` par
  accident d'écriture alors qu'il ne calcule qu'une date. Il a déménagé dans
  `noyau.js`, que tout le monde charge : le trou est supprimé plutôt
  qu'emballé dans un garde, et une chasse datée ne casse plus la liste.

Deux chemins doivent être forcés pour être vus, et c'est le genre de détail qui
décide si une vérification sert : la chasse est **datée**, sans quoi la ligne
« commencée … » n'appelle rien ; et le sélecteur 🧬 est le seul chemin
asynchrone, donc ce qu'il casse part en rejet non capturé — le banc écoute
`unhandledrejection` le temps du passage, un `try` ne suffirait pas.

La seconde entrée est née de la première. En vérifiant que `vueShiny()` ne
changeait rien au comportement, on a découvert que **les trois raccourcis de
l'accueil ne faisaient rien** : `gotoDex()` posait le filtre, puis appelait
`showPage()`, qui remet les filtres à zéro dès qu'on change de Pokédex — et on
en change à tous les coups, puisqu'on arrive de l'accueil. « ✨ Ma chasse
shiny » ouvrait le Dex entier, en vue normale, sans un mot. L'ouverture passe
donc avant le préréglage, et la grille se redessine après lui.

### La contre-épreuve des Pokédex de jeux

`src/js/donnees-pokedex.js` porte **onze relevés Pokékalos**, un par Pokédex de
jeu récent, et joue pour les Pokédex ce que `donnees-home.js` joue pour le
périmètre HOME : une source indépendante de PokeAPI, contre laquelle le banc
mesure la réserve embarquée. Une régénération qui perdrait des entrées — ou en
inventerait — se verrait au passage suivant.

```
cd app
py outils/relever-pokedex.py     → refait le relevé depuis les onze pages
```

L'outil compare ce qu'il obtient au compte attendu et **sort en erreur** si une
page ne le rend plus : une page remaniée se signale ainsi tout de suite, au lieu
d'écrire un faux relevé sans rien dire.

Le relevé retient les **noms français**, pas les numéros, parce que les pages ne
numérotent pas de la même façon : la plupart donnent le numéro propre au Pokédex
(#001 Germignon pour Illumis), le Disque Indigo donne le numéro national (#0084
Doduo). Le banc ramène ensuite chaque nom à son espèce, et c'est là que se
cachent trois pièges — tous rencontrés en l'écrivant :

- **♀ et ♂ portent l'espèce.** Les effacer confond les deux Nidoran, et le
  relevé national retombait alors sur 492 espèces pour 493 noms ;
- **la forme de base porte parfois un qualificatif**, des deux côtés :
  « Mistigrix (Mâle) » dans la réserve, « Lougaroc forme Nocturne » au relevé ;
- **l'exclusivité de version est collée au nom** : « Capumain Violet ».

Sur les dix Pokédex comparés, **huit tombent au Pokémon près**. Les deux écarts
sont connus, et le banc échouerait si un troisième apparaissait :

| Pokédex | Écart | Pourquoi |
| --- | --- | --- |
| Disque Indigo | +17 | le relevé ne donne pas de ligne aux formes régionales — « Ramoloss de Galar » n'y figure que dans les quêtes, et « Alola » pas une seule fois. PokeAPI les compte |
| Sinnoh (BDSP) | +1 | Manaphy, qui ne s'obtient pas dans le jeu, n'a pas de ligne au relevé. Le Pokédex du jeu, lui, le compte |

L'écart va toujours dans le même sens — l'application en a plus, jamais moins —
et c'est le bon sens pour un outil de suivi : mieux vaut une case à cocher de
trop qu'une case absente.

Un Pokédex reste sans contre-épreuve : le « Pokédex régional d'Alola »
d'Ultra-Soleil / Ultra-Lune, dont la page ne contient qu'un tableau de 37 lignes
finissant par « #??? » — un article de pré-sortie jamais complété. `updated-alola`
et ses 403 entrées ne sont donc vérifiés par rien.

Deux détails qui ont failli le rendre inutile, et qui sont réglés :

- il sert chaque script avec une empreinte différente (`?v=…`). Les en-têtes
  `no-store` ne suffisent pas — le navigateur garde les scripts en mémoire de
  page. Sans ça le banc validait un code qui n'était plus sur le disque, ce qui
  est pire que pas de banc du tout ;
- `outils/verifier.py` force sa sortie en UTF-8 : la console Windows est en
  cp1252 et plantait sur une flèche.

Les deux ont été éprouvés en leur plantant de vraies fautes : le vérificateur
retrouve un appel inventé dans l'API, un autre dans un outil de génération et un
identifiant inventé dans le banc — trois groupes, trois prises, une sortie en
erreur ; le banc, lui, retrouve les 251 entrées indéposables si l'on désarme
`poolHome()`.

La dernière entrée a été éprouvée de la même façon, en lui remettant l'ancien
ordre le temps d'un passage : elle échoue sur « Mes manquants » et « Ma chasse
shiny », et pas sur « Ouvrir le Pokédex » — dont le filtre est justement celui
que la remise à zéro produit. Il n'y avait rien à y voir : les deux boutons qui
promettaient quelque chose sont les deux qui échouaient.

## Lancer en développement

```
cd api
npm install
npm start          → http://127.0.0.1:8787
```

```
cd app
cargo tauri dev
```

## Construire l'installeur

```
cd app
cargo tauri build
```

Le résultat sort dans
`app/src-tauri/target/release/bundle/nsis/PokéArchive_0.1.0_x64-setup.exe`.

> **Avant de distribuer**, l'application doit pointer vers une API publique et
> non vers `127.0.0.1`. L'adresse est fixée à la compilation :
>
> ```
> set POKEARCHIVE_API=https://api.ton-domaine.fr
> cargo tauri build
> ```
>
> Sans cela, l'application de tes amis cherchera l'API sur *leur* machine.

## Publier une version

Le dépôt est <https://github.com/Tennosei5804/PokeArchive>. Livrer une version
tient en trois gestes, et le dernier est le seul qui compte :

```
# 1. monter le numéro AUX DEUX ENDROITS — ils doivent rester d'accord
#    app/src-tauri/tauri.conf.json   "version": "0.2.0"
#    app/src-tauri/Cargo.toml        version = "0.2.0"

# 2. commiter
git commit -am "Version 0.2.0"

# 3. poser le tag : c'est lui qui déclenche tout
git tag v0.2.0
git push origin main --tags
```

`.github/workflows/publier.yml` prend le relais : un runner Windows compile,
signe l'installeur, et crée la Release **en brouillon** avec l'installeur et le
`latest.json`. Le brouillon est délibéré — on relit les notes et on vérifie que
l'installeur se lance avant de publier. **Les mises à jour ne partent qu'une
fois la Release publiée.**

Les deux numéros de version doivent monter ensemble. S'ils divergent,
l'application compare le mauvais au numéro de la Release et se croit à jour :
la mise à jour ne part jamais, et rien ne le signale.

### La clé de signature

L'application n'installe **que** ce qui est signé avec notre clé privée. Sans
cela, quiconque peut intercepter le téléchargement peut livrer son propre
programme — et il serait installé sans un mot.

| | |
|---|---|
| clé publique | dans `tauri.conf.json`, `plugins.updater.pubkey`. Elle se versionne, c'est son rôle |
| clé privée | `~/.tauri/pokearchive.key`, **hors du dépôt**, plus une copie dans les secrets GitHub |

Le dépôt a besoin d'**un seul secret**, dans *Settings → Secrets and
variables → Actions* :

| Nom du secret | Valeur |
|---|---|
| `TAURI_SIGNING_PRIVATE_KEY` | le contenu entier de `~/.tauri/pokearchive.key` |

Le workflow lit aussi `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`, mais **il ne faut
pas le créer** : un secret absent se résout en chaîne vide, et la clé a été
générée sans mot de passe. C'est exactement ce qu'attend le signataire.

> **Perdre la clé privée coûte cher.** Sans elle, aucune version future ne peut
> être signée, donc plus aucune mise à jour n'atteint les gens déjà installés :
> il faudrait leur faire réinstaller à la main. Elle n'est nulle part ailleurs
> que dans `~/.tauri/` et dans les secrets du dépôt — gardez-en une copie.

### Ce que voit l'utilisateur

`app/src/js/maj.js` interroge GitHub quatre secondes après le lancement, en
silence. S'il n'y a rien, ou si la machine est hors ligne, rien ne se passe et
rien ne s'affiche — une vérification que personne n'a demandée n'a pas à
produire un message d'erreur.

Quand une version existe, un bouton doré apparaît dans l'en-tête. Il ouvre un
dialogue qui montre les deux numéros et les notes de version ; l'installation ne
commence qu'après un oui, et le bouton affiche la progression réelle du
téléchargement. Rien ne s'installe dans le dos de qui que ce soit : une
application qui se met à jour toute seule redémarre au mauvais moment, et il n'y
a aucune urgence à corriger un Pokédex.

## La connexion Discord

Sur <https://discord.com/developers/applications>, onglet **OAuth2 > Redirects**,
déclare l'adresse de retour **au caractère près** :

- en développement : `http://127.0.0.1:8787/auth/discord/retour`
- en ligne : `https://api.ton-domaine.fr/auth/discord/retour`

Discord accepte plusieurs redirections : garde les deux.

Le parcours suit ce qui est prévu pour les applications de bureau : l'app ouvre
une écoute éphémère sur un port entre 8730 et 8749, envoie le navigateur chez
l'API, et celle-ci lui renvoie le jeton une fois Discord passé.

Trois détails qui coûtent cher si on les défait :

- **L'API exige un `User-Agent`.** L'API Discord est derrière Cloudflare, qui
  rejette les clients sans en-tête identifiable par un `403` au corps vide
  (« error code: 1010 ») — une réponse qui ne ressemble en rien à une erreur
  d'authentification, et qui fait chercher au mauvais endroit pendant une heure.
- **Le `state` est vérifié au retour.** Sans cette comparaison, un site tiers
  pourrait déclencher une connexion à l'insu du joueur.
- **Le port de retour est validé** contre la plage 8730–8749. Sans cette borne,
  un lien forgé ferait rediriger un jeton vers n'importe quel service tournant
  sur la machine du joueur.

## La base

L'utilisateur MySQL actuel n'a de droits que sur `s4_tenno_test`, une base qui
héberge déjà autre chose. Les tables de PokéArchive sont donc **préfixées
`pa_`** pour cohabiter sans se marcher dessus :

| Table | Contenu |
|---|---|
| `pa_dresseurs` | identité Discord, pseudo, avatar |
| `pa_sessions` | les connexions ouvertes |
| `pa_profils` | les aventures, et **ce que chacune compte** |
| `pa_dex` | la progression de chacune |

### Ce que compte une aventure

Deux colonnes le déterminent, et **les deux appartiennent à l'aventure** :
`mode` dit ce qu'on coche, `niveau_formes` dit combien de cases il y a.

`pa_profils.mode` vaut `capture`, `vu` ou `living`, et se choisit à la création :

- **Pokédex** — capturer chaque Pokémon. Faire évoluer un Bulbizarre enregistre
  les trois stades : une capture en remplit trois cases ;
- **Pokémon vus** — les avoir croisés, rien de plus ;
- **Living Dex** — les posséder tous *en même temps*. Faire évoluer son
  Bulbizarre ne laisse plus de Bulbizarre.

`pa_profils.niveau_formes` vaut 1 à 4 et se règle depuis la barre du Pokédex,
pas à la création : on ne fait pas choisir avant d'avoir vu. Voir « Le niveau
appartient à l'aventure » plus haut.

Le mode ne change pas ce qu'on enregistre — c'est la même liste de noms — mais
il change ce que cocher **veut dire**, et le vocabulaire suit : la case d'une
carte affiche « Capturé », « Vu » ou « En boîte », et le filtre du Pokédex avec
elle. Écrire « Capturé » à quelqu'un qui tient un dex de rencontres est faux ;
« En boîte » à quelqu'un qui a fait évoluer son Bulbizarre l'est tout autant.

Le vocabulaire vit dans `MODES_DEX`, au même endroit que les types et les
statistiques (`donnees.js`) : la grille en a besoin, et `compte.js` n'est pas
chargé par les pages de génération. Le pluriel s'y déclare au lieu de s'ajouter
— « en boîtes » ne se dit pas.

Il change aussi ce que le total signifie. L'accueil chiffre l'écart : **1025 espèces
pour 541 lignées**, donc 484 entrées qu'un Pokédex ordinaire obtient sans
capture supplémentaire, et qu'un Living Dex réclame une par une. Et la barre de
comparaison prévient quand deux dresseurs ne comptent pas la même chose.

La colonne s'ajoute au démarrage (`migrerModeProfil`) : `CREATE TABLE IF NOT
EXISTS` ne touche pas une table existante, et les aventures déjà créées
deviennent des Pokédex de capture, ce qu'elles étaient de fait.

Le jour où tu obtiens une base dédiée, le préfixe peut sauter.

Aucun mot de passe n'est stocké. Les jetons de session non plus : la base n'en
garde qu'un condensé SHA-256, le jeton en clair n'existe que dans
`session.json`, dans le dossier de configuration de l'application.

## Ce qui reste à faire

Rien de tout cela n'est du code : les trois se règlent ailleurs que dans le
dépôt.

- [ ] déclarer `http://127.0.0.1:8787/auth/discord/retour` dans le portail Discord ;
- [ ] renommer l'application Discord en « PokéArchive » (elle s'appelle encore
      « LivingDex », et c'est ce nom que voient tes amis) ;
- [ ] héberger l'API quelque part de joignable en permanence.

### Fait depuis

- [x] **le relevé des lieux refait sur Poképédia**, source unique, après deux
      migrations dans la même journée — Pokékalos, puis Pokébip, puis
      Poképédia. Les deux premiers ont été abandonnés parce que chacun de leurs
      désaccords s'est tranché en faveur du troisième. L'outil passe de 2 618
      lignes à 430, la table de 45 corrections manuelles disparaît, et le
      relevé gagne la sous-zone, le niveau, le taux, la version séparée, la
      forme, l'heure, la météo et la saison ;
- [x] **les dialogues de l'application**, à la place des boîtes de Windows : les
      dix-sept `confirm()`, `prompt()` et `alert()` passent par `confirmer.js`. Les
      suppressions montrent ce qu'elles emportent et demandent qu'on recopie le
      nom ; les saisies vérifient leur règle pendant la frappe ; et les trois
      demandes qui servaient à deux écrans sont partagées, ce qui a rattrapé un
      garde-fou manquant sur la modale des aventures ;
- [x] **la grille du dex**, reprise de l'ancien projet. La modale de pseudo est
      tombée avec elle : l'identité vient de Discord, il n'y a plus de profil à
      choisir au lancement ;
- [x] **la comparaison entre dresseurs**, à deux entrées — la page
      « Dresseurs », qui mène chez quelqu'un puis dans l'une de ses aventures
      publiques, et le bouton « 👥 Comparer » du Pokédex, qui prend l'aventure
      principale. Les deux passent par `GET /api/dex/:pseudo` et rendent la main
      à `partage.js`, qui pose le témoin des cartes, les deux filtres
      supplémentaires et la barre de résumé.
