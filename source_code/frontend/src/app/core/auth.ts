import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TaiKhoan } from './models';
import { ChangeSet, Store } from './store';
import { api, readToken, setUnauthorizedHandler, writeToken } from './api';
import { loiMatKhauMoi } from './crypto';
import { fold } from './util';

/**
 * Đăng nhập nội bộ email + mật khẩu (NT-01), đổi / đặt lại mật khẩu (NT-02), tài khoản (NT-03).
 * Kiểm tra mật khẩu, khoá 5 lần sai, phiên 12 giờ, quyền quản trị tài khoản đều do máy chủ thực hiện
 * (backend AuthService); ở đây chỉ kiểm tra nhanh để báo lỗi sớm trên form.
 */
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  readonly me = this.store.me;
  /** Tài khoản bị bắt đổi mật khẩu: chỉ hiện popup đổi mật khẩu, chưa vào app. */
  readonly mustChange = computed(() => !!this.me()?.batDoiMK);

  constructor() {
    setUnauthorizedHandler(() => {
      if (!readToken()) return;
      this.expire();
    });
  }

  private expire(): void {
    writeToken(null);
    this.store.xoaPhien();
    this.store.say('Phiên đăng nhập đã hết hạn — vui lòng đăng nhập lại');
    void this.router.navigate(['/dang-nhap']);
  }

  async login(emailRaw: string, matKhau: string): Promise<string | null> {
    await this.store.firstLoad;
    try {
      const r = await api<{ token: string; taiKhoan: TaiKhoan }>('POST', '/auth/login', { email: emailRaw.trim().toLowerCase(), matKhau });
      writeToken(r.token);
      await this.store.sauDangNhap(r.taiKhoan.id);
      return null;
    } catch (e) {
      writeToken(null);
      return e instanceof Error ? e.message : 'Không đăng nhập được';
    }
  }

  logout(): void {
    if (readToken()) void api('POST', '/auth/logout').catch(() => undefined);
    writeToken(null);
    this.store.xoaPhien();
    void this.router.navigate(['/dang-nhap']);
  }

  /** Người dùng tự đổi mật khẩu. */
  async doiMatKhau(cu: string, moi: string, nhapLai: string): Promise<string | null> {
    const t = this.me();
    if (!t) return 'Chưa đăng nhập';
    if (moi !== nhapLai) return 'Hai lần nhập mật khẩu mới không khớp';
    const loi = loiMatKhauMoi(moi, cu);
    if (loi) return loi;
    try {
      await api('POST', '/auth/doi-mat-khau', { cu, moi, nhapLai });
      await this.store.reload();
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Không đổi được mật khẩu';
    }
  }

  // ── Quản lý tài khoản (quyền NT-03) ──

  private guard(): string | null {
    return this.store.canEdit('taiKhoan') ? null : 'Chỉ Giám đốc quản lý tài khoản';
  }

  async taoTaiKhoan(o: { hoTen: string; email: string; nhom: string[]; matKhau: string }): Promise<string | null> {
    const g = this.guard();
    if (g) return g;
    const email = o.email.trim().toLowerCase();
    if (!o.hoTen.trim()) return 'Chưa nhập Họ tên';
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return 'Email không hợp lệ';
    if (this.store.db().taiKhoan.some((x) => fold(x.email) === fold(email))) return 'Email đã có tài khoản';
    if (o.nhom.length === 0) return 'Chọn ít nhất 1 nhóm quyền';
    const loi = loiMatKhauMoi(o.matKhau);
    if (loi) return loi;
    try {
      const r = await api<{ changes?: ChangeSet }>('POST', '/tai-khoan', { hoTen: o.hoTen.trim(), email, nhom: o.nhom, matKhau: o.matKhau });
      this.store.apDung(r?.changes);
      return null;
    } catch (e) {
      return e instanceof Error ? e.message : 'Không tạo được tài khoản';
    }
  }

  /** Gửi lệnh tài khoản; lỗi máy chủ → báo và nạp lại dữ liệu. */
  private gui(method: string, path: string, body?: unknown): void {
    void api<{ changes?: ChangeSet }>(method, path, body)
      .then((r) => this.store.apDung(r?.changes))
      .catch((e: unknown) => {
        this.store.say(e instanceof Error ? e.message : 'Lỗi máy chủ', 'bad');
        void this.store.reload();
      });
  }

  suaTaiKhoan(id: string, o: { hoTen: string; nhom: string[] }): string | null {
    const g = this.guard();
    if (g) return g;
    const t = this.store.db().taiKhoan.find((x) => x.id === id);
    if (!t) return 'Không tìm thấy tài khoản';
    if (o.nhom.length === 0) return 'Chọn ít nhất 1 nhóm quyền';
    const moi = { ...t, hoTen: o.hoTen.trim() || t.hoTen, nhom: o.nhom };
    const ds = this.store.db().taiKhoan.map((x) => (x.id === id ? moi : x));
    if (!this.store.conQuanTri(ds, this.store.db().nhomQuyen)) return 'Thay đổi này làm hệ thống không còn ai quản trị tài khoản';
    this.gui('PUT', `/tai-khoan/${encodeURIComponent(id)}`, { hoTen: moi.hoTen, nhom: o.nhom });
    return null;
  }

  /** Khoá / mở khoá. Không xoá tài khoản đã phát sinh dữ liệu — chỉ khoá (NT-03). */
  doiTrangThai(id: string): string | null {
    const g = this.guard();
    if (g) return g;
    const t = this.store.db().taiKhoan.find((x) => x.id === id);
    if (!t) return 'Không tìm thấy tài khoản';
    if (t.id === this.store.meId()) return 'Không tự khoá tài khoản đang dùng';
    const moi: TaiKhoan['trangThai'] = t.trangThai === 'Khoá' ? 'Hoạt động' : 'Khoá';
    const ds = this.store.db().taiKhoan.map((x) => (x.id === id ? { ...x, trangThai: moi } : x));
    if (!this.store.conQuanTri(ds, this.store.db().nhomQuyen)) return 'Không khoá tài khoản quản trị cuối cùng';
    this.gui('POST', `/tai-khoan/${encodeURIComponent(id)}/doi-trang-thai`);
    return null;
  }

  /** Đặt lại mật khẩu → máy chủ huỷ mọi phiên của tài khoản đó, trả mật khẩu tạm để đọc cho người dùng. */
  async datLaiMatKhau(id: string, batDoi: boolean): Promise<{ loi: string | null; matKhau?: string }> {
    const g = this.guard();
    if (g) return { loi: g };
    try {
      const r = await api<{ matKhau: string; changes?: ChangeSet }>('POST', `/tai-khoan/${encodeURIComponent(id)}/dat-lai-mat-khau`, { batDoi });
      this.store.apDung(r.changes);
      return { loi: null, matKhau: r.matKhau };
    } catch (e) {
      return { loi: e instanceof Error ? e.message : 'Không đặt lại được mật khẩu' };
    }
  }
}
