# -*- coding: utf-8 -*-
"""Ouvrir le site en local.

    cd site && py outils/servir.py
    cd site && py outils/servir.py --port 9000

IL REASSEMBLE AVANT DE SERVIR, toujours. Un site servi depuis un public/ perime
montre du code qui n'est plus sur le disque, et l'on cherche pendant dix
minutes pourquoi une correction « ne prend pas ». Le cout est d'une seconde.

POURQUOI UN SERVEUR ET NON file:// : les navigateurs refusent aux pages ouvertes
en file:// l'acces au localStorage sur certaines configurations, et bloquent
tout chargement de script juge distant. Le site s'appuie sur les deux. Un
serveur local, meme minimal, supprime toute la classe de problemes.
"""
import argparse
import http.server
import pathlib
import sys
import webbrowser

ICI = pathlib.Path(__file__).resolve().parent.parent
PUBLIC = ICI / "public"

sys.path.insert(0, str(ICI / "outils"))
from assembler import batir                                    # noqa: E402


class Serveur(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(PUBLIC), **kw)

    def end_headers(self):
        # Les fichiers portent deja ?v=<date> dans index.html, ce qui suffit a
        # les faire redescendre quand ils changent. Mais index.html lui-meme n'a
        # pas de tel repere : sans cet en-tete, le navigateur garde l'ancienne
        # page et donc les anciens ?v=, et l'assemblage ne se voit jamais.
        if self.path in ("/", "/index.html"):
            self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, format, *args):
        # Le journal par defaut ecrit une ligne par fichier : plus de mille au
        # premier chargement. On ne garde que ce qui a echoue.
        code = str(args[1]) if len(args) > 1 else ""
        if code.startswith(("4", "5")):
            super().log_message(format, *args)


def main() -> int:
    p = argparse.ArgumentParser(description="Servir le site PokeArchive en local.")
    p.add_argument("--port", type=int, default=8130)
    p.add_argument("--sans-navigateur", action="store_true",
                   help="ne pas ouvrir de fenetre")
    p.add_argument("--sans-assemblage", action="store_true",
                   help="servir public/ tel quel, sans le refaire")
    args = p.parse_args()

    if not args.sans_assemblage:
        if batir() != 0:
            return 1
        print()
    elif not PUBLIC.is_dir():
        print("public/ n'existe pas : lance d'abord py outils/assembler.py")
        return 1

    adresse = "http://127.0.0.1:%d" % args.port
    try:
        serveur = http.server.ThreadingHTTPServer(("127.0.0.1", args.port), Serveur)
    except OSError as e:
        print("Port %d indisponible (%s). Essaie --port 9000." % (args.port, e))
        return 1

    print("Site servi sur %s" % adresse)
    print("Ctrl+C pour arreter.")
    if not args.sans_navigateur:
        webbrowser.open(adresse)
    try:
        serveur.serve_forever()
    except KeyboardInterrupt:
        print("\nArrete.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
