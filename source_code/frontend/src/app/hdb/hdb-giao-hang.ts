import { ChangeDetectionStrategy, Component, computed, inject, input, signal, viewChild } from '@angular/core';
import { Store } from '../core/store';
import { TT } from '../core/trang-thai';
import { HopDongBan, KHO_CHUYEN_THANG, PhieuKho } from '../core/models';
import { DongLo, dongMuaChoHdb, hdmChoHdb, loConHang, tonTai, tongSL } from '../core/calc';
import { num, todayIso, viDate } from '../core/util';
import { Confirm } from '../shared/confirm';
import { guiXoa } from '../shared/ho-so';
import { Modal, Pick, PickOption, TrangThai } from '../shared/ui-kit';
import { Icon } from '../shared/icon';
import { RouterLink } from '@angular/router';
import { linkPhieuKho, maHangOpts } from '../kho/kho-util';

/** Dòng giao: mã hàng → lô (bỏ trống = trừ lô nhập trước), SL, tên ghi trên HĐ. */
interface DongNhap {
  loaiHang: string;
  lo: string;
  soLuong: number;
  tenTrenHD: string;
}

const dongRong = (): DongNhap => ({ loaiHang: '', lo: '', soLuong: 0, tenTrenHD: '' });

/** HDB-04 — khu Giao hàng ở Tab 1: các lần giao (phiếu XK) + popup Ghi nhận giao hàng. */
@Component({
  selector: 'app-hdb-giao-hang',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, Pick, TrangThai, Icon, RouterLink],
  template: `
    <section class="card">
      <div class="section-title">
        <h2>Giao hàng <small class="sub">Có hàng trong kho → phiếu xuất kho → giao (ngày giao = ngày phiếu)</small></h2>
        @if (coTheGiao()) {
          <button type="button" class="btn sm" (click)="mo()"><app-icon name="truck" [size]="16" /> Ghi nhận giao hàng</button>
        }
      </div>
      @if (h().trangThai === TT.BAO_GIA) { <p class="sub">HĐ chưa Hiệu lực — chưa ghi nhận giao hàng được.</p> }
      <div class="tbl-wrap">
        <table class="tbl compact">
          <thead><tr><th>Ngày</th><th>Số phiếu XK</th><th>Kho</th><th>Hàng</th><th class="num">SL</th><th>Trạng thái</th><th></th></tr></thead>
          <tbody>
            @for (p of phieus(); track p.id) {
              <tr>
                <td>{{ viDate(p.ngay) }}</td>
                <td>@if (store.canView('khoTon')) { <a routerLink="/kho" [queryParams]="link(p)"><b>{{ p.soPhieu }}</b></a> } @else { <b>{{ p.soPhieu }}</b> }</td>
                <td>{{ store.khoTen(p.kho) }}</td>
                <td class="sub">{{ moTaDong(p) }}</td>
                <td class="num">{{ num(tongSL(p)) }}</td>
                <td>
                  <app-tt [v]="p.trangThai" />
                  @if (store.dangChoXoa('PhieuKho', p.id)) { <app-tt v="Chờ xoá" /> }
                </td>
                <td>
                  @if (coTheGiao() && p.trangThai === TT.HIEU_LUC && !store.dangChoXoa('PhieuKho', p.id)) {
                    <button type="button" class="btn sm quiet" (click)="huy(p)">Huỷ lần giao</button>
                  }
                </td>
              </tr>
            } @empty {
              <tr><td colspan="7" class="muted">Chưa có lần giao nào</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    <app-modal #mGH [open]="open()" title="Ghi nhận giao hàng" [sub]="'HĐ ' + h().soHD" size="lg" [dirty]="dirty()" (closed)="open.set(false)">
      <div class="form-grid">
        <div class="field">
          <label for="gh-ngay">Ngày giao <span class="req">*</span></label>
          <input id="gh-ngay" type="date" [value]="ngay()" (input)="ngay.set($any($event.target).value)" />
        </div>
        <div class="field">
          <label for="gh-kho">Vị trí kho <span class="req">*</span></label>
          <select id="gh-kho" (change)="doiKho($any($event.target).value)">
            @for (k of store.khoDangDung(); track k.id) {
              <option [value]="k.id" [selected]="k.id === kho()">{{ k.id === KHO_CT ? k.ten + ' — không qua kho' : k.ten }}</option>
            }
          </select>
        </div>
        <div class="field wide">
          <label for="gh-gc">Ghi chú</label>
          <input id="gh-gc" [value]="ghiChu()" (input)="ghiChu.set($any($event.target).value)" />
        </div>
      </div>
      @if (goiY()) { <p class="note info">Đã gợi ý sẵn các dòng {{ h().dongHang?.length ? 'sản phẩm của HĐ' : 'từ HĐ Mua liên quan' }} (trừ phần đã giao) — chỉ những dòng kho còn hàng. Sửa / xoá dòng nếu cần.</p> }
      @if (chuaCoHang().length) {
        <p class="note warn">Chưa có trong kho: {{ chuaCoHang().join('; ') }} → cần đề nghị cấp vật tư → mua hàng → nhập kho rồi mới giao (Tab 3 / Tab 5).</p>
      }
      <div class="tbl-wrap">
      <table class="tbl compact">
        <thead><tr><th style="width:34%">Mã hàng</th><th>Lô</th><th class="num w-sm">Số lượng</th><th>Tên hàng trên HĐ</th><th style="width:40px"></th></tr></thead>
        <tbody>
          @for (d of dong(); track $index; let i = $index) {
            <tr>
              <td>
                <app-pick [options]="lhOpts()" [value]="d.loaiHang" (valueChange)="setDong(i, { loaiHang: $event, lo: '' })" />
                @if (d.loaiHang && kho() !== KHO_CT) { <span class="hint" [class.neg]="ton(d.loaiHang) < d.soLuong">Tồn tại kho: {{ num(ton(d.loaiHang)) }}</span> }
              </td>
              <td>
                @if (kho() === KHO_CT) { <span class="muted">Không theo lô</span> } @else {
                  <select (change)="setDong(i, { lo: $any($event.target).value })" aria-label="Lô" [disabled]="!d.loaiHang">
                    <option value="" [selected]="!d.lo">Tự chọn lô nhập trước</option>
                    @for (l of lots(d.loaiHang); track l.lo) {
                      <option [value]="l.lo" [selected]="l.lo === d.lo">{{ l.lo }} · tồn {{ l.ton }}{{ l.quyCach ? ' · ' + l.quyCach.slice(0, 40) : '' }}</option>
                    }
                  </select>
                }
              </td>
              <td><input class="num" type="number" min="0" [value]="d.soLuong" (input)="setDong(i, { soLuong: +$any($event.target).value || 0 })" /></td>
              <td><input [value]="d.tenTrenHD" placeholder="VD Bình khí chuẩn NO2 200ppm" (input)="setDong(i, { tenTrenHD: $any($event.target).value })" /></td>
              <td><button type="button" class="icon-btn sm" aria-label="Xoá dòng" (click)="xoaDong(i)"><app-icon name="trash" [size]="16" /></button></td>
            </tr>
          }
        </tbody>
      </table>
      </div>
      <button type="button" class="btn sm quiet" (click)="themDong()"><app-icon name="plus" [size]="16" /> Thêm dòng</button>
      @if (loi()) {
        <p class="note bad">{{ loi() }}</p>
      }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="open.set(false)">Huỷ</button>
        <button type="button" class="btn" (click)="xacNhan()">Xác nhận — sinh phiếu Xuất kho</button>
      </div>
    </app-modal>
  `,
})
export class HdbGiaoHang {
  private readonly mGH = viewChild<Modal>('mGH');
  protected readonly store = inject(Store);
  protected readonly TT = TT;
  private readonly confirm = inject(Confirm);
  readonly h = input.required<HopDongBan>();
  /** Đã khoá (tất toán / chờ xoá). */
  readonly khoa = input(false);

  protected readonly viDate = viDate;
  protected readonly num = num;
  protected readonly tongSL = tongSL;
  protected readonly KHO_CT = KHO_CHUYEN_THANG;

  protected readonly open = signal(false);
  protected readonly ngay = signal(todayIso());
  protected readonly kho = signal('');
  protected readonly ghiChu = signal('');
  protected readonly dong = signal<DongNhap[]>([]);
  protected readonly goiY = signal(false);
  protected readonly chuaCoHang = signal<string[]>([]);
  private readonly goc = signal('');
  private readonly anh = computed(() => JSON.stringify([this.ngay(), this.kho(), this.ghiChu(), this.dong()]));
  protected readonly dirty = computed(() => this.open() && this.anh() !== this.goc());

  protected readonly coTheGiao = computed(
    () => !this.khoa() && this.h().trangThai !== TT.BAO_GIA && this.h().trangThai !== TT.HOAN_THANH && this.store.canEdit('hdbGiaoHang', this.h().sale),
  );
  protected readonly phieus = computed(() =>
    this.store
      .phieuKho()
      .filter((p) => p.loai === 'Xuất' && p.hdId === this.h().id)
      .sort((a, b) => (a.ngay < b.ngay ? 1 : -1)),
  );
  protected readonly lhOpts = computed<PickOption[]>(() => maHangOpts(this.store.loaiHang().filter((l) => l.dangDung)));
  /** Xuất quá tồn lô / thiếu tồn → báo ngay, xác nhận sẽ bị chặn. */
  protected readonly loi = computed(() =>
    this.open() ? (this.store.loiXuat(this.kho(), this.h().id, this.dong().map((d) => ({ ...d, lo: d.lo || undefined })), this.ngay()) ?? '') : '',
  );

  protected readonly link = linkPhieuKho;

  protected moTaDong(p: PhieuKho): string {
    return p.dong.map((d) => `${d.loaiHang}${d.lo ? ' (lô ' + d.lo + ')' : ''} × ${num(d.soLuong)}`).join('; ');
  }

  protected ton(lh: string): number {
    return tonTai(this.store.db(), lh, this.kho());
  }
  protected lots(lh: string): DongLo[] {
    return lh ? loConHang(this.store.db(), lh, this.kho()).filter((l) => l.ngay <= this.ngay()) : [];
  }

  /** SL còn phải giao theo mã: dòng sản phẩm của HĐ bán; chưa có thì theo HĐ mua liên quan như trước. */
  private conPhaiGiao(): { loaiHang: string; con: number; tenHang: string }[] {
    const id = this.h().id;
    const daGiao = new Map<string, number>();
    for (const p of this.phieus()) {
      if (p.trangThai !== TT.HIEU_LUC) continue;
      for (const d of p.dong) daGiao.set(d.loaiHang, (daGiao.get(d.loaiHang) ?? 0) + d.soLuong);
    }
    const can = this.h().dongHang?.length
      ? this.h().dongHang!
      : this.store.hopDongMua().filter((m) => m.trangThai !== TT.HUY && hdmChoHdb(m, id)).flatMap((m) => dongMuaChoHdb(m, id));
    const out: { loaiHang: string; con: number; tenHang: string }[] = [];
    for (const d of can) {
      if (!d.loaiHang) continue;
      const tru = Math.min(daGiao.get(d.loaiHang) ?? 0, d.soLuong);
      daGiao.set(d.loaiHang, (daGiao.get(d.loaiHang) ?? 0) - tru);
      if (d.soLuong - tru > 0) out.push({ loaiHang: d.loaiHang, con: d.soLuong - tru, tenHang: d.tenHang });
    }
    return out;
  }

  /** Gợi ý dòng giao theo tồn của kho đang chọn: có hàng → dòng xuất; thiếu → báo cần đề nghị cấp vật tư. */
  private lapGoiY(): void {
    const kho = this.kho();
    const db = this.store.db();
    const goiY: DongNhap[] = [];
    const thieu: string[] = [];
    for (const r of this.conPhaiGiao()) {
      const ton = kho === KHO_CHUYEN_THANG ? r.con : tonTai(db, r.loaiHang, kho);
      if (ton > 0) goiY.push({ ...dongRong(), loaiHang: r.loaiHang, soLuong: Math.min(r.con, ton), tenTrenHD: r.tenHang });
      if (r.con > ton) thieu.push(`${r.loaiHang} × ${r.con - Math.max(ton, 0)}`);
    }
    this.chuaCoHang.set(thieu);
    this.goiY.set(goiY.length > 0);
    this.dong.set(goiY.length ? goiY : [dongRong()]);
  }

  protected mo(): void {
    // Mặc định kho có nhiều hàng cần giao nhất (không lấy kho đầu danh sách — hàng có thể nằm ở kho khác).
    const can = this.conPhaiGiao();
    const db = this.store.db();
    const khos = this.store.khoDangDung().filter((k) => k.id !== KHO_CHUYEN_THANG);
    const diem = (kho: string) => can.reduce((s, r) => s + Math.min(r.con, Math.max(tonTai(db, r.loaiHang, kho), 0)), 0);
    const tot = [...khos].sort((a, b) => diem(b.id) - diem(a.id))[0] ?? this.store.khoDangDung()[0];
    this.kho.set(tot?.id ?? '');
    this.lapGoiY();
    this.ngay.set(todayIso());
    this.ghiChu.set('');
    this.goc.set(this.anh());
    this.open.set(true);
  }
  protected doiKho(v: string): void {
    this.kho.set(v);
    this.lapGoiY();
  }


  protected setDong(i: number, p: Partial<DongNhap>): void {
    this.dong.update((arr) => arr.map((d, j) => (j === i ? { ...d, ...p } : d)));
  }
  protected themDong(): void {
    this.dong.update((arr) => [...arr, dongRong()]);
  }
  protected xoaDong(i: number): void {
    this.dong.update((arr) => arr.filter((_, j) => j !== i));
  }

  protected xacNhan(): void {
    if (this.mGH()?.kt.hopLe() === false) return;
    if (!this.ngay()) {
      this.store.say('Chưa nhập Ngày giao');
      return;
    }
    const err = this.store.ghiNhanGiaoHang(this.h().id, {
      ngay: this.ngay(),
      kho: this.kho(),
      dong: this.dong().map((d) => ({ loaiHang: d.loaiHang, lo: d.lo || undefined, soLuong: d.soLuong, tenTrenHD: d.tenTrenHD })),
      ghiChu: this.ghiChu().trim() || undefined,
    });
    if (err) {
      this.store.say(err);
      return;
    }
    this.open.set(false);
    this.store.say('Đã ghi nhận giao hàng — đã sinh phiếu Xuất kho (trừ theo lô)');
  }

  protected async huy(p: PhieuKho): Promise<void> {
    await guiXoa(this.confirm, this.store, 'PhieuKho', p.id, `phiếu XK ${p.soPhieu} (HĐ bán ${this.h().soHD})`);
  }
}
