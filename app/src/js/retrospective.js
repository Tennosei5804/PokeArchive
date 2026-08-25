// Ta rétrospective : ce que le journal raconte, une fois compté.
//
// Script classique, chargé APRÈS compte.js : il se sert d'invoke, de
// perdreSession et de libelleDex, qui viennent de là.
//
// pa_historique garde chaque capture avec sa date depuis le premier jour, et
// rien n'en tirait le moindre récit. Le journal montre les lignes une à une ;
// cette page les additionne.
//
// LES CHIFFRES VIENNENT DE LA BASE, PAS D'ICI. L'API renvoie deux agrégats
// déjà groupés — un par jour, un par jeu. Rapatrier des milliers de lignes pour
// en tirer six chiffres serait absurde, et la base sait grouper.
//
// CE QUI EST CALCULÉ ICI, en revanche, c'est ce qui demande de raisonner sur
// une suite de jours : la série la plus longue, et les fenêtres glissantes.

const RETRO_BARRES = 30;              // le dernier mois, un trait par jour

let retroDonnees = null;

// ---- Les dates --------------------------------------------------------------
//
// Les jours arrivent en « AAAA-MM-JJ ». Ce format se compare et se trie tel
// quel, et c'est pour cette raison qu'on ne le convertit pas en Date pour
// travailler dessus : une Date introduit un fuseau, et un fuseau décale les
// jours d'une heure — assez pour qu'une capture de 23 h tombe le lendemain.

/** Le jour d'aujourd'hui, au même format que ceux du serveur. */
function retroAujourdhui(){
  const d = new Date();
  const p = function(n){ return String(n).padStart(2, '0'); };
  return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/** Le jour d'avant, en restant sur la chaîne. */
function retroVeille(jour){
  const d = new Date(jour + 'T12:00:00Z');    // midi : à l'abri des fuseaux
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

const RETRO_MOIS = ['janvier','février','mars','avril','mai','juin','juillet',
                    'août','septembre','octobre','novembre','décembre'];
const RETRO_JOURS_SEM = ['dimanche','lundi','mardi','mercredi','jeudi','vendredi','samedi'];

function retroDateLisible(jour){
  const p = String(jour).split('-');
  if(p.length !== 3) return jour;
  const d = new Date(jour + 'T12:00:00Z');
  return RETRO_JOURS_SEM[d.getUTCDay()] + ' ' + Number(p[2]) + ' ' + RETRO_MOIS[Number(p[1]) - 1];
}

// ---- Les calculs ------------------------------------------------------------

/**
 * La plus longue suite de jours consécutifs avec au moins une capture.
 *
 * Les jours arrivent du plus récent au plus ancien et sans trou : un jour sans
 * capture n'a simplement pas de ligne. C'est donc l'écart entre deux lignes
 * voisines qui dit si la série se poursuit.
 */
function retroPlusLongueSerie(jours){
  let meilleure = 0, courante = 0, precedent = null;
  // À l'endroit, du plus ancien au plus récent : une série se lit dans le sens
  // où elle s'est vécue.
  for(let i = jours.length - 1; i >= 0; i--){
    const j = jours[i].jour;
    courante = (precedent && retroVeille(j) === precedent) ? courante + 1 : 1;
    if(courante > meilleure) meilleure = courante;
    precedent = j;
  }
  return meilleure;
}

/** Les captures des n derniers jours, aujourd'hui compris. */
function retroFenetre(jours, n){
  let borne = retroAujourdhui();
  for(let i = 1; i < n; i++) borne = retroVeille(borne);
  return jours.filter(function(j){ return j.jour >= borne; })
              .reduce(function(s, j){ return s + j.combien; }, 0);
}

function retroMeilleurJour(jours){
  return jours.reduce(function(m, j){
    return (!m || j.combien > m.combien) ? j : m;
  }, null);
}

// ---- L'affichage -------------------------------------------------------------

function retroChiffre(valeur, quoi, detail){
  const c = document.createElement('div');
  c.className = 'retro-carte';
  const v = document.createElement('span');
  v.className = 'retro-valeur';
  v.textContent = valeur;
  const q = document.createElement('span');
  q.className = 'retro-quoi';
  q.textContent = quoi;
  c.appendChild(v);
  c.appendChild(q);
  if(detail){
    const d = document.createElement('span');
    d.className = 'retro-detail';
    d.textContent = detail;
    c.appendChild(d);
  }
  return c;
}

/**
 * Le dernier mois, un trait par jour.
 *
 * Les jours sans capture ont leur trait, à zéro : sans eux, trente traits
 * serrés donneraient l'illusion d'une régularité qui n'existe pas.
 */
function retroBarres(jours){
  const parJour = new Map();
  jours.forEach(function(j){ parJour.set(j.jour, j); });

  const suite = [];
  let jour = retroAujourdhui();
  for(let i = 0; i < RETRO_BARRES; i++){
    suite.unshift(parJour.get(jour) || { jour: jour, combien: 0, chromatiques: 0 });
    jour = retroVeille(jour);
  }
  const haut = suite.reduce(function(m, j){ return Math.max(m, j.combien); }, 0);

  const boite = document.createElement('div');
  boite.className = 'retro-barres';
  suite.forEach(function(j){
    const b = document.createElement('span');
    b.className = 'retro-barre' + (j.combien ? '' : ' vide')
                + (j.chromatiques ? ' chromatique' : '');
    // Une hauteur minimale pour les jours non vides : un seul Pokémon sur un
    // record de quarante donnerait un trait invisible, et « presque rien » se
    // lit autrement que « rien ».
    b.style.height = j.combien ? Math.max(8, (j.combien / haut) * 100) + '%' : '2px';
    b.title = retroDateLisible(j.jour) + ' — '
            + (j.combien ? j.combien + ' capture' + (j.combien > 1 ? 's' : '') : 'rien')
            + (j.chromatiques ? ', dont ' + j.chromatiques + ' chromatique'
                + (j.chromatiques > 1 ? 's' : '') : '');
    boite.appendChild(b);
  });
  return boite;
}

function dessinerRetrospective(){
  if(!retroBloc || !retroDonnees) return;
  const d = retroDonnees;
  retroBloc.innerHTML = '';

  if(!d.total){
    retroBloc.innerHTML = '<div class="state-msg">Rien encore enregistré. '
      + 'Tes captures s’ajouteront ici au fil des synchronisations.</div>';
    return;
  }

  const chiffres = document.createElement('div');
  chiffres.className = 'retro-chiffres';

  const semaine = retroFenetre(d.jours, 7);
  const mois = retroFenetre(d.jours, 30);
  const meilleur = retroMeilleurJour(d.jours);
  const serie = retroPlusLongueSerie(d.jours);
  const jeu = d.jeux[0];

  chiffres.appendChild(retroChiffre(semaine, 'cette semaine',
    mois ? mois + ' sur le mois' : ''));
  if(meilleur){
    chiffres.appendChild(retroChiffre(meilleur.combien, 'ton meilleur jour',
      retroDateLisible(meilleur.jour)));
  }
  chiffres.appendChild(retroChiffre(serie, serie > 1 ? 'jours d’affilée' : 'jour d’affilée',
    'ta plus longue série'));
  if(jeu){
    chiffres.appendChild(retroChiffre(jeu.combien, 'sur un seul jeu',
      (typeof libelleDex === 'function') ? libelleDex(jeu.dex) : jeu.dex));
  }
  retroBloc.appendChild(chiffres);
  retroBloc.appendChild(retroBarres(d.jours));

  const pied = document.createElement('p');
  pied.className = 'retro-pied';
  pied.textContent = d.total + ' capture' + (d.total > 1 ? 's' : '') + ' en tout'
    + (d.premier ? ', depuis le ' + retroDateLisible(String(d.premier).slice(0, 10)) : '')
    + '. Les trente derniers jours ci-dessus.';
  retroBloc.appendChild(pied);
}

/** Appelé par chargerProfil(). */
async function chargerRetrospective(){
  if(!retroBloc) return;
  retroBloc.innerHTML = '<div class="state-msg">Calcul en cours…</div>';
  try{
    retroDonnees = await invoke('retrospective');
  }catch(e){
    if(String(e) === 'SESSION_INVALIDE'){ await perdreSession(); return; }
    retroBloc.innerHTML = '<div class="state-msg">Rétrospective indisponible.</div>';
    return;
  }
  dessinerRetrospective();
  // Les succès se déduisent des mêmes chiffres : on les dessine ici plutôt
  // que de les laisser courir après une rétrospective pas encore arrivée.
  if(typeof chargerSucces === 'function') chargerSucces();
}
