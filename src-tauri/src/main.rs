// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod services;

use commands::*;

fn main() {
    env_logger::init();
    
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            // 项目相关
            create_project,
            get_project,
            list_projects,
            delete_project,
            update_project_name,
            // 图片相关
            upload_image,
            delete_image,
            read_image_file,
            // AI 对话相关
            send_message,
            generate_rendering,
            // 导出相关
            export_project,
            // 设置相关
            get_api_key,
            set_api_key,
            get_settings,
            save_settings,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
