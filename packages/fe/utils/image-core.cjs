// Shared by browser/SSR, upload CLI and maintenance tools. No Node or DOM APIs.
const policy = require('../../server/src/config/image-policy.json')
function getImageUrlMeta(src) {
  const p = new URLSearchParams(src.split('#', 2)[1] || '')
  const width = Number(p.get('w'))
  const height = Number(p.get('h'))
  const thumbHash = p.get('th') || ''
  if (
    !Number.isSafeInteger(width) ||
    width <= 0 ||
    !Number.isSafeInteger(height) ||
    height <= 0 ||
    !/^[A-Za-z0-9_-]{7,128}$/.test(thumbHash)
  )
    return null
  return { width, height, thumbHash }
}
function appendImageUrlMeta(src, meta) {
  const [base, fragment = ''] = src.split('#', 2)
  const p = new URLSearchParams(fragment)
  p.set('w', String(meta.width))
  p.set('h', String(meta.height))
  p.set('th', meta.thumbHash)
  return `${base}#${p.toString()}`
}
function canTransformImage(src) {
  try {
    const url = new URL(src)
    return (
      url.protocol === 'https:' &&
      url.hostname === policy.ossHost &&
      !/\.(gif|svg)$/i.test(url.pathname) &&
      !url.searchParams.has('x-oss-process') &&
      !Array.from(url.searchParams.keys()).some((key) =>
        /signature|ossaccesskeyid|x-oss-credential/i.test(key),
      )
    )
  } catch {
    return false
  }
}
function getOssImageVariant(src, width) {
  if (!canTransformImage(src) || !Number.isFinite(width) || width < 1)
    return src
  const url = new URL(src)
  const meta = getImageUrlMeta(src)
  const requestedWidth = Math.round(meta ? Math.min(width, meta.width) : width)
  url.searchParams.set(
    'x-oss-process',
    `image/auto-orient,1/resize,w_${requestedWidth},limit_1/format,webp/quality,q_${policy.deliveryQuality}`,
  )
  return url.href
}
function imageMetaFromRgba(
  width,
  height,
  thumbWidth,
  thumbHeight,
  rgba,
  rgbaToThumbHash,
) {
  const bytes = rgbaToThumbHash(thumbWidth, thumbHeight, rgba)
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const thumbHash = btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
  return { width, height, thumbHash }
}
function imageMimeFromBytes(bytes) {
  const signature = Array.from(bytes.slice(0, 12))
    .map((c) => String.fromCharCode(c))
    .join('')
  if (bytes[0] === 0x89 && signature.slice(1, 4) === 'PNG') return 'image/png'
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff)
    return 'image/jpeg'
  if (signature.startsWith('GIF87a') || signature.startsWith('GIF89a'))
    return 'image/gif'
  if (signature.startsWith('RIFF') && signature.slice(8, 12) === 'WEBP')
    return 'image/webp'
  if (signature.startsWith('BM')) return 'image/bmp'
  return null
}
function ossImageLoader({ src, width }) {
  return getOssImageVariant(src, width)
}
module.exports = {
  imageMetaFromRgba,
  imageMimeFromBytes,
  policy,
  getImageUrlMeta,
  appendImageUrlMeta,
  canTransformImage,
  getOssImageVariant,
  ossImageLoader,
}
