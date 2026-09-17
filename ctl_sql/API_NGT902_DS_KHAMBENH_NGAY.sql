-- SQL ID hien tai trong src/catalog.js: API_DS_KBH_NGAY
-- Nguon: thutuc/NGT902_DS_KHAMBENH_NGA.sql, OPEN cur FOR
-- [SCH]: schema HIS; [UID]: CSYTID do RestService thay theo phien.
-- [0]: tuNgay (DD/MM/YYYY); [1]: denNgay (DD/MM/YYYY).
-- Khong them dau ; khi dan vao o SQL Text cua ctl_sql.
select t1.*, t2.duyetdt, t2.tgduyetdt, t3.dvkt, t4.donthuoc
from
(
  select distinct
    a.hosobenhanid,
    b.mabenhnhan,
    b.tenbenhnhan,
    gt.ten_trangthai as gioitinh,
    bh.ma_bhyt,
    decode(pk.bhyt_dv, 1, 'BHYT+DV', decode(a.doituongbenhnhanid, 1, 'BHYT', 2, 'VP')) as ten_dtbn,
    org1.org_id as khoaid,
    org1.org_name as khoa,
    org.org_id as phongid,
    org.org_name as phong,
    (select u.full_name from adm_user u where u.company_id = '[UID]' and u.user_id = pk.bskhambenhid) as bacsy,
    to_char(nvl(pk.ngay, f.thoigianvaovien), 'DD/MM/YYYY HH24:MI:SS') as tgdangky,
    to_char(nvl(pk.ngay_bd, f.thoigianvaovien), 'DD/MM/YYYY HH24:MI:SS') as tgbdkham,
    to_char(nvl(pk.ngay_kt, f.thoigianravien), 'DD/MM/YYYY HH24:MI:SS') as tgktkham,
    i.ten_ngoaitru as trangthai,
    decode(xt.xutrikhambenhid, 0, '', xt.tenxutrikhambenh) as xutri,
    decode(a.trangthaitiepnhan_vp, 1, 'X', '') as duyetkt,
    decode(a.trangthaitiepnhan_vp, 1, to_char(a.duyet_ngayduyet_vp, 'DD/MM/YYYY HH24:MI:SS'), '') as tgduyetkt
  from [SCH].kbh_tiepnhan a,
       [SCH].dmc_benhnhan b,
       [SCH].kbh_bhyt bh,
       (select * from dmc_trangthai where loai_id = 1) gt,
       [SCH].kbh_khambenh f,
       [SCH].kbh_phongkhamdangky pk,
       dmc_trangthai_khambenh i,
       org_organization org,
       org_organization org1,
       dmc_xutrikhambenh xt,
       [SCH].kbh_maubenhpham bp,
       [SCH].duc_nhapxuat nx
  where a.benhnhanid = b.benhnhanid
    and a.hosobenhanid = bh.hosobenhanid(+)
    and b.gioitinhid = gt.trangthai_id(+)
    and a.tiepnhanid = f.tiepnhanid
    and f.loaibenhanid = 23
    and f.khambenhid = pk.khambenhid(+)
    and pk.trangthai_stt = i.trangthai_id(+)
    and pk.phongid = org.org_id(+)
    and pk.khoaid = org1.org_id(+)
    and pk.hinhthucxutriid = xt.xutrikhambenhid(+)
    and f.khambenhid = bp.khambenhid
    and bp.maubenhphamid = nx.maubenhphamid(+)
    and a.ngaytiepnhan >= to_date('[0]', 'DD/MM/YYYY')
    and a.ngaytiepnhan < to_date('[1]', 'DD/MM/YYYY') + 1
    and a.csytid = '[UID]'
) t1,
(
  select distinct
    bp.hosobenhanid, bp.khoaid, bp.phongid,
    decode(nx.trangthaiid, 6, 'X', '') as duyetdt,
    decode(nx.trangthaiid, 6, to_char(nx.ngayduyet, 'DD/MM/YYYY HH24:MI:SS'), '') as tgduyetdt
  from [SCH].kbh_maubenhpham bp, [SCH].duc_nhapxuat nx
  where bp.maubenhphamid = nx.maubenhphamid(+)
    and nx.kieu = 3
    and bp.csytid = '[UID]'
) t2,
(
  select distinct bp.hosobenhanid, bp.khoaid, bp.phongid, 'X' as dvkt
  from [SCH].kbh_maubenhpham bp
  where bp.loainhommaubenhpham in (1, 2, 5)
    and bp.csytid = '[UID]'
) t3,
(
  select distinct bp.hosobenhanid, bp.khoaid, bp.phongid, 'X' as donthuoc
  from [SCH].kbh_maubenhpham bp
  where bp.loainhommaubenhpham = 7
    and bp.csytid = '[UID]'
) t4
where t1.hosobenhanid = t2.hosobenhanid(+)
  and t1.khoaid = t2.khoaid(+)
  and t1.phongid = t2.phongid(+)
  and t1.hosobenhanid = t3.hosobenhanid(+)
  and t1.khoaid = t3.khoaid(+)
  and t1.phongid = t3.phongid(+)
  and t1.hosobenhanid = t4.hosobenhanid(+)
  and t1.khoaid = t4.khoaid(+)
  and t1.phongid = t4.phongid(+)
order by t1.mabenhnhan, t1.tgdangky
