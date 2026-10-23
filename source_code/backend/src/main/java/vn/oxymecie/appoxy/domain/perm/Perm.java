package vn.oxymecie.appoxy.domain.perm;

import java.util.List;

/**
 * Khoá quyền dùng trong mã (perm.ts Perm) gắn với mã chức năng spec và các mức được phép chọn.
 * Danh mục này cũng nằm ở bảng chuc_nang (V2__default_data.sql) — thêm chức năng thì thêm migration.
 */
public enum Perm {
  taiKhoan("NT-03", "Hệ thống", "Tài khoản, nhóm quyền & phân quyền", "Tạo tài khoản, nhóm quyền, gán quyền và gán tài khoản vào nhóm", Level.view, Level.edit),
  cauHinh("NT-14", "Hệ thống", "Tham số cấu hình", "Bậc thuế TNDN, tỷ lệ Phú Tài, tiền tố số phiếu, số đợt tối đa", Level.view, Level.edit),
  duyetXoa("NT-11", "Hệ thống", "Duyệt xoá", "Gửi yêu cầu xoá; Duyệt = duyệt mọi loại đối tượng", Level.request, Level.approve),
  duyetXoaKT("NT-11-KT", "Hệ thống", "Duyệt xoá chứng từ kế toán", "Chỉ duyệt xoá phiếu thu chi, chi phí HĐ, nguồn tiền, loại chi phí", Level.approve),
  nguonTien("KT-01", "Kế toán", "Nguồn tiền & loại chi phí", "Danh mục nguồn tiền, số dư; danh mục loại chi phí", Level.view, Level.edit),
  soQuy("KT-04", "Kế toán", "Sổ quỹ — lập phiếu", "Lập nháp: chỉ lập đề nghị của mình và gửi duyệt", Level.view, Level.draft, Level.edit),
  soQuyDuyet("KT-07", "Kế toán", "Duyệt phiếu thu chi", "Duyệt / từ chối phiếu — phiếu đã duyệt mới cộng trừ quỹ", Level.approve),
  tuDuyet("KT-07-TD", "Kế toán", "Tự duyệt chứng từ của mình", "Mặc định người lập không tự duyệt (D-10); bật cho người được ngoại lệ", Level.edit),
  cpHD("KT-12", "Kế toán", "Chi phí thực hiện HĐ — lập", "Sửa của mình: chỉ chi phí của HĐ mình phụ trách", Level.view, Level.own, Level.edit),
  cpHDDuyet("KT-14", "Kế toán", "Duyệt chi phí thực hiện HĐ", "Duyệt / từ chối chi phí thực hiện HĐ", Level.approve),
  congNo("KT-17", "Kế toán", "Công nợ phải thu / phải trả", "Báo cáo công nợ 2 chiều", Level.ownView, Level.view),
  khachHang("HDB-13", "Kinh doanh", "Khách hàng & theo dõi kinh doanh", "Sửa của mình: KH mình phụ trách và KH chưa phân bổ", Level.view, Level.own, Level.edit),
  phanBoKH("HDB-13-PB", "Kinh doanh", "Phân bổ data khách hàng", "Giao / đổi Sale phụ trách khách hàng", Level.edit),
  ncc("HDM-10", "Kinh doanh", "Danh mục nhà cung cấp", "", Level.view, Level.edit),
  hdb("HDB-01", "Kinh doanh", "Hợp đồng bán — thông tin, hồ sơ", "Của mình: chỉ HĐ mình là Sale phụ trách", Level.ownView, Level.view, Level.own, Level.edit),
  hdbTab3("HDB-07", "Kinh doanh", "HĐ bán — giá trị & đợt thanh toán", "Tab 3", Level.view, Level.own, Level.edit),
  hdbThucThu("HDB-10", "Kinh doanh", "HĐ bán — ghi nhận thực thu", "Ngày & số tiền khách thực trả (sinh phiếu Thu)", Level.edit),
  hdbGiaoHang("HDB-04", "Kinh doanh", "HĐ bán — ghi nhận giao hàng", "Sinh phiếu xuất kho", Level.own, Level.edit),
  moLaiHdb("HDB-03-ML", "Kinh doanh", "Mở lại HĐ đã tất toán", "HĐ quay về Hoàn thành để sửa", Level.edit),
  hdm("HDM-01", "Kinh doanh", "Hợp đồng mua — thông tin, hàng hoá, hồ sơ", "Xem của mình: HĐ mua gắn HĐ bán của mình", Level.ownView, Level.view, Level.edit),
  hdmTab4("HDM-08", "Kinh doanh", "HĐ mua — thanh toán NCC", "Tab 4: đợt trả NCC, xuất hoá đơn, checklist", Level.ownView, Level.view, Level.edit),
  moLaiHdm("HDM-03-ML", "Kinh doanh", "Mở lại HĐ mua đã tất toán", "HĐ quay về trạng thái nhận hàng để sửa đợt trả / phiếu chi", Level.edit),
  hdmNhapKho("HDM-06", "Kinh doanh", "HĐ mua — nhập kho", "Sinh phiếu nhập kho", Level.edit),
  khoDanhMuc("KHO-01", "Kho", "Danh mục kho & loại hàng", "", Level.view, Level.edit),
  khoPhieuTay("KHO-06", "Kho", "Phiếu nhập / xuất điều chỉnh", "Phiếu nhập tay — điều chỉnh", Level.view, Level.edit),
  khoTon("KHO-09", "Kho", "Tồn kho & giá trị theo HĐ", "", Level.view),
  inTem("KHO-10", "Kho", "In tem bình khí", "Nhập thông tin và xuất PDF tem dán bình khí (không lưu dữ liệu)", Level.view),
  phuTai("PT-01", "Phú Tài", "HĐ Phú Tài & quỹ ảo", "", Level.view, Level.edit),
  phuTaiTyLe("PT-06", "Phú Tài", "Sửa tỷ lệ chia lợi nhuận", "Tỷ lệ thuế / Phú Tài giữ theo từng HĐ", Level.edit),
  viec("TD-01", "Việc được giao", "Giao việc / Đặt lịch", "Sửa của mình: chỉ việc mình giao hoặc được giao; Sửa: thấy mọi việc", Level.own, Level.edit),
  baoCao("BC-01", "Báo cáo", "Báo cáo doanh thu, lợi nhuận, thanh toán", "Theo nghiep_vu/06_BaoCao", Level.ownView, Level.view);

  public final String ma;
  public final String module;
  public final String ten;
  public final String moTa;
  /** Các mức được phép (luôn gồm none). */
  public final List<Level> mucDo;

  Perm(String ma, String module, String ten, String moTa, Level... muc) {
    this.ma = ma;
    this.module = module;
    this.ten = ten;
    this.moTa = moTa;
    Level[] all = new Level[muc.length + 1];
    all[0] = Level.none;
    System.arraycopy(muc, 0, all, 1, muc.length);
    this.mucDo = List.of(all);
  }

  /** Mức cao nhất cho phép của chức năng. */
  public Level maxLevel() {
    Level best = Level.none;
    for (Level l : mucDo) if (l.rank > best.rank) best = l;
    return best;
  }

  public static Perm byMa(String ma) {
    for (Perm p : values()) if (p.ma.equals(ma)) return p;
    return null;
  }
}
