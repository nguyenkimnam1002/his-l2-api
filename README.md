# HIS L2 API Portal

Cổng tích hợp Node.js bọc RestService HIS, hỗ trợ API request/response, job theo lịch và đẩy dữ liệu sang API khác.

Kiến trúc và hướng dẫn mở rộng:

- [Kiến trúc operation](./docs/ARCHITECTURE.md)
- [Thêm API hoặc job mới](./docs/ADDING_OPERATION.md)

## Mô hình API và operation

Dự án coi mỗi API, job hoặc luồng đồng bộ là một `operation` độc lập. Một operation gồm:

- `definition`: metadata, trạng thái, trigger, cách thực thi và cách phân phối kết quả.
- `execute(context)`: validate đầu vào, chạy `ctl_sql`, biến đổi dữ liệu và trả kết quả.

Catalog chỉ hiển thị metadata công khai. SQL ID, URL đích, tài khoản và API Key không được trả ra catalog public.

### 1. Request response API

Operation chỉ chạy khi client gửi HTTP request:

```text
Postman/phần mềm đối tác
          │
          ▼
     HTTP endpoint
          │
          ▼
   operation.execute()
          │
          ▼
   RestService → ctl_sql
          │
          ▼
      JSON response
```

Khai báo:

```js
trigger: {
  type: 'http',
  method: 'POST',
  path: '/api/v1/ten-api'
},
delivery: {
  type: 'http-response'
}
```

Hai module `pto-01` và `kham-benh-ngay` hiện sử dụng mô hình này.

### 2. Scheduled job

Operation tự chạy theo lịch, không cần client gửi request:

```text
Cron/systemd timer
        │
        ▼
scheduled-runner
        │
        ▼
operation.execute()
        │
        ▼
RestService → ctl_sql → xử lý/lưu kết quả
```

Khai báo:

```js
trigger: {
  type: 'schedule',
  cron: '0 1 * * *',
  timezone: 'Asia/Bangkok'
},
delivery: {
  type: 'none'
}
```

Trên một VPS có thể dùng Linux cron hoặc `systemd timer`. Khi cần retry, nhiều worker và quản lý hàng đợi lớn, có thể bổ sung BullMQ/Redis như một adapter hạ tầng.

### 3. Scheduled outbound push

Job chạy theo lịch, đọc dữ liệu HIS rồi chủ động đẩy sang API của hệ thống khác:

```text
Scheduler
    │
    ▼
operation.execute() → RestService → ctl_sql
    │
    ▼
Map dữ liệu theo payload đối tác
    │
    ▼
RestPushClient → API đối tác
```

Khai báo:

```js
trigger: {
  type: 'schedule',
  cron: '0 1 * * *',
  timezone: 'Asia/Bangkok'
},
delivery: {
  type: 'rest-push',
  target: 'dashboard-tiep-don'
}
```

`target` chỉ là tên logic. URL và API Key thật phải lấy từ biến môi trường, không ghi trực tiếp trong module:

```js
outboundTargets: {
  'dashboard-tiep-don': {
    url: process.env.DASHBOARD_TIEP_DON_URL,
    apiKey: process.env.DASHBOARD_TIEP_DON_API_KEY
  }
}
```

## Cấu trúc thư mục

```text
his_l2_api/
├── ctl_sql/                         Câu SQL tham khảo để tạo trên HIS
├── docs/                            Tài liệu kiến trúc và mở rộng
├── public/                          Giao diện documentation
├── src/
│   ├── clients/
│   │   └── his-rest-client.js       Client gọi RestService HIS
│   ├── config/
│   │   └── index.js                 Đọc cấu hình và biến môi trường
│   ├── integrations/
│   │   └── outbound/
│   │       └── rest-push-client.js  Client đẩy JSON sang API khác
│   ├── jobs/
│   │   └── scheduled-runner.js      Runner cho operation chạy lịch
│   ├── modules/                     Mỗi nghiệp vụ nằm trong một thư mục
│   │   ├── pto-01/
│   │   │   └── index.js
│   │   └── kham-benh-ngay/
│   │       └── index.js
│   ├── registry/
│   │   └── operations.js            Đăng ký và tìm operation
│   ├── runtime/
│   │   └── operation-runner.js      Thực thi operation và delivery
│   ├── shared/                       Error, date và tiện ích dùng chung
│   ├── templates/                    Mẫu tạo API/job mới
│   ├── app.js                        HTTP shell, admin local, static files
│   └── server.js                     Điểm khởi động Node.js
├── test/                             Automated tests
└── README.md
```

Luồng phụ thuộc thống nhất:

```text
HTTP/jobs → registry → module → HIS client/outbound integration
```

Quy ước:

- `src/app.js` không chứa SQL ID hoặc logic riêng của từng API.
- Mỗi module tự validate input và map tham số `[0]`, `[1]` cho `ctl_sql`.
- Module nhận dependency qua `context`, không tự đọc API Key từ `process.env`.
- Registry không chứa mật khẩu, API Key hoặc URL bí mật.
- Client HIS không phụ thuộc vào route public.
- `src/catalog.js` chỉ là lớp tương thích cho code cũ; không thêm API mới tại đây.

## Cách thêm operation mới

### Thêm request response API

1. Sao chép `src/templates/request-response.operation.js.example`.
2. Tạo thư mục `src/modules/<operation-id>/index.js`.
3. Khai báo `id`, tên, route HTTP, trạng thái và `execution.ctlSql`.
4. Viết validation, map tham số `ctl_sql` và dữ liệu trả về trong `execute()`.
5. Import module và thêm vào mảng `operations` tại `src/registry/operations.js`.
6. Thêm test cho API key, input sai, input đúng và mapping tham số.
7. Chạy `node --test` rồi khởi động lại server.

Ví dụ tối thiểu:

```js
const { AppError } = require('../../shared/app-error');

const definition = {
  id: 'ten-api',
  name: 'Tên API',
  summary: 'Mô tả ngắn.',
  type: 'Dữ liệu HIS',
  status: 'Đang hoạt động',
  version: 'v1',
  protocol: 'REST',
  auth: 'API Key',
  trigger: {
    type: 'http',
    method: 'POST',
    path: '/api/v1/ten-api'
  },
  execution: {
    type: 'his-ctl-sql',
    ctlSql: 'SQL_ID_NOI_BO',
    namedColumns: true
  },
  delivery: { type: 'http-response' },
  fields: [
    { name: 'thamSo', type: 'string', required: true, description: 'Mô tả.' }
  ],
  sampleBody: { thamSo: 'gia-tri-mau' }
};

async function execute({ body, hisClient }) {
  const value = String(body.thamSo ?? '').trim();
  if (!value) throw new AppError('INVALID_INPUT', 'Thiếu thamSo', 400);

  const data = await hisClient.executeCtlSqlO(
    definition.execution.ctlSql,
    [{ name: '[0]', value }]
  );
  return { data, meta: { count: data.length } };
}

module.exports = { definition, execute };
```

Đăng ký trong `src/registry/operations.js`:

```js
const tenApi = require('../modules/ten-api');

const operations = [pto01, khamBenhNgay, tenApi];
```

Không cần sửa `src/app.js` khi thêm một HTTP API thông thường.

### Thêm scheduled job hoặc outbound push

1. Sao chép `src/templates/scheduled-push.operation.js.example`.
2. Tạo module trong `src/modules/<operation-id>/index.js`.
3. Khai báo `trigger.type = 'schedule'`, cron và timezone.
4. Dùng `delivery.type = 'none'` nếu chỉ xử lý nội bộ.
5. Dùng `delivery.type = 'rest-push'` nếu đẩy sang hệ thống khác.
6. Đăng ký operation trong registry.
7. Cấu hình URL/API Key của target bằng biến môi trường.
8. Cho scheduler gọi `runScheduledOperation(id, context)`.
9. Viết test cho mapping payload, timeout, response lỗi và retry/idempotency.

Checklist bắt buộc trước khi merge code outsource:

- ID và HTTP route không trùng.
- Không cho client truyền tùy ý SQL ID.
- Input được validate và giới hạn độ dài/khoảng ngày.
- Không nối trực tiếp input vào SQL text.
- Không trả SQL ID, UUID HIS hoặc lỗi upstream chi tiết ra client.
- API Key chỉ đi trong header, không nằm trong URL hoặc log.
- Outbound call có timeout.
- Job có batch key/idempotency nếu có thể chạy lại.
- Không ghi toàn bộ dữ liệu bệnh án vào log.
- Toàn bộ test chạy thành công.

## Chạy local

Trên Windows, nhấp đúp `start-server.bat` để chạy server nền và `stop-server.bat` để dừng đúng tiến trình do file start tạo ra. Server dùng cổng trong `PORT`/`config.json` (mặc định `8090`). Restart sẽ xóa phiên HIS đang giữ trong RAM; cần đăng nhập HIS lại nếu không cấu hình tự đăng nhập. Nếu cổng đang có ứng dụng khác dùng, file start sẽ báo lỗi và không dừng ứng dụng đó.

Yêu cầu Node.js 18 trở lên. Không cần cài package ngoài.

```powershell
$env:HIS_USERNAME='tai-khoan-his'
$env:HIS_PASSWORD='mat-khau-his'
$env:API_KEYS='api-key-cap-cho-doi-tac'
npm start
```

Mở `http://localhost:8090`. Có thể copy `config.example.json` thành `config.json` để đổi URL/port/API key; không lưu tài khoản HIS vào file này.

Nếu không đặt `HIS_USERNAME/HIS_PASSWORD`, bấm **Kết nối HIS** trên đầu trang, nhập tài khoản giống màn hình login của KIOS. Đăng nhập HIS không cần API key đối tác. Gateway không ghi mật khẩu ra tệp hay gửi lại cho trình duyệt.

API key đối tác nằm trong cột **API Key** của bảng API với nút **Hiện/Ẩn** và **Copy**. Mẫu Postman dùng key đó trong header `X-API-Key`. Đây là tiện ích cho giao diện local; endpoint đọc key và thao tác quản trị HIS chỉ chấp nhận request từ `localhost`/`127.0.0.1`, server mặc định chỉ lắng nghe `127.0.0.1`. Nếu mở cổng cho đối tác ở môi trường thật, phải cấp key riêng cho từng đơn vị và không công khai key trong trang tài liệu.

Sau khi đăng nhập qua giao diện, gateway giữ UUID, cookie và thông tin đăng nhập trong RAM để tự tái xác thực nếu HIS trả `Session is NULL`. Tải lại trang không làm mất phiên. Bấm **Đăng xuất** để xóa toàn bộ thông tin này. Khởi động lại Node.js sẽ mất phiên thủ công; để tự đăng nhập lại sau restart, dùng `HIS_USERNAME`/`HIS_PASSWORD` từ biến môi trường. Nên cấp tài khoản HIS riêng cho gateway để tránh nhiều nơi dùng cùng tài khoản và vô hiệu hóa phiên của nhau.

## Test bằng Postman

- Method: `POST`
- URL: `http://localhost:8090/api/v1/medical-records/pto-01`
- Header: `X-API-Key: <api-key>` và `Content-Type: application/json`
- Body raw JSON: `{ "hosobenhanid": "0" }`

Trong Postman, chọn **Body → raw → JSON**, nhập `{ "hosobenhanid": "959598" }`; để tab **Params** trống và không nối `?hosobenhanid=...` vào URL. Có thể bấm **Tải Postman collection** trong chi tiết API rồi dùng **Import** của Postman; collection đã đặt đúng method, URL, header và raw JSON body.

Gateway đăng nhập RestService bằng `doLogin`, giữ UUID trong RAM rồi gọi:

```json
{
  "func": "ajaxExecuteQuery",
  "uuid": "<server-session>",
  "params": ["", "PTO_01"],
  "options": [{ "name": "[0]", "value": "0" }]
}
```

## Nguyên tắc mở thêm API

Không cho client truyền tùy ý `sqlId`. Mỗi route phải ánh xạ cố định tới một `ctl_sql`, validate từng tham số, giới hạn dữ liệu trả về, ghi audit và cấp API key riêng cho từng đơn vị. Mỗi chức năng nằm tại `src/modules/<operation-id>/index.js` và được đăng ký trong `src/registry/operations.js`; API mới thông thường không cần sửa router HTTP. Xem thêm [PHUONG_AN.md](./PHUONG_AN.md).

## Báo cáo danh sách khám bệnh theo ngày

Tạo bản ghi trong màn hình `ctl_sql` HIS với **SQL ID đúng bằng `execution.ctlSql` trong module `src/modules/kham-benh-ngay/index.js`** (hiện là `API_DS_KBH_NGAY`). Dán phần câu `SELECT` từ [ctl_sql/API_NGT902_DS_KHAMBENH_NGAY.sql](./ctl_sql/API_NGT902_DS_KHAMBENH_NGAY.sql) vào **SQL Text** (không lấy các dòng comment đầu file, không thêm dấu `;`). SQL giữ `[SCH]` cho schema và `[UID]` cho CSYTID theo phiên HIS; chỉ có `[0]` là từ ngày và `[1]` là đến ngày. Các bộ lọc khoa, phòng, trạng thái, duyệt kế toán và duyệt thuốc đã bỏ, nhưng các điều kiện join/nghiệp vụ cố định của thủ tục vẫn giữ.

Khi đổi tên `ctl_sql` bên HIS, chỉ sửa `execution.ctlSql` trong module tương ứng và khởi động lại Node.js. Không cần đổi route, URL Postman hay cấu trúc Body. Tên file SQL trên là tên tài liệu nguồn, không phải SQL ID bắt buộc.

Trong Postman:

- Method: `POST`
- URL: `http://localhost:8090/api/v1/reports/kham-benh-ngay`
- Header: `X-API-Key: <api-key>` và `Content-Type: application/json`
- Body **raw → JSON**:

```json
{"tuNgay":"15/09/2026","denNgay":"15/09/2026"}
```

Gateway sẽ gọi `ajaxExecuteQueryO` để mỗi dòng trong `data` có tên trường như `MABENHNHAN`, `TENBENHNHAN`, `KHOA`, `PHONG`, `BACSY`, `TGDANGKY`, `TGBDKHAM`, `TGKTKHAM`, `DUYETKT`, `DUYETDT`, `DVKT`, `DONTHUOC`. Endpoint chỉ chạy dữ liệu thật sau khi SQL ID trên đã được tạo trong HIS.
