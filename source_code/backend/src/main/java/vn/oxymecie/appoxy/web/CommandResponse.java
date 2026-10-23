package vn.oxymecie.appoxy.web;

import vn.oxymecie.appoxy.state.ChangeSet;

/**
 * Phản hồi của mọi lệnh ghi.
 *
 * @param message cảnh báo không chặn (VD "Không tự duyệt phiếu của mình: TC26-0003") — null khi không có
 * @param data    bản ghi chính vừa tạo / sửa (nếu có)
 * @param changes các bản ghi đã đổi để client cập nhật dữ liệu đang giữ
 */
public record CommandResponse<T>(String message, T data, ChangeSet changes) {}
