"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Download, Copy, Check, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Info } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ImageData {
  id: string
  url: string
  coordinates: { x: number; y: number; width: number; height: number }
  originalCoordinates: {
    top_left_x: number
    top_left_y: number
    bottom_right_x: number
    bottom_right_y: number
  }
}

interface PageData {
  index: number
  markdown: string
  rawMarkdown: string
  images: ImageData[]
  dimensions: {
    dpi: number
    height: number
    width: number
  }
}

interface ResultsViewerProps {
  results: {
    text: string
    rawText: string
    pages: PageData[]
    images: ImageData[]
    usage?: {
      pages_processed: number
      doc_size_bytes: number
    }
    model?: string
  }
  originalFile: File | null
}

export function ResultsViewer({ results, originalFile }: ResultsViewerProps) {
  const [activeTab, setActiveTab] = useState("parsed")
  const [copied, setCopied] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [currentPage, setCurrentPage] = useState(0)
  const [showImageInfo, setShowImageInfo] = useState<string | null>(null)

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(results.text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadResults = () => {
    const dataStr = JSON.stringify(results, null, 2)
    const dataBlob = new Blob([dataStr], { type: "application/json" })
    const url = URL.createObjectURL(dataBlob)

    const link = document.createElement("a")
    link.href = url
    link.download = `${originalFile?.name.replace(".pdf", "") || "parsed"}_results.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const zoomIn = () => {
    setZoomLevel((prev) => Math.min(prev + 0.1, 2))
  }

  const zoomOut = () => {
    setZoomLevel((prev) => Math.max(prev - 0.1, 0.5))
  }

  const nextPage = () => {
    if (currentPage < results.pages.length - 1) {
      setCurrentPage(currentPage + 1)
    }
  }

  const prevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1)
    }
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  const currentPageData = results.pages[currentPage]

  return (
    <div className="space-y-4">
      {results.usage && (
        <div className="bg-muted/30 p-3 rounded-md text-xs text-muted-foreground">
          <div className="flex justify-between">
            <span>Model: {results.model || "mistral-ocr-latest"}</span>
            <span>Pages processed: {results.usage.pages_processed}</span>
            <span>Document size: {formatBytes(results.usage.doc_size_bytes)}</span>
          </div>
        </div>
      )}

      <Tabs defaultValue="parsed" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-between items-center mb-4">
          <TabsList>
            <TabsTrigger value="parsed">Parsed Content</TabsTrigger>
            <TabsTrigger value="reconstructed">Reconstructed View</TabsTrigger>
            <TabsTrigger value="raw">Raw Markdown</TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            {activeTab === "reconstructed" && (
              <>
                <Button variant="outline" size="sm" onClick={zoomIn} className="flex items-center gap-1">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={zoomOut} className="flex items-center gap-1">
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleCopyMarkdown} className="flex items-center gap-1">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadResults} className="flex items-center gap-1">
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Download</span>
            </Button>
          </div>
        </div>

        {results.pages.length > 1 && activeTab !== "parsed" && (
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={prevPage}
              disabled={currentPage === 0}
              className="flex items-center gap-1"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous Page
            </Button>
            <span className="text-sm">
              Page {currentPage + 1} of {results.pages.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={nextPage}
              disabled={currentPage === results.pages.length - 1}
              className="flex items-center gap-1"
            >
              Next Page
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        <TabsContent value="parsed" className="mt-0">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown>{results.text}</ReactMarkdown>
          </div>
        </TabsContent>

        <TabsContent value="reconstructed" className="mt-0">
          {currentPageData && (
            <div className="mb-2 text-xs text-muted-foreground">
              <span>
                Page dimensions: {currentPageData.dimensions.width} × {currentPageData.dimensions.height} pixels
              </span>
              {currentPageData.dimensions.dpi > 0 && (
                <span className="ml-2">({currentPageData.dimensions.dpi} DPI)</span>
              )}
            </div>
          )}

          <div
            className="relative bg-white dark:bg-gray-900 border rounded-md p-4 min-h-[400px] overflow-auto"
            style={{
              transform: `scale(${zoomLevel})`,
              transformOrigin: "top left",
              height: "600px",
            }}
          >
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{currentPageData?.markdown || ""}</ReactMarkdown>
            </div>

            <TooltipProvider>
              {currentPageData?.images.map((image, index) => (
                <Tooltip key={index}>
                  <TooltipTrigger asChild>
                    <div
                      className="absolute border border-dashed border-primary/50 cursor-help"
                      style={{
                        left: `${image.coordinates.x * 100}%`,
                        top: `${image.coordinates.y * 100}%`,
                        width: `${image.coordinates.width * 100}%`,
                        height: `${image.coordinates.height * 100}%`,
                      }}
                      onMouseEnter={() => setShowImageInfo(image.id)}
                      onMouseLeave={() => setShowImageInfo(null)}
                    >
                      <img
                        src={image.url || "/placeholder.svg"}
                        alt={`Extracted image ${index + 1}`}
                        className="w-full h-full object-contain"
                      />
                      {showImageInfo === image.id && (
                        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs p-1 rounded-bl">
                          <Info className="h-3 w-3" />
                        </div>
                      )}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="text-xs">
                      <p>Image ID: {image.id}</p>
                      <p>
                        Top Left: ({image.originalCoordinates.top_left_x}, {image.originalCoordinates.top_left_y})
                      </p>
                      <p>
                        Bottom Right: ({image.originalCoordinates.bottom_right_x},{" "}
                        {image.originalCoordinates.bottom_right_y})
                      </p>
                      <p>
                        Size: {image.originalCoordinates.bottom_right_x - image.originalCoordinates.top_left_x} ×{" "}
                        {image.originalCoordinates.bottom_right_y - image.originalCoordinates.top_left_y} px
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              ))}
            </TooltipProvider>
          </div>
        </TabsContent>

        <TabsContent value="raw" className="mt-0">
          <pre className="bg-muted p-4 rounded-md overflow-auto text-xs max-h-[400px]">
            {currentPageData?.rawMarkdown || ""}
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  )
}

