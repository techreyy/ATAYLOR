/** Batas ukuran upload (sama dengan aturan `max:` di FormRequest backend). */
export const UPLOAD_LIMITS_MB = { paymentProof: 5, qcPhoto: 8, mockup: 8 } as const;

/**
 * Perkecil foto (mis. dari kamera HP) sebelum diunggah: sisi terpanjang maks `maxSide` px, JPEG.
 * PDF, GIF, dan file yang sudah kecil dikirim apa adanya. Bila browser gagal memproses gambar,
 * file asli yang dikirim (validasi ukuran tetap dilakukan server).
 */
export async function compressImage(file: File, maxSide = 1920, quality = 0.85): Promise<File> {
  if (!file.type.startsWith("image/") || file.type === "image/gif" || file.size <= 500 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.fillStyle = "#fff"; // PNG transparan → latar putih saat jadi JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

/** Pesan galat bila file melebihi batas, atau null bila aman. */
export function fileTooLarge(file: File, limitMb: number, label: string): string | null {
  if (file.size <= limitMb * 1024 * 1024) return null;
  const sizeMb = (file.size / 1024 / 1024).toFixed(1);
  return `${label} terlalu besar (${sizeMb} MB). Maksimal ${limitMb} MB — gunakan file yang lebih kecil.`;
}

/** Siapkan file untuk upload: kompres foto (opsional) lalu cek batas ukuran. Melempar Error bila terlalu besar. */
export async function prepareUpload(file: File, limitMb: number, label: string, compress = true): Promise<File> {
  const ready = compress ? await compressImage(file) : file;
  const tooLarge = fileTooLarge(ready, limitMb, label);
  if (tooLarge) throw new Error(tooLarge);
  return ready;
}
