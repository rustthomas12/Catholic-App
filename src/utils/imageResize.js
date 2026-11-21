// Prepare photos on the device before upload:
//  • Shrink them. A phone photo is often 4–8 MB at 4000px+; feeds never show
//    more than ~1600px, so uploading the original makes posting slow on mobile
//    data and makes every viewer download the full file.
//  • Strip hidden metadata. Phone photos can carry the GPS location where they
//    were taken (EXIF), which could reveal someone's home. Re-drawing the
//    picture onto a canvas keeps only the pixels, so every photo is re-saved,
//    even one that's already small.

// Scale (w, h) down to fit inside a max × max box, keeping the aspect ratio.
// Never scales up.
export function fitWithin(width, height, max) {
  if (!width || !height) return { width: 0, height: 0 }
  const scale = Math.min(1, max / Math.max(width, height))
  return { width: Math.round(width * scale), height: Math.round(height * scale) }
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('decode failed')) }
    img.src = url
  })
}

/**
 * Returns a re-saved JPEG File with no metadata, at most maxDim on its long
 * side. GIFs are returned as they are so they keep their animation (phones
 * don't write location into GIFs), and if the browser can't decode the file
 * the original is returned.
 * Browsers apply EXIF rotation when decoding into <img>, so phone photos keep
 * the right orientation.
 */
export async function shrinkImage(file, { maxDim = 1600, quality = 0.85 } = {}) {
  if (!file || file.type === 'image/gif' || typeof document === 'undefined') return file
  try {
    const img = await loadImage(file)
    const { width, height } = fitWithin(img.naturalWidth, img.naturalHeight, maxDim)
    if (!width) return file

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#fff' // JPEG has no transparency; flatten PNGs onto white
    ctx.fillRect(0, 0, width, height)
    ctx.drawImage(img, 0, 0, width, height)

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) return file
    const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], name, { type: 'image/jpeg', lastModified: Date.now() })
  } catch {
    return file
  }
}

// Phones produce big originals; accept them since they'll be shrunk.
// GIFs aren't resized, so they still have to fit the storage limit as-is.
export const PICK_MAX_BYTES = 25 * 1024 * 1024
