import { Directive, ElementRef, inject } from '@angular/core';

/**
 * Kiểm ô bắt buộc trước khi lưu. Ô bắt buộc = `.field` có nhãn chứa `<span class="req">*</span>`
 * (nhãn là `<label>` hoặc `<span class="lbl">` con trực tiếp của .field).
 *
 *   <div class="form-grid" appKiemTra #kt="kiemTra"> … </div>
 *   private readonly kt = viewChild('kt', { read: KiemTra });
 *   luu() { if (this.kt()?.hopLe() === false) return; … }
 *
 * Trang chi tiết: `hostDirectives: [KiemTra]` + `inject(KiemTra)`. Popup: mọi `<app-modal>` đã là một vùng —
 * `<app-modal #m …>` + `viewChild<Modal>('m')` → `this.m()?.kt.hopLe()`. Mỗi ô thuộc vùng GẦN NHẤT chứa nó
 * (form phụ / popup có vùng riêng nên nút Lưu của trang không bắt các ô đó).
 *
 * Ô trống → viền đỏ + dòng báo ngay dưới ô (`.field.thieu[data-loi]`, vẽ bằng CSS), cuộn tới ô đầu tiên.
 * Sau lần bấm Lưu đầu, nhập / chọn lại thì báo tự cập nhật. Bỏ qua ô đang khoá (disabled) và
 * `.field[data-tuy-chon]` (bắt buộc nhưng trống / 0 vẫn hợp lệ, VD thực chi 0 đ). Kiểm tra nghiệp vụ
 * khác (ngày, trùng số…) vẫn do Store trả về như cũ.
 */
@Directive({
  selector: '[appKiemTra]',
  exportAs: 'kiemTra',
  host: { 'data-kiem-tra': '', '(input)': 'sau()', '(change)': 'sau()', '(click)': 'sau()' },
})
export class KiemTra {
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private bat = false;

  /** true = đủ ô bắt buộc. */
  hopLe(): boolean {
    this.bat = true;
    const thieu = this.quet();
    const dau = thieu[0];
    if (dau) {
      dau.scrollIntoView({ block: 'center', behavior: 'smooth' });
      dau.querySelector<HTMLElement>('input:not([type="checkbox"]), select, textarea, .pick-btn')?.focus({ preventScroll: true });
    }
    return thieu.length === 0;
  }

  /** Bỏ mọi báo thiếu (VD Huỷ thay đổi, đóng popup). */
  xoa(): void {
    this.bat = false;
    for (const f of Array.from(this.el.nativeElement.querySelectorAll<HTMLElement>('.field.thieu'))) {
      f.classList.remove('thieu');
      f.removeAttribute('data-loi');
    }
  }

  protected sau(): void {
    if (this.bat) setTimeout(() => this.quet());
  }

  private quet(): HTMLElement[] {
    const out: HTMLElement[] = [];
    const host = this.el.nativeElement;
    for (const f of Array.from(host.querySelectorAll<HTMLElement>('.field'))) {
      if (f.closest('[data-kiem-tra]') !== host) continue;
      const nhan = f.querySelector<HTMLElement>(':scope > label, :scope > .lbl');
      const req = !!nhan?.querySelector('.req')?.textContent?.includes('*');
      const loai = req && !f.hasAttribute('data-tuy-chon') ? trong(f) : null;
      f.classList.toggle('thieu', !!loai);
      if (loai) {
        f.setAttribute('data-loi', `Vui lòng ${loai} ${tenNhan(nhan!)}`);
        out.push(f);
      } else f.removeAttribute('data-loi');
    }
    return out;
  }
}

/** Ô trống thì trả động từ cho câu báo ("nhập" / "chọn"); có giá trị hoặc đang khoá thì null. */
function trong(f: HTMLElement): 'nhập' | 'chọn' | null {
  const pick = f.querySelector<HTMLElement>(':scope > .pick');
  if (pick) {
    const c = pick.querySelector<HTMLInputElement | HTMLButtonElement>('input, button');
    if (c?.disabled) return null;
    return pick.hasAttribute('data-trong') ? 'chọn' : null;
  }
  const c = f.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    ':scope > input:not([type="checkbox"]):not([type="radio"]):not([type="file"]), :scope > select, :scope > textarea, :scope > app-money > input, :scope > .pw > input',
  );
  if (!c || c.disabled || c.value.trim()) return null;
  return c instanceof HTMLSelectElement || c.type === 'date' ? 'chọn' : 'nhập';
}

/** "Số HĐ bán *" → "số HĐ bán"; bỏ phần trong ngoặc, giữ hoa chữ viết tắt (MST, HĐ…). */
function tenNhan(nhan: HTMLElement): string {
  const c = nhan.cloneNode(true) as HTMLElement;
  c.querySelectorAll('.req, .hint, small').forEach((x) => x.remove());
  const t = (c.textContent ?? '').replace(/\([^)]*\)/g, '').replace(/[:*]/g, '').replace(/\s+/g, ' ').trim();
  return t.length > 1 && t[1] === t[1].toLowerCase() ? t[0].toLowerCase() + t.slice(1) : t;
}
