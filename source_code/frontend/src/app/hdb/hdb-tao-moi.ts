import { ChangeDetectionStrategy, Component, computed, inject, input, model, output, signal } from '@angular/core';
import { Store } from '../core/store';
import { hdbCalc } from '../core/calc';
import { HopDongBan, LOAI_HO_SO } from '../core/models';
import { money, viDate } from '../core/util';
import { Icon } from '../shared/icon';
import { KiemTra } from '../shared/kiem-tra';
import { canhBaoChuaLuu } from '../shared/unsaved';
import { Buoc, BuocBar, HoSoCho, HoSoChoPanel, demHoSoCho } from '../shared/wizard';
import { HdbTab1 } from './hdb-tab1';
import { HdbTab3 } from './hdb-tab3';

/**
 * HĐ bán mới dạng từng bước: Thông tin chung → Giá trị & thanh toán → Hồ sơ → Xác nhận.
 * Mỗi bước kiểm ô bắt buộc trước khi sang bước sau (shared/kiem-tra). Hồ sơ chọn trước, tải lên khi lưu
 * (hồ sơ gắn theo mã HĐ). Lưu xong màn cha mở HĐ ở dạng 5 tab để theo dõi thực hiện.
 */
@Component({
  selector: 'app-hdb-tao-moi',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, HdbTab1, HdbTab3, BuocBar, HoSoChoPanel],
  hostDirectives: [KiemTra],
  template: `
    <app-buoc-bar [buocs]="buocs()" [buoc]="buoc()" (chon)="den($event)" />

    @switch (hienTai().k) {
      @case ('tt') {
        <app-hdb-tab1 [(draft)]="draft" [edit]="edit1()" [khoaDinhDanh]="false" />
      }
      @case ('gt') {
        <app-hdb-tab3 [(draft)]="draft" [saved]="null" [edit]="edit3()" [khoa]="false" />
      }
      @case ('hs') {
        <app-ho-so-cho [(cho)]="cho" />
      }
      @case ('xn') {
        @let h = draft();
        <section class="card">
          <h2 class="section-title">Kiểm tra lại trước khi lưu</h2>
          <dl class="tom-tat">
            <div><dt>Khách hàng</dt><dd><b>{{ h.tenKH || '—' }}</b>@if (h.mst) { <span class="muted"> · MST {{ h.mst }}</span> }</dd><button type="button" class="btn sm quiet" (click)="den(0)">Sửa</button></div>
            <div><dt>Số HĐ bán</dt><dd>{{ h.soHD || '(chưa có — Báo giá)' }}</dd><button type="button" class="btn sm quiet" (click)="den(0)">Sửa</button></div>
            <div><dt>Ngày ký / hiệu lực</dt><dd>{{ viDate(h.ngayKy) }} / {{ viDate(h.ngayHieuLuc) }}</dd><button type="button" class="btn sm quiet" (click)="den(0)">Sửa</button></div>
            <div><dt>Sale phụ trách</dt><dd>{{ store.userName(h.sale) }}</dd><button type="button" class="btn sm quiet" (click)="den(0)">Sửa</button></div>
            @if (xemTien()) {
              <div>
                <dt>Giá trị</dt>
                <dd>Trước VAT <b>{{ money(h.truocVAT) }} đ</b> · VAT {{ h.vat }}% · Sau VAT <b>{{ money(tinh().sauVAT) }} đ</b> · {{ h.dotTT.length }} đợt thanh toán</dd>
                <button type="button" class="btn sm quiet" (click)="den(iBuoc('gt'))">Sửa</button>
              </div>
            }
            <div>
              <dt>Hồ sơ đính kèm</dt>
              <dd>@if (tongCho()) { @for (loai of loais; track loai) { @if (cho()[loai]?.length) { <span class="chip">{{ loai }}: {{ cho()[loai]!.length }}</span> } } } @else { <span class="muted">Chưa chọn tệp — bổ sung sau ở Tab "Lưu trữ hồ sơ"</span> }</dd>
              <button type="button" class="btn sm quiet" (click)="den(iBuoc('hs'))">Sửa</button>
            </div>
            <div><dt>Trạng thái khi lưu</dt><dd><span class="tag mute">Báo giá</span> <span class="muted">— chuyển Hiệu lực ở màn chi tiết khi đã ký.</span></dd><span></span></div>
          </dl>
        </section>
      }
    }

    <div class="wiz-foot">
      @if (buoc() > 0) {
        <button type="button" class="btn quiet" [disabled]="dangLuu()" (click)="den(buoc() - 1)"><app-icon name="back" [size]="16" /> Quay lại</button>
      }
      <span class="sp"></span>
      <span class="muted">Bước {{ buoc() + 1 }}/{{ buocs().length }}</span>
      @if (hienTai().k !== 'xn') {
        <button type="button" class="btn" (click)="tiep()">Tiếp: {{ buocs()[buoc() + 1].t }} <app-icon name="chevron" [size]="16" class="tiep-ico" /></button>
      } @else {
        <button type="button" class="btn ok" [disabled]="dangLuu() || !edit1()" (click)="tao.emit(cho())">
          <app-icon name="check" [size]="16" /> {{ dangLuu() ? 'Đang lưu…' : tongCho() ? 'Lưu hợp đồng & ' + tongCho() + ' tệp' : 'Lưu hợp đồng' }}
        </button>
      }
    </div>
  `,
})
export class HdbTaoMoi {
  protected readonly store = inject(Store);
  private readonly kt = inject(KiemTra, { self: true });
  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly loais = LOAI_HO_SO;

  readonly draft = model.required<HopDongBan>();
  readonly edit1 = input(false);
  readonly edit3 = input(false);
  /** Không có quyền xem giá trị (HDB-07) thì bỏ bước Giá trị. */
  readonly xemTien = input(false);
  readonly dangLuu = input(false);
  readonly tao = output<HoSoCho>();

  protected readonly buocs = computed<Buoc[]>(() => [
    { k: 'tt', t: 'Thông tin chung', mo: 'Khách hàng, ngày, Sale' },
    ...(this.xemTien() ? [{ k: 'gt', t: 'Giá trị & thanh toán', mo: 'Giá trị, VAT, đợt TT' }] : []),
    { k: 'hs', t: 'Hồ sơ', mo: 'File HĐ, BBGH, hoá đơn' },
    { k: 'xn', t: 'Xác nhận', mo: 'Kiểm tra & lưu' },
  ]);
  protected readonly buoc = signal(0);
  protected readonly hienTai = computed(() => this.buocs()[Math.min(this.buoc(), this.buocs().length - 1)]);
  protected readonly cho = signal<HoSoCho>({});
  protected readonly tongCho = computed(() => demHoSoCho(this.cho()));
  protected readonly tinh = computed(() => hdbCalc(this.draft(), this.store.db()));

  constructor() {
    canhBaoChuaLuu(() => this.tongCho() > 0);
  }

  protected iBuoc(k: string): number {
    return this.buocs().findIndex((b) => b.k === k);
  }

  /** Sang bước sau khi bước hiện tại đủ ô bắt buộc. */
  protected tiep(): void {
    if (!this.kt.hopLe()) return;
    if (this.hienTai().k === 'tt') {
      const h = this.draft();
      if (!h.mst?.trim()) return this.store.say('Chưa có MST khách hàng — nhập MST (bấm "Tra MST" để điền địa chỉ)');
    }
    this.den(this.buoc() + 1);
  }

  /** Quay lại bước đã qua (hoặc sang bước kế từ nút Tiếp). */
  protected den(i: number): void {
    if (i < 0 || i >= this.buocs().length || i > this.buoc() + 1) return;
    this.kt.xoa();
    this.buoc.set(i);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}
