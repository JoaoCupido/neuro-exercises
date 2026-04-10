use std::env;
use std::net::TcpListener;
use tauri::{Manager, State};

// Create a struct to hold the port in Tauri's state
struct PortState(u16);

fn reserve_port(start_port: u16) -> (u16, TcpListener) {
    let mut port = start_port;
    loop {
        match TcpListener::bind(("127.0.0.1", port)) {
            Ok(listener) => {
                println!("Reserved port: {}", port);
                return (port, listener);
            }
            Err(_) => {
                port += 1;
            }
        }

        if port > start_port + 1000 {
            panic!("Could not find an available port within range");
        }
    }
}

// Create a command to get the port
#[tauri::command]
fn get_port(state: State<'_, PortState>) -> Result<u16, String> {
    Ok(state.0)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let args: Vec<String> = env::args().collect();

    // Start with your desired port, but find the next available one
    let desired_port: u16 = 9527;
    let (port, _listener) = reserve_port(desired_port);

    tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_localhost::Builder::new(port).build())
        .manage(PortState(port)) // Store the port in Tauri's state
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
        .invoke_handler(tauri::generate_handler![get_port]) // Register the command
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
