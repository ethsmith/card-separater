import { useCallback, useRef } from 'react';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface ImageUploaderProps {
  onImageLoad: (image: HTMLImageElement, file: File) => void;
  isProcessing: boolean;
}

export function ImageUploader({ onImageLoad, isProcessing }: ImageUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const img = new Image();
      img.onload = () => {
        onImageLoad(img, file);
      };
      img.src = URL.createObjectURL(file);
    },
    [onImageLoad]
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (!file || !file.type.startsWith('image/')) return;

      const img = new Image();
      img.onload = () => {
        onImageLoad(img, file);
      };
      img.src = URL.createObjectURL(file);
    },
    [onImageLoad]
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  return (
    <div
      onClick={() => fileInputRef.current?.click()}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className={`
        relative border-2 border-dashed rounded-2xl p-12 cursor-pointer
        transition-all duration-200 ease-in-out
        ${isProcessing 
          ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20' 
          : 'border-gray-300 dark:border-gray-600 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20'
        }
      `}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        disabled={isProcessing}
      />
      
      <div className="flex flex-col items-center gap-4">
        {isProcessing ? (
          <>
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-lg font-medium text-purple-600 dark:text-purple-400">
              Detecting cards...
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center gap-4">
              <Upload className="w-12 h-12 text-gray-400" />
              <ImageIcon className="w-12 h-12 text-gray-400" />
            </div>
            <div className="text-center">
              <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                Drop your Pokemon card image here
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                or click to browse
              </p>
            </div>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              Supports: JPG, PNG, WebP
            </p>
          </>
        )}
      </div>
    </div>
  );
}
