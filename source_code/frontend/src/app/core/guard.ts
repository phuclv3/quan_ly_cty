import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from './store';
import { Perm } from './perm';

/** Phải đăng nhập (chờ lần nạp dữ liệu đầu để không đẩy nhầm về màn đăng nhập). */
export const signedInGuard: CanActivateFn = async (_r, state) => {
  const store = inject(Store);
  const router = inject(Router);
  await store.firstLoad;
  await Promise.resolve();
  if (!store.me()) return router.createUrlTree(['/dang-nhap'], { queryParams: { next: state.url } });
  return true;
};

/** Chỉ vào màn khi có quyền xem một trong các khoá (menu cũng ẩn theo đúng điều kiện này). */
export const permGuard =
  (...perms: Perm[]): CanActivateFn =>
  async () => {
    const store = inject(Store);
    const router = inject(Router);
    await store.firstLoad;
    if (perms.some((p) => store.canView(p))) return true;
    store.say('Tài khoản của bạn không có quyền xem mục này');
    return router.createUrlTree(['/']);
  };

export const guestGuard: CanActivateFn = async () => {
  const store = inject(Store);
  await store.firstLoad;
  await Promise.resolve();
  return store.me() ? inject(Router).createUrlTree(['/']) : true;
};
