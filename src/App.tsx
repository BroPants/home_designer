import { useState, useEffect } from 'react';
import { ImageUploader } from '@/components/upload/ImageUploader';
import { ChatInterface } from '@/components/chat/ChatInterface';
import { RenderingViewer } from '@/components/viewer/RenderingViewer';
import { ProjectSidebar } from '@/components/sidebar/ProjectSidebar';
import { useProjectStore } from '@/stores/projectStore';
import { projectApi, imageApi, chatApi } from '@/services/api';
import { ImageType, ProjectSummary, Message, Rendering } from '@/types';
import './index.css';

function App() {
  // 全局状态
  const {
    currentProject,
    projects,
    isLoading,
    setCurrentProject,
    setProjects,
    addProject,
    removeProject,
    addMessage,

    setLoading,
    setError,
  } = useProjectStore();

  // 本地状态
  const [selectedRenderingIndex, setSelectedRenderingIndex] = useState(0);
  const [, setIsCreating] = useState(false);

  // 初始化：加载项目列表
  useEffect(() => {
    loadProjects();
  }, []);

  // 加载项目列表
  const loadProjects = async () => {
    try {
      const list = await projectApi.listProjects();
      setProjects(list);
    } catch (err) {
      setError('加载项目列表失败');
      console.error(err);
    }
  };

  // 选择项目
  const handleSelectProject = async (id: string) => {
    if (currentProject?.id === id) return;
    
    setLoading(true);
    try {
      const project = await projectApi.getProject(id);
      setCurrentProject(project);
      setSelectedRenderingIndex(project.renderings.length > 0 ? 0 : -1);
    } catch (err) {
      setError('加载项目失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 创建新项目
  const handleCreateProject = async () => {
    setIsCreating(true);
    try {
      const name = `设计方案 ${projects.length + 1}`;
      const project = await projectApi.createProject(name);
      
      const summary: ProjectSummary = {
        id: project.id,
        name: project.name,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        messageCount: 0,
        renderingCount: 0,
      };
      
      addProject(summary);
      setCurrentProject(project);
    } catch (err) {
      setError('创建项目失败');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  // 删除项目
  const handleDeleteProject = async (id: string) => {
    try {
      await projectApi.deleteProject(id);
      removeProject(id);
    } catch (err) {
      setError('删除项目失败');
      console.error(err);
    }
  };

  // 上传图片
  const handleUploadImage = async (files: File[], type: ImageType) => {
    if (!currentProject) return;

    setLoading(true);
    try {
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        await imageApi.uploadImage(
          currentProject.id,
          uint8Array,
          file.name,
          type
        );
      }
      
      // 刷新项目数据
      const updated = await projectApi.getProject(currentProject.id);
      setCurrentProject(updated);
    } catch (err) {
      setError('上传图片失败');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 删除图片
  const handleDeleteImage = async (imageId: string) => {
    if (!currentProject) return;

    try {
      await imageApi.deleteImage(imageId);
      const updated = await projectApi.getProject(currentProject.id);
      setCurrentProject(updated);
    } catch (err) {
      setError('删除图片失败');
      console.error(err);
    }
  };

  // 发送消息
  const handleSendMessage = async (content: string) => {
    if (!currentProject) return;

    // 添加用户消息到界面
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };
    addMessage(userMessage);

    setLoading(true);
    try {
      // 调用 API 发送消息
      await chatApi.sendMessage(currentProject.id, content);
      
      // 模拟 AI 响应（实际应从流式响应中构建）
      setTimeout(async () => {
        const aiMessage: Message = {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: '我已收到您的设计需求。基于您上传的图片，我建议采用现代简约风格，以白色和木色为主色调，增加空间感。您可以点击"生成效果图"来预览设计效果。',
          timestamp: Date.now(),
        };
        addMessage(aiMessage);
        setLoading(false);
      }, 1500);
    } catch (err) {
      setError('发送消息失败');
      setLoading(false);
      console.error(err);
    }
  };

  // 导出效果图
  const handleExportRendering = async (rendering: Rendering) => {
    // TODO: 实现导出功能
    console.log('Export rendering:', rendering);
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* 左侧边栏 - 项目列表 */}
      <div className="w-72 flex-shrink-0">
        <ProjectSidebar
          projects={projects}
          currentProjectId={currentProject?.id || null}
          onSelectProject={handleSelectProject}
          onCreateProject={handleCreateProject}
          onDeleteProject={handleDeleteProject}
        />
      </div>

      {/* 中间区域 - 图片上传和聊天 */}
      <div className="flex-1 flex min-w-0">
        {/* 图片上传区 */}
        <div className="w-72 flex-shrink-0 p-4 bg-white border-r border-gray-200 overflow-y-auto">
          {currentProject ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-800 truncate">
                  {currentProject.name}
                </h2>
              </div>
              
              <ImageUploader
                type="floorPlan"
                images={currentProject.floorPlan ? [currentProject.floorPlan] : []}
                onUpload={(files) => handleUploadImage(files, 'floorPlan')}
                onDelete={handleDeleteImage}
                maxFiles={1}
              />
              
              <ImageUploader
                type="photo"
                images={currentProject.photos}
                onUpload={(files) => handleUploadImage(files, 'photo')}
                onDelete={handleDeleteImage}
                maxFiles={5}
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <p className="text-gray-500">选择或创建一个设计方案</p>
            </div>
          )}
        </div>

        {/* 聊天区域 */}
        <div className="flex-1 min-w-0">
          {currentProject ? (
            <ChatInterface
              messages={currentProject.conversations.flatMap((c) => c.messages)}
              onSendMessage={handleSendMessage}
              isLoading={isLoading}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center bg-white">
              <div className="w-20 h-20 rounded-full bg-primary-100 flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h3 className="text-xl font-medium text-gray-800">开始对话</h3>
              <p className="text-sm text-gray-500 mt-2 max-w-sm">
                选择左侧的方案开始设计，或创建一个新的设计方案
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 右侧 - 效果图展示区 */}
      <div className="w-[480px] flex-shrink-0 p-4 bg-white border-l border-gray-200">
        {currentProject ? (
          <RenderingViewer
            renderings={currentProject.renderings}
            currentIndex={selectedRenderingIndex}
            onSelect={setSelectedRenderingIndex}
            onExport={handleExportRendering}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-gray-500">效果图将显示在这里</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
