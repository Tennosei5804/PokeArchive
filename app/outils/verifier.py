# -*- coding: utf-8 -*-
"""Les relectures statiques du projet, sans rien lancer.

    cd app && py outils/verifier.py

Elles ne remplacent pas le banc d'essai (outils/banc.py) : celui-ci fait tourner
l'application, celles-ci se contentent de lire les fichiers. Elles sont rapides,
ne dependent de rien, et attrapent une categorie precise de betises :

  · un getElementById qui vise un identifiant absent du HTML — la cause du
    « Cannot read properties of null » qu'on ne voit qu'a l'execution ;
  · un appel a une fonction qui n'existe nulle part — la cause du
    « X is not a function » ;
  · du code mort : elements declares puis oublies, fonctions jamais appelees,
    constantes jamais relues.

La sortie est bavarde a dessein : elle liste des SUSPECTS, pas des erreurs. Une
fonction appelee seulement depuis le HTML (onclick) ou par un nom construit
apparaitra a tort. On lit, on juge, on ne corrige pas les yeux fermes.

Quatre groupes, parce qu'un fichier ne se juge que dans la page qui le charge :

  · l'interface       — index.html et ses vingt scripts ;
  · l'API             — api/src/*.js, des modules ES sans HTML : seuls les
                        appels et le code mort s'y relisent, et les noms
                        importes d'un module a l'autre comptent comme declares ;
  · les pages de generation — generer-donnees.html et generer-attaques.html, qui
                        ne chargent qu'une partie de l'interface ;
  · le banc           — banc-verifications.js, relu sur la page que banc.py sert
                        vraiment, injections comprises.

Un appel vers une fonction bien reelle mais restee dans un script que la page
n'inclut pas est signale a part : il ne casse que si la page emprunte ce
chemin-la, et il ne fait pas echouer la relecture.

Code de sortie : 1 si un identifiant ou un appel est introuvable (ceux-la
cassent vraiment), 0 sinon — le code mort ne fait pas echouer.
"""
import re
import pathlib
import sys

# La console Windows est en cp1252 : sans ça, une flèche ou un tiret cadratin
# fait planter le script au moment d'afficher son résultat.
try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

RACINE = pathlib.Path(__file__).resolve().parent.parent      # app/
SRC = RACINE / "src"
OUTILS = RACINE / "outils"
API = RACINE.parent / "api" / "src"

# Les deux pages que fabriquer-page.py construit depuis index.html : elles
# rejouent l'interface avec un script de generation en plus, et deux de moins.
PAGES_GENERATION = ("generer-donnees.html", "generer-attaques.html")

# Ce que banc.py glisse dans la page avant </body>. La relecture doit voir la
# meme page que lui : sans donnees-home.js, le releve Pokekalos manquerait, et
# sans le fichier de verifications il n'y aurait rien a relire.
INJECTES_PAR_LE_BANC = ("js/donnees-home.js", "js/donnees-pokedex.js",
                        "../outils/banc-verifications.js")

# Les reserves generees sont enormes et ne contiennent aucune logique : on ne
# les relit pas, on se contente d'y prendre les noms qu'elles exposent.
GENEREES = ("donnees-embarquees.js", "donnees-attaques.js",
            # Les notices : un megaoctet de texte, et trois fonctions posees en
            # tete pour que la lecture d'en-tete ci-dessous les voie. Le HTML ne
            # la declare pas — fiche.js va la chercher a la premiere fiche
            # ouverte — mais ce qu'elle expose doit rester connu, sinon
            # descriptionEspece() passe pour introuvable.
            "donnees-descriptions.js",
            # Les apparitions de Cobblemon, meme regime : chargee a la demande
            # depuis fiche.js, jamais declaree dans le HTML.
            "donnees-cobblemon.js")

CONNUS = set("""
if for while switch catch return typeof function require Math JSON Object Array String Number
Boolean Date Set Map WeakMap Promise parseInt parseFloat isNaN isFinite encodeURIComponent
decodeURIComponent encodeURI decodeURI setTimeout clearTimeout setInterval clearInterval fetch
console document window alert confirm prompt Error TypeError RegExp Symbol Intl localStorage
sessionStorage navigator location btoa atob structuredClone queueMicrotask requestAnimationFrame
await new delete void in of do else try finally throw class extends super this URL URLSearchParams
Uint8Array TextEncoder TextDecoder Infinity NaN undefined null true false crypto performance
AbortController Image Audio Blob FileReader CustomEvent Event KeyboardEvent MouseEvent
BigInt Option Proxy Reflect globalThis
async constructor static process Buffer setImmediate queueMicrotask
Response Request Headers FormData AbortSignal AggregateError
""".split())


def lire():
    html = (SRC / "index.html").read_text(encoding="utf-8")
    ordre = re.findall(r'<script src="js/([^"]+)"', html)
    fichiers = {}
    for f in ordre:
        if f in GENEREES:
            continue
        chemin = SRC / "js" / f
        if chemin.exists():
            fichiers[f] = chemin.read_text(encoding="utf-8")
    return html, ordre, fichiers


def lire_page(chemin, extra=()):
    """Une page et les scripts qu'elle charge, dans l'ordre du HTML.

    Les chemins se resolvent depuis le dossier de la page : les pages de
    generation vivent dans outils/ et remontent en « ../src/js/ ». L'empreinte
    « ?v=… » que le banc colle a chaque script ne fait pas partie du nom.

    `extra` sert au banc, qui charge deux scripts que le HTML ne cite pas.
    """
    html = chemin.read_text(encoding="utf-8")
    cites = [re.sub(r"\?.*$", "", src)
             for src in re.findall(r'<script src="([^"]+)"', html)]
    ordre, fichiers = [], {}
    for rel in cites + list(extra):
        f = (chemin.parent / rel).resolve()
        if f.name in GENEREES or f.name in fichiers or not f.exists():
            continue
        fichiers[f.name] = f.read_text(encoding="utf-8")
        ordre.append(f.name)
    return html, ordre, fichiers


def ligne(txt, pos):
    return txt[:pos].count("\n") + 1


def sans_commentaires_ni_chaines(txt):
    """Le code seul, commentaires et chaînes remplacés par des blancs.

    Indispensable avant de chercher des appels de fonction : sans ça, « la
    purification (voir plus bas) » d'un commentaire ressemble à un appel de
    purification(), et le script noie les vrais problèmes sous des dizaines de
    mots français. Les positions sont préservées — on remplace caractère pour
    caractère — pour que les numéros de ligne restent justes.
    """
    out = []
    i, n = 0, len(txt)
    # Ce qui peut précéder une expression régulière. Après une valeur — un nom,
    # un nombre, une parenthèse fermante — le même « / » est une division.
    avant_regex = set("(,=[:!&|?{};+-*%<>~^\n\t ")
    dernier_signifiant = ""
    while i < n:
        c = txt[i]
        deux = txt[i:i + 2]
        # Une expression régulière : /-mega(-|$)/ contient « mega( », qui passait
        # pour un appel de fonction et faisait crier le script à tort.
        if c == "/" and deux not in ("//", "/*") and (
                dernier_signifiant == "" or dernier_signifiant in avant_regex
                or dernier_signifiant.isspace()):
            j = i + 1
            fini = False
            while j < n and txt[j] != "\n":
                if txt[j] == "\\":
                    j += 2
                    continue
                if txt[j] == "[":
                    while j < n and txt[j] != "]" and txt[j] != "\n":
                        j += 2 if txt[j] == "\\" else 1
                elif txt[j] == "/":
                    j += 1
                    while j < n and txt[j].isalpha():   # les drapeaux : gimsuy
                        j += 1
                    fini = True
                    break
                j += 1
            if fini:
                out.append(" " * (j - i))
                dernier_signifiant = "/"
                i = j
                continue
        if deux == "//":
            j = txt.find("\n", i)
            j = n if j < 0 else j
            out.append(" " * (j - i))
            i = j
        elif deux == "/*":
            j = txt.find("*/", i + 2)
            j = n if j < 0 else j + 2
            out.append("".join(ch if ch == "\n" else " " for ch in txt[i:j]))
            i = j
        elif c in "'\"`":
            j = i + 1
            while j < n:
                if txt[j] == "\\":
                    j += 2
                    continue
                if txt[j] == c:
                    j += 1
                    break
                j += 1
            out.append("".join(ch if ch == "\n" else " " for ch in txt[i:j]))
            i = j
        else:
            out.append(c)
            if not c.isspace():
                dernier_signifiant = c
            i += 1
    return "".join(out)


def ids_absents(html, fichiers):
    """Les getElementById qui visent un identifiant que la page n'a pas.

    Detachee de la relecture complete : toute page se relit ainsi, alors que la
    liste des identifiants jamais cites n'a de sens que sur l'interface, seule
    page a charger tous ses scripts.
    """
    ids = set(re.findall(r'\bid="([^"]+)"', html))
    fautes = 0

    print("— getElementById sur un identifiant absent du HTML")
    for nom, txt in fichiers.items():
        for m in re.finditer(r"""getElementById\(\s*['"]([^'"]+)['"]\s*\)""", txt):
            if m.group(1) not in ids:
                print("    %s:%d  #%s" % (nom, ligne(txt, m.start()), m.group(1)))
                fautes += 1
    if not fautes:
        print("    rien")
    return fautes


def identifiants(html, fichiers, tout):
    """Les getElementById qui visent un identifiant absent, et l'inverse."""
    ids = set(re.findall(r'\bid="([^"]+)"', html))
    fautes = ids_absents(html, fichiers)

    print("— identifiants du HTML que le JS ne cite jamais")
    orphelins = [i for i in sorted(ids)
                 if not re.search(r"[\"'`]" + re.escape(i) + r"[\"'`]", tout)
                 and not re.search(r"\b" + re.escape(i) + r"\b", tout)]
    for i in orphelins:
        print("    #%s" % i)
    if not orphelins:
        print("    rien")
    return fautes


def noms_locaux(propre):
    """Paramètres et variables locales : tout ce qui n'est pas global.

    Sans eux, un paramètre appelé comme une fonction — `action()` dans
    boutonAction, ou le `tenir`/`rejeter` d'une promesse — passe pour un appel
    à une fonction inexistante. C'était cinq faux positifs sur cinq.
    """
    noms = set()
    # function nom(a, b) · function(a, b) · catch(e)
    for m in re.finditer(r"(?:function\s*[A-Za-z_$][\w$]*\s*|function\s*|catch\s*)\(([^)]*)\)", propre):
        noms |= set(re.findall(r"[A-Za-z_$][\w$]*", m.group(1)))
    # (a, b) => …  et  a => …
    for m in re.finditer(r"\(([^()]*)\)\s*=>", propre):
        noms |= set(re.findall(r"[A-Za-z_$][\w$]*", m.group(1)))
    for m in re.finditer(r"(?<![\w$.])([A-Za-z_$][\w$]*)\s*=>", propre):
        noms.add(m.group(1))
    # const/let/var à n'importe quelle indentation, pas seulement en marge
    noms |= set(re.findall(r"(?:const|let|var)\s+([A-Za-z_$][\w$]*)", propre))
    # Toute fonction nommée, où qu'elle soit — y compris une IIFE nommée, dont
    # le nom n'existe qu'à l'intérieur d'elle-même :
    #   (function restaurerNiveauFormes(){ … })();
    noms |= set(re.findall(r"function\s+([A-Za-z_$][\w$]*)\s*\(", propre))
    return noms


def noms_declares(fichiers):
    declares = set()
    for txt in fichiers.values():
        declares |= set(re.findall(r"^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)", txt, re.M))
        declares |= set(re.findall(
            r"^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function|\()", txt, re.M))
        declares |= set(re.findall(r"^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)", txt, re.M))
    # Ce que les reserves generees exposent : leur en-tete suffit — a charge
    # pour elles d'y poser ce qu'elles exposent, la suite etant un pave de
    # donnees d'un seul tenant.
    #
    # Les fonctions comptent autant que les constantes : donnees-descriptions.js
    # expose descriptionEspece(), et jusqu'ici la lecture ne retenait que les
    # declarations en const/let/var/window — aucune reserve n'avait encore
    # expose de fonction, et tout appel a celle-ci passait pour introuvable.
    for g in GENEREES:
        chemin = SRC / "js" / g
        if chemin.exists():
            tete = chemin.read_text(encoding="utf-8")[:4000]
            declares |= set(re.findall(
                r"^\s*(?:const|let|var|window\.)\s*([A-Za-z_$][\w$]*)", tete, re.M))
            declares |= set(re.findall(
                r"^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)", tete, re.M))
    return declares


def ou_declare(fichiers):
    """Quel fichier declare quel nom — pour dire ou une fonction se trouve."""
    ou = {}
    for nom, txt in fichiers.items():
        for n in re.findall(r"^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)", txt, re.M):
            ou.setdefault(n, nom)
        for n in re.findall(r"^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)", txt, re.M):
            ou.setdefault(n, nom)
    return ou


def noms_api(fichiers):
    """Ce que les modules ES de l'API connaissent : leurs declarations, et les
    noms qu'ils importent.

    Sans les imports, `creerSchema()` dans serveur.js passerait pour introuvable
    alors qu'il vient de base.js par une ligne `import`. Les classes comptent
    aussi : `new ErreurCompte(…)` est un appel comme un autre.
    """
    noms = set()
    for txt in fichiers.values():
        noms |= set(re.findall(
            r"^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z_$][\w$]*)", txt, re.M))
        noms |= set(re.findall(
            r"^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)", txt, re.M))
        noms |= set(re.findall(r"^\s*(?:export\s+)?class\s+([A-Za-z_$][\w$]*)", txt, re.M))
        for m in re.finditer(r"import\s+([^;]+?)\s+from\s", txt):
            # « { creerSchema as schema } » : c'est le nom d'arrivee qui sert.
            noms |= set(re.findall(r"[A-Za-z_$][\w$]*",
                                   re.sub(r"[A-Za-z_$][\w$]*\s+as\s+", "", m.group(1))))
    return noms


def appels(fichiers, declares, ailleurs=None):
    """Les appels a une fonction qu'aucun fichier ne definit.

    `ailleurs` sert aux pages qui ne chargent qu'une partie de l'interface : un
    appel qui vise une fonction bien reelle, mais restee dans un script absent
    de la page, ne casse que si la page emprunte ce chemin-la. Il est signale a
    part, et ne fait pas echouer la relecture.
    """
    ailleurs = ailleurs or {}
    manquants, non_chargees = {}, {}
    for nom, txt in fichiers.items():
        propre = sans_commentaires_ni_chaines(txt)
        # Les locaux se jugent fichier par fichier : un paramètre nommé
        # « action » ailleurs ne dit rien sur celui-ci.
        locaux = noms_locaux(propre)
        for m in re.finditer(r"(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(", propre):
            fn = m.group(1)
            if fn in CONNUS or fn in declares or fn in locaux:
                continue
            ou = non_chargees if fn in ailleurs else manquants
            ou.setdefault(fn, []).append("%s:%d" % (nom, ligne(propre, m.start())))

    print("— appels a une fonction introuvable")
    for fn, ou in sorted(manquants.items()):
        print("    %s()  <- %s (%dx)" % (fn, ou[0], len(ou)))
    if not manquants:
        print("    rien")

    if ailleurs:
        print("— appels a une fonction que la page ne charge pas")
        for fn, ou in sorted(non_chargees.items()):
            print("    %s()  <- %s (%dx) — vit dans %s" % (fn, ou[0], len(ou), ailleurs[fn]))
        if not non_chargees:
            print("    rien")
    return len(manquants)


def mort(fichiers, tout, dom=True):
    """Ce qui est declare puis jamais relu. Suspects, pas coupables.

    `dom` tombe pour l'API : elle n'a pas de page, donc pas d'element a oublier.
    """
    def occurrences(v):
        return len(re.findall(r"(?<![\w$.])" + re.escape(v) + r"(?![\w$])", tout))

    if dom:
        print("— éléments du DOM déclarés puis jamais réutilisés")
        vide = True
        for nom, txt in fichiers.items():
            for m in re.finditer(
                    r"^\s*(?:const|let)\s+([A-Za-z_$][\w$]*)\s*=\s*document\.getElementById",
                    txt, re.M):
                if occurrences(m.group(1)) <= 1:
                    print("    %s:%d  %s" % (nom, ligne(txt, m.start()), m.group(1)))
                    vide = False
        if vide:
            print("    rien")

    print("— fonctions définies jamais appelées")
    vide = True
    for nom, txt in fichiers.items():
        for m in re.finditer(r"^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)", txt, re.M):
            fn = m.group(1)
            # Une fonction citee par son nom (passee en callback) compte comme
            # appelee : valider: validerNomProfil, par exemple.
            if occurrences(fn) <= 1 and "'%s'" % fn not in tout and '"%s"' % fn not in tout:
                print("    %s:%d  %s()" % (nom, ligne(txt, m.start()), fn))
                vide = False
    if vide:
        print("    rien")

    print("— constantes de haut niveau jamais relues")
    vide = True
    for nom, txt in fichiers.items():
        for m in re.finditer(r"^(?:const|let)\s+([A-Z_][A-Z0-9_]*)\s*=", txt, re.M):
            if occurrences(m.group(1)) <= 1:
                print("    %s:%d  %s" % (nom, ligne(txt, m.start()), m.group(1)))
                vide = False
    if vide:
        print("    rien")


def groupe_api():
    """L'API : des modules ES, et pas de page.

    Ni identifiant ni element du DOM a relire ici — restent les appels, ou les
    imports font office de declarations, et le code mort.
    """
    fichiers = {f.name: f.read_text(encoding="utf-8") for f in sorted(API.glob("*.js"))}
    if not fichiers:
        print("Relecture de l'API — rien sous %s, groupe ignoré." % API)
        print()
        return 0

    print("Relecture de l'API — %d modules ES. Pas de page ici : seuls les appels"
          % len(fichiers))
    print("et le code mort se relisent.")
    print()
    fautes = appels(fichiers, noms_api(fichiers))
    print()
    mort(fichiers, "\n".join(fichiers.values()), dom=False)
    print()
    return fautes


def groupe_pages(interface):
    """Les pages de generation : l'interface, moins deux scripts, plus un.

    Elles portent tout le HTML de l'application — les identifiants s'y relisent
    donc comme ailleurs — mais laissent compte.js et app.js de cote. Les appels
    qui visent ces deux-la sortent dans leur propre liste : ils sont attendus.
    """
    connu = ou_declare(interface)
    fautes = 0
    for nom in PAGES_GENERATION:
        chemin = OUTILS / nom
        if not chemin.exists():
            continue
        html, ordre, fichiers = lire_page(chemin)
        ailleurs = {f: ou for f, ou in connu.items() if ou not in fichiers}
        print("Relecture de %s — %d fichiers." % (nom, len(fichiers)))
        print()
        fautes += ids_absents(html, fichiers)
        fautes += appels(fichiers, noms_declares(fichiers), ailleurs)
        print()
    return fautes


def groupe_banc():
    """Le banc : la page de l'application, telle que banc.py la sert.

    Le fichier de verifications ne s'ouvre pas seul — il appelle les fonctions
    de l'application et lit ses identifiants. Le relire hors de la page ferait
    passer chacun de ses appels pour introuvable.
    """
    if not (OUTILS / "banc-verifications.js").exists():
        return 0
    html, ordre, fichiers = lire_page(SRC / "index.html", INJECTES_PAR_LE_BANC)
    print("Relecture du banc — %d fichiers : la page de l'application, plus les"
          % len(fichiers))
    print("deux scripts que banc.py y injecte.")
    print()
    fautes = ids_absents(html, fichiers)
    fautes += appels(fichiers, noms_declares(fichiers))
    print()
    return fautes


def main():
    if not (SRC / "index.html").exists():
        sys.exit("index.html introuvable sous %s — lance depuis le dossier app/." % SRC)

    html, ordre, fichiers = lire()
    tout = "\n".join(fichiers.values())

    print("Relecture de l'interface — %d fichiers, dans l'ordre de chargement."
          % len(fichiers))
    print()
    fautes = identifiants(html, fichiers, tout)
    print()
    fautes += appels(fichiers, noms_declares(fichiers))
    print()
    mort(fichiers, tout)
    print()
    print("Ordre de chargement : " + " → ".join(ordre))
    print()

    fautes += groupe_api()
    fautes += groupe_pages(fichiers)
    fautes += groupe_banc()

    if fautes:
        print("%d problème(s) qui casseront à l'exécution." % fautes)
        sys.exit(1)
    print("Aucun identifiant ni appel introuvable, dans aucun des quatre groupes.")


main()
