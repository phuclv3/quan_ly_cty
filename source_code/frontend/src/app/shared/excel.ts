/**
 * Đọc bảng tính không cần thư viện ngoài (file tạo ra do backend — shared/export.ts):
 *  - docBang(): đọc file người dùng tải lên thành mảng dòng × cột (chuỗi): .xlsx (sheet đầu tiên),
 *    .csv (tự nhận dấu phân cách , ; Tab), .txt (Tab — như dán từ Excel).
 * Giải nén .xlsx bằng DecompressionStream('deflate-raw') có sẵn trong trình duyệt.
 */
// ── Đọc file tải lên ────────────────────────────────────────────────────

/** Giải nén zip (STORE / DEFLATE) → map đường dẫn → nội dung. */
async function moZip(buf: ArrayBuffer): Promise<Map<string, Uint8Array>> {
  const v = new DataView(buf);
  const u8 = new Uint8Array(buf);
  let eocd = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Tệp không phải .xlsx hợp lệ');
  const n = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const dec = new TextDecoder();
  const out = new Map<string, Uint8Array>();
  for (let k = 0; k < n; k++) {
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const cmtLen = v.getUint16(p + 32, true);
    const local = v.getUint32(p + 42, true);
    const name = dec.decode(u8.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + cmtLen;
    if (!/^(xl\/(workbook\.xml|sharedStrings\.xml|_rels\/workbook\.xml\.rels|worksheets\/[^/]+\.xml))$/.test(name)) continue;
    const start = local + 30 + v.getUint16(local + 26, true) + v.getUint16(local + 28, true);
    const raw = u8.subarray(start, start + size);
    if (method === 0) out.set(name, raw);
    else if (method === 8) {
      const ds = new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      out.set(name, new Uint8Array(await new Response(ds).arrayBuffer()));
    }
  }
  return out;
}

/** Chỉ số cột từ tham chiếu ô "AB12" → 27. */
function chiSoCot(ref: string): number {
  let n = 0;
  for (const ch of ref.replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

async function docXlsx(buf: ArrayBuffer): Promise<string[][]> {
  const zip = await moZip(buf);
  const dec = new TextDecoder();
  const doc = (p: string) => {
    const b = zip.get(p);
    return b ? new DOMParser().parseFromString(dec.decode(b), 'application/xml') : null;
  };
  // Sheet đầu tiên theo workbook.xml → rels.
  const wb = doc('xl/workbook.xml');
  const rels = doc('xl/_rels/workbook.xml.rels');
  const rid = wb?.getElementsByTagName('sheet')[0]?.getAttribute('r:id');
  const target = rid ? [...(rels?.getElementsByTagName('Relationship') ?? [])].find((r) => r.getAttribute('Id') === rid)?.getAttribute('Target') : null;
  const path = target ? (target.startsWith('/') ? target.slice(1) : 'xl/' + target) : 'xl/worksheets/sheet1.xml';
  const sh = doc(path);
  if (!sh) throw new Error('Không tìm thấy sheet dữ liệu trong tệp');
  const ss = [...(doc('xl/sharedStrings.xml')?.getElementsByTagName('si') ?? [])].map((si) =>
    [...si.getElementsByTagName('t')].map((t) => t.textContent ?? '').join(''),
  );
  const rows: string[][] = [];
  for (const r of [...sh.getElementsByTagName('row')]) {
    const ri = Number(r.getAttribute('r') ?? rows.length + 1) - 1;
    const row: string[] = [];
    let ci = 0;
    for (const c of [...r.getElementsByTagName('c')]) {
      const ref = c.getAttribute('r');
      if (ref) ci = chiSoCot(ref);
      const t = c.getAttribute('t');
      const val = c.getElementsByTagName('v')[0]?.textContent ?? '';
      row[ci] =
        t === 's' ? (ss[Number(val)] ?? '') : t === 'inlineStr' ? [...c.getElementsByTagName('t')].map((x) => x.textContent ?? '').join('') : t === 'b' ? (val === '1' ? 'TRUE' : 'FALSE') : val;
      ci++;
    }
    rows[ri] = Array.from(row, (x) => x ?? '');
  }
  return Array.from(rows, (x) => x ?? []);
}

/** Tách CSV có ngoặc kép; tự nhận dấu phân cách theo dòng đầu (Tab › ; › ,). */
function docCsv(text: string): string[][] {
  const dau = text.split(/\r?\n/, 1)[0] ?? '';
  const sep = dau.includes('\t') ? '\t' : (dau.split(';').length > dau.split(',').length ? ';' : ',');
  const out: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === sep) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      out.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  if (cell || row.length) {
    row.push(cell);
    out.push(row);
  }
  return out;
}

/** Đọc file bảng tính người dùng chọn → dòng × cột (chuỗi, đã trim). */
export async function docBang(file: File): Promise<string[][]> {
  const ten = file.name.toLowerCase();
  let rows: string[][];
  if (ten.endsWith('.xlsx')) rows = await docXlsx(await file.arrayBuffer());
  else if (ten.endsWith('.xls')) throw new Error('Định dạng .xls cũ chưa hỗ trợ — mở bằng Excel rồi Lưu thành .xlsx');
  else rows = docCsv((await file.text()).replace(/^﻿/, ''));
  return rows.map((r) => r.map((c) => (c ?? '').trim()));
}
