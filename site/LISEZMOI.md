# Le site PokéArchive

La même application, dans un navigateur.

```
cd site && py outils/servir.py
```

Le site s'assemble, s'ouvre sur <http://127.0.0.1:8130>, et c'est tout.

---

## Ce que c'est, et ce que ce n'est pas

C'est **le frontend de l'application de bureau**, servi par un navigateur. Pas
une réécriture, pas un second client : les mêmes trente-sept scripts, les
mêmes feuilles de style, les mêmes réserves de données.

Ce qui a été écrit ici tient en deux fichiers.

| | |
|---|---|
| `source/pont.js` | remplace Tauri par le navigateur |
| `source/site.css` | ce qui ne vaut que sur le web |

**Rien n'est envoyé nulle part.** Tout ce qu'on coche vit dans le
`localStorage` de ce navigateur. Vider les données du site efface la
collection, et il n'existe aucune copie ailleurs. Le bandeau en haut de page le
dit, pour que personne ne l'apprenne le jour où il change d'ordinateur.

## Pourquoi il n'y a qu'une source

Le frontend de PokéArchive est déjà du web ordinaire. Sur ses trente-sept
scripts, **cinq seulement** nomment `window.__TAURI__`, et quatre d'entre eux
vérifient sa présence avant de s'en servir — ils se taisent proprement quand il manque.
Le seul vrai point de contact est `invoke()`, trente-huit commandes.

Recopier `app/src` dans `site/` en aurait fait un second client à maintenir, et
deux clients divergent toujours : le jour où l'un gagne un onglet, l'autre
l'ignore, et personne ne s'en aperçoit avant des semaines.

`outils/assembler.py` **assemble** donc à la demande :

```
site/public/     ←  app/src/  +  site/source/
```

`public/` est jetable, dans le `.gitignore`, et se refait en une commande. Ne
jamais y toucher à la main : l'assemblage suivant écrase tout. Il est effacé au
début plutôt que mis à jour, sans quoi un fichier retiré de `app/src` y
resterait pour toujours.

`servir.py` réassemble avant de servir, toujours. Un site servi depuis un
`public/` périmé montre du code qui n'est plus sur le disque, et l'on cherche
dix minutes pourquoi une correction « ne prend pas ».

## Le pont

`source/pont.js` pose `window.__TAURI__` avant tous les autres scripts —
`compte.js` le cherche dès son exécution et arrête l'application s'il manque.

Il n'expose que `core.invoke`. C'est voulu : `maj.js` et `presence.js`
vérifient `.updater`, `.app` et `.process` avant de s'en servir. Un site web n'a
ni mise à jour à installer ni processus à fermer, et ils se taisent d'eux-mêmes.

Les trente-huit commandes rendent **les formes de l'API**, reprises de
`api/src/serveur.js` — pas des approximations. Une forme approchée casserait
l'application à l'endroit le moins prévisible.

### Ce qui marche

Le Pokédex complet : parcourir, filtrer, cocher normal et chromatique, sur les
vingt-trois jeux. Les aventures, avec leur mode et leur niveau de formes. Les
lieux, la stratégie, la reproduction, les fiches — tout ce qui ne demande
personne d'autre.

Le **journal se date tout seul**. À chaque enregistrement, le pont compare
l'ancien dex au nouveau et date les ajouts — mot pour mot ce que fait `nouveautes()`
côté serveur. C'est ce qui fait marcher la rétrospective et les succès ici
aussi. Décocher n'est pas journalisé : c'est une correction, pas un événement.

### Le site s'installe et s'ouvre hors ligne

`assembler.py` écrit un manifeste, quatre icônes et un service worker. La
coquille — `index.html`, les feuilles, les scripts du premier chargement, les
polices, les bannières — est mise en cache à l'installation ; les quatre
réserves à la demande y entrent à leur premier usage. La liste se **lit** dans
la page qu'on vient d'écrire : un script ajouté à `index.html` y entre sans que
personne n'ait à y penser.

La version du cache est celle des fichiers, jamais un numéro tenu à la main.

### Ce qui ne marche pas encore

Le classement, les amis, la visite d'un dresseur. Tout cela suppose d'autres
joueurs, donc une base commune. Hors ligne, les listes sont **vides** plutôt que
peuplées de gens inventés — un classement imaginaire serait une tromperie, un
écran vide se comprend.

Il n'y a pas non plus de connexion Discord : on ouvre un compte **local**, dont
le nom ne sert qu'à l'affichage.

### Le jour où l'API sera joignable

Deux obstacles, tous deux côté serveur :

- **l'API n'ouvre pas le CORS.** Un site sur un autre domaine ne peut pas
  l'appeler ; le navigateur bloque avant même la requête ;
- **la connexion Discord est bâtie pour le bureau.** Elle renvoie vers un port
  ouvert sur la machine du joueur. Sans ce port, le serveur affiche « Aucune
  application n'attendait cette connexion ».

Servir le site depuis le même domaine que l'API supprime le premier obstacle
d'un coup. Le second demande un vrai second chemin de session.

Côté site, il n'y a **qu'un endroit** à changer : la fonction `repondre()` dans
`pont.js`, qui choisit entre la réserve locale et le réseau. Les commandes
n'auront pas à bouger, puisqu'elles rendent déjà les formes de l'API.

## La synchro site ↔ application

Elle n'existe pas encore. Ce qui suit dit où on en est et ce qu'il reste, parce
que la moitié du travail est déjà faite sans qu'on l'ait cherché.

### Le format existe, et il est versionné

`pokearchive-1` est défini par l'API dans `exporter()`. Il porte **tout** ce
qu'il faut pour reconstruire un compte :

```
{ exporteLe, format: 'pokearchive-1',
  dresseur: { pseudo, avatar, creeLe },
  aventures: [ { nom, mode, niveau_formes, public, par_defaut,
                 cree_le, maj_le, dex, historique } ] }
```

Les deux côtés le produisent désormais : l'application par « Exporter mes
données », le site par le même bouton. Aucun identifiant de base n'en sort — il
n'aurait aucun sens ailleurs.

### L'import existe désormais, des deux côtés

C'était la seule pièce absente pour une synchro par fichier, et c'était un
manque du projet et non du site : l'application exportait depuis toujours sans
jamais savoir relire.

Le bouton **⬆ Importer une sauvegarde**, dans le Profil, avale un fichier
`pokearchive-1` d'où qu'il vienne. Côté application il part à
`POST /api/import` ; côté site il est traité par la commande `importer` du
pont, **avec la même règle de fusion**, recopiée à la lettre — une union qui
différerait d'un côté ferait diverger les deux collections dès le premier
aller-retour, et c'est cet aller-retour que l'import existe pour permettre.

L'opération est **rejouable** : le même fichier deux fois ne double ni le dex
ni le journal. Le banc de l'application le vérifie.

### La question qui décide de tout : que fait-on d'un conflit ?

C'est là qu'une synchro se gagne ou se perd. Si les deux côtés ont bougé,
écraser l'un par l'autre perd du travail — et personne ne s'en aperçoit avant
d'aller chercher un Pokémon qui n'y est plus.

Le format permet de faire mieux qu'écraser :

- **le dex se réunit**, il ne se remplace pas. Cocher est monotone : on ajoute
  des captures, on n'en retire pratiquement jamais. L'union des deux côtés est
  presque toujours la bonne réponse ;
- **l'historique se dédoublonne** sur `(pokemon, dex, chromatique, ajoute_le)`.
  Deux fois la même capture le même jour dans le même jeu est la même capture ;
- **`maj_le` départage** ce qui ne se réunit pas — le nom d'une aventure, son
  mode, son niveau de formes. Là, le plus récent gagne.

Un décochage volontaire serait perdu par cette règle. C'est un choix assumé :
perdre une correction est réparable en deux clics, perdre trois mois de
cochage ne l'est pas.

### Les deux étapes, dans l'ordre

**1. Par fichier — fait.** L'import de `pokearchive-1` existe des deux côtés,
avec la fusion ci-dessus. Manuel, mais complet et hors ligne : il n'a demandé
ni hébergement, ni CORS, ni session web.

**2. Par le compte — demande l'hébergement.** Le site parle à l'API comme le
fait l'application. Côté site il n'y a **qu'une fonction** à changer,
`repondre()` dans `pont.js`, puisque les trente-huit commandes rendent déjà les
formes de l'API. Côté serveur il faut le CORS et un vrai chemin de session
navigateur — voir « Le jour où l'API sera joignable » plus haut.

L'étape 1 ne se perd pas si l'on fait la 2 : un import de fichier reste utile
pour reprendre une sauvegarde, changer de machine, ou récupérer après un vidage
du navigateur.

## S'adapter à la fenêtre

L'application de bureau vit dans une fenêtre dont on choisit la taille ; un
site est ouvert sur ce qu'on a sous la main.

L'application était déjà à moitié adaptée — ses feuilles portent des ruptures à
820, 720, 640, 600 et 560 px. Ce qui n'avait jamais été traité, c'est le
**décor du boîtier**. Mesuré sur un écran de 375 px : l'écran utile n'en
recevait que 253. Les 122 autres partaient en marges empilées, soit un tiers de
l'écran pour de la coque.

Le décor rétrécit donc avec la fenêtre, par `clamp()` plutôt que par une
rupture : la demande est de suivre la taille, pas de sauter d'un état à
l'autre. Une rupture à 720 px laisse un écran de 721 avec le décor du grand et
un de 719 avec celui du petit ; `clamp()` rend le passage continu, et une
fenêtre qu'on redimensionne à la souris suit sans à-coup.

| largeur | utile | décor | colonnes |
|---:|---:|---:|---:|
| 375 px | 302 px | 73 px | 2 |
| 414 px | 335 px | 79 px | 2 |
| 768 px | 645 px | 123 px | 4 |
| 1280 px | 1154 px | 126 px | 7 |

À 1280 px, toutes les valeurs retrouvent **exactement** celles d'origine —
14 / 20 / 8 / 16 et un rayon de 26. Les maxima des `clamp()` sont les valeurs
historiques : le bureau n'a pas bougé d'un pixel.

Les cibles tactiles passent à 44 px sous `pointer: coarse`, **et non sous une
largeur**. Les deux ne disent pas la même chose : une fenêtre de bureau
rétrécie à 400 px se pilote toujours à la souris, tandis qu'une tablette de
1024 px se touche. C'est le moyen de pointage qui décide.

## Le poids, et la compression

Mesuré : le premier chargement demande **41 fichiers**, dont `donnees-embarquees.js`
à lui seul pour 1 642 Ko. Ce sont du JSON dans du JS, et cela se compresse très
bien.

| | sans compression | avec gzip |
|---|---:|---:|
| premier chargement | 2 653 Ko | **642 Ko** |
| en 4G | 1,7 s | 0,4 s |
| en 3G | 6,6 s | 1,6 s |

Soit **4,1 fois plus léger**. `servir.py` compresse donc en local, alors que le
serveur de la bibliothèque standard ne le fait pas : sans cela on met au point
sur une page qui pèse quatre fois ce qu'elle pèsera, et l'on ne sait pas ce
qu'on livre.

**Le jour où le site sera hébergé, la compression doit être active.** C'est le
réglage qui change le plus la première visite sur un téléphone, et il ne coûte
rien — tout hébergeur sérieux la propose.

Les `.png` et `.woff2` sont exclus : ils sont déjà compressés dans leur format,
et les repasser au gzip coûterait du temps pour quelques octets.

Ce qui pèse mais n'est **pas** chargé d'emblée : `donnees-lieux.js` (1,9 Mo),
`donnees-attaques.js` (1,9 Mo) et `donnees-descriptions.js` (1,5 Mo). Ils
descendent à la demande, quand on ouvre la page ou la fiche qui les réclame.

## Le banc d'essai

```
cd site && py outils/banc.py
```

Dix-sept vérifications, jouées dans une vraie fenêtre. Le rapport s'affiche
par-dessus la page.

**La règle, la même que pour le banc de l'application** : un bug est passé, on
écrit la vérification qui l'aurait arrêté. Pas de tests écrits « au cas où » —
ils vieillissent mal et personne ne les relit. La plupart des entrées portent
donc le nom d'un défaut réellement rencontré en bâtissant ce site : le bandeau
écrasé par le flex de `body`, la bascule d'époque que `flex-wrap` seul
n'enroulait pas, la pagination par décalage là où l'API veut un curseur.

**Deux familles.** Le pont se vérifie en appelant ses commandes. La mise en page
demande une largeur : elle se mesure dans une **iframe dimensionnée**, parce que
les requêtes de média répondent à la taille de la fenêtre qui les contient —
c'est le seul moyen d'éprouver le 375 px sans redimensionner la vraie fenêtre.

**Il a des dents, et c'est vérifié.** En réintroduisant volontairement deux
défauts déjà corrigés — le `max-width` de la bascule et la pagination par
décalage — le banc les attrape tous les deux et nomme précisément le symptôme
(« 1 bouton coupé, dont *6e à 9e génération* », « 8 lignes après la dernière »),
sans un seul faux positif ailleurs.

Le banc écrase la réserve du site pendant qu'il joue — il coche, efface,
recharge. Il la range avant de commencer et la remet à la fin, mais on évite
quand même de le lancer sur le navigateur où l'on tient sa vraie collection.

`window.__bancEchecs` porte le nombre d'échecs une fois fini, pour qui voudrait
le lire autrement qu'à l'œil.

## Les commandes

```
py outils/servir.py                  ouvre le site (assemble d'abord)
py outils/servir.py --port 9000      ailleurs, si 8130 est pris
py outils/servir.py --sans-navigateur   sans ouvrir de fenêtre
py outils/assembler.py               assembler seulement
py outils/banc.py                    jouer les dix-sept verifications
py outils/banc.py --port 9001        ailleurs, si 8131 est pris
```
