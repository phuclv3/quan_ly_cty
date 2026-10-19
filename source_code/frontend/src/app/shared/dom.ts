/** Lấy giá trị từ sự kiện của input/textarea/select mà không cần FormsModule. */
export function inputValue(event: Event): string {
  const el = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null;
  return el ? el.value : '';
}

export function inputNumber(event: Event): number {
  const raw = inputValue(event).replace(/[^\d.-]/g, '');
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}
