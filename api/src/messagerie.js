// Les messages directs : écrire à quelqu'un sans passer par un échange.
//
// CE QUI EXISTAIT, ET POURQUOI ÇA NE SUFFISAIT PAS. On ne pouvait écrire qu'à
// l'intérieur d'un échange. Pour dire « tu aurais un Abra ? » il fallait donc
// d'abord PROPOSER quelque chose — c'est-à-dire décider quoi donner et quoi
// demander avant même d'avoir pu poser la question. L'outil imposait l'ordre
// inverse de la conversation réelle.
//
// LA MÊME TABLE QUE LES ÉCHANGES, et c'est le choix de fond. `pa_messages`
// porte désormais soit un `echange_id`, soit un `destinataire_id`. Deux tables
// auraient divergé au premier correctif — sur la longueur, sur l'ordre, sur ce
// qu'on affiche. Et à l'écran, une conversation avec quelqu'un est UNE
// conversation : qu'un message parle d'un échange précis ou de rien de
// particulier ne change pas à qui l'on parle.
//
// CE QUE ÇA OUVRE, ET QU'IL FAUT REGARDER EN FACE. N'importe qui peut désormais
// écrire à n'importe qui. C'est exactement ce que l'ancienne règle des échanges
// voulait empêcher. Ce qui protège maintenant :
//
//   la porte    `messages_de` — tout le monde, mes amis seuls, ou personne ;
//   le filtre   `injurieuxDansPhrase`, le même que sur les mots d'échange ;
//   le compteur `SANS_REPONSE_MAX` vers une même personne qui n'a jamais
//               répondu — voir plus bas, c'est la garde qui compte vraiment.

import { lire, une, ecrire } from './base.js';
import { ErreurCompte, horodatage, normaliser } from './comptes.js';
import { notifier } from './notifications.js';
import { injurieuxDansPhrase } from './pseudos-interdits.js';

const MESSAGE_MAX = 1000;
const CONVERSATION_PAGE = 200;

// Une recherche n'est pas une liste : au-delà de quarante lignes on ne lit
// plus, on reformule. Le plafond dit donc « affine » plutôt que de dérouler.
const RECHERCHE_MAX = 40;

// Combien de messages on peut envoyer à quelqu'un QUI N'A JAMAIS RÉPONDU.
//
// C'est la seule limite qui vaille : entre deux personnes qui se parlent, il
// n'y a aucune raison de compter. Face à quelqu'un qui ne répond pas, dix
// messages sont déjà neuf de trop — et c'est la forme que prend le harcèlement
// bien plus souvent qu'un seul message très long.
const SANS_REPONSE_MAX = 10;

async function dresseurParPseudo(pseudo) {
  const d = await une(
    `SELECT id, pseudo, avatar, discord_id, messages_de
       FROM pa_dresseurs WHERE pseudo_cle = ?`, [normaliser(pseudo)]);
  if (!d) throw new ErreurCompte('Ce dresseur n’existe pas.', 404);
  return d;
}

/**
 * Écrire à quelqu'un.
 *
 * LES TROIS REFUS, DANS CET ORDRE — du plus catégorique au plus circonstanciel,
 * pour que le message d'erreur soit toujours le plus explicatif des trois.
 */
/**
 * L'identifiant d'espèce attaché à un message, ou rien.
 *
 * MÊME FORME QUE PARTOUT : minuscules et tirets, comme l'application les écrit.
 * On ne vérifie pas que l'espèce EXISTE — le serveur n'a pas le Pokédex, il est
 * embarqué dans l'application — mais on refuse tout ce qui n'a pas la forme
 * d'un identifiant, ce qui suffit à écarter du texte déguisé en pièce jointe.
 */
function especeAttachee(v) {
  const s = String(v || '').trim().toLowerCase();
  if (!s) return null;
  if (s.length > 64 || !/^[a-z0-9-]+$/.test(s)) {
    throw new ErreurCompte('Ce Pokémon n’est pas reconnu.', 400);
  }
  return s;
}

export async function ecrireA(dresseurId, pseudo, texte, espece = null) {
  const autre = await dresseurParPseudo(pseudo);
  if (autre.id === dresseurId) {
    throw new ErreurCompte('Tu ne peux pas t’écrire à toi-même.', 400);
  }

  // 1. La porte, et ses trois crans.
  //
  //    « AMIS » VEUT DIRE CEUX QU'IL SUIT, LUI. `pa_amis` est à sens unique :
  //    dresseur_id suit ami_id. On demande donc si LE DESTINATAIRE suit
  //    l'expéditeur — c'est son choix à lui qui garde sa boîte, pas le mien.
  //    L'inverse laisserait n'importe qui s'ouvrir la porte en s'abonnant.
  const porte = autre.messages_de || 'tous';
  if (porte === 'personne') {
    throw new ErreurCompte(
      `${autre.pseudo} n’accepte pas les messages en ce moment.`, 403);
  }
  if (porte === 'amis') {
    const suit = await une(
      'SELECT 1 AS oui FROM pa_amis WHERE dresseur_id = ? AND ami_id = ?',
      [autre.id, dresseurId]);
    if (!suit) {
      throw new ErreurCompte(
        `${autre.pseudo} n’accepte les messages que des dresseurs qu’il suit.`, 403);
    }
  }

  const attachee = especeAttachee(espece);
  const t = String(texte || '').trim().slice(0, MESSAGE_MAX);
  // UN POKEMON SEUL EST UN MESSAGE. Exiger du texte à côté obligerait à écrire
  // « tiens » sous chaque carte, ce que personne ne fait deux fois.
  if (!t && !attachee) throw new ErreurCompte('Le message est vide.', 400);

  // 2. Le filtre. Sans nommer le mot fautif : le dire, c'est apprendre quoi
  //    contourner.
  if (injurieuxDansPhrase(t)) {
    throw new ErreurCompte('Ton message ne passe pas. Reformule-le.', 400);
  }

  // 3. Le monologue. On ne compte QUE si l'autre n'a jamais répondu : deux
  //    personnes qui se parlent n'ont pas à être comptées.
  const reponse = await une(
    `SELECT id FROM pa_messages
      WHERE auteur_id = ? AND destinataire_id = ? LIMIT 1`, [autre.id, dresseurId]);
  if (!reponse) {
    const envoyes = await une(
      `SELECT COUNT(*) AS n FROM pa_messages
        WHERE auteur_id = ? AND destinataire_id = ?`, [dresseurId, autre.id]);
    if (Number(envoyes.n) >= SANS_REPONSE_MAX) {
      throw new ErreurCompte(
        `${autre.pseudo} ne t’a pas encore répondu. Attends sa réponse avant `
        + 'de lui écrire davantage.', 429);
    }
  }

  const quand = horodatage();
  const r = await ecrire(
    `INSERT INTO pa_messages (destinataire_id, auteur_id, texte, espece, lu, cree_le)
     VALUES (?, ?, ?, ?, 0, ?)`, [autre.id, dresseurId, t, attachee, quand]);

  const moi = await une('SELECT pseudo FROM pa_dresseurs WHERE id = ?', [dresseurId]);
  await notifier(autre.id, {
    genre: 'message',
    // Pour que cliquer la notification ouvre LA conversation, et non la page
    // des amis faute de savoir avec qui.
    deId: dresseurId,
    titre: `${moi.pseudo} t’a écrit`,
    // Le début du message : savoir qu'on a reçu quelque chose sans savoir quoi
    // n'aide pas à décider s'il faut ouvrir maintenant.
    // Une carte sans un mot n'a pas de détail à montrer : on dit ce qui arrive
    // plutôt que d'annoncer un message vide.
    detail: t ? (t.length > 120 ? `${t.slice(0, 117)}…` : t) : 'Un Pokémon',
  });

  return { id: r.insertId, quand };
}

/**
 * Avec qui j'ai une conversation, et où elle en est.
 *
 * UNE PERSONNE, UNE CONVERSATION. Les messages d'un échange et les messages
 * directs sont la même chose : on parle à quelqu'un. Les séparer donnait deux
 * boîtes pour le même interlocuteur, dont l'une ne s'ouvrait qu'en passant par
 * la fiche d'un échange — et rien ne disait qu'elle existait.
 *
 * D'OÙ L'UNION plutôt qu'une seule condition : les deux sortes de lignes ne
 * désignent pas l'autre personne de la même façon. Un message direct la nomme
 * dans `destinataire_id` ; un message d'échange ne la nomme pas du tout, il
 * faut passer par l'échange pour savoir qui sont les deux parties. On ramène
 * donc les deux à un même « autre_id » avant de grouper.
 */
export async function conversations(dresseurId) {
  const resumes = await lire(
    `SELECT autre_id, MAX(id) AS dernier_id, SUM(non_lu) AS non_lus
       FROM (
         SELECT m.id,
                IF(m.auteur_id = ?, m.destinataire_id, m.auteur_id) AS autre_id,
                (m.auteur_id <> ? AND m.lu = 0) AS non_lu
           FROM pa_messages m
          WHERE m.destinataire_id IS NOT NULL
            AND (m.auteur_id = ? OR m.destinataire_id = ?)
         UNION ALL
         SELECT m.id,
                IF(e.demandeur_id = ?, e.receveur_id, e.demandeur_id) AS autre_id,
                (m.auteur_id <> ? AND m.lu = 0) AS non_lu
           FROM pa_messages m
           JOIN pa_echanges e ON e.id = m.echange_id
          WHERE m.echange_id IS NOT NULL
            AND (e.demandeur_id = ? OR e.receveur_id = ?)
       ) t
      GROUP BY autre_id`,
    [dresseurId, dresseurId, dresseurId, dresseurId,
      dresseurId, dresseurId, dresseurId, dresseurId]);

  if (!resumes.length) return { conversations: [] };

  // Le dernier message et la personne, en une requête pour tout le monde plutôt
  // qu'une par conversation.
  const ids = resumes.map((r) => r.dernier_id);
  const lignes = await lire(
    `SELECT m.id, m.texte, m.cree_le, m.auteur_id,
            d.id AS autre_id, d.pseudo, d.avatar, d.discord_id
       FROM pa_messages m
       JOIN pa_dresseurs d ON d.id = ?
      WHERE m.id IN (${ids.map(() => '?').join(',')})`,
    [dresseurId, ...ids]);
  const parId = new Map(lignes.map((l) => [l.id, l]));

  const gens = await lire(
    `SELECT id, pseudo, avatar, discord_id FROM pa_dresseurs
      WHERE id IN (${resumes.map(() => '?').join(',')})`,
    resumes.map((r) => r.autre_id));
  const parPersonne = new Map(gens.map((g) => [g.id, g]));

  return {
    conversations: resumes
      .map((r) => {
        const m = parId.get(r.dernier_id);
        const qui = parPersonne.get(Number(r.autre_id));
        if (!m || !qui) return null;
        return {
          pseudo: qui.pseudo,
          avatar: qui.avatar,
          discordId: qui.discord_id,
          dernier: m.texte,
          deMoi: m.auteur_id === dresseurId,
          quand: m.cree_le,
          nonLus: Number(r.non_lus) || 0,
          dernierId: r.dernier_id,
        };
      })
      .filter(Boolean)
      // La plus récente en tête : c'est là qu'il se passe quelque chose.
      .sort((a, b) => b.dernierId - a.dernierId),
  };
}

/**
 * Une conversation, et sa lecture.
 *
 * ON Y TROUVE TOUT CE QU'ON S'EST DIT, messages d'échange compris. Chacun de
 * ceux-là porte l'échange dont il parle — sans quoi « d'accord pour demain »
 * arriverait sans qu'on sache de quel troc il s'agit.
 *
 * MARQUER LU EN LISANT, plutôt que par un appel séparé : un écran ouvert EST la
 * lecture, et un second aller-retour pour le dire se serait perdu un jour sur
 * deux — fenêtre fermée trop vite, réseau coupé, onglet changé.
 */
export async function conversation(dresseurId, pseudo) {
  const autre = await dresseurParPseudo(pseudo);
  const lignes = await lire(
    `SELECT m.id, m.texte, m.espece, m.cree_le, m.auteur_id, m.echange_id,
            e.offert, e.demande, e.dex, e.etat, e.demandeur_id
       FROM pa_messages m
       LEFT JOIN pa_echanges e ON e.id = m.echange_id
      WHERE (
              m.destinataire_id IS NOT NULL
              AND ((m.auteur_id = ? AND m.destinataire_id = ?)
                OR (m.auteur_id = ? AND m.destinataire_id = ?))
            )
         OR (
              m.echange_id IS NOT NULL
              AND ((e.demandeur_id = ? AND e.receveur_id = ?)
                OR (e.demandeur_id = ? AND e.receveur_id = ?))
            )
      ORDER BY m.id DESC
      LIMIT ${CONVERSATION_PAGE}`,
    [dresseurId, autre.id, autre.id, dresseurId,
      dresseurId, autre.id, autre.id, dresseurId]);

  // DESC PUIS RETOURNÉ : c'est la FIN d'une conversation qu'on veut voir, pas
  // son début. Trié ASC avec une limite, la fenêtre se figeait sur les deux
  // cents premiers messages et les nouveaux n'apparaissaient jamais.
  lignes.reverse();

  await ecrire(
    `UPDATE pa_messages m
       LEFT JOIN pa_echanges e ON e.id = m.echange_id
        SET m.lu = 1
      WHERE m.lu = 0 AND m.auteur_id = ?
        AND (m.destinataire_id = ?
          OR (m.echange_id IS NOT NULL
              AND ((e.demandeur_id = ? AND e.receveur_id = ?)
                OR (e.demandeur_id = ? AND e.receveur_id = ?))))`,
    [autre.id, dresseurId, dresseurId, autre.id, autre.id, dresseurId]);

  return {
    avec: { pseudo: autre.pseudo, avatar: autre.avatar, discordId: autre.discord_id },
    messages: lignes.map((m) => ({
      id: m.id,
      texte: m.texte,
      espece: m.espece || null,
      quand: m.cree_le,
      deMoi: m.auteur_id === dresseurId,
      // L'échange dont ce message parle, quand il en vient d'un. Les deux noms
      // sont remis dans le sens de CELUI QUI LIT, comme partout ailleurs.
      echange: m.echange_id ? {
        id: m.echange_id,
        dex: m.dex,
        etat: m.etat,
        jeDonne: m.demandeur_id === dresseurId ? m.offert : m.demande,
        jeRecois: m.demandeur_id === dresseurId ? m.demande : m.offert,
        don: !m.demande,
      } : null,
    })),
  };
}

/**
 * Chercher dans tout ce qu'on s'est dit.
 *
 * CÔTÉ SERVEUR, ET NON DANS CE QUI EST DÉJÀ CHARGÉ. L'écran ne tient que les
 * deux cents derniers messages d'une seule conversation : y filtrer donnerait
 * une recherche qui ne trouve que ce qu'on a déjà sous les yeux, ce qui est la
 * définition d'une recherche inutile.
 *
 * LE MOTIF EST ÉCHAPPÉ. `%` et `_` sont des caractères spéciaux de LIKE :
 * chercher « 100% » sans les neutraliser ramènerait tout, et l'on croirait à
 * un défaut du classement plutôt qu'à un caractère mal compris. Le piège est
 * silencieux — la requête réussit, elle répond simplement n'importe quoi.
 */
export async function chercher(dresseurId, motif) {
  const q = String(motif || '').trim();
  if (q.length < 2) return { resultats: [] };
  // LE POINT D'EXCLAMATION PLUTOT QUE LE BACKSLASH. Celui-ci est special
  // trois fois — en JavaScript, dans la chaine SQL, et pour LIKE — et
  // `ESCAPE '\'` finissait en chaine non terminee cote MariaDB. Le `!`
  // n'est special nulle part : une couche d'echappement au lieu de trois.
  const like = `%${q.replace(/[!%_]/g, (c) => `!${c}`)}%`;

  const lignes = await lire(
    `SELECT m.id, m.texte, m.cree_le, m.auteur_id, m.espece, m.echange_id,
            d.pseudo AS autre
       FROM pa_messages m
       LEFT JOIN pa_echanges e ON e.id = m.echange_id
       JOIN pa_dresseurs d
         ON d.id = IF(m.destinataire_id IS NOT NULL,
                      IF(m.auteur_id = ?, m.destinataire_id, m.auteur_id),
                      IF(e.demandeur_id = ?, e.receveur_id, e.demandeur_id))
      WHERE m.texte LIKE ? ESCAPE '!'
        AND (
          (m.destinataire_id IS NOT NULL
            AND (m.auteur_id = ? OR m.destinataire_id = ?))
          OR (m.echange_id IS NOT NULL
            AND (e.demandeur_id = ? OR e.receveur_id = ?))
        )
      ORDER BY m.id DESC
      LIMIT ${RECHERCHE_MAX}`,
    [dresseurId, dresseurId, like,
      dresseurId, dresseurId, dresseurId, dresseurId]);

  return {
    resultats: lignes.map((m) => ({
      id: m.id,
      texte: m.texte,
      quand: m.cree_le,
      avec: m.autre,
      deMoi: m.auteur_id === dresseurId,
      espece: m.espece || null,
    })),
  };
}

/** Combien de messages non lus, toutes conversations confondues. */
export async function nonLus(dresseurId) {
  const r = await une(
    `SELECT COUNT(*) AS n FROM pa_messages
      WHERE destinataire_id = ? AND lu = 0`, [dresseurId]);
  return Number(r?.n) || 0;
}
