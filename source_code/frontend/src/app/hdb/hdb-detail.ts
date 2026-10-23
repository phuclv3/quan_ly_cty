import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Store } from '../core/store';
import { TT, ttNhan } from '../core/trang-thai';
import { HopDongBan, TRANG_THAI_HDB, TrangThaiHDB } from '../core/models';
import { dnvtTinhTrang, hdbCalc, hdbConChuaGiao, hdbThieuDeChuyen, hdmCalc, hdmChoHdb } from '../core/calc';
import { money, pct } from '../core/util';
import { Confirm } from '../shared/confirm';
import { HoSoPanel, guiXoa } from '../shared/ho-so';
import { TrangThai } from '../shared/ui-kit';
import { Icon } from '../shared/icon';
import { xemThuToTrinhHdb } from '../shared/export';
import { FileHd, ThongTinHd, XemFileHd, taiFileCho } from '../shared/file-hd';
import { HdbTab1 } from './hdb-tab1';
import { HdbGiaoHang } from './hdb-giao-hang';
import { HdbTab3 } from './hdb-tab3';
import { HdbTab4 } from './hdb-tab4';
import { HdbTaoMoi } from './hdb-tao-moi';
import { HoSoCho, taiHoSoCho } from '../shared/wizard';
import { ghepNhap, vanTay } from './hdb-shared';
import { Unsaved, canhBaoChuaLuu } from '../shared/unsaved';
import { KiemTra } from '../shared/kiem-tra';

const TABS = [
  { k: '1', t: 'Thông tin chung' },
  { k: '2', t: 'Lưu trữ hồ sơ' },
  { k: '3', t: 'Giá trị & Thanh toán' },
  { k: '4', t: 'Chi phí thực hiện' },
  { k: '5', t: 'HĐ mua & đề nghị vật tư' },
];

/** HDB-02…HDB-12 — Chi tiết Hợp đồng bán, 5 tab. */
@Component({
  selector: 'app-hdb-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  hostDirectives: [KiemTra],
  imports: [RouterLink, TrangThai, Icon, FileHd, XemFileHd, HoSoPanel, HdbTab1, HdbGiaoHang, HdbTab3, HdbTab4, HdbTaoMoi],
  styles: [`@media print { :host-context(body.in-qt) > :not(app-hdb-tab4) { display: none !important; } }`],
  template: `
    @if (!coQuyen()) {
      <div class="page-head"><div><div class="crumbs"><a routerLink="/">Trang chủ</a> › <a routerLink="/hop-dong-ban">Hợp đồng bán</a></div><h1>Không tìm thấy hợp đồng</h1></div></div>
      <div class="card empty">HĐ không tồn tại hoặc bạn không phụ trách HĐ này.</div>
    } @else {
      <div class="page-head">
        <div>
          <div class="crumbs"><a routerLink="/">Trang chủ</a> › <a routerLink="/hop-dong-ban">Hợp đồng bán</a> › {{ saved() ? saved()!.soHD || '(chưa có số)' : 'Tạo mới' }}</div>
          <h1>
            {{ saved() ? 'HĐ bán ' + (saved()!.soHD || '(chưa có số)') : 'HĐ bán mới' }}
            @if (saved()) { <app-tt [v]="saved()!.trangThai" /> }
            @if (choXoa()) { <app-tt v="Chờ xoá" /> }
            @if (saved()?.import) { <app-tt v="Import" /> }
          </h1>
          @if (saved()) { <p class="sub">{{ saved()!.tenKH }} · Sale: {{ store.userName(saved()!.sale) }}</p> }
          @else { <p class="sub">Tạo theo từng bước — lưu xong mở HĐ để theo dõi giao hàng, thu tiền, chi phí.</p> }
        </div>
        <div class="actions">
          @if (saved()) {
            <button type="button" class="btn quiet" [disabled]="!coFileHd()" [attr.title]="coFileHd() ? null : 'Chưa có file hợp đồng'" (click)="xemFile.set(true)"><app-icon name="eye" [size]="16" /> Xem file hợp đồng</button>
            <button type="button" class="btn quiet" (click)="xuatToTrinh()"><app-icon name="download" [size]="16" /> Xem tờ trình</button>
          }
          @if (saved() && dirty() && (edit1() || edit3())) {
            <button type="button" class="btn quiet" (click)="huyNhap()">Huỷ thay đổi</button>
          }
          @if (saved() && (edit1() || edit3())) {
            <button type="button" class="btn" [disabled]="!dirty()" (click)="luu()"><app-icon name="check" [size]="16" /> Lưu</button>
          }
          @if (saved() && !choXoa() && saved()!.trangThai !== TT.DA_TAT_TOAN && store.level('duyetXoa') !== 'none' && store.canEdit('hdb', saved()!.sale)) {
            <button type="button" class="btn danger quiet" (click)="xoa()"><app-icon name="trash" [size]="16" /> Xoá</button>
          }
        </div>
      </div>

      @if (choXoa()) { <p class="note bad"><app-icon name="lock" [size]="16" /> HĐ đang có yêu cầu xoá chờ duyệt — khoá sửa.</p> }
      @else if (saved()?.trangThai === TT.HUY) { <p class="note bad"><app-icon name="lock" [size]="16" /> HĐ đã huỷ — khoá toàn bộ.@if (saved()!.lyDoHuy) { Lý do: {{ saved()!.lyDoHuy }} }</p> }
      @else if (saved()?.trangThai === TT.DA_TAT_TOAN) { <p class="note info"><app-icon name="lock" [size]="16" /> HĐ đã tất toán — khoá toàn bộ. Mở lại cần quyền "Mở lại HĐ đã tất toán" (HDB-03-ML).</p> }

      @if (saved(); as s) {
        <section class="card no-print">
          <div class="between">
            <div class="flow" aria-label="Luồng trạng thái">
              @for (t of flow; track t; let last = $last) {
                <span class="st" [class.done]="s.trangThai !== TT.HUY && idx(t) < idx(s.trangThai)" [class.cur]="t === s.trangThai">{{ ttNhan(t) }}</span>
                @if (!last) { <span class="sep">›</span> }
              }
              @if (s.trangThai === TT.HUY) { <span class="sep">·</span> <app-tt [v]="TT.HUY" /> }
            </div>
            <div class="btn-row">
              @if (s.trangThai === TT.DA_TAT_TOAN) {
                @if (store.canEdit('moLaiHdb') && !choXoa()) { <button type="button" class="btn sm quiet" (click)="moLai()">Mở lại</button> }
              } @else if (s.trangThai === TT.HUY) {
              } @else if (keTiep() && canFlow()) {
                @if (keTiep() === TT.DANG_GIAO_HANG) {
                  <span class="sub">Tự chuyển "Đang giao hàng" khi ghi nhận lần giao đầu tiên. HĐ không giao hàng (không có HĐ mua liên quan) chuyển thẳng "Hoàn thành".</span>
                } @else {
                  <button type="button" class="btn sm" [disabled]="thieu().length > 0" (click)="chuyen()">Chuyển → {{ ttNhan(keTiep()) }}</button>
                }
              }
              @if (huyDuoc()) { <button type="button" class="btn sm danger quiet" (click)="huyHd()">Huỷ HĐ</button> }
            </div>
          </div>
          @if (s.trangThai !== TT.DA_TAT_TOAN && s.trangThai !== TT.HUY && keTiep() !== TT.DANG_GIAO_HANG && thieu().length) {
            <p class="note warn">Còn thiếu để chuyển "{{ ttNhan(keTiep()) }}": {{ thieu().join(' · ') }}</p>
          }
          @if (keTiep() === TT.HOAN_THANH && c().hoSoThieu.length) {
            <p class="note warn">Lưu ý: thiếu hồ sơ {{ c().hoSoThieu.join(', ') }} — sẽ chặn bước "Đã tất toán".</p>
          }
        </section>
      }

      @if (!saved()) {
        <app-hdb-tao-moi [(draft)]="f" [edit1]="edit1()" [edit3]="edit3()" [xemTien]="xemTien()" [dangLuu]="dangLuu()" (tao)="taoMoi($event)" />
      } @else {
      <div class="tabs" role="tablist">
        @for (t of tabs(); track t.k) {
          <button type="button" role="tab" [class.on]="tab() === t.k" [attr.aria-selected]="tab() === t.k" (click)="setTab(t.k)">{{ t.k }}. {{ t.t }}</button>
        }
      </div>

      @if (saved(); as s) {
        <app-xem-file-hd [(open)]="xemFile" [files]="store.hoSoCua('HDB', s.id, 'Hợp đồng')?.files ?? []" [info]="infoFile()" />
      }

      @switch (tab()) {
        @case ('1') {
          <app-hdb-tab1 [(draft)]="f" [edit]="edit1()" [khoaDinhDanh]="!!saved() && saved()!.trangThai !== TT.BAO_GIA" />
          <app-file-hd chu="HDB" [chuId]="saved()?.id ?? ''" [edit]="edit1()" [info]="infoFile()" [(pending)]="fileCho" />
          @if (saved(); as s) {
            <app-hdb-giao-hang [h]="s" [khoa]="khoa()" />
            @if (store.canView('viec')) {
              <section class="card">
                <div class="section-title">
                  <h2>Đặt lịch / Giao việc cho HĐ này</h2>
                  @if (!khoa()) { <a class="btn sm quiet" routerLink="/viec" [queryParams]="{ moi: s.id }"><app-icon name="plus" [size]="15" /> Giao việc</a> }
                </div>
                <div class="tbl-wrap">
                  <table class="tbl compact">
                    <thead><tr><th>Hạn</th><th>Việc</th><th>Người nhận</th><th>Trạng thái</th></tr></thead>
                    <tbody>
                      @for (v of viecHD(); track v.id) {
                        <tr>
                          <td>{{ v.han ? v.han.split('-').reverse().join('/') : '—' }} {{ v.gio ?? '' }}</td>
                          <td><a routerLink="/viec" [queryParams]="{ id: v.id }">{{ v.noiDung }}</a></td>
                          <td>{{ v.nguoiNhan.length ? v.nguoiNhan.map(ten).join(', ') : ten(v.nguoiTao) }}</td>
                          <td>@if (v.xongLuc) { <span class="tag ok">✓ Xong</span> } @else { <span class="tag warn">Đang làm</span> }</td>
                        </tr>
                      } @empty {
                        <tr><td colspan="4" class="muted">Chưa có việc nào gắn HĐ này</td></tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>
            }
          }
          @else { <p class="sub">Lưu HĐ để ghi nhận giao hàng, hồ sơ và chi phí.</p> }
        }
        @case ('2') {
          @if (saved(); as s) {
            <section class="card">
              <app-ho-so chu="HDB" [chuId]="s.id" [soHD]="s.soHD" [edit]="edit1()" [giaTri]="c().sauVAT" [ghiChuThieu]="s.ghiChuHoSoThieu ?? ''" (ghiChuThieuChange)="luuGhiChuThieu($event)" />
            </section>
          }
        }
        @case ('3') {
          <app-hdb-tab3 [(draft)]="f" [saved]="saved()" [edit]="edit3()" [khoa]="khoa()" />
        }
        @case ('4') {
          @if (saved(); as s) { <app-hdb-tab4 [h]="s" /> }
        }
        @case ('5') {
          @if (saved()) {
          <section class="card">
            <div class="section-title">
              <h2>Đề nghị cấp vật tư</h2>
              <span class="sub">Hàng thiếu trong kho → đề nghị → HĐ mua. Gửi đề nghị ở Tab 3 (bảng Sản phẩm).</span>
            </div>
            <div class="tbl-wrap">
              <table class="tbl compact">
                <thead><tr><th>Số đề nghị</th><th>Ngày</th><th>Hàng đề nghị</th><th>HĐ mua</th><th>Trạng thái</th><th></th></tr></thead>
                <tbody>
                  @for (r of dnvts(); track r.dn.id) {
                    <tr>
                      <td><b>{{ r.dn.soPhieu }}</b></td>
                      <td>{{ r.dn.ngay.split('-').reverse().join('/') }}</td>
                      <td class="sub">@for (x of r.dn.dong; track x.id) { {{ x.loaiHang }}@if (x.tenHang) { ({{ x.tenHang }}) } × {{ x.soLuong }}@if (r.t.daMua.get(x.id)) { (mua {{ r.t.daMua.get(x.id) }}) } ; }</td>
                      <td>@for (m of r.t.hdm; track m.id) { <a [routerLink]="['/hop-dong-mua', m.id]">{{ m.soHD }}</a> } @empty { — }</td>
                      <td><app-tt [v]="r.t.trangThai" /> @if (r.dn.lyDoHuy) { <span class="sub">{{ r.dn.lyDoHuy }}</span> }</td>
                      <td class="btn-row">
                        @if (r.t.trangThai === 'Chờ mua' || r.t.trangThai === 'Đang mua một phần') {
                          @if (store.canEdit('hdm')) { <a class="btn sm" routerLink="/hop-dong-mua/moi" [queryParams]="{ dnvt: r.dn.id }"><app-icon name="plus" [size]="14" /> Tạo HĐ mua</a> }
                          @if (r.t.trangThai === 'Chờ mua' && store.canEdit('hdb', saved()!.sale) && !khoa()) { <button type="button" class="btn sm quiet" (click)="huyDN(r.dn.id, r.dn.soPhieu)">Huỷ</button> }
                        }
                      </td>
                    </tr>
                  } @empty {
                    <tr><td colspan="6" class="muted">Chưa có đề nghị cấp vật tư. Khi Tab 3 báo "Cần mua" (đỏ), bấm "Gửi đề nghị cấp vật tư".</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
          <section class="card">
            <div class="section-title">
              <h2>HĐ mua liên quan</h2>
              <span class="sub">HĐ mua tạo từ đề nghị cấp vật tư (1 HĐ mua có thể gom đề nghị của nhiều HĐ bán)</span>
            </div>
            <div class="tbl-wrap">
              <table class="tbl compact">
                <thead><tr><th>Số HĐ mua</th><th>NCC</th><th class="num">Giá trị VNĐ</th><th class="num">Đã trả</th><th>Nhập hàng</th><th>Trạng thái</th></tr></thead>
                <tbody>
                  @for (r of hdms(); track r.m.id) {
                    <tr class="click" (click)="moHdm(r.m.id)">
                      <td><a [routerLink]="['/hop-dong-mua', r.m.id]" (click)="$event.stopPropagation()"><b>{{ r.m.soHD }}</b></a> @if (r.m.thuocPhuTai) { <app-tt v="Thuộc Phú Tài" /> }</td>
                      <td>{{ r.m.tenNCC }}</td>
                      <td class="num">{{ money(r.c.tong) }}</td>
                      <td class="num">{{ money(r.c.daTra) }}</td>
                      <td>
                        <div class="cell-bar"><span>{{ pct(r.c.pctNhap, 0) }} nhập</span><div class="bar" [class.warn]="r.c.pctNhap < 1"><i [style.width.%]="r.c.pctNhap * 100"></i></div></div>
                      </td>
                      <td><app-tt [v]="r.m.trangThai" /></td>
                    </tr>
                  } @empty {
                    <tr><td colspan="6" class="muted">Chưa có HĐ mua nào cho HĐ này. Tạo HĐ mua từ đề nghị cấp vật tư ở bảng trên.</td></tr>
                  }
                </tbody>
              </table>
            </div>
          </section>
          }
        }
      }
      }
    }
  `,
})
export class HdbDetail {
  private readonly kt = inject(KiemTra);
  protected readonly store = inject(Store);
  protected readonly TT = TT;
  protected readonly ttNhan = ttNhan;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(Confirm);

  protected readonly money = money;
  protected readonly pct = pct;
  /** Luồng chính (không gồm Huỷ — hiện riêng như HĐ mua). */
  protected readonly flow = TRANG_THAI_HDB.filter((t) => t !== TT.HUY);

  private readonly id = toSignal(this.route.paramMap.pipe(map((m) => m.get('id') ?? 'moi')), { initialValue: this.route.snapshot.paramMap.get('id') ?? 'moi' });
  private readonly qTab = toSignal(this.route.queryParamMap.pipe(map((m) => m.get('tab'))), { initialValue: this.route.snapshot.queryParamMap.get('tab') });
  /** Tạo HĐ từ màn Khách hàng: /hop-dong-ban/moi?kh=KH0001 → chọn sẵn khách. */
  private readonly khMoi = this.route.snapshot.queryParamMap.get('kh') ?? undefined;
  protected readonly tab = computed(() => {
    const t = this.qTab() ?? '1';
    return this.tabs().some((x) => x.k === t) ? t : '1';
  });


  protected readonly saved = computed<HopDongBan | null>(() => {
    const id = this.id();
    return id === 'moi' ? null : (this.store.hdbById(id) ?? null);
  });
  protected readonly coQuyen = computed(() => {
    const id = this.id();
    if (id === 'moi') return this.store.canEdit('hdb');
    return this.store.hdbVisible().some((h) => h.id === id);
  });

  /** Bản nháp Tab 1 + Tab 3. Trạng thái / thực thu luôn lấy theo bản đã lưu. */
  protected readonly f = linkedSignal<HopDongBan | null, HopDongBan>({
    source: this.saved,
    computation: (s, prev) => {
      if (!s) return prev && !prev.value.id ? prev.value : this.store.newHdb(this.khMoi);
      if (prev && prev.value.id === s.id && vanTay(prev.value) !== vanTay(prev.source)) return ghepNhap(prev.value, s);
      return structuredClone(s);
    },
  });
  protected readonly dirty = computed(() => {
    const s = this.saved();
    return s ? vanTay(this.f()) !== vanTay(s) : true;
  });
  /** Có dữ liệu người dùng vừa nhập mà chưa lưu (HĐ mới để trống thì không tính). */
  private readonly chuaLuu = computed(() => {
    if (!this.edit1() && !this.edit3()) return false;
    if (this.saved()) return this.dirty();
    const h = this.f();
    return !!(h.soHD || h.maKH || h.truocVAT || h.thucTeTruocVAT || h.dotTT.length || h.ghiChu || h.ngayKy) || this.fileCho().length > 0;
  });
  private readonly unsaved = inject(Unsaved);
  /** Tab 3 / 4 (giá trị, công nợ, chi phí, lợi nhuận) chỉ hiện khi có quyền xem HDB-07. */
  protected readonly xemTien = computed(() => this.store.canView('hdbTab3'));
  protected readonly tabs = computed(() => TABS.filter((t) => this.xemTien() || (t.k !== '3' && t.k !== '4')));

  constructor() {
    canhBaoChuaLuu(() => this.chuaLuu());
  }

  protected readonly c = computed(() => hdbCalc(this.f(), this.store.db()));
  /** File hợp đồng chọn khi HĐ chưa lưu — tải lên ngay sau lần Lưu đầu. */
  protected readonly fileCho = signal<File[]>([]);
  protected readonly xemFile = signal(false);
  protected readonly coFileHd = computed(() => !!this.saved() && (this.store.hoSoCua('HDB', this.saved()!.id, 'Hợp đồng')?.files.length ?? 0) > 0);
  /** Tờ trình (Word) theo số liệu đang hiển thị (kể cả chưa lưu) — backend dựng từ mẫu. */
  protected async xuatToTrinh(): Promise<void> {
    const s = this.saved();
    if (!s) return;
    await xemThuToTrinhHdb(this.f());
  }
  protected readonly infoFile = computed<ThongTinHd>(() => {
    const h = this.f();
    return { loai: 'bán', soHD: h.soHD, tenDoiTac: h.tenKH, mst: h.mst, diaChi: h.diaChi, ngayKy: h.ngayKy, giaTri: this.c().sauVAT, ghiChu: h.ghiChu };
  });
  protected readonly choXoa = computed(() => !!this.saved() && this.store.dangChoXoa('HopDongBan', this.saved()!.id));
  protected readonly khoa = computed(() => !!this.saved() && this.store.hdbKhoa(this.saved()!));
  private readonly owner = computed(() => this.saved()?.sale ?? this.f().sale);
  protected readonly edit1 = computed(() => !this.khoa() && this.store.canEdit('hdb', this.owner()));
  protected readonly edit3 = computed(() => !this.khoa() && this.store.canEdit('hdbTab3', this.owner()) && this.store.canEdit('hdb', this.owner()));
  protected readonly canFlow = computed(() => !this.choXoa() && this.store.canEdit('hdb', this.owner()));

  protected readonly keTiep = computed<TrangThaiHDB | null>(() => {
    const s = this.saved();
    return s ? this.store.hdbKeTiep(s) : null;
  });
  protected readonly thieu = computed(() => {
    const s = this.saved();
    const k = this.keTiep();
    return s && k ? hdbThieuDeChuyen(s, k, this.store.db()) : [];
  });

  protected readonly hdms = computed(() => {
    const id = this.saved()?.id;
    const db = this.store.db();
    return id ? this.store.hopDongMua().filter((m) => hdmChoHdb(m, id)).map((m) => ({ m, c: hdmCalc(m, db) })) : [];
  });
  protected readonly viecHD = computed(() => {
    const id = this.saved()?.id;
    return id ? this.store.viecVisible().filter((v) => v.hdbId === id).sort((a, b) => Number(!!a.xongLuc) - Number(!!b.xongLuc) || (a.han ?? '').localeCompare(b.han ?? '')) : [];
  });
  protected readonly ten = (id: string) => this.store.userName(id);
  protected readonly dnvts = computed(() => {
    const id = this.saved()?.id;
    const db = this.store.db();
    return id
      ? this.store
          .deNghiVatTu()
          .filter((d) => d.hdbId === id)
          .sort((a, b) => (a.soPhieu < b.soPhieu ? 1 : -1))
          .map((dn) => ({ dn, t: dnvtTinhTrang(db, dn) }))
      : [];
  });
  protected async huyDN(id: string, so: string): Promise<void> {
    const ly = await this.confirm.prompt({ title: `Huỷ đề nghị ${so}?`, label: 'Lý do huỷ', minLength: 3, ok: 'Huỷ đề nghị' });
    if (ly === null) return;
    const e = this.store.huyDeNghiVatTu(id, ly);
    this.store.say(e ?? `Đã huỷ đề nghị ${so}`);
  }

  protected idx(t: TrangThaiHDB): number {
    return TRANG_THAI_HDB.indexOf(t);
  }

  protected setTab(k: string): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: k }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  /** Lưu bản nháp; trả true nếu thành công. */
  protected luu(): boolean {
    if (!this.kt.hopLe()) return false;
    const out = ghepNhap(structuredClone(this.f()), this.saved());
    const moi = !out.id;
    const err = this.store.saveHdb(out);
    if (err) {
      this.store.say(err);
      return false;
    }
    this.store.say('Đã lưu hợp đồng');
    if (moi) {
      void taiFileCho(this.store, 'HDB', out.id, this.fileCho());
      this.fileCho.set([]);
      this.f.set(structuredClone(this.store.hdbById(out.id)!));
      void this.unsaved.diSauKhiLuu(() => this.router.navigate(['/hop-dong-ban', out.id], { queryParams: { tab: this.tab() }, replaceUrl: true }));
    }
    return true;
  }

  protected readonly dangLuu = signal(false);

  /** Bước cuối wizard: tạo HĐ, tải các tệp hồ sơ đã chọn, rồi mở HĐ ở dạng 5 tab. */
  protected async taoMoi(cho: HoSoCho): Promise<void> {
    const out = ghepNhap(structuredClone(this.f()), null);
    const err = this.store.saveHdb(out);
    if (err) {
      this.store.say(err);
      return;
    }
    this.dangLuu.set(true);
    const n = await taiHoSoCho(this.store, 'HDB', out.id, cho);
    this.dangLuu.set(false);
    this.store.say(n ? `Đã tạo HĐ bán và lưu ${n} tệp hồ sơ` : 'Đã tạo HĐ bán');
    this.f.set(structuredClone(this.store.hdbById(out.id)!));
    void this.unsaved.diSauKhiLuu(() =>
      this.router.navigate(['/hop-dong-ban', out.id], { queryParams: { tab: '1', kh: null }, queryParamsHandling: 'merge', replaceUrl: true }),
    );
  }

  protected huyNhap(): void {
    const s = this.saved();
    this.f.set(s ? structuredClone(s) : this.store.newHdb(this.khMoi));
    this.kt.xoa();
  }

  protected async chuyen(): Promise<void> {
    const s = this.saved();
    const k = this.keTiep();
    if (!s || !k) return;
    if (this.dirty()) {
      if (!(await this.confirm.ask({ title: 'Lưu thay đổi trước khi chuyển trạng thái?', ok: 'Lưu & chuyển' }))) return;
      if (!this.luu()) return;
    }
    const msg =
      k === TT.HOAN_THANH
        ? 'Xác nhận đã giao đủ hàng cho khách.'
        : k === TT.DA_TAT_TOAN
          ? 'Sau khi tất toán, HĐ bị khoá toàn bộ; chỉ người có quyền "Mở lại HĐ đã tất toán" (HDB-03-ML) mở lại được.'
          : undefined;
    const chuaGiao = k === TT.HOAN_THANH ? hdbConChuaGiao(s, this.store.db()) : [];
    const warn =
      [
        k === TT.HOAN_THANH && this.c().hoSoThieu.length ? `Thiếu hồ sơ: ${this.c().hoSoThieu.join(', ')}` : '',
        chuaGiao.length ? `Còn hàng theo HĐ mua chưa giao: ${chuaGiao.map((x) => `${x.loaiHang} × ${x.con}`).join('; ')}` : '',
        k === TT.HOAN_THANH && s.trangThai === TT.HIEU_LUC ? 'HĐ không có HĐ mua / phiếu xuất — xác nhận đây là HĐ không giao hàng (dịch vụ).' : '',
      ]
        .filter(Boolean)
        .join(' · ') || undefined;
    if (!(await this.confirm.ask({ title: `Chuyển HĐ ${s.soHD} sang "${ttNhan(k)}"?`, message: msg, warn, ok: 'Chuyển' }))) return;
    const err = this.store.chuyenTrangThaiHdb(s.id, k);
    this.store.say(err ?? `Đã chuyển sang "${ttNhan(k)}"`);
  }

  /** Huỷ HĐ: chưa tất toán / chưa huỷ, có quyền sửa HĐ — điều kiện chi tiết (chưa thu, chưa xuất kho…) Store kiểm. */
  protected readonly huyDuoc = computed(() => {
    const s = this.saved();
    return !!s && s.trangThai !== TT.DA_TAT_TOAN && s.trangThai !== TT.HUY && !this.choXoa() && this.store.canEdit('hdb', s.sale);
  });
  protected async huyHd(): Promise<void> {
    const s = this.saved();
    if (!s) return;
    const ly = await this.confirm.prompt({
      title: `Huỷ HĐ bán ${s.soHD || '(báo giá)'}?`,
      message: 'Chỉ huỷ được khi chưa thu tiền, chưa xuất kho, không còn chi phí HĐ / đề nghị vật tư. HĐ huỷ bị khoá sửa, không tính vào doanh số / công nợ.',
      label: 'Lý do huỷ',
      minLength: 3,
      ok: 'Huỷ HĐ',
    });
    if (ly === null) return;
    const e = this.store.huyHdb(s.id, ly);
    this.store.say(e ?? `Đã huỷ HĐ ${s.soHD || '(báo giá)'}`);
  }

  protected async moLai(): Promise<void> {
    const s = this.saved();
    if (!s) return;
    if (!(await this.confirm.ask({ title: `Mở lại HĐ ${s.soHD}?`, message: 'HĐ quay về "Hoàn thành" và được sửa lại.', ok: 'Mở lại' }))) return;
    const err = this.store.moLaiHdb(s.id);
    this.store.say(err ?? 'Đã mở lại HĐ');
  }

  protected luuGhiChuThieu(v: string): void {
    const s = this.saved();
    if (!s) return;
    const err = this.store.saveHdb({ ...structuredClone(s), ghiChuHoSoThieu: v.trim() || undefined });
    if (err) this.store.say(err);
    else {
      this.f.update((h) => ({ ...h, ghiChuHoSoThieu: v.trim() || undefined }));
      this.store.say('Đã lưu ghi chú hồ sơ thiếu');
    }
  }

  protected async xoa(): Promise<void> {
    const s = this.saved();
    if (s) await guiXoa(this.confirm, this.store, 'HopDongBan', s.id, 'HĐ bán ' + s.soHD);
  }

  protected moHdm(id: string): void {
    void this.router.navigate(['/hop-dong-mua', id]);
  }
}
