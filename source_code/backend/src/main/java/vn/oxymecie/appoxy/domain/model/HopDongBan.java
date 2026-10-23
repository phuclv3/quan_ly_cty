package vn.oxymecie.appoxy.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Hợp đồng bán (HDB-01…13). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HopDongBan {
  private String id;
  private String soHD;
  private String maKH;
  private String tenKH;
  private String mst;
  private String diaChi;
  private String ngayKy;
  private String ngayHieuLuc;
  private String trangThai;
  private String sale;
  private String ghiChu;
  private long truocVAT;
  private int vat;
  private long thucTeTruocVAT;
  private ThamSoThue thamSoThue = new ThamSoThue();
  private List<DotTTBan> dotTT = new ArrayList<>();
  private List<DongHangBan> dongHang;
  private Boolean coTamUng;
  private Long phatHD;
  private String lyDoPhat;
  private String lyDoHuy;
  private String ghiChuHoSoThieu;
  private String taoLuc;
  @JsonProperty("import")
  private Boolean laImport;
}
