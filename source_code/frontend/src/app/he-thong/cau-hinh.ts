import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../core/auth';
import { CauHinh, CauHinhKey, TableKey } from '../core/models';
import { Store } from '../core/store';
import { fold, pct, viMoment } from '../core/util';
import { Confirm } from '../shared/confirm';
import { downloadFile, fileName } from '../shared/export';
import { Pager, paginate } from '../shared/pager';
import { Kpi } from '../shared/ui-kit';
import { FILE_NGUON } from './import-map';
import { ImportCsv } from './import-csv';

type Tab = 'tham-so' | 'import' | 'du-lieu';
type Kieu = 'pct' | 'int' | 'text';

const THAM_SO: { k: CauHinhKey; nhan: string; kieu: Kieu; hint: string }[] = [
  { k: 'TNDN_NGUONG', nhan: 'Mốc bậc thuế TNDN HĐ bán', kieu: 'pct', hint: 'Mốc = tỷ lệ × GTHĐ thực tế trước VAT (HDB-08)' },
  { k: 'TNDN_MUC1', nhan: 'Thuế suất phần chênh lệch đến mốc', kieu: 'pct', hint: 'Bậc 1' },
  { k: 'TNDN_MUC2', nhan: 'Thuế suất phần chênh lệch vượt mốc', kieu: 'pct', hint: 'Bậc 2' },
  { k: 'PT_THUE', nhan: 'Phú Tài — thuế TNDN trên LN trước thuế', kieu: 'pct', hint: 'Mặc định cho HĐ Phú Tài mới (PT-06)' },
  { k: 'PT_GIU', nhan: 'Phú Tài giữ (phí quản lý) trên LN sau thuế', kieu: 'pct', hint: 'Oxy hưởng phần còn lại' },
  { k: 'SO_DOT_TOI_DA', nhan: 'Số đợt thanh toán tối đa / HĐ', kieu: 'int', hint: 'Áp cho HĐ bán và HĐ mua' },
  { k: 'TIEN_TO_TC', nhan: 'Tiền tố số phiếu thu chi', kieu: 'text', hint: 'VD TC26-0001' },
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
  { k: 'loaiHang', nhan: 'Loại hàng' },
  { k: 'phieuThuChi', nhan: 'Phiếu thu chi' },
  { k: 'chiPhiHD', nhan: 'Chi phí thực hiện HĐ' },
  { k: 'hopDongBan', nhan: 'Hợp đồng bán' },
  { k: 'hopDongMua', nhan: 'Hợp đồng mua' },
  { k: 'phieuKho', nhan: 'Phiếu kho' },
  { k: 'hopDongPhuTai', nhan: 'HĐ Phú Tài' },
  { k: 'dongTienPT', nhan: 'Dòng tiền Phú Tài' },
  { k: 'hoSo', nhan: 'Hồ sơ (tệp đính kèm)' },
  { k: 'hoaDon', nhan: 'Hoá đơn' },
];

/** NT-14 Tham số cấu hình · NT-13 Import · dữ liệu trên máy. */
@Component({
  selector: 'app-cau-hinh',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, Pager, Kpi, ImportCsv],
  template: `
    <div class="page-head">
      <div>
        <div class="crumbs"><a routerLink="/">Trang chủ</a> › Hệ thống › Cấu hình & Import</div>
        <h1>Cấu hình & Import</h1>
      </div>
    </div>

    <div class="tabs" role="tablist">
      @if (coTab('tham-so')) { <button role="tab" [class.on]="tab() === 'tham-so'" (click)="setTab('tham-so')">Tham số</button> }
      @if (coTab('import')) { <button role="tab" [class.on]="tab() === 'import'" (click)="setTab('import')">Import dữ liệu</button> }
      @if (coTab('du-lieu')) { <button role="tab" [class.on]="tab() === 'du-lieu'" (click)="setTab('du-lieu')">Dữ liệu trên máy này</button> }
    </div>

    @switch (tab()) {
      @case ('tham-so') {
        <div class="note info">HĐ đã tạo giữ tỷ lệ tại thời điểm tạo; tham số mới chỉ áp cho HĐ tạo sau. Mỗi lần sửa được ghi lịch sử.</div>
        @if (!suaTS()) { <p class="muted">Bạn chỉ xem — chỉ Giám đốc sửa tham số.</p> }
        <div class="tbl-wrap">
          <table class="tbl freeze">
            <thead><tr><th>Tham số</th><th>Khoá</th><th>Giá trị</th><th>Ghi chú</th>@if (suaTS()) { <th></th> }</tr></thead>
            <tbody>
              @for (t of thamSo; track t.k) {
                <tr>
                  <td>{{ t.nhan }}</td>
                  <td class="mono sub">{{ t.k }}</td>
                  <td>
                    <div class="row" style="gap:6px;flex-wrap:nowrap">
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
            <thead><tr><th>Khoá</th><th>Giá trị cũ</th><th>Giá trị mới</th><th>Người sửa</th><th>Ngày sửa</th></tr></thead>
            <tbody>
              @for (l of pgLog.items(); track $index) {
                <tr>
                  <td>{{ nhanKhoa(l.khoa) }} <span class="sub mono">{{ l.khoa }}</span></td>
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

      @case ('import') {
        <div class="kpis">
          @for (c of demImport(); track c.nhan) { <app-kpi [label]="c.nhan + ' — cờ import'" [value]="'' + c.n" [sub]="'trên ' + c.tong + ' bản ghi'" /> }
        </div>
        <div class="card">
          <h3>Quy tắc import (D-27, chờ xác nhận)</h3>
          <ul style="margin:6px 0 0 18px">
            <li>Import toàn bộ dữ liệu lịch sử, không nhập tay lại.</li>
            <li>Trường bắt buộc mà dữ liệu cũ thiếu → điền "(Chưa xác định)" và gắn cờ "Dữ liệu import" để lọc bổ sung.</li>
            <li>Phiếu thu chi cũ vào ở trạng thái Đã duyệt, Người duyệt = "Import" (số dư khớp sổ cũ).</li>
            <li>Dòng "Rút tiền nhập quỹ" trong sổ tiền mặt → phiếu Luân chuyển Ngân hàng → Tiền mặt.</li>
            <li>Cột tự tính (Chênh lệch, Thuế, Công nợ, Tồn…) chỉ dùng đối chiếu, không ghi đè công thức.</li>
            <li>Chỉ chạy sau khi cấu trúc field (NT-10) đã chốt. Dữ liệu mẫu của bản này đã dựng sẵn từ các file dưới.</li>
          </ul>
        </div>

        <h3 class="section-title">Mapping cột cũ → field mới</h3>
        <div class="grid c2">
          @for (f of fileNguon; track f.ten) {
            <div class="card">
              <h3>{{ f.ten }}</h3>
              <p class="sub">{{ f.moTa }} → <b>{{ f.dich }}</b></p>
              <div class="tbl-wrap">
                <table class="tbl compact">
                  <thead><tr><th>Cột cũ</th><th>Field mới</th><th>Ghi chú</th></tr></thead>
                  <tbody>
                    @for (c of f.cot; track c.cu) {
                      <tr><td>{{ c.cu }}</td><td class="mono">{{ c.moi }}</td><td class="sub">{{ c.ghiChu || '' }}</td></tr>
                    }
                  </tbody>
                </table>
              </div>
            </div>
          }
        </div>

        <h3 class="section-title">Công cụ</h3>
        <app-import-csv />
      }

      @case ('du-lieu') {
        <div class="note warn">
          Bản chạy thử này lưu toàn bộ dữ liệu ngay trong trình duyệt của máy này (localStorage; tệp đính kèm ở IndexedDB).
          Máy khác / trình duyệt khác không thấy dữ liệu này; xoá dữ liệu duyệt web là mất. Hãy xuất bản sao định kỳ.
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
              <p class="sub">Tệp JSON chứa toàn bộ dữ liệu (không gồm nội dung tệp đính kèm). Tệp có chuỗi băm mật khẩu — cất giữ như tài liệu mật.</p>
              <div class="btn-row" style="justify-content:flex-start;margin-top:10px"><button class="btn" (click)="xuat()">Xuất bản sao (JSON)</button></div>
            </div>
            <div class="card">
              <h3>Nạp lại dữ liệu mẫu</h3>
              <p class="sub">Xoá MỌI dữ liệu trên máy này (hợp đồng, phiếu, tài khoản, cấu hình…) và dựng lại từ dữ liệu mẫu. Sau đó đăng xuất.</p>
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
  protected readonly fileNguon = FILE_NGUON;

  private readonly qp = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  private readonly tabs = computed<Tab[]>(() => {
    const out: Tab[] = [];
    if (this.store.canView('cauHinh')) out.push('tham-so');
    if (this.store.canView('import')) out.push('import');
    if (this.store.isGD()) out.push('du-lieu');
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
  protected readonly suaTS = computed(() => this.store.isGD() && this.store.canEdit('cauHinh'));
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

  // ── Import (NT-13) ──
  protected readonly demImport = computed(() => {
    const d = this.store.db();
    const c = (nhan: string, arr: readonly { import?: boolean }[]) => ({ nhan, n: arr.filter((x) => x.import).length, tong: arr.length });
    return [c('HĐ bán', d.hopDongBan), c('HĐ mua', d.hopDongMua), c('HĐ Phú Tài', d.hopDongPhuTai), c('Phiếu thu chi', d.phieuThuChi)];
  });

  // ── Dữ liệu trên máy ──
  protected readonly demBang = computed(() => {
    const d = this.store.db();
    return BANG.map((b) => ({ nhan: b.nhan, n: (d[b.k] as readonly unknown[]).length }));
  });
  protected readonly tongBanGhi = computed(() => this.demBang().reduce((s, b) => s + b.n, 0));

  protected xuat(): void {
    downloadFile(fileName('app-oxy-ban-sao', 'json'), 'application/json', JSON.stringify(this.store.db()));
    this.store.say('Đã xuất bản sao dữ liệu');
  }

  protected async napLai(): Promise<void> {
    if (!this.store.isGD()) return;
    const go = await this.confirm.prompt({
      title: 'Xoá toàn bộ dữ liệu trên máy này và nạp lại dữ liệu mẫu?',
      message: 'Mọi hợp đồng, phiếu, chi phí, tài khoản, cấu hình đã nhập trên máy này mất hẳn — không hoàn tác được. Nên "Xuất bản sao (JSON)" trước.',
      warn: 'Sau khi nạp lại bạn bị đăng xuất.',
      label: 'Gõ NẠP LẠI để xác nhận',
      placeholder: 'NẠP LẠI',
      minLength: 7,
      ok: 'Xoá & nạp lại',
    });
    if (go === null) return;
    if (fold(go).replace(/\s+/g, ' ') !== 'nap lai') return this.store.say('Chưa gõ đúng "NẠP LẠI" — không thay đổi gì');
    await this.store.resetToSeed();
    this.store.say('Đã nạp lại dữ liệu mẫu');
    this.auth.logout();
  }
}
