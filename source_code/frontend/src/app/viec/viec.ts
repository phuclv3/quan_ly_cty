import { ChangeDetectionStrategy, Component, DestroyRef, computed, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FileRef, MUC_UU_TIEN, MucUuTien, NHOM_VIEC, NguonViec, NhomViec, PHUT_DUYET_HAN, ViecGiao, ycConHan } from '../core/models';
import { Store } from '../core/store';
import { daysFromToday, todayIso, viDate, viMoment } from '../core/util';
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
     .vg .s12{grid-column:span 12}.vg .s4{grid-column:span 4}.vg .s3{grid-column:span 3}
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
          <button type="button" class="btn" (click)="moSoan()"><app-icon name="plus" [size]="16" /> Giao việc / Đặt lịch</button>
        }
      </div>
    </div>

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
  protected readonly viDate = viDate;
  protected readonly viMoment = viMoment;
  protected readonly NHOM = NHOM_VIEC;
  protected readonly MUC = MUC_UU_TIEN;
  protected readonly PHUT = PHUT_DUYET_HAN;
  protected readonly DS_TT: TrangThaiViec[] = ['Chưa bắt đầu', 'Đang làm', 'Chờ phê duyệt', 'Hoàn thành'];

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
    const router = inject(Router);
    const qp = route.snapshot.queryParamMap;
    if (qp.has('moi')) this.moSoan(qp.get('moi') ?? '');
    if (qp.get('id')) this.moXem(qp.get('id')!);
    if (qp.has('moi') || qp.has('id')) void router.navigate([], { relativeTo: route, queryParams: { moi: null, id: null }, queryParamsHandling: 'merge', replaceUrl: true });
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
