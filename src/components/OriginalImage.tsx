import { RotateCcw } from 'lucide-react';

interface OriginalImageProps {
  imageSrc: string;
  fileName: string;
  onReset: () => void;
}

export function OriginalImage({ imageSrc, fileName, onReset }: OriginalImageProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div>
          <h3 className="font-semibold text-gray-800 dark:text-gray-100">Original Image</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{fileName}</p>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          New Image
        </button>
      </div>
      <div className="p-4">
        <img
          src={imageSrc}
          alt="Original uploaded image"
          className="w-full h-auto max-h-96 object-contain rounded-lg"
        />
      </div>
    </div>
  );
}
