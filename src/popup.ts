// Popup module for AnsiLove

import type { RenderOptions } from "./types"
import { animateBytes } from "./animation"
import { ParserModule } from "./parser"

interface StyleObject {
  [key: string]: string
}

const STYLE_DEFAULTS: StyleObject = {
  "background-color": "transparent",
  "background-image": "none",
  "margin": "0",
  "padding": "0",
  "border": "0",
  "font-size": "100%",
  "font": "inherit",
  "vertical-align": "baseline",
  "color": "black",
  "display": "block",
  "cursor": "default",
  "text-align": "left",
  "text-shadow": "none",
  "text-transform": "none",
  "clear": "none",
  "float": "none",
  "overflow": "auto",
  "position": "relative",
  "visibility": "visible",
}

function findHighestZIndex(): number {
  const elements = document.getElementsByTagName("*")
  let highest = 0

  for (let i = 0; i < elements.length; ++i) {
    const zIndex = document.defaultView!.getComputedStyle(elements[i]).zIndex
    if (zIndex !== "auto" && zIndex !== "inherit") {
      highest = Math.max(highest, Number.parseInt(zIndex, 10))
    }
  }
  return highest
}

function applyStyle(element: HTMLElement, style: StyleObject): void {
  for (const name in style) {
    if (Object.prototype.hasOwnProperty.call(style, name)) {
      element.style.setProperty(name, style[name], "important")
    }
  }
}

function createDiv(style?: StyleObject): HTMLDivElement {
  style = style || {}
  const div = document.createElement("div")
  applyStyle(div, STYLE_DEFAULTS)
  applyStyle(div, style)
  return div
}

function transitionCSS(
  element: HTMLElement,
  transProperty: string,
  transDuration: string,
  transFunction: string,
  style?: StyleObject,
): void {
  element.style.transitionProperty = transProperty
  element.style.transitionDuration = transDuration
  element.style.transitionTimingFunction = transFunction
  if (style) {
    setTimeout((): void => {
      applyStyle(element, style)
    }, 50)
  }
}

export function show(bytes: Uint8Array, baud: number, options: RenderOptions): void {
  let divOverlay: HTMLDivElement
  let divCanvasContainer: HTMLDivElement

  function slideUpContainer(): void {
    if (options.spinner) {
      applyStyle(divOverlay, { "background-image": "none" })
    }
    transitionCSS(divCanvasContainer, "top", "0.6s", "ease-in-out", { top: "0" })
    setTimeout((): void => {
      applyStyle(divOverlay, { overflow: "auto" })
    }, 750)
  }

  function processCanvas(canvas: HTMLCanvasElement): HTMLCanvasElement {
    applyStyle(canvas, STYLE_DEFAULTS)
    canvas.style.verticalAlign = "bottom"
    return canvas
  }

  function dismiss(evt: Event): void {
    evt.preventDefault()
    document.body.removeChild(divOverlay)
  }

  divOverlay = createDiv({
    "position": "fixed",
    "left": "0px",
    "top": "0px",
    "width": "100%",
    "height": "100%",
    "background-color": "rgba(0, 0, 0, 0.8)",
    "overflow": "hidden",
    "z-index": (findHighestZIndex() + 1).toString(10),
    "opacity": "0",
  })

  if (options.spinner) {
    applyStyle(divOverlay, {
      "background-image": `url(${options.spinner})`,
      "background-position": "center center",
      "background-repeat": "no-repeat",
    })
    if (options["2x"]) {
      applyStyle(divOverlay, { "background-size": "32px 64px" })
    }
  }

  divCanvasContainer = createDiv({
    "background-color": "black",
    "box-shadow": "0 8px 32px rgb(0, 0, 0)",
    "margin": "8px auto",
    "padding": "16px",
    "border": "2px solid white",
    "border-radius": "8px",
    "top": "100%",
  })

  divOverlay.appendChild(divCanvasContainer)
  document.body.appendChild(divOverlay)

  transitionCSS(divOverlay, "opacity", "0.2s", "ease-out", { opacity: "1.0" })

  setTimeout((): void => {
    if (baud > 0) {
      const controller = animateBytes(bytes, (canvas): void => {
        if (options["2x"]) {
          divCanvasContainer.style.width = `${canvas.width / 2}px`
        } else {
          divCanvasContainer.style.width = `${canvas.width}px`
        }
        divCanvasContainer.appendChild(processCanvas(canvas))
        slideUpContainer()
        setTimeout((): void => {
          controller.play(baud)
        }, 750)
        divOverlay.onclick = function (evt): void {
          dismiss(evt)
          controller.stop()
        }
      }, options)
    } else {
      ParserModule.readBytes(bytes, (canvases: any): void => {
        if (Array.isArray(canvases)) {
          if (options["2x"]) {
            divCanvasContainer.style.width = `${canvases[0].width / 2}px`
          } else {
            divCanvasContainer.style.width = `${canvases[0].width}px`
          }
          canvases.forEach((canvas: HTMLCanvasElement): void => {
            divCanvasContainer.appendChild(processCanvas(canvas))
          })
        }
        slideUpContainer()
        divOverlay.onclick = dismiss
      }, 100, options)
    }
  }, 250)
}

export const PopupModule = {
  show,
}