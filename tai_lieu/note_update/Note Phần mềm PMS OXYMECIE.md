**Note Phần mềm PMS OXYMECIE**

![](data:image/png;base64...)

=> Nhập MST thì tự động tìm được ra tên công ty, địa chỉ theo trang Mã số thuế. Trường MST là bắt buộc phải nhập

![](data:image/png;base64...)

**-> Có 2 TH:**

+ Hợp đồng có tạm ứng. Ngày hiệu lực = Ngày thanh toán Lần 1

+ Hợp đồng không có tạm ứng. Ngày hiệu lực = Ngày ký Hợp đồng

-> Ngày hiệu lực không nhập tay mà auto điền theo Ngày thanh toán Lần 1/Ngày ký Hợp đồng

-> Ko nhập được trường Mã số thuế nên phải quay lại Khách hàng để sửa -> Mặc định MST là \* và tự động lấy được địa chỉ thuế của Khách hàng

![](data:image/png;base64...)

-> Thiếu mất phần lựa chọn sản phẩm và giá từ Kho.

Ví dụ nhập sản phẩm: KC-NO-8L, đơn giá trước thuế 13.000.000, số lượng 1

-> Thành tiền trước thuế, thuế VAT, Giá sau thuế,…

-> Check được xem trạng thái của sản phẩm trong Kho. Ví dụ nếu nhập liệu xong mà sản phẩm có trong KHO thì sẽ cảnh báo xanh, không có trong KHO thì sẽ chuyển đỏ sang trạng thái cần mua hàng -> Gửi yêu cầu sang và tạo lệnh để Mua.

![](data:image/png;base64...)

-> Công thức này bổ sung theo mẫu tờ trình dưới đây *(Mẫu tờ trình đính kèm, xuất được ra file pdf để sau này lưu theo dõi và tính được chi phí của Hợp đồng)*

![](data:image/png;base64...)

![](data:image/png;base64...)

-> Hạn thanh toán này điền tay thì dễ bị sai. Để lựa chọn ví dụ 5/10/20/30 ngày kể từ ngày HĐ có hiệu lực. Ngày thực thu đang không nhập được.

![](data:image/png;base64...)

Giao hàng thì phải liên quan đến KHO

Nếu hàng có trong KHO -> phiếu xuất kho -> Giao hàng -> Ngày giao hàng

Nếu hàng không có trong KHO -> Phiếu đề nghị cấp vật tư -> Mua hàng -> Nhập hàng vào kho -> Giao hàng -> Ngày giao hàng

![](data:image/png;base64...)

-> Phải có yêu cầu cấp vật tư thì mới chuyển HĐ mua được nên cần có sự link với nhau ở đây. 1 Hợp đồng Mua có thể mua cho 1 HĐ bán hoặc nhiều Hợp đồng Bán khác nhau.

![](data:image/png;base64...)

Chưa nhập được hàng

![](data:image/png;base64...)

Nhập kho phải có đơn giá tiền sản phẩm

![](data:image/png;base64...)

-> File excel phân loại danh mục hàng

Phần thanh toán của Hợp đồng: Giá trị 100% nhưng khi quyết toán thì phát sinh phạt Hợp đồng nên giá trị quyết toán khác giá trị Hợp đồng

Liệt kê các việc đã giao (chưa hoàn thành và hoàn thành)

Bổ sung check kho khi làm báo giá chờ Hợp đồng

Bổ sung chức năng kiểm kê tại kho để đưa vào giá trị
Bổ sung chức năng chọn các đề nghị mua khác để đưa vào Hợp đồng mua