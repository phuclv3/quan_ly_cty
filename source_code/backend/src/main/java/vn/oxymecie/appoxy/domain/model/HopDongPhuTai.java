package vn.oxymecie.appoxy.domain.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** Hợp đồng Phú Tài (PT-01…11). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class HopDongPhuTai {
  private String id;
  private String soHD;
  private String maKH;
  private String tenKH;
  private String mst;
  private String ngayKy;
  private String ngayHieuLuc;
  private String trangThai;
  private String ghiChu;
  private long truocVAT;
  private int vat;
  private List<String> hdMua = new ArrayList<>();
  private List<ChiPhiPT> chiPhi = new ArrayList<>();
  private List<DotKHTraPT> dotKH = new ArrayList<>();
  private List<DotPTTraNCC> dotTraNCC = new ArrayList<>();
  private double tyLeThue;
  private double tyLeGiu;
  private String cachChia;
  private List<TyLePTLog> tyLeLog = new ArrayList<>();
  private String hoaHongKieu;
  private double hoaHongGiaTri;
  private String nguoiNhanHH;
  private String ngayChiHH;
  private List<DoiChieuPT> doiChieu = new ArrayList<>();
  private String ghiChuHoSoThieu;
  private String lyDoHuy;
  private String taoLuc;
  @JsonProperty("import")
  private Boolean laImport;
}
