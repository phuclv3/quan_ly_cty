/**
 * Tooltip chung cho mọi màn hình: thay hộp chú thích mặc định của trình duyệt (nhỏ, chậm, không chỉnh được)
 * bằng hộp to, rõ. Đọc thuộc tính `title` của phần tử đang rê chuột / focus — nút bị mờ (disabled) cũng hiện.
 */
const KHE = 8;

export function khoiTaoTooltip(): void {
  if (typeof document === 'undefined') return;
  const tip = document.createElement('div');
  tip.className = 'tip';
  tip.setAttribute('role', 'tooltip');
  document.body.appendChild(tip);

  let dich: HTMLElement | null = null;
  let tieuDe = '';

  const hien = (el: HTMLElement, text: string) => {
    tip.textContent = text;
    tip.classList.add('on');
    const r = el.getBoundingClientRect();
    const w = tip.offsetWidth;
    const h = tip.offsetHeight;
    let x = r.left + r.width / 2 - w / 2;
    x = Math.max(KHE, Math.min(x, window.innerWidth - w - KHE));
    let y = r.bottom + KHE;
    if (y + h > window.innerHeight - KHE) y = Math.max(KHE, r.top - h - KHE);
    tip.style.left = `${x}px`;
    tip.style.top = `${y}px`;
  };

  const an = () => {
    tip.classList.remove('on');
    if (dich && tieuDe && !dich.hasAttribute('title')) dich.setAttribute('title', tieuDe);
    dich = null;
    tieuDe = '';
  };

  const vao = (e: Event) => {
    const t = e.target;
    if (!(t instanceof Element)) return;
    const el = t.closest<HTMLElement>('[title]');
    if (!el || el === dich) return;
    an();
    const text = el.getAttribute('title')?.trim();
    if (!text) return;
    dich = el;
    tieuDe = text;
    el.removeAttribute('title'); // chặn tooltip mặc định của trình duyệt
    hien(el, text);
  };
  const ra = (e: Event) => {
    if (!dich) return;
    const toi = (e as MouseEvent).relatedTarget;
    if (toi instanceof Node && dich.contains(toi)) return;
    an();
  };

  document.addEventListener('mouseover', vao, true);
  document.addEventListener('mouseout', ra, true);
  document.addEventListener('focusin', vao, true);
  document.addEventListener('focusout', an, true);
  document.addEventListener('scroll', an, true);
  document.addEventListener('click', an, true);
  document.addEventListener('keydown', (e) => e.key === 'Escape' && an(), true);
}
