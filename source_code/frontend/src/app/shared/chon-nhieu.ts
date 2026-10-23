import { signal } from '@angular/core';

/** Trạng thái tích chọn nhiều dòng trong danh sách (xoá hàng loạt…). */
export class ChonNhieu {
  readonly chon = signal<Set<string>>(new Set());

  co(id: string): boolean {
    return this.chon().has(id);
  }
  flip(id: string): void {
    this.chon.update((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  }
  /** Tất cả `ids` đã được chọn (và có ít nhất một). */
  du(ids: readonly string[]): boolean {
    const s = this.chon();
    return ids.length > 0 && ids.every((id) => s.has(id));
  }
  chonTat(ids: readonly string[], on: boolean): void {
    this.chon.update((s) => {
      const n = new Set(s);
      for (const id of ids) {
        if (on) n.add(id);
        else n.delete(id);
      }
      return n;
    });
  }
  xoa(): void {
    this.chon.set(new Set());
  }
}
