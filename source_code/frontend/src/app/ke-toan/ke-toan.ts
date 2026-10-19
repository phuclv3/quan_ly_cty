import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { Store } from '../core/store';
import { NguonTienTab } from './nguon-tien';
import { SoQuyTab } from './so-quy';
import { ChiPhiTab } from './chi-phi';
import { ChoDuyetTab } from './cho-duyet';
import { CongNoTab } from './cong-no';
import { BaoCaoKtTab } from './bao-cao-kt';

type Tab = 'nguon' | 'so-quy' | 'chi-phi' | 'cho-duyet' | 'cong-no' | 'bao-cao';

/** Màn Kế toán: các tab đồng bộ ?tab= (KT-01…KT-18, trừ KT-03 ở Danh mục). */
@Component({
  selector: 'app-ke-toan',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [NguonTienTab, SoQuyTab, ChiPhiTab, ChoDuyetTab, CongNoTab, BaoCaoKtTab],
  template: `
    <div class="page-head">
      <div><div class="crumbs">Kế toán</div><h1>Kế toán</h1></div>
    </div>
    <div class="tabs" role="tablist">
      @for (t of tabs(); track t.k) {
        <button type="button" role="tab" [class.on]="tab() === t.k" [attr.aria-selected]="tab() === t.k" (click)="setTab(t.k)">
          {{ t.t }}
          @if (t.k === 'cho-duyet' && soCho() > 0) { <span class="count">{{ soCho() }}</span> }
        </button>
      }
    </div>
    @switch (tab()) {
      @case ('nguon') { <app-kt-nguon /> }
      @case ('so-quy') { <app-kt-so-quy /> }
      @case ('chi-phi') { <app-kt-chi-phi /> }
      @case ('cho-duyet') { <app-kt-cho-duyet /> }
      @case ('cong-no') { <app-kt-cong-no /> }
      @case ('bao-cao') { <app-kt-bao-cao /> }
      @default { <div class="card empty">Tài khoản của bạn không có quyền xem mục nào của Kế toán</div> }
    }
  `,
})
export class KeToanPage {
  protected readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly qTab = toSignal(this.route.queryParamMap.pipe(map((m) => m.get('tab'))), { initialValue: null });

  protected readonly tabs = computed(() => {
    const s = this.store;
    const out: { k: Tab; t: string }[] = [];
    if (s.canView('nguonTien')) out.push({ k: 'nguon', t: 'Nguồn tiền' });
    if (s.canView('soQuy')) out.push({ k: 'so-quy', t: 'Sổ quỹ' });
    if (s.canView('cpHD')) out.push({ k: 'chi-phi', t: 'Chi phí HĐ' });
    if (s.canApprove('soQuyDuyet') || s.canApprove('cpHDDuyet')) out.push({ k: 'cho-duyet', t: 'Chờ duyệt' });
    if (s.canView('congNo')) out.push({ k: 'cong-no', t: 'Công nợ' });
    const l = s.level('soQuy');
    if ((l !== 'none' && l !== 'draft') || s.canView('nguonTien') || s.canView('cpHD')) out.push({ k: 'bao-cao', t: 'Báo cáo' });
    return out;
  });

  protected readonly tab = computed<Tab | null>(() => {
    const q = this.qTab();
    const list = this.tabs();
    return list.find((t) => t.k === q)?.k ?? list[0]?.k ?? null;
  });

  protected readonly soCho = computed(
    () =>
      (this.store.canApprove('soQuyDuyet') ? this.store.phieuChoDuyet().length : 0) +
      (this.store.canApprove('cpHDDuyet') ? this.store.cpChoDuyet().length : 0),
  );

  protected setTab(k: Tab): void {
    void this.router.navigate([], { relativeTo: this.route, queryParams: { tab: k, hdb: null, bc: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }
}
