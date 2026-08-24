// Réglages, lus dans l'environnement.
// Node charge .env tout seul depuis la 20.6 (--env-file) : aucune dépendance.

export const config = {
  apiUrl: (process.env.API_URL || 'http://127.0.0.1:8787').replace(/\/+$/, ''),
  port: Number(process.env.PORT || 8787),
  hote: process.env.HOTE || '127.0.0.1',

  base: {
    hote: process.env.DB_HOTE || '',
    port: Number(process.env.DB_PORT || 3306),
    utilisateur: process.env.DB_UTILISATEUR || '',
    motdepasse: process.env.DB_MOTDEPASSE || '',
    nom: process.env.DB_NOM || '',
  },

  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    secret: process.env.DISCORD_SECRET || '',
    retour: process.env.DISCORD_RETOUR
      || `${(process.env.API_URL || 'http://127.0.0.1:8787').replace(/\/+$/, '')}/auth/discord/retour`,
  },
};

export function verifierConfig() {
  const manques = [];
  for (const [nom, valeur] of [
    ['DB_HOTE', config.base.hote],
    ['DB_UTILISATEUR', config.base.utilisateur],
    ['DB_NOM', config.base.nom],
    ['DISCORD_CLIENT_ID', config.discord.clientId],
    ['DISCORD_SECRET', config.discord.secret],
  ]) if (!valeur) manques.push(nom);
  return manques;
}
