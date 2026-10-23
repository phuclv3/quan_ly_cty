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

// ── Tải tất cả hồ sơ dạng .zip (không nén, phương thức STORE) ─────────

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(b: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/** Đóng gói zip không nén (STORE) — dùng cho Tải tất cả hồ sơ và file .xlsx (shared/excel.ts). */
export function taoZip(entries: { path: string; data: Uint8Array }[], type = 'application/zip'): Blob {
  const enc = new TextEncoder();
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  for (const e of entries) {
    const data = e.data;
    const name = enc.encode(e.path);
    const crc = crc32(data);
    const local = new DataView(new ArrayBuffer(30));
    local.setUint32(0, 0x04034b50, true);
    local.setUint16(4, 20, true);
    local.setUint16(6, 0x0800, true); // UTF-8 tên tệp
    local.setUint32(14, crc, true);
    local.setUint32(18, data.length, true);
    local.setUint32(22, data.length, true);
    local.setUint16(26, name.length, true);
    parts.push(new Uint8Array(local.buffer), name, data);
    const cen = new DataView(new ArrayBuffer(46));
    cen.setUint32(0, 0x02014b50, true);
    cen.setUint16(4, 20, true);
    cen.setUint16(6, 20, true);
    cen.setUint16(8, 0x0800, true);
    cen.setUint32(16, crc, true);
    cen.setUint32(20, data.length, true);
    cen.setUint32(24, data.length, true);
    cen.setUint16(28, name.length, true);
    cen.setUint32(42, offset, true);
    central.push(new Uint8Array(cen.buffer), name);
    offset += 30 + name.length + data.length;
  }
  const cenSize = central.reduce((s, x) => s + x.length, 0);
  const end = new DataView(new ArrayBuffer(22));
  end.setUint32(0, 0x06054b50, true);
  end.setUint16(8, entries.length, true);
  end.setUint16(10, entries.length, true);
  end.setUint32(12, cenSize, true);
  end.setUint32(16, offset, true);
  return new Blob([...parts, ...central, new Uint8Array(end.buffer)] as BlobPart[], { type });
}

/** Tải một Blob xuống máy với tên tệp cho trước. */
export function taiBlob(ten: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = ten;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

export async function taiZip(tenZip: string, entries: { path: string; file: FileRef }[]): Promise<number> {
  const ds: { path: string; data: Uint8Array }[] = [];
  for (const e of entries) {
    const blob = await getBlob(e.file.id).catch(() => undefined);
    if (blob) ds.push({ path: e.path, data: new Uint8Array(await blob.arrayBuffer()) });
  }
  taiBlob(tenZip, taoZip(ds));
  return ds.length;
}
