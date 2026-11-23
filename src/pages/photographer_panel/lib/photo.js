/*
  Profile photos, on this side: any picture the browser can open becomes a square of at most 512
  pixels (a WebP, or a JPEG where the browser can't make WebP), so what is sent is small and the
  server only has to check it. The square is taken from the middle, a little above centre for
  portraits, where faces usually are.
*/
const SIDE = 512;
const MIN = 64;
const MAX_INPUT = 25 * 1024 * 1024; // the file chosen, before shrinking

const toBlob = (canvas, type, quality) => new Promise((resolve) => canvas.toBlob(resolve, type, quality));

/** File → Blob (image/webp or image/jpeg); throws an Error with a message for people. */
export async function squarePhoto(file) {
  if (!file || !/^image\//.test(file.type || 'image/')) throw new Error("That file isn't a picture. Choose a JPEG, PNG or WebP.");
  if (file.size > MAX_INPUT) throw new Error('That picture is too big. Choose one under 25 MB.');
  let bmp;
  try {
    bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    throw new Error("This browser can't open that picture. Choose a JPEG, PNG or WebP.");
  }
  const s = Math.min(bmp.width, bmp.height);
  if (s < MIN) {
    bmp.close?.();
    throw new Error(`That picture is too small. Choose one at least ${MIN} pixels a side.`);
  }
  const out = Math.min(SIDE, s);
  const canvas = document.createElement('canvas');
  canvas.width = out;
  canvas.height = out;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  const x = (bmp.width - s) / 2;
  const y = (bmp.height - s) * (bmp.height > bmp.width ? 0.3 : 0.5);
  ctx.drawImage(bmp, x, y, s, s, 0, 0, out, out);
  bmp.close?.();
  const webp = await toBlob(canvas, 'image/webp', 0.86);
  if (webp?.type === 'image/webp') return webp;
  const jpeg = await toBlob(canvas, 'image/jpeg', 0.88);
  if (!jpeg) throw new Error("This browser couldn't prepare the picture. Try another one.");
  return jpeg;
}
