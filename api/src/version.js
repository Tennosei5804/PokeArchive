// Quelle révision tourne, et depuis quand.
//
// POURQUOI CE FICHIER EXISTE. Un déploiement qui n'ajoute aucune route ne
// laisse aucune trace visible de l'extérieur : le contenu des réponses change,
// les codes de statut non. On se retrouve à redémarrer le site sans pouvoir
// vérifier que le nouveau code tourne — c'est arrivé le 25 août 2026, sur un
// correctif qui rendait vingt-quatre succès à zéro. Un `curl /api/etat` doit
// répondre à cette question.
//
// ON LIT .git DIRECTEMENT, sans lancer `git`. L'hébergeur ne garantit pas le
// binaire, et lancer un processus à chaque démarrage pour sept caractères
// serait cher payé. Trois cas à couvrir :
//
//   · HEAD pointe vers une branche → « ref: refs/heads/main », qu'on suit ;
//   · la référence est un fichier libre dans .git/refs/… ;
//   · elle a été compactée dans .git/packed-refs, ce que fait `git gc` — et un
//     dépôt tiré depuis des mois y passe forcément.
//
// Rien de secret ne sort d'ici : le dépôt est public, et le numéro de commit
// l'est avec lui. On ne rend ni chemin, ni version de dépendance, ni réglage.

import fs from 'node:fs';
import path from 'node:path';

const RACINE = path.join(import.meta.dirname, '..', '..');

/** Le contenu d'un fichier, ou null s'il n'est pas là. */
function lireSiPresent(chemin) {
  try {
    return fs.readFileSync(chemin, 'utf8').trim();
  } catch {
    return null;                       // absent, illisible, dossier : pareil ici
  }
}

/** Le commit sur lequel le dossier est posé, ou null si ce n'est pas un dépôt. */
export function commitCourant(racine = RACINE) {
  const git = path.join(racine, '.git');
  const tete = lireSiPresent(path.join(git, 'HEAD'));
  if (!tete) return null;

  // Détaché : HEAD porte le commit lui-même.
  if (/^[0-9a-f]{40}$/i.test(tete)) return tete.toLowerCase();

  const m = tete.match(/^ref:\s*(.+)$/);
  if (!m) return null;
  const ref = m[1].trim();

  const libre = lireSiPresent(path.join(git, ref));
  if (libre && /^[0-9a-f]{40}$/i.test(libre)) return libre.toLowerCase();

  // Compactée : une ligne « <sha> <ref> » par référence. Les lignes qui
  // commencent par ^ portent l'objet pointé par un tag annoté, pas une
  // référence : elles ne doivent pas être confondues avec la suivante.
  const paquet = lireSiPresent(path.join(git, 'packed-refs'));
  if (paquet) {
    for (const ligne of paquet.split('\n')) {
      if (!ligne || ligne.startsWith('#') || ligne.startsWith('^')) continue;
      const [sha, nom] = ligne.trim().split(/\s+/);
      if (nom === ref && /^[0-9a-f]{40}$/i.test(sha)) return sha.toLowerCase();
    }
  }
  return null;
}

// Figé au démarrage : le commit ne change pas sous un processus qui tourne, et
// un `git pull` pendant le service ne doit surtout pas faire mentir la réponse
// en annonçant du code qui n'est pas celui qui s'exécute.
const COMMIT = commitCourant();
const DEMARRE_LE = new Date().toISOString();

/** Ce que /api/etat ajoute pour qu'un déploiement se vérifie de l'extérieur. */
export function etatVersion() {
  return {
    // Sept caractères suffisent à reconnaître un commit, et c'est la forme
    // qu'affiche `git log --oneline` — donc celle qu'on a sous les yeux.
    commit: COMMIT ? COMMIT.slice(0, 7) : null,
    demarreLe: DEMARRE_LE,
    deboutDepuis: Math.round(process.uptime()),
  };
}
