/**
 * Profile photos: every upload becomes a small JPEG (at most 600px), because the profile lives in
 * browser storage (about 5MB in all) and is saved with the account.
 *
 * iPhone photos are often HEIC, which most browsers (Chrome, Firefox, Edge) can't display. Those
 * are converted to JPEG first; the converter loads only when an HEIC photo is picked.
 */

const isHeic = (file: File) => /hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);

const readAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });

const loadImage = (src: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('unreadable'));
    img.src = src;
  });

/** Thrown when a photo can't be read in this browser, so the page can say so instead of saving it. */
export class UnreadablePhotoError extends Error {}

export const prepareProfilePhoto = async (file: File, maxSize = 600): Promise<string> => {
  let blob: Blob = file;
  if (isHeic(file)) {
    try {
      const { default: heic2any } = await import('heic2any');
      const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.85 });
      blob = Array.isArray(converted) ? converted[0] : converted;
    } catch {
      // Safari can show HEIC itself; let the browser try below.
    }
  }

  let img: HTMLImageElement;
  try {
    img = await loadImage(await readAsDataUrl(blob));
  } catch {
    throw new UnreadablePhotoError('This photo format cannot be read here.');
  }

  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new UnreadablePhotoError('This photo could not be prepared.');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
};
