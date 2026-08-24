# -*- coding: utf-8 -*-
"""Le banc d'essai : l'application tourne, et se verifie elle-meme.

    cd app && py outils/banc.py

Puis ouvrir http://127.0.0.1:8125 : le rapport s'affiche en haut de la page.
Ctrl+C pour arreter.

Aucune connexion Discord, aucune ecriture en base, aucun risque pour tes
aventures : le pont Tauri est remplace par des reponses en dur, et l'etat vit en
memoire le temps de la page. On peut donc supprimer, vider, renommer sans que
rien ne parte au serveur.

Pourquoi un banc plutot que des tests unitaires : l'application est faite de
scripts classiques qui se parlent par des variables globales, sans modules ni
exports. Il n'y a rien a importer isolement — le seul endroit ou le cablage
existe vraiment, c'est la page chargee. Le banc la charge, la pilote, et regarde.

Ce qu'il verifie est dans outils/banc-verifications.js. A ajouter une
verification chaque fois qu'un bug passe : c'est la seule facon qu'il grossisse
au bon endroit.
"""
import functools
import http.server
import re
import pathlib
import socketserver
import sys
import time

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

OUTILS = pathlib.Path(__file__).resolve().parent
SRC = OUTILS.parent / "src"
PORT = 8125

# --- Le pont Tauri simule ---------------------------------------------------
# L'etat est mutable : supprimer une aventure la retire vraiment de la liste.
# Sans ca, on ne verrait pas si l'ecran retombe bien sur une autre — le seul
# point qui merite d'etre verifie apres une suppression.
STUB = r"""
const MOI = { captures:['bulbasaur','ivysaur','charmander','squirtle','mew','celebi',
                        'pikachu-original-cap','zarude','meltan'],
              shiny:['bulbasaur','celebi'] };
const AMI = { captures:['bulbasaur','venusaur','charmander','pikachu'], shiny:['pikachu'] };
const CHASSES = [{ dex:'swsh', espece:'pikachu', compteur:412, methode:'masuda', chromatique:true }];

const dexDe = (c) => ({ version:1, player:'Tennosei_', exportedAt:new Date().toISOString(),
  dex:{ national:{ caught:c.captures, shiny:c.shiny } },
  captures:c.captures, shiny:c.shiny, chasses:CHASSES });

let DERNIER_ID = 2;
const PROFILS = [
  { id:1, nom:'Aventure 1', public:1, par_defaut:1, mode:'living', niveau_formes:3,
    captures:4, shiny:1, cree_le:'', maj_le:'' },
  { id:2, nom:'Ma chasse', public:1, par_defaut:0, mode:'capture', niveau_formes:1,
    captures:0, shiny:0, cree_le:'', maj_le:'' },
];

const REPONSES = {
  etat:            () => ({ connecte:true }),
  moi:             () => ({ dresseur:{ id:1, pseudo:'Tennosei_', discordId:'1', avatar:null },
                            resume:{ captures:4, shiny:1, majLe:null } }),
  profils:         () => ({ profils: PROFILS.map(x => ({ ...x })) }),
  lire_dex:        () => ({ ...dexDe(MOI), profilId:1 }),
  ecrire_dex:      () => ({ profilId:1, captures:MOI.captures.length, shiny:MOI.shiny.length }),
  historique:      () => ({ lignes:[], reste:false, total:0, encore:false }),
  dresseurs:       () => ({ dresseurs:[{ pseudo:'Amie_Test', discord_id:'2', avatar:null,
                              profil:'Aventure 1', captures:4, shiny:1 }] }),
  profils_de:      () => ({ dresseur:{ pseudo:'Amie_Test', discordId:'2', avatar:null },
                            profils:[{ id:9, nom:'Aventure 1', public:1, par_defaut:1,
                                       mode:'capture', captures:4, shiny:1 }] }),
  // L'amie suit le niveau 1 : de quoi verifier que la barre de comparaison
  // le signale au lieu de compter en silence sur le notre.
  dex_de:          () => ({ pseudo:'Amie_Test',
                            profil:{ id:9, nom:'Aventure 1', mode:'capture', niveau_formes:1 },
                            dex:dexDe(AMI) }),
  changer_pseudo:  (a) => ({ pseudo:(a && a.pseudo) || 'Tennosei_' }),
  creer_profil:    (a) => { const n = { id: ++DERNIER_ID, nom:(a&&a.nom)||'Nouvelle', public:1,
                              par_defaut:0, mode:(a&&a.mode)||'capture', niveau_formes:3,
                              captures:0, shiny:0,
                              cree_le:'', maj_le:'' };
                            PROFILS.push(n); return { profil:{ ...n } }; },
  modifier_profil: (a) => { const x = PROFILS.find(y => y.id === (a&&a.id));
                            if(x && a && a.nom != null) x.nom = a.nom;
                            if(x && a && a.mode != null) x.mode = a.mode;
                            if(x && a && a.niveauFormes != null) x.niveau_formes = a.niveauFormes;
                            return { ok:true }; },
  supprimer_profil:(a) => { const i = PROFILS.findIndex(y => y.id === (a&&a.id));
                            if(i < 0) throw new Error('PROFIL_INTROUVABLE');
                            if(PROFILS.length <= 1) throw new Error("C'est ta seule aventure.");
                            const [ote] = PROFILS.splice(i, 1);
                            if(ote.par_defaut && PROFILS.length) PROFILS[0].par_defaut = 1;
                            return { ok:true }; },
  deconnexion:     () => ({ ok:true }),
  connexion:       () => ({ pseudo:'Tennosei_' }),
};

// Le journal des appels : sans lui, on ne peut pas distinguer « la fenetre s'est
// fermee » de « la suppression est vraiment partie ».
window.__appels = [];
window.__TAURI__ = { core: { invoke: async function(cmd, args){
  window.__appels.push({ cmd: cmd, args: args || null });
  const f = REPONSES[cmd];
  if(!f) throw new Error('commande non simulee : ' + cmd);
  return f(args);
} } };
"""

class Serveur(http.server.SimpleHTTPRequestHandler):

    def end_headers(self):
        # Sur TOUTES les réponses, pas seulement la page : sans ça le navigateur
        # garde les scripts en cache et le banc valide un code qui n'est plus
        # celui du disque. Un banc qui dit « tout va bien » sur du code périmé
        # est pire que pas de banc du tout.
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            html = (SRC / "index.html").read_text(encoding="utf-8")
            # Le stub doit exister avant que les scripts de l'application ne
            # s'executent ; les verifications, apres. D'ou les deux endroits.
            html = html.replace("<script src=\"js/donnees.js\">",
                                "<script>%s</script>\n<script src=\"js/donnees.js\">" % STUB, 1)
            html = html.replace("</body>",
                                '<script src="js/donnees-home.js"></script>\n'
                                '<script src="js/donnees-pokedex.js"></script>\n'
                                '<script src="outils/banc-verifications.js"></script>\n</body>', 1)
            # Une empreinte différente à chaque chargement. Les en-têtes
            # « no-store » ne suffisent pas : le navigateur garde les scripts
            # dans sa mémoire de page et ne redemande rien. Sans ça, le banc
            # peut valider un code qui n'est plus sur le disque — et c'est
            # arrivé pendant sa mise au point.
            marque = str(time.time())
            html = re.sub(r'(<script src="[^"]+\.js)"', r'\1?v=' + marque + '"', html)
            # Les feuilles de style aussi : sans elles, une correction de mise
            # en page reste invisible et l'on croit que le CSS ne s'applique pas.
            html = re.sub(r'(<link[^>]+href="[^"]+\.css)"', r'\1?v=' + marque + '"', html)
            corps = html.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(corps)))
            self.end_headers()
            self.wfile.write(corps)
            return
        if self.path.startswith("/outils/"):
            fichier = OUTILS / self.path[len("/outils/"):].split("?")[0]
            if fichier.exists() and fichier.suffix == ".js":
                corps = fichier.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", "application/javascript; charset=utf-8")
                self.send_header("Content-Length", str(len(corps)))
                self.end_headers()
                self.wfile.write(corps)
                return
            self.send_error(404)
            return
        return super().do_GET()

    def log_message(self, *a):
        pass          # le journal HTTP noierait le rapport


def main():
    if not (SRC / "index.html").exists():
        sys.exit("index.html introuvable sous %s — lance depuis le dossier app/." % SRC)
    socketserver.TCPServer.allow_reuse_address = True
    # La racine est app/src, quel que soit le dossier d'où l'on lance : sans ça
    # tous les scripts remontent en 404 et la page reste blanche.
    handler = functools.partial(Serveur, directory=str(SRC))
    with socketserver.TCPServer(("127.0.0.1", PORT), handler) as srv:
        print("Banc d'essai   http://127.0.0.1:%d" % PORT)
        print("Le rapport s'affiche en haut de la page. Ctrl+C pour arrêter.")
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            print("\nArrêté.")


main()
