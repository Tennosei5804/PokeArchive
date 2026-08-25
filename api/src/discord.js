// Connexion par Discord (OAuth2).
//
// Le mot de passe Discord ne passe jamais par ici, et l'API n'en stocke aucun.

import { randomBytes } from 'node:crypto';
import { config } from './config.js';

const AUTORISATION = 'https://discord.com/oauth2/authorize';
const JETON = 'https://discord.com/api/oauth2/token';
const MOI = 'https://discord.com/api/users/@me';

// On ne demande que l'identité : ni les messages, ni les serveurs, ni l'e-mail.
// Moins on en demande, moins on en garde, et moins on a à protéger.
const PORTEE = 'identify';

// Cet en-tête n'est pas décoratif. L'API Discord est derrière Cloudflare, qui
// rejette les clients sans User-Agent identifiable par un 403 au corps vide
// (« error code: 1010 ») — une réponse qui ne ressemble en rien à une erreur
// d'authentification, et qui fait chercher au mauvais endroit.
const AGENT = 'PokeArchive/0.1 (application de bureau)';

const DELAI = 15_000;

export class ErreurDiscord extends Error {}

export const actif = () => Boolean(config.discord.clientId && config.discord.secret);

export const nouvelEtat = () => randomBytes(24).toString('base64url');

export function urlDepart(etat) {
  return `${AUTORISATION}?${new URLSearchParams({
    client_id: config.discord.clientId,
    redirect_uri: config.discord.retour,
    response_type: 'code',
    scope: PORTEE,
    state: etat,
    // Redemande l'accord à chaque fois : sur un ordinateur partagé, on ne veut
    // pas rouvrir en silence le dernier compte utilisé.
    prompt: 'consent',
  })}`;
}

export async function identite(code) {
  const identifiants = Buffer
    .from(`${config.discord.clientId}:${config.discord.secret}`).toString('base64');

  const jeton = await appeler(JETON, "l'échange du code", {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${identifiants}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.discord.retour,
    }),
  });
  if (!jeton.access_token) throw new ErreurDiscord("Discord n'a pas renvoyé de jeton.");

  const profil = await appeler(MOI, 'la lecture du profil', {
    headers: { Authorization: `Bearer ${jeton.access_token}` },
  });
  if (!profil.id) throw new ErreurDiscord("Discord n'a pas renvoyé d'identifiant.");

  return {
    id: String(profil.id),
    // global_name est le nom affiché moderne ; username reste le repli.
    pseudo: profil.global_name || profil.username || '',
    // Le nom affiché sur Discord — « Tennôsei », et non le pseudo technique
    // « tennosei5804 ». C'est celui sous lequel les gens se reconnaissent,
    // et donc celui qui sert à retrouver quelqu'un qui s'est renommé ici.
    //
    // Il PEUT changer, contrairement au pseudo : on le rafraîchit donc à
    // chaque connexion. Le repli sur username couvre les comptes qui n'ont
    // pas de nom affiché.
    //
    // Gardé à part du champ « pseudo » ci-dessus, qui a la même valeur mais
    // un autre rôle : celui-là n'est qu'une suggestion à l'inscription, et
    // n'est plus jamais relu ensuite.
    nomDiscord: profil.global_name || profil.username || '',
    avatar: profil.avatar || '',
  };
}

async function appeler(url, quoi, options) {
  let reponse;
  try {
    reponse = await fetch(url, {
      ...options,
      headers: { ...options.headers, 'User-Agent': AGENT, Accept: 'application/json' },
      signal: AbortSignal.timeout(DELAI),
    });
  } catch (e) {
    console.error(`discord : injoignable sur ${quoi} (${e.message})`);
    throw new ErreurDiscord('Impossible de joindre Discord.');
  }

  if (!reponse.ok) {
    // On journalise le corps brut quand Discord n'explique rien : c'est
    // exactement le cas où l'on a besoin de savoir ce qu'il a répondu.
    const brut = (await reponse.text().catch(() => '')).slice(0, 200).trim();
    let detail = '';
    try { detail = JSON.parse(brut).error_description || ''; } catch { /* pas du JSON */ }
    console.error(`discord : échec sur ${quoi} (${reponse.status}) ${detail || brut}`);
    throw new ErreurDiscord(reponse.status === 400 || reponse.status === 401
      ? 'Discord a refusé cette connexion. Le lien a peut-être expiré.'
      : "Discord n'a pas répondu correctement.");
  }
  return await reponse.json();
}

export function urlAvatar(discordId, avatar, taille = 128) {
  if (avatar) {
    const ext = avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${discordId}/${avatar}.${ext}?size=${taille}`;
  }
  let n = 0;
  try { n = Number((BigInt(discordId) >> 22n) % 6n); } catch { n = 0; }
  return `https://cdn.discordapp.com/embed/avatars/${n}.png`;
}
