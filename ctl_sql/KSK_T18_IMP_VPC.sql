SELECT a1.*,b.ma_tieude MA_TIEUDE,a.noidung NOIDUNG FROM(
 SELECT bh.hosobenhanid,bn.anhbenhnhan IMAGE_BN,TO_CHAR(tn.tiepnhanid) MA_LK,
 org.org_code MA_CSKCB,CAST(NULL AS VARCHAR2(20)) MA_GTIN_CSKCB,
 TO_CHAR(bh.gioitinhid) GIOI_TINH,TO_CHAR(bh.ngaysinh,'dd/mm/yyyy') NGAY_SINH_DMY,
 TO_CHAR(bn.dantocid) MA_DAN_TOC,NVL(bh.sdtbenhnhan,bn.sdtbenhnhan) DIEN_THOAI,
 NVL(bh.socmtnd,bn.cmnd) SO_CCCD,TO_CHAR(bn.ngaycapcmnd,'dd/mm/yyyy') NGAYCAP_CCCD,
 bn.noicapcmnd NOICAP_CCCD,CAST(NULL AS VARCHAR2(20)) MATINH_CU_TRU,
 CAST(NULL AS VARCHAR2(20)) MAXA_CU_TRU,TO_CHAR(bn.nghenghiepid) MA_NGHE_NGHIEP,
 bh.noilamviec NOI_LAM_VIEC_HOC_TAP,bh.diachi DC_HIENTAI,bh.tenbenhnhan TENBENHNHAN,
 bh.namsinh NAMSINH,org.org_name ORG_NAME,org.org_tel ORG_TEL,
 TO_CHAR(bh.ngaysinh,'yyyymmdd') NGAY_SINH,bh.tuoi SO_TUOI
 FROM [SCH].ban_hosobenhan bh JOIN [SCH].dmc_benhnhan bn ON bn.benhnhanid=bh.benhnhanid
 JOIN [SCH].kbh_tiepnhan tn ON tn.hosobenhanid=bh.hosobenhanid
 JOIN org_organization org ON org.org_id=bh.csytid
 WHERE bh.csytid=[HID] AND ('[2]'='-1' OR TO_CHAR(bh.khoaid)='[2]')
)a1 JOIN [SCH].ksk_bieumau_chitiet a ON a.hosobenhanid=a1.hosobenhanid
JOIN ksk_bieumau b ON b.bieumauid=a.bieumauid
WHERE b.loaikskid=4 AND a.ngay_gio>=TO_DATE('[0]','dd/mm/yyyy hh24:mi:ss')
AND a.ngay_gio<TO_DATE('[1]','dd/mm/yyyy hh24:mi:ss')+1
