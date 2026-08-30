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
// --- La troisième lecture : la phonétique ------------------------------------
//
// Un signalement a montré le trou : « sinjenkuleur ». C'est « singe en couleur »
// écrit comme il se prononce, et AUCUNE des deux listes ne pouvait l'attraper —
// elles comparent des lettres, et il n'y a pas une lettre en commun sur la
// moitié du mot.
//
// D'où PHONETIQUES, cherchée dans un troisième espace où « c » devant o vaut
// « k », « ge » vaut « je », « ou » vaut « u », « ph » vaut « f ». Les deux
// écritures s'y rejoignent :
//
//   « singe en couleur »  → sinjenkuleur
//   « sinjenkuleur »      → sinjenkuleur
//   « sinj en kouleur »   → sinjenkuleur
//
// ELLE NE PORTE QUE DES EXPRESSIONS LONGUES, et c'est la précaution qui la rend
// utilisable. Replier « nique » en phonétique donne « nik » : cherché partout,
// il refuserait Nikita, Nikolas et Dominik. Huit caractères repliés au minimum,
// donc — à cette longueur, une collision avec un nom réel devient improbable.
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
function replier(mot, garderSeparateurs = false, replierDoublons = true) {
  const plat = [...String(mot)]
    .map((c) => LEET[c] || c)
    .join('')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  const sansBruit = garderSeparateurs
    ? plat.replace(/[^a-z0-9]+/g, ' ')
    : plat.replace(/[^a-z0-9]/g, '');
  return replierDoublons ? sansBruit.replace(/([a-z0-9])\1+/g, '$1') : sansBruit;
}

/**
 * Le même texte, écrit comme il se prononce.
 *
 * S'APPLIQUE À DU TEXTE DÉJÀ REPLIÉ : accents ôtés, chiffres traduits, doublons
 * repliés. On ne refait pas ce travail, on le prolonge.
 *
 * L'ORDRE DES RÈGLES COMPTE. « eau » doit tomber avant « au », sinon « eau »
 * devient « eo ». Et « c » devant e ou i vaut « s » — Cécile — alors qu'ailleurs
 * il vaut « k » — couleur ; tester le cas particulier d'abord.
 */
function phonetique(plat) {
  return String(plat || '')
    .replace(/ph/g, 'f')
    .replace(/qu/g, 'k')
    .replace(/c([eiy])/g, 's$1')
    .replace(/c/g, 'k')
    .replace(/g([eiy])/g, 'j$1')
    .replace(/eau/g, 'o')
    .replace(/au/g, 'o')
    .replace(/ou/g, 'u')
    // La regle d'ecole : m devant m, b, p. « chanbre » et « chambre » se
    // prononcent pareil, ils doivent s'ecrire pareil ici.
    .replace(/n([bp])/g, 'm$1')
    .replace(/[ae]i/g, 'e')
    .replace(/y/g, 'i')
    .replace(/h/g, '')
    .replace(/z/g, 's')
    .replace(/w/g, 'v')
    // Les doublons que les substitutions viennent de créer : « ss » sorti de
    // « c » puis « s », par exemple.
    .replace(/([a-z0-9])\1+/g, '$1');
}

/**
 * Deux lectures du même pseudo.
 *
 * `colle`  tout d'un bloc, sans séparateur : c'est là qu'on cherche les
 *          racines fortes, pour que « xX_enculé_Xx » ne passe pas.
 * `mots`   découpé sur les espaces, tirets et soulignés : c'est là qu'on
 *          cherche les faibles, en exigeant le mot entier.
 * `entier` comme `colle`, mais DOUBLONS INTACTS. Ne sert qu'aux racines que le
 *          repli detruit — voir LITTERALES.
 * `espace` les mots separes par un espace unique. Pour les textes qu'on ecrit,
 *          ou recoller les mots fabriquerait des racines fortuites.
 */
function lectures(pseudo) {
  const brut = String(pseudo || '');
  return {
    colle: replier(brut),
    mots: replier(brut, true).split(' ').filter(Boolean),
    entier: replier(brut, false, false),
    espace: replier(brut, true),
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

// Les expressions qu'on n'attrape qu'à l'oreille.
//
// TENUE COURTE ET À LA MAIN. Chacune est une injure dont l'écriture phonétique
// circule ; les ajouter au fil des signalements est le fonctionnement prévu, et
// le code n'a pas à bouger pour cela. On n'y met QUE des expressions d'au moins
// huit caractères une fois repliées — voir le seuil plus bas, qui écarte celles
// qui deviendraient trop courtes pour être cherchées sans risque.
const RACINES_PHONETIQUES = [
  'singe en couleur',
  'sale singe',
  'retourne dans ton pays',
  'mort aux juifs',
  'chambre a gaz',
];

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

// Huit caracteres : en dessous, une expression phonetique rencontre des noms
// reels. Celles qui n'y arrivent pas sont ecartees plutot que cherchees quand
// meme — un filtre qui refuse Nikita ne vaut pas mieux que pas de filtre.
const SEUIL_PHONETIQUE = 8;
const PHONETIQUES = RACINES_PHONETIQUES
  .map((r) => phonetique(replier(r)))
  .filter((r) => r.length >= SEUIL_PHONETIQUE);
const FORTES = repliees.filter((r) => r.length >= SEUIL_FORTE);

// QUAND LE REPLI NE LAISSE QU'UNE LETTRE.
//
// « xxx » se replie en « x », « kkk » en « k ». Les verser aux faibles ne
// suffisait pas : l'exigence du mot entier protege « Dickens », pas « Team X »
// ni « Sacha x Ondine », ou la lettre EST le mot. Mesure faite, les deux
// etaient refuses.
//
// Ces racines-la se cherchent donc dans `entier`, la lecture ou les doublons
// survivent, et sous leur forme non repliee : « xxx » y retrouve « xxx ».
const LITTERALES = [...RACINES_FORTES, ...RACINES_FAIBLES]
  .filter((r) => replier(r).length < 2)
  .map((r) => replier(r, false, false));

const FAIBLES = new Set(
  [
    ...RACINES_FAIBLES.map((r) => replier(r)),
    ...repliees.filter((r) => r && r.length < SEUIL_FORTE),
  ].filter((r) => r.length > 1),
);

// Ordinaires dans une phrase, douteuses dans un nom choisi.
//
// UN PSEUDO SE CHOISIT, UNE PHRASE SE PARLE, et la même racine ne pèse pas
// pareil des deux côtés. « Raton » comme pseudo est un choix ; « raton laveur »
// dans un message est un animal — et l'on parle ici de Pokémon, alors il
// viendra. Mesure faite sur vingt messages d'échange plausibles, ces trois-là
// étaient les seules à refuser du français ordinaire :
//
//   raton    « mon raton laveur préféré, c'est Linéon »
//   batard   « j'ai un bâtard de Caninos » — et le pain du même nom
//   chatte   « ma chatte a eu des petits », dans une application où un Pokémon
//            chat s'appelle Miaouss
//
// Refuser un pseudo coûte un second essai à celui qui le choisit. Refuser une
// phrase ordinaire coupe la parole à quelqu'un qui n'a rien fait, et il ne
// saura pas quel mot reprendre puisqu'on ne le lui dit pas. Le coût n'est pas
// le même, donc la liste ne l'est pas non plus.
//
// CE QUE ÇA LAISSE PASSER, ET C'EST ASSUMÉ : « sale raton » dans un message.
// L'outil pour ça n'est pas une liste de mots, c'est de pouvoir bloquer la
// personne — et il n'existe pas encore.
const AMBIGUES_EN_PHRASE = new Set(['raton', 'batard', 'chatte'].map((r) => replier(r)));

/**
 * Le pseudo est-il refusé ?
 *
 * Rend la racine trouvée — utile pour les tests et le journal — ou null. On ne
 * la renvoie JAMAIS à l'utilisateur : lui dire quel mot a déclenché le refus,
 * c'est lui apprendre exactement quoi contourner.
 */
export function motInterdit(pseudo, { ignorer = null, coller = true } = {}) {
  const passe = (r) => (ignorer ? ignorer.has(r) : false);
  const { colle, mots, entier, espace } = lectures(pseudo);
  if (!colle) return null;
  if (EXCEPTIONS.has(colle)) return null;

  // LE COLLAGE FABRIQUE DES INSULTES QUE PERSONNE N'A ECRITES. « bâtard de »
  // colle donne « batarde », qui contient « atarde » — la racine d'« attardé ».
  // Mesure faite sur une phrase aussi banale que « le pain bâtard de la
  // boulangerie ».
  //
  // Pour un PSEUDO le collage reste indispensable : « xX_enculé_Xx » n'existe
  // que separe, et c'est tout l'interet de la lecture collee. Pour une PHRASE
  // les mots sont deja separes par de vrais espaces, et les recoller ne cherche
  // plus ce que quelqu'un a ecrit — cela cherche ce que le hasard compose.
  //
  // Les racines en deux mots — « ta mere », « sale juif » — portent leur espace
  // et se retrouvent telles quelles dans le texte espace.
  const ou = coller ? colle : espace;
  for (const racine of FORTES) {
    if (!passe(racine) && ou.includes(racine)) return racine;
  }
  for (const mot of mots) {
    if (!passe(mot) && FAIBLES.has(mot)) return mot;
  }
  for (const racine of LITTERALES) {
    if (entier.includes(racine)) return racine;
  }

  // En dernier, parce que c'est la lecture la plus large : on ne l'atteint que
  // si les deux autres n'ont rien trouvé.
  const sonne = phonetique(colle);
  for (const racine of PHONETIQUES) {
    if (sonne.includes(racine)) return racine;
  }
  return null;
}

export const estInterdit = (pseudo) => motInterdit(pseudo) !== null;

/**
 * La même question, posée d'un texte qu'on écrit plutôt que d'un nom qu'on se
 * donne. Voir AMBIGUES_EN_PHRASE pour ce qui les sépare, et pourquoi.
 */
export const injurieuxDansPhrase = (texte) =>
  motInterdit(texte, { ignorer: AMBIGUES_EN_PHRASE, coller: false }) !== null;
