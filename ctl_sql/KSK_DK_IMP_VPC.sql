-- KSK_DK_IMP_VPC
SELECT a1.*,b.ma_tieude MA_TIEUDE,a.noidung NOIDUNG FROM(
 SELECT bh.hosobenhanid,org.hospital_code MA_CSKCB,TO_CHAR(tn.tiepnhanid) MA_LK,
 TO_CHAR(tn.ngaytiepnhan,'dd/mm/yyyy') NGAY_VAO,bh.tenbenhnhan HO_TEN,
 TO_CHAR(bh.gioitinhid) GIOI_TINH,TO_CHAR(bh.ngaysinh,'dd/mm/yyyy') NGAY_SINH,
 TO_CHAR(bn.dantocid) MA_DAN_TOC,NVL(bh.socmtnd,bn.cmnd) SO_CCCD,
 TO_CHAR(bn.ngaycapcmnd,'dd/mm/yyyy') NGAYCAP_CCCD,bn.noicapcmnd NOICAP_CCCD,
 bh.diachi DIA_CHI,TO_CHAR(bn.nghenghiepid) MA_NGHE_NGHIEP,
 bh.noilamviec NOI_LAM_VIEC_HOC_TAP,NVL(bh.sdtbenhnhan,bn.sdtbenhnhan) DIEN_THOAI
 FROM [SCH].kbh_tiepnhan tn JOIN [SCH].kbh_khambenh kb ON kb.tiepnhanid=tn.tiepnhanid
 JOIN [SCH].ban_hosobenhan bh ON bh.hosobenhanid=tn.hosobenhanid
 JOIN [SCH].dmc_benhnhan bn ON bn.benhnhanid=bh.benhnhanid
 JOIN org_organization org ON org.org_id=bh.csytid
 WHERE tn.csytid=[HID] AND kb.loaibenhanid=23 AND ('[2]'='-1' OR TO_CHAR(kb.khoaid)='[2]')
)a1 JOIN [SCH].ksk_bieumau_chitiet a ON a.hosobenhanid=a1.hosobenhanid
JOIN ksk_bieumau b ON b.bieumauid=a.bieumauid
WHERE b.loaikskid=5 AND b.ma_tieude LIKE 'KSK_DINHKY_%'
AND a.ngay_gio>=TO_DATE('[0]','dd/mm/yyyy hh24:mi:ss')
AND a.ngay_gio<TO_DATE('[1]','dd/mm/yyyy hh24:mi:ss')+1
