import { ChangeDetectionStrategy, Component, inject, input, model, signal } from '@angular/core';
import { Store } from '../core/store';
import { FileRef } from '../core/models';
import { HO_SO_ACCEPT, luuTep, moTep, viSize } from '../core/files';
import { Icon } from './icon';

/**
 * Tệp đính kèm chứng từ (ảnh / PDF hoá đơn, biên nhận…). Tệp lưu ngay khi chọn; danh sách
 * FileRef nằm trong bản nháp của form và chỉ được ghi khi người dùng bấm Lưu.
 */
@Component({
  selector: 'app-tep-dinh-kem',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <div class="field">
      @if (nhan()) { <span class="lbl">{{ nhan() }}</span> }
      <ul class="tep-list">
        @for (f of files(); track f.id; let i = $index) {
          <li>
            <button type="button" class="linkish" (click)="mo(f)"><app-icon name="eye" [size]="14" /> {{ f.name }}</button>
            <span class="muted">{{ viSize(f.size) }}</span>
            @if (edit()) {
              <button type="button" class="icon-btn sm" [attr.aria-label]="'Bỏ tệp ' + f.name" (click)="bo(i)"><app-icon name="x" [size]="14" /></button>
            }
          </li>
        } @empty {
          <li class="muted">Chưa có tệp</li>
        }
      </ul>
      @if (edit()) {
        <button type="button" class="btn sm quiet" [disabled]="dangTai()" (click)="chon.click()">
          <app-icon name="plus" [size]="14" /> {{ dangTai() ? 'Đang lưu tệp…' : 'Thêm tệp' }}
        </button>
        <input #chon type="file" multiple class="an" [accept]="accept" tabindex="-1" aria-hidden="true" (change)="them($event)" />
        <span class="hint">{{ goiY() }}</span>
      }
    </div>
  `,
  styles: [`.field > .btn { justify-self: start; } input.an { position: absolute; width: 1px; height: 1px; opacity: 0; pointer-events: none; overflow: hidden; } .tep-list { list-style: none; margin: 0 0 6px; padding: 0; display: grid; gap: 4px; } .tep-list li { display: flex; gap: 8px; align-items: center; }`],
})
export class TepDinhKem {
  private readonly store = inject(Store);
  readonly files = model<FileRef[]>([]);
  readonly edit = input(false);
  /** Nhãn phía trên danh sách; rỗng = không hiện (khi màn cha đã có tiêu đề). */
  readonly nhan = input('Chứng từ đính kèm');
  /** Dòng gợi ý dưới nút Thêm tệp. */
  readonly goiY = input('Ảnh hoặc PDF, mỗi tệp ≤ 20MB. Tệp được ghi vào chứng từ khi bấm Lưu.');
  protected readonly accept = HO_SO_ACCEPT;
  protected readonly viSize = viSize;
  protected readonly dangTai = signal(false);

  protected async them(e: Event): Promise<void> {
    const el = e.target as HTMLInputElement;
    const list = [...(el.files ?? [])];
    el.value = '';
    if (!list.length) return;
    this.dangTai.set(true);
    try {
      const refs: FileRef[] = [];
      for (const f of list) refs.push(await luuTep(f, this.store.meId() ?? ''));
      this.files.set([...this.files(), ...refs]);
    } catch (err) {
      this.store.say(err instanceof Error ? err.message : 'Không lưu được tệp');
    } finally {
      this.dangTai.set(false);
    }
  }
  protected bo(i: number): void {
    this.files.set(this.files().filter((_, j) => j !== i));
  }
  protected async mo(f: FileRef): Promise<void> {
    try {
      await moTep(f);
    } catch (err) {
      this.store.say(err instanceof Error ? err.message : 'Không mở được tệp');
    }
  }
}
