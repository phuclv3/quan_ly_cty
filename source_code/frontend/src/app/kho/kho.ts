import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Store } from '../core/store';
import { Perm } from '../core/perm';
import { TT } from '../core/trang-thai';
import { TonKhoTab } from './ton-kho';
import { PhieuKhoTab } from './phieu-kho';
import { GiaTriHdTab } from './gia-tri-hd';
import { DmKhoTab } from './dm-kho';
import { DmLoaiHangTab } from './dm-loai-hang';
import { KiemKeTab } from './kiem-ke';
import { AnhXaTab } from './anh-xa';
import { DeNghiTab } from './de-nghi';
import { YeuCauXuatTab } from './yeu-cau-xuat';
import { BinhTemTab } from './binh-tem';
import { KhoBaoCao } from './kho-bao-cao';
import { ChuyenKhoTab } from './chuyen-kho';
import { TonTheoKhoTab } from './ton-theo-kho';

type Tab = 'ton' | 'nhap' | 'xuat' | 'chuyen-kho' | 'yeu-cau' | 'binh-tem' | 'de-nghi' | 'gia-tri' | 'kiem-ke' | 'anh-xa' | 'dm-kho' | 'loai-hang';

const TABS: { k: Tab; t: string; perm?: Perm }[] = [
  { k: 'ton', t: 'Tồn kho' },
  { k: 'nhap', t: 'Phiếu nhập' },
  { k: 'xuat', t: 'Phiếu xuất' },
  { k: 'chuyen-kho', t: 'Chuyển kho' },
  { k: 'yeu-cau', t: 'Yêu cầu xuất kho' },
  { k: 'binh-tem', t: 'Bình & tem', perm: 'inTem' },
  { k: 'de-nghi', t: 'Đề nghị vật tư' },
  { k: 'gia-tri', t: 'Giá vốn theo HĐ' },
  { k: 'kiem-ke', t: 'Kiểm kê' },
  { k: 'anh-xa', t: 'Ánh xạ tên bán' },
  { k: 'dm-kho', t: 'Danh mục kho' },
  { k: 'loai-hang', t: 'Danh mục mã hàng' },
];

/** Module Kho (KHO-01…KHO-10) theo LÔ — file KhoOxyMecie_v3: một trang, các tab đồng bộ ?tab=. */
@Component({
  selector: 'app-kho',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, TonKhoTab, PhieuKhoTab, YeuCauXuatTab, GiaTriHdTab, KiemKeTab, AnhXaTab, DeNghiTab, DmKhoTab, DmLoaiHangTab, BinhTemTab, KhoBaoCao, ChuyenKhoTab, TonTheoKhoTab],
  styles: `
    .seg { display: inline-flex; gap: 4px; padding: 4px; margin-bottom: 14px; border-radius: 999px; background: var(--surf); }
    .seg button { border: 0; background: none; padding: 7px 18px; border-radius: 999px; font-size: 13.5px; font-weight: 600; color: var(--ink-2); cursor: pointer; }
    .seg button.on { background: #0f5a2a; color: #fff; }
    .pills { display: flex; flex-wrap: wrap; gap: 4px 14px; align-items: center; padding: 8px 12px; margin-bottom: 14px; border-radius: 999px; background: var(--surf); }
    .pills button { border: 0; background: none; padding: 5px 12px; border-radius: 999px; font-size: 13px; font-weight: 500; color: var(--ink-2); cursor: pointer; white-space: nowrap; }
    .pills button.on { background: #0f5a2a; color: #fff; font-weight: 700; }
  `,
  template: `
    <div class="page-head">
      <div><div class="crumbs"><a routerLink="/">Trang chủ</a> › Kho &amp; Giao hàng › {{ che() === 'bc' ? "Báo cáo kho" : che() === 'tk' ? "Báo cáo tồn từng kho" : tabTen() }}</div><h1>Kho &amp; Giao hàng</h1></div>
    </div>
    <div class="seg" role="tablist">
      <button type="button" role="tab" [class.on]="che() === 'ql'" (click)="che.set('ql')">Quản lý kho</button>
      <button type="button" role="tab" [class.on]="che() === 'bc'" (click)="che.set('bc')">Báo cáo kho</button>
      <button type="button" role="tab" [class.on]="che() === 'tk'" (click)="che.set('tk')">Báo cáo tồn từng kho</button>
    </div>
    @if (che() === 'bc') {
      <app-kho-bao-cao />
    } @else if (che() === 'tk') {
      <app-kho-ton-theo-kho />
    } @else {
    <div class="pills" role="tablist">
      @for (t of tabs(); track t.k) {
        <button type="button" role="tab" [class.on]="tab() === t.k" [attr.aria-selected]="tab() === t.k" (click)="setTab(t.k)">{{ t.t }}</button>
      }
    </div>
    @switch (tab()) {
      @case ('ton') { <app-kho-ton /> }
      @case ('nhap') { <app-kho-phieu loai="Nhập" /> }
      @case ('xuat') { <app-kho-phieu loai="Xuất" /> }
      @case ('chuyen-kho') { <app-kho-chuyen /> }
      @case ('yeu-cau') { <app-kho-yeu-cau-xuat /> }
      @case ('binh-tem') { <app-kho-binh-tem /> }
      @case ('de-nghi') { <app-kho-de-nghi /> }
      @case ('gia-tri') { <app-kho-gia-tri /> }
      @case ('kiem-ke') { <app-kho-kiem-ke /> }
      @case ('anh-xa') { <app-kho-anh-xa /> }
      @case ('dm-kho') { <app-kho-dm /> }
      @case ('loai-hang') { <app-kho-loai-hang /> }
    }
    }
  `,
})
export class KhoPage {
  protected readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  /** Tab "Bình & tem" chỉ hiện với người có quyền KHO-10. */
  protected readonly tabs = computed(() => {
    const cho = this.store.yeuCauXuatKho().filter((y) => y.trangThai === TT.CHO_KHO).length;
    return TABS.filter((t) => !t.perm || this.store.canView(t.perm)).map((t) => (t.k === 'yeu-cau' && cho > 0 ? { ...t, t: `${t.t} (${cho})` } : t));
  });
  private readonly qTab = toSignal(this.route.queryParamMap.pipe(map((m) => m.get('tab'))), { initialValue: null });
  protected readonly tab = computed<Tab>(() => {
    const t = this.qTab();
    return this.tabs().some((x) => x.k === t) ? (t as Tab) : 'ton';
  });
  protected readonly che = signal<'ql' | 'bc' | 'tk'>('ql');
  protected readonly tabTen = computed(() => TABS.find((x) => x.k === this.tab())?.t ?? '');

  protected setTab(t: Tab): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t }, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
