// Le banc de l'API : le serveur tourne, et se vérifie lui-même.
//
//     cd api
//     node --env-file=.env outils/banc.js
//
// POURQUOI IL MANQUAIT. Il y avait trente-sept vérifications côté application,
// dix-huit côté site, et zéro ici — alors que le serveur porte désormais le plus
// délicat : l'inversion du sens dans un échange, la règle de visibilité des
// photos, le ménage déclenché par une sauvegarde, le retrait de l'EXIF, « qui a
// ce Pokémon ». Tout cela avait été éprouvé à la main, au curl, une fois. Rien
// n'était rejouable.
//
// IL TOURNE SUR LA VRAIE BASE, et c'est délibéré : ce qu'on veut éprouver, ce
// sont les requêtes SQL, les clés étrangères et les contraintes — les simuler
// reviendrait à valider une imitation. Les modules sont appelés directement,
// sans passer par HTTP : on vérifie la règle, pas le routage.
//
// IL NE TOUCHE À AUCUN COMPTE RÉEL. Les dresseurs qu'il crée portent des
// identifiants Discord d'une plage réservée, et il les efface en partant —
// même en cas d'échec, par un try/finally. Rien d'autre n'est lu ni écrit.

import { lire, une, ecrire, creerSchema, description } from '../src/base.js';
import { ecrireDex, horodatage } from '../src/comptes.js';
import { suivre, quiA, nouveautes } from '../src/amis.js';
import { proposer, repondre, mesEchanges, messages, ecrireMessage } from '../src/echanges.js';
import * as images from '../src/images.js';

// La plage 991… — voisine de celle de peupler.js, et distincte pour que les
// deux outils ne se marchent jamais dessus.
const FIGURANTS = [
  { discord: '99100000000000001', pseudo: 'BancUn' },
  { discord: '99100000000000002', pseudo: 'BancDeux' },
];
const IDS = FIGURANTS.map((f) => f.discord);

let reussites = 0;
const echecs = [];

async function verifier(quoi, fn) {
  try {
    const dit = await fn();
    if (typeof dit === 'string' && dit.startsWith('échec')) {
      echecs.push([quoi, dit]);
      console.log(`  ✗ ${quoi}\n      ${dit}`);
    } else {
      reussites++;
      console.log(`  · ${quoi}\n      ${dit}`);
    }
  } catch (e) {
    echecs.push([quoi, e.message]);
    console.log(`  ✗ ${quoi}\n      échec : ${e.message}`);
  }
}

// --- Le décor ----------------------------------------------------------------

async function poser() {
  const ids = {};
  for (const f of FIGURANTS) {
    const quand = horodatage();
    const r = await ecrire(
      `INSERT INTO pa_dresseurs (discord_id, pseudo, pseudo_cle, avatar, cree_le, visible)
       VALUES (?, ?, ?, NULL, ?, 1)`,
      [f.discord, f.pseudo, f.pseudo.toLowerCase(), quand]);
    await ecrire(
      `INSERT INTO pa_profils (dresseur_id, nom, nom_cle, public, par_defaut,
                               mode, niveau_formes, cree_le, maj_le)
       VALUES (?, 'Aventure 1', 'aventure 1', 1, 1, 'capture', 3, ?, ?)`,
      [r.insertId, quand, quand]);
    ids[f.pseudo] = r.insertId;
  }
  return ids;
}

async function retirer() {
  await ecrire(
    `DELETE FROM pa_dresseurs WHERE discord_id IN (${IDS.map(() => '?').join(',')})`, IDS);
}

const profilDe = async (id) =>
  (await une('SELECT id FROM pa_profils WHERE dresseur_id = ? LIMIT 1', [id])).id;

/** Une sauvegarde de la forme que l'application envoie. */
const sauvegarde = (caught, extra = {}) => ({
  version: 1, caught, shiny: [],
  dex: { rby: { caught, shiny: [] } },
  ...extra,
});

// --- Un JPEG porteur d'EXIF, fabriqué ici ------------------------------------
//
// Pas de fichier témoin sur le disque : le banc doit tourner sur une machine
// nue. Ce JPEG n'est pas décodable en image, et c'est sans importance — le
// serveur ne le décode jamais, il lit son en-tête.
function jpegAvecExif() {
  const seg = (marqueur, charge) => Buffer.concat([
    Buffer.from([0xff, marqueur]),
    (() => { const b = Buffer.alloc(2); b.writeUInt16BE(charge.length + 2); return b; })(),
    charge,
  ]);
  const sof = Buffer.alloc(9);
  sof[0] = 8; sof.writeUInt16BE(720, 1); sof.writeUInt16BE(1280, 3);
  return Buffer.concat([
    Buffer.from([0xff, 0xd8]),
    seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0', 'binary')),
    seg(0xe1, Buffer.from('Exif\0\0II*\0\x08\0\0\0GPS 48.8566 2.3522 SALON')),
    seg(0xdb, Buffer.concat([Buffer.from([0]), Buffer.alloc(64, 0x10)])),
    seg(0xc0, sof),
    seg(0xda, Buffer.from([1, 1, 0, 0, 0x3f, 0])),
    Buffer.alloc(256), Buffer.from([0xff, 0xd9]),
  ]);
}

// --- Les vérifications -------------------------------------------------------

async function tout(ids) {
  const un = ids.BancUn, deux = ids.BancDeux;
  const profilUn = await profilDe(un);

  console.log('\nLes échanges');

  await verifier(
    "Le sens est retourné pour le receveur, jamais pour le demandeur",
    async () => {
      // LE PIÈGE DE CE MODULE. En base, offert et demande sont écrits du point
      // de vue du DEMANDEUR. Les rendre tels quels au receveur lui ferait lire
      // « tu offres » sous le Pokémon qu'il reçoit — une inversion qui ne lève
      // rien, ne casse rien, et propose le contraire de ce qui a été cliqué.
      const e = await proposer(un, { pseudo: 'BancDeux', dex: 'rby',
        offert: 'abra', demande: 'machop', mot: null });

      const chezUn = (await mesEchanges(un)).echanges.find((x) => x.id === e.id);
      const chezDeux = (await mesEchanges(deux)).echanges.find((x) => x.id === e.id);

      if (chezUn.jeDonne !== 'abra' || chezUn.jeRecois !== 'machop') {
        return `échec : le demandeur lit ${chezUn.jeDonne}/${chezUn.jeRecois}`;
      }
      if (chezDeux.jeDonne !== 'machop' || chezDeux.jeRecois !== 'abra') {
        return `échec : le receveur lit ${chezDeux.jeDonne}/${chezDeux.jeRecois}`;
      }
      if (chezUn.sens !== 'propose' || chezDeux.sens !== 'recu') {
        return 'échec : le sens annoncé est faux';
      }
      return 'demandeur : donne abra reçoit machop ; receveur : l’inverse';
    });

  await verifier(
    "Le demandeur ne peut pas répondre à sa propre proposition",
    async () => {
      const e = await proposer(un, { pseudo: 'BancDeux', dex: 'rby',
        offert: 'pikachu', demande: 'eevee', mot: null });
      try {
        await repondre(un, e.id, 'accepte');
        return 'échec : il a pu accepter son propre échange';
      } catch (err) {
        if (err.code !== 403) return `échec : refusé, mais en ${err.code}`;
      }
      const r = await repondre(deux, e.id, 'accepte');
      return `refusé au demandeur (403), accepté par le receveur (${r.etat})`;
    });

  await verifier(
    "La discussion n'ouvre qu'après un oui",
    async () => {
      // C'est la garde qui empêche un abonnement à sens unique de devenir un
      // canal de messages non sollicités : pour t'écrire, il faut ton oui.
      const e = await proposer(un, { pseudo: 'BancDeux', dex: 'rby',
        offert: 'zubat', demande: 'mewtwo', mot: null });
      try {
        await ecrireMessage(un, e.id, 'coucou');
        return 'échec : on a pu écrire avant acceptation';
      } catch { /* attendu */ }

      await repondre(deux, e.id, 'refuse');
      try {
        await ecrireMessage(un, e.id, 'et maintenant ?');
        return 'échec : on a pu écrire après un refus';
      } catch { /* attendu */ }
      return 'muet avant la réponse, muet après un refus';
    });

  await verifier(
    "Un tiers ne voit pas un échange qui ne le regarde pas",
    async () => {
      const e = await proposer(un, { pseudo: 'BancDeux', dex: 'rby',
        offert: 'onix', demande: 'ditto', mot: null });
      await repondre(deux, e.id, 'accepte');
      // Le troisième est un dresseur réel quelconque : on ne lit rien de lui,
      // on vérifie seulement qu'il se heurte au mur.
      const autre = await une(
        `SELECT id FROM pa_dresseurs WHERE discord_id NOT IN (${IDS.map(() => '?').join(',')}) LIMIT 1`,
        IDS);
      if (!autre) return 'ignoré : aucun autre dresseur en base';
      try {
        await messages(autre.id, e.id);
        return 'échec : un tiers a lu la discussion';
      } catch (err) {
        if (err.code !== 404) return `échec : refusé en ${err.code} et non 404`;
      }
      return 'refusé en 404 — ne dit même pas que l’échange existe';
    });

  console.log('\nLes photos');

  await verifier(
    "L'EXIF est retiré, les dimensions lues, le type reconnu aux octets",
    async () => {
      const r = await images.deposer(un, profilUn, 'chasse', jpegAvecExif());
      const servi = await images.servir(un, r.id);
      const dedans = servi.octets.toString('binary');
      if (dedans.includes('SALON')) return 'échec : le GPS a survécu';
      if (dedans.includes('Exif')) return 'échec : le segment APP1 est resté';
      if (r.largeur !== 1280 || r.hauteur !== 720) {
        return `échec : ${r.largeur}×${r.hauteur} au lieu de 1280×720`;
      }
      return `${r.octets} octets, EXIF retiré, 1280×720 lus dans le SOF`;
    });

  await verifier(
    "Ce qui n'est pas une image est refusé",
    async () => {
      try {
        await images.deposer(un, profilUn, 'chasse', Buffer.from('MZ\x90\0 un executable'));
        return 'échec : accepté';
      } catch { /* attendu */ }
      try {
        await images.deposer(un, profilUn, 'inconnu', jpegAvecExif());
        return 'échec : sujet inconnu accepté';
      } catch { /* attendu */ }
      return 'octets étrangers refusés, sujet inconnu refusé';
    });

  await verifier(
    "Une photo suit la visibilité de son aventure",
    async () => {
      const r = await images.deposer(un, profilUn, 'chasse', jpegAvecExif());
      await images.servir(deux, r.id);          // aventure publique : doit passer

      await ecrire('UPDATE pa_profils SET public = 0 WHERE id = ?', [profilUn]);
      let refuse = false;
      try { await images.servir(deux, r.id); } catch (e) { refuse = e.code === 404; }
      await images.servir(un, r.id);            // le propriétaire, toujours
      await ecrire('UPDATE pa_profils SET public = 1 WHERE id = ?', [profilUn]);

      if (!refuse) return 'échec : lisible alors que l’aventure est privée';
      return 'publique : visible de tous ; privée : 404 sauf pour son auteur';
    });

  await verifier(
    "Le ménage n'emporte que ce qu'aucune chasse ne réclame",
    async () => {
      // ON PART D'UNE ARDOISE PROPRE. Les vérifications précédentes ont déposé
      // leurs propres photos, qu'aucune chasse ne réclame : sans ce nettoyage
      // le ménage en emporterait trois et le compte serait faux — ce qui est
      // arrivé, et disait un défaut du test, pas du code.
      await ecrire('DELETE FROM pa_images WHERE profil_id = ?', [profilUn]);

      const gardee = await images.deposer(un, profilUn, 'chasse', jpegAvecExif());
      const perdue = await images.deposer(un, profilUn, 'chasse', jpegAvecExif());

      const avecChasse = sauvegarde(['abra'], {
        chasses: [], chassesFinies: [{ pokemon: 'eevee', dex: 'rby', image: gardee.id }],
      });
      const otees = await images.menage(profilUn, avecChasse);
      if (otees !== 1) return `échec : ${otees} photo(s) ôtée(s), une seule attendue`;
      await images.servir(un, gardee.id);       // celle qui est citée reste
      let partie = false;
      try { await images.servir(un, perdue.id); } catch { partie = true; }
      if (!partie) return 'échec : l’orpheline est restée';

      // ET LA PRUDENCE : une sauvegarde qui ne parle pas de chasses du tout ne
      // doit RIEN emporter. Un import partiel ne doit pas vider l'album.
      const muette = sauvegarde(['abra']);
      const rien = await images.menage(profilUn, muette);
      if (rien !== 0) return `échec : ${rien} photo(s) ôtée(s) par une sauvegarde muette`;
      await images.servir(un, gardee.id);
      return 'orpheline effacée, citée gardée, sauvegarde muette sans effet';
    });

  console.log('\nLes amis');

  await verifier(
    "« Qui a ce Pokémon » ignore les aventures privées",
    async () => {
      await ecrireDex(deux, sauvegarde(['lapras', 'snorlax']));
      await suivre(un, 'BancDeux');

      const profilDeux = await profilDe(deux);
      const ouvert = await quiA(un, ['lapras', 'mew']);
      await ecrire('UPDATE pa_profils SET public = 0 WHERE id = ?', [profilDeux]);
      const ferme = await quiA(un, ['lapras']);
      await ecrire('UPDATE pa_profils SET public = 1 WHERE id = ?', [profilDeux]);

      if (!ouvert.chez.lapras.includes('BancDeux')) return 'échec : ne le trouve pas';
      if (ouvert.chez.mew.length) return 'échec : trouve un Pokémon que personne n’a';
      if (ferme.chez.lapras.length) return 'échec : une aventure privée compte encore';
      return 'trouvé quand public, invisible quand privé, rien d’inventé';
    });

  await verifier(
    "Suivre quelqu'un ne déverse pas son passé",
    async () => {
      // vu_jusqua est posé au maximum du moment : sans cela, s'abonner
      // annoncerait six mois de journal d'un coup.
      const n = await nouveautes(un);
      const anciennes = n.annonces.filter((a) => a.pseudo === 'BancDeux');
      if (anciennes.length) {
        return `échec : ${anciennes.length} annonce(s) antérieure(s) à l’abonnement`;
      }
      return 'rien de ce qui précède l’abonnement n’est annoncé';
    });
}

// --- Entrée ------------------------------------------------------------------

console.log(`\nBanc de l'API — ${description()}`);
await creerSchema(() => {});

// On efface d'abord : un banc interrompu a pu laisser ses figurants.
await retirer();
let ids;
try {
  ids = await poser();
  await tout(ids);
} finally {
  // MÊME EN CAS D'ÉCHEC. Un banc qui laisse ses dresseurs derrière lui pollue
  // le classement de tout le monde, et le suivant démarre sur un décor sale.
  await retirer();
}

const total = reussites + echecs.length;
console.log(echecs.length
  ? `\n${echecs.length} échec(s) sur ${total}\n`
  : `\n${total} vérifications, aucun échec\n`);
process.exit(echecs.length ? 1 : 0);
