/**
 * Ô ngày dd/mm/yyyy cho toàn hệ thống.
 *
 * `<input type="date">` gốc hiện theo ngôn ngữ trình duyệt (máy tiếng Anh ra mm/dd/yyyy). Mọi ô date trên trang
 * được đổi tại chỗ thành ô chữ dd/mm/yyyy (gõ tay được) + nút lịch mở bảng chọn ngày tiếng Việt tự dựng
 * (không dùng bảng gốc của trình duyệt vì ngôn ngữ của nó theo máy, không theo trang).
 * Thuộc tính `value` của ô vẫn đọc / ghi theo ISO yyyy-mm-dd như cũ, nên các template
 * `[value]="iso"` / `(input)="…$event.target.value"` không phải sửa. Gõ chưa đủ ngày thì value = ''.
 */
const goc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!;
const DA_DOI = new WeakSet<HTMLInputElement>();

/** 'dd/mm/yyyy' | 'd/m/yyyy' | 'ddmmyyyy' → ISO; sai / chưa đủ → ''. */
export function docNgayVi(s: string): string {
  const t = s.trim();
  const m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/) ?? t.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (!m) return '';
  const [d, mo, y] = [+m[1], +m[2], +m[3]];
  const dt = new Date(y, mo - 1, d);
  if (dt.getFullYear() !== y || dt.getMonth() !== mo - 1 || dt.getDate() !== d) return '';
  return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

/** ISO → dd/mm/yyyy (chuỗi khác giữ nguyên). */
export function ghiNgayVi(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
}


// ── Lịch chọn ngày tiếng Việt ────────────────────────────────────────────
const THU = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const isoNgay = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
let bang: { dong: () => void } | null = null;

/** Mở bảng lịch cho ô `el`; `chon(iso)` được gọi khi chọn ngày (iso = '' khi bấm Xoá). */
function moBang(el: HTMLInputElement, hienTai: string, chon: (iso: string) => void): void {
  bang?.dong();
  const t = new Date();
  const hn = isoNgay(t.getFullYear(), t.getMonth(), t.getDate());
  const goc0 = hienTai || hn;
  let nam = +goc0.slice(0, 4);
  let thang = +goc0.slice(5, 7) - 1;
  const min = el.min;
  const max = el.max;

  const pop = document.createElement('div');
  pop.className = 'ngay-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', 'Chọn ngày');
  const ve = () => {
    const dau = (new Date(nam, thang, 1).getDay() + 6) % 7; // thứ Hai = 0
    const soNgay = new Date(nam, thang + 1, 0).getDate();
    let o = `<div class="np-head">
      <button type="button" data-a="nam-" aria-label="Năm trước">«</button>
      <button type="button" data-a="thang-" aria-label="Tháng trước">‹</button>
      <b>Tháng ${thang + 1}, ${nam}</b>
      <button type="button" data-a="thang+" aria-label="Tháng sau">›</button>
      <button type="button" data-a="nam+" aria-label="Năm sau">»</button></div>
      <div class="np-grid">${THU.map((x) => `<i>${x}</i>`).join('')}`;
    for (let i = 0; i < dau; i++) o += '<span></span>';
    for (let d = 1; d <= soNgay; d++) {
      const v = isoNgay(nam, thang, d);
      const kho = (min && v < min) || (max && v > max);
      o += `<button type="button" data-d="${v}"${kho ? ' disabled' : ''} class="${v === hienTai ? 'on' : ''} ${v === hn ? 'nay' : ''}">${d}</button>`;
    }
    o += `</div><div class="np-foot"><button type="button" data-a="homnay">Hôm nay</button><button type="button" data-a="xoa">Xoá</button></div>`;
    pop.innerHTML = o;
  };
  const dat = () => {
    const r = el.getBoundingClientRect();
    const h = pop.offsetHeight;
    const w = pop.offsetWidth;
    const traXuong = innerHeight - r.bottom >= h + 8 || r.top < h + 8;
    pop.style.top = `${traXuong ? Math.min(r.bottom + 4, Math.max(8, innerHeight - h - 8)) : r.top - h - 4}px`;
    pop.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`;
  };
  const ngoai = (e: Event) => {
    if (!pop.contains(e.target as Node) && e.target !== el) dong();
  };
  const phim = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      dong();
      el.focus();
    }
  };
  function dong(): void {
    pop.remove();
    document.removeEventListener('mousedown', ngoai, true);
    document.removeEventListener('keydown', phim, true);
    removeEventListener('resize', dong);
    bang = null;
  }
  const xong = (v: string) => {
    chon(v);
    dong();
    el.focus();
  };
  pop.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest('button');
    if (!b || b.disabled) return;
    const a = b.dataset['a'];
    if (b.dataset['d']) return xong(b.dataset['d']);
    if (a === 'homnay') {
      if ((min && hn < min) || (max && hn > max)) return;
      return xong(hn);
    }
    if (a === 'xoa') return xong('');
    if (a === 'nam-') nam--;
    else if (a === 'nam+') nam++;
    else if (a === 'thang-') [nam, thang] = thang === 0 ? [nam - 1, 11] : [nam, thang - 1];
    else if (a === 'thang+') [nam, thang] = thang === 11 ? [nam + 1, 0] : [nam, thang + 1];
    ve();
  });
  ve();
  // Gắn vào <dialog> đang mở (nếu có) để nằm trên lớp modal; không thì gắn vào body.
  (el.closest('dialog') ?? document.body).appendChild(pop);
  dat();
  bang = { dong };
  document.addEventListener('mousedown', ngoai, true);
  document.addEventListener('keydown', phim, true);
  addEventListener('resize', dong);
}

function doi(el: HTMLInputElement): void {
  if (DA_DOI.has(el)) return;
  DA_DOI.add(el);
  const iso = goc.get!.call(el) as string;
  el.type = 'text';
  el.classList.add('ngay');
  el.inputMode = 'numeric';
  el.autocomplete = 'off';
  if (!el.placeholder) el.placeholder = 'dd/mm/yyyy';
  el.maxLength = 10;
  const hien = (v: string) => goc.set!.call(el, v);
  const doc = () => docNgayVi(goc.get!.call(el) as string);
  Object.defineProperty(el, 'value', {
    configurable: true,
    get: doc,
    // Đang gõ dở (value = '') mà template trả lại '' thì giữ chữ đang gõ.
    set: (v: string) => {
      if ((v ?? '') === doc()) return;
      hien(ghiNgayVi(v ?? ''));
    },
  });
  hien(ghiNgayVi(iso));

  // Gõ số tự chèn dấu "/" (dd/mm/yyyy); rời ô thì chuẩn hoá lại chữ.
  el.addEventListener(
    'input',
    (e) => {
      if ((e as InputEvent).inputType?.startsWith('delete')) return;
      const t = goc.get!.call(el) as string;
      // Chỉ tự chèn khi gõ toàn số liền (VD 23102026); đã gõ "/" tay (VD 1/2/2026) thì để nguyên.
      if (!/^[\d/]*$/.test(t) || t.endsWith('/') || [...t].some((c, i) => c === '/' && i !== 2 && i !== 5)) return;
      const so = t.replace(/\D/g, '').slice(0, 8);
      hien([so.slice(0, 2), so.slice(2, 4), so.slice(4)].filter(Boolean).join('/'));
    },
    { capture: true },
  );
  el.addEventListener('blur', () => {
    const v = doc();
    if (v) hien(ghiNgayVi(v));
  });

  // Bấm vào icon lịch (cuối ô) hoặc Alt+↓ / F4 → mở lịch tiếng Việt ngay dưới ô.
  const moLich = () => {
    if (el.disabled || el.readOnly) return;
    moBang(el, doc(), (v) => {
      hien(ghiNgayVi(v));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  };
  // Rê vào vùng icon (cuối ô) thì con trỏ thành bàn tay.
  el.addEventListener('mousemove', (e) => {
    el.style.cursor = !el.disabled && !el.readOnly && e.offsetX >= el.clientWidth - 40 ? 'pointer' : '';
  });
  el.addEventListener('mousedown', (e) => {
    if (e.offsetX >= el.clientWidth - 40) {
      e.preventDefault();
      moLich();
    }
  });
  el.addEventListener('keydown', (e) => {
    if ((e.altKey && e.key === 'ArrowDown') || e.key === 'F4') {
      e.preventDefault();
      moLich();
    }
  });
}

function quet(root: ParentNode | Node): void {
  if (root instanceof HTMLInputElement) {
    if (root.type === 'date') doi(root);
    return;
  }
  if (!(root instanceof Element || root instanceof Document)) return;
  root.querySelectorAll<HTMLInputElement>('input[type="date"]').forEach(doi);
}

/** Bật cho toàn trang; trả hàm tắt. */
export function batNgayVi(): () => void {
  quet(document);
  const mo = new MutationObserver((ds) => {
    for (const d of ds) d.addedNodes.forEach((n) => quet(n));
  });
  mo.observe(document.body, { childList: true, subtree: true });
  return () => mo.disconnect();
}
