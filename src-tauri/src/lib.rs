#[tauri::command]
fn get_desktop_info() -> Result<serde_json::Value, String> {
    Ok(serde_json::json!({
        "platform": "windows",
        "app_name": "E-Studio",
        "version": "1.0.0",
        "is_tauri": true
    }))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_desktop_info])
        .setup(|_app| {
            #[cfg(debug_assertions)]
            {
                use tauri::Manager;
                if let Some(window) = _app.get_webview_window("main") {
                    let _ = window.open_devtools();
                }
            }
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
