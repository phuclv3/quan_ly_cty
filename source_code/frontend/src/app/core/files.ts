/**
 * Lưu tệp hồ sơ (NT-12).
 *
 * Nội dung tệp lưu ở kho tệp của backend (POST /api/tep, thư mục app.storage.dir); siêu dữ liệu (FileRef)
 * nằm trong dữ liệu chung. Ảnh được nén / tạo thumbnail ngay trên trình duyệt trước khi tải lên.
 */
import { FileRef } from './models';
import { api, apiBlob } from './api';

export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const HO_SO_ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.heic';

/** Tải nội dung tệp từ máy chủ (chỉ khi người dùng được xem bản ghi chứa tệp). */
export const getBlob = (id: string) => apiBlob(`/tep/${encodeURIComponent(id)}`);
/** Nội dung tệp do máy chủ xoá khi yêu cầu xoá được duyệt — phía trình duyệt không cần làm gì. */
export const deleteBlob = async (_id: string) => undefined;

/** Ảnh: nén cạnh dài ≤ 2000px (JPEG 0,82) và tạo thumbnail 160px. PDF giữ nguyên. */
export async function luuTep(file: File, _nguoi: string): Promise<FileRef> {
  if (file.size > MAX_FILE_BYTES) throw new Error(`Tệp "${file.name}" lớn hơn 20MB`);
  let blob: Blob = file;
  let thumb: string | undefined;
  let name = file.name;
  if (file.type.startsWith('image/')) {
    try {
      const img = await loadImage(file);
      if (file.size > 1024 * 1024 || Math.max(img.width, img.height) > 2000) {
        blob = await drawTo(img, 2000, 'image/jpeg', 0.82);
        name = name.replace(/\.[^.]+$/, '') + '.jpg';
      }
      thumb = await blobToDataUrl(await drawTo(img, 160, 'image/jpeg', 0.7));
    } catch {
      // Trình duyệt không giải mã được (VD HEIC trên Chrome): lưu nguyên tệp, không có thumbnail.
    }
  }
  const form = new FormData();
  form.append('file', blob, name);
  if (thumb) form.append('thumb', thumb);
  return api<FileRef>('POST', '/tep', undefined, { form });
}

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
}

function drawTo(img: HTMLImageElement, max: number, type: string, q: number): Promise<Blob> {
  const k = Math.min(1, max / Math.max(img.width, img.height));
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * k);
  c.height = Math.round(img.height * k);
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), type, q));
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(b);
  });
}

export async function moTep(f: FileRef): Promise<void> {
  const b = await getBlob(f.id);
  const url = URL.createObjectURL(b);
  window.open(url, '_blank', 'noopener');
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export function viSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} MB`;
}
