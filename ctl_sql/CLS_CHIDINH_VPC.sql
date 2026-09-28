-- SQL ID: CLS_CHIDINH_VPC (15 ky tu)
-- [0]: khambenhid
select
  kb.khambenhid as KHAMBENHID,
  kb.loaibenhanid as LOAIBENHANID,
  mbp.maubenhphamid as MAUBENHPHAMID,
  mbp.loainhommaubenhpham as LOAINHOMMAUBENHPHAM,
  case mbp.loainhommaubenhpham
    when 1 then 'XET_NGHIEM'
    when 2 then 'CDHA'
    when 5 then 'PTTT_CHUYEN_KHOA'
  end as LOAIDICHVU,
  mbp.sophieu as SOPHIEU,
  dv.dichvukhambenhid as DICHVUKHAMBENHID,
  dv.dichvuid as DICHVUID,
  dm.madichvu as MADICHVU,
  dm.tendichvu as TENDICHVU,
  mbp.khoaid as KHOAID_CHIDINH,
  khoa.org_name as TENKHOA_CHIDINH,
  mbp.phongchuyendenid as PHONGID_CHIDINH,
  phong.org_name as TENPHONG_CHIDINH,
  to_char(mbp.ngaymaubenhpham, 'DD/MM/YYYY HH24:MI:SS') as NGAYCHIDINH,
  to_char(mbp.ngaydukien_thuchien, 'DD/MM/YYYY HH24:MI:SS') as NGAYDUKIEN_THUCHIEN,
  to_char(mbp.tglaymau, 'DD/MM/YYYY HH24:MI:SS') as NGAYLAYMAU,
  to_char(mbp.ngaymaubenhpham_sudung, 'DD/MM/YYYY HH24:MI:SS') as NGAYTHUCHIEN,
  to_char(mbp.ngaymaubenhpham_hoanthanh, 'DD/MM/YYYY HH24:MI:SS') as NGAYHOANTHANH,
  dv.trangthaidichvu as TRANGTHAIDICHVU,
  ttdv.ten_trangthai as TENTRANGTHAIDICHVU,
  mbp.trangthaimaubenhpham as TRANGTHAIPHIEU,
  ttmbp.ten_trangthai as TENTRANGTHAIPHIEU,
  dv.soluong as SOLUONG,
  dv.loaidoituong as LOAIDOITUONG,
  dv.dichvuid_org as DICHVUID_ORG,
  dv.tien_chitra as DON_GIA_CHITRA,
  nvl(dv.soluong, 0) * nvl(dv.tien_chitra, 0) as THANHTIEN_CHITRA,
  case
    when dv.dichvuid_org is not null then 'BN_CHENH_LECH'
    when dv.loaidoituong in (1, 2, 16) then 'BHYT'
    when dv.loaidoituong = 15 then 'MIEN_PHI'
    else 'NGUOI_BENH'
  end as NGUONTHANHTOAN
from [SCH].kbh_khambenh kb
join [SCH].kbh_maubenhpham mbp
  on mbp.khambenhid = kb.khambenhid
join [SCH].kbh_dichvu_khambenh dv
  on dv.maubenhphamid = mbp.maubenhphamid
join [SCH].dmc_dichvu dm
  on dm.dichvuid = dv.dichvuid
left join org_organization khoa
  on khoa.org_id = mbp.khoaid
left join org_organization phong
  on phong.org_id = mbp.phongchuyendenid
left join dmc_trangthai ttdv
  on ttdv.loai_id = 51
  and ttdv.trangthai_id = dv.trangthaidichvu
left join dmc_trangthai ttmbp
  on ttmbp.loai_id = 70
  and ttmbp.trangthai_id = mbp.trangthaimaubenhpham
where kb.khambenhid = '[0]'
  and kb.csytid = '[HID]'
  and mbp.loainhommaubenhpham in (1, 2, 5)
order by mbp.ngaymaubenhpham desc, mbp.maubenhphamid, dm.thutuin, dv.dichvukhambenhid
