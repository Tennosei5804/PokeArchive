# -*- coding: utf-8 -*-
"""Ou l'on croise chaque Pokemon, jeu par jeu — releve chez Pokepedia.

    cd app && py outils/relever-lieux.py

Ecrit src/js/donnees-lieux.js, la troisieme reserve : celle que la fiche charge
a la demande pour son bloc « Ou l'obtenir ». Elle ne bouge qu'a la sortie d'un
jeu, ou quand une page est corrigee.

UNE SEULE SOURCE, et c'est un changement.

Le releve a d'abord ete bati sur Pokekalos, puis sur Pokebip. Les deux ont ete
abandonnes le 23 aout 2026, apres une journee passee a arbitrer leurs
desaccords : chaque fois qu'ils se contredisaient, c'est Pokepedia qui avait
raison. Quarante-cinq corrections a la main tenaient le releve debout — elles
n'etaient pas un accomplissement, mais le symptome d'un socle trop faible.

Ce que Pokepedia donne et qu'aucun des deux n'avait :

  · la SOUS-ZONE     « Pente Enneigee • Hautes herbes », et non « Pente Enneigee »
  · le NIVEAU        et le TAUX de rencontre
  · la VERSION       Rubis et Saphir separes d'Emeraude, ce que Pokebip fusionnait
  · la FORME         page dediee pour Rattata d'Alola, Qwilfish de Hisui…
  · l'HEURE          matin, jour, soir, nuit
  · la METEO         pluie, neige, blizzard, brouillard, tempete de sable…
  · la SAISON        printemps, ete, automne, hiver — la mecanique de Noir/Blanc

On passe par l'API de MediaWiki, et on ne demande que la section
« Localisations » : cinq kilo-octets au lieu de six cents pour la page entiere.
Une requete par espece ET par generation, car la page principale ne montre que
les dernieres.

Le texte est COMPOSE, et c'est l'autre changement de doctrine. Les deux sites
precedents donnaient de la prose qu'on recopiait telle quelle ; Pokepedia donne
un tableau. On rend donc ses colonnes mecaniquement, sans rien reformuler :
« Route 8 (Sentier des Sources) • Hautes herbes (39-43, 40 %) ».

La categorie repond a la seule question qui change un dex : capturable ici, ou
seulement vu ?

  sauvage       un lieu reel, donc capturable dans ce jeu
  evolution     il faut le faire evoluer
  offert        donne par un personnage, starter compris
  echange       un echange interne au jeu
  oeuf          l'elevage
  indisponible  absent du jeu : vu, jamais capture ici

Les pages sont mises en cache dans outils/.pages/pokepedia. Vider le dossier
force une lecture fraiche — pres de quatorze mille requetes, alors on evite.
"""
import hashlib
import json
import pathlib
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from html.parser import HTMLParser

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

SRC = pathlib.Path(__file__).resolve().parent.parent / "src"
RESERVE = SRC / "js" / "donnees-embarquees.js"
CIBLE = SRC / "js" / "donnees-lieux.js"
CACHE = pathlib.Path(__file__).resolve().parent / ".pages" / "pokepedia"
API = "https://www.pokepedia.fr/api.php"
ENTETE = {"User-Agent": "PokeArchive/1.0 (releve personnel de collection)"}

CATEGORIES = ["sauvage", "evolution", "offert", "echange", "oeuf", "indisponible"]
MENTIONS = ["introuvable", "echange", "evolution", "offert", "oeuf", "fixe",
            "troupeau", "rare", "raid", "apparition", "poke-radar", "distorsion",
            "peche", "surf", "meteo", "jour", "nuit", "saison"]

# Le bloc de version, tel que Pokepedia colore ses lignes. Vingt-deux jeux, un
# par cle de donnees.js.
JEUX = {
    "rouge-bleu": "rby", "jaune": "jaune", "or-argent": "gsc", "cristal": "cristal",
    "rubis-saphir": "rse", "émeraude": "emeraude", "rougefeu-vertfeuille": "frlg",
    "diamant-perle": "dp", "platine": "pt", "orheartgold-argentsoulsilver": "hgss",
    "noir-blanc": "bw", "noir2-blanc2": "b2w2", "x-y": "xy",
    "rubisoméga-saphiralpha": "oras", "soleil-lune": "sm",
    "ultrasoleil-ultralune": "usum", "letsgopikachu-letsgoévoli": "letsgo",
    "épée-bouclier": "swsh", "diamantétincelant-perlescintillante": "bdsp",
    "légendesarceus": "pla", "écarlate-violet": "sv", "légendesza": "za",
}

# Les colonnes conditionnelles. La marque n'est pas une coche mais le TAUX :
# « — » quand le cas ne se presente pas, « 15 % » ou « Fixe » quand il se
# presente.
HEURES = {"matin": "matin", "jour": "jour", "soir": "soir", "nuit": "nuit"}
METEOS = {"météo-soleil": "soleil", "soleilintense": "soleil intense",
          "nuage": "nuages", "pluie": "pluie", "orage": "orage", "neige": "neige",
          "blizzard": "blizzard", "tempêtedesable": "tempête de sable",
          "brume": "brouillard"}
SAISONS = {"printemps": "printemps", "été": "été", "automne": "automne",
           "hiver": "hiver"}
CONDITIONS = dict(HEURES)
CONDITIONS.update(METEOS)
CONDITIONS.update(SAISONS)
LIBELLES = {v.lower() for v in CONDITIONS.values()} | {"soleil", "nuage", "brume"}
VIDE = ("", "—", "-", "–", "?", "/")

# La derniere espece de chaque generation : elle dit a partir de quand une
# espece peut apparaitre, donc quelles pages interroger.
DERNIERE = [151, 251, 386, 493, 649, 721, 809, 905, 1025, 1025]

# Ce que la sous-zone dit du moyen.
#
# La logique est inversee par rapport a ce qu'on ferait d'instinct : on ne
# cherche pas a reconnaitre ce qui est sauvage, on liste ce qui ne l'est PAS.
# Le vocabulaire des sous-zones a ete releve dans le cache — mille soixante-dix
# formes distinctes — et cent trente-sept seulement designent autre chose
# qu'une rencontre. Decrire les neuf cent trente autres serait sans fin ; les
# nommer par exception tient en huit lignes.
#
# Trois erreurs avaient echappe a la premiere version, qui tentait l'inverse :
# Evoli « dans une Poke Ball sur le toit », Ptera « ranime d'un fossile » et
# Porygon « a acheter au Casino » passaient tous les trois pour capturables.
PAS_UNE_RENCONTRE = [
    (r"œuf|oeuf|reproduction|[ée]clos", "oeuf"),
    (r"[ée]volu", "evolution"),
    (r"[ée]chang", "echange"),
    (r"fossile", "offert"),
    (r"donn[ée]", "offert"),
    (r"acheter|achat|prix du casino", "offert"),
    (r"pok[ée] ?ball", "offert"),
    (r"cadeau|starter|d[ée]part|distribu", "offert"),
]

# Ce que la sous-zone ajoute comme mention, sans changer la categorie. Une meme
# ligne peut en porter plusieurs : « Pokemon vadrouilleurs (surface de l'eau) »
# est a la fois une rencontre fixe et une rencontre sur l'eau.
DIT_AUSSI = [
    (r"p[êe]che|canne", "peche"),
    (r"sur l'eau|surface de l'eau|surf|plong[ée]e|rivi[èe]re|lac\b|oc[ée]an", "surf"),
    (r"pok[ée].?radar", "poke-radar"),
    (r"essaim|horde|troupeau", "troupeau"),
    (r"raid", "raid"),
    (r"distorsion", "distorsion"),
    (r"apparition massive|m[ée]gapparition|apparition de masse", "apparition"),
    (r"apparition rare|pok[ée]mon cach[ée]s|coup d'boule|arbre", "rare"),
    (r"vadrouilleur|fixe|baron|dominant|statique", "fixe"),
    (r"[ée]chang", "echange"),
    (r"œuf|oeuf|reproduction", "oeuf"),
    (r"[ée]volu", "evolution"),
    (r"fossile|donn[ée]|acheter|cadeau|starter|distribu", "offert"),
]


# --- Lire Pokepedia ---------------------------------------------------------

def api(**parametres):
    """Une reponse de l'API, du cache si on l'a deja demandee."""
    parametres.setdefault("format", "json")
    parametres.setdefault("formatversion", "2")
    url = API + "?" + urllib.parse.urlencode(parametres)
    fichier = CACHE / (hashlib.md5(url.encode()).hexdigest() + ".json")
    if fichier.exists():
        return json.loads(fichier.read_text(encoding="utf-8"))
    CACHE.mkdir(parents=True, exist_ok=True)
    for essai in range(3):
        try:
            requete = urllib.request.Request(url, headers=ENTETE)
            with urllib.request.urlopen(requete, timeout=60) as reponse:
                donnees = json.loads(reponse.read().decode("utf-8"))
            fichier.write_text(json.dumps(donnees, ensure_ascii=False), encoding="utf-8")
            # 0,15 s : quatorze mille requetes, sur un wiki benevole. En dessous,
            # on le martelerait pour gagner dix minutes.
            time.sleep(0.15)
            return donnees
        except urllib.error.HTTPError as erreur:
            if erreur.code == 404:
                fichier.write_text('{"absente":true}', encoding="utf-8")
                return {"absente": True}
            time.sleep(2 * (essai + 1))
        except Exception:
            time.sleep(2 * (essai + 1))
    return {"absente": True}


def section_localisations(page, generation):
    """Le HTML de la seule section « Localisations », ou None.

    Les especes recentes n'ont pas de sous-page par generation : leur page
    principale porte tout, d'ou le repli.
    """
    for titre in ("%s/Génération %d" % (page, generation), page):
        d = api(action="parse", page=titre, prop="sections")
        if "parse" not in d:
            continue
        voulu = [s["index"] for s in d["parse"]["sections"]
                 if s["line"].startswith("Localisation")]
        if not voulu:
            continue
        d = api(action="parse", page=titre, prop="text", section=voulu[0])
        html = d.get("parse", {}).get("text")
        if html:
            return html
    return None


class LecteurDeTableaux(HTMLParser):
    """Les lignes d'un tableau, avec la CLASSE de chaque cellule.

    La classe est tout : « matin », « pluie », « épée-bouclier ». Le texte seul
    ne dirait pas de quelle colonne il vient, et c'est la colonne qui porte le
    sens.
    """

    def __init__(self):
        HTMLParser.__init__(self, convert_charrefs=True)
        self.lignes = []
        self.cellule = None
        self.classe = None

    def handle_starttag(self, balise, attributs):
        d = dict(attributs)
        if balise == "tr":
            self.lignes.append([])
        elif balise in ("td", "th"):
            self.cellule = []
            self.classe = (d.get("class") or "").strip()
        elif balise == "img" and self.cellule is not None:
            self.cellule.append(d.get("alt") or "")
        elif balise == "br" and self.cellule is not None:
            # Deux valeurs empilees dans une cellule : « 3-5 » puis « 7 ». Les
            # coller donnait « 357 », un niveau qui n'existe pas.
            self.cellule.append(", ")

    def handle_endtag(self, balise):
        if balise in ("td", "th") and self.cellule is not None:
            if not self.lignes:
                self.lignes.append([])
            texte = "".join(self.cellule)
            # « {{P}} » : un modele MediaWiki que l'API ne rend pas dans une
            # section isolee. Il vaut le symbole Pokedollar, et l'ecrire tel
            # quel donnerait « A acheter (500 {{P}}) ».
            texte = re.sub(r"\{\{P\}\}", "P", texte)
            texte = re.sub(r"\{\{[^}]*\}\}", "", texte)
            texte = re.sub(r"\s+", " ", texte).strip()
            self.lignes[-1].append((self.classe, texte))
            self.cellule, self.classe = None, None

    def handle_data(self, donnee):
        if self.cellule is not None:
            self.cellule.append(donnee)


def rencontres(html):
    """{jeu → {resume, lignes}} : ce que la section dit, jeu par jeu.

    La section a DEUX niveaux, et il faut les deux.

    Le RESUME d'abord, un tableau « Versions | Localisations | Details » ou
    chaque ligne porte la classe de son jeu : « Epee et Bouclier | Isolarmure :
    Plaine Salutation », « Ultra-Soleil | Faire evoluer Pikachu dans
    l'Ultra-Dimension », « Diamant Etincelant | Indisponible ». C'est lui qui
    dit les evolutions, les echanges et les absences — sans lui, le releve
    n'avait pas une seule categorie « evolution ».

    Le DETAIL ensuite, un tableau par jeu, ouvert par une ligne d'un seul bloc
    colore : lieu, sous-zone, niveau, taux, et selon les jeux l'heure et la
    meteo. Il ne couvre que les rencontres sauvages.

    Trois sortes de lignes a ecarter dans le detail, et aucune ne se reconnait
    pareil : l'en-tete de colonnes (« Lieu | Niveau | Taux »), l'en-tete
    d'icones (chaque cellule y repete le nom de sa colonne) et le nom d'aire
    seul (« Isolarmure »), qui coiffe un groupe sans etre une rencontre.
    """
    lecteur = LecteurDeTableaux()
    lecteur.feed(html)
    par_jeu, jeu = {}, None
    for ligne in lecteur.lignes:
        if not ligne:
            continue
        classes = [(c or "").strip() for c, _ in ligne]
        # Une ligne d'un seul bloc colore ouvre le detail de ce jeu.
        if len(ligne) == 1:
            if classes[0] in JEUX:
                jeu = JEUX[classes[0]]
            continue
        # Une ligne de resume : le jeu en tete, ce qu'il donne a cote.
        if classes[0] in JEUX and len(ligne) >= 2:
            place = par_jeu.setdefault(JEUX[classes[0]], {"resume": "", "lignes": []})
            if not place["resume"]:
                place["resume"] = ligne[1][1].strip()
            continue
        if jeu is None:
            continue
        if ligne[0][1].strip().lower() in ("lieu", "forme", "versions"):
            continue
        quand, brut, entete = [], [], False
        for classe, texte in ligne:
            cls = (classe or "").strip()
            if cls in CONDITIONS:
                if texte.lower() in LIBELLES:
                    entete = True
                elif texte not in VIDE:
                    quand.append(CONDITIONS[cls])
            elif cls not in JEUX:
                brut.append(texte)
        if entete:
            continue
        brut = [x for x in brut if x.strip() not in VIDE]
        if len(brut) < 2:
            continue
        par_jeu.setdefault(jeu, {"resume": "", "lignes": []})["lignes"].append(
            {"lieu": brut[0], "chiffres": brut[1:3], "quand": quand})
    return par_jeu


# --- Des especes aux pages --------------------------------------------------

def index_des_pages():
    """[(identifiant, nom de page, generation d'apparition)] a interroger.

    Les especes de base, plus les formes regionales, qui ont chez Pokepedia
    leur propre page : « Pour les localisations du Raichu d'Alola, consultez sa
    page dediee. »
    """
    brut = RESERVE.read_text(encoding="utf-8")
    sortie, vus = [], set()
    mots = {"alola": "d'Alola", "galar": "de Galar", "hisui": "de Hisui",
            "paldea": "de Paldea"}
    for ident, espece, nom, affiche in re.findall(
            r'"id":(\d+),"speciesId":(\d+),"name":"([^"]*)","display":"([^"]*)"', brut):
        ident, espece = int(ident), int(espece)
        if ident in vus:
            continue
        region = re.search(r"-(alola|galar|hisui|paldea)$", nom)
        base = re.sub(r"\s*\([^)]*\)\s*$", "", affiche).strip()
        if region:
            page = "%s %s" % (base, mots[region.group(1)])
        elif ident == espece:
            page = base
        else:
            continue
        vus.add(ident)
        generation = next(g for g, m in enumerate(DERNIERE, 1) if espece <= m)
        sortie.append((ident, page, generation))
    if len(sortie) < 1000:
        raise SystemExit("index des pages incomplet (%d) — la réserve a changé de forme"
                         % len(sortie))
    return sortie


# --- Composer ---------------------------------------------------------------

def texte_de(lignes):
    """Le texte d'une entree : une rencontre par ligne, telle que rendue.

    Toutes les rencontres, sans plafond : Roucool en a trente-quatre dans
    Rouge et Bleu. C'est long, mais un lieu tu n'ecrirais pas est un lieu
    qu'on irait chercher ailleurs.
    """
    vues, sortie = set(), []
    for r in lignes:
        # La coche des colonnes conditionnelles n'est pas un chiffre : elle dit
        # seulement que le cas s'applique, et « quand » la porte deja.
        chiffres = ", ".join(x.strip(" ,") for x in r["chiffres"]
                             if x and x.strip(" ,✓✔"))
        morceau = r["lieu"] + (" (%s)" % chiffres if chiffres else "")
        if morceau not in vues:
            vues.add(morceau)
            sortie.append(morceau)
    return "\n".join(sortie)


def categorie(lignes, resume=""):
    """Capturable, ou seulement vu ?

    Une SEULE vraie rencontre suffit. Prendre la premiere ligne ne marchait
    pas : Pokepedia met « Route 4 • A acheter (500 P) » en tete de Magicarpe,
    qui se peche pourtant a trente-trois autres endroits. Un lieu reel
    l'emporte sur un comptoir, ou qu'il figure dans la liste.

    Sans aucune rencontre, c'est la premiere exception qui dit le moyen : oeuf,
    evolution, echange ou cadeau.
    """
    # Sans detail, c'est le resume qui parle : « Faire evoluer Pikachu »,
    # « Echange », « Donne par le Prof. Chen ». C'est la que vivent les
    # evolutions, que le tableau de detail ne liste jamais.
    if not lignes:
        if not resume:
            return "indisponible"
        bas = resume.lower()
        for motif, cat in PAS_UNE_RENCONTRE:
            if re.search(motif, bas):
                return cat
        return "sauvage"
    premiere = None
    for r in lignes:
        bas = r["lieu"].lower()
        exception = next((cat for motif, cat in PAS_UNE_RENCONTRE
                          if re.search(motif, bas)), None)
        if exception is None:
            return "sauvage"
        if premiere is None:
            premiere = exception
    return premiere


def mentions_de(lignes):
    """Ce que les sous-zones et les conditions ajoutent, sans dire ou."""
    trouvees = set()
    heures, meteos, saisons = set(), set(), set()
    for r in lignes:
        bas = r["lieu"].lower()
        for motif, mention in DIT_AUSSI:
            if re.search(motif, bas):
                trouvees.add(mention)
        for q in r["quand"]:
            if q in HEURES.values():
                heures.add(q)
            elif q in SAISONS.values():
                saisons.add(q)
            else:
                meteos.add(q)
    # Un Pokemon qui sort par tous les temps n'a aucune restriction : le dire
    # serait du bruit. Seul un sous-ensemble apprend quelque chose.
    if meteos and len(meteos) < len(METEOS):
        trouvees.add("meteo")
    if heures and len(heures) < len(HEURES):
        if "jour" in heures or "matin" in heures:
            trouvees.add("jour")
        if "nuit" in heures or "soir" in heures:
            trouvees.add("nuit")
    if saisons and len(saisons) < len(SAISONS):
        trouvees.add("saison")
    return trouvees, heures, meteos, saisons


def precisions_de(heures, meteos, saisons):
    """Ce qui doit s'ecrire en toutes lettres, a cote du lieu."""
    sortie = []
    if meteos and len(meteos) < len(METEOS):
        sortie.append("Par temps de " + ", ".join(sorted(meteos)))
    if heures and len(heures) < len(HEURES):
        sortie.append("Seulement " + ", ".join(sorted(heures)))
    if saisons and len(saisons) < len(SAISONS):
        sortie.append("Seulement " + ", ".join(sorted(saisons)))
    return sortie


# --- Ecriture ---------------------------------------------------------------

def main():
    pages = index_des_pages()
    print("Index : %d pages à interroger (espèces et formes régionales).\n"
          % len(pages))

    jeux, textes, index_texte = {}, [], {}

    def poser(mot):
        if mot not in index_texte:
            index_texte[mot] = len(textes)
            textes.append(mot)
        return index_texte[mot]

    muettes, total = 0, 0
    for numero, (ident, page, premiere) in enumerate(pages, 1):
        vide = True
        for generation in range(premiere, 11):
            html = section_localisations(page, generation)
            if not html:
                continue
            for cle, bloc in rencontres(html).items():
                resume, lignes = bloc["resume"], bloc["lignes"]
                # « Indisponible » n'ouvre pas de ligne : une espece absente
                # d'un jeu n'a rien a y faire, et « pokedexReleve » suffit a le
                # dire.
                if not lignes and (not resume or resume.lower().startswith("indisponible")):
                    continue
                vide = False
                mentions, heures, meteos, saisons = mentions_de(lignes)
                jeux.setdefault(cle, {})[str(ident)] = [
                    poser(texte_de(lignes) if lignes else resume),
                    CATEGORIES.index(categorie(lignes, resume)),
                    sorted(MENTIONS.index(m) for m in mentions if m in MENTIONS),
                    [poser(p) for p in precisions_de(heures, meteos, saisons)],
                ]
                total += 1
        if vide:
            muettes += 1
        if numero % 100 == 0:
            print("   … %d/%d pages, %d lignes" % (numero, len(pages), total))

    print("\n%d pages lues, %d sans la moindre rencontre." % (len(pages), muettes))
    print("%d lignes retenues, %d textes distincts, %d jeux.\n"
          % (total, len(textes), len(jeux)))
    for cle in sorted(jeux):
        n = len(jeux[cle])
        sauvages = sum(1 for v in jeux[cle].values() if v[1] == 0)
        formes = sum(1 for k in jeux[cle] if int(k) > 10000)
        print("   %-10s %4d entrées, dont %4d capturables et %3d de forme"
              % (cle, n, sauvages, formes))

    contenu = {
        "genereLe": __import__("datetime").date.today().isoformat(),
        "categories": CATEGORIES,
        "mentions": MENTIONS,
        # Tous les jeux lus le sont entierement : Pokepedia liste chaque version
        # sous chaque espece. Une espece sans ligne n'y est donc pas.
        "pokedexReleve": sorted(jeux),
        "textes": textes,
        "jeux": jeux,
    }
    entete = [
        "// Où l'on croise chaque Pokémon, jeu par jeu — GÉNÉRÉ, ne pas éditer à la main.",
        "//",
        "//   cd app && py outils/relever-lieux.py",
        "//",
        "// Source unique : Poképédia, par l'API de MediaWiki, une requête par espèce",
        "// et par génération. Pokékalos puis Pokébip l'ont précédée ; les deux ont été",
        "// abandonnés le 23 août 2026, après une journée passée à arbitrer leurs",
        "// désaccords — chaque fois, c'est Poképédia qui avait raison.",
        "//",
        "// Ce qu'elle donne et qu'aucun des deux n'avait : la sous-zone, le niveau, le",
        "// taux de rencontre, la version séparée, la forme régionale sur sa propre",
        "// page, l'heure, la météo et la saison.",
        "//",
        "// Le texte est COMPOSÉ à partir des colonnes du tableau, mécaniquement :",
        "// « Route 8 (Sentier des Sources) • Hautes herbes (39-43, 40 %) ». Les deux",
        "// sites précédents donnaient de la prose qu'on recopiait ; celle-ci donne des",
        "// champs, et les rendre est plus fidèle que les reformuler.",
        "//",
        "// Chargée à la demande par fiche.js, comme les attaques.",
        "//",
        "// « categories » répond à la seule question qui change un dex : capturable",
        "// ici, ou seulement vu ? Une SEULE vraie rencontre suffit à la dire",
        "// capturable : Magicarpe s'achète 500 P Route 4, mais se pêche à",
        "// trente-trois autres endroits, et c'est cela qui compte.",
        "",
    ]
    CIBLE.write_text("\n".join(entete) + "const DONNEES_LIEUX = "
                     + json.dumps(contenu, ensure_ascii=False, separators=(",", ":")) + ";\n",
                     encoding="utf-8", newline="\r\n")
    print("\nÉcrit : %s (%d Ko)" % (CIBLE.name, CIBLE.stat().st_size // 1024))


main()
