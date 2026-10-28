/**
 * Bảng có phân trang cuộn trong khung của nó, không để cả trang cuộn.
 * Với mỗi `.tbl-wrap` đứng cùng khối với `app-pager` (ngoài popup), đặt `max-height` sao cho
 * bảng kéo dài tới sát đáy khung nhìn. Màn hẹp (bảng thành thẻ) thì bỏ giới hạn.
 */
const MIN_H = 160;

function eligible(main: HTMLElement): HTMLElement[] {
  if (window.matchMedia('(max-width: 900px)').matches) return [];
  return Array.from(main.querySelectorAll<HTMLElement>('.tbl-wrap')).filter(
    (w) => !w.closest('.modal, [role="dialog"]') && !!w.parentElement?.querySelector('app-pager'),
  );
}

function fit(main: HTMLElement): void {
  const html = document.documentElement;
  const all = Array.from(main.querySelectorAll<HTMLElement>('.tbl-wrap'));
  for (const w of all) w.style.maxHeight = '';
  const ws = eligible(main);
  html.classList.remove('fit-lock');
  html.classList.toggle('fit-tbl', ws.length > 0);
  if (!ws.length) return;

  const cs = getComputedStyle(main);
  const mainTail = (parseFloat(cs.paddingBottom) || 0) + (parseFloat(cs.marginBottom) || 0);
    for (const w of ws) {
    const wr = w.getBoundingClientRect();
    if (!wr.height) continue;
    // Ước lượng thô: phần còn lại của khung nhìn dưới đầu bảng, trừ phần dưới bảng (phân trang, đệm khối).
    const pager = w.parentElement!.querySelector<HTMLElement>('app-pager')!;
    const below = pager.getBoundingClientRect().bottom - wr.bottom;
    let h = Math.max(MIN_H, Math.floor(window.innerHeight - (wr.top + window.scrollY) - below - mainTail - 30));
    w.style.maxHeight = `${h}px`;
    w.style.overflowY = 'auto';
    // Hiệu chỉnh khi trang chỉ có một bảng: đo đáy nội dung thực rồi bù phần thừa/thiếu.
    const card = w.closest<HTMLElement>('.panel, .card') ?? w.parentElement!;
    if (ws.length === 1) {
      // Đáy khối chứa bảng + phân trang sát đáy vùng nội dung (chỉ còn đệm của .main).
      const bottom = card.getBoundingClientRect().bottom + window.scrollY;
      const diff = Math.floor(window.innerHeight - mainTail - bottom);
      h = Math.max(MIN_H, h + diff);
      w.style.maxHeight = `${h}px`;
    }
  }
  // Còn dư vài px thì khoá cuộn ngoài hẳn; dư nhiều (phần trên quá cao) thì để trang cuộn.
  html.classList.toggle('fit-lock', html.scrollHeight - window.innerHeight <= 48);
}

/** Bắt đầu theo dõi vùng nội dung; trả về hàm huỷ. */
export function fitTables(main: HTMLElement): () => void {
  let raf = 0;
  const run = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => fit(main));
  };
  const mo = new MutationObserver(run);
  mo.observe(main, { childList: true, subtree: true });
  window.addEventListener('resize', run);
  run();
  return () => {
    cancelAnimationFrame(raf);
    mo.disconnect();
    window.removeEventListener('resize', run);
  };
}
