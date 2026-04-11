import { useState } from 'react';
import { Plus, Trash2, Clock, Image as ImageIcon, MessageSquare, Settings } from 'lucide-react';
import { ProjectSummary } from '@/types';
import { formatTimestamp } from '@/utils/format';

interface ProjectSidebarProps {
  projects: ProjectSummary[];
  currentProjectId: string | null;
  onSelectProject: (id: string) => void;
  onCreateProject: () => void;
  onDeleteProject: (id: string) => void;
  onOpenSettings?: () => void;
}

export function ProjectSidebar({
  projects,
  currentProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onOpenSettings,
}: ProjectSidebarProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (deletingId === id) {
      onDeleteProject(id);
      setDeletingId(null);
    } else {
      setDeletingId(id);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  return (
    <div className="flex flex-col h-full bg-sidebar-bg border-r border-sidebar-border">
      {/* 标题栏 */}
      <div className="p-4 border-b border-sidebar-border">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">设计方案</h2>
          <button
            onClick={onCreateProject}
            className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            title="新建方案"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-1">
          共 {projects.length} 个方案
        </p>
      </div>

      {/* 项目列表 */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {projects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <ImageIcon className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-sm text-gray-500">暂无设计方案</p>
            <p className="text-xs text-gray-400 mt-1">点击上方 + 创建新方案</p>
          </div>
        ) : (
          projects.map((project) => (
            <div
              key={project.id}
              onClick={() => onSelectProject(project.id)}
              className={`
                group relative p-3 rounded-xl cursor-pointer
                transition-all duration-200
                ${
                  currentProjectId === project.id
                    ? 'bg-white shadow-sm ring-1 ring-primary-200'
                    : 'hover:bg-white/60'
                }
              `}
            >
              <div className="flex items-start space-x-3">
                {/* 缩略图 */}
                <div className="flex-shrink-0 w-14 h-14 rounded-lg bg-gray-100 overflow-hidden">
                  {project.thumbnailPath ? (
                    <img
                      src={`data:image/jpeg;base64,${project.thumbnailPath}`}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-300" />
                    </div>
                  )}
                </div>

                {/* 信息 */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-800 truncate">
                    {project.name}
                  </h3>
                  <div className="flex items-center text-xs text-gray-500 mt-1 space-x-2">
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {formatTimestamp(project.updatedAt)}
                    </span>
                  </div>
                  <div className="flex items-center text-xs text-gray-400 mt-1.5 space-x-3">
                    <span className="flex items-center">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      {project.messageCount}
                    </span>
                    <span className="flex items-center">
                      <ImageIcon className="w-3 h-3 mr-1" />
                      {project.renderingCount}
                    </span>
                  </div>
                </div>

                {/* 删除按钮 */}
                <button
                  onClick={(e) => handleDelete(project.id, e)}
                  className={`
                    p-1.5 rounded-lg transition-all duration-200
                    ${
                      deletingId === project.id
                        ? 'bg-red-100 text-red-600'
                        : 'text-gray-400 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500'
                    }
                  `}
                  title={deletingId === project.id ? '再次点击确认删除' : '删除方案'}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 底部信息 */}
      <div className="p-3 border-t border-sidebar-border">
        <div className="flex items-center justify-between">
          <div className="text-xs text-gray-400">
            Home Designer v0.1.0
          </div>
          <button
            onClick={onOpenSettings}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            title="设置"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
