import { effect, inject, signal, untracked } from '@angular/core';
import { api } from '../core/api';
import { Store } from '../core/store';

/**
 * Tải dữ liệu một tab Phú Tài từ backend (GET /phu-tai/...): tải lại khi đổi bộ lọc (url đổi) hoặc dữ liệu chung đổi phiên bản.
 * Gọi trong ngữ cảnh khởi tạo của component. Backend tính toàn bộ số liệu — frontend chỉ vẽ.
 */
export function ptTai<T>(url: () => string) {
  const store = inject(Store);
  const d = signal<T | null>(null);
  const dangTai = signal(false);
  const loi = signal('');
  let seq = 0;

  async function tai(): Promise<void> {
    const mine = ++seq;
    dangTai.set(true);
    try {
      const x = await api<T>('GET', url());
      if (mine !== seq) return;
      d.set(x);
      loi.set('');
    } catch (e) {
      if (mine !== seq) return;
      loi.set(e instanceof Error ? e.message : 'Không tải được dữ liệu');
    } finally {
      if (mine === seq) dangTai.set(false);
    }
  }

  effect(() => {
    url();
    store.db().version;
    untracked(() => void tai());
  });

  return { d, dangTai, loi, tai };
}

/** Chuỗi truy vấn bỏ các giá trị rỗng. */
export function qs(o: Record<string, string | number | null | undefined>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(o)) if (v !== '' && v !== null && v !== undefined) p.set(k, String(v));
  const s = p.toString();
  return s ? `?${s}` : '';
}
