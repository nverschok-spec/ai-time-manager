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
