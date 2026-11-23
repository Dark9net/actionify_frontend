/*
  The upload filter, in the browser: checks each file before it goes to R2, so a program, script or web
  page renamed to "photo.jpg" (or an SVG with a script in it) is stopped here, with the reason.

  This is the same code as backend/src/utils/filecheck.js (copied: keep the two in step). The API runs
  it again on the bytes R2 actually received before a file is shown anywhere, so this check is only a
  courtesy: it saves sending a file that would be refused.

  Only five kinds go up: photos (any image format, camera RAW included), videos, audio, graphics
  (vector and design files) and 3D models.
*/
/** How much of a file is read to check it: its signature, and enough of a text file to scan. */
const HEAD_BYTES = 64 * 1024
const MB = 1024 * 1024
const GB = 1024 * MB
/** The most one file of each kind can be. A large file goes up to R2 in parts (services/media.js). */
const MAX_BYTES = {
  photo: 200 * MB,
  video: 200 * GB,
  audio: 20 * GB,
  graphic: 20 * GB,
  model: 100 * GB,
}
/** An SVG is read whole to check it, so it is kept small. */
const MAX_SVG_BYTES = 20 * MB

/* ---------- Reading bytes ---------- */

/** Whether `b` holds `sig` (a string of byte values, or an array) at `off`. */
function at(b, off, sig) {
  if (off + sig.length > b.length) return false
  for (let i = 0; i < sig.length; i++) {
    const want = typeof sig === "string" ? sig.charCodeAt(i) : sig[i]
    if (b[off + i] !== want) return false
  }
  return true
}

const u16 = (b, o) => b[o] | (b[o + 1] << 8)
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0

/** Bytes as text, one character per byte (for looking for markers in any file). */
function latin1(b, from = 0, to = b.length) {
  let s = ""
  for (let i = from; i < Math.min(to, b.length); i += 8192) s += String.fromCharCode.apply(null, b.subarray(i, Math.min(i + 8192, to, b.length)))
  return s
}

/** Text with no NUL bytes and almost no control characters (tabs and line ends are fine). */
function isText(b) {
  if (!b.length) return false
  let odd = 0
  for (let i = 0; i < b.length; i++) {
    const c = b[i]
    if (c === 0) return false
    if (c < 32 && c !== 9 && c !== 10 && c !== 13 && c !== 12) odd++
  }
  return odd / b.length < 0.01
}

/** The start of a text file, without a byte-order mark and leading blank space. */
const textStart = (b, n = 2048) => latin1(b, 0, n).replace(/^\xEF\xBB\xBF/, "").replace(/^\s+/, "")

/* ---------- Containers several formats share ---------- */

const isoMedia = (b) => at(b, 4, "ftyp") // MP4, MOV, M4A, HEIC, AVIF, CR3, 3GP…
const quickTime = (b) => isoMedia(b) || ["moov", "mdat", "wide", "free", "skip", "pnot"].some((a) => at(b, 4, a))
const riff = (...forms) => (b) => (at(b, 0, "RIFF") || at(b, 0, "RF64") || at(b, 0, "BW64")) && forms.some((f) => at(b, 8, f))
const ebml = (b) => at(b, 0, [0x1a, 0x45, 0xdf, 0xa3]) // Matroska, WebM
const ogg = (b) => at(b, 0, "OggS")
const asf = (b) => at(b, 0, [0x30, 0x26, 0xb2, 0x75, 0x8e, 0x66, 0xcf, 0x11]) // WMV, WMA
const tiffLike = (b) =>
  at(b, 0, [0x49, 0x49, 0x2a, 0x00]) || // II*\0  TIFF, DNG, NEF, CR2, ARW, PEF, SRW…
  at(b, 0, [0x4d, 0x4d, 0x00, 0x2a]) || // MM\0*
  at(b, 0, [0x49, 0x49, 0x2b, 0x00]) || // BigTIFF
  at(b, 0, [0x4d, 0x4d, 0x00, 0x2b]) ||
  at(b, 0, "IIRO") || at(b, 0, "IIRS") || at(b, 0, "MMOR") || // Olympus ORF
  at(b, 0, [0x49, 0x49, 0x55, 0x00]) // Panasonic RW2
const mp3 = (b) => at(b, 0, "ID3") || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && ((b[1] >> 1) & 3) !== 0)
const adts = (b) => at(b, 0, "ADIF") || at(b, 0, "ID3") || (b[0] === 0xff && (b[1] & 0xf6) === 0xf0)
const mpegPs = (b) => at(b, 0, [0, 0, 1, 0xba]) || at(b, 0, [0, 0, 1, 0xb3])
const mpegTs = (b) => b[0] === 0x47 && (b.length < 189 || b[188] === 0x47)
const m2ts = (b) => b[4] === 0x47 && (b.length < 197 || b[196] === 0x47)
const gzip = (b) => at(b, 0, [0x1f, 0x8b])
const zstd = (b) => at(b, 0, [0x28, 0xb5, 0x2f, 0xfd])
const isZip = (b) => at(b, 0, [0x50, 0x4b, 0x03, 0x04])
const pdf = (b) => at(b, 0, "%PDF-")
const postScript = (b) => at(b, 0, "%!PS-Adobe") || at(b, 0, [0xc5, 0xd0, 0xd3, 0xc6]) // EPS, also with a binary preview

/** The names of the entries a ZIP starts with, from the local headers in the bytes read. */
function zipNames(b) {
  const names = []
  let p = 0
  while (names.length < 200 && at(b, p, [0x50, 0x4b, 0x03, 0x04]) && p + 30 <= b.length) {
    const flags = u16(b, p + 6)
    const size = u32(b, p + 18)
    const nameLen = u16(b, p + 26)
    const extraLen = u16(b, p + 28)
    names.push(new TextDecoder("utf-8").decode(b.subarray(p + 30, p + 30 + nameLen)))
    if (flags & 8) break // the size follows the data: the next header can't be found from here
    p += 30 + nameLen + extraLen + size
  }
  return names
}
/** A ZIP whose entries pass `test(names)`. */
const zipOf = (test) => (b) => isZip(b) && test(zipNames(b))

/* ---------- What could run ---------- */

/** What a file really is, when it is something that must never go up. */
function dangerOf(b) {
  if (at(b, 0, "MZ")) return "a Windows program"
  if (at(b, 0, [0x7f, 0x45, 0x4c, 0x46])) return "a Linux program"
  if ([[0xfe, 0xed, 0xfa, 0xce], [0xfe, 0xed, 0xfa, 0xcf], [0xce, 0xfa, 0xed, 0xfe], [0xcf, 0xfa, 0xed, 0xfe]].some((s) => at(b, 0, s))) return "a Mac program"
  if (at(b, 0, [0xca, 0xfe, 0xba, 0xbe])) return "a program"
  if (at(b, 0, "dex\n")) return "an Android program"
  if (at(b, 0, "#!")) return "a script"
  if (at(b, 0, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])) return "an Office document or installer"
  if (at(b, 0, "MSCF") || at(b, 0, "ISc(")) return "an installer"
  if (isZip(b)) return "a ZIP archive"
  if (at(b, 0, "Rar!") || at(b, 0, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]) || at(b, 0, [0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00]) || gzip(b)) return "a compressed archive"
  if (pdf(b)) return "a PDF document"
  if (at(b, 0, "{\\rtf")) return "a document"
  if (isText(b)) {
    const t = textStart(b).toLowerCase()
    if (/^<!doctype html|^<html|^<head|^<body|^<script/.test(t)) return "a web page"
    if (/^<\?php/.test(t)) return "a PHP script"
    if (/^@echo|^rem |^:: /.test(t)) return "a Windows script"
    if (/^(?:function |var |const |let |import |export |\(function)/.test(t)) return "a JavaScript file"
    return "a text file"
  }
  return null
}

/** Code hidden inside the bytes of an image or video (a web shell in a photo's comment). */
const HIDDEN_CODE = /<\?php|<script[\s>/]|<%@|<%=|<\?=/i

/** Entries inside a ZIP-based design or 3D file that are programs or scripts. */
const RUNNABLE_ENTRY = /\.(exe|dll|com|scr|bat|cmd|msi|ps1|vbs|vbe|js|jse|wsf|hta|jar|sh|app|apk|html?|php|svg)$/i
const zipEntries = (b) => {
  const bad = zipNames(b).find((n) => RUNNABLE_ENTRY.test(n) || n.includes("../"))
  return bad ? `it carries ${bad.split("/").pop()} inside it` : null
}

/** "&#106;avascript&colon;" → "javascript:", so encoded attacks are seen too. */
function decodeEntities(s) {
  const code = (n) => {
    try {
      return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : ""
    } catch {
      return ""
    }
  }
  return s
    .replace(/&#x([0-9a-f]+);?/gi, (_, h) => code(parseInt(h, 16)))
    .replace(/&#(\d+);?/g, (_, d) => code(Number(d)))
    .replace(/&colon;/gi, ":")
    .replace(/&(tab|newline);/gi, "")
}

/** A link inside a drawing is fine only to a part of itself (#id) or to an embedded picture. */
const SAFE_REF = /^(?:#|data:image\/(?:png|jpe?g|gif|webp|avif|bmp);)/i

/**
 * Anything in an XML file (SVG, COLLADA, X3D) that could run or reach outside. The text is checked
 * as written and with its character references decoded.
 */
function xmlProblem(raw) {
  const text = decodeEntities(raw)
  // every control character and space, so "java\tscript:" is seen as "javascript:"
  // eslint-disable-next-line no-control-regex
  const tight = text.replace(/[\u0000-\u0020]+/g, "")
  if (/<!ENTITY/i.test(text) || /<!DOCTYPE[^>]*\[/i.test(text)) return "it declares XML entities"
  if (/<\?xml-stylesheet/i.test(text)) return "it loads a stylesheet"
  if (/<script\b/i.test(text)) return "it contains a script"
  if (/<foreignObject\b/i.test(text)) return "it embeds a web page"
  if (/<(?:iframe|embed|object|frame|frameset|applet|meta|link|base|form|input|button|textarea|audio|video|handler|listener)\b/i.test(text)) {
    return "it embeds content that isn't part of a drawing"
  }
  if (/[\s"'/;]on[a-z]+\s*=/i.test(text)) return "it has an event handler (code that runs on a click or load)"
  if (/(?:javascript|vbscript|livescript|mocha):/i.test(tight)) return "it contains a javascript: link"
  if (/data:(?:text\/html|text\/javascript|application\/|image\/svg)/i.test(tight)) return "it embeds a web page or another drawing"
  if (/@import|expression\(|behavior:|-moz-binding/i.test(tight)) return "its styles load or run code"
  if (/attributeName\s*=\s*["']?\s*(?:xlink:)?href/i.test(text)) return "it animates a link"
  for (const m of text.matchAll(/\b(?:xlink:)?href\s*=\s*["']?\s*([^"'\s>]*)/gi)) {
    if (m[1] && !SAFE_REF.test(m[1])) return "it links to files outside itself"
  }
  for (const m of text.matchAll(/url\(\s*["']?\s*([^"')\s]*)/gi)) {
    if (m[1] && !SAFE_REF.test(m[1])) return "it links to files outside itself"
  }
  return null
}

/** An SVG: a drawing whose first element is <svg>, with nothing in it that runs. */
function svgProblem(b) {
  if (!isText(b)) return "it isn't a real SVG drawing"
  const text = new TextDecoder("utf-8").decode(b).replace(/^\uFEFF/, "")
  // the prolog may hold an XML declaration, comments and a doctype; then the drawing itself
  const body = text.replace(/^\s*(?:<\?xml[^>]*\?>\s*|<!--[\s\S]*?-->\s*|<!DOCTYPE\s+svg[^>[]*>\s*)*/i, "")
  if (!/^<svg[\s>]/i.test(body)) return "it isn't a real SVG drawing"
  return xmlProblem(text)
}

/** A PostScript or PDF-based design file (EPS, AI) that would act when opened. */
function postScriptProblem(b) {
  const t = latin1(b)
  if (/%pipe%|\bdeletefile\b|\brenamefile\b/.test(t)) return "it runs commands when opened"
  if (/\/(?:JavaScript|JS|Launch|EmbeddedFile|RichMedia|SubmitForm|ImportData)[\s(</]/.test(t)) return "it runs code or carries files when opened"
  return null
}

/** Text-based 3D files must be plain text with no web code in them. */
const textModel = (test) => (b) => isText(b) && test(textStart(b), b)
const markupInText = (b) => (/<(?:script|html|iframe|body)\b|<\?php|javascript:/i.test(latin1(b)) ? "it contains web code" : null)

/* ---------- The formats ---------- */

/*
  ext: [kind, MIME type, signature test(bytes, size), extra check(bytes, size) → problem | null].
  The MIME type is what R2 stores and serves; formats a browser can't show are served as downloads.
*/
const F = (kind, contentType, test, check) => ({ kind, contentType, test, check })
const photo = (type, test, check) => F("photo", type, test, check)
const video = (type, test) => F("video", type, test)
const audio = (type, test) => F("audio", type, test)
const graphic = (type, test, check) => F("graphic", type, test, check)
const model = (type, test, check) => F("model", type, test, check)

const jpeg = (b) => at(b, 0, [0xff, 0xd8, 0xff])
const png = (b) => at(b, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
const jp2 = (b) => at(b, 0, [0, 0, 0, 0x0c, 0x6a, 0x50, 0x20, 0x20]) || at(b, 0, [0xff, 0x4f, 0xff, 0x51])
const netpbm = (b) => b[0] === 0x50 && b[1] >= 0x31 && b[1] <= 0x37 && (b[2] === 0x0a || b[2] === 0x0d || b[2] === 0x20 || b[2] === 0x09)
// TGA has no signature: its header must describe an image (colour map 0/1, a known image type)
const tga = (b) => b.length >= 18 && b[1] <= 1 && [1, 2, 3, 9, 10, 11, 32, 33].includes(b[2]) && [8, 15, 16, 24, 32].includes(b[16])
const kdc = tiffLike

const FORMATS = {
  // photographs: everyday, professional and camera RAW
  jpg: photo("image/jpeg", jpeg),
  jpeg: photo("image/jpeg", jpeg),
  jpe: photo("image/jpeg", jpeg),
  jfif: photo("image/jpeg", jpeg),
  png: photo("image/png", png),
  apng: photo("image/apng", png),
  gif: photo("image/gif", (b) => at(b, 0, "GIF87a") || at(b, 0, "GIF89a")),
  webp: photo("image/webp", riff("WEBP")),
  avif: photo("image/avif", isoMedia),
  heic: photo("image/heic", isoMedia),
  heif: photo("image/heif", isoMedia),
  hif: photo("image/heif", isoMedia),
  jxl: photo("image/jxl", (b) => at(b, 0, [0xff, 0x0a]) || at(b, 0, [0, 0, 0, 0x0c, 0x4a, 0x58, 0x4c, 0x20, 0x0d, 0x0a, 0x87, 0x0a])),
  jp2: photo("image/jp2", jp2),
  j2k: photo("image/jp2", jp2),
  jpx: photo("image/jpx", jp2),
  jpf: photo("image/jpx", jp2),
  tif: photo("image/tiff", tiffLike),
  tiff: photo("image/tiff", tiffLike),
  bmp: photo("image/bmp", (b) => at(b, 0, "BM")),
  dib: photo("image/bmp", (b) => at(b, 0, "BM")),
  ico: photo("image/x-icon", (b) => at(b, 0, [0, 0, 1, 0])),
  tga: photo("image/x-tga", tga),
  exr: photo("image/x-exr", (b) => at(b, 0, [0x76, 0x2f, 0x31, 0x01])),
  hdr: photo("image/vnd.radiance", (b) => at(b, 0, "#?RADIANCE") || at(b, 0, "#?RGBE")),
  dds: photo("image/vnd.ms-dds", (b) => at(b, 0, "DDS ")),
  qoi: photo("image/qoi", (b) => at(b, 0, "qoif")),
  pbm: photo("image/x-portable-bitmap", netpbm),
  pgm: photo("image/x-portable-graymap", netpbm),
  ppm: photo("image/x-portable-pixmap", netpbm),
  pnm: photo("image/x-portable-anymap", netpbm),
  dng: photo("image/x-adobe-dng", tiffLike),
  cr2: photo("image/x-canon-cr2", tiffLike),
  cr3: photo("image/x-canon-cr3", isoMedia),
  crw: photo("image/x-canon-crw", (b) => at(b, 0, "II") && at(b, 6, "HEAPCCDR")),
  nef: photo("image/x-nikon-nef", tiffLike),
  nrw: photo("image/x-nikon-nrw", tiffLike),
  arw: photo("image/x-sony-arw", tiffLike),
  srf: photo("image/x-sony-srf", tiffLike),
  sr2: photo("image/x-sony-sr2", tiffLike),
  orf: photo("image/x-olympus-orf", tiffLike),
  rw2: photo("image/x-panasonic-rw2", tiffLike),
  raw: photo("image/x-panasonic-raw", tiffLike),
  pef: photo("image/x-pentax-pef", tiffLike),
  srw: photo("image/x-samsung-srw", tiffLike),
  raf: photo("image/x-fuji-raf", (b) => at(b, 0, "FUJIFILMCCD-RAW")),
  rwl: photo("image/x-leica-rwl", tiffLike),
  iiq: photo("image/x-phaseone-iiq", tiffLike),
  "3fr": photo("image/x-hasselblad-3fr", tiffLike),
  fff: photo("image/x-hasselblad-fff", tiffLike),
  erf: photo("image/x-epson-erf", tiffLike),
  mos: photo("image/x-leaf-mos", tiffLike),
  kdc: photo("image/x-kodak-kdc", kdc),
  dcr: photo("image/x-kodak-dcr", tiffLike),
  mrw: photo("image/x-minolta-mrw", (b) => at(b, 0, [0, 0x4d, 0x52, 0x4d])),
  x3f: photo("image/x-sigma-x3f", (b) => at(b, 0, "FOVb")),

  // videos
  mp4: video("video/mp4", quickTime),
  m4v: video("video/x-m4v", quickTime),
  mov: video("video/quicktime", quickTime),
  qt: video("video/quicktime", quickTime),
  "3gp": video("video/3gpp", isoMedia),
  "3g2": video("video/3gpp2", isoMedia),
  f4v: video("video/x-f4v", isoMedia),
  webm: video("video/webm", ebml),
  mkv: video("video/x-matroska", ebml),
  mk3d: video("video/x-matroska", ebml),
  avi: video("video/x-msvideo", riff("AVI ")),
  wmv: video("video/x-ms-wmv", asf),
  asf: video("video/x-ms-asf", asf),
  flv: video("video/x-flv", (b) => at(b, 0, [0x46, 0x4c, 0x56, 0x01])),
  mpg: video("video/mpeg", mpegPs),
  mpeg: video("video/mpeg", mpegPs),
  m2v: video("video/mpeg", mpegPs),
  vob: video("video/mpeg", mpegPs),
  ts: video("video/mp2t", mpegTs),
  mts: video("video/mp2t", (b) => m2ts(b) || mpegTs(b)),
  m2ts: video("video/mp2t", (b) => m2ts(b) || mpegTs(b)),
  ogv: video("video/ogg", ogg),
  mxf: video("application/mxf", (b) => at(b, 0, [0x06, 0x0e, 0x2b, 0x34])),

  // audio
  mp3: audio("audio/mpeg", mp3),
  wav: audio("audio/wav", riff("WAVE")),
  bwf: audio("audio/wav", riff("WAVE")),
  flac: audio("audio/flac", (b) => at(b, 0, "fLaC") || (at(b, 0, "ID3") && latin1(b, 0, 4096).includes("fLaC"))),
  aac: audio("audio/aac", adts),
  m4a: audio("audio/mp4", quickTime),
  m4b: audio("audio/mp4", quickTime),
  alac: audio("audio/mp4", quickTime),
  ogg: audio("audio/ogg", ogg),
  oga: audio("audio/ogg", ogg),
  opus: audio("audio/ogg", ogg),
  spx: audio("audio/ogg", ogg),
  weba: audio("audio/webm", ebml),
  mka: audio("audio/x-matroska", ebml),
  aif: audio("audio/aiff", (b) => at(b, 0, "FORM") && (at(b, 8, "AIFF") || at(b, 8, "AIFC"))),
  aiff: audio("audio/aiff", (b) => at(b, 0, "FORM") && (at(b, 8, "AIFF") || at(b, 8, "AIFC"))),
  aifc: audio("audio/aiff", (b) => at(b, 0, "FORM") && at(b, 8, "AIFC")),
  wma: audio("audio/x-ms-wma", asf),
  amr: audio("audio/amr", (b) => at(b, 0, "#!AMR")),
  mid: audio("audio/midi", (b) => at(b, 0, "MThd")),
  midi: audio("audio/midi", (b) => at(b, 0, "MThd")),
  ape: audio("audio/x-ape", (b) => at(b, 0, "MAC ")),
  wv: audio("audio/x-wavpack", (b) => at(b, 0, "wvpk")),
  caf: audio("audio/x-caf", (b) => at(b, 0, "caff")),
  au: audio("audio/basic", (b) => at(b, 0, ".snd")),
  snd: audio("audio/basic", (b) => at(b, 0, ".snd")),
  dsf: audio("audio/x-dsf", (b) => at(b, 0, "DSD ")),
  dff: audio("audio/x-dff", (b) => at(b, 0, "FRM8")),
  ac3: audio("audio/ac3", (b) => at(b, 0, [0x0b, 0x77])),

  // graphics: vector drawings and design files
  svg: graphic("image/svg+xml", () => true, svgProblem),
  psd: graphic("image/vnd.adobe.photoshop", (b) => at(b, 0, "8BPS")),
  psb: graphic("image/vnd.adobe.photoshop", (b) => at(b, 0, "8BPS")),
  ai: graphic("application/illustrator", (b) => pdf(b) || postScript(b), postScriptProblem),
  eps: graphic("application/postscript", postScript, postScriptProblem),
  epsf: graphic("application/postscript", postScript, postScriptProblem),
  xcf: graphic("image/x-xcf", (b) => at(b, 0, "gimp xcf ")),
  kra: graphic("application/x-krita", zipOf((n) => n[0] === "mimetype"), zipEntries),
  ora: graphic("image/openraster", zipOf((n) => n[0] === "mimetype"), zipEntries),
  cdr: graphic(
    "application/vnd.corel-draw",
    (b) => (at(b, 0, "RIFF") && (at(b, 8, "CDR") || at(b, 8, "cdr"))) || zipOf((n) => n.some((x) => x.startsWith("content/") || x === "mimetype"))(b),
    (b) => (isZip(b) ? zipEntries(b) : null),
  ),
  sketch: graphic("application/x-sketch", zipOf((n) => n.some((x) => x === "document.json" || x === "meta.json" || x.startsWith("pages/") || x.startsWith("previews/"))), zipEntries),

  // 3D models and scenes
  glb: model("model/gltf-binary", (b) => at(b, 0, "glTF")),
  gltf: model("model/gltf+json", textModel((t) => t.startsWith("{") && /"asset"\s*:/.test(t)), markupInText),
  obj: model("model/obj", textModel(() => true), markupInText),
  mtl: model("model/mtl", textModel(() => true), markupInText),
  fbx: model("application/octet-stream", (b) => at(b, 0, "Kaydara FBX Binary") || textModel((t) => t.startsWith(";") && /FBX/.test(t))(b), (b) => (isText(b) ? markupInText(b) : null)),
  stl: model(
    "model/stl",
    (b, size) => (b.length >= 84 && 84 + 50 * u32(b, 80) === size) || textModel((t) => /^solid\b/i.test(t))(b),
    (b, size) => (b.length >= 84 && 84 + 50 * u32(b, 80) === size ? null : markupInText(b)),
  ),
  ply: model("application/x-ply", (b) => at(b, 0, "ply\n") || at(b, 0, "ply\r\n"), (b) => markupInText(b.subarray(0, 4096))),
  "3mf": model("model/3mf", zipOf((n) => n.some((x) => x === "[Content_Types].xml" || x === "_rels/.rels" || x.startsWith("3D/"))), zipEntries),
  usdz: model("model/vnd.usdz+zip", zipOf((n) => /\.usd[ac]?$/i.test(n[0] || "")), zipEntries),
  usd: model("model/vnd.usd", (b) => at(b, 0, "PXR-USDC") || at(b, 0, "#usda ")),
  usdc: model("model/vnd.usd", (b) => at(b, 0, "PXR-USDC")),
  usda: model("model/vnd.usd", (b) => at(b, 0, "#usda "), markupInText),
  dae: model("model/vnd.collada+xml", textModel((t) => /<COLLADA[\s>]/i.test(t) || /^<\?xml/i.test(t)), (b) => (/<COLLADA[\s>]/i.test(latin1(b)) ? xmlProblem(latin1(b)) : "it isn't a real COLLADA file")),
  x3d: model("model/x3d+xml", textModel((t) => /<X3D[\s>]/i.test(t) || /^<\?xml/i.test(t)), (b) => (/<X3D[\s>]/i.test(latin1(b)) ? xmlProblem(latin1(b)) : "it isn't a real X3D file")),
  blend: model("application/x-blender", (b) => at(b, 0, "BLENDER") || gzip(b) || zstd(b)),
  "3ds": model("application/x-3ds", (b, size) => at(b, 0, [0x4d, 0x4d]) && u32(b, 2) <= size && u32(b, 2) > 6),
  abc: model("application/x-alembic", (b) => at(b, 0, "Ogawa") || at(b, 0, [0x89, 0x48, 0x44, 0x46, 0x0d, 0x0a, 0x1a, 0x0a])),
  ma: model("application/x-maya", (b) => at(b, 0, "//Maya ASCII"), markupInText),
  mb: model("application/x-maya", (b) => at(b, 0, "FOR4") || at(b, 0, "FOR8")),
  drc: model("application/x-draco", (b) => at(b, 0, "DRACO")),
  vox: model("application/x-vox", (b) => at(b, 0, "VOX ")),
}

/** Formats the browser shows itself are viewed in place; the rest only download (never rendered from R2). */
const SHOWN_IN_BROWSER = /^(?:image\/(?:jpeg|png|apng|gif|webp|avif|bmp|x-icon|svg\+xml)|video\/(?:mp4|webm|quicktime|x-m4v|ogg)|audio\/(?:mpeg|wav|flac|aac|mp4|ogg|webm|aiff))$/

/** "IMG_0412.JPG" → { ext: "jpg", kind: "photo", contentType: "image/jpeg" }, or null when it isn't allowed. */
function formatOf(name) {
  const ext = /\.([a-z0-9]+)$/i.exec(String(name))?.[1]?.toLowerCase()
  const f = ext && Object.hasOwn(FORMATS, ext) ? FORMATS[ext] : null
  return f ? { ext, kind: f.kind, contentType: f.contentType } : null
}

/** How many bytes of a file to read to check it: all of an SVG, the first 64 KB of anything else. */
const bytesToCheck = (ext, size) => (ext === "svg" ? size : Math.min(size, HEAD_BYTES))

/**
 * Checks a file's bytes against its extension. `head`: the first bytes (bytesToCheck), `size`: the
 * whole file's size. → null when it is a real file of its kind, or the reason it is refused.
 */
function inspect(ext, head, size) {
  const f = Object.hasOwn(FORMATS, ext) ? FORMATS[ext] : null
  if (!f) return "files of this type can't be uploaded"
  const b = head instanceof Uint8Array ? head : new Uint8Array(head)
  if (!b.length || !size) return "it is empty"
  if (ext === "svg" && size > MAX_SVG_BYTES) return "an SVG can be at most 20 MB"
  if (!f.test(b, size)) {
    const real = dangerOf(b)
    return real ? `it is ${real}, renamed to .${ext}` : `its contents aren't a real .${ext} file`
  }
  const problem = f.check?.(b, size)
  if (problem) return problem
  // a web shell or script tucked into the bytes of a binary file (a photo's comment, say)
  if (!isText(b) && HIDDEN_CODE.test(latin1(b))) return "it has code hidden inside it"
  return null
}

/** What the panel says it takes, by kind. */
const KINDS_TEXT = "photos (JPEG, PNG, HEIC, TIFF, RAW…), videos, audio, graphics (SVG, PSD, AI, EPS…) and 3D models (GLB, glTF, OBJ, FBX, STL…)"

export { FORMATS, MAX_BYTES, MAX_SVG_BYTES, HEAD_BYTES, SHOWN_IN_BROWSER, KINDS_TEXT, formatOf, bytesToCheck, inspect, dangerOf };
