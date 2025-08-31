import type { AnimationController, DisplayData, Sauce } from "ansilove.ts"
import AnsiLove from "ansilove.ts"
import { useCallback, useEffect, useRef, useState } from "react"

interface FileInfo {
  name: string
  size: number
  type: string
}

function App() {
  const [isDragOver, setIsDragOver] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<{
    canvas: HTMLCanvasElement
    sauce?: Sauce
    fileInfo: FileInfo
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentFile, setCurrentFile] = useState<File | null>(null)
  const [animationController, setAnimationController] = useState<AnimationController | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [animationSpeed, setAnimationSpeed] = useState(57600) // Default to faster speed
  const canvasRef = useRef<HTMLDivElement>(null)

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true)
    setError(null)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      // Determine file type from extension
      const extension = file.name.split(".").pop()?.toLowerCase() || "ans"

      // Save the file for potential animation loading
      setCurrentFile(file)

      AnsiLove.renderBytes(bytes, (data: HTMLCanvasElement | DisplayData | HTMLCanvasElement[], sauce?: Sauce) => {
        let canvas: HTMLCanvasElement

        if (Array.isArray(data)) {
          // It's an array of canvases, use the first one
          canvas = data[0]
        } else if ("rgbaData" in data) {
          // It's DisplayData
          canvas = AnsiLove.displayDataToCanvas(data as DisplayData)
        } else {
          // It's already a canvas
          canvas = data as HTMLCanvasElement
        }

        console.log(file)
        setResult({
          canvas,
          sauce,
          fileInfo: {
            name: file.name,
            size: file.size,
            type: extension,
          },
        })
      }, { filetype: extension })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process file")
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const loadAsAnimation = useCallback(async () => {
    if (!currentFile) return

    setIsProcessing(true)
    setError(null)

    try {
      const arrayBuffer = await currentFile.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      const extension = currentFile.name.split(".").pop()?.toLowerCase() || "ans"

      // Use animateBytes for animations
      const controller = AnsiLove.animateBytes(bytes, (canvas: HTMLCanvasElement, sauce?: Sauce) => {
        console.log("Animation loaded:", currentFile, sauce)
        if (canvasRef.current) {
          canvasRef.current.innerHTML = ""
          canvasRef.current.appendChild(canvas)
        }
        setAnimationController(controller)

        // Auto-play the animation
        setTimeout(() => {
          controller.play(animationSpeed, () => {
            console.log("Animation finished")
            setIsPlaying(false)
          })
          setIsPlaying(true)
        }, 100)
      }, { filetype: extension })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load animation")
    } finally {
      setIsProcessing(false)
    }
  }, [currentFile, animationSpeed])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files)
    const file = files[0]

    if (file) {
      console.log(file)
      processFile(file)
    }
  }, [processFile])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }, [processFile])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  // Update canvas display when result changes
  useEffect(() => {
    if (result?.canvas && canvasRef.current) {
      canvasRef.current.innerHTML = ""
      canvasRef.current.appendChild(result.canvas)
    }
  }, [result])

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-800">
      {/* Header */}
      <header className="bg-black/50 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <span className="text-green-400 font-mono">█</span>
                AnsiLove
              </h1>
              <p className="text-gray-400 mt-1">Convert and view ANSI art files</p>
            </div>
            <div className="text-right text-sm text-gray-500">
              <p>Supported formats:</p>
              <p className="font-mono">.ans .asc .bin .ice .xb .txt</p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Upload Area */}
        {!result && (
          <div className="max-w-2xl mx-auto">
            <div
              className={`
                relative border-2 border-dashed rounded-lg p-12 text-center transition-all duration-300
                ${isDragOver
            ? "border-green-400 bg-green-400/10"
            : "border-gray-600 hover:border-gray-500 bg-gray-800/50"
          }
                ${isProcessing ? "opacity-50 pointer-events-none" : ""}
              `}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              {isProcessing
                ? (
                    <div className="space-y-4">
                      <div className="animate-spin w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full mx-auto"></div>
                      <p className="text-white">Processing file...</p>
                    </div>
                  )
                : (
                    <div className="space-y-6">
                      <div className="text-6xl text-gray-400">📁</div>
                      <div>
                        <p className="text-xl text-white mb-2">
                          Drop your ANSI file here
                        </p>
                        <p className="text-gray-400">
                          or click to browse
                        </p>
                      </div>

                      <label className="inline-flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg cursor-pointer transition-colors">
                        <span>Choose File</span>
                        <input
                          type="file"
                          className="hidden"
                          accept=".ans,.asc,.bin,.ice,.xb,.txt"
                          onChange={handleFileSelect}
                        />
                      </label>
                    </div>
                  )}
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-900/50 border border-red-700 rounded-lg">
                <p className="text-red-300 text-center">{error}</p>
              </div>
            )}
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div className="space-y-6">
            {/* File Info */}
            <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-white">{result.fileInfo.name}</h3>
                  <p className="text-gray-400">
                    {(result.fileInfo.size / 1024).toFixed(1)}
                    {" "}
                    KB •
                    {result.fileInfo.type.toUpperCase()}
                    {animationController && (
                      <span className={`ml-2 ${isPlaying ? "text-green-400" : "text-yellow-400"}`}>
                        • Animation
                        {" "}
                        {isPlaying ? "(Playing)" : "(Loaded)"}
                      </span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  {currentFile?.name.endsWith(".ans") && !animationController && (
                    <button
                      onClick={loadAsAnimation}
                      disabled={isProcessing}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Load as Animation
                    </button>
                  )}
                  {animationController && (
                    <>
                      <select
                        value={animationSpeed}
                        onChange={e => setAnimationSpeed(Number(e.target.value))}
                        className="px-3 py-2 bg-gray-700 text-white rounded-lg"
                        disabled={isPlaying}
                      >
                        <option value={9600}>Slow (9600)</option>
                        <option value={14400}>Normal (14400)</option>
                        <option value={57600}>Fast (57600)</option>
                        <option value={115200}>Very Fast (115200)</option>
                      </select>
                      <button
                        onClick={() => {
                          if (!isPlaying) {
                            animationController.play(animationSpeed, () => {
                              console.log("Animation finished")
                              setIsPlaying(false)
                            })
                            setIsPlaying(true)
                          }
                        }}
                        disabled={isPlaying || isProcessing}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        {isPlaying ? "Playing..." : "Replay"}
                      </button>
                      <button
                        onClick={() => {
                          if (isPlaying) {
                            animationController.stop()
                            setIsPlaying(false)
                          }
                        }}
                        disabled={!isPlaying || isProcessing}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                      >
                        Stop
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => {
                      if (animationController) {
                        animationController.stop()
                      }
                      setResult(null)
                      setCurrentFile(null)
                      setAnimationController(null)
                      setIsPlaying(false)
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                  >
                    Upload Another
                  </button>
                </div>
              </div>
            </div>

            {/* SAUCE Info */}
            {result.sauce && (
              <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                <h4 className="text-lg font-semibold text-white mb-3">SAUCE Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {result.sauce.title && (
                    <div>
                      <span className="text-gray-400">Title:</span>
                      <span className="text-white ml-2">{result.sauce.title}</span>
                    </div>
                  )}
                  {result.sauce.author && (
                    <div>
                      <span className="text-gray-400">Author:</span>
                      <span className="text-white ml-2">{result.sauce.author}</span>
                    </div>
                  )}
                  {result.sauce.group && (
                    <div>
                      <span className="text-gray-400">Group:</span>
                      <span className="text-white ml-2">{result.sauce.group}</span>
                    </div>
                  )}
                  {result.sauce.date && (
                    <div>
                      <span className="text-gray-400">Date:</span>
                      <span className="text-white ml-2">{result.sauce.date}</span>
                    </div>
                  )}
                </div>

                {result.sauce.comments && result.sauce.comments.length > 0 && (
                  <div className="mt-4">
                    <span className="text-gray-400">Comments:</span>
                    <div className="mt-2 space-y-1">
                      {result.sauce.comments.map((comment: string, index: number) => (
                        <p key={index.toLocaleString()} className="text-white font-mono text-xs bg-gray-900/50 p-2 rounded">
                          {comment}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Canvas Display */}
            <div className="bg-black rounded-lg p-4 border border-gray-700 overflow-auto">
              <div
                ref={canvasRef}
                className="inline-block min-w-full h-[100vh]"
                style={{ imageRendering: "pixelated" }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-gray-700">
        <div className="container mx-auto px-4 text-center text-gray-400">
          <p className="mb-2">
            Built with AnsiLove.js • Open source on
            {" "}
            <a
              href="https://github.com/ansilove"
              className="text-green-400 hover:text-green-300 transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
          </p>
          <p className="text-sm">
            Convert ANSI, ASCII, and other text art formats to images
          </p>
        </div>
      </footer>
    </div>
  )
}

export default App