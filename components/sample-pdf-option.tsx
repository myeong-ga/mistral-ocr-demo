"use client"

import { FileIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

interface SamplePdfOptionProps {
  onSelect: (file: File) => void
}

export function SamplePdfOption({ onSelect }: SamplePdfOptionProps) {
  const samplePdfs = [
    { name: "Sample Invoice", url: "/samples/invoice-sample.pdf" },
    { name: "Sample Article", url: "/samples/article-sample.pdf" },
  ]

  const handleSelectSample = async (url: string, name: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const file = new File([blob], name, { type: "application/pdf" })
      onSelect(file)
    } catch (error) {
      console.error("Error loading sample PDF:", error)
    }
  }

  return (
    <div className="mt-6 border-t pt-4">
      <h3 className="text-sm font-medium mb-2">Or try with a sample PDF:</h3>
      <div className="flex flex-wrap gap-2">
        {samplePdfs.map((pdf) => (
          <Button
            key={pdf.name}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => handleSelectSample(pdf.url, pdf.name)}
          >
            <FileIcon className="h-4 w-4" />
            {pdf.name}
          </Button>
        ))}
      </div>
    </div>
  )
}

