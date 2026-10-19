import { Injectable, computed, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TaiKhoan } from './models';
import { Store } from './store';
import { hashPassword, loiMatKhauMoi, matKhauTam, randomHex } from './crypto';
import { fold, uid } from './util';

const TOKEN_KEY = 'app-oxy:token';
const HET_HAN_MS = 12 * 3600_000;
const KHOA_MS = 15 * 60_000;
const SAI_TOI_DA = 5;
const LOI_CHUNG = 'Email hoặc mật khẩu không đúng';

function readToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
function writeToken(t: string | null): void {
  try {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* trình duyệt chặn bộ nhớ: phiên chỉ sống tới khi tải lại */
  }
}

/** Đăng nhập nội bộ email + mật khẩu (NT-01), đổi / đặt lại mật khẩu (NT-02), tài khoản (NT-03). */
@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly store = inject(Store);
  private readonly router = inject(Router);

  readonly me = this.store.me;
  /** Tài khoản bị bắt đổi mật khẩu: chỉ hiện popup đổi mật khẩu, chưa vào app. */
  readonly mustChange = computed(() => !!this.me()?.batDoiMK);

  constructor() {
    void this.store.firstLoad.then(() => this.restore());
    // Gia hạn phiên theo hoạt động: mỗi lần bấm/gõ đẩy hạn thêm 12 giờ (giới hạn 1 lần/phút).
    let last = 0;
    const touch = () => {
      if (Date.now() - last < 60_000) return;
      last = Date.now();
      this.touch();
    };
    addEventListener('pointerdown', touch, { passive: true });
    addEventListener('keydown', touch, { passive: true });
  }

  private restore(): void {
    const token = readToken();
    if (!token) return;
    const p = this.store.db().phien.find((x) => x.token === token);
    if (!p || p.hetHan < new Date().toISOString()) {
      writeToken(null);
      return;
    }
    const t = this.store.db().taiKhoan.find((x) => x.email === p.email);
    if (!t || t.trangThai === 'Khoá') {
      writeToken(null);
      return;
    }
    this.store.meId.set(t.id);
  }

  private touch(): void {
    const token = readToken();
    if (!token || !this.store.ready()) return;
    const p = this.store.db().phien.find((x) => x.token === token);
    if (!p) return;
    if (p.hetHan < new Date().toISOString()) {
      this.expire();
      return;
    }
    const hetHan = new Date(Date.now() + HET_HAN_MS).toISOString();
    this.store.setPhien((rows) => rows.map((x) => (x.token === token ? { ...x, hetHan } : x)));
  }

  private expire(): void {
    writeToken(null);
    this.store.meId.set(null);
    this.store.say('Phiên đăng nhập đã hết hạn — vui lòng đăng nhập lại');
    void this.router.navigate(['/dang-nhap']);
  }

  async login(emailRaw: string, matKhau: string): Promise<string | null> {
    await this.store.firstLoad;
    const email = emailRaw.trim().toLowerCase();
    const t = this.store.db().taiKhoan.find((x) => x.email.toLowerCase() === email);
    if (!t) return LOI_CHUNG;
    if (t.trangThai === 'Khoá') return 'Tài khoản đã bị khoá — liên hệ Giám đốc';
    if (t.khoaDen && t.khoaDen > new Date().toISOString()) {
      const phut = Math.ceil((new Date(t.khoaDen).getTime() - Date.now()) / 60_000);
      return `Sai mật khẩu quá ${SAI_TOI_DA} lần — thử lại sau ${phut} phút`;
    }
    const ok = (await hashPassword(matKhau, t.salt)) === t.matKhauBam;
    if (!ok) {
      const sai = t.soLanSai + 1;
      this.store.putTaiKhoan({
        ...t,
        soLanSai: sai >= SAI_TOI_DA ? 0 : sai,
        khoaDen: sai >= SAI_TOI_DA ? new Date(Date.now() + KHOA_MS).toISOString() : t.khoaDen,
      });
      return sai >= SAI_TOI_DA ? `Sai mật khẩu ${SAI_TOI_DA} lần — tài khoản bị khoá đăng nhập 15 phút` : LOI_CHUNG;
    }
    const token = randomHex(24);
    const now = new Date();
    this.store.setPhien((rows) => [
      ...rows.filter((x) => x.hetHan > now.toISOString()),
      { token, email: t.email, hetHan: new Date(now.getTime() + HET_HAN_MS).toISOString() },
    ]);
    this.store.putTaiKhoan({ ...t, soLanSai: 0, khoaDen: undefined, lanDangNhapCuoi: now.toISOString() });
    writeToken(token);
    this.store.meId.set(t.id);
    return null;
  }

  logout(): void {
    const token = readToken();
    if (token) this.store.setPhien((rows) => rows.filter((x) => x.token !== token));
    writeToken(null);
    this.store.meId.set(null);
    void this.router.navigate(['/dang-nhap']);
  }

  /** Người dùng tự đổi mật khẩu. */
  async doiMatKhau(cu: string, moi: string, nhapLai: string): Promise<string | null> {
    const t = this.me();
    if (!t) return 'Chưa đăng nhập';
    if ((await hashPassword(cu, t.salt)) !== t.matKhauBam) return 'Mật khẩu cũ không đúng';
    if (moi !== nhapLai) return 'Hai lần nhập mật khẩu mới không khớp';
    const loi = loiMatKhauMoi(moi, cu);
    if (loi) return loi;
    const salt = randomHex();
    this.store.putTaiKhoan({ ...t, salt, matKhauBam: await hashPassword(moi, salt), batDoiMK: false });
    return null;
  }

  // ── Quản lý tài khoản (chỉ Giám đốc — Ma trận quyền) ──

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
    const salt = randomHex();
    this.store.putTaiKhoan({
      id: uid('TK'),
      email,
      hoTen: o.hoTen.trim(),
      nhom: o.nhom,
      trangThai: 'Hoạt động',
      salt,
      matKhauBam: await hashPassword(o.matKhau, salt),
      batDoiMK: true,
      soLanSai: 0,
    });
    return null;
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
    this.store.putTaiKhoan(moi);
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
    this.store.putTaiKhoan({ ...t, trangThai: moi, soLanSai: 0, khoaDen: undefined });
    if (moi === 'Khoá') this.store.setPhien((rows) => rows.filter((x) => x.email !== t.email));
    return null;
  }

  /** Đặt lại mật khẩu → huỷ mọi phiên của tài khoản đó. Trả mật khẩu tạm để đọc cho người dùng. */
  async datLaiMatKhau(id: string, batDoi: boolean): Promise<{ loi: string | null; matKhau?: string }> {
    const g = this.guard();
    if (g) return { loi: g };
    const t = this.store.db().taiKhoan.find((x) => x.id === id);
    if (!t) return { loi: 'Không tìm thấy tài khoản' };
    const mk = matKhauTam();
    const salt = randomHex();
    this.store.putTaiKhoan({ ...t, salt, matKhauBam: await hashPassword(mk, salt), batDoiMK: batDoi, soLanSai: 0, khoaDen: undefined });
    this.store.setPhien((rows) => rows.filter((x) => x.email !== t.email));
    return { loi: null, matKhau: mk };
  }
}
