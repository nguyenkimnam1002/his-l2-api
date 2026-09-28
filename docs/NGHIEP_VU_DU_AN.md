# Nghiệp vụ và hướng dẫn phát triển HIS L2 API

## 1. Mục đích tài liệu

Tài liệu này dành cho lập trình viên tiếp tục phát triển HIS L2 API. Nội dung mô tả:

- Mô hình kết nối nhiều bệnh viện.
- Quy tắc bảo mật và phân vùng dữ liệu.
- Các khóa nghiệp vụ quan trọng trong HIS.
- Nghiệp vụ của các API hiện có.
- Quy ước xây dựng `ctl_sql`.
- Cấu trúc một module API mới.
- Quy trình kiểm thử và checklist trước khi triển khai.

Đây là tài liệu nội bộ. Không gửi phần tên bảng, SQL ID, câu truy vấn hoặc cấu hình backend cho khách hàng.

## 2. Mục tiêu hệ thống

HIS L2 API là lớp trung gian để khách hàng khai thác dữ liệu HIS qua REST/JSON mà không cần truy cập trực tiếp cơ sở dữ liệu.

Luồng tổng quát:

```text
Khách hàng
  -> Xác thực bằng X-API-Key
  -> Đăng nhập HIS bằng domain + tài khoản + mật khẩu
  -> Nhận connectionId tạm thời
  -> Gọi API nghiệp vụ bằng X-API-Key + connectionId
  -> Hệ thống thực thi ctl_sql trong đúng phiên HIS
  -> Trả dữ liệu của đúng bệnh viện đã đăng nhập
```

Hệ thống phải đáp ứng các nguyên tắc:

1. Một domain có thể phục vụ nhiều bệnh viện.
2. Bệnh viện không được xác định chỉ bằng domain hoặc tên tài khoản.
3. `hospitalId` phải lấy từ phiên đăng nhập HIS thành công.
4. Truy vấn HIS phải sử dụng chính phiên của tài khoản đã tạo connection.
5. Không được dùng chung connection giữa các API key.
6. Không trả SQL ID, UUID phiên HIS, stack trace hoặc lỗi truy vấn chi tiết ra ngoài.

## 3. Mô hình bệnh viện, domain và phiên kết nối

### 3.1. Domain không phải mã bệnh viện

Ví dụ `bvvinhphuc.vncare.vn` có thể được nhiều đơn vị sử dụng. Hai tài khoản cùng đăng nhập một domain nhưng có thể thuộc hai bệnh viện khác nhau.

Vì vậy:

- Không ánh xạ cố định `domain -> hospitalId`.
- Không đặt mã logic như `PHUCYEN`, `YHCT` hoặc `SANNHI` làm định danh bệnh viện.
- Sử dụng mã cơ sở y tế thực tế do HIS trả về, ví dụ `26030`.
- `[HID]` trong `ctl_sql` phải được HIS thay thế theo phiên đăng nhập hiện tại.

### 3.2. Endpoint tạo connection

```http
POST /api/v1/connections
X-API-Key: <API_KEY>
Content-Type: application/json
```

```json
{
  "domain": "benhvienphucyen.vncare.vn",
  "username": "<TAI_KHOAN_HIS>",
  "password": "<MAT_KHAU_HIS>"
}
```

Sau khi HIS xác thực thành công, hệ thống lưu trong bộ nhớ:

- Hash của `connectionId`.
- Hash của API key sở hữu connection.
- Domain đã được kiểm tra an toàn.
- `hospitalId` lấy từ phiên HIS.
- Tên tài khoản và người dùng HIS.
- HIS client cùng cookie/UUID phiên đăng nhập.
- Thời điểm tạo, lần sử dụng cuối và thời điểm hết hạn.

Mật khẩu chỉ dùng để đăng nhập và tự đăng nhập lại khi phiên HIS hết hạn. Không trả mật khẩu ra response và không ghi vào log.

### 3.3. Vòng đời connection

Mặc định hiện tại:

- Thời hạn tuyệt đối: 8 giờ.
- Hết hạn khi không hoạt động: 2 giờ.
- Connection bị xóa khi hết hạn hoặc khi gọi `DELETE /api/v1/connections/current`.
- Connection chỉ hợp lệ với API key đã tạo ra nó.
- Khi tiến trình Node.js khởi động lại, các connection lưu trong bộ nhớ bị mất.

Mọi API nghiệp vụ cần hai header:

```http
X-API-Key: <API_KEY>
X-HIS-Connection-Id: <CONNECTION_ID>
```

### 3.4. An toàn domain

Domain đầu vào phải:

- Là hostname hợp lệ, không nhận cả URL có path.
- Thuộc hậu tố được cho phép, mặc định `.vncare.vn`.
- Không phân giải về loopback, private IP hoặc địa chỉ nội bộ.
- Được chuyển thành RestService theo quy tắc tập trung trong `src/security/domain-policy.js`.

Không cho module nghiệp vụ tự ghép URL RestService.

## 4. Các khóa nghiệp vụ quan trọng

| Khóa | Ý nghĩa | Cách sử dụng |
|---|---|---|
| `hospitalId` / `[HID]` | Mã cơ sở y tế của phiên HIS | Phân vùng dữ liệu theo bệnh viện |
| `BENHNHANID` | ID nội bộ của người bệnh | Liên kết dữ liệu người bệnh trong một HIS |
| `MABENHNHAN` | Mã bệnh nhân hiển thị | Đối chiếu nghiệp vụ, không thay thế ID nội bộ |
| `TIEPNHANID` | Một lần người bệnh được tiếp nhận | Một tiếp nhận có thể phát sinh nhiều lần khám/điều trị |
| `KHAMBENHID` | Một lần khám hoặc điều trị | Khóa đầu vào để lấy dịch vụ chỉ định |
| `HOSOBENHANID` | ID hồ sơ bệnh án | Khóa tra cứu hồ sơ và dữ liệu ra viện |
| `MAHOSOBENHAN` | Mã hồ sơ bệnh án hiển thị | Dùng đối chiếu báo cáo/nghiệp vụ |
| `MAUBENHPHAMID` | ID phiếu chỉ định/bệnh phẩm | Gom các dòng dịch vụ cùng một phiếu |
| `DICHVUKHAMBENHID` | ID dòng dịch vụ đã chỉ định | Khóa chi tiết của từng dịch vụ phát sinh |
| `DICHVUID` | ID danh mục dịch vụ | Liên kết với danh mục dịch vụ nội bộ |
| `MADICHVU` | Mã dịch vụ | Đồng bộ và đối chiếu với API danh mục dịch vụ |
| `KHOAID`, `PHONGID` | ID khoa/phòng | Liên kết cơ cấu tổ chức, không dùng tên làm khóa |

Các ID chỉ có ý nghĩa trong phạm vi bệnh viện/phiên HIS tương ứng. Không ghép dữ liệu giữa hai bệnh viện chỉ vì ID có cùng giá trị.

## 5. Quan hệ nghiệp vụ chính

```text
Bệnh viện
  ├─ Khoa
  │   └─ Phòng
  └─ Bệnh nhân
      └─ Tiếp nhận (TIEPNHANID)
          ├─ Hồ sơ bệnh án (HOSOBENHANID)
          └─ Lần khám/điều trị (KHAMBENHID)
              └─ Phiếu chỉ định (MAUBENHPHAMID / SOPHIEU)
                  └─ Dòng dịch vụ (DICHVUKHAMBENHID)
```

Điểm cần nhớ:

- Một bệnh nhân có nhiều lần tiếp nhận.
- Một lần tiếp nhận có thể có nhiều `KHAMBENHID`.
- Không phải lần tiếp nhận nào cũng có phòng khám đăng ký.
- Trường hợp vào thẳng khoa có thể có khoa bắt đầu nhưng phòng bắt đầu rỗng.
- Một phiếu có nhiều dòng dịch vụ.
- Trạng thái phiếu và trạng thái từng dòng dịch vụ là hai khái niệm khác nhau.

## 6. Nghiệp vụ các API hiện có

### 6.1. Danh mục dịch vụ

```http
POST /api/v1/catalogs/dich-vu
```

Mục đích:

- Đồng bộ mã, tên và nhóm dịch vụ còn hiệu lực của bệnh viện.
- Làm danh mục chuẩn để đối chiếu `MADICHVU` trong dữ liệu chỉ định.
- Phân nhóm báo cáo như xét nghiệm, chẩn đoán hình ảnh và dịch vụ chuyên môn.

Quy tắc truy vấn:

- Bắt buộc lọc theo `[HID]`.
- Chỉ lấy dữ liệu chưa xóa.
- Loại bỏ nhóm không thuộc phạm vi dịch vụ cần công khai.
- Phải có đủ mã, tên và nhóm; thiếu một trong ba trường là lỗi dữ liệu upstream.

Quy tắc tích hợp:

- Dùng mã dịch vụ làm khóa đối chiếu, không dùng tên.
- Tên dịch vụ có thể được bệnh viện điều chỉnh.
- Danh mục có thể lưu đệm nhưng cần cơ chế đồng bộ lại.

### 6.2. Danh mục khoa

```http
POST /api/v1/catalogs/khoa
```

Mục đích:

- Trả các đơn vị cấp khoa trực thuộc bệnh viện.
- Cung cấp số giường kế hoạch và số giường thực kê.
- Dùng ánh xạ khoa trong báo cáo tiếp nhận, điều trị và quản trị công suất.

Quy tắc:

- Chỉ lấy tổ chức cấp khoa thuộc `[HID]`.
- Khoa vẫn được trả về khi chưa có cấu hình giường.
- Giá trị giường thiếu được quy về `0`.
- `GIUONGKEHOACH` là chỉ tiêu kế hoạch.
- `GIUONGTHUCKE` là số giường bố trí thực tế.
- Hai trường trên không phải số giường đang trống.

### 6.3. Danh mục phòng

```http
POST /api/v1/catalogs/phong
```

Mục đích:

- Trả các phòng đang hoạt động.
- Trả kèm khoa quản lý để hình thành quan hệ khoa - phòng.
- Dùng ánh xạ nơi tiếp nhận, khám hoặc thực hiện dịch vụ.

Quy tắc:

- Chỉ lấy tổ chức cấp phòng đang hoạt động.
- Phòng phải thuộc một khoa của đúng bệnh viện.
- Trả đồng thời ID, mã và tên của cả phòng và khoa.
- Không dùng `TENPHONG` làm khóa duy nhất vì tên phòng có thể trùng giữa các khoa.

### 6.4. Danh sách bệnh nhân tiếp đón theo ngày

```http
POST /api/v1/reports/benh-nhan-tiep-don-ngay
```

```json
{
  "ngaytiepnhan": "21/09/2026"
}
```

Mục đích:

- Lấy các lần tiếp nhận phát sinh trong đúng một ngày.
- Trả khóa tiếp nhận, lần khám/điều trị, người bệnh và hồ sơ bệnh án.
- Trả khoa/phòng bắt đầu của lần tiếp nhận.
- Cung cấp `KHAMBENHID` cho API dịch vụ chỉ định.

Quy tắc nghiệp vụ:

- Khoảng thời gian là từ `00:00:00` của ngày yêu cầu đến trước `00:00:00` ngày kế tiếp.
- Chỉ nhận một ngày, không cho chọn khoảng ngày để tránh truy vấn nặng.
- Lấy người bệnh từ lần tiếp nhận.
- Lấy `KHAMBENHID` và `LOAIBENHANID` từ lần khám/điều trị.
- `LOAIBENHANID = 23` được hiểu là ngoại trú.
- `LOAIBENHANID <> 23` có thể là nội trú hoặc điều trị ngoại trú tùy cấu hình HIS.
- Khoa/phòng bắt đầu lấy từ lần tiếp nhận, không suy ra từ phòng khám đăng ký.
- Phòng bắt đầu có thể rỗng nếu người bệnh được tiếp nhận trực tiếp vào khoa.

Không gộp dữ liệu theo tên bệnh nhân. Khi tổng hợp cần ưu tiên `TIEPNHANID`, `KHAMBENHID`, `BENHNHANID` và `HOSOBENHANID`.

### 6.5. Danh sách dịch vụ chỉ định

```http
POST /api/v1/clinical-services/chi-dinh
```

```json
{
  "khambenhid": "1334499"
}
```

API chỉ cần `khambenhid`. Không yêu cầu caller truyền `loaibenhanid` vì loại bệnh án được xác định từ dữ liệu HIS.

Kết quả được tách thành:

- `data.cls`: xét nghiệm, chẩn đoán hình ảnh, phẫu thuật/thủ thuật và chuyên khoa.
- `data.thuocVatTu`: thuốc và vật tư.

Phân loại hiện tại:

| Loại nhóm phiếu | `LOAIDICHVU` | Mảng response |
|---:|---|---|
| 1 | `XET_NGHIEM` | `cls` |
| 2 | `CDHA` | `cls` |
| 5 | `PTTT_CHUYEN_KHOA` | `cls` |
| 7 | `THUOC` | `thuocVatTu` |
| 8 | `VAT_TU` | `thuocVatTu` |

Khóa và đơn vị dữ liệu:

- Mỗi dòng response là một dịch vụ cụ thể.
- `MAUBENHPHAMID` và `SOPHIEU` nhận diện phiếu.
- `DICHVUKHAMBENHID` nhận diện dòng dịch vụ.
- `MADICHVU`, `TENDICHVU` mô tả dịch vụ.
- Khoa/phòng chỉ định là đơn vị phát hành chỉ định, không nhất thiết là nơi hoàn thành.

Các mốc thời gian:

- `NGAYCHIDINH`: thời điểm lập phiếu.
- `NGAYDUKIEN_THUCHIEN`: thời điểm dự kiến thực hiện.
- `NGAYLAYMAU`: thời điểm lấy mẫu, chủ yếu áp dụng xét nghiệm.
- `NGAYTHUCHIEN`: thời điểm thực hiện/sử dụng.
- `NGAYHOANTHANH`: thời điểm phiếu hoàn tất.

Trường ngày chưa phát sinh có thể rỗng. Không tự thay bằng ngày hiện tại hoặc ngày chỉ định.

Trạng thái:

- `TRANGTHAIDICHVU`, `TENTRANGTHAIDICHVU`: trạng thái từng dòng dịch vụ.
- `TRANGTHAIPHIEU`, `TENTRANGTHAIPHIEU`: trạng thái chung của phiếu.
- Một phiếu có thể chưa hoàn tất dù một số dịch vụ đã hoàn thành.

Thanh toán:

```text
THANHTIEN_CHITRA = SOLUONG * DON_GIA_CHITRA
```

Quy tắc nguồn thanh toán hiện tại:

1. Có `DICHVUID_ORG`: `BN_CHENH_LECH`.
2. `LOAIDOITUONG` thuộc `1, 2, 16`: `BHYT`.
3. `LOAIDOITUONG = 15`: `MIEN_PHI`.
4. Các trường hợp còn lại: `NGUOI_BENH`.

Không cộng gộp tài chính chỉ theo mã dịch vụ. Cần xem khóa dòng dịch vụ, phiếu, nguồn thanh toán và quan hệ phần chênh lệch để tránh tính trùng.

### 6.6. Tra cứu hồ sơ bệnh án

```http
POST /api/v1/medical-records/pto-01
```

```json
{
  "hosobenhanid": "1108596"
}
```

Mục đích:

- Tra cứu dữ liệu hành chính của hồ sơ bệnh án.
- Lấy dữ liệu chẩn đoán ra viện phục vụ báo cáo/tích hợp.

Quy tắc:

- `hosobenhanid` phải là chuỗi số.
- Chỉ trả dữ liệu thuộc bệnh viện của connection hiện tại.
- Dữ liệu chẩn đoán ra viện chỉ đầy đủ sau khi hồ sơ được cập nhật theo quy trình bệnh viện.
- Response rỗng có thể do ID không tồn tại, không thuộc bệnh viện hoặc hồ sơ chưa hoàn thiện.

## 7. Quy ước phát triển ctl_sql

### 7.1. Quy ước tên

Áp dụng cho `ctl_sql` mới:

- Tối đa 20 ký tự.
- Không dùng tiền tố `API_`.
- Dùng hậu tố `_VPC`.
- Tên phải gợi được phân hệ và nghiệp vụ.

Ví dụ:

```text
NGT002_DSBN_TN_VPC
CLS_CHIDINH_VPC
THUOCVT_CD_VPC
```

Một số SQL ID cũ trong dự án chưa theo quy ước mới. Không lấy các tên cũ đó làm mẫu cho API tiếp theo; chỉ đổi tên khi đã có kế hoạch cập nhật đồng bộ trên HIS và mã nguồn.

### 7.2. Placeholder

- `[SCH]`: schema dữ liệu của bệnh viện theo phiên HIS.
- `[HID]`: mã cơ sở y tế theo phiên đăng nhập.
- `[0]`, `[1]`, ...: tham số nghiệp vụ do module truyền vào.
- Không nối trực tiếp input người dùng vào chuỗi SQL trong Node.js.
- Không thêm dấu `;` khi dán SQL vào cấu hình HIS nếu hệ thống không yêu cầu.

### 7.3. Nguyên tắc viết truy vấn

1. Luôn giới hạn dữ liệu theo `[HID]` khi bảng có dữ liệu nhiều cơ sở.
2. Chỉ chọn các cột thực sự cần cho hợp đồng API.
3. Ưu tiên điều kiện thời gian dạng khoảng nửa mở:

```sql
ngay >= to_date('[0]', 'DD/MM/YYYY')
and ngay < to_date('[0]', 'DD/MM/YYYY') + 1
```

4. Tránh bọc cột ngày bằng `to_char` hoặc `trunc` trong điều kiện lọc vì có thể làm mất khả năng dùng index.
5. Dùng `left join` cho quan hệ có thể không tồn tại nhưng bản ghi chính vẫn phải được trả về.
6. Không thêm bảng chỉ để lấy trường không cần thiết.
7. Không truy vấn khoảng ngày lớn nếu nghiệp vụ có thể chia theo ngày.
8. Có thứ tự sắp xếp ổn định để dễ kiểm tra và phân trang sau này.
9. Kiểm tra nguy cơ nhân bản dòng khi join quan hệ một - nhiều.
10. Không trả trường nhạy cảm nếu API không có nhu cầu rõ ràng.

### 7.4. Chọn hàm thực thi

- Dùng `executeCtlSqlO` khi cần response có tên cột.
- Chỉ dùng `executeCtlSql` cho truy vấn/luồng cũ có định dạng phù hợp và đã có test.
- Khi một API cần nhiều nhóm dữ liệu độc lập, có thể chạy song song bằng `Promise.all`, nhưng phải đánh giá tải trên HIS.

## 8. Cấu trúc module API

Mỗi API là một operation độc lập tại:

```text
src/modules/<operation-id>/index.js
```

Module export:

```js
module.exports = { definition, execute };
```

Mẫu tối thiểu:

```js
const { AppError } = require('../../shared/app-error');

const definition = {
  id: 'ten-operation',
  name: 'Tên hiển thị',
  summary: 'Mô tả nghiệp vụ công khai',
  type: 'Dữ liệu HIS',
  status: 'Đang hoạt động',
  version: 'v1',
  protocol: 'REST',
  auth: 'API Key',
  trigger: {
    type: 'http',
    method: 'POST',
    path: '/api/v1/...'
  },
  execution: {
    type: 'his-ctl-sql',
    ctlSql: 'TEN_SQL_VPC',
    namedColumns: true
  },
  delivery: { type: 'http-response' },
  fields: [],
  sampleBody: {}
};

async function execute({ body, hisClient }) {
  // 1. Validate body.
  // 2. Map input sang [0], [1]...
  // 3. Gọi HIS client.
  // 4. Map/kiểm tra dữ liệu.
  // 5. Trả { data, meta }.
}

module.exports = { definition, execute };
```

Sau khi tạo module, import và thêm operation vào `src/registry/operations.js`. Không cần thêm route thủ công trong `src/app.js`.

## 9. Hợp đồng response

Response thành công:

```json
{
  "data": [],
  "meta": {
    "count": 0,
    "hospitalId": "26030"
  }
}
```

Response lỗi:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Thông tin đầu vào không hợp lệ"
  }
}
```

Quy tắc:

- `data` chứa dữ liệu nghiệp vụ.
- `meta` chứa số lượng, tham số lọc an toàn và `hospitalId`.
- Không đưa password, API key, connectionId, UUID HIS, SQL ID hoặc SQL text vào response.
- Lỗi HIS ra ngoài phải được chuẩn hóa thành thông báo tổng quát.
- Không trả raw exception hoặc stack trace.

## 10. Validation đầu vào

Mọi input phải được kiểm tra trước khi gọi HIS:

- ID: chỉ nhận chuỗi số nếu nghiệp vụ yêu cầu ID số.
- Ngày: định dạng `DD/MM/YYYY` và phải là ngày thực tế tồn tại.
- Chuỗi: trim, giới hạn độ dài và không dùng để ghép SQL.
- Body không cần tham số: chấp nhận `{}`, không tự đọc tham số thừa.
- Giới hạn body hiện tại: 1 MB.

Nên tạo mã lỗi riêng cho từng API, ví dụ:

```text
INVALID_RECEPTION_DATE
INVALID_CLINICAL_SERVICE_INPUT
INVALID_DEPARTMENT_DATA
```

## 11. Bảo mật và dữ liệu y tế

- Chỉ dùng HTTPS ở môi trường public.
- API key phải nằm trong biến môi trường hoặc file cấu hình không commit.
- Production không được dùng `local-dev-key-change-me`.
- Không ghi password, API key, connectionId, cookie hoặc UUID HIS vào log.
- Không log toàn bộ hồ sơ bệnh án hoặc payload chứa dữ liệu cá nhân nếu không cần thiết.
- Endpoint admin local phải tắt trong production.
- So sánh API key bằng cơ chế constant-time như code hiện tại.
- Giới hạn số lần thử tạo connection để giảm brute force.
- Không cho phép caller tự truyền `hospitalId`, `[HID]`, schema hoặc SQL ID.
- Luôn lấy HIS client từ connection đã được xác thực.

## 12. Kiểm thử API mới

Mỗi API mới cần ít nhất các test sau:

1. Thiếu hoặc sai API key trả `401`.
2. Thiếu connection trả `401`.
3. Input thiếu/sai định dạng trả `400`.
4. Input đúng được map chính xác sang `[0]`, `[1]`, ...
5. Dùng đúng hàm `executeCtlSqlO` hoặc `executeCtlSql`.
6. Response có cấu trúc `data` và `meta` mong đợi.
7. Dữ liệu upstream thiếu trường bắt buộc được phát hiện.
8. Catalog không lộ `ctlSql`, execution config hoặc SQL ID.
9. Lỗi upstream không lộ SQL ID ra client.
10. Route sai method trả `405`.
11. Registry không có ID hoặc route trùng.
12. API chỉ lấy dữ liệu của connection/bệnh viện hiện tại.

Chạy toàn bộ test:

```bash
node --test
```

## 13. Quy trình phát triển API mới

1. Làm rõ mục đích nghiệp vụ và đơn vị của một dòng dữ liệu.
2. Xác định khóa đầu vào từ API nào trước đó.
3. Xác định khóa chính và các quan hệ một - một, một - nhiều.
4. Xác định trường bắt buộc, trường có thể rỗng và ý nghĩa từng trạng thái.
5. Viết SQL tham khảo từ chức năng HIS hiện có.
6. Loại bỏ bảng và cột không cần thiết.
7. Thêm điều kiện `[HID]` và giới hạn thời gian/dữ liệu.
8. Đặt SQL ID theo quy ước tối đa 20 ký tự, hậu tố `_VPC`.
9. Cấu hình và thử `ctl_sql` trực tiếp trên HIS.
10. Tạo module operation và validation.
11. Đăng ký operation trong registry.
12. Viết test.
13. Thử bằng Postman với connection thật.
14. Kiểm tra catalog không lộ thông tin backend.
15. Cập nhật tài liệu khách hàng chỉ với hợp đồng API và mô tả nghiệp vụ công khai.

## 14. Câu hỏi bắt buộc trước khi thêm API

Trước khi code, người phát triển cần trả lời được:

- Một dòng response đại diện cho đối tượng gì?
- Khóa duy nhất của dòng là gì?
- API lấy theo ngày, theo hồ sơ, theo lần tiếp nhận hay theo lần khám?
- Có thể có nhiều bản ghi con không?
- Bản ghi cha có được giữ khi thiếu bản ghi con không?
- Trường nào có thể `null`?
- Trạng thái là trạng thái dòng hay trạng thái phiếu?
- Ngày nào là ngày chỉ định, thực hiện, hoàn thành hoặc trả kết quả?
- Số tiền là đơn giá, thành tiền hay phần chi trả?
- Dữ liệu thuộc bệnh viện nào và điều kiện `[HID]` nằm ở đâu?
- Truy vấn có thể dùng index không?
- Khối lượng tối đa của một request là bao nhiêu?
- Caller lấy khóa đầu vào từ endpoint nào?

Nếu chưa trả lời được các câu hỏi trên thì chưa nên công khai endpoint.

## 15. Các file quan trọng

| File/thư mục | Vai trò |
|---|---|
| `src/app.js` | HTTP shell, xác thực, connection và chuẩn hóa response |
| `src/connections/connection-manager.js` | Quản lý connection theo API key và phiên HIS |
| `src/security/domain-policy.js` | Kiểm tra domain và chống truy cập mạng nội bộ |
| `src/clients/his-rest-client.js` | Đăng nhập và gọi RestService HIS |
| `src/modules/` | Các operation nghiệp vụ |
| `src/registry/operations.js` | Đăng ký operation và tạo catalog công khai |
| `src/shared/date.js` | Kiểm tra ngày báo cáo |
| `ctl_sql/` | SQL nội bộ và SQL tham khảo |
| `test/` | Kiểm thử hồi quy và bảo mật |
| `docs/ADDING_OPERATION.md` | Hướng dẫn kỹ thuật thêm operation |
| `docs/ARCHITECTURE.md` | Kiến trúc tổng quát của dự án |

## 16. Nguyên tắc bảo trì

- Không sửa SQL ID đang chạy nếu chưa cập nhật đồng bộ cấu hình HIS.
- Không xóa endpoint public nếu chưa kiểm tra khách hàng đang sử dụng.
- Endpoint thử nghiệm không được đưa vào registry production.
- Khi đổi trường response cần xem xét version API.
- Khi thêm bệnh viện mới, ưu tiên mở rộng allowlist domain; không tạo nhánh code riêng theo tên bệnh viện nếu nghiệp vụ giống nhau.
- Mọi khác biệt theo bệnh viện nên được xử lý bằng phiên HIS, `[HID]`, cấu hình hoặc adapter rõ ràng.
- Tài liệu khách hàng không được chứa tên bảng, SQL text, SQL ID hoặc mô tả hạ tầng nội bộ.

