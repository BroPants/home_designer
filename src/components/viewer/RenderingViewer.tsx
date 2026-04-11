import { useState, useMemo } from 'react';
import { Download, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Sparkles, Loader2 } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { Rendering } from '@/types';

interface RenderingViewerProps {
  renderings: Rendering[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onExport?: (rendering: Rendering) => void;
  onGenerate?: () => void;
  isGenerating?: boolean;
}

export function RenderingViewer({
  renderings,
  currentIndex,
  onSelect,
  onExport,
  onGenerate,
  isGenerating = false,
}: RenderingViewerProps) {
  const [zoom, setZoom] = useState(1);

  const currentRendering = renderings[currentIndex];

  // 转换图片路径为可访问的 URL
  const imageUrl = useMemo(() => {
    if (!currentRendering?.imagePath) return '';
    try {
      return convertFileSrc(currentRendering.imagePath);
    } catch {
      return '';
    }
  }, [currentRendering]);

  const thumbnailUrl = useMemo((path: string) => {
    try {
      return convertFileSrc(path);
    } catch {
      return '';
    }
  }, []);

  if (renderings.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-primary-600" />
        </div>
        <h3 className="text-gray-700 font-medium">暂无效果图</h3>
        <p className="text-sm text-gray-400 mt-1 mb-4">与 AI 对话后生成设计方案</p>
        {onGenerate && (
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>生成中...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>生成效果图</span>
              </>
            )}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* 主图区域 */}
      <div className="flex-1 relative bg-gray-900 rounded-xl overflow-hidden">
        <img
          src={imageUrl}
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
                src={thumbnailUrl(rendering.thumbnailPath)}
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

      {/* 生成新效果图按钮 */}
      {onGenerate && (
        <button
          onClick={onGenerate}
          disabled={isGenerating}
          className="mt-3 flex items-center justify-center space-x-2 px-4 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>正在生成效果图...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>生成新效果图</span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
