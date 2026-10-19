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
import { TrangThai } from '../shared/ui-kit';

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
  imports: [RouterLink, FilterBar, Pager, TrangThai],
  template: `
    <div class="page-head">
      <div>
        <div class="crumbs">Hệ thống › Duyệt xoá</div>
        <h1>Duyệt xoá</h1>
      </div>
    </div>

    <div class="note info">
      Không xoá thẳng — kể cả Giám đốc. Mọi nút Xoá chỉ tạo yêu cầu, bản ghi hiện nhãn "Chờ xoá" và khoá sửa tới khi được duyệt.
      Kế toán chỉ duyệt phiếu kế toán (phiếu thu chi, chi phí thực hiện HĐ, nguồn tiền, loại chi phí).
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
                @if (link(y); as l) {
                  <a class="linkish" [routerLink]="l.path" [queryParams]="l.query">Mở</a>
                }
              </td>
              <td>{{ y.lyDo }}</td>
              <td>
                <app-tt [v]="y.trangThai" />
                @if (y.trangThai === 'Đã duyệt' || y.trangThai === 'Từ chối') {
                  <div class="sub">{{ store.userName(y.nguoiDuyet) }} · {{ viMoment(y.ngayDuyet) }}</div>
                } @else if (y.trangThai === 'Đã rút') {
                  <div class="sub">{{ viMoment(y.ngayDuyet) }}</div>
                }
                @if (y.lyDoTuChoi) { <div class="sub">Lý do: {{ y.lyDoTuChoi }}</div> }
              </td>
              <td>
                @if (y.trangThai === 'Chờ duyệt') {
                  <div class="btn-row" style="justify-content:flex-start">
                    @if (store.canDuyetXoa(y)) {
                      <button class="btn sm ok" (click)="duyet(y)">Duyệt</button>
                      <button class="btn sm danger" (click)="tuChoi(y)">Từ chối</button>
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
  `,
})
export class DuyetXoaPage {
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly viMoment = viMoment;

  private readonly qp = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  protected readonly tab = computed<Tab>(() => (this.qp().get('tab') === 'da-xu-ly' ? 'da-xu-ly' : 'cho-duyet'));
  protected readonly loc = signal<Loc>(nhoLoc('duyet-xoa', LOC_RONG));

  protected readonly duyetDuoc = computed(() => this.store.canApprove('duyetXoa'));

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
      .filter((y) => y.trangThai === 'Chờ duyệt')
      .sort((a, b) => a.ngayGui.localeCompare(b.ngayGui)),
  );
  private readonly daXuLy = computed(() =>
    this.locDung()
      .filter((y) => y.trangThai !== 'Chờ duyệt')
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
        return p ? { path: '/kho', query: { tab: p.loai === 'Nhập' ? 'nhap' : 'xuat' } } : null;
      }
      case 'PhieuThuChi':
        return s.phieuById(id) ? { path: '/ke-toan', query: { tab: 'so-quy' } } : null;
      case 'ChiPhiThucHienHD':
        return s.db().chiPhiHD.some((x) => x.id === id) ? { path: '/ke-toan', query: { tab: 'chi-phi' } } : null;
      case 'HoaDon': {
        const h = s.db().hoaDon.find((x) => x.id === id);
        return h ? theoChu(h.chu, h.chuId) : null;
      }
      case 'HoSo': {
        const h = s.db().hoSo.find((x) => x.id === id.split(':')[0]);
        return h ? theoChu(h.chu, h.chuId) : null;
      }
      case 'DongTienPhuTai':
        return s.db().dongTienPT.some((x) => x.id === id) ? { path: '/phu-tai' } : null;
      default:
        return y.loai.startsWith('DM_') ? { path: '/danh-muc' } : null;
    }
  }

  protected async duyet(y: YeuCauXoa): Promise<void> {
    const ok = await this.confirm.ask({
      title: `Duyệt xoá ${this.store.nhanDoiTuong(y.loai).toLowerCase()} "${y.moTa}"?`,
      message:
        y.loai === 'PhieuKho'
          ? 'Phiếu kho chuyển "Đã huỷ" và tồn kho được tính lại ngay; SL đã nhập / lần giao của HĐ liên quan cập nhật theo.'
          : 'Bản ghi bị xoá hẳn, không khôi phục được. Số dư nguồn tiền, tồn kho, công nợ liên quan được tính lại ngay theo dữ liệu còn lại.',
      warn: `Lý do người gửi: ${y.lyDo}`,
      ok: 'Duyệt xoá',
    });
    if (!ok) return;
    const e = this.store.duyetXoa(y.id);
    this.store.say(e ?? 'Đã duyệt xoá');
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
  }

  protected async rut(y: YeuCauXoa): Promise<void> {
    const ok = await this.confirm.ask({ title: `Rút yêu cầu xoá "${y.moTa}"?`, message: 'Bản ghi được mở khoá sửa lại.', ok: 'Rút yêu cầu' });
    if (!ok) return;
    const e = this.store.rutYeuCau(y.id);
    this.store.say(e ?? 'Đã rút yêu cầu');
  }
}
