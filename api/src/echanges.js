// Les échanges : « je te donne celui-ci contre celui-là, sur ce jeu ».
//
// CE QUE CE MODULE FAIT, ET CE QU'IL NE FAIT PAS. Il ne déplace aucun Pokémon
// et n'en vérifie aucun : PokéArchive est un carnet, pas une console. Ce qui
// est enregistré ici est une INTENTION — deux joueurs se mettent d'accord, puis
// vont se retrouver dans leur jeu pour le faire vraiment. L'application tient
// l'accord, la console tient l'échange.
//
// D'où l'état « fait », posé à la main par l'un des deux. Personne ne peut le
// constater à leur place, et prétendre le deviner serait mentir.
//
// TROIS RÈGLES DE FOND :
//
//   · une proposition s'adresse à quelqu'un, qui l'accepte ou la refuse ;
//   · la discussion n'ouvre qu'une fois acceptée — sinon la boîte de réception
//     devient un canal de messages non sollicités, ce qu'un abonnement à sens
//     unique ne doit surtout pas ouvrir ;
//   · rien ne s'efface : un refus reste lisible par les deux, parce que « il
//     n'a jamais répondu » et « il a refusé » ne se vivent pas pareil.

import { lire, une, ecrire } from './base.js';
import { ErreurCompte, horodatage } from './comptes.js';
import { notifier } from './notifications.js';

// Combien de propositions en attente chez la MÊME personne. Au-delà ce n'est
// plus une proposition, c'est une liste de courses.
const EN_ATTENTE_PAR_PERSONNE = 3;
// Et au total. Qui propose vingt échanges d'un coup ne cherche pas à échanger.
const EN_ATTENTE_EN_TOUT = 20;

const MESSAGE_MAX = 1000;
const MOT_MAX = 280;
const MESSAGES_PAGE = 200;

const normaliser = (p) => (p || '')
  .trim().replace(/\s+/g, ' ')
  .normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .toLowerCase();

async function dresseurParPseudo(pseudo) {
  const d = await une(
    'SELECT id, pseudo, avatar, discord_id FROM pa_dresseurs WHERE pseudo_cle = ?',
    [normaliser(pseudo)]);
  if (!d) throw new ErreurCompte('Ce dresseur n’existe pas.', 404);
  return d;
}

/** Un nom d'espèce tel que l'application les écrit : minuscules et tirets. */
function espece(v, quoi) {
  const s = String(v || '').trim().toLowerCase();
  if (!s) throw new ErreurCompte(`Il manque ${quoi}.`, 400);
  if (s.length > 64 || !/^[a-z0-9-]+$/.test(s)) {
    throw new ErreurCompte(`${quoi} n’est pas un Pokémon reconnu.`, 400);
  }
  return s;
}

// --- Proposer ----------------------------------------------------------------

export async function proposer(dresseurId, { pseudo, dex, offert, demande, mot }) {
  const autre = await dresseurParPseudo(pseudo);
  if (autre.id === dresseurId) {
    throw new ErreurCompte('Tu ne peux pas t’échanger un Pokémon à toi-même.', 400);
  }

  const jeu = String(dex || '').trim().toLowerCase();
  if (!jeu || jeu.length > 32 || !/^[a-z0-9-]+$/.test(jeu)) {
    throw new ErreurCompte('Dis sur quel jeu se ferait l’échange.', 400);
  }

  const donne = espece(offert, 'le Pokémon que tu proposes');
  const veut = espece(demande, 'le Pokémon que tu demandes');
  if (donne === veut) throw new ErreurCompte('Les deux Pokémon sont les mêmes.', 400);

  // Le doublon exact d'abord : reproposer le même échange à la même personne
  // n'ajoute rien et lui vaudrait une seconde notification pour rien.
  const deja = await une(
    `SELECT id FROM pa_echanges
      WHERE demandeur_id = ? AND receveur_id = ? AND dex = ?
        AND offert = ? AND demande = ? AND etat = 'propose'`,
    [dresseurId, autre.id, jeu, donne, veut]);
  if (deja) throw new ErreurCompte('Tu lui as déjà proposé cet échange.', 400);

  const versLui = await une(
    `SELECT COUNT(*) AS n FROM pa_echanges
      WHERE demandeur_id = ? AND receveur_id = ? AND etat = 'propose'`,
    [dresseurId, autre.id]);
  if (Number(versLui.n) >= EN_ATTENTE_PAR_PERSONNE) {
    throw new ErreurCompte(
      'Trois propositions en attente chez la même personne, c’est le maximum. '
      + 'Attends sa réponse.', 400);
  }

  const enTout = await une(
    "SELECT COUNT(*) AS n FROM pa_echanges WHERE demandeur_id = ? AND etat = 'propose'",
    [dresseurId]);
  if (Number(enTout.n) >= EN_ATTENTE_EN_TOUT) {
    throw new ErreurCompte('Tu as vingt propositions en attente. Fais le ménage d’abord.', 400);
  }

  const quand = horodatage();
  const r = await ecrire(
    `INSERT INTO pa_echanges
       (demandeur_id, receveur_id, dex, offert, demande, etat, mot, cree_le, maj_le)
     VALUES (?, ?, ?, ?, ?, 'propose', ?, ?, ?)`,
    [dresseurId, autre.id, jeu, donne, veut,
      (mot ? String(mot).slice(0, MOT_MAX) : null), quand, quand]);

  const moi = await une('SELECT pseudo FROM pa_dresseurs WHERE id = ?', [dresseurId]);
  await notifier(autre.id, {
    genre: 'echange',
    echangeId: r.insertId,
    // Le titre porte le nom de LA PERSONNE, jamais celui des Pokémon : ici on
    // n'a que des identifiants d'espèce (« mr-mime »), et c'est l'application
    // qui sait les traduire dans la langue choisie. Elle refait la phrase
    // complète à l'affichage, à partir de l'échange joint — voir
    // notifications.js, qui le renvoie avec.
    titre: `${moi.pseudo} te propose un échange`,
  });

  return { id: r.insertId, etat: 'propose' };
}

// --- Répondre ----------------------------------------------------------------

async function echangeOuErreur(id) {
  const e = await une(
    `SELECT e.*, d.pseudo AS demandeur, r.pseudo AS receveur
       FROM pa_echanges e
       JOIN pa_dresseurs d ON d.id = e.demandeur_id
       JOIN pa_dresseurs r ON r.id = e.receveur_id
      WHERE e.id = ?`, [Number(id) || 0]);
  if (!e) throw new ErreurCompte('Cet échange n’existe pas.', 404);
  return e;
}

/** L'échange, à condition d'y être. Sert de garde à tout ce qui suit. */
async function monEchange(dresseurId, id) {
  const e = await echangeOuErreur(id);
  if (e.demandeur_id !== dresseurId && e.receveur_id !== dresseurId) {
    // 404 plutôt que 403 : répondre « il existe, mais pas pour toi »
    // renseignerait sur les échanges des autres, qui ne regardent personne.
    throw new ErreurCompte('Cet échange n’existe pas.', 404);
  }
  return e;
}

export async function repondre(dresseurId, id, reponse) {
  const e = await monEchange(dresseurId, id);
  if (e.receveur_id !== dresseurId) {
    throw new ErreurCompte('C’est à l’autre de répondre, pas à toi.', 403);
  }
  if (e.etat !== 'propose') throw new ErreurCompte('Cet échange a déjà été tranché.', 400);

  const veut = reponse === 'accepte' ? 'accepte' : 'refuse';
  // La condition sur l'état est REDITE dans le UPDATE : deux clics simultanés
  // passeraient tous deux la vérification ci-dessus, et le second écraserait la
  // réponse du premier.
  await ecrire(
    "UPDATE pa_echanges SET etat = ?, maj_le = ? WHERE id = ? AND etat = 'propose'",
    [veut, horodatage(), e.id]);

  await notifier(e.demandeur_id, {
    genre: veut === 'accepte' ? 'echange_accepte' : 'echange_refuse',
    echangeId: e.id,
    titre: veut === 'accepte'
      ? `${e.receveur} a accepté ton échange`
      : `${e.receveur} a refusé ton échange`,
    detail: veut === 'accepte' ? 'Vous pouvez en discuter.' : null,
  });

  return { id: e.id, etat: veut };
}

/** Le demandeur retire sa proposition, tant qu'elle n'a pas été tranchée. */
export async function annuler(dresseurId, id) {
  const e = await monEchange(dresseurId, id);
  if (e.demandeur_id !== dresseurId) {
    throw new ErreurCompte('Seul celui qui propose peut la retirer.', 403);
  }
  if (e.etat !== 'propose') throw new ErreurCompte('Trop tard : l’autre a déjà répondu.', 400);
  await ecrire("UPDATE pa_echanges SET etat = 'annule', maj_le = ? WHERE id = ?",
    [horodatage(), e.id]);
  return { id: e.id, etat: 'annule' };
}

/**
 * « C'est fait. »
 *
 * Posé à la main, par l'un ou par l'autre. Le service ne voit pas les consoles :
 * il ne peut ni le constater ni le deviner. Sans ce bouton, un échange accepté
 * resterait ouvert pour toujours et la liste ne ferait que grandir.
 */
export async function conclure(dresseurId, id) {
  const e = await monEchange(dresseurId, id);
  if (e.etat !== 'accepte') throw new ErreurCompte('Cet échange n’est pas en cours.', 400);
  await ecrire("UPDATE pa_echanges SET etat = 'fait', maj_le = ? WHERE id = ?",
    [horodatage(), e.id]);

  const autre = e.demandeur_id === dresseurId ? e.receveur_id : e.demandeur_id;
  const moi = e.demandeur_id === dresseurId ? e.demandeur : e.receveur;
  await notifier(autre, {
    genre: 'echange_fait', echangeId: e.id,
    titre: `${moi} a marqué votre échange comme fait`,
  });
  return { id: e.id, etat: 'fait' };
}

// --- La liste ----------------------------------------------------------------

/**
 * Un échange vu depuis un côté.
 *
 * `offert` et `demande` sont écrits en base du point de vue du DEMANDEUR. Les
 * rendre tels quels au receveur lui ferait lire « tu offres » sous le Pokémon
 * qu'il reçoit. On les remet donc dans son sens à lui : `jeDonne` et `jeRecois`
 * veulent alors dire la même chose pour les deux, et l'écran n'a plus à savoir
 * de quel côté il se trouve pour écrire la bonne phrase.
 */
function vueEchange(l, moi) {
  const jeSuisDemandeur = l.demandeur_id === moi;
  return {
    id: l.id,
    sens: jeSuisDemandeur ? 'propose' : 'recu',
    dex: l.dex,
    jeDonne: jeSuisDemandeur ? l.offert : l.demande,
    jeRecois: jeSuisDemandeur ? l.demande : l.offert,
    etat: l.etat,
    mot: l.mot,
    messages: Number(l.messages) || 0,
    quand: l.cree_le,
    majLe: l.maj_le,
    avec: {
      pseudo: jeSuisDemandeur ? l.receveur_pseudo : l.demandeur_pseudo,
      avatar: jeSuisDemandeur ? l.receveur_avatar : l.demandeur_avatar,
      discordId: jeSuisDemandeur ? l.receveur_discord : l.demandeur_discord,
    },
  };
}

export async function mesEchanges(dresseurId) {
  const lignes = await lire(
    `SELECT e.id, e.dex, e.offert, e.demande, e.etat, e.mot, e.cree_le, e.maj_le,
            e.demandeur_id, e.receveur_id,
            d.pseudo AS demandeur_pseudo, d.avatar AS demandeur_avatar,
            d.discord_id AS demandeur_discord,
            r.pseudo AS receveur_pseudo,  r.avatar AS receveur_avatar,
            r.discord_id AS receveur_discord,
            (SELECT COUNT(*) FROM pa_messages m WHERE m.echange_id = e.id) AS messages
       FROM pa_echanges e
       JOIN pa_dresseurs d ON d.id = e.demandeur_id
       JOIN pa_dresseurs r ON r.id = e.receveur_id
      WHERE e.demandeur_id = ? OR e.receveur_id = ?
      ORDER BY e.maj_le DESC, e.id DESC LIMIT 100`,
    [dresseurId, dresseurId]);

  return { echanges: lignes.map((l) => vueEchange(l, dresseurId)) };
}

// --- La discussion -----------------------------------------------------------

/**
 * Ouverte seulement une fois l'échange accepté.
 *
 * C'est la garde qui empêche un abonnement à sens unique de devenir un canal de
 * messages non sollicités : pour t'écrire, il faut que tu aies dit oui. Un
 * échange conclu reste lisible — on relit ce qu'on s'est dit — et refuser ou
 * annuler ferme la porte.
 */
function discussionOuverte(e) {
  if (e.etat === 'accepte' || e.etat === 'fait') return;
  if (e.etat === 'propose') {
    throw new ErreurCompte('La discussion s’ouvre une fois l’échange accepté.', 400);
  }
  throw new ErreurCompte('Cet échange est clos.', 400);
}

export async function messages(dresseurId, id) {
  const e = await monEchange(dresseurId, id);
  discussionOuverte(e);
  const lignes = await lire(
    `SELECT m.id, m.texte, m.cree_le, m.auteur_id, d.pseudo
       FROM pa_messages m
       JOIN pa_dresseurs d ON d.id = m.auteur_id
      WHERE m.echange_id = ?
      ORDER BY m.id ASC LIMIT ${MESSAGES_PAGE}`, [e.id]);

  return {
    echange: vueEchange({
      ...e,
      demandeur_pseudo: e.demandeur, receveur_pseudo: e.receveur,
      demandeur_avatar: null, receveur_avatar: null,
      demandeur_discord: null, receveur_discord: null, messages: lignes.length,
    }, dresseurId),
    messages: lignes.map((m) => ({
      id: m.id, texte: m.texte, quand: m.cree_le,
      pseudo: m.pseudo, deMoi: m.auteur_id === dresseurId,
    })),
  };
}

export async function ecrireMessage(dresseurId, id, texte) {
  const e = await monEchange(dresseurId, id);
  discussionOuverte(e);

  const t = String(texte || '').trim().slice(0, MESSAGE_MAX);
  if (!t) throw new ErreurCompte('Le message est vide.', 400);

  const quand = horodatage();
  const r = await ecrire(
    'INSERT INTO pa_messages (echange_id, auteur_id, texte, cree_le) VALUES (?, ?, ?, ?)',
    [e.id, dresseurId, t, quand]);
  // L'échange remonte en tête de liste : c'est là qu'il se passe quelque chose.
  await ecrire('UPDATE pa_echanges SET maj_le = ? WHERE id = ?', [quand, e.id]);

  const autre = e.demandeur_id === dresseurId ? e.receveur_id : e.demandeur_id;
  const moi = e.demandeur_id === dresseurId ? e.demandeur : e.receveur;
  await notifier(autre, {
    genre: 'message', echangeId: e.id,
    titre: `${moi} t’a écrit`,
    // Le début du message dans la notification : savoir qu'on a reçu quelque
    // chose sans savoir quoi n'aide pas à décider s'il faut ouvrir maintenant.
    detail: t.length > 120 ? `${t.slice(0, 117)}…` : t,
  });

  return { id: r.insertId, quand };
}
