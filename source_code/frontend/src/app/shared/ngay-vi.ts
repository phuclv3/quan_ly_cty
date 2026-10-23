/**
 * Ô ngày dd/mm/yyyy cho toàn hệ thống.
 *
 * `<input type="date">` gốc hiện theo ngôn ngữ trình duyệt (máy tiếng Anh ra mm/dd/yyyy). Mọi ô date trên trang
 * được đổi tại chỗ thành ô chữ dd/mm/yyyy + nút lịch (ô date ẩn để mở bảng chọn ngày của trình duyệt).
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

  // Bấm vào icon lịch (cuối ô) → mở bảng chọn ngày của trình duyệt bằng một ô date ẩn (position: fixed,
  // không chiếm chỗ trong bố cục), đặt ngay dưới ô chữ để bảng chọn hiện đúng chỗ.
  const lich = document.createElement('input');
  lich.type = 'date';
  lich.className = 'ngay-lich';
  lich.tabIndex = -1;
  lich.setAttribute('aria-hidden', 'true');
  lich.addEventListener('change', () => {
    hien(ghiNgayVi(goc.get!.call(lich) as string));
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
  const moLich = () => {
    if (el.disabled || el.readOnly) return;
    const r = el.getBoundingClientRect();
    lich.style.left = `${r.left}px`;
    lich.style.top = `${r.bottom}px`;
    lich.min = el.min;
    lich.max = el.max;
    goc.set!.call(lich, doc());
    try {
      lich.showPicker();
    } catch {
      lich.focus();
    }
  };
  el.addEventListener('mousedown', (e) => {
    if (e.offsetX >= el.clientWidth - 34) {
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
  el.after(lich);
  // Ô bị gỡ khỏi trang (Angular @if / @for) thì gỡ luôn nút lịch.
  const goBo = new MutationObserver(() => {
    if (!el.isConnected) {
      lich.remove();
      goBo.disconnect();
    }
  });
  if (el.parentNode) goBo.observe(el.parentNode, { childList: true });
}

function quet(root: ParentNode | Node): void {
  if (root instanceof HTMLInputElement) {
    if (root.type === 'date' && !root.classList.contains('ngay-lich')) doi(root);
    return;
  }
  if (!(root instanceof Element || root instanceof Document)) return;
  root.querySelectorAll<HTMLInputElement>('input[type="date"]:not(.ngay-lich)').forEach(doi);
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
