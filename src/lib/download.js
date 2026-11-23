/*
  Downloading photographs from the gallery: one photo saves as its own file, several are packed into a
  single .zip in the browser first. The zip is "stored" (no compression): JPEGs are compressed already,
  so packing is quick and the photos come out byte for byte as they went in.
  Every download reports its progress and can be stopped with an AbortSignal.
*/

/* ---- CRC-32, which every file in a zip carries ---- */
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* the date and time as a zip stores them (MS-DOS format) */
function dosStamp(d = new Date()) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
  const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
  return { time, date };
}

/* Packs [{ name, bytes }] into a zip Blob. The file bytes are not copied: the Blob points at them. */
export function makeZip(files) {
  const enc = new TextEncoder();
  const { time, date } = dosStamp();
  const parts = [];
  const central = [];
  let offset = 0;

  for (const f of files) {
    const name = enc.encode(f.name);
    const crc = crc32(f.bytes);
    const size = f.bytes.length;

    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true); // local file header
    local.setUint16(4, 20, true); // version needed
    local.setUint16(6, 0x0800, true); // names in UTF-8
    local.setUint16(8, 0, true); // stored
    local.setUint16(10, time, true);
    local.setUint16(12, date, true);
    local.setUint32(14, crc, true);
    local.setUint32(18, size, true);
    local.setUint32(22, size, true);
    local.setUint16(26, name.length, true);
    local.setUint16(28, 0, true);
    parts.push(local, name, f.bytes);

    const dir = new DataView(new ArrayBuffer(46));
    dir.setUint32(0, 0x02014b50, true); // central directory entry
    dir.setUint16(4, 20, true);
    dir.setUint16(6, 20, true);
    dir.setUint16(8, 0x0800, true);
    dir.setUint16(10, 0, true);
    dir.setUint16(12, time, true);
    dir.setUint16(14, date, true);
    dir.setUint32(16, crc, true);
    dir.setUint32(20, size, true);
    dir.setUint32(24, size, true);
    dir.setUint16(28, name.length, true);
    // extra, comment, disk, attributes: all zero
    dir.setUint32(42, offset, true);
    central.push(dir, name);

    offset += 30 + name.length + size;
  }

  const dirSize = central.reduce((n, p) => n + p.byteLength, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true); // end of central directory
  end.setUint16(8, files.length, true);
  end.setUint16(10, files.length, true);
  end.setUint32(12, dirSize, true);
  end.setUint32(16, offset, true);

  return new Blob([...parts, ...central, end], { type: 'application/zip' });
}

/* One photo's bytes, counting them as they arrive so the progress can move inside a file too. */
async function fetchBytes(url, signal, onBytes) {
  const res = await fetch(url, { signal, mode: 'cors', credentials: 'omit' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!res.body) {
    const buf = new Uint8Array(await res.arrayBuffer());
    onBytes(buf.length);
    return buf;
  }
  const reader = res.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
    onBytes(value.length);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.length;
  }
  return out;
}

/* Hands a Blob to the browser as a file to save. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.append(a);
  a.click();
  a.remove();
  // long enough for the browser to start the save
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/*
  Downloads [{ url, name }]: one file saves as it is, two or more as `zipName`.
  onProgress({ done, total, bytes }) after every chunk. Three photos are fetched at a time.
  Resolves with { filename, bytes }; rejects with an AbortError when stopped.
*/
export async function downloadPhotos(list, { zipName, signal, onProgress = () => {} }) {
  let bytes = 0;
  let done = 0;
  const total = list.length;
  const tick = (n) => {
    bytes += n;
    onProgress({ done, total, bytes });
  };
  onProgress({ done, total, bytes });

  const results = new Array(total);
  let next = 0;
  async function worker() {
    while (next < total) {
      const i = next++;
      results[i] = await fetchBytes(list[i].url, signal, tick);
      done += 1;
      onProgress({ done, total, bytes });
    }
  }
  await Promise.all(Array.from({ length: Math.min(3, total) }, worker));
  signal?.throwIfAborted?.();

  if (total === 1) {
    const filename = list[0].name;
    saveBlob(new Blob([results[0]], { type: 'image/jpeg' }), filename);
    return { filename, bytes };
  }
  const zip = makeZip(list.map((f, i) => ({ name: f.name, bytes: results[i] })));
  saveBlob(zip, zipName);
  return { filename: zipName, bytes };
}

/* 12 400 000 → "12.4 MB" */
export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  // one decimal under ten of a unit ("4.2 GB"), none above ("512 MB"); a ".0" is dropped ("10 GB")
  const unit = (size, name) => `${Number((n / size).toFixed(n < 10 * size ? 1 : 0))} ${name}`;
  if (n < 1024 ** 3) return unit(1024 ** 2, 'MB');
  if (n < 1024 ** 4) return unit(1024 ** 3, 'GB');
  return unit(1024 ** 4, 'TB');
}
