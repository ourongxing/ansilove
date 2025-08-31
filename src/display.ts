// Display and rendering functions for AnsiLove

import type { DisplayData, ScreenData, RenderOptions } from './types';

export function scaleCanvas(
  sourceData: Uint8Array,
  width: number,
  height: number,
  chunkWidth: number,
  chunkHeight: number,
  options: RenderOptions
): DisplayData {
  const rgba = new Uint8Array(4);
  const destWidth = width / chunkWidth;
  const destHeight = height / chunkHeight;
  const destData = new Uint8Array(destWidth * destHeight * 4);
  const pixelRowOffset = (width - chunkWidth) * 4;
  const chunkSize = chunkWidth * chunkHeight;

  for (let i = 0, x = 0, y = 0; i < destData.length; i += 4) {
    let r = 0, g = 0, b = 0, a = 0;
    let k = (y * width * chunkHeight + x * chunkWidth) * 4;

    for (let j = 0; j < chunkSize; ++j) {
      r += sourceData[k++];
      g += sourceData[k++];
      b += sourceData[k++];
      a += sourceData[k++];
      if ((j + 1) % chunkWidth === 0) {
        k += pixelRowOffset;
      }
    }

    rgba[0] = Math.round(r / chunkSize);
    rgba[1] = Math.round(g / chunkSize);
    rgba[2] = Math.round(b / chunkSize);
    rgba[3] = Math.round(a / chunkSize);
    destData.set(rgba, i);

    if (++x === destWidth) {
      x = 0;
      ++y;
    }
  }

  return {
    width: destWidth,
    height: destHeight,
    rgbaData: destData,
    "2x": options["2x"]
  };
}

export function display(
  raw: ScreenData,
  start: number,
  length: number,
  options: RenderOptions
): DisplayData {
  const fontBitWidth = raw.font!.width * 4;
  const data = raw.getData();

  start = start * raw.columns * 10;
  const end = Math.min(start + length * raw.columns * 10, data.length);

  const canvasWidth = raw.columns * raw.font!.width;
  const canvasHeight = (end - start) / (raw.columns * 10) * raw.font!.height;

  const rgbaData = new Uint8Array(canvasWidth * canvasHeight * 4);
  const rowOffset = canvasWidth * 4;

  for (let i = start, screenOffset = 0, x = 0; i < end; i += 10, screenOffset += fontBitWidth) {
    let fontData: Uint8Array;

    if (data[i + 1]) {
      fontData = raw.font!.get24BitData(data[i], data.subarray(i + 2, i + 6), data.subarray(i + 6, i + 10));
    } else {
      fontData = raw.font!.getData(data[i], raw.palette!, data[i + 2], data[i + 3]);
    }

    for (let fontOffset = screenOffset, k = 0, l = 0; k < raw.font!.height; ++k, fontOffset += rowOffset, l += fontBitWidth) {
      rgbaData.set(fontData.subarray(l, l + fontBitWidth), fontOffset);
    }

    if (++x % raw.columns === 0) {
      screenOffset += (raw.font!.height - 1) * rowOffset;
    }
  }

  if (options.thumbnail) {
    const chunky = Math.pow(2, 4 - options.thumbnail);
    return scaleCanvas(rgbaData, canvasWidth, canvasHeight, chunky, chunky, options);
  }

  return {
    width: canvasWidth,
    height: canvasHeight,
    rgbaData: rgbaData,
    "2x": options["2x"]
  };
}

export function createCanvas(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function displayDataToCanvas(displayData: DisplayData): HTMLCanvasElement {
  const canvas = createCanvas(displayData.width, displayData.height);
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(canvas.width, canvas.height);
  imageData.data.set(displayData.rgbaData, 0);
  ctx.putImageData(imageData, 0, 0);

  if (displayData["2x"]) {
    canvas.style.width = (canvas.width / 2) + "px";
    canvas.style.height = (canvas.height / 2) + "px";
  }

  return canvas;
}

export function validateOptions(options?: RenderOptions): RenderOptions {
  options = options || {};
  const validatedOptions: RenderOptions = {};

  validatedOptions.icecolors = ((typeof options.icecolors === "number") && options.icecolors >= 0 && options.icecolors <= 1) ? options.icecolors : 0;

  switch (options.bits) {
    case "8":
    case "9":
    case "ced":
    case "workbench":
      validatedOptions.bits = options.bits;
      break;
    default:
      validatedOptions.bits = "8";
  }

  validatedOptions.columns = ((typeof options.columns === "number") && options.columns > 0) ? options.columns : 160;
  validatedOptions.font = ((typeof options.font === "string") && options.font) ? options.font : "80x25";
  validatedOptions.thumbnail = ((typeof options.thumbnail === "number") && options.thumbnail >= 0 && options.thumbnail <= 3) ? options.thumbnail : 0;
  validatedOptions["2x"] = ((typeof options["2x"] === "number") && options["2x"] >= 0 && options["2x"] <= 1) ? options["2x"] : 0;
  validatedOptions.imagedata = ((typeof options.imagedata === "number") && options.imagedata >= 0 && options.imagedata <= 1) ? options.imagedata : 0;
  validatedOptions.rows = ((typeof options.rows === "number") && options.rows > 0) ? options.rows : 26;
  validatedOptions["2J"] = ((typeof options["2J"] === "number") && options["2J"] >= 0 && options["2J"] <= 1) ? options["2J"] : 1;
  validatedOptions.filetype = (typeof options.filetype === "string") ? options.filetype : "ans";

  return validatedOptions;
}