import type { Page } from '../pages/types';
import type { Doc } from '../storage/db';
import { pageSVG } from './render';

/** Render the page to a high-resolution PNG file (3600 px — safe for iPad canvas limits). */
export async function renderPNG(page: Page, doc: Doc, size = 3600): Promise<File> {
  const svg = pageSVG(page, doc, size);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const img = new Image();
    img.src = url;
    await img.decode();
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = Math.round((size * page.h) / page.w);
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob: Blob = await new Promise((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('export failed'))), 'image/png'));
    // free the big canvas quickly on iPad
    canvas.width = canvas.height = 1;
    const name = page.title.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'coloring';
    return new File([blob], `${name}.png`, { type: 'image/png' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Must be called straight from a tap so iPadOS allows the share sheet. */
export async function shareFile(file: File) {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: file.name });
      return true;
    } catch (e) {
      if ((e as Error).name === 'AbortError') return true;
    }
  }
  downloadFile(file);
  return false;
}

export function downloadFile(file: File) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(a.href);
    a.remove();
  }, 2000);
}
