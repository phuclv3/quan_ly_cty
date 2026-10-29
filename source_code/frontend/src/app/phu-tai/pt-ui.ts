/** Kiểu dùng chung cho các tab giao dịch Phú Tài (banner, thẻ số, bộ lọc, bảng, chip). */
export const PT_STYLES = `
  :host { display: block; }
  .banner { display: flex; gap: 10px; align-items: center; padding: 10px 14px; margin-bottom: 14px; border-radius: 12px; background: #e6f4e6; color: #17663f; font-size: 14px; }
  .banner .tg { padding: 1px 8px; border-radius: 6px; background: #cfe9d4; font-size: 11px; font-weight: 700; color: #0f5a2a; }
  .kpis { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr)); margin-bottom: 14px; }
  .k { display: grid; gap: 4px; align-content: start; background: var(--surf); border-radius: 14px; padding: 12px 16px; min-width: 0; }
  .k.hero { background: linear-gradient(135deg, #0f7a3d, #19a05a 70%, #4bb04f); color: #fff; }
  .k .l { font-size: 13px; font-weight: 600; color: var(--ink-2); }
  .k .v { font-size: 26px; font-weight: 700; line-height: 1.15; }
  .k .s { font-size: 12px; color: var(--ink-3); }
  .k.hero .l, .k.hero .s { color: #fff; }
  .card-b { background: var(--surf); border-radius: 20px; padding: 18px 20px; min-width: 0; margin-bottom: 14px; }
  .card-b h3 { font-size: 16px; font-weight: 700; margin: 0 0 14px; display: flex; justify-content: space-between; align-items: baseline; gap: 8px; }
  .u { font-size: 12px; font-weight: 400; color: var(--ink-3); }
  .loc { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-bottom: 14px; }
  .loc .q { flex: 1 1 260px; min-width: 200px; height: 42px; padding: 0 16px; border-radius: 999px; border: 0; background: var(--surf-2); }
  .loc select { width: auto; min-height: 40px; height: 40px; padding: 4px 16px; border-radius: 999px; border: 0; background: var(--surf-2); font-weight: 600; font-size: 14px; }
  .tbl-wrap { border: 0; border-radius: 0; box-shadow: none; overflow: auto; background: none; }
  .tbl { font-size: 13px; line-height: 1.45; }
  .tbl th, .tbl td { padding: 11px 10px; border-bottom: 1px solid var(--line); vertical-align: top; }
  .tbl thead th { background: var(--surf-2); font-size: 12.5px; font-weight: 700; white-space: nowrap; }
  .tbl thead th:first-child { border-radius: 10px 0 0 10px; }
  .tbl thead th:last-child { border-radius: 0 10px 10px 0; }
  .tbl tbody tr:last-child td { border-bottom: 0; }
  .tbl tfoot th, .tbl tfoot td { background: var(--surf-2); font-weight: 700; border-bottom: 0; }
  .tbl .so { font-weight: 700; color: var(--brand); text-decoration: none; }
  .tbl .sub { display: block; font-size: 11.5px; color: var(--ink-3); font-weight: 400; }
  .tbl .num { text-align: right; white-space: nowrap; }
  .tbl .kh { min-width: 120px; }
  .chip { display: inline-block; padding: 1px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; background: var(--surf-3); color: var(--ink-2); white-space: nowrap; }
  .chip.ok { background: #e2f3e9; color: #17663f; }
  .chip.warn { background: #fbf0d6; color: #8a5a00; }
  .chip.bad { background: #fbe4e1; color: #a3261d; }
  .chip.info { background: #e3effb; color: #2a5d9f; }
  .chip + .chip { margin-top: 3px; }
  a.chip { text-decoration: none; }
  .pt { display: inline-flex; align-items: center; gap: 8px; white-space: nowrap; }
  .av { display: inline-grid; place-items: center; width: 26px; height: 26px; border-radius: 50%; color: #fff; font-size: 10px; font-weight: 700; flex: 0 0 auto; }
  .note-s { margin: 12px 0; font-size: 12.5px; color: var(--ink-3); }
  .empty { color: var(--ink-3); text-align: center; padding: 18px; }
`;
