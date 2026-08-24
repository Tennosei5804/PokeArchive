// Ce qui appartient au dresseur : ses données, ses connexions, et — pour un
// seul compte — le renommage de quelqu'un d'autre.
//
// Script classique, chargé APRÈS compte.js : il se sert d'invoke, de
// perdreSession et des dialogues, qui viennent de là.
//
// Trois blocs de la page Profil, et une bascule sur le journal. Ils vivent ici
// plutôt que dans compte.js, qui approche des mille cinq cents lignes et parle
// déjà de sept choses.

const exportBtn = document.getElementById('exportBtn');
const exportEtat = document.getElementById('exportEtat');
const sessionsListe = document.getElementById('sessionsListe');
const sessionsAutres = document.getElementById('sessionsAutres');
const adminTitre = document.getElementById('adminTitre');
const adminBloc = document.getElementById('adminBloc');
const adminPseudo = document.getElementById('adminPseudo');
const adminNouveau = document.getElementById('adminNouveau');
const adminRenommer = document.getElementById('adminRenommer');
const adminEtat = document.getElementById('adminEtat');

// ---- Emporter ses données ---------------------------------------------------

/**
 * Écrit le fichier là où la personne le demande.
 *
 * Un lien `download` ne suffit pas dans une application de bureau : le
 * navigateur embarqué le déposerait dans le dossier de téléchargements sans
 * rien demander, et parfois nulle part. On passe par la boîte du système —
 * c'est aussi ce qui rend le geste explicite.
 */
async function telecharger(nomPropose, contenu) {
  // L'API des fichiers de Tauri n'est pas déclarée dans les permissions : on
  // reste donc sur le lien, qui marche partout. Le dossier de téléchargements
  // du système est un endroit raisonnable, et le nom porte la date.
  const blob = new Blob([contenu], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nomPropose;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Rendre la mémoire, mais pas tout de suite : révoquer avant que le
  // téléchargement ait démarré l'annulerait.
  setTimeout(function(){ URL.revokeObjectURL(url); }, 30_000);
}

async function exporterMesDonnees() {
  if (!exportBtn) return;
  exportBtn.disabled = true;
  exportEtat.textContent = 'Préparation…';
  try {
    const contenu = await invoke('exporter');
    const jour = String(contenu.exporteLe || '').slice(0, 10) || 'export';
    await telecharger('pokearchive-' + jour + '.json', JSON.stringify(contenu, null, 2));
    const n = (contenu.aventures || []).length;
    exportEtat.textContent = n + ' aventure' + (n > 1 ? 's' : '') + ' enregistrée'
      + (n > 1 ? 's' : '') + ' dans le fichier.';
  } catch (e) {
    if (String(e) === 'SESSION_INVALIDE') { await perdreSession(); return; }
    exportEtat.textContent = '';
    prevenirErreur('L\'export a échoué', String(e));
  } finally {
    exportBtn.disabled = false;
  }
}

// ---- Les connexions ouvertes ------------------------------------------------

function ligneSession(s) {
  const l = document.createElement('div');
  l.className = 'session' + (s.courante ? ' courante' : '');

  const quand = document.createElement('span');
  quand.className = 'session-quand';
  quand.textContent = 'Ouverte le ' + dateLisible(s.creeLe);

  const jusque = document.createElement('span');
  jusque.className = 'session-jusque';
  jusque.textContent = 'jusqu\'au ' + dateLisible(s.expireLe);

  l.appendChild(quand);
  l.appendChild(jusque);

  if (s.courante) {
    // Celle d'où l'on parle. La fermer déconnecterait — c'est ce que fait le
    // bouton « Se déconnecter », et le proposer deux fois sous deux noms
    // différents ne rendrait service à personne.
    const ici = document.createElement('span');
    ici.className = 'session-ici';
    ici.textContent = 'celle-ci';
    l.appendChild(ici);
  } else {
    const fermer = document.createElement('button');
    fermer.className = 'session-fermer';
    fermer.type = 'button';
    fermer.textContent = 'Fermer';
    fermer.addEventListener('click', function(){ fermerUneSession(s.id); });
    l.appendChild(fermer);
  }
  return l;
}

async function chargerSessions() {
  if (!sessionsListe) return;
  sessionsListe.innerHTML = '<div class="state-msg">Chargement…</div>';
  let r;
  try {
    r = await invoke('sessions');
  } catch (e) {
    if (String(e) === 'SESSION_INVALIDE') { await perdreSession(); return; }
    sessionsListe.innerHTML = '<div class="state-msg">Connexions indisponibles.</div>';
    return;
  }
  const liste = r.sessions || [];
  sessionsListe.innerHTML = '';
  liste.forEach(function(s){ sessionsListe.appendChild(ligneSession(s)); });

  const autres = liste.filter(function(s){ return !s.courante; }).length;
  sessionsAutres.style.display = autres ? '' : 'none';
  sessionsAutres.textContent = autres > 1
    ? 'Fermer les ' + autres + ' autres'
    : 'Fermer l\'autre';
}

async function fermerUneSession(id) {
  try {
    await invoke('fermer_session', { id: id });
    await chargerSessions();
  } catch (e) {
    if (String(e) === 'SESSION_INVALIDE') { await perdreSession(); return; }
    prevenirErreur('Impossible de fermer cette connexion', String(e));
  }
}

async function fermerLesAutresSessions() {
  const veut = await demanderConfirmation({
    eyebrow: 'Connexions',
    titre: 'Fermer toutes les autres ?',
    note: 'Les autres appareils devront se reconnecter avec Discord. Celle-ci '
        + 'n\'est pas touchée — tu restes connecté ici.',
    libelleAction: 'Fermer les autres'
  });
  if (!veut) return;
  try {
    await invoke('fermer_les_autres');
    await chargerSessions();
  } catch (e) {
    if (String(e) === 'SESSION_INVALIDE') { await perdreSession(); return; }
    prevenirErreur('Impossible de fermer les connexions', String(e));
  }
}

// ---- Administration ---------------------------------------------------------
//
// Le bloc n'apparaît que pour l'administrateur, et ce n'est PAS l'application
// qui en décide : elle demande, et l'API répond 404 à tout le monde sauf lui.
// Un contrôle côté application ne protégerait rien — le code est distribué, et
// qui veut voir le bloc n'a qu'à le dévoiler dans l'inspecteur. Ce qui compte
// est que la route refuse, et elle refuse.

async function verifierAdmin() {
  if (!adminBloc) return;
  try {
    // Une demande volontairement vide : l'API vérifie d'abord qui parle. Un
    // administrateur reçoit une erreur de saisie — donc il l'est ; les autres
    // reçoivent « Route inconnue ».
    await invoke('renommer_dresseur', { pseudo: '', nouveau: '' });
    devoilerAdmin();
  } catch (e) {
    const message = String(e);
    if (message === 'SESSION_INVALIDE') return;
    if (message.indexOf('Route inconnue') !== -1) return;   // pas administrateur
    devoilerAdmin();
  }
}

function devoilerAdmin() {
  adminTitre.hidden = false;
  adminBloc.hidden = false;
}

async function renommerQuelquun() {
  const pseudo = (adminPseudo.value || '').trim();
  const nouveau = (adminNouveau.value || '').trim();
  if (!pseudo || !nouveau) {
    adminEtat.textContent = 'Les deux pseudos sont nécessaires.';
    return;
  }
  const veut = await demanderConfirmation({
    eyebrow: 'Administration',
    titre: 'Renommer « ' + pseudo + ' » ?',
    note: 'Il deviendra « ' + nouveau + ' ». La personne le verra au prochain '
        + 'chargement, sans être prévenue autrement.',
    libelleAction: 'Renommer',
    danger: true
  });
  if (!veut) return;

  adminRenommer.disabled = true;
  try {
    const r = await invoke('renommer_dresseur', { pseudo: pseudo, nouveau: nouveau });
    adminEtat.textContent = 'Renommé en « ' + r.pseudo +' ».';
    adminPseudo.value = '';
    adminNouveau.value = '';
  } catch (e) {
    if (String(e) === 'SESSION_INVALIDE') { await perdreSession(); return; }
    adminEtat.textContent = String(e);
  } finally {
    adminRenommer.disabled = false;
  }
}

// ---- Branchements -----------------------------------------------------------

document.addEventListener('DOMContentLoaded', function(){
  if (exportBtn) exportBtn.addEventListener('click', exporterMesDonnees);
  if (sessionsAutres) sessionsAutres.addEventListener('click', fermerLesAutresSessions);
  if (adminRenommer) adminRenommer.addEventListener('click', renommerQuelquun);
});

/** Appelé par chargerProfil() : la page vient de s'ouvrir. */
function chargerDonneesPerso() {
  chargerSessions();
  verifierAdmin();
}
