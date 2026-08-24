// API PokéArchive.
//
//   npm start   → http://127.0.0.1:8787
//
// Aucune page web : ce service ne sert que l'application. Il détient le mot de
// passe MySQL, mène la connexion Discord, et distribue aux joueurs des jetons
// de session qui ne valent que pour leur propre compte.

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

import express from 'express';
import helmet from 'helmet';

import { config, verifierConfig } from './config.js';
import { creerSchema, description } from './base.js';
import * as comptes from './comptes.js';
import * as discord from './discord.js';

const journal = (m) => console.log(`${new Date().toLocaleTimeString('fr-FR')}  ${m}`);

// L'application écoute sur l'un de ces ports pour recevoir sa session. Valider
// cette plage n'est pas une formalité : sans elle, un lien forgé ferait
// rediriger un jeton vers n'importe quel service tournant sur la machine du
// joueur.
const PORT_APP_MIN = 8730;
const PORT_APP_MAX = 8749;

const portApp = (v) => {
  const n = Number(v);
  return Number.isInteger(n) && n >= PORT_APP_MIN && n <= PORT_APP_MAX ? String(n) : '';
};

const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(express.json({ limit: '2mb' }));

// --- Connexion Discord ------------------------------------------------------
//
// Le jeton ne voyage PLUS dans l'adresse de retour. C'est le point important :
// l'application est distribuée, donc son code est public, et une adresse de
// redirection se retrouve dans l'historique du navigateur, dans les journaux,
// et sous les yeux de tout ce qui écoute la boucle locale. Un jeton qui y
// passe est un jeton qu'on peut ramasser.
//
// À la place, un échange en deux temps, sur le principe de PKCE :
//   1. l'application tire au sort un « vérifieur » qu'elle garde en mémoire,
//      et n'envoie que son empreinte SHA-256, le « défi » ;
//   2. après Discord, l'API renvoie sur la boucle locale un simple code
//      d'échange, à usage unique et valable deux minutes ;
//   3. l'application présente ce code AVEC son vérifieur, en POST, et reçoit
//      le jeton dans le corps de la réponse.
//
// Qui intercepte l'adresse de retour n'obtient donc qu'un code inutilisable :
// il lui manque le vérifieur, qui n'a jamais quitté la mémoire de l'app.
//
// Un « nonce » distinct fait le chemin inverse : l'API le réémet tel quel vers
// la boucle locale, et l'application refuse tout retour qui ne le porte pas.
// Sans lui, n'importe quel programme de la machine pourrait appeler l'écoute
// locale et lui faire adopter une session choisie par l'attaquant.
const etats = new Map();
const echanges = new Map();

const ECHANGE_VALIDITE = 120_000;   // deux minutes suffisent à un aller-retour

// Un état ou un code oublié doit disparaître : sinon la mémoire enfle
// indéfiniment sur un service qui tourne des mois.
setInterval(() => {
  const limiteEtats = Date.now() - 600_000;
  for (const [k, v] of etats) if (v.ne < limiteEtats) etats.delete(k);
  const limiteCodes = Date.now() - ECHANGE_VALIDITE;
  for (const [k, v] of echanges) if (v.ne < limiteCodes) echanges.delete(k);
}, 60_000).unref();

const empreinte = (v) => createHash('sha256').update(v, 'utf8').digest('base64url');

// Une chaîne opaque venue du client : on borne sa taille et son alphabet avant
// de la garder, plutôt que de stocker n'importe quoi en mémoire.
const opaque = (v, max = 128) => {
  const s = String(v || '');
  return /^[A-Za-z0-9_-]{16,}$/.test(s) && s.length <= max ? s : '';
};

app.get('/auth/discord', (req, res) => {
  if (!discord.actif()) return res.status(503).type('txt').send('Discord non configuré.');
  const etat = discord.nouvelEtat();
  etats.set(etat, {
    port: portApp(req.query.app),
    defi: opaque(req.query.defi),      // empreinte du vérifieur, jamais le vérifieur
    nonce: opaque(req.query.nonce),
    ne: Date.now(),
  });
  res.redirect(302, discord.urlDepart(etat));
});

/**
 * Deuxième temps de l'échange : le code contre le jeton.
 *
 * Le code seul ne suffit pas — il faut présenter le vérifieur dont l'empreinte
 * avait été annoncée au départ. C'est ce qui rend inoffensive l'interception de
 * l'adresse de retour.
 *
 * Le code est consommé quoi qu'il arrive : un vérifieur faux ne donne pas droit
 * à un second essai, sinon on pourrait le deviner à force de tentatives.
 */
app.post('/auth/echange', (req, res) => {
  const code = opaque(req.body?.code);
  const verifieur = opaque(req.body?.verifieur);
  const attendu = code ? echanges.get(code) : null;
  if (code) echanges.delete(code);

  if (!attendu || Date.now() - attendu.ne > ECHANGE_VALIDITE) {
    return res.status(400).json({ erreur: "Code d'échange inconnu ou expiré." });
  }
  if (!verifieur) {
    return res.status(400).json({ erreur: 'Vérifieur manquant.' });
  }

  // Comparaison à temps constant : comparer deux empreintes avec « === » laisse
  // fuir, par la durée, le nombre de caractères devinés justes.
  const attenduBuf = Buffer.from(attendu.defi);
  const fourniBuf = Buffer.from(empreinte(verifieur));
  const bon = attenduBuf.length === fourniBuf.length
    && timingSafeEqual(attenduBuf, fourniBuf);
  if (!bon) {
    journal('échange refusé : vérifieur invalide');
    return res.status(403).json({ erreur: 'Vérifieur invalide.' });
  }

  res.json({ jeton: attendu.jeton, pseudo: attendu.pseudo });
});

app.get('/auth/discord/retour', async (req, res) => {
  const attendu = etats.get(String(req.query.state || ''));
  etats.delete(String(req.query.state || ''));
  const port = attendu?.port || '';

  const fin = (params) => port
    ? res.redirect(302, `http://127.0.0.1:${port}/retour?${params}`)
    : res.type('html').send(page(params.startsWith('erreur')
      ? ['✕', 'Connexion impossible', 'Relance la connexion depuis PokéArchive.']
      : ['✓', 'Connecté', 'Tu peux fermer cet onglet.']));

  // Le joueur a refusé l'autorisation : ce n'est pas une panne.
  if (req.query.error) return fin('erreur=refus');

  // Anti-CSRF : un état inconnu, c'est une connexion que nous n'avons pas
  // lancée. Sans cette vérification, un site tiers pourrait la déclencher.
  if (!req.query.code || !attendu) return fin('erreur=etat');

  let profil;
  try {
    profil = await discord.identite(String(req.query.code));
  } catch (e) {
    journal(`discord : ${e.message}`);
    return fin('erreur=discord');
  }

  const { dresseur, jeton, nouveau } = await comptes.depuisDiscord(profil);
  journal(`${nouveau ? 'inscription' : 'connexion'} : ${dresseur.pseudo}`);

  if (!port) {
    return res.type('html').send(page(['✓', `Bonjour ${dresseur.pseudo}`,
      "Aucune application n'attendait cette connexion. Relance-la depuis PokéArchive."]));
  }

  // Sans défi annoncé au départ, l'application est trop ancienne pour l'échange
  // en deux temps. On refuse plutôt que de retomber sur l'envoi du jeton dans
  // l'adresse : ce serait garder ouverte la faille qu'on vient de fermer.
  if (!attendu.defi) {
    journal('connexion refusée : application sans défi PKCE (version trop ancienne)');
    return fin('erreur=obsolete');
  }

  const codeEchange = randomBytes(32).toString('base64url');
  echanges.set(codeEchange, {
    jeton, pseudo: dresseur.pseudo, defi: attendu.defi, ne: Date.now(),
  });

  // Ni jeton ni pseudo dans l'adresse : seulement un code sans valeur propre,
  // et le nonce que l'application reconnaîtra comme le sien.
  fin(`code=${encodeURIComponent(codeEchange)}`
    + `&nonce=${encodeURIComponent(attendu.nonce || '')}`);
});

const page = ([icone, titre, texte]) => `<!DOCTYPE html><html lang="fr"><head>
<meta charset="utf-8"><title>PokéArchive</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e0f14;color:#e8e9f0;
     font-family:"Segoe UI",system-ui,sans-serif;text-align:center;padding:24px}
.r{width:56px;height:56px;border-radius:50%;background:#1d3b2b;display:grid;place-items:center;
   font-size:27px;margin:0 auto 18px}
h1{font-size:21px;margin:0 0 8px}p{color:#a0a4b4;margin:0;line-height:1.6}
</style></head><body><div><div class="r">${icone}</div><h1>${titre}</h1><p>${texte}</p></div></body></html>`;

// --- API --------------------------------------------------------------------
// L'application présente son jeton dans un en-tête Authorization.
async function exiger(req, res) {
  const e = req.get('Authorization') || '';
  const dresseur = e.startsWith('Bearer ') ? await comptes.session(e.slice(7).trim()) : null;
  if (!dresseur) { res.status(401).json({ erreur: 'Non connecté.' }); return null; }
  return dresseur;
}

const route = (fn) => async (req, res) => {
  try { await fn(req, res); } catch (e) {
    if (e instanceof comptes.ErreurCompte) return res.status(e.code).json({ erreur: e.message });
    journal(`erreur sur ${req.path} : ${e.stack || e}`);
    res.status(500).json({ erreur: 'Erreur de notre côté.' });
  }
};

app.get('/api/moi', route(async (req, res) => {
  const d = await exiger(req, res); if (!d) return;
  const dex = await comptes.lireDex(d.id);
  res.json({ dresseur: d, resume: dex
    ? { captures: (dex.captures || []).length, shiny: (dex.shiny || []).length, majLe: dex.majLe }
    : { captures: 0, shiny: 0, majLe: null } });
}));

// --- Les aventures ----------------------------------------------------------
// Un compte, plusieurs profils. Le profil visé se donne en paramètre ; sans
// lui, c'est l'aventure par défaut du dresseur qui répond.
const profilDemande = (req) => {
  const v = req.query.profil ?? req.body?.profil;
  const n = Number(v);
  return Number.isInteger(n) && n > 0 ? n : null;
};

app.get('/api/profils', route(async (req, res) => {
  const d = await exiger(req, res); if (!d) return;
  res.json({ profils: await comptes.listerProfils(d.id) });
}));

app.post('/api/profils', route(async (req, res) => {
  const d = await exiger(req, res); if (!d) return;
  res.status(201).json({ ok: true,
    profil: await comptes.creerProfil(d.id, req.body?.nom, req.body?.mode) });
}));

app.patch('/api/profils/:id', route(async (req, res) => {
  const d = await exiger(req, res); if (!d) return;
  const profil = await comptes.modifierProfil(d.id, Number(req.params.id), {
    nom: req.body?.nom,
    public: req.body?.public,
    parDefaut: req.body?.parDefaut,
    mode: req.body?.mode,
    niveauFormes: req.body?.niveauFormes,
  });
  res.json({ ok: true, profil });
}));

// Le journal d'une aventure. La pagination se fait par curseur : « avant »
// est l'identifiant de la dernière ligne déjà reçue.
app.get('/api/profils/:id/historique', route(async (req, res) => {
  const d = await exiger(req, res); if (!d) return;
  res.json(await comptes.historique(
    d.id, Number(req.params.id), req.query.avant, req.query.limite));
}));

app.delete('/api/profils/:id', route(async (req, res) => {
  const d = await exiger(req, res); if (!d) return;
  res.json({ ok: true, ...await comptes.supprimerProfil(d.id, Number(req.params.id)) });
}));

app.get('/api/dex', route(async (req, res) => {
  const d = await exiger(req, res); if (!d) return;
  const dex = await comptes.lireDex(d.id, profilDemande(req));
  if (!dex) return res.status(404).json({ erreur: 'Aucun dex en ligne.' });
  res.json(dex);
}));

app.post('/api/dex', route(async (req, res) => {
  const d = await exiger(req, res); if (!d) return;
  // Le profil voyage à côté du dex, pas dedans : le corps est la sauvegarde
  // telle quelle, et on ne veut rien y injecter.
  res.json({ ok: true, ...await comptes.ecrireDex(d.id, req.body, profilDemande(req)) });
}));

app.post('/api/pseudo', route(async (req, res) => {
  const d = await exiger(req, res); if (!d) return;
  res.json({ ok: true, pseudo: await comptes.changerPseudo(d.id, req.body?.pseudo) });
}));

// Le partage : le classement, ou une recherche par pseudo.
app.get('/api/dresseurs', route(async (req, res) => {
  const d = await exiger(req, res); if (!d) return;
  const q = String(req.query.q || '').trim();
  if (q) return res.json({ dresseurs: await comptes.chercherDresseurs(q) });
  res.json({ dresseurs: await comptes.classement() });
}));

// Les aventures publiques d'un dresseur.
app.get('/api/dresseurs/:pseudo/profils', route(async (req, res) => {
  const d = await exiger(req, res); if (!d) return;
  const chez = await comptes.profilsPublics(req.params.pseudo);
  if (!chez) return res.status(404).json({ erreur: 'Dresseur inconnu.' });
  res.json(chez);
}));

// Le dex d'un pote, pour la comparaison. Sans profil précisé, son aventure
// principale ; jamais une aventure privée.
app.get('/api/dex/:pseudo', route(async (req, res) => {
  const d = await exiger(req, res); if (!d) return;
  const autre = await comptes.dexDe(req.params.pseudo, profilDemande(req));
  if (!autre) return res.status(404).json({ erreur: 'Dresseur inconnu.' });
  res.json(autre);
}));

app.post('/api/deconnexion', route(async (req, res) => {
  const e = req.get('Authorization') || '';
  if (e.startsWith('Bearer ')) await comptes.deconnecter(e.slice(7).trim());
  res.json({ ok: true });
}));

app.get('/api/etat', (req, res) => res.json({ service: 'pokearchive', discord: discord.actif() }));

app.use((req, res) => res.status(404).json({ erreur: 'Route inconnue.' }));

// --- Démarrage --------------------------------------------------------------
const manques = verifierConfig();
if (manques.length) {
  journal(`Erreur : réglages manquants dans .env → ${manques.join(', ')}`);
  journal('Copie .env.exemple en .env et remplis-le.');
  process.exit(1);
}

try {
  await creerSchema(journal);
  const purgees = await comptes.menage();
  if (purgees) journal(`ménage : ${purgees} session(s) expirée(s)`);
} catch (e) {
  journal(`Erreur : base inaccessible (${e.message})`);
  process.exit(1);
}

journal(`base    : ${description()}`);
journal(`discord : ${discord.actif() ? config.discord.clientId : 'NON CONFIGURÉ'}`);
journal(`dresseurs : ${await comptes.nombreDresseurs()}`);
app.listen(config.port, config.hote, () =>
  journal(`api     : http://${config.hote}:${config.port}  (retour Discord vers ${config.discord.retour})`));
