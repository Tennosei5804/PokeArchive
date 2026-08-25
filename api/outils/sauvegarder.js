// Sauvegarde de la base, en JSON.
//
//   node outils/sauvegarder.js            → écrit dans ../sauvegardes/
//   node outils/sauvegarder.js --ou /tmp  → ailleurs
//
// Les collections des dresseurs vivent maintenant sur un serveur, et un
// serveur n'est pas un endroit sûr : une commande SQL de trop, un hébergeur
// qui ferme, une base corrompue, et des mois de cochage disparaissent. Rien
// dans le service ne protégeait de ça.
//
// Pourquoi pas mysqldump : il n'est pas garanti présent chez l'hébergeur, sa
// sortie dépend de sa version, et il faudrait lui passer le mot de passe en
// ligne de commande — donc dans la liste des processus, visible de quiconque
// est sur la machine. On se sert du pool que le service utilise déjà, avec les
// mêmes variables d'environnement.
//
// Le JSON plutôt que le SQL : il se relit sans MySQL, se compare d'une
// sauvegarde à l'autre, et se restaure par un petit script. Une sauvegarde
// qu'on ne sait pas relire n'en est pas une.
//
// À planifier chez l'hébergeur — le SSH interdit les processus qui durent, les
// tâches planifiées sont faites pour ça. Voir le LISEZMOI.

import fs from 'node:fs/promises';
import path from 'node:path';
import { lire, description } from '../src/base.js';
import { config } from '../src/config.js';

// L'ordre compte pour une restauration : les dresseurs avant ce qui les
// référence, sans quoi les clés étrangères refusent la réinsertion.
const TABLES = ['pa_dresseurs', 'pa_profils', 'pa_dex', 'pa_historique'];

// pa_sessions est délibérément absente. Ce sont des jetons de connexion, ils
// expirent seuls, et les restaurer reconnecterait des gens à leur insu — sans
// compter qu'une sauvegarde qui contient des jetons vivants est un secret de
// plus à garder.

// Combien de sauvegardes on garde. Au-delà, la plus ancienne s'en va : un
// quota de 100 Mo se remplit vite, et une sauvegarde qui remplit le disque
// fait tomber le service qu'elle devait protéger.
const A_GARDER = 14;

const horodatage = () =>
  new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);

async function main() {
  const i = process.argv.indexOf('--ou');
  const dossier = i > -1 && process.argv[i + 1]
    ? process.argv[i + 1]
    : path.join(import.meta.dirname, '..', 'sauvegardes');

  await fs.mkdir(dossier, { recursive: true });

  const contenu = { faiteLe: new Date().toISOString(), base: description(), tables: {} };
  let total = 0;

  for (const table of TABLES) {
    const lignes = await lire(`SELECT * FROM ${table}`);
    contenu.tables[table] = lignes;
    total += lignes.length;
    console.log(`  ${table.padEnd(16)} ${String(lignes.length).padStart(6)} ligne(s)`);
  }

  const fichier = path.join(dossier, `pokearchive-${horodatage()}.json`);
  await fs.writeFile(fichier, JSON.stringify(contenu), 'utf8');
  const { size } = await fs.stat(fichier);

  console.log(`\n${total} ligne(s) → ${fichier} (${(size / 1024).toFixed(0)} Ko)`);

  // Le ménage vient APRÈS l'écriture réussie : échouer à sauvegarder puis
  // supprimer l'ancienne serait le pire des deux mondes.
  const anciennes = (await fs.readdir(dossier))
    .filter((f) => f.startsWith('pokearchive-') && f.endsWith('.json'))
    .sort();
  const aJeter = anciennes.slice(0, Math.max(0, anciennes.length - A_GARDER));
  for (const f of aJeter) {
    await fs.unlink(path.join(dossier, f));
    console.log(`  jetée : ${f}`);
  }
  console.log(`${anciennes.length - aJeter.length} sauvegarde(s) conservée(s).`);
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    // Le code de sortie compte : une tâche planifiée qui échoue en silence
    // laisse croire qu'on est sauvegardé alors qu'on ne l'est plus.
    console.error(`Échec de la sauvegarde : ${e.message}`);
    // Diagnostiquer ne suffit pas : la premiere fois qu'on lance ce script,
    // c'est justement qu'on ne sait pas encore comment il attend d'etre lance.
    if (!config.base.hote) {
      console.error('');
      console.error("DB_HOTE est vide : les variables d'environnement ne sont pas là.");
      console.error("Ni SSH ni une tâche planifiée n'hérite de celles du site.");
      console.error('');
      console.error("  À la main   cd ~/PokeArchive/api \\");
      console.error("              && node --env-file=.env outils/sauvegarder.js");
      console.error("              (un .env à côté de .env.exemple, portant les DB_*)");
      console.error("");
      console.error("  Planifiée   alwaysdata : Avancé → Tâches planifiées,");
      console.error("              en redonnant les DB_* dans l'environnement de la tâche.");
      console.error('');
    }
    process.exit(1);
  });
