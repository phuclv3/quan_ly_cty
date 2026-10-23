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

/** Thông tin HĐ hiện ở tiêu đề popup xem file. */
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

/** Một mục trong danh sách xem: file đã lưu (FileRef) hoặc file chờ lưu (File). */
type Muc = { k: 'ref'; id: string; name: string; mime: string; size: number; ref: FileRef } | { k: 'cho'; id: string; name: string; mime: string; size: number; file: File };

/** Đoán loại tệp từ vài byte đầu (PDF / PNG / JPEG / WEBP), không được thì theo đuôi tên. */
async function doanMime(blob: Blob, ten: string): Promise<string> {
  const b = new Uint8Array(await blob.slice(0, 12).arrayBuffer());
  const hex = (i: number, n: number) => Array.from(b.slice(i, i + n), (x) => x.toString(16).padStart(2, '0')).join('');
  if (hex(0, 4) === '25504446') return 'application/pdf';
  if (hex(0, 4) === '89504e47') return 'image/png';
  if (hex(0, 3) === 'ffd8ff') return 'image/jpeg';
  if (hex(0, 4) === '52494646' && hex(8, 4) === '57454250') return 'image/webp';
  const duoi = /\.([a-z0-9]+)$/i.exec(ten)?.[1]?.toLowerCase();
  return ({ pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp' } as Record<string, string>)[duoi ?? ''] ?? '';
}

/**
 * Popup xem file hợp đồng: ảnh hiện trực tiếp, PDF nhúng iframe, loại khác cho tải về.
 * Chưa có file hợp đồng thì không mở được (các nút Xem bị khoá).
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
    @media (max-width: 720px) { .xem { grid-template-columns: 1fr; } }
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
                  @switch (m.k) { @case ('cho') { Chờ lưu · {{ size(m.size) }} } @default { {{ size(m.size) }} } }
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
</div>
            }
            @default { <p class="trong">Đang mở…</p> }
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
  ]);
  protected readonly chon = computed(() => (this.muc().find((m) => m.id === this.chonId()) ?? this.muc()[0]) as Muc);
  protected readonly xem = signal<{ t: 'dang' | 'img' | 'pdf' | 'khac' | 'mat'; url?: string; safe?: SafeResourceUrl }>({ t: 'dang' });

  private url = '';

  constructor() {
    // Mở popup → chọn file đầu tiên; đổi mục chọn → nạp blob và tạo object URL mới.
    effect(() => {
      if (this.open()) this.chonId.set(this.muc()[0]?.id ?? '');
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
    if (!m) return;
    this.xem.set({ t: 'dang' });
    const blob = m.k === 'cho' ? m.file : await getBlob(m.ref.id).catch(() => undefined);
    if (this.chon()?.id !== m.id) return; // người dùng đã chọn mục khác trong lúc chờ
    if (!blob) return this.xem.set({ t: 'mat' });
    this.url = URL.createObjectURL(blob);
    // Máy chủ có thể trả kiểu lạ (octet-stream, x-download…) hoặc rỗng → đoán theo magic bytes, rồi theo đuôi tên tệp.
    const xemDuoc = (x: string) => x === 'application/pdf' || x.startsWith('image/');
    const mime = [blob.type, m.mime].find(xemDuoc) ?? (await doanMime(blob, m.name));
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
        <button type="button" class="btn sm" [disabled]="!files().length && !pending().length" title="Chưa có file hợp đồng" (click)="moXem.set(true)"><app-icon name="eye" [size]="16" /> Xem file hợp đồng</button>
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
        <p class="sub">Chưa có file hợp đồng — tải file lên để xem.</p>
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
