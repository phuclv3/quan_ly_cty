import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Store } from '../core/store';
import { LichSuDuyet } from '../core/models';
import { viMoment } from '../core/util';

/** Khối "Lịch sử" của chứng từ: ai gửi / duyệt / từ chối, khi nào, lý do (giữ cả lần từ chối cũ). */
@Component({
  selector: 'app-lich-su',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (rows().length) {
      <details class="wide" [open]="mo()">
        <summary class="lbl">Lịch sử ({{ rows().length }})</summary>
        <ol class="lich-su">
          @for (r of rows(); track $index) {
            <li>
              <time>{{ viMoment(r.luc) }}</time>
              <span><b>{{ r.hanhDong }}</b> · {{ store.userName(r.nguoi) }}@if (r.ghiChu) { — {{ r.ghiChu }} }</span>
            </li>
          }
        </ol>
      </details>
    }
  `,
})
export class LichSu {
  protected readonly store = inject(Store);
  protected readonly viMoment = viMoment;
  readonly rows = input<LichSuDuyet[]>([]);
  readonly mo = input(false);
}
