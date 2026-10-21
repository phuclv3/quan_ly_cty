import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { map } from 'rxjs';
import { Store } from '../core/store';
import { hdbCalc } from '../core/calc';
import {
  CO_HOI,
  CoHoi,
  HINH_THUC_HD,
  KhachHang,
  LOAI_SP_KH,
  NGUON_KH,
  PHAN_LOAI_KH,
  TIEP_CAN,
  TINH_THANH,
  TiepCan,
} from '../core/models';
import { money, viDate, viMoment } from '../core/util';
import { MoneyInput, Pick, PickOption, TrangThai } from '../shared/ui-kit';
import { Confirm } from '../shared/confirm';
import { guiXoa } from '../shared/ho-so';
import { Unsaved, canhBaoChuaLuu } from '../shared/unsaved';
import { Icon } from '../shared/icon';

const BLANK: KhachHang = { id: '', ten: '', mst: '', diaChi: '', nguoiLienHe: '', dienThoai: '', email: '', ghiChu: '' };
type F = Exclude<keyof KhachHang, 'id' | 'chamSoc'>;

/** HDB-13 — Chi tiết khách hàng: thông tin, theo dõi kinh doanh, nhật ký chăm sóc, HĐ bán của khách. */
@Component({
  selector: 'app-kh-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, Pick, MoneyInput, TrangThai, Icon],
  template: `
    @let k = f();
    <div class="page-head">
      <div>
        <div class="crumbs"><a routerLink="/">Trang chủ</a> › <a routerLink="/khach-hang">Khách hàng</a> › {{ k.id || 'Thêm mới' }}</div>
        <h1>
          {{ k.id ? k.ten || k.id : 'Thêm khách hàng' }}
          @if (k.id) { <app-tt [v]="k.coHoi || 'Chưa tiếp cận'" /> }
          @if (k.trangThai === 'Ngưng') { <app-tt v="Ngưng" /> }
          @if (choXoa()) { <app-tt v="Chờ xoá" /> }
        </h1>
        @if (k.id) {
          <p class="sub">{{ k.id }} · Phụ trách: {{ k.phuTrach ? store.userName(k.phuTrach) : 'chưa phân bổ (data thô)' }}@if (k.ngayTiepNhan) { · Tiếp nhận {{ viDate(k.ngayTiepNhan) }} }</p>
        }
      </div>
      <div class="actions">
        @if (dirty()) { <span class="tag warn">● Chưa lưu</span> }
        @if (k.id && store.canEdit('hdb') && k.trangThai !== 'Ngưng' && !dirty()) {
          <a class="btn quiet" routerLink="/hop-dong-ban/moi" [queryParams]="{ kh: k.id }"><app-icon name="plus" [size]="16" /> Tạo HĐ bán</a>
        }
        @if (edit()) {
          @if (dirty()) { <button type="button" class="btn quiet" (click)="hoanTac()">Huỷ thay đổi</button> }
          <button type="button" class="btn ok" [disabled]="!dirty()" (click)="luu(false)">Lưu</button>
        }
        @if (k.id && edit() && !dirty()) {
          @let vuong = store.lyDoKhongXoa('DM_KhachHang', k.id);
          <button type="button" class="btn quiet danger" [disabled]="!!vuong" [attr.title]="vuong ? vuong + ' — không xoá được' : null" (click)="xoa()">Xoá</button>
        }
      </div>
    </div>

    @if (!edit() && k.id && store.canView('khachHang') && !choXoa()) {
      <div class="note info" style="margin-bottom:12px">Chỉ xem — khách do {{ k.phuTrach ? store.userName(k.phuTrach) : 'người khác' }} phụ trách.</div>
    }
    @if (err()) { <div class="note bad" style="margin-bottom:12px">{{ err() }}</div> }
    @if (trung(); as t) {
      <div class="note warn" style="display:grid;margin-bottom:12px">
        <span>Đã có khách hàng trùng {{ t.mst && t.mst === k.mst ? 'MST' : 'tên' }}: <b>{{ t.id }} — {{ t.ten }}</b> (MST {{ t.mst || '—' }}).</span>
        <div class="row">
          <a class="btn sm quiet" [routerLink]="['/khach-hang', t.id]">Mở bản có sẵn</a>
          <button type="button" class="btn sm" (click)="luu(true)">Vẫn lưu</button>
        </div>
      </div>
    }

    <section class="card form-card">
      <fieldset class="form-sec">
        <legend>Thông tin doanh nghiệp</legend>
        <div class="form-grid cols-3">
          <div class="field span-2">
            <label for="kh-ten">Tên công ty / đơn vị <span class="req">*</span></label>
            <input id="kh-ten" [value]="k.ten" [disabled]="!edit()" (input)="set('ten', $any($event.target).value)" />
          </div>
          <div class="field">
            <label for="kh-mst">Mã số thuế</label>
            <input id="kh-mst" class="mono" [value]="k.mst" [disabled]="!edit()" (input)="set('mst', $any($event.target).value)" />
          </div>
          <div class="field span-2">
            <label for="kh-dc">Địa chỉ</label>
            <input id="kh-dc" [value]="k.diaChi" [disabled]="!edit()" (input)="set('diaChi', $any($event.target).value)" />
          </div>
          <div class="field">
            <label for="kh-tinh">Tỉnh / Thành phố</label>
            <app-pick inputId="kh-tinh" [options]="tinhOpts" [value]="k.tinh ?? ''" [allowEmpty]="true" placeholder="— Chọn —" [disabled]="!edit()" (valueChange)="set('tinh', $event || undefined)" />
          </div>
          <div class="field">
            <label for="kh-pl">Phân loại KH</label>
            <select id="kh-pl" [disabled]="!edit()" (change)="set('phanLoai', $any($event.target).value || undefined)">
              <option value="">—</option>
              @for (o of PHAN_LOAI_KH; track o) { <option [value]="o" [selected]="o === k.phanLoai">{{ o }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="kh-tt">Trạng thái</label>
            <select id="kh-tt" [disabled]="!edit()" (change)="set('trangThai', $any($event.target).value)">
              <option value="Đang dùng" [selected]="k.trangThai !== 'Ngưng'">Đang dùng</option>
              <option value="Ngưng" [selected]="k.trangThai === 'Ngưng'">Ngưng</option>
            </select>
            <span class="hint">Ngưng: không chọn được cho HĐ bán mới.</span>
          </div>
        </div>
      </fieldset>

      <fieldset class="form-sec">
        <legend>Người liên hệ</legend>
        <div class="form-grid cols-3">
          <div class="field">
            <label for="kh-lh">Người liên hệ</label>
            <input id="kh-lh" [value]="k.nguoiLienHe" [disabled]="!edit()" (input)="set('nguoiLienHe', $any($event.target).value)" />
          </div>
          <div class="field">
            <label for="kh-cv">Chức vụ</label>
            <input id="kh-cv" [value]="k.chucVu ?? ''" [disabled]="!edit()" (input)="set('chucVu', $any($event.target).value || undefined)" />
          </div>
          <div class="field">
            <label for="kh-em">Email</label>
            <input id="kh-em" type="email" [value]="k.email" [disabled]="!edit()" (input)="set('email', $any($event.target).value)" />
          </div>
          <div class="field span-3">
            <label for="kh-dt">SĐT / Zalo</label>
            <input id="kh-dt" [value]="k.dienThoai" [disabled]="!edit()" (input)="set('dienThoai', $any($event.target).value)" />
          </div>
        </div>
      </fieldset>

      <fieldset class="form-sec">
        <legend>Theo dõi kinh doanh</legend>
        <div class="form-grid cols-3">
          <div class="field">
            <label for="kh-tc">Trạng thái tiếp cận</label>
            <select id="kh-tc" [disabled]="!edit()" (change)="set('tiepCan', $any($event.target).value)">
              @for (o of TIEP_CAN; track o) { <option [value]="o" [selected]="o === (k.tiepCan ?? 'Chưa liên hệ')">{{ o }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="kh-ch">Trạng thái cơ hội</label>
            <select id="kh-ch" [disabled]="!edit()" (change)="set('coHoi', $any($event.target).value)">
              @for (o of CO_HOI; track o) { <option [value]="o" [selected]="o === (k.coHoi ?? 'Chưa tiếp cận')">{{ o }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="kh-gt">Giá trị cơ hội (VNĐ, chưa VAT)</label>
            <app-money inputId="kh-gt" [value]="k.giaTriCoHoi ?? 0" [disabled]="!edit()" (valueChange)="set('giaTriCoHoi', $event || undefined)" />
          </div>
          <div class="field">
            <label for="kh-ng">Nguồn KH</label>
            <select id="kh-ng" [disabled]="!edit()" (change)="set('nguon', $any($event.target).value || undefined)">
              <option value="">—</option>
              @for (o of NGUON_KH; track o) { <option [value]="o" [selected]="o === k.nguon">{{ o }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="kh-sp">Loại hình sản phẩm</label>
            <select id="kh-sp" [disabled]="!edit()" (change)="set('loaiSP', $any($event.target).value || undefined)">
              <option value="">—</option>
              @for (o of LOAI_SP_KH; track o) { <option [value]="o" [selected]="o === k.loaiSP">{{ o }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="kh-ht">Hình thức HĐ</label>
            <select id="kh-ht" [disabled]="!edit()" (change)="set('hinhThucHD', $any($event.target).value || undefined)">
              <option value="">—</option>
              @for (o of HINH_THUC_HD; track o) { <option [value]="o" [selected]="o === k.hinhThucHD">{{ o }}</option> }
            </select>
          </div>
          <div class="field">
            <label for="kh-pt">Người phụ trách</label>
            <app-pick inputId="kh-pt" [options]="saleOpts()" [value]="k.phuTrach ?? ''" [allowEmpty]="true" placeholder="— Chưa phân bổ —"
              [disabled]="!edit() || !store.canEdit('phanBoKH')" (valueChange)="set('phuTrach', $event || undefined)" />
            @if (!store.canEdit('phanBoKH')) { <span class="hint">Cần quyền "Phân bổ data khách hàng" để đổi.</span> }
          </div>
          <div class="field">
            <label for="kh-ntn">Ngày tiếp nhận</label>
            <input id="kh-ntn" type="date" [value]="k.ngayTiepNhan ?? ''" [disabled]="!edit()" (input)="set('ngayTiepNhan', $any($event.target).value || undefined)" />
          </div>
          <div class="field">
            <span class="lbl">Trạng thái data</span>
            <div class="ro">{{ k.phuTrach ? 'Đã phân bổ' : 'Data thô' }}{{ k.ngayPhanBo ? ' · ' + viDate(k.ngayPhanBo) : '' }}</div>
          </div>
          <div class="field span-3">
            <label for="kh-gc">Ghi chú</label>
            <textarea id="kh-gc" rows="2" [value]="k.ghiChu" [disabled]="!edit()" (input)="set('ghiChu', $any($event.target).value)"></textarea>
          </div>
        </div>
      </fieldset>
    </section>

    @if (k.id) {
      <div class="grid c2" style="margin-top:14px">
        <section class="card">
          <h2 class="section-title">Nhật ký chăm sóc</h2>
          @if (edit()) {
            @if (dirty()) {
              <p class="note warn">Lưu thay đổi thông tin trước khi ghi chăm sóc.</p>
            } @else {
              <div class="form-grid cs-form">
                <div class="field full">
                  <label for="cs-nd">Nội dung trao đổi / yêu cầu KT / báo giá</label>
                  <textarea id="cs-nd" rows="3" [value]="csNd()" (input)="csNd.set($any($event.target).value)"></textarea>
                </div>
                <div class="field">
                  <label for="cs-tc">Đổi tiếp cận</label>
                  <select id="cs-tc" (change)="csTc.set($any($event.target).value)">
                    <option value="" [selected]="!csTc()">— Giữ nguyên —</option>
                    @for (o of TIEP_CAN; track o) { @if (o !== k.tiepCan) { <option [value]="o" [selected]="o === csTc()">{{ o }}</option> } }
                  </select>
                </div>
                <div class="field">
                  <label for="cs-ch">Đổi cơ hội</label>
                  <select id="cs-ch" (change)="csCh.set($any($event.target).value)">
                    <option value="" [selected]="!csCh()">— Giữ nguyên —</option>
                    @for (o of CO_HOI; track o) { @if (o !== k.coHoi) { <option [value]="o" [selected]="o === csCh()">{{ o }}</option> } }
                  </select>
                </div>
              </div>
              <div class="btn-row" style="margin:10px 0 4px">
                <button type="button" class="btn" [disabled]="!csNd().trim() && !csTc() && !csCh()" (click)="ghiCS()">Ghi chăm sóc</button>
              </div>
            }
          }
          <ol class="cs-log">
            @for (c of k.chamSoc ?? []; track c.id) {
              <li>
                <div class="sub">
                  {{ c.nguoi === 'Import' ? viDate(c.luc) : viMoment(c.luc) }} · {{ c.nguoi === 'Import' ? 'Import từ file theo dõi KH' : store.userName(c.nguoi) }}
                  @if (c.coHoi) { <app-tt [v]="c.coHoi" /> }
                </div>
                <div class="cs-nd">{{ c.noiDung }}</div>
              </li>
            } @empty {
              <li class="muted">Chưa có lần chăm sóc nào.</li>
            }
          </ol>
        </section>

        <section class="card">
          <h2 class="section-title">Hợp đồng bán của khách</h2>
          @for (h of hdCua(); track h.id) {
            <div class="row hd-row">
              <a [routerLink]="['/hop-dong-ban', h.id]" class="linkish">{{ h.soHD || '(chưa số)' }}</a>
              <span class="muted">{{ viDate(h.ngayKy) }}</span>
              <app-tt [v]="h.trangThai" />
              @if (xemTien()) { <span class="num" style="margin-left:auto">{{ money(h.sau) }} đ</span> }
            </div>
          } @empty {
            <p class="muted">Chưa có HĐ bán (trong phạm vi bạn được xem).</p>
          }
          @if (store.canEdit('hdb') && k.trangThai !== 'Ngưng') {
            <a class="btn sm quiet" style="margin-top:10px" routerLink="/hop-dong-ban/moi" [queryParams]="{ kh: k.id }"><app-icon name="plus" [size]="16" /> Tạo HĐ bán cho khách này</a>
          }
        </section>
      </div>
    }
  `,
  styles: `
    .cs-form { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .cs-log { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 10px; }
    .cs-log > li { border-left: 3px solid var(--line-2); padding: 2px 0 2px 10px; display: grid; gap: 4px; }
    .cs-log .sub { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
    .cs-nd { white-space: pre-wrap; overflow-wrap: anywhere; font-size: 15px; }
    .hd-row { padding: 6px 0; border-bottom: 1px solid var(--line); }
  `,
})
export class KhDetail {
  protected readonly store = inject(Store);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly confirm = inject(Confirm);
  private readonly unsaved = inject(Unsaved);
  protected readonly money = money;
  protected readonly viDate = viDate;
  protected readonly viMoment = viMoment;
  protected readonly TIEP_CAN = TIEP_CAN;
  protected readonly CO_HOI = CO_HOI;
  protected readonly PHAN_LOAI_KH = PHAN_LOAI_KH;
  protected readonly NGUON_KH = NGUON_KH;
  protected readonly LOAI_SP_KH = LOAI_SP_KH;
  protected readonly HINH_THUC_HD = HINH_THUC_HD;
  protected readonly tinhOpts: PickOption[] = TINH_THANH.map((t) => ({ value: t, label: t }));

  private readonly id = toSignal(this.route.paramMap.pipe(map((m) => m.get('id') ?? 'moi')), {
    initialValue: this.route.snapshot.paramMap.get('id') ?? 'moi',
  });
  protected readonly saved = computed(() => {
    const id = this.id();
    return id === 'moi' ? null : (this.store.khById(id) ?? null);
  });
  /** KH mới: Sale tạo thì mình phụ trách luôn (Store.saveKhachHang cũng ép như vậy). */
  private readonly blank = computed<KhachHang>(() => ({
    ...BLANK,
    phuTrach: this.store.ownOnly('khachHang') ? (this.store.meId() ?? undefined) : undefined,
  }));
  /** Bản nháp; đang sửa dở mà bản lưu đổi (VD vừa ghi chăm sóc) thì giữ nháp, chỉ lấy nhật ký mới. */
  protected readonly f = linkedSignal<KhachHang | null, KhachHang>({
    source: this.saved,
    computation: (s, prev) => {
      if (!s) return prev && !prev.value.id ? prev.value : structuredClone(this.blank());
      if (prev && prev.value.id === s.id && JSON.stringify(prev.value) !== JSON.stringify(prev.source)) {
        return { ...prev.value, chamSoc: s.chamSoc };
      }
      return structuredClone(s);
    },
  });
  protected readonly dirty = computed(() => JSON.stringify(this.f()) !== JSON.stringify(this.saved() ?? this.blank()));
  protected readonly choXoa = computed(() => !!this.saved() && this.store.dangChoXoa('DM_KhachHang', this.saved()!.id));
  protected readonly edit = computed(() => !this.choXoa() && (this.saved() ? this.store.canEditKH(this.saved()) : this.store.canEdit('khachHang')));
  protected readonly xemTien = computed(() => this.store.canView('hdbTab3'));
  protected readonly saleOpts = computed<PickOption[]>(() => {
    const ds = this.store.dsSale();
    const cur = this.f().phuTrach;
    const out = ds.map((t) => ({ value: t.id, label: t.hoTen, hint: t.email }));
    if (cur && !ds.some((t) => t.id === cur)) out.push({ value: cur, label: this.store.userName(cur), hint: 'không còn hoạt động' });
    return out;
  });

  protected readonly trung = signal<KhachHang | null>(null);
  protected readonly err = signal('');
  protected readonly csNd = signal('');
  protected readonly csTc = signal<'' | TiepCan>('');
  protected readonly csCh = signal<'' | CoHoi>('');

  constructor() {
    canhBaoChuaLuu(() => this.dirty() || !!this.csNd().trim());
  }

  protected readonly hdCua = computed(() => {
    const id = this.saved()?.id;
    if (!id) return [];
    const db = this.store.db();
    return this.store
      .hdbVisible()
      .filter((h) => h.maKH === id)
      .map((h) => ({ id: h.id, soHD: h.soHD, ngayKy: h.ngayKy, trangThai: h.trangThai, sau: hdbCalc(h, db).sauVAT }));
  });

  protected set<K extends F>(k: K, v: KhachHang[K]): void {
    this.f.update((d) => ({ ...d, [k]: v }));
    this.trung.set(null);
    this.err.set('');
  }

  protected hoanTac(): void {
    const s = this.saved();
    this.f.set(structuredClone(s ?? this.blank()));
    this.trung.set(null);
    this.err.set('');
  }

  protected luu(boQuaTrung: boolean): void {
    const d = this.f();
    const draft: KhachHang = { ...d, ten: d.ten.trim(), mst: d.mst.trim() };
    if (!boQuaTrung) {
      const t = this.store.trungKhachHang(draft);
      if (t) {
        this.trung.set(t);
        return;
      }
    }
    const moi = !draft.id;
    const err = this.store.saveKhachHang(draft);
    if (err) {
      this.err.set(err);
      return;
    }
    this.trung.set(null);
    this.store.say(moi ? 'Đã thêm khách hàng ' + draft.id : 'Đã lưu khách hàng');
    if (moi) void this.unsaved.diSauKhiLuu(() => this.router.navigate(['/khach-hang', draft.id], { replaceUrl: true }));
    else this.f.set(structuredClone(this.store.khById(draft.id)!));
  }

  protected ghiCS(): void {
    const s = this.saved();
    if (!s) return;
    const err = this.store.ghiChamSoc(s.id, this.csNd(), { tiepCan: this.csTc() || undefined, coHoi: this.csCh() || undefined });
    if (err) return this.store.say(err);
    this.csNd.set('');
    this.csTc.set('');
    this.csCh.set('');
    this.store.say('Đã ghi chăm sóc');
  }

  protected async xoa(): Promise<void> {
    const s = this.saved();
    if (s) await guiXoa(this.confirm, this.store, 'DM_KhachHang', s.id, `Khách hàng ${s.id} — ${s.ten}`);
  }
}
