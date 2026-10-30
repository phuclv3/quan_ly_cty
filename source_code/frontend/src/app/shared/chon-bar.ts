import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { ChonNhieu } from './chon-nhieu';

/** Thanh hiện khi đã tích chọn dòng trong lưới: số đã chọn + (Duyệt) + Xoá + Bỏ chọn. */
@Component({
  selector: 'app-chon-bar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cn().chon().size) {
      <div class="note info chon-hang">
        <b>Đã chọn {{ cn().chon().size }} {{ ten() }}</b>
        @if (coDuyet()) { <button type="button" class="btn sm" [class.ok]="!duyetNguyHiem()" [class.danger]="duyetNguyHiem()" (click)="duyet.emit()">{{ nhanDuyet() }} {{ cn().chon().size }} đã chọn</button> }
        @if (coTuChoi()) { <button type="button" class="btn sm quiet" (click)="tuChoi.emit()">Từ chối {{ cn().chon().size }} đã chọn</button> }
        @if (coXoa()) { <button type="button" class="btn sm danger" (click)="xoa.emit()">Xoá {{ cn().chon().size }} đã chọn</button> }
        <button type="button" class="btn sm quiet" (click)="cn().xoa()">Bỏ chọn</button>
      </div>
    }
  `,
  styles: `.chon-hang { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; margin-bottom: 12px; }`,
})
export class ChonBar {
  readonly cn = input.required<ChonNhieu>();
  readonly ten = input('bản ghi');
  readonly xoa = output<void>();
  /** Hiện nút Duyệt nhiều (chỉ trang có luồng duyệt). */
  readonly coDuyet = input(false);
  readonly coXoa = input(true);
  readonly duyet = output<void>();
  /** Nhãn nút duyệt (VD "Duyệt xoá"); duyetNguyHiem: tô đỏ khi việc duyệt không hoàn tác được. */
  readonly nhanDuyet = input('Duyệt');
  readonly duyetNguyHiem = input(false);
  readonly coTuChoi = input(false);
  readonly tuChoi = output<void>();
}
