// Les mises à jour de l'application.
//
// Script classique comme les autres, chargé après confirmer.js — il se sert de
// ses dialogues plutôt que d'en inventer un.
//
// Le principe : au lancement, l'application demande à GitHub s'il existe une
// version plus récente. Le fichier interrogé est publié avec la Release et dit
// trois choses — le numéro de version, l'adresse de l'installeur, et sa
// signature. Le plugin refuse tout ce qui n'est pas signé avec notre clé : sans
// cela, qui peut intercepter le téléchargement peut livrer son propre programme.
//
// Ce qu'on ne fait PAS : installer sans demander. Une application qui se met à
// jour dans le dos de son utilisateur redémarre au mauvais moment, et il n'y a
// aucune urgence à corriger un Pokédex.

const MAJ_ATTENTE_AU_LANCEMENT = 4000;

let majTrouvee = null;      // l'objet rendu par check(), gardé entre les deux temps
let majEnCours = false;     // garde : deux téléchargements simultanés casseraient

/**
 * Le pont vers le plugin. Absent dans le banc d'essai et dans les pages de
 * génération, qui n'ont pas de Tauri derrière — d'où la vérification plutôt
 * qu'un plantage au chargement.
 */
function pontMaj(){
  const t = window.__TAURI__;
  return (t && t.updater && typeof t.updater.check === 'function') ? t.updater : null;
}

/**
 * Regarde s'il existe une version plus récente.
 *
 * `discret` : au lancement, on ne dit rien quand il n'y a rien — et on ne dit
 * rien non plus quand ça échoue. Une machine hors ligne n'a pas à recevoir un
 * message d'erreur pour une vérification qu'elle n'a pas demandée.
 */
async function verifierMaj(discret){
  const pont = pontMaj();
  if(!pont){
    if(!discret){
      prevenir({
        eyebrow: 'Mises à jour',
        titre: 'Indisponible ici',
        note: 'La vérification passe par l\'application installée. Depuis le banc '
            + 'd\'essai ou un navigateur, il n\'y a rien à mettre à jour.'
      });
    }
    return null;
  }

  try{
    const maj = await pont.check();
    if(maj && maj.available){
      majTrouvee = maj;
      montrerBoutonMaj(maj.version);
      if(!discret) proposerMaj();
      return maj;
    }
    if(!discret){
      prevenir({
        eyebrow: 'Mises à jour',
        titre: 'Vous êtes à jour',
        note: 'Aucune version plus récente n\'est publiée.',
        genre: 'succes'
      });
    }
    return null;
  }catch(e){
    // Hors ligne, GitHub indisponible, aucune Release encore publiée : trois
    // situations normales qui ne méritent pas d'interrompre qui que ce soit.
    if(!discret){
      prevenirErreur('La vérification a échoué',
        'Impossible de joindre GitHub. Vérifiez la connexion, et réessayez plus tard.');
    }
    return null;
  }
}

/**
 * Le bouton n'apparaît que lorsqu'il y a quelque chose à installer. Un bouton
 * « vérifier » posté en permanence dans l'en-tête ne sert qu'à inquiéter : la
 * vérification se fait toute seule.
 */
function montrerBoutonMaj(version){
  const bouton = document.getElementById('majBtn');
  if(!bouton) return;
  bouton.hidden = false;
  bouton.title = 'La version ' + version + ' est disponible';
}

/** Le nom du fichier de notes est libre : on affiche ce qui vient, ou rien. */
function notesDeVersion(maj){
  const brut = (maj && maj.body || '').trim();
  if(!brut) return 'Cette version n\'annonce pas ses changements.';
  return brut.length > 600 ? brut.slice(0, 600).trimEnd() + '…' : brut;
}

/**
 * Le premier temps : on montre ce qui va se passer, et on demande.
 *
 * Le second temps — télécharger, installer, relancer — ne commence qu'après un
 * oui franc, parce qu'il ferme l'application.
 */
async function proposerMaj(){
  if(!majTrouvee || majEnCours) return;

  // Le résumé attend des paires {cle, valeur} : les deux numéros côte à côte
  // répondent seuls à « qu'est-ce que j'installe, et depuis quoi ».
  const resume = [{ cle: 'votre version', valeur: majTrouvee.currentVersion || '—' },
                  { cle: 'à installer', valeur: majTrouvee.version }];

  const veut = await demanderConfirmation({
    eyebrow: 'Mise à jour disponible',
    titre: 'PokéArchive ' + majTrouvee.version,
    resume: resume,
    note: notesDeVersion(majTrouvee)
        + '\n\nL\'application se ferme le temps de l\'installation, puis se rouvre '
        + 'seule. Votre Pokédex et vos aventures ne sont pas touchés : ils vivent '
        + 'sur votre compte, pas dans le programme.',
    libelleAction: 'Installer maintenant',
    libelleAnnuler: 'Plus tard'
  });
  if(!veut) return;

  majEnCours = true;
  const bouton = document.getElementById('majBtn');
  if(bouton){ bouton.disabled = true; bouton.textContent = '⬇ 0 %'; }

  try{
    // downloadAndInstall rend la main par étapes : on s'en sert pour montrer
    // une progression réelle plutôt qu'une roue qui tourne dans le vide.
    let recu = 0, total = 0;
    await majTrouvee.downloadAndInstall(function(etape){
      if(etape.event === 'Started'){
        total = (etape.data && etape.data.contentLength) || 0;
      }else if(etape.event === 'Progress'){
        recu += (etape.data && etape.data.chunkLength) || 0;
        if(bouton && total){
          bouton.textContent = '⬇ ' + Math.round(100 * recu / total) + ' %';
        }
      }else if(etape.event === 'Finished'){
        if(bouton) bouton.textContent = '⬇ installation…';
      }
    });

    // Sur Windows l'installeur reprend la main et referme l'application ; le
    // relaunch n'est atteint que si ce n'est pas le cas.
    const process = window.__TAURI__ && window.__TAURI__.process;
    if(process && typeof process.relaunch === 'function') await process.relaunch();
  }catch(e){
    majEnCours = false;
    if(bouton){ bouton.disabled = false; bouton.textContent = '⬇ Mise à jour'; }
    prevenirErreur('L\'installation a échoué',
      'Le téléchargement ou l\'installation s\'est interrompu. L\'application '
      + 'reste dans sa version actuelle, rien n\'est cassé. Vous pouvez réessayer, '
      + 'ou télécharger l\'installeur depuis la page des versions sur GitHub.');
  }
}

// Le bouton de l'en-tête, et la vérification au lancement. Quatre secondes de
// délai : l'application a mieux à faire au démarrage que d'attendre le réseau,
// et une mise à jour n'est jamais pressée.
document.addEventListener('DOMContentLoaded', function(){
  const bouton = document.getElementById('majBtn');
  if(bouton) bouton.addEventListener('click', proposerMaj);
  if(pontMaj()) setTimeout(function(){ verifierMaj(true); }, MAJ_ATTENTE_AU_LANCEMENT);
});
