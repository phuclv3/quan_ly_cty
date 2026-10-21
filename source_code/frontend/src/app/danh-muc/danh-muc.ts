import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DmNcc } from './dm-ncc';
import { DmLoaiChiPhi } from './dm-loai-chi-phi';

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

/** KT-03 — Danh mục Loại chi phí (menu Kinh doanh; quyền theo KT-01 Nguồn tiền & loại chi phí). */
@Component({
  selector: 'app-lcp-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, DmLoaiChiPhi],
  template: `
    <div class="page-head">
      <div><div class="crumbs"><a routerLink="/">Trang chủ</a> › Kinh doanh › Loại chi phí</div><h1>Loại chi phí</h1></div>
    </div>
    <app-dm-lcp />
  `,
})
export class LoaiChiPhiPage {}
