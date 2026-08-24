// Les pseudos qu'on refuse.
//
// Un pseudo n'est pas un texte parmi d'autres : il s'affiche dans le
// classement, dans la recherche de dresseurs, à côté du Pokédex de gens qui
// n'ont rien demandé. Il n'est pas modérable après coup — personne ne surveille
// la liste — donc le refus se fait à l'inscription.
//
// --- Le piège qu'il faut connaître avant de lire la suite -------------------
//
// Chercher bêtement une sous-chaîne refuse des prénoms réels :
//
//   Constance, Conrad, Consuelo   contiennent « con »
//   Cassandre, Assassin, Bass     contiennent « ass »
//   Calculette, Culotte           contiennent « cul »
//   Analyse                       contient « anal »
//
// C'est le problème dit de Scunthorpe, et il rend le filtre pire que rien :
// refuser « Cassandre » à quelqu'un qui s'appelle Cassandre est une insulte en
// soi. D'où DEUX listes, et c'est tout le dessin de ce fichier :
//
//   RACINES_FORTES  n'ont aucun hôte innocent. Cherchées PARTOUT, même collées
//                   à autre chose : « xXenculéXx » doit tomber.
//   RACINES_FAIBLES sont courtes et vivent dans des mots ordinaires. Cherchées
//                   en MOT ENTIER seulement : « con » tombe, « Conrad » passe.
//
// --- Ce que la normalisation rattrape ---------------------------------------
//
// Les contournements sont toujours les mêmes, et tous mécaniques :
//
//   accents      « ènculé »          → NFD, diacritiques retirés
//   chiffres     « c0nnard »         → table 0→o, 1→i, 3→e, 4→a, 5→s, 7→t…
//   séparateurs  « c.o.n.n.a.r.d »   → tout ce qui n'est pas lettre est retiré
//   répétitions  « connnnnard »      → les suites d'une même lettre repliées
//
// Les racines sont donc écrites SOUS FORME REPLIÉE — « conard » et non
// « connard » — puisque c'est à du texte replié qu'on les compare.
//
// --- Ce que ça n'attrape pas ------------------------------------------------
//
// Rien de tout ceci n'arrête quelqu'un de déterminé : il reste les fautes
// volontaires, les langues qu'on n'a pas listées, et l'insulte qui n'en est une
// que pour celui qui la reçoit. Ce filtre écarte le gros et l'évident. Il ne
// remplace pas la possibilité de renommer quelqu'un à la main, qui n'existe pas
// encore.

const LEET = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '6': 'g', '7': 't',
  '8': 'b', '9': 'g', '@': 'a', '$': 's', '€': 'e', '£': 'l', '!': 'i',
  '+': 't', '(': 'c', '<': 'c', '|': 'i',
};

/**
 * Replie tout ce qui sert à déguiser : accents, chiffres, doublons.
 *
 * L'ORDRE N'EST PAS UN DÉTAIL. Replié avant qu'on ôte les points,
 * « c.o.n.n.a.r.d » garde ses deux n — ils ne sont pas adjacents — et ne
 * rencontre jamais la racine « conard ». On ôte d'abord, on replie ensuite.
 */
function replier(mot, garderSeparateurs = false) {
  const plat = [...String(mot)]
    .map((c) => LEET[c] || c)
    .join('')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  const sansBruit = garderSeparateurs
    ? plat.replace(/[^a-z0-9]+/g, ' ')
    : plat.replace(/[^a-z0-9]/g, '');
  return sansBruit.replace(/([a-z0-9])\1+/g, '$1');
}

/**
 * Deux lectures du même pseudo.
 *
 * `colle`  tout d'un bloc, sans séparateur : c'est là qu'on cherche les
 *          racines fortes, pour que « xX_enculé_Xx » ne passe pas.
 * `mots`   découpé sur les espaces, tirets et soulignés : c'est là qu'on
 *          cherche les faibles, en exigeant le mot entier.
 */
function lectures(pseudo) {
  const brut = String(pseudo || '');
  return {
    colle: replier(brut),
    mots: replier(brut, true).split(' ').filter(Boolean),
  };
}

// Racines sans hôte innocent : cherchées partout. Écrites repliées.
const RACINES_FORTES = [
  // français
  'encule', 'enculer', 'nique', 'niquer', 'pute', 'putain', 'salope', 'salaud',
  'conard', 'conasse', 'batard', 'petasse', 'fdp', 'ntm', 'tafiole', 'pedale',
  'gouine', 'negre', 'bougnoul', 'youpin', 'raton', 'sale juif', 'sale arabe',
  'trisomique', 'mongolien', 'attarde', 'debile profond',
  'branler', 'branlette', 'chatte', 'nichon', 'testicule', 'zizi', 'penis',
  'vagin', 'sodomie', 'sodomiser', 'ejacul', 'fellation', 'pornhub',
  'suce ma', 'suce mon', 'ta mere', 'tamere', 'tesmort',
  // anglais
  'fuck', 'fucker', 'fucking', 'motherfuker', 'bitch', 'whore', 'slut',
  'cunt', 'asshole', 'bastard', 'nigger', 'nigga', 'faggot', 'retard',
  'wanker', 'cock', 'pussy', 'blowjob', 'cumshot', 'handjob', 'rapist',
  // haine
  'hitler', 'nazi', 'himmler', 'goebbels', 'kkk', 'heilhitler', '1488',
  'gazthe', 'holocaust',
];

// Courtes, avec des hôtes innocents : exigées en mot entier.
const RACINES_FAIBLES = [
  'con', 'cons', 'cul', 'culs', 'pd', 'pede', 'pedes', 'bite', 'bites',
  'couille', 'couilles', 'merde', 'merdeux', 'chier', 'chiotte', 'foutre',
  'ass', 'anal', 'dick', 'shit', 'piss', 'crap', 'tits', 'boob', 'boobs',
  'sex', 'porn', 'xxx', 'viol', 'zob', 'teub', 'keum',
];

// Des mots ordinaires qui contiennent une racine forte. Ils passent tels
// quels — la comparaison se fait sur le pseudo replié entier, donc un
// « xXscunthorpeXx » ne bénéficie pas de l'exception.
//
// « Scunthorpe » est le nom de la ville anglaise qui a donné son nom au
// problème : en 1996, un filtre l'a empêchée entière de créer des comptes.
const EXCEPTIONS = new Set(['scunthorpe', 'penistone', 'lightwater', 'assange']);

// Repliées une fois pour toutes : les comparer à du texte replié impose
// qu'elles le soient aussi, sinon « conard » ne rencontrerait jamais
// « conard » venu de « connard ».
//
// LE REPLI PEUT DÉTRUIRE UNE RACINE. « kkk » se replie en « k » : cherchée
// partout, cette lettre unique bloquait Shitake et Dickens. Toute racine
// tombée sous quatre caractères rejoint donc les faibles, où l'exigence du mot
// entier la rend inoffensive — et « kkk » seul y est toujours refusé.
const SEUIL_FORTE = 4;

const repliees = RACINES_FORTES.map((r) => replier(r));
const FORTES = repliees.filter((r) => r.length >= SEUIL_FORTE);
const FAIBLES = new Set([
  ...RACINES_FAIBLES.map((r) => replier(r)),
  ...repliees.filter((r) => r && r.length < SEUIL_FORTE),
]);

/**
 * Le pseudo est-il refusé ?
 *
 * Rend la racine trouvée — utile pour les tests et le journal — ou null. On ne
 * la renvoie JAMAIS à l'utilisateur : lui dire quel mot a déclenché le refus,
 * c'est lui apprendre exactement quoi contourner.
 */
export function motInterdit(pseudo) {
  const { colle, mots } = lectures(pseudo);
  if (!colle) return null;
  if (EXCEPTIONS.has(colle)) return null;

  for (const racine of FORTES) {
    if (colle.includes(racine)) return racine;
  }
  for (const mot of mots) {
    if (FAIBLES.has(mot)) return mot;
  }
  return null;
}

export const estInterdit = (pseudo) => motInterdit(pseudo) !== null;
