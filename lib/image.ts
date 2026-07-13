/**
 * Client-side photo downscale before upload (no dependency, canvas-based), so a
 * raw 12MP phone shot isn't sent at full size. GIFs pass through untouched
 * (canvas would flatten the animation); anything already under the cap is
 * returned as-is. Browser-only — import from client components.
 */
export async function downscaleImage(file: File, maxEdge = 1600): Promise<File> {
  if (file.type === "image/gif" || typeof createImageBitmap !== "function") return file;
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  if (scale >= 1) {
    bitmap.close?.();
    return file;
  }
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();
  const outType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob: Blob | null = await new Promise((resolve) => canvas.toBlob(resolve, outType, 0.85));
  if (!blob) return file;
  const name = file.name.replace(/\.[^.]+$/, outType === "image/png" ? ".png" : ".jpg");
  return new File([blob], name, { type: outType });
}
