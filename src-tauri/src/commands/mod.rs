use crate::models::*;
use crate::services::storage::ProjectUpdate;
use crate::services::STORAGE;
use tauri::command;

// ==================== 项目相关命令 ====================

#[command]
pub async fn create_project(name: String, description: Option<String>) -> Result<Project, String> {
    let mut storage = STORAGE.lock().map_err(|e| e.to_string())?;
    storage.create_project(name, description).map_err(|e| e.to_string())
}

#[command]
pub async fn get_project(id: String) -> Result<Project, String> {
    let storage = STORAGE.lock().map_err(|e| e.to_string())?;
    storage
        .get_project(&id)
        .map_err(|e| e.to_string())?
        .ok_or_else(|| "Project not found".to_string())
}

#[command]
pub async fn list_projects() -> Result<Vec<ProjectSummary>, String> {
    let storage = STORAGE.lock().map_err(|e| e.to_string())?;
    storage.list_projects().map_err(|e| e.to_string())
}

#[command]
pub async fn delete_project(id: String) -> Result<(), String> {
    let mut storage = STORAGE.lock().map_err(|e| e.to_string())?;
    storage.delete_project(&id).map_err(|e| e.to_string())
}

#[command]
pub async fn update_project_name(id: String, name: String) -> Result<(), String> {
    let mut storage = STORAGE.lock().map_err(|e| e.to_string())?;
    let update = ProjectUpdate {
        name: Some(name),
        description: None,
    };
    storage.update_project(&id, update).map_err(|e| e.to_string())
}

// ==================== 图片相关命令 ====================

#[command]
pub async fn upload_image(
    project_id: String,
    image_data: Vec<u8>,
    filename: String,
    image_type: ImageType,
) -> Result<ImageFile, String> {
    use crate::services::image::ImageService;
    use std::fs;

    let mut storage = STORAGE.lock().map_err(|e| e.to_string())?;
    let image_service = ImageService::new();

    let image_id = image_service.generate_image_id();
    let project_dir = storage.get_project_dir(&project_id);

    // 确定存储子目录
    let (subdir, _) = match image_type {
        ImageType::FloorPlan => ("floor_plan", 400),
        ImageType::Photo => ("photos", 400),
    };

    // 确保子目录存在
    let subdir_path = project_dir.join(subdir);
    let thumbnail_dir = project_dir.join("thumbnails");
    fs::create_dir_all(&subdir_path).map_err(|e| e.to_string())?;
    fs::create_dir_all(&thumbnail_dir).map_err(|e| e.to_string())?;

    let image_path = subdir_path.join(format!("{}.jpg", image_id));
    let thumbnail_path = thumbnail_dir.join(format!("{}_thumb.jpg", image_id));

    // 保存原图并获取尺寸
    let (width, height) = image_service
        .save_from_bytes(&image_data, &image_path)
        .map_err(|e| format!("Failed to save image: {}", e))?;

    // 生成缩略图
    image_service
        .generate_thumbnail(&image_path, &thumbnail_path, 400)
        .map_err(|e| format!("Failed to generate thumbnail: {}", e))?;

    let image_file = ImageFile {
        id: image_id,
        filename,
        path: image_path.to_string_lossy().to_string(),
        thumbnail_path: thumbnail_path.to_string_lossy().to_string(),
        size: image_data.len() as i64,
        width,
        height,
        uploaded_at: chrono::Utc::now().timestamp_millis(),
    };

    // 保存到数据库
    storage
        .save_image(&project_id, &image_file, image_type)
        .map_err(|e| e.to_string())?;

    log::info!("Image uploaded: {} for project {}", image_file.id, project_id);
    Ok(image_file)
}

#[command]
pub async fn delete_image(image_id: String) -> Result<(), String> {
    let mut storage = STORAGE.lock().map_err(|e| e.to_string())?;
    storage.delete_image(&image_id).map_err(|e| e.to_string())
}

#[command]
pub async fn read_image_file(path: String) -> Result<Vec<u8>, String> {
    std::fs::read(&path).map_err(|e| e.to_string())
}

// ==================== AI 对话相关命令 ====================

#[command]
pub async fn send_message(
    project_id: String,
    content: String,
    image_ids: Option<Vec<String>>,
) -> Result<String, String> {
    let storage = STORAGE.lock().map_err(|e| e.to_string())?;

    // 获取 API Key
    let api_key = storage
        .get_api_key()
        .map_err(|e| e.to_string())?
        .ok_or("API key not set")?;

    // 获取项目信息用于上下文
    let project = storage
        .get_project(&project_id)
        .map_err(|e| e.to_string())?
        .ok_or("Project not found")?;

    // 构建消息
    let message_id = uuid::Uuid::new_v4().to_string();

    // TODO: 实现完整的对话历史管理和流式响应
    // 目前返回消息 ID，前端通过轮询或其他方式获取响应

    log::info!("Message sent: {} for project {}", message_id, project_id);
    Ok(message_id)
}

#[command]
pub async fn generate_rendering(
    project_id: String,
    prompt: String,
) -> Result<Rendering, String> {
    use crate::services::image::ImageService;

    let mut storage = STORAGE.lock().map_err(|e| e.to_string())?;

    let rendering_id = uuid::Uuid::new_v4().to_string();
    let project_dir = storage.get_project_dir(&project_id);

    let image_path = project_dir
        .join("renderings")
        .join(format!("{}.png", rendering_id));
    let thumbnail_path = project_dir
        .join("thumbnails")
        .join(format!("{}_thumb.png", rendering_id));

    // TODO: 调用 AI 生成实际图片
    // 目前创建占位图

    let rendering = Rendering {
        id: rendering_id,
        prompt,
        image_path: image_path.to_string_lossy().to_string(),
        thumbnail_path: thumbnail_path.to_string_lossy().to_string(),
        created_at: chrono::Utc::now().timestamp_millis(),
        based_on: vec![],
    };

    // 保存到数据库
    storage
        .save_rendering(&project_id, &rendering)
        .map_err(|e| e.to_string())?;

    log::info!(
        "Rendering generated: {} for project {}",
        rendering.id,
        project_id
    );
    Ok(rendering)
}

// ==================== 导出相关命令 ====================

#[command]
pub async fn export_project(
    project_id: String,
    format: ExportFormat,
) -> Result<String, String> {
    let storage = STORAGE.lock().map_err(|e| e.to_string())?;

    let project = storage
        .get_project(&project_id)
        .map_err(|e| e.to_string())?
        .ok_or("Project not found")?;

    // TODO: 实现导出逻辑
    let export_path = storage
        .get_data_dir()
        .join(format!("export_{}.json", project_id));

    let export_data = serde_json::to_string_pretty(&project).map_err(|e| e.to_string())?;
    std::fs::write(&export_path, export_data).map_err(|e| e.to_string())?;

    log::info!("Project exported: {} to {:?}", project_id, export_path);
    Ok(export_path.to_string_lossy().to_string())
}

// ==================== 设置相关命令 ====================

#[command]
pub async fn get_api_key() -> Result<Option<String>, String> {
    let storage = STORAGE.lock().map_err(|e| e.to_string())?;
    storage.get_api_key().map_err(|e| e.to_string())
}

#[command]
pub async fn set_api_key(api_key: String) -> Result<(), String> {
    let mut storage = STORAGE.lock().map_err(|e| e.to_string())?;
    storage.set_api_key(api_key).map_err(|e| e.to_string())
}

#[command]
pub async fn get_settings() -> Result<std::collections::HashMap<String, serde_json::Value>, String> {
    let storage = STORAGE.lock().map_err(|e| e.to_string())?;
    storage.get_settings().map_err(|e| e.to_string())
}

#[command]
pub async fn save_settings(
    settings: std::collections::HashMap<String, serde_json::Value>,
) -> Result<(), String> {
    let mut storage = STORAGE.lock().map_err(|e| e.to_string())?;
    storage.save_settings(settings).map_err(|e| e.to_string())
}
