# -*- coding: utf-8 -*-
"""Le releve des Pokedex de jeux, depuis Pokekalos.

    cd app && py outils/relever-pokedex.py

Reecrit src/js/donnees-pokedex.js, la contre-epreuve que le banc oppose a la
reserve embarquee. A relancer quand une page bouge, ou quand un jeu sort.

Ce fichier ne construit AUCUN Pokedex : l'application lit les siens dans
DONNEES_EMBARQUEES.dex, generee depuis PokeAPI par outils/generer.js. Les deux
sources sont independantes, et c'est tout l'interet — une regeneration qui
perdrait des entrees se verrait au passage suivant du banc.

Ce que le script fait, et pourquoi ainsi :

  · il ne prend que la PREMIERE cellule de chaque ligne pour le numero et la
    colonne « Nom » pour le nom. Les cellules de localisation citent d'autres
    numeros (« evolution de #0904 »), qui passeraient pour des entrees ;
  · il detecte la colonne des noms sur la ligne d'en-tete : les pages recentes
    disent « Nom francais », les anciennes « Nom », et la position varie ;
  · il retient les NOMS et non les numeros. Les pages ne numerotent pas de la
    meme facon : la plupart donnent le numero propre au Pokedex (#001
    Germignon pour Illumis), le Disque Indigo donne le numero national (#0084
    Doduo). Le nom francais est la seule identite qu'elles partagent ;
  · il compare le compte obtenu a ce qui est attendu, et le dit. Une page
    remaniee se signale ainsi tout de suite, au lieu d'ecrire un faux releve.

Une page manque a l'appel : le « Pokedex regional d'Alola » d'Ultra-Soleil /
Ultra-Lune ne contient qu'un tableau de 37 lignes finissant par « #??? », un
article de pre-sortie jamais complete. Le dex « updated-alola » n'a donc pas de
contre-epreuve.
"""
import html
import pathlib
import re
import sys
import urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

SRC = pathlib.Path(__file__).resolve().parent.parent / "src"
CIBLE = SRC / "js" / "donnees-pokedex.js"

# source → (clé de DONNEES_EMBARQUEES.dex, titre, noms attendus, url)
PAGES = [
    ("lumiose-city", "Pokédex d'Illumis", 297,
     "https://www.pokekalos.fr/jeux/switch/lpza/articles-pokedex-du-jeu-5702.html"),
    ("hyperspace", "Pokédex d'Extra Illumis", 165,
     "https://www.pokekalos.fr/jeux/switch/mega-dimension/articles-pokedex-d-extra-illumis-6277.html"),
    ("paldea", "Pokédex de Paldea", 429,
     "https://www.pokekalos.fr/jeux/switch/pev/articles-pokedex-regional-4167.html"),
    ("kitakami", "Pokédex de Septentria", 200,
     "https://www.pokekalos.fr/jeux/switch/pev/dlc/articles-pokedex-regional-de-septentria-5221.html"),
    ("blueberry", "Pokédex du Disque Indigo", 226,
     "https://www.pokekalos.fr/jeux/switch/pev/dlc/articles-pokedex-regional-du-disque-indigo-5222.html"),
    ("original-sinnoh", "Pokédex de Sinnoh", 150,
     "https://www.pokekalos.fr/jeux/switch/dp/articles-pokedex-regional-de-sinnoh-2749.html"),
    ("galar", "Pokédex de Galar", 406,
     "https://www.pokekalos.fr/jeux/switch/pokemonepeepokemonbouclier/articles-pokedex-regional-de-galar-1138.html"),
    ("isle-of-armor", "Pokédex d'Isolarmure", 211,
     "https://www.pokekalos.fr/jeux/switch/pokemonepeepokemonbouclier/articles-pokedex-regional-d-isolarmure-1969.html"),
    ("crown-tundra", "Pokédex de Couronneige", 210,
     "https://www.pokekalos.fr/jeux/switch/pokemonepeepokemonbouclier/articles-pokedex-regional-de-couronneige-2455.html"),
    ("letsgo-kanto", "Pokédex de Kanto (Let's Go)", 171,
     "https://www.pokekalos.fr/jeux/switch/pokemonletsgopikachuevoli/articles-le-pokedex-regional-et-localisation-678.html"),
    ("national-gen4", "Pokédex National jusqu'à Arceus", 493,
     "https://www.pokekalos.fr/jeux/switch/dp/articles-completer-le-pokedex-national-3713.html"),
]

# Sans en-tête identifiable, le site répond une page d'erreur.
ENTETE = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                        "(KHTML, like Gecko) Chrome/120.0 Safari/537.36"}


def texte(cellule):
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html.unescape(cellule))).strip()


def cellules(ligne):
    return re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", ligne, re.S | re.I)


def colonne_des_noms(lignes):
    """La colonne « Nom » d'après l'en-tête ; à défaut, la première colonne dont
    le contenu ressemble à un nom — ni un numéro, ni un type."""
    for ligne in lignes[:3]:
        for i, cel in enumerate(texte(c).lower() for c in cellules(ligne)):
            if cel.startswith("nom") and "anglais" not in cel:
                return i
    for ligne in lignes[1:6]:
        for i, cel in enumerate(texte(c) for c in cellules(ligne)):
            if i and cel and not re.fullmatch(r"[#0-9]+", cel) and len(cel) > 2:
                return i
    return 2


def relever(url):
    requete = urllib.request.Request(url, headers=ENTETE)
    with urllib.request.urlopen(requete, timeout=90) as reponse:
        page = reponse.read().decode("utf-8", "replace")
    tables = re.findall(r"<table[^>]*>(.*?)</table>", page, re.S | re.I)
    if not tables:
        raise SystemExit("aucun tableau sur " + url)
    lignes = re.findall(r"<tr[^>]*>(.*?)</tr>", max(tables, key=len), re.S | re.I)
    col = colonne_des_noms(lignes)
    noms, vus = [], set()
    for ligne in lignes:
        cels = cellules(ligne)
        if len(cels) <= col:
            continue
        numero = re.sub(r"[^0-9]", "", texte(cels[0]))
        nom = texte(cels[col])
        if not numero or not nom or nom.lower().startswith("nom") or nom in vus:
            continue
        vus.add(nom)
        noms.append(nom)
    return noms


def en_lignes(noms, largeur=68):
    """Découpe par noms entiers : habiller sur les espaces couperait
    « Ramoloss de Galar » en deux entrées."""
    groupes, courant = [], []
    for nom in noms:
        if courant and sum(len(x) + 1 for x in courant) + len(nom) > largeur:
            groupes.append(courant)
            courant = []
        courant.append(nom)
    if courant:
        groupes.append(courant)
    return groupes


def main():
    releve, ecarts = {}, 0
    for cle, titre, attendu, url in PAGES:
        noms = relever(url)
        releve[cle] = noms
        marque = "ok" if len(noms) == attendu else "ÉCART : %d attendus" % attendu
        if len(noms) != attendu:
            ecarts += 1
        print("%-32s %4d noms   %s" % (titre, len(noms), marque))

    lignes = ["// Les Pokédex de jeux, tels que Pokékalos les recense — RELEVÉ.",
              "//",
              "// GÉNÉRÉ par outils/relever-pokedex.py — ne pas éditer à la main.",
              "//"]
    for cle, titre, attendu, url in PAGES:
        lignes.append("//   · %-32s %4d noms  → dex « %s »" % (titre, len(releve[cle]), cle))
        lignes.append("//     %s" % url)
    lignes += [
        "//",
        "// Ce fichier ne construit AUCUN Pokédex : l'application lit les siens dans",
        "// DONNEES_EMBARQUEES.dex, générée depuis PokeAPI. Celui-ci est la contre-",
        "// épreuve du banc, comme donnees-home.js l'est pour le périmètre HOME — une",
        "// régénération qui perdrait des entrées se verrait au passage suivant.",
        "//",
        "// Des NOMS et non des numéros : les pages ne numérotent pas de la même façon.",
        "// La plupart donnent le numéro propre au Pokédex (#001 Germignon pour Illumis),",
        "// le Disque Indigo donne le numéro national (#0084 Doduo). Le nom français est",
        "// la seule identité qu'elles partagent — c'est déjà le choix de donnees-home.js.",
        "// Les barres verticales séparent, un nom contenant des espaces (« M. Mime »,",
        "// « Ramoloss de Galar »).",
        "//",
        "// Les listes portent les Méga et les formes régionales, qui partagent le numéro",
        "// de leur forme de base : 297 noms pour les 232 entrées d'Illumis, 406 pour les",
        "// 400 de Galar. Ramenées à l'espèce par le banc, elles retombent sur le compte.",
        "",
        "const RELEVE_POKEDEX = {",
    ]

    blocs = []
    for cle, titre, attendu, url in PAGES:
        noms = releve[cle]
        bloc = ["  // %s — %d noms" % (titre, len(noms)), "  '%s': (" % cle]
        groupes = en_lignes(noms)
        for i, groupe in enumerate(groupes):
            dernier = (i == len(groupes) - 1)
            contenu = "|".join(n.replace("'", "\\'") for n in groupe)
            bloc.append("    '%s%s'%s" % (contenu, "" if dernier else "|", "" if dernier else " +"))
        bloc.append("  ).split('|')")
        blocs.append("\n".join(bloc))

    lignes.append(",\n\n".join(blocs))
    lignes += ["};", "",
               "// Ce que le relevé attend pour un Pokédex donné, ou null s'il ne le connaît pas.",
               "function relevePokedex(cle){",
               "  return RELEVE_POKEDEX[cle] || null;",
               "}", ""]

    CIBLE.write_text("\n".join(lignes), encoding="utf-8", newline="\r\n")
    print()
    print("Écrit : %s (%d octets)" % (CIBLE.name, CIBLE.stat().st_size))
    if ecarts:
        print("%d page(s) ne rendent plus le compte attendu : relire avant de s'y fier." % ecarts)
        sys.exit(1)
    print("Les onze pages rendent le compte attendu.")


main()
