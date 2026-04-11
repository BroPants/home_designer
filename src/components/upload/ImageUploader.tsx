import { useCallback, useState, useMemo } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Loader2, Maximize2 } from 'lucide-react';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import { ImageFile, ImageType } from '@/types';
import { formatFileSize } from '@/utils/format';
import { ImageLightbox } from './ImageLightbox';

interface ImageUploaderProps {
  type: ImageType;
  images: ImageFile[];
  onUpload: (files: File[]) => void;
  onDelete: (imageId: string) => void;
  maxFiles?: number;
  accept?: Record<string, string[]>;
  isLoading?: boolean;
}

const defaultAccept = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
};

// 将本地文件路径转换为可访问的 URL
function getImageUrl(path: string): string {
  if (!path) {
    console.warn('[ImageUploader] Empty path provided');
    return '';
  }
  try {
    const url = convertFileSrc(path);
    console.log('[ImageUploader] Converting path:', path, '->', url);
    return url;
  } catch (err) {
    console.error('[ImageUploader] Failed to convert path:', path, err);
    return '';
  }
}

export function ImageUploader({
  type,
  images,
  onUpload,
  onDelete,
  maxFiles = 10,
  accept = defaultAccept,
  isLoading = false,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number>(-1);
  const isLightboxOpen = lightboxIndex >= 0;

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      console.log('[ImageUploader] Dropped files:', acceptedFiles.map(f => f.name));
      const fileIds = acceptedFiles.map(f => f.name + f.size);
      setUploadingFiles(prev => new Set([...prev, ...fileIds]));
      
      try {
        await onUpload(acceptedFiles);
      } catch (err) {
        console.error('[ImageUploader] Upload failed:', err);
      } finally {
        setUploadingFiles(prev => {
          const next = new Set(prev);
          fileIds.forEach(id => next.delete(id));
          return next;
        });
      }
      setIsDragging(false);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: maxFiles - images.length,
    disabled: images.length >= maxFiles || isLoading,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  });

  const isFloorPlan = type === 'floorPlan';
  const title = isFloorPlan ? '户型图' : '实拍图';
  const description = isFloorPlan
    ? '上传户型平面图，支持 JPG、PNG 格式（最多1张）'
    : '上传房间实拍照片，支持 JPG、PNG 格式（最多5张）';

  console.log('[ImageUploader] Rendering with images:', images.map(i => ({ id: i.id, path: i.path, thumb: i.thumbnailPath })));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">{title}</h3>
        <span className="text-xs text-gray-500">
          {images.length} / {maxFiles}
        </span>
      </div>

      {/* 图片列表 */}
      {images.length > 0 && (
        <div className={`grid gap-2 ${isFloorPlan ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {images.map((image, index) => (
            <ImageThumbnail
              key={image.id}
              image={image}
              onDelete={() => onDelete(image.id)}
              onView={() => setLightboxIndex(index)}
              isFloorPlan={isFloorPlan}
            />
          ))}
        </div>
      )}

      {/* 图片预览 Lightbox */}
      <ImageLightbox
        images={images}
        currentIndex={lightboxIndex}
        isOpen={isLightboxOpen}
        onClose={() => setLightboxIndex(-1)}
        onNavigate={setLightboxIndex}
      />

      {/* 上传区域 */}
      {images.length < maxFiles && (
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-lg p-4 cursor-pointer
            transition-colors duration-200
            ${isDragActive || isDragging
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50'
            }
            ${(isLoading || uploadingFiles.size > 0) ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div
              className={`p-2 rounded-full ${
                isDragActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
              }`}
            >
              {isLoading || uploadingFiles.size > 0 ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Upload className="w-5 h-5" />
              )}
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600">
                {isDragActive 
                  ? '松开以上传' 
                  : isLoading || uploadingFiles.size > 0 
                    ? '上传中...' 
                    : '点击或拖拽上传'
                }
              </p>
              <p className="text-xs text-gray-400 mt-1">
                {description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 图片缩略图组件
function ImageThumbnail({
  image,
  onDelete,
  onView,
  isFloorPlan,
}: {
  image: ImageFile;
  onDelete: () => void;
  onView: () => void;
  isFloorPlan: boolean;
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const imageUrl = useMemo(() => {
    console.log('[ImageThumbnail] Processing image:', image.id, 'path:', image.path, 'thumbPath:', image.thumbnailPath);
    const path = image.thumbnailPath || image.path;
    if (!path) {
      console.warn('[ImageThumbnail] No path available for image:', image.id);
      return '';
    }
    const url = getImageUrl(path);
    console.log('[ImageThumbnail] Image URL:', url);
    return url;
  }, [image]);

  if (!imageUrl) {
    return (
      <div className={`relative rounded-lg border border-gray-200 bg-gray-100 flex items-center justify-center ${isFloorPlan ? 'aspect-video' : 'aspect-square'}`}>
        <div className="text-center text-gray-400">
          <ImageIcon className="w-8 h-8 mx-auto mb-1" />
          <span className="text-xs">无效图片路径</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="absolute top-1.5 right-1.5 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-sm"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div
      className={`relative group rounded-lg border border-gray-200 overflow-hidden bg-gray-50 cursor-pointer ${
        isFloorPlan ? 'aspect-video' : 'aspect-square'
      }`}
      onClick={onView}
    >
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
        </div>
      )}
      
      {hasError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
          <ImageIcon className="w-8 h-8 mb-1" />
          <span className="text-xs">加载失败</span>
          <span className="text-[10px] text-gray-300 mt-1 px-2 text-center truncate max-w-full">{image.thumbnailPath || image.path}</span>
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={image.filename}
          className={`w-full h-full object-cover transition-opacity duration-200 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          onLoad={() => {
            console.log('[ImageThumbnail] Image loaded:', image.id);
            setIsLoaded(true);
          }}
          onError={(e) => {
            console.error('[ImageThumbnail] Image failed to load:', image.id, 'url:', imageUrl, 'error:', e);
            setHasError(true);
          }}
        />
      )}

      {/* 悬停遮罩 */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />
      
      {/* 查看按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onView();
        }}
        className="absolute top-1.5 left-1.5 p-1.5 bg-white/90 text-gray-700 rounded-full 
                   opacity-0 group-hover:opacity-100 transition-all hover:bg-white 
                   shadow-sm transform scale-90 group-hover:scale-100"
        title="查看大图"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
      
      {/* 删除按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        className="absolute top-1.5 right-1.5 p-1.5 bg-red-500 text-white rounded-full 
                   opacity-0 group-hover:opacity-100 transition-all hover:bg-red-600 
                   shadow-sm transform scale-90 group-hover:scale-100"
        title="删除图片"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      
      {/* 文件名提示 */}
      <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent 
                      text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="truncate">{image.filename}</p>
        <p className="text-[10px] text-gray-300">
          {formatFileSize(image.size)} · {image.width}×{image.height}
        </p>
      </div>
    </div>
  );
}

// 图片预览组件（列表形式）
export function ImagePreview({ image, onRemove }: { image: ImageFile; onRemove?: () => void }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const imageUrl = useMemo(() => getImageUrl(image.thumbnailPath || image.path), [image]);

  return (
    <div className="relative group">
      <div className="flex items-center space-x-3 p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0">
          {!isLoaded && <ImageIcon className="w-5 h-5 text-gray-400" />}
          <img
            src={imageUrl}
            alt={image.filename}
            className={`w-full h-full object-cover ${isLoaded ? 'block' : 'hidden'}`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setIsLoaded(false)}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">
            {image.filename}
          </p>
          <p className="text-xs text-gray-500">
            {formatFileSize(image.size)} · {image.width}×{image.height}
          </p>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
