import { ChangeDetectionStrategy, Component, DestroyRef, computed, effect, inject, input, model, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Icon } from './icon';
import { Modal } from './ui-kit';
import { Confirm } from './confirm';
import { guiXoa } from './ho-so';
import { Store } from '../core/store';
import { ChuHoSo, FileRef } from '../core/models';
import { HO_SO_ACCEPT, MAX_FILE_BYTES, getBlob, viSize } from '../core/files';
import { money, viDate } from '../core/util';
import { CONG_TY } from '../core/cong-ty';

/** Dữ liệu HĐ để dựng bản xem giả lập khi chưa có file thật. */
export interface ThongTinHd {
  loai: 'bán' | 'mua';
  soHD: string;
  tenDoiTac: string;
  mst: string;
  diaChi: string;
  ngayKy?: string;
  giaTri: number;
  ghiChu?: string;
}

/** Một mục trong danh sách xem: file đã lưu (FileRef), file chờ lưu (File) hoặc bản giả lập. */
type Muc = { k: 'ref'; id: string; name: string; mime: string; size: number; ref: FileRef } | { k: 'cho'; id: string; name: string; mime: string; size: number; file: File } | { k: 'gl'; id: 'gl'; name: string; mime: ''; size: 0 };

/**
 * Popup xem file hợp đồng: ảnh hiện trực tiếp, PDF nhúng iframe, loại khác cho tải về.
 * Luôn có mục "Bản giả lập" dựng từ dữ liệu HĐ — dùng khi chưa có file hoặc file không còn trên máy.
 */
@Component({
  selector: 'app-xem-file-hd',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, Modal],
  styles: `
    .xem { display: grid; grid-template-columns: 220px minmax(0, 1fr); gap: 12px; min-height: 60vh; }
    .ds { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; align-content: start; }
    .ds button { width: 100%; text-align: left; display: grid; gap: 2px; padding: 8px 10px; border: 1px solid var(--line); border-radius: 8px; background: var(--surf); color: var(--ink); cursor: pointer; }
    .ds button.on { border-color: var(--brand); background: var(--brand-tint); }
    .ds button span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .khung { border: 1px solid var(--line); border-radius: 8px; background: var(--surf-3); display: grid; place-items: center; overflow: auto; min-height: 60vh; }
    .khung img { max-width: 100%; max-height: 75vh; object-fit: contain; }
    .khung iframe { width: 100%; height: 75vh; border: 0; background: #fff; }
    .trong { padding: 24px; text-align: center; color: var(--ink-3); display: grid; gap: 10px; justify-items: center; }
    .giay { position: relative; width: min(100%, 640px); margin: 16px; padding: 40px 44px; background: #fff; color: #1a1a1a; box-shadow: 0 2px 12px rgba(0,0,0,.18); font-family: 'Times New Roman', serif; font-size: 15px; line-height: 1.55; align-self: start; }
    .giay h3 { text-align: center; font-size: 19px; margin: 14px 0 4px; letter-spacing: .5px; }
    .giay .qh { text-align: center; font-weight: 700; }
    .giay .c { text-align: center; }
    .giay p { margin: 6px 0; }
    .giay .ky { display: grid; grid-template-columns: 1fr 1fr; text-align: center; margin-top: 32px; font-weight: 700; }
    .giay .ky small { display: block; font-weight: 400; font-style: italic; margin-bottom: 56px; }
    .dau { position: absolute; inset: 0; display: grid; place-items: center; pointer-events: none; font: 700 64px/1 var(--font); color: rgba(200, 30, 30, .12); transform: rotate(-24deg); }
    @media (max-width: 720px) { .xem { grid-template-columns: 1fr; } .giay { padding: 24px 18px; } }
  `,
  template: `
    <app-modal [open]="open()" [title]="'File hợp đồng ' + (info().soHD || '(chưa có số)')" [sub]="info().tenDoiTac" size="lg" (closed)="open.set(false)">
      <div class="xem">
        <ul class="ds" aria-label="Danh sách file">
          @for (m of muc(); track m.id) {
            <li>
              <button type="button" [class.on]="chon().id === m.id" (click)="chonId.set(m.id)">
                <span><b>{{ m.name }}</b></span>
                <small class="muted">
                  @switch (m.k) { @case ('gl') { Dựng từ dữ liệu HĐ } @case ('cho') { Chờ lưu · {{ size(m.size) }} } @default { {{ size(m.size) }} } }
                </small>
              </button>
            </li>
          }
        </ul>
        <div class="khung">
          @switch (xem().t) {
            @case ('dang') { <p class="trong">Đang mở…</p> }
            @case ('img') { <img [src]="xem().url" [alt]="chon().name" /> }
            @case ('pdf') { <iframe [src]="xem().safe" [title]="chon().name"></iframe> }
            @case ('khac') {
              <div class="trong"><app-icon name="file" [size]="40" /><span>Không xem trước được loại tệp này.</span>
                <a class="btn sm" [href]="xem().url" [attr.download]="chon().name"><app-icon name="download" [size]="15" /> Tải về</a></div>
            }
            @case ('mat') {
              <div class="trong"><app-icon name="file" [size]="40" /><span>Tệp không còn trên máy này (lưu IndexedDB cục bộ).</span>
                <button type="button" class="btn sm quiet" (click)="chonId.set('gl')">Xem bản giả lập</button></div>
            }
            @default {
              @let h = info();
              <article class="giay" aria-label="Bản giả lập hợp đồng">
                <div class="dau">BẢN GIẢ LẬP</div>
                <p class="qh">CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                <p class="c"><u>Độc lập – Tự do – Hạnh phúc</u></p>
                <h3>HỢP ĐỒNG {{ h.loai === 'bán' ? 'MUA BÁN' : 'MUA HÀNG' }}</h3>
                <p class="c">Số: {{ h.soHD || '……………' }}</p>
                <p class="c"><i>Ngày ký: {{ h.ngayKy ? viDate(h.ngayKy) : '…/…/……' }}</i></p>
                @if (h.loai === 'bán') {
                  <p><b>BÊN A (Bên mua):</b> {{ h.tenDoiTac || '……………' }}</p>
                  <p>MST: {{ h.mst || '—' }} · Địa chỉ: {{ h.diaChi || '—' }}</p>
                  <p><b>BÊN B (Bên bán):</b> {{ congTy.ten }}</p>
                  <p>MST: {{ congTy.mst }} · Địa chỉ: {{ congTy.diaChi }}</p>
                } @else {
                  <p><b>BÊN A (Bên mua):</b> {{ congTy.ten }}</p>
                  <p>MST: {{ congTy.mst }} · Địa chỉ: {{ congTy.diaChi }}</p>
                  <p><b>BÊN B (Bên bán):</b> {{ h.tenDoiTac || '……………' }}</p>
                  <p>MST: {{ h.mst || '—' }} · Địa chỉ: {{ h.diaChi || '—' }}</p>
                }
                <p><b>Điều 1.</b> Bên B cung cấp hàng hoá cho Bên A theo phụ lục chi tiết đính kèm.</p>
                <p><b>Điều 2.</b> Tổng giá trị hợp đồng: <b>{{ money(h.giaTri) }} VNĐ</b>.</p>
                <p><b>Điều 3.</b> Thanh toán theo các đợt đã thoả thuận.</p>
                @if (h.ghiChu) { <p><b>Ghi chú:</b> {{ h.ghiChu }}</p> }
                <div class="ky"><div>ĐẠI DIỆN BÊN A<small>(Ký, ghi rõ họ tên)</small></div><div>ĐẠI DIỆN BÊN B<small>(Ký, ghi rõ họ tên)</small></div></div>
              </article>
            }
          }
        </div>
      </div>
      <div foot>
        @if (xem().url && xem().t !== 'khac') {
          <a class="btn quiet" [href]="xem().url" target="_blank" rel="noopener"><app-icon name="eye" [size]="16" /> Mở tab mới</a>
          <a class="btn quiet" [href]="xem().url" [attr.download]="chon().name"><app-icon name="download" [size]="16" /> Tải về</a>
        }
        <button type="button" class="btn" (click)="open.set(false)">Đóng</button>
      </div>
    </app-modal>
  `,
})
export class XemFileHd {
  private readonly san = inject(DomSanitizer);
  readonly open = model(false);
  readonly files = input<FileRef[]>([]);
  readonly pending = input<File[]>([]);
  readonly info = input.required<ThongTinHd>();

  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly congTy = CONG_TY;
  protected readonly size = viSize;
  protected readonly chonId = signal<string>('');

  protected readonly muc = computed<Muc[]>(() => [
    ...this.files().map((ref) => ({ k: 'ref' as const, id: ref.id, name: ref.name, mime: ref.mime, size: ref.size, ref })),
    ...this.pending().map((file, i) => ({ k: 'cho' as const, id: `cho-${i}-${file.name}`, name: file.name, mime: file.type, size: file.size, file })),
    { k: 'gl', id: 'gl', name: 'Bản giả lập (mẫu)', mime: '', size: 0 },
  ]);
  protected readonly chon = computed(() => this.muc().find((m) => m.id === this.chonId()) ?? this.muc()[0]);
  protected readonly xem = signal<{ t: 'dang' | 'img' | 'pdf' | 'khac' | 'mat' | 'gl'; url?: string; safe?: SafeResourceUrl }>({ t: 'gl' });

  private url = '';

  constructor() {
    // Mở popup → chọn file đầu tiên; đổi mục chọn → nạp blob và tạo object URL mới.
    effect(() => {
      if (this.open()) this.chonId.set(this.muc()[0].id);
    });
    effect(() => {
      const m = this.open() ? this.chon() : undefined;
      void this.nap(m);
    });
    inject(DestroyRef).onDestroy(() => this.thuHoi());
  }

  private thuHoi(): void {
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = '';
  }

  private async nap(m: Muc | undefined): Promise<void> {
    this.thuHoi();
    if (!m || m.k === 'gl') return this.xem.set({ t: 'gl' });
    this.xem.set({ t: 'dang' });
    const blob = m.k === 'cho' ? m.file : await getBlob(m.ref.id).catch(() => undefined);
    if (this.chon()?.id !== m.id) return; // người dùng đã chọn mục khác trong lúc chờ
    if (!blob) return this.xem.set({ t: 'mat' });
    this.url = URL.createObjectURL(blob);
    const mime = blob.type || m.mime;
    const t = mime.startsWith('image/') ? 'img' : mime === 'application/pdf' ? 'pdf' : 'khac';
    this.xem.set({ t, url: this.url, safe: t === 'pdf' ? this.san.bypassSecurityTrustResourceUrl(this.url) : undefined });
  }
}

/**
 * Ô "File hợp đồng" trong Tab Thông tin chung của HĐ bán / HĐ mua.
 * Dùng chung nhóm hồ sơ "Hợp đồng" ở Tab Lưu trữ hồ sơ. HĐ chưa lưu: file giữ ở `pending`,
 * màn chi tiết tải lên sau khi lưu HĐ (xem `taiFileCho`).
 */
@Component({
  selector: 'app-file-hd',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon, XemFileHd],
  styles: `
    .ds { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
    .ds li { display: flex; align-items: center; gap: 8px; padding: 6px 8px; border: 1px solid var(--line); border-radius: 8px; }
    .ds li > button.linkish { flex: 1 1 auto; min-width: 0; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  `,
  template: `
    <section class="card stack">
      <div class="between">
        <h2 class="section-title">File hợp đồng <small class="muted">(nếu có)</small></h2>
        <button type="button" class="btn sm" (click)="moXem.set(true)"><app-icon name="eye" [size]="16" /> Xem file hợp đồng</button>
      </div>
      @if (files().length || pending().length) {
        <ul class="ds">
          @for (f of files(); track f.id) {
            <li>
              <app-icon name="file" [size]="18" />
              <button type="button" class="linkish" (click)="moXem.set(true)">{{ f.name }}</button>
              <small class="muted">{{ size(f.size) }}</small>
              @if (edit() && chuId()) { <button type="button" class="icon-btn sm" aria-label="Xoá tệp" (click)="xoa(f)"><app-icon name="trash" [size]="16" /></button> }
            </li>
          }
          @for (f of pending(); track $index) {
            <li>
              <app-icon name="file" [size]="18" />
              <button type="button" class="linkish" (click)="moXem.set(true)">{{ f.name }}</button>
              <small class="muted">Chờ lưu · {{ size(f.size) }}</small>
              <button type="button" class="icon-btn sm" aria-label="Bỏ tệp" (click)="boCho($index)"><app-icon name="x" [size]="16" /></button>
            </li>
          }
        </ul>
      } @else {
        <p class="sub">Chưa có file hợp đồng — bấm "Xem file hợp đồng" để xem bản giả lập dựng từ dữ liệu HĐ.</p>
      }
      @if (edit()) {
        <label class="drop">
          <input type="file" multiple [accept]="accept" (change)="up($event)" />
          <app-icon name="upload" [size]="16" />
          <span>{{ busy() ? 'Đang tải lên…' : chuId() ? 'Tải file hợp đồng (PDF / ảnh, ≤ 20MB)' : 'Chọn file hợp đồng — sẽ tải lên khi Lưu HĐ' }}</span>
        </label>
      }
    </section>
    <app-xem-file-hd [(open)]="moXem" [files]="files()" [pending]="pending()" [info]="info()" />
  `,
})
export class FileHd {
  private readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  readonly chu = input.required<ChuHoSo>();
  /** Rỗng khi HĐ chưa lưu. */
  readonly chuId = input('');
  readonly edit = input(false);
  readonly info = input.required<ThongTinHd>();
  readonly pending = model<File[]>([]);

  protected readonly accept = HO_SO_ACCEPT;
  protected readonly size = viSize;
  protected readonly busy = signal(false);
  protected readonly moXem = signal(false);
  protected readonly files = computed(() => (this.chuId() ? (this.store.hoSoCua(this.chu(), this.chuId(), 'Hợp đồng')?.files ?? []) : []));

  protected async up(e: Event): Promise<void> {
    const el = e.target as HTMLInputElement;
    const files = [...(el.files ?? [])];
    el.value = '';
    if (!files.length) return;
    const lon = files.find((f) => f.size > MAX_FILE_BYTES);
    if (lon) return this.store.say(`Tệp "${lon.name}" lớn hơn 20MB`);
    if (!this.chuId()) {
      this.pending.update((p) => [...p, ...files]);
      return;
    }
    this.busy.set(true);
    const err = await this.store.uploadHoSo(this.chu(), this.chuId(), 'Hợp đồng', files);
    this.busy.set(false);
    this.store.say(err ?? `Đã tải lên ${files.length} file hợp đồng`);
  }

  protected boCho(i: number): void {
    this.pending.update((p) => p.filter((_, j) => j !== i));
  }

  protected async xoa(f: FileRef): Promise<void> {
    const hs = this.store.hoSoCua(this.chu(), this.chuId(), 'Hợp đồng');
    if (hs) await guiXoa(this.confirm, this.store, 'HoSo', `${hs.id}:${f.id}`, `Tệp ${f.name} — ${this.info().soHD}`);
  }
}

/** Gọi sau khi lưu HĐ mới: tải các file chờ vào nhóm hồ sơ "Hợp đồng". */
export async function taiFileCho(store: Store, chu: ChuHoSo, chuId: string, files: File[]): Promise<void> {
  if (!files.length) return;
  const err = await store.uploadHoSo(chu, chuId, 'Hợp đồng', files);
  store.say(err ?? `Đã lưu HĐ và ${files.length} file hợp đồng`);
}
