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

  // Qui suit qui. Abonnement a sens unique : pas de demande, pas
  // d'acceptation. Rien de neuf n'est revele — le classement et les profils
  // publics montrent deja cette progression a tout le monde. S'abonner ne fait
  // que filtrer ce qu'on pouvait deja aller lire.
  //
  // vu_jusqua est l'identifiant du dernier pa_historique deja annonce. Il est
  // pose au maximum du moment ou l'abonnement est cree : sans cela, suivre
  // quelqu'un deverserait six mois de son journal en notifications.
  `CREATE TABLE IF NOT EXISTS pa_amis (
     dresseur_id BIGINT      NOT NULL,
     ami_id      BIGINT      NOT NULL,
     depuis      VARCHAR(64) NOT NULL,
     vu_jusqua   BIGINT      NOT NULL DEFAULT 0,
     PRIMARY KEY (dresseur_id, ami_id),
     CONSTRAINT fk_pa_amis_dresseur FOREIGN KEY (dresseur_id)
       REFERENCES pa_dresseurs(id) ON DELETE CASCADE,
     CONSTRAINT fk_pa_amis_ami FOREIGN KEY (ami_id)
       REFERENCES pa_dresseurs(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Un accord entre deux joueurs, pas un transfert. Rien ne bouge ici : les
  // deux se retrouvent ensuite dans leur jeu. Voir api/src/echanges.js.
  //
  // offert et demande sont ecrits DU POINT DE VUE DU DEMANDEUR, une fois pour
  // toutes. Les stocker « selon qui regarde » demanderait de savoir qui
  // regarde au moment d'ecrire, ce qui n'a pas de sens ; c'est la lecture qui
  // les retourne.
  //
  // etat : propose | accepte | refuse | annule | fait
  `CREATE TABLE IF NOT EXISTS pa_echanges (
     id           BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
     demandeur_id BIGINT      NOT NULL,
     receveur_id  BIGINT      NOT NULL,
     dex          VARCHAR(32) NOT NULL,
     offert       VARCHAR(64) NOT NULL,
     demande      VARCHAR(64) NOT NULL,
     etat         VARCHAR(16) NOT NULL DEFAULT 'propose',
     mot          VARCHAR(280) NULL,
     cree_le      VARCHAR(64) NOT NULL,
     maj_le       VARCHAR(64) NOT NULL,
     CONSTRAINT fk_pa_echanges_demandeur FOREIGN KEY (demandeur_id)
       REFERENCES pa_dresseurs(id) ON DELETE CASCADE,
     CONSTRAINT fk_pa_echanges_receveur FOREIGN KEY (receveur_id)
       REFERENCES pa_dresseurs(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // La discussion d'un echange, et rien d'autre. Il n'y a toujours pas de
  // messagerie libre dans PokeArchive : on n'ecrit qu'a l'interieur d'un
  // echange qu'on a propose ou recu, jamais a quelqu'un au hasard.
  //
  // Ce commentaire disait « qu'a quelqu'un qui a ACCEPTE un echange ». La
  // discussion ouvre desormais des la proposition — voir l'en-tete de
  // echanges.js, qui explique pourquoi cette regle-la protegeait l'importun
  // plutot que l'importune.
  // UN MESSAGE VISE UN ÉCHANGE, OU UNE PERSONNE — jamais les deux, jamais ni
  // l'un ni l'autre. C'est pourquoi les deux colonnes sont NULL : l'une porte
  // la conversation d'un échange, l'autre un message direct.
  //
  // POURQUOI UNE SEULE TABLE. Deux tables auraient divergé — un correctif sur
  // la longueur, sur l'ordre, sur ce qu'on affiche, n'aurait été appliqué qu'à
  // l'une des deux. Et surtout : à l'écran, une conversation avec quelqu'un est
  // UNE conversation. Qu'un message parle d'un échange précis ou de rien de
  // particulier ne change pas à qui on parle.
  `CREATE TABLE IF NOT EXISTS pa_messages (
     id             BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
     echange_id     BIGINT       NULL,
     destinataire_id BIGINT      NULL,
     auteur_id      BIGINT       NOT NULL,
     texte          VARCHAR(1000) NOT NULL,
     espece         VARCHAR(64)  NULL,
     image_id       BIGINT       NULL,
     lu             TINYINT(1)   NOT NULL DEFAULT 0,
     cree_le        VARCHAR(64)  NOT NULL,
     CONSTRAINT fk_pa_messages_echange FOREIGN KEY (echange_id)
       REFERENCES pa_echanges(id) ON DELETE CASCADE,
     CONSTRAINT fk_pa_messages_destinataire FOREIGN KEY (destinataire_id)
       REFERENCES pa_dresseurs(id) ON DELETE CASCADE,
     CONSTRAINT fk_pa_messages_auteur FOREIGN KEY (auteur_id)
       REFERENCES pa_dresseurs(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Ce qui est arrive POUR QUELQU'UN. Les captures des amis n'y figurent pas :
  // elles se deduisent de pa_historique, et ce qui se deduit ne s'ecrit pas.
  // Ici on ne garde que ce qui s'adresse a une personne et attend d'elle
  // quelque chose. La raison longue est en tete de notifications.js.
  `CREATE TABLE IF NOT EXISTS pa_notifications (
     id          BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
     dresseur_id BIGINT       NOT NULL,
     genre       VARCHAR(24)  NOT NULL,
     echange_id  BIGINT       NULL,
     de_id       BIGINT       NULL,
     titre       VARCHAR(200) NOT NULL,
     detail      VARCHAR(400) NULL,
     lu          TINYINT(1)   NOT NULL DEFAULT 0,
     cree_le     VARCHAR(64)  NOT NULL,
     CONSTRAINT fk_pa_notifications_dresseur FOREIGN KEY (dresseur_id)
       REFERENCES pa_dresseurs(id) ON DELETE CASCADE,
     CONSTRAINT fk_pa_notifications_echange FOREIGN KEY (echange_id)
       REFERENCES pa_echanges(id) ON DELETE CASCADE,
     CONSTRAINT fk_pa_notifications_de FOREIGN KEY (de_id)
       REFERENCES pa_dresseurs(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

  // Les photos de chasse : la fiche seulement. Le fichier vit sur le disque,
  // pas ici — un BLOB par chasse ferait grossir chaque sauvegarde SQL d'autant,
  // et la base d'un hebergement gratuit est bien plus etroite que son disque.
  //
  // profil_id et non dresseur_id pour la visibilite : une photo suit
  // l'AVENTURE a laquelle elle appartient, donc son drapeau public. Les deux
  // colonnes sont la quand meme, la seconde pour le quota, qui se compte par
  // personne et non par aventure.
  //
  // `sujet` ne vaut que 'chasse' aujourd'hui. La colonne existe pour que les
  // echanges puissent s'y greffer sans migration.
  `CREATE TABLE IF NOT EXISTS pa_images (
     id          BIGINT      NOT NULL AUTO_INCREMENT PRIMARY KEY,
     dresseur_id BIGINT      NOT NULL,
     profil_id   BIGINT      NOT NULL,
     sujet       VARCHAR(16) NOT NULL,
     fichier     VARCHAR(96) NOT NULL,
     mime        VARCHAR(32) NOT NULL,
     octets      INT         NOT NULL,
     largeur     INT         NOT NULL DEFAULT 0,
     hauteur     INT         NOT NULL DEFAULT 0,
     cree_le     VARCHAR(64) NOT NULL,
     CONSTRAINT fk_pa_images_dresseur FOREIGN KEY (dresseur_id)
       REFERENCES pa_dresseurs(id) ON DELETE CASCADE,
     CONSTRAINT fk_pa_images_profil FOREIGN KEY (profil_id)
       REFERENCES pa_profils(id) ON DELETE CASCADE
   ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

const INDEX = [
  { nom: 'idx_pa_dresseurs_discord', table: 'pa_dresseurs', colonnes: 'discord_id', unique: true },
  { nom: 'idx_pa_sessions_dresseur', table: 'pa_sessions', colonnes: 'dresseur_id', unique: false },
  { nom: 'idx_pa_amis_ami', table: 'pa_amis', colonnes: 'ami_id', unique: false },
  // RIEN A AJOUTER POUR LES ECHANGES, LES MESSAGES NI LES NOTIFICATIONS. Les
  // quatre colonnes qu'on interroge — demandeur_id, receveur_id, echange_id,
  // dresseur_id — portent toutes une cle etrangere, et MySQL indexe d'office
  // la colonne d'une cle etrangere. Les redeclarer ici creerait un second
  // index sur la meme colonne : deux arbres a tenir a jour a chaque ecriture,
  // pour une lecture qui n'irait pas plus vite.
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
  await migrerVisibiliteDresseur(journal);
  await migrerEchangesOuverts(journal);
  await migrerMessagesDirects(journal);
  await migrerQuiPeutEcrire(journal);
  await migrerAuteurNotification(journal);
  await migrerEspeceMessage(journal);
  await migrerImageMessage(journal);
  await migrerMotsEnMessages(journal);
  await migrerNomDiscord(journal);
  await migrerNotesProfil(journal);
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
/**
 * Ajoute pa_dresseurs.visible.
 *
 * Etre dans le classement est le comportement par defaut : la colonne vaut 1
 * pour tout le monde, y compris les comptes qui existaient avant elle. Se
 * retirer est un geste, y figurer n'en demande aucun.
 */
/**
 * Ajoute pa_dresseurs.discord_nom.
 *
 * Le nom affiche sur Discord — « Tennosei », pas le pseudo technique
 * « tennosei5804 ». C'est sous celui-la que les gens se reconnaissent, et il
 * ne se change pas depuis PokeArchive : voila ce qui permet de retrouver
 * quelqu'un qui s'est renomme ici.
 *
 * On ne le gardait pas : il ne servait que de suggestion au moment de
 * l'inscription, puis etait oublie. Il se rafraichit desormais a chaque
 * connexion, puisqu'il peut changer chez Discord.
 *
 * La colonne reste vide pour les comptes existants jusqu'a leur prochaine
 * connexion, ou depuisDiscord() la remplit. L'affichage doit donc supporter
 * qu'elle manque, et pas seulement le jour du deploiement.
 */
/**
 * Ajoute pa_profils.notes — le carnet de bord d'une aventure.
 *
 * Sa regle de Nuzlocke, ses surnoms, ou elle en est. Les gens tiennent ca dans
 * un fichier texte a cote ; autant que ce soit dedans.
 *
 * TEXT et non VARCHAR : un carnet n'a pas de longueur previsible, et 64 Ko est
 * large pour du texte tape a la main. NULL par defaut — une aventure sans
 * carnet n'en a pas, ce qui n'est pas la meme chose qu'un carnet vide.
 */
async function migrerNotesProfil(journal) {
  const deja = await une(
    `SELECT COUNT(*) AS n FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'pa_profils'
        AND column_name = 'notes'`);
  if (deja?.n) return;
  await base().query('ALTER TABLE pa_profils ADD COLUMN notes TEXT NULL');
  journal('schema : colonne pa_profils.notes ajoutee');
}

async function migrerNomDiscord(journal) {
  const deja = await une(
    `SELECT COUNT(*) AS n FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'pa_dresseurs'
        AND column_name = 'discord_nom'`);
  if (deja?.n) return;
  await base().query(
    'ALTER TABLE pa_dresseurs ADD COLUMN discord_nom VARCHAR(64) NULL');
  journal('schema : colonne pa_dresseurs.discord_nom ajoutee');
}

async function migrerVisibiliteDresseur(journal) {
  const deja = await une(
    `SELECT COUNT(*) AS n FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'pa_dresseurs'
        AND column_name = 'visible'`);
  if (deja?.n) return;
  await base().query(
    'ALTER TABLE pa_dresseurs ADD COLUMN visible TINYINT(1) NOT NULL DEFAULT 1');
  journal('schema : colonne pa_dresseurs.visible ajoutee');
}

async function migrerEchangesOuverts(journal) {
  const deja = await une(
    `SELECT COUNT(*) AS n FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'pa_dresseurs'
        AND column_name = 'echanges_ouverts'`);
  if (deja?.n) return;
  // ALLUME PAR DEFAUT, contrairement a `visible`. Recevoir des propositions est
  // ce pour quoi on entre dans la liste des dresseurs ; c'est l'extinction qui
  // est la decision. Les comptes existants ne changent donc pas de comportement
  // le jour de la migration — ce qu'un DEFAULT 0 aurait fait en silence.
  await base().query(
    'ALTER TABLE pa_dresseurs ADD COLUMN echanges_ouverts TINYINT(1) NOT NULL DEFAULT 1');
  journal('schema : colonne pa_dresseurs.echanges_ouverts ajoutee');
}

async function migrerMessagesDirects(journal) {
  const deja = await une(
    `SELECT COUNT(*) AS n FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'pa_messages'
        AND column_name = 'destinataire_id'`);
  if (deja?.n) return;

  // L'ORDRE COMPTE. On rend echange_id facultatif AVANT d'ajouter la colonne
  // qui le remplace : entre les deux, une table où aucune des deux voies n'est
  // ouverte refuserait toute écriture.
  await base().query('ALTER TABLE pa_messages MODIFY echange_id BIGINT NULL');
  await base().query(
    'ALTER TABLE pa_messages ADD COLUMN destinataire_id BIGINT NULL AFTER echange_id');
  await base().query(
    'ALTER TABLE pa_messages ADD COLUMN lu TINYINT(1) NOT NULL DEFAULT 0');
  await base().query(
    `ALTER TABLE pa_messages ADD CONSTRAINT fk_pa_messages_destinataire
       FOREIGN KEY (destinataire_id) REFERENCES pa_dresseurs(id) ON DELETE CASCADE`);

  // LES MESSAGES DÉJÀ ÉCRITS SONT LUS. Les marquer non lus ferait sonner la
  // cloche pour des conversations vieilles de plusieurs mois, le jour de la
  // migration, chez tout le monde à la fois.
  await base().query('UPDATE pa_messages SET lu = 1');
  journal('schema : pa_messages accepte les messages directs');
}

async function migrerQuiPeutEcrire(journal) {
  const deja = await une(
    `SELECT COUNT(*) AS n FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'pa_dresseurs'
        AND column_name = 'messages_de'`);
  if (deja?.n) return;
  // « tous » PAR DEFAUT, comme echanges_ouverts et pour la meme raison : le
  // jour de la migration, personne ne doit voir son comportement changer sans
  // l'avoir demande. Se fermer est la decision ; rester ouvert ne l'est pas.
  await base().query(
    "ALTER TABLE pa_dresseurs ADD COLUMN messages_de VARCHAR(16) NOT NULL DEFAULT 'tous'");
  journal('schema : colonne pa_dresseurs.messages_de ajoutee');
}

async function migrerAuteurNotification(journal) {
  const deja = await une(
    `SELECT COUNT(*) AS n FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'pa_notifications'
        AND column_name = 'de_id'`);
  if (deja?.n) return;
  // DE QUI VIENT CETTE NOTIFICATION. Le titre le disait deja — « Jack t'a
  // ecrit » — mais un titre est du texte : le decouper pour en tirer un pseudo
  // casserait a la premiere reformulation. Cliquer la notification doit ouvrir
  // LA conversation, ce qui demande de savoir avec qui.
  await base().query(
    'ALTER TABLE pa_notifications ADD COLUMN de_id BIGINT NULL AFTER echange_id');
  await base().query(
    `ALTER TABLE pa_notifications ADD CONSTRAINT fk_pa_notifications_de
       FOREIGN KEY (de_id) REFERENCES pa_dresseurs(id) ON DELETE CASCADE`);
  journal('schema : colonne pa_notifications.de_id ajoutee');
}

async function migrerEspeceMessage(journal) {
  const deja = await une(
    `SELECT COUNT(*) AS n FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'pa_messages'
        AND column_name = 'espece'`);
  if (deja?.n) return;
  // UN POKEMON DANS LA CONVERSATION. C'est de cela qu'on parle ici, et jusqu'a
  // present on l'ecrivait a la main — donc sans image, sans lien vers la fiche,
  // et avec les fautes de frappe de chacun.
  //
  // On garde l'IDENTIFIANT d'espece (« mr-mime »), jamais le nom affiche : la
  // langue est un reglage de celui qui lit, et un message ecrit en francais
  // doit se lire en anglais chez qui a choisi l'anglais.
  await base().query('ALTER TABLE pa_messages ADD COLUMN espece VARCHAR(64) NULL');
  journal('schema : colonne pa_messages.espece ajoutee');
}

async function migrerMotsEnMessages(journal) {
  // LE MOT D'UNE PROPOSITION EST UN MESSAGE, et il ne l'etait pas. Il vivait
  // dans la seule colonne `pa_echanges.mot`, que la conversation ne lit pas :
  // on recevait « salut, ca t'interesse ? » avec sa notification, on ouvrait
  // les Messages, et l'on y trouvait « Aucune conversation ».
  //
  // Corriger le code ne suffit pas : les echanges DEJA proposes garderaient
  // leur mot invisible. On les rattrape une fois.
  //
  // IDEMPOTENT PAR LA REQUETE, pas par un drapeau : le NOT EXISTS ne recopie
  // que ce qui n'a pas deja sa ligne. Relancer n'ajoute rien, et un echange
  // dont on a efface le message ne le verrait pas revenir de force.
  const r = await base().query(
    `INSERT INTO pa_messages (echange_id, auteur_id, texte, lu, cree_le)
     SELECT e.id, e.demandeur_id, e.mot, 1, e.cree_le
       FROM pa_echanges e
      WHERE e.mot IS NOT NULL AND e.mot <> ''
        AND NOT EXISTS (
          SELECT 1 FROM pa_messages m
           WHERE m.echange_id = e.id AND m.texte = e.mot)`);

  // LUS, ET NON PAS NEUFS. Les marquer non lus ferait sonner la cloche pour des
  // propositions vieilles de plusieurs semaines, chez tout le monde a la fois,
  // le jour du deploiement.
  const combien = (r && r[0] && r[0].affectedRows) || 0;
  if (combien) journal(`schema : ${combien} mot(s) de proposition repris en messages`);
}

async function migrerImageMessage(journal) {
  const deja = await une(
    `SELECT COUNT(*) AS n FROM information_schema.columns
      WHERE table_schema = DATABASE() AND table_name = 'pa_messages'
        AND column_name = 'image_id'`);
  if (deja?.n) return;
  // UNE PHOTO DANS UN MESSAGE. On ne recopie pas l'image : on pointe celle qui
  // existe deja, avec sa fiche, son EXIF retire et ses droits. Une seconde
  // copie aurait sa propre visibilite, et les deux auraient diverge.
  //
  // ON DELETE SET NULL et non CASCADE : effacer une photo ne doit pas effacer
  // le message qui l'accompagnait. Les mots restent, l'image disparait.
  await base().query('ALTER TABLE pa_messages ADD COLUMN image_id BIGINT NULL');
  await base().query(
    `ALTER TABLE pa_messages ADD CONSTRAINT fk_pa_messages_image
       FOREIGN KEY (image_id) REFERENCES pa_images(id) ON DELETE SET NULL`);
  journal('schema : colonne pa_messages.image_id ajoutee');
}

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
