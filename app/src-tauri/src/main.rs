// Point d'entrée de PokéArchive.
// windows_subsystem = "windows" : pas de fenêtre de console noire au lancement.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    pokearchive_lib::run()
}
