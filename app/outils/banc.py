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

// Une photo deja posee, comme sur une chasse aboutie d'il y a trois mois :
// c'est l'etat courant du tableau, pas la case vide.
let DERNIERE_IMAGE = 1;
const IMAGES = new Map([[1, []]]);
const PIXEL = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

let DERNIER_TROC = 2;
const ECHANGES = [
  { id:1, sens:'recu', dex:'rby', jeDonne:'machop', jeRecois:'grimer', etat:'propose',
    mot:'Ce soir ?', messages:0, quand:'', majLe:'',
    avec:{ pseudo:'Amie_Test', avatar:null, discordId:'2' } },
  { id:2, sens:'propose', dex:'rby', jeDonne:'kadabra', jeRecois:'abra',
    etat:'accepte', mot:null, messages:1, quand:'', majLe:'',
    avec:{ pseudo:'Amie_Test', avatar:null, discordId:'2' } },
];
const MESSAGES = [
  { id:1, echange:2, texte:'Je suis en ligne', quand:'', pseudo:'Amie_Test', deMoi:false },
];
const NOTIFS = [
  { id:11, genre:'echange', echange:1, titre:'Amie_Test te propose un echange',
    detail:null, lu:false, quand:'', etat:'propose', dex:'rby',
    jeDonne:'machop', jeRecois:'grimer' },
  { id:10, genre:'message', echange:2, titre:"Amie_Test t’a ecrit",
    detail:'Je suis en ligne', lu:true, quand:'', etat:'accepte', dex:'rby',
    jeDonne:'kadabra', jeRecois:'abra' },
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

  // --- Les echanges et les notifications ------------------------------------
  //
  // Deux echanges, un dans chaque sens : c'est le minimum pour verifier que
  // l'ecran ne propose pas « Accepter » sur sa propre proposition, et que les
  // noms sont remis dans le sens du lecteur.
  //
  // jeDonne / jeRecois arrivent DEJA retournes par l'API — c'est elle qui sait
  // de quel cote on est. Le stub reproduit cette forme et pas la forme brute
  // de la table, sinon il validerait un ecran qui lit autre chose que ce que
  // le serveur envoie.
  echanges:        () => ({ echanges: ECHANGES.map(e => ({ ...e })) }),
  echange_proposer:(a) => { const n = { id: ++DERNIER_TROC, sens:'propose', dex:(a&&a.dex)||'rby',
                              jeDonne:(a&&a.offert)||'?', jeRecois:(a&&a.demande)||'?',
                              etat:'propose', mot:(a&&a.mot)||null, messages:0,
                              quand:'', majLe:'',
                              avec:{ pseudo:(a&&a.pseudo)||'Amie_Test', avatar:null, discordId:'2' } };
                            ECHANGES.unshift(n); return { id:n.id, etat:'propose' }; },
  echange_reponse: (a) => { const e = ECHANGES.find(x => x.id === (a&&a.id));
                            if(!e) throw new Error("Cet echange n’existe pas.");
                            if(e.sens !== 'recu') throw new Error("C’est a l’autre de repondre.");
                            e.etat = (a&&a.reponse) === 'accepte' ? 'accepte' : 'refuse';
                            return { id:e.id, etat:e.etat }; },
  echange_annuler: (a) => { const e = ECHANGES.find(x => x.id === (a&&a.id));
                            if(!e) throw new Error("Cet echange n’existe pas.");
                            e.etat = 'annule'; return { id:e.id, etat:'annule' }; },
  echange_fait:    (a) => { const e = ECHANGES.find(x => x.id === (a&&a.id));
                            if(!e) throw new Error("Cet echange n’existe pas.");
                            e.etat = 'fait'; return { id:e.id, etat:'fait' }; },
  echange_messages:(a) => { const e = ECHANGES.find(x => x.id === (a&&a.id));
                            if(!e) throw new Error("Cet echange n’existe pas.");
                            return { echange:{ ...e }, messages: MESSAGES.filter(m => m.echange === e.id) }; },
  echange_ecrire:  (a) => { MESSAGES.push({ id: MESSAGES.length + 1, echange:(a&&a.id),
                              texte:(a&&a.texte)||'', quand:'', pseudo:'Tennosei_', deMoi:true });
                            return { id: MESSAGES.length, quand:'' }; },
  notifications:   () => ({ notifications: NOTIFS.map(n => ({ ...n })),
                            nonLues: NOTIFS.filter(n => !n.lu).length }),
  notifications_lues: () => { NOTIFS.forEach(n => { n.lu = true; }); return { ok:true, nonLues:0 }; },

  // --- Les photos de chasse -------------------------------------------------
  //
  // Le stub retient les OCTETS RECUS : c'est la seule facon de verifier que
  // l'application redessine bien avant d'envoyer, et n'expedie pas le fichier
  // d'origine avec ses metadonnees.
  image_envoyer:   (a) => { const id = ++DERNIERE_IMAGE;
                            IMAGES.set(id, (a && a.octets) || []);
                            return { ok:true, id, octets:((a&&a.octets)||[]).length,
                                     largeur:0, hauteur:0 }; },
  image_charger:   (a) => { if(!IMAGES.has(a && a.id)) throw new Error('Photo introuvable.');
                            return PIXEL; },
  image_supprimer: (a) => { IMAGES.delete(a && a.id); return { ok:true, id:(a&&a.id) }; },
  images_place:    () => ({ combien: IMAGES.size, octets: 0,
                            combienMax: 60, octetsMax: 41943040 }),
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
