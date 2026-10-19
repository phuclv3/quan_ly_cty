import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Store } from '../core/store';
import { Perm } from '../core/perm';
import { DmKhachHang } from './dm-khach-hang';
import { DmNcc } from './dm-ncc';
import { DmLoaiChiPhi } from './dm-loai-chi-phi';

type Tab = 'kh' | 'ncc' | 'lcp';

const TABS: { k: Tab; t: string; p: Perm }[] = [
  { k: 'kh', t: 'Khách hàng', p: 'khachHang' },
  { k: 'ncc', t: 'Nhà cung cấp', p: 'ncc' },
  { k: 'lcp', t: 'Loại chi phí', p: 'nguonTien' },
];

/** Danh mục: Khách hàng (HDB-13), Nhà cung cấp (HDM-10), Loại chi phí (KT-03). Tab đồng bộ ?tab=. */
@Component({
  selector: 'app-danh-muc',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, DmKhachHang, DmNcc, DmLoaiChiPhi],
  template: `
    <div class="page-head">
      <div><div class="crumbs"><a routerLink="/">Trang chủ</a> › Danh mục › {{ tabTen() }}</div><h1>Danh mục</h1></div>
    </div>
    <div class="tabs" role="tablist">
      @for (t of tabs(); track t.k) {
        <button type="button" role="tab" [class.on]="tab() === t.k" [attr.aria-selected]="tab() === t.k" (click)="setTab(t.k)">{{ t.t }}</button>
      }
    </div>
    @switch (tab()) {
      @case ('kh') { <app-dm-kh /> }
      @case ('ncc') { <app-dm-ncc /> }
      @case ('lcp') { <app-dm-lcp /> }
    }
  `,
})
export class DanhMucPage {
  protected readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly tabs = computed(() => TABS.filter((t) => this.store.canView(t.p)));
  private readonly qTab = toSignal(this.route.queryParamMap.pipe(map((m) => m.get('tab'))), { initialValue: null });
  protected readonly tab = computed<Tab | null>(() => {
    const t = this.qTab();
    const ok = this.tabs();
    return ok.find((x) => x.k === t)?.k ?? ok[0]?.k ?? null;
  });
  protected readonly tabTen = computed(() => TABS.find((x) => x.k === this.tab())?.t ?? '');

  constructor() {
    effect(() => {
      const t = this.tab();
      if (t && this.qTab() && this.qTab() !== t) this.setTab(t);
    });
  }

  protected setTab(t: Tab): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t }, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
