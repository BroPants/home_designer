<!-- From: C:\Users\46042\Desktop\code\home_designer\AGENTS.md -->
# Home Designer

## Project Overview

**Home Designer** is an AI-powered Windows desktop application for interior design, built with React, TypeScript, and Tauri (Rust).

- **Repository**: `git@github.com:BroPants/home_designer.git`
- **Current Status**: Phase 1 Completed - Basic architecture and SQLite database setup
- **Version**: 0.1.0

## Technology Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Zustand
- **Backend**: Rust + Tauri
- **Database**: SQLite (via rusqlite)
- **AI Engine**: Moonshot AI (Kimi) API

## Project Structure

```
home_designer/
├── docs/                    # Project documentation
│   ├── PRD.md              # Product Requirements Document
│   ├── Architecture.md     # Technical Architecture
│   └── Development.md      # Development Process & Roadmap
├── src/                     # Frontend source code (React + TypeScript)
│   ├── components/         # React components
│   │   ├── chat/          # Chat interface
│   │   ├── upload/        # Image upload
│   │   ├── viewer/        # Rendering viewer
│   │   └── sidebar/       # Project sidebar
│   ├── services/          # API services
│   ├── stores/            # Zustand state management
│   ├── types/             # TypeScript types
│   └── utils/             # Utility functions
├── src-tauri/              # Backend source code (Rust)
│   ├── src/
│   │   ├── main.rs        # Entry point
│   │   ├── commands/      # IPC commands
│   │   ├── services/      # Business services
│   │   │   ├── db.rs      # SQLite database
│   │   │   ├── storage.rs # File storage
│   │   │   ├── image.rs   # Image processing
│   │   │   └── kimi.rs    # Kimi API client
│   │   └── models/        # Data models
│   └── tauri.conf.json    # Tauri configuration
└── README.md              # Project README
```

## Development Guidelines

### Build Commands

```powershell
# Install dependencies
pnpm install

# Run development server
pnpm tauri dev

# Build for production
pnpm tauri build
```

### Code Style

- **TypeScript/React**: ESLint + Prettier
- **Rust**: `cargo fmt` and `cargo clippy`

### Git Workflow

Use Conventional Commits:
```
<type>(<scope>): <description>

types: feat, fix, docs, style, refactor, perf, test, chore
```

## Current Progress

### ✅ Phase 1: Basic Architecture (Completed)
- Tauri + React project setup
- ESLint, Prettier, TypeScript configuration
- Basic UI layout
- IPC communication foundation
- SQLite database integration

### 🚧 Phase 2: Image Upload (In Progress)
- Image upload component
- Drag & drop support
- Image compression (Rust)
- Thumbnail generation
- Local storage management

### ⏳ Phase 3-6: AI Integration, Rendering, Optimization, Release

## Security Considerations

- API keys stored in SQLite (to be encrypted)
- Local image data only sent to Kimi API
- Use `.gitignore` for sensitive files

## Notes for AI Agents

When working on this project:
1. Check `docs/Development.md` for the current phase and task list
2. Follow existing code patterns in both TypeScript and Rust
3. Update database schema in `src-tauri/src/services/db.rs` if needed
4. Add IPC commands in `src-tauri/src/commands/mod.rs`
5. Test `cargo check` in `src-tauri/` before completing Rust changes
