import { Injectable, computed, inject } from '@angular/core';
import { Store } from '../core/store';
import { PHUT_DUYET_HAN } from '../core/models';
import { hdbCalc, hdmCalc, hoSoThieu, ptCalc } from '../core/calc';
import { daysFromToday, money, todayIso, viDate } from '../core/util';
import { TT } from '../core/trang-thai';

export interface Viec {
  text: string;
  sub: string;
  link: string;
  qp?: Record<string, string>;
  tone: 'bad' | 'warn' | 'info';
  /** Nhãn + mã hồ sơ gốc hiện ở bảng ưu tiên. */
  loai: string;
  ma: string;
}

/**
 * "Ưu tiên điều hành hôm nay": nguồn dữ liệu DÙNG CHUNG cho bảng ở Trang chủ và bảng thả xuống của chuông thông báo
 * (để hai nơi luôn khớp số liệu).
 */
@Injectable({ providedIn: 'root' })
export class UuTien {
  private readonly store = inject(Store);

  readonly calcBan = computed(() => {
    const db = this.store.db();
    return this.store
      .hdbVisible()
      .filter((h) => h.trangThai !== TT.BAO_GIA && h.trangThai !== TT.HUY)
      .map((h) => ({ h, c: hdbCalc(h, db) }));
  });
  readonly calcMua = computed(() => {
    const db = this.store.db();
    return this.store
      .hdmVisible()
      .filter((m) => !m.thuocPhuTai && m.trangThai !== TT.HUY)
      .map((m) => ({ m, c: hdmCalc(m, db) }));
  });

  readonly viec = computed<Viec[]>(() => {
    const s = this.store;
    const me = s.meId();
    const out: Viec[] = [];
    if (s.canView('hdbTab3')) {
      for (const { h, c } of this.calcBan()) {
        if (c.quaHan > 0)
          out.push({
            loai: 'CÔNG NỢ',
            ma: h.soHD || '(chưa số)',
            text: `HĐ bán ${h.soHD || '(chưa số)'} — ${c.quaHan} đợt thanh toán quá hạn`,
            sub: `${h.tenKH} · còn phải thu ${money(c.conPhaiThu)} đ`,
            link: `/hop-dong-ban/${h.id}`,
            qp: { tab: '3' },
            tone: 'bad',
          });
      }
    }
    if (s.canView('hdm')) {
      for (const { m, c } of this.calcMua()) {
        if (c.quaHan > 0)
          out.push({
            loai: 'HĐ MUA',
            ma: m.soHD || '(chưa số)',
            text: `HĐ mua ${m.soHD || '(chưa số)'} — ${c.quaHan} đợt trả NCC quá hạn`,
            sub: `${m.tenNCC} · còn phải trả ${money(c.conPhaiTra)} đ`,
            link: `/hop-dong-mua/${m.id}`,
            qp: { tab: '4' },
            tone: 'bad',
          });
      }
    }
    if (s.canView('soQuy')) {
      for (const p of s.phieuThuChi()) {
        if (p.trangThai === TT.TU_CHOI && p.nguoiDeNghi === me)
          out.push({
            loai: 'PHÊ DUYỆT',
            ma: p.soPhieu || p.loai,
            text: `Phiếu ${p.soPhieu || p.loai} bị từ chối`,
            sub: `${viDate(p.ngayLap)} · ${p.lyDoTuChoi || p.noiDung}`,
            link: '/ke-toan',
            qp: { tab: 'so-quy', id: p.id },
            tone: 'warn',
          });
      }
    }
    if (s.canView('cpHD')) {
      for (const c of s.chiPhiHD()) {
        if (c.trangThai === TT.TU_CHOI && c.nguoiThucHien === me)
          out.push({
            loai: 'CHI PHÍ',
            ma: c.maCP || '',
            text: `Chi phí HĐ ${c.maCP || ''} bị từ chối`,
            sub: `${s.hdbById(c.hdbId)?.soHD ?? ''} · ${c.lyDoTuChoi || c.noiDung}`,
            link: '/ke-toan',
            qp: { tab: 'chi-phi', id: c.id },
            tone: 'warn',
          });
      }
    }
    if (s.canView('hdbTab3')) {
      for (const { h, c } of this.calcBan()) {
        if (h.trangThai === TT.HOAN_THANH)
          out.push({
            loai: 'HĐ BÁN',
            ma: h.soHD,
            text: `HĐ bán ${h.soHD} Hoàn thành — chưa tất toán`,
            sub: [
              c.conPhaiThu > 0 ? `còn phải thu ${money(c.conPhaiThu)} đ` : '',
              c.hoSoThieu.length ? `thiếu ${c.hoSoThieu.join(', ')}` : '',
              c.cpCho > 0 ? 'còn chi phí chờ duyệt' : '',
            ]
              .filter(Boolean)
              .join(' · ') || 'Đủ điều kiện chuyển Đã tất toán',
            link: `/hop-dong-ban/${h.id}`,
            tone: 'info',
          });
      }
    }
    if (s.canView('phuTai')) {
      const db = s.db();
      for (const p of s.hopDongPhuTai()) {
        if (p.trangThai !== TT.HOAN_THANH || s.dangChoXoa('HopDongPhuTai', p.id)) continue;
        const c = ptCalc(p, db);
        const thieu = hoSoThieu(db, 'HDPT', p.id);
        out.push({
          loai: 'PHÚ TÀI',
            ma: p.soHD,
            text: `HĐ Phú Tài ${p.soHD} Hoàn thành — chưa tất toán`,
          sub:
            [c.khDaTra < c.sauVAT ? `KH còn phải trả PT ${money(c.sauVAT - c.khDaTra)} đ` : '', thieu.length ? `thiếu ${thieu.join(', ')}` : '']
              .filter(Boolean)
              .join(' · ') || 'Kiểm tra Phú Tài đã chuyển đủ phần Oxy được hưởng',
          link: `/phu-tai/${p.id}`,
          tone: 'info',
        });
      }
    }
    // Quá hạn → Cần xử lý → Nhắc; sort ổn định nên giữ thứ tự trong cùng nhóm.
    const uuTien = { bad: 0, warn: 1, info: 2 };
    return out.sort((a, b) => uuTien[a.tone] - uuTien[b.tone]);
  });

  // ── Ưu tiên điều hành hôm nay: việc CỦA TÔI đến hạn trong ngày / quá hạn, chưa hoàn thành ──
  readonly hang = computed(() => {
    const me = this.store.meId() ?? '';
    const homNay = todayIso();
    const lop = (loai: string) => (loai === 'HĐ MUA' ? 'mua' : loai === 'CÔNG NỢ' || loai === 'CHI PHÍ' ? 'no' : loai === 'PHÊ DUYỆT' ? 'pd' : 'ban');
    const viecs = this.store
      .viecVisible()
      .filter((v) => !v.xongLuc && (v.nguoiNhan.includes(me) || (!v.nguoiNhan.length && v.nguoiTao === me)) && (v.suCo || (v.han ?? homNay) <= homNay))
      .map((v) => {
        const tre = -daysFromToday(v.han ?? homNay);
        const cuoi = [...v.phanHoi].reverse().find((m) => !m.heThong);
        const hd = this.store.hdbById(v.hdbId);
        return {
          key: v.id,
          viecId: v.id as string | null,
          p0: !!v.uuTien || tre > 0,
          text: v.suCo ? `⚠ Sự cố: ${v.noiDung}` : v.noiDung,
          sub: cuoi ? `${this.store.userName(cuoi.nguoi)}: ${cuoi.noiDung}` : `Giao bởi ${this.store.userName(v.nguoiTao)}${tre > 0 ? ` · quá hạn ${tre} ngày` : ''}`,
          loai: 'HĐ BÁN',
          ma: hd ? hd.soHD || '(báo giá)' : '',
          mau: 'ban',
          link: hd ? ['/hop-dong-ban', hd.id] : ['/viec'],
          qp: undefined as Record<string, string> | undefined,
          ai: v.nguoiNhan[0] ?? v.nguoiTao,
          han: v.han ?? homNay,
          gio: v.gio,
          tre,
        };
      });
    // Cảnh báo tự sinh của hệ thống: Xử lý = mở hồ sơ gốc; hết điều kiện cảnh báo thì tự rời bảng.
    const canhBao = this.viec().map((x, i) => ({
      key: `cb${i}`,
      viecId: null,
      p0: x.tone === 'bad',
      text: x.text,
      sub: x.sub,
      loai: x.loai,
      ma: x.ma,
      mau: lop(x.loai),
      link: [x.link],
      qp: x.qp,
      ai: me,
      han: homNay,
      gio: undefined as string | undefined,
      tre: x.tone === 'bad' ? 1 : 0,
    }));
    // Yêu cầu đổi hạn đang chờ tôi duyệt (trong 60 phút) — mở chi tiết việc để Duyệt / Từ chối.
    const duyetHan = this.store.ycChoToi().map((v) => {
      const y = v.yeuCauHan!;
      const con = Math.max(0, Math.ceil((new Date(y.luc).getTime() + PHUT_DUYET_HAN * 60_000 - Date.now()) / 60_000));
      return {
        key: `yc${v.id}`,
        viecId: null,
        p0: true,
        text: `Duyệt đổi hạn: ${v.noiDung}`,
        sub: `${this.store.userName(y.nguoi)} đề nghị hạn mới ${viDate(y.hanMoi)} · còn ${con} phút để duyệt`,
        loai: 'PHÊ DUYỆT',
        ma: v.ma ?? 'VIEC',
        mau: 'pd',
        link: ['/viec'],
        qp: { id: v.id } as Record<string, string> | undefined,
        ai: me,
        han: homNay,
        gio: undefined as string | undefined,
        tre: 0,
      };
    });
    return [...duyetHan, ...viecs, ...canhBao].sort((a, b) => Number(b.p0) - Number(a.p0));
  });
}
