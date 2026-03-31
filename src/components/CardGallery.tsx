import { Download, ZoomIn, X } from 'lucide-react';
import { useState } from 'react';
import type { DetectedCard } from '../services/CardDetectionService';

interface CardGalleryProps {
  cards: DetectedCard[];
  onDownloadAll: () => void;
}

export function CardGallery({ cards, onDownloadAll }: CardGalleryProps) {
  const [selectedCard, setSelectedCard] = useState<DetectedCard | null>(null);

  const handleDownload = (card: DetectedCard, index: number) => {
    const link = document.createElement('a');
    link.href = card.imageData;
    link.download = `pokemon-card-${index + 1}.png`;
    link.click();
  };

  if (cards.length === 0) {
    return null;
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
          Detected Cards ({cards.length})
        </h2>
        <button
          onClick={onDownloadAll}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Download All
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {cards.map((card, index) => (
          <div
            key={card.id}
            className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow"
          >
            <div className="aspect-[2.5/3.5] relative">
              <img
                src={card.imageData}
                alt={`Card ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                <button
                  onClick={() => setSelectedCard(card)}
                  className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                  title="View larger"
                >
                  <ZoomIn className="w-5 h-5 text-gray-700" />
                </button>
                <button
                  onClick={() => handleDownload(card, index)}
                  className="p-2 bg-white/90 rounded-full hover:bg-white transition-colors"
                  title="Download"
                >
                  <Download className="w-5 h-5 text-gray-700" />
                </button>
              </div>
            </div>
            <div className="p-2 text-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                Card #{index + 1}
              </span>
            </div>
          </div>
        ))}
      </div>

      {selectedCard && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setSelectedCard(null)}
        >
          <div className="relative max-w-2xl max-h-[90vh]">
            <button
              onClick={() => setSelectedCard(null)}
              className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300 transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={selectedCard.imageData}
              alt="Selected card"
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}
