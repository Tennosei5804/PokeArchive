// Connexion MySQL / MariaDB.
//
// Le mot de passe vit ici, sur le serveur, et nulle part ailleurs. C'est toute
// la raison d'être de cette API : l'application distribuée aux joueurs ne
// reçoit qu'un jeton de session, révocable et limité à un compte.

import mysql from 'mysql2/promise';
import { config } from './config.js';

let pool = null;

export function base() {
  if (pool) return pool;
  pool = mysql.createPool({
    host: config.base.hote,
    port: config.base.port,
    user: config.base.utilisateur,
    password: config.base.motdepasse,
    database: config.base.nom,
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    // Le pool remplace lui-même les connexions que MySQL ferme après quelques
    // heures d'inactivité — sinon le service tombe après une nuit sans joueur.
    idleTimeout: 60_000,
    enableKeepAlive: true,
    // En local, MySQL est sur la même machine et le chiffrement n'apporte rien.
    // Hébergé, la base est ailleurs : les identifiants et les Pokédex traversent
    // le réseau, et la plupart des hébergeurs REFUSENT une connexion en clair.
    // DB_SSL=oui suffit — mysql2 se sert alors des autorités de certification du
    // système, ce que tous les hébergeurs sérieux savent présenter.
    ...(config.base.ssl ? { ssl: { minVersion: 'TLSv1.2' } } : {}),
  });
  return pool;
}

export const description = () =>
  `MySQL ***@${config.base.hote}:${config.base.port}/${config.base.nom}`;

export async function lire(sql, params = []) {
  const [lignes] = await base().execute(sql, params);
  return lignes;
}

export async function une(sql, params = []) {
  const lignes = await lire(sql, params);
  return lignes.length ? lignes[0] : null;
}

export async function ecrire(sql, params = []) {
  const [resultat] = await base().execute(sql, params);
  return resultat;
}

// --- Schéma -----------------------------------------------------------------
// « IF NOT EXISTS » partout : relancer le service ne touche à rien.
const TABLES = [
  `CREATE TABLE IF NOT EXISTS pa_dresseurs (
     id         BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
     discord_id VARCHAR(64)  NOT NULL,
     pseudo     VARCHAR(255) NOT NULL,
     pseudo_cle VARCHAR(64)  NOT NULL UNIQUE,
     avatar     VARCHAR(255),
     cree_le    VARCHAR(64)  NOT NULL,
     vu_le      VARCHAR(64)
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  `CREATE TABLE IF NOT EXISTS pa_sessions (
     jeton_cle   VARCHAR(64) NOT NULL PRIMARY KEY,
     dresseur_id BIGINT      NOT NULL,
     cree_le     VARCHAR(64) NOT NULL,
     expire_le   VARCHAR(64) NOT NULL,
     CONSTRAINT fk_pa_sessions_dresseur FOREIGN KEY (dresseur_id)
       REFERENCES pa_dresseurs(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Une aventure. Un dresseur en a autant qu'il veut, chacune avec son propre
  // dex : « Aventure 1 », « Chasse shiny », « Nuzlocke »…
  `CREATE TABLE IF NOT EXISTS pa_profils (
     id          BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
     dresseur_id BIGINT      NOT NULL,
     nom         VARCHAR(40) NOT NULL,
     nom_cle     VARCHAR(40) NOT NULL,
     public      TINYINT(1)  NOT NULL DEFAULT 1,
     par_defaut  TINYINT(1)  NOT NULL DEFAULT 0,
     -- Ce que l'aventure compte : 'capture' (le Pokédex ordinaire), 'vu'
     -- (seulement rencontré) ou 'living' (un exemplaire de chaque, en même
     -- temps). Les aventures existantes sont des Pokédex de capture.
     mode        VARCHAR(16) NOT NULL DEFAULT 'capture',
     niveau_formes TINYINT NOT NULL DEFAULT 3,
     cree_le     VARCHAR(64) NOT NULL,
     maj_le      VARCHAR(64),
     UNIQUE KEY uk_pa_profils_nom (dresseur_id, nom_cle),
     CONSTRAINT fk_pa_profils_dresseur FOREIGN KEY (dresseur_id)
       REFERENCES pa_dresseurs(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Le journal des captures : une ligne par Pokémon ajouté, avec sa date.
  //
  // Le dex est stocké en bloc, donc rien ne garde trace du *moment* où une case
  // a été cochée. Cette table le fait, en comparant chaque sauvegarde à la
  // précédente : c'est ce qui permet de raconter une aventure au lieu d'en
  // donner seulement l'état final.
  `CREATE TABLE IF NOT EXISTS pa_historique (
     id          BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
     profil_id   BIGINT      NOT NULL,
     pokemon     VARCHAR(64) NOT NULL,
     dex         VARCHAR(32) NOT NULL,
     chromatique TINYINT(1)  NOT NULL DEFAULT 0,
     ajoute_le   VARCHAR(64) NOT NULL,
     KEY idx_pa_historique_profil (profil_id, id),
     CONSTRAINT fk_pa_historique_profil FOREIGN KEY (profil_id)
       REFERENCES pa_profils(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // MEDIUMTEXT et non TEXT : le TEXT de MySQL plafonne à 64 Ko, trop juste
  // pour un dex complet.
  //
  // La clé était `dresseur_id` : un compte, un dex. Elle devient `profil_id`,
  // et la migration ci-dessous fait passer l'existant sans rien perdre. La
  // colonne `dresseur_id` reste : elle évite une jointure sur presque toutes
  // les requêtes, et sert de garde-fou si un profil venait à manquer.
  `CREATE TABLE IF NOT EXISTS pa_dex (
     dresseur_id BIGINT      NOT NULL PRIMARY KEY,
     donnees     MEDIUMTEXT  NOT NULL,
     captures    INTEGER     NOT NULL DEFAULT 0,
     shiny       INTEGER     NOT NULL DEFAULT 0,
     maj_le      VARCHAR(64) NOT NULL,
     CONSTRAINT fk_pa_dex_dresseur FOREIGN KEY (dresseur_id)
       REFERENCES pa_dresseurs(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

const INDEX = [
  { nom: 'idx_pa_dresseurs_discord', table: 'pa_dresseurs', colonnes: 'discord_id', unique: true },
  { nom: 'idx_pa_sessions_dresseur', table: 'pa_sessions', colonnes: 'dresseur_id', unique: false },
];

/**
 * Fait passer pa_dex d'une clé par dresseur à une clé par profil.
 *
 * Additive et rejouable : on ajoute, on remplit, on vérifie, et seulement
 * ensuite on bascule la clé. À aucun moment une donnée n'est supprimée avant
 * que son remplaçant ne soit en place — c'est la progression des joueurs qui
 * est dans cette table.
 */
async function migrerVersProfils(journal) {
  const existe = async (sql, params) => Boolean((await une(sql, params))?.n);

  // 1. La colonne d'accueil.
  const aColonne = await existe(
    `SELECT COUNT(*) AS n FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'pa_dex' AND column_name = 'profil_id'`);
  if (!aColonne) {
    await base().query('ALTER TABLE pa_dex ADD COLUMN profil_id BIGINT NULL');
    journal('schéma : colonne pa_dex.profil_id ajoutée');
  }

  // 2. Chaque dex sans profil se voit attribuer une aventure. On réutilise
  //    celle qui existe déjà si le dresseur en a une — relancer le service ne
  //    doit pas fabriquer des doublons.
  const orphelins = await lire('SELECT dresseur_id FROM pa_dex WHERE profil_id IS NULL');
  for (const { dresseur_id } of orphelins) {
    let profil = await une(
      'SELECT id FROM pa_profils WHERE dresseur_id = ? ORDER BY id LIMIT 1', [dresseur_id]);
    if (!profil) {
      const maintenant = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
      const r = await ecrire(
        `INSERT INTO pa_profils (dresseur_id, nom, nom_cle, public, par_defaut, cree_le, maj_le)
         VALUES (?, 'Aventure 1', 'aventure 1', 1, 1, ?, ?)`,
        [dresseur_id, maintenant, maintenant]);
      profil = { id: r.insertId };
    }
    await ecrire('UPDATE pa_dex SET profil_id = ? WHERE dresseur_id = ? AND profil_id IS NULL',
      [profil.id, dresseur_id]);
  }
  if (orphelins.length) {
    journal(`schéma : ${orphelins.length} dex rattaché(s) à une aventure`);
  }

  // 3. Bascule de la clé — uniquement si plus aucune ligne n'est orpheline.
  //    Dans le cas contraire on s'arrête là : la table reste utilisable en
  //    l'état, et le prochain démarrage réessaiera.
  if (await existe('SELECT COUNT(*) AS n FROM pa_dex WHERE profil_id IS NULL')) {
    journal('schéma : bascule différée, des dex restent sans profil');
    return;
  }

  const clePrimaire = await une(
    `SELECT column_name AS colonne FROM information_schema.key_column_usage
      WHERE table_schema = DATABASE() AND table_name = 'pa_dex'
        AND constraint_name = 'PRIMARY'`);
  if (clePrimaire?.colonne !== 'dresseur_id') return;   // déjà basculée

  // La clé primaire portait aussi l'index dont dépend la clé étrangère vers
  // pa_dresseurs : sans index de remplacement, MySQL refuse de la supprimer.
  const aIndex = await existe(
    `SELECT COUNT(*) AS n FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'pa_dex'
        AND index_name = 'idx_pa_dex_dresseur'`);
  if (!aIndex) await base().query('CREATE INDEX idx_pa_dex_dresseur ON pa_dex(dresseur_id)');

  await base().query('ALTER TABLE pa_dex MODIFY profil_id BIGINT NOT NULL');
  await base().query('ALTER TABLE pa_dex DROP PRIMARY KEY, ADD PRIMARY KEY (profil_id)');
  await base().query(
    `ALTER TABLE pa_dex ADD CONSTRAINT fk_pa_dex_profil
       FOREIGN KEY (profil_id) REFERENCES pa_profils(id) ON DELETE CASCADE`);
  journal('schéma : pa_dex est désormais indexé par profil');
}

/**
 * La colonne « mode » sur une table déjà en service.
 *
 * « CREATE TABLE IF NOT EXISTS » ne touche pas une table existante : sans cet
 * ajout, les comptes déjà créés n'auraient jamais la colonne, et toutes les
 * lectures échoueraient. La valeur par défaut fait des aventures existantes
 * des Pokédex de capture, ce qu'elles étaient de fait.
 */
async function migrerModeProfil(journal) {
  const deja = await une(
    `SELECT COUNT(*) AS n FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'pa_profils'
        AND column_name = 'mode'`);
  if (deja?.n) return;
  await base().query(
    "ALTER TABLE pa_profils ADD COLUMN mode VARCHAR(16) NOT NULL DEFAULT 'capture'");
  journal('schéma : colonne pa_profils.mode ajoutée');
}

/**
 * La colonne « niveau_formes » sur une table déjà en service.
 *
 * Trois est le niveau par défaut : une entrée par espèce, plus les régionales,
 * plus les formes alternatives. C'est ce que voyaient les aventures existantes
 * avant que le réglage n'existe.
 */
async function migrerNiveauFormes(journal) {
  const deja = await une(
    `SELECT COUNT(*) AS n FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'pa_profils'
        AND column_name = 'niveau_formes'`);
  if (deja?.n) return;
  await base().query(
    'ALTER TABLE pa_profils ADD COLUMN niveau_formes TINYINT NOT NULL DEFAULT 3');
  journal('schéma : colonne pa_profils.niveau_formes ajoutée');
}

export async function creerSchema(journal = () => {}) {
  for (const sql of TABLES) await base().query(sql);

  for (const { nom, table, colonnes, unique } of INDEX) {
    // MySQL ne connaît pas « IF NOT EXISTS » sur un index : on regarde d'abord.
    const deja = await une(
      `SELECT COUNT(*) AS n FROM information_schema.statistics
        WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
      [table, nom],
    );
    if (!deja?.n) {
      // Les noms interpolés viennent de la constante INDEX, jamais d'une
      // saisie : aucune valeur extérieure n'entre dans ce SQL.
      await base().query(
        `CREATE ${unique ? 'UNIQUE INDEX' : 'INDEX'} ${nom} ON ${table}(${colonnes})`);
      journal(`schéma : index ${nom} créé`);
    }
  }

  // En dernier : les tables et les index doivent exister avant qu'on y touche.
  await migrerModeProfil(journal);
  await migrerNiveauFormes(journal);
  await migrerVersProfils(journal);
  await migrerIdSession(journal);
}

/**
 * Un identifiant sur les sessions.
 *
 * La table n'avait que l'empreinte du jeton pour clé. Elle suffit au service,
 * qui cherche par empreinte, mais pas au dresseur : pour lui montrer ses
 * sessions et le laisser en fermer une, il faut pouvoir la désigner — et
 * l'empreinte d'un jeton n'a rien à faire dans une adresse ni dans une page.
 *
 * La clé primaire ne bouge pas : c'est toujours l'empreinte qui identifie une
 * session pour le service. L'identifiant n'est qu'une poignée, et il est donc
 * seulement UNIQUE.
 */
async function migrerIdSession(journal) {
  const deja = await une(
    `SELECT COUNT(*) AS n FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'pa_sessions'
        AND column_name = 'id'`);
  if (deja?.n) return;
  await base().query(
    'ALTER TABLE pa_sessions ADD COLUMN id BIGINT NOT NULL AUTO_INCREMENT UNIQUE FIRST');
  journal('schéma : colonne pa_sessions.id ajoutée');
}
