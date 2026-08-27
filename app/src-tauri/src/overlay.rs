//! L'overlay de chasse : le compteur, en source navigateur dans OBS.
//!
//! POURQUOI. PokéPC cite le cas nommément — « if you are also a streamer ». Un
//! chasseur qui diffuse veut son compteur à l'écran, et le seul moyen propre de
//! le donner à OBS est une adresse locale que sa « source navigateur » va lire.
//!
//! L'INFRASTRUCTURE ÉTAIT DÉJÀ LÀ. L'application ouvre déjà une écoute locale
//! pour recevoir le retour de connexion Discord, avec la même bibliothèque —
//! `tiny_http`, aucune dépendance de plus. Il n'y avait qu'à s'en resservir.
//!
//! TROIS RÈGLES, les mêmes que pour la présence Discord : c'est un ornement.
//!
//! 1. RIEN NE DÉMARRE TOUT SEUL. Le serveur n'existe qu'après un clic, et
//!    n'écoute que sur la boucle locale. Personne d'autre que cette machine ne
//!    peut le joindre — un overlay accessible depuis le réseau serait une
//!    fuite, pas une fonctionnalité.
//!
//! 2. IL NE BLOQUE JAMAIS L'INTERFACE. Le serveur vit dans son propre fil ;
//!    l'écran ne l'attend pas et ne lui parle qu'en déposant du texte.
//!
//! 3. RIEN DE PRIVÉ N'Y PASSE. Ce que l'overlay affiche, ce sont les chiffres
//!    d'une chasse — le Pokémon, le compteur, le taux. Ni jeton, ni pseudo, ni
//!    dex : c'est destiné à être diffusé en direct.

use std::sync::{Arc, Mutex};

/// Ce que l'application tient : l'écoute en cours, et le dernier état poussé.
pub struct Overlay {
    /// Le serveur, tant qu'il tourne. `unblock()` le fait rendre la main.
    serveur: Mutex<Option<Arc<tiny_http::Server>>>,
    port: Mutex<Option<u16>>,
    /// Le JSON que l'interface dépose, et que la page relit.
    etat: Arc<Mutex<String>>,
}

impl Overlay {
    pub fn new() -> Self {
        Overlay {
            serveur: Mutex::new(None),
            port: Mutex::new(None),
            etat: Arc::new(Mutex::new(String::from("{\"actif\":false}"))),
        }
    }
}

/// La plage d'écoute. Distincte de celle de la connexion Discord (8730-8749) :
/// les deux peuvent tourner en même temps, et un port partagé ferait échouer
/// l'un des deux sans qu'on sache lequel.
const PORT_MIN: u16 = 8760;
const PORT_MAX: u16 = 8779;

/// La page, servie telle quelle.
///
/// FOND TRANSPARENT : c'est ce qui permet à OBS de la superposer au jeu. Une
/// couleur de fond obligerait à la découper à la main, et le résultat serait
/// toujours un rectangle.
///
/// ELLE INTERROGE, ELLE N'ATTEND PAS. Une seconde entre deux lectures suffit
/// largement pour un compteur qu'on incrémente à la main, et évite d'avoir à
/// tenir une connexion ouverte — ce qui compliquerait l'arrêt.
const PAGE: &str = r#"<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>PokéArchive — overlay de chasse</title><style>
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:transparent;font-family:"Segoe UI",system-ui,sans-serif}
#carte{display:none;align-items:center;gap:16px;padding:14px 20px 14px 14px;
  background:rgba(14,15,20,.82);border:1px solid rgba(242,169,0,.55);border-radius:16px;
  box-shadow:0 12px 34px -14px rgba(0,0,0,.8);width:max-content;max-width:520px}
#carte.on{display:flex}
#sprite{width:78px;height:78px;flex:none;display:grid;place-items:center;
  background:rgba(255,255,255,.06);border-radius:12px}
#sprite img{max-width:100%;max-height:100%;image-rendering:auto}
#texte{min-width:0}
#nom{font-size:19px;font-weight:700;color:#fff;letter-spacing:-.01em;line-height:1.2}
#meta{font-size:11px;color:#a0a4b4;margin-top:3px;font-family:ui-monospace,Consolas,monospace}
#barre{height:5px;border-radius:4px;background:rgba(255,255,255,.14);overflow:hidden;margin-top:8px}
#barre i{display:block;height:100%;background:linear-gradient(90deg,#f2a900,#f6d98a)}
#chance{font-size:11px;color:#c9ced8;margin-top:5px;font-family:ui-monospace,Consolas,monospace}
#compteur{font-size:44px;font-weight:600;color:#f2a900;line-height:1;flex:none;
  font-variant-numeric:tabular-nums;font-family:ui-monospace,Consolas,monospace}
</style></head><body>
<div id="carte">
  <div id="sprite"><img id="img" alt=""></div>
  <div id="texte">
    <div id="nom">—</div>
    <div id="meta"></div>
    <div id="barre"><i style="width:0"></i></div>
    <div id="chance"></div>
  </div>
  <div id="compteur">0</div>
</div>
<script>
var carte = document.getElementById('carte');
var img = document.getElementById('img');
var dernierSprite = '';
function peindre(e){
  if(!e || !e.actif){ carte.className = ''; return; }
  carte.className = 'on';
  document.getElementById('nom').textContent = e.nom || '—';
  document.getElementById('meta').textContent = e.meta || '';
  document.getElementById('compteur').textContent = e.compteur != null ? e.compteur : 0;
  var p = Math.max(0, Math.min(1, e.chance || 0));
  document.querySelector('#barre i').style.width = (p * 100) + '%';
  document.getElementById('chance').textContent = e.chance != null
    ? Math.round(p * 100) + ' % des dresseurs l\'auraient déjà trouvé' : '';
  // On ne repose l'image que si elle change : la reposer à chaque seconde la
  // ferait clignoter sur la diffusion.
  if(e.sprite && e.sprite !== dernierSprite){ dernierSprite = e.sprite; img.src = e.sprite; }
  if(!e.sprite){ dernierSprite = ''; img.removeAttribute('src'); }
}
function lire(){
  fetch('/etat.json', { cache: 'no-store' })
    .then(function(r){ return r.json(); })
    .then(peindre)
    .catch(function(){ carte.className = ''; });
}
lire();
setInterval(lire, 1000);
</script></body></html>"#;

fn entete(valeur: &str) -> tiny_http::Header {
    tiny_http::Header::from_bytes(&b"Content-Type"[..], valeur.as_bytes())
        .expect("en-tête valide")
}

/// Démarre l'écoute, ou rend l'adresse déjà ouverte.
#[tauri::command]
pub fn overlay_demarrer(overlay: tauri::State<'_, Overlay>) -> Result<String, String> {
    {
        let port = overlay.port.lock().map_err(|_| "état interne corrompu".to_string())?;
        if let Some(p) = *port {
            return Ok(format!("http://127.0.0.1:{p}/"));
        }
    }

    let mut choisi = None;
    for p in PORT_MIN..=PORT_MAX {
        if let Ok(s) = tiny_http::Server::http(("127.0.0.1", p)) {
            choisi = Some((p, Arc::new(s)));
            break;
        }
    }
    let (p, serveur) = choisi.ok_or_else(|| {
        format!("Aucun port libre entre {PORT_MIN} et {PORT_MAX} pour l'overlay.")
    })?;

    let etat = Arc::clone(&overlay.etat);
    let fil = Arc::clone(&serveur);
    // Un fil détaché : il s'arrête quand unblock() fait rendre la main à recv().
    std::thread::spawn(move || {
        for requete in fil.incoming_requests() {
            let url = requete.url().to_string();
            let (corps, mime) = if url.starts_with("/etat.json") {
                let texte = etat
                    .lock()
                    .map(|g| g.clone())
                    .unwrap_or_else(|_| String::from("{\"actif\":false}"));
                (texte, "application/json; charset=utf-8")
            } else {
                (PAGE.to_string(), "text/html; charset=utf-8")
            };
            let reponse =
                tiny_http::Response::from_string(corps).with_header(entete(mime));
            let _ = requete.respond(reponse);
        }
    });

    *overlay.serveur.lock().map_err(|_| "état interne corrompu".to_string())? = Some(serveur);
    *overlay.port.lock().map_err(|_| "état interne corrompu".to_string())? = Some(p);
    Ok(format!("http://127.0.0.1:{p}/"))
}

/// Coupe l'écoute. L'adresse cesse alors de répondre — c'est ce qu'on attend
/// d'un bouton « arrêter », et non un serveur qui continue en silence.
#[tauri::command]
pub fn overlay_arreter(overlay: tauri::State<'_, Overlay>) -> bool {
    if let Ok(mut garde) = overlay.serveur.lock() {
        if let Some(s) = garde.take() {
            s.unblock();
        }
    }
    if let Ok(mut p) = overlay.port.lock() {
        *p = None;
    }
    if let Ok(mut e) = overlay.etat.lock() {
        *e = String::from("{\"actif\":false}");
    }
    true
}

/// L'interface dépose ce que l'overlay doit afficher.
///
/// Le JSON est pris tel quel et rendu tel quel : cette couche ne le comprend
/// pas, et n'a pas à le comprendre. Le jour où l'overlay affiche une chose de
/// plus, il n'y a que la page et l'écran de chasse à changer.
#[tauri::command]
pub fn overlay_etat(overlay: tauri::State<'_, Overlay>, etat: serde_json::Value) -> bool {
    let texte = etat.to_string();
    // Une borne, parce que rien n'oblige l'interface à être raisonnable : un
    // état d'un mégaoctet resservi chaque seconde n'aiderait personne.
    if texte.len() > 8192 {
        return false;
    }
    match overlay.etat.lock() {
        Ok(mut g) => {
            *g = texte;
            true
        }
        Err(_) => false,
    }
}

/// L'adresse en cours, ou une chaîne vide. L'écran de chasse la relit à
/// l'ouverture : sans elle, rouvrir l'onglet donnait un bouton « démarrer »
/// alors que le serveur tournait déjà.
#[tauri::command]
pub fn overlay_adresse(overlay: tauri::State<'_, Overlay>) -> String {
    match overlay.port.lock() {
        Ok(g) => g.map(|p| format!("http://127.0.0.1:{p}/")).unwrap_or_default(),
        Err(_) => String::new(),
    }
}
