import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DmNcc } from './dm-ncc';

/** HDM-10 — Danh mục Nhà cung cấp (menu Kinh doanh). Liên kết sâu ?id= mở sẵn dòng (xem DmNcc). */
@Component({
  selector: 'app-ncc-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, DmNcc],
  template: `
    <div class="page-head">
      <div><div class="crumbs"><a routerLink="/">Trang chủ</a> › Kinh doanh › Nhà cung cấp</div><h1>Nhà cung cấp</h1></div>
    </div>
    <app-dm-ncc />
  `,
})
export class NccPage {}
