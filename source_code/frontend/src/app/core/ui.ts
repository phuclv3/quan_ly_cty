import { Injectable, signal } from '@angular/core';

const MOBILE_QUERY = '(max-width: 900px)';

/** Trạng thái khung giao diện: thu gọn thanh bên (máy tính) / ngăn kéo menu (điện thoại). */
@Injectable({ providedIn: 'root' })
export class Ui {
  readonly sideCollapsed = signal(false);
  readonly drawerOpen = signal(false);
  /** Popup đổi mật khẩu tự nguyện. */
  readonly doiMatKhau = signal(false);

  toggleNav(): void {
    if (window.matchMedia(MOBILE_QUERY).matches) this.drawerOpen.update((v) => !v);
    else this.sideCollapsed.update((v) => !v);
  }

  closeDrawer(): void {
    this.drawerOpen.set(false);
  }
}

/** Ghi nhớ bộ lọc gần nhất theo màn (NT-09). Lỗi bộ nhớ thì bỏ qua. */
export function nhoLoc<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`app-oxy:loc:${key}`);
    return raw ? { ...fallback, ...(JSON.parse(raw) as T) } : fallback;
  } catch {
    return fallback;
  }
}
export function luuLoc<T>(key: string, v: T): void {
  try {
    localStorage.setItem(`app-oxy:loc:${key}`, JSON.stringify(v));
  } catch {
    /* bỏ qua */
  }
}
