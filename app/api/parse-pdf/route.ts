
import { type NextRequest, NextResponse } from "next/server"
import { Mistral } from "@mistralai/mistralai"

// Initialize Mistral client with API key
const apiKey = process.env.MISTRAL_API_KEY
const client = new Mistral({ apiKey })

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const pdfFile = formData.get("pdf") as File

    if (!pdfFile) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 })
    }

    // Convert File to ArrayBuffer and then to Buffer
    const arrayBuffer = await pdfFile.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Upload the file to Mistral
    const uploadedPdf = await client.files.upload({
      file: {
        fileName: pdfFile.name,
        content: buffer,
      },
      // @ts-expect-error
      purpose: "ocr",
    })

    // Get a signed URL for the uploaded file
    const signedUrl = await client.files.getSignedUrl({
      fileId: uploadedPdf.id,
    })

    // Process the PDF with Mistral OCR
    const ocrResponse = await client.ocr.process({
      model: "mistral-ocr-latest",
      document: {
        type: "document_url",
        documentUrl: signedUrl.url,
        documentName: pdfFile.name,
      },
     
      include_image_base64: true,
      image_limit: 50, // Reasonable limit for most documents
      image_min_size: 100, // Minimum size in pixels
    })

    // Process the OCR response based on the provided format
    const processedPages = ocrResponse.pages.map((page) => {
      // Create a map of image IDs to base64 data URLs
      const imageMap = {}

      // Process images for this page
      const images =
        page.images?.map((image) => {
          // Create a data URL for the image
        
          const dataUrl = `data:image/png;base64,${image.image_base64}`

          // Store in the map for markdown replacement
          
          imageMap[image.id] = dataUrl

          // Calculate width and height from coordinates
          const width = image.bottom_right_x - image.top_left_x
          const height = image.bottom_right_y - image.top_left_y

          // Calculate relative coordinates based on page dimensions
          const pageWidth = page.dimensions.width
          const pageHeight = page.dimensions.height

          return {
            id: image.id,
            url: dataUrl,
            coordinates: {
              x: image.top_left_x / pageWidth,
              y: image.top_left_y / pageHeight,
              width: width / pageWidth,
              height: height / pageHeight,
            },
            originalCoordinates: {
              top_left_x: image.top_left_x,
              top_left_y: image.top_left_y,
              bottom_right_x: image.bottom_right_x,
              bottom_right_y: image.bottom_right_y,
            },
          }
        }) || []

      // Replace image placeholders in markdown
      let processedMarkdown = page.markdown
      Object.entries(imageMap).forEach(([id, dataUrl]) => {
        processedMarkdown = processedMarkdown.replace(
          new RegExp(`!\\[${id}\\]\$$${id}\$$`, "g"),
          `![${id}](${dataUrl})`,
        )
      })

      return {
        index: page.index,
        markdown: processedMarkdown,
        rawMarkdown: page.markdown,
        images,
        dimensions: page.dimensions,
      }
    })

    // Combine all pages
    const combinedMarkdown = processedPages.map((page) => page.markdown).join("\n\n")
    const rawMarkdown = processedPages.map((page) => page.rawMarkdown).join("\n\n")
    const allImages = processedPages.flatMap((page) => page.images)

    // Return the processed data
    return NextResponse.json({
      text: combinedMarkdown,
      rawText: rawMarkdown,
      pages: processedPages,
      images: allImages,
      usage: ocrResponse.usage_info,
      model: ocrResponse.model,
    })
  } catch (error) {
    console.error("Error processing PDF:", error)
    return NextResponse.json(
      { error: "Failed to process PDF", details: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}

