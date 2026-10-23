import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ChonNhieu } from './chon-nhieu';

/** Thanh hiện khi đã tích chọn dòng trong lưới: số đã chọn + Xoá + Bỏ chọn. */
@Component({
  selector: 'app-chon-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cn().chon().size) {
      <div class="note info bar">
        <b>Đã chọn {{ cn().chon().size }} {{ ten() }}</b>
        <button type="button" class="btn sm danger" (click)="xoa.emit()">Xoá {{ cn().chon().size }} đã chọn</button>
        <button type="button" class="btn sm quiet" (click)="cn().xoa()">Bỏ chọn</button>
      </div>
    }
  `,
  styles: `.bar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 12px; }`,
})
export class ChonBar {
  readonly cn = input.required<ChonNhieu>();
  readonly ten = input('bản ghi');
  readonly xoa = output<void>();
}
