-- SQL ID: API_DIM_KHOA
-- [SCH]: schema dữ liệu HIS; [HID]: CSYTID do RestService thay theo phiên.
-- Không có tham số [0], [1]... và không thêm dấu ; khi dán vào SQL Text của ctl_sql.
select
  a.org_id as KHOAID,
  a.org_code as MAKHOA,
  a.org_name as TENKHOA,
  nvl(gkh.giuongkehoach, 0) as GIUONGKEHOACH,
  nvl(gtk.giuongthucke, 0) as GIUONGTHUCKE
from org_organization a,
     [SCH].dmc_khoa_giuong_kh gkh,
     [SCH].dmc_khoa_giuong_tk gtk
where a.org_level = 4
  and a.parent_id = '[HID]'
  and a.org_id = gkh.khoaid(+)
  and a.org_id = gtk.khoaid(+)
order by nlssort(a.org_name, 'NLS_SORT=vietnamese'), a.org_code
