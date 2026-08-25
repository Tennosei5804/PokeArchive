# -*- coding: utf-8 -*-
"""Batit site/public/ depuis app/src/ et site/source/.

    cd site && py outils/assembler.py

UNE SEULE SOURCE, ET C'EST app/src. Le frontend de PokeArchive est deja du web
ordinaire : sur ses trente-et-un scripts, quatre seulement touchent a Tauri, et
trois se taisent proprement s'il manque. Le recopier a la main dans site/ en
ferait un second client a maintenir, et deux clients divergent toujours — le
jour ou l'un gagne un onglet, l'autre l'ignore et personne ne le remarque avant
des semaines.

On assemble donc, on ne duplique pas. Ce que site/source ajoute tient en trois
fichiers : le pont qui remplace Tauri, une feuille de style pour ce qui n'a de
sens que sur le web, et le bandeau qui dit ou vivent les donnees.

public/ EST JETABLE. Il est dans le .gitignore, se refait en une commande, et
ne doit jamais etre modifie a la main : la prochaine execution ecraserait tout.
C'est pour cette raison qu'on l'efface au debut plutot que de le mettre a jour
— un fichier supprime de app/src doit disparaitre d'ici, et une copie
incrementale l'y laisserait pour toujours.
"""
import os
import pathlib
import re
import stat
import shutil
import sys
import time

ICI = pathlib.Path(__file__).resolve().parent.parent
SRC = ICI.parent / "app" / "src"
SOURCE = ICI / "source"
PUBLIC = ICI / "public"

# Ce qu'on emporte de l'application. Sprites/ vient aussi : il est vide, mais
# c'est un point d'extension — un .png depose la passe avant les sources en
# ligne, et le site doit offrir la meme possibilite.
DOSSIERS = ["css", "js", "logos", "polices", "types", "Sprites"]


def nettoyer(dossier: pathlib.Path) -> bool:
    """Effacer public/, meme si OneDrive tient un fichier une seconde de trop.

    Le dossier est sous OneDrive, qui le synchronise en tache de fond : une
    suppression peut echouer sur un fichier verrouille ou passe en lecture
    seule. On retire l'attribut et on retente, plutot que d'abandonner un
    assemblage pour un dossier vide de deux .gitkeep.
    """
    if not dossier.exists():
        return True

    def reessayer(fonction, chemin, _exc):
        try:
            os.chmod(chemin, stat.S_IWRITE)
            fonction(chemin)
        except OSError:
            pass                               # on repassera au tour suivant

    for essai in range(4):
        try:
            shutil.rmtree(dossier, onexc=reessayer)
        except TypeError:
            shutil.rmtree(dossier, onerror=lambda f, c, e: reessayer(f, c, e))
        except OSError:
            pass
        if not dossier.exists():
            return True
        time.sleep(0.4 * (essai + 1))

    print("Impossible d'effacer %s" % dossier)
    print("Un programme le tient ouvert — souvent l'explorateur ou OneDrive.")
    print("Ferme-le et relance, ou supprime le dossier a la main.")
    return False


def horodater(html: str, racine: pathlib.Path) -> str:
    """Ajouter ?v=<date du fichier> a chaque script et feuille de style.

    Non pas pour contourner un cache trop zele, mais parce que le contraire est
    pire : un navigateur qui garde l'ancien js apres un assemblage laisse croire
    que la modification n'a pas pris. On horodate par FICHIER et non d'un cachet
    global, pour ne refaire descendre que ce qui a bouge — les huit megaoctets
    de js ne doivent pas repartir a chaque retouche de css.
    """
    def marque(chemin: str) -> str:
        f = racine / chemin
        try:
            return "%s?v=%d" % (chemin, int(f.stat().st_mtime))
        except OSError:
            return chemin                      # absent : on laisse tel quel

    html = re.sub(r'(<script src=")([^"?]+\.js)"',
                  lambda m: m.group(1) + marque(m.group(2)) + '"', html)
    html = re.sub(r'(<link[^>]+href=")([^"?]+\.css)"',
                  lambda m: m.group(1) + marque(m.group(2)) + '"', html)
    return html


def batir() -> int:
    if not SRC.is_dir():
        print("Introuvable : %s" % SRC)
        print("L'outil s'attend a etre lance depuis le depot, site/ a cote de app/.")
        return 1

    depart = time.time()

    # On efface d'abord. Voir l'en-tete : une copie incrementale garderait a
    # jamais les fichiers retires de app/src.
    if not nettoyer(PUBLIC):
        return 1
    PUBLIC.mkdir(parents=True)

    poids = 0
    for nom in DOSSIERS:
        origine = SRC / nom
        if not origine.is_dir():
            print("  (absent, ignore : %s)" % nom)
            continue
        cible = PUBLIC / nom
        shutil.copytree(origine, cible)
        n = sum(1 for f in cible.rglob("*") if f.is_file())
        o = sum(f.stat().st_size for f in cible.rglob("*") if f.is_file())
        poids += o
        print("  %-10s %4d fichier(s)  %7.1f Ko" % (nom, n, o / 1024))

    # Le pont et la feuille du site rejoignent les dossiers de l'application :
    # les chemins relatifs de index.html marchent alors sans exception.
    for source, dest in [("pont.js", PUBLIC / "js" / "pont.js"),
                         ("site.css", PUBLIC / "css" / "site.css")]:
        f = SOURCE / source
        if not f.is_file():
            print("Manquant : site/source/%s" % source)
            return 1
        shutil.copyfile(f, dest)
        print("  %-10s %s" % ("+", dest.relative_to(PUBLIC)))

    html = (SRC / "index.html").read_text(encoding="utf-8")

    # 1. Le pont AVANT tout le reste. compte.js cherche window.__TAURI__ des son
    #    execution et arrete l'application s'il manque : il doit deja etre la.
    ancre = '<script src="js/donnees.js">'
    if ancre not in html:
        print("L'ancre des scripts a change dans index.html : %s" % ancre)
        return 1
    html = html.replace(ancre, '<script src="js/pont.js"></script>\n' + ancre, 1)

    # 2. La feuille du site en DERNIER, pour qu'elle l'emporte a specificite
    #    egale sur celles de l'application.
    html = html.replace("</head>", '<link rel="stylesheet" href="css/site.css">\n</head>', 1)

    # 3. Le bandeau, juste apres <body>. Il dit ou vivent les donnees, et ce
    #    n'est pas un detail : sans lui, on croit sa collection sauvegardee
    #    quelque part alors qu'elle tient dans un localStorage.
    bandeau = (
        '<div class="site-bandeau" role="status">'
        '<b>Version web</b> — tout ce que tu coches reste dans ce navigateur. '
        'Rien n\'est envoye, rien n\'est partage, et vider les donnees du site '
        'efface la collection.'
        '</div>'
    )
    # Mesure : body est en display:flex, flex-direction:row, pour centrer le
    # boitier. Un frere pose la devient un second element de la rangee — le
    # bandeau s'y retrouvait large de 80 px et haut de 784, colle a gauche.
    # .dex, lui, est une colonne : le bandeau y prend toute la largeur.
    ancre_dex = '<div class="dex">'
    if ancre_dex not in html:
        print("Le boitier a change de classe dans index.html : %s" % ancre_dex)
        return 1
    html = html.replace(ancre_dex, ancre_dex + "\n" + bandeau, 1)

    html = horodater(html, PUBLIC)
    (PUBLIC / "index.html").write_text(html, encoding="utf-8")

    print()
    print("public/ bati en %.1f s — %.1f Mo, index.html compris."
          % (time.time() - depart, poids / 1048576))
    print("Pour l'ouvrir :  py outils/servir.py")
    return 0


if __name__ == "__main__":
    sys.exit(batir())
