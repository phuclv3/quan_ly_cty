import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { Icon } from './icon';
import { MoneyInput, TrangThai } from './ui-kit';
import { Confirm } from './confirm';
import { Store } from '../core/store';
import { ChuHoSo, DoiTuong, FileRef, HO_SO_BAT_BUOC, HoaDon, LOAI_HO_SO, LoaiHoSo } from '../core/models';
import { xuatZip } from './export';
import { HO_SO_ACCEPT, moTep, viSize } from '../core/files';
import { money, sum, todayIso, viDate } from '../core/util';
import { KiemTra } from './kiem-tra';

/**
 * Tab "Lưu trữ hồ sơ": 4 nhóm Hợp đồng · BBGH/BBNT · Hoá đơn · Scan khác; mỗi nhóm có vùng
 * upload, thumbnail, cờ Đã lưu / Đã scan; nhóm Hoá đơn có bảng con Số – Ngày – Giá trị;
 * nút Tải tất cả (.zip). Upload xong tự tích "Đã lưu" (D-23).
 */
@Component({
  selector: 'app-ho-so',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, MoneyInput, TrangThai, KiemTra],
  template: `
    <div class="between">
      <p class="sub">
        Hồ sơ bắt buộc để chuyển <b>Đã tất toán</b>: {{ batBuoc.join(', ') }}.
        @if (thieu().length) { <app-tt v="Thiếu hồ sơ" /> <span class="muted">{{ thieu().join(', ') }}</span> } @else { <app-tt v="Đủ hồ sơ" /> }
      </p>
      <button type="button" class="btn sm quiet" [disabled]="tongTep() === 0" (click)="zip()"><app-icon name="download" [size]="15" /> Tải tất cả (.zip)</button>
    </div>

    <div class="hoso-grid">
      @for (loai of loais; track loai) {
        @let hs = store.hoSoCua(chu(), chuId(), loai);
        <section class="card hoso" [class.missing]="batBuoc.includes(loai) && !hs?.daLuu">
          <header class="between">
            <h3>{{ loai }} @if (batBuoc.includes(loai)) { <small class="req-chu">bắt buộc</small> }</h3>
            <span class="flags">
              <label class="check-row"><input type="checkbox" [checked]="!!hs?.daLuu" [disabled]="!edit()" (change)="tichLuu(loai, $any($event.target).checked)" /> Đã lưu</label>
              <label class="check-row"><input type="checkbox" [checked]="!!hs?.daScan" [disabled]="!edit()" (change)="store.setHoSoCo(chu(), chuId(), loai, { daScan: $any($event.target).checked })" /> Đã scan</label>
            </span>
          </header>
          @if (hs?.ghiChu) { <p class="sub">Ghi chú: {{ hs?.ghiChu }}</p> }
          <ul class="thumbs">
            @for (f of hs?.files ?? []; track f.id) {
              <li>
                <button type="button" class="thumb" (click)="open(f)" [title]="f.name">
                  @if (f.thumb) { <img [src]="f.thumb" alt="" /> } @else { <app-icon name="file" [size]="28" /> }
                  <span>{{ f.name }}</span>
                  <small class="muted">{{ size(f.size) }}</small>
                </button>
                @if (edit()) {
                  <button type="button" class="icon-btn sm" aria-label="Xoá tệp" (click)="xoaTep(hs!.id, f)"><app-icon name="trash" [size]="16" /></button>
                }
              </li>
            }
          </ul>
          @if (edit()) {
            <label class="drop">
              <input type="file" multiple [accept]="accept" (change)="up(loai, $event)" />
              <app-icon name="upload" [size]="16" />
              <span>{{ busy() === loai ? 'Đang tải lên…' : 'Chọn ảnh / PDF (≤ 20MB, ảnh tự nén)' }}</span>
            </label>
          }

          @if (loai === 'Hoá đơn') {
            <table class="tbl compact">
              <thead><tr><th>Số hoá đơn</th><th>Ngày</th><th class="num">Giá trị (sau VAT)</th><th></th></tr></thead>
              <tbody>
                @for (x of hoaDons(); track x.id) {
                  <tr>
                    <td>{{ x.soHoaDon }}</td><td>{{ viDate(x.ngayHoaDon) }}</td><td class="num">{{ money(x.giaTri) }}</td>
                    <td>@if (edit()) { <button type="button" class="icon-btn sm" aria-label="Xoá hoá đơn" (click)="xoaHD(x)"><app-icon name="trash" [size]="16" /></button> }</td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="muted">Chưa có hoá đơn</td></tr>
                }
              </tbody>
              @if (giaTri() > 0) {
                <tfoot>
                  <tr><th colspan="2">Đã xuất</th><td class="num">{{ money(daXuat()) }}</td><td></td></tr>
                  <tr><th colspan="2">Còn phải xuất</th><td class="num" [class.neg]="giaTri() - daXuat() < 0">{{ money(giaTri() - daXuat()) }}</td><td></td></tr>
                </tfoot>
              }
            </table>
            @if (edit()) {
              <div class="form-grid hd-form" appKiemTra #ktHD="kiemTra">
                <div class="field"><label for="hd-so">Số hoá đơn <span class="req">*</span></label><input id="hd-so" [value]="hd().soHoaDon" (input)="hd.set({ ...hd(), soHoaDon: $any($event.target).value })" /></div>
                <div class="field"><label for="hd-ngay">Ngày hoá đơn <span class="req">*</span></label><input id="hd-ngay" type="date" [value]="hd().ngayHoaDon" (input)="hd.set({ ...hd(), ngayHoaDon: $any($event.target).value })" /></div>
                <div class="field"><label for="hd-gt">Giá trị (sau VAT)</label><app-money inputId="hd-gt" [value]="hd().giaTri" (valueChange)="hd.set({ ...hd(), giaTri: $event })" /></div>
              </div>
              <div class="btn-row" style="margin-top:8px"><button type="button" class="btn sm" (click)="themHD()"><app-icon name="plus" [size]="16" /> Thêm hoá đơn</button></div>
            }
          }
        </section>
      }
    </div>

    <div class="field">
      <label for="hs-thieu">Ghi chú hồ sơ thiếu</label>
      <textarea id="hs-thieu" rows="2" [value]="ghiChuThieu()" [disabled]="!edit()" (change)="ghiChuThieuChange.emit($any($event.target).value)"></textarea>
    </div>
  `,
})
export class HoSoPanel {
  private readonly ktHD = viewChild('ktHD', { read: KiemTra });
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  readonly chu = input.required<ChuHoSo>();
  readonly chuId = input.required<string>();
  readonly soHD = input('');
  readonly edit = input(false);
  /** Giá trị HĐ sau VAT để tính Còn phải xuất hoá đơn. 0 = không hiện. */
  readonly giaTri = input(0);
  readonly ghiChuThieu = input('');
  readonly ghiChuThieuChange = output<string>();

  protected readonly loais = LOAI_HO_SO;
  protected readonly batBuoc = HO_SO_BAT_BUOC;
  protected readonly accept = HO_SO_ACCEPT;
  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly size = viSize;
  protected readonly busy = signal<LoaiHoSo | null>(null);
  protected readonly hd = signal<HoaDon>(this.blankHD());

  protected readonly thieu = computed(() =>
    HO_SO_BAT_BUOC.filter((l) => !this.store.hoSo().some((h) => h.chu === this.chu() && h.chuId === this.chuId() && h.loai === l && h.daLuu)),
  );
  protected readonly hoaDons = computed(() => this.store.hoaDon().filter((x) => x.chu === this.chu() && x.chuId === this.chuId()));
  protected readonly daXuat = computed(() => sum(this.hoaDons(), (x) => x.giaTri));
  protected readonly tongTep = computed(() =>
    sum(
      this.store.hoSo().filter((h) => h.chu === this.chu() && h.chuId === this.chuId()),
      (h) => h.files.length,
    ),
  );

  private blankHD(): HoaDon {
    return { id: '', chu: 'HDB', chuId: '', soHoaDon: '', ngayHoaDon: todayIso(), giaTri: 0 };
  }

  protected async up(loai: LoaiHoSo, e: Event): Promise<void> {
    const el = e.target as HTMLInputElement;
    const files = [...(el.files ?? [])];
    el.value = '';
    if (!files.length) return;
    this.busy.set(loai);
    const err = await this.store.uploadHoSo(this.chu(), this.chuId(), loai, files);
    this.busy.set(null);
    this.store.say(err ?? `Đã lưu ${files.length} tệp vào "${loai}"`);
  }

  protected async tichLuu(loai: LoaiHoSo, on: boolean): Promise<void> {
    const hs = this.store.hoSoCua(this.chu(), this.chuId(), loai);
    let ghiChu = hs?.ghiChu;
    if (on && !(hs?.files.length ?? 0)) {
      const r = await this.confirm.prompt({
        title: `Tích "Đã lưu" ${loai} bản giấy?`,
        message: 'Chưa có tệp tải lên — cần ghi chú nơi lưu bản giấy.',
        label: 'Ghi chú (bắt buộc)',
        minLength: 3,
        ok: 'Tích Đã lưu',
      });
      if (r === null) return;
      ghiChu = r;
    }
    const err = this.store.setHoSoCo(this.chu(), this.chuId(), loai, { daLuu: on, ghiChu });
    if (err) this.store.say(err);
  }

  protected async open(f: FileRef): Promise<void> {
    try {
      await moTep(f);
    } catch (e) {
      this.store.say(e instanceof Error ? e.message : 'Không mở được tệp');
    }
  }

  protected async xoaTep(hsId: string, f: FileRef): Promise<void> {
    await guiXoa(this.confirm, this.store, 'HoSo', `${hsId}:${f.id}`, `Tệp ${f.name} — ${this.soHD()}`);
  }

  protected async xoaHD(x: HoaDon): Promise<void> {
    await guiXoa(this.confirm, this.store, 'HoaDon', x.id, `Hoá đơn ${x.soHoaDon} — ${this.soHD()}`);
  }

  protected themHD(): void {
    if (this.ktHD()?.hopLe() === false) return;
    const err = this.store.saveHoaDon({ ...this.hd(), chu: this.chu(), chuId: this.chuId() });
    if (err) this.store.say(err);
    else {
      this.hd.set(this.blankHD());
      this.store.say('Đã thêm hoá đơn');
    }
  }

  protected async zip(): Promise<void> {
    const entries = this.store
      .hoSo()
      .filter((h) => h.chu === this.chu() && h.chuId === this.chuId())
      .flatMap((h) => h.files.map((file) => ({ path: `${h.loai.replace('/', '-')}/${file.name}`, fileId: file.id })));
    const n = await xuatZip(`ho-so-${(this.soHD() || this.chuId()).replace(/[^\w.-]+/g, '_')}.zip`, entries);
    if (n !== null) this.store.say(`Đã gói ${n} tệp`);
  }
}

/** Nút Xoá ở mọi bản ghi tạo Yêu cầu xoá (NT-11) — hỏi lý do bắt buộc. */
export async function guiXoa(confirm: Confirm, store: Store, loai: DoiTuong, id: string, moTa: string): Promise<boolean> {
  const lyDo = await confirm.prompt({
    title: `Gửi yêu cầu xoá ${moTa}?`,
    message: 'Không xoá thẳng — yêu cầu chuyển sang màn Duyệt xoá. Trong lúc chờ, bản ghi bị khoá sửa.',
    label: 'Lý do xoá (bắt buộc)',
    minLength: 3,
    multiline: true,
    ok: 'Gửi yêu cầu',
  });
  if (lyDo === null) return false;
  const err = store.guiYeuCauXoa(loai, id, moTa, lyDo);
  store.say(err ?? 'Đã gửi yêu cầu xoá — chờ duyệt');
  return !err;
}
