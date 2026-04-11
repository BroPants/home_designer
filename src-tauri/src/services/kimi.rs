use crate::models::*;
use anyhow::{Context, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use tokio::sync::mpsc;

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

// 流式响应结构
#[derive(Debug, Deserialize)]
struct StreamResponse {
    id: String,
    choices: Vec<StreamChoice>,
}

#[derive(Debug, Deserialize)]
struct StreamChoice {
    delta: Delta,
    finish_reason: Option<String>,
}

#[derive(Debug, Deserialize)]
struct Delta {
    #[serde(default)]
    content: String,
    #[serde(default)]
    role: String,
}

impl KimiClient {
    pub fn new(api_key: String) -> Self {
        Self {
            client: Client::new(),
            api_key,
            base_url: "https://api.moonshot.cn/v1".to_string(),
        }
    }

    /// 非流式对话
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

    /// 流式对话
    pub async fn chat_stream(
        &self,
        messages: Vec<Message>,
    ) -> Result<mpsc::Receiver<Result<StreamChunk>>> {
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
            stream: Some(true),
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

        let (tx, rx) = mpsc::channel(100);

        // 启动异步任务处理流式响应
        tokio::spawn(async move {
            let mut stream = response.bytes_stream();
            let mut buffer = String::new();

            while let Some(chunk) = stream.next().await {
                match chunk {
                    Ok(bytes) => {
                        let text = String::from_utf8_lossy(&bytes);
                        buffer.push_str(&text);

                        // 处理 SSE 格式的数据
                        while let Some(pos) = buffer.find("\n\n") {
                            let event = buffer[..pos].to_string();
                            buffer = buffer[pos + 2..].to_string();

                            if let Some(content) = Self::parse_sse_event(&event) {
                                if content.is_empty() {
                                    continue;
                                }
                                let chunk = StreamChunk {
                                    content,
                                    done: false,
                                };
                                if tx.send(Ok(chunk)).await.is_err() {
                                    return;
                                }
                            }
                        }
                    }
                    Err(e) => {
                        let _ = tx.send(Err(anyhow::anyhow!("Stream error: {}", e))).await;
                        return;
                    }
                }
            }

            // 发送结束标记
            let _ = tx
                .send(Ok(StreamChunk {
                    content: String::new(),
                    done: true,
                }))
                .await;
        });

        Ok(rx)
    }

    /// 解析 SSE 事件
    fn parse_sse_event(event: &str) -> Option<String> {
        let mut content = String::new();
        for line in event.lines() {
            if line.starts_with("data: ") {
                let data = &line[6..];
                if data == "[DONE]" {
                    return Some(String::new());
                }
                if let Ok(response) = serde_json::from_str::<StreamResponse>(data) {
                    if let Some(choice) = response.choices.first() {
                        content.push_str(&choice.delta.content);
                    }
                }
            }
        }
        Some(content)
    }

    /// 生成设计提示词
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

    /// 带图片的多模态对话
    pub async fn chat_with_images(
        &self,
        content: String,
        image_base64_list: Vec<String>,
    ) -> Result<String> {
        // 构建包含图片的消息内容
        let mut full_content = content;
        
        if !image_base64_list.is_empty() {
            full_content.push_str("\n\n[图片分析]\n");
            for (i, _) in image_base64_list.iter().enumerate() {
                full_content.push_str(&format!("图片{}: [已上传]\n", i + 1));
            }
        }

        let messages = vec![Message {
            id: uuid::Uuid::new_v4().to_string(),
            role: MessageRole::User,
            content: full_content,
            images: Some(image_base64_list),
            timestamp: chrono::Utc::now().timestamp_millis(),
            metadata: None,
        }];

        self.chat(messages).await
    }
}

use futures_util::StreamExt;
