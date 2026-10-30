import { DestroyRef, Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Bảng xếp thẻ trên điện thoại: chép chữ của từng <th> vào data-label của ô
 * <td> cùng cột, để CSS (theme.css, khối "Bảng xếp thẻ") hiện nhãn bên trái
 * mỗi dòng khi màn hình ≤ 640px. Máy tính không đổi gì.
 *
 * Dòng thêm/bớt theo dữ liệu (@for, phân trang, bật tắt cột) được theo dõi bằng
 * MutationObserver nên nhãn luôn khớp. Ô gộp nhiều cột (colspan > 1 — dòng
 * trống, dòng "Tổng") không gắn nhãn. Ô tự đặt data-label sẵn thì giữ nguyên.
 */
@Directive({ selector: 'table[appStack]' })
export class StackTable {
  constructor() {
    const table = inject<ElementRef<HTMLTableElement>>(ElementRef).nativeElement;
    let observer: MutationObserver | undefined;

    afterNextRender(() => {
      applyLabels(table);
      // Chỉ nghe thêm/bớt nút; việc gắn thuộc tính không kích lại observer.
      observer = new MutationObserver(() => applyLabels(table));
      observer.observe(table, { childList: true, subtree: true });
    });

    inject(DestroyRef).onDestroy(() => observer?.disconnect());
  }
}

/** Đánh dấu nhãn do directive gắn, để lần sau được ghi đè khi cột thay đổi. */
const AUTO = 'data-label-auto';

export function applyLabels(table: HTMLTableElement): void {
  const head = table.tHead?.rows;
  if (!head || head.length === 0) return;

  // Lấy dòng tiêu đề cuối, trải theo colspan để ra nhãn của từng cột.
  const labels: string[] = [];
  for (const th of Array.from(head[head.length - 1].cells)) {
    const text = (th.textContent ?? '').replace(/\s+/g, ' ').trim();
    for (let k = 0; k < Math.max(1, th.colSpan); k++) labels.push(text);
  }

  const rows = [
    ...Array.from(table.tBodies).flatMap((b) => Array.from(b.rows)),
    ...Array.from(table.tFoot?.rows ?? []),
  ];
  for (const row of rows) {
    let col = 0;
    for (const td of Array.from(row.cells)) {
      // Ô chỉ chứa checkbox chọn dòng → CSS đưa lên góc phải thẻ (không dựa vào :has để chắc chắn trên mọi trình duyệt).
      td.classList.toggle('chk-cell', td.children.length === 1 && td.firstElementChild?.matches("input[type='checkbox']") === true && !td.textContent?.trim());
      const span = Math.max(1, td.colSpan);
      const manual = td.hasAttribute('data-label') && !td.hasAttribute(AUTO);
      if (!manual) {
        const label = span === 1 ? labels[col] : '';
        if (label) {
          td.setAttribute('data-label', label);
          td.setAttribute(AUTO, '');
        } else {
          td.removeAttribute('data-label');
          td.removeAttribute(AUTO);
        }
      }
      col += span;
    }
  }
}
