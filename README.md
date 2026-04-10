# Home Designer - 智能室内设计师

一款基于 AI 大模型的 Windows 桌面端室内设计软件，帮助用户通过上传户型图和实拍图，快速获得专业的室内装修设计方案和家具效果图。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Windows-blue.svg)

## ✨ 核心功能

- 🏠 **图片上传** - 支持上传户型图和房间实拍照片
- 💬 **AI 设计对话** - 通过自然语言与 AI 交流设计需求
- 🎨 **智能效果图** - AI 生成专业的室内装修效果图
- 📁 **方案管理** - 保存、查看和管理多个设计方案
- 📤 **导出分享** - 导出设计效果图为图片或 PDF

## 🛠️ 技术栈

- **前端**: React 18 + TypeScript + Tailwind CSS
- **桌面框架**: Tauri (Rust)
- **AI 引擎**: Moonshot AI (Kimi)
- **状态管理**: Zustand
- **数据库**: SQLite

## 📋 文档导航

| 文档 | 说明 |
|------|------|
| [PRD.md](./docs/PRD.md) | 产品需求文档 - 功能需求、用户界面、里程碑规划 |
| [Architecture.md](./docs/Architecture.md) | 技术架构文档 - 系统架构、数据模型、API 设计 |
| [Development.md](./docs/Development.md) | 开发流程文档 - 环境搭建、开发规范、阶段计划 |

## 🚀 快速开始

### 环境要求

- Windows 10/11 (64位)
- [Node.js](https://nodejs.org/) 18+
- [Rust](https://rustup.rs/) 最新稳定版
- [pnpm](https://pnpm.io/) 8+

### 安装步骤

```powershell
# 1. 克隆仓库
git clone git@github.com:BroPants/home_designer.git
cd home_designer

# 2. 安装前端依赖
pnpm install

# 3. 安装 Tauri CLI
cargo install tauri-cli

# 4. 启动开发服务器
pnpm tauri dev
```

### 构建发布版本

```powershell
# 构建 Windows 安装包
pnpm tauri build

# 输出目录: src-tauri/target/release/bundle/
```

## 📁 项目结构

```
home_designer/
├── docs/                    # 项目文档
│   ├── PRD.md              # 产品需求文档
│   ├── Architecture.md     # 技术架构文档
│   └── Development.md      # 开发流程文档
├── src/                     # 前端源代码 (React + TypeScript)
├── src-tauri/               # 后端源代码 (Rust)
└── README.md               # 项目说明
```

## 🗓️ 开发计划

| 阶段 | 周期 | 目标 |
|------|------|------|
| Phase 1 | Week 1 | 基础架构搭建 |
| Phase 2 | Week 2 | 图片上传功能 |
| Phase 3 | Week 3-4 | Kimi API 集成 |
| Phase 4 | Week 4-5 | 效果图生成 |
| Phase 5 | Week 6 | 体验优化 |
| Phase 6 | Week 7 | 打包发布 |

详细计划见 [Development.md](./docs/Development.md)

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

## 📄 许可证

本项目采用 [MIT](LICENSE) 许可证

## 🙏 致谢

- [Tauri](https://tauri.app/) - 优秀的跨平台桌面应用框架
- [Moonshot AI](https://www.moonshot.cn/) - 提供强大的 AI 能力
- [shadcn/ui](https://ui.shadcn.com/) - 精美的 React 组件库

---

Made with ❤️ by BroPants
