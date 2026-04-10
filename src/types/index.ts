// 图片文件
export interface ImageFile {
  id: string;
  filename: string;
  path: string;
  thumbnailPath: string;
  size: number;
  width: number;
  height: number;
  uploadedAt: number;
}

// 图片类型
export type ImageType = 'floorPlan' | 'photo';

// 消息角色
export type MessageRole = 'user' | 'assistant' | 'system';

// 消息
export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  images?: string[];
  timestamp: number;
  metadata?: {
    renderingId?: string;
    tokensUsed?: number;
  };
}

// 对话
export interface Conversation {
  id: string;
  createdAt: number;
  messages: Message[];
}

// 效果图
export interface Rendering {
  id: string;
  prompt: string;
  imagePath: string;
  thumbnailPath: string;
  createdAt: number;
  basedOn: string[];
}

// 项目/方案
export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  description?: string;
  floorPlan?: ImageFile;
  photos: ImageFile[];
  conversations: Conversation[];
  renderings: Rendering[];
}

// 项目摘要（用于列表）
export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  thumbnailPath?: string;
  messageCount: number;
  renderingCount: number;
}

// 导出格式
export type ExportFormat = 'png' | 'pdf' | 'json';

// API 响应
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// 流式响应
export interface StreamChunk {
  content: string;
  done: boolean;
}
