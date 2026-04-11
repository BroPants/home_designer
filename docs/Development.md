# Home Designer - 开发流程文档

## 1. 项目初始化

### 1.1 环境准备

#### 安装 Rust
```powershell
# 使用 rustup 安装
Invoke-WebRequest -Uri https://win.rustup.rs/x86_64 -OutFile rustup-init.exe
.\rustup-init.exe

# 验证安装
rustc --version
cargo --version
```

#### 安装 Node.js 和 pnpm
```powershell
# 使用 nvm-windows 或官网安装 Node.js 18+
# https://nodejs.org/

# 安装 pnpm
npm install -g pnpm

# 验证
node --version
pnpm --version
```

#### 安装 Tauri CLI
```powershell
cargo install tauri-cli

# 或作为项目依赖
pnpm add -D @tauri-apps/cli
```

#### 安装 Windows 依赖
```powershell
# 使用 Microsoft Visual C++ Build Tools
# 或 Visual Studio 2022 (Community 版免费)

# 需要安装的组件：
# - MSVC v143 - VS 2022 C++ x64/x86 生成工具
# - Windows 11 SDK (或 Windows 10 SDK)
```

### 1.2 创建项目

```powershell
# 创建项目目录
mkdir home_designer
cd home_designer

# 初始化 Tauri 项目
cargo create-tauri-app

# 选择:
# - Project name: home_designer
# - Frontend language: TypeScript / JavaScript
# - UI template: React
# - Package manager: pnpm
```

### 1.3 项目结构

```
home_designer/
├── src/                        # 前端源代码
│   ├── components/            # React 组件
│   │   ├── upload/
│   │   ├── chat/
│   │   ├── viewer/
│   │   └── sidebar/
│   ├── hooks/                 # 自定义 Hooks
│   ├── services/              # API 服务
│   ├── stores/                # 状态管理 (Zustand)
│   ├── types/                 # TypeScript 类型
│   ├── utils/                 # 工具函数
│   ├── App.tsx               # 主应用组件
│   └── main.tsx              # 入口文件
├── src-tauri/                 # Rust 后端
│   ├── src/
│   │   ├── main.rs           # 入口
│   │   ├── commands/         # IPC 命令
│   │   ├── services/         # 业务服务
│   │   ├── models/           # 数据模型
│   │   └── lib.rs           # 库入口
│   ├── Cargo.toml           # Rust 依赖
│   └── tauri.conf.json      # Tauri 配置
├── docs/                      # 文档
├── public/                    # 静态资源
├── package.json              # Node 依赖
└── README.md
```

---

## 2. 开发规范

### 2.1 代码规范

#### TypeScript/React
- 使用 ESLint + Prettier 进行代码检查
- 组件使用函数式组件 + Hooks
- Props 使用接口定义
- 使用绝对路径导入 (`@/components/...`)

#### Rust
- 使用 `cargo fmt` 格式化
- 使用 `cargo clippy` 静态检查
- 函数和变量使用 snake_case
- 类型使用 PascalCase
- 错误处理使用 Result/Option

### 2.2 提交规范

使用 Conventional Commits：

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

类型：
- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式
- `refactor`: 重构
- `perf`: 性能优化
- `test`: 测试
- `chore`: 构建/工具

示例：
```
feat(upload): 添加拖拽上传功能

支持多文件拖拽上传，自动压缩图片

Closes #12
```

---

## 3. 开发流程

### 3.1 任务管理

使用 GitHub Projects 或简单看板：

| 阶段 | 说明 |
|------|------|
| Backlog | 待处理的需求 |
| To Do | 当前 Sprint 的任务 |
| In Progress | 正在开发 |
| Review | 代码审查 |
| Done | 已完成 |

### 3.2 分支策略

```
main
  │
  ├── dev                    # 开发分支
  │   │
  │   ├── feature/upload     # 功能分支
  │   ├── feature/chat
  │   └── feature/viewer
  │
  ├── release/v0.1.0         # 发布分支
  │
  └── hotfix/xxx             # 热修复
```

### 3.3 开发迭代流程

```
1. 从 dev 切功能分支
   git checkout -b feature/xxx

2. 开发功能，提交代码
   git add .
   git commit -m "feat: xxx"

3. 推送分支
   git push origin feature/xxx

4. 创建 Pull Request 到 dev

5. Code Review

6. 合并后删除功能分支
```

---

## 4. 开发阶段计划

### Phase 1: 基础架构 (Week 1) ✅ 已完成

**目标**: 搭建项目框架，实现基础功能

**任务清单**:
- [x] 初始化 Tauri + React 项目
- [x] 配置 ESLint, Prettier, TypeScript
- [x] 搭建基础 UI 布局
- [x] 实现 IPC 通信基础
- [x] 配置 SQLite 数据库

**验收标准**:
- ✅ 应用能正常启动
- ✅ 显示基础界面
- ✅ 前后端能通信
- ✅ Rust 代码编译通过

**主要完成内容**:
1. **前端**: React + TypeScript + Tailwind CSS 框架搭建
2. **后端**: Rust + Tauri 配置完成
3. **数据库**: SQLite 集成，包含以下表：
   - `projects` - 项目/方案表
   - `images` - 图片表
   - `conversations` - 对话表
   - `messages` - 消息表
   - `renderings` - 效果图表
   - `settings` - 设置表
4. **IPC 命令**: 前后端通信接口定义完成
5. **服务层**: Storage、Image、Kimi API 服务框架搭建

### Phase 2: 图片功能 (Week 2) ✅ 已完成

**目标**: 实现图片上传和管理

**任务清单**:
- [x] 图片上传组件
- [x] 拖拽上传支持 (react-dropzone)
- [x] 图片压缩处理 (Rust)
- [x] 缩略图生成
- [x] 图片预览组件
- [x] 本地存储管理
- [x] 图片加载优化 (convertFileSrc)
- [x] 上传状态指示器
- [x] 图片查看大图功能
- [ ] 图片裁剪功能（可选）

**验收标准**:
- ✅ 支持上传户型图和实拍图
- ✅ 显示图片缩略图
- ✅ 图片本地持久化
- ✅ 支持拖拽上传
- ✅ 显示上传进度/状态
- ✅ 点击图片查看大图
- ✅ 支持键盘快捷键操作

**主要完成内容**:
1. **前端**:
   - ImageUploader 组件支持拖拽上传
   - 使用 `convertFileSrc` 正确加载本地图片
   - 添加图片加载状态指示器
   - 支持删除图片
   - **ImageLightbox 组件支持全屏查看**
   - **键盘快捷键：ESC 关闭、←→ 切换、+/-/0 缩放**
   - **鼠标滚轮缩放和拖拽移动**
2. **后端**:
   - `upload_image` 命令处理图片上传
   - 自动压缩图片生成缩略图
   - 图片信息存储到 SQLite
   - **支持 PNG/JPG/WebP 多种格式**

### Phase 3: AI 集成 (Week 3-4) 🚧 进行中

**目标**: 集成 Kimi API，实现对话功能

**任务清单**:
- [x] 配置 API Key 管理
- [x] 封装 Kimi API 客户端
- [x] 实现聊天界面
- [x] 支持图片输入的多模态对话
- [ ] 流式响应显示（基础框架已搭建）
- [x] 对话历史管理

**验收标准**:
- ✅ 能发送文字给 AI
- ✅ 支持多轮对话（上下文记忆）
- ✅ AI 响应真实有效
- ⏳ 流式响应（待优化）

**主要完成内容**:
1. **前端**:
   - SettingsDialog 组件支持设置 API Key
   - ChatInterface 优化，支持错误显示
   - 集成真实的 AI 对话调用
2. **后端**:
   - KimiClient 支持普通对话和图文多模态对话
   - `send_message` 命令实现完整的对话流程
   - 对话历史自动保存到数据库
   - 支持上下文记忆（最近 10 条消息）

### Phase 4: 效果图生成 (Week 4-5)

**目标**: 生成装修效果图

**任务清单**:
- [ ] 设计 prompt 模板
- [ ] 实现效果图生成功能
- [ ] 效果图展示组件
- [ ] 方案保存功能
- [ ] 效果图管理

**验收标准**:
- AI 能生成效果图
- 效果图正确显示
- 方案能保存和查看

### Phase 5: 完善优化 (Week 6)

**目标**: 提升用户体验

**任务清单**:
- [ ] 加载状态优化
- [ ] 错误处理
- [ ] 新手引导
- [ ] 快捷键支持
- [ ] 设置页面
- [ ] 导出功能

**验收标准**:
- 用户体验流畅
- 错误提示友好
- 有完整的引导

### Phase 6: 打包发布 (Week 7)

**目标**: 准备发布

**任务清单**:
- [ ] Windows 安装程序
- [ ] 自动更新
- [ ] 性能优化
- [ ] 最终测试
- [ ] 编写用户文档

**验收标准**:
- 安装程序正常工作
- 应用运行稳定

---

## 5. 测试策略

### 5.1 测试类型

| 类型 | 工具 | 覆盖范围 |
|------|------|----------|
| 单元测试 | Vitest (前端) / cargo test (Rust) | 工具函数、纯逻辑 |
| 集成测试 | Vitest + Tauri | IPC 命令、API 调用 |
| E2E 测试 | Playwright | 完整用户流程 |
| 手动测试 | - | UI/UX、探索性测试 |

### 5.2 关键测试用例

**图片上传**:
1. 单文件拖拽上传
2. 多文件选择上传
3. 大文件处理
4. 不支持的格式提示

**AI 对话**:
1. 纯文本对话
2. 带图片的对话
3. 长对话历史
4. 网络错误处理

**效果图**:
1. 生成效果图
2. 保存方案
3. 导出图片

---

## 6. 构建发布

### 6.1 开发构建

```powershell
# 安装依赖
pnpm install

# 启动开发服务器
pnpm tauri dev
```

### 6.2 生产构建

```powershell
# 构建前端
pnpm build

# 构建 Tauri 应用
pnpm tauri build

# 输出目录
src-tauri/target/release/bundle/
├── msi/           # Windows 安装包
├── nsis/          # 安装程序
└── exe/           # 可执行文件
```

### 6.3 版本管理

使用语义化版本 (SemVer): `MAJOR.MINOR.PATCH`

- MAJOR: 不兼容的 API 修改
- MINOR: 向下兼容的功能新增
- PATCH: 向下兼容的问题修复

```powershell
# 版本发布流程
git checkout main
git merge dev

# 更新版本号
pnpm version 0.1.0

# 打标签
git tag v0.1.0
git push origin main --tags
```

---

## 7. 问题排查

### 7.1 常见问题

**Rust 编译错误**:
```powershell
# 清理并重新构建
cargo clean
pnpm tauri dev
```

**前端热重载失败**:
```powershell
# 重启开发服务器
Ctrl+C
pnpm tauri dev
```

**IPC 通信失败**:
- 检查 `tauri.conf.json` 权限配置
- 确认命令在 `main.rs` 中注册

### 7.2 调试技巧

**Rust 调试**:
```rust
// 使用 log
log::info!("Processing image: {}", filename);
log::debug!("Image data: {:?}", data);
```

**前端调试**:
```typescript
// 使用 Tauri DevTools
console.log('Debug info:', data);

// 调用 Rust 命令时打印
invoke('command', params).then(console.log).catch(console.error);
```

---

## 8. 资源链接

### 文档
- [Tauri 文档](https://tauri.app/v1/guides/)
- [React 文档](https://react.dev/)
- [Rust 文档](https://doc.rust-lang.org/book/)
- [Moonshot AI API](https://platform.moonshot.cn/docs)

### 工具
- [Tauri 插件](https://tauri.app/v1/guides/features/plugin/)
- [React 组件库 (shadcn/ui)](https://ui.shadcn.com/)
- [图标 (Lucide)](https://lucide.dev/)

### 社区
- [Tauri Discord](https://discord.gg/tauri)
- [Rust 中文社区](https://rustcc.cn/)
