import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { Store } from '../core/store';
import { Icon } from './icon';

export interface KetQuaMST {
  mst: string;
  ten: string;
  diaChi: string;
  trangThai?: string;
}

/**
 * Tra MST theo dữ liệu Cục Thuế qua dịch vụ công khai api.vietqr.io (miễn phí, giới hạn số lượt/phút).
 * Trả chuỗi lỗi khi không tra được — người dùng vẫn nhập tay được.
 */
export async function traCuuMST(mst: string, lan = 0): Promise<KetQuaMST | string> {
  const s = mst.trim();
  if (!/^\d{10}(-\d{3})?$/.test(s)) return 'MST phải là 10 số hoặc 10 số-3 số';
  try {
    const r = await fetch(`https://api.vietqr.io/v2/business/${encodeURIComponent(s)}`, { signal: AbortSignal.timeout(10000) });
    // Dịch vụ giới hạn lượt tra / phút: đợi rồi thử lại một lần.
    if (r.status === 429 && lan === 0) {
      await new Promise((ok) => setTimeout(ok, 3000));
      return traCuuMST(s, 1);
    }
    if (r.status === 429) return 'Tra cứu quá nhanh — đợi vài giây rồi thử lại';
    const j = (await r.json()) as { code?: string; desc?: string; data?: { name?: string; address?: string; status?: string } };
    if (j.code !== '00' || !j.data?.name) return `Không tìm thấy MST ${s}`;
    return { mst: s, ten: j.data.name, diaChi: j.data.address ?? '', trangThai: j.data.status };
  } catch {
    return 'Không kết nối được dịch vụ tra cứu MST — nhập tay tên và địa chỉ';
  }
}

/** Nút "Tra MST" đặt cạnh ô Mã số thuế: tra xong phát (ketQua) để form điền Tên / Địa chỉ. */
@Component({
  selector: 'app-tra-mst',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Icon],
  template: `
    <button type="button" class="linkish hint" [disabled]="dang() || disabled()" (click)="tra()">
      <app-icon name="search" [size]="14" /> {{ dang() ? 'Đang tra…' : 'Tra MST → điền tên, địa chỉ' }}
    </button>
  `,
})
export class TraMst {
  private readonly store = inject(Store);
  readonly mst = input('');
  readonly disabled = input(false);
  readonly ketQua = output<KetQuaMST>();
  protected readonly dang = signal(false);

  protected async tra(): Promise<void> {
    this.dang.set(true);
    const r = await traCuuMST(this.mst());
    this.dang.set(false);
    if (typeof r === 'string') return this.store.say(r);
    this.ketQua.emit(r);
    this.store.say(`Đã lấy theo MST: ${r.ten}${r.trangThai ? ' · ' + r.trangThai : ''}`);
  }
}
