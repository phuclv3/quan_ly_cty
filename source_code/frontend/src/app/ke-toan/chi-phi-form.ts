import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { ChiPhiHD, LCP_HOA_HONG, LCP_VAN_CHUYEN } from '../core/models';
import { hdbCalc } from '../core/calc';
import { money, sum, viMoment } from '../core/util';
import { Modal, MoneyInput, Pick, PickOption, TrangThai } from '../shared/ui-kit';
import { Confirm } from '../shared/confirm';
import { guiXoa } from '../shared/ho-so';
import { LichSu } from '../shared/lich-su';
import { TepDinhKem } from '../shared/tep-dinh-kem';
import { TT, ttNhan } from '../core/trang-thai';

/** Popup Nhập chi phí thực hiện HĐ (KT-13, KT-15). */
@Component({
  selector: 'app-chi-phi-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, MoneyInput, Pick, TrangThai, RouterLink, LichSu, TepDinhKem],
  template: `
    @if (f(); as c) {
      <app-modal #mCP [open]="true" [title]="c.id ? 'Chi phí ' + c.maCP : 'Nhập chi phí thực hiện HĐ'" size="md" [dirty]="dirty()" (closed)="closed.emit()">
        @if (c.trangThai === TT.TU_CHOI && c.lyDoTuChoi) {
          <div class="note bad">Bị từ chối bởi {{ store.userName(c.nguoiDuyet) }} ({{ viMoment(c.ngayDuyet) }}): {{ c.lyDoTuChoi }}</div>
        }
        @if (choXoa()) { <div class="note bad">Chi phí đang có yêu cầu xoá chờ duyệt — khoá sửa.</div> }
        @if (err()) { <div class="note bad">{{ err() }}</div> }
        @if (canhBaoHH(); as w) { <div class="note warn">{{ w }}</div> }

        <div class="form-grid blk xanh">
<h3 class="blk-t">Thông tin chi phí</h3>
          <div class="field"><span class="lbl">Mã CP</span><div class="ro">{{ c.maCP || 'Tự sinh khi lưu (CP' + c.ngay.slice(2, 4) + '-nnnn)' }}</div></div>
          <div class="field">
            <label>Số HĐ bán <span class="req">*</span></label>
            <app-pick [options]="hdOpts()" [disabled]="!edit()" [value]="c.hdbId" (valueChange)="set('hdbId', $event)" />
            @if (hd(); as h) { <a class="hint linkish" [routerLink]="['/hop-dong-ban', h.id]" [queryParams]="{ tab: 4 }">Mở HĐ {{ h.soHD }}</a> }
          </div>
          <div class="field"><label for="cf-ngay">Ngày <span class="req">*</span></label><input id="cf-ngay" type="date" [disabled]="!edit()" [value]="c.ngay" (input)="set('ngay', $any($event.target).value)" /></div>
          <div class="field"><span class="lbl">Trạng thái</span><div class="ro">@if (choXoa()) { <app-tt v="Chờ xoá" /> } @else { <app-tt [v]="c.trangThai" /> }</div></div>
          <div class="field"><label>Loại chi phí thực hiện <span class="req">*</span></label><app-pick [options]="lcpOpts()" [disabled]="!edit()" [value]="c.loaiChiPhi" (valueChange)="set('loaiChiPhi', $event)" /></div>
          <div class="field"><label>Số tiền <span class="req">*</span></label><app-money [disabled]="!edit()" [value]="c.soTien" (valueChange)="set('soTien', $event)" /></div>
          <div class="field"><label>Nguồn tiền chi ra <span class="req">*</span></label><app-pick [options]="nguonOpts()" [disabled]="!edit()" [value]="c.nguonTien" (valueChange)="set('nguonTien', $event)" /></div>
          <div class="field"><span class="lbl">Người thực hiện</span><div class="ro">{{ store.userName(c.nguoiThucHien) }}</div></div>
          @if (c.loaiChiPhi === HH) {
            <div class="field"><label for="cf-nn">Người nhận <span class="req">*</span></label><input id="cf-nn" [disabled]="!edit()" [value]="c.nguoiNhan || ''" (input)="set('nguoiNhan', $any($event.target).value)" /></div>
          }
          @if (c.loaiChiPhi === VC) {
            <div class="field"><label for="cf-vc">Đơn vị vận chuyển</label><input id="cf-vc" [disabled]="!edit()" [value]="c.donViVanChuyen || ''" (input)="set('donViVanChuyen', $any($event.target).value)" /></div>
          }
          <div class="field full"><label for="cf-nd">Nội dung <span class="req">*</span></label><textarea id="cf-nd" rows="2" [disabled]="!edit()" [value]="c.noiDung" (input)="set('noiDung', $any($event.target).value)"></textarea></div>
          <div class="field wide"><label for="cf-gc">Ghi chú</label><input id="cf-gc" [disabled]="!edit()" [value]="c.ghiChu || ''" (input)="set('ghiChu', $any($event.target).value)" /></div>
          @if (c.nguoiDuyet && c.trangThai === TT.DA_DUYET) {
            <div class="field"><span class="lbl">Người duyệt</span><div class="ro">{{ store.userName(c.nguoiDuyet) }} · {{ viMoment(c.ngayDuyet) }}</div></div>
          }
          @if (duyetDuoc() && hd(); as h) {
            <div class="field full"><span class="lbl">Ngữ cảnh HĐ {{ h.soHD }}</span>
              <div class="ro">Giá trị sau VAT {{ money(ngucanh().sauVAT) }} đ · CP đã duyệt {{ money(ngucanh().cpDuyet) }} đ · LN gộp tạm tính {{ money(ngucanh().lnGop) }} đ</div>
            </div>
          }
          <app-tep-dinh-kem class="full" [files]="c.files" [edit]="edit()" (filesChange)="set('files', $event)" />
          <app-lich-su class="full" [rows]="c.lichSu ?? []" [mo]="c.trangThai === TT.TU_CHOI || duyetDuoc()" />
        </div>
        @if (c.loaiChiPhi === HH) {
          <p class="hint muted">Hoa hồng ghi ở đây, không lập thêm phiếu Chi ở Sổ quỹ (tránh trừ quỹ 2 lần) — duyệt xong trừ thẳng Nguồn tiền đã chọn.</p>
        }

        <div foot>
          @if (chiPhi()?.trangThai === TT.NHAP && c.id && edit()) {
            <button type="button" class="btn danger quiet" (click)="xoaNhap()">Xoá nháp</button>
          } @else if (c.id && !choXoa() && store.level('duyetXoa') !== 'none') {
            <button type="button" class="btn danger quiet" (click)="xoa()">Xoá</button>
          }
          @if (rutDuoc()) { <button type="button" class="btn quiet" (click)="rutLai()">Rút lại về Nháp</button> }
          <span style="flex:1"></span>
          <button type="button" class="btn quiet" (click)="closed.emit()">{{ edit() ? 'Huỷ' : 'Đóng' }}</button>
          @if (edit()) {
            <button type="button" class="btn quiet" (click)="luu(false)">Lưu nháp</button>
            <button type="button" class="btn" (click)="luu(true)">Gửi duyệt</button>
          }
          @if (duyetDuoc() && c.trangThai === TT.CHO_DUYET && !choXoa()) {
            <button type="button" class="btn danger quiet" (click)="tuChoi.emit()">Từ chối</button>
            <button type="button" class="btn ok" (click)="duyet.emit()">Duyệt</button>
          }
        </div>
      </app-modal>
    }
  `,
})
export class ChiPhiForm {
  protected readonly TT = TT;
  private readonly mCP = viewChild<Modal>('mCP');
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  readonly chiPhi = input<ChiPhiHD | null>(null);
  /** Mở từ tab Chờ duyệt: hiện nút Duyệt / Từ chối và ngữ cảnh HĐ (KT-14). */
  readonly duyetDuoc = input(false);
  readonly closed = output<void>();
  readonly duyet = output<void>();
  readonly tuChoi = output<void>();
  protected readonly money = money;

  protected readonly HH = LCP_HOA_HONG;
  protected readonly VC = LCP_VAN_CHUYEN;
  protected readonly viMoment = viMoment;
  protected readonly f = linkedSignal<ChiPhiHD | null>(() => {
    const c = this.chiPhi();
    return c ? structuredClone(c) : null;
  });
  protected readonly err = linkedSignal({ source: this.chiPhi, computation: () => '' });
  protected readonly dirty = computed(() => this.edit() && JSON.stringify(this.f()) !== JSON.stringify(this.chiPhi()));
  protected readonly ngucanh = computed(() => {
    const h = this.hd();
    return h ? hdbCalc(h, this.store.db()) : hdbCalc(this.store.newHdb(), this.store.db());
  });

  protected readonly edit = computed(() => {
    const c = this.chiPhi();
    return !!c && this.store.chiPhiSuaDuoc(c);
  });
  protected readonly choXoa = computed(() => {
    const c = this.f();
    return !!c?.id && this.store.dangChoXoa('ChiPhiThucHienHD', c.id);
  });
  protected readonly hd = computed(() => this.store.hdbById(this.f()?.hdbId));

  protected readonly hdOpts = computed<PickOption[]>(() => {
    const list = this.store
      .hdbVisible()
      .filter((h) => h.trangThai !== TT.BAO_GIA && h.trangThai !== TT.HUY)
      .map((h) => ({ value: h.id, label: h.soHD, hint: h.tenKH }));
    const cur = this.hd();
    if (cur && !list.some((o) => o.value === cur.id)) list.push({ value: cur.id, label: cur.soHD, hint: ttNhan(cur.trangThai) });
    return list;
  });
  protected readonly lcpOpts = computed<PickOption[]>(() => {
    const cur = this.f()?.loaiChiPhi;
    const list: PickOption[] = this.store.lcpThucHien().map((l) => ({ value: l.id, label: l.ten }));
    const c = cur ? this.store.lcpById(cur) : undefined;
    if (c && !list.some((o) => o.value === c.id)) list.push({ value: c.id, label: c.ten, hint: 'Ngưng' });
    return list;
  });
  protected readonly nguonOpts = computed<PickOption[]>(() => {
    const list: PickOption[] = this.store.nguonDangDung().map((n) => ({ value: n.id, label: n.ten, hint: n.loai }));
    const n = this.store.nguonById(this.f()?.nguonTien);
    if (n && !list.some((o) => o.value === n.id)) list.push({ value: n.id, label: n.ten, hint: 'Ngưng' });
    return list;
  });

  /** KT-15: tổng hoa hồng của HĐ (trừ Từ chối, gồm dòng đang nhập) > Chênh lệch − Thuế TNDN. */
  protected readonly canhBaoHH = computed(() => {
    const c = this.f();
    const h = this.hd();
    if (!c || !h || c.loaiChiPhi !== LCP_HOA_HONG) return '';
    const db = this.store.db();
    const khac = sum(
      db.chiPhiHD.filter((x) => x.hdbId === h.id && x.id !== c.id && x.loaiChiPhi === LCP_HOA_HONG && x.trangThai !== TT.TU_CHOI),
      (x) => x.soTien,
    );
    const tong = khac + (c.soTien || 0);
    const toiDa = hdbCalc(h, db).traKhachToiDa;
    return tong > toiDa
      ? `Tổng hoa hồng của HĐ ${h.soHD} là ${money(tong)} đ, vượt mức gợi ý tối đa ${money(toiDa)} đ (Chênh lệch − Thuế TNDN).`
      : '';
  });

  protected set<K extends keyof ChiPhiHD>(k: K, v: ChiPhiHD[K]): void {
    this.f.update((c) => (c ? { ...c, [k]: v } : c));
  }

  protected luu(gui: boolean): void {
    if (gui && this.mCP()?.kt.hopLe() === false) return;
    const c = this.f();
    if (!c) return;
    const out: ChiPhiHD = {
      ...c,
      nguoiNhan: c.loaiChiPhi === LCP_HOA_HONG ? c.nguoiNhan : undefined,
      donViVanChuyen: c.loaiChiPhi === LCP_VAN_CHUYEN ? c.donViVanChuyen : undefined,
    };
    const e = this.store.saveChiPhi(out, gui);
    if (e) {
      this.err.set(e);
      this.store.say(e);
      return;
    }
    this.store.say(gui ? 'Đã gửi duyệt chi phí' : 'Đã lưu nháp chi phí');
    this.closed.emit();
  }

  protected readonly rutDuoc = computed(() => {
    const c = this.chiPhi();
    return !!c && c.trangThai === TT.CHO_DUYET && !this.choXoa() && !this.duyetDuoc() && this.store.canEdit('cpHD', this.hd()?.sale);
  });
  protected async xoaNhap(): Promise<void> {
    const c = this.chiPhi();
    if (!c) return;
    if (!(await this.confirm.ask({ title: `Xoá chi phí nháp ${c.maCP}?`, message: 'Chi phí chưa gửi duyệt nên xoá thẳng, không qua Duyệt xoá. Không hoàn tác được.', ok: 'Xoá nháp' }))) return;
    const e = this.store.xoaNhapChiPhi(c.id);
    this.store.say(e ?? `Đã xoá chi phí nháp ${c.maCP}`);
    if (!e) this.closed.emit();
  }
  protected async rutLai(): Promise<void> {
    const c = this.chiPhi();
    if (!c) return;
    if (!(await this.confirm.ask({ title: `Rút chi phí ${c.maCP} về Nháp?`, message: 'Chi phí rời hàng chờ duyệt để sửa rồi gửi lại.', ok: 'Rút lại' }))) return;
    const e = this.store.rutLaiChiPhi(c.id);
    this.store.say(e ?? `Đã rút chi phí ${c.maCP} về Nháp`);
    if (!e) this.closed.emit();
  }

  protected async xoa(): Promise<void> {
    const c = this.f();
    if (!c) return;
    const soHD = this.hd()?.soHD ?? '';
    if (await guiXoa(this.confirm, this.store, 'ChiPhiThucHienHD', c.id, `Chi phí ${c.maCP}${soHD ? ' — HĐ ' + soHD : ''}`)) this.closed.emit();
  }
}
