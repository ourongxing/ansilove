// AnsiLove.js TypeScript version
// Main module that exports all public APIs

import type { RenderOptions, DisplayData, Sauce } from './types';
import { sauceBytes, sauce, httpGet } from './file';
import { displayDataToCanvas } from './display';
import { ParserModule } from './parser';
import { animateBytes, Ansimation } from './animation';
import { PopupModule } from './popup';

// Render functions
export function renderBytes(
  bytes: Uint8Array,
  callback: (data: HTMLCanvasElement | DisplayData, sauce?: Sauce) => void,
  options?: RenderOptions,
  callbackFail?: (error: unknown) => void
): void {
  try {
    ParserModule.readBytes(bytes, callback as (data: DisplayData | DisplayData[], sauce?: Sauce) => void, 0, options);
  } catch (e) {
    if (callbackFail) {
      callbackFail(e);
    } else {
      throw e;
    }
  }
}

export function render(
  url: string,
  callback: (data: HTMLCanvasElement | DisplayData, sauce?: Sauce) => void,
  options?: RenderOptions,
  callbackFail?: (error: unknown) => void
): void {
  httpGet(url, function (bytes: Uint8Array): void {
    options = options || {};
    if (!options.filetype) {
      options.filetype = url.split(".").pop()?.toLowerCase();
    }
    renderBytes(bytes, callback, options, callbackFail);
  }, callbackFail ? (status: number) => callbackFail(status) : undefined);
}

// Split render functions
export function splitRenderBytes(
  bytes: Uint8Array,
  callback: (data: (HTMLCanvasElement | DisplayData)[], sauce?: Sauce) => void,
  splitRows?: number,
  options?: RenderOptions,
  callbackFail?: (error: unknown) => void
): void {
  try {
    ParserModule.readBytes(bytes, callback as (data: DisplayData | DisplayData[], sauce?: Sauce) => void, splitRows || 27, options);
  } catch (e) {
    if (callbackFail) {
      callbackFail(e);
    } else {
      throw e;
    }
  }
}

export function splitRender(
  url: string,
  callback: (data: (HTMLCanvasElement | DisplayData)[], sauce?: Sauce) => void,
  splitRows?: number,
  options?: RenderOptions,
  callbackFail?: (error: unknown) => void
): void {
  httpGet(url, function (bytes: Uint8Array): void {
    options = options || {};
    if (!options.filetype) {
      options.filetype = url.split(".").pop()?.toLowerCase();
    }
    splitRenderBytes(bytes, callback, splitRows, options, callbackFail);
  }, callbackFail ? (status: number) => callbackFail(status) : undefined);
}

// Animation functions
export { animateBytes };

export function animate(
  url: string,
  callback: (canvas: HTMLCanvasElement, sauce?: Sauce) => void,
  options?: RenderOptions,
  callbackFail?: (error: unknown) => void
): { play: (baud?: number, callback?: () => void, clearScreen?: boolean) => void; stop: () => void; load: (url: string, callback: (sauce?: Sauce) => void, callbackFail?: (error: unknown) => void) => void } {
  let ansimation: ReturnType<typeof Ansimation>;
  httpGet(url, function (bytes: Uint8Array): void {
    ansimation = Ansimation(bytes, options || {});
    callback(ansimation.canvas, ansimation.sauce);
  }, callbackFail ? (status: number) => callbackFail(status) : undefined);

  return {
    play: function (baud?: number, callback?: () => void, clearScreen?: boolean): void {
      if (ansimation) {
        ansimation.controller.play(baud, callback, clearScreen);
      }
    },
    stop: function (): void {
      if (ansimation) {
        ansimation.controller.stop();
      }
    },
    load: function (url: string, callback: (sauce?: Sauce) => void, callbackFail?: (error: unknown) => void): void {
      httpGet(url, function (bytes: Uint8Array): void {
        if (ansimation) {
          ansimation.controller.load(bytes, callback);
        }
      }, callbackFail ? (status: number) => callbackFail(status) : undefined);
    }
  };
}

// Popup functions
export function popupBytes(bytes: Uint8Array, options?: RenderOptions): void {
  PopupModule.show(bytes, 0, options || {});
}

export function popup(url: string, options?: RenderOptions, callbackFail?: (error: unknown) => void): void {
  httpGet(url, function (bytes: Uint8Array): void {
    options = options || {};
    if (!options.filetype) {
      options.filetype = url.split(".").pop()?.toLowerCase();
    }
    popupBytes(bytes, options);
  }, callbackFail ? (status: number) => callbackFail(status) : undefined);
}

export function popupAnimationBytes(bytes: Uint8Array, baud?: number, options?: RenderOptions): void {
  PopupModule.show(bytes, baud || 14400, options || {});
}

export function popupAnimation(
  url: string,
  baud?: number,
  options?: RenderOptions,
  callbackFail?: (error: unknown) => void
): void {
  httpGet(url, function (bytes: Uint8Array): void {
    popupAnimationBytes(bytes, baud, options);
  }, callbackFail ? (status: number) => callbackFail(status) : undefined);
}

// Main AnsiLove object for compatibility
export const AnsiLove = {
  sauceBytes,
  sauce,
  displayDataToCanvas,
  renderBytes,
  render,
  splitRenderBytes,
  splitRender,
  animateBytes,
  animate,
  popupBytes,
  popup,
  popupAnimationBytes,
  popupAnimation
};

// Web Worker support
interface WorkerGlobalScope {
  WorkerLocation?: unknown;
  onmessage?: (evt: MessageEvent) => void;
  postMessage: (message: unknown) => void;
}

declare const self: WorkerGlobalScope | undefined;

if (typeof self !== 'undefined' && self.WorkerLocation) {
  self.onmessage = function (evt: MessageEvent): void {
    if (evt.data.bytes) {
      if (evt.data.split > 0) {
        AnsiLove.splitRenderBytes(evt.data.bytes, function (imagedata: (DisplayData | HTMLCanvasElement)[], sauce?: Sauce): void {
          self.postMessage({"splitimagedata": imagedata, "sauce": sauce});
        }, evt.data.split, {
          "imagedata": 1,
          "font": evt.data.font,
          "bits": evt.data.bits,
          "icecolors": evt.data.icecolors,
          "columns": evt.data.columns,
          "thumbnail": evt.data.thumbnail,
          "2x": evt.data["2x"],
          "filetype": evt.data.filetype
        });
      } else {
        AnsiLove.renderBytes(evt.data.bytes, function (imagedata: DisplayData | HTMLCanvasElement, sauce?: Sauce): void {
          self.postMessage({"imagedata": imagedata, "sauce": sauce});
        }, {
          "imagedata": 1,
          "font": evt.data.font,
          "bits": evt.data.bits,
          "icecolors": evt.data.icecolors,
          "columns": evt.data.columns,
          "thumbnail": evt.data.thumbnail,
          "2x": evt.data["2x"],
          "filetype": evt.data.filetype
        });
      }
    } else {
      if (evt.data.split > 0) {
        AnsiLove.splitRender(evt.data.url, function (imagedata: (DisplayData | HTMLCanvasElement)[], sauce?: Sauce): void {
          self.postMessage({"splitimagedata": imagedata, "sauce": sauce});
        }, evt.data.split, {
          "imagedata": 1,
          "font": evt.data.font,
          "bits": evt.data.bits,
          "icecolors": evt.data.icecolors,
          "columns": evt.data.columns,
          "thumbnail": evt.data.thumbnail,
          "2x": evt.data["2x"],
          "filetype": evt.data.filetype
        });
      } else {
        AnsiLove.render(evt.data.url, function (imagedata: DisplayData | HTMLCanvasElement, sauce?: Sauce): void {
          self.postMessage({"imagedata": imagedata, "sauce": sauce});
        }, {
          "imagedata": 1,
          "font": evt.data.font,
          "bits": evt.data.bits,
          "icecolors": evt.data.icecolors,
          "columns": evt.data.columns,
          "thumbnail": evt.data.thumbnail,
          "2x": evt.data["2x"],
          "filetype": evt.data.filetype
        });
      }
    }
  };
}

export default AnsiLove;
export * from "./types";