use crate::models::*;
use anyhow::{Context, Result};
use rusqlite::{Connection, OptionalExtension, params};
use std::collections::HashMap;
use std::path::Path;

/// 数据库管理器
pub struct Database {
    conn: Connection,
}

impl Database {
    /// 创建或打开数据库
    pub fn new<P: AsRef<Path>>(db_path: P) -> Result<Self> {
        let conn = Connection::open(db_path).context("Failed to open database")?;
        let db = Self { conn };
        db.init_tables()?;
        Ok(db)
    }

    /// 初始化数据库表
    fn init_tables(&self) -> Result<()> {
        // 项目表
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS projects (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                created_at INTEGER NOT NULL,
                updated_at INTEGER NOT NULL
            )",
            [],
        )?;

        // 图片表
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS images (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                filename TEXT NOT NULL,
                path TEXT NOT NULL,
                thumbnail_path TEXT NOT NULL,
                size INTEGER NOT NULL,
                width INTEGER NOT NULL,
                height INTEGER NOT NULL,
                uploaded_at INTEGER NOT NULL,
                image_type TEXT NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // 对话表
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // 消息表
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS messages (
                id TEXT PRIMARY KEY,
                conversation_id TEXT NOT NULL,
                role TEXT NOT NULL,
                content TEXT NOT NULL,
                images TEXT,
                timestamp INTEGER NOT NULL,
                rendering_id TEXT,
                tokens_used INTEGER,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // 效果图表
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS renderings (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                prompt TEXT NOT NULL,
                image_path TEXT NOT NULL,
                thumbnail_path TEXT NOT NULL,
                created_at INTEGER NOT NULL,
                based_on TEXT,
                FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
            )",
            [],
        )?;

        // 设置表
        self.conn.execute(
            "CREATE TABLE IF NOT EXISTS settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        // 启用外键约束
        self.conn.execute("PRAGMA foreign_keys = ON", [])?;

        Ok(())
    }

    // ==================== 项目操作 ====================

    /// 创建项目
    pub fn create_project(&self, project: &Project) -> Result<()> {
        self.conn.execute(
            "INSERT INTO projects (id, name, description, created_at, updated_at)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![
                project.id,
                project.name,
                project.description,
                project.created_at,
                project.updated_at
            ],
        )?;
        Ok(())
    }

    /// 获取项目
    pub fn get_project(&self, id: &str) -> Result<Option<Project>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, description, created_at, updated_at FROM projects WHERE id = ?1"
        )?;

        let project = stmt
            .query_row([id], |row| {
                Ok(Project {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    description: row.get(2)?,
                    created_at: row.get(3)?,
                    updated_at: row.get(4)?,
                    floor_plan: None,
                    photos: vec![],
                    conversations: vec![],
                    renderings: vec![],
                })
            })
            .optional()?;

        Ok(project)
    }

    /// 获取完整项目（包含所有关联数据）
    pub fn get_project_full(&self, id: &str) -> Result<Option<Project>> {
        let mut project = match self.get_project(id)? {
            Some(p) => p,
            None => return Ok(None),
        };

        // 加载图片
        project.floor_plan = self.get_floor_plan(id)?;
        project.photos = self.get_photos(id)?;

        // 加载对话
        project.conversations = self.get_conversations(id)?;

        // 加载效果图
        project.renderings = self.get_renderings(id)?;

        Ok(Some(project))
    }

    /// 列出所有项目摘要
    pub fn list_projects(&self) -> Result<Vec<ProjectSummary>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, name, created_at, updated_at FROM projects ORDER BY updated_at DESC"
        )?;

        let projects = stmt
            .query_map([], |row| {
                let id: String = row.get(0)?;
                Ok(ProjectSummary {
                    id: id.clone(),
                    name: row.get(1)?,
                    created_at: row.get(2)?,
                    updated_at: row.get(3)?,
                    thumbnail_path: None,
                    message_count: 0,
                    rendering_count: 0,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(projects)
    }

    /// 更新项目
    pub fn update_project(&self, id: &str, name: Option<&str>, description: Option<&str>) -> Result<()> {
        let now = chrono::Utc::now().timestamp_millis();
        
        if let Some(name) = name {
            self.conn.execute(
                "UPDATE projects SET name = ?1, updated_at = ?2 WHERE id = ?3",
                params![name, now, id],
            )?;
        }
        
        if let Some(description) = description {
            self.conn.execute(
                "UPDATE projects SET description = ?1, updated_at = ?2 WHERE id = ?3",
                params![description, now, id],
            )?;
        }
        
        Ok(())
    }

    /// 删除项目
    pub fn delete_project(&self, id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM projects WHERE id = ?1", [id])?;
        Ok(())
    }

    /// 更新项目时间戳
    pub fn touch_project(&self, id: &str) -> Result<()> {
        let now = chrono::Utc::now().timestamp_millis();
        self.conn.execute(
            "UPDATE projects SET updated_at = ?1 WHERE id = ?2",
            params![now, id],
        )?;
        Ok(())
    }

    // ==================== 图片操作 ====================

    /// 保存图片
    pub fn save_image(&self, image: &ImageFile, project_id: &str, image_type: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO images (id, project_id, filename, path, thumbnail_path, size, width, height, uploaded_at, image_type)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
            params![
                image.id,
                project_id,
                image.filename,
                image.path,
                image.thumbnail_path,
                image.size,
                image.width,
                image.height,
                image.uploaded_at,
                image_type
            ],
        )?;
        Ok(())
    }

    /// 获取户型图
    fn get_floor_plan(&self, project_id: &str) -> Result<Option<ImageFile>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, filename, path, thumbnail_path, size, width, height, uploaded_at 
             FROM images WHERE project_id = ?1 AND image_type = 'floor_plan' LIMIT 1"
        )?;

        let image = stmt
            .query_row([project_id], |row| {
                Ok(ImageFile {
                    id: row.get(0)?,
                    filename: row.get(1)?,
                    path: row.get(2)?,
                    thumbnail_path: row.get(3)?,
                    size: row.get(4)?,
                    width: row.get(5)?,
                    height: row.get(6)?,
                    uploaded_at: row.get(7)?,
                })
            })
            .optional()?;

        Ok(image)
    }

    /// 获取实拍图
    fn get_photos(&self, project_id: &str) -> Result<Vec<ImageFile>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, filename, path, thumbnail_path, size, width, height, uploaded_at 
             FROM images WHERE project_id = ?1 AND image_type = 'photo' ORDER BY uploaded_at"
        )?;

        let photos = stmt
            .query_map([project_id], |row| {
                Ok(ImageFile {
                    id: row.get(0)?,
                    filename: row.get(1)?,
                    path: row.get(2)?,
                    thumbnail_path: row.get(3)?,
                    size: row.get(4)?,
                    width: row.get(5)?,
                    height: row.get(6)?,
                    uploaded_at: row.get(7)?,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(photos)
    }

    /// 删除图片
    pub fn delete_image(&self, image_id: &str) -> Result<()> {
        self.conn.execute("DELETE FROM images WHERE id = ?1", [image_id])?;
        Ok(())
    }

    /// 获取图片信息
    pub fn get_image(&self, image_id: &str) -> Result<Option<ImageFile>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, filename, path, thumbnail_path, size, width, height, uploaded_at 
             FROM images WHERE id = ?1"
        )?;

        let image = stmt
            .query_row([image_id], |row| {
                Ok(ImageFile {
                    id: row.get(0)?,
                    filename: row.get(1)?,
                    path: row.get(2)?,
                    thumbnail_path: row.get(3)?,
                    size: row.get(4)?,
                    width: row.get(5)?,
                    height: row.get(6)?,
                    uploaded_at: row.get(7)?,
                })
            })
            .optional()?;

        Ok(image)
    }

    // ==================== 对话操作 ====================

    /// 创建对话
    pub fn create_conversation(&self, conversation: &Conversation, project_id: &str) -> Result<()> {
        self.conn.execute(
            "INSERT INTO conversations (id, project_id, created_at) VALUES (?1, ?2, ?3)",
            params![conversation.id, project_id, conversation.created_at],
        )?;

        // 插入消息
        for message in &conversation.messages {
            self.save_message(message, &conversation.id)?;
        }

        Ok(())
    }

    /// 获取或创建项目的对话
    pub fn get_or_create_conversation(&self, project_id: &str) -> Result<String> {
        // 尝试获取现有对话
        let mut stmt = self.conn.prepare(
            "SELECT id FROM conversations WHERE project_id = ?1 ORDER BY created_at DESC LIMIT 1"
        )?;
        
        let existing: Option<String> = stmt
            .query_row([project_id], |row| row.get(0))
            .optional()?;
        
        if let Some(id) = existing {
            Ok(id)
        } else {
            // 创建新对话
            let id = uuid::Uuid::new_v4().to_string();
            let now = chrono::Utc::now().timestamp_millis();
            
            self.conn.execute(
                "INSERT INTO conversations (id, project_id, created_at) VALUES (?1, ?2, ?3)",
                params![id, project_id, now],
            )?;
            
            Ok(id)
        }
    }

    /// 保存消息
    pub fn save_message(&self, message: &Message, conversation_id: &str) -> Result<()> {
        let images_json = message.images.as_ref().map(|imgs| {
            serde_json::to_string(imgs).unwrap_or_default()
        });
        
        let rendering_id = message.metadata.as_ref().and_then(|m| m.rendering_id.clone());
        let tokens_used = message.metadata.as_ref().and_then(|m| m.tokens_used);

        let role_str = match message.role {
            MessageRole::User => "user",
            MessageRole::Assistant => "assistant",
            MessageRole::System => "system",
        };

        self.conn.execute(
            "INSERT INTO messages (id, conversation_id, role, content, images, timestamp, rendering_id, tokens_used)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
            params![
                message.id,
                conversation_id,
                role_str,
                message.content,
                images_json,
                message.timestamp,
                rendering_id,
                tokens_used
            ],
        )?;

        Ok(())
    }

    /// 获取项目的所有对话
    fn get_conversations(&self, project_id: &str) -> Result<Vec<Conversation>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, created_at FROM conversations WHERE project_id = ?1 ORDER BY created_at"
        )?;

        let conversations = stmt
            .query_map([project_id], |row| {
                let id: String = row.get(0)?;
                let messages = self.get_messages(&id).unwrap_or_default();
                Ok(Conversation {
                    id,
                    created_at: row.get(1)?,
                    messages,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(conversations)
    }

    /// 获取对话的所有消息
    fn get_messages(&self, conversation_id: &str) -> Result<Vec<Message>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, role, content, images, timestamp, rendering_id, tokens_used 
             FROM messages WHERE conversation_id = ?1 ORDER BY timestamp"
        )?;

        let messages = stmt
            .query_map([conversation_id], |row| {
                let role_str: String = row.get(1)?;
                let role = match role_str.as_str() {
                    "user" => MessageRole::User,
                    "assistant" => MessageRole::Assistant,
                    _ => MessageRole::System,
                };

                let images: Option<Vec<String>> = row
                    .get::<_, Option<String>>(3)?
                    .and_then(|s| serde_json::from_str(&s).ok());

                let rendering_id: Option<String> = row.get(5)?;
                let tokens_used: Option<i32> = row.get(6)?;
                
                let metadata = if rendering_id.is_some() || tokens_used.is_some() {
                    Some(MessageMetadata {
                        rendering_id,
                        tokens_used,
                    })
                } else {
                    None
                };

                Ok(Message {
                    id: row.get(0)?,
                    role,
                    content: row.get(2)?,
                    images,
                    timestamp: row.get(4)?,
                    metadata,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(messages)
    }

    // ==================== 效果图操作 ====================

    /// 保存效果图
    pub fn save_rendering(&self, rendering: &Rendering, project_id: &str) -> Result<()> {
        let based_on_json = serde_json::to_string(&rendering.based_on).unwrap_or_default();

        self.conn.execute(
            "INSERT INTO renderings (id, project_id, prompt, image_path, thumbnail_path, created_at, based_on)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                rendering.id,
                project_id,
                rendering.prompt,
                rendering.image_path,
                rendering.thumbnail_path,
                rendering.created_at,
                based_on_json
            ],
        )?;

        Ok(())
    }

    /// 获取项目的所有效果图
    fn get_renderings(&self, project_id: &str) -> Result<Vec<Rendering>> {
        let mut stmt = self.conn.prepare(
            "SELECT id, prompt, image_path, thumbnail_path, created_at, based_on 
             FROM renderings WHERE project_id = ?1 ORDER BY created_at"
        )?;

        let renderings = stmt
            .query_map([project_id], |row| {
                let based_on_json: String = row.get(5)?;
                let based_on: Vec<String> = serde_json::from_str(&based_on_json).unwrap_or_default();

                Ok(Rendering {
                    id: row.get(0)?,
                    prompt: row.get(1)?,
                    image_path: row.get(2)?,
                    thumbnail_path: row.get(3)?,
                    created_at: row.get(4)?,
                    based_on,
                })
            })?
            .collect::<Result<Vec<_>, _>>()?;

        Ok(renderings)
    }

    // ==================== 设置操作 ====================

    /// 获取设置
    pub fn get_setting(&self, key: &str) -> Result<Option<String>> {
        let mut stmt = self.conn.prepare("SELECT value FROM settings WHERE key = ?1")?;
        let value: Option<String> = stmt.query_row([key], |row| row.get(0)).optional()?;
        Ok(value)
    }

    /// 设置值
    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        self.conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?1, ?2)",
            params![key, value],
        )?;
        Ok(())
    }

    /// 获取所有设置
    pub fn get_all_settings(&self) -> Result<HashMap<String, serde_json::Value>> {
        let mut stmt = self.conn.prepare("SELECT key, value FROM settings")?;
        let rows = stmt.query_map([], |row| {
            let key: String = row.get(0)?;
            let value: String = row.get(1)?;
            Ok((key, value))
        })?;

        let mut settings = HashMap::new();
        for row in rows {
            let (key, value_str) = row?;
            if let Ok(value) = serde_json::from_str::<serde_json::Value>(&value_str) {
                settings.insert(key, value);
            } else {
                settings.insert(key, serde_json::Value::String(value_str));
            }
        }

        Ok(settings)
    }

    /// 批量保存设置
    pub fn save_settings(&self, settings: &HashMap<String, serde_json::Value>) -> Result<()> {
        for (key, value) in settings {
            let value_str = serde_json::to_string(value)?;
            self.set_setting(key, &value_str)?;
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::TempDir;

    fn setup_test_db() -> (Database, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let db_path = temp_dir.path().join("test.db");
        let db = Database::new(&db_path).unwrap();
        (db, temp_dir)
    }

    #[test]
    fn test_create_and_get_project() {
        let (db, _temp) = setup_test_db();

        let project = Project {
            id: "test-123".to_string(),
            name: "Test Project".to_string(),
            created_at: 1234567890,
            updated_at: 1234567890,
            description: Some("Test description".to_string()),
            floor_plan: None,
            photos: vec![],
            conversations: vec![],
            renderings: vec![],
        };

        // 创建项目
        db.create_project(&project).unwrap();

        // 获取项目
        let retrieved = db.get_project("test-123").unwrap().unwrap();
        assert_eq!(retrieved.id, "test-123");
        assert_eq!(retrieved.name, "Test Project");
        assert_eq!(retrieved.description, Some("Test description".to_string()));
    }

    #[test]
    fn test_list_projects() {
        let (db, _temp) = setup_test_db();

        // 创建两个项目
        for i in 1..=2 {
            let project = Project {
                id: format!("proj-{}", i),
                name: format!("Project {}", i),
                created_at: 1000 + i as i64,
                updated_at: 1000 + i as i64,
                description: None,
                floor_plan: None,
                photos: vec![],
                conversations: vec![],
                renderings: vec![],
            };
            db.create_project(&project).unwrap();
        }

        let projects = db.list_projects().unwrap();
        assert_eq!(projects.len(), 2);
    }

    #[test]
    fn test_update_project() {
        let (db, _temp) = setup_test_db();

        let project = Project {
            id: "update-test".to_string(),
            name: "Original Name".to_string(),
            created_at: 1000,
            updated_at: 1000,
            description: None,
            floor_plan: None,
            photos: vec![],
            conversations: vec![],
            renderings: vec![],
        };

        db.create_project(&project).unwrap();

        // 更新项目名称
        db.update_project("update-test", Some("Updated Name"), Some("New description")).unwrap();

        let updated = db.get_project("update-test").unwrap().unwrap();
        assert_eq!(updated.name, "Updated Name");
        assert_eq!(updated.description, Some("New description".to_string()));
    }

    #[test]
    fn test_delete_project() {
        let (db, _temp) = setup_test_db();

        let project = Project {
            id: "delete-test".to_string(),
            name: "To Delete".to_string(),
            created_at: 1000,
            updated_at: 1000,
            description: None,
            floor_plan: None,
            photos: vec![],
            conversations: vec![],
            renderings: vec![],
        };

        db.create_project(&project).unwrap();
        assert!(db.get_project("delete-test").unwrap().is_some());

        // 删除项目
        db.delete_project("delete-test").unwrap();
        assert!(db.get_project("delete-test").unwrap().is_none());
    }

    #[test]
    fn test_settings() {
        let (db, _temp) = setup_test_db();

        // 设置值
        db.set_setting("api_key", "test-key-123").unwrap();

        // 获取值
        let value = db.get_setting("api_key").unwrap();
        assert_eq!(value, Some("test-key-123".to_string()));

        // 获取不存在的值
        let not_found = db.get_setting("nonexistent").unwrap();
        assert_eq!(not_found, None);
    }

    #[test]
    fn test_save_and_get_image() {
        let (db, _temp) = setup_test_db();

        // 先创建一个项目
        let project = Project {
            id: "img-test-proj".to_string(),
            name: "Image Test Project".to_string(),
            created_at: 1000,
            updated_at: 1000,
            description: None,
            floor_plan: None,
            photos: vec![],
            conversations: vec![],
            renderings: vec![],
        };
        db.create_project(&project).unwrap();

        // 保存图片
        let image = ImageFile {
            id: "img-001".to_string(),
            filename: "floorplan.jpg".to_string(),
            path: "/path/to/floorplan.jpg".to_string(),
            thumbnail_path: "/path/to/thumb.jpg".to_string(),
            size: 1024000,
            width: 1920,
            height: 1080,
            uploaded_at: 1234567890,
        };

        db.save_image(&image, "img-test-proj", "floor_plan").unwrap();

        // 获取图片
        let retrieved = db.get_image("img-001").unwrap().unwrap();
        assert_eq!(retrieved.id, "img-001");
        assert_eq!(retrieved.filename, "floorplan.jpg");
        assert_eq!(retrieved.width, 1920);
    }
}
