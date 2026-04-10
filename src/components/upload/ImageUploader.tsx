import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { ImageFile, ImageType } from '@/types';
import { formatFileSize } from '@/utils/format';

interface ImageUploaderProps {
  type: ImageType;
  images: ImageFile[];
  onUpload: (files: File[]) => void;
  onDelete: (imageId: string) => void;
  maxFiles?: number;
  accept?: Record<string, string[]>;
}

const defaultAccept = {
  'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
};

export function ImageUploader({
  type,
  images,
  onUpload,
  onDelete,
  maxFiles = 10,
  accept = defaultAccept,
}: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      onUpload(acceptedFiles);
      setIsDragging(false);
    },
    [onUpload]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept,
    maxFiles: maxFiles - images.length,
    disabled: images.length >= maxFiles,
    onDragEnter: () => setIsDragging(true),
    onDragLeave: () => setIsDragging(false),
  });

  const isFloorPlan = type === 'floorPlan';
  const title = isFloorPlan ? '户型图' : '实拍图';
  const description = isFloorPlan
    ? '上传户型平面图，支持 JPG、PNG 格式'
    : '上传房间实拍照片，支持 JPG、PNG 格式';

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
        <div className="grid grid-cols-2 gap-2">
          {images.map((image) => (
            <div
              key={image.id}
              className="relative group aspect-square rounded-lg border border-gray-200 overflow-hidden bg-gray-50"
            >
              <img
                src={`data:image/jpeg;base64,${image.thumbnailPath}`}
                alt={image.filename}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              <button
                onClick={() => onDelete(image.id)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 px-2 py-1 bg-black/50 text-white text-xs truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {image.filename}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 上传区域 */}
      {images.length < maxFiles && (
        <div
          {...getRootProps()}
          className={`
            relative border-2 border-dashed rounded-lg p-4 cursor-pointer
            transition-colors duration-200
            ${
              isDragActive || isDragging
                ? 'border-primary-500 bg-primary-50'
                : 'border-gray-300 hover:border-gray-400 bg-gray-50'
            }
          `}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-2">
            <div
              className={`p-2 rounded-full ${
                isDragActive ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
              }`}
            >
              <Upload className="w-5 h-5" />
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-600">
                {isDragActive ? '松开以上传' : '点击或拖拽上传'}
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

// 图片预览组件
export function ImagePreview({ image, onRemove }: { image: ImageFile; onRemove?: () => void }) {
  return (
    <div className="relative group">
      <div className="flex items-center space-x-3 p-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
        <div className="w-12 h-12 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden">
          {image.thumbnailPath ? (
            <img
              src={`data:image/jpeg;base64,${image.thumbnailPath}`}
              alt={image.filename}
              className="w-full h-full object-cover"
            />
          ) : (
            <ImageIcon className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-700 truncate">
            {image.filename}
          </p>
          <p className="text-xs text-gray-500">
            {formatFileSize(image.size)} · {image.width}x{image.height}
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
