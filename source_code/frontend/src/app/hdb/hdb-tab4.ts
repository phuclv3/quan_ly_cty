import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { TT, ttNhan } from '../core/trang-thai';
import { HopDongBan, LCP_VAN_CHUYEN } from '../core/models';
import { hdbBuocLoiNhuan, hdbCalc } from '../core/calc';
import { money, moneyInWords, sum, todayIso, viDate } from '../core/util';
import { BuocTable, Modal, TrangThai } from '../shared/ui-kit';
import { Icon } from '../shared/icon';

/** HDB-11 — Tab 4 Chi phí thực hiện & Lợi nhuận gộp tạm tính; Quyết toán vận chuyển (KT-16). */
@Component({
  selector: 'app-hdb-tab4',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, BuocTable, Modal, TrangThai, Icon],
  styles: [
    `@media print { :host-context(body.in-qt) > :not(app-modal) { display: none !important; } }
     .ky { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; text-align: center; margin-top: 28px; }
     .ky span { display: block; margin-top: 64px; color: var(--ink-3); font-size: 14px; }`,
  ],
  template: `
    <div>
      <section class="card blk xanh">
        <div class="section-title">
          <h2>Chi phí thực hiện HĐ</h2>
          <div class="btn-row">
            <button type="button" class="btn sm quiet" (click)="qt.set(true)"><app-icon name="truck" [size]="15" /> Quyết toán vận chuyển</button>
            @if (nhapDuoc()) {
              <a class="btn sm quiet" routerLink="/ke-toan" [queryParams]="{ tab: 'chi-phi', hdb: h().id }">Nhập chi phí ở Kế toán ›</a>
            }
          </div>
        </div>
        <div class="tbl-wrap">
          <table class="tbl compact">
            <thead><tr><th>Ngày</th><th>Mã CP</th><th>Loại</th><th>Nội dung</th><th class="num">Số tiền</th><th>Trạng thái</th></tr></thead>
            <tbody>
              @for (x of cps(); track x.id) {
                <tr [class.click]="xemCP()" (click)="moCP(x.id)">
                  <td>{{ viDate(x.ngay) }}</td>
                  <td>@if (xemCP()) { <a class="linkish" routerLink="/ke-toan" [queryParams]="{ tab: 'chi-phi', id: x.id }" (click)="$event.stopPropagation()">{{ x.maCP }}</a> } @else { {{ x.maCP }} }</td>
                  <td>{{ store.lcpTen(x.loaiChiPhi) }}</td>
                  <td>{{ x.noiDung }}</td><td class="num">{{ money(x.soTien) }}</td><td><app-tt [v]="x.trangThai" /></td>
                </tr>
              } @empty {
                <tr><td colspan="6" class="muted">Chưa có chi phí thực hiện</td></tr>
              }
            </tbody>
            <tfoot>
              <tr><th colspan="4">Tổng chi phí đã duyệt</th><td class="num">{{ money(c().cpDuyet) }}</td><td></td></tr>
              @if (c().cpCho > 0) { <tr><th colspan="4">Đang chờ duyệt</th><td class="num">{{ money(c().cpCho) }}</td><td></td></tr> }
            </tfoot>
          </table>
        </div>
      </section>

      <section class="card blk duong">
        <h2 class="section-title">Lợi nhuận gộp tạm tính</h2>
        <app-buoc [rows]="buoc()" />
      </section>
    </div>

    <app-modal [open]="qt()" title="Quyết toán vận chuyển" [sub]="'HĐ bán ' + h().soHD" size="lg" (closed)="qt.set(false)">
      <div>
        <h2 style="text-align:center;margin:0 0 4px">QUYẾT TOÁN CHI PHÍ VẬN CHUYỂN</h2>
        <p style="text-align:center" class="sub">HĐ bán số {{ h().soHD }} — {{ h().tenKH }} · Ngày lập {{ viDate(today) }}</p>
        <table class="tbl compact">
          <thead><tr><th>#</th><th>Ngày</th><th>Nội dung</th><th>Đơn vị vận chuyển</th><th class="num">Số tiền</th><th>Trạng thái</th></tr></thead>
          <tbody>
            @for (x of vanChuyen(); track x.id; let i = $index) {
              <tr><td>{{ i + 1 }}</td><td>{{ viDate(x.ngay) }}</td><td>{{ x.noiDung }}</td><td>{{ x.donViVanChuyen || '—' }}</td><td class="num">{{ money(x.soTien) }}</td><td>{{ ttNhan(x.trangThai) }}</td></tr>
            } @empty {
              <tr><td colspan="6" class="muted">Chưa có chi phí vận chuyển</td></tr>
            }
          </tbody>
          <tfoot>
            <tr><th colspan="4">Tổng (đã duyệt)</th><td class="num"><b>{{ money(tongVC()) }}</b></td><td></td></tr>
          </tfoot>
        </table>
        <p>Bằng chữ: <i>{{ chu(tongVC()) }}</i></p>
        <div class="ky"><div><b>Người lập</b><span>(Ký, ghi rõ họ tên)</span></div><div><b>Kế toán</b><span>(Ký, ghi rõ họ tên)</span></div><div><b>Giám đốc</b><span>(Ký, ghi rõ họ tên)</span></div></div>
      </div>
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="qt.set(false)">Đóng</button>
        <button type="button" class="btn" (click)="inQT()"><app-icon name="print" [size]="16" /> In</button>
      </div>
    </app-modal>
  `,
})
export class HdbTab4 {
  protected readonly store = inject(Store);
  protected readonly TT = TT;
  protected readonly ttNhan = ttNhan;
  readonly h = input.required<HopDongBan>();

  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly chu = moneyInWords;
  protected readonly today = todayIso();
  protected readonly qt = signal(false);

  private readonly router = inject(Router);
  protected readonly c = computed(() => hdbCalc(this.h(), this.store.db()));
  /** Chỉ hiện lối nhập chi phí khi có quyền KT-12 cho HĐ này và HĐ còn mở, từ Hiệu lực trở đi. */
  protected readonly nhapDuoc = computed(() => {
    const h = this.h();
    return this.store.canEdit('cpHD', h.sale) && h.trangThai !== TT.BAO_GIA && !this.store.hdbKhoa(h);
  });
  protected readonly xemCP = computed(() => this.store.canView('cpHD'));
  protected moCP(id: string): void {
    if (this.xemCP()) void this.router.navigate(['/ke-toan'], { queryParams: { tab: 'chi-phi', id } });
  }
  protected readonly buoc = computed(() => hdbBuocLoiNhuan(this.h(), this.c()));
  protected readonly cps = computed(() =>
    this.store
      .chiPhiHD()
      .filter((x) => x.hdbId === this.h().id)
      .sort((a, b) => (a.ngay < b.ngay ? 1 : -1)),
  );
  protected readonly vanChuyen = computed(() =>
    this.cps().filter((x) => x.loaiChiPhi === LCP_VAN_CHUYEN && x.trangThai !== TT.TU_CHOI && x.trangThai !== TT.NHAP),
  );
  protected readonly tongVC = computed(() => sum(this.vanChuyen().filter((x) => x.trangThai === TT.DA_DUYET), (x) => x.soTien));

  /** In riêng khối quyết toán: ẩn phần còn lại của trang khi in. */
  protected inQT(): void {
    const b = document.body;
    b.classList.add('in-qt');
    const xong = () => {
      b.classList.remove('in-qt');
      window.removeEventListener('afterprint', xong);
    };
    window.addEventListener('afterprint', xong);
    window.print();
  }
}
