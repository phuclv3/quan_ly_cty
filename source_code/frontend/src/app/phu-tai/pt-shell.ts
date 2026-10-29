import { ChangeDetectionStrategy, Component, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Store } from '../core/store';
import { PtBaoCao } from './pt-bao-cao';
import { PtDoiSoat } from './pt-doi-soat';
import { PtGdKh } from './pt-gd-kh';
import { PtGdNcc } from './pt-gd-ncc';
import { PtSoQuy } from './pt-so-quy';

type Tab = 'kh' | 'ncc' | 'doi-soat' | 'so-quy' | 'bao-cao';

const TABS: { k: Tab; t: string }[] = [
  { k: 'kh', t: '1. Giao dịch khách hàng' },
  { k: 'ncc', t: '2. Giao dịch NCC' },
  { k: 'doi-soat', t: '3. Đối soát quyền lợi OXY' },
  { k: 'so-quy', t: '4. Sổ quỹ Phú Tài' },
  { k: 'bao-cao', t: '5. Báo cáo' },
];

/**
 * Module Phú Tài: 5 tab dựng trên HĐ bán / HĐ mua có tích "Thuộc Phú Tài". Mọi số liệu do backend tính (GET /phu-tai/...).
 * ?tab=kh|ncc|doi-soat|so-quy|bao-cao.
 */
@Component({
  selector: 'app-pt-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, PtGdKh, PtGdNcc, PtDoiSoat, PtSoQuy, PtBaoCao],
  template: `
    <div class="page-head">
      <div>
        <div class="crumbs"><a routerLink="/">Trang chủ</a> › Phú Tài › {{ tenTab() }}</div>
        <h1>Phú Tài</h1>
      </div>
      <div class="actions">
        @if (tab() === 'kh' || tab() === 'ncc') {
          <button type="button" class="btn quiet pill" (click)="xuat()">Xuất Excel</button>
        }
        @if (tab() === 'kh' && store.canEdit('hdb')) {
          <a class="btn pill hero" routerLink="/hop-dong-ban/moi" [queryParams]="{ phuTai: 1 }">+ Tạo HĐ khách hàng</a>
        }
        @if (tab() === 'ncc' && store.canEdit('hdm')) {
          <a class="btn pill hero" routerLink="/hop-dong-mua/moi" [queryParams]="{ phuTai: 1 }">+ Tạo HĐ mua</a>
        }
      </div>
    </div>

    <div class="tabs" role="tablist">
      @for (t of tabs; track t.k) {
        <button type="button" role="tab" [class.on]="tab() === t.k" (click)="setTab(t.k)">{{ t.t }}</button>
      }
    </div>

    @switch (tab()) {
      @case ('kh') { <app-pt-gd-kh #gdKh /> }
      @case ('ncc') { <app-pt-gd-ncc #gdNcc /> }
      @case ('doi-soat') { <app-pt-doi-soat /> }
      @case ('so-quy') { <app-pt-so-quy /> }
      @case ('bao-cao') { <app-pt-bao-cao /> }
    }
  `,
})
export class PtShell {
  protected readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly tabs = TABS;

  private readonly gdKh = viewChild(PtGdKh);
  private readonly gdNcc = viewChild(PtGdNcc);

  protected readonly tab = toSignal(
    this.route.queryParamMap.pipe(map((q): Tab => (TABS.some((t) => t.k === q.get('tab')) ? (q.get('tab') as Tab) : 'kh'))),
    { initialValue: 'kh' as Tab },
  );
  protected tenTab(): string {
    return TABS.find((t) => t.k === this.tab())?.t.replace(/^\d+\.\s*/, '') ?? '';
  }

  protected setTab(t: Tab): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: t }, queryParamsHandling: 'merge', replaceUrl: true });
  }
  protected xuat(): void {
    (this.tab() === 'kh' ? this.gdKh() : this.gdNcc())?.xuat();
  }
}
