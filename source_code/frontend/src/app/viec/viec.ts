import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CanhBaoTay, FileRef, MUC_CANH_BAO, MUC_CANH_BAO_MOTA, MUC_CANH_BAO_TEN, MUC_UU_TIEN, MucCanhBao, MucUuTien, NHOM_VIEC, NguonViec, NhomViec, PHUT_DUYET_HAN, ViecGiao, ycConHan } from '../core/models';
import { Store } from '../core/store';
import { daysFromToday, nowIso, todayIso, viDate, viMoment } from '../core/util';
import { CanhBao, NHOM_RUI_RO, soSanhCanhBao, tinhCanhBaoTuDong } from './canh-bao';
import { Icon } from '../shared/icon';
import { Modal, PickGo, PickOption } from '../shared/ui-kit';
import { TepDinhKem } from '../shared/tep-dinh-kem';
import { dirtyOf } from '../shared/unsaved';
import { TT } from '../core/trang-thai';

type TrangThaiViec = 'Chưa bắt đầu' | 'Đang làm' | 'Chờ phê duyệt' | 'Hoàn thành';
type PhamVi = 'toi' | 'toiGiao' | 'tatCa';

interface Soan {
  noiDung: string;
  nhom: NhomViec | '';
  mucUuTien: MucUuTien;
  nguonLoai: NguonViec;
  hdbId: string;
  hdmId: string;
  nguoiNhan: string[];
  batDau: string;
  han: string;
  gio: string;
  files: FileRef[];
}

/** Báo rủi ro nhập tay → tạo một việc mang mức cảnh báo. */
interface RuiRo {
  noiDung: string;
  muc: MucCanhBao;
  anhHuong: string;
  nhom: NhomViec | '';
  nguonLoai: NguonViec;
  hdbId: string;
  hdmId: string;
}

const MUC_CB_NGAN: Record<MucCanhBao, string> = {
  P0: 'can thiệp ngay',
  P1: 'ảnh hưởng cam kết / tài chính',
  P2: 'còn thời gian phòng ngừa',
};

const NGUON_TEN: Record<NguonViec, string> = { HDB: 'HĐ BÁN', HDM: 'HĐ MUA', NOI_BO: 'NỘI BỘ' };

/**
 * Công việc & Cảnh báo (nghiep_vu 09 — ToDoList): giao cho 1 hoặc nhiều người, có nhóm việc, ngày bắt đầu / kết thúc,
 * mức ưu tiên, nguồn (HĐ bán / HĐ mua / nội bộ). Người nhận đề nghị đổi hạn (kèm tệp), người giao duyệt trong 1 giờ.
 */
@Component({
  selector: 'app-viec',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'page' },
  imports: [RouterLink, Icon, Modal, PickGo, TepDinhKem],
  styles: [
    `.vh h1{font-size:34px;letter-spacing:-.01em}.vh .crumbs{color:var(--ink-3)}.vh .crumbs a{color:var(--brand);font-weight:600;text-decoration:none}
     .pn{background:var(--surf);border-radius:18px;padding:16px 18px;box-shadow:0 1px 2px rgba(20,40,20,.06);margin-top:14px}
     .banner{display:flex;gap:8px;align-items:center;margin:12px 0;padding:10px 14px;border-radius:12px;background:#fdf1d8;color:#8a5a00;font-weight:600}
     .schips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
     .schips button{display:inline-flex;gap:6px;align-items:center;height:34px;padding:0 14px;border-radius:999px;border:1px solid var(--line);background:var(--surf);cursor:pointer;font-size:14.5px;color:var(--ink-2)}
     .schips button.on{background:#16642b;border-color:#16642b;color:#fff;font-weight:700}
     .schips button.flag{border-color:#e8b3ae;background:#fdeceb;color:#a3261d}.schips button.flag.on{background:#a3261d;border-color:#a3261d;color:#fff}
     .vfil{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px}
     .vfil .sr-in{display:flex;align-items:center;gap:8px;flex:1 1 260px;height:42px;padding:0 14px;border-radius:999px;background:var(--panel);color:var(--ink-3)}
     .vfil .sr-in input:not([type='checkbox']){flex:1;min-width:0;height:100%;padding:0;border:0;background:transparent;box-shadow:none;outline:0;border-radius:0}
     .vfil select{height:42px;border-radius:999px;border:1px solid var(--line);padding:0 14px;background:var(--surf)}
     table.vt{width:100%;border-collapse:collapse;font-size:14.5px}
     table.vt thead th{background:var(--surf-2);font-size:13px;font-weight:600;color:var(--ink-2);text-align:left;padding:8px 8px;white-space:nowrap}
     table.vt tbody td{padding:9px 8px;border-bottom:1px solid var(--line);vertical-align:middle}
     table.vt tbody tr{cursor:pointer}table.vt tbody tr:hover{background:var(--surf-2)}
     table.vt tr.cao{background:#fdf6ee}table.vt tr.tb{background:#fffaf0}table.vt tr.xong{opacity:.8}
     .star{color:#e0a100;margin-right:4px}
     .ma small{display:block;font-size:11px;font-weight:700;letter-spacing:.03em;color:#16642b}
     .ma.hdm small{color:#1d5a99}.ma.sc small{color:#c0572b}
     .ma span{display:inline-block;padding:1px 8px;border-radius:7px;background:var(--brand-tint);color:#16642b;font-weight:700;font-size:13px}
     .ma.hdm span{background:#dcebfa;color:#1d5a99}.ma.nb span{background:var(--surf-3);color:var(--ink-2)}
     .who{display:flex;align-items:center;gap:6px}.av{width:24px;height:24px;border-radius:50%;display:grid;place-items:center;color:#fff;font-size:10.5px;font-weight:700;flex:0 0 auto}
     .st{display:inline-block;padding:1px 10px;border-radius:7px;font-size:13px;font-weight:600;white-space:nowrap}
     .st.cbd{background:#e6eaf0;color:#56657a}.st.dl{background:#dcebfa;color:#1d5a99}.st.cd{background:#fbf0d6;color:#8a5a00}.st.ht{background:#fde8c8;color:#8a4a00}
     .fl{display:inline-block;padding:1px 9px;border-radius:999px;font-size:12.5px;font-weight:700;background:#fdeceb;color:#a3261d;border:1px solid #f0b8b3}
     .fl.cd{background:#fbf0d6;color:#8a5a00;border-color:#ecd49a}
     .pr{display:inline-block;padding:1px 10px;border-radius:7px;font-size:13px;font-weight:600}
     .pr.cao{background:#fde0dd;color:#a3261d}.pr.tb{background:#fbf0d6;color:#8a5a00}.pr.thap{background:#ebeff4;color:#56657a}
     .legend{margin-top:10px;font-size:12.5px;color:var(--ink-3);display:grid;gap:2px}
     .tg{display:inline-block;padding:1px 10px;border-radius:7px;font-size:13px;font-weight:600;background:var(--surf-3);color:var(--ink-2)}.tg.gd{background:#fdf1d8;color:#8a5a00}
     .bh{display:flex;gap:10px;justify-content:space-between;align-items:baseline;margin-bottom:2px;font-size:13px}
     .chat{display:grid;gap:8px;max-height:260px;overflow:auto;padding:4px}
     .msg{max-width:80%;padding:8px 10px;border-radius:10px;background:var(--surf-2)}
     .msg.toi{justify-self:end;background:var(--ok-bg)}.msg.he{justify-self:center;background:none;color:var(--ink-3);font-size:13px}
     .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
     .vg{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:12px 14px}
     .vg .s12{grid-column:span 12}.vg .s6{grid-column:span 6}.vg .s4{grid-column:span 4}.vg .s3{grid-column:span 3}
     .mtabs{display:inline-flex;gap:4px;margin:12px 0 4px;padding:4px;border-radius:999px;background:var(--surf);box-shadow:0 1px 2px rgba(20,40,20,.06)}
     .mtabs button{height:34px;padding:0 18px;border:0;border-radius:999px;background:transparent;color:var(--ink-2);font-size:14.5px;cursor:pointer}
     .mtabs button.on{background:#16642b;color:#fff;font-weight:700}
     .cbcards{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:12px}
     .cbc{display:grid;gap:2px;text-align:left;padding:14px 16px;border-radius:16px;border:1px solid var(--line);background:var(--surf);cursor:pointer;color:var(--ink)}
     .cbc small{display:flex;align-items:center;gap:6px;font-size:13px;font-weight:600}.cbc b{font-size:30px;line-height:1.1}.cbc span{font-size:12.5px;color:var(--ink-3)}
     .cbc.all{background:#16642b;border-color:#16642b;color:#fff}.cbc.all span{color:#d6ecdc}
     .cbc.p0 b{color:#c0392b}.cbc.p1 b{color:var(--ink)}.cbc.p2 b{color:var(--ink)}
     .cbc.sel{box-shadow:0 0 0 2px #16642b}
     .cbc .dot,.cbg .dot,.cbs .dot{display:inline-block;width:8px;height:8px;border-radius:50%;background:currentColor}
     .cbc.p0 small{color:#c0392b}.cbc.p1 small{color:#c8661b}.cbc.p2 small{color:#b8860b}
     .cbhead{display:flex;justify-content:space-between;align-items:baseline;gap:10px;margin-bottom:10px}.cbhead h2{font-size:17px;margin:0}
     table.cbt{border-collapse:separate;border-spacing:0}
     table.cbt tr.cbg td{padding:8px 12px;font-size:13px;border-bottom:1px solid var(--line)}
     table.cbt tr.cbg span{color:var(--ink-3);margin-left:4px}
     table.cbt tr.cbg.p0 td{background:#fdeceb;color:#a3261d}table.cbt tr.cbg.p1 td{background:#fdf1e6;color:#b4560f}table.cbt tr.cbg.p2 td{background:#fdf6e0;color:#8a5a00}
     table.cbt tr.cbr td:first-child{border-left:4px solid transparent}
     table.cbt tr.cbr.p0 td:first-child{border-left-color:#c0392b}table.cbt tr.cbr.p1 td:first-child{border-left-color:#e08a2c}table.cbt tr.cbr.p2 td:first-child{border-left-color:#e0b02c}
     table.cbt tbody td{vertical-align:top}
     .cbn{display:block;margin-top:2px;font-size:12px;color:var(--ink-3);font-weight:400}.cbah{color:var(--ink-2);max-width:260px}
     .cbm{display:inline-block;padding:1px 8px;border-radius:7px;font-size:12.5px;font-weight:700}
     .cbm.p0{background:#c0392b;color:#fff}.cbm.p1{background:#fde8d2;color:#b4560f}.cbm.p2{background:#fbf0d6;color:#8a5a00}
     .cbhs{display:inline-block;padding:1px 9px;border-radius:7px;font-size:12.5px;font-weight:700;text-decoration:none;background:var(--brand-tint);color:#16642b}
     .cbhs.hdm{background:#dcebfa;color:#1d5a99}.cbhs.kho{background:#e3f3ee;color:#1b6b5a}.cbhs.kt{background:#efe6fa;color:#6b3fb0}
     .cbw{display:inline-flex;align-items:center;gap:6px;white-space:nowrap}.cbq{display:inline-block;width:9px;height:9px;border-radius:2px;background:#1b6b5a}
     .cbq.m1{background:#2b7fc0}.cbq.m2{background:#7a5bc7}.cbq.m3{background:#d59a1b}.cbq.m4{background:#c0572b}
     .cbs{display:inline-flex;align-items:center;gap:6px;white-space:nowrap;font-size:13px;font-weight:600;color:#b4560f}.cbs.done{color:#16642b}
     .cbgo{display:inline-grid;place-items:center;width:28px;height:28px;border-radius:8px;background:var(--surf-2);color:var(--ink-2)}
     table.cbt tr.cbr{cursor:pointer}table.cbt tr.cbr:hover td{background:var(--surf-2)}
     .rr-muc{display:grid;gap:8px}
     .rr-m{display:grid;gap:2px;text-align:left;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:var(--surf);cursor:pointer;color:var(--ink)}
     .rr-m small{color:var(--ink-3);font-size:12.5px}.rr-m.on{border-width:2px;padding:9px 11px}
     .rr-m.p0.on{border-color:#c0392b;background:#fdeceb}.rr-m.p1.on{border-color:#e08a2c;background:#fdf1e6}.rr-m.p2.on{border-color:#e0b02c;background:#fdf6e0}
     @media (max-width:900px){.cbcards{grid-template-columns:repeat(2,minmax(0,1fr))}}
     .vg-sec{margin-top:4px;padding-top:12px;border-top:1px solid var(--line);font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#16642b}
     .vg-days{display:flex;align-items:center;justify-content:center;height:40px;border-radius:var(--radius-sm);background:var(--brand-tint);color:#16642b;font-weight:700;font-size:18px}
     .vg .chips{margin-top:2px}
     .quick{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
     .quick .btn{width:100%;padding:4px 6px;font-size:13.5px;overflow:hidden;text-overflow:ellipsis}
     @media (max-width:640px){.quick{grid-template-columns:repeat(2,minmax(0,1fr))}.vg .s4,.vg .s3{grid-column:span 6}.vg .s12{grid-column:span 12}}
`,
  ],
  template: `
    <div class="vh">
      <div class="crumbs"><a routerLink="/">Trang chủ</a> › Công việc & Cảnh báo</div>
      <div class="between"><h1>Công việc & Cảnh báo</h1>
        @if (store.canEdit('viec', store.meId() ?? undefined)) {
          @if (tab() === 'canhbao') {
            <button type="button" class="btn" (click)="moRuiRo()"><app-icon name="plus" [size]="16" /> Báo rủi ro</button>
          } @else {
            <button type="button" class="btn" (click)="moSoan()"><app-icon name="plus" [size]="16" /> Giao việc / Đặt lịch</button>
          }
        }
      </div>
    </div>

    <div class="mtabs" role="tablist" aria-label="Công việc hoặc Cảnh báo">
      <button type="button" role="tab" [class.on]="tab() === 'viec'" [attr.aria-selected]="tab() === 'viec'" (click)="tab.set('viec')">Công việc</button>
      <button type="button" role="tab" [class.on]="tab() === 'canhbao'" [attr.aria-selected]="tab() === 'canhbao'" (click)="tab.set('canhbao')">Cảnh báo</button>
    </div>

    @if (tab() === 'canhbao') {
      <div class="cbcards">
        <button type="button" class="cbc all" [class.sel]="!fMucCB()" (click)="fMucCB.set('')">
          <small>Tất cả cảnh báo</small><b>{{ demCB().tong }}</b><span>đang cảnh báo</span>
        </button>
        @for (m of MUC_CB; track m) {
          <button type="button" class="cbc" [class]="'cbc ' + m.toLowerCase()" [class.sel]="fMucCB() === m" (click)="fMucCB.set(fMucCB() === m ? '' : m)">
            <small><i class="dot"></i>{{ m }} · {{ MUC_CB_TEN[m] }}</small><b>{{ demCB()[m] }}</b><span>{{ MUC_CB_NGAN[m] }}</span>
          </button>
        }
      </div>

      <section class="pn">
        <div class="cbhead">
          <h2>Danh sách cảnh báo</h2>
          <span class="sub">sắp theo mức · cập nhật {{ capNhat }}</span>
        </div>
        <div class="vfil">
          <label class="sr-in"><app-icon name="search" [size]="16" /><input type="search" placeholder="Tìm nội dung rủi ro, mã hồ sơ…" aria-label="Tìm cảnh báo" [value]="qCB()" (input)="qCB.set($any($event.target).value)" /></label>
          <select aria-label="Người theo dõi" (change)="fTheoDoi.set($any($event.target).value)">
            <option value="" [selected]="!fTheoDoi()">Người theo dõi: Tất cả</option>
            @for (n of dsTheoDoi(); track n) { <option [value]="n" [selected]="fTheoDoi() === n">{{ n }}</option> }
          </select>
          <div class="schips" role="group" aria-label="Trạng thái cảnh báo" style="margin:0">
            <button type="button" [class.on]="ttCB() === 'dang'" (click)="ttCB.set('dang')">Đang cảnh báo ({{ demCB().tong }})</button>
            <button type="button" [class.on]="ttCB() === 'xong'" (click)="ttCB.set('xong')">Đã xử lý ({{ soXuLy() }})</button>
          </div>
        </div>

        <div class="tbl-wrap">
          <table class="vt cbt tbl">
            <thead><tr><th style="width:56px">Mức</th><th>Nội dung rủi ro</th><th>Ảnh hưởng</th><th>Hồ sơ liên quan</th><th>Người theo dõi</th><th>Trạng thái</th><th style="width:44px"></th></tr></thead>
            @for (g of nhomCB(); track g.muc) {
              <tbody>
                <tr class="cbg" [class]="'cbg ' + g.muc.toLowerCase()"><td colspan="7"><i class="dot"></i><b>{{ g.muc }} · {{ MUC_CB_TEN[g.muc] }}</b> <span>{{ g.ds.length }} cảnh báo</span></td></tr>
                @for (r of g.ds; track r.key) {
                  <tr class="cbr" [class]="'cbr ' + r.muc.toLowerCase()" (click)="moCB(r)">
                    <td><span class="cbm" [class]="'cbm ' + r.muc.toLowerCase()">{{ r.muc }}</span></td>
                    <td><b>{{ r.noiDung }}</b>@if (r.nhom !== 'Nhập tay') { <small class="cbn">{{ r.nhom }}</small> } @else { <small class="cbn">Nhập tay</small> }</td>
                    <td class="cbah">{{ r.anhHuong }}</td>
                    <td>
                      @if (r.hoSo; as h) { <a class="cbhs" [class]="'cbhs ' + h.mau" [routerLink]="h.link" [queryParams]="h.qp" (click)="$event.stopPropagation()">{{ h.nhan }} ›</a> } @else { <span class="muted">—</span> }
                    </td>
                    <td><span class="cbw"><i [class]="'cbq ' + mauTD(r.theoDoi)"></i>{{ r.theoDoi }}</span></td>
                    <td><span class="cbs" [class.done]="!!r.xongLuc"><i class="dot"></i>{{ r.xongLuc ? 'Đã xử lý' : 'Đang cảnh báo' }}</span></td>
                    <td><span class="cbgo" aria-hidden="true">›</span></td>
                  </tr>
                }
              </tbody>
            } @empty {
              <tbody><tr><td colspan="7" class="empty">{{ ttCB() === 'xong' ? 'Chưa có cảnh báo nào được xử lý.' : 'Không có cảnh báo nào.' }}</td></tr></tbody>
            }
          </table>
        </div>
        <div class="legend">
          <span><b>Nguyên tắc đánh mức:</b> @for (m of MUC_CB; track m) { <b>{{ m }}</b> {{ MUC_CB_MOTA[m] }}{{ $last ? '.' : '; ' }} }</span>
          <span><b>Nhóm cảnh báo hệ thống tự động thiết lập:</b></span>
          @for (n of NHOM_RR; track n.ten) { <span>· <b>{{ n.ten }}</b>: {{ n.dieuKien }}</span> }
          <span>Cảnh báo tự động biến mất khi hết điều kiện; cảnh báo nhập tay (Báo rủi ro) chuyển sang "Đã xử lý" khi đánh dấu hoàn thành.</span>
        </div>
      </section>
    } @else {
    @if (soUuTien() || soTre()) {
      <div class="banner">★ <span>{{ soUuTien() }} việc ưu tiên chưa hoàn thành · {{ soTre() }} việc trễ hạn</span></div>
    }

    <section class="pn">
      <div class="schips" role="group" aria-label="Lọc theo trạng thái">
        <button type="button" [class.on]="!tt() && !chiTre()" (click)="chonTT('')">Tất cả ({{ dem()['tat'] }})</button>
        @for (t of DS_TT; track t) {
          <button type="button" [class.on]="tt() === t" (click)="chonTT(t)">{{ t }} ({{ dem()[t] }})</button>
        }
        <button type="button" class="flag" [class.on]="chiTre()" (click)="chiTre.set(!chiTre())">⊘ Trễ hạn ({{ soTre() }})</button>
      </div>

      <div class="vfil">
        <label class="sr-in"><app-icon name="search" [size]="16" /><input type="search" placeholder="Tìm công việc, mã nguồn, người…" aria-label="Tìm việc" [value]="q()" (input)="q.set($any($event.target).value)" /></label>
        <select aria-label="Nguồn" (change)="fNguon.set($any($event.target).value)">
          <option value="" [selected]="!fNguon()">Nguồn: Tất cả</option>
          <option value="HDB" [selected]="fNguon() === 'HDB'">HĐ bán</option>
          <option value="HDM" [selected]="fNguon() === 'HDM'">HĐ mua</option>
          <option value="NOI_BO" [selected]="fNguon() === 'NOI_BO'">Nội bộ</option>
        </select>
        <select aria-label="Phạm vi" (change)="phamVi.set($any($event.target).value)">
          <option value="tatCa" [selected]="phamVi() === 'tatCa'">Toàn công ty</option>
          <option value="toi" [selected]="phamVi() === 'toi'">Việc của tôi</option>
          <option value="toiGiao" [selected]="phamVi() === 'toiGiao'">Tôi đã giao</option>
        </select>
        <select aria-label="Nhóm" (change)="fNhom.set($any($event.target).value)">
          <option value="" [selected]="!fNhom()">Nhóm: Tất cả</option>
          @for (n of NHOM; track n) { <option [value]="n" [selected]="fNhom() === n">{{ n }}</option> }
        </select>
        <select aria-label="Ưu tiên" (change)="fMuc.set($any($event.target).value)">
          <option value="" [selected]="!fMuc()">Ưu tiên: Tất cả</option>
          @for (m of MUC; track m) { <option [value]="m" [selected]="fMuc() === m">{{ m }}</option> }
        </select>
      </div>

      <div class="tbl-wrap">
        <table class="vt tbl">
          <thead><tr><th>#</th><th>Công việc</th><th>Mã nguồn</th><th>Nhóm</th><th>Phụ trách</th><th>Bắt đầu</th><th>Hạn</th><th style="text-align:center">Số ngày</th><th>Trạng thái</th><th>Cờ tự động</th><th>Ưu tiên</th></tr></thead>
          <tbody>
            @for (r of rows(); track r.v.id; let i = $index) {
              <tr [class.cao]="r.sao && !r.v.xongLuc" [class.xong]="!!r.v.xongLuc" (click)="moXem(r.v.id)">
                <td>{{ i + 1 }}</td>
                <td>
                  @if (r.sao) { <span class="star" title="Ưu tiên">★</span> }<b>{{ r.v.noiDung }}</b>
                  @if (r.v.phanHoi.length) { <span class="sub"> · 💬 {{ soPH(r.v) }}</span> }
                </td>
                <td class="ma" [class]="'ma ' + r.mauNguon">
                  <small>{{ r.nguonTen }}</small>
                  @if (r.link) { <a [routerLink]="r.link" (click)="$event.stopPropagation()"><span>{{ r.maNguon }}</span></a> } @else { <span>{{ r.maNguon }}</span> }
                </td>
                <td>{{ r.v.nhom || '—' }}</td>
                <td><span class="who"><span class="av" [style.background]="mau(r.ai)">{{ viet(r.ai) }}</span>{{ store.userName(r.ai) }}</span></td>
                <td>{{ r.v.batDau ? ngayNgan(r.v.batDau) : '—' }}</td>
                <td><b>{{ r.v.han ? ngayNgan(r.v.han) : '—' }}</b></td>
                <td style="text-align:center">{{ r.soNgay ?? '—' }}</td>
                <td><span class="st" [class]="'st ' + r.tt.cls">{{ r.tt.ten }}</span></td>
                <td>
                  @if (r.tre) { <span class="fl">⊘ Trễ hạn</span> }
                  @if (r.choDuyet) { <span class="fl cd">⏳ Chờ duyệt hạn</span> }
                  @if (!r.tre && !r.choDuyet) { <span class="muted">—</span> }
                </td>
                <td><span class="pr" [class]="'pr ' + r.muc.cls">{{ r.muc.ten }}</span></td>
              </tr>
            } @empty {
              <tr><td colspan="11" class="empty">Không có công việc nào.</td></tr>
            }
          </tbody>
        </table>
      </div>
      <div class="legend">
        <span>★ Việc ưu tiên cao hoặc Giám đốc giao (hiện dấu sao).</span>
        <span>Trễ hạn: hệ thống tự gắn khi quá ngày kết thúc mà việc chưa hoàn thành. Chờ phê duyệt: người nhận đã đề nghị đổi hạn, người giao duyệt trong {{ PHUT }} phút, quá giờ trở về trạng thái cũ.</span>
        <span>{{ rows().length }} / {{ dem()['tat'] }} việc</span>
      </div>
    </section>
    }

    <!-- Chi tiết cảnh báo -->
    <app-modal [open]="!!cbXem()" [title]="cbXem()?.heThong ? 'Cảnh báo hệ thống' : 'Cảnh báo nhập tay'" size="md" (closed)="cbXemKey.set(null)">
      @if (cbXem(); as x) {
        <div class="dt-tags">
          <span class="cbm" [class]="'cbm ' + x.c.muc.toLowerCase()">{{ x.c.muc }} · {{ MUC_CB_TEN[x.c.muc] }}</span>
          <span class="cbs" [class.done]="!!x.c.xongLuc"><i class="dot"></i>{{ x.c.xongLuc ? 'Đã xử lý' : 'Đang cảnh báo' }}</span>
          @if (x.c.nhom !== 'Nhập tay') { <span class="tg">{{ x.c.nhom }}</span> }
          @if (x.c.nhomTheoDoi) { <span class="tg">Theo dõi: {{ x.c.nhomTheoDoi }}</span> }
        </div>
        <h2 style="margin:10px 0 6px">{{ x.c.noiDung }}</h2>
        <div class="note warn"><b>Ảnh hưởng:</b> {{ x.c.anhHuong }}</div>
        <div class="dt-grid">
          <div class="dt-card">
            <small>Nguồn</small>
            @if (x.heThong) { <b>Hệ thống tự phát hiện</b><em>tính lại từ dữ liệu mỗi lần xem</em> }
            @else { <b>{{ store.userName(x.c.nguoiTao) }}</b><em>{{ viMoment(x.c.taoLuc ?? '') }}</em> }
          </div>
          <div class="dt-card">
            <small>Hồ sơ liên quan</small>
            @if (x.c.hoSo; as h) { <a [routerLink]="h.link" [queryParams]="h.qp" (click)="cbXemKey.set(null)"><b>{{ h.nhan }} ›</b></a> } @else { <b>Không gắn hồ sơ</b> }
          </div>
        </div>
        @if (x.duocXuLy) {
          <div class="field">
            <label for="cb-pt">Người phụ trách xử lý</label>
            <select id="cb-pt" (change)="giaoCB($any($event.target).value)">
              <option value="" [selected]="!x.c.nguoiPhuTrach">— Chưa giao ({{ x.c.nhomTheoDoi || 'nhóm phụ trách' }} theo dõi) —</option>
              @for (t of phuTrachOpts(); track t.id) { <option [value]="t.id" [selected]="x.c.nguoiPhuTrach === t.id">{{ t.hoTen }}</option> }
            </select>
          </div>
        } @else if (x.c.nguoiPhuTrach) {
          <div class="note">Người phụ trách: <b>{{ store.userName(x.c.nguoiPhuTrach) }}</b></div>
        }
        @if (x.c.xongLuc) {
          <div class="note ok">✓ Đã xử lý {{ viMoment(x.c.xongLuc) }} bởi {{ store.userName(x.c.nguoiXuLy) }}@if (x.c.ghiChuXuLy) { — {{ x.c.ghiChuXuLy }} }</div>
        } @else if (x.duocXuLy) {
          <div class="field"><label for="cb-gc">Ghi chú xử lý (tuỳ chọn)</label><textarea id="cb-gc" rows="2" placeholder="VD đã nhắc khách, hẹn thanh toán 30/10" [value]="ghiChuXL()" (input)="ghiChuXL.set($any($event.target).value)"></textarea></div>
        }
        @if (x.c.lichSu?.length) {
          <details class="wide">
            <summary class="lbl">Lịch sử ({{ x.c.lichSu!.length }})</summary>
            <ol class="lich-su">
              @for (l of x.c.lichSu!; track $index) {
                <li><time>{{ viMoment(l.luc) }}</time><span><b>{{ l.hanhDong }}</b> · {{ store.userName(l.nguoi) }}@if (l.ghiChu) { — {{ l.ghiChu }} }</span></li>
              }
            </ol>
          </details>
        }
        @if (x.heThong) { <p class="sub" style="margin-top:8px">Cảnh báo tự hết khi điều kiện không còn. Đã xử lý mà mức rủi ro đổi thì cảnh báo hiện lại.</p> }
      }
      <div foot class="btn-row">
        @if (cbXem(); as x) {
          @if (x.duocXuLy) { <button type="button" class="btn" (click)="xuLyCB(!x.c.xongLuc)">{{ x.c.xongLuc ? '↺ Mở lại cảnh báo' : '✓ Đánh dấu đã xử lý' }}</button> }
        }
        <button type="button" class="btn quiet" (click)="cbXemKey.set(null)">Đóng</button>
      </div>
    </app-modal>

    <!-- Báo rủi ro (cảnh báo nhập tay) -->
    <app-modal [open]="!!rr()" title="Báo rủi ro" sub="Rủi ro bạn phát hiện mà hệ thống chưa tự cảnh báo" size="md" [dirty]="dirtyRR()" (closed)="rr.set(null)">
      @if (rr(); as r) {
        <div class="vg">
          <div class="field s12">
            <label for="rr-nd">Nội dung rủi ro <span class="req">*</span></label>
            <textarea id="rr-nd" rows="2" placeholder="VD nhà cung cấp báo lô 3 về trễ 5 ngày" [value]="r.noiDung" (input)="setRR({ noiDung: $any($event.target).value })"></textarea>
          </div>
          <div class="field s12">
            <span class="lbl">Mức cảnh báo <span class="req">*</span></span>
            <div class="rr-muc" role="radiogroup" aria-label="Mức cảnh báo">
              @for (m of MUC_CB; track m) {
                <button type="button" role="radio" [attr.aria-checked]="r.muc === m" [class]="'rr-m ' + m.toLowerCase()" [class.on]="r.muc === m" (click)="setRR({ muc: m })">
                  <b>{{ m }} · {{ MUC_CB_TEN[m] }}</b><small>{{ MUC_CB_MOTA[m] }}</small>
                </button>
              }
            </div>
          </div>
          <div class="field s12">
            <label for="rr-ah">Ảnh hưởng <span class="req">*</span></label>
            <textarea id="rr-ah" rows="2" placeholder="VD ảnh hưởng lịch giao lô 3 cho khách" [value]="r.anhHuong" (input)="setRR({ anhHuong: $any($event.target).value })"></textarea>
          </div>
          <div class="field s6">
            <label for="rr-td">Người theo dõi</label>
            <select id="rr-td" (change)="setRR({ nhom: $any($event.target).value })">
              <option value="" [selected]="!r.nhom">— Chọn nhóm —</option>
              @for (n of NHOM; track n) { <option [value]="n" [selected]="r.nhom === n">{{ n }}</option> }
            </select>
          </div>
          <div class="field s6">
            <label for="rr-ng">Hồ sơ liên quan</label>
            <select id="rr-ng" (change)="setRR({ nguonLoai: $any($event.target).value, hdbId: '', hdmId: '' })">
              <option value="NOI_BO" [selected]="r.nguonLoai === 'NOI_BO'">Không gắn hồ sơ</option>
              <option value="HDB" [selected]="r.nguonLoai === 'HDB'">Hợp đồng bán</option>
              <option value="HDM" [selected]="r.nguonLoai === 'HDM'">Hợp đồng mua</option>
            </select>
          </div>
          @if (r.nguonLoai === 'HDB') {
            <div class="field s12"><app-pick-go inputId="rr-hdb" [options]="hdbOpts()" [value]="r.hdbId" placeholder="Gõ số HĐ hoặc khách rồi chọn…" (valueChange)="setRR({ hdbId: $event })" /></div>
          }
          @if (r.nguonLoai === 'HDM') {
            <div class="field s12"><app-pick-go inputId="rr-hdm" [options]="hdmOpts()" [value]="r.hdmId" placeholder="Gõ số HĐ hoặc NCC rồi chọn…" (valueChange)="setRR({ hdmId: $event })" /></div>
          }
        </div>
        @if (err()) { <div class="note bad">{{ err() }}</div> }
      }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="rr.set(null)">Huỷ</button>
        <button type="button" class="btn" (click)="guiRR()">⚠ Báo rủi ro</button>
      </div>
    </app-modal>

    <!-- Giao việc / Đặt lịch -->
    <app-modal #mSoan [open]="!!soan()" title="Giao việc / Đặt lịch" sub="Không chọn người nhận = việc của mình" size="md" [dirty]="dirty()" (closed)="soan.set(null)">
      @if (soan(); as s) {
        <div class="vg">
          <div class="field s12">
            <label for="vg-nd">Nội dung <span class="req">*</span></label>
            <textarea id="vg-nd" rows="3" placeholder="VD gọi lại khách xác nhận lịch giao bình NO 8L" [value]="s.noiDung" (input)="set({ noiDung: $any($event.target).value })"></textarea>
          </div>

          <div class="vg-sec s12">Phân loại</div>
          <div class="field s4">
            <label for="vg-nhom">Nhóm việc</label>
            <select id="vg-nhom" (change)="set({ nhom: $any($event.target).value })">
              <option value="" [selected]="!s.nhom">— Chọn nhóm —</option>
              @for (n of NHOM; track n) { <option [value]="n" [selected]="s.nhom === n">{{ n }}</option> }
            </select>
          </div>
          <div class="field s4">
            <label for="vg-muc">Thứ tự ưu tiên</label>
            <select id="vg-muc" (change)="set({ mucUuTien: $any($event.target).value })">
              @for (m of MUC; track m) { <option [value]="m" [selected]="s.mucUuTien === m">{{ m }}</option> }
            </select>
          </div>
          <div class="field s4">
            <label for="vg-ng">Nguồn công việc</label>
            <select id="vg-ng" (change)="set({ nguonLoai: $any($event.target).value, hdbId: '', hdmId: '' })">
              <option value="NOI_BO" [selected]="s.nguonLoai === 'NOI_BO'">Việc nội bộ khác</option>
              <option value="HDB" [selected]="s.nguonLoai === 'HDB'">Hợp đồng bán</option>
              <option value="HDM" [selected]="s.nguonLoai === 'HDM'">Hợp đồng mua</option>
            </select>
          </div>
          @if (s.nguonLoai === 'HDB') {
            <div class="field s12">
              <span class="lbl">Hợp đồng bán <span class="req">*</span></span>
              <app-pick-go inputId="vg-hdb" [options]="hdbOpts()" [value]="s.hdbId" placeholder="Gõ số HĐ hoặc khách rồi chọn…" (valueChange)="set({ hdbId: $event })" />
            </div>
          }
          @if (s.nguonLoai === 'HDM') {
            <div class="field s12">
              <span class="lbl">Hợp đồng mua <span class="req">*</span></span>
              <app-pick-go inputId="vg-hdm" [options]="hdmOpts()" [value]="s.hdmId" placeholder="Gõ số HĐ hoặc NCC rồi chọn…" (valueChange)="set({ hdmId: $event })" />
            </div>
          }

          <div class="vg-sec s12">Người nhận</div>
          <div class="field s12">
            <app-pick-go inputId="vg-nn" [options]="nguoiOpts()" value="" placeholder="Gõ tên để thêm người nhận…" (valueChange)="themNhan($event)" />
            <div class="chips">
              @for (id of s.nguoiNhan; track id) { <span class="tag info">👤 {{ store.userName(id) }} <button type="button" class="linkish" aria-label="Bỏ" (click)="boNhan(id)">✕</button></span> }
              @empty { <span class="sub">👤 Việc của tôi</span> }
            </div>
          </div>

          <div class="vg-sec s12">Thời gian</div>
          <div class="field s3"><label for="vg-bd">Ngày bắt đầu</label><input id="vg-bd" type="date" [value]="s.batDau" (input)="set({ batDau: $any($event.target).value })" /></div>
          <div class="field s3"><label for="vg-han">Ngày kết thúc</label><input id="vg-han" type="date" [value]="s.han" (input)="set({ han: $any($event.target).value })" /></div>
          <div class="field s3"><label for="vg-gio">Giờ</label><input id="vg-gio" type="time" [value]="s.gio" (input)="set({ gio: $any($event.target).value })" /></div>
          <div class="field s3"><span class="lbl">Số ngày</span><span class="vg-days">{{ soNgaySoan() ?? '—' }}</span></div>
          <div class="field s12">
            <div class="quick">
              @for (n of hanNhanh; track n.t) { <button type="button" class="btn sm quiet" (click)="hanNhanhChon(n.ngay, n.gio)">{{ n.t }}</button> }
            </div>
          </div>
          <div class="vg-sec s12">Tệp đính kèm</div>
          <div class="field s12"><app-tep-dinh-kem [files]="s.files" (filesChange)="set({ files: $event })" [edit]="true" nhan="" /></div>
        </div>
        @if (err()) { <div class="note bad">{{ err() }}</div> }
      }
      <div foot class="btn-row">
        <button type="button" class="btn quiet" (click)="soan.set(null)">Huỷ</button>
        <button type="button" class="btn" (click)="guiViec()">📌 {{ soan()?.nguoiNhan?.length ? 'Giao việc' : 'Đặt lịch' }}</button>
      </div>
    </app-modal>

    <!-- Chi tiết việc + đổi hạn + trao đổi -->
    <app-modal [open]="!!chon()" [title]="(chon()?.xongLuc ? '✓ ' : '') + (chon()?.ma ?? 'Công việc')" size="lg" (closed)="dong()">
      @if (chon(); as v) {
        <div class="dt-hero" [class]="'dt-hero ' + mucCls(v)">
          <div class="dt-tags">
            <span class="st" [class]="'st ' + ttOf(v).cls"><i class="dot"></i>{{ ttOf(v).ten }}</span>
            <span class="pr" [class]="'pr ' + mucCls(v)">{{ v.mucUuTien === 'Cao' ? '▲' : v.mucUuTien === 'Thấp' ? '▼' : '●' }} {{ v.mucUuTien || 'Trung bình' }}</span>
            @if (v.nhom) { <span class="tg">{{ v.nhom }}</span> }
            @if (v.uuTien) { <span class="tg gd">Giám đốc giao</span> }
            @if (!v.xongLuc && v.han && v.han < hom) { <span class="fl">⊘ Trễ hạn {{ -dayOf(v) }} ngày</span> }
          </div>
          <h2>@if (sao(v)) { <span class="star">★</span> }{{ v.noiDung }}</h2>
        </div>

        <div class="dt-grid">
          <div class="dt-card">
            <small>Người giao</small>
            <span class="who"><span class="av" [style.background]="mau(v.nguoiTao)">{{ viet(v.nguoiTao) }}</span><b>{{ store.userName(v.nguoiTao) }}</b></span>
            <em>{{ viMoment(v.taoLuc) }}</em>
          </div>
          <div class="dt-card">
            <small>Người nhận</small>
            @for (id of nhanIds(v); track id) {
              <span class="who"><span class="av" [style.background]="mau(id)">{{ viet(id) }}</span><b>{{ store.userName(id) }}</b></span>
            }
            @if (!v.nguoiNhan.length) { <em>Việc tự đặt lịch</em> }
          </div>
          <div class="dt-card">
            <small>Thời gian</small>
            <b>{{ viDate(batDauOf(v)) }} → {{ viDate(v.han) }}@if (v.gio) { <span class="sub"> {{ v.gio }}</span> }</b>
            <em>
              @if (soNgay({ batDau: batDauOf(v), han: v.han }); as n) { {{ n }} ngày }
              @if (!v.xongLuc && v.han) { · <span [class.neg]="dayOf(v) < 0">{{ conNgayText(v) }}</span> }
            </em>
          </div>
          <div class="dt-card">
            <small>Nguồn công việc</small>
            @if (linkNguon(v); as l) {
              <a [routerLink]="l" (click)="dong()"><b>{{ nguonTen(v) }} · {{ maNguon(v) }}</b></a>
            } @else { <b>Việc nội bộ</b> }
            <em>{{ v.ma ?? '' }}</em>
          </div>
        </div>
        @if (v.xongLuc) { <div class="note ok">✓ Hoàn thành {{ viMoment(v.xongLuc) }} bởi {{ store.userName(v.nguoiXong) }}</div> }

        @if (v.files?.length) {
          <div class="dt-sec">Tệp đính kèm · {{ v.files!.length }}</div>
          <app-tep-dinh-kem [files]="v.files!" [edit]="false" nhan="" />
        }

        @if (v.yeuCauHan; as y) {
          @if (conHan(v)) {
            <div class="ycp">
              <div class="ycp-h">
                <span class="ycp-t">⏳ Yêu cầu đổi hạn chờ duyệt</span>
                <span class="ycp-c" [class.gap]="conLaiPhut(v) <= 10">còn {{ conLaiPhut(v) }} phút</span>
              </div>
              <div class="ycp-bar" aria-hidden="true"><i [style.width.%]="phanTramHan(v)"></i></div>

              <div class="ycp-cmp">
                <div class="ycp-d">
                  <small>Hạn hiện tại</small>
                  <b>{{ viDate(v.han) }}</b>
                  <span>{{ v.gio || 'cả ngày' }}</span>
                </div>
                <span class="ycp-ar">
                  <app-icon name="chevron" [size]="18" />
                  @if (chenhNgay(v, y.hanMoi); as n) { <em [class.up]="n > 0">{{ n > 0 ? '+' : '' }}{{ n }} ngày</em> }
                </span>
                <div class="ycp-d new">
                  <small>Hạn đề nghị</small>
                  <b>{{ viDate(y.hanMoi) }}</b>
                  <span>{{ y.gioMoi || 'cả ngày' }}</span>
                </div>
              </div>

              <div class="ycp-who">
                <span class="av" [style.background]="mau(y.nguoi)">{{ viet(y.nguoi) }}</span>
                <span><b>{{ store.userName(y.nguoi) }}</b> <span class="sub">· gửi {{ viMoment(y.luc) }}</span></span>
              </div>
              <blockquote class="ycp-ld">{{ y.lyDo }}</blockquote>
              @if (y.files.length) { <app-tep-dinh-kem [files]="y.files" [edit]="false" nhan="Tệp minh chứng" /> }

              <div class="ycp-f">
                @if (v.nguoiTao === store.meId()) {
                  <span class="sub">Quá giờ không duyệt, việc về hạn và trạng thái cũ.</span>
                  <div class="btn-row">
                    <button type="button" class="btn danger" (click)="duyet(v, false)">Từ chối</button>
                    <button type="button" class="btn" (click)="duyet(v, true)">✓ Duyệt đổi hạn</button>
                  </div>
                } @else {
                  <span class="sub">Đang chờ {{ store.userName(v.nguoiTao) }} duyệt. Quá giờ không duyệt, việc về hạn và trạng thái cũ.</span>
                }
              </div>
            </div>
          } @else {
            <details class="yc-old">
              <summary>
                <span class="yc-b" [class]="'yc-b ' + (y.trangThai === 'Đã duyệt' ? 'ok' : y.trangThai === 'Từ chối' ? 'bad' : 'mute')">{{ y.trangThai === 'Chờ duyệt' ? 'Hết hạn duyệt' : y.trangThai }}</span>
                <span class="yc-s">Đề nghị đổi hạn sang <b>{{ viDate(y.hanMoi) }}</b> — {{ y.lyDo }}</span>
                <app-icon name="chevron" [size]="14" />
              </summary>
              <div class="yc-d">
                <span>{{ store.userName(y.nguoi) }} · gửi {{ viMoment(y.luc) }}{{ y.gioMoi ? ' · giờ ' + y.gioMoi : '' }}</span>
                <span class="yc-ld">Lý do: {{ y.lyDo }}</span>
                @if (y.trangThai === 'Chờ duyệt') { <span class="sub">Quá 1 giờ không được duyệt nên hạn giữ nguyên.</span> }
                @if (y.files.length) { <app-tep-dinh-kem [files]="y.files" [edit]="false" nhan="" /> }
              </div>
            </details>
          }
        }

        @if (duocDoiHan(v)) {
          @if (!yc()) {
            <button type="button" class="btn sm quiet" (click)="moYc(v)">🗓 Đề nghị đổi hạn</button>
          } @else {
            <div class="ycf">
              <div class="ycf-h">
                <span class="ycf-ic">🗓</span>
                <div><b>Đề nghị đổi hạn</b><span class="sub">Người giao duyệt trong {{ PHUT }} phút, quá giờ hạn giữ nguyên</span></div>
              </div>
              <div class="ycf-now">Hạn hiện tại <b>{{ viDate(v.han) }}{{ v.gio ? ' ' + v.gio : '' }}</b> <span>→</span> hạn mới <b class="new">{{ viDate(yc()!.han) }}{{ yc()!.gio ? ' ' + yc()!.gio : '' }}</b></div>
              <div class="ycf-grid">
                <div class="field"><label for="yc-han">Hạn mới <span class="req">*</span></label><input id="yc-han" type="date" [value]="yc()!.han" (input)="setYc({ han: $any($event.target).value })" /></div>
                <div class="field"><label for="yc-gio">Giờ</label><input id="yc-gio" type="time" [value]="yc()!.gio" (input)="setYc({ gio: $any($event.target).value })" /></div>
                <div class="field ycf-q">
                  <span class="lbl">Dời thêm</span>
                  <div class="ycf-qb">
                    @for (n of [1, 2, 3, 7]; track n) { <button type="button" class="btn sm quiet" (click)="doiThem(v, n)">+{{ n }} ngày</button> }
                  </div>
                </div>
              </div>
              <div class="field"><label for="yc-ld">Lý do <span class="req">*</span></label><textarea id="yc-ld" rows="3" placeholder="VD chờ khách bổ sung chứng từ, cần thêm thời gian kiểm định…" [value]="yc()!.lyDo" (input)="setYc({ lyDo: $any($event.target).value })"></textarea></div>
              <app-tep-dinh-kem class="ycf-tep" [files]="yc()!.files" (filesChange)="setYc({ files: $event })" [edit]="true" nhan="Tệp minh chứng (tuỳ chọn)" />
              <div class="ycf-f">
                <button type="button" class="btn quiet" (click)="yc.set(null)">Huỷ</button>
                <button type="button" class="btn" [disabled]="!yc()!.lyDo.trim() || !yc()!.han" (click)="guiYc(v)">Gửi đề nghị</button>
              </div>
            </div>
          }
        }

        <button type="button" class="td-toggle" [class.on]="moTD()" [attr.aria-expanded]="moTD()" (click)="moTD.set(!moTD())">
          <span class="td-ti">💬 Trao đổi</span>
          <span class="td-cnt">{{ soPH(v) }} tin nhắn · {{ v.phanHoi.length - soPH(v) }} hoạt động</span>
          <app-icon name="chevron" [size]="16" />
        </button>
        @if (moTD()) {
          <div class="td-body">
            <div class="td-list" #dsTin>
              @for (it of chatItems(v); track $index) {
                @switch (it.k) {
                  @case ('day') { <div class="mc-day">{{ it.text }}</div> }
                  @case ('ev') { <div class="mc-ev" [attr.title]="it.time"><b>{{ it.ten }}</b> {{ it.text }}<time>{{ it.gio }}</time></div> }
                  @default {
                    <div class="mc-row" [class.me]="it.me">
                      <span class="mc-av">@if (it.last && !it.me) { <span class="av" [style.background]="mau(it.id!)">{{ viet(it.id!) }}</span> }</span>
                      <div class="mc-col">
                        @if (it.first && !it.me) { <span class="mc-name">{{ it.ten }}</span> }
                        <div class="mc-b" [class]="'mc-b ' + it.pos" [attr.title]="it.time">{{ it.text }}</div>
                        @if (it.last) { <time class="mc-time">{{ it.gio }}</time> }
                      </div>
                    </div>
                  }
                }
              } @empty { <p class="sub" style="text-align:center;margin:8px 0">Chưa có trao đổi. Hãy gửi tin nhắn đầu tiên.</p> }
            </div>
            @if (v.xongLuc) {
              <p class="td-lock">🔒 Việc đã hoàn thành — mở lại việc để tiếp tục trao đổi.</p>
            } @else if (store.lienQuanViec(v)) {
              <div class="composer">
                <textarea rows="1" placeholder="Aa — viết phản hồi…" aria-label="Phản hồi" [value]="ph()" (input)="ph.set($any($event.target).value)" (keydown.enter)="enterGui($event)"></textarea>
                <button type="button" class="send" aria-label="Gửi" [disabled]="!ph().trim()" (click)="gui()"><app-icon name="send" [size]="18" /></button>
              </div>
            }
          </div>
        }
      }
      <div foot class="btn-row">
        @if (chon(); as v) {
          @if (store.lienQuanViec(v)) {
            <button type="button" class="btn" (click)="doiXong(v)">{{ v.xongLuc ? '↺ Mở lại việc' : '✓ Đánh dấu đã hoàn thành' }}</button>
          }
        }
        <button type="button" class="btn quiet" (click)="dong()">Đóng</button>
      </div>
    </app-modal>
  `,
})
export class ViecPage {
  private readonly mSoan = viewChild<Modal>('mSoan');
  protected readonly store = inject(Store);
  private readonly router = inject(Router);
  protected readonly viDate = viDate;
  protected readonly viMoment = viMoment;
  protected readonly NHOM = NHOM_VIEC;
  protected readonly MUC = MUC_UU_TIEN;
  protected readonly PHUT = PHUT_DUYET_HAN;
  protected readonly DS_TT: TrangThaiViec[] = ['Chưa bắt đầu', 'Đang làm', 'Chờ phê duyệt', 'Hoàn thành'];
  protected readonly MUC_CB = MUC_CANH_BAO;
  protected readonly MUC_CB_TEN = MUC_CANH_BAO_TEN;
  protected readonly MUC_CB_MOTA = MUC_CANH_BAO_MOTA;
  protected readonly MUC_CB_NGAN = MUC_CB_NGAN;
  protected readonly NHOM_RR = NHOM_RUI_RO;
  protected readonly capNhat = `${viDate(todayIso())} ${nowIso().slice(11, 16)}`;

  // ── Tab Cảnh báo ──
  protected readonly tab = signal<'viec' | 'canhbao'>('viec');
  protected readonly qCB = signal('');
  protected readonly fTheoDoi = signal('');
  protected readonly fMucCB = signal<MucCanhBao | ''>('');
  protected readonly ttCB = signal<'dang' | 'xong'>('dang');

  /** Bản ghi bảng cảnh báo → dòng hiển thị (nhập tay, hoặc vết xử lý đã có). */
  private vm(c: CanhBaoTay): CanhBao {
    const hdb = this.store.hdbById(c.hdbId);
    const hdm = c.hdmId ? this.store.db().hopDongMua.find((m) => m.id === c.hdmId) : undefined;
    return {
      key: c.nguon === 'HE_THONG' ? c.khoaHeThong! : c.id,
      muc: c.muc,
      nhom: 'Nhập tay',
      noiDung: c.noiDung,
      anhHuong: c.anhHuong,
      hoSo: hdb
        ? { nhan: hdb.soHD || '(báo giá)', link: ['/hop-dong-ban', hdb.id], mau: 'hdb' }
        : hdm
          ? { nhan: hdm.soHD || '(chưa số)', link: ['/hop-dong-mua', hdm.id], mau: 'hdm' }
          : undefined,
      theoDoi: c.nguoiPhuTrach ? this.store.userName(c.nguoiPhuTrach) : (c.theoDoi ?? this.store.userName(c.nguoiTao)),
      nhomTheoDoi: c.theoDoi,
      nguoiPhuTrach: c.nguoiPhuTrach,
      nguoiTao: c.nguoiTao,
      nguoiXuLy: c.nguoiXuLy,
      ghiChuXuLy: c.ghiChuXuLy,
      lichSu: c.lichSu,
      tayId: c.id,
      xongLuc: c.xuLyLuc,
      taoLuc: c.taoLuc,
    };
  }
  /** Vết xử lý của cảnh báo hệ thống, theo khoá. */
  private readonly vetHT = computed(() => new Map(this.store.canhBaoTay().filter((c) => c.nguon === 'HE_THONG' && c.khoaHeThong).map((c) => [c.khoaHeThong!, c])));
  /**
   * Cảnh báo hệ thống đang phát hiện, gắn vết xử lý nếu có. Đã xử lý ở đúng mức hiện tại → ẩn khỏi "Đang cảnh báo"
   * (nằm ở "Đã xử lý"); mức đổi so với lúc xử lý → hiện lại.
   */
  private readonly cbTuDong = computed(() =>
    tinhCanhBaoTuDong(this.store).map((a): CanhBao => {
      const r = this.vetHT().get(a.key);
      if (!r) return { ...a, nhomTheoDoi: a.theoDoi as NhomViec };
      const daXuLy = !!r.xuLyLuc && r.muc === a.muc;
      return {
        ...a,
        nhomTheoDoi: a.theoDoi as NhomViec,
        theoDoi: r.nguoiPhuTrach ? this.store.userName(r.nguoiPhuTrach) : a.theoDoi,
        nguoiPhuTrach: r.nguoiPhuTrach,
        lichSu: r.lichSu,
        tayId: r.id,
        xongLuc: daXuLy ? r.xuLyLuc : undefined,
      };
    }),
  );
  private readonly cbDang = computed(() =>
    [...this.cbTuDong().filter((c) => !c.xongLuc), ...this.store.canhBaoTay().filter((c) => c.nguon === 'TAY' && !c.xuLyLuc).map((c) => this.vm(c))].sort(soSanhCanhBao),
  );
  /** Đã xử lý: mọi bản ghi có xuLyLuc (nhập tay và vết xử lý hệ thống), mới xử lý trước. */
  private readonly cbXong = computed(() =>
    this.store
      .canhBaoTay()
      .filter((c) => !!c.xuLyLuc)
      .sort((a, b) => b.xuLyLuc!.localeCompare(a.xuLyLuc!))
      .map((c) => this.vm(c)),
  );
  protected readonly soXuLy = computed(() => this.cbXong().length);
  protected readonly demCB = computed(() => {
    const d = { tong: this.cbDang().length, P0: 0, P1: 0, P2: 0 };
    for (const c of this.cbDang()) d[c.muc]++;
    return d;
  });
  protected readonly dsTheoDoi = computed(() => [...new Set([...this.cbDang(), ...this.cbXong()].map((c) => c.theoDoi))].sort((a, b) => a.localeCompare(b, 'vi')));
  /** Danh sách theo bộ lọc, gom theo mức P0 → P1 → P2 (mức không có cảnh báo thì ẩn). */
  protected readonly nhomCB = computed(() => {
    const q = this.qCB().trim().toLowerCase();
    const td = this.fTheoDoi();
    const mu = this.fMucCB();
    const ds = (this.ttCB() === 'xong' ? this.cbXong() : this.cbDang())
      .filter((c) => !td || c.theoDoi === td)
      .filter((c) => !mu || c.muc === mu)
      .filter((c) => !q || `${c.noiDung} ${c.anhHuong} ${c.hoSo?.nhan ?? ''} ${c.theoDoi} ${c.nhom}`.toLowerCase().includes(q));
    return MUC_CANH_BAO.map((muc) => ({ muc, ds: ds.filter((c) => c.muc === muc) })).filter((g) => g.ds.length);
  });
  protected mauTD(ten: string): string {
    let h = 0;
    for (const c of ten) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return `m${h % 5}`;
  }
  protected moCB(c: CanhBao): void {
    this.ghiChuXL.set('');
    this.cbXemKey.set(c.key);
  }

  // ── Chi tiết cảnh báo (nhập tay hoặc hệ thống): giao người, xử lý, lịch sử ──
  protected readonly cbXemKey = signal<string | null>(null);
  protected readonly ghiChuXL = signal('');
  protected readonly cbXem = computed(() => {
    const k = this.cbXemKey();
    const c = k ? ([...this.cbDang(), ...this.cbXong(), ...this.cbTuDong()].find((x) => x.key === k) ?? null) : null;
    if (!c) return null;
    const heThong = c.nhom !== 'Nhập tay';
    return { c, heThong, duocXuLy: this.store.coTheXuLyCanhBao({ nguon: heThong ? 'HE_THONG' : 'TAY', nguoiTao: c.nguoiTao ?? '' }) };
  });
  protected readonly phuTrachOpts = computed(() => this.store.taiKhoan().filter((t) => t.trangThai === TT.HOAT_DONG));
  /** Ảnh chụp cảnh báo hệ thống gửi kèm khi tạo vết xử lý. */
  private snap(c: CanhBao): { khoa: string; muc: MucCanhBao; noiDung: string; anhHuong: string; theoDoi?: NhomViec; hdbId?: string; hdmId?: string } {
    const [goc, id] = c.hoSo?.link ?? [];
    return {
      khoa: c.key,
      muc: c.muc,
      noiDung: c.noiDung,
      anhHuong: c.anhHuong,
      theoDoi: c.nhomTheoDoi,
      hdbId: goc === '/hop-dong-ban' ? id : undefined,
      hdmId: goc === '/hop-dong-mua' ? id : undefined,
    };
  }
  protected giaoCB(nguoi: string): void {
    const x = this.cbXem();
    if (!x) return;
    const e = x.heThong
      ? this.store.xuLyCanhBaoHeThong({ ...this.snap(x.c), nguoiPhuTrach: nguoi, xong: !!x.c.xongLuc })
      : this.store.giaoCanhBao(x.c.tayId!, nguoi);
    this.store.say(e ?? (nguoi ? 'Đã giao người phụ trách' : 'Đã bỏ người phụ trách'));
  }
  protected xuLyCB(xong: boolean): void {
    const x = this.cbXem();
    if (!x) return;
    const e = x.heThong
      ? this.store.xuLyCanhBaoHeThong({ ...this.snap(x.c), nguoiPhuTrach: x.c.nguoiPhuTrach, xong, ghiChu: this.ghiChuXL() })
      : this.store.xuLyCanhBao(x.c.tayId!, xong, this.ghiChuXL());
    this.store.say(e ?? (xong ? 'Đã xử lý cảnh báo' : 'Đã mở lại cảnh báo'));
    if (!e) this.cbXemKey.set(null);
  }

  // ── Báo rủi ro ──
  protected readonly rr = signal<RuiRo | null>(null);
  protected readonly dirtyRR = dirtyOf(this.rr);
  protected moRuiRo(): void {
    this.err.set('');
    this.rr.set({ noiDung: '', muc: 'P1', anhHuong: '', nhom: '', nguonLoai: 'NOI_BO', hdbId: '', hdmId: '' });
  }
  protected setRR(p: Partial<RuiRo>): void {
    this.rr.update((r) => (r ? { ...r, ...p } : r));
  }
  protected guiRR(): void {
    const r = this.rr();
    if (!r) return;
    if (!r.noiDung.trim()) return this.err.set('Nhập nội dung rủi ro');
    if (!r.anhHuong.trim()) return this.err.set('Nhập ảnh hưởng của rủi ro');
    if (r.nguonLoai === 'HDB' && !r.hdbId) return this.err.set('Chọn Hợp đồng bán trong danh sách gợi ý');
    if (r.nguonLoai === 'HDM' && !r.hdmId) return this.err.set('Chọn Hợp đồng mua trong danh sách gợi ý');
    const e = this.store.baoRuiRo({ muc: r.muc, noiDung: r.noiDung, anhHuong: r.anhHuong, theoDoi: r.nhom, hdbId: r.hdbId, hdmId: r.hdmId });
    if (e) return this.err.set(e);
    this.store.say('Đã báo rủi ro');
    this.rr.set(null);
  }

  protected readonly phamVi = signal<PhamVi>('tatCa');
  protected readonly q = signal('');
  protected readonly tt = signal<TrangThaiViec | ''>('');
  protected readonly chiTre = signal(false);
  protected readonly fNguon = signal<NguonViec | ''>('');
  protected readonly fNhom = signal<NhomViec | ''>('');
  protected readonly fMuc = signal<MucUuTien | ''>('');

  /** Đồng hồ cho hạn duyệt 1 giờ: cập nhật mỗi 20 giây. */
  private readonly now = signal(Date.now());

  private readonly cuaPhamVi = computed(() => {
    const me = this.store.meId() ?? '';
    const pv = this.phamVi();
    return this.store.viecVisible().filter((v) =>
      pv === 'tatCa' ? true : pv === 'toiGiao' ? v.nguoiTao === me && v.nguoiNhan.length > 0 : v.nguoiNhan.includes(me) || (v.nguoiTao === me && !v.nguoiNhan.length),
    );
  });

  protected conHan(v: ViecGiao): boolean {
    return ycConHan(v.yeuCauHan, this.now());
  }
  protected conLaiPhut(v: ViecGiao): number {
    const y = v.yeuCauHan;
    return y ? Math.max(0, Math.ceil((new Date(y.luc).getTime() + PHUT_DUYET_HAN * 60_000 - this.now()) / 60_000)) : 0;
  }
  /** Trạng thái: Hoàn thành → Chờ phê duyệt (đang đề nghị đổi hạn trong 1 giờ) → Chưa bắt đầu / Đang làm. Quá giờ duyệt tự về trạng thái cũ. */
  protected ttOf(v: ViecGiao): { ten: TrangThaiViec; cls: string } {
    if (v.xongLuc) return { ten: 'Hoàn thành', cls: 'ht' };
    if (this.conHan(v)) return { ten: 'Chờ phê duyệt', cls: 'cd' };
    if (v.batDau && v.batDau > todayIso()) return { ten: 'Chưa bắt đầu', cls: 'cbd' };
    return { ten: 'Đang làm', cls: 'dl' };
  }
  protected sao(v: ViecGiao): boolean {
    return !!v.uuTien || v.mucUuTien === 'Cao';
  }
  protected soNgay(v: { batDau?: string; han?: string }): number | null {
    if (!v.batDau || !v.han) return null;
    return Math.round((new Date(v.han).getTime() - new Date(v.batDau).getTime()) / 86_400_000) + 1;
  }
  protected nguonTen(v: ViecGiao): string {
    return NGUON_TEN[v.nguonLoai ?? (v.hdbId ? 'HDB' : v.hdmId ? 'HDM' : 'NOI_BO')];
  }
  protected maNguon(v: ViecGiao): string {
    if (v.hdbId) return this.store.hdbById(v.hdbId)?.soHD || '(báo giá)';
    if (v.hdmId) return this.store.db().hopDongMua.find((m) => m.id === v.hdmId)?.soHD || '(chưa số)';
    return v.ma ?? '—';
  }
  protected linkNguon(v: ViecGiao): string[] | null {
    return v.hdbId ? ['/hop-dong-ban', v.hdbId] : v.hdmId ? ['/hop-dong-mua', v.hdmId] : null;
  }

  private readonly all = computed(() =>
    this.cuaPhamVi().map((v) => {
      const tre = !v.xongLuc && !!v.han && v.han < todayIso();
      const loai = v.nguonLoai ?? (v.hdbId ? 'HDB' : v.hdmId ? 'HDM' : 'NOI_BO');
      const muc = v.mucUuTien ?? 'Trung bình';
      return {
        v,
        tre,
        tt: this.ttOf(v),
        choDuyet: this.conHan(v),
        sao: this.sao(v),
        soNgay: this.soNgay(v),
        nguonTen: this.nguonTen(v),
        maNguon: this.maNguon(v),
        link: this.linkNguon(v),
        mauNguon: loai === 'HDM' ? 'hdm' : loai === 'NOI_BO' ? 'nb' : 'hdb',
        ai: v.nguoiNhan[0] ?? v.nguoiTao,
        muc: { ten: muc, cls: muc === 'Cao' ? 'cao' : muc === 'Thấp' ? 'thap' : 'tb' },
      };
    }),
  );
  protected readonly dem = computed(() => {
    const d = { tat: this.all().length, 'Chưa bắt đầu': 0, 'Đang làm': 0, 'Chờ phê duyệt': 0, 'Hoàn thành': 0 } as Record<string, number>;
    for (const r of this.all()) d[r.tt.ten]++;
    return d;
  });
  protected readonly soTre = computed(() => this.all().filter((r) => r.tre).length);
  protected readonly soUuTien = computed(() => this.all().filter((r) => r.sao && !r.v.xongLuc).length);

  /** Chưa xong: sao / ưu tiên trước, rồi theo hạn tăng dần; việc hoàn thành xuống cuối. */
  protected readonly rows = computed(() => {
    const q = this.q().trim().toLowerCase();
    const tt = this.tt();
    const rank = (m: string | undefined) => (m === 'Cao' ? 0 : m === 'Thấp' ? 2 : 1);
    return this.all()
      .filter((r) => !tt || r.tt.ten === tt)
      .filter((r) => !this.chiTre() || r.tre)
      .filter((r) => !this.fNguon() || (r.v.nguonLoai ?? (r.v.hdbId ? 'HDB' : r.v.hdmId ? 'HDM' : 'NOI_BO')) === this.fNguon())
      .filter((r) => !this.fNhom() || r.v.nhom === this.fNhom())
      .filter((r) => !this.fMuc() || (r.v.mucUuTien ?? 'Trung bình') === this.fMuc())
      .filter((r) => !q || `${r.v.noiDung} ${r.maNguon} ${r.v.ma ?? ''} ${r.v.nhom ?? ''} ${this.tenNhan(r.v)} ${this.store.userName(r.v.nguoiTao)}`.toLowerCase().includes(q))
      .sort(
        (a, b) =>
          Number(!!a.v.xongLuc) - Number(!!b.v.xongLuc) ||
          Number(b.sao) - Number(a.sao) ||
          rank(a.v.mucUuTien) - rank(b.v.mucUuTien) ||
          `${a.v.han ?? '9'}${a.v.gio ?? ''}`.localeCompare(`${b.v.han ?? '9'}${b.v.gio ?? ''}`),
      );
  });
  protected chonTT(t: TrangThaiViec | ''): void {
    this.tt.set(t);
    this.chiTre.set(false);
  }

  protected ngayNgan(iso: string): string {
    return viDate(iso).slice(0, 5);
  }
  protected viet(id: string): string {
    const p = this.store.userName(id).replace(/\(.*?\)/g, '').trim().split(/\s+/);
    return (p.length > 1 ? p[0][0] + p[p.length - 1][0] : (p[0]?.slice(0, 2) ?? '?')).toUpperCase();
  }
  protected mau(id: string): string {
    const m = ['#1f6b3a', '#d59a1b', '#7a5bc7', '#c0572b', '#2b7fc0'];
    let h = 0;
    for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
    return m[h % m.length];
  }

  // ── Soạn việc ──
  protected readonly soan = signal<Soan | null>(null);
  protected readonly dirty = dirtyOf(this.soan);
  protected readonly err = signal('');
  protected readonly soNgaySoan = computed(() => {
    const s = this.soan();
    return s ? this.soNgay(s) : null;
  });
  protected readonly nguoiOpts = computed<PickOption[]>(() =>
    this.store
      .taiKhoan()
      .filter((t) => t.trangThai === TT.HOAT_DONG && t.id !== this.store.meId() && !this.soan()?.nguoiNhan.includes(t.id))
      .map((t) => ({ value: t.id, label: t.hoTen, hint: t.email })),
  );
  protected readonly hdbOpts = computed<PickOption[]>(() =>
    this.store
      .hdbVisible()
      .filter((h) => h.trangThai !== TT.DA_TAT_TOAN)
      .map((h) => ({ value: h.id, label: h.soHD || '(báo giá)', hint: `${h.tenKH} · ${this.store.userName(h.sale)}` })),
  );
  protected readonly hdmOpts = computed<PickOption[]>(() =>
    this.store
      .hdmVisible()
      .filter((m) => m.trangThai !== TT.HUY)
      .map((m) => ({ value: m.id, label: m.soHD || '(chưa số)', hint: m.tenNCC })),
  );
  protected readonly hanNhanh = (() => {
    const t = todayIso();
    const cong = (n: number) => {
      const d = new Date(`${t}T00:00:00`);
      d.setDate(d.getDate() + n);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };
    const thu = new Date(`${t}T00:00:00`).getDay();
    return [
      { t: 'Hôm nay 17:00', ngay: t, gio: '17:00' },
      { t: 'Sáng mai 08:00', ngay: cong(1), gio: '08:00' },
      { t: 'Chiều mai 14:00', ngay: cong(1), gio: '14:00' },
      { t: 'Thứ Sáu tuần này', ngay: cong((5 - thu + 7) % 7), gio: '17:00' },
      { t: 'Thứ Hai tuần sau', ngay: cong((8 - thu) % 7 || 7), gio: '08:00' },
    ];
  })();

  // ── Xem chi tiết ──
  protected readonly xemId = signal<string | null>(null);
  protected readonly chon = computed(() => this.store.viecVisible().find((v) => v.id === this.xemId()) ?? null);
  protected readonly ph = signal('');
  /** Phần Trao đổi mặc định ẩn, bấm mới mở. */
  protected readonly moTD = signal(false);
  /** Gom tin nhắn kiểu Messenger: ngăn ngày, tin liên tiếp của một người ghép nhóm, hoạt động hệ thống là dòng nhỏ giữa. */
  protected chatItems(v: ViecGiao): Array<{ k: 'day' | 'ev' | 'msg'; text: string; ten?: string; id?: string; time?: string; gio?: string; me?: boolean; first?: boolean; last?: boolean; pos?: string }> {
    const out: Array<{ k: 'day' | 'ev' | 'msg'; text: string; ten?: string; id?: string; time?: string; gio?: string; me?: boolean; first?: boolean; last?: boolean; pos?: string }> = [];
    const me = this.store.meId();
    let ngay = '';
    let truoc: number | null = null;
    v.phanHoi.forEach((m) => {
      const d = viDate(m.luc);
      if (d !== ngay) {
        ngay = d;
        out.push({ k: 'day', text: d });
        truoc = null;
      }
      const gio = viMoment(m.luc).slice(-5);
      if (m.heThong) {
        out.push({ k: 'ev', text: this.vnText(m.noiDung), ten: this.store.userName(m.nguoi), time: viMoment(m.luc), gio });
        truoc = null;
        return;
      }
      const cungNhom = truoc !== null && out[truoc].id === m.nguoi;
      if (truoc !== null && cungNhom) out[truoc].last = false;
      out.push({ k: 'msg', text: m.noiDung, ten: this.store.userName(m.nguoi), id: m.nguoi, time: viMoment(m.luc), gio, me: m.nguoi === me, first: !cungNhom, last: true });
      truoc = out.length - 1;
    });
    for (const it of out) if (it.k === 'msg') it.pos = it.first && it.last ? 'solo' : it.first ? 'first' : it.last ? 'end' : 'mid';
    return out;
  }
  /** 2026-10-29 → 29/10/2026 trong nội dung hệ thống tự ghi. */
  protected vnText(t: string): string {
    return t.replace(/(\d{4})-(\d{2})-(\d{2})/g, '$3/$2/$1');
  }
  protected readonly yc = signal<{ han: string; gio: string; lyDo: string; files: FileRef[] } | null>(null);

  constructor() {
    const id = setInterval(() => this.now.set(Date.now()), 20_000);
    inject(DestroyRef).onDestroy(() => clearInterval(id));
    // /viec?moi=<hdbId> → soạn việc gắn sẵn HĐ; /viec?id=<việc> → mở chi tiết.
    const route = inject(ActivatedRoute);
    const router = this.router;
    const qp = route.snapshot.queryParamMap;
    if (qp.get('tab') === 'canh-bao') this.tab.set('canhbao');
    if (qp.has('moi')) this.moSoan(qp.get('moi') ?? '');
    if (qp.get('id')) this.moXem(qp.get('id')!);
    if (qp.has('moi') || qp.has('id')) void router.navigate([], { relativeTo: route, queryParams: { moi: null, id: null, tab: null }, queryParamsHandling: 'merge', replaceUrl: true });
  }

  protected tenNhan(v: ViecGiao): string {
    return v.nguoiNhan.length ? v.nguoiNhan.map((id) => this.store.userName(id)).join(', ') : `${this.store.userName(v.nguoiTao)} (tự đặt lịch)`;
  }
  protected soPH(v: ViecGiao): number {
    return v.phanHoi.filter((m) => !m.heThong).length;
  }
  protected readonly hom = todayIso();
  protected dayOf(v: ViecGiao): number {
    return v.han ? daysFromToday(v.han) : 0;
  }
  /** Việc cũ chưa có ngày bắt đầu → lấy ngày giao. */
  protected batDauOf(v: ViecGiao): string {
    return v.batDau ?? v.taoLuc.slice(0, 10);
  }
  protected nhanIds(v: ViecGiao): string[] {
    return v.nguoiNhan;
  }
  protected mucCls(v: ViecGiao): string {
    return v.mucUuTien === 'Cao' ? 'cao' : v.mucUuTien === 'Thấp' ? 'thap' : 'tb';
  }
  protected conNgayText(v: ViecGiao): string {
    const n = v.han ? daysFromToday(v.han) : 0;
    return n < 0 ? `quá hạn ${-n} ngày` : n === 0 ? 'hôm nay' : n === 1 ? 'ngày mai' : `còn ${n} ngày`;
  }

  protected moSoan(hdbId = ''): void {
    this.err.set('');
    this.soan.set({
      noiDung: '',
      nhom: '',
      mucUuTien: 'Trung bình',
      nguonLoai: hdbId ? 'HDB' : 'NOI_BO',
      hdbId,
      hdmId: '',
      nguoiNhan: [],
      batDau: todayIso(),
      han: todayIso(),
      gio: '',
      files: [],
    });
  }
  protected set(p: Partial<Soan>): void {
    this.soan.update((s) => (s ? { ...s, ...p } : s));
  }
  protected themNhan(id: string): void {
    if (id) this.soan.update((s) => (s && !s.nguoiNhan.includes(id) ? { ...s, nguoiNhan: [...s.nguoiNhan, id] } : s));
  }
  protected boNhan(id: string): void {
    this.soan.update((s) => (s ? { ...s, nguoiNhan: s.nguoiNhan.filter((x) => x !== id) } : s));
  }
  protected hanNhanhChon(ngay: string, gio: string): void {
    this.set({ han: ngay, gio, batDau: this.soan()?.batDau && this.soan()!.batDau! <= ngay ? this.soan()!.batDau : ngay });
  }
  protected guiViec(): void {
    if (this.mSoan()?.kt.hopLe() === false) return;
    const s = this.soan();
    if (!s) return;
    if (s.nguonLoai === 'HDB' && !s.hdbId) return this.err.set('Chọn Hợp đồng bán trong danh sách gợi ý');
    if (s.nguonLoai === 'HDM' && !s.hdmId) return this.err.set('Chọn Hợp đồng mua trong danh sách gợi ý');
    const e = this.store.giaoViec(s);
    if (e) return this.err.set(e);
    this.store.say(s.nguoiNhan.length ? 'Đã giao việc' : 'Đã đặt lịch');
    this.soan.set(null);
  }

  protected moXem(id: string): void {
    this.ph.set('');
    this.yc.set(null);
    this.moTD.set(false);
    this.xemId.set(id);
  }
  protected dong(): void {
    this.xemId.set(null);
    this.yc.set(null);
  }
  protected enterGui(e: Event): void {
    if ((e as KeyboardEvent).shiftKey) return;
    e.preventDefault();
    this.gui();
  }
  protected gui(): void {
    const v = this.chon();
    if (!v || !this.ph().trim()) return;
    const e = this.store.phanHoiViec(v.id, this.ph());
    if (e) return this.store.say(e);
    this.ph.set('');
  }
  protected doiXong(v: ViecGiao): void {
    const e = this.store.xongViec(v.id, !v.xongLuc);
    this.store.say(e ?? (v.xongLuc ? 'Đã mở lại việc' : 'Đã hoàn thành — ghi vào trao đổi'));
  }

  // ── Đổi hạn ──
  protected duocDoiHan(v: ViecGiao): boolean {
    return !v.xongLuc && v.nguoiNhan.includes(this.store.meId() ?? '') && !this.conHan(v);
  }
  protected moYc(v: ViecGiao): void {
    this.yc.set({ han: v.han ?? todayIso(), gio: v.gio ?? '', lyDo: '', files: [] });
  }
  protected setYc(p: Partial<{ han: string; gio: string; lyDo: string; files: FileRef[] }>): void {
    this.yc.update((y) => (y ? { ...y, ...p } : y));
  }
  /** Dời hạn mới thêm n ngày so với hạn hiện tại của việc. */
  protected doiThem(v: ViecGiao, n: number): void {
    const d = new Date(`${v.han ?? todayIso()}T00:00:00`);
    d.setDate(d.getDate() + n);
    this.setYc({ han: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` });
  }
  /** Số ngày hạn đề nghị lệch so với hạn hiện tại (âm = sớm hơn). */
  protected chenhNgay(v: ViecGiao, hanMoi: string): number {
    return Math.round((new Date(hanMoi).getTime() - new Date(v.han ?? hanMoi).getTime()) / 86_400_000);
  }
  /** Phần trăm thời gian duyệt còn lại (thanh tiến trình). */
  protected phanTramHan(v: ViecGiao): number {
    const y = v.yeuCauHan;
    if (!y) return 0;
    const con = new Date(y.luc).getTime() + PHUT_DUYET_HAN * 60_000 - this.now();
    return Math.max(0, Math.min(100, (con / (PHUT_DUYET_HAN * 60_000)) * 100));
  }
  protected guiYc(v: ViecGiao): void {
    const y = this.yc();
    if (!y) return;
    const e = this.store.yeuCauDoiHan(v.id, { hanMoi: y.han, gioMoi: y.gio, lyDo: y.lyDo, files: y.files });
    if (e) return this.store.say(e);
    this.yc.set(null);
    this.store.say(`Đã gửi đề nghị — người giao duyệt trong ${PHUT_DUYET_HAN} phút`);
  }
  protected duyet(v: ViecGiao, ok: boolean): void {
    const e = this.store.duyetDoiHan(v.id, ok);
    this.store.say(e ?? (ok ? 'Đã duyệt — hạn mới được cập nhật' : 'Đã Từ chối đổi hạn'));
  }
}
