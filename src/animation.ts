// Animation module for AnsiLove

import type { Ansimation as AnsimationType, AnimationController, RenderOptions, Sauce } from './types';
import { File } from './file';
import { FontModule } from './font';
import { PaletteModule } from './palette';
import { createCanvas, validateOptions } from './display';

export function Ansimation(bytes: Uint8Array, options: RenderOptions): AnsimationType {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let interval: ReturnType<typeof setInterval> | undefined;
  let file = new File(bytes);
  const font = FontModule.has(options.font || "80x25") ? FontModule.preset(options.font || "80x25", options) : FontModule.preset("80x25", options);
  let palette: Uint8Array[];
  let columns: number;
  const rows = options.rows || 26;
  let escaped = false;
  let escapeCode = "";
  let j: number;
  let code: number;
  let values: number[];
  let x = 1;
  let y = 1;
  let savedX: number | undefined;
  let savedY: number | undefined;
  let foreground = 7;
  let background = 0;
  let foreground24bit: Uint8Array | undefined;
  let background24bit: Uint8Array | undefined;
  let drawForeground: number;
  let drawBackground: number;
  let bold = false;
  let inverse = false;
  let blink = false;

  options = validateOptions(options);

  switch (options.bits) {
    case "ced":
      palette = PaletteModule.CED;
      break;
    case "workbench":
      palette = PaletteModule.WORKBENCH;
      break;
    default:
      palette = PaletteModule.ANSI;
  }

  if (file.sauce && file.sauce.tInfo1 > 0) {
    columns = file.sauce.tInfo1;
  } else if (options.mode === "ced") {
    columns = 78;
  } else {
    columns = 80;
  }

  columns = options.columns || columns;

  const canvas = createCanvas(columns * font.width, rows * font.height);

  if (options["2x"]) {
    canvas.style.width = (canvas.width / 2) + "px";
    canvas.style.height = (canvas.height / 2) + "px";
  }

  const ctx = canvas.getContext("2d")!;
  const fontImageData = ctx.createImageData(font.width, font.height);

  const blinkCanvas = [createCanvas(canvas.width, canvas.height), createCanvas(canvas.width, canvas.height)];
  const buffer = createCanvas(canvas.width, canvas.height);
  const blinkCtx = blinkCanvas.map(function (canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    return canvas.getContext("2d")!;
  });
  const bufferCtx = buffer.getContext("2d")!;

  function resetAttributes(): void {
    foreground = 7;
    background = 0;
    foreground24bit = undefined;
    background24bit = undefined;
    bold = false;
    blink = false;
    inverse = false;
  }

  function clearScreen(sx: number, sy: number, width: number, height: number): void {
    ctx.fillStyle = "rgb(" + palette[0][0] + ", " + palette[0][1] + ", " + palette[0][2] + ")";
    ctx.fillRect(sx, sy, width, height);
    blinkCtx[0].clearRect(sx, sy, width, height);
    blinkCtx[1].clearRect(sx, sy, width, height);
  }

  function clearBlinkChar(charX: number, charY: number): void {
    const sx = charX * font.width;
    const sy = charY * font.height;
    blinkCtx[0].clearRect(sx, sy, font.width, font.height);
    blinkCtx[1].clearRect(sx, sy, font.width, font.height);
  }

  function newLine(): boolean {
    x = 1;
    if (y === rows - 1) {
      ctx.drawImage(canvas, 0, font.height, canvas.width, canvas.height - font.height * 2, 0, 0, canvas.width, canvas.height - font.height * 2);
      bufferCtx.clearRect(0, 0, canvas.width, canvas.height);
      bufferCtx.drawImage(blinkCanvas[0], 0, font.height, canvas.width, canvas.height - font.height * 2, 0, 0, canvas.width, canvas.height - font.height * 2);
      blinkCtx[0].clearRect(0, 0, canvas.width, canvas.height);
      blinkCtx[0].drawImage(buffer, 0, 0);
      bufferCtx.clearRect(0, 0, canvas.width, canvas.height);
      bufferCtx.drawImage(blinkCanvas[1], 0, font.height, canvas.width, canvas.height - font.height * 2, 0, 0, canvas.width, canvas.height - font.height * 2);
      blinkCtx[1].clearRect(0, 0, canvas.width, canvas.height);
      blinkCtx[1].drawImage(buffer, 0, 0);
      clearScreen(0, canvas.height - font.height * 2, canvas.width, font.height);
      return true;
    }
    ++y;
    return false;
  }

  function setPos(newX: number, newY: number): void {
    x = Math.min(columns, Math.max(1, newX));
    y = Math.min(rows, Math.max(1, newY));
  }

  function resetAll(): void {
    clearScreen(0, 0, canvas.width, canvas.height);
    resetAttributes();
    setPos(1, 1);
    escapeCode = "";
    escaped = false;
    file.seek(0);
  }

  resetAll();

  function getValues(): number[] {
    return escapeCode.substr(1, escapeCode.length - 2).split(";").map(function (value: string): number {
      const parsedValue = parseInt(value, 10);
      return isNaN(parsedValue) ? 1 : parsedValue;
    });
  }

  function read(num: number): number {
    let i: number;
    for (i = 0; i < num; ++i) {
      if (file.eof()) {
        break;
      }
      code = file.get();
      if (escaped) {
        escapeCode += String.fromCharCode(code);
        if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) {
          escaped = false;
          values = getValues();
          if (escapeCode.charAt(0) === "[") {
            switch (escapeCode.charAt(escapeCode.length - 1)) {
              case "A":
                y = Math.max(1, y - values[0]);
                break;
              case "B":
                y = Math.min(rows - 1, y + values[0]);
                break;
              case "C":
                if (x === columns) {
                  if (newLine()) {
                    return i + 1;
                  }
                }
                x = Math.min(columns, x + values[0]);
                break;
              case "D":
                x = Math.max(1, x - values[0]);
                break;
              case "H":
                if (values.length === 1) {
                  setPos(1, Math.min(values[0]));
                } else {
                  setPos(values[1], values[0]);
                }
                break;
              case "J":
                if (options["2J"] && values[0] === 2) {
                  x = 1;
                  y = 1;
                  clearScreen(0, 0, canvas.width, canvas.height);
                }
                break;
              case "K":
                clearScreen((x - 1) * font.width, (y - 1) * font.height, canvas.width - (x - 1) * font.width, font.height);
                break;
              case "m":
                for (j = 0; j < values.length; ++j) {
                  if (values[j] >= 30 && values[j] <= 37) {
                    foreground = values[j] - 30;
                    if (foreground24bit) {
                      foreground24bit = undefined;
                    }
                  } else if (values[j] >= 40 && values[j] <= 47) {
                    background = values[j] - 40;
                    if (background24bit) {
                      background24bit = undefined;
                    }
                  } else {
                    switch (values[j]) {
                      case 0:
                        resetAttributes();
                        break;
                      case 1:
                        bold = true;
                        if (foreground24bit) {
                          foreground24bit = undefined;
                        }
                        break;
                      case 5:
                        blink = true;
                        break;
                      case 7:
                        inverse = true;
                        break;
                      case 22:
                        bold = false;
                        break;
                      case 25:
                        blink = false;
                        break;
                      case 27:
                        inverse = false;
                        break;
                    }
                  }
                }
                break;
              case "s":
                savedX = x;
                savedY = y;
                break;
              case "t":
                if (values.length === 4) {
                  switch (values[0]) {
                    case 0:
                      background24bit = new Uint8Array([values[1], values[2], values[3], 255]);
                      break;
                    case 1:
                      foreground24bit = new Uint8Array([values[1], values[2], values[3], 255]);
                      break;
                  }
                }
                break;
              case "u":
                if (savedX !== undefined && savedY !== undefined) {
                  x = savedX;
                  y = savedY;
                }
                break;
            }
          }
          escapeCode = "";
        }
      } else {
        switch (code) {
          case 10:
            if (newLine()) {
              return i + 1;
            }
            break;
          case 13:
            if (file.peek() === 0x0A) {
              file.read(1);
              if (newLine()) {
                return i + 1;
              }
            }
            break;
          case 26:
            break;
          default:
            if (code === 27 && file.peek() === 0x5B) {
              escaped = true;
            } else {
              if (inverse) {
                drawForeground = background;
                drawBackground = foreground;
              } else {
                drawForeground = foreground;
                drawBackground = background;
              }
              if (bold) {
                drawForeground += 8;
              }
              if (blink && options.icecolors && !background24bit) {
                drawBackground += 8;
              }
              if (foreground24bit || background24bit) {
                fontImageData.data.set(font.get24BitData(code, foreground24bit || palette[drawForeground], background24bit || palette[drawBackground]), 0);
              } else {
                fontImageData.data.set(font.getData(code, palette, drawForeground, drawBackground), 0);
              }
              ctx.putImageData(fontImageData, (x - 1) * font.width, (y - 1) * font.height, 0, 0, font.width, font.height);
              if (!options.icecolors && !background24bit) {
                if (blink) {
                  blinkCtx[0].putImageData(fontImageData, (x - 1) * font.width, (y - 1) * font.height, 0, 0, font.width, font.height);
                  fontImageData.data.set(font.getData(code, palette, drawBackground, drawBackground), 0);
                  blinkCtx[1].putImageData(fontImageData, (x - 1) * font.width, (y - 1) * font.height, 0, 0, font.width, font.height);
                } else {
                  clearBlinkChar(x - 1, y - 1);
                }
              }
              if (++x === columns + 1) {
                if (newLine()) {
                  return i + 1;
                }
              }
            }
        }
      }
    }
    return i;
  }

  function play(baud?: number, callback?: () => void, clearScreen?: boolean): void {
    clearScreen = (clearScreen === undefined) ? true : clearScreen;
    clearTimeout(timer);
    clearInterval(interval);
    let drawBlink = false;
    interval = setInterval(function (): void {
      ctx.drawImage(blinkCanvas[drawBlink ? 1 : 0], 0, 0);
      drawBlink = !drawBlink;
    }, 250);

    function drawChunk(): void {
      if (read(length) > 0) {
        timer = setTimeout(drawChunk, 10);
      } else if (callback) {
        callback();
      }
    }

    const length = Math.floor((baud || 115200) / 8 / 100);
    if (clearScreen) {
      resetAll();
    } else {
      resetAttributes();
      escapeCode = "";
      escaped = false;
      file.seek(0);
    }
    drawChunk();
  }

  function stop(): void {
    clearTimeout(timer);
    clearInterval(interval);
  }

  function load(bytes: Uint8Array, callback: (sauce?: Sauce) => void): void {
    clearTimeout(timer);
    file = new File(bytes);
    callback(file.sauce);
  }

  const controller: AnimationController = {
    play,
    stop,
    load
  };

  return {
    canvas: canvas,
    sauce: file.sauce,
    controller: controller
  };
}

export function animateBytes(
  bytes: Uint8Array,
  callback: (canvas: HTMLCanvasElement, sauce?: Sauce) => void,
  options?: RenderOptions
): AnimationController {
  const ansimation = Ansimation(bytes, options || {});
  setTimeout(function (): void {
    callback(ansimation.canvas, ansimation.sauce);
  }, 250);
  return ansimation.controller;
}