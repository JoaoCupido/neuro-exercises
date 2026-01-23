use std::env;
use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let port: u16 = 9527;
    let args: Vec<String> = env::args().collect();

    tauri::Builder::default()
        .plugin(tauri_plugin_localhost::Builder::new(port).build())
        .setup(move |app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            if let Some(window) = app.get_webview_window("main") {
                #[cfg(not(any(target_os = "android", target_os = "ios")))]
                {
                    if args.iter().any(|a| a == "--hidden") {
                        window.hide().unwrap();
                    } else {
                        window.show().unwrap();
                    }
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
