const MAU = ['#0f5a2a', '#14806f', '#e0a31c', '#7b5cc4', '#c95f3b', '#3b7bc9'];

/** Màu avatar cố định theo mã tài khoản. */
export function mauAvatar(id: string): string {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return MAU[h % MAU.length];
}

/** Hai chữ cái cuối của họ tên (VA cho "Nguyễn Văn An"). */
export function chuVietTat(ten: string): string {
  return ten.split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join('').toUpperCase();
}
