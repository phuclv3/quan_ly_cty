"""
Sinh src/app/core/seed-kh.ts từ tai_lieu/du_lieu_thuc_te/File_theo_doi_khach_hang_Kinh_doanh.xlsx
(sheet "TỔNG QUÁT" — data khách hàng của Kinh doanh).

Chạy (từ thư mục source_code/frontend):
    python -X utf8 scripts/gen-seed-kh.py ../../tai_lieu/du_lieu_thuc_te/File_theo_doi_khach_hang_Kinh_doanh.xlsx

Quy tắc chuyển:
  - Cột "SĐT / Email / Zalo": tách các địa chỉ email sang trường email, phần còn lại giữ nguyên làm điện thoại.
  - Người liên hệ là nhãn rác ("Email", "ĐT") → bỏ trống.
  - "Hủy" → "Huỷ" (chính tả thống nhất trong app).
  - Ghi chú chăm sóc: giữ nguyên văn; tách "Giá trị đã chào giá" / "Giá trị HĐ ký kết" thành giá trị cơ hội (VNĐ).
"""
import json
import re
import sys
from datetime import datetime
from pathlib import Path

import openpyxl

COLS = [
    'stt', 'ngayTiepNhan', 'ten', 'mst', 'diaChi', 'tinh', 'nguoiLienHe', 'lienHe', 'chucVu', 'phanLoai',
    'nguon', 'loaiSP', 'hinhThucHD', 'tiepCan', 'coHoi', 'phuTrach', 'trangThaiData', 'ngayPhanBo', 'ghiChuCS',
]
RAC_LIEN_HE = {'email', 'đt', 'dt'}
EMAIL = re.compile(r'[\w.+-]+@[\w-]+(?:\.[\w-]+)+')
GIA_TRI = re.compile(r'Giá trị (?:đã chào giá|HĐ ký kết)[^:]*:\s*([\d.,]+)\s*đ', re.I)


def s(v):
    if v is None:
        return ''
    if isinstance(v, datetime):
        return v.strftime('%Y-%m-%d')
    return str(v).strip()


def huy(v: str) -> str:
    return 'Huỷ' if v == 'Hủy' else v


def main(src: str) -> None:
    wb = openpyxl.load_workbook(src, data_only=True)
    ws = wb['TỔNG QUÁT']
    out = []
    for r in ws.iter_rows(min_row=3, values_only=True):
        d = {k: s(v) for k, v in zip(COLS, r)}
        if not d['ten']:
            continue
        lh = d.pop('lienHe')
        emails = EMAIL.findall(lh)
        phone = EMAIL.sub('', lh)
        phone = re.sub(r'(?i)\bemail\s*:?', '', phone)
        phone = re.sub(r'\s*\|\s*(\|\s*)*', ' | ', phone).strip(' |,;')
        d['email'] = '; '.join(emails)
        d['dienThoai'] = phone
        if d['nguoiLienHe'].lower() in RAC_LIEN_HE:
            d['nguoiLienHe'] = ''
        d['tiepCan'] = huy(d['tiepCan'])
        d['coHoi'] = huy(d['coHoi'])
        m = GIA_TRI.search(d['ghiChuCS'])
        if m:
            d['giaTri'] = int(re.sub(r'[.,]', '', m.group(1)))
        d.pop('stt')
        out.append({k: v for k, v in d.items() if v not in ('', None)})

    body = json.dumps(out, ensure_ascii=False, indent=1)
    ts = (
        '/**\n'
        ' * Data khách hàng Kinh doanh — trích từ tai_lieu/du_lieu_thuc_te/File_theo_doi_khach_hang_Kinh_doanh.xlsx\n'
        ' * (sheet "TỔNG QUÁT"). Tệp sinh tự động bằng scripts/gen-seed-kh.py — không sửa tay.\n'
        ' * core/seed.ts ghép dữ liệu này vào danh mục khách hàng (ghepDataKH).\n'
        ' */\n'
        'export interface RawKhCrm {\n'
        '  ten: string;\n'
        '  mst?: string;\n'
        '  diaChi?: string;\n'
        '  tinh?: string;\n'
        '  nguoiLienHe?: string;\n'
        '  dienThoai?: string;\n'
        '  email?: string;\n'
        '  chucVu?: string;\n'
        '  phanLoai?: string;\n'
        '  nguon?: string;\n'
        '  loaiSP?: string;\n'
        '  hinhThucHD?: string;\n'
        '  tiepCan?: string;\n'
        '  coHoi?: string;\n'
        '  phuTrach?: string;\n'
        '  trangThaiData?: string;\n'
        '  ngayTiepNhan?: string;\n'
        '  ngayPhanBo?: string;\n'
        '  ghiChuCS?: string;\n'
        '  giaTri?: number;\n'
        '}\n\n'
        f'export const RAW_KH_CRM: RawKhCrm[] = {body};\n'
    )
    dst = Path(__file__).resolve().parent.parent / 'src' / 'app' / 'core' / 'seed-kh.ts'
    dst.write_text(ts, encoding='utf-8', newline='\n')
    print(f'{len(out)} khách hàng → {dst}')


if __name__ == '__main__':
    main(sys.argv[1])
