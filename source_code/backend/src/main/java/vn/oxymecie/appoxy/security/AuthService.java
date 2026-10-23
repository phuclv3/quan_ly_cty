package vn.oxymecie.appoxy.security;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import vn.oxymecie.appoxy.common.ApiException;
import vn.oxymecie.appoxy.common.Dates;
import vn.oxymecie.appoxy.common.Ids;
import vn.oxymecie.appoxy.common.Texts;
import vn.oxymecie.appoxy.domain.logic.Ctx;
import vn.oxymecie.appoxy.domain.model.TaiKhoan;
import vn.oxymecie.appoxy.domain.model.TrangThai;
import vn.oxymecie.appoxy.domain.perm.Perm;
import vn.oxymecie.appoxy.domain.perm.Quyen;
import vn.oxymecie.appoxy.persistence.Repos;
import vn.oxymecie.appoxy.persistence.entity.PhienDangNhapEntity;
import vn.oxymecie.appoxy.persistence.entity.TaiKhoanEntity;
import vn.oxymecie.appoxy.state.DataStore;

/**
 * Đăng nhập (NT-01), đổi / đặt lại mật khẩu (NT-02), quản lý tài khoản (NT-03).
 * Phiên: token ngẫu nhiên gửi client, DB chỉ lưu SHA-256; hết hạn trượt 12 giờ
 * theo hoạt động. Sai mật khẩu 5 lần → khoá đăng nhập 15 phút. Thông báo lỗi
 * chung, không lộ email có tồn tại hay không.
 */
@Service
public class AuthService {
	public static final Duration HET_HAN = Duration.ofHours(12);
	static final Duration KHOA = Duration.ofMinutes(15);
	static final int SAI_TOI_DA = 5;
	static final String LOI_CHUNG = "Email hoặc mật khẩu không đúng";

	private final DataStore store;
	private final Repos repos;
	private final MatKhau matKhau;
	private final Clock clock;
	private final TransactionTemplate tx;

	public AuthService(DataStore store, Repos repos, MatKhau matKhau, Clock clock, PlatformTransactionManager txm) {
		this.store = store;
		this.repos = repos;
		this.matKhau = matKhau;
		this.clock = clock;
		this.tx = new TransactionTemplate(txm);
	}

	public record DangNhap(String token, TaiKhoan taiKhoan, String hetHan) {
	}

	private record KetQua(String loi, DangNhap ok) {
	}

	public DangNhap login(String emailRaw, String raw, String ip, String userAgent) {
		String email = Texts.trim(emailRaw).toLowerCase();
		TaiKhoanEntity te = repos.taiKhoan().findByEmailIgnoreCase(email).orElse(null);
		if (te == null) {
			// Vẫn băm để thời gian phản hồi không lộ email có tồn tại.
			matKhau.soGia(raw);
			throw ApiException.unauthorized(LOI_CHUNG);
		}
		boolean dung = matKhau.khop(raw, te.getMatKhauBam());
		KetQua kq = store.execute("AUTH.dangNhap", te.getId(), ip, false, c -> {
			TaiKhoan t = c.taiKhoan(te.getId());
			Instant now = Instant.now(clock);
			String loi = kiemTraTruocDangNhap(t, now);
			if (loi != null)
				return new KetQua(loi, null);
			if (!dung)
				return new KetQua(ghiNhanSaiMatKhau(t, now), null);
			return new KetQua(null, taoPhien(c, t, now, ip, userAgent));
		}).value();
		if (kq.loi() != null)
			throw ApiException.unauthorized(kq.loi());
		return kq.ok();
	}

	/** Trả thông báo lỗi nếu tài khoản đang bị khoá (thủ công hoặc do nhập sai), ngược lại null. */
	private static String kiemTraTruocDangNhap(TaiKhoan t, Instant now) {
		if (TaiKhoan.biKhoa(t.getTrangThai()))
			return "Tài khoản đã bị khoá — liên hệ Giám đốc";
		Instant khoaDen = Dates.parseInstant(t.getKhoaDen());
		if (khoaDen != null && khoaDen.isAfter(now)) {
			long phut = (long) Math.ceil(Duration.between(now, khoaDen).toSeconds() / 60.0);
			return "Sai mật khẩu quá " + SAI_TOI_DA + " lần — thử lại sau " + phut + " phút";
		}
		return null;
	}

	/** Tăng bộ đếm sai; đủ {@link #SAI_TOI_DA} lần thì khoá tạm. Trả thông báo lỗi cho client. */
	private static String ghiNhanSaiMatKhau(TaiKhoan t, Instant now) {
		int sai = t.getSoLanSai() + 1;
		if (sai < SAI_TOI_DA) {
			t.setSoLanSai(sai);
			return LOI_CHUNG;
		}
		t.setSoLanSai(0);
		t.setKhoaDen(Dates.iso(now.plus(KHOA)));
		return "Sai mật khẩu " + SAI_TOI_DA + " lần — tài khoản bị khoá đăng nhập " + KHOA.toMinutes() + " phút";
	}

	private DangNhap taoPhien(Ctx c, TaiKhoan t, Instant now, String ip, String userAgent) {
		t.setSoLanSai(0);
		t.setKhoaDen(null);
		// Đăng nhập thành công không ghi lan_dang_nhap_cuoi: ht_nhanvien không bị cập nhật mỗi lần đăng nhập.
		String token = Tokens.moi();
		PhienDangNhapEntity p = new PhienDangNhapEntity();
		p.setTokenHash(Tokens.bam(token));
		p.setTaiKhoanId(t.getId());
		p.setHetHan(now.plus(HET_HAN));
		p.setTaoLuc(now);
		p.setDiaChiIp(ip);
		p.setUserAgent(userAgent == null ? null : userAgent.substring(0, Math.min(255, userAgent.length())));
		repos.phien().save(p);
		repos.phien().xoaHetHan(now);
		return new DangNhap(token, c.copy(t, TaiKhoan.class), Dates.iso(p.getHetHan()));
	}

	public void logout(AppUser u) {
		tx.executeWithoutResult(s -> repos.phien().deleteById(u.tokenHash()));
	}

	/**
	 * Xác thực token của request; gia hạn trượt (tối đa 1 lần / phút). Không hợp lệ
	 * → empty.
	 */
	public Optional<AppUser> xacThuc(String token) {
		if (token == null || !token.matches("^[0-9a-f]{48}$"))
			return Optional.empty();
		String hash = Tokens.bam(token);
		return tx.execute(s -> {
			Instant now = Instant.now(clock);
			PhienDangNhapEntity p = repos.phien().findById(hash).orElse(null);
			if (p == null)
				return Optional.<AppUser>empty();
			if (p.getHetHan().isBefore(now)) {
				repos.phien().delete(p);
				return Optional.<AppUser>empty();
			}
			TaiKhoanEntity t = repos.taiKhoan().findById(p.getTaiKhoanId()).orElse(null);
			if (t == null || TaiKhoan.biKhoa(t.getTrangThai()))
				return Optional.<AppUser>empty();
			Instant moi = now.plus(HET_HAN);
			if (Duration.between(p.getHetHan(), moi).toSeconds() >= 60)
				p.setHetHan(moi);
			return Optional.of(new AppUser(t.getId(), t.getEmail(), t.isBatDoiMK(), hash));
		});
	}

	// ── Đổi mật khẩu của chính mình (NT-02) ──────────────────────────────

	public void doiMatKhau(AppUser u, String cu, String moi, String nhapLai, String ip) {
		TaiKhoanEntity te = repos.taiKhoan().findById(u.id())
				.orElseThrow(() -> ApiException.unauthorized("Chưa đăng nhập"));
		if (!matKhau.khop(cu, te.getMatKhauBam()))
			throw ApiException.invalid("Mật khẩu cũ không đúng");
		if (moi == null || !moi.equals(nhapLai))
			throw ApiException.invalid("Hai lần nhập mật khẩu mới không khớp");
		String loi = MatKhau.loiMatKhauMoi(moi, cu);
		if (loi != null)
			throw ApiException.invalid(loi);
		String bam = matKhau.bam(moi);
		store.execute("AUTH.doiMatKhau", u.id(), ip, c -> {
			TaiKhoan t = c.taiKhoan(u.id());
			t.setBatDoiMK(false);
			c.datMatKhau(t.getId(), bam);
			c.nhatKy("TaiKhoan", t.getId(), "Đổi mật khẩu");
			return null;
		});
	}

	// ── Quản lý tài khoản (NT-03) ────────────────────────────────────────

	private static void guard(Ctx c) {
		if (!c.canEdit(Perm.taiKhoan))
			throw ApiException.forbidden("Chỉ người có quyền quản trị tài khoản (NT-03) được thao tác");
	}

	private static void kiemNhom(Ctx c, List<String> nhom) {
		if (nhom == null || nhom.isEmpty())
			throw ApiException.invalid("Chọn ít nhất 1 nhóm quyền");
		for (String g : nhom)
			if (c.nhom(g) == null)
				throw ApiException.invalid("Nhóm quyền không tồn tại: " + g);
	}

	public DataStore.Result<TaiKhoan> taoTaiKhoan(AppUser u, String hoTen, String emailRaw, List<String> nhom,
			String mk, String idDeXuat, String ip) {
		String loiMk = MatKhau.loiMatKhauMoi(mk, null);
		if (loiMk != null)
			throw ApiException.invalid(loiMk);
		String bam = matKhau.bam(mk);
		return store.execute("TK.tao", u.id(), ip, c -> {
			guard(c);
			String email = Texts.trim(emailRaw).toLowerCase();
			if (Texts.blank(hoTen))
				throw ApiException.invalid("Chưa nhập Họ tên");
			if (!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$") || email.length() > 200)
				throw ApiException.invalid("Email không hợp lệ");
			if (c.db().getTaiKhoan().stream().anyMatch(x -> Texts.fold(x.getEmail()).equals(Texts.fold(email))))
				throw ApiException.conflict("Email đã có tài khoản");
			kiemNhom(c, nhom);
			String id = Ids.safe(idDeXuat) && c.taiKhoan(idDeXuat) == null ? idDeXuat : c.uid("TK");
			TaiKhoan t = new TaiKhoan(id, email, hoTen.trim(), new ArrayList<>(nhom), TrangThai.HOAT_DONG, true, 0, null, null);
			c.db().getTaiKhoan().add(t);
			c.datMatKhau(id, bam);
			c.nhatKy("TaiKhoan", id, "Tạo tài khoản " + email);
			return t;
		});
	}

	public DataStore.Result<Object> suaTaiKhoan(AppUser u, String id, String hoTen, List<String> nhom, String ip) {
		return store.execute("TK.sua", u.id(), ip, c -> {
			guard(c);
			TaiKhoan t = c.taiKhoan(id);
			if (t == null)
				throw ApiException.notFound("Không tìm thấy tài khoản");
			kiemNhom(c, nhom);
			if (!Texts.blank(hoTen))
				t.setHoTen(hoTen.trim());
			t.setNhom(new ArrayList<>(nhom));
			if (!Quyen.conQuanTri(c.db().getTaiKhoan(), c.db().getNhomQuyen()))
				throw ApiException.conflict("Thay đổi này làm hệ thống không còn ai quản trị tài khoản");
			c.nhatKy("TaiKhoan", id, "Sửa tài khoản");
			return null;
		});
	}

	/**
	 * Khoá / mở khoá. Không xoá tài khoản đã phát sinh dữ liệu — chỉ khoá; khoá thì
	 * huỷ mọi phiên.
	 */
	public DataStore.Result<Object> doiTrangThai(AppUser u, String id, String ip) {
		return store.execute("TK.doiTrangThai", u.id(), ip, c -> {
			guard(c);
			TaiKhoan t = c.taiKhoan(id);
			if (t == null)
				throw ApiException.notFound("Không tìm thấy tài khoản");
			if (t.getId().equals(c.me()))
				throw ApiException.conflict("Không tự khoá tài khoản đang dùng");
			String moi = TaiKhoan.biKhoa(t.getTrangThai()) ? TrangThai.HOAT_DONG : TrangThai.KHOA;
			t.setTrangThai(moi);
			t.setSoLanSai(0);
			t.setKhoaDen(null);
			if (!Quyen.conQuanTri(c.db().getTaiKhoan(), c.db().getNhomQuyen()))
				throw ApiException.conflict("Không khoá tài khoản quản trị cuối cùng");
			if (TaiKhoan.biKhoa(moi))
				repos.phien().xoaTheoTaiKhoan(id);
			c.nhatKy("TaiKhoan", id, TaiKhoan.biKhoa(moi) ? "Khoá tài khoản" : "Mở khoá tài khoản");
			return null;
		});
	}

	/**
	 * Đặt lại mật khẩu → huỷ mọi phiên của tài khoản đó. Trả mật khẩu tạm (chỉ trả
	 * một lần, không ghi log).
	 */
	public record DatLai(String matKhau, DataStore.Result<Object> ketQua) {
	}

	public DatLai datLaiMatKhau(AppUser u, String id, boolean batDoi, String ip) {
		String mk = MatKhau.tam();
		String bam = matKhau.bam(mk);
		var r = store.execute("TK.datLaiMatKhau", u.id(), ip, c -> {
			guard(c);
			TaiKhoan t = c.taiKhoan(id);
			if (t == null)
				throw ApiException.notFound("Không tìm thấy tài khoản");
			t.setBatDoiMK(batDoi);
			t.setSoLanSai(0);
			t.setKhoaDen(null);
			c.datMatKhau(id, bam);
			repos.phien().xoaTheoTaiKhoan(id);
			c.nhatKy("TaiKhoan", id, "Đặt lại mật khẩu");
			return null;
		});
		return new DatLai(mk, r);
	}
}
