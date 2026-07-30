const MAX_DIMENSION = 1400
const JPEG_QUALITY = 0.82

// Downsizes/re-encodes to keep the base64 payload sane before it goes to the
// AI proxy — a raw phone photo can be several MB, most of which the model
// doesn't need to read a date/time off an invitation or appointment card.
export function compressImageFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        let { width, height } = img
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const scale = MAX_DIMENSION / Math.max(width, height)
          width = Math.round(width * scale)
          height = Math.round(height * scale)
        }

        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        canvas.getContext('2d').drawImage(img, 0, 0, width, height)

        const dataUrl = canvas.toDataURL('image/jpeg', JPEG_QUALITY)
        resolve({ base64: dataUrl.split(',')[1], mediaType: 'image/jpeg', previewUrl: dataUrl })
      }
      img.onerror = () => reject(new Error('image_decode_failed'))
      img.src = reader.result
    }
    reader.onerror = () => reject(new Error('image_read_failed'))
    reader.readAsDataURL(file)
  })
}

// PDFs need no compression (there's no re-encoding that makes sense for a
// scanned document) — just base64-encode the raw bytes for the "document"
// content block the AI endpoint expects. Rejects large files client-side
// since Vercel serverless functions cap request bodies around 4.5MB and a
// base64 PDF inflates ~33% over its raw size.
const MAX_PDF_BYTES = 4 * 1024 * 1024

export function readPdfFile(file) {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_PDF_BYTES) {
      reject(new Error('pdf_too_large'))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      resolve({ base64: dataUrl.split(',')[1], mediaType: 'application/pdf', fileName: file.name })
    }
    reader.onerror = () => reject(new Error('pdf_read_failed'))
    reader.readAsDataURL(file)
  })
}
