// Réglages, lus dans l'environnement.
// Node charge .env tout seul depuis la 20.6 (--env-file) : aucune dépendance.

export const config = {
  apiUrl: (process.env.API_URL || 'http://127.0.0.1:8787').replace(/\/+$/, ''),
  port: Number(process.env.PORT || 8787),
  // L'adresse d'écoute. En local, 127.0.0.1 suffit et protège : le service
  // n'est joignable que depuis la machine. Hébergé, c'est la PLATEFORME qui
  // impose l'adresse et le port, et il faut écouter exactement là — sinon le
  // service démarre sans erreur et reste injoignable, ce qui est le pire cas :
  // les journaux disent que tout va bien.
  //
  //   IP    alwaysdata
  //   HOST  la plupart des autres
  //   HOTE  pour forcer à la main
  hote: process.env.HOTE || process.env.IP || process.env.HOST || '127.0.0.1',

  base: {
    hote: process.env.DB_HOTE || '',
    port: Number(process.env.DB_PORT || 3306),
    utilisateur: process.env.DB_UTILISATEUR || '',
    motdepasse: process.env.DB_MOTDEPASSE || '',
    nom: process.env.DB_NOM || '',
    // Chiffrer la liaison avec la base. Inutile en local, exigé par la
    // plupart des hébergeurs — la base y vit sur une autre machine.
    ssl: /^(oui|1|true|yes)$/i.test(process.env.DB_SSL || ''),
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
