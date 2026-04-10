# Home Designer - 技术架构文档

## 1. 技术栈选型

### 1.1 方案对比

| 方案 | 技术组合 | 优点 | 缺点 | 推荐度 |
|------|----------|------|------|--------|
| A | Tauri + React + Rust | 体积小、性能好、安全 | 学习曲线陡峭 | ⭐⭐⭐⭐⭐ |
| B | Electron + React + Node.js | 生态成熟、开发快 | 体积大、内存高 | ⭐⭐⭐⭐ |
| C | PyQt + Python | Python 生态丰富 | UI 不够现代 | ⭐⭐⭐ |
| D | .NET MAUI + C# | 微软原生支持 | 跨平台支持一般 | ⭐⭐⭐⭐ |

### 1.2 推荐方案：Tauri + React + TypeScript

选择理由：
1. **轻量级**：最终安装包 < 10MB（vs Electron > 100MB）
2. **高性能**：Rust 后端，内存占用低
3. **安全性**：Rust 内存安全，Tauri 安全模型完善
4. **现代前端**：使用 React + TypeScript，开发体验好

---

## 2. 系统架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                      Home Designer (Windows)                     │
├─────────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Frontend (React)                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ 上传组件  │ │ 对话界面  │ │ 图片预览  │ │ 方案管理     │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Tauri Bridge (IPC Commands)                   │  │
│  └───────────────────────────────────────────────────────────┘  │
│                              │                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                   Backend (Rust)                           │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐  │  │
│  │  │ 文件管理  │ │ 图片处理  │ │ API 客户端│ │ 数据存储     │  │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         External Services                        │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Moonshot AI    │  │  图片存储/CDN   │  │  更新服务器     │ │
│  │  (Kimi API)     │  │  (可选)         │  │  (可选)         │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 模块职责

#### Frontend (React + TypeScript)
| 模块 | 职责 |
|------|------|
| `components/Upload` | 图片拖拽上传、预览、管理 |
| `components/Chat` | 对话界面、消息渲染、输入处理 |
| `components/Viewer` | 效果图展示、缩放、切换 |
| `components/Sidebar` | 方案列表、历史记录 |
| `hooks/useAI` | AI 对话逻辑封装 |
| `hooks/useProject` | 方案数据管理 |
| `services/api.ts` | 与 Tauri 后端通信 |

#### Backend (Rust)
| 模块 | 职责 |
|------|------|
| `commands/` | 定义 Tauri IPC 命令 |
| `services/kimi.rs` | Kimi API 调用封装 |
| `services/image.rs` | 图片压缩、格式转换 |
| `services/storage.rs` | 本地文件和数据存储 |
| `models/` | 数据模型定义 |

---

## 3. 数据模型

### 3.1 核心实体

```typescript
// 项目/方案
interface Project {
  id: string;                    // UUID
  name: string;                  // 方案名称
  createdAt: number;             // 创建时间戳
  updatedAt: number;             // 更新时间戳
  description?: string;          // 项目描述
  
  // 图片
  floorPlan?: ImageFile;         // 户型图
  photos: ImageFile[];           // 实拍图列表
  
  // AI 对话
  conversations: Conversation[]; // 对话记录
  
  // 生成的效果图
  renderings: Rendering[];       // 效果图列表
}

// 图片文件
interface ImageFile {
  id: string;
  filename: string;              // 原始文件名
  path: string;                  // 本地存储路径
  thumbnailPath: string;         // 缩略图路径
  size: number;                  // 文件大小
  width: number;                 // 图片宽度
  height: number;                // 图片高度
  uploadedAt: number;            // 上传时间
}

// 对话
interface Conversation {
  id: string;
  createdAt: number;
  messages: Message[];           // 消息列表
}

// 消息
interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;               // 文本内容
  images?: string[];             // 引用的图片 ID
  timestamp: number;
  metadata?: {
    renderingId?: string;        // 关联的效果图
    tokensUsed?: number;         // Token 使用量
  };
}

// 效果图
interface Rendering {
  id: string;
  prompt: string;                // 生成提示词
  imagePath: string;             // 图片路径
  thumbnailPath: string;         // 缩略图路径
  createdAt: number;
  basedOn: string[];             // 基于哪些图片生成
}
```

### 3.2 本地存储结构

```
%APPDATA%/Home Designer/
├── config.json                 # 应用配置（API Key、设置等）
├── database.sqlite            # SQLite 数据库（项目、对话数据）
└── projects/
    └── {project_id}/
        ├── floor_plan/        # 户型图
        │   └── {image_id}.jpg
        ├── photos/            # 实拍图
        │   ├── {image_id}_1.jpg
        │   └── {image_id}_2.jpg
        ├── thumbnails/        # 缩略图
        │   └── {image_id}_thumb.jpg
        └── renderings/        # 生成的效果图
            └── {rendering_id}.png
```

---

## 4. API 设计

### 4.1 Tauri IPC Commands

```rust
// 项目相关
#[tauri::command]
async fn create_project(name: String) -> Result<Project, Error>;

#[tauri::command]
async fn get_project(id: String) -> Result<Project, Error>;

#[tauri::command]
async fn list_projects() -> Result<Vec<ProjectSummary>, Error>;

#[tauri::command]
async fn delete_project(id: String) -> Result<(), Error>;

// 图片相关
#[tauri::command]
async fn upload_image(project_id: String, image_data: Vec<u8>, filename: String, type: ImageType) -> Result<ImageFile, Error>;

#[tauri::command]
async fn delete_image(image_id: String) -> Result<(), Error>;

// AI 对话
#[tauri::command]
async fn send_message(project_id: String, content: String, image_ids: Option<Vec<String>>) -> Result<StreamResponse, Error>;

#[tauri::command]
async fn generate_rendering(project_id: String, prompt: String) -> Result<Rendering, Error>;

// 导出
#[tauri::command]
async fn export_project(project_id: String, format: ExportFormat) -> Result<String, Error>;
```

### 4.2 Kimi API 集成

```rust
// 调用 Moonshot AI API
pub struct KimiClient {
    api_key: String,
    base_url: String,
}

impl KimiClient {
    // 多模态对话（支持图片）
    pub async fn chat_with_images(
        &self,
        messages: Vec<Message>,
        images: Vec<ImageData>
    ) -> Result<ChatResponse, Error>;
    
    // 生成设计提示词
    pub async fn generate_design_prompt(
        &self,
        user_request: String,
        room_type: String,
        style: Option<String>
    ) -> Result<String, Error>;
    
    // 流式响应
    pub async fn chat_stream(
        &self,
        messages: Vec<Message>
    ) -> Result<impl Stream<Item = Result<Chunk, Error>>, Error>;
}
```

---

## 5. 关键流程

### 5.1 图片上传流程

```
用户拖拽/选择图片
       │
       ▼
┌──────────────┐
│  前端验证     │ ──> 格式、大小检查
└──────────────┘
       │
       ▼
┌──────────────┐
│  调用 Tauri  │
│  upload_image│
└──────────────┘
       │
       ▼
┌──────────────┐
│  Rust 后端    │
│  - 生成唯一ID │
│  - 压缩图片   │
│  - 生成缩略图 │
│  - 保存到本地 │
└──────────────┘
       │
       ▼
┌──────────────┐
│  更新 SQLite  │
│  数据库记录   │
└──────────────┘
       │
       ▼
   返回图片信息
```

### 5.2 AI 设计对话流程

```
用户输入需求 + 选择图片
       │
       ▼
┌──────────────┐
│  构建 Prompt │
│  - 系统提示   │
│  - 图片内容   │
│  - 用户需求   │
└──────────────┘
       │
       ▼
┌──────────────┐
│  调用 Kimi   │
│  API (流式)  │
└──────────────┘
       │
       ▼
┌──────────────┐
│  前端流式    │
│  展示响应    │
└──────────────┘
       │
       ▼
用户选择生成效果图
       │
       ▼
┌──────────────┐
│  发送生成    │
│  图片请求    │
└──────────────┘
       │
       ▼
┌──────────────┐
│  接收图片    │
│  保存并展示  │
└──────────────┘
```

---

## 6. 安全考虑

### 6.1 API Key 管理
- 存储在 Windows Credential Store 或加密配置文件
- 不硬编码在代码中
- 支持用户自行配置

### 6.2 数据安全
- 图片数据本地存储，不上传到非必要服务器
- 仅发送图片到 Kimi API 进行处理
- 配置文件加密存储

### 6.3 输入验证
- 所有 IPC 命令参数验证
- 图片格式和大小限制
- 路径遍历防护

---

## 7. 性能优化策略

### 7.1 图片处理
- 上传时生成多尺寸缩略图
- 使用 WebP 格式减少存储
- 懒加载大图

### 7.2 AI 响应
- 流式输出，减少等待感
- 本地缓存对话历史
- 智能重试机制

### 7.3 前端优化
- 虚拟滚动（长列表）
- 图片懒加载
- 组件懒加载

---

## 8. 开发环境

### 8.1 必需工具
- **Rust**: https://rustup.rs/
- **Node.js**: v18+ 
- **pnpm**: 包管理器

### 8.2 推荐 IDE
- VS Code + 插件
  - rust-analyzer
  - ESLint
  - Prettier
  - Tauri

### 8.3 调试配置
```json
// .vscode/launch.json
{
  "type": "node",
  "request": "attach",
  "name": "Debug Tauri",
  "port": 9223,
  "webRoot": "${workspaceFolder}/src"
}
```
