import { useState } from 'react';
import { Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight } from 'lucide-react';
import { Rendering } from '@/types';

interface RenderingViewerProps {
  renderings: Rendering[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onExport?: (rendering: Rendering) => void;
}

export function RenderingViewer({
  renderings,
  currentIndex,
  onSelect,
  onExport,
}: RenderingViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [_isFullscreen, _setIsFullscreen] = useState(false);

  const currentRendering = renderings[currentIndex];

  if (renderings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>
        <h3 className="text-gray-500 font-medium">暂无效果图</h3>
        <p className="text-sm text-gray-400 mt-1">与 AI 对话生成设计方案</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 主图区域 */}
      <div className="flex-1 relative bg-gray-900 rounded-xl overflow-hidden">
        <img
          src={`data:image/png;base64,${currentRendering?.imagePath}`}
          alt="设计效果图"
          className="w-full h-full object-contain transition-transform duration-200"
          style={{ transform: `scale(${zoom})` }}
        />

        {/* 工具栏 */}
        <div className="absolute top-4 right-4 flex items-center space-x-2">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.25, 3))}
            className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.25, 0.5))}
            className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="px-3 py-2 bg-black/50 text-white text-sm rounded-lg hover:bg-black/70 transition-colors"
          >
            {Math.round(zoom * 100)}%
          </button>
          {onExport && (
            <button
              onClick={() => onExport(currentRendering)}
              className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 切换按钮 */}
        {renderings.length > 1 && (
          <>
            <button
              onClick={() => onSelect(Math.max(0, currentIndex - 1))}
              disabled={currentIndex === 0}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => onSelect(Math.min(renderings.length - 1, currentIndex + 1))}
              disabled={currentIndex === renderings.length - 1}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors disabled:opacity-30"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}

        {/* 图片计数 */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-black/50 text-white text-sm rounded-full">
          {currentIndex + 1} / {renderings.length}
        </div>
      </div>

      {/* 缩略图列表 */}
      {renderings.length > 1 && (
        <div className="mt-3 flex space-x-2 overflow-x-auto pb-1">
          {renderings.map((rendering, index) => (
            <button
              key={rendering.id}
              onClick={() => onSelect(index)}
              className={`
                relative flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden
                transition-all duration-200
                ${
                  index === currentIndex
                    ? 'ring-2 ring-primary-500 ring-offset-2'
                    : 'opacity-60 hover:opacity-100'
                }
              `}
            >
              <img
                src={`data:image/jpeg;base64,${rendering.thumbnailPath}`}
                alt={`效果图 ${index + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* 生成信息 */}
      {currentRendering && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-500 line-clamp-2">
            <span className="font-medium">生成提示：</span>
            {currentRendering.prompt}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            生成于 {new Date(currentRendering.createdAt).toLocaleString('zh-CN')}
          </p>
        </div>
      )}
    </div>
  );
}
