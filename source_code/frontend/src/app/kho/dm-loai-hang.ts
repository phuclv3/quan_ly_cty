import { ChangeDetectionStrategy, Component, computed, inject, signal, viewChild } from '@angular/core';
import { tonKho } from '../core/calc';
import { KHO_CHUYEN_THANG, LoaiHang, NHOM_HANG, NhomHang } from '../core/models';
import { Store } from '../core/store';
import { TT, ttNhan } from '../core/trang-thai';
import { dirtyOf } from '../shared/unsaved';
import { nhoLoc } from '../core/ui';
import { money } from '../core/util';
import { Confirm } from '../shared/confirm';
import { Facet, FilterBar, LOC_RONG, Loc, khopQ, khopSel } from '../shared/filter-bar';
import { guiXoa, guiXoaNhieu } from '../shared/ho-so';
import { ChonNhieu } from '../shared/chon-nhieu';
import { Pager, paginate } from '../shared/pager';
import { Modal, TrangThai } from '../shared/ui-kit';
import { TepDinhKem } from '../shared/tep-dinh-kem';
import { nhomOpts } from './kho-util';
import { thuocTinhTheoNhom } from '../core/seed';

interface Form {
  isNew: boolean;
  l: LoaiHang;
  bietDanh: string;
  /** Người dùng đã tự sửa mã / tên → thôi tự gợi ý. */
  maTay: boolean;
  tenTay: boolean;
}

const TIEN_TO: Record<NhomHang, string> = {
  'Khí chuẩn': 'KC',
  'Dung dịch chuẩn': 'DD',
  'Vỏ bình': 'VO',
  'Thiết bị tái sử dụng': 'TB',
  'Phụ kiện': 'PK',
};
const VAT_LIEU: Record<string, string> = { NHOM: 'nhôm', THEP: 'thép' };

/** Mã gợi ý theo quy ước file kho: <nhóm>-<loại khí / vật liệu>-<thể tích>, VD KC-SO2NOCO-8L, VO-NHOM-10L. */
function goiYMa(l: LoaiHang): string {
  const khi = (l.loaiKhi ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '') || (l.theTich ? '' : 'KHAC');
  const tt = (l.theTich ?? '').toUpperCase().replace(/\s+/g, '').replace(/,/g, '.');
  return [TIEN_TO[l.nhom], khi, tt].filter(Boolean).join('-');
}
function goiYTen(l: LoaiHang): string {
  const tt = l.theTich ? ` ${l.theTich}` : '';
  if (l.nhom === 'Vỏ bình') return `Vỏ bình${l.loaiKhi ? ' ' + (VAT_LIEU[l.loaiKhi.toUpperCase()] ?? l.loaiKhi) : ''}${tt}`;
  return `${l.nhom}${l.loaiKhi ? ' ' + l.loaiKhi : ''}${tt}`;
}

/** KHO-02 (sheet "DM. Mã hàng"): danh mục mã hàng CỐ ĐỊNH — nhóm × loại khí / vật liệu × thể tích. */
import { ImportDm } from '../shared/import-dm';
@Component({
  selector: 'app-kho-loai-hang',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `.bulk { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 12px; }`,
  imports: [Modal, TrangThai, FilterBar, Pager, ImportDm, TepDinhKem],
  template: `
    <div class="note info">
      <b>Mã hàng là cố định</b> (VD KC-NO-8L = Khí chuẩn · NO · 8L · Bình). Nồng độ khách đặt và đơn giá <b>không</b> nằm ở mã —
      ghi theo từng lô khi nhập kho, nên cùng một mã có nhiều lô giá khác nhau.
    </div>
    <div class="section-title">
      <span class="sub">{{ rows().length }} mã hàng</span>
      @if (edit()) { <span class="btn-row"><app-import-dm loai="mh" /><button type="button" class="btn" (click)="moi()">+ Thêm mã hàng</button></span> }
    </div>
    <app-filter [(loc)]="loc" memo="kho-loai-hang" [time]="false" [facets]="facets()" placeholder="Tìm mã, tên, loại khí, tên tham chiếu…" />
    @if (chonDuoc() && cn.chon().size) {
      <div class="note info bulk">
        <b>Đã chọn {{ cn.chon().size }} mã hàng</b>
        <button type="button" class="btn sm danger" (click)="xoaNhieu()">Xoá {{ cn.chon().size }} đã chọn</button>
        <button type="button" class="btn sm quiet" (click)="cn.xoa()">Bỏ chọn</button>
      </div>
    }
    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead><tr>@if (chonDuoc()) { <th style="width:36px"><input type="checkbox" aria-label="Chọn cả trang" [checked]="cn.du(idTrang())" (change)="cn.chonTat(idTrang(), $any($event.target).checked)" /></th> }<th>Mã hàng</th><th>Nhóm</th><th>Loại khí / vật liệu</th><th>Thể tích</th><th>ĐVT</th><th>Tên</th><th>Mô tả</th><th class="num">Tồn</th><th>Tên tham chiếu</th><th>Đang dùng</th>@if (edit()) { <th></th> }</tr></thead>
        <tbody>
          @for (l of pg.items(); track l.id) {
            <tr>
              @if (chonDuoc()) {
                <td>@if (xoaDuoc(l)) { <input type="checkbox" [attr.aria-label]="'Chọn ' + l.id" [checked]="cn.co(l.id)" (change)="cn.flip(l.id)" /> }</td>
              }
              <td><b>{{ l.id }}</b></td>
              <td>{{ l.nhom }}</td>
              <td>{{ l.loaiKhi || '—' }}</td>
              <td>{{ l.theTich || '—' }}</td>
              <td>{{ l.dvt }}</td>
              <td>{{ l.ten }}</td>
              <td class="sub" style="max-width:280px">{{ l.moTa || '—' }}</td>
              <td class="num" [class.neg]="(ton().get(l.id) ?? 0) < 0">{{ money(ton().get(l.id) ?? 0) }}</td>
              <td class="sub" [title]="(l.bietDanh ?? []).join('\\n')">
                @if (l.bietDanh?.length) { {{ l.bietDanh![0] }}@if (l.bietDanh!.length > 1) { <span class="tag mute">+{{ l.bietDanh!.length - 1 }}</span> } } @else { — }
              </td>
              <td>
                <app-tt [v]="l.dangDung ? TT.DANG_DUNG : TT.NGUNG" />
                @if (choXoa(l)) { <app-tt v="Chờ xoá" /> }
              </td>
              @if (edit()) {
                <td>
                  @if (!choXoa(l)) {
                    <div class="btn-row" style="justify-content:flex-start">
                      <button type="button" class="btn sm quiet" (click)="sua(l)">Sửa</button>
                      <button type="button" class="btn sm quiet" (click)="doiMa(l)">Đổi mã</button>
                      <button type="button" class="btn sm quiet" (click)="batTat(l)">{{ l.dangDung ? 'Ngưng' : 'Dùng lại' }}</button>
                      <button type="button" class="btn sm quiet danger" [disabled]="daDung().has(l.id)" [attr.title]="daDung().has(l.id) ? 'Mã hàng đã được dùng — chỉ ngưng, không xoá được' : null" (click)="xoa(l)">Xoá</button>
                    </div>
                  }
                </td>
              }
            </tr>
          } @empty {
            <tr><td [attr.colspan]="chonDuoc() ? 12 : 11" class="empty">Không có mã hàng nào khớp bộ lọc</td></tr>
          }
        </tbody>
      </table>
    </div>
    <app-pager [pager]="pg" />
    <p class="hint muted">Tên tham chiếu = các tên đang ghi trên hoá đơn / hợp đồng ứng với mã này (VD "Bình khí chuẩn NO", "NO calibration gas") — dùng để tìm mã khi lập phiếu, HĐ. Mã đã dùng không xoá được — chỉ Ngưng. Cần sửa mã (cột "ANH SỬA" của file) thì bấm "Đổi mã".</p>

    <app-modal #mLh [open]="!!f()" [title]="f()?.isNew ? 'Thêm mã hàng' : 'Sửa mã hàng ' + (f()?.l?.id ?? '')" [dirty]="dirty()" (closed)="f.set(null)">
      @if (f(); as x) {
        <section class="blk xanh">
        <h3 class="section-title">Trường cố định</h3>
        <div class="form-grid">
          <div class="field">
            <label for="lh-nhom">Nhóm <span class="req">*</span></label>
            <select id="lh-nhom" [disabled]="!x.isNew" (change)="set({ nhom: $any($event.target).value })">
              @for (n of nhoms; track n) { <option [value]="n" [selected]="n === x.l.nhom">{{ n }}</option> }
            </select>
          </div>
          @if (x.l.nhom === 'Vỏ bình') {
            <div class="field">
              <label for="lh-vl">Vật liệu</label>
              <select id="lh-vl" (change)="doiVatLieu($any($event.target).value)">
                <option value="" [selected]="!vatLieuHt(x.l)">— Chọn —</option>
                @for (v of VAT_LIEU_OPT; track v) { <option [value]="v" [selected]="v === vatLieuHt(x.l)">{{ v }}</option> }
              </select>
            </div>
          } @else {
          <div class="field">
            <label for="lh-khi">Loại khí / chỉ tiêu</label>
            <input id="lh-khi" placeholder="NO, SO2/NO/CO, COD…" [value]="x.l.loaiKhi ?? ''" [disabled]="!x.isNew" (input)="set({ loaiKhi: $any($event.target).value.trim() || undefined })" />
          </div>
          }
          <div class="field">
            <label for="lh-tt">Thể tích</label>
            <input id="lh-tt" placeholder="8L, 10L, 500ml" [value]="x.l.theTich ?? ''" [disabled]="!x.isNew" (input)="set({ theTich: $any($event.target).value.trim() || undefined })" />
          </div>
          <div class="field"><label for="lh-dvt">Đơn vị tính <span class="req">*</span></label><input id="lh-dvt" placeholder="Bình, Chai, Bộ…" [value]="x.l.dvt" (input)="set({ dvt: $any($event.target).value })" /></div>
          @if (x.l.nhom !== 'Vỏ bình') {
          <div class="field">
            <label for="lh-vl">Vật liệu</label>
            <select id="lh-vl" (change)="doiVatLieu($any($event.target).value)">
              <option value="" [selected]="!vatLieuHt(x.l)">— Chọn —</option>
              @for (v of VAT_LIEU_OPT; track v) { <option [value]="v" [selected]="v === vatLieuHt(x.l)">{{ v }}</option> }
            </select>
          </div>
          }
          <div class="field">
            <label for="lh-ttr">Phân loại vỏ</label>
            <select id="lh-ttr" (change)="set({ tinhTrang: $any($event.target).value || undefined })">
              <option value="" [selected]="!x.l.tinhTrang">— Chọn —</option>
              @for (v of TINH_TRANG_OPT; track v) { <option [value]="v" [selected]="v === x.l.tinhTrang">{{ v }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="lh-hq">Hợp quy</label>
            <select id="lh-hq" (change)="set({ hopQuy: $any($event.target).value || undefined })">
              <option value="" [selected]="!x.l.hopQuy">— Chọn —</option>
              @for (v of CO_KHONG; track v) { <option [value]="v" [selected]="v === x.l.hopQuy">{{ v }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="lh-kd">Kiểm định</label>
            <select id="lh-kd" (change)="doiKiemDinh($any($event.target).value)">
              <option value="" [selected]="!x.l.kiemDinh">— Chọn —</option>
              @for (v of CO_KHONG; track v) { <option [value]="v" [selected]="v === x.l.kiemDinh">{{ v }}</option> }
            </select>
          </div>
          @if (x.l.kiemDinh === 'Có') {
            <div class="field full">
              <app-tep-dinh-kem nhan="File kiểm định vỏ bình" goiY="Ảnh hoặc PDF giấy kiểm định, mỗi tệp ≤ 20MB. Tệp được ghi khi bấm Lưu." [edit]="true" [files]="x.l.fileKiemDinh ?? []" (filesChange)="set({ fileKiemDinh: $event })" />
            </div>
          }
          <div class="field">
            <label for="lh-ma">Mã hàng <span class="req">*</span></label>
            @if (x.isNew) { <input id="lh-ma" [value]="x.l.id" (input)="setMa($any($event.target).value)" /> } @else { <div class="ro">{{ x.l.id }}</div> }
            <span class="hint">{{ x.isNew ? 'Tự gợi ý theo nhóm · loại khí · thể tích — sửa được' : 'Mã cố định, không đổi sau khi tạo' }}</span>
          </div>
          <div class="field"><label for="lh-ten">Tên <span class="req">*</span></label><input id="lh-ten" [value]="x.l.ten" (input)="setTen($any($event.target).value)" /></div>
          <div class="field full">
            <label for="lh-mota">Mô tả ngắn</label>
            <input id="lh-mota" placeholder="VD Khí chuẩn NO trong N2, bình nhôm 8L" [value]="x.l.moTa ?? ''" (input)="set({ moTa: $any($event.target).value })" />
          </div>
        </div>
        </section>
        <section class="blk vang">
        <h3 class="section-title">Tên tham chiếu</h3>
        <div class="form-grid">
          <div class="field full">
            <label for="lh-bd">Tên đang dùng trên hoá đơn / hợp đồng</label>
            <textarea id="lh-bd" rows="4" placeholder="Mỗi dòng một tên, VD: Bình khí chuẩn NO&#10;NO calibration gas" [value]="x.bietDanh" (input)="setBD($any($event.target).value)"></textarea>
          </div>
          <label class="check-row wide"><input type="checkbox" [checked]="x.l.dangDung" (change)="set({ dangDung: $any($event.target).checked })" /> Đang dùng</label>
        </div>
        </section>
        @if (!x.isNew) { <p class="hint muted">Nhóm, loại khí, thể tích là phần cấu thành mã — không sửa; cần khác thì tạo mã mới và Ngưng mã cũ.</p> }
        @if (err()) { <div class="note bad">{{ err() }}</div> }
      }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="f.set(null)">Huỷ</button>
        <button type="button" class="btn" (click)="luu()">Lưu</button>
      </div>
    </app-modal>
  `,
})
export class DmLoaiHangTab {
  private readonly mLh = viewChild<Modal>('mLh');
  protected readonly store = inject(Store);
  protected readonly TT = TT;
  private readonly confirm = inject(Confirm);
  protected readonly nhoms = NHOM_HANG;
  protected readonly VAT_LIEU_OPT = ['Nhôm', 'Thép'] as const;
  protected readonly CO_KHONG = ['Có', 'Không'] as const;
  protected readonly TINH_TRANG_OPT = ['Mới', 'Cũ'] as const;
  protected readonly money = money;
  protected readonly edit = computed(() => this.store.canEdit('khoDanhMuc'));
  protected readonly loc = signal<Loc>(nhoLoc('kho-loai-hang', LOC_RONG));
  protected readonly facets = computed<Facet[]>(() => [
    { key: 'nhom', label: 'Nhóm', options: nhomOpts() },
    { key: 'dd', label: 'Trạng thái', options: [TT.DANG_DUNG, TT.NGUNG].map((v) => ({ value: v, label: ttNhan(v) })) },
  ]);
  protected readonly f = signal<Form | null>(null);
  protected readonly dirty = dirtyOf(this.f);
  protected readonly err = signal('');

  /** Tồn theo mã hàng, mọi kho thường. */
  protected readonly ton = computed(() => {
    const m = new Map<string, number>();
    for (const r of tonKho(this.store.db())) if (r.kho !== KHO_CHUYEN_THANG) m.set(r.loaiHang, (m.get(r.loaiHang) ?? 0) + r.ton);
    return m;
  });
  protected readonly rows = computed(() => {
    const l = this.loc();
    const thu = new Map(NHOM_HANG.map((n, i) => [n, i]));
    return this.store
      .loaiHang()
      .filter(
        (x) =>
          khopSel(l, 'nhom', x.nhom) &&
          khopSel(l, 'dd', x.dangDung ? TT.DANG_DUNG : TT.NGUNG) &&
          khopQ(l, x.id, x.ten, x.moTa, x.dvt, x.nhom, x.loaiKhi, x.theTich, ...(x.bietDanh ?? [])),
      )
      .sort((a, b) => (thu.get(a.nhom) ?? 9) - (thu.get(b.nhom) ?? 9) || a.id.localeCompare(b.id, 'en', { numeric: true }));
  });
  protected readonly pg = paginate(this.rows);
  protected readonly cn = new ChonNhieu();
  /** Mã đã có trên phiếu kho hoặc dòng HĐ Mua → chỉ ngưng. */
  protected readonly daDung = computed(() => {
    const db = this.store.db();
    const s = new Set<string>();
    for (const p of db.phieuKho) for (const d of p.dong) s.add(d.loaiHang);
    for (const m of db.hopDongMua) for (const d of m.chiTiet) s.add(d.loaiHang);
    for (const h of db.hopDongBan) for (const d of h.dongHang ?? []) s.add(d.loaiHang);
    for (const n of db.deNghiVatTu) for (const d of n.dong) s.add(d.loaiHang);
    for (const k of db.kiemKe) for (const d of k.dong) s.add(d.loaiHang);
    return s;
  });

  protected choXoa(l: LoaiHang): boolean {
    return this.store.dangChoXoa('DM_LoaiHang', l.id);
  }
  protected moi(): void {
    this.err.set('');
    const l: LoaiHang = { id: '', ten: '', nhom: NHOM_HANG[0], dvt: 'Bình', thuocTinh: [], dangDung: true };
    this.f.set({ isNew: true, l: { ...l, id: goiYMa(l), ten: goiYTen(l) }, bietDanh: '', maTay: false, tenTay: false });
  }
  protected sua(l: LoaiHang): void {
    this.err.set('');
    this.f.set({ isNew: false, l: structuredClone(l), bietDanh: (l.bietDanh ?? []).join('\n'), maTay: true, tenTay: true });
  }
  /** Đổi trường cố định → gợi ý lại mã / tên (nếu người dùng chưa tự sửa). */
  protected set(p: Partial<LoaiHang>): void {
    this.f.update((x) => {
      if (!x) return x;
      const l = { ...x.l, ...p };
      if (p.nhom && x.isNew) l.dvt = p.nhom === 'Dung dịch chuẩn' ? 'Chai' : p.nhom === 'Vỏ bình' || p.nhom === 'Khí chuẩn' ? 'Bình' : l.dvt;
      if (x.isNew && !x.maTay) l.id = goiYMa(l);
      if (x.isNew && !x.tenTay) l.ten = goiYTen(l);
      return { ...x, l };
    });
  }
  /** Vật liệu hiển thị: trường mới; mã cũ chưa có thì suy từ loaiKhi của vỏ bình (NHOM / THEP). */
  protected vatLieuHt(l: LoaiHang): string | undefined {
    return l.vatLieu ?? (l.nhom === 'Vỏ bình' ? (l.loaiKhi?.toUpperCase() === 'NHOM' ? 'Nhôm' : l.loaiKhi?.toUpperCase() === 'THEP' ? 'Thép' : undefined) : undefined);
  }
  /** Vỏ bình: vật liệu là một phần của mã (VO-NHOM-10L) → mã mới thì đổi loaiKhi theo để gợi ý mã đúng. */
  protected doiVatLieu(v: string): void {
    const vl = (v || undefined) as LoaiHang['vatLieu'];
    const x = this.f();
    this.set({ vatLieu: vl, ...(x?.isNew && x.l.nhom === 'Vỏ bình' ? { loaiKhi: vl === 'Nhôm' ? 'NHOM' : vl === 'Thép' ? 'THEP' : undefined } : {}) });
  }
  /** Kiểm định đổi sang Không / bỏ chọn → bỏ tệp đã gắn (khớp backend). */
  protected doiKiemDinh(v: string): void {
    this.set({ kiemDinh: (v || undefined) as LoaiHang['kiemDinh'], ...(v === 'Có' ? {} : { fileKiemDinh: undefined }) });
  }
  protected setMa(v: string): void {
    this.f.update((x) => (x ? { ...x, maTay: true, l: { ...x.l, id: v.toUpperCase().replace(/\s+/g, '') } } : x));
  }
  protected setTen(v: string): void {
    this.f.update((x) => (x ? { ...x, tenTay: true, l: { ...x.l, ten: v } } : x));
  }
  protected setBD(v: string): void {
    this.f.update((x) => (x ? { ...x, bietDanh: v } : x));
  }
  protected luu(): void {
    if (this.mLh()?.kt.hopLe() === false) return;
    const x = this.f();
    if (!x) return;
    const bd = [...new Set(x.bietDanh.split('\n').map((t) => t.trim()).filter(Boolean))];
    const l: LoaiHang = {
      ...x.l,
      id: x.l.id.trim(),
      ten: x.l.ten.trim(),
      moTa: x.l.moTa?.trim() || undefined,
      dvt: x.l.dvt.trim(),
      thuocTinh: x.isNew ? thuocTinhTheoNhom(x.l.nhom) : x.l.thuocTinh,
      bietDanh: bd.length ? bd : undefined,
    };
    if (!l.dvt) return this.err.set('Chưa nhập Đơn vị tính');
    const e = this.store.saveLoaiHang(l, x.isNew);
    if (e) return this.err.set(e);
    this.store.say(`Đã lưu mã hàng ${l.id}`);
    this.f.set(null);
  }
  protected batTat(l: LoaiHang): void {
    const e = this.store.saveLoaiHang({ ...l, dangDung: !l.dangDung }, false);
    this.store.say(e ?? (l.dangDung ? `Đã ngưng ${l.id}` : `Đã dùng lại ${l.id}`));
  }
  /** Cột "ANH SỬA" của file: đổi mã, mọi phiếu / HĐ mua / kiểm kê / ánh xạ đang dùng mã cũ đổi theo. */
  protected async doiMa(l: LoaiHang): Promise<void> {
    const moi = await this.confirm.prompt({
      title: `Đổi mã hàng ${l.id}`,
      message: 'Mọi phiếu kho, dòng HĐ mua, kiểm kê và ánh xạ tên bán đang dùng mã cũ sẽ đổi sang mã mới.',
      label: 'Mã mới',
      placeholder: 'VD KC-NO-8L',
      minLength: 2,
      ok: 'Đổi mã',
    });
    if (!moi) return;
    const e = this.store.doiMaHang(l.id, moi);
    this.store.say(e ?? `Đã đổi ${l.id} → ${moi.trim().toUpperCase()}`);
  }
  /** Xoá hàng loạt: bỏ mã đang chờ xoá; mã đã dùng trên phiếu / HĐ bị bỏ qua kèm lý do. */
  protected readonly chonDuoc = computed(() => this.edit() && this.store.level('duyetXoa') !== 'none');
  protected xoaDuoc(l: LoaiHang): boolean {
    return !this.choXoa(l);
  }
  protected readonly idTrang = computed(() => this.pg.items().filter((l) => this.xoaDuoc(l)).map((l) => l.id));
  protected async xoaNhieu(): Promise<void> {
    const ds = this.store.loaiHang().filter((l) => this.cn.co(l.id) && this.xoaDuoc(l)).map((l) => ({ id: l.id, ten: l.id, moTa: `Mã hàng ${l.id} – ${l.ten}` }));
    if (await guiXoaNhieu(this.confirm, this.store, 'DM_LoaiHang', ds, 'mã hàng')) this.cn.xoa();
  }
  protected async xoa(l: LoaiHang): Promise<void> {
    await guiXoa(this.confirm, this.store, 'DM_LoaiHang', l.id, `Mã hàng ${l.id} – ${l.ten}`);
  }
}
