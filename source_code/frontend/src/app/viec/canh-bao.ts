import { CL_DU_KIEN_HANG_VE, LichSuCanhBao, MucCanhBao, NhomViec } from '../core/models';
import { dotBanDaThu, dotMuaDaTra, dotQuaHan, hdbCalc, hoSoThieu, kiemTraDongBan, lechKiemKe, soDuNguon } from '../core/calc';
import { Store } from '../core/store';
import { TT } from '../core/trang-thai';
import { daysFromToday, money, sum, todayIso } from '../core/util';

export type NhomRuiRo = 'Hợp đồng bán' | 'Hợp đồng mua' | 'Kho & chất lượng' | 'Tài chính' | 'Pháp lý & tuân thủ';

/** Nhóm cảnh báo hệ thống tự động thiết lập + điều kiện phát hiện (hiện ở chú thích cuối bảng). */
export const NHOM_RUI_RO: { ten: NhomRuiRo; theoDoi: NhomViec; dieuKien: string }[] = [
  { ten: 'Hợp đồng bán', theoDoi: 'Kinh doanh', dieuKien: 'Dự kiến không đáp ứng hạn giao, nghiệm thu hoặc nghĩa vụ trọng yếu' },
  { ten: 'Hợp đồng mua', theoDoi: 'Mua hàng', dieuKien: 'Nhà cung cấp trễ cam kết, thiếu chứng từ, không đáp ứng nhu cầu của hợp đồng bán' },
  { ten: 'Kho & chất lượng', theoDoi: 'Kho', dieuKien: 'Hàng không đạt QC, thiếu COA, chứng từ hết hạn, tồn đủ điều kiện xuất không đáp ứng đơn đã cam kết' },
  { ten: 'Tài chính', theoDoi: 'Kế toán', dieuKien: 'Công nợ quá hạn kèm dấu hiệu khó thu, nguy cơ thiếu tiền cho khoản chi bắt buộc' },
  { ten: 'Pháp lý & tuân thủ', theoDoi: 'Kế toán', dieuKien: 'Chứng nhận, kiểm định hoặc hồ sơ bắt buộc không còn đáp ứng điều kiện sử dụng, nhập khẩu, giao hàng' },
];

/**
 * Ngưỡng đánh mức cho công nợ. "Dấu hiệu khó thu" (Tài chính) = một trong:
 *  - quá hạn từ NGUONG_KHO_THU_NGAY ngày; hoặc có từ 2 đợt quá hạn trên cùng HĐ; hoặc khách có từ 2 HĐ đang quá hạn.
 * Quá hạn + khó thu → P1 (P0 khi quá hạn từ NGUONG_P0_NGAY_QUA_HAN ngày); quá hạn nhưng chưa có dấu hiệu → P2; sắp đến hạn trong
 * NGUONG_P2_NGAY_SAP_HAN ngày → P2. Nợ NCC quá hạn: P1, P0 khi từ NGUONG_P0_NGAY_QUA_HAN ngày.
 */
export const NGUONG_KHO_THU_NGAY = 30;
export const NGUONG_P0_NGAY_QUA_HAN = 60;
export const NGUONG_P2_NGAY_SAP_HAN = 7;

/** Hồ sơ liên quan: nhãn hiển thị + đường dẫn mở hồ sơ gốc. */
export interface HoSoLienQuan {
  nhan: string;
  link: string[];
  qp?: Record<string, string>;
  /** Tông màu nhãn: hdb / hdm / kho / ke-toan. */
  mau: 'hdb' | 'hdm' | 'kho' | 'kt';
}

export interface CanhBao {
  key: string;
  muc: MucCanhBao;
  nhom: NhomRuiRo | 'Nhập tay';
  noiDung: string;
  anhHuong: string;
  hoSo?: HoSoLienQuan;
  /** Người theo dõi: nhóm phụ trách (cảnh báo tự động) hoặc nhóm việc / người nhận (nhập tay). */
  theoDoi: string;
  /** Có = đã có bản ghi trong bảng cảnh báo (nhập tay, hoặc cảnh báo hệ thống đã được thao tác): id bản ghi. */
  tayId?: string;
  xongLuc?: string;
  /** Nhóm phụ trách gốc (NhomViec) — dùng làm ảnh chụp khi lưu vết xử lý. */
  nhomTheoDoi?: NhomViec;
  /** Id người được giao xử lý (có khi đã lưu vết). */
  nguoiPhuTrach?: string;
  nguoiTao?: string;
  nguoiXuLy?: string;
  ghiChuXuLy?: string;
  lichSu?: LichSuCanhBao[];
  taoLuc?: string;
}

const MUC_THU_TU: Record<MucCanhBao, number> = { P0: 0, P1: 1, P2: 2 };
export const soSanhCanhBao = (a: CanhBao, b: CanhBao): number => MUC_THU_TU[a.muc] - MUC_THU_TU[b.muc] || a.noiDung.localeCompare(b.noiDung, 'vi');

const theoDoiOf = (nhom: NhomRuiRo): NhomViec => NHOM_RUI_RO.find((x) => x.ten === nhom)!.theoDoi;

/**
 * Cảnh báo hệ thống tự phát hiện từ dữ liệu hiện có — không lưu DB; hết điều kiện thì tự biến mất.
 * Chỉ sinh cảnh báo cho dữ liệu người dùng được xem (quyền + phạm vi HĐ).
 * Các điều kiện cần dữ liệu chưa có trong hệ thống (QC / COA / chứng nhận hết hạn, hạn giao, chậm giao NCC) chưa được tính.
 */
export function tinhCanhBaoTuDong(s: Store): CanhBao[] {
  const db = s.db();
  const out: CanhBao[] = [];
  const them = (c: Omit<CanhBao, 'theoDoi'> & { nhom: NhomRuiRo }) => out.push({ ...c, theoDoi: theoDoiOf(c.nhom) });

  // ── Tài chính: công nợ phải thu quá hạn / sắp đến hạn (HĐ bán Oxy — HĐ thuộc Phú Tài tính ở kế toán Phú Tài) ──
  if (s.canView('hdbTab3')) {
    // Số HĐ đang quá hạn của từng khách — một dấu hiệu khó thu.
    const hdQuaHanTheoKH = new Map<string, number>();
    for (const h of s.hdbVisible()) {
      if (h.thuocPhuTai || h.trangThai === TT.BAO_GIA || h.trangThai === TT.HUY || h.trangThai === TT.DA_TAT_TOAN) continue;
      if (h.dotTT.some((d) => dotQuaHan(d, dotBanDaThu(d, db)))) hdQuaHanTheoKH.set(h.maKH || h.tenKH, (hdQuaHanTheoKH.get(h.maKH || h.tenKH) ?? 0) + 1);
    }
    for (const h of s.hdbVisible()) {
      if (h.thuocPhuTai || h.trangThai === TT.BAO_GIA || h.trangThai === TT.HUY || h.trangThai === TT.DA_TAT_TOAN) continue;
      const so = h.soHD || '(chưa số)';
      const hoSo: HoSoLienQuan = { nhan: so, link: ['/hop-dong-ban', h.id], qp: { tab: '3' }, mau: 'hdb' };
      const quaHan = h.dotTT.filter((d) => dotQuaHan(d, dotBanDaThu(d, db)));
      if (quaHan.length) {
        const ngay = Math.max(...quaHan.map((d) => -daysFromToday(d.han!)));
        const con = sum(quaHan, (d) => d.soTien - dotBanDaThu(d, db));
        const nHD = hdQuaHanTheoKH.get(h.maKH || h.tenKH) ?? 1;
        const dauHieu = [
          ngay >= NGUONG_KHO_THU_NGAY ? `quá hạn ${ngay} ngày` : '',
          quaHan.length >= 2 ? `${quaHan.length} đợt quá hạn` : '',
          nHD >= 2 ? `khách có ${nHD} HĐ quá hạn` : '',
        ].filter(Boolean);
        them({
          key: `tc-thu-${h.id}`,
          muc: !dauHieu.length ? 'P2' : ngay >= NGUONG_P0_NGAY_QUA_HAN ? 'P0' : 'P1',
          nhom: 'Tài chính',
          noiDung: `${h.tenKH} — ${quaHan.length} đợt thanh toán quá hạn ${ngay} ngày`,
          anhHuong: `Thiếu tiền thu ${money(con)} đ${dauHieu.length ? `; dấu hiệu khó thu: ${dauHieu.join(', ')}` : ', chưa có dấu hiệu khó thu'}`,
          hoSo,
        });
        continue;
      }
      const sap = h.dotTT.filter((d) => d.han && d.han >= todayIso() && daysFromToday(d.han) <= NGUONG_P2_NGAY_SAP_HAN && dotBanDaThu(d, db) < d.soTien);
      if (sap.length) {
        const gan = Math.min(...sap.map((d) => daysFromToday(d.han!)));
        them({
          key: `tc-thu-sap-${h.id}`,
          muc: 'P2',
          nhom: 'Tài chính',
          noiDung: `${h.tenKH} — đợt thanh toán đến hạn ${gan === 0 ? 'hôm nay' : `sau ${gan} ngày`}`,
          anhHuong: `Còn phải thu ${money(sum(sap, (d) => d.soTien - dotBanDaThu(d, db)))} đ, còn thời gian nhắc khách`,
          hoSo,
        });
      }
    }
  }

  // ── Hợp đồng mua: đợt trả NCC quá hạn / sắp đến hạn (nguy cơ gián đoạn nhà cung cấp) ──
  if (s.canView('hdm')) {
    for (const m of s.hdmVisible()) {
      if (m.thuocPhuTai || m.trangThai === TT.HUY || m.trangThai === TT.DA_TAT_TOAN) continue;
      const so = m.soHD || '(chưa số)';
      const hoSo: HoSoLienQuan = { nhan: so, link: ['/hop-dong-mua', m.id], qp: { tab: '4' }, mau: 'hdm' };
      const quaHan = m.dotTT.filter((d) => dotQuaHan(d, dotMuaDaTra(m, d, db)));
      if (quaHan.length) {
        const ngay = Math.max(...quaHan.map((d) => -daysFromToday(d.han!)));
        them({
          key: `hdm-tra-${m.id}`,
          muc: ngay >= NGUONG_P0_NGAY_QUA_HAN ? 'P0' : 'P1',
          nhom: 'Hợp đồng mua',
          noiDung: `Nợ NCC ${m.tenNCC} — ${quaHan.length} đợt trả quá hạn ${ngay} ngày`,
          anhHuong: 'Nhà cung cấp có thể ngừng hoặc trễ giao, ảnh hưởng hợp đồng bán',
          hoSo,
        });
        continue;
      }
      const sap = m.dotTT.filter((d) => d.han && d.han >= todayIso() && daysFromToday(d.han) <= NGUONG_P2_NGAY_SAP_HAN && dotMuaDaTra(m, d, db) < d.soTien);
      if (sap.length)
        them({
          key: `hdm-tra-sap-${m.id}`,
          muc: 'P2',
          nhom: 'Hợp đồng mua',
          noiDung: `Đợt trả NCC ${m.tenNCC} đến hạn trong ${Math.min(...sap.map((d) => daysFromToday(d.han!)))} ngày`,
          anhHuong: 'Cần chuẩn bị tiền để không trễ cam kết với nhà cung cấp',
          hoSo,
        });
    }
  }

  // ── Hợp đồng mua: đã nhận đủ hàng nhưng thiếu chứng từ / hồ sơ bắt buộc ──
  if (s.canView('hdm')) {
    for (const m of s.hdmVisible()) {
      if (m.trangThai !== TT.DA_NHAN_DU || m.thuocPhuTai) continue;
      const thieu = hoSoThieu(db, 'HDM', m.id);
      if (!thieu.length) continue;
      them({
        key: `hdm-hs-${m.id}`,
        muc: 'P2',
        nhom: 'Hợp đồng mua',
        noiDung: `${m.soHD || m.tenNCC} đã nhận đủ hàng nhưng thiếu chứng từ: ${thieu.join(', ')}`,
        anhHuong: 'Chưa đủ chứng từ để đối chiếu, thanh toán và tất toán',
        hoSo: { nhan: m.soHD || '(chưa số)', link: ['/hop-dong-mua', m.id], mau: 'hdm' },
      });
    }
  }

  // ── Hợp đồng mua: còn ≤ NGUONG_P2_NGAY_SAP_HAN ngày tới ngày "Dự kiến hàng về" mà hàng chưa về → Kho kiểm tra tiến độ với NCC ──
  // Quá ngày dự kiến mà chưa tích về vẫn giữ cảnh báo (P1) cho đến khi hàng về / HĐ nhận đủ.
  if (s.canView('hdm')) {
    for (const m of s.hdmVisible()) {
      if (m.thuocPhuTai || [TT.NHAP, TT.HUY, TT.DA_TAT_TOAN, TT.DA_NHAN_DU].includes(m.trangThai as never)) continue;
      const cl = m.checklist.find((x) => x.ten === CL_DU_KIEN_HANG_VE);
      if (!cl?.ngay || cl.xong) continue;
      const con = daysFromToday(cl.ngay);
      if (con > NGUONG_P2_NGAY_SAP_HAN) continue;
      them({
        key: `hdm-ve-${m.id}`,
        muc: con < 0 ? 'P1' : 'P2',
        nhom: 'Kho & chất lượng',
        noiDung: `${m.tenNCC} — dự kiến hàng về ${con < 0 ? `đã quá ${-con} ngày` : con === 0 ? 'hôm nay' : `sau ${con} ngày`}, hàng chưa về`,
        anhHuong: 'Kho cần kiểm tra tiến độ giao hàng với NCC để kịp nhập kho và giao khách',
        hoSo: { nhan: m.soHD || '(chưa số)', link: ['/hop-dong-mua', m.id], qp: { tab: '4' }, mau: 'hdm' },
      });
    }
  }

  // ── Tài chính: số dư các nguồn tiền không đủ cho các đợt trả NCC đã / sắp đến hạn (chỉ người xem được toàn bộ sổ quỹ) ──
  if (s.canView('hdm') && s.canView('soQuy') && s.level('soQuy') !== 'draft') {
    const can = sum(
      s.hdmVisible().filter((m) => !m.thuocPhuTai && m.trangThai !== TT.HUY && m.trangThai !== TT.DA_TAT_TOAN),
      (m) =>
        sum(
          m.dotTT.filter((d) => d.han && daysFromToday(d.han) <= NGUONG_P2_NGAY_SAP_HAN && dotMuaDaTra(m, d, db) < d.soTien),
          (d) => d.soTien - dotMuaDaTra(m, d, db),
        ),
    );
    const coTien = sum(db.nguonTien, (n) => Math.max(soDuNguon(n.id, db).soDu, 0));
    if (can > coTien)
      them({
        key: 'tc-thieu-tien',
        muc: 'P1',
        nhom: 'Tài chính',
        noiDung: `Nguy cơ thiếu tiền: cần trả NCC ${money(can)} đ trong ${NGUONG_P2_NGAY_SAP_HAN} ngày tới, số dư các nguồn ${money(coTien)} đ`,
        anhHuong: `Thiếu ${money(can - coTien)} đ, có thể trễ khoản chi bắt buộc`,
        hoSo: { nhan: 'Sổ quỹ', link: ['/ke-toan'], qp: { tab: 'so-quy' }, mau: 'kt' },
      });
  }

  // ── Kho & chất lượng: tồn khả dụng không đủ cho đơn đã cam kết ──
  if (s.canView('khoTon')) {
    for (const h of s.hdbVisible()) {
      if (h.trangThai !== TT.HIEU_LUC && h.trangThai !== TT.DANG_GIAO_HANG) continue;
      const thieu = kiemTraDongBan(db, h).filter((x) => x.thieu > 0);
      if (!thieu.length) continue;
      const canMua = thieu.filter((x) => x.trangThai === 'Cần mua');
      const ds = (canMua.length ? canMua : thieu).map((x) => x.d.loaiHang).filter((v, i, a) => v && a.indexOf(v) === i);
      them({
        key: `kho-ton-${h.id}`,
        muc: canMua.length ? 'P1' : 'P2',
        nhom: 'Kho & chất lượng',
        noiDung: `Tồn khả dụng ${ds.join(', ')} thấp hơn đơn đã cam kết`,
        anhHuong: `Không đủ hàng giao ${h.soHD || h.tenKH}${canMua.length ? '' : ' (đã có đề nghị mua)'}`,
        hoSo: { nhan: h.soHD || '(chưa số)', link: ['/hop-dong-ban', h.id], mau: 'hdb' },
      });
    }

    // Đợt kiểm kê gần nhất của từng kho còn lệch so với tồn sổ.
    const gan = new Map<string, (typeof db.kiemKe)[number]>();
    for (const k of db.kiemKe) if (!gan.get(k.kho) || gan.get(k.kho)!.ngay < k.ngay) gan.set(k.kho, k);
    for (const k of gan.values()) {
      // Đã lập phiếu điều chỉnh thì tồn sổ đã khớp thực tế — hết cảnh báo (lechKiemKe cố ý bỏ qua phiếu điều chỉnh của chính đợt).
      if (k.phieuDieuChinh?.length) continue;
      const lech = lechKiemKe(db, k).filter((x) => x.lech !== 0);
      if (!lech.length) continue;
      them({
        key: `kho-kk-${k.id}`,
        muc: 'P2',
        nhom: 'Kho & chất lượng',
        noiDung: `Lệch kiểm kê ${lech.map((x) => `${x.loaiHang} ${x.lech > 0 ? '+' : ''}${x.lech}`).join(', ')}`,
        anhHuong: `Sai lệch tồn sổ so với thực tế tại ${s.khoTen(k.kho)}`,
        hoSo: { nhan: k.soPhieu, link: ['/kho'], qp: { tab: 'kiem-ke' }, mau: 'kho' },
      });
    }
  }

  // ── Pháp lý & tuân thủ: HĐ bán đã hoàn thành nhưng thiếu hồ sơ bắt buộc ──
  if (s.canView('hdb')) {
    for (const h of s.hdbVisible()) {
      if (h.trangThai !== TT.HOAN_THANH) continue;
      const thieu = hdbCalc(h, db).hoSoThieu;
      if (!thieu.length) continue;
      them({
        key: `pl-hs-${h.id}`,
        muc: 'P2',
        nhom: 'Pháp lý & tuân thủ',
        noiDung: `${h.soHD || h.tenKH} hoàn thành nhưng thiếu hồ sơ: ${thieu.join(', ')}`,
        anhHuong: 'Chưa đủ hồ sơ bắt buộc để tất toán',
        hoSo: { nhan: h.soHD || '(chưa số)', link: ['/hop-dong-ban', h.id], mau: 'hdb' },
      });
    }
  }

  return out.sort(soSanhCanhBao);
}
