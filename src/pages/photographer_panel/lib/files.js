/*
  Gathering what the photographer picked or dropped: single files, many files, or whole folders
  (with their subfolders). Each comes back as { file, path }, path being where it sat inside the
  folder that was chosen ("Anna & Leo/Ceremony/DSC_0412.jpg"), or just the file name.
*/
import { FORMATS, MAX_BYTES as LIMITS, MAX_SVG_BYTES, bytesToCheck, formatOf, inspect, KINDS_TEXT as KINDS } from './filecheck.js';

// The same list the API takes (backend/src/utils/filecheck.js): photos, videos, audio, graphics, 3D.
export const ACCEPT = Object.keys(FORMATS)
  .map((ext) => `.${ext}`)
  .join(',');
export const KINDS_TEXT = KINDS;
/** 'photo', 'video', 'audio', 'graphic', 'model', or null for anything that may not go up. */
export const kindOf = (file) => formatOf(file.name)?.kind ?? null;
export const isPhoto = (file) => kindOf(file) !== null;
// the most one file can be (a large one goes up in parts, lib/parts.js)
export const MAX_BYTES = LIMITS;
export const LIMITS_TEXT = 'photos up to 200 MB, audio and graphics up to 20 GB (SVG 20 MB), 3D models up to 100 GB, videos up to 200 GB';
const tooBigFor = (file, kind) => file.size === 0 || file.size > MAX_BYTES[kind] || (/\.svg$/i.test(file.name) && file.size > MAX_SVG_BYTES);
const hidden = (name) => name.startsWith('.') || name === 'Thumbs.db' || name === 'desktop.ini';

/* from an <input type="file"> (with or without webkitdirectory) */
export function fromInput(fileList) {
  return [...fileList].map((file) => ({ file, path: file.webkitRelativePath || file.name }));
}

/* from a drop: folders are walked all the way down */
export async function fromDrop(dataTransfer) {
  const entries = [...(dataTransfer.items || [])]
    .filter((i) => i.kind === 'file')
    .map((i) => (i.webkitGetAsEntry ? i.webkitGetAsEntry() : null));
  if (!entries.length || entries.some((e) => !e)) return fromInput(dataTransfer.files || []);
  const out = [];
  await Promise.all(entries.map((e) => walk(e, '', out)));
  return out;
}

async function walk(entry, prefix, out) {
  if (hidden(entry.name)) return;
  const path = prefix ? `${prefix}/${entry.name}` : entry.name;
  if (entry.isFile) {
    const file = await new Promise((res, rej) => entry.file(res, rej)).catch(() => null);
    if (file) out.push({ file, path });
    return;
  }
  if (!entry.isDirectory) return;
  const reader = entry.createReader();
  // readEntries hands them over in pages of about 100: keep asking until it returns none
  for (;;) {
    const page = await new Promise((res) => reader.readEntries(res, () => res([])));
    if (!page.length) break;
    await Promise.all(page.map((e) => walk(e, path, out)));
  }
}

/*
  Checks one file's bytes before it goes (lib/filecheck.js): the first 64 KB (all of an SVG) must be
  the format its name says, with nothing in it that could run. → null, or the reason it is blocked.
*/
export async function checkFile(file) {
  const format = formatOf(file.name);
  if (!format) return "files of this type can't be uploaded";
  try {
    const head = new Uint8Array(await file.slice(0, bytesToCheck(format.ext, file.size)).arrayBuffer());
    return inspect(format.ext, head, file.size);
  } catch {
    return 'it could not be read';
  }
}

/* checks many files, a few at a time; onProgress(done, total) */
async function checkAll(files, onProgress) {
  const out = new Array(files.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < files.length) {
      const i = next++;
      out[i] = await checkFile(files[i]);
      onProgress?.(++done, files.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(8, files.length) }, worker));
  return out;
}

/*
  Sorts what was gathered into groups by folder, ready to become categories:
    "Anna & Leo/Ceremony/a.jpg"  → group "Ceremony"
    "Anna & Leo/b.jpg"           → group "Anna & Leo" (photos loose in the chosen folder)
    "c.jpg"                      → the loose group (null), which goes where the photographer says
  A deeper path takes its first subfolder: "Anna & Leo/Ceremony/Edited/d.jpg" → "Ceremony".
  Every file that may go up is checked first (checkFile). Returns { groups: [{ folder, files }],
  skipped: [names of types that never go up], tooBig: [names over the size limit],
  blocked: [{ name, reason }: files whose contents aren't what their name says] }.
*/
export async function group(list, onProgress) {
  const map = new Map();
  const skipped = [];
  const tooBig = [];
  const blocked = [];
  const candidates = [];
  for (const { file, path } of list) {
    const parts = path.split('/').filter(Boolean);
    const name = parts[parts.length - 1] || file.name;
    if (hidden(name)) continue;
    const kind = kindOf(file);
    if (!kind) {
      skipped.push(name);
      continue;
    }
    if (tooBigFor(file, kind)) {
      tooBig.push(name);
      continue;
    }
    candidates.push({ file, parts, name });
  }
  const problems = await checkAll(
    candidates.map((c) => c.file),
    onProgress
  );
  candidates.forEach(({ file, parts, name }, i) => {
    if (problems[i]) {
      blocked.push({ name, reason: problems[i] });
      return;
    }
    const folder = parts.length >= 3 ? parts[1] : parts.length === 2 ? parts[0] : null;
    if (!map.has(folder)) map.set(folder, []);
    map.get(folder).push(file);
  });
  const groups = [...map.entries()]
    .map(([folder, files]) => ({ folder, files, size: files.reduce((a, f) => a + f.size, 0) }))
    .sort((a, b) => (a.folder === null ? -1 : b.folder === null ? 1 : a.folder.localeCompare(b.folder, undefined, { numeric: true })));
  return { groups, skipped, tooBig, blocked };
}
