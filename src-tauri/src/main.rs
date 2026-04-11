// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;
mod models;
mod services;

use commands::*;
use tauri::Manager;

fn main() {
    env_logger::init();
    
    tauri::Builder::default()
        .setup(|app| {
            // 获取应用数据目录并记录日志
            let data_dir = app.path_resolver().app_data_dir().expect("Failed to get data dir");
            log::info!("[Setup] App data directory: {:?}", data_dir);
            Ok(())
        })
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
            clear_conversation,
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
