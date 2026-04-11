import { invoke } from '@tauri-apps/api/tauri';
import {
  Project,
  ProjectSummary,
  ImageFile,
  Rendering,
  ExportFormat,
  ImageType,
} from '@/types';

// 项目相关 API
export const projectApi = {
  // 创建项目
  createProject: async (name: string, description?: string): Promise<Project> => {
    return invoke('create_project', { name, description });
  },

  // 获取项目详情
  getProject: async (id: string): Promise<Project> => {
    return invoke('get_project', { id });
  },

  // 获取项目列表
  listProjects: async (): Promise<ProjectSummary[]> => {
    return invoke('list_projects');
  },

  // 删除项目
  deleteProject: async (id: string): Promise<void> => {
    return invoke('delete_project', { id });
  },

  // 更新项目名称
  updateProjectName: async (id: string, name: string): Promise<void> => {
    return invoke('update_project_name', { id, name });
  },
};

// 图片相关 API
export const imageApi = {
  // 上传图片
  uploadImage: async (
    projectId: string,
    imageData: Uint8Array,
    filename: string,
    type: ImageType
  ): Promise<ImageFile> => {
    return invoke('upload_image', {
      projectId,
      imageData: Array.from(imageData),
      filename,
      imageType: type,
    });
  },

  // 删除图片
  deleteImage: async (imageId: string): Promise<void> => {
    return invoke('delete_image', { imageId });
  },

  // 读取图片文件
  readImage: async (path: string): Promise<Uint8Array> => {
    return invoke('read_image_file', { path });
  },
};

// AI 对话相关 API
export const chatApi = {
  // 发送消息
  sendMessage: async (
    projectId: string,
    content: string,
    imageIds?: string[]
  ): Promise<Message> => {
    return invoke('send_message', { projectId, content, imageIds });
  },

  // 清空对话
  clearConversation: async (projectId: string): Promise<void> => {
    return invoke('clear_conversation', { projectId });
  },

  // 生成效果图
  generateRendering: async (
    projectId: string,
    prompt: string
  ): Promise<Rendering> => {
    return invoke('generate_rendering', { projectId, prompt });
  },
};

// 导出相关 API
export const exportApi = {
  // 导出项目
  exportProject: async (
    projectId: string,
    format: ExportFormat
  ): Promise<string> => {
    return invoke('export_project', { projectId, format });
  },
};

// 设置相关 API
export const settingsApi = {
  // 获取 API Key
  getApiKey: async (): Promise<string | null> => {
    return invoke('get_api_key');
  },

  // 设置 API Key
  setApiKey: async (apiKey: string): Promise<void> => {
    return invoke('set_api_key', { apiKey });
  },

  // 获取设置
  getSettings: async (): Promise<Record<string, unknown>> => {
    return invoke('get_settings');
  },

  // 保存设置
  saveSettings: async (settings: Record<string, unknown>): Promise<void> => {
    return invoke('save_settings', { settings });
  },
};
