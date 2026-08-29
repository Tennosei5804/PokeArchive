# À faire pour la 0.22.0

Aide-mémoire jetable, écrit le 29 août 2026. **Il n'est pas commité** — supprime-le
quand tu auras fini.

État : commit `6029349` poussé sur `main`, version portée à 0.22.0 aux trois
endroits.

| étape | état |
|---|---|
| 1. `IMAGES_DOSSIER` dans le `.env` du serveur | ✅ fait — ligne 37 |
| 2a. `git pull` sur le serveur | ✅ fait — `6029349` |
| 2b. Redémarrer le site | ✅ fait |
| 2c. Vérifier `/api/etat` | ✅ `6029349`, debout depuis 0 s |
| 2d. Éprouver les photos (envoyer une capture) | ⬜ à faire |
| 3. Tag `v0.22.0` poussé | ✅ fait — compilation en cours |
| 4. **Publier la Release** sur GitHub | ⬜ à faire, c'est toi |

**Les cinq routes neuves répondent 401 en production** — elles existent et
exigent une session ; une route inventée rend bien 404. Le déploiement est
confirmé, pas seulement supposé.

---

## ⚠ PowerShell : `curl` n'est pas curl

`curl` est un **alias d'`Invoke-WebRequest`** dans PowerShell. Il lit `-s` comme
un début de nom de paramètre, ne trouve pas d'URL, et s'arrête sur une invite
`Uri:` — c'est arrivé. **Ctrl+C** pour en sortir.

Deux façons correctes :

```powershell
curl.exe -s https://pokearchive.alwaysdata.net/api/etat
```

```powershell
irm https://pokearchive.alwaysdata.net/api/etat
```

Le `.exe` force le vrai curl, présent sur Windows 10 et 11. `irm`
(`Invoke-RestMethod`) décode le JSON et rend un objet lisible.

La même règle vaut partout ailleurs dans ce fichier : **ajoute `.exe` à tout
`curl` que tu colles dans PowerShell.**

---

## 1. Le `.env` du serveur — ✅ FAIT

Pour mémoire, et si tu dois le refaire un jour.

Les photos de chasse vivent sur le disque du serveur, dans un dossier que le
service calcule à partir de son **répertoire courant** — qui n'est pas `api/`
quand alwaysdata lance le service. Sans cette ligne, les photos atterrissent là
où personne ne les cherche, ou l'écriture échoue.

```bash
ssh pokearchive@ssh-pokearchive.alwaysdata.net "cd ~/PokeArchive/api && grep -q '^IMAGES_DOSSIER=' .env || printf '\nIMAGES_DOSSIER=/home/pokearchive/PokeArchive/api/donnees/images\n' >> .env; grep -n IMAGES_DOSSIER .env"
```

**Idempotente** : le `grep -q ... ||` empêche le doublon si tu la relances. Le
`\n` en tête protège contre un `.env` qui ne finirait pas par un retour à la
ligne — sans lui, la valeur se collerait à la fin de la ligne précédente et
casserait la configuration MySQL.

Pas de sauvegarde du `.env` exprès : une copie nommée `.env.avant-images` ne
serait **pas** couverte par `.gitignore`, qui ignore `.env` et `*.env` mais pas
ce qui finit autrement. Un fichier de secrets non ignoré dans un dépôt git, c'est
l'accident qu'on ne veut pas.

---

## 2. Déployer l'API

### a. Tirer — ✅ FAIT

```bash
ssh pokearchive@ssh-pokearchive.alwaysdata.net "cd ~/PokeArchive && git pull && git log --oneline -1"
```

A rendu `6029349 Version 0.22.0`.

**La commande qui fait 1 + 2a d'un coup**, si tu dois recommencer :

```bash
ssh pokearchive@ssh-pokearchive.alwaysdata.net "cd ~/PokeArchive && git pull && cd api && grep -q '^IMAGES_DOSSIER=' .env || printf '\nIMAGES_DOSSIER=/home/pokearchive/PokeArchive/api/donnees/images\n' >> .env; cd ~/PokeArchive && git log --oneline -1 && grep -n IMAGES_DOSSIER api/.env"
```

### b. Redémarrer le site — ⬜ À FAIRE

Interface alwaysdata → **Web → Sites** → redémarrer.

C'est le geste qui s'oublie, et rien ne le signale. **Node garde le code en
mémoire et ne relit jamais le disque** : le fichier peut être à jour et l'API
servir encore l'ancien code. Le `.env` non plus n'est lu qu'au démarrage — la
ligne `IMAGES_DOSSIER` ne vaut rien tant que ce redémarrage n'a pas eu lieu.

### c. Vérifier — ⬜ À FAIRE

```powershell
irm https://pokearchive.alwaysdata.net/api/etat
```

Deux choses à lire :

- `commit` doit valoir **`6029349`** ;
- `deboutDepuis` doit être **petit**, quelques secondes. Plusieurs heures veut
  dire que le redémarrage n'a pas eu lieu.

### d. Éprouver les photos — ⬜ À FAIRE

Une fois l'API redémarrée, envoie une photo depuis l'application : ✨ Chasse →
une chasse aboutie → la case 📷 en bout de ligne. Puis :

```bash
ssh pokearchive@ssh-pokearchive.alwaysdata.net "ls -la ~/PokeArchive/api/donnees/images"
```

Un fichier `.jpg` doit y être. S'il n'y en a pas, la ligne du `.env` n'a pas été
lue — c'est que le redémarrage a été oublié.

### Ce que le déploiement apporte

Le schéma se complète tout seul au démarrage — une seule table nouvelle,
`pa_images`. Aucune migration à lancer à la main.

| route | à quoi |
|---|---|
| `POST /api/images` | déposer une photo |
| `GET /api/images/:id` | la servir |
| `DELETE /api/images/:id` | la retirer |
| `GET /api/images` | la place occupée |
| `GET /api/dresseurs/:pseudo/photos` | le mur d'un dresseur |
| `POST /api/amis/qui-a` | « je cherche » : chez qui c'est |

---

## 3. Publier la version — ⬜ optionnel

**Le tag n'est pas posé.** C'est lui qui déclenche la compilation et crée la
Release ; c'est une décision, pas une formalité.

```bash
git tag v0.22.0 && git push origin v0.22.0
```

Le tag doit être posé **après** le commit de version — c'est le cas, `6029349`
est en place. L'inverse déclencherait une exécution parasite du workflow sur le
commit précédent.

Compter **8 à 13 minutes** de compilation. La Release sort en **brouillon** :
rien n'atteint personne avant que tu cliques *Publish release*.

Pendant la compilation, la page `github.com/Tennosei5804/PokeArchive/actions` n'a
pas de limite de requêtes, contrairement à l'API GitHub anonyme qui s'arrête à
soixante par heure.

### La Release v0.20.0 est toujours en brouillon

Elle attend depuis le 27 août. À publier ou à supprimer — mais pas à laisser là.

---

## 4. Deux décisions qui t'attendent

Ni l'une ni l'autre n'est urgente, mais aucune ne se décide à ta place.

### Les photos ne sont pas dans les sauvegardes

`api/outils/sauvegarder.js` emporte la base, pas les fichiers. Une restauration
rendrait les fiches **sans les images** : le mur se remplirait de cases vides.

Trois issues : les emporter dans le dump (il grossit d'autant), les sauvegarder à
part par `rsync`, ou l'assumer et le dire à l'écran. Dis-moi laquelle et je
l'écris.

### Les comptes existants restent ouverts

Trois réglages sont passés en « fermé par défaut » dans cette version — la
présence au classement, la présence Discord, et les aventures publiques. **Chaque
fois, seuls les nouveaux comptes sont concernés.**

Les aventures déjà publiques le restent. Les fermer d'autorité ferait disparaître
du classement des gens qui n'ont rien demandé — le symétrique exact du tort qu'on
répare. Si tu veux quand même tout basculer, c'est un `UPDATE` que je peux
écrire, mais c'est ton appel.

---

## 5. Ce qui reste ouvert côté code

Pour mémoire, sans urgence.

**L'API n'a aucun banc.** Deux bancs d'essai pour les interfaces — 37 et 18
vérifications — et zéro pour le serveur, alors qu'il porte maintenant le plus
délicat : l'inversion du sens dans les échanges, la visibilité des photos, le
ménage déclenché par la sauvegarde, le retrait de l'EXIF, `quiA`. Tout cela a été
éprouvé à la main au curl ; rien n'est rejouable. C'est le chantier le plus
rentable qui reste.

**L'application Discord s'appelle encore « LivingDex »** dans le portail
développeur. Le LISEZMOI le note comme à faire depuis un moment.
