-- SQL ID: API_DIM_DICH_VU
-- [SCH]: schema dữ liệu HIS; [HID]: CSYTID do RestService thay theo phiên.
-- Không có tham số [0], [1]... và không thêm dấu ; khi dán vào SQL Text của ctl_sql.
select
  a.madichvu as MADV,
  a.tendichvu as TENDV,
  mabh.tennhom as NHOMDV
from [SCH].dmc_dichvu a,
     his_common.dmc_nhom_mabhyt mabh
where a.csytid = '[HID]'
  and a.daxoa = 0
  and a.loaidichvu <> 1
  and a.nhom_mabhyt_id = mabh.nhom_mabhyt_id
order by mabh.tennhom, a.tendichvu
