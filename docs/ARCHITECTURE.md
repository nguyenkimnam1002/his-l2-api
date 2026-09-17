# Kiến trúc HIS L2 API

## Mục tiêu

Mỗi chức năng tích hợp là một `operation` độc lập. Catalog chỉ phục vụ hiển thị; logic chạy không đặt trong catalog và bí mật không được ghi trong module.

## Cấu trúc

```text
src/
  clients/                  Client gọi hệ thống HIS
  config/                   Đọc biến môi trường
  integrations/outbound/    Client đẩy dữ liệu sang hệ thống khác
  jobs/                     Runner cho operation chạy lịch
  modules/                  Một thư mục cho mỗi operation nghiệp vụ
    pto-01/
      index.js
    kham-benh-ngay/
      index.js
  registry/                 Đăng ký và tra cứu operation
  runtime/                  Thực thi operation và delivery
  shared/                   Error, date và tiện ích dùng chung
  templates/                Mẫu cho người phát triển API/job mới
  app.js                    HTTP shell, admin local, static files
  server.js                 Điểm khởi động process
```

## Hợp đồng operation

Mỗi module export hai thành phần:

```js
module.exports = { definition, execute };
```

`definition` mô tả operation:

- `trigger.type = http`: chỉ chạy khi nhận HTTP request.
- `trigger.type = schedule`: scheduler gọi theo `cron` và `timezone`.
- `execution`: cách lấy/xử lý dữ liệu; SQL ID nội bộ đặt tại đây.
- `delivery.type = http-response`: trả kết quả cho caller.
- `delivery.type = rest-push`: đẩy kết quả tới outbound target.
- `status`: `Đang hoạt động`, `Tạm dừng` hoặc `Đã hủy`.

`execute(context)` chỉ làm nghiệp vụ: validate input, chạy ctl_sql, map dữ liệu và trả object kết quả.

## Ba kiểu vận hành

### Request response

```text
Postman -> HTTP route -> execute -> HIS ctl_sql -> HTTP response
```

Hai module hiện tại thuộc kiểu này.

### Scheduled job

```text
Scheduler -> scheduled-runner -> execute -> HIS ctl_sql -> lưu/hoàn tất
```

Cron engine là adapter hạ tầng. Có thể dùng cron của Linux cho một server, hoặc BullMQ/queue khi cần retry, nhiều worker và theo dõi lịch sử.

### Scheduled outbound push

```text
Scheduler -> execute -> HIS ctl_sql -> map payload -> RestPushClient -> API đối tác
```

URL và API Key của đối tác phải lấy từ biến môi trường/config bảo mật, không ghi trong `definition` và không trả qua `/api/catalog`.

## Quy tắc phụ thuộc

```text
HTTP/jobs -> registry -> module -> client/integration
```

- Module không import giao diện web.
- Module không đọc trực tiếp `process.env`; nhận dependency qua `context`.
- Registry không chứa mật khẩu, API Key hoặc URL bí mật.
- `app.js` không chứa SQL ID hay validation riêng của từng API.
- Client HIS không biết endpoint public nào đang sử dụng nó.

## Khả năng tương thích

`src/catalog.js`, `src/config.js` và `src/his-client.js` vẫn tồn tại để code/test cũ tiếp tục chạy. Code mới nên dùng registry, `src/config/index.js` và `src/clients/his-rest-client.js`.
