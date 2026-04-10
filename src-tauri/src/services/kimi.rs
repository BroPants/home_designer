use crate::models::*;
use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};

pub struct KimiClient {
    client: Client,
    api_key: String,
    base_url: String,
}

#[derive(Debug, Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    #[serde(skip_serializing_if = "Option::is_none")]
    stream: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
struct ChatMessage {
    role: String,
    content: String,
}

#[derive(Debug, Deserialize)]
struct ChatResponse {
    id: String,
    choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
struct Choice {
    message: ChatMessage,
    finish_reason: Option<String>,
}

impl KimiClient {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: "https://api.moonshot.cn/v1".to_string(),
        }
    }
    
    pub async fn chat(&self, messages: Vec<Message>) -> Result<String> {
        let chat_messages: Vec<ChatMessage> = messages
            .into_iter()
            .map(|m| ChatMessage {
                role: match m.role {
                    MessageRole::User => "user".to_string(),
                    MessageRole::Assistant => "assistant".to_string(),
                    MessageRole::System => "system".to_string(),
                },
                content: m.content,
            })
            .collect();
        
        let request = ChatRequest {
            model: "moonshot-v1-8k".to_string(),
            messages: chat_messages,
            stream: Some(false),
        };
        
        let response = self
            .client
            .post(format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.api_key))
            .json(&request)
            .send()
            .await
            .context("Failed to send request to Kimi API")?;
        
        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            anyhow::bail!("Kimi API error: {}", error_text);
        }
        
        let chat_response: ChatResponse = response
            .json()
            .await
            .context("Failed to parse Kimi API response")?;
        
        Ok(chat_response
            .choices
            .first()
            .map(|c| c.message.content.clone())
            .unwrap_or_default())
    }
    
    pub async fn generate_design_prompt(
        &self,
        user_request: String,
        room_type: String,
        style: Option<String>,
    ) -> Result<String> {
        let style_text = style.as_ref().map(|s| format!("，风格为{}", s)).unwrap_or_default();
        
        let prompt = format!(
            r#"你是一位专业的室内设计师。用户想要设计一个{}{}。

用户需求：{}

请根据用户需求，生成一个详细的效果图生成提示词（prompt），用于 AI 绘图工具生成室内设计效果图。

要求：
1. 提示词要详细描述空间布局、色彩搭配、材质选择、灯光设计、家具摆放等
2. 使用英文撰写提示词，这是为了 AI 绘图工具的兼容性
3. 只返回提示词本身，不要包含任何解释或其他内容
4. 提示词要能够生成高质量、逼真的室内设计效果图

请直接输出提示词："#,
            room_type, style_text, user_request
        );
        
        let messages = vec![Message {
            id: uuid::Uuid::new_v4().to_string(),
            role: MessageRole::User,
            content: prompt,
            images: None,
            timestamp: chrono::Utc::now().timestamp_millis(),
            metadata: None,
        }];
        
        self.chat(messages).await
    }
}
