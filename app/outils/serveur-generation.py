#!/usr/bin/env python3
"""Sert l'application et recueille les donnees generees.

`python -m http.server` ne sait que lire ; il faut ici des routes qui ecrivent,
pour que les pages de generation deposent leur resultat directement dans
src/js/. Sans ca, il faudrait passer les fichiers par le presse-papier ou par
le dossier des telechargements.

Deux reserves, deux routes, volontairement independantes : les attaques pesent
a elles seules plus que tout le reste, et rafraichir les unes ne doit jamais
risquer les autres.

Usage : py outils/serveur-generation.py       (depuis le dossier « app »)
  reserve principale : http://127.0.0.1:8124/outils/generer-donnees.html
  attaques           : http://127.0.0.1:8124/outils/generer-attaques.html
"""

import http.server
import json
import socketserver
import sys
from pathlib import Path

APP = Path(__file__).resolve().parent.parent
CIBLE = APP / "src" / "js" / "donnees-embarquees.js"
CIBLE_ATTAQUES = APP / "src" / "js" / "donnees-attaques.js"
PORT = 8124

ENTETE = """// Donnees de reference embarquees — GENERE, ne pas editer a la main.
//
// Especes, formes, types, disponibilite et Pokedex regionaux : tout ce qui est
// identique pour tous les dresseurs et ne bouge qu'a la sortie d'un jeu. C'est
// la reserve dans laquelle cache.js puise quand le stockage local est vide,
// c'est-a-dire au premier lancement — l'application n'a donc besoin d'aucun
// reseau pour afficher un Pokedex complet.
//
// Pour regenerer apres la sortie d'un jeu :
//   cd app && py outils/serveur-generation.py
//   puis ouvrir http://127.0.0.1:8124/outils/generer-donnees.html
//
// Genere le %s
const DONNEES_EMBARQUEES = """

ENTETE_ATTAQUES = """// Attaques apprises — GENERE, ne pas editer a la main.
//
// Fichier a part, et charge a la demande : les capacites pesent a elles seules
// plus que tout le reste de la reserve. Les embarquer dans
// donnees-embarquees.js ralentirait chaque demarrage pour un panneau que l'on
// n'ouvre pas toujours ; fiche.js va donc les chercher a la premiere fois qu'on
// deplie « Attaques apprises ».
//
// Encodage : voir outils/generer-attaques.js. En resume, les CT sont des
// drapeaux (un bit par capacite de la palette du jeu), le reste une liste
// « capacite.methode[.niveau] » en base 36, et les blocs identiques ne sont
// ecrits qu'une fois.
//
// Pour regenerer apres la sortie d'un jeu :
//   cd app && py outils/serveur-generation.py
//   puis ouvrir http://127.0.0.1:8124/outils/generer-attaques.html
//
// Genere le %s
const DONNEES_ATTAQUES = """


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(APP), **kwargs)

    def do_POST(self):
        if self.path == "/enregistrer":
            self._recevoir(self._ecrire_reserve)
        elif self.path == "/enregistrer-attaques":
            self._recevoir(self._ecrire_attaques)
        else:
            self.send_error(404)

    def _recevoir(self, ecrire):
        try:
            taille = int(self.headers.get("Content-Length") or 0)
            brut = self.rfile.read(taille).decode("utf-8")
            paquet = json.loads(brut)  # on refuse d'ecrire un JSON casse
        except (ValueError, UnicodeDecodeError) as e:
            self._json(400, {"erreur": f"charge illisible : {e}"})
            return
        erreur = ecrire(paquet)
        if erreur:
            self._json(400, {"erreur": erreur})

    def _ecrire_reserve(self, paquet):
        # Quelques garde-fous : mieux vaut refuser que d'embarquer une reserve
        # a moitie vide, qui ne se verrait qu'a l'usage.
        manques = [c for c in ("entrees", "types", "formes", "dispo", "dex", "fiches")
                   if not paquet.get(c)]
        if manques:
            return f"donnees incompletes : {', '.join(manques)}"
        if len(paquet["entrees"]) < 1000:
            return f"seulement {len(paquet['entrees'])} entrees"

        ko = self._deposer(CIBLE, ENTETE, paquet)
        print(f"ecrit : {CIBLE.name} ({ko} Ko, {len(paquet['entrees'])} entrees, "
              f"{len(paquet['dex'])} Pokedex)", flush=True)
        self._json(200, {"ok": True, "ko": ko, "fichier": str(CIBLE)})
        return None

    def _ecrire_attaques(self, paquet):
        manques = [c for c in ("capacites", "machines", "groupes", "versions",
                               "palettes", "blocs", "especes") if not paquet.get(c)]
        if manques:
            return f"donnees incompletes : {', '.join(manques)}"
        # Un millier d'especes au minimum : en dessous, la generation s'est
        # arretee en route et ecraserait une reserve complete par un fragment.
        if len(paquet["especes"]) < 1000:
            return f"seulement {len(paquet['especes'])} entrees avec des attaques"

        ko = self._deposer(CIBLE_ATTAQUES, ENTETE_ATTAQUES, paquet)
        print(f"ecrit : {CIBLE_ATTAQUES.name} ({ko} Ko, {len(paquet['especes'])} entrees, "
              f"{len(paquet['blocs'])} blocs)", flush=True)
        self._json(200, {"ok": True, "ko": ko, "fichier": str(CIBLE_ATTAQUES)})
        return None

    def _deposer(self, cible, entete, paquet):
        """Ecrit le fichier en un seul geste : un remplacement atomique, pour ne
        jamais laisser derriere soi une reserve tronquee."""
        cible.parent.mkdir(parents=True, exist_ok=True)
        texte = (entete % paquet.get("genereLe", "?")) + json.dumps(
            paquet, ensure_ascii=False, separators=(",", ":")) + ";\n"
        tmp = cible.with_suffix(".js.tmp")
        tmp.write_text(texte, encoding="utf-8")
        tmp.replace(cible)
        return len(texte.encode("utf-8")) // 1024

    def _json(self, code, charge):
        corps = json.dumps(charge, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(corps)))
        self.end_headers()
        self.wfile.write(corps)

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass


class Serveur(socketserver.ThreadingTCPServer):
    daemon_threads = True
    allow_reuse_address = True


if __name__ == "__main__":
    print(f"racine   : {APP}")
    print(f"cibles   : {CIBLE.name}, {CIBLE_ATTAQUES.name}")
    print(f"reserve  : http://127.0.0.1:{PORT}/outils/generer-donnees.html")
    print(f"attaques : http://127.0.0.1:{PORT}/outils/generer-attaques.html", flush=True)
    try:
        with Serveur(("127.0.0.1", PORT), Handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        sys.exit(0)
