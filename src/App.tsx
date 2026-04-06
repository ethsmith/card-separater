import { useState, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ImageUploader } from './components/ImageUploader';
import { CardGallery } from './components/CardGallery';
import { OriginalImage } from './components/OriginalImage';
import CardDetectionService from './services/CardDetectionService';
import type { DetectedCard } from './services/CardDetectionService';
import { Sparkles, Search } from 'lucide-react';

function App() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [cards, setCards] = useState<DetectedCard[]>([]);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [modelReady, setModelReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(true);

  useEffect(() => {
    const detector = CardDetectionService.getInstance();
    detector.loadModel()
      .then(() => {
        setModelReady(true);
        setModelLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load model:', err);
        setError('Failed to load AI model. Please refresh the page.');
        setModelLoading(false);
      });
  }, []);

  const handleImageLoad = useCallback(
    async (image: HTMLImageElement, file: File) => {
      setIsProcessing(true);
      setError(null);
      setOriginalImage(image.src);
      setFileName(file.name);

      try {
        const detector = CardDetectionService.getInstance();
        const result = await detector.detectCards(image);

        setCards(result.cards);

        if (result.cards.length === 0) {
          setError('No cards detected. Try a clearer image with visible card edges.');
        }
      } catch (err) {
        console.error('Card detection error:', err);
        setError('Failed to process image. Please try again.');
      } finally {
        setIsProcessing(false);
      }
    },
    []
  );

  const handleDownloadAll = useCallback(() => {
    cards.forEach((card, index) => {
      const link = document.createElement('a');
      link.href = card.imageData;
      link.download = `pokemon-card-${index + 1}.png`;
      setTimeout(() => link.click(), index * 100);
    });
  }, [cards]);

  const handleReset = useCallback(() => {
    setCards([]);
    setOriginalImage(null);
    setFileName('');
    setError(null);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      <div className="absolute top-2 right-4 text-xs text-gray-400 dark:text-gray-500">
        v1.2.4
      </div>
      <div className="max-w-7xl mx-auto px-4 py-8">
        <header className="text-center mb-10">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Sparkles className="w-10 h-10 text-purple-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              Pokemon Card Extractor
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Upload a photo of your Pokemon cards and we'll automatically detect and separate each card for easy pricing.
          </p>
          {modelLoading && (
            <p className="mt-2 text-sm text-amber-600 dark:text-amber-400">
              Loading AI model...
            </p>
          )}
          {modelReady && (
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">
              AI model ready ✓
            </p>
          )}
          <Link
            to="/checker"
            className="inline-flex items-center gap-2 mt-4 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
          >
            <Search className="w-5 h-5" />
            Check Top 150 Pokemon
          </Link>
        </header>

        <div className="space-y-6">
          {!originalImage ? (
            <ImageUploader onImageLoad={handleImageLoad} isProcessing={isProcessing} />
          ) : (
            <OriginalImage
              imageSrc={originalImage}
              fileName={fileName}
              onReset={handleReset}
            />
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {isProcessing && (
            <div className="text-center py-8">
              <div className="inline-block w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Analyzing image and detecting cards...</p>
            </div>
          )}

          <CardGallery cards={cards} onDownloadAll={handleDownloadAll} />
        </div>

        <footer className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Powered by YOLO11 AI model for accurate card detection.</p>
        </footer>
      </div>
    </div>
  );
}

export default App;
