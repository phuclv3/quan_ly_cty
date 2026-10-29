import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../core/auth';
import { CACH_CHIA_PT, CachChiaPT, CauHinh, CauHinhKey, TableKey } from '../core/models';
import { api } from '../core/api';
import { Store } from '../core/store';
import { fold, pct, viMoment } from '../core/util';
import { Confirm } from '../shared/confirm';
import { xuatBanSao } from '../shared/export';
import { Pager, paginate } from '../shared/pager';

type Tab = 'tham-so' | 'du-lieu' | 'van-hanh';
type Kieu = 'pct' | 'int' | 'text' | 'chon';

const THAM_SO: { k: CauHinhKey; nhan: string; kieu: Kieu; hint: string }[] = [
  { k: 'TNDN_NGUONG', nhan: 'Mốc bậc thuế TNDN HĐ bán', kieu: 'pct', hint: 'Mốc = tỷ lệ × GTHĐ thực tế trước VAT' },
  { k: 'TNDN_MUC1', nhan: 'Thuế suất phần chênh lệch đến mốc', kieu: 'pct', hint: 'Bậc 1' },
  { k: 'TNDN_MUC2', nhan: 'Thuế suất phần chênh lệch vượt mốc', kieu: 'pct', hint: 'Bậc 2' },
  { k: 'PT_THUE', nhan: 'Phú Tài — thuế TNDN trên LN trước thuế', kieu: 'pct', hint: 'Mặc định cho HĐ Phú Tài mới' },
  { k: 'PT_GIU', nhan: 'Phú Tài giữ (phí quản lý)', kieu: 'pct', hint: 'Tính trên LN sau thuế (cách chia Nhân) hoặc LN trước thuế (cách chia Cộng)' },
  { k: 'PT_CACH_CHIA', nhan: 'Phú Tài — cách chia lợi nhuận', kieu: 'chon', hint: 'Nhân: Oxy = (1 − thuế) × (1 − PT giữ) — 72% với 20% / 10%. Cộng: Oxy = 1 − thuế − PT giữ — 70%. Áp cho HĐ Phú Tài tạo sau.' },
  { k: 'SO_DOT_TOI_DA', nhan: 'Số đợt thanh toán tối đa / HĐ', kieu: 'int', hint: 'Áp cho HĐ bán và HĐ mua' },
  { k: 'TIEN_TO_TC', nhan: 'Tiền tố số phiếu thu chi', kieu: 'text', hint: 'VD TC2601-001 (số thứ tự đánh lại mỗi tháng)' },
  { k: 'TIEN_TO_CP', nhan: 'Tiền tố mã chi phí thực hiện HĐ', kieu: 'text', hint: 'VD CP26-0001' },
  { k: 'TIEN_TO_NK', nhan: 'Tiền tố phiếu nhập kho', kieu: 'text', hint: 'VD NK26-0001' },
  { k: 'TIEN_TO_XK', nhan: 'Tiền tố phiếu xuất kho', kieu: 'text', hint: 'VD XK26-0001' },
];
const KIEU: Record<CauHinhKey, Kieu> = Object.fromEntries(THAM_SO.map((t) => [t.k, t.kieu])) as Record<CauHinhKey, Kieu>;
const NHAN: Record<CauHinhKey, string> = Object.fromEntries(THAM_SO.map((t) => [t.k, t.nhan])) as Record<CauHinhKey, string>;

const BANG: { k: TableKey; nhan: string }[] = [
  { k: 'taiKhoan', nhan: 'Tài khoản' },
  { k: 'phien', nhan: 'Phiên đăng nhập' },
  { k: 'cauHinhLog', nhan: 'Lịch sử cấu hình' },
  { k: 'yeuCauXoa', nhan: 'Yêu cầu xoá' },
  { k: 'khachHang', nhan: 'Khách hàng' },
  { k: 'ncc', nhan: 'Nhà cung cấp' },
  { k: 'nguonTien', nhan: 'Nguồn tiền' },
  { k: 'loaiChiPhi', nhan: 'Loại chi phí' },
  { k: 'kho', nhan: 'Kho' },
  { k: 'loaiHang', nhan: 'Mã hàng' },
  { k: 'phieuThuChi', nhan: 'Phiếu thu chi' },
  { k: 'chiPhiHD', nhan: 'Chi phí thực hiện HĐ' },
  { k: 'hopDongBan', nhan: 'Hợp đồng bán' },
  { k: 'hopDongMua', nhan: 'Hợp đồng mua' },
  { k: 'phieuKho', nhan: 'Phiếu kho' },
  { k: 'kiemKe', nhan: 'Kiểm kê kho' },
  { k: 'anhXaTen', nhan: 'Ánh xạ tên hàng bán' },
  { k: 'binhKhi', nhan: 'Bình khí theo serial' },
  { k: 'deNghiVatTu', nhan: 'Đề nghị cấp vật tư' },
  { k: 'viecGiao', nhan: 'Việc được giao' },
  { k: 'hopDongPhuTai', nhan: 'HĐ Phú Tài' },
  { k: 'dongTienPT', nhan: 'Dòng tiền Phú Tài' },
  { k: 'hoSo', nhan: 'Hồ sơ (tệp đính kèm)' },
  { k: 'hoaDon', nhan: 'Hoá đơn' },
];

/** NT-14 Tham số cấu hình · dữ liệu trên máy. */
@Component({
  selector: 'app-cau-hinh',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, Pager],
  template: `
    <div class="page-head">
      <div>
        <div class="crumbs"><a routerLink="/">Trang chủ</a> › Hệ thống › Cấu hình</div>
        <h1>Cấu hình</h1>
      </div>
    </div>

    <div class="tabs" role="tablist">
      @if (coTab('tham-so')) { <button role="tab" [class.on]="tab() === 'tham-so'" (click)="setTab('tham-so')">Tham số</button> }
      @if (coTab('du-lieu')) { <button role="tab" [class.on]="tab() === 'du-lieu'" (click)="setTab('du-lieu')">Dữ liệu</button> }
      @if (coTab('van-hanh')) { <button role="tab" [class.on]="tab() === 'van-hanh'" (click)="setTab('van-hanh')">Vận hành hệ thống</button> }
    </div>

    @switch (tab()) {
      @case ('tham-so') {
        <div class="note info">HĐ đã tạo giữ tỷ lệ tại thời điểm tạo; tham số mới chỉ áp cho HĐ tạo sau. Mỗi lần sửa được ghi lịch sử.</div>
        @if (!suaTS()) { <p class="muted">Bạn chỉ xem — cần quyền "Sửa" chức năng Tham số cấu hình.</p> }
        <div class="tbl-wrap">
          <table class="tbl freeze">
            <thead><tr><th>Tham số</th><th>Giá trị</th><th>Ghi chú</th>@if (suaTS()) { <th></th> }</tr></thead>
            <tbody>
              @for (t of thamSo; track t.k) {
                <tr>
                  <td>{{ t.nhan }}</td>
                  <td>
                    <div class="row" style="gap:6px;flex-wrap:nowrap">
                      @if (t.kieu === 'chon') {
                        <select style="max-width:130px" [disabled]="!suaTS()" (change)="nhap(t.k, $any($event.target).value)" [attr.aria-label]="t.nhan">
                          @for (o of cachChia; track o) { <option [value]="o" [selected]="o === hienThi(t.k)">{{ o }}</option> }
                        </select>
                      } @else {
                      <input
                        [class.num]="t.kieu !== 'text'"
                        style="max-width:130px"
                        [attr.inputmode]="t.kieu === 'text' ? null : 'decimal'"
                        [disabled]="!suaTS()"
                        [value]="hienThi(t.k)"
                        (input)="nhap(t.k, $any($event.target).value)"
                        (keydown.enter)="luu(t.k)"
                        [attr.aria-label]="t.nhan"
                      />
                      }
                      @if (t.kieu === 'pct') { <span>%</span> }
                    </div>
                  </td>
                  <td class="sub">{{ t.hint }}</td>
                  @if (suaTS()) {
                    <td><button class="btn sm" [disabled]="!doi(t.k)" (click)="luu(t.k)">Lưu</button></td>
                  }
                </tr>
              }
            </tbody>
          </table>
        </div>

        <h3 class="section-title">Lịch sử sửa tham số</h3>
        <div class="tbl-wrap">
          <table class="tbl">
            <thead><tr><th>Tham số</th><th>Giá trị cũ</th><th>Giá trị mới</th><th>Người sửa</th><th>Ngày sửa</th></tr></thead>
            <tbody>
              @for (l of pgLog.items(); track $index) {
                <tr>
                  <td>{{ nhanKhoa(l.khoa) }}</td>
                  <td>{{ giaTri(l.khoa, l.giaTriCu) }}</td>
                  <td>{{ giaTri(l.khoa, l.giaTriMoi) }}</td>
                  <td>{{ store.userName(l.nguoiSua) }}</td>
                  <td>{{ viMoment(l.ngaySua) }}</td>
                </tr>
              } @empty {
                <tr><td colspan="5" class="empty">Chưa có lần sửa nào</td></tr>
              }
            </tbody>
          </table>
        </div>
        <app-pager [pager]="pgLog" />
      }

      @case ('van-hanh') {
        <div class="note warn">
          Thao tác ảnh hưởng toàn hệ thống — chỉ nhóm toàn quyền thấy tab này. Nên xuất bản sao dữ liệu (tab Dữ liệu) trước khi tắt.
        </div>
        <div class="card" style="margin-top:14px;max-width:640px">
          <h3>Tắt hệ thống</h3>
          <p class="sub">Dừng backend và thoát tiến trình máy chủ. Mọi người dùng mất kết nối ngay; muốn dùng lại phải khởi động backend thủ công hoặc bằng dịch vụ của hệ điều hành (nếu cấu hình tự khởi động lại thì máy chủ sẽ bật lại).</p>
          <div class="btn-row" style="justify-content:flex-start;margin-top:10px"><button class="btn danger" (click)="tatHeThong()">Tắt hệ thống</button></div>
        </div>
      }

      @case ('du-lieu') {
        <div class="note warn">
          Dữ liệu lưu tập trung ở máy chủ (MySQL + kho tệp hồ sơ) — sao lưu định kỳ ở máy chủ theo hướng dẫn backend.
          Số bản ghi dưới đây là phần bạn được xem theo quyền.
        </div>
        <div class="grid c2" style="margin-top:14px">
          <div class="card">
            <h3>Số bản ghi theo bảng</h3>
            <table class="tbl compact">
              <tbody>
                @for (b of demBang(); track b.nhan) { <tr><td>{{ b.nhan }}</td><td class="num">{{ b.n }}</td></tr> }
              </tbody>
              <tfoot><tr><th>Tổng</th><th class="num">{{ tongBanGhi() }}</th></tr></tfoot>
            </table>
          </div>
          <div class="stack" style="display:grid;gap:14px;align-content:start">
            <div class="card">
              <h3>Xuất bản sao</h3>
              <p class="sub">Tệp JSON chứa toàn bộ dữ liệu (không gồm nội dung tệp đính kèm). Gồm dữ liệu bạn được xem (không có mật khẩu) — cất giữ như tài liệu mật.</p>
              <div class="btn-row" style="justify-content:flex-start;margin-top:10px"><button class="btn" (click)="xuat()">Xuất bản sao (JSON)</button></div>
            </div>
            <div class="card">
              <h3>Nạp lại dữ liệu mẫu</h3>
              <p class="sub">Xoá MỌI dữ liệu trên máy chủ (hợp đồng, phiếu, tài khoản, cấu hình…) và dựng lại từ dữ liệu mẫu — chỉ máy chủ chạy hồ sơ phát triển. Sau đó đăng xuất.</p>
              <div class="btn-row" style="justify-content:flex-start;margin-top:10px"><button class="btn danger" (click)="napLai()">Nạp lại dữ liệu mẫu</button></div>
            </div>
          </div>
        </div>
      }
    }
  `,
})
export class CauHinhPage {
  protected readonly store = inject(Store);
  private readonly auth = inject(Auth);
  private readonly confirm = inject(Confirm);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly viMoment = viMoment;
  protected readonly thamSo = THAM_SO;
  protected readonly cachChia = CACH_CHIA_PT;

  private readonly qp = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly tabs = computed<Tab[]>(() => {
    const out: Tab[] = [];
    if (this.store.canView('cauHinh')) out.push('tham-so');
    if (this.store.isGD()) out.push('du-lieu', 'van-hanh');
    return out;
  });
  protected readonly tab = computed<Tab>(() => {
    const t = this.qp().get('tab') as Tab | null;
    return t && this.tabs().includes(t) ? t : (this.tabs()[0] ?? 'tham-so');
  });
  protected coTab(t: Tab): boolean {
    return this.tabs().includes(t);
  }
  protected setTab(t: Tab): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  // ── Tham số (NT-14) ──
  /** Sửa tham số theo ma trận quyền NT-14 (không gắn cứng Giám đốc). */
  protected readonly suaTS = computed(() => this.store.canEdit('cauHinh'));
  private readonly nhap_ = signal<Partial<Record<CauHinhKey, string>>>({});

  private goc(k: CauHinhKey): string {
    const v = this.store.cauHinh()[k];
    if (KIEU[k] === 'pct') return (Math.round(Number(v) * 1e6) / 1e4).toLocaleString('vi-VN', { maximumFractionDigits: 4 });
    return String(v);
  }
  protected hienThi(k: CauHinhKey): string {
    return this.nhap_()[k] ?? this.goc(k);
  }
  protected nhap(k: CauHinhKey, v: string): void {
    this.nhap_.update((m) => ({ ...m, [k]: v }));
  }
  protected doi(k: CauHinhKey): boolean {
    const v = this.nhap_()[k];
    return v !== undefined && v.trim() !== this.goc(k);
  }
  protected async luu(k: CauHinhKey): Promise<void> {
    if (!this.suaTS() || !this.doi(k)) return;
    const raw = (this.nhap_()[k] ?? '').trim();
    let v: CauHinh[CauHinhKey];
    switch (KIEU[k]) {
      case 'pct': {
        const n = Number(raw.replace(/\s|%/g, '').replace(',', '.'));
        if (!raw || !Number.isFinite(n) || n < 0 || n > 100) return this.store.say(`${NHAN[k]}: nhập số phần trăm từ 0 đến 100`);
        v = Math.round(n * 1e4) / 1e6;
        break;
      }
      case 'chon': {
        if (!CACH_CHIA_PT.includes(raw as CachChiaPT)) return this.store.say(`${NHAN[k]}: chọn một trong ${CACH_CHIA_PT.join(' / ')}`);
        v = raw as CachChiaPT;
        break;
      }
      case 'int': {
        const n = Number(raw);
        if (!Number.isInteger(n) || n < 1 || n > 24) return this.store.say(`${NHAN[k]}: nhập số nguyên từ 1 đến 24`);
        v = n;
        break;
      }
      default: {
        const s = raw.toUpperCase();
        if (!/^[A-Z]{1,5}$/.test(s)) return this.store.say(`${NHAN[k]}: 1–5 chữ cái in hoa, không dấu`);
        const trung = THAM_SO.find((t) => t.kieu === 'text' && t.k !== k && this.store.cauHinh()[t.k] === s);
        if (trung) return this.store.say(`Tiền tố ${s} đang dùng cho "${trung.nhan}"`);
        v = s;
      }
    }
    const ok = await this.confirm.ask({
      title: `Đổi "${NHAN[k]}"?`,
      message: `${this.giaTri(k, String(this.store.cauHinh()[k]))} → ${this.giaTri(k, String(v))}. HĐ đã tạo giữ tỷ lệ cũ; tham số mới chỉ áp cho HĐ tạo sau. Thay đổi được ghi vào lịch sử.`,
      ok: 'Lưu tham số',
    });
    if (!ok) return;
    const e = this.store.setCauHinh(k, v);
    if (e) return this.store.say(e);
    this.nhap_.update((m) => {
      const out = { ...m };
      delete out[k];
      return out;
    });
    this.store.say(`Đã lưu "${NHAN[k]}"`);
  }

  protected readonly pgLog = paginate(this.store.cauHinhLog);
  protected nhanKhoa(k: CauHinhKey): string {
    return NHAN[k] ?? k;
  }
  protected giaTri(k: CauHinhKey, v: string): string {
    return KIEU[k] === 'pct' && v !== '' && Number.isFinite(Number(v)) ? pct(Number(v), 2) : v;
  }

  // ── Dữ liệu trên máy ──
  protected readonly demBang = computed(() => {
    const d = this.store.db();
    return BANG.map((b) => ({ nhan: b.nhan, n: (d[b.k] as readonly unknown[]).length }));
  });
  protected readonly tongBanGhi = computed(() => this.demBang().reduce((s, b) => s + b.n, 0));

  protected xuat(): void {
    void xuatBanSao();
    this.store.say('Đã xuất bản sao dữ liệu');
  }

  protected async tatHeThong(): Promise<void> {
    if (!this.store.isGD()) return;
    const go = await this.confirm.prompt({
      title: 'Tắt hệ thống và dừng backend?',
      message: 'Backend sẽ thoát ngay sau khi xác nhận. Mọi người đang dùng bị ngắt kết nối, không thể bật lại từ giao diện này.',
      warn: 'Bạn sẽ bị đăng xuất.',
      label: 'Gõ TẮT để xác nhận',
      placeholder: 'TẮT',
      minLength: 3,
      ok: 'Tắt hệ thống',
    });
    if (go === null) return;
    if (fold(go).trim() !== 'tat') return this.store.say('Chưa gõ đúng "TẮT" — không thay đổi gì');
    try {
      await api('POST', '/admin/tat-he-thong');
    } catch (e) {
      return this.store.say(e instanceof Error ? e.message : 'Không gửi được lệnh tắt hệ thống', 'bad');
    }
    this.store.say('Đã gửi lệnh tắt — backend đang dừng');
    this.auth.logout();
  }

  protected async napLai(): Promise<void> {
    if (!this.store.isGD()) return;
    const go = await this.confirm.prompt({
      title: 'Xoá toàn bộ dữ liệu trên máy chủ và nạp lại dữ liệu mẫu?',
      message: 'Mọi hợp đồng, phiếu, chi phí, tài khoản, cấu hình trên máy chủ mất hẳn — không hoàn tác được. Nên "Xuất bản sao (JSON)" trước.',
      warn: 'Sau khi nạp lại bạn bị đăng xuất.',
      label: 'Gõ NẠP LẠI để xác nhận',
      placeholder: 'NẠP LẠI',
      minLength: 7,
      ok: 'Xoá & nạp lại',
    });
    if (go === null) return;
    if (fold(go).replace(/\s+/g, ' ') !== 'nap lai') return this.store.say('Chưa gõ đúng "NẠP LẠI" — không thay đổi gì');
    try {
      await this.store.resetToSeed();
    } catch (e) {
      return this.store.say(e instanceof Error && e.message !== 'Không tìm thấy đường dẫn' ? e.message : 'Máy chủ không bật chức năng nạp lại dữ liệu mẫu (chỉ có ở môi trường phát triển)');
    }
    this.store.say('Đã nạp lại dữ liệu mẫu');
    this.auth.logout();
  }
}
