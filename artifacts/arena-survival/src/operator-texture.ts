import operatorSheetUrl from '@assets/Gemini_Generated_Image_s0ovzcs0ovzcs0ov_1790604143098.jpg';

export const OPERATOR_SHEET_URL = operatorSheetUrl;

export const OPERATOR_TEXTURE_REGION = {
  x: .043,
  top: .032,
  width: .264,
  height: .423,
};

type ImageSource = HTMLImageElement | HTMLCanvasElement;

export function createOperatorCutout(image: ImageSource) {
  const sourceWidth = image instanceof HTMLImageElement ? image.naturalWidth : image.width;
  const sourceHeight = image instanceof HTMLImageElement ? image.naturalHeight : image.height;
  const sourceX = Math.round(sourceWidth * OPERATOR_TEXTURE_REGION.x);
  const sourceY = Math.round(sourceHeight * OPERATOR_TEXTURE_REGION.top);
  const width = Math.round(sourceWidth * OPERATOR_TEXTURE_REGION.width);
  const height = Math.round(sourceHeight * OPERATOR_TEXTURE_REGION.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) throw new Error('Could not create the operator texture canvas.');

  context.drawImage(image, sourceX, sourceY, width, height, 0, 0, width, height);
  const pixels = context.getImageData(0, 0, width, height);
  const count = width * height;
  const background = new Uint8Array(count);
  const outside = new Uint8Array(count);
  const queue = new Int32Array(count);

  for (let index = 0; index < count; index += 1) {
    const pixel = index * 4;
    const red = pixels.data[pixel];
    const green = pixels.data[pixel + 1];
    const blue = pixels.data[pixel + 2];
    background[index] = red > 132 && green > 157 && blue > 178
      && green - red > 7 && blue - red > 12
      ? 1
      : 0;
  }

  let read = 0;
  let write = 0;
  const enqueue = (index: number) => {
    if (background[index] && !outside[index]) {
      outside[index] = 1;
      queue[write] = index;
      write += 1;
    }
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x);
    enqueue((height - 1) * width + x);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width);
    enqueue(y * width + width - 1);
  }

  while (read < write) {
    const index = queue[read];
    read += 1;
    const x = index % width;
    if (x > 0) enqueue(index - 1);
    if (x + 1 < width) enqueue(index + 1);
    if (index >= width) enqueue(index - width);
    if (index + width < count) enqueue(index + width);
  }

  for (let index = 0; index < count; index += 1) {
    const x = index % width;
    const y = Math.floor(index / width);
    const topFrameCorner = y < height * .06 && (x < width * .09 || x > width * .91);
    if (outside[index] || topFrameCorner) pixels.data[index * 4 + 3] = 0;
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
}

export function createOperatorAlphaMask(cutout: HTMLCanvasElement) {
  const mask = document.createElement('canvas');
  mask.width = cutout.width;
  mask.height = cutout.height;
  const context = mask.getContext('2d');
  const source = cutout.getContext('2d');
  if (!context || !source) throw new Error('Could not create the operator alpha mask.');
  const pixels = source.getImageData(0, 0, mask.width, mask.height);
  for (let pixel = 0; pixel < pixels.data.length; pixel += 4) {
    const opacity = pixels.data[pixel + 3];
    pixels.data[pixel] = opacity;
    pixels.data[pixel + 1] = opacity;
    pixels.data[pixel + 2] = opacity;
    pixels.data[pixel + 3] = 255;
  }
  context.putImageData(pixels, 0, 0);
  return mask;
}