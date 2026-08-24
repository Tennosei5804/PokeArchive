# -*- coding: utf-8 -*-
"""Les notices du Pokedex, jeu par jeu, depuis Pokepedia.

    cd app && py outils/relever-descriptions.py

Reecrit src/js/donnees-descriptions.js : pour chaque espece, la notice de
CHAQUE jeu, en francais.

Pourquoi Pokepedia et non PokeAPI. La premiere version de ce fichier lisait
pokemon_species_flavor_text.csv, chez PokeAPI. Mesure faite, ce CSV ne porte de
francais que pour quatorze versions sur trente-cinq : Noir/Blanc, X/Y,
Rubis Omega/Saphir Alpha, Soleil/Lune, Ultra-Soleil/Ultra-Lune, Let's Go et
Epee/Bouclier. Rouge, Bleu, Jaune, Or, Argent, Cristal, Rubis, Saphir,
Emeraude, Rouge Feu, Vert Feuille, Diamant, Perle, Platine, HeartGold,
SoulSilver, Noir 2, Blanc 2, Legendes Arceus, Ecarlate et Violet n'y existent
qu'en anglais — alors que ces jeux ONT ete traduits.

Pokepedia les a tous. Un Pokedex de Rouge et Bleu peut donc citer Rouge et
Bleu : « Il a une etrange graine plantee sur son dos. Elle grandit avec lui
depuis la naissance. »

Ce que le script fait, et pourquoi ainsi :

  · il lit la section « Descriptions du Pokedex » de chaque page. Pokepedia la
    decoupe par generation : les generations 1 a 7 vivent sur des sous-pages
    « Nom/Generation N », les suivantes sur la page principale. Une espece de
    la premiere generation demande donc huit requetes, une de la neuvieme une
    seule ;

  · la section est une liste de definitions : <dt> le jeu, <dd> la notice. Le
    libelle du <dt> ne nomme pas toujours un seul jeu — « Pokemon Diamant,
    Perle et Platine », « Pokemon Soleil et Pokemon Ultra-Soleil », « Pokemon
    EpeeHOME ». Releve sur vingt especes, soixante-sept libelles distincts. On
    ne les enumere donc pas : on cherche les noms de jeux DANS le libelle, du
    plus precis au plus general, en effacant au fur et a mesure ce qu'on a
    reconnu — sans quoi « Rouge Feu » serait lu comme « Rouge », et
    « Ultra-Soleil » comme « Soleil » ;

  · les hors-serie sont ecartes : Stadium, Ranger, GO, Masters EX, Sleep, Snap,
    Pokopia, Pokedex Deluxe, Super Smash Bros. L'application ne les a pas en
    onglet, et leurs notices ne repondent pas a la meme question ;

  · quand deux versions d'un meme onglet different — Rouge Feu et Vert Feuille
    n'ont pas la meme notice, l'application n'a qu'un onglet « frlg » — on
    garde la premiere citee, celle de la version qui donne son nom a l'onglet ;

  · les textes sont mis en commun : la meme notice revient souvent d'un jeu a
    l'autre, et les recopier ferait tripler le fichier.

Les pages sont mises en cache dans outils/.pages/pokepedia, le meme dossier que
relever-lieux.py. Vider le dossier force une lecture fraiche — pres de quatre
mille cinq cents requetes, alors on evite.
"""
import datetime
import hashlib
import html as H
import json
import pathlib
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

SRC = pathlib.Path(__file__).resolve().parent.parent / "src"
RESERVE = SRC / "js" / "donnees-embarquees.js"
CIBLE = SRC / "js" / "donnees-descriptions.js"
CACHE = pathlib.Path(__file__).resolve().parent / ".pages" / "pokepedia"
API = "https://www.pokepedia.fr/api.php"
ENTETE = {"User-Agent": "PokeArchive/1.0 (releve personnel de collection)"}

# La derniere espece de chaque generation. Elle dit a partir de quelle page
# generation il faut interroger — et donc combien de requetes une espece coute.
DERNIERE = [151, 251, 386, 493, 649, 721, 809, 905, 1025, 1025]

# Au-dela de la septieme, Pokepedia n'a plus de sous-page : tout est sur la
# page principale.
DERNIERE_SOUS_PAGE = 7

# Les VERSIONS, du libelle le plus precis au plus general. L'ordre est TOUT :
# sans lui « Rouge Feu » serait lu comme « Rouge », « Or HeartGold » comme
# « Or », « Noir 2 » comme « Noir » et « Ultra-Soleil » comme « Soleil ». Chaque
# motif reconnu est efface du libelle avant qu'on cherche le suivant.
#
# On descend a la version et non au jeu : Or et Argent n'ont pas la meme notice,
# ni X et Y, ni Epee et Bouclier. Mesure faite sur trois cents especes, douze
# onglets sur vingt-deux portent deux textes distincts — cent pour cent des
# especes pour X/Y et Or/Argent. Ne garder que le premier, comme le faisait la
# premiere version de ce script, revenait a jeter la moitie du releve.
VERSIONS = [
    (r"Rouge Feu",                              "frlg",     "Rouge Feu"),
    (r"Vert Feuille",                           "frlg",     "Vert Feuille"),
    (r"Or HeartGold",                           "hgss",     "Or HeartGold"),
    (r"Argent SoulSilver",                      "hgss",     "Argent SoulSilver"),
    (r"Rubis Om[ée]ga",                         "oras",     "Rubis Oméga"),
    (r"Saphir Alpha",                           "oras",     "Saphir Alpha"),
    (r"Diamant [ÉE]tincelant",                  "bdsp",     "Diamant Étincelant"),
    (r"Perle Scintillante",                     "bdsp",     "Perle Scintillante"),
    (r"Noir 2",                                 "b2w2",     "Noir 2"),
    (r"Blanc 2",                                "b2w2",     "Blanc 2"),
    (r"Ultra-Soleil",                           "usum",     "Ultra-Soleil"),
    (r"Ultra-Lune",                             "usum",     "Ultra-Lune"),
    (r"L[ée]gendes Pok[ée]mon\s*:?\s*Arceus",   "pla",      "Légendes : Arceus"),
    (r"L[ée]gendes Pok[ée]mon\s*:?\s*Z-A",      "za",       "Légendes : Z-A"),
    (r"Let's Go,?\s*Pikachu",                   "letsgo",   "Let's Go, Pikachu"),
    (r"Let's Go,?\s*[ÉE]voli",                  "letsgo",   "Let's Go, Évoli"),
    (r"[ÉE]p[ée]e",                             "swsh",     "Épée"),
    (r"Bouclier",                               "swsh",     "Bouclier"),
    (r"[ÉE]carlate",                            "sv",       "Écarlate"),
    (r"Violet",                                 "sv",       "Violet"),
    (r"[ÉE]meraude",                            "emeraude", "Émeraude"),
    (r"Cristal",                                "cristal",  "Cristal"),
    (r"Platine",                                "pt",       "Platine"),
    (r"\bRubis\b",                              "rse",      "Rubis"),
    (r"\bSaphir\b",                             "rse",      "Saphir"),
    (r"\bDiamant\b",                            "dp",       "Diamant"),
    (r"\bPerle\b",                              "dp",       "Perle"),
    (r"\bOr\b",                                 "gsc",      "Or"),
    (r"\bArgent\b",                             "gsc",      "Argent"),
    (r"\bNoir\b",                               "bw",       "Noir"),
    (r"\bBlanc\b",                              "bw",       "Blanc"),
    (r"\bSoleil\b",                             "sm",       "Soleil"),
    (r"\bLune\b",                               "sm",       "Lune"),
    (r"Jaune",                                  "jaune",    "Jaune"),
    (r"\bRouge\b",                              "rby",      "Rouge"),
    (r"\bBleu\b",                               "rby",      "Bleu"),
    (r"\bX\b",                                  "xy",       "X"),
    (r"\bY\b",                                  "xy",       "Y"),
]

# Les jeux a une seule version : « Let's Go » sans plus de precision doit alors
# valoir pour les deux, et non pour aucune.
LETSGO_LES_DEUX = ("Let's Go, Pikachu", "Let's Go, Évoli")

# Les hors-serie. On les efface du libelle AVANT de chercher les jeux : sans
# ca, « Pokedex Deluxe » ne gene personne, mais « Pokemon Rubis Omega et
# Saphir Alpha et Pokemon GO » compterait un jeu de trop, et « Pokemon Sleep »
# n'a pas d'onglet ou aller.
HORS_SERIE = re.compile(
    r"Pok[ée]mon GO|Masters EX|Pok[ée]mon Sleep|Pok[ée]mon Ranger[^,;]*"
    r"|Pok[ée]mon Stadium 2|Pok[ée]mon Stadium|New Pok[ée]mon Snap"
    r"|Pok[ée]mon Pokopia|Pok[ée]dex Deluxe[^,;]*|Super Smash Bros\.?"
    r"|Pok[ée]mon Conqu[ée]te|Pok[ée]mon Donjon Myst[èe]re[^,;]*|HOME")


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
            fichier.write_text(json.dumps(donnees, ensure_ascii=False),
                               encoding="utf-8")
            # 0,15 s : quatre mille cinq cents requetes, sur un wiki benevole.
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


def versions_du_libelle(libelle):
    """[(cle de jeu, nom de version)] que nomme un <dt>.

    « Pokemon Rouge et Bleu » rend les deux versions avec le meme texte ;
    « Pokemon Epee » n'en rend qu'une, parce que Bouclier a la sienne ailleurs
    dans la meme liste.
    """
    reste = HORS_SERIE.sub(" ", libelle)
    trouves = []
    for motif, cle, version in VERSIONS:
        if not re.search(motif, reste):
            continue
        if (cle, version) not in trouves:
            trouves.append((cle, version))
        # On efface ce qu'on vient de reconnaitre, y compris les occurrences
        # suivantes : « Rouge Feu et Vert Feuille » ne doit pas laisser
        # « Rouge » derriere lui.
        reste = re.sub(motif, " ", reste)
    # « Pokemon : Let's Go, Pikachu et Let's Go, Evoli » nomme les deux ; un
    # « Let's Go » nu vaut pour les deux aussi.
    if not trouves and re.search(r"Let's Go", reste):
        trouves = [("letsgo", v) for v in LETSGO_LES_DEUX]
    return trouves


def notices_de_page(page):
    """[(cle de jeu, version, notice)] pour une page, dans l'ordre de la liste."""
    donnees = api(action="parse", page=page, prop="text")
    if "parse" not in donnees:
        return []
    html = donnees["parse"]["text"]
    debut = html.find('id="Descriptions_du_Pok')
    if debut < 0:
        return []
    bloc = html[debut:]
    # La section s'arrete au titre suivant de meme niveau.
    fin = bloc.find('<div class="mw-heading mw-heading2"', 200)
    if fin > 0:
        bloc = bloc[:fin]

    sortie = []
    for m in re.finditer(r"<dt>(.*?)</dt>\s*<dd>(.*?)</dd>", bloc, re.S):
        libelle = " ".join(H.unescape(re.sub(r"<[^>]+>", "", m.group(1))).split())
        notice = " ".join(H.unescape(re.sub(r"<[^>]+>", "", m.group(2))).split())
        # Les renvois « [1] » des references, et les notes en asterisque.
        notice = re.sub(r"\[\d+\]", "", notice).strip()
        if not notice:
            continue
        for cle, version in versions_du_libelle(libelle):
            sortie.append((cle, version, notice))
    return sortie


def index_des_pages():
    """[(identifiant, nom de page, generation d'apparition)] a interroger.

    Repris de relever-lieux.py : les especes de base, plus les formes
    regionales, qui ont chez Pokepedia leur propre page.
    """
    brut = RESERVE.read_text(encoding="utf-8")
    sortie, vus = [], set()
    mots = {"alola": "d'Alola", "galar": "de Galar", "hisui": "de Hisui",
            "paldea": "de Paldea"}
    for ident, espece, nom, affiche in re.findall(
            r'"id":(\d+),"speciesId":(\d+),"name":"([^"]*)","display":"([^"]*)"',
            brut):
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
        raise SystemExit("index des pages incomplet (%d) — la réserve a changé "
                         "de forme" % len(sortie))
    return sortie


def main():
    pages = index_des_pages()
    print("%d pages à relever." % len(pages))

    par_espece = {}
    sans_notice = []
    for rang, (ident, page, generation) in enumerate(pages, 1):
        titres = ["%s/Génération %d" % (page, g)
                  for g in range(generation, DERNIERE_SOUS_PAGE + 1)]
        titres.append(page)          # la page principale porte la 8e et au-delà

        # { cle de jeu: [(version, texte), ...] }, dans l'ordre de Pokepedia.
        notices = {}
        for titre in titres:
            for cle, version, texte in notices_de_page(titre):
                liste = notices.setdefault(cle, [])
                # La premiere notice d'une version gagne : les generations se
                # lisent de la plus ancienne a la plus recente, et c'est celle
                # du jeu lui-meme qu'on veut, pas sa reprise ailleurs.
                if not any(v == version for v, _ in liste):
                    liste.append((version, texte))
        if notices:
            par_espece[ident] = notices
        else:
            sans_notice.append(page)

        if rang % 100 == 0 or rang == len(pages):
            print("  %4d / %d  ·  %d espèces pourvues" %
                  (rang, len(pages), len(par_espece)))

    # Mise en commun des textes ET des noms de version : la même notice revient
    # souvent d'un jeu à l'autre, et « Rouge » se répète mille fois. Recopiés
    # tels quels, les deux feraient tripler le fichier.
    textes, iTexte = [], {}
    libelles, iLibelle = [], {}
    especes = {}
    for ident, notices in sorted(par_espece.items()):
        compact = {}
        for cle, liste in notices.items():
            paires = []
            for version, texte in liste:
                if texte not in iTexte:
                    iTexte[texte] = len(textes)
                    textes.append(texte)
                if version not in iLibelle:
                    iLibelle[version] = len(libelles)
                    libelles.append(version)
                paires.append([iLibelle[version], iTexte[texte]])
            compact[cle] = paires
        especes[str(ident)] = compact

    sortie = {
        "genereLe": datetime.datetime.now(datetime.timezone.utc)
                    .isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        "textes": textes,
        "versions": libelles,
        "especes": especes,
    }

    entete = [
        "// Notices du Pokedex — RELEVE, ne pas editer a la main.",
        "//",
        "// Une notice par espece ET PAR JEU, en francais, relevee sur",
        "// Pokepedia. PokeAPI ne traduit que quatorze versions sur",
        "// trente-cinq : Rouge, Bleu, Jaune, Or, Argent, Cristal, Rubis,",
        "// Saphir, Emeraude, Rouge Feu, Vert Feuille, Diamant, Perle,",
        "// Platine, HeartGold, SoulSilver, Noir 2, Blanc 2, Legendes Arceus,",
        "// Ecarlate et Violet n'y existent qu'en anglais. Ici, tous sont en",
        "// francais.",
        "//",
        "//   textes          les notices, mises en commun",
        "//   versions        les noms de version, mis en commun",
        "//   especes[id]     { cle de jeu: [[iVersion, iTexte], ...] }",
        "//",
        "// Une entree PAR VERSION et non par jeu : Or et Argent n'ont pas la",
        "// meme notice, ni X et Y, ni Epee et Bouclier. Mesure sur trois cents",
        "// especes : douze onglets sur vingt-deux portent deux textes",
        "// distincts, dont cent pour cent des especes pour X/Y et Or/Argent.",
        "//",
        "// Pour refaire le releve apres la sortie d'un jeu :",
        "//   cd app && py outils/relever-descriptions.py",
        "//",
        "// Genere le " + sortie["genereLe"],
        "",
        "// Ce que ce fichier expose vient AVANT la reserve, et non apres : elle",
        "// pese un megaoctet d'un seul tenant, et outils/verifier.py ne relit",
        "// pas les reserves generees — il se contente d'en lire la tete pour y",
        "// prendre les noms. Poses derriere le pave, descriptionEspece() et",
        "// DESCRIPTIONS_ORDRE lui etaient invisibles, et tout appel a la",
        "// premiere passait pour un appel a une fonction introuvable.",
        "",
        "// Les notices d'une espece pour un jeu donne — UNE PAR VERSION. A",
        "// defaut de notice pour ce jeu, une espece qui n'y figure pas, on rend",
        "// celles du jeu le plus recent qu'on ait, en disant lequel : mieux vaut",
        "// la notice d'un autre jeu que pas de notice du tout.",
        "const DESCRIPTIONS_ORDRE = ['za','sv','pla','bdsp','swsh','letsgo',"
        "'usum','sm','oras','xy','b2w2','bw','hgss','pt','dp','frlg',"
        "'emeraude','rse','cristal','gsc','jaune','rby'];",
        "",
        "function descriptionEspece(speciesId, cleJeu){",
        "  const m = DONNEES_DESCRIPTIONS.especes[String(speciesId)];",
        "  if(!m) return null;",
        "  const rendre = function(cle, propre){",
        "    return {",
        "      jeu: cle, propre: propre,",
        "      entrees: m[cle].map(function(p){",
        "        return { version: DONNEES_DESCRIPTIONS.versions[p[0]],",
        "                 texte: DONNEES_DESCRIPTIONS.textes[p[1]] };",
        "      })",
        "    };",
        "  };",
        "  if(cleJeu && m[cleJeu] && m[cleJeu].length) return rendre(cleJeu, true);",
        "  for(let i = 0; i < DESCRIPTIONS_ORDRE.length; i++){",
        "    const c = DESCRIPTIONS_ORDRE[i];",
        "    if(m[c] && m[c].length) return rendre(c, false);",
        "  }",
        "  return null;",
        "}",
        "",
        "const DONNEES_DESCRIPTIONS = "
        + json.dumps(sortie, ensure_ascii=False, separators=(",", ":")) + ";",
        "",
    ]

    CIBLE.write_text("\n".join(entete), encoding="utf-8", newline="\r\n")

    couples = sum(len(v) for v in especes.values())
    notices_totales = sum(len(p) for v in especes.values() for p in v.values())
    print()
    print("Écrit : %s (%d octets)" % (CIBLE.name, CIBLE.stat().st_size))
    print("%d espèces · %d couples espèce/jeu · %d notices · %d textes "
          "distincts · %d noms de version"
          % (len(especes), couples, notices_totales, len(textes), len(libelles)))
    par_jeu, deux = {}, {}
    for notices in especes.values():
        for cle, paires in notices.items():
            par_jeu[cle] = par_jeu.get(cle, 0) + 1
            if len(paires) > 1:
                deux[cle] = deux.get(cle, 0) + 1
    ordre = []
    for _, cle, _ in VERSIONS:
        if cle not in ordre:
            ordre.append(cle)
    for cle in ordre:
        n = par_jeu.get(cle, 0)
        print("   %-9s %4d espèces · %4d à deux versions" % (cle, n, deux.get(cle, 0)))
    if sans_notice:
        print("%d page(s) sans section « Descriptions du Pokédex » : %s"
              % (len(sans_notice), ", ".join(sans_notice[:12])))
    if len(especes) < 1000:
        print("Moins de mille espèces pourvues : une page a changé de forme, "
              "relire avant de s'y fier.")
        sys.exit(1)


if __name__ == "__main__":
    main()
