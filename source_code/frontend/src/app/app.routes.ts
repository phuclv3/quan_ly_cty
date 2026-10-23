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
      { path: 'viec', title: T('Việc được giao'), canActivate: [permGuard('viec')], loadComponent: () => import('./viec/viec').then((m) => m.ViecPage) },
      {
        path: 'khach-hang',
        title: T('Khách hàng'),
        canActivate: [permGuard('khachHang')],
        loadComponent: () => import('./khach-hang/kh-list').then((m) => m.KhList),
      },
      // Thêm khách hàng là popup ở danh sách — giữ đường dẫn cũ.
      { path: 'khach-hang/moi', redirectTo: '/khach-hang?them=1' },
      {
        path: 'khach-hang/:id',
        title: T('Khách hàng'),
        canActivate: [permGuard('khachHang')],
        loadComponent: () => import('./khach-hang/kh-detail').then((m) => m.KhDetail),
      },
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
        path: 'nha-cung-cap',
        title: T('Nhà cung cấp'),
        canActivate: [permGuard('ncc')],
        loadComponent: () => import('./danh-muc/danh-muc').then((m) => m.NccPage),
      },
      // Loại chi phí là tab trong Kế toán — giữ đường dẫn cũ.
      { path: 'loai-chi-phi', redirectTo: '/ke-toan?tab=lcp' },
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
      { path: 'in-tem', title: T('In tem bình khí'), canActivate: [permGuard('inTem')], loadComponent: () => import('./kho/in-tem').then((m) => m.InTemPage) },
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
      // Danh mục cũ đã tách vào menu Kinh doanh — giữ đường dẫn cũ (bookmark, ?tab=) chuyển sang màn mới.
      {
        path: 'danh-muc',
        redirectTo: ({ queryParams }) => (queryParams['tab'] === 'lcp' ? '/ke-toan?tab=lcp' : queryParams['tab'] === 'kh' ? '/khach-hang' : '/nha-cung-cap'),
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
        title: T('Cấu hình'),
        canActivate: [permGuard('cauHinh')],
        loadComponent: () => import('./he-thong/cau-hinh').then((m) => m.CauHinhPage),
      },
    ] as Routes).map((r) => ({ ...r, canDeactivate: [unsavedGuard] })),
  },
  { path: '**', redirectTo: '' },
];
