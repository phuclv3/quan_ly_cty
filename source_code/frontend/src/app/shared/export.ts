/**
 * Kết xuất tệp ngay trên trình duyệt.
 *
 * Bản mẫu không có máy chủ, nhưng "xuất báo cáo" mà chỉ hiện thông báo thì
 * không kiểm chứng được nội dung. Các hàm dưới đây tạo tệp thật để chi ủy mở
 * bằng Excel / Word và đối chiếu.
 */

/** Tải một tệp do trình duyệt tự tạo. */
export function downloadFile(name: string, mime: string, content: string): void {
  // BOM UTF-8: thiếu nó thì Excel mở CSV tiếng Việt ra ký tự lỗi.
  const blob = new Blob(['\ufeff', content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Ghép bảng thành CSV. Dùng dấu chấm phẩy vì Excel bản tiếng Việt đọc dấu phẩy
 * là dấu thập phân, dùng dấu phẩy sẽ dồn hết một dòng vào một ô.
 */
export function csv(rows: (string | number | null)[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const text = cell === null ? '' : String(cell);
          return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(';'),
    )
    .join('\r\n');
}

/** 'bao-cao-thang' -> 'bao-cao-thang-2026-08-26.csv' */
export function fileName(prefix: string, ext: string, when = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const stamp = `${when.getFullYear()}-${p(when.getMonth() + 1)}-${p(when.getDate())}`;
  return `${prefix}-${stamp}.${ext}`;
}

/** Tải một tệp có sẵn (vd. tài liệu chi ủy đã tải lên, lấy từ IndexedDB). */
export function downloadBlob(name: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
