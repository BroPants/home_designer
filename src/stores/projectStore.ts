import { create } from 'zustand';
import { Project, ProjectSummary, Message, Rendering } from '@/types';

interface ProjectState {
  // 当前项目
  currentProject: Project | null;
  // 项目列表
  projects: ProjectSummary[];
  // 加载状态
  isLoading: boolean;
  // 错误信息
  error: string | null;

  // Actions
  setCurrentProject: (project: Project | null) => void;
  setProjects: (projects: ProjectSummary[]) => void;
  addProject: (project: ProjectSummary) => void;
  updateProject: (id: string, updates: Partial<ProjectSummary>) => void;
  removeProject: (id: string) => void;
  addMessage: (message: Message) => void;
  addRendering: (rendering: Rendering) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  currentProject: null,
  projects: [],
  isLoading: false,
  error: null,

  setCurrentProject: (project) => set({ currentProject: project }),

  setProjects: (projects) => set({ projects }),

  addProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects],
    })),

  updateProject: (id, updates) =>
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    })),

  removeProject: (id) =>
    set((state) => ({
      projects: state.projects.filter((p) => p.id !== id),
      currentProject:
        state.currentProject?.id === id ? null : state.currentProject,
    })),

  addMessage: (message) =>
    set((state) => {
      if (!state.currentProject) return state;
      const conversations = state.currentProject.conversations;
      const currentConversation =
        conversations[conversations.length - 1] || {
          id: crypto.randomUUID(),
          createdAt: Date.now(),
          messages: [],
        };

      currentConversation.messages.push(message);

      return {
        currentProject: {
          ...state.currentProject,
          conversations:
            conversations.length > 0
              ? [
                  ...conversations.slice(0, -1),
                  currentConversation,
                ]
              : [currentConversation],
        },
      };
    }),

  addRendering: (rendering) =>
    set((state) => {
      if (!state.currentProject) return state;
      return {
        currentProject: {
          ...state.currentProject,
          renderings: [...state.currentProject.renderings, rendering],
        },
      };
    }),

  setLoading: (isLoading) => set({ isLoading }),

  setError: (error) => set({ error }),
}));
