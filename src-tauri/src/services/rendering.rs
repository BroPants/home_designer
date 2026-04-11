//! 效果图生成服务
//! 
//! 该服务负责：
//! 1. 根据对话历史生成详细的设计 prompt
//! 2. 调用 AI 绘图 API 生成效果图（目前使用占位图）
//! 3. 保存生成的效果图到本地

use crate::models::*;
use crate::services::kimi::KimiClient;
use anyhow::{Context, Result};
use std::path::Path;

pub struct RenderingService {
    kimi_client: Option<KimiClient>,
}

impl RenderingService {
    pub fn new(api_key: Option<String>) -> Self {
        Self {
            kimi_client: api_key.map(KimiClient::new),
        }
    }

    /// 根据对话生成设计 prompt
    pub async fn generate_prompt(
        &self,
        messages: &[Message],
        room_type: &str,
        style: Option<&str>,
    ) -> Result<String> {
        let kimi = self
            .kimi_client
            .as_ref()
            .ok_or_else(|| anyhow::anyhow!("API key not set"))?;

        // 构建对话历史摘要
        let conversation_summary = messages
            .iter()
            .map(|m| {
                let role = match m.role {
                    MessageRole::User => "用户",
                    MessageRole::Assistant => "AI",
                    MessageRole::System => "系统",
                };
                format!("{}: {}", role, m.content)
            })
            .collect::<Vec<_>>()
            .join("\n");

        let user_request = format!(
            "基于以下对话历史，理解用户的完整设计需求：\n\n{}\n\n请生成一个详细的效果图提示词。",
            conversation_summary
        );

        kimi.generate_design_prompt(user_request, room_type.to_string(), style.map(|s| s.to_string()))
            .await
    }

    /// 生成效果图（目前创建占位图）
    /// 
    /// TODO: 接入真实的 AI 绘图 API，如：
    /// - DALL-E 3
    /// - Midjourney
    /// - Stable Diffusion
    /// - 百度文心一言画图
    /// - 阿里通义万相
    pub async fn generate_rendering(
        &self,
        prompt: &str,
        output_path: &Path,
        thumbnail_path: &Path,
    ) -> Result<(i32, i32)> {
        use image::{ImageBuffer, Rgb};
        use std::fs;

        log::info!("Generating rendering with prompt: {}", prompt);

        // 确保输出目录存在
        if let Some(parent) = output_path.parent() {
            fs::create_dir_all(parent)?;
        }
        if let Some(parent) = thumbnail_path.parent() {
            fs::create_dir_all(parent)?;
        }

        // 创建占位效果图（渐变背景 + 文字）
        // 实际项目中，这里应该调用 AI 绘图 API
        let width = 1024;
        let height = 768;

        // 创建渐变背景
        let mut img = ImageBuffer::new(width, height);
        for (x, y, pixel) in img.enumerate_pixels_mut() {
            let r = (x as f32 / width as f32 * 100.0 + 50.0) as u8;
            let g = (y as f32 / height as f32 * 100.0 + 100.0) as u8;
            let b = 200;
            *pixel = Rgb([r, g, b]);
        }

        img.save(output_path)
            .with_context(|| format!("Failed to save rendering to {:?}", output_path))?;

        // 生成缩略图
        let thumbnail = image::open(output_path)?
            .resize(400, 400, image::imageops::FilterType::Lanczos3);
        thumbnail.save(thumbnail_path)
            .with_context(|| format!("Failed to save thumbnail to {:?}", thumbnail_path))?;

        log::info!(
            "Rendering generated: main={:?}, thumbnail={:?}",
            output_path,
            thumbnail_path
        );

        Ok((width as i32, height as i32))
    }

    /// 解析房间类型
    pub fn parse_room_type(content: &str) -> &str {
        let content_lower = content.to_lowercase();
        if content_lower.contains("客厅") || content_lower.contains("living room") {
            "客厅"
        } else if content_lower.contains("卧室") || content_lower.contains("bedroom") {
            "卧室"
        } else if content_lower.contains("厨房") || content_lower.contains("kitchen") {
            "厨房"
        } else if content_lower.contains("餐厅") || content_lower.contains("dining") {
            "餐厅"
        } else if content_lower.contains("卫生间") || content_lower.contains("bathroom") {
            "卫生间"
        } else if content_lower.contains("书房") || content_lower.contains("study") {
            "书房"
        } else if content_lower.contains("阳台") || content_lower.contains("balcony") {
            "阳台"
        } else {
            "室内空间" // 默认
        }
    }

    /// 解析风格
    pub fn parse_style(content: &str) -> Option<&str> {
        let content_lower = content.to_lowercase();
        if content_lower.contains("现代简约") || content_lower.contains("modern") {
            Some("现代简约")
        } else if content_lower.contains("北欧") || content_lower.contains("nordic") {
            Some("北欧风格")
        } else if content_lower.contains("中式") || content_lower.contains("chinese") {
            Some("中式风格")
        } else if content_lower.contains("日式") || content_lower.contains("japanese") {
            Some("日式风格")
        } else if content_lower.contains("欧式") || content_lower.contains("european") {
            Some("欧式风格")
        } else if content_lower.contains("美式") || content_lower.contains("american") {
            Some("美式风格")
        } else if content_lower.contains("工业") || content_lower.contains("industrial") {
            Some("工业风格")
        } else if content_lower.contains("轻奢") || content_lower.contains("luxury") {
            Some("轻奢风格")
        } else {
            None
        }
    }
}
