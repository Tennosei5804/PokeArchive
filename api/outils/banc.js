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
import { ecrireDex, horodatage, changerEchangesOuverts, changerMessagesDe }
  from '../src/comptes.js';
import { suivre, quiA, nouveautes } from '../src/amis.js';
import { proposer, repondre, annuler, mesEchanges, messages, ecrireMessage }
  from '../src/echanges.js';
import * as images from '../src/images.js';
import { ecrireA, conversations, conversation } from '../src/messagerie.js';
import { motInterdit, injurieuxDansPhrase } from '../src/pseudos-interdits.js';

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
    'On parle dès la proposition, plus jamais après un refus',
    async () => {
      // CETTE VÉRIFICATION DISAIT L'INVERSE, et elle avait raison de le dire à
      // l'époque : la discussion n'ouvrait qu'après un oui, pour qu'un
      // abonnement à sens unique ne devienne pas un canal de messages non
      // sollicités.
      //
      // La règle a été renversée sciemment — voir l'en-tête de echanges.js. En
      // résumé : elle ne fermait pas le canal, puisque le `mot` de la
      // proposition livrait déjà du texte libre par notification ; elle
      // empêchait seulement de RÉPONDRE. Elle protégeait l'importun et
      // bâillonnait l'importuné.
      //
      // CE QUI RESTE FERMÉ EST LE POINT DE CETTE VÉRIFICATION. Un échange
      // refusé est clos : continuer à y écrire serait exactement le harcèlement
      // que ce module doit éviter.
      const e = await proposer(un, { pseudo: 'BancDeux', dex: 'rby',
        offert: 'zubat', demande: 'mewtwo', mot: null });
      await ecrireMessage(un, e.id, 'coucou, ça te dit ?');
      const avant = await messages(deux, e.id);
      if (avant.messages.length !== 1) {
        return `échec : ${avant.messages.length} message(s) avant réponse, un attendu`;
      }

      await repondre(deux, e.id, 'refuse');
      try {
        await ecrireMessage(un, e.id, 'et maintenant ?');
        return 'échec : on a pu écrire après un refus';
      } catch { /* attendu */ }

      // LISIBLE MAIS MUET : « rien ne s'efface » vaut aussi pour ce qui a été
      // dit avant le refus. On n'y parle plus, on peut encore le relire.
      const apres = await messages(deux, e.id).catch(() => null);
      if (!apres) return 'échec : la conversation refusée n’est plus lisible';
      return 'on parle dès la proposition, muet après un refus, lisible toujours';
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

  await verifier(
    'Porte fermée, la proposition est refusée — au serveur, pas à l’écran',
    async () => {
      // CE QUE CETTE VÉRIFICATION DÉFEND. Griser un bouton dans l'application
      // n'engage rien : le jeton suffit à appeler la route directement. Un
      // réglage qui ne tient que par l'interface est une suggestion, pas un
      // réglage — on l'éprouve donc en appelant le service, comme le ferait
      // quelqu'un qui contourne la fenêtre.
      await changerEchangesOuverts(deux, false);
      try {
        await proposer(un, {
          pseudo: 'BancDeux', dex: 'rby', offert: 'abra', demande: 'kadabra',
        });
        return 'échec : la proposition est passée malgré la porte fermée';
      } catch (e) {
        if (!/n’accepte pas les propositions/.test(e.message)) {
          return `échec : refusé pour une autre raison — ${e.message}`;
        }
      }

      // LA PORTE SE ROUVRE. Sans cela on ne saurait pas si le refus vient du
      // réglage ou d'autre chose de cassé au passage.
      await changerEchangesOuverts(deux, true);
      const ok = await proposer(un, {
        pseudo: 'BancDeux', dex: 'rby', offert: 'abra', demande: 'kadabra',
      });
      if (!ok?.id) return 'échec : porte rouverte, la proposition ne passe toujours pas';
      return 'refusée porte fermée, acceptée porte ouverte';
    });

  await verifier(
    'Fermer sa porte ne touche à rien de ce qui est déjà en cours',
    async () => {
      // ON FERME LA PORTE, ON NE VIDE PAS LA PIÈCE. Quelqu'un qui attend une
      // réponse depuis trois jours ne doit pas voir son échange disparaître
      // parce que l'autre a changé un réglage — ce serait effacer le travail
      // d'un tiers pour un geste qui ne le concerne pas.
      const avant = await mesEchanges(deux);
      if (!avant.echanges.length) return 'échec : rien en cours, la vérification ne prouve rien';

      await changerEchangesOuverts(deux, false);
      const apres = await mesEchanges(deux);
      await changerEchangesOuverts(deux, true);

      if (apres.echanges.length !== avant.echanges.length) {
        return `échec : ${avant.echanges.length} échange(s) avant, ${apres.echanges.length} après`;
      }
      return `${avant.echanges.length} échange(s) en cours, tous intacts après fermeture`;
    });

  await verifier(
    'Un message d’échange ne se lit pas comme un pseudo',
    async () => {
      // LE PIÈGE, ET IL A ÉTÉ MESURÉ. La lecture collée est indispensable pour
      // un pseudo — « xX_enculé_Xx » n'existe que séparé. Appliquée telle
      // quelle à une phrase, elle FABRIQUE des insultes que personne n'a
      // écrites : « bâtard de » recollé donne « batarde », qui contient
      // « atarde », la racine d'« attardé ». « Le pain bâtard de la
      // boulangerie » était refusé.
      //
      // D'où deux lectures, et cette vérification tient les deux bouts : ce qui
      // doit passer dans une phrase, et ce qui doit continuer de tomber.
      const ordinaires = [
        'Salut ! Je te donne mon Ponyta contre ton Salamèche, ça te va ?',
        'Mon raton laveur préféré, c’est Linéon',
        'Le pain bâtard de la boulangerie',
        'Ma chatte a eu des petits, elle s’appelle Miaouss',
        'Analyse faite : il me manque 3 Pokémon pour boucler Johto',
        'Tu veux mon Chartor ou mon Colossinge ?',
        'On se retrouve sur Écarlate ce soir vers 21h ?',
        'Sacha x Ondine pour toujours',
      ];
      const injurieux = [
        'ferme ta gueule sale con', 'va te faire enculer', 'nique ta mère',
        'espèce de sinjenkuleur', 'xX enculé Xx', 'fils de pute',
      ];

      const faux = ordinaires.filter((t) => injurieuxDansPhrase(t));
      const manques = injurieux.filter((t) => !injurieuxDansPhrase(t));
      if (faux.length) return `échec : phrase ordinaire refusée — ${faux[0]}`;
      if (manques.length) return `échec : injure passée — ${manques[0]}`;

      // Et le pseudo, lui, garde la lecture collée : la nouvelle porte ne doit
      // pas avoir ouvert l'ancienne.
      if (!motInterdit('xX_encule_Xx')) return 'échec : le pseudo ne colle plus les mots';
      if (motInterdit('Cassandre')) return 'échec : le pseudo refuse un prénom réel';

      return `${ordinaires.length} messages ordinaires acceptés, `
        + `${injurieux.length} refusés, la lecture des pseudos intacte`;
    });

  await verifier(
    'Le mot d’une proposition passe par le filtre, comme les messages',
    async () => {
      // LA PORTE QUI CONTOURNAIT LA RÈGLE. L'en-tête de echanges.js pose que la
      // discussion n'ouvre qu'une fois l'échange accepté, « sinon la boîte de
      // réception devient un canal de messages non sollicités ». Le `mot` de la
      // proposition passait au travers : 280 caractères de texte libre, vers
      // n'importe qui par son pseudo, livrés par notification à quelqu'un qui
      // n'a rien accepté. La règle était écrite, elle n'était pas appliquée là.
      try {
        await proposer(deux, {
          pseudo: 'BancUn', dex: 'rby', offert: 'onix', demande: 'lippoutou',
          mot: 'échange avec moi sale con',
        });
        return 'échec : le mot injurieux est passé';
      } catch (e) {
        if (!/ne passe pas/.test(e.message)) {
          return `échec : refusé pour une autre raison — ${e.message}`;
        }
        // On ne NOMME PAS le mot fautif : le dire, c'est apprendre quoi
        // contourner. Même raison qu'à l'inscription.
        if (/\bcon\b/.test(e.message)) return 'échec : le refus nomme le mot fautif';
      }

      // Le même échange, avec un mot correct, doit passer : sans quoi on ne
      // saurait pas si c'est le mot qui a été refusé ou l'échange lui-même.
      const ok = await proposer(deux, {
        pseudo: 'BancUn', dex: 'rby', offert: 'onix', demande: 'lippoutou',
        mot: 'Salut ! Ça t’intéresse ? J’ai aussi un raton laveur… enfin, un Linéon.',
      });
      if (!ok?.id) return 'échec : le mot correct ne passe pas non plus';
      // ON RANGE DERRIÈRE SOI : trois propositions en attente par personne est la
      // limite, et une vérification qui la consomme fait échouer la suivante pour
      // une raison étrangère à ce qu'elle éprouve. C'est arrivé, exactement ainsi.
      await annuler(deux, ok.id);
      return 'mot injurieux refusé sans le nommer, mot ordinaire accepté';
    });

  await verifier(
    'On peut offrir sans rien demander, et les deux le lisent pareil',
    async () => {
      // OFFRIR N'EST PAS ÉCHANGER À MOITIÉ. `demande` vide veut dire « rien en
      // retour » — la colonne est NOT NULL et un identifiant d'espèce n'est
      // jamais vide, donc le vide dit « rien » sans ambiguïté ni migration.
      //
      // CE QUE CETTE VÉRIFICATION DÉFEND VRAIMENT : que les DEUX côtés le
      // lisent pareil. `vueEchange` retourne le sens selon qui regarde, et
      // c'est exactement le genre d'endroit où un don devient « je donne rien »
      // chez l'un et « je reçois rien » chez l'autre.
      const e = await proposer(un, {
        pseudo: 'BancDeux', dex: 'rby', offert: 'mackogneur', demande: '',
        mot: 'Tiens, il te manquait — cadeau.',
      });
      if (!e?.id) return 'échec : le don n’a pas été créé';

      const cotePropose = (await mesEchanges(un)).echanges.find((x) => x.id === e.id);
      const coteRecu = (await mesEchanges(deux)).echanges.find((x) => x.id === e.id);
      if (!cotePropose || !coteRecu) return 'échec : le don manque d’un des deux côtés';

      if (!cotePropose.don || !coteRecu.don) {
        return 'échec : le don n’est pas annoncé comme tel aux deux';
      }
      if (cotePropose.jeDonne !== 'mackogneur' || cotePropose.jeRecois) {
        return `échec : côté offrant, donne=${cotePropose.jeDonne} recoit=${cotePropose.jeRecois}`;
      }
      if (coteRecu.jeRecois !== 'mackogneur' || coteRecu.jeDonne) {
        return `échec : côté receveur, donne=${coteRecu.jeDonne} recoit=${coteRecu.jeRecois}`;
      }

      // Un échange ordinaire ne doit PAS se dire don : sans quoi le drapeau
      // serait vrai partout et n'apprendrait rien.
      const ordinaire = (await mesEchanges(un)).echanges.find((x) => x.id !== e.id && x.jeRecois);
      if (ordinaire && ordinaire.don) return 'échec : un échange ordinaire se dit don';

      await annuler(un, e.id);
      return 'offert d’un côté, reçu de l’autre, et rien en retour pour les deux';
    });

  console.log('\nLa messagerie');

  await verifier(
    'On écrit à quelqu’un sans passer par un échange, et il le lit',
    async () => {
      // CE QUE ÇA REMPLACE. Pour dire « tu aurais un Abra ? » il fallait
      // d'abord PROPOSER quelque chose — donc décider quoi donner et quoi
      // demander avant même d'avoir pu poser la question. L'outil imposait
      // l'ordre inverse de la conversation réelle.
      await ecrireA(un, 'BancDeux', 'Salut ! Tu aurais un Abra en trop ?');

      const chezLui = await conversations(deux);
      const fil = chezLui.conversations.find((c) => c.pseudo === 'BancUn');
      if (!fil) return 'échec : la conversation n’apparaît pas chez le destinataire';
      if (fil.nonLus !== 1) return `échec : ${fil.nonLus} non lus, un attendu`;
      if (fil.deMoi) return 'échec : son propre message lui est attribué';

      // LIRE MARQUE LU, sans second aller-retour : un écran ouvert EST la
      // lecture, et un appel séparé se perd un jour sur deux — fenêtre fermée
      // trop vite, réseau coupé.
      const vu = await conversation(deux, 'BancUn');
      if (vu.messages.length !== 1) return `échec : ${vu.messages.length} message(s) lus`;
      const apres = await conversations(deux);
      const relu = apres.conversations.find((c) => c.pseudo === 'BancUn');
      if (relu.nonLus !== 0) return 'échec : la lecture ne marque pas lu';

      return 'écrit, annoncé non lu, lu en ouvrant';
    });

  await verifier(
    'Les deux portes sont indépendantes : échanges et messages',
    async () => {
      // CETTE VÉRIFICATION DISAIT L'INVERSE. Elle affirmait que fermer
      // `echanges_ouverts` fermait aussi les messages — « on ne ferme pas la
      // moitié de sa porte ». C'était vrai tant qu'il n'y avait qu'un réglage.
      //
      // Il y en a deux maintenant, et la séparation est voulue : une
      // proposition d'échange se refuse d'un clic et disparaît, un message se
      // lit. On peut vouloir rester joignable pour échanger tout en fermant la
      // conversation aux inconnus — et l'inverse existe aussi.
      //
      // CE QUI SE CASSERAIT SANS ELLE : un refactor qui refait passer les
      // messages par `echanges_ouverts` fermerait la messagerie de tous ceux
      // qui ont seulement fermé leurs échanges, sans que personne ne l'ait
      // demandé.
      await changerEchangesOuverts(deux, false);
      await changerMessagesDe(deux, 'tous');
      try {
        await ecrireA(un, 'BancDeux', 'échanges fermés, mais je peux écrire ?');
      } catch (e) {
        return `échec : les échanges fermés bloquent les messages — ${e.message}`;
      }

      await changerEchangesOuverts(deux, true);
      await changerMessagesDe(deux, 'personne');
      const ok = await proposer(un, {
        pseudo: 'BancDeux', dex: 'rby', offert: 'rondoudou', demande: 'melofee',
      });
      if (!ok?.id) return 'échec : les messages fermés bloquent les échanges';
      await annuler(un, ok.id);

      await changerMessagesDe(deux, 'tous');
      return 'échanges fermés n’empêchent pas d’écrire, et réciproquement';
    });

  await verifier(
    'Le monologue est borné, la conversation ne l’est pas',
    async () => {
      // LA SEULE LIMITE QUI VAILLE. Entre deux personnes qui se parlent, il n'y
      // a aucune raison de compter. Face à quelqu'un qui ne répond pas, dix
      // messages sont déjà neuf de trop — et c'est la forme que prend le
      // harcèlement bien plus souvent qu'un seul message très long.
      //
      // BancDeux a répondu à l'étape précédente ? Non : il a LU, pas répondu.
      // La distinction est exactement celle que le service applique.
      let refus = null;
      for (let i = 0; i < 12 && !refus; i++) {
        try {
          await ecrireA(un, 'BancDeux', `message numéro ${i + 2}`);
        } catch (e) { refus = e.message; }
      }
      if (!refus) return 'échec : aucun plafond sur un monologue';
      if (!/pas encore répondu/.test(refus)) {
        return `échec : arrêté pour une autre raison — ${refus}`;
      }

      // Une réponse rouvre le robinet : c'est ce qui distingue la garde d'un
      // simple quota.
      await ecrireA(deux, 'BancUn', 'oui, je regarde ça');
      const encore = await ecrireA(un, 'BancDeux', 'super, merci !');
      if (!encore?.id) return 'échec : une réponse ne rouvre pas la conversation';

      return 'bloqué après dix sans réponse, rouvert dès qu’il répond';
    });

  await verifier(
    'Un message injurieux ne part pas, et le refus ne nomme pas le mot',
    async () => {
      try {
        await ecrireA(deux, 'BancUn', 'ferme ta gueule sale con');
        return 'échec : le message injurieux est passé';
      } catch (e) {
        if (!/ne passe pas/.test(e.message)) {
          return `échec : refusé pour une autre raison — ${e.message}`;
        }
        if (/\bcon\b/.test(e.message)) return 'échec : le refus nomme le mot fautif';
      }
      // Et une phrase ordinaire contenant un mot ambigu doit passer : c'est la
      // moitié qui coûte le plus cher à rater.
      const ok = await ecrireA(deux, 'BancUn', 'mon raton laveur préféré, c’est Linéon');
      if (!ok?.id) return 'échec : une phrase ordinaire est refusée';
      return 'injure refusée sans la nommer, phrase ordinaire acceptée';
    });

  await verifier(
    'Les trois crans de « qui peut m’écrire », et le sens de « amis »',
    async () => {
      // LE PIÈGE DU CRAN DU MILIEU, et c'est tout l'objet de cette
      // vérification. `pa_amis` est à sens unique : dresseur_id suit ami_id.
      // « Seulement mes amis » doit donc interroger QUI LE DESTINATAIRE SUIT.
      // Prendre l'autre sens laisserait n'importe qui s'ouvrir la porte en
      // s'abonnant à sa cible — le réglage protégerait alors exactement
      // personne, tout en ayant l'air de fonctionner.
      const ecrit = async () => {
        try { await ecrireA(un, 'BancDeux', 'toc toc'); return null; }
        catch (e) { return e.message; }
      };

      await changerMessagesDe(deux, 'personne');
      const ferme = await ecrit();
      if (!ferme || !/n’accepte pas les messages/.test(ferme || '')) {
        return `échec : « personne » laisse passer — ${ferme || 'aucun refus'}`;
      }

      await changerMessagesDe(deux, 'amis');
      // BancDeux ne suit PAS BancUn à ce stade — mais BancUn suit BancDeux, ce
      // que le décor a posé. C'est précisément le cas qui distingue les deux
      // lectures du lien.
      const pasAmi = await ecrit();
      if (!pasAmi || !/que des dresseurs qu’il suit/.test(pasAmi || '')) {
        return `échec : « amis » lit le lien à l’envers — ${pasAmi || 'aucun refus'}`;
      }

      await suivre(deux, 'BancUn');
      const ami = await ecrit();
      if (ami) return `échec : refusé alors qu’il le suit — ${ami}`;

      await changerMessagesDe(deux, 'tous');
      const ouvert = await ecrit();
      if (ouvert) return `échec : « tous » refuse quand même — ${ouvert}`;

      // Une valeur inconnue ne doit pas créer un quatrième état silencieux.
      const rabattu = await changerMessagesDe(deux, 'nimporte quoi');
      if (rabattu.messagesDe !== 'tous') {
        return `échec : une valeur inconnue devient « ${rabattu.messagesDe} »`;
      }

      return 'personne refuse, amis lit le lien dans le bon sens, tous accepte';
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

// --- Les noms refusés ---------------------------------------------------------
// Sans base : c'est de la logique pure, et elle se joue avant le décor.

async function nomsRefuses() {
  console.log('\nLes noms');

  await verifier(
    "Les injures écrites à l'oreille tombent, les prénoms réels passent",
    async () => {
      // LE SIGNALEMENT QUI L'A FAIT NAÎTRE : un joueur s'appelait
      // « sinjenkuleur ». C'est « singe en couleur » écrit comme il se
      // prononce, et le filtre ne comparait que des lettres — il n'y en a pas
      // une seule en commun sur la moitié du mot.
      //
      // LES DEUX MOITIÉS COMPTENT AUTANT. Un filtre qui refuse Cassandre,
      // Conrad ou Nikita est pire que pas de filtre : il insulte des gens qui
      // portent leur propre nom. C'est le problème dit de Scunthorpe, et la
      // liste d'innocents ci-dessous est le vrai garde-fou de ce fichier.
      const tombe = [
        'sinjenkuleur', 'singe en couleur', 'sinj en kouleur', 'Sinjenkouleur',
        'sale singe', 'sallesinje', 'chambre a gaz', 'chanbreagaz',
        'connard', 'c0nn4rd', 'xX_encule_Xx', 'xxxgamer', 'kkk',
      ];
      // « Team X » et « Sacha x Ondine » étaient refusés — mesure faite, pas
      // supposition. « xxx » se replie en « x », et l'exigence du mot entier,
      // qui protège « Dickens », ne protège rien quand la lettre EST le mot.
      const passe = [
        'Cassandre', 'Conrad', 'Constance', 'Nikita', 'Dominik', 'Analyse',
        'Culotte', 'Scunthorpe', 'Assange', 'Le Roi Singe', 'Singe Vert',
        'Colossinge', 'Ouisticram', 'Chambery', 'Cecile', 'Margaux',
        'Sacha x Ondine', 'Team X', 'Max', 'Alex', 'Dickens', 'Shitake',
      ];

      const manques = tombe.filter((n) => !motInterdit(n));
      const faux = passe.filter((n) => motInterdit(n));
      if (manques.length) {
        return `échec : passé alors qu'il devait tomber — ${manques.join(', ')}`;
      }
      if (faux.length) {
        const d = faux.map((n) => `${n} (${motInterdit(n)})`).join(', ');
        return `échec : refusé alors qu'il devait passer — ${d}`;
      }
      return `${tombe.length} refusés, ${passe.length} noms ordinaires acceptés`;
    });

  await verifier(
    "Le nom d'aventure passe par le même filtre, aux trois portes",
    async () => {
      // Création, renommage et import appellent tous nettoyerNomProfil, qui
      // interroge la liste. Le vérifier plutôt que de le croire : c'est la
      // seule chose qui empêche l'écran des amis d'afficher une injure à tout
      // le monde, et personne ne surveille la liste après coup.
      const fs = await import('node:fs/promises');
      const src = await fs.readFile(new URL('../src/comptes.js', import.meta.url), 'utf8');
      const appels = (src.match(/nettoyerNomProfil\(/g) || []).length - 1;
      if (appels < 3) {
        return `échec : ${appels} porte(s) seulement passent par le filtre`;
      }
      const declaration = src.slice(src.indexOf('function nettoyerNomProfil'));
      if (declaration.slice(0, 800).indexOf('estInterdit(') === -1) {
        return 'échec : nettoyerNomProfil n’interroge plus la liste des noms refusés';
      }
      return `${appels} portes — création, renommage, import — toutes filtrées`;
    });
}

// --- Entrée ------------------------------------------------------------------

console.log(`\nBanc de l'API — ${description()}`);
// Les noms d'abord : ils ne demandent pas la base, et un échec là-dessus se
// lit mieux en tête de rapport qu'entre deux requêtes SQL.
await nomsRefuses();

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
