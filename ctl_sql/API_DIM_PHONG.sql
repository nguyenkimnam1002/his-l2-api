-- SQL ID: API_DIM_PHONG
-- Trích từ truy vấn của DMC04_PHONG_LAYDL, bỏ phân trang và bộ lọc đầu vào.
-- [HID]: CSYTID do RestService thay theo phiên.
-- Không có tham số [0], [1]... và không thêm dấu ; khi dán vào SQL Text của ctl_sql.
select
  a.org_id as PHONGID,
  a.org_code as MAPHONG,
  a.org_name as TENPHONG,
  c.org_id as KHOAID,
  c.org_code as MAKHOA,
  c.org_name as TENKHOA
from org_organization a,
     org_organization c
where a.org_level = 5
  and a.status = 1
  and a.parent_id = c.org_id
  and c.org_level = 4
  and c.parent_id = '[HID]'
order by nlssort(a.org_name, 'NLS_SORT=vietnamese'), a.org_code
