import { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Upload, Camera, ArrowLeft, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Tesseract from 'tesseract.js';
import topPokemon from '../../top_pokemon.json';
import CardDetectionService from '../services/CardDetectionService';

interface MatchResult {
  found: boolean;
  name: string;
  ranking?: number;
  extractedText: string;
}

export function CardChecker() {
  const [isProcessing, setIsProcessing] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [processedCardImage, setProcessedCardImage] = useState<string | null>(null);
  const [croppedNameImage, setCroppedNameImage] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [useCamera, setUseCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setUseCamera(false);
  }, [stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const findPokemonInText = (text: string): MatchResult => {
    const cleanedText = text.toLowerCase().replace(/[^a-z\s]/g, ' ');
    
    for (const pokemon of topPokemon) {
      const pokemonName = pokemon.name.toLowerCase();
      if (cleanedText.includes(pokemonName)) {
        return {
          found: true,
          name: pokemon.name,
          ranking: pokemon.ranking,
          extractedText: text,
        };
      }
    }

    const words = cleanedText.split(/\s+/).filter(w => w.length > 2);
    for (const pokemon of topPokemon) {
      const pokemonName = pokemon.name.toLowerCase();
      for (const word of words) {
        if (word.length >= 4 && pokemonName.includes(word)) {
          return {
            found: true,
            name: pokemon.name,
            ranking: pokemon.ranking,
            extractedText: text,
          };
        }
      }
    }

    return {
      found: false,
      name: '',
      extractedText: text,
    };
  };

  const cropToNameRegion = (imageData: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d')!;
        
        // Crop to the name region (top area of card)
        // Name is in the top ~5-12% of the card height, starting after "BASIC" tag
        const cropX = Math.round(img.width * 0.12);
        const cropY = Math.round(img.height * 0.03);
        const cropWidth = Math.round(img.width * 0.55);
        const cropHeight = Math.round(img.height * 0.07);
        
        canvas.width = cropWidth;
        canvas.height = cropHeight;
        
        // Draw cropped region
        ctx.drawImage(
          img,
          cropX, cropY, cropWidth, cropHeight,
          0, 0, cropWidth, cropHeight
        );
        
        // Keep original colors - just pass through to Tesseract
        // The name region was readable before preprocessing
        resolve(canvas.toDataURL('image/png'));
      };
      img.src = imageData;
    });
  };

  const processImage = async (imageData: string) => {
    setIsProcessing(true);
    setError(null);
    setResult(null);
    setProcessedCardImage(null);
    setCroppedNameImage(null);
    setImagePreview(imageData);

    try {
      // First, use the card detection model to extract just the card
      const img = new Image();
      img.src = imageData;
      await new Promise((resolve) => { img.onload = resolve; });
      
      const detector = CardDetectionService.getInstance();
      await detector.loadModel();
      const detection = await detector.detectCards(img);
      
      let cardImage = imageData;
      if (detection.cards.length > 0) {
        // Use the first detected card's extracted image
        cardImage = detection.cards[0].imageData;
        setProcessedCardImage(cardImage);
        console.log('Card detected and extracted');
      } else {
        console.log('No card detected, using original image');
        setProcessedCardImage(null);
      }
      
      // Crop to name region and preprocess
      const croppedImage = await cropToNameRegion(cardImage);
      setCroppedNameImage(croppedImage);
      
      const worker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => console.log(m),
      });
      await worker.setParameters({
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_LINE,
      });
      const { data: { text } } = await worker.recognize(croppedImage);
      await worker.terminate();

      console.log('Extracted text:', text);
      const matchResult = findPokemonInText(text);
      setResult(matchResult);
    } catch (err) {
      console.error('OCR error:', err);
      setError('Failed to read text from the card. Please try a clearer image.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        processImage(imageData);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      const file = event.dataTransfer.files[0];
      if (!file || !file.type.startsWith('image/')) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        const imageData = e.target?.result as string;
        processImage(imageData);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: 'environment' }, 
          width: { ideal: 1920, min: 1280 }, 
          height: { ideal: 1080, min: 720 } 
        },
        audio: false,
      });
      setStream(mediaStream);
      setUseCamera(true);
    } catch (err) {
      console.error('Camera error:', err);
      setError('Could not access camera. Please check permissions.');
    }
  };

  useEffect(() => {
    if (useCamera && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(console.error);
    }
  }, [useCamera, stream]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0);
      const imageData = canvas.toDataURL('image/jpeg', 0.95);
      stopCamera();
      processImage(imageData);
    }
  };

  const handleReset = () => {
    setImagePreview(null);
    setProcessedCardImage(null);
    setCroppedNameImage(null);
    setResult(null);
    setError(null);
    stopCamera();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900">
      <div className="absolute top-2 right-4 text-xs text-gray-400 dark:text-gray-500">
        v1.1.1
      </div>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Link 
          to="/" 
          className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300 mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Card Extractor
        </Link>

        <header className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent mb-3">
            Top Pokemon Checker
          </h1>
          <p className="text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Scan or upload a single Pokemon card to check if it's on the Top 150 Pokemon list.
          </p>
        </header>

        <div className="space-y-6">
          {!imagePreview && !useCamera && (
            <div className="grid md:grid-cols-2 gap-4">
              <div
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all duration-200 ease-in-out border-gray-300 dark:border-gray-600 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex flex-col items-center gap-4">
                  <Upload className="w-12 h-12 text-gray-400" />
                  <div className="text-center">
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                      Upload Image
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Drop or click to browse
                    </p>
                  </div>
                </div>
              </div>

              <div
                onClick={startCamera}
                className="border-2 border-dashed rounded-2xl p-8 cursor-pointer transition-all duration-200 ease-in-out border-gray-300 dark:border-gray-600 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20"
              >
                <div className="flex flex-col items-center gap-4">
                  <Camera className="w-12 h-12 text-gray-400" />
                  <div className="text-center">
                    <p className="text-lg font-medium text-gray-700 dark:text-gray-200">
                      Use Camera
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Scan card with your device
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {useCamera && (
            <div className="relative">
              <div className="relative rounded-2xl overflow-hidden bg-black max-h-[60vh]">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  webkit-playsinline="true"
                  className="w-full h-full object-cover max-h-[60vh]"
                />
                <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                  <button
                    onClick={capturePhoto}
                    className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors border-4 border-purple-500"
                  >
                    <Camera className="w-8 h-8 text-purple-600" />
                  </button>
                  <button
                    onClick={stopCamera}
                    className="w-12 h-12 bg-gray-800/80 rounded-full flex items-center justify-center shadow-lg hover:bg-gray-700 transition-colors"
                  >
                    <XCircle className="w-6 h-6 text-white" />
                  </button>
                </div>
              </div>
              <canvas ref={canvasRef} className="hidden" />
            </div>
          )}

          {isProcessing && (
            <div className="text-center py-12">
              <Loader2 className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-300">Reading card text...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-center">
              <p className="text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {imagePreview && !isProcessing && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">Original Image</p>
                <img
                  src={imagePreview}
                  alt="Scanned card"
                  className="max-h-64 mx-auto rounded-lg"
                />
              </div>

              {processedCardImage && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">Detected Card (extracted by AI)</p>
                  <img
                    src={processedCardImage}
                    alt="Detected card"
                    className="max-h-64 mx-auto rounded-lg"
                  />
                </div>
              )}

              {croppedNameImage && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-lg">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 text-center">Name Region (sent to OCR)</p>
                  <img
                    src={croppedNameImage}
                    alt="Cropped name region"
                    className="max-h-24 mx-auto rounded-lg border border-gray-300"
                  />
                </div>
              )}

              {result && (
                <div className="space-y-4">
                  <div className={`rounded-2xl p-6 ${
                    result.found 
                      ? 'bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800' 
                      : 'bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800'
                  }`}>
                    <div className="flex items-center gap-4">
                      {result.found ? (
                        <CheckCircle className="w-12 h-12 text-green-500 flex-shrink-0" />
                      ) : (
                        <XCircle className="w-12 h-12 text-yellow-500 flex-shrink-0" />
                      )}
                      <div>
                        {result.found ? (
                          <>
                            <h2 className="text-2xl font-bold text-green-700 dark:text-green-400">
                              {result.name} Found!
                            </h2>
                            <p className="text-green-600 dark:text-green-300">
                              Ranked #{result.ranking} on the Top 150 Pokemon list
                            </p>
                          </>
                        ) : (
                          <>
                            <h2 className="text-2xl font-bold text-yellow-700 dark:text-yellow-400">
                              Not on Top 150 List
                            </h2>
                            <p className="text-yellow-600 dark:text-yellow-300">
                              This Pokemon was not found in the Top 150 list
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {result.found ? 'Detected name:' : 'Text scanned from card:'}
                    </p>
                    <p className="text-gray-700 dark:text-gray-300 font-semibold whitespace-pre-wrap max-h-24 overflow-y-auto">
                      {result.found ? result.name : (result.extractedText || 'No text detected')}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-center">
                <button
                  onClick={handleReset}
                  className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
                >
                  Scan Another Card
                </button>
              </div>
            </div>
          )}
        </div>

        <footer className="mt-16 text-center text-sm text-gray-500 dark:text-gray-400">
          <p>Uses OCR to read Pokemon names from cards.</p>
        </footer>
      </div>
    </div>
  );
}
