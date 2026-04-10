use crate::models::*;
use crate::services::db::Database;
use anyhow::{Context, Result};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

pub struct Storage {
    data_dir: PathBuf,
    db: Database,
}

impl Storage {
    pub fn new() -> Result<Self> {
        // 获取应用数据目录
        let data_dir = dirs::data_dir()
            .context("Failed to get data directory")?
            .join("Home Designer");

        // 创建目录结构
        fs::create_dir_all(&data_dir)?;
        fs::create_dir_all(data_dir.join("projects"))?;

        // 初始化数据库
        let db_path = data_dir.join("database.sqlite");
        let db = Database::new(&db_path)?;

        log::info!("Storage initialized at: {:?}", data_dir);
        log::info!("Database: {:?}", db_path);

        Ok(Self { data_dir, db })
    }

    // ==================== 项目操作 ====================

    pub fn create_project(&mut self, name: String, description: Option<String>) -> Result<Project> {
        let id = uuid::Uuid::new_v4().to_string();
        let now = chrono::Utc::now().timestamp_millis();

        let project = Project {
            id: id.clone(),
            name,
            created_at: now,
            updated_at: now,
            description,
            floor_plan: None,
            photos: vec![],
            conversations: vec![],
            renderings: vec![],
        };

        // 创建项目目录
        let project_dir = self.get_project_dir(&id);
        fs::create_dir_all(&project_dir)?;
        fs::create_dir_all(project_dir.join("floor_plan"))?;
        fs::create_dir_all(project_dir.join("photos"))?;
        fs::create_dir_all(project_dir.join("thumbnails"))?;
        fs::create_dir_all(project_dir.join("renderings"))?;

        // 保存到数据库
        self.db.create_project(&project)?;

        log::info!("Created project: {}", id);
        Ok(project)
    }

    pub fn get_project(&self, id: &str) -> Result<Option<Project>> {
        self.db.get_project_full(id)
    }

    pub fn list_projects(&self) -> Result<Vec<ProjectSummary>> {
        let mut summaries = self.db.list_projects()?;

        // 补充统计数据
        for summary in &mut summaries {
            if let Ok(Some(project)) = self.db.get_project_full(&summary.id) {
                summary.message_count = project
                    .conversations
                    .iter()
                    .map(|c| c.messages.len() as i32)
                    .sum();
                summary.rendering_count = project.renderings.len() as i32;
                summary.thumbnail_path = project
                    .renderings
                    .first()
                    .map(|r| r.thumbnail_path.clone());
            }
        }

        Ok(summaries)
    }

    pub fn delete_project(&mut self, id: &str) -> Result<()> {
        // 从数据库删除
        self.db.delete_project(id)?;

        // 删除项目目录
        let project_dir = self.get_project_dir(id);
        if project_dir.exists() {
            fs::remove_dir_all(&project_dir)?;
        }

        log::info!("Deleted project: {}", id);
        Ok(())
    }

    pub fn update_project(&mut self, id: &str, updates: ProjectUpdate) -> Result<()> {
        self.db
            .update_project(id, updates.name.as_deref(), updates.description.as_deref())?;
        log::info!("Updated project: {}", id);
        Ok(())
    }

    // ==================== 图片操作 ====================

    pub fn save_image(
        &mut self,
        project_id: &str,
        image: &ImageFile,
        image_type: ImageType,
    ) -> Result<()> {
        let type_str = match image_type {
            ImageType::FloorPlan => "floor_plan",
            ImageType::Photo => "photo",
        };

        self.db.save_image(image, project_id, type_str)?;
        self.db.touch_project(project_id)?;

        log::info!("Saved image {} for project {}", image.id, project_id);
        Ok(())
    }

    pub fn delete_image(&mut self, image_id: &str) -> Result<()> {
        // 获取图片信息以删除文件
        if let Ok(Some(image)) = self.db.get_image(image_id) {
            // 删除文件
            let _ = fs::remove_file(&image.path);
            let _ = fs::remove_file(&image.thumbnail_path);

            // 从数据库删除
            self.db.delete_image(image_id)?;

            log::info!("Deleted image: {}", image_id);
        }

        Ok(())
    }

    pub fn get_image(&self, image_id: &str) -> Result<Option<ImageFile>> {
        self.db.get_image(image_id)
    }

    // ==================== 对话操作 ====================

    pub fn add_conversation(&mut self, project_id: &str, conversation: &Conversation) -> Result<()> {
        self.db.create_conversation(conversation, project_id)?;
        self.db.touch_project(project_id)?;

        log::info!(
            "Added conversation {} to project {}",
            conversation.id,
            project_id
        );
        Ok(())
    }

    // ==================== 效果图操作 ====================

    pub fn save_rendering(&mut self, project_id: &str, rendering: &Rendering) -> Result<()> {
        self.db.save_rendering(rendering, project_id)?;
        self.db.touch_project(project_id)?;

        log::info!(
            "Saved rendering {} for project {}",
            rendering.id,
            project_id
        );
        Ok(())
    }

    // ==================== 设置操作 ====================

    pub fn get_api_key(&self) -> Result<Option<String>> {
        self.db.get_setting("api_key")
    }

    pub fn set_api_key(&mut self, api_key: String) -> Result<()> {
        self.db.set_setting("api_key", &api_key)?;
        log::info!("API key updated");
        Ok(())
    }

    pub fn get_settings(&self) -> Result<HashMap<String, serde_json::Value>> {
        self.db.get_all_settings()
    }

    pub fn save_settings(&mut self, settings: HashMap<String, serde_json::Value>) -> Result<()> {
        self.db.save_settings(&settings)?;
        log::info!("Settings saved");
        Ok(())
    }

    // ==================== 工具方法 ====================

    pub fn get_data_dir(&self) -> &PathBuf {
        &self.data_dir
    }

    pub fn get_project_dir(&self, project_id: &str) -> PathBuf {
        self.data_dir.join("projects").join(project_id)
    }
}

// 项目更新结构
#[derive(Debug, Default)]
pub struct ProjectUpdate {
    pub name: Option<String>,
    pub description: Option<String>,
}
