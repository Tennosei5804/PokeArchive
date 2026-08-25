// Les amis, et ce qu'ils viennent d'attraper.
//
// ABONNEMENT À SENS UNIQUE. On suit qui l'on veut, sans demande ni
// acceptation. Ce n'est pas un raccourci : rien de neuf n'est révélé. Le
// classement et les profils publics montrent déjà la progression de tout le
// monde à tout le monde. S'abonner ne fait que filtrer ce qu'on pouvait déjà
// aller lire, et une boîte de demandes n'aurait rien protégé.
//
// Ce qui protège, c'est `pa_profils.public`, qui existe déjà : une aventure
// marquée privée ne sort pas d'ici, ni dans le fil ni dans les notifications.
//
// AUCUNE TABLE D'ÉVÉNEMENTS. `pa_historique` écrit déjà une ligne par Pokémon
// ajouté, avec son jeu, sa date et s'il est chromatique — c'est exactement
// l'événement qu'on veut annoncer. Le fil est une lecture, pas une seconde
// écriture qu'il faudrait tenir d'accord avec la première.

import { lire, une, ecrire } from './base.js';
import { ErreurCompte, horodatage } from './comptes.js';

const MAX_AMIS = 100;
const FIL_MAX = 200;

// Ce qu'on cite dans une notification groupée. Trois noms suffisent à donner
// le ton ; au-delà, « et 37 autres » en dit autant en moins de place.
const NOMS_CITES = 3;

const normaliser = (p) => (p || '')
  .trim().replace(/\s+/g, ' ')
  .normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .toLowerCase();

/** Le dresseur derrière un pseudo, ou une erreur claire. */
async function dresseurParPseudo(pseudo) {
  const d = await une(
    'SELECT id, pseudo, avatar FROM pa_dresseurs WHERE pseudo_cle = ?',
    [normaliser(pseudo)]);
  if (!d) throw new ErreurCompte('Ce dresseur n’existe pas.', 404);
  return d;
}

/**
 * Le plus grand identifiant de journal visible chez quelqu'un.
 *
 * Sert de point de départ à un nouvel abonnement : tout ce qui précède est
 * considéré comme déjà vu. Zéro si la personne n'a encore rien enregistré.
 */
async function dernierEvenementDe(amiId) {
  const r = await une(
    `SELECT MAX(h.id) AS dernier
       FROM pa_historique h
       JOIN pa_profils p ON p.id = h.profil_id
      WHERE p.dresseur_id = ? AND p.public = 1`, [amiId]);
  return Number(r && r.dernier) || 0;
}

// --- S'abonner, se désabonner ------------------------------------------------

export async function suivre(dresseurId, pseudo) {
  const ami = await dresseurParPseudo(pseudo);
  if (ami.id === dresseurId) {
    throw new ErreurCompte('Tu te suis déjà, forcément.', 400);
  }

  const combien = await une(
    'SELECT COUNT(*) AS n FROM pa_amis WHERE dresseur_id = ?', [dresseurId]);
  if (Number(combien.n) >= MAX_AMIS) {
    throw new ErreurCompte(`Cent amis, c’est le maximum.`, 400);
  }

  // INSERT IGNORE plutôt qu'un SELECT puis un INSERT : deux clics rapides ne
  // doivent pas lever une erreur de clé primaire, et surtout ne doivent pas
  // remettre vu_jusqua à jour — ce qui masquerait des événements non lus.
  await ecrire(
    `INSERT IGNORE INTO pa_amis (dresseur_id, ami_id, depuis, vu_jusqua)
     VALUES (?, ?, ?, ?)`,
    [dresseurId, ami.id, horodatage(), await dernierEvenementDe(ami.id)]);

  return { pseudo: ami.pseudo, avatar: ami.avatar };
}

export async function nePlusSuivre(dresseurId, pseudo) {
  const ami = await dresseurParPseudo(pseudo);
  await ecrire('DELETE FROM pa_amis WHERE dresseur_id = ? AND ami_id = ?',
    [dresseurId, ami.id]);
  return { pseudo: ami.pseudo };
}

/**
 * Mes amis, avec où ils en sont.
 *
 * Le compte de captures vient de pa_dex, qui porte déjà les totaux : les
 * recalculer par une jointure sur l'historique coûterait une agrégation par
 * ami à chaque ouverture de la page.
 */
export async function mesAmis(dresseurId) {
  // L'avatar est un condense Discord et non une adresse : sans discord_id a
  // cote, l'application ne peut pas en faire une image — et Discord calcule
  // meme l'avatar par defaut a partir de cet identifiant.
  //
  // L'aventure est celle qui represente la personne, choisie comme dans le
  // classement : la premiere publique, celle par defaut d'abord.
  const lignes = await lire(
    `SELECT d.pseudo, d.avatar, d.discord_id, a.depuis, a.vu_jusqua,
            p.nom                   AS aventure,
            COALESCE(x.captures, 0) AS captures,
            COALESCE(x.shiny, 0)    AS shiny,
            x.maj_le
       FROM pa_amis a
       JOIN pa_dresseurs d ON d.id = a.ami_id
       LEFT JOIN pa_profils p
              ON p.id = (SELECT id FROM pa_profils
                          WHERE dresseur_id = d.id AND public = 1
                          ORDER BY par_defaut DESC, id ASC LIMIT 1)
       LEFT JOIN pa_dex x  ON x.dresseur_id = a.ami_id
      WHERE a.dresseur_id = ?
      ORDER BY x.maj_le IS NULL, x.maj_le DESC`, [dresseurId]);
  return { amis: lignes };
}

// --- Le fil ------------------------------------------------------------------

/**
 * Ce que les amis ont attrapé, du plus récent au plus ancien.
 *
 * `avant` pagine sur l'identifiant et non sur un décalage : une capture
 * enregistrée pendant la lecture ne décale alors aucune page.
 */
export async function fil(dresseurId, avant = null, limite = 60) {
  const borne = Math.min(Math.max(Number(limite) || 60, 1), FIL_MAX);
  const curseur = Number(avant);
  const params = [dresseurId];
  let filtre = '';
  if (Number.isInteger(curseur) && curseur > 0) {
    filtre = 'AND h.id < ?';
    params.push(curseur);
  }

  // La borne est interpolée, jamais passée en paramètre : MySQL refuse un
  // marqueur dans un LIMIT de requête préparée. Elle est sûre parce qu'elle
  // sort de Math.min/Math.max. Même règle que journal() dans comptes.js.
  const lignes = await lire(
    `SELECT h.id, d.pseudo, d.avatar, d.discord_id, h.pokemon, h.dex, h.chromatique,
            h.ajoute_le, p.nom AS aventure
       FROM pa_amis a
       JOIN pa_profils p    ON p.dresseur_id = a.ami_id AND p.public = 1
       JOIN pa_historique h ON h.profil_id = p.id
       JOIN pa_dresseurs d  ON d.id = a.ami_id
      WHERE a.dresseur_id = ? ${filtre}
      ORDER BY h.id DESC LIMIT ${borne + 1}`, params);

  const encore = lignes.length > borne;
  return { lignes: lignes.slice(0, borne), encore };
}

// --- Les nouveautés, groupées ------------------------------------------------

/**
 * Ce qui est arrivé depuis la dernière fois, prêt à être annoncé.
 *
 * LE GROUPEMENT EST LE CŒUR DE LA CHOSE. journaliser() écrit tout un lot en une
 * insertion, avec le même `ajoute_le` : quand quelqu'un synchronise après une
 * soirée de jeu, ce sont quarante lignes d'un coup. Quarante notifications
 * seraient insupportables, et la quarantième n'apprendrait rien de plus que la
 * première.
 *
 * On regroupe donc par (ami, jeu, lot). Les chromatiques font bande à part :
 * ils sont rares, et méritent d'être nommés un par un.
 *
 * Ne marque rien comme vu — c'est `marquerVu` qui le fait, appelé par
 * l'application seulement une fois les notifications réellement affichées. Si
 * elle se ferme entre les deux, on les reverra plutôt que de les perdre.
 */
export async function nouveautes(dresseurId) {
  const lignes = await lire(
    `SELECT h.id, d.pseudo, d.avatar, d.discord_id, h.pokemon, h.dex, h.chromatique,
            h.ajoute_le, p.nom AS aventure
       FROM pa_amis a
       JOIN pa_profils p    ON p.dresseur_id = a.ami_id AND p.public = 1
       JOIN pa_historique h ON h.profil_id = p.id
       JOIN pa_dresseurs d  ON d.id = a.ami_id
      WHERE a.dresseur_id = ? AND h.id > a.vu_jusqua
      ORDER BY h.id ASC LIMIT ${FIL_MAX}`, [dresseurId]);

  return { jusqua: lignes.length ? lignes[lignes.length - 1].id : 0,
           annonces: grouper(lignes),
           total: lignes.length };
}

/** Les lignes brutes en annonces. Exporté pour être éprouvé à part. */
export function grouper(lignes) {
  const paquets = new Map();
  const sortie = [];

  for (const l of lignes) {
    if (l.chromatique) {
      // Un chromatique ne se fond pas dans un lot : c'est l'événement rare de
      // ce journal, et le noyer dans « 40 Pokémon » serait le gâcher.
      sortie.push({
        id: l.id, pseudo: l.pseudo, avatar: l.avatar, discord_id: l.discord_id, dex: l.dex,
        aventure: l.aventure, quand: l.ajoute_le,
        chromatique: true, combien: 1, noms: [l.pokemon],
      });
      continue;
    }
    // Separateur NUL et non espace : un pseudo peut contenir des espaces, et
    // « A B » + « rby » donnerait alors la meme cle que « A » + « B rby ».
    //
    // Ecrit en echappement : un octet NUL pose tel quel dans le fichier fait
    // passer tout le source pour du binaire aux yeux de git, qui cesse alors
    // de le comparer — c'est ce qui venait d'arriver.
    const cle = l.pseudo + '\u0000' + l.dex + '\u0000' + l.ajoute_le;
    let p = paquets.get(cle);
    if (!p) {
      p = { id: l.id, pseudo: l.pseudo, avatar: l.avatar, discord_id: l.discord_id, dex: l.dex,
            aventure: l.aventure, quand: l.ajoute_le,
            chromatique: false, combien: 0, noms: [] };
      paquets.set(cle, p);
      sortie.push(p);
    }
    p.combien++;
    if (p.noms.length < NOMS_CITES) p.noms.push(l.pokemon);
    p.id = l.id;                       // le plus grand du lot
  }
  return sortie;
}

/**
 * Marque comme vu jusqu'à cet identifiant, pour tous les amis à la fois.
 *
 * Un seul curseur suffit : les identifiants de pa_historique sont globaux et
 * croissants, donc « tout ce qui est ≤ n » a le même sens chez tout le monde.
 * Le GREATEST empêche un appel en retard de faire reculer le curseur et de
 * réannoncer ce qui l'a déjà été.
 */
export async function marquerVu(dresseurId, jusqua) {
  const n = Number(jusqua);
  if (!Number.isInteger(n) || n <= 0) return { jusqua: 0 };
  await ecrire(
    'UPDATE pa_amis SET vu_jusqua = GREATEST(vu_jusqua, ?) WHERE dresseur_id = ?',
    [n, dresseurId]);
  return { jusqua: n };
}
