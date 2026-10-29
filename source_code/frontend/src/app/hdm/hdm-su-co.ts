import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { TT } from '../core/trang-thai';
import { FileRef, HopDongMua, ViecGiao } from '../core/models';
import { daysFromToday, todayIso, viDate } from '../core/util';
import { Icon } from '../shared/icon';
import { NguoiThem } from '../shared/nguoi-them';
import { TepDinhKem } from '../shared/tep-dinh-kem';
import { Modal } from '../shared/ui-kit';

/** Sổ sự cố của HĐ mua — giống khu "Phát sinh" của HĐ bán: giao việc (suCo) cho người chịu trách nhiệm, tích xong khi xử lý. */
@Component({
  selector: 'app-hdm-su-co',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, Icon, RouterLink, NguoiThem, TepDinhKem],
  styles: [`:host { display: block; } .sc-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px 24px; align-items: start; } .sc-grid .full { grid-column: 1 / -1; } .sc-grid .field { min-width: 0; } @media (max-width: 720px) { .sc-grid { grid-template-columns: minmax(0, 1fr); } }`],
  template: `
    @if (suCos().length || store.canEdit('viec')) {
      <section class="card">
        <div class="section-title">
          <h2>Sổ sự cố <small class="sub">Người chịu trách nhiệm tự tích xong · hiện trên Trang chủ đến khi xử lý</small></h2>
          <div class="btn-row">
            <span class="sub">{{ dangMo() }} sự cố đang mở</span>
            @if (store.canEdit('viec')) {
              <button type="button" class="btn sm quiet" [disabled]="!coTheBaoSuCo()" [attr.title]="lyDoKhongSuCo()" (click)="moSuCo()"><app-icon name="alert" [size]="16" /> Phát sinh</button>
            }
          </div>
        </div>
        <div class="tbl-wrap">
          <table class="tbl compact">
            <thead><tr><th>Mã</th><th>Sự cố</th><th>Chịu trách nhiệm</th><th>Hạn</th><th>Trạng thái</th><th>Bằng chứng</th><th>Xong</th></tr></thead>
            <tbody>
              @for (v of suCos(); track v.id) {
                <tr>
                  <td><a routerLink="/viec" [queryParams]="{ id: v.id }"><b>{{ v.ma }}</b></a></td>
                  <td>{{ v.noiDung }}</td>
                  <td>{{ nguoiPT(v) }}</td>
                  <td>{{ viDate(v.han) }}</td>
                  <td>
                    @if (v.xongLuc) { <span class="tag ok">Đã xử lý</span> }
                    @else if (daysFromToday(v.han) < 0) { <span class="tag bad">Quá hạn {{ -daysFromToday(v.han) }} ngày</span> }
                    @else { <span class="tag warn">Đang xử lý</span> }
                  </td>
                  <td>{{ v.files?.length ? v.files!.length + ' tệp' : 'Chưa có' }}</td>
                  <td>
                    <input type="checkbox" [checked]="!!v.xongLuc" [disabled]="!store.lienQuanViec(v)" [attr.aria-label]="'Đã xử lý ' + v.ma" (change)="tichXong(v, $any($event.target).checked)" />
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="7" class="muted">Chưa có sự cố phát sinh</td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }

    <app-modal [open]="moSC()" title="Ghi nhận sự cố phát sinh" [sub]="'HĐ mua ' + m().soHD" size="lg" [dirty]="dirtySC()" (closed)="moSC.set(false)">
      <div class="sc-grid blk xanh">
        <h3 class="blk-t full">Công việc phát sinh</h3>
        <div class="field full">
          <label for="scm-nd">Sự cố phát sinh <span class="req">*</span></label>
          <textarea id="scm-nd" rows="3" placeholder="VD NCC giao thiếu hàng, thiếu COA, chưa có hoá đơn" [value]="scNoiDung()" (input)="scNoiDung.set($any($event.target).value)"></textarea>
        </div>
        <div class="field">
          <span class="lbl">Người chịu trách nhiệm <span class="req">*</span></span>
          <app-nguoi-them placeholder="Thêm người — gõ tên hoặc email" [coBan]="false" [boxTruoc]="true" [(ids)]="scNguoi" />
        </div>
        <div class="field">
          <label for="scm-han">Hạn xử lý <span class="req">*</span></label>
          <input id="scm-han" type="date" [value]="scHan()" (input)="scHan.set($any($event.target).value)" />
        </div>
        <div class="field full">
          <app-tep-dinh-kem nhan="Bằng chứng (tuỳ chọn)" goiY="Ảnh hoặc PDF, mỗi tệp ≤ 20MB. Có thể bổ sung sau." [edit]="true" [(files)]="scFiles" />
        </div>
      </div>
      @if (scLoi()) { <p class="note bad">{{ scLoi() }}</p> }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="moSC.set(false)">Huỷ</button>
        <button type="button" class="btn" (click)="luuSuCo()">Giao xử lý</button>
      </div>
    </app-modal>
  `,
})
export class HdmSuCo {
  protected readonly store = inject(Store);
  readonly m = input.required<HopDongMua>();
  /** Đã khoá (tất toán / chờ xoá). */
  readonly khoa = input(false);

  protected readonly viDate = viDate;
  protected readonly daysFromToday = daysFromToday;

  /** Chỉ báo sự cố khi HĐ đang thực hiện (Đã ký / Đang nhận hàng). */
  protected readonly coTheBaoSuCo = computed(() => !this.khoa() && (this.m().trangThai === TT.DA_KY || this.m().trangThai === TT.DANG_NHAN_HANG));
  protected readonly lyDoKhongSuCo = computed(() => {
    if (this.coTheBaoSuCo()) return null;
    if (this.khoa()) return 'HĐ đã khoá (Đã tất toán / đang chờ xoá)';
    return 'Chỉ ghi nhận phát sinh khi HĐ mua đang ở trạng thái "Đã ký" hoặc "Đang nhận hàng"';
  });
  protected readonly suCos = computed(() =>
    this.store
      .viecVisible()
      .filter((v) => v.suCo && v.hdmId === this.m().id)
      .sort((a, b) => Number(!!a.xongLuc) - Number(!!b.xongLuc) || (a.han ?? '').localeCompare(b.han ?? '')),
  );
  protected readonly dangMo = computed(() => this.suCos().filter((v) => !v.xongLuc).length);

  protected readonly moSC = signal(false);
  protected readonly scNoiDung = signal('');
  protected readonly scHan = signal(todayIso());
  protected readonly scNguoi = signal<string[]>([]);
  protected readonly scFiles = signal<FileRef[]>([]);
  protected readonly scLoi = signal('');
  protected readonly dirtySC = computed(() => this.moSC() && !!(this.scNoiDung() || this.scNguoi().length || this.scFiles().length));

  protected nguoiPT(v: ViecGiao): string {
    return (v.nguoiNhan.length ? v.nguoiNhan : [v.nguoiTao]).map((id) => this.store.userName(id)).join(', ');
  }

  protected moSuCo(): void {
    this.scNoiDung.set('');
    this.scHan.set(todayIso());
    this.scNguoi.set([]);
    this.scFiles.set([]);
    this.scLoi.set('');
    this.moSC.set(true);
  }

  protected luuSuCo(): void {
    if (!this.scNoiDung().trim()) return this.scLoi.set('Nhập sự cố phát sinh');
    if (!this.scNguoi().length) return this.scLoi.set('Chọn người chịu trách nhiệm');
    if (!this.scHan()) return this.scLoi.set('Chọn hạn xử lý');
    const err = this.store.giaoViec({
      noiDung: this.scNoiDung(),
      nguoiNhan: this.scNguoi(),
      nguonLoai: 'HDM',
      hdmId: this.m().id,
      han: this.scHan(),
      mucUuTien: 'Cao',
      files: this.scFiles(),
      suCo: true,
    });
    if (err) return this.scLoi.set(err);
    this.moSC.set(false);
    this.store.say('Đã ghi nhận sự cố — việc đã giao cho người chịu trách nhiệm');
  }

  protected tichXong(v: ViecGiao, xong: boolean): void {
    const err = this.store.xongViec(v.id, xong);
    if (err) this.store.say(err);
  }
}
