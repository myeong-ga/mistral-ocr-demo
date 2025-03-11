"use client"

import { useState } from "react"
import { FileUploader } from "@/components/file-uploader"
import { ProcessingIndicator } from "@/components/processing-indicator"
import { ResultsViewer } from "@/components/results-viewer"
import { InfoPanel } from "@/components/info-panel"
import { ErrorDisplay } from "@/components/error-display"
import { SamplePdfOption } from "@/components/sample-pdf-option"
import { Button } from "@/components/ui/button"
import { Info } from "lucide-react"

// Define interfaces to match ResultsViewer props
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

interface ResultsData {
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

export default function Home() {
  const [file, setFile] = useState<File | null>(null)
  const [processingStage, setProcessingStage] = useState<"uploading" | "processing" | "extracting" | null>(null)
  const [results, setResults] = useState<ResultsData | null>(null)
  const [error, setError] = useState<{ message: string; details?: string } | null>(null)
  const [showInfo, setShowInfo] = useState(false)

  const handleFileSelected = (selectedFile: File) => {
    setFile(selectedFile)
    setResults(null)
    setError(null)
  }

  const handleProcessFile = async () => {
    if (!file) return

    setError(null)
    setProcessingStage("uploading")

    const formData = new FormData()
    formData.append("pdf", file)

    try {
      // Simulate the uploading stage
      await new Promise((resolve) => setTimeout(resolve, 1500))
      setProcessingStage("processing")

      // Simulate the processing stage
      await new Promise((resolve) => setTimeout(resolve, 2000))
      setProcessingStage("extracting")

      const response = await fetch("/api/parse-pdf", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to process PDF")
      }

      const data = await response.json()
      setResults(data)
    } catch (error) {
      console.error("Error processing PDF:", error)
      setError({
        message: error instanceof Error ? error.message : "An unexpected error occurred",
        details: error instanceof Error ? error.stack : undefined,
      })
    } finally {
      setProcessingStage(null)
    }
  }

  const toggleInfoPanel = () => {
    setShowInfo(!showInfo)
  }

  return (
    <main className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">Mistral OCR PDF Parser</h1>
          <Button variant="ghost" size="icon" onClick={toggleInfoPanel} aria-label="Show information">
            <Info className="h-5 w-5" />
          </Button>
        </div>

        {showInfo && <InfoPanel onClose={toggleInfoPanel} />}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="bg-card rounded-lg p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">Upload PDF</h2>
              <FileUploader onFileSelected={handleFileSelected} />

              <SamplePdfOption onSelect={handleFileSelected} />

              {file && !processingStage && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Selected file: {file.name}</p>
                  <Button onClick={handleProcessFile} className="w-full">
                    Process PDF
                  </Button>
                </div>
              )}
            </div>

            {processingStage && (
              <div className="bg-card rounded-lg p-6 shadow-sm">
                <ProcessingIndicator stage={processingStage} />
              </div>
            )}

            {error && (
              <div className="bg-card rounded-lg p-6 shadow-sm">
                <ErrorDisplay message={error.message} details={error.details} onRetry={handleProcessFile} />
              </div>
            )}
          </div>

          <div className="bg-card rounded-lg p-6 shadow-sm">
            <h2 className="text-xl font-semibold mb-4">Results</h2>
            {results ? (
              <ResultsViewer results={results} originalFile={file} />
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-muted-foreground">Upload and process a PDF to see the parsed results</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

