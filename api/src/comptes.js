// Dresseurs, sessions, dex.
//
// Aucun mot de passe n'est stocké : l'identité vient de Discord.
// Les jetons de session non plus — la base n'en garde qu'un condensé SHA-256,
// le jeton en clair n'existe que dans l'application du joueur.

import { createHash, randomBytes } from 'node:crypto';
import { lire, une, ecrire } from './base.js';
import { estInterdit } from './pseudos-interdits.js';

const SESSION_JOURS = 90;
const PSEUDO_MIN = 3;
const PSEUDO_MAX = 20;
const TAILLE_MAX_DEX = 2_000_000;

// Les accents sont admis : « Zoé », « Tennôsei » ou « Björn » sont des pseudos
// légitimes, et les refuser reviendrait à demander à quelqu'un d'écorcher son
// propre nom. \p{L} couvre toutes les lettres Unicode ; les emoji, qui ne sont
// ni lettres ni chiffres, restent dehors.
const PSEUDO_OK = /^[\p{L}\p{N}](?:[\p{L}\p{N} _-]*[\p{L}\p{N}])?$/u;
const INTERDITS = /[^\p{L}\p{N} _-]/gu;

export class ErreurCompte extends Error {
  constructor(message, code = 400) { super(message); this.code = code; }
}

export const horodatage = (d = new Date()) => d.toISOString().replace(/\.\d{3}Z$/, 'Z');

const cle = (v) => createHash('sha256').update(v, 'utf8').digest('hex');

/**
 * Sert à comparer, jamais à afficher. Replie la casse *et* les accents :
 * « José » et « Jose » donnent la même clé et ne peuvent pas coexister. Sans
 * ce repli, il suffirait d'un accent pour se faire passer pour quelqu'un
 * d'autre, et personne ne verrait la différence dans une liste.
 */
const normaliser = (p) => (p || '')
  .trim().replace(/\s+/g, ' ')
  .normalize('NFD').replace(/\p{Diacritic}/gu, '')
  .toLowerCase();

const longueur = (s) => [...s.normalize('NFC')].length;

function nettoyerPseudo(brut) {
  const propre = [...(brut || '').normalize('NFC').replace(INTERDITS, '').trim().replace(/\s+/g, ' ')]
    .slice(0, PSEUDO_MAX).join('').replace(/^[-_ ]+|[-_ ]+$/gu, '');
  return longueur(propre) >= PSEUDO_MIN && PSEUDO_OK.test(propre) ? propre : '';
}

/**
 * Le pseudo repris de Discord, à la première connexion.
 *
 * Il n'est pas choisi ici, il est hérité — et quelqu'un dont le nom Discord
 * est grossier ne doit pas pour autant se voir refuser l'entrée. On le remplace
 * silencieusement par le nom neutre, que pseudoLibre() numérotera. Il pourra
 * en choisir un autre ensuite, et celui-là passera par le filtre.
 */
function pseudoHerite(brut) {
  const propre = nettoyerPseudo(brut);
  return propre && !estInterdit(propre) ? propre : '';
}

/** Deux joueurs peuvent porter le même nom sur Discord ; ici, non. */
async function pseudoLibre(souhaite) {
  const racine = souhaite || 'Dresseur';
  for (let i = 0; i < 200; i++) {
    // On tronque par caractères et non par unités de code : couper « é » en
    // deux produirait un accent orphelin.
    const candidat = i === 0
      ? racine
      : `${[...racine].slice(0, PSEUDO_MAX - String(i).length - 1).join('')}-${i}`;
    if (!await une('SELECT id FROM pa_dresseurs WHERE pseudo_cle = ?', [normaliser(candidat)])) {
      return candidat;
    }
  }
  return `Dresseur-${randomBytes(3).toString('hex')}`;
}

/** Retrouve ou crée le dresseur, puis ouvre une session. */
export async function depuisDiscord(profil) {
  const discordId = String(profil.id || '');
  if (!discordId) throw new ErreurCompte("Discord n'a pas renvoyé d'identifiant.", 502);

  let d = await une(
    'SELECT id, pseudo, avatar, cree_le FROM pa_dresseurs WHERE discord_id = ?', [discordId]);
  const nouveau = !d;

  if (nouveau) {
    const pseudo = (await pseudoLibre(pseudoHerite(profil.pseudo))).normalize('NFC');
    const r = await ecrire(
      `INSERT INTO pa_dresseurs (discord_id, pseudo, pseudo_cle, avatar, cree_le)
       VALUES (?, ?, ?, ?, ?)`,
      [discordId, pseudo, normaliser(pseudo), profil.avatar || '', horodatage()]);
    d = { id: r.insertId, pseudo, avatar: profil.avatar || '', cree_le: horodatage() };
  } else {
    // L'avatar a pu changer chez Discord. Jamais le pseudo : une fois choisi,
    // il appartient au dresseur, et se renommer sur Discord ne doit pas
    // renommer son dex dans le dos de ses potes.
    await ecrire('UPDATE pa_dresseurs SET avatar = ?, vu_le = ? WHERE id = ?',
      [profil.avatar || '', horodatage(), d.id]);
    d.avatar = profil.avatar || '';
  }

  const jeton = randomBytes(32).toString('base64url');
  const expire = new Date(Date.now() + SESSION_JOURS * 86_400_000);
  await ecrire(
    `INSERT INTO pa_sessions (jeton_cle, dresseur_id, cree_le, expire_le) VALUES (?, ?, ?, ?)`,
    [cle(jeton), d.id, horodatage(), horodatage(expire)]);

  return {
    dresseur: { id: d.id, pseudo: d.pseudo, avatar: d.avatar, discordId },
    jeton, nouveau,
  };
}

export async function session(jeton) {
  if (!jeton) return null;
  const l = await une(
    `SELECT d.id, d.discord_id, d.pseudo, d.avatar, d.cree_le, d.visible,
            s.expire_le
       FROM pa_sessions s JOIN pa_dresseurs d ON d.id = s.dresseur_id
      WHERE s.jeton_cle = ?`, [cle(jeton)]);
  if (!l) return null;
  if (l.expire_le < horodatage()) {
    await ecrire('DELETE FROM pa_sessions WHERE jeton_cle = ?', [cle(jeton)]);
    return null;
  }
  return {
    id: l.id, discordId: l.discord_id, pseudo: l.pseudo,
    avatar: l.avatar, creeLe: l.cree_le,
    visible: l.visible !== 0,
  };
}

export async function deconnecter(jeton) {
  if (jeton) await ecrire('DELETE FROM pa_sessions WHERE jeton_cle = ?', [cle(jeton)]);
}

export async function menage() {
  const r = await ecrire('DELETE FROM pa_sessions WHERE expire_le < ?', [horodatage()]);
  return r.affectedRows;
}

export async function changerPseudo(dresseurId, souhaite) {
  const propre = nettoyerPseudo(souhaite);
  if (!propre) {
    throw new ErreurCompte(
      `Entre ${PSEUDO_MIN} et ${PSEUDO_MAX} caractères : lettres, chiffres, espace, `
      + `tiret et souligné, en commençant et finissant par une lettre ou un chiffre.`);
  }
  // Le refus ne nomme pas le mot qui l'a déclenché : le dire reviendrait à
  // apprendre quoi contourner. Un pseudo s'affiche dans le classement et à
  // côté du Pokédex de gens qui n'ont rien demandé — et personne ne surveille
  // la liste après coup.
  if (estInterdit(propre)) {
    throw new ErreurCompte('Ce pseudo ne convient pas. Choisis-en un autre.');
  }
  const pris = await une('SELECT id FROM pa_dresseurs WHERE pseudo_cle = ? AND id <> ?',
    [normaliser(propre), dresseurId]);
  if (pris) throw new ErreurCompte('Ce pseudo est déjà pris.', 409);

  await ecrire('UPDATE pa_dresseurs SET pseudo = ?, pseudo_cle = ? WHERE id = ?',
    [propre.normalize('NFC'), normaliser(propre), dresseurId]);
  return propre;
}

// --- Les profils ------------------------------------------------------------
// Un compte, plusieurs aventures. Chacune a son dex ; la table pa_dex est
// indexée par profil, plus par dresseur.

const NOM_PREMIER_PROFIL = 'Aventure 1';

/**
 * Le profil sur lequel travailler faute de précision : celui marqué par
 * défaut, sinon le plus ancien. En crée un si le compte n'en a aucun — un
 * dresseur sans aventure n'aurait nulle part où enregistrer.
 */
export async function profilParDefaut(dresseurId) {
  const p = await une(
    `SELECT id FROM pa_profils WHERE dresseur_id = ?
      ORDER BY par_defaut DESC, id ASC LIMIT 1`, [dresseurId]);
  if (p) return p.id;

  const maintenant = horodatage();
  const r = await ecrire(
    `INSERT INTO pa_profils (dresseur_id, nom, nom_cle, public, par_defaut, cree_le, maj_le)
     VALUES (?, ?, ?, 1, 1, ?, ?)`,
    [dresseurId, NOM_PREMIER_PROFIL, normaliser(NOM_PREMIER_PROFIL), maintenant, maintenant]);
  return r.insertId;
}

const PROFIL_MIN = 2;
const PROFIL_MAX = 40;

/**
 * Un nom d'aventure. Plus long et plus libre qu'un pseudo — c'est une phrase,
 * « Ma chasse aux chromatiques », pas une étiquette — mais on écarte les
 * caractères qui n'ont rien à faire dans un libellé.
 *
 * Il passe par le MÊME filtre que les pseudos. Le commentaire d'origine disait
 * qu'un nom d'aventure « n'identifie personne et ne sert qu'à son auteur » :
 * ce n'est plus vrai depuis qu'on consulte le dex des autres. Il s'affiche
 * chez les gens qui viennent voir votre avancée, et une grossièreté y est
 * exactement aussi visible que dans un pseudo.
 *
 * Le découpage en mots sert d'ailleurs mieux ici : sur une phrase de quarante
 * caractères, les racines courtes se lisent en mot entier sans risque.
 */
function nettoyerNomProfil(brut) {
  const propre = [...(brut || '').normalize('NFC').replace(INTERDITS, '').trim().replace(/\s+/g, ' ')]
    .slice(0, PROFIL_MAX).join('').replace(/^[-_ ]+|[-_ ]+$/gu, '');
  if (longueur(propre) < PROFIL_MIN) {
    throw new ErreurCompte(
      `Donne un nom de ${PROFIL_MIN} à ${PROFIL_MAX} caractères : lettres, chiffres, `
      + `espace, tiret et souligné, en commençant et finissant par une lettre ou un chiffre.`);
  }
  if (estInterdit(propre)) {
    throw new ErreurCompte('Ce nom ne convient pas. Choisis-en un autre.');
  }
  return propre;
}

/** Les aventures d'un dresseur, avec leur avancement. */
export async function listerProfils(dresseurId) {
  // On s'assure qu'il en a au moins une : un compte sans aventure n'aurait
  // nulle part où enregistrer, et l'interface n'a alors rien à proposer.
  await profilParDefaut(dresseurId);
  return await lire(
    `SELECT p.id, p.nom, p.public, p.par_defaut, p.mode, p.niveau_formes, p.cree_le, p.maj_le,
            COALESCE(x.captures, 0) AS captures, COALESCE(x.shiny, 0) AS shiny
       FROM pa_profils p LEFT JOIN pa_dex x ON x.profil_id = p.id
      WHERE p.dresseur_id = ?
      ORDER BY p.par_defaut DESC, p.id ASC`, [dresseurId]);
}

// Les trois façons de tenir un Pokédex. Le mode ne change rien à ce qu'on
// enregistre — c'est la même liste de noms — mais il dit ce que le total
// signifie, et deux dresseurs qui ne comptent pas pareil ne se comparent pas.
export const MODES = ['capture', 'vu', 'living'];

const modeValide = (m) => (MODES.includes(String(m)) ? String(m) : 'capture');

// Jusqu'où l'aventure compte les formes d'une même espèce, de 1 à 4. Le réglage
// appartient à l'aventure et non à l'ordinateur : deux dresseurs qui se
// comparent doivent compter sur le même dénominateur, sinon changer de niveau
// chez soi fait bouger le score de l'autre.
const niveauValide = (n) => {
  const v = parseInt(n, 10);
  return v >= 1 && v <= 4 ? v : 3;
};

export async function creerProfil(dresseurId, nomSouhaite, mode) {
  const nom = nettoyerNomProfil(nomSouhaite);
  const pris = await une('SELECT id FROM pa_profils WHERE dresseur_id = ? AND nom_cle = ?',
    [dresseurId, normaliser(nom)]);
  if (pris) throw new ErreurCompte('Tu as déjà une aventure de ce nom.', 409);

  const combien = await une('SELECT COUNT(*) AS n FROM pa_profils WHERE dresseur_id = ?',
    [dresseurId]);
  if ((combien?.n ?? 0) >= 20) {
    throw new ErreurCompte('Vingt aventures suffisent : supprimes-en une d\'abord.', 409);
  }

  const maintenant = horodatage();
  const m = modeValide(mode);
  const r = await ecrire(
    `INSERT INTO pa_profils (dresseur_id, nom, nom_cle, public, par_defaut, mode, niveau_formes, cree_le, maj_le)
     VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?)`,
    // La première aventure devient forcément celle par défaut. Le niveau de
    // formes démarre au défaut : il se règle depuis la barre du Pokédex, pas à
    // la création — on ne fait pas choisir avant d'avoir vu.
    [dresseurId, nom, normaliser(nom), (combien?.n ?? 0) === 0 ? 1 : 0, m,
     niveauValide(undefined), maintenant, maintenant]);
  return { id: r.insertId, nom, public: 1, par_defaut: (combien?.n ?? 0) === 0 ? 1 : 0,
           mode: m, niveau_formes: niveauValide(undefined),
           captures: 0, shiny: 0, cree_le: maintenant, maj_le: maintenant };
}

/** Renommer, publier, ou désigner comme aventure par défaut. */
export async function modifierProfil(dresseurId, profilId, champs) {
  const id = await profilDu(dresseurId, profilId);

  if (champs.nom !== undefined) {
    const nom = nettoyerNomProfil(champs.nom);
    const pris = await une(
      'SELECT id FROM pa_profils WHERE dresseur_id = ? AND nom_cle = ? AND id <> ?',
      [dresseurId, normaliser(nom), id]);
    if (pris) throw new ErreurCompte('Tu as déjà une aventure de ce nom.', 409);
    await ecrire('UPDATE pa_profils SET nom = ?, nom_cle = ? WHERE id = ?',
      [nom, normaliser(nom), id]);
  }

  if (champs.public !== undefined) {
    await ecrire('UPDATE pa_profils SET public = ? WHERE id = ?', [champs.public ? 1 : 0, id]);
  }

  if (champs.niveauFormes !== undefined) {
    await ecrire('UPDATE pa_profils SET niveau_formes = ? WHERE id = ?',
      [niveauValide(champs.niveauFormes), id]);
  }
  if (champs.mode !== undefined) {
    await ecrire('UPDATE pa_profils SET mode = ? WHERE id = ?', [modeValide(champs.mode), id]);
  }

  if (champs.parDefaut) {
    // Une seule aventure par défaut : on retire la distinction aux autres
    // avant de la donner, sinon deux profils la porteraient.
    await ecrire('UPDATE pa_profils SET par_defaut = 0 WHERE dresseur_id = ?', [dresseurId]);
    await ecrire('UPDATE pa_profils SET par_defaut = 1 WHERE id = ?', [id]);
  }

  return await une(
    `SELECT id, nom, public, par_defaut, mode, niveau_formes, cree_le, maj_le
       FROM pa_profils WHERE id = ?`, [id]);
}

export async function supprimerProfil(dresseurId, profilId) {
  const id = await profilDu(dresseurId, profilId);
  const combien = await une('SELECT COUNT(*) AS n FROM pa_profils WHERE dresseur_id = ?',
    [dresseurId]);
  // Supprimer la dernière laisserait le compte sans nulle part où enregistrer.
  if ((combien?.n ?? 0) <= 1) {
    throw new ErreurCompte('C\'est ta seule aventure : renomme-la ou réinitialise-la.', 409);
  }

  const etaitDefaut = await une('SELECT par_defaut FROM pa_profils WHERE id = ?', [id]);
  // Le dex part avec, par cascade sur la clé étrangère.
  await ecrire('DELETE FROM pa_profils WHERE id = ?', [id]);

  // Le compte ne doit pas se retrouver sans aventure par défaut.
  if (etaitDefaut?.par_defaut) {
    const suivante = await une(
      'SELECT id FROM pa_profils WHERE dresseur_id = ? ORDER BY id ASC LIMIT 1', [dresseurId]);
    if (suivante) {
      await ecrire('UPDATE pa_profils SET par_defaut = 1 WHERE id = ?', [suivante.id]);
    }
  }
  return { supprime: id };
}

/** Vérifie qu'un profil appartient bien au dresseur qui le réclame. */
async function profilDu(dresseurId, profilId) {
  const p = await une('SELECT id FROM pa_profils WHERE id = ? AND dresseur_id = ?',
    [profilId, dresseurId]);
  if (!p) throw new ErreurCompte('Profil introuvable.', 404);
  return p.id;
}

// --- Le dex -----------------------------------------------------------------
export async function lireDex(dresseurId, profilId = null) {
  const cible = profilId ? await profilDu(dresseurId, profilId)
                         : await profilParDefaut(dresseurId);
  const l = await une('SELECT donnees, maj_le FROM pa_dex WHERE profil_id = ?', [cible]);
  if (!l) return null;
  try {
    const d = JSON.parse(l.donnees);
    d.majLe = l.maj_le;
    d.profilId = cible;
    return d;
  } catch { return null; }
}

/**
 * Combien d'espèces distinctes ce dex contient, tous Pokédex confondus.
 *
 * On ne comptait que la collection Pokémon HOME. Quelqu'un qui a bouclé Kanto
 * dans Rouge/Bleu sans rien ranger dans HOME apparaissait donc à zéro au
 * classement — c'était le cas du premier compte créé. L'union dédoublonnée
 * reflète ce qui a réellement été attrapé, et un Pokémon coché dans trois jeux
 * ne compte toujours qu'une fois.
 */
function compterEspeces(donnees, champ) {
  const vus = new Set();
  const ajouter = (liste) => { for (const n of liste || []) vus.add(n); };

  // Le format historique range HOME à la racine : « captures » pour les
  // normaux, « shiny » pour les chromatiques.
  ajouter(champ === 'caught' ? (donnees.captures || donnees.caught) : donnees.shiny);
  const parJeu = donnees.dex || {};
  for (const cle of Object.keys(parJeu)) ajouter(parJeu[cle]?.[champ]);

  return vus.size;
}

/**
 * Ce qui vient d'apparaitre dans le dex, compare a ce qui y etait.
 *
 * Le dex est enregistre en bloc : rien n'indique QUAND une case a ete cochee.
 * En confrontant l'ancienne sauvegarde a la nouvelle, on retrouve les ajouts,
 * et on les date. Les retraits ne sont pas journalises — decocher est une
 * correction, pas un evenement de collection.
 */
function nouveautes(avant, apres) {
  const ajouts = [];
  const anciens = avant?.dex || {};
  const recents = apres?.dex || {};

  for (const cle of Object.keys(recents)) {
    for (const champ of ['caught', 'shiny']) {
      const deja = new Set(anciens[cle]?.[champ] || []);
      for (const nom of recents[cle]?.[champ] || []) {
        if (!deja.has(nom)) {
          ajouts.push({ pokemon: String(nom).slice(0, 64), dex: cle.slice(0, 32),
                        chromatique: champ === 'shiny' ? 1 : 0 });
        }
      }
    }
  }
  return ajouts;
}

// Un import massif peut cocher plus d'un millier d'entrees d'un coup. On borne
// l'ecriture : au-dela, l'evenement interessant n'est plus « ce Pokemon a ete
// attrape » mais « une sauvegarde a ete importee », et mille lignes n'y
// ajouteraient rien.
const MAX_JOURNAL = 400;

async function journaliser(profilId, ajouts, quand) {
  if (!ajouts.length) return 0;
  const retenus = ajouts.slice(0, MAX_JOURNAL);
  // Une seule requete pour tout le lot : quatre cents allers-retours
  // rendraient une action groupee interminable.
  const valeurs = retenus.map(() => '(?, ?, ?, ?, ?)').join(', ');
  const params = [];
  for (const a of retenus) params.push(profilId, a.pokemon, a.dex, a.chromatique, quand);
  await ecrire(
    `INSERT INTO pa_historique (profil_id, pokemon, dex, chromatique, ajoute_le)
     VALUES ${valeurs}`, params);
  return retenus.length;
}

/** Le journal d'une aventure, du plus recent au plus ancien. */
export async function historique(dresseurId, profilId, avant = null, limite = 60) {
  const id = await profilDu(dresseurId, profilId);
  const borne = Math.min(Math.max(Number(limite) || 60, 1), 200);
  const curseur = Number(avant);

  // La pagination se fait sur l'identifiant, pas sur un decalage : une
  // insertion pendant la lecture ne decale alors aucune page.
  const lignes = Number.isInteger(curseur) && curseur > 0
    ? await lire(
        `SELECT id, pokemon, dex, chromatique, ajoute_le FROM pa_historique
          WHERE profil_id = ? AND id < ? ORDER BY id DESC LIMIT ${borne}`, [id, curseur])
    : await lire(
        `SELECT id, pokemon, dex, chromatique, ajoute_le FROM pa_historique
          WHERE profil_id = ? ORDER BY id DESC LIMIT ${borne}`, [id]);

  const total = await une('SELECT COUNT(*) AS n FROM pa_historique WHERE profil_id = ?', [id]);
  return { lignes, total: total?.n ?? 0, encore: lignes.length === borne };
}

export async function ecrireDex(dresseurId, donnees, profilId = null) {
  if (!donnees || typeof donnees !== 'object' || Array.isArray(donnees)) {
    throw new ErreurCompte('Dex illisible.');
  }
  const captures = compterEspeces(donnees, 'caught');
  const shiny = compterEspeces(donnees, 'shiny');

  // « majLe » et « profilId » sont ajoutés par lireDex à la *réponse*. Relus
  // puis réécrits, ils finiraient par s'incruster dans la sauvegarde : on les
  // retire avant d'enregistrer, la base n'a pas à stocker ses propres en-têtes.
  //
  // Par copie et non par déstructuration : « profilId » est déjà le nom d'un
  // paramètre de cette fonction, et le redéclarer rendait tout le fichier
  // illisible pour Node.
  const propre = { ...donnees };
  delete propre.majLe;
  delete propre.profilId;
  const brut = JSON.stringify(propre);
  if (brut.length > TAILLE_MAX_DEX) throw new ErreurCompte('Dex trop volumineux.', 413);

  const cible = profilId ? await profilDu(dresseurId, profilId)
                         : await profilParDefaut(dresseurId);
  const maj = horodatage();

  // L'etat precedent, lu avant d'ecrire : c'est la seule occasion de savoir ce
  // qui change. Une lecture de plus par sauvegarde, pour un journal qu'on ne
  // pourrait pas reconstituer autrement.
  let precedent = null;
  const ancienne = await une('SELECT donnees FROM pa_dex WHERE profil_id = ?', [cible]);
  if (ancienne) { try { precedent = JSON.parse(ancienne.donnees); } catch { precedent = null; } }
  // ON DUPLICATE KEY : une seule requête, et pas de fenêtre entre un SELECT et
  // un INSERT où deux écritures se marcheraient dessus. La clé est désormais
  // le profil ; dresseur_id reste renseigné, il évite une jointure ailleurs.
  await ecrire(
    `INSERT INTO pa_dex (profil_id, dresseur_id, donnees, captures, shiny, maj_le)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE donnees = VALUES(donnees), captures = VALUES(captures),
       shiny = VALUES(shiny), maj_le = VALUES(maj_le)`,
    [cible, dresseurId, brut, captures, shiny, maj]);
  await ecrire('UPDATE pa_profils SET maj_le = ? WHERE id = ?', [maj, cible]);

  // Le journal ne doit jamais faire echouer une sauvegarde : la progression
  // compte plus que sa chronique.
  let journalises = 0;
  try {
    journalises = await journaliser(cible, nouveautes(precedent, propre), maj);
  } catch (e) {
    console.error('journal des captures :', e.message);
  }

  return { captures, shiny, majLe: maj, profilId: cible, journalises };
}

/**
 * Les autres dresseurs et leur avancement — c'est ce qui permet de comparer.
 * On ne renvoie que les compteurs, pas les dex entiers : inutile de faire
 * transiter des mégaoctets pour afficher une liste.
 */
/**
 * Un dresseur, une ligne — celle de son aventure principale.
 *
 * Sans ce choix, quelqu'un qui ouvre trois aventures apparaîtrait trois fois,
 * dont deux à zéro : le classement se remplirait de doublons vides. Les
 * aventures privées en sont exclues, et restent visibles de leur seul auteur.
 */
export async function classement() {
  return await lire(
    `SELECT d.pseudo, d.discord_id, d.avatar,
            p.nom                   AS profil,
            COALESCE(x.captures, 0) AS captures,
            COALESCE(x.shiny, 0)    AS shiny,
            x.maj_le
       FROM pa_dresseurs d
       LEFT JOIN pa_profils p
              ON p.id = (SELECT id FROM pa_profils
                          WHERE dresseur_id = d.id AND public = 1
                          ORDER BY par_defaut DESC, id ASC LIMIT 1)
       LEFT JOIN pa_dex x ON x.profil_id = p.id
      WHERE d.visible = 1
      ORDER BY captures DESC, shiny DESC, d.pseudo ASC
      LIMIT 200`);
}

/** Les aventures publiques d'un dresseur, pour aller voir chez lui. */
export async function profilsPublics(pseudo) {
  const d = await une('SELECT id, pseudo, avatar, discord_id FROM pa_dresseurs WHERE pseudo_cle = ?',
    [normaliser(pseudo)]);
  if (!d) return null;
  const profils = await lire(
    `SELECT p.id, p.nom, p.par_defaut, p.mode, p.niveau_formes, p.maj_le,
            COALESCE(x.captures, 0) AS captures, COALESCE(x.shiny, 0) AS shiny
       FROM pa_profils p LEFT JOIN pa_dex x ON x.profil_id = p.id
      WHERE p.dresseur_id = ? AND p.public = 1
      ORDER BY p.par_defaut DESC, p.id ASC`, [d.id]);
  return { dresseur: { pseudo: d.pseudo, avatar: d.avatar, discordId: d.discord_id }, profils };
}

/** Chercher un dresseur par son pseudo, même partiel. */
export async function chercherDresseurs(requete) {
  const motif = `%${normaliser(requete).replace(/[%_]/g, '\\$&')}%`;
  return await lire(
    `SELECT pseudo, avatar, discord_id FROM pa_dresseurs
      WHERE pseudo_cle LIKE ? AND visible = 1
      ORDER BY pseudo ASC LIMIT 25`, [motif]);
}

/**
 * Figurer ou non dans la liste des dresseurs.
 *
 * CE QUE CELA FAIT, ET CE QUE CELA NE FAIT PAS. Se retirer sort du classement
 * et de la recherche : on ne se fait plus trouver. Cela ne rend rien prive pour
 * autant — qui connait le pseudo exact peut toujours aller voir les aventures
 * publiques, et ceux qui suivent deja continuent de voir passer les captures.
 *
 * C'est deliberе. Rendre un compte introuvable ET muet d'un seul interrupteur
 * ferait disparaitre quelqu'un du fil de ses amis sans qu'ils comprennent
 * pourquoi. Pour ne rien montrer, l'outil existe deja et il est plus precis :
 * marquer ses aventures comme privees.
 */
export async function changerVisibilite(dresseurId, visible) {
  const v = visible ? 1 : 0;
  await ecrire('UPDATE pa_dresseurs SET visible = ? WHERE id = ?', [v, dresseurId]);
  return { visible: v === 1 };
}

/**
 * Le dex d'un pote, pour la comparaison. Sans profil précisé, c'est son
 * aventure principale publique. Une aventure privée n'est jamais servie.
 */
export async function dexDe(pseudo, profilId = null) {
  const d = await une('SELECT id, pseudo FROM pa_dresseurs WHERE pseudo_cle = ?',
    [normaliser(pseudo)]);
  if (!d) return null;

  const p = profilId
    ? await une(`SELECT id, nom, mode, niveau_formes FROM pa_profils
                  WHERE id = ? AND dresseur_id = ? AND public = 1`, [profilId, d.id])
    : await une(`SELECT id, nom, mode, niveau_formes FROM pa_profils WHERE dresseur_id = ? AND public = 1
                  ORDER BY par_defaut DESC, id ASC LIMIT 1`, [d.id]);
  if (!p) return { pseudo: d.pseudo, profil: null, dex: null };

  const l = await une('SELECT donnees, maj_le FROM pa_dex WHERE profil_id = ?', [p.id]);
  let dex = null;
  if (l) {
    try { dex = JSON.parse(l.donnees); dex.majLe = l.maj_le; } catch { dex = null; }
  }
  // Le niveau part avec le dex : la barre de comparaison doit savoir sur quel
  // dénominateur l'autre dresseur compte, et non supposer le sien.
  return { pseudo: d.pseudo,
           profil: { id: p.id, nom: p.nom, mode: p.mode, niveau_formes: p.niveau_formes },
           dex };
}

export async function nombreDresseurs() {
  return (await une('SELECT COUNT(*) AS n FROM pa_dresseurs'))?.n ?? 0;
}

// --- Emporter ses données ---------------------------------------------------

/**
 * Tout ce qu'un dresseur possède, en un objet.
 *
 * Le service tourne sur un hébergement gratuit. Le jour où il ferme — ou celui
 * où l'envie change — il ne doit pas retenir les collections en otage. C'est
 * aussi la seule sauvegarde que le dresseur contrôle lui-même : celle du
 * serveur ne lui appartient pas.
 *
 * Ce qui n'y est PAS : les sessions, qui sont des jetons de connexion et non
 * des données, et l'identifiant Discord, qui appartient à Discord.
 */
export async function exporter(dresseurId) {
  const d = await une(
    'SELECT pseudo, avatar, cree_le FROM pa_dresseurs WHERE id = ?', [dresseurId]);
  if (!d) throw new ErreurCompte('Dresseur introuvable.', 404);

  const profils = await lire(
    `SELECT id, nom, public, par_defaut, mode, niveau_formes, cree_le, maj_le
       FROM pa_profils WHERE dresseur_id = ? ORDER BY id`, [dresseurId]);

  for (const p of profils) {
    const l = await une('SELECT donnees FROM pa_dex WHERE profil_id = ?', [p.id]);
    try { p.dex = l ? JSON.parse(l.donnees) : null; } catch { p.dex = null; }
    p.historique = await lire(
      `SELECT pokemon, dex, chromatique, ajoute_le FROM pa_historique
        WHERE profil_id = ? ORDER BY id`, [p.id]);
    delete p.id;   // un identifiant de base n'a aucun sens hors de la base
  }

  return {
    exporteLe: horodatage(),
    format: 'pokearchive-1',
    dresseur: { pseudo: d.pseudo, avatar: d.avatar, creeLe: d.cree_le },
    aventures: profils,
  };
}

// --- Les sessions ouvertes --------------------------------------------------

/**
 * Les connexions en cours, la plus récente d'abord.
 *
 * L'empreinte du jeton ne sort jamais : elle sert à reconnaître la session
 * courante, ici, et rien de plus. Ce qu'on rend est une poignée numérique.
 */
export async function sessions(dresseurId, jetonCourant) {
  const courante = jetonCourant ? cle(jetonCourant) : null;
  const l = await lire(
    `SELECT id, jeton_cle, cree_le, expire_le FROM pa_sessions
      WHERE dresseur_id = ? ORDER BY cree_le DESC`, [dresseurId]);
  return l.map((s) => ({
    id: s.id,
    creeLe: s.cree_le,
    expireLe: s.expire_le,
    courante: s.jeton_cle === courante,
  }));
}

/** Ferme une session précise. La sienne comprise — c'est se déconnecter. */
export async function fermerSession(dresseurId, sessionId) {
  const r = await ecrire('DELETE FROM pa_sessions WHERE id = ? AND dresseur_id = ?',
    [Number(sessionId) || 0, dresseurId]);
  if (!r.affectedRows) throw new ErreurCompte('Session introuvable.', 404);
  return r.affectedRows;
}

/**
 * Ferme tout sauf celle d'où vient la demande.
 *
 * C'est le geste qu'on cherche après s'être connecté sur la machine d'un ami :
 * tout couper sans se déconnecter soi-même.
 */
export async function fermerLesAutres(dresseurId, jetonCourant) {
  const r = await ecrire(
    'DELETE FROM pa_sessions WHERE dresseur_id = ? AND jeton_cle <> ?',
    [dresseurId, jetonCourant ? cle(jetonCourant) : '']);
  return r.affectedRows;
}

// --- Le journal des captures ------------------------------------------------

/**
 * Ce qui a été coché, toutes aventures confondues.
 *
 * L'accueil en montrait les dernières et rien d'autre, alors que la table
 * garde tout depuis le premier jour. On pagine par identifiant décroissant et
 * non par date : deux captures de la même seconde garderaient sinon un ordre
 * instable, et la pagination sauterait des lignes.
 */
export async function journal(dresseurId, avant = null, limite = 50) {
  const borne = Math.min(Math.max(Number(limite) || 50, 1), 200);
  const curseur = Number(avant);
  const params = [dresseurId];
  let filtre = '';
  if (Number.isInteger(curseur) && curseur > 0) {
    filtre = 'AND h.id < ?';
    params.push(curseur);
  }

  // La borne est interpolée, jamais passée en paramètre : MySQL refuse un
  // marqueur dans un LIMIT de requête préparée. Elle est sûre parce qu'elle
  // sort de Math.min/Math.max — c'est un nombre, pas une saisie. Même règle
  // que historique() juste au-dessus, et pour la même raison.
  const l = await lire(
    `SELECT h.id, h.pokemon, h.dex, h.chromatique, h.ajoute_le, p.nom AS aventure
       FROM pa_historique h JOIN pa_profils p ON p.id = h.profil_id
      WHERE p.dresseur_id = ? ${filtre}
      ORDER BY h.id DESC LIMIT ${borne + 1}`, params);

  // Une ligne de plus que demandé : sa présence dit qu'il y a une suite, sans
  // avoir à compter la table entière à chaque page.
  const encore = l.length > borne;
  return { lignes: l.slice(0, borne), encore };
}

// --- Administration ---------------------------------------------------------

/**
 * Renommer quelqu'un, quand son pseudo ne peut pas rester.
 *
 * Le filtre de pseudos refuse à la saisie, mais aucune liste n'arrête un
 * déterminé : il reste les fautes volontaires, les langues non listées, et
 * l'insulte qui n'en est une que pour celui qui la reçoit. Sans ce filet, un
 * pseudo passé au travers s'affichait pour toujours dans le classement.
 *
 * Le nouveau nom passe par les MÊMES règles que les autres : rien ne servirait
 * de remplacer une grossièreté par une autre.
 */
export async function renommerDresseur(pseudoActuel, nouveau) {
  const d = await une('SELECT id FROM pa_dresseurs WHERE pseudo_cle = ?',
    [normaliser(pseudoActuel || '')]);
  if (!d) throw new ErreurCompte('Dresseur introuvable.', 404);
  return { id: d.id, pseudo: await changerPseudo(d.id, nouveau) };
}
