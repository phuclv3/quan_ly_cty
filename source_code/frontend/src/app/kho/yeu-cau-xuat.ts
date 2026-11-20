import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { loKhopTenHang, tonTai } from '../core/calc';
import { YeuCauXuatKho } from '../core/models';
import { Store } from '../core/store';
import { TT, ttNhan } from '../core/trang-thai';
import { nhoLoc } from '../core/ui';
import { num, sum, todayIso, viDate } from '../core/util';
import { Confirm } from '../shared/confirm';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel } from '../shared/filter-bar';
import { Pager, paginate } from '../shared/pager';
import { Modal, TrangThai } from '../shared/ui-kit';
import { linkPhieuKho } from './kho-util';

const TT_OPTS = [TT.CHO_KHO, TT.DA_XUAT_KHO, TT.DA_GIAO_HANG, TT.TU_CHOI, TT.DA_RUT].map((v) => ({ value: v, label: ttNhan(v) }));

/** Một dòng trong popup Xuất kho: SL yêu cầu, SL xuất (sửa được, ≤ yêu cầu). */
interface DongXuatYC {
  loaiHang: string;
  tenTrenHD: string;
  yeuCau: number;
  soLuong: number;
  phuKien?: boolean;
}

/**
 * Yêu cầu xuất kho và giao hàng (từ HĐ bán): thủ kho kiểm đủ hàng / đúng mã / đúng nồng độ rồi Xuất kho (sinh phiếu Xuất)
 * hoặc Từ chối; xuất xong thì cập nhật ngày giao → Đã giao hàng.
 */
@Component({
  selector: 'app-kho-yeu-cau-xuat',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FilterBar, Pager, TrangThai, RouterLink, Modal],
  styles: [`.yc-tbl td { vertical-align: top; } .yc-tbl td > input { width: 100%; height: 40px; }`],
  template: `
    <div class="note info">
      <span>Sale / người phụ trách HĐ bán gửi yêu cầu từ <b>HĐ bán → Giao hàng</b>. Thủ kho <b>kiểm tra đủ hàng và đúng mã</b> rồi bấm <b>Xuất kho</b> (sinh phiếu Xuất, trừ theo lô) hoặc <b>Từ chối</b> kèm lý do.
      Sau khi giao, bấm <b>Cập nhật ngày giao</b> → Đã giao hàng.</span>
    </div>
    <div class="section-title">
      <span class="sub">{{ rows().length }} yêu cầu · {{ choKho() }} đang chờ kho</span>
    </div>
    <app-filter [(loc)]="loc" memo="kho-yeu-cau-xuat" [time]="false" [facets]="facets" placeholder="Tìm số yêu cầu, HĐ bán, khách hàng, mã hàng…" />
    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead><tr><th>Số YC</th><th>Ngày gửi</th><th>HĐ bán</th><th>Người gửi</th><th>Hàng yêu cầu</th><th>Trạng thái</th><th>Xuất kho / giao hàng</th><th></th></tr></thead>
        <tbody>
          @for (y of pg.items(); track y.id) {
            <tr>
              <td><b>{{ y.soYC }}</b></td>
              <td>{{ viDate(y.ngayGui) }}</td>
              <td><a [routerLink]="['/hop-dong-ban', y.hdbId]">{{ store.hdbById(y.hdbId)?.soHD || '(chưa có số)' }}</a> <span class="sub">{{ store.hdbById(y.hdbId)?.tenKH }}</span></td>
              <td>{{ store.userName(y.nguoiGui) }}</td>
              <td class="sub">
                @for (d of y.dong; track $index) {
                  <div><b>{{ d.loaiHang }}</b>@if (d.phuKien) { <span class="tag">Phụ kiện</span> }@if (d.tenTrenHD) { ({{ d.tenTrenHD }}) } × {{ num(d.soLuong) }}@if (y.trangThai === TT.CHO_KHO) { · tồn {{ num(tonMa(d.loaiHang)) }} }</div>
                }
                @if (y.ghiChu) { <div class="muted">{{ y.ghiChu }}</div> }
              </td>
              <td>
                <app-tt [v]="y.trangThai" />
                @if (y.lyDoTuChoi) { <div class="sub">Lý do: {{ y.lyDoTuChoi }}</div> }
              </td>
              <td class="sub">
                @if (phieuCua(y); as p) {
                  <div>Phiếu <a routerLink="/kho" [queryParams]="link(p)"><b>{{ p.soPhieu }}</b></a> · {{ store.khoTen(p.kho) }} · {{ viDate(y.ngayXuat) }}</div>
                }
                @if (y.ngayGiao) { <div>Giao ngày {{ viDate(y.ngayGiao) }}</div> }
              </td>
              <td>
                @if (store.canEdit('khoPhieuTay')) {
                  <div class="btn-row">
                    @if (y.trangThai === TT.CHO_KHO) {
                      <button type="button" class="btn sm" (click)="moXuat(y)">Kiểm tra &amp; xuất kho</button>
                      <button type="button" class="btn sm quiet" (click)="tuChoi(y)">Từ chối</button>
                    }
                    @if (y.trangThai === TT.DA_XUAT_KHO) {
                      <button type="button" class="btn sm" (click)="moGiao(y)">Cập nhật ngày giao</button>
                    }
                  </div>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="8" class="empty">Chưa có yêu cầu xuất kho</td></tr>
          }
        </tbody>
      </table>
    </div>
    <app-pager [pager]="pg" />

    <app-modal [open]="!!xuat()" [title]="'Xuất kho theo yêu cầu ' + (xuat()?.soYC ?? '')" [sub]="hdTen()" size="lg" [dirty]="false" (closed)="xuat.set(null)">
      <div class="form-grid blk xanh">
        <h3 class="blk-t">Thông tin xuất kho</h3>
        <div class="field">
          <label for="yc-ngay">Ngày xuất <span class="req">*</span></label>
          <input id="yc-ngay" type="date" [value]="ngay()" (input)="ngay.set($any($event.target).value)" />
        </div>
        <div class="field">
          <label for="yc-kho">Vị trí kho <span class="req">*</span></label>
          <select id="yc-kho" (change)="doiKho($any($event.target).value)">
            @for (k of store.khoDangDung(); track k.id) {
              <option [value]="k.id" [selected]="k.id === kho()">{{ k.ten }}</option>
            }
          </select>
        </div>
        <div class="field wide">
          <label for="yc-gc">Ghi chú</label>
          <textarea id="yc-gc" rows="2" [value]="ghiChu()" (input)="ghiChu.set($any($event.target).value)"></textarea>
        </div>
      </div>
      <p class="note info">Kiểm tra từng dòng: <b>đủ hàng</b> và <b>đúng mã / nồng độ</b> mới xuất. Dòng thiếu thì giảm SL xuất về phần đủ (hoặc để 0) — phần chưa xuất sale gửi yêu cầu mới; hoặc bấm <b>Từ chối</b> ở danh sách.</p>
      <div class="tbl-wrap">
        <table class="tbl compact yc-tbl">
          <thead><tr><th>Mã hàng</th><th class="num">SL yêu cầu</th><th class="num">Tồn tại kho</th><th>Kiểm tra</th><th class="num w-sm">SL xuất</th></tr></thead>
          <tbody>
            @for (r of kiemTra(); track $index; let i = $index) {
              <tr>
                <td><b>{{ r.d.loaiHang }}</b>@if (r.d.phuKien) { <span class="tag">Phụ kiện</span> }<div class="sub">{{ store.loaiHangTen(r.d.loaiHang) }}@if (r.d.tenTrenHD) { · tên HĐ: {{ r.d.tenTrenHD }} }</div></td>
                <td class="num">{{ num(r.d.yeuCau) }}</td>
                <td class="num">{{ num(r.ton) }}@if (r.tonDung !== r.ton) { <div class="sub">đúng nồng độ: {{ num(r.tonDung) }}</div> }</td>
                <td>
                  @if (r.ketQua === 'du') { <span class="tag ok">✓ Đủ hàng, đúng mã</span> }
                  @else if (r.ketQua === 'nongdo') { <span class="tag bad" title="Có hàng cùng mã nhưng không có lô đúng nồng độ / tên hàng trên HĐ">✗ Khác nồng độ</span> }
                  @else { <span class="tag bad">✗ Thiếu {{ num(r.d.yeuCau - r.tonDung) }}</span> }
                </td>
                <td><input class="num" type="number" min="0" [attr.max]="r.d.yeuCau" [value]="r.d.soLuong" (input)="setSL(i, +$any($event.target).value || 0)" aria-label="Số lượng xuất" /></td>
              </tr>
            }
          </tbody>
        </table>
      </div>
      @if (loiXuat()) { <p class="note bad">{{ loiXuat() }}</p> }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="xuat.set(null)">Huỷ</button>
        <button type="button" class="btn" (click)="xacNhanXuat()">Xác nhận — sinh phiếu Xuất kho</button>
      </div>
    </app-modal>

    <app-modal [open]="!!giao()" [title]="'Cập nhật ngày giao — ' + (giao()?.soYC ?? '')" [sub]="hdTen()" size="sm" [dirty]="false" (closed)="giao.set(null)">
      <div class="form-grid">
        <div class="field wide">
          <label for="yc-giao">Ngày giao hàng <span class="req">*</span></label>
          <input id="yc-giao" type="date" [attr.min]="giao()?.ngayXuat" [attr.max]="homNay" [value]="ngayGiao()" (input)="ngayGiao.set($any($event.target).value)" />
          <span class="hint">Không trước ngày xuất kho ({{ viDate(giao()?.ngayXuat) }}), không sau hôm nay.</span>
        </div>
      </div>
      @if (loiGiao()) { <p class="note bad">{{ loiGiao() }}</p> }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="giao.set(null)">Huỷ</button>
        <button type="button" class="btn" (click)="xacNhanGiao()">Lưu — Đã giao hàng</button>
      </div>
    </app-modal>
  `,
})
export class YeuCauXuatTab {
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  protected readonly TT = TT;
  protected readonly viDate = viDate;
  protected readonly num = num;
  protected readonly link = linkPhieuKho;
  protected readonly homNay = todayIso();
  protected readonly loc = signal<Loc>(nhoLoc('kho-yeu-cau-xuat', LOC_RONG));
  protected readonly facets: Facet[] = [{ key: 'tt', label: 'Trạng thái', options: TT_OPTS }];

  protected readonly rows = computed(() => {
    const l = this.loc();
    const uuTien = (y: YeuCauXuatKho) => (y.trangThai === TT.CHO_KHO ? 0 : y.trangThai === TT.DA_XUAT_KHO ? 1 : 2);
    return [...this.store.yeuCauXuatKho()]
      .filter(
        (y) =>
          khopSel(l, 'tt', y.trangThai) &&
          khopQ(l, y.soYC, this.store.hdbById(y.hdbId)?.soHD, this.store.hdbById(y.hdbId)?.tenKH, ...y.dong.map((d) => `${d.loaiHang} ${d.tenTrenHD ?? ''}`)),
      )
      .sort((a, b) => uuTien(a) - uuTien(b) || (a.soYC < b.soYC ? 1 : -1));
  });
  protected readonly pg = paginate(this.rows);
  protected readonly choKho = computed(() => this.store.yeuCauXuatKho().filter((y) => y.trangThai === TT.CHO_KHO).length);

  protected tonMa(lh: string): number {
    return tonTai(this.store.db(), lh);
  }
  protected phieuCua(y: YeuCauXuatKho) {
    return y.phieuId ? this.store.phieuKho().find((p) => p.id === y.phieuId) : undefined;
  }
  protected hdTen(): string {
    const y = this.xuat() ?? this.giao();
    const h = y ? this.store.hdbById(y.hdbId) : undefined;
    return h ? `HĐ ${h.soHD || '(chưa có số)'} · ${h.tenKH}` : '';
  }

  // ── Xuất kho ──
  protected readonly xuat = signal<YeuCauXuatKho | null>(null);
  protected readonly ngay = signal(todayIso());
  protected readonly kho = signal('');
  protected readonly ghiChu = signal('');
  protected readonly dong = signal<DongXuatYC[]>([]);

  /** Kiểm tra từng dòng theo kho đang chọn: đủ / khác nồng độ / thiếu. */
  protected readonly kiemTra = computed(() => {
    const db = this.store.db();
    const kho = this.kho();
    return this.dong().map((d) => {
      const ton = tonTai(db, d.loaiHang, kho);
      const lo = loKhopTenHang(db, d.loaiHang, d.tenTrenHD);
      const tonDung = lo ? sum(lo.filter((l) => l.kho === kho), (l) => l.ton) : ton;
      const ketQua: 'du' | 'nongdo' | 'thieu' = tonDung >= d.yeuCau ? 'du' : ton >= d.yeuCau ? 'nongdo' : 'thieu';
      return { d, ton, tonDung, ketQua };
    });
  });
  protected readonly loiXuat = computed(() => {
    const y = this.xuat();
    if (!y || !this.kho()) return '';
    const ds = this.dong().filter((d) => d.soLuong > 0);
    if (!ds.length) return '';
    return this.store.loiXuat(this.kho(), y.hdbId, ds.map((d) => ({ loaiHang: d.loaiHang, soLuong: d.soLuong, tenTrenHD: d.tenTrenHD, phuKien: d.phuKien })), this.ngay()) ?? '';
  });

  private lapDong(y: YeuCauXuatKho, kho: string): DongXuatYC[] {
    const db = this.store.db();
    return y.dong.map((d) => {
      const ton = tonTai(db, d.loaiHang, kho);
      const lo = loKhopTenHang(db, d.loaiHang, d.tenTrenHD ?? '');
      const tonDung = lo ? sum(lo.filter((l) => l.kho === kho), (l) => l.ton) : ton;
      return { loaiHang: d.loaiHang, tenTrenHD: d.tenTrenHD ?? '', yeuCau: d.soLuong, soLuong: Math.max(0, Math.min(d.soLuong, tonDung)), phuKien: d.phuKien };
    });
  }

  protected moXuat(y: YeuCauXuatKho): void {
    // Mặc định kho đáp ứng được nhiều hàng của yêu cầu nhất.
    const db = this.store.db();
    const diem = (kho: string) => sum(y.dong, (d) => Math.min(d.soLuong, Math.max(tonTai(db, d.loaiHang, kho), 0)));
    const tot = [...this.store.khoDangDung()].sort((a, b) => diem(b.id) - diem(a.id))[0];
    this.kho.set(tot?.id ?? '');
    this.dong.set(this.lapDong(y, this.kho()));
    this.ngay.set(todayIso());
    this.ghiChu.set('');
    this.xuat.set(y);
  }
  protected doiKho(v: string): void {
    const y = this.xuat();
    this.kho.set(v);
    if (y) this.dong.set(this.lapDong(y, v));
  }
  protected setSL(i: number, sl: number): void {
    this.dong.update((arr) => arr.map((d, j) => (j === i ? { ...d, soLuong: sl } : d)));
  }
  protected xacNhanXuat(): void {
    const y = this.xuat();
    if (!y) return;
    if (!this.ngay()) return this.store.say('Chưa nhập Ngày xuất');
    const err = this.store.xuatKhoYeuCau(y.id, {
      ngay: this.ngay(),
      kho: this.kho(),
      dong: this.dong().filter((d) => d.soLuong > 0).map((d) => ({ loaiHang: d.loaiHang, soLuong: d.soLuong, tenTrenHD: d.tenTrenHD, phuKien: d.phuKien })),
      ghiChu: this.ghiChu().trim() || undefined,
    });
    if (err) return this.store.say(err);
    this.xuat.set(null);
    this.store.say(`Đã xuất kho theo yêu cầu ${y.soYC} — đã sinh phiếu Xuất (trừ theo lô)`);
  }

  protected async tuChoi(y: YeuCauXuatKho): Promise<void> {
    const ly = await this.confirm.prompt({ title: `Từ chối yêu cầu ${y.soYC}?`, label: 'Lý do từ chối (sale sẽ thấy ở HĐ bán)', minLength: 3, ok: 'Từ chối' });
    if (ly === null) return;
    const e = this.store.tuChoiYeuCau(y.id, ly);
    this.store.say(e ?? `Đã từ chối yêu cầu ${y.soYC}`);
  }

  // ── Ngày giao ──
  protected readonly giao = signal<YeuCauXuatKho | null>(null);
  protected readonly ngayGiao = signal(todayIso());
  protected readonly loiGiao = signal('');

  protected moGiao(y: YeuCauXuatKho): void {
    this.ngayGiao.set(todayIso());
    this.loiGiao.set('');
    this.giao.set(y);
  }
  protected xacNhanGiao(): void {
    const y = this.giao();
    if (!y) return;
    const err = this.store.capNhatNgayGiao(y.id, this.ngayGiao());
    if (err) return this.loiGiao.set(err);
    this.giao.set(null);
    this.store.say(`Yêu cầu ${y.soYC} đã giao hàng ngày ${viDate(this.ngayGiao())}`);
  }
}
