// Reads a product barcode (EAN-13 / UPC-A / EAN-8 / UPC-E) out of a photo.
// Uses the browser's built-in BarcodeDetector where it exists and falls back
// to the ZXing decoder (loaded on demand, so it costs nothing until used).

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not open that image.'))
    img.src = url
  })
}

async function viaNative(img) {
  if (typeof window === 'undefined' || !('BarcodeDetector' in window)) return null
  try {
    const detector = new window.BarcodeDetector({ formats: ['ean_13', 'upc_a', 'ean_8', 'upc_e'] })
    const found = await detector.detect(img)
    return found?.[0]?.rawValue || null
  } catch {
    return null
  }
}

async function viaZxing(url) {
  const { BrowserMultiFormatReader, DecodeHintType, BarcodeFormat } = await import('@zxing/library')
  const hints = new Map()
  hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.EAN_13, BarcodeFormat.UPC_A, BarcodeFormat.EAN_8, BarcodeFormat.UPC_E])
  hints.set(DecodeHintType.TRY_HARDER, true)
  const reader = new BrowserMultiFormatReader(hints)
  try {
    const result = await reader.decodeFromImageUrl(url)
    return result?.getText() || null
  } catch {
    return null
  } finally {
    reader.reset()
  }
}

// Resolves to the barcode digits, or null when none could be read.
export async function scanBarcodeFromFile(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const code = (await viaNative(img)) || (await viaZxing(url))
    return code ? String(code).replace(/\D/g, '') || null : null
  } finally {
    URL.revokeObjectURL(url)
  }
}
