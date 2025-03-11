"use client"

import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface InfoPanelProps {
  onClose: () => void
}

export function InfoPanel({ onClose }: InfoPanelProps) {
  return (
    <Card className="mb-8 relative">
      <Button variant="ghost" size="icon" className="absolute right-2 top-2" onClick={onClose}>
        <X className="h-4 w-4" />
      </Button>
      <CardHeader>
        <CardTitle>About Mistral OCR PDF Parser</CardTitle>
        <CardDescription>Learn how to use this tool and understand the technology behind it</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="about">
          <TabsList className="mb-4">
            <TabsTrigger value="about">About</TabsTrigger>
            <TabsTrigger value="api">API Usage</TabsTrigger>
            <TabsTrigger value="code">Code Example</TabsTrigger>
          </TabsList>

          <TabsContent value="about">
            <div className="space-y-4">
              <p>
                This application demonstrates the capabilities of Mistral AI's OCR model for parsing PDF documents. The
                tool extracts text in markdown format and identifies images with their positional coordinates.
              </p>
              <h3 className="text-lg font-medium">How it works:</h3>
              <ol className="list-decimal list-inside space-y-2">
                <li>Upload a PDF document using the file uploader</li>
                <li>The document is sent to Mistral's OCR API for processing</li>
                <li>The API extracts text content and identifies images with their positions</li>
                <li>Results are displayed in various formats for analysis</li>
              </ol>
              <p>
                This tool is particularly useful for developers working on LLM and RAG (Retrieval Augmented Generation)
                applications who need to extract structured content from PDF documents.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="api">
            <div className="space-y-4">
              <p>
                This application uses the Mistral client library to process PDF documents. Here's how you can integrate
                it into your own applications:
              </p>
              <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
                {`import { Mistral } from '@mistralai/mistralai';

// Initialize the client
const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey });

// Upload the PDF file
const uploadedPdf = await client.files.upload({
  file: {
    fileName: "document.pdf",
    content: pdfBuffer, // Your PDF file as a Buffer
  },
  purpose: "ocr"
});

// Get a signed URL for the uploaded file
const signedUrl = await client.files.getSignedUrl({ 
  fileId: uploadedPdf.id 
});

// Process the PDF with Mistral OCR
const ocrResponse = await client.ocr.process({
  model: "mistral-ocr-latest",
  document: {
    type: "document_url",
    documentUrl: signedUrl.url,
    documentName: "document.pdf"
  },
  include_image_base64: true,
  image_limit: 50,
  image_min_size: 100
});

// The response contains pages with markdown and images
console.log(ocrResponse.pages);
console.log(ocrResponse.usage_info);`}
              </pre>
            </div>
          </TabsContent>

          <TabsContent value="code">
            <div className="space-y-4">
              <p>
                Here's a complete example of how to implement PDF parsing with Mistral OCR in a Next.js application:
              </p>
              <pre className="bg-muted p-4 rounded-md overflow-auto text-xs">
                {`// app/api/parse-pdf/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Mistral } from '@mistralai/mistralai';

// Initialize Mistral client with API key
const apiKey = process.env.MISTRAL_API_KEY;
const client = new Mistral({ apiKey });

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const pdfFile = formData.get("pdf") as File;
    
    if (!pdfFile) {
      return NextResponse.json(
        { error: "No PDF file provided" },
        { status: 400 }
      );
    }

    // Convert File to ArrayBuffer and then to Buffer
    const arrayBuffer = await pdfFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Upload the file to Mistral
    const uploadedPdf = await client.files.upload({
      file: {
        fileName: pdfFile.name,
        content: buffer,
      },
      purpose: "ocr"
    });

    // Get a signed URL for the uploaded file
    const signedUrl = await client.files.getSignedUrl({ 
      fileId: uploadedPdf.id 
    });

    // Process the PDF with Mistral OCR
    const ocrResponse = await client.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: signedUrl.url,
        documentName: pdfFile.name
      },
      include_image_base64: true,
      image_limit: 50,
      image_min_size: 100
    });

    // Process the OCR response
    const processedPages = ocrResponse.pages.map(page => {
      // Create a map of image IDs to base64 data URLs
      const imageMap = {};
      
      // Process images for this page
      const images = page.images?.map(image => {
        // Create a data URL for the image
        const dataUrl = \`data:image/png;base64,\${image.image_base64}\`;
        
        // Store in the map for markdown replacement
        imageMap[image.id] = dataUrl;
        
        // Calculate width and height from coordinates
        const width = image.bottom_right_x - image.top_left_x;
        const height = image.bottom_right_y - image.top_left_y;
        
        return {
          id: image.id,
          url: dataUrl,
          coordinates: {
            x: image.top_left_x / page.dimensions.width,
            y: image.top_left_y / page.dimensions.height,
            width: width / page.dimensions.width,
            height: height / page.dimensions.height
          },
          originalCoordinates: {
            top_left_x: image.top_left_x,
            top_left_y: image.top_left_y,
            bottom_right_x: image.bottom_right_x,
            bottom_right_y: image.bottom_right_y
          }
        };
      }) || [];
      
      // Replace image placeholders in markdown
      let processedMarkdown = page.markdown;
      Object.entries(imageMap).forEach(([id, dataUrl]) => {
        processedMarkdown = processedMarkdown.replace(
          new RegExp(\`!\\[\${id}\\]\$$\${id}\$$\`, 'g'), 
          \`![\${id}](\${dataUrl})\`
        );
      });
      
      return {
        index: page.index,
        markdown: processedMarkdown,
        rawMarkdown: page.markdown,
        images,
        dimensions: page.dimensions
      };
    });
    
    // Return the processed data
    return NextResponse.json({
      text: processedPages.map(page => page.markdown).join('\\n\\n'),
      rawText: processedPages.map(page => page.rawMarkdown).join('\\n\\n'),
      pages: processedPages,
      images: processedPages.flatMap(page => page.images),
      usage: ocrResponse.usage_info,
      model: ocrResponse.model
    });
  } catch (error) {
    console.error("Error processing PDF:", error);
    return NextResponse.json(
      { error: "Failed to process PDF" },
      { status: 500 }
    );
  }
}`}
              </pre>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

