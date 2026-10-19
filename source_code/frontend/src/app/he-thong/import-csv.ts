import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { KhachHang, NhaCungCap } from '../core/models';
import { Store } from '../core/store';
import { fold } from '../core/util';
import { Confirm } from '../shared/confirm';
import { docCsv } from './import-map';

type Dich = 'kh' | 'ncc';
type Truong = 'ten' | 'mst' | 'diaChi' | 'dienThoai' | 'email';

const TRUONG: { k: Truong; nhan: string; goiY: RegExp }[] = [
  { k: 'ten', nhan: 'Tên *', goiY: /^(ten|ten cong ty|ten khach hang|khach hang|nha cung cap|ten ncc|kh|ncc|cong ty)$/ },
  { k: 'mst', nhan: 'MST', goiY: /^(mst|ma so thue)$/ },
  { k: 'diaChi', nhan: 'Địa chỉ', goiY: /^dia chi/ },
  { k: 'dienThoai', nhan: 'Điện thoại', goiY: /(dien thoai|sdt|so dt|phone|tel)/ },
  { k: 'email', nhan: 'Email', goiY: /(email|e-mail|mail)/ },
];

interface DongXem {
  so: number;
  v: Record<Truong, string>;
  loi: string[];
}

/** NT-13 — công cụ "Chạy thử CSV" cho danh mục Khách hàng / Nhà cung cấp. */
@Component({
  selector: 'app-import-csv',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card">
      <h3>Chạy thử CSV — Khách hàng / Nhà cung cấp</h3>
      <p class="sub">Tệp .csv UTF-8, phân cách bằng dấu ; hoặc , (tự nhận), dòng đầu là tiêu đề cột. Chạy thử chỉ xem trước — chưa ghi gì.</p>
      <div class="form-grid" style="margin-top:10px">
        <div class="field">
          <label for="csv-file">Tệp CSV</label>
          <input id="csv-file" type="file" accept=".csv,text/csv" (change)="chonTep($event)" />
        </div>
        <div class="field">
          <label for="csv-dich">Nhập vào</label>
          <select id="csv-dich" [value]="dich()" (change)="dich.set($any($event.target).value)">
            <option value="kh" [selected]="dich() === 'kh'">Khách hàng</option>
            <option value="ncc" [selected]="dich() === 'ncc'">Nhà cung cấp</option>
          </select>
        </div>
      </div>

      @if (tieuDe().length) {
        <h4 style="margin-top:14px">Ghép cột ({{ tenTep() }} · {{ dong().length }} dòng)</h4>
        <div class="form-grid">
          @for (t of truong; track t.k) {
            <div class="field">
              <label [for]="'map-' + t.k">{{ t.nhan }}</label>
              <select [id]="'map-' + t.k" (change)="ghep(t.k, +$any($event.target).value)">
                <option value="-1" [selected]="map()[t.k] === -1">— Không dùng —</option>
                @for (h of tieuDe(); track $index) { <option [value]="$index" [selected]="map()[t.k] === $index">{{ h || 'Cột ' + ($index + 1) }}</option> }
              </select>
            </div>
          }
        </div>

        <div class="row" style="margin:12px 0;gap:10px;flex-wrap:wrap">
          <span class="tag ok">{{ hopLe().length }} dòng hợp lệ</span>
          @if (soLoi()) { <span class="tag bad">{{ soLoi() }} dòng lỗi — sẽ bỏ qua</span> }
          <span class="grow"></span>
          <button class="btn quiet" (click)="xoa()">Bỏ tệp</button>
          @if (store.canEdit('import')) {
            <button class="btn" [disabled]="hopLe().length === 0" (click)="chayThat()">Chạy thật ({{ hopLe().length }})</button>
          }
        </div>

        <div class="tbl-wrap">
          <table class="tbl compact">
            <thead>
              <tr><th>Dòng</th><th>Tên</th><th>MST</th><th>Địa chỉ</th><th>Điện thoại</th><th>Email</th><th>Kiểm tra</th></tr>
            </thead>
            <tbody>
              @for (d of xem().slice(0, 200); track d.so) {
                <tr>
                  <td class="num">{{ d.so }}</td>
                  <td>{{ d.v.ten }}</td>
                  <td>{{ d.v.mst }}</td>
                  <td>{{ d.v.diaChi }}</td>
                  <td>{{ d.v.dienThoai }}</td>
                  <td>{{ d.v.email }}</td>
                  <td>
                    @if (d.loi.length) { <span class="tag bad">Lỗi</span> <span class="sub">{{ d.loi.join(' · ') }}</span> }
                    @else { <span class="tag ok">OK</span> }
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        @if (xem().length > 200) { <p class="sub">Chỉ hiện 200 dòng đầu trong {{ xem().length }} dòng.</p> }
      } @else if (loiTep()) {
        <div class="note bad" style="margin-top:10px">{{ loiTep() }}</div>
      }
    </div>
  `,
})
export class ImportCsv {
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  protected readonly truong = TRUONG;

  protected readonly dich = signal<Dich>('kh');
  protected readonly tenTep = signal('');
  protected readonly loiTep = signal<string | null>(null);
  protected readonly tieuDe = signal<string[]>([]);
  protected readonly dong = signal<string[][]>([]);
  protected readonly map = signal<Record<Truong, number>>({ ten: -1, mst: -1, diaChi: -1, dienThoai: -1, email: -1 });

  protected readonly xem = computed<DongXem[]>(() => {
    const m = this.map();
    const kh = this.dich() === 'kh';
    const daGap = new Map<string, number>();
    return this.dong().map((r, i) => {
      const lay = (k: Truong) => (m[k] >= 0 ? (r[m[k]] ?? '').trim() : '');
      const v: Record<Truong, string> = { ten: lay('ten'), mst: lay('mst'), diaChi: lay('diaChi'), dienThoai: lay('dienThoai'), email: lay('email') };
      const so = i + 2;
      const loi: string[] = [];
      if (m.ten < 0) loi.push('Chưa ghép cột Tên');
      else if (!v.ten) loi.push('Thiếu Tên');
      if (v.ten || v.mst) {
        const trung = kh ? this.store.trungKhachHang({ ten: v.ten, mst: v.mst }) : this.store.trungNCC({ ten: v.ten, mst: v.mst });
        if (trung) loi.push(`Trùng ${trung.id} — ${trung.ten}${v.mst && trung.mst === v.mst ? ' (cùng MST)' : ''}`);
      }
      const khoa = v.mst ? `mst:${v.mst}` : v.ten ? `ten:${fold(v.ten)}` : '';
      if (khoa) {
        const truoc = daGap.get(khoa);
        if (truoc) loi.push(`Trùng dòng ${truoc} trong tệp`);
        else daGap.set(khoa, so);
      }
      return { so, v, loi };
    });
  });
  protected readonly hopLe = computed(() => this.xem().filter((d) => d.loi.length === 0));
  protected readonly soLoi = computed(() => this.xem().length - this.hopLe().length);

  protected async chonTep(e: Event): Promise<void> {
    const input = e.target as HTMLInputElement;
    const f = input.files?.[0];
    this.xoa(false);
    if (!f) return;
    try {
      const rows = docCsv(await f.text());
      if (rows.length < 2) {
        this.loiTep.set('Tệp không có dữ liệu (cần dòng tiêu đề và ít nhất 1 dòng).');
        return;
      }
      const [h, ...rest] = rows;
      this.tenTep.set(f.name);
      this.tieuDe.set(h);
      this.dong.set(rest);
      const m = { ten: -1, mst: -1, diaChi: -1, dienThoai: -1, email: -1 } as Record<Truong, number>;
      for (const t of TRUONG) m[t.k] = h.findIndex((x) => t.goiY.test(fold(x).trim()));
      this.map.set(m);
    } catch {
      this.loiTep.set('Không đọc được tệp — kiểm tra đúng định dạng CSV UTF-8.');
    }
  }

  protected ghep(k: Truong, i: number): void {
    this.map.update((m) => ({ ...m, [k]: i }));
  }

  protected xoa(clearInput = true): void {
    this.tieuDe.set([]);
    this.dong.set([]);
    this.tenTep.set('');
    this.loiTep.set(null);
    if (clearInput) {
      const el = document.getElementById('csv-file') as HTMLInputElement | null;
      if (el) el.value = '';
    }
  }

  protected async chayThat(): Promise<void> {
    const ds = this.hopLe();
    const kh = this.dich() === 'kh';
    const ok = await this.confirm.ask({
      title: `Nhập ${ds.length} ${kh ? 'khách hàng' : 'nhà cung cấp'} vào danh mục?`,
      message: `Mã được cấp tự động. ${this.soLoi()} dòng lỗi bị bỏ qua. Muốn bỏ bản ghi đã nhập phải gửi yêu cầu xoá từng bản ghi.`,
      ok: 'Chạy thật',
    });
    if (!ok) return;
    const ghiChu = `Import CSV ${this.tenTep()}`;
    let dat = 0;
    let hong = 0;
    for (const d of ds) {
      const { ten, mst, diaChi, dienThoai, email } = d.v;
      const e = kh
        ? this.store.saveKhachHang({ id: '', ten, mst, diaChi, nguoiLienHe: '', dienThoai, email, ghiChu } satisfies KhachHang)
        : this.store.saveNCC({ id: '', ten, mst, diaChi, quocGia: '', nguoiLienHe: '', dienThoai, email, ghiChu } satisfies NhaCungCap);
      if (e) hong++;
      else dat++;
    }
    const boQua = this.soLoi();
    this.xoa();
    this.store.say(
      `Đã nhập ${dat} ${kh ? 'khách hàng' : 'nhà cung cấp'}${hong ? ` · ${hong} dòng không ghi được` : ''}${boQua ? ` · bỏ qua ${boQua} dòng lỗi` : ''}`,
    );
  }
}
