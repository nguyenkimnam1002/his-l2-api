# Phương án cổng chia sẻ API HIS

## Luồng đã đối chiếu từ kios-standalone

1. Angular gọi RestService qua proxy Node.js để tránh CORS.
2. Đăng nhập: `doLogin` với `params: ["{?=call prc_login(?2S,?3S)}", username, password]`.
3. Server trả UUID phiên; các lệnh sau dùng UUID này.
4. Đọc `ctl_sql`: `ajaxExecuteQuery`, `params: ["", sqlId]`, `options: [{name:"[0]", value:"..."}]`.
5. `PTO_01` nhận `[0]` là `HOSOBENHANID` và trả thông tin hồ sơ/bệnh nhân/chẩn đoán ra viện.

## Kiến trúc đề xuất

`Phần mềm đối tác → API key/rate limit → route API được whitelist → adapter RestService → ctl_sql → chuẩn hóa JSON → audit log`

- Portal tài liệu chỉ đọc catalog API và tạo mẫu Postman.
- Gateway giữ tài khoản/UUID HIS phía server; tuyệt đối không gửi cho trình duyệt hay đối tác.
- Một endpoint nghiệp vụ ánh xạ cố định tới một `ctl_sql`; không mở endpoint “chạy SQL ID bất kỳ”.
- Mỗi tham số được validate/giới hạn trước khi thay `[0]`, `[1]`...
- Giai đoạn production cần HTTPS, API key băm trong kho bí mật, rate limit, allowlist IP, audit không chứa dữ liệu nhạy cảm và chính sách phân quyền theo đơn vị.

## Lộ trình

1. MVP hiện tại: catalog, documentation, Postman example, API key, `PTO_01`, health check, test mock.
2. Pilot: quản trị API key, audit log, quota, OpenAPI 3.1, sandbox data, chuẩn lỗi thống nhất.
3. Production: reverse proxy/WAF, secret manager, HA, theo dõi SLA, thu hồi khóa, phê duyệt từng trường dữ liệu và kiểm thử tải/bảo mật.

Trong môi trường local, `rejectUnauthorized=false` tương ứng với `secure:false` của proxy trong bản `kios-standalone`, nhằm hỗ trợ chuỗi chứng thư nội bộ của RestService. Khi triển khai production phải cài đúng CA và bật `HIS_TLS_VERIFY=true`.

## Test HIS thật

Có thể đặt `HIS_USERNAME`/`HIS_PASSWORD` cho tiến trình Node.js hoặc đăng nhập một lần qua nút **Kết nối** trên portal, sau đó dùng một `HOSOBENHANID` có dữ liệu. Ảnh kiosk chỉ cho thấy tên tài khoản và UUID nằm trong sessionStorage của trình duyệt; hệ thống mới không đọc hoặc sao chép session đó để tránh rò rỉ phiên đăng nhập.
