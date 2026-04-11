import { useEffect, useCallback, useState, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { ImageFile } from '@/types';

interface ImageLightboxProps {
  images: ImageFile[];
  currentIndex: number;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (index: number) => void;
}

export function ImageLightbox({
  images,
  currentIndex,
  isOpen,
  onClose,
  onNavigate,
}: ImageLightboxProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const currentImage = images[currentIndex];

  const imageUrl = useMemo(() => {
    if (!currentImage?.path) return '';
    try {
      return convertFileSrc(currentImage.path);
    } catch {
      return '';
    }
  }, [currentImage]);

  // 重置缩放和位置当切换图片时
  useEffect(() => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  }, [currentIndex]);

  // 键盘事件处理
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          if (currentIndex > 0) {
            onNavigate?.(currentIndex - 1);
          }
          break;
        case 'ArrowRight':
          if (currentIndex < images.length - 1) {
            onNavigate?.(currentIndex + 1);
          }
          break;
        case '+':
        case '=':
          setScale((s) => Math.min(s * 1.2, 5));
          break;
        case '-':
          setScale((s) => Math.max(s / 1.2, 0.5));
          break;
        case '0':
          setScale(1);
          setPosition({ x: 0, y: 0 });
          break;
      }
    },
    [isOpen, currentIndex, images.length, onClose, onNavigate]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // 阻止背景滚动
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // 缩放处理
  const handleZoomIn = () => setScale((s) => Math.min(s * 1.2, 5));
  const handleZoomOut = () => setScale((s) => Math.max(s / 1.2, 0.5));
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  // 拖拽处理
  const handleMouseDown = (e: React.MouseEvent) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && scale > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setScale((s) => Math.min(s * 1.1, 5));
    } else {
      setScale((s) => Math.max(s / 1.1, 0.5));
    }
  };

  if (!isOpen || !currentImage) return null;

  const canGoPrev = currentIndex > 0;
  const canGoNext = currentIndex < images.length - 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* 顶部工具栏 */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/50 to-transparent">
        <div className="text-white text-sm">
          <span className="font-medium">{currentImage.filename}</span>
          <span className="ml-3 text-white/60">
            {currentImage.width} × {currentImage.height}
          </span>
          <span className="ml-3 text-white/60">
            {currentIndex + 1} / {images.length}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          {/* 缩放控制 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleZoomOut();
            }}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="缩小 (-)"
          >
            <ZoomOut className="w-5 h-5" />
          </button>
          <span className="text-white/80 text-sm min-w-[60px] text-center">
            {Math.round(scale * 100)}%
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleZoomIn();
            }}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="放大 (+)"
          >
            <ZoomIn className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReset();
            }}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="重置 (0)"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <div className="w-px h-6 bg-white/20 mx-2" />
          {/* 关闭按钮 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="关闭 (Esc)"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* 左右导航 */}
      {canGoPrev && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate?.(currentIndex - 1);
          }}
          className="absolute left-4 z-10 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
          title="上一张 (←)"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
      )}
      {canGoNext && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate?.(currentIndex + 1);
          }}
          className="absolute right-4 z-10 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-all"
          title="下一张 (→)"
        >
          <ChevronRight className="w-8 h-8" />
        </button>
      )}

      {/* 图片容器 */}
      <div
        className="relative max-w-[90vw] max-h-[85vh] overflow-hidden cursor-grab active:cursor-grabbing"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <img
          src={imageUrl}
          alt={currentImage.filename}
          className="max-w-full max-h-[85vh] object-contain transition-transform duration-200"
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
          draggable={false}
        />
      </div>

      {/* 底部提示 */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-white/40 text-xs">
        使用鼠标滚轮缩放 · 拖拽移动 · 键盘 ← → 切换图片 · Esc 关闭
      </div>
    </div>
  );
}
