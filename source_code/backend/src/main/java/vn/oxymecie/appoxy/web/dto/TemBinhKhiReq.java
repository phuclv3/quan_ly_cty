package vn.oxymecie.appoxy.web.dto;

import java.util.List;

/**
 * Thông tin nhập để in tem dán bình khí (mỗi trường là 1 ô trên tem; bienPhap / huongDan: mỗi phần tử là 1 dòng).
 * Mọi trường đều bắt buộc, trừ khi xemTruoc = true (xem trực tiếp lúc đang nhập dở: thiếu gì chừa trống đó).
 */
public record TemBinhKhiReq(
    String loai,
    String quyCachVan,
    String vatLieu,
    String apSuat,
    String soSeri,
    String maUn,
    String dinhLuong,
    String xuatXu,
    List<String> bienPhap,
    List<String> huongDan,
    String ngaySanXuat,
    String hanSuDung,
    String tenKhiChuan,
    List<ThanhPhan> thanhPhan,
    Integer soLuong,
    Boolean xemTruoc,
    List<String> soSeris) {

  /** 1 dòng bảng "Thành phần khí": tên khí, kí hiệu (chữ số đi sau chữ cái in dạng chỉ số dưới: N2 → N₂), nồng độ. */
  public record ThanhPhan(String ten, String kyHieu, String nongDo) {}
}
