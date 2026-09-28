-- SQL ID: NGT002_DSBN_TN_VPC
select
  a.tiepnhanid as TIEPNHANID,
  kb.khambenhid as KHAMBENHID,
  kb.loaibenhanid as LOAIBENHANID,
  a.doituongbenhnhanid as DOITUONGBENHNHANID,
  b.benhnhanid as BENHNHANID,
  hs.mahosobenhan as MAHOSOBENHAN,
  b.mabenhnhan as MABENHNHAN,
  to_char(a.ngaytiepnhan, 'DD/MM/YYYY HH24:MI:SS') as NGAYTIEPNHAN,
  khoa.org_name as TENKHOA_BD,
  phong.org_name as TENPHONG_BD
from [SCH].kbh_tiepnhan a
join [SCH].dmc_benhnhan b on b.benhnhanid = a.benhnhanid
left join [SCH].ban_hosobenhan hs on hs.hosobenhanid = a.hosobenhanid
join [SCH].kbh_khambenh kb on kb.tiepnhanid = a.tiepnhanid
left join org_organization khoa on khoa.org_id = a.khoaid_bd
left join org_organization phong on phong.org_id = a.phongid_bd
where a.csytid = '[HID]'
  and a.ngaytiepnhan >= to_date('[0]', 'DD/MM/YYYY')
  and a.ngaytiepnhan < to_date('[0]', 'DD/MM/YYYY') + 1
order by a.ngaytiepnhan desc, b.mabenhnhan, kb.khambenhid

