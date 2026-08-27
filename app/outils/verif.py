# -*- coding: utf-8 -*-
"""Le banc de verification VISUELLE : voir ce que les nouveautes donnent.

    cd app && py outils/verif.py

Puis ouvrir http://127.0.0.1:8126 : un panneau s'ouvre a droite avec les
vingt-et-une nouveautes, une par ligne. Chaque ligne dit ce qu'il faut regarder,
porte un temoin vert ou rouge pour ce qui se verifie tout seul, et un bouton
« Montrer » qui amene l'application a l'endroit exact.

CE N'EST PAS LE BANC D'ESSAI. banc.py repond a « est-ce que ca marche » et rend
un verdict ; celui-ci repond a « qu'est-ce que ca donne » et rend la main. Les
deux se completent : le premier attrape les regressions, le second se regarde.

POURQUOI UN JEU DE DONNEES FOURNI. Sans collection, la moitie des nouveautes
n'affichent que leur etat vide — le programme du soir n'a rien a proposer, le
tableau de chasse est absent, les objectifs n'existent pas, la raretee se tait.
On sert donc un compte deja commence : trois jeux entames, deux chasses en
cours, trois abouties, deux objectifs, deux fiches de capture, une amie et une
table de raretee.

RIEN NE TOUCHE A TES DONNEES. Le pont Tauri est remplace par des reponses en
memoire, comme dans banc.py : aucune connexion Discord, aucune ecriture en base,
et l'etat meurt avec la page.
"""
import functools
import http.server
import pathlib
import re
import socketserver
import sys
import time
import webbrowser

try:
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
except Exception:
    pass

OUTILS = pathlib.Path(__file__).resolve().parent
SRC = OUTILS.parent / "src"
PORT = 8126

# --- Le compte servi ---------------------------------------------------------
# Des noms d'espèces PokeAPI, choisis pour que chaque écran ait de quoi montrer :
# de quoi entamer trois Pokédex sans en finir aucun, des chromatiques, et des
# légendaires pour que la rareté ait un sens.
STUB = r"""
const SV = ['sprigatito','floragato','meowscarada','fuecoco','crocalor','skeledirge',
  'quaxly','quaxwell','quaquaval','lechonk','tarountula','spidops','nymble','lokix',
  'pawmi','pawmo','pawmot','tandemaus','fidough','dachsbun','smoliv','dolliv','arboliva',
  'nacli','naclstack','garganacl','charcadet','armarouge','ceruledge','tadbulb',
  'bellibolt','wattrel','kilowattrel','maschiff','mabosstiff','shroodle','grafaiai',
  'bramblin','brambleghast','toedscool'];
const SWSH = ['grookey','thwackey','rillaboom','scorbunny','raboot','cinderace','sobble',
  'drizzile','inteleon','skwovet','greedent','rookidee','corvisquire','corviknight',
  'blipbug','dottler','orbeetle','nickit','thievul','gossifleur','eldegoss','wooloo',
  'dubwool','chewtle','drednaw','yamper','boltund','rolycoly','carkol','coalossal'];
const BDSP = ['turtwig','grotle','torterra','chimchar','monferno','infernape','piplup',
  'prinplup','empoleon','starly','staravia','staraptor','bidoof','bibarel','shinx',
  'luxio','luxray'];
const CLASSIQUES = ['bulbasaur','ivysaur','venusaur','charmander','charmeleon','charizard',
  'squirtle','wartortle','blastoise','pikachu','raichu','eevee','vaporeon','jolteon',
  'flareon','snorlax','dragonite','mew','mewtwo','lugia','ho-oh','celebi','rayquaza',
  'giratina-altered','arceus','gengar','lucario','garchomp','tyranitar','metagross'];

const NATIONAL = [...new Set([].concat(SV, SWSH, BDSP, CLASSIQUES))];
const SHINY = ['pikachu','eevee','celebi','garchomp','corviknight','arboliva'];

const CHASSES = [
  { pokemon:'gible', dex:'bdsp', methode:'rencontre', bonus:['charme'], compteur:1847,
    debut:'2026-08-11T20:00:00Z' },
  { pokemon:'wooloo', dex:'swsh', methode:'masuda', bonus:['charme'], compteur:212,
    debut:'2026-08-24T18:00:00Z' },
];

// Trois chasses abouties : de quoi remplir le tableau de chasse ET declencher
// le rapport a la moyenne, qui ne s'affiche qu'a partir de trois.
const CHASSES_FINIES = [
  { pokemon:'pikachu', dex:'swsh', methode:'masuda', bonus:['charme'], compteur:412,
    taux:585, debut:'2026-03-01T00:00:00Z', fin:'2026-03-04T21:12:00Z' },
  { pokemon:'eevee', dex:'sv', methode:'apparition', bonus:['sandwich'], compteur:96,
    taux:136, debut:'2026-05-18T00:00:00Z', fin:'2026-05-18T23:40:00Z' },
  { pokemon:'corviknight', dex:'swsh', methode:'rencontre', bonus:[], compteur:5203,
    taux:4096, debut:'2026-06-02T00:00:00Z', fin:'2026-07-14T19:05:00Z' },
];

const OBJECTIFS = [
  { id:101, nom:'Les starters de Paldea', quoi:'🔮 Écarlate / Violet · « starter »',
    dex:'sv', shiny:false,
    entrees:['sprigatito','floragato','meowscarada','fuecoco','crocalor','skeledirge',
             'quaxly','quaxwell','quaquaval'],
    cree:'2026-07-02T00:00:00Z' },
  { id:102, nom:'Mes légendes en brillant', quoi:'🏡 Pokémon HOME · ✨ · « légendaire »',
    dex:'national', shiny:true,
    entrees:['mew','mewtwo','lugia','ho-oh','celebi','rayquaza','arceus'],
    cree:'2026-08-01T00:00:00Z' },
];

const DETAILS = { national: {
  snorlax: { ball:'Honor Ball', nature:'Relax', surnom:'Gros Dodo',
             origine:'Pokémon Cristal', date:'2001-04-14',
             ruban:'Ruban Souvenir', ot:'Tennosei_',
             note:'Le tout premier. Il a survécu à trois transferts.' },
  celebi:  { ball:'Poké Ball', nature:'Timide', origine:'Pokémon Cristal',
             date:'2001-12-24', note:'Distribution de Noël.' },
} };

const MOI = { captures: NATIONAL, shiny: SHINY };
const AMI = {
  captures: [].concat(CLASSIQUES.slice(0, 22), SWSH.slice(0, 18),
                      ['gible','gabite','garchomp','riolu','sylveon','umbreon','espeon']),
  shiny: ['pikachu','sylveon','riolu'],
};

const dexDe = (c, complet) => {
  const base = { version:1, player:'Tennosei_', exportedAt:new Date().toISOString(),
    dex: { national:{ caught:c.captures, shiny:c.shiny },
           sv:{ caught:SV, shiny:['arboliva'] },
           swsh:{ caught:SWSH, shiny:['corviknight'] },
           bdsp:{ caught:BDSP, shiny:[] } },
    captures:c.captures, shiny:c.shiny };
  if(complet){
    base.chasses = CHASSES;
    base.chassesFinies = CHASSES_FINIES;
    base.objectifs = OBJECTIFS;
    base.detailsCapture = DETAILS;
  }
  return base;
};

let DERNIER_ID = 2;
const PROFILS = [
  { id:1, nom:'Aventure 1', public:1, par_defaut:1, mode:'capture', niveau_formes:3,
    captures:NATIONAL.length, shiny:SHINY.length, cree_le:'2026-01-04T10:00:00Z',
    maj_le:new Date().toISOString() },
  { id:2, nom:'Living Dex', public:1, par_defaut:0, mode:'living', niveau_formes:3,
    captures:0, shiny:0, cree_le:'2026-06-01T10:00:00Z', maj_le:null },
];

// La table de rareté. Deux cent quarante dresseurs, et des comptes plausibles :
// les légendaires rares, les starters répandus. Sans elle, la ligne de rareté
// se tait — c'est son comportement normal, mais on ne verrait rien.
const RARETE = { dresseurs:240, entrees:{}, calculeLe:new Date().toISOString() };
NATIONAL.forEach(function(n){ RARETE.entrees[n] = 40 + (n.length * 7) % 170; });
Object.assign(RARETE.entrees, {
  mew:3, arceus:4, celebi:6, 'ho-oh':11, lugia:14, mewtwo:31, rayquaza:22,
  pikachu:221, eevee:198, bulbasaur:187, charmander:191, snorlax:142,
});

const REPONSES = {
  etat:            () => ({ connecte:true }),
  moi:             () => ({ dresseur:{ id:1, pseudo:'Tennosei_', discordId:'1',
                                       avatar:null, visible:true },
                            resume:{ captures:NATIONAL.length, shiny:SHINY.length,
                                     majLe:new Date().toISOString() } }),
  profils:         () => ({ profils: PROFILS.map(x => ({ ...x })) }),
  lire_dex:        (a) => ({ ...dexDe(MOI, true), profilId:(a && a.profil) || 1 }),
  ecrire_dex:      () => ({ profilId:1, captures:NATIONAL.length, shiny:SHINY.length }),
  historique:      () => ({ lignes:[], total:0, encore:false }),
  journal:         () => ({ lignes:[], encore:false }),
  retrospective:   () => ({ jours:[
                       { jour:new Date().toISOString().slice(0,10), combien:9, chromatiques:1 },
                       { jour:'2026-08-26', combien:14, chromatiques:0 },
                       { jour:'2026-08-25', combien:6,  chromatiques:1 } ],
                     jeux:[{ dex:'sv', combien:40 }, { dex:'swsh', combien:30 }],
                     total:117, premier:'2026-01-04' }),
  succes_de:       () => ({ pseudo:'Amie_Test', captures:47, shiny:3, jours:12,
                            jeux:[], lieux:0 }),
  rarete:          () => RARETE,
  dresseurs:       () => ({ dresseurs:[{ pseudo:'Amie_Test', discord_id:'2', avatar:null,
                              profil:'Aventure 1', mode:'capture', niveau_formes:3,
                              captures:AMI.captures.length, shiny:AMI.shiny.length }] }),
  profils_de:      () => ({ dresseur:{ pseudo:'Amie_Test', discordId:'2', avatar:null },
                            profils:[{ id:9, nom:'Aventure 1', public:1, par_defaut:1,
                                       mode:'capture', niveau_formes:3,
                                       captures:AMI.captures.length, shiny:AMI.shiny.length }] }),
  dex_de:          () => ({ pseudo:'Amie_Test',
                            profil:{ id:9, nom:'Aventure 1', mode:'capture', niveau_formes:3 },
                            dex:dexDe(AMI, false) }),
  amis:            () => ({ amis:[{ pseudo:'Amie_Test', discord_id:'2', discord_nom:'Amie',
                              avatar:null, aventure:'Aventure 1',
                              captures:AMI.captures.length, shiny:AMI.shiny.length }] }),
  amis_fil:        () => ({ lignes:[] }),
  amis_nouveautes: () => ({ groupes:[] }),
  amis_vu:         () => ({ ok:true }),
  suivre:          () => ({ ok:true }),
  ne_plus_suivre:  () => ({ ok:true }),
  sessions:        () => ({ sessions:[{ id:1, courante:true,
                              creeLe:'2026-08-01T10:00:00Z',
                              expireLe:'2026-11-01T10:00:00Z' }] }),
  fermer_session:  () => ({ ok:true }),
  fermer_les_autres: () => ({ fermees:0 }),
  changer_visibilite: (a) => ({ ok:true, visible:!!(a && a.visible) }),
  changer_pseudo:  (a) => ({ pseudo:(a && a.pseudo) || 'Tennosei_' }),
  exporter:        () => ({ exporteLe:new Date().toISOString(), format:'pokearchive-1',
                            dresseur:{ pseudo:'Tennosei_', avatar:null, creeLe:null },
                            aventures: PROFILS.map(p => ({ nom:p.nom, public:p.public,
                              par_defaut:p.par_defaut, mode:p.mode,
                              niveau_formes:p.niveau_formes, cree_le:p.cree_le,
                              maj_le:p.maj_le, dex:dexDe(MOI, true), historique:[] })) }),
  // L'import rend le bilan que l'ecran attend, sans rien ecrire : c'est la
  // FORME de la reponse qu'on regarde ici, pas la fusion — celle-ci se
  // verifie dans banc.py et dans le pont du site.
  importer:        (a) => { const av = ((a && a.contenu && a.contenu.aventures) || []);
                            return { ok:true, aventures:av.length, creees:0,
                                     gagnees:0, journalisees:0,
                                     detail:av.map(x => ({ nom:x.nom, creee:false,
                                       captures:0, shiny:0, gagnees:0, journalisees:0 })) }; },
  creer_profil:    (a) => { const n = { id: ++DERNIER_ID, nom:(a&&a.nom)||'Nouvelle',
                              public:1, par_defaut:0, mode:(a&&a.mode)||'capture',
                              niveau_formes:3, captures:0, shiny:0,
                              cree_le:new Date().toISOString(), maj_le:null };
                            PROFILS.push(n); return { profil:{ ...n } }; },
  modifier_profil: (a) => { const x = PROFILS.find(y => y.id === (a&&a.id));
                            if(x && a && a.nom != null) x.nom = a.nom;
                            if(x && a && a.mode != null) x.mode = a.mode;
                            if(x && a && a.niveauFormes != null) x.niveau_formes = a.niveauFormes;
                            return { ok:true }; },
  supprimer_profil:(a) => { const i = PROFILS.findIndex(y => y.id === (a&&a.id));
                            if(i < 0) throw new Error('PROFIL_INTROUVABLE');
                            if(PROFILS.length <= 1) throw new Error("C'est ta seule aventure.");
                            PROFILS.splice(i, 1);
                            if(PROFILS.length) PROFILS[0].par_defaut = 1;
                            return { ok:true }; },
  renommer_dresseur: () => { throw new Error('Route inconnue.'); },
  deconnexion:     () => ({ ok:true }),
  connexion:       () => ({ pseudo:'Tennosei_' }),
  presence_maj:    () => ({ ok:true }),
  presence_effacer:() => ({ ok:true }),
  // L'overlay ouvre une ecoute locale : hors de Tauri, il n'y a rien a ouvrir.
  // Le bouton reste donc masque, et c'est ce que le panneau constate.
  overlay_adresse: () => '',
  overlay_demarrer:() => { throw new Error("L'overlay n'existe que dans l'application."); },
  overlay_arreter: () => true,
  overlay_etat:    () => false,
};

window.__appels = [];
window.__TAURI__ = { core: { invoke: async function(cmd, args){
  window.__appels.push({ cmd: cmd, args: args || null });
  const f = REPONSES[cmd];
  if(!f) throw new Error('commande non simulee : ' + cmd);
  return f(args);
} } };

// Le premier lancement ne doit pas s'ouvrir tout seul par-dessus le panneau :
// c'est la ligne A1 qui le declenche, quand on le demande.
try{ localStorage.setItem('pokearchive-depart-fait', '["Tennosei_"]'); }catch(e){}
"""


class Serveur(http.server.SimpleHTTPRequestHandler):

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        super().end_headers()

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            html = (SRC / "index.html").read_text(encoding="utf-8")
            html = html.replace('<script src="js/donnees.js">',
                                "<script>%s</script>\n<script src=\"js/donnees.js\">" % STUB, 1)
            html = html.replace("</body>",
                                '<script src="js/donnees-home.js"></script>\n'
                                '<script src="js/donnees-pokedex.js"></script>\n'
                                '<script src="outils/verif-panneau.js"></script>\n</body>', 1)
            # Comme pour le banc : une empreinte a chaque chargement, sans quoi
            # le navigateur ressert des scripts qui ne sont plus sur le disque.
            marque = str(time.time())
            html = re.sub(r'(<script src="[^"]+\.js)"', r'\1?v=' + marque + '"', html)
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
        pass


def main():
    ouvrir = "--sans-navigateur" not in sys.argv
    port = PORT
    if "--port" in sys.argv:
        try:
            port = int(sys.argv[sys.argv.index("--port") + 1])
        except (IndexError, ValueError):
            sys.exit("--port attend un numero de port.")

    if not (SRC / "index.html").exists():
        sys.exit("index.html introuvable sous %s — lance depuis le dossier app/." % SRC)

    socketserver.TCPServer.allow_reuse_address = True
    handler = functools.partial(Serveur, directory=str(SRC))
    with socketserver.TCPServer(("127.0.0.1", port), handler) as srv:
        adresse = "http://127.0.0.1:%d" % port
        print("Verification visuelle   %s" % adresse)
        print("Le panneau s'ouvre a droite : une ligne par nouveaute.")
        print("Rien n'est ecrit nulle part — le compte est simule. Ctrl+C pour arreter.")
        if ouvrir:
            webbrowser.open(adresse)
        try:
            srv.serve_forever()
        except KeyboardInterrupt:
            print("\nArrete.")


main()
