# -*- coding: utf-8 -*-
"""Convertit le relevé des cadeaux mystères en réserve embarquée.

    cd app && py outils/relever-cadeaux.py [chemin/du/fichier.csv]

D'OÙ VIENT LA SOURCE. Un CSV de 552 distributions sur les neuf générations,
colonnes en anglais, valeurs en français, séparateur point-virgule, UTF-8 avec
BOM. Il porte ses propres colonnes de sources (Poképédia pour l'essentiel).

CE QUE L'OUTIL FAIT, ET POURQUOI IL EXISTE PLUTÔT QU'UN COPIER-COLLER :

  · il relie les libellés de version aux CLÉS de GAMES. Le CSV dit « Or »,
    « Argent », « Cristal » ; l'application connaît 'gsc' et 'cristal'. Sans
    cette table, le filtre par jeu comparerait des chaînes qui ne se
    rencontrent jamais ;

  · il ÉCHOUE sur un libellé inconnu au lieu de le laisser tomber. Un jeu non
    relié ne casse rien à l'exécution : il rend simplement ses distributions
    introuvables, et personne ne s'en aperçoit ;

  · il résout les noms d'espèces contre donnees-embarquees.js, pour la vignette
    et le numéro national. Les noms qui ne tombent pas sont dits en clair à la
    fin plutôt qu'avalés.

Le fichier produit est GÉNÉRÉ : on ne l'édite pas à la main, on relance l'outil.
"""
import collections
import csv
import io
import json
import os
import pathlib
import sys

ICI = pathlib.Path(__file__).resolve().parent
SRC = ICI.parent / "src" / "js"
SORTIE = SRC / "donnees-cadeaux.js"

DEFAUT = pathlib.Path.home() / "Downloads" / \
    "pokemon_cadeaux_mystere_9_generations_FR_FILTRES.csv"

# Le libelle de version tel que le CSV l'ecrit -> la cle de GAMES.
# Volontairement exhaustive : voir plus bas, un libelle absent arrete l'outil.
JEUX = {
    "Rouge": "rby", "Bleu": "rby", "Vert (JP)": "rby",
    "Jaune": "jaune",
    "Or": "gsc", "Argent": "gsc", "Cristal": "cristal",
    "Rubis": "rse", "Saphir": "rse", "Émeraude": "emeraude",
    "Rouge Feu": "frlg", "Vert Feuille": "frlg",
    "Diamant": "dp", "Perle": "dp", "Platine": "pt",
    "Or HeartGold": "hgss", "Argent SoulSilver": "hgss",
    "Noir": "bw", "Blanc": "bw", "Noir 2": "b2w2", "Blanc 2": "b2w2",
    "X": "xy", "Y": "xy", "Rubis Oméga": "oras", "Saphir Alpha": "oras",
    "Soleil": "sm", "Lune": "sm", "Ultra-Soleil": "usum", "Ultra-Lune": "usum",
    "Let's Go Pikachu": "letsgo", "Let's Go Évoli": "letsgo",
    "Épée": "swsh", "Bouclier": "swsh",
    "Diamant Étincelant": "bdsp", "Perle Scintillante": "bdsp",
    "Écarlate": "sv", "Violet": "sv",
}


def especes_connues():
    """Nom francais -> (numero national, id de forme).

    LES DEUX, ET PAS SEULEMENT LE PREMIER. Zoroark de Hisui porte le numero
    national 571, comme le Zoroark ordinaire — et c'est bien celui-la qu'il faut
    afficher. Mais son rendu se demande par l'id de FORME, 10239 : avec le seul
    numero national, l'ecran montrait le Zoroark d'Unys sous le nom de celui de
    Hisui. Le meme piege attend Miaouss, qui a trois formes pour un numero.
    """
    t = io.open(SRC / "donnees-embarquees.js", encoding="utf-8").read()
    d = json.loads(t[t.index("DONNEES_EMBARQUEES = ") + 21: t.rindex("};") + 1])
    par_nom = {}
    for e in d["entrees"]:
        par_nom.setdefault(e["display"], (e["speciesId"], e["id"]))
    return par_nom


def resoudre(nom, par_nom):
    """Le numero national, ou None.

    Trois ecritures a rapprocher, parce que les deux cotes ne nomment pas les
    formes pareil :

      · « Pikachu (casquette) » — le CSV met la forme entre parentheses ;
      · « Miaouss de Galar » — il l'ecrit aussi en toutes lettres, la ou la
        reserve dit « Miaouss (Galar) ». Onze noms tombaient la-dessus ;
      · une forme que la reserve ne distingue pas : on retombe sur l'espece.
    """
    if nom in par_nom:
        return par_nom[nom]

    # « X de Galar » -> « X (Galar) ». La preposition varie, la reserve non.
    for prep in (" de ", " d'"):
        if prep in nom:
            base, forme = nom.split(prep, 1)
            candidat = "%s (%s)" % (base.strip(), forme.strip())
            if candidat in par_nom:
                return par_nom[candidat]

    racine = nom.split("(")[0].strip()
    if racine in par_nom:
        return par_nom[racine]
    for cle in par_nom:
        if cle.startswith(nom + " (") or cle.startswith(racine + " ("):
            return par_nom[cle]
    return None


def main():
    source = pathlib.Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAUT
    if not source.exists():
        print("introuvable : %s" % source)
        return 1

    lignes = list(csv.DictReader(io.open(source, encoding="utf-8-sig"),
                                 delimiter=";"))
    par_nom = especes_connues()

    inconnus = sorted({j.strip() for l in lignes for j in l["games"].split("|")
                       if j.strip() and j.strip() not in JEUX})
    if inconnus:
        print("ARRET : libelles de jeu non relies a GAMES —")
        for j in inconnus:
            print("   " + j)
        return 1

    # Les chaines qui se repetent beaucoup sont internees : la methode et la
    # region reviennent des dizaines de fois, le titre de l'evenement presque
    # jamais. Interner tout aurait alourdi le fichier au lieu de l'alleger.
    textes, index = [], {}

    def n(s):
        s = (s or "").strip()
        if not s:
            return -1
        if s not in index:
            index[s] = len(textes)
            textes.append(s)
        return index[s]

    CATS = ["normal", "legendaire", "fabuleux"]
    SHINY = ["non_applicable", "non_shiny", "shiny_possible", "shiny_garanti"]

    sortie, perdus = [], []
    for l in lignes:
        trouve = resoudre(l["pokemon"], par_nom)
        if trouve is None:
            perdus.append(l["pokemon"])
        espece, forme = trouve if trouve else (0, 0)
        jeux = sorted({JEUX[j.strip()] for j in l["games"].split("|") if j.strip()})
        cat = l["pokemon_category"].strip()
        sh = l["shiny_status"].strip() or "non_applicable"
        sortie.append([
            l["pokemon"].strip(),
            espece,
            int(l["generation"]),
            jeux,
            CATS.index(cat) if cat in CATS else 0,
            SHINY.index(sh) if sh in SHINY else 0,
            l["event"].strip(),
            n(l["method"]),
            n(l["regions"]),
            l["period"].strip(),
            n(l["source_distribution_fr"]),
            forme,
        ])

    entete = (
        "// Les cadeaux mystères, distribution par distribution — GÉNÉRÉ, ne pas\n"
        "// éditer à la main.\n"
        "//\n"
        "//   cd app && py outils/relever-cadeaux.py\n"
        "//\n"
        "// %d distributions sur les neuf générations. Le relevé est MONDIAL : la\n"
        "// colonne `region` dit où chacune a eu lieu, et beaucoup n'ont jamais\n"
        "// touché l'Europe. L'écran l'affiche plutôt que de le taire — promettre un\n"
        "// évènement auquel personne n'a eu accès serait pire que de l'omettre.\n"
        "//\n"
        "// Chaque entrée est un tableau, pour tenir dans un fichier qu'on charge à\n"
        "// l'ouverture de l'onglet :\n"
        "//\n"
        "//   0 nom        tel que la source l'écrit, forme comprise\n"
        "//   1 espece     numéro national, 0 si le nom n'a pas été résolu\n"
        "//   2 gen        génération de la distribution, pas de l'espèce\n"
        "//   3 jeux       clés de GAMES\n"
        "//   4 categorie  index dans CADEAUX_CATEGORIES\n"
        "//   5 chromatique index dans CADEAUX_CHROMA\n"
        "//   6 evenement  le nom de la distribution\n"
        "//   7 methode    index dans CADEAUX_TEXTES\n"
        "//   8 regions    index dans CADEAUX_TEXTES\n"
        "//   9 periode    la date ou la plage, telle qu'écrite\n"
        "//  10 source     index dans CADEAUX_TEXTES\n"
        "//  11 forme      id de FORME, pour le sprite. Zoroark de Hisui porte\n"
        "//              le numero national 571 comme le Zoroark ordinaire, mais\n"
        "//              son rendu se demande par 10239 : avec le seul numero,\n"
        "//              l'ecran montrait la mauvaise bete sous le bon nom.\n"
        "//\n"
        "// Les index pointent vers CADEAUX_TEXTES : méthode et région se répètent\n"
        "// des dizaines de fois, le titre de l'évènement presque jamais — interner\n"
        "// les seconds aurait alourdi le fichier au lieu de l'alléger.\n"
        % len(sortie))

    corps = (
        entete
        + "\nconst CADEAUX_CATEGORIES = %s;\n" % json.dumps(CATS, ensure_ascii=False)
        + "const CADEAUX_CHROMA = %s;\n" % json.dumps(SHINY, ensure_ascii=False)
        + "\nconst CADEAUX_TEXTES = %s;\n" % json.dumps(textes, ensure_ascii=False)
        + "\nconst CADEAUX = %s;\n" % json.dumps(sortie, ensure_ascii=False)
    )
    # ENCODER AVANT D'OUVRIR : si l'encodage échoue, le fichier existant n'a pas
    # encore été tronqué.
    octets = corps.encode("utf-8")
    io.open(SORTIE, "wb").write(octets)

    print("%s — %d distributions, %d octets" % (SORTIE.name, len(sortie), len(octets)))
    print("   %d textes internés" % len(textes))
    par_gen = collections.Counter(x[2] for x in sortie)
    print("   par génération : "
          + ", ".join("%d=%d" % (g, par_gen[g]) for g in sorted(par_gen)))
    if perdus:
        print("   %d nom(s) non résolu(s) : %s"
              % (len(perdus), ", ".join(sorted(set(perdus))[:12])))
    else:
        print("   tous les noms résolus contre la réserve embarquée")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
