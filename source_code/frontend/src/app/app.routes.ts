import { Routes } from '@angular/router';
import { guestGuard, permGuard, signedInGuard } from './core/guard';
import { unsavedGuard } from './shared/unsaved';

const T = (s: string) => `${s} · Oxy Mecie`;

export const routes: Routes = [
  { path: 'dang-nhap', title: T('Đăng nhập'), canActivate: [guestGuard], loadComponent: () => import('./login').then((m) => m.Login) },
  {
    path: '',
    canActivate: [signedInGuard],
    loadComponent: () => import('./shell').then((m) => m.Shell),
    // Mọi màn con: rời màn khi còn thay đổi chưa lưu thì hỏi (NT-05).
    children: ([
      { path: '', title: T('Trang chủ'), loadComponent: () => import('./home/dashboard').then((m) => m.Dashboard) },
      {
        path: 'hop-dong-ban',
        title: T('Hợp đồng bán'),
        canActivate: [permGuard('hdb')],
        loadComponent: () => import('./hdb/hdb-list').then((m) => m.HdbList),
      },
      {
        path: 'hop-dong-ban/:id',
        title: T('Hợp đồng bán'),
        canActivate: [permGuard('hdb')],
        loadComponent: () => import('./hdb/hdb-detail').then((m) => m.HdbDetail),
      },
      {
        path: 'hop-dong-mua',
        title: T('Hợp đồng mua'),
        canActivate: [permGuard('hdm')],
        loadComponent: () => import('./hdm/hdm-list').then((m) => m.HdmList),
      },
      {
        path: 'hop-dong-mua/:id',
        title: T('Hợp đồng mua'),
        canActivate: [permGuard('hdm')],
        loadComponent: () => import('./hdm/hdm-detail').then((m) => m.HdmDetail),
      },
      { path: 'kho', title: T('Kho'), canActivate: [permGuard('khoTon')], loadComponent: () => import('./kho/kho').then((m) => m.KhoPage) },
      {
        path: 'ke-toan',
        title: T('Kế toán'),
        canActivate: [permGuard('soQuy', 'congNo', 'cpHD', 'nguonTien')],
        loadComponent: () => import('./ke-toan/ke-toan').then((m) => m.KeToanPage),
      },
      {
        path: 'phu-tai',
        title: T('Phú Tài'),
        canActivate: [permGuard('phuTai')],
        loadComponent: () => import('./phu-tai/pt-list').then((m) => m.PtList),
      },
      {
        path: 'phu-tai/:id',
        title: T('HĐ Phú Tài'),
        canActivate: [permGuard('phuTai')],
        loadComponent: () => import('./phu-tai/pt-detail').then((m) => m.PtDetail),
      },
      { path: 'bao-cao', title: T('Báo cáo'), canActivate: [permGuard('baoCao')], loadComponent: () => import('./bao-cao/bao-cao').then((m) => m.BaoCaoPage) },
      {
        path: 'danh-muc',
        title: T('Danh mục'),
        canActivate: [permGuard('khachHang', 'ncc', 'nguonTien')],
        loadComponent: () => import('./danh-muc/danh-muc').then((m) => m.DanhMucPage),
      },
      {
        path: 'duyet-xoa',
        title: T('Duyệt xoá'),
        canActivate: [permGuard('duyetXoa', 'duyetXoaKT')],
        loadComponent: () => import('./he-thong/duyet-xoa').then((m) => m.DuyetXoaPage),
      },
      {
        path: 'tai-khoan',
        title: T('Tài khoản & phân quyền'),
        canActivate: [permGuard('taiKhoan')],
        loadComponent: () => import('./he-thong/tai-khoan').then((m) => m.TaiKhoanPage),
      },
      {
        path: 'cau-hinh',
        title: T('Cấu hình & Import'),
        canActivate: [permGuard('cauHinh', 'import')],
        loadComponent: () => import('./he-thong/cau-hinh').then((m) => m.CauHinhPage),
      },
    ] as Routes).map((r) => ({ ...r, canDeactivate: [unsavedGuard] })),
  },
  { path: '**', redirectTo: '' },
];
