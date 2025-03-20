
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
     
      includeImageBase64: true,
      imageLimit: 50, // Reasonable limit for most documents
      imageMinSize: 100, // Minimum size in pixels
    })

    process.stdout.write(JSON.stringify(ocrResponse, null, 2))

    // Process the OCR response based on the provided format
    const processedPages = ocrResponse.pages.map((page) => {
      const imageMap: Record<string, string> = {}

      // Process images for this page
      const images =
        page.images?.map((image) => {
          // Create a data URL for the image
        
          const dataUrl = `${image.imageBase64}`

          // Store in the map for markdown replacement
          
          imageMap[image.id] = dataUrl

          // Calculate width and height from coordinates
          const width = (image.bottomRightX ?? 0) - (image.topLeftX ?? 0)
          const height = (image.bottomRightY ?? 0) - (image.topLeftY ?? 0)

          // Calculate relative coordinates based on page dimensions
          const pageWidth = page.dimensions?.width ?? 1
          const pageHeight = page.dimensions?.height ?? 1

          return {
            id: image.id,
            url: dataUrl,
            coordinates: {
              x: (image.topLeftX ?? 0) / pageWidth,
              y: (image.topLeftY ?? 0) / pageHeight,
              width: width / pageWidth,
              height: height / pageHeight,
            },
            originalCoordinates: {
              top_left_x: image.topLeftX,
              top_left_y: image.topLeftY,
              bottom_right_x: image.bottomRightX,
              bottom_right_y: image.bottomRightY,
            },
          }
        }) || []

      // Replace image placeholders in markdown
      let processedMarkdown = page.markdown
      Object.entries(imageMap).forEach(([id, dataUrl]) => {
        // processedMarkdown = processedMarkdown.replace(
        //   new RegExp(`!\\[${id}\\]\$$${id}\$$`, "g"),`![${id}](${dataUrl})`,
        // )
        processedMarkdown = processedMarkdown.replace(
          new RegExp(`!\\[${id}\\]`, "g"),
          `![${id}](${dataUrl})`,
        );
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
      usage: ocrResponse.usageInfo,
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

