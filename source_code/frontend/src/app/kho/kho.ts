import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Store } from '../core/store';
import { TonKhoTab } from './ton-kho';
import { PhieuKhoTab } from './phieu-kho';
import { GiaTriHdTab } from './gia-tri-hd';
import { DmKhoTab } from './dm-kho';
import { DmLoaiHangTab } from './dm-loai-hang';
import { KiemKeTab } from './kiem-ke';
import { AnhXaTab } from './anh-xa';

type Tab = 'ton' | 'nhap' | 'xuat' | 'gia-tri' | 'kiem-ke' | 'anh-xa' | 'dm-kho' | 'loai-hang';

const TABS: { k: Tab; t: string }[] = [
  { k: 'ton', t: 'Tồn kho' },
  { k: 'nhap', t: 'Phiếu nhập' },
  { k: 'xuat', t: 'Phiếu xuất' },
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
  imports: [RouterLink, TonKhoTab, PhieuKhoTab, GiaTriHdTab, KiemKeTab, AnhXaTab, DmKhoTab, DmLoaiHangTab],
  template: `
    <div class="page-head">
      <div><div class="crumbs"><a routerLink="/">Trang chủ</a> › Kho › {{ tabTen() }}</div><h1>Kho</h1></div>
    </div>
    <div class="tabs" role="tablist">
      @for (t of tabs; track t.k) {
        <button type="button" role="tab" [class.on]="tab() === t.k" [attr.aria-selected]="tab() === t.k" (click)="setTab(t.k)">{{ t.t }}</button>
      }
    </div>
    @switch (tab()) {
      @case ('ton') { <app-kho-ton /> }
      @case ('nhap') { <app-kho-phieu loai="Nhập" /> }
      @case ('xuat') { <app-kho-phieu loai="Xuất" /> }
      @case ('gia-tri') { <app-kho-gia-tri /> }
      @case ('kiem-ke') { <app-kho-kiem-ke /> }
      @case ('anh-xa') { <app-kho-anh-xa /> }
      @case ('dm-kho') { <app-kho-dm /> }
      @case ('loai-hang') { <app-kho-loai-hang /> }
    }
  `,
})
export class KhoPage {
  protected readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly tabs = TABS;
  private readonly qTab = toSignal(this.route.queryParamMap.pipe(map((m) => m.get('tab'))), { initialValue: null });
  protected readonly tab = computed<Tab>(() => {
    const t = this.qTab();
    return TABS.some((x) => x.k === t) ? (t as Tab) : 'ton';
  });
  protected readonly tabTen = computed(() => TABS.find((x) => x.k === this.tab())?.t ?? '');

  protected setTab(t: Tab): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t }, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
