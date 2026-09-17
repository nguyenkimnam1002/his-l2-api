PROCEDURE                  NGT902_DS_KHAMBENH_NGAY(
      i_uid        VARCHAR2,
      i_hid        VARCHAR2,
      i_sch        VARCHAR2,
      i_ip         VARCHAR2,
      i_tungay     date,
      i_denngay    date,
      khoaid NUMBER,
      phongid NUMBER,
      trangthaiid number,
      duyetktid number,
      duyetthuocid number,
      cur OUT sys_refcursor)  IS
      --
-- Muc dich: lay thong tin in bao cao phieu stt kham benh
-- Trang thai: San sang de test
--
-- Lich su thay doi
-- Nguoi thay doi    Ngay         Ghi chu
-- TUONGLT          16/08/2017     Tao moi
-- -----------------------------------------------------------------------
    p_function  VARCHAR2(200) :='NGT902_DS_KHAMBENH_NGAY';
BEGIN
 open cur for
       'select t1.*, t2.duyetdt,t2.tgduyetdt,t3.dvkt,t4.donthuoc
from
(select distinct a.hosobenhanid,b.mabenhnhan,b.tenbenhnhan,gt.ten_trangthai as gioitinh,bh.ma_bhyt
       ,decode(pk.bhyt_dv,1,''BHYT+DV'',decode(a.doituongbenhnhanid, 1, ''BHYT'', 2, ''VP'')) ten_dtbn,
       org1.org_id khoaid,org1.org_name as khoa,org.org_id phongid,org.org_name as phong,
            (select full_name from adm_user where company_id=:i_hid and pk.bskhambenhid=adm_user.user_id(+)) as BACSY,
           to_char( nvl(pk.ngay,f.thoigianvaovien),''DD/MM/YYYY HH24:MI:SS'') tgdangky
           ,to_char( nvl(pk.ngay_bd,f.thoigianvaovien),''DD/MM/YYYY HH24:MI:SS'') tgbdkham
           ,to_char( nvl(pk.ngay_kt,f.thoigianravien),''DD/MM/YYYY HH24:MI:SS'') tgktkham
          ,i.ten_ngoaitru as trangthai, decode(xt.xutrikhambenhid,0,'''',xt.tenxutrikhambenh) as xutri
        ,decode (a.trangthaitiepnhan_vp,1,''X'','''') as duyetkt,decode(a.trangthaitiepnhan_vp,1, to_char(a.duyet_ngayduyet_vp,''DD/MM/YYYY HH24:MI:SS''),'''') tgduyetkt
          from '|| i_sch ||'.kbh_tiepnhan a,
          '|| i_sch ||'.dmc_benhnhan b,
          '|| i_sch ||'.kbh_bhyt bh,
           (select * from dmc_trangthai where loai_id=1) GT,
           '|| i_sch ||'.kbh_khambenh f,
           '|| i_sch ||'.kbh_phongkhamdangky pk,
          DMC_TRANGTHAI_KHAMBENH i,
          org_organization org,
          org_organization org1,
          dmc_xutrikhambenh xt,
          '|| i_sch ||'.kbh_maubenhpham bp,
          '|| i_sch ||'.duc_nhapxuat nx
          where a.benhnhanid=b.benhnhanid
          and a.hosobenhanid=bh.hosobenhanid(+)
          and b.gioitinhid=gt.trangthai_id(+)
          and a.tiepnhanid=f.tiepnhanid
          and f.loaibenhanid=23
          and f.khambenhid=pk.khambenhid(+)
         --and f.xutrikhambenhid=h.xutrikhambenhid(+)
          and pk.trangthai_stt=i.trangthai_id(+)
           and pk.phongid=org.org_id(+)
           and pk.khoaid= org1.org_id(+)
          and pk.hinhthucxutriid=xt.xutrikhambenhid(+)
           and f.KHAMBENHID = bp.KHAMBENHID
           and bp.maubenhphamid=nx.maubenhphamid(+)
            and trunc(a.ngaytiepnhan) >= trunc(:i_tungay)
          and trunc(a.ngaytiepnhan) <= trunc(:i_denngay)
          and (:khoaid = ''-1'' or pk.khoaid = :khoaid)
          and (:phongid = ''-1'' or pk.phongid = :phongid)
          and (:trangthaiid = ''-1'' or i.trangthai_id = :trangthaiid)
          and (:duyetktid = ''-1'' or a.trangthaitiepnhan_vp = :duyetktid)
          and (:duyetthuocid = ''-1'' or nx.trangthaiid = :duyetthuocid)
          and a.CSYTID = :i_hid order by org.org_name,b.mabenhnhan,tgdangky) t1,
(select distinct bp.hosobenhanid,bp.khoaid,bp.phongid
        ,decode (nx.trangthaiid,6,''X'','''') as duyetdt
        ,decode(nx.trangthaiid,6,to_char(nx.ngayduyet,''DD/MM/YYYY HH24:MI:SS''),'''') tgduyetdt
from
'|| i_sch ||'.kbh_maubenhpham bp, '|| i_sch ||'.duc_nhapxuat nx
 where
 bp.maubenhphamid=nx.maubenhphamid(+) and nx.kieu=3 and bp.csytid=:i_hid) t2,
 (select distinct bp.hosobenhanid,bp.khoaid,bp.phongid,''X'' as dvkt
 from '|| i_sch ||'.kbh_maubenhpham bp where bp.loainhommaubenhpham in(1,2,5)) t3,
 (select distinct bp.hosobenhanid,bp.khoaid,bp.phongid,''X'' as donthuoc
 from '|| i_sch ||'.kbh_maubenhpham bp where bp.loainhommaubenhpham =7) t4
 where t1.hosobenhanid =t2.hosobenhanid(+) and t1.khoaid=t2.khoaid(+) and t1.phongid=t2.phongid(+)
 and t1.hosobenhanid =t3.hosobenhanid(+) and t1.khoaid=t3.khoaid(+) and t1.phongid=t3.phongid(+)
 and t1.hosobenhanid =t4.hosobenhanid(+) and t1.khoaid=t4.khoaid(+) and t1.phongid=t4.phongid(+)
 order by t1.mabenhnhan,t1.tgdangky'
      using i_hid,i_tungay, i_denngay,
     khoaid,khoaid, phongid,phongid,
     trangthaiid,trangthaiid,duyetktid,duyetktid,duyetthuocid,duyetthuocid,i_hid,i_hid;

   EXCEPTION
    WHEN OTHERS
    THEN
        DECLARE
            r_err   VARCHAR2 (500);
        BEGIN
            r_err := TO_CHAR (SQLCODE) || ':' || SQLERRM;
            ulog.plog.error (p_function || '=Error:' || r_err || ' ,i_sch: ' || i_sch || ' ,i_hid:' || i_hid);
        END;
END;