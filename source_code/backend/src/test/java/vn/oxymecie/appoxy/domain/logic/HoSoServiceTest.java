package vn.oxymecie.appoxy.domain.logic;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.domain.model.HoaDon;

class HoSoServiceTest {
  @Test
  void thieuLoaiHopDongTraLoiNghiepVuKhongNpe() {
    var ex = assertThrows(ApiException.class, () -> new HoSoService().saveHoaDon(null, new HoaDon()));
    assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, ex.getStatus());
  }
}
