/*
  The small preview (a JPEG) made of an image in this browser before it goes up: uploads send it to R2
  beside the file (lib/r2.js), so the panel shows the file without downloading it back.
*/

/* A 480px JPEG of an image file, and the photo's own width and height. Null when the browser cannot read it (HEIC, RAW). */
export async function makeThumb(file, size = 480) {
  try {
    let src;
    let w;
    let h;
    let done = () => {};
    // an SVG drawing only decodes through an <img> (where its scripts never run)
    const bitmap = 'createImageBitmap' in window && file.type !== 'image/svg+xml' && !/\.svg$/i.test(file.name || '') ? await createImageBitmap(file).catch(() => null) : null;
    if (bitmap) {
      src = bitmap;
      w = src.width;
      h = src.height;
      done = () => src.close?.();
    } else {
      const url = URL.createObjectURL(file);
      src = await new Promise((res, rej) => {
        const img = new Image();
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = url;
      });
      w = src.naturalWidth || 1200; // an SVG without a size draws at any size
      h = src.naturalHeight || 900;
      done = () => URL.revokeObjectURL(url);
    }
    const k = Math.min(1, size / Math.max(w, h));
    const c = document.createElement('canvas');
    c.width = Math.round(w * k);
    c.height = Math.round(h * k);
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    done();
    const blob = await new Promise((res) => c.toBlob(res, 'image/jpeg', 0.74));
    return blob ? { blob, w, h } : null;
  } catch {
    return null;
  }
}
