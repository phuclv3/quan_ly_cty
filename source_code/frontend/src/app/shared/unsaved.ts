/**
 * Hỏi trước khi rời màn / đóng popup còn thay đổi chưa lưu (NT-05).
 *
 *  - Màn chi tiết / popup gọi canhBaoChuaLuu(() => this.dirty()) trong constructor.
 *  - unsavedGuard (canDeactivate) gắn ở mọi route con của Shell: điều hướng sang màn khác thì hỏi.
 *  - App bắt sự kiện beforeunload: đóng tab / tải lại trang thì trình duyệt tự hỏi.
 */
import { DestroyRef, Injectable, Signal, computed, inject, linkedSignal, untracked } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { Confirm, ConfirmOptions } from './confirm';

export const HOI_BO_THAY_DOI: ConfirmOptions = {
  title: 'Bỏ các thay đổi chưa lưu?',
  message: 'Dữ liệu vừa nhập chưa được lưu và sẽ mất nếu rời đi.',
  ok: 'Bỏ thay đổi',
  cancel: 'Ở lại',
  tone: 'danger',
};

@Injectable({ providedIn: 'root' })
export class Unsaved {
  private readonly checks = new Set<() => boolean>();

  add(fn: () => boolean): () => void {
    this.checks.add(fn);
    return () => this.checks.delete(fn);
  }

  private boQua = false;

  any(): boolean {
    if (this.boQua) return false;
    for (const f of this.checks) if (f()) return true;
    return false;
  }

  /** Điều hướng ngay sau khi vừa lưu (VD /moi → /:id) — không hỏi. */
  async diSauKhiLuu(nav: () => Promise<boolean>): Promise<void> {
    this.boQua = true;
    try {
      await nav();
    } finally {
      this.boQua = false;
    }
  }
}

/** Đăng ký một điều kiện "còn thay đổi chưa lưu" — tự gỡ khi component bị huỷ. Gọi trong injection context. */
export function canhBaoChuaLuu(fn: () => boolean): void {
  const off = inject(Unsaved).add(fn);
  inject(DestroyRef).onDestroy(off);
}

/**
 * Popup form dạng `signal<T | null>` (null = đóng): trả "có thay đổi" so với ảnh chụp lúc mở.
 * Ảnh chụp lấy lại mỗi lần form chuyển từ đóng sang mở.
 */
export function dirtyOf<T>(f: Signal<T | null>): Signal<boolean> {
  const goc = linkedSignal({ source: () => f() !== null, computation: () => JSON.stringify(untracked(f)) });
  return computed(() => f() !== null && JSON.stringify(f()) !== goc());
}

export const unsavedGuard: CanDeactivateFn<unknown> = () => {
  const u = inject(Unsaved);
  if (!u.any()) return true;
  return inject(Confirm).ask(HOI_BO_THAY_DOI);
};
