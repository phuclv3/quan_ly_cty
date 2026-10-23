import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { nhoLoc } from '../core/ui';
import { viMoment } from '../core/util';
import { DOI_TUONG_LABEL, DoiTuong, YeuCauXoa } from '../core/models';
import { Confirm } from '../shared/confirm';
import { FilterBar, Facet, LOC_RONG, Loc, khopQ, khopSel } from '../shared/filter-bar';
import { Pager, paginate } from '../shared/pager';
import { Modal, TrangThai } from '../shared/ui-kit';
import { linkPhieuKho } from '../kho/kho-util';
import { TT } from '../core/trang-thai';

type Tab = 'cho-duyet' | 'da-xu-ly';

interface LinkDT {
  path: string;
  query?: Record<string, string>;
}

/** NT-11 — Duyệt xoá (Request → Approve). */
@Component({
  selector: 'app-duyet-xoa',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, FilterBar, Pager, TrangThai, Modal],
  template: `
    <div class="page-head">
      <div>
        <div class="crumbs"><a routerLink="/">Trang chủ</a> › Hệ thống › Duyệt xoá</div>
        <h1>Duyệt xoá</h1>
      </div>
    </div>

    <div class="note info">
      Không xoá trực tiếp, kể cả Giám đốc. Nhấn Xoá sẽ tạo yêu cầu, bản ghi chuyển sang trạng thái “Chờ xoá” và khoá chỉnh sửa đến khi được duyệt.
      Kế toán chỉ được duyệt xoá các phiếu thu/chi, chi phí thực hiện hợp đồng, nguồn tiền và loại chi phí.
    </div>
    @if (!duyetDuoc()) {
      <p class="muted">Bạn chỉ thấy các yêu cầu do mình gửi.</p>
    }

    <div class="tabs" role="tablist">
      <button role="tab" [class.on]="tab() === 'cho-duyet'" (click)="setTab('cho-duyet')">Chờ duyệt ({{ choDuyet().length }})</button>
      <button role="tab" [class.on]="tab() === 'da-xu-ly'" (click)="setTab('da-xu-ly')">Đã xử lý</button>
    </div>

    <app-filter [(loc)]="loc" memo="duyet-xoa" [facets]="facets()" [time]="false" placeholder="Tìm đối tượng, lý do, người gửi…" />

    <div class="tbl-wrap">
      <table class="tbl freeze">
        <thead>
          <tr>
            <th>Ngày gửi</th>
            <th>Người gửi</th>
            <th>Loại</th>
            <th>Đối tượng</th>
            <th>Lý do</th>
            <th>Kết quả</th>
            <th>Hành động</th>
          </tr>
        </thead>
        <tbody>
          @for (y of pg.items(); track y.id) {
            <tr>
              <td>{{ viMoment(y.ngayGui) }}</td>
              <td>{{ store.userName(y.nguoiGui) }}</td>
              <td>{{ store.nhanDoiTuong(y.loai) }}</td>
              <td>
                {{ y.moTa }}
                <span class="btn-row" style="justify-content:flex-start">
                  <button type="button" class="linkish" (click)="xem.set(y)">Xem</button>
                  @if (link(y); as l) { <a class="linkish" [routerLink]="l.path" [queryParams]="l.query">Mở bản ghi</a> }
                </span>
              </td>
              <td>{{ y.lyDo }}</td>
              <td>
                <app-tt [v]="y.trangThai" />
                @if (y.trangThai === TT.DA_DUYET || y.trangThai === TT.TU_CHOI) {
                  <div class="sub">{{ store.userName(y.nguoiDuyet) }} · {{ viMoment(y.ngayDuyet) }}</div>
                } @else if (y.trangThai === TT.DA_RUT) {
                  <div class="sub">{{ viMoment(y.ngayDuyet) }}</div>
                }
                @if (y.lyDoTuChoi) { <div class="sub">Lý do: {{ y.lyDoTuChoi }}</div> }
              </td>
              <td>
                @if (y.trangThai === TT.CHO_DUYET) {
                  <div class="btn-row" style="justify-content:flex-start">
                    @if (store.duyetXoaDuoc(y)) {
                      <button class="btn sm danger" (click)="duyet(y)">Duyệt xoá</button>
                      <button class="btn sm quiet" (click)="tuChoi(y)">Từ chối</button>
                    }
                    @if (y.nguoiGui === store.meId()) {
                      <button class="btn sm quiet" (click)="rut(y)">Rút yêu cầu</button>
                    }
                  </div>
                } @else {
                  <span class="muted">—</span>
                }
              </td>
            </tr>
          } @empty {
            <tr><td colspan="7" class="empty">{{ tab() === 'cho-duyet' ? 'Không có yêu cầu nào đang chờ duyệt' : 'Chưa có yêu cầu đã xử lý' }}</td></tr>
          }
        </tbody>
      </table>
    </div>
    <app-pager [pager]="pg" />

    <app-modal [open]="!!xem()" [title]="'Yêu cầu xoá ' + (xem()?.id ?? '')" [sub]="xem() ? store.nhanDoiTuong(xem()!.loai) : ''" size="md" (closed)="xem.set(null)">
      @if (xem(); as y) {
        <div class="form-grid">
          <div class="field wide"><span class="lbl">Đối tượng</span><div class="ro">{{ y.moTa }}</div></div>
          <div class="field"><span class="lbl">Người gửi</span><div class="ro">{{ store.userName(y.nguoiGui) }} · {{ viMoment(y.ngayGui) }}</div></div>
          <div class="field"><span class="lbl">Trạng thái</span><div class="ro"><app-tt [v]="y.trangThai" /></div></div>
          <div class="field full"><span class="lbl">Lý do xoá</span><div class="ro">{{ y.lyDo }}</div></div>
        </div>
        @let tt = store.tomTatDoiTuong(y.loai, y.maDoiTuong);
        @if (tt.length) {
          <h3 class="section-title">Bản ghi hiện tại</h3>
          <table class="tbl compact"><tbody>
            @for (r of tt; track r[0]) { <tr><th scope="row">{{ r[0] }}</th><td>{{ r[1] }}</td></tr> }
          </tbody></table>
        } @else if (y.trangThai === TT.CHO_DUYET && !link(y)) {
          <p class="note warn">Không còn tìm thấy bản ghi.</p>
        }
        @if (y.trangThai === TT.CHO_DUYET) {
          @let ah = store.anhHuongXoa(y);
          @if (ah.length) {
            <div class="note warn"><b>Duyệt sẽ kéo theo:</b><ul style="margin:4px 0 0 18px">@for (a of ah; track a) { <li>{{ a }}</li> }</ul></div>
          }
        }
      }
      <div foot class="btn-row">
        @if (xem(); as y) {
          @if (link(y); as l) { <a class="btn quiet" [routerLink]="l.path" [queryParams]="l.query">Mở bản ghi</a> }
          <span style="flex:1"></span>
          <button type="button" class="btn quiet" (click)="xem.set(null)">Đóng</button>
          @if (y.trangThai === TT.CHO_DUYET && store.duyetXoaDuoc(y)) {
            <button type="button" class="btn quiet" (click)="tuChoi(y)">Từ chối</button>
            <button type="button" class="btn danger-solid" (click)="duyet(y)">Duyệt xoá</button>
          }
        }
      </div>
    </app-modal>
  `,
})
export class DuyetXoaPage {
  protected readonly TT = TT;
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly viMoment = viMoment;

  private readonly qp = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  protected readonly tab = computed<Tab>(() => (this.qp().get('tab') === 'da-xu-ly' ? 'da-xu-ly' : 'cho-duyet'));
  protected readonly loc = signal<Loc>(nhoLoc('duyet-xoa', LOC_RONG));

  /** Duyệt được mọi loại (NT-11) hoặc chứng từ kế toán (NT-11-KT). */
  protected readonly duyetDuoc = computed(() => this.store.coQuyenDuyetXoa());
  protected readonly xem = signal<YeuCauXoa | null>(null);

  /** Người không duyệt được yêu cầu nào thì chỉ thấy yêu cầu của mình. */
  private readonly thayDuoc = computed(() => {
    const me = this.store.meId();
    return this.store.yeuCauXoa().filter((y) => y.nguoiGui === me || this.store.canDuyetXoa(y));
  });

  private readonly locDung = computed(() => {
    const l = this.loc();
    return this.thayDuoc().filter(
      (y) => khopSel(l, 'loai', y.loai) && khopQ(l, y.moTa, y.lyDo, y.maDoiTuong, this.store.userName(y.nguoiGui), DOI_TUONG_LABEL[y.loai]),
    );
  });

  protected readonly choDuyet = computed(() =>
    this.locDung()
      .filter((y) => y.trangThai === TT.CHO_DUYET)
      .sort((a, b) => a.ngayGui.localeCompare(b.ngayGui)),
  );
  private readonly daXuLy = computed(() =>
    this.locDung()
      .filter((y) => y.trangThai !== TT.CHO_DUYET)
      .sort((a, b) => (b.ngayDuyet ?? b.ngayGui).localeCompare(a.ngayDuyet ?? a.ngayGui)),
  );
  private readonly rows = computed(() => (this.tab() === 'cho-duyet' ? this.choDuyet() : this.daXuLy()));
  protected readonly pg = paginate(this.rows);

  protected readonly facets = computed<Facet[]>(() => {
    const co = new Set(this.thayDuoc().map((y) => y.loai));
    return [
      {
        key: 'loai',
        label: 'Loại',
        options: (Object.keys(DOI_TUONG_LABEL) as DoiTuong[]).filter((k) => co.has(k)).map((k) => ({ value: k, label: DOI_TUONG_LABEL[k] })),
      },
    ];
  });

  protected setTab(t: Tab): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  /** Đường tới bản ghi nếu còn mở được. */
  protected link(y: YeuCauXoa): LinkDT | null {
    const s = this.store;
    const id = y.maDoiTuong;
    const theoChu = (chu: string, chuId: string): LinkDT | null =>
      chu === 'HDB' ? { path: `/hop-dong-ban/${chuId}` } : chu === 'HDM' ? { path: `/hop-dong-mua/${chuId}` } : { path: `/phu-tai/${chuId}` };
    switch (y.loai) {
      case 'HopDongBan':
        return s.hdbById(id) ? { path: `/hop-dong-ban/${id}` } : null;
      case 'HopDongMua':
        return s.hdmById(id) ? { path: `/hop-dong-mua/${id}` } : null;
      case 'HopDongPhuTai':
        return s.ptById(id) ? { path: `/phu-tai/${id}` } : null;
      case 'PhieuKho': {
        const p = s.db().phieuKho.find((x) => x.id === id);
        return p ? { path: '/kho', query: linkPhieuKho(p) } : null;
      }
      case 'PhieuThuChi':
        return s.phieuById(id) ? { path: '/ke-toan', query: { tab: 'so-quy', id } } : null;
      case 'ChiPhiThucHienHD':
        return s.db().chiPhiHD.some((x) => x.id === id) ? { path: '/ke-toan', query: { tab: 'chi-phi', id } } : null;
      case 'HoaDon': {
        const h = s.db().hoaDon.find((x) => x.id === id);
        return h ? theoChu(h.chu, h.chuId) : null;
      }
      case 'HoSo': {
        const h = s.db().hoSo.find((x) => x.id === id.split(':')[0]);
        return h ? theoChu(h.chu, h.chuId) : null;
      }
      case 'DongTienPhuTai': {
        const d = s.db().dongTienPT.find((x) => x.id === id);
        return d ? { path: '/phu-tai', query: d.hdptId ? { tab: 'dong-tien', hd: d.hdptId } : { tab: 'dong-tien' } } : null;
      }
      case 'DM_KhachHang':
        return s.khById(id) ? { path: '/khach-hang/' + id, query: {} } : null;
      case 'DM_NCC':
        return s.nccById(id) ? { path: '/nha-cung-cap', query: { id } } : null;
      case 'DM_LoaiChiPhi':
        return s.lcpById(id) ? { path: '/ke-toan', query: { tab: 'lcp' } } : null;
      case 'DM_NguonTien':
        return s.nguonById(id) ? { path: '/ke-toan', query: { tab: 'nguon' } } : null;
      case 'DM_Kho':
        return s.khoById(id) ? { path: '/kho', query: { tab: 'dm-kho' } } : null;
      case 'DM_LoaiHang':
        return s.loaiHangById(id) ? { path: '/kho', query: { tab: 'loai-hang' } } : null;
      default:
        return null;
    }
  }

  protected async duyet(y: YeuCauXoa): Promise<void> {
    const ah = this.store.anhHuongXoa(y);
    const ok = await this.confirm.ask({
      title: `Duyệt xoá ${this.store.nhanDoiTuong(y.loai).toLowerCase()} "${y.moTa}"?`,
      message:
        y.loai === 'PhieuKho'
          ? 'Phiếu kho chuyển "Đã huỷ" và tồn kho được tính lại ngay; SL đã nhập / lần giao của HĐ liên quan cập nhật theo.'
          : 'Bản ghi bị xoá hẳn, không khôi phục được. Số dư nguồn tiền, tồn kho, công nợ liên quan được tính lại ngay theo dữ liệu còn lại.',
      warn: [`Lý do người gửi: ${y.lyDo}`, ...ah].join(' · '),
      ok: 'Duyệt xoá',
    });
    if (!ok) return;
    const e = this.store.duyetXoa(y.id);
    this.store.say(e ?? 'Đã duyệt xoá');
    if (!e) this.xem.set(null);
  }

  protected async tuChoi(y: YeuCauXoa): Promise<void> {
    const lyDo = await this.confirm.prompt({
      title: `Từ chối yêu cầu xoá "${y.moTa}"?`,
      message: 'Bản ghi được giữ nguyên và mở khoá sửa lại.',
      label: 'Lý do từ chối',
      minLength: 3,
      multiline: true,
      ok: 'Từ chối',
    });
    if (lyDo === null) return;
    const e = this.store.tuChoiXoa(y.id, lyDo);
    this.store.say(e ?? 'Đã từ chối yêu cầu xoá');
    if (!e) this.xem.set(null);
  }

  protected async rut(y: YeuCauXoa): Promise<void> {
    const ok = await this.confirm.ask({ title: `Rút yêu cầu xoá "${y.moTa}"?`, message: 'Bản ghi được mở khoá sửa lại.', ok: 'Rút yêu cầu' });
    if (!ok) return;
    const e = this.store.rutYeuCau(y.id);
    this.store.say(e ?? 'Đã rút yêu cầu');
  }
}
