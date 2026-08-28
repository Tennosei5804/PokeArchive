// Ce qui est arrivé pour toi, et qui t'attend.
//
// UNE TABLE, ICI, ALORS QUE LES AMIS N'EN ONT PAS. La différence n'est pas un
// oubli. Le fil des amis se DÉDUIT de `pa_historique` : « Machin a attrapé
// Abra » est une lecture d'un fait déjà écrit, et une seconde table qu'il
// faudrait tenir d'accord avec la première n'apporterait rien.
//
// Une proposition d'échange n'est pas de cette nature. Elle s'adresse à
// QUELQU'UN, elle attend une réponse, et elle a un état : non lue, lue,
// répondue. Rien de tout cela ne se recalcule à partir d'ailleurs — il faut
// bien l'écrire quelque part.
//
// D'où la règle qui départage les deux : ce qui se déduit ne s'écrit pas, ce
// qui s'adresse s'écrit.

import { lire, une, ecrire } from './base.js';
import { horodatage } from './comptes.js';

// Au-delà, on ne remonte plus : personne ne lit deux cents notifications, et
// la page en propose déjà l'historique complet par les échanges eux-mêmes.
const PAGE = 40;

// Le ménage. Une notification lue depuis longtemps n'apprend plus rien, et
// cette table est la seule du service qui grossisse sans que rien ne l'efface.
const GARDE_MAX = 200;

/**
 * Pose une notification.
 *
 * Ne lève jamais : une notification est un accessoire de l'action, pas
 * l'action. Si l'écriture échoue, l'échange a tout de même eu lieu et doit être
 * rendu au joueur — le perdre pour une ligne d'annonce serait absurde.
 */
export async function notifier(dresseurId, { genre, echangeId = null, titre, detail = null }) {
  try {
    await ecrire(
      `INSERT INTO pa_notifications (dresseur_id, genre, echange_id, titre, detail, cree_le)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [dresseurId, genre, echangeId, borne(titre, 200), borne(detail, 400), horodatage()]);
    await elaguer(dresseurId);
  } catch (e) {
    // Volontairement muet côté joueur, bavard côté serveur.
    console.log(`notification perdue pour ${dresseurId} : ${e.message}`);
  }
}

const borne = (t, n) => (t === null || t === undefined ? null : String(t).slice(0, n));

/**
 * Ne garde que les GARDE_MAX dernières.
 *
 * Écrit en deux temps — on cherche la borne, puis on efface en dessous. Un
 * DELETE avec un sous-SELECT sur la même table est refusé par MySQL, et un
 * OFFSET dans un DELETE n'existe pas.
 */
async function elaguer(dresseurId) {
  const borneBasse = await une(
    `SELECT id FROM pa_notifications WHERE dresseur_id = ?
      ORDER BY id DESC LIMIT 1 OFFSET ${GARDE_MAX}`, [dresseurId]);
  if (!borneBasse) return;
  await ecrire('DELETE FROM pa_notifications WHERE dresseur_id = ? AND id <= ?',
    [dresseurId, borneBasse.id]);
}

/**
 * Les miennes, de la plus récente à la plus ancienne.
 *
 * L'ÉCHANGE VIENT AVEC. Le titre stocké ne nomme que la personne — « Untel te
 * propose un échange » — parce qu'en base on n'a que des identifiants d'espèce
 * (« mr-mime ») et qu'ils ne se traduisent pas ici : la langue d'affichage est
 * un réglage de l'appareil, et une phrase figée à l'écriture serait fausse pour
 * qui lit dans l'autre langue. On joint donc les trois champs qu'il faut, et
 * l'application écrit « Abra contre Machopeur sur Rouge/Bleu » elle-même.
 *
 * Les noms sont remis DANS LE SENS DU LECTEUR, comme dans echanges.js : c'est
 * toujours « tu donnes / tu reçois », jamais « il offre ».
 */
export async function mesNotifications(dresseurId) {
  const lignes = await lire(
    `SELECT n.id, n.genre, n.echange_id, n.titre, n.detail, n.lu, n.cree_le,
            e.etat AS echange_etat, e.dex, e.offert, e.demande, e.demandeur_id
       FROM pa_notifications n
       LEFT JOIN pa_echanges e ON e.id = n.echange_id
      WHERE n.dresseur_id = ?
      ORDER BY n.id DESC LIMIT ${PAGE}`, [dresseurId]);
  return {
    notifications: lignes.map((l) => enClair(l, dresseurId)),
    nonLues: await combienNonLues(dresseurId),
  };
}

function enClair(l, moi) {
  const jeSuisDemandeur = l.demandeur_id === moi;
  return {
    id: l.id, genre: l.genre, echange: l.echange_id, titre: l.titre,
    detail: l.detail, lu: l.lu === 1, quand: l.cree_le,
    etat: l.echange_etat || null,
    dex: l.dex || null,
    jeDonne: l.dex ? (jeSuisDemandeur ? l.offert : l.demande) : null,
    jeRecois: l.dex ? (jeSuisDemandeur ? l.demande : l.offert) : null,
  };
}

export async function combienNonLues(dresseurId) {
  const r = await une(
    'SELECT COUNT(*) AS n FROM pa_notifications WHERE dresseur_id = ? AND lu = 0',
    [dresseurId]);
  return Number(r && r.n) || 0;
}

/**
 * Marque comme lues.
 *
 * Sans identifiant : tout. Avec : jusqu'à celui-là inclus — l'application
 * envoie le plus grand qu'elle vient d'afficher, et ce qui est arrivé pendant
 * qu'elle affichait reste non lu plutôt que d'être avalé sans avoir été vu.
 */
export async function marquerLues(dresseurId, jusqua = null) {
  const n = Number(jusqua);
  if (Number.isInteger(n) && n > 0) {
    await ecrire('UPDATE pa_notifications SET lu = 1 WHERE dresseur_id = ? AND id <= ?',
      [dresseurId, n]);
  } else {
    await ecrire('UPDATE pa_notifications SET lu = 1 WHERE dresseur_id = ?', [dresseurId]);
  }
  return { nonLues: await combienNonLues(dresseurId) };
}
