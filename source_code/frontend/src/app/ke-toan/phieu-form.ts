import { ChangeDetectionStrategy, Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Store } from '../core/store';
import { LOAI_PHIEU, LoaiPhieu, PhieuThuChi } from '../core/models';
import { chenhLechQuyetToan, tamUngChoQuyetToan } from '../core/calc';
import { money, moneyInWords, viDate, viMoment } from '../core/util';
import { Modal, MoneyInput, Pick, PickOption, TrangThai } from '../shared/ui-kit';
import { Confirm } from '../shared/confirm';
import { guiXoa } from '../shared/ho-so';
import { LichSu } from '../shared/lich-su';
import { TepDinhKem } from '../shared/tep-dinh-kem';
import { donVi, esc, inGiay, kyTen } from './kt-print';

/** Popup Lập / Sửa phiếu thu chi (KT-05, KT-06, KT-08, KT-10) + In phiếu A5. */
@Component({
  selector: 'app-phieu-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Modal, MoneyInput, Pick, TrangThai, RouterLink, LichSu, TepDinhKem],
  template: `
    @if (f(); as p) {
      <app-modal [open]="true" [title]="p.id ? 'Phiếu ' + p.soPhieu : 'Lập phiếu thu chi'" [sub]="p.loai" size="md" [dirty]="dirty()" (closed)="closed.emit()">
        @if (p.phatSinh) {
          <div class="note info">
            Phiếu sinh tự động từ đợt {{ p.phatSinh.dot }} của
            <a [routerLink]="[p.phatSinh.loai === 'HDM-DotTT' ? '/hop-dong-mua' : '/hop-dong-ban', p.phatSinh.hdId]" [queryParams]="{ tab: p.phatSinh.loai === 'HDM-DotTT' ? 4 : 3 }">
              {{ p.phatSinh.loai === 'HDM-DotTT' ? 'HĐ mua' : 'HĐ bán' }} {{ soHDGoc() }}</a> — chỉ xem; sửa tại hợp đồng.
          </div>
        }
        @if (p.loai === 'Quyết toán tạm ứng' && goc(); as g) {
          <p class="note info">Quyết toán cho phiếu tạm ứng <button type="button" class="linkish" (click)="moPhieu.emit(g.id)">{{ g.soPhieu }}</button>.</p>
        }
        @if (p.loai === 'Tạm ứng' && quyetToan().length) {
          <p class="note info">
            Đã có quyết toán:
            @for (q of quyetToan(); track q.id; let last = $last) {
              <button type="button" class="linkish" (click)="moPhieu.emit(q.id)">{{ q.soPhieu }}</button> ({{ q.trangThai }})@if (!last) {, }
            }
          </p>
        }
        @if (p.trangThai === 'Từ chối' && p.lyDoTuChoi) {
          <div class="note bad">Bị từ chối bởi {{ store.userName(p.nguoiDuyet) }} ({{ viMoment(p.ngayDuyet) }}): {{ p.lyDoTuChoi }}</div>
        }
        @if (choXoa()) { <div class="note bad">Phiếu đang có yêu cầu xoá chờ duyệt — khoá sửa.</div> }
        @if (err()) { <div class="note bad">{{ err() }}</div> }

        <div class="form-grid">
          <div class="field"><span class="lbl">Số phiếu</span><div class="ro">{{ p.soPhieu || 'Tự sinh khi lưu (TC' + p.ngayLap.slice(2, 4) + '-nnnn)' }}</div></div>
          <div class="field">
            <label for="pf-loai">Loại phiếu</label>
            <select id="pf-loai" [disabled]="!edit()" (change)="setLoai($any($event.target).value)">
              @for (l of loais; track l) { <option [value]="l" [selected]="l === p.loai">{{ l }}</option> }
            </select>
          </div>
          <div class="field"><label for="pf-ngay">Ngày lập</label><input id="pf-ngay" type="date" [disabled]="!edit()" [value]="p.ngayLap" (input)="set('ngayLap', $any($event.target).value)" /></div>
          <div class="field"><span class="lbl">Trạng thái</span><div class="ro">@if (choXoa()) { <app-tt v="Chờ xoá" /> } @else { <app-tt [v]="p.trangThai" /> }</div></div>

          @switch (p.loai) {
            @case ('Thu') {
              <div class="field"><label>Nguồn tiền <span class="req">*</span></label><app-pick [options]="nguonOpts()" [disabled]="!edit()" [value]="p.nguonTien" (valueChange)="set('nguonTien', $event)" /></div>
              <div class="field"><label>Số tiền Thu <span class="req">*</span></label><app-money [disabled]="!edit()" [value]="p.soTienThu" (valueChange)="set('soTienThu', $event)" /></div>
            }
            @case ('Luân chuyển') {
              <div class="field"><label>Nguồn đi <span class="req">*</span></label><app-pick [options]="nguonOpts()" [disabled]="!edit()" [value]="p.nguonTien" (valueChange)="set('nguonTien', $event)" /></div>
              <div class="field"><label>Nguồn đến <span class="req">*</span></label><app-pick [options]="nguonOpts()" [disabled]="!edit()" [value]="p.nguonTienDen || ''" (valueChange)="set('nguonTienDen', $event)" /></div>
              <div class="field"><label>Số tiền <span class="req">*</span></label><app-money [disabled]="!edit()" [value]="p.soTienChi" (valueChange)="set('soTienChi', $event)" /></div>
              <p class="hint wide muted">Giảm Nguồn đi và tăng Nguồn đến cùng lúc khi duyệt; không tính vào Tổng Thu / Tổng Chi.</p>
            }
            @case ('Quyết toán tạm ứng') {
              <div class="field wide"><label>Phiếu Tạm ứng gốc <span class="req">*</span></label><app-pick [options]="tamUngOpts()" [disabled]="!edit()" [value]="p.phieuTamUngGoc || ''" (valueChange)="chonGoc($event)" placeholder="— Chọn phiếu tạm ứng đã duyệt, chưa quyết toán —" /></div>
              <div class="field"><label>Nguồn tiền <span class="req">*</span></label><app-pick [options]="nguonOpts()" [disabled]="!edit()" [value]="p.nguonTien" (valueChange)="set('nguonTien', $event)" /></div>
              <div class="field"><span class="lbl">Số tiền tạm ứng</span><div class="ro num">{{ money(goc()?.soTienChi ?? 0) }}</div></div>
              <div class="field">
                <label>Số tiền thực chi <span class="req">*</span></label><app-money [disabled]="!edit()" [value]="p.soTienThucChi ?? 0" (valueChange)="set('soTienThucChi', $event)" />
                @if (edit() && p.soTienThucChi === undefined) { <span class="hint">Chưa nhập — thực chi 0 đ thì bấm <button type="button" class="linkish" (click)="set('soTienThucChi', 0)">ghi 0 đ</button>.</span> }
              </div>
              <div class="field"><label>Loại chi phí <span class="req">*</span></label><app-pick [options]="lcpOpts()" [disabled]="!edit()" [value]="p.loaiChiPhi || ''" (valueChange)="set('loaiChiPhi', $event)" /></div>
              <div class="field"><span class="lbl">Chênh lệch</span><div class="ro num" [class.neg]="chenh() < 0" title="Chênh lệch = Tạm ứng − Thực chi">{{ money(chenh()) }}</div></div>
              <div class="note wide" [class.info]="chenh() >= 0" [class.warn]="chenh() < 0">
                Chênh lệch = Tạm ứng − Thực chi.
                @if (chenh() > 0) { Dương: người nhận hoàn ứng {{ money(chenh()) }} đ — ghi Thu vào nguồn. }
                @else if (chenh() < 0) { Âm: chi bổ sung {{ money(-chenh()) }} đ — ghi Chi từ nguồn. }
                @else { Bằng 0: số dư nguồn không đổi. }
                Chỉ phần chênh lệch tác động số dư.
              </div>
            }
            @default {
              <div class="field">
                <label>Nguồn tiền <span class="req">*</span></label><app-pick [options]="nguonOpts()" [disabled]="!edit()" [value]="p.nguonTien" (valueChange)="set('nguonTien', $event)" />
                @if (p.nguonTien) { <span class="hint" [class.neg]="soDuNguon() < p.soTienChi">Số dư hiện tại: {{ money(soDuNguon()) }} đ</span> }
              </div>
              <div class="field"><label>Số tiền Chi <span class="req">*</span></label><app-money [disabled]="!edit()" [value]="p.soTienChi" (valueChange)="set('soTienChi', $event)" /></div>
              <div class="field"><label>Loại chi phí (Vận hành) <span class="req">*</span></label><app-pick [options]="lcpOpts()" [disabled]="!edit()" [value]="p.loaiChiPhi || ''" (valueChange)="set('loaiChiPhi', $event)" /></div>
              @if (p.loai === 'Tạm ứng') {
                <div class="field"><label for="pf-nn">Người nhận tạm ứng <span class="req">*</span></label><input id="pf-nn" [disabled]="!edit()" [value]="p.nguoiNhan || ''" (input)="set('nguoiNhan', $any($event.target).value)" /></div>
              }
            }
          }

          <div class="field wide"><label for="pf-nd">Nội dung <span class="req">*</span></label><textarea id="pf-nd" rows="2" [disabled]="!edit()" [value]="p.noiDung" (input)="set('noiDung', $any($event.target).value)"></textarea></div>
          <div class="field"><span class="lbl">Người đề nghị</span><div class="ro">{{ store.userName(p.nguoiDeNghi) }}</div></div>
          @if (p.nguoiDuyet && p.trangThai === 'Đã duyệt') {
            <div class="field"><span class="lbl">Người duyệt</span><div class="ro">{{ store.userName(p.nguoiDuyet) }} · {{ viMoment(p.ngayDuyet) }}</div></div>
          }
          <div class="field wide"><label for="pf-gc">Ghi chú</label><input id="pf-gc" [disabled]="!edit()" [value]="p.ghiChu || ''" (input)="set('ghiChu', $any($event.target).value)" /></div>
          <app-tep-dinh-kem class="wide" [files]="p.files" [edit]="edit()" (filesChange)="set('files', $event)" />
          <app-lich-su class="wide" [rows]="p.lichSu ?? []" [mo]="p.trangThai === 'Từ chối' || duyetDuoc()" />
        </div>

        <div foot>
          @if (p.id) { <button type="button" class="btn quiet" (click)="inPhieu()">In phiếu</button> }
          @if (p.id && !p.phatSinh && !choXoa() && store.level('duyetXoa') !== 'none') {
            <button type="button" class="btn danger quiet" (click)="xoa()">Xoá</button>
          }
          <span style="flex:1"></span>
          <button type="button" class="btn quiet" (click)="dong()">{{ edit() ? 'Huỷ' : 'Đóng' }}</button>
          @if (edit()) {
            <button type="button" class="btn quiet" (click)="luu(false)">Lưu nháp</button>
            <button type="button" class="btn" (click)="luu(true)">Gửi duyệt</button>
          }
          @if (duyetDuoc() && p.trangThai === 'Chờ duyệt' && !choXoa()) {
            <button type="button" class="btn danger quiet" (click)="tuChoi.emit()">Từ chối</button>
            <button type="button" class="btn ok" (click)="duyet.emit()">Duyệt</button>
          }
        </div>
      </app-modal>
    }
  `,
})
export class PhieuForm {
  protected readonly store = inject(Store);
  private readonly confirm = inject(Confirm);
  readonly phieu = input<PhieuThuChi | null>(null);
  /** Mở từ tab Chờ duyệt: hiện nút Duyệt / Từ chối ngay trong popup (KT-07). */
  readonly duyetDuoc = input(false);
  readonly closed = output<void>();
  readonly duyet = output<void>();
  readonly tuChoi = output<void>();
  /** Mở phiếu liên quan (tạm ứng gốc ↔ quyết toán). */
  readonly moPhieu = output<string>();

  protected readonly f = linkedSignal<PhieuThuChi | null>(() => {
    const p = this.phieu();
    return p ? structuredClone(p) : null;
  });
  protected readonly dirty = computed(() => this.edit() && JSON.stringify(this.f()) !== JSON.stringify(this.phieu()));
  protected readonly quyetToan = computed(() => {
    const id = this.f()?.id;
    return id ? this.store.phieuThuChi().filter((x) => x.phieuTamUngGoc === id) : [];
  });
  protected readonly soDuNguon = computed(() => {
    const n = this.f()?.nguonTien;
    return n ? this.store.soDu(n).soDu : 0;
  });
  protected readonly err = linkedSignal({ source: this.phieu, computation: () => '' });
  protected readonly loais = LOAI_PHIEU;
  protected readonly money = money;
  protected readonly viMoment = viMoment;

  protected readonly edit = computed(() => {
    const p = this.phieu();
    return !!p && this.store.phieuSuaDuoc(p);
  });
  protected readonly choXoa = computed(() => {
    const p = this.f();
    return !!p?.id && this.store.dangChoXoa('PhieuThuChi', p.id);
  });
  protected readonly soHDGoc = computed(() => {
    const ps = this.f()?.phatSinh;
    if (!ps) return '';
    return (ps.loai === 'HDM-DotTT' ? this.store.hdmById(ps.hdId)?.soHD : this.store.hdbById(ps.hdId)?.soHD) ?? ps.hdId;
  });

  protected readonly nguonOpts = computed<PickOption[]>(() => {
    const p = this.f();
    const list: PickOption[] = this.store.nguonDangDung().map((n) => ({ value: n.id, label: n.ten, hint: n.loai }));
    for (const id of [p?.nguonTien, p?.nguonTienDen]) {
      const n = id ? this.store.nguonById(id) : undefined;
      if (n && !list.some((o) => o.value === n.id)) list.push({ value: n.id, label: n.ten, hint: 'Ngưng' });
    }
    return list;
  });
  protected readonly lcpOpts = computed<PickOption[]>(() => {
    const cur = this.f()?.loaiChiPhi;
    const list: PickOption[] = this.store.lcpVanHanh().map((l) => ({ value: l.id, label: l.ten }));
    const c = cur ? this.store.lcpById(cur) : undefined;
    if (c && !list.some((o) => o.value === c.id)) list.push({ value: c.id, label: c.ten, hint: c.dangDung ? c.nhom : 'Ngưng' });
    return list;
  });
  protected readonly tamUngOpts = computed<PickOption[]>(() => {
    const p = this.f();
    const db = this.store.db();
    const list = tamUngChoQuyetToan(db, p?.id || undefined);
    const cur = p?.phieuTamUngGoc ? this.store.phieuById(p.phieuTamUngGoc) : undefined;
    if (cur && !list.some((x) => x.id === cur.id)) list.push(cur);
    return list.map((x) => ({
      value: x.id,
      label: `${x.soPhieu} — ${x.nguoiNhan || this.store.userName(x.nguoiDeNghi)}`,
      hint: `${money(x.soTienChi)} đ · ${viDate(x.ngayLap)}`,
    }));
  });
  protected readonly goc = computed(() => this.store.phieuById(this.f()?.phieuTamUngGoc));
  protected readonly chenh = computed(() => {
    const p = this.f();
    return p ? chenhLechQuyetToan(p, this.store.db()) : 0;
  });

  protected set<K extends keyof PhieuThuChi>(k: K, v: PhieuThuChi[K]): void {
    this.f.update((p) => (p ? { ...p, [k]: v } : p));
  }
  protected setLoai(v: string): void {
    this.set('loai', v as LoaiPhieu);
  }
  protected chonGoc(id: string): void {
    const g = this.store.phieuById(id);
    // Gợi ý thực chi = số tạm ứng (chênh lệch 0); người dùng sửa lại theo chứng từ thật.
    this.f.update((p) =>
      p ? { ...p, phieuTamUngGoc: id || undefined, nguonTien: g?.nguonTien ?? p.nguonTien, nguoiNhan: g?.nguoiNhan, soTienThucChi: p.soTienThucChi ?? g?.soTienChi } : p,
    );
  }
  protected dong(): void {
    this.closed.emit();
  }

  protected luu(gui: boolean): void {
    const p = this.f();
    if (!p) return;
    const e = this.store.savePhieu(p, gui);
    if (e) {
      this.err.set(e);
      this.store.say(e);
      return;
    }
    this.store.say(gui ? 'Đã gửi duyệt phiếu' : 'Đã lưu nháp phiếu');
    this.closed.emit();
  }

  protected async xoa(): Promise<void> {
    const p = this.f();
    if (!p) return;
    if (await guiXoa(this.confirm, this.store, 'PhieuThuChi', p.id, `Phiếu ${p.soPhieu}`)) this.closed.emit();
  }

  protected inPhieu(): void {
    const p = this.f();
    if (!p) return;
    const cl = this.chenh();
    let tieuDe = 'PHIẾU CHI';
    let soTien = p.soTienChi;
    let nguoiTien = 'Người nhận tiền';
    if (p.loai === 'Thu') {
      tieuDe = 'PHIẾU THU';
      soTien = p.soTienThu;
      nguoiTien = 'Người nộp tiền';
    } else if (p.loai === 'Quyết toán tạm ứng') {
      tieuDe = cl > 0 ? 'PHIẾU THU (HOÀN ỨNG)' : 'PHIẾU CHI (QUYẾT TOÁN TẠM ỨNG)';
      soTien = Math.abs(cl);
      nguoiTien = cl > 0 ? 'Người nộp tiền' : 'Người nhận tiền';
    } else if (p.loai === 'Luân chuyển') {
      tieuDe = 'PHIẾU LUÂN CHUYỂN TIỀN';
    }
    const ten = p.nguoiNhan || this.store.userName(p.nguoiDeNghi);
    const nguon =
      p.loai === 'Luân chuyển' ? `${this.store.nguonTen(p.nguonTien)} → ${this.store.nguonTen(p.nguonTienDen)}` : this.store.nguonTen(p.nguonTien);
    const d = p.ngayLap.split('-');
    const body = `
      <div class="head">${donVi()}<div class="r">Số: <b>${esc(p.soPhieu)}</b><br>Trạng thái: ${esc(p.trangThai)}</div></div>
      <h1>${tieuDe}</h1>
      <p class="c m">Ngày ${d[2]} tháng ${d[1]} năm ${d[0]}</p>
      <div class="dong"><b>Họ tên ${nguoiTien.toLowerCase()}:</b> ${esc(ten)}</div>
      <div class="dong"><b>Lý do:</b> ${esc(p.noiDung)}</div>
      <div class="dong"><b>Nguồn tiền:</b> ${esc(nguon)}</div>
      ${p.loaiChiPhi ? `<div class="dong"><b>Loại chi phí:</b> ${esc(this.store.lcpTen(p.loaiChiPhi))}</div>` : ''}
      ${
        p.loai === 'Quyết toán tạm ứng'
          ? `<div class="dong"><b>Tạm ứng gốc:</b> ${esc(this.goc()?.soPhieu)} — ${money(this.goc()?.soTienChi ?? 0)} đ; thực chi ${money(p.soTienThucChi ?? 0)} đ</div>`
          : ''
      }
      <div class="dong"><b>Số tiền:</b> <strong>${money(soTien)} đ</strong></div>
      <div class="dong"><b>Bằng chữ:</b> <i>${esc(moneyInWords(soTien))}</i></div>
      ${p.ghiChu ? `<div class="dong"><b>Ghi chú:</b> ${esc(p.ghiChu)}</div>` : ''}
      ${kyTen(['Giám đốc', 'Kế toán', 'Người lập phiếu', 'Thủ quỹ', nguoiTien])}
    `;
    if (!inGiay(`${tieuDe} ${p.soPhieu}`, body, 'A5')) this.store.say('Trình duyệt chặn cửa sổ in — hãy cho phép cửa sổ bật lên');
  }
}
