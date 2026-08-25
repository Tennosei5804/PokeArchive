# Le site PokéArchive

La même application, dans un navigateur.

```
cd site && py outils/servir.py
```

Le site s'assemble, s'ouvre sur <http://127.0.0.1:8130>, et c'est tout.

---

## Ce que c'est, et ce que ce n'est pas

C'est **le frontend de l'application de bureau**, servi par un navigateur. Pas
une réécriture, pas un second client : les mêmes trente-et-un scripts, les
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

Le frontend de PokéArchive est déjà du web ordinaire. Sur ses trente-et-un
scripts, **quatre seulement** touchent à Tauri, et trois d'entre eux vérifient
sa présence avant de s'en servir — ils se taisent proprement quand il manque.
Le seul vrai point de contact est `invoke()`, trente-deux commandes.

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

Les trente-deux commandes rendent **les formes de l'API**, reprises de
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

## Les commandes

```
py outils/servir.py                  ouvre le site (assemble d'abord)
py outils/servir.py --port 9000      ailleurs, si 8130 est pris
py outils/servir.py --sans-navigateur   sans ouvrir de fenêtre
py outils/assembler.py               assembler seulement
```
