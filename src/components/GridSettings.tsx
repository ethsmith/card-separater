import { Grid3X3 } from 'lucide-react';

interface GridSettingsProps {
  rows: number;
  cols: number;
  onRowsChange: (rows: number) => void;
  onColsChange: (cols: number) => void;
  useGrid: boolean;
  onUseGridChange: (useGrid: boolean) => void;
  cropMargin: number;
  onCropMarginChange: (margin: number) => void;
  cellPadding: number;
  onCellPaddingChange: (padding: number) => void;
}

export function GridSettings({
  rows,
  cols,
  onRowsChange,
  onColsChange,
  useGrid,
  onUseGridChange,
  cropMargin,
  onCropMarginChange,
  cellPadding,
  onCellPaddingChange,
}: GridSettingsProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-md">
      <div className="flex items-center gap-3 mb-4">
        <Grid3X3 className="w-5 h-5 text-purple-500" />
        <h3 className="font-semibold text-gray-800 dark:text-gray-100">Detection Mode</h3>
      </div>

      <div className="flex items-center gap-4 mb-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="detectionMode"
            checked={!useGrid}
            onChange={() => onUseGridChange(false)}
            className="w-4 h-4 text-purple-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Auto-detect</span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="detectionMode"
            checked={useGrid}
            onChange={() => onUseGridChange(true)}
            className="w-4 h-4 text-purple-600"
          />
          <span className="text-sm text-gray-700 dark:text-gray-300">Grid mode</span>
        </label>
      </div>

      {useGrid && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Rows:</label>
              <input
                type="number"
                min={1}
                max={10}
                value={rows}
                onChange={(e) => onRowsChange(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400">Columns:</label>
              <input
                type="number"
                min={1}
                max={10}
                value={cols}
                onChange={(e) => onColsChange(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-center bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200"
              />
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              = {rows * cols} cards
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400" title="Crop edges of the image before splitting">
                Edge Crop:
              </label>
              <input
                type="range"
                min={0}
                max={20}
                value={cropMargin}
                onChange={(e) => onCropMarginChange(parseInt(e.target.value))}
                className="w-24 accent-purple-500"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400 w-10">{cropMargin}%</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 dark:text-gray-400" title="Padding inside each cell to exclude borders">
                Cell Padding:
              </label>
              <input
                type="range"
                min={0}
                max={15}
                value={cellPadding}
                onChange={(e) => onCellPaddingChange(parseInt(e.target.value))}
                className="w-24 accent-purple-500"
              />
              <span className="text-sm text-gray-500 dark:text-gray-400 w-10">{cellPadding}%</span>
            </div>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
        {useGrid
          ? 'Grid mode splits the image into equal sections. Adjust Edge Crop to remove binder borders, Cell Padding to trim sleeve edges.'
          : 'Auto-detect finds card edges automatically. Best for loose cards.'}
      </p>
    </div>
  );
}
