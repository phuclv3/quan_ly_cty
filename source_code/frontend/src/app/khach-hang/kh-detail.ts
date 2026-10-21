import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Store } from '../core/store';
import { hdbCalc } from '../core/calc';
import { CO_HOI, CoHoi, TIEP_CAN, TiepCan } from '../core/models';
import { money, viDate, viMoment } from '../core/util';
import { TrangThai } from '../shared/ui-kit';
import { Confirm } from '../shared/confirm';
import { guiXoa } from '../shared/ho-so';
import { canhBaoChuaLuu } from '../shared/unsaved';
import { Icon } from '../shared/icon';
import { KhForm } from './kh-form';

/** HDB-13 — Chi tiết khách hàng: thông tin (sửa bằng popup), nhật ký chăm sóc, HĐ bán của khách. */
@Component({
  selector: 'app-kh-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, TrangThai, Icon, KhForm],
  template: `
    @if (k(); as k) {
      <div class="page-head">
        <div>
          <div class="crumbs"><a routerLink="/">Trang chủ</a> › <a routerLink="/khach-hang">Khách hàng</a> › {{ k.id }}</div>
          <h1>
            {{ k.ten || k.id }}
            <app-tt [v]="k.coHoi || 'Chưa tiếp cận'" />
            @if (k.trangThai === 'Ngưng') { <app-tt v="Ngưng" /> }
            @if (choXoa()) { <app-tt v="Chờ xoá" /> }
          </h1>
          <p class="sub">{{ k.id }} · Phụ trách: {{ k.phuTrach ? store.userName(k.phuTrach) : 'chưa phân bổ (data thô)' }}@if (k.ngayTiepNhan) { · Tiếp nhận {{ viDate(k.ngayTiepNhan) }} }</p>
        </div>
        <div class="actions">
          @if (store.canEdit('hdb') && k.trangThai !== 'Ngưng') {
            <a class="btn quiet" routerLink="/hop-dong-ban/moi" [queryParams]="{ kh: k.id }"><app-icon name="plus" [size]="16" /> Tạo HĐ bán</a>
          }
          @if (edit()) {
            <button type="button" class="btn" (click)="sua.set(k.id)"><app-icon name="edit" [size]="16" /> Sửa</button>
            @let vuong = store.lyDoKhongXoa('DM_KhachHang', k.id);
            <button type="button" class="btn quiet danger" [disabled]="!!vuong" [attr.title]="vuong ? vuong + ' — không xoá được' : null" (click)="xoa()"><app-icon name="trash" [size]="16" /> Xoá</button>
          }
        </div>
      </div>

      @if (!edit() && !choXoa()) {
        <div class="note info" style="margin-bottom:12px">Chỉ xem — khách do {{ k.phuTrach ? store.userName(k.phuTrach) : 'người khác' }} phụ trách.</div>
      }

      <section class="card">
        <div class="form-grid cols-3 xem">
          <div class="field span-2"><span class="lbl">Tên công ty / đơn vị</span><div class="ro multi">{{ k.ten }}</div></div>
          <div class="field"><span class="lbl">Mã số thuế</span><div class="ro mono">{{ k.mst || '—' }}</div></div>
          <div class="field span-2"><span class="lbl">Địa chỉ</span><div class="ro">{{ k.diaChi || '—' }}</div></div>
          <div class="field"><span class="lbl">Tỉnh / Thành phố</span><div class="ro">{{ k.tinh || '—' }}</div></div>
          <div class="field"><span class="lbl">Người liên hệ</span><div class="ro">{{ k.nguoiLienHe || '—' }}{{ k.chucVu ? ' · ' + k.chucVu : '' }}</div></div>
          <div class="field"><span class="lbl">SĐT / Zalo</span><div class="ro">{{ k.dienThoai || '—' }}</div></div>
          <div class="field"><span class="lbl">Email</span><div class="ro">{{ k.email || '—' }}</div></div>
          <div class="field"><span class="lbl">Tiếp cận</span><div class="ro"><app-tt [v]="k.tiepCan || 'Chưa liên hệ'" /></div></div>
          <div class="field"><span class="lbl">Cơ hội</span><div class="ro"><app-tt [v]="k.coHoi || 'Chưa tiếp cận'" /></div></div>
          <div class="field"><span class="lbl">Giá trị cơ hội (chưa VAT)</span><div class="ro num">{{ k.giaTriCoHoi ? money(k.giaTriCoHoi) + ' đ' : '—' }}</div></div>
          <div class="field"><span class="lbl">Phân loại / Nguồn</span><div class="ro">{{ k.phanLoai || '—' }} · {{ k.nguon || '—' }}</div></div>
          <div class="field"><span class="lbl">Sản phẩm / Hình thức HĐ</span><div class="ro">{{ k.loaiSP || '—' }} · {{ k.hinhThucHD || '—' }}</div></div>
          <div class="field"><span class="lbl">Trạng thái data</span><div class="ro">{{ k.phuTrach ? 'Đã phân bổ' : 'Data thô' }}{{ k.ngayPhanBo ? ' · ' + viDate(k.ngayPhanBo) : '' }}</div></div>
          @if (k.ghiChu) { <div class="field span-3"><span class="lbl">Ghi chú</span><div class="ro">{{ k.ghiChu }}</div></div> }
        </div>
      </section>

      <div class="grid c2" style="margin-top:14px">
        <section class="card">
          <h2 class="section-title">Nhật ký chăm sóc</h2>
          @if (edit()) {
            <div class="form-grid cs-form">
              <div class="field full">
                <label for="cs-nd">Nội dung trao đổi / yêu cầu KT / báo giá</label>
                <textarea id="cs-nd" rows="3" [value]="csNd()" (input)="csNd.set($any($event.target).value)"></textarea>
              </div>
              <div class="field">
                <label for="cs-tc">Đổi tiếp cận</label>
                <select id="cs-tc" (change)="csTc.set($any($event.target).value)">
                  <option value="" [selected]="!csTc()">— Giữ nguyên —</option>
                  @for (o of TIEP_CAN; track o) { @if (o !== k.tiepCan) { <option [value]="o" [selected]="o === csTc()">{{ o }}</option> } }
                </select>
              </div>
              <div class="field">
                <label for="cs-ch">Đổi cơ hội</label>
                <select id="cs-ch" (change)="csCh.set($any($event.target).value)">
                  <option value="" [selected]="!csCh()">— Giữ nguyên —</option>
                  @for (o of CO_HOI; track o) { @if (o !== k.coHoi) { <option [value]="o" [selected]="o === csCh()">{{ o }}</option> } }
                </select>
              </div>
            </div>
            <div class="btn-row" style="margin:10px 0 4px">
              <button type="button" class="btn" [disabled]="!csNd().trim() && !csTc() && !csCh()" (click)="ghiCS()">Ghi chăm sóc</button>
            </div>
          }
          <ol class="cs-log">
            @for (c of k.chamSoc ?? []; track c.id) {
              <li>
                <div class="sub">
                  {{ c.nguoi === 'Import' ? viDate(c.luc) : viMoment(c.luc) }} · {{ c.nguoi === 'Import' ? 'Import từ file theo dõi KH' : store.userName(c.nguoi) }}
                  @if (c.coHoi) { <app-tt [v]="c.coHoi" /> }
                </div>
                <div class="cs-nd">{{ c.noiDung }}</div>
              </li>
            } @empty {
              <li class="muted">Chưa có lần chăm sóc nào.</li>
            }
          </ol>
        </section>

        <section class="card">
          <h2 class="section-title">Hợp đồng bán của khách</h2>
          @for (h of hdCua(); track h.id) {
            <div class="row hd-row">
              <a [routerLink]="['/hop-dong-ban', h.id]" class="linkish">{{ h.soHD || '(chưa số)' }}</a>
              <span class="muted">{{ viDate(h.ngayKy) }}</span>
              <app-tt [v]="h.trangThai" />
              @if (xemTien()) { <span class="num" style="margin-left:auto">{{ money(h.sau) }} đ</span> }
            </div>
          } @empty {
            <p class="muted">Chưa có HĐ bán (trong phạm vi bạn được xem).</p>
          }
          @if (store.canEdit('hdb') && k.trangThai !== 'Ngưng') {
            <a class="btn sm quiet" style="margin-top:10px" routerLink="/hop-dong-ban/moi" [queryParams]="{ kh: k.id }"><app-icon name="plus" [size]="16" /> Tạo HĐ bán cho khách này</a>
          }
        </section>
      </div>

      <app-kh-form [khId]="sua()" (closed)="sua.set(null)" />
    } @else {
      <div class="page-head"><div><div class="crumbs"><a routerLink="/">Trang chủ</a> › <a routerLink="/khach-hang">Khách hàng</a></div><h1>Không tìm thấy khách hàng</h1></div></div>
      <div class="card empty">Khách hàng không tồn tại hoặc đã bị xoá. <a routerLink="/khach-hang">Về danh sách khách hàng</a></div>
    }
  `,
  styles: `
    .xem .ro { min-height: 40px; }
    .cs-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .cs-log { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 10px; }
    .cs-log > li { border-left: 3px solid var(--line-2); padding: 2px 0 2px 10px; display: grid; gap: 4px; }
    .cs-log .sub { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .cs-nd { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 15px; }
    .hd-row { padding: 6px 0; border-bottom: 1px solid var(--line); }
  `,
})
export class KhDetail {
  protected readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly confirm = inject(Confirm);
  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly viMoment = viMoment;
  protected readonly TIEP_CAN = TIEP_CAN;
  protected readonly CO_HOI = CO_HOI;

  private readonly id = toSignal(this.route.paramMap.pipe(map((m) => m.get('id') ?? '')), {
    initialValue: this.route.snapshot.paramMap.get('id') ?? '',
  });
  protected readonly k = computed(() => this.store.khById(this.id()) ?? null);
  protected readonly choXoa = computed(() => !!this.k() && this.store.dangChoXoa('DM_KhachHang', this.k()!.id));
  protected readonly edit = computed(() => !this.choXoa() && this.store.canEditKH(this.k()));
  protected readonly xemTien = computed(() => this.store.canView('hdbTab3'));
  /** Popup sửa: mã KH đang sửa, null = đóng. */
  protected readonly sua = signal<string | null>(null);

  protected readonly csNd = signal('');
  protected readonly csTc = signal<'' | TiepCan>('');
  protected readonly csCh = signal<'' | CoHoi>('');

  constructor() {
    canhBaoChuaLuu(() => !!this.csNd().trim());
  }

  protected readonly hdCua = computed(() => {
    const id = this.k()?.id;
    if (!id) return [];
    const db = this.store.db();
    return this.store
      .hdbVisible()
      .filter((h) => h.maKH === id)
      .map((h) => ({ id: h.id, soHD: h.soHD, ngayKy: h.ngayKy, trangThai: h.trangThai, sau: hdbCalc(h, db).sauVAT }));
  });

  protected ghiCS(): void {
    const k = this.k();
    if (!k) return;
    const err = this.store.ghiChamSoc(k.id, this.csNd(), { tiepCan: this.csTc() || undefined, coHoi: this.csCh() || undefined });
    if (err) return this.store.say(err);
    this.csNd.set('');
    this.csTc.set('');
    this.csCh.set('');
    this.store.say('Đã ghi chăm sóc');
  }

  protected async xoa(): Promise<void> {
    const k = this.k();
    if (k) await guiXoa(this.confirm, this.store, 'DM_KhachHang', k.id, `Khách hàng ${k.id} — ${k.ten}`);
  }
}
