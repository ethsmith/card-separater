import * as tf from '@tensorflow/tfjs';

export interface BoundingBox {
  points: number[][];
  confidence: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
  angle: number;
}

export interface DetectedCard {
  id: string;
  imageData: string;
  boundingBox: BoundingBox;
}

export interface DetectionResult {
  cards: DetectedCard[];
  originalImage: string;
}

class CardDetectionService {
  private static instance: CardDetectionService;
  private model: tf.GraphModel | null = null;
  private modelLoading: Promise<void> | null = null;
  private numClass = 1;

  private constructor() {}

  public static getInstance(): CardDetectionService {
    if (!CardDetectionService.instance) {
      CardDetectionService.instance = new CardDetectionService();
    }
    return CardDetectionService.instance;
  }

  public async loadModel(modelPath = '/model/model.json'): Promise<void> {
    if (this.model) {
      return;
    }

    if (this.modelLoading) {
      return this.modelLoading;
    }

    this.modelLoading = new Promise<void>((resolve, reject) => {
      tf.loadGraphModel(modelPath)
        .then((loadedModel) => {
          this.model = loadedModel;
          console.log('YOLO model loaded successfully');
          resolve();
        })
        .catch((error) => {
          console.error('Error loading model:', error);
          this.modelLoading = null;
          reject(error);
        });
    });

    return this.modelLoading;
  }

  public isModelLoaded(): boolean {
    return !!this.model;
  }

  private preprocessImage(
    image: HTMLImageElement,
    modelWidth: number,
    modelHeight: number
  ): {
    input: tf.Tensor;
    originalWidth: number;
    originalHeight: number;
    paddedWidth: number;
    paddedHeight: number;
  } {
    const originalWidth = image.width;
    const originalHeight = image.height;
    const maxSize = Math.max(originalWidth, originalHeight);
    const paddedWidth = maxSize;
    const paddedHeight = maxSize;

    const input = tf.tidy(() => {
      const img = tf.browser.fromPixels(image);
      const imgPadded = img.pad([
        [0, maxSize - originalHeight],
        [0, maxSize - originalWidth],
        [0, 0],
      ]);
      return tf.image
        .resizeBilinear(imgPadded as tf.Tensor3D, [modelWidth, modelHeight])
        .div(255.0)
        .expandDims(0);
    });

    return {
      input,
      originalWidth,
      originalHeight,
      paddedWidth,
      paddedHeight,
    };
  }

  private async detectBoundingBoxes(image: HTMLImageElement): Promise<BoundingBox[]> {
    if (!this.model) {
      throw new Error('Model not loaded');
    }

    const modelWidth = 640;
    const modelHeight = 640;
    const scoreThreshold = 0.1;
    const iouThreshold = 0.1;

    const { input, originalWidth, originalHeight, paddedWidth, paddedHeight } = 
      this.preprocessImage(image, modelWidth, modelHeight);

    try {
      tf.engine().startScope();

      const predictions = this.model.predict(input) as tf.Tensor;

      const [boxes, scores, classes, angles, boxesTransposed] = tf.tidy(() => {
        let transRes: tf.Tensor;

        if (predictions instanceof tf.Tensor && predictions.shape.length === 3 && predictions.shape[0] === 1) {
          transRes = predictions.squeeze([0]);
        } else {
          transRes = predictions;
        }

        const boxesSlice = transRes.slice([0, 0], [4, -1]);
        const boxesTransposed = boxesSlice.transpose();
        const x = boxesTransposed.slice([0, 0], [-1, 1]);
        const y = boxesTransposed.slice([0, 1], [-1, 1]);
        const w = boxesTransposed.slice([0, 2], [-1, 1]);
        const h = boxesTransposed.slice([0, 3], [-1, 1]);
        const x1 = tf.sub(x, tf.div(w, 2));
        const y1 = tf.sub(y, tf.div(h, 2));
        const x2 = tf.add(x1, w);
        const y2 = tf.add(y1, h);
        const boxes = tf.concat([y1, x1, y2, x2], 1);

        const classScores = transRes.slice([4, 0], [this.numClass, -1]);
        const scores = tf.max(classScores, 0);
        const classes = tf.argMax(classScores, 0);

        const numDimensions = transRes.shape[0];
        let angles = tf.zerosLike(scores);
        if (numDimensions !== undefined && numDimensions > 4 + this.numClass) {
          angles = transRes.slice([4 + this.numClass, 0], [1, -1]).squeeze();
        }

        return [boxes, scores, classes, angles, boxesTransposed];
      });

      const nms = await tf.image.nonMaxSuppressionAsync(
        boxes as tf.Tensor2D,
        scores as tf.Tensor1D,
        100,
        iouThreshold,
        scoreThreshold
      );

      const detections = tf.tidy(() =>
        tf.concat(
          [
            boxesTransposed.gather(nms, 0),
            scores.gather(nms, 0).expandDims(1),
            classes.gather(nms, 0).expandDims(1),
            angles.gather(nms, 0).expandDims(1),
          ],
          1
        )
      );

      const detData = detections.dataSync();
      const numDetections = detections.shape[0];
      const boundingBoxes: BoundingBox[] = [];

      const scaleX = originalWidth / paddedWidth;
      const scaleY = originalHeight / paddedHeight;

      for (let i = 0; i < numDetections; i++) {
        const offset = i * 7;
        const x = detData[offset];
        const y = detData[offset + 1];
        const w = detData[offset + 2];
        const h = detData[offset + 3];
        const score = detData[offset + 4];
        const angle = detData[offset + 6];

        const origX = (x * originalWidth) / 640 / scaleX;
        const origY = (y * originalHeight) / 640 / scaleY;
        const origW = (w * originalWidth) / 640 / scaleX;
        const origH = (h * originalHeight) / 640 / scaleY;

        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        const hw = origW / 2;
        const hh = origH / 2;

        const corners = [
          [-hw, -hh],
          [hw, -hh],
          [hw, hh],
          [-hw, hh],
        ];

        const points = corners.map(([cx, cy]) => {
          const rx = cx * cosA - cy * sinA;
          const ry = cx * sinA + cy * cosA;
          return [origX + rx, origY + ry];
        });

        boundingBoxes.push({
          points,
          confidence: score * 100,
          centerX: origX,
          centerY: origY,
          width: origW,
          height: origH,
          angle: angle,
        });
      }

      return boundingBoxes;
    } finally {
      input.dispose();
      tf.engine().endScope();
    }
  }

  private extractCardImage(
    image: HTMLImageElement,
    box: BoundingBox
  ): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const padding = 5;
    const cardWidth = Math.round(box.width) + padding * 2;
    const cardHeight = Math.round(box.height) + padding * 2;

    canvas.width = cardWidth;
    canvas.height = cardHeight;

    ctx.save();
    ctx.translate(cardWidth / 2, cardHeight / 2);
    ctx.rotate(-box.angle);
    ctx.drawImage(
      image,
      box.centerX - box.width / 2 - padding,
      box.centerY - box.height / 2 - padding,
      cardWidth,
      cardHeight,
      -cardWidth / 2,
      -cardHeight / 2,
      cardWidth,
      cardHeight
    );
    ctx.restore();

    return canvas.toDataURL('image/png');
  }

  public async detectCards(image: HTMLImageElement): Promise<DetectionResult> {
    if (!this.model) {
      await this.loadModel();
    }

    const boundingBoxes = await this.detectBoundingBoxes(image);

    const cards: DetectedCard[] = boundingBoxes.map((box, index) => ({
      id: `card-${index}-${Date.now()}`,
      imageData: this.extractCardImage(image, box),
      boundingBox: box,
    }));

    cards.sort((a, b) => {
      const rowHeight = image.height / 5;
      const rowA = Math.floor(a.boundingBox.centerY / rowHeight);
      const rowB = Math.floor(b.boundingBox.centerY / rowHeight);
      if (rowA !== rowB) return rowA - rowB;
      return a.boundingBox.centerX - b.boundingBox.centerX;
    });

    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(image, 0, 0);

    return {
      cards,
      originalImage: canvas.toDataURL(),
    };
  }
}

export default CardDetectionService;
