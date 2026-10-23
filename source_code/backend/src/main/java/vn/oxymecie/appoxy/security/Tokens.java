package vn.oxymecie.appoxy.security;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;

/** Token phiên ngẫu nhiên (24 byte, hex) và băm SHA-256 để lưu DB — DB không giữ token gốc. */
public final class Tokens {
  private static final SecureRandom RND = new SecureRandom();

  private Tokens() {}

  public static String moi() {
    byte[] b = new byte[24];
    RND.nextBytes(b);
    return HexFormat.of().formatHex(b);
  }

  public static String bam(String token) {
    try {
      return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8)));
    } catch (NoSuchAlgorithmException e) {
      throw new IllegalStateException(e);
    }
  }
}
