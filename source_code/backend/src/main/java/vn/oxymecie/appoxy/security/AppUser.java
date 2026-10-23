package vn.oxymecie.appoxy.security;

/** Người dùng đã xác thực của request hiện tại. tokenHash dùng để đăng xuất đúng phiên. */
public record AppUser(String id, String email, boolean batDoiMK, String tokenHash) {}
