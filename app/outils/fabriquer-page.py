#!/usr/bin/env python3
"""Regenere les pages de generation a partir de src/index.html.

Une page de generation est une copie de l'application privee de sa couche Tauri
et de son demarrage : c'est ainsi qu'elle dispose du DOM complet et des vraies
fonctions de chargement. Les recopier a la main les ferait deriver de
index.html sans qu'on s'en apercoive ; ce script les refabrique en une commande.

Il y en a deux, une par reserve :
  generer-donnees.html   -> especes, formes, Pokedex, fiches
  generer-attaques.html  -> capacites apprises

Usage : py outils/fabriquer-page.py       (depuis le dossier « app »)
"""

import re
import time
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
SOURCE = APP / "src" / "index.html"

# Une page par pilote : (fichier produit, script pilote, titre).
PAGES = [
    ("generer-donnees.html", "generer.js",
     "Génération des données embarquées"),
    ("generer-attaques.html", "generer-attaques.js",
     "Génération des attaques apprises"),
]

# Ce qu'on retire : la couche Tauri (absente hors de l'application) et le
# demarrage, qui ouvrirait une session au lieu de generer des donnees.
A_RETIRER = [
    '<script src="js/compte.js"></script>',
    '<script src="js/app.js"></script>',
]

source = SOURCE.read_text(encoding="utf-8")

for ligne in A_RETIRER:
    if ligne not in source:
        raise SystemExit(f"introuvable dans index.html : {ligne}")
    source = source.replace(ligne, "")

# Anti-cache sur chaque script. Le serveur envoie bien « Cache-Control:
# no-store », mais le navigateur ressert malgre tout ses copies : on a genere
# une reserve depuis un formes.js perime sans que rien ne le signale, et les
# noms anglais des formes manquaient a l'arrivee. Une empreinte dans l'adresse
# ne laisse pas ce choix.
empreinte = str(int(time.time()))

for fichier, pilote, titre in PAGES:
    # La page vit dans outils/, l'application dans src/.
    html = (source
            .replace('href="css/', 'href="../src/css/')
            .replace('src="js/', 'src="../src/js/')
            .replace('src="logos/', 'src="../src/logos/')
            .replace("<title>PokéArchive</title>", f"<title>{titre}</title>")
            .replace("</body>", f'<script src="{pilote}"></script>\n</body>'))

    restants = [l.strip() for l in html.splitlines()
                if 'src="js/' in l or 'href="css/' in l]
    if restants:
        raise SystemExit(f"chemins non corriges : {restants}")

    html = re.sub(r'(src="\.\./src/js/[^"?]+\.js)"', rf'\1?v={empreinte}"', html)

    cible = APP / "outils" / fichier
    cible.write_text(html, encoding="utf-8")
    nb = len(re.findall(rf'\?v={empreinte}"', html))
    print(f"{cible.relative_to(APP)} refabrique depuis {SOURCE.relative_to(APP)}"
          f" ({nb} scripts horodates {empreinte})")
