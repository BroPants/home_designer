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
    use std::path::Path;

    log::info!("Starting upload_image: project={}, filename={}, type={:?}", project_id, filename, image_type);
    log::info!("Image data size: {} bytes", image_data.len());

    // 从文件名提取扩展名，保留原始格式
    let ext = Path::new(&filename)
        .extension()
        .and_then(|e| e.to_str())
        .map(|e| e.to_lowercase())
        .unwrap_or_else(|| "jpg".to_string());
    
    // 验证支持的格式
    let ext = match ext.as_str() {
        "png" => "png",
        "jpg" | "jpeg" => "jpg",
        "webp" => "webp",
        _ => {
            log::warn!("Unknown extension '{}', defaulting to jpg", ext);
            "jpg"
        }
    };
    
    log::info!("Detected file extension: {}", ext);

    let mut storage = STORAGE.lock().map_err(|e| e.to_string())?;
    let image_service = ImageService::new();

    let image_id = image_service.generate_image_id();
    let project_dir = storage.get_project_dir(&project_id);
    
    log::info!("Project directory: {:?}", project_dir);

    // 确保项目目录存在
    fs::create_dir_all(&project_dir).map_err(|e| format!("Failed to create project dir: {}", e))?;

    // 确定存储子目录
    let (subdir, _) = match image_type {
        ImageType::FloorPlan => ("floor_plan", 400),
        ImageType::Photo => ("photos", 400),
    };

    // 确保子目录存在
    let subdir_path = project_dir.join(subdir);
    let thumbnail_dir = project_dir.join("thumbnails");
    
    log::info!("Creating directories: subdir={:?}, thumbnail={:?}", subdir_path, thumbnail_dir);
    
    fs::create_dir_all(&subdir_path).map_err(|e| format!("Failed to create subdir: {}", e))?;
    fs::create_dir_all(&thumbnail_dir).map_err(|e| format!("Failed to create thumbnail dir: {}", e))?;

    // 使用原始格式保存原图，缩略图统一用 jpg
    let image_path = subdir_path.join(format!("{}.{}", image_id, ext));
    let thumbnail_path = thumbnail_dir.join(format!("{}_thumb.jpg", image_id));
    
    log::info!("Image paths: image={:?}, thumbnail={:?}", image_path, thumbnail_path);

    // 保存原图并获取尺寸
    log::info!("Saving image from bytes...");
    let (width, height) = image_service
        .save_from_bytes(&image_data, &image_path)
        .map_err(|e| format!("Failed to save image: {:?}", e))?;
    
    log::info!("Image saved: {}x{}", width, height);

    // 生成缩略图
    log::info!("Generating thumbnail...");
    image_service
        .generate_thumbnail(&image_path, &thumbnail_path, 400)
        .map_err(|e| format!("Failed to generate thumbnail: {:?}", e))?;

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
    use crate::services::kimi::KimiClient;
    use crate::services::image::ImageService;

    log::info!("Sending message for project {}: {}", project_id, content);

    // 从 storage 获取数据
    let (api_key, history_messages, image_paths) = {
        let mut storage = STORAGE.lock().map_err(|e| e.to_string())?;

        // 获取 API Key
        let api_key = storage
            .get_api_key()
            .map_err(|e| e.to_string())?
            .ok_or("API key not set")?;

        // 获取项目信息
        let project = storage
            .get_project(&project_id)
            .map_err(|e| e.to_string())?
            .ok_or("Project not found")?;

        // 获取对话历史
        let mut history_messages: Vec<Message> = Vec::new();
        if let Some(conversation) = project.conversations.first() {
            // 取最近 10 条消息作为上下文
            let start = conversation.messages.len().saturating_sub(10);
            history_messages = conversation.messages[start..].to_vec();
        }

        // 收集图片路径
        let mut image_paths = Vec::new();
        if let Some(ids) = image_ids {
            for image_id in ids {
                if let Ok(Some(image)) = storage.get_image(&image_id) {
                    image_paths.push(image.path);
                }
            }
        }

        (api_key, history_messages, image_paths)
    }; // MutexGuard 在这里释放

    // 处理图片 - 转换为 base64
    let mut image_base64_list = Vec::new();
    if !image_paths.is_empty() {
        let image_service = ImageService::new();
        for path in image_paths {
            match image_service.image_to_base64(std::path::Path::new(&path)) {
                Ok(base64) => image_base64_list.push(base64),
                Err(e) => log::warn!("Failed to encode image at {}: {}", path, e),
            }
        }
    }

    // 构建当前用户消息
    let user_message = Message {
        id: uuid::Uuid::new_v4().to_string(),
        role: MessageRole::User,
        content: content.clone(),
        images: if image_base64_list.is_empty() { None } else { Some(image_base64_list.clone()) },
        timestamp: chrono::Utc::now().timestamp_millis(),
        metadata: None,
    };

    // 合并历史消息和当前消息
    let mut all_messages = history_messages;
    all_messages.push(user_message.clone());

    // 保存用户消息到数据库
    {
        let mut storage = STORAGE.lock().map_err(|e| e.to_string())?;
        storage.add_message(&project_id, &user_message).map_err(|e| e.to_string())?;
    }

    // 调用 Kimi API
    let kimi = KimiClient::new(api_key);
    
    // 如果有图片，使用多模态对话
    let ai_content = if !image_base64_list.is_empty() {
        kimi.chat_with_images(content, image_base64_list).await
    } else {
        kimi.chat(all_messages).await
    }.map_err(|e| format!("AI API error: {}", e))?;

    // 创建 AI 响应消息
    let ai_message = Message {
        id: uuid::Uuid::new_v4().to_string(),
        role: MessageRole::Assistant,
        content: ai_content,
        images: None,
        timestamp: chrono::Utc::now().timestamp_millis(),
        metadata: Some(MessageMetadata {
            rendering_id: None,
            tokens_used: None,
        }),
    };

    // 保存 AI 消息到数据库
    {
        let mut storage = STORAGE.lock().map_err(|e| e.to_string())?;
        storage.add_message(&project_id, &ai_message).map_err(|e| e.to_string())?;
    }

    log::info!("Message exchange completed for project {}", project_id);
    Ok(ai_message.id)
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
    _format: ExportFormat,
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
