# Thêm API hoặc job mới

## API nhận request và trả response

1. Sao chép `src/templates/request-response.operation.js.example` thành `src/modules/<id>/index.js`.
2. Đặt route public trong `trigger`.
3. Đặt SQL ID nội bộ trong `execution.ctlSql`.
4. Viết validation và ánh xạ `[0]`, `[1]` trong `execute`.
5. Import module và thêm vào mảng `operations` tại `src/registry/operations.js`.
6. Viết test cho input sai, input đúng, mapping tham số và không lộ SQL ID.
7. Chạy `node --test`.

Không cần sửa `src/app.js` để thêm một HTTP API thông thường.

## Job chạy theo lịch

1. Sao chép `src/templates/scheduled-push.operation.js.example`.
2. Dùng `trigger.type = 'schedule'` và khai báo cron/timezone.
3. Nếu chỉ xử lý nội bộ, đặt `delivery.type = 'none'`.
4. Nếu đẩy sang API khác, đặt `delivery.type = 'rest-push'` và tên target logic.
5. Đăng ký module trong registry.
6. Scheduler gọi `runScheduledOperation(id, context)` từ `src/jobs/scheduled-runner.js`.

Project chưa ép dùng một thư viện cron cụ thể. Với một VPS, nên gọi một script job bằng systemd timer hoặc cron Linux. Khi có nhiều job, retry và hàng đợi lớn, bổ sung BullMQ/Redis như một adapter riêng.

## Cấu hình outbound target

Ví dụ context lúc chạy job:

```js
{
  hisClient,
  restPushClient,
  outboundTargets: {
    'dashboard-tiep-don': {
      url: process.env.DASHBOARD_TIEP_DON_URL,
      apiKey: process.env.DASHBOARD_TIEP_DON_API_KEY
    }
  },
  window: { from: '15/09/2026', to: '15/09/2026' }
}
```

Không đặt URL thật, tài khoản hoặc API Key đối tác trong module, catalog, sample body, log hoặc Git.

## Checklist review outsource

- ID và route không trùng.
- Có giới hạn/validate đầy đủ input.
- Không nối thẳng input vào SQL text.
- Chỉ dùng placeholder ctl_sql đã định nghĩa.
- Không trả SQL ID, UUID HIS hoặc lỗi upstream chi tiết ra client.
- Có timeout cho outbound call.
- Có idempotency/batch key nếu push có thể retry.
- Log không chứa API Key hoặc dữ liệu bệnh án đầy đủ.
- Test chạy thành công trước khi merge.
