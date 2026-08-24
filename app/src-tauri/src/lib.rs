//! PokéArchive — cœur de l'application.
//!
//! L'application ne connaît **jamais** la base de données. Elle parle à l'API,
//! qui seule détient le mot de passe MySQL. Tout ce qu'elle garde en propre est
//! un jeton de session, valable pour un compte et révocable côté serveur.
//!
//! La connexion Discord suit le parcours prévu pour les applications de bureau
//! (RFC 8252) : on ouvre une écoute éphémère sur la machine, on envoie le
//! navigateur chez l'API, et celle-ci renvoie le jeton sur cette écoute une
//! fois Discord passé.

use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{Manager, State};

/// Adresse de l'API. Fixée à la compilation pour la version distribuée :
///   set POKEARCHIVE_API=https://api.exemple.fr && cargo tauri build
const API_DEFAUT: &str = "http://127.0.0.1:8787";

fn api() -> String {
    option_env!("POKEARCHIVE_API")
        .unwrap_or(API_DEFAUT)
        .trim_end_matches('/')
        .to_string()
}

/// Plage d'écoute pour le retour de connexion. L'API n'accepte que ces ports —
/// les deux listes doivent rester d'accord.
const PORT_MIN: u16 = 8730;
const PORT_MAX: u16 = 8749;

/// Au-delà, on suppose que la personne a renoncé devant Discord. Cinq minutes
/// et non trois : il faut le temps de basculer sur le navigateur, de s'y
/// connecter si ce n'est pas déjà fait, et de lire l'écran d'autorisation.
const ATTENTE_MAX: Duration = Duration::from_secs(300);

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Session {
    pub jeton: String,
    pub pseudo: String,
}

#[derive(Clone, Debug, Serialize)]
pub struct EtatPublic {
    pub connecte: bool,
    pub pseudo: String,
    pub api: String,
}

pub struct Etat {
    session: Mutex<Option<Session>>,
    fichier: PathBuf,
}

impl Etat {
    /// Le jeton, sorti du verrou avant tout `await` — un garde de Mutex ne
    /// traverse pas une frontière asynchrone.
    fn jeton(&self) -> Result<String, String> {
        self.session
            .lock()
            .map_err(|_| "état interne corrompu".to_string())?
            .as_ref()
            .map(|s| s.jeton.clone())
            .ok_or_else(|| "Non connecté.".to_string())
    }

    fn poser(&self, session: Option<Session>) -> Result<(), String> {
        match &session {
            Some(s) => {
                if let Some(parent) = self.fichier.parent() {
                    std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
                let brut = serde_json::to_string_pretty(s).map_err(|e| e.to_string())?;
                std::fs::write(&self.fichier, brut).map_err(|e| e.to_string())?;
            }
            None => {
                let _ = std::fs::remove_file(&self.fichier);
            }
        }
        *self
            .session
            .lock()
            .map_err(|_| "état interne corrompu".to_string())? = session;
        Ok(())
    }
}

// --- Dialogue avec l'API ----------------------------------------------------
async fn appeler(
    methode: reqwest::Method,
    chemin: &str,
    jeton: &str,
    corps: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;

    let mut requete = client
        .request(methode, format!("{}{}", api(), chemin))
        .bearer_auth(jeton);
    if let Some(c) = corps {
        requete = requete.json(&c);
    }

    let reponse = requete
        .send()
        .await
        .map_err(|_| "API injoignable. Vérifie ta connexion.".to_string())?;

    let statut = reponse.status();
    let texte = reponse.text().await.unwrap_or_default();

    if !statut.is_success() {
        // Un 401 est le seul cas où la session locale ne vaut plus rien. On le
        // signale par un marqueur explicite plutôt que par le texte du message :
        // reconnaître une déconnexion en cherchant une phrase dans une chaîne
        // casse à la première reformulation, et déconnecte alors les gens pour
        // une panne réseau.
        if statut == reqwest::StatusCode::UNAUTHORIZED {
            return Err("SESSION_INVALIDE".to_string());
        }
        // Sinon, on préfère le message de l'API : il est écrit pour être lu par
        // la personne, pas par le développeur.
        let message = serde_json::from_str::<serde_json::Value>(&texte)
            .ok()
            .and_then(|v| v.get("erreur").and_then(|e| e.as_str()).map(String::from))
            .unwrap_or_else(|| format!("Erreur {statut}"));
        return Err(message);
    }
    if texte.is_empty() {
        return Ok(serde_json::Value::Null);
    }
    serde_json::from_str(&texte).map_err(|e| e.to_string())
}

// --- Preuve de possession (PKCE) --------------------------------------------
//
// L'application est distribuée : son code est public, et rien de secret ne peut
// y être écrit en dur. La sécurité ne repose donc pas sur un secret partagé,
// mais sur un secret **tiré au sort à chaque connexion**, qui ne quitte jamais
// la mémoire du processus.
//
//   · le « vérifieur » : 32 octets de hasard, gardés ici et nulle part ailleurs ;
//   · le « défi » : son empreinte SHA-256, seule chose transmise au départ ;
//   · le « nonce » : un second hasard que l'API réémettra vers l'écoute locale.
//
// Ce que ça ferme concrètement : le jeton ne circule plus dans une adresse. Qui
// lit l'historique du navigateur, les journaux du système, ou écoute la boucle
// locale, ne récolte qu'un code d'échange à usage unique — inutilisable sans le
// vérifieur, qui n'est jamais sorti d'ici.
struct Preuve {
    verifieur: String,
    defi: String,
    nonce: String,
}

/// Du hasard cryptographique, en base64url — l'alphabet des adresses.
fn hasard(octets: usize) -> Result<String, String> {
    let mut brut = vec![0u8; octets];
    getrandom::getrandom(&mut brut)
        .map_err(|e| format!("source d'aléa indisponible : {e}"))?;
    Ok(base64::Engine::encode(
        &base64::engine::general_purpose::URL_SAFE_NO_PAD,
        brut,
    ))
}

impl Preuve {
    fn nouvelle() -> Result<Self, String> {
        let verifieur = hasard(32)?;
        let empreinte = <sha2::Sha256 as sha2::Digest>::digest(verifieur.as_bytes());
        let defi = base64::Engine::encode(
            &base64::engine::general_purpose::URL_SAFE_NO_PAD,
            empreinte,
        );
        Ok(Self {
            verifieur,
            defi,
            nonce: hasard(16)?,
        })
    }
}

/// Échange le code reçu sur la boucle locale contre le jeton de session.
///
/// C'est le seul moment où le jeton traverse le réseau, et il le fait dans le
/// corps d'une réponse HTTPS, jamais dans une adresse.
async fn echanger(code: &str, verifieur: &str) -> Result<Session, String> {
    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(20))
        .build()
        .map_err(|e| e.to_string())?;

    let reponse = client
        .post(format!("{}/auth/echange", api()))
        .json(&serde_json::json!({ "code": code, "verifieur": verifieur }))
        .send()
        .await
        .map_err(|_| "API injoignable pendant l'échange.".to_string())?;

    let statut = reponse.status();
    let texte = reponse.text().await.unwrap_or_default();
    let corps: serde_json::Value = serde_json::from_str(&texte).unwrap_or_default();

    if !statut.is_success() {
        let message = corps
            .get("erreur")
            .and_then(|e| e.as_str())
            .unwrap_or("échange refusé");
        return Err(message.to_string());
    }

    let jeton = corps
        .get("jeton")
        .and_then(|j| j.as_str())
        .filter(|j| !j.is_empty())
        .ok_or_else(|| "L'API n'a pas renvoyé de jeton.".to_string())?;

    Ok(Session {
        jeton: jeton.to_string(),
        pseudo: corps
            .get("pseudo")
            .and_then(|p| p.as_str())
            .unwrap_or_default()
            .to_string(),
    })
}

// --- Connexion Discord ------------------------------------------------------
/// Ouvre une écoute sur le premier port libre de la plage.
fn ouvrir_ecoute() -> Result<(u16, tiny_http::Server), String> {
    for port in PORT_MIN..=PORT_MAX {
        if let Ok(serveur) = tiny_http::Server::http(("127.0.0.1", port)) {
            return Ok((port, serveur));
        }
    }
    Err(format!(
        "Aucun port libre entre {PORT_MIN} et {PORT_MAX}. Une autre instance tourne-t-elle ?"
    ))
}

const PAGE: &str = r#"<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8">
<title>PokéArchive</title><style>
body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0e0f14;color:#e8e9f0;
font-family:"Segoe UI",system-ui,sans-serif;text-align:center;padding:24px}
.r{width:56px;height:56px;border-radius:50%;display:grid;place-items:center;font-size:27px;
margin:0 auto 18px;background:__FOND__}
h1{font-size:21px;margin:0 0 8px}p{color:#a0a4b4;margin:0;line-height:1.6}
</style></head><body><div><div class="r">__ICONE__</div><h1>__TITRE__</h1><p>__TEXTE__</p></div></body></html>"#;

fn page(fond: &str, icone: &str, titre: &str, texte: &str) -> String {
    PAGE.replace("__FOND__", fond)
        .replace("__ICONE__", icone)
        .replace("__TITRE__", titre)
        .replace("__TEXTE__", texte)
}

/// Attend le retour de l'API : une seule requête, puis on rend la main.
/// Attend le retour de l'API et en tire le code d'echange.
///
/// Le nonce est verifie avant tout : il n'a jamais transite que par HTTPS
/// vers l'API, puis vers cette ecoute. Un programme local qui tenterait de
/// nous faire adopter une session en appelant 127.0.0.1 ne peut pas le
/// deviner, et sa requete est rejetee sans etre lue plus avant.
fn attendre(serveur: tiny_http::Server, nonce: &str) -> Result<String, String> {
    let echeance = std::time::Instant::now() + ATTENTE_MAX;

    while std::time::Instant::now() < echeance {
        let restant = echeance.saturating_duration_since(std::time::Instant::now());
        let requete = match serveur.recv_timeout(restant.min(Duration::from_secs(2))) {
            Ok(Some(r)) => r,
            Ok(None) => continue, // délai écoulé sans requête : on repasse
            Err(e) => return Err(e.to_string()),
        };

        // On ne lit que la ligne de requête : l'API met tout dans l'adresse.
        let url = format!("http://127.0.0.1{}", requete.url());
        let parsee = url::form_urlencoded_lite(&url);

        let repondre = |req: tiny_http::Request, corps: String| {
            let entete = tiny_http::Header::from_bytes(
                &b"Content-Type"[..],
                &b"text/html; charset=utf-8"[..],
            )
            .expect("en-tête valide");
            let _ = req.respond(
                tiny_http::Response::from_string(corps).with_header(entete),
            );
        };

        if let Some(erreur) = parsee.get("erreur") {
            let texte = match erreur.as_str() {
                "refus" => "Tu as refusé l'autorisation Discord.",
                "etat" => "La connexion a expiré en route. Relance-la.",
                "discord" => "Discord n'a pas répondu correctement.",
                "obsolete" => "Cette version de PokéArchive est trop ancienne pour \
la connexion sécurisée. Mets-la à jour.",
                _ => "La connexion n'a pas abouti.",
            };
            repondre(
                requete,
                page("#3f1010", "✕", "Connexion refusée", texte),
            );
            return Err(texte.to_string());
        }

        if let Some(code) = parsee.get("code") {
            // Le nonce d'abord : sans lui, cette requete ne vient pas de la
            // connexion que NOUS avons lancee.
            let annonce = parsee.get("nonce").map(String::as_str).unwrap_or("");
            if annonce != nonce {
                repondre(
                    requete,
                    page(
                        "#3f1010",
                        "✕",
                        "Retour inattendu",
                        "Cette réponse ne correspond à aucune connexion en cours.",
                    ),
                );
                continue; // on ne quitte pas : la vraie reponse peut encore venir
            }

            repondre(
                requete,
                page(
                    "#1d3b2b",
                    "✓",
                    "Presque fini",
                    "Tu peux fermer cet onglet et revenir à PokéArchive.",
                ),
            );
            return Ok(code.clone());
        }

        // Requête sans rien d'utile (le navigateur demande /favicon.ico, par
        // exemple) : on répond poliment et on continue d'attendre.
        repondre(requete, page("#3f1010", "…", "En attente", "Rien à voir ici."));
    }
    Err("Connexion non terminée dans le temps imparti.".to_string())
}

/// Décodage minimal des paramètres d'une adresse — cela évite une dépendance
/// entière pour trois lignes.
mod url {
    use std::collections::HashMap;

    pub fn form_urlencoded_lite(url: &str) -> HashMap<String, String> {
        let mut out = HashMap::new();
        let Some((_, requete)) = url.split_once('?') else {
            return out;
        };
        for paire in requete.split('&') {
            if let Some((cle, valeur)) = paire.split_once('=') {
                out.insert(percent(cle), percent(valeur));
            }
        }
        out
    }

    fn percent(s: &str) -> String {
        let octets = s.replace('+', " ").into_bytes();
        let mut out = Vec::with_capacity(octets.len());
        let mut i = 0;
        while i < octets.len() {
            if octets[i] == b'%' && i + 2 < octets.len() {
                if let Ok(v) = u8::from_str_radix(
                    std::str::from_utf8(&octets[i + 1..i + 3]).unwrap_or("zz"),
                    16,
                ) {
                    out.push(v);
                    i += 3;
                    continue;
                }
            }
            out.push(octets[i]);
            i += 1;
        }
        String::from_utf8_lossy(&out).into_owned()
    }
}

// --- Commandes exposées à l'interface ---------------------------------------
#[tauri::command]
fn etat(etat: State<'_, Etat>) -> EtatPublic {
    let session = etat.session.lock().ok().and_then(|s| s.clone());
    EtatPublic {
        connecte: session.is_some(),
        pseudo: session.map(|s| s.pseudo).unwrap_or_default(),
        api: api(),
    }
}

#[tauri::command]
async fn connexion(etat: State<'_, Etat>) -> Result<Session, String> {
    let (port, serveur) = tauri::async_runtime::spawn_blocking(ouvrir_ecoute)
        .await
        .map_err(|e| e.to_string())??;

    // Le verifieur reste ici ; seule son empreinte part sur le reseau.
    let preuve = Preuve::nouvelle()?;

    let lien = format!(
        "{}/auth/discord?app={}&defi={}&nonce={}",
        api(),
        port,
        urlencode(&preuve.defi),
        urlencode(&preuve.nonce)
    );
    opener::open_browser(&lien)
        .map_err(|_| "Impossible d'ouvrir le navigateur.".to_string())?;

    let nonce = preuve.nonce.clone();
    let code = tauri::async_runtime::spawn_blocking(move || attendre(serveur, &nonce))
        .await
        .map_err(|e| e.to_string())??;

    // Le jeton n'arrive qu'ici, dans le corps d'une reponse, contre la preuve
    // que nous sommes bien a l'origine de la demande.
    let session = echanger(&code, &preuve.verifieur).await?;

    etat.poser(Some(session.clone()))?;
    Ok(session)
}

#[tauri::command]
fn deconnexion(etat: State<'_, Etat>) -> Result<(), String> {
    etat.poser(None)
}

#[tauri::command]
async fn moi(etat: State<'_, Etat>) -> Result<serde_json::Value, String> {
    let jeton = etat.jeton()?;
    appeler(reqwest::Method::GET, "/api/moi", &jeton, None).await
}

/// Le profil visé, en paramètre d'adresse. Absent, c'est l'aventure par défaut
/// du dresseur qui répond — l'API s'en charge, pas l'interface.
fn param_profil(profil: Option<i64>) -> String {
    match profil {
        Some(id) => format!("?profil={id}"),
        None => String::new(),
    }
}

#[tauri::command]
async fn lire_dex(
    etat: State<'_, Etat>,
    profil: Option<i64>,
) -> Result<serde_json::Value, String> {
    let jeton = etat.jeton()?;
    let chemin = format!("/api/dex{}", param_profil(profil));
    appeler(reqwest::Method::GET, &chemin, &jeton, None).await
}

#[tauri::command]
async fn ecrire_dex(
    etat: State<'_, Etat>,
    donnees: serde_json::Value,
    profil: Option<i64>,
) -> Result<serde_json::Value, String> {
    let jeton = etat.jeton()?;
    let chemin = format!("/api/dex{}", param_profil(profil));
    appeler(reqwest::Method::POST, &chemin, &jeton, Some(donnees)).await
}

// --- Les aventures ----------------------------------------------------------
#[tauri::command]
async fn profils(etat: State<'_, Etat>) -> Result<serde_json::Value, String> {
    let jeton = etat.jeton()?;
    appeler(reqwest::Method::GET, "/api/profils", &jeton, None).await
}

#[tauri::command]
async fn creer_profil(
    etat: State<'_, Etat>,
    nom: String,
    // Le mode dit ce que l'aventure compte : « capture », « vu » ou « living ».
    // L'API tranche elle-meme sur une valeur inconnue, on n'a rien a valider ici.
    mode: Option<String>,
) -> Result<serde_json::Value, String> {
    let jeton = etat.jeton()?;
    let corps = serde_json::json!({ "nom": nom, "mode": mode });
    appeler(reqwest::Method::POST, "/api/profils", &jeton, Some(corps)).await
}

/// Renommer, publier, ou désigner comme aventure par défaut. Les champs absents
/// ne sont pas touchés : on peut publier sans renommer.
#[tauri::command]
async fn modifier_profil(
    etat: State<'_, Etat>,
    id: i64,
    nom: Option<String>,
    public: Option<bool>,
    par_defaut: Option<bool>,
    mode: Option<String>,
    niveau_formes: Option<i64>,
) -> Result<serde_json::Value, String> {
    let jeton = etat.jeton()?;
    let mut corps = serde_json::Map::new();
    if let Some(n) = nom {
        corps.insert("nom".into(), serde_json::Value::String(n));
    }
    if let Some(p) = public {
        corps.insert("public".into(), serde_json::Value::Bool(p));
    }
    if let Some(d) = par_defaut {
        corps.insert("parDefaut".into(), serde_json::Value::Bool(d));
    }
    if let Some(m) = mode {
        corps.insert("mode".into(), serde_json::Value::String(m));
    }
    // Le niveau de formes appartient a l'aventure : deux dresseurs qui se
    // comparent doivent compter sur le meme denominateur.
    if let Some(n) = niveau_formes {
        corps.insert("niveauFormes".into(), serde_json::Value::from(n));
    }
    let chemin = format!("/api/profils/{id}");
    appeler(
        reqwest::Method::PATCH,
        &chemin,
        &jeton,
        Some(serde_json::Value::Object(corps)),
    )
    .await
}

/// Le journal des captures d'une aventure. « avant » est l'identifiant de la
/// dernière ligne déjà affichée : c'est ainsi qu'on demande la page suivante
/// sans qu'une capture survenue entre-temps ne décale la lecture.
#[tauri::command]
async fn historique(
    etat: State<'_, Etat>,
    id: i64,
    avant: Option<i64>,
) -> Result<serde_json::Value, String> {
    let jeton = etat.jeton()?;
    let chemin = match avant {
        Some(a) => format!("/api/profils/{id}/historique?avant={a}"),
        None => format!("/api/profils/{id}/historique"),
    };
    appeler(reqwest::Method::GET, &chemin, &jeton, None).await
}

#[tauri::command]
async fn supprimer_profil(etat: State<'_, Etat>, id: i64) -> Result<serde_json::Value, String> {
    let jeton = etat.jeton()?;
    let chemin = format!("/api/profils/{id}");
    appeler(reqwest::Method::DELETE, &chemin, &jeton, None).await
}

/// Sans recherche, c'est le classement. Avec, les dresseurs dont le pseudo
/// contient le texte donné.
#[tauri::command]
async fn dresseurs(
    etat: State<'_, Etat>,
    recherche: Option<String>,
) -> Result<serde_json::Value, String> {
    let jeton = etat.jeton()?;
    let chemin = match recherche.as_deref().map(str::trim).filter(|s| !s.is_empty()) {
        Some(q) => format!("/api/dresseurs?q={}", urlencode(q)),
        None => "/api/dresseurs".to_string(),
    };
    appeler(reqwest::Method::GET, &chemin, &jeton, None).await
}

/// Les aventures publiques d'un autre dresseur.
#[tauri::command]
async fn profils_de(etat: State<'_, Etat>, pseudo: String) -> Result<serde_json::Value, String> {
    let jeton = etat.jeton()?;
    let chemin = format!("/api/dresseurs/{}/profils", urlencode(&pseudo));
    appeler(reqwest::Method::GET, &chemin, &jeton, None).await
}

#[tauri::command]
async fn dex_de(
    etat: State<'_, Etat>,
    pseudo: String,
    profil: Option<i64>,
) -> Result<serde_json::Value, String> {
    let jeton = etat.jeton()?;
    let chemin = format!("/api/dex/{}{}", urlencode(&pseudo), param_profil(profil));
    appeler(reqwest::Method::GET, &chemin, &jeton, None).await
}

#[tauri::command]
async fn changer_pseudo(
    etat: State<'_, Etat>,
    pseudo: String,
) -> Result<serde_json::Value, String> {
    let jeton = etat.jeton()?;
    let corps = serde_json::json!({ "pseudo": pseudo });
    appeler(reqwest::Method::POST, "/api/pseudo", &jeton, Some(corps)).await
}

fn urlencode(s: &str) -> String {
    s.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'_' | b'.' | b'~' => {
                (b as char).to_string()
            }
            _ => format!("%{b:02X}"),
        })
        .collect()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .setup(|app| {
            let fichier = app
                .path()
                .app_config_dir()
                .map(|d| d.join("session.json"))
                .unwrap_or_else(|_| PathBuf::from("session.json"));

            // Une session déjà présente évite de redemander Discord à chaque
            // lancement.
            let session = std::fs::read_to_string(&fichier)
                .ok()
                .and_then(|t| serde_json::from_str::<Session>(&t).ok())
                .filter(|s| !s.jeton.is_empty());

            app.manage(Etat {
                session: Mutex::new(session),
                fichier,
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            etat,
            connexion,
            deconnexion,
            moi,
            lire_dex,
            ecrire_dex,
            profils,
            creer_profil,
            modifier_profil,
            supprimer_profil,
            historique,
            dresseurs,
            profils_de,
            dex_de,
            changer_pseudo
        ])
        .run(tauri::generate_context!())
        .expect("erreur au lancement de PokéArchive");
}
