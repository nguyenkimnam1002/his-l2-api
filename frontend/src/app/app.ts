import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
type Page='dashboard'|'apis'|'reports';
interface ApiField{name:string;label?:string;type:string;required?:boolean;description?:string;defaultValue?:string}
interface ApiItem{id:string;name:string;summary:string;method:string;path:string;type:string;status:string;version:string;protocol:string;auth:string;fields:ApiField[];sampleBody:Record<string,string>}
interface Connection{hospitalId:string;userName:string;fullName:string;domain:string;expiresAt:string}
type ExportColumn={header:string;source:string|string[]}
const KSK_T18_EXPORT_COLUMNS:ExportColumn[]=[
 {header:'MA_CSKCB',source:'MA_CSKCB'},{header:'MA_LK',source:'MA_LK'},{header:'MA_GTIN_CSKCB',source:'MA_GTIN_CSKCB'},
 {header:'NGAY_VAO',source:'KSKT18_NGAYVAOKSK'},{header:'HO_TEN',source:'TENBENHNHAN'},{header:'GIOI_TINH',source:'GIOI_TINH'},
 {header:'NGAY_SINH',source:'NGAY_SINH_DMY'},{header:'MA_DAN_TOC',source:'MA_DAN_TOC'},{header:'SO_CCCD',source:'SO_CCCD'},
 {header:'NGAYCAP_CCCD',source:'NGAYCAP_CCCD'},{header:'NOICAP_CCCD',source:'NOICAP_CCCD'},{header:'MATINH_CU_TRU',source:'MATINH_CU_TRU'},
 {header:'MAXA_CU_TRU',source:'MAXA_CU_TRU'},{header:'DIA_CHI',source:'DC_HIENTAI'},{header:'MA_NGHE_NGHIEP',source:'MA_NGHE_NGHIEP'},
 {header:'NHOM_MAU',source:'KSKT18_NHOMMAU'},{header:'DOI_TUONG',source:'KSKT18_DOITUONG'},{header:'NGUON_CHI_TRA',source:'KSKT18_NGUONCHITRA'},
 {header:'NOI_LAM_VIEC_HOC_TAP',source:'NOI_LAM_VIEC_HOC_TAP'},{header:'DIEN_THOAI',source:'DIEN_THOAI'},{header:'LY_DO_VV',source:'KSKT18_LYDOKHAM'},
 {header:'MA_LOAI_KCB',source:'KSKT18_MALOAIKCB'},{header:'TSGD_MAC_BENH',source:'KSKT18_TIENSUGIADINH_CHON'},{header:'TSGD_MA_BENH',source:'KSKT18_TIENSUGIADINHNEUCO'},
 {header:'TSBT_BENH_TRONG_5_NAM_QUA',source:'KSKT18_BENHTRONG5NAM'},{header:'TSBT_BENH_THAN_KINH',source:'KSKT18_BENHTHANKINH'},
 {header:'TSBT_BENH_MAT',source:'KSKT18_BENHMAT'},{header:'TSBT_BENH_TAI',source:'KSKT18_BENHTAI'},{header:'TSBT_BENH_TIM',source:'KSKT18_BENHTIM'},
 {header:'TSBT_PHAU_THUAT_TIM',source:'KSKT18_PHAUTHUATTIM'},{header:'TSBT_TANG_HUYET_AP',source:'KSKT18_TANGHUYETAP'},
 {header:'TSBT_KHO_THO',source:'KSKT18_KHOTHO'},{header:'TSBT_BENH_PHOI',source:'KSKT18_BENHPHOI'},{header:'TSBT_BENH_THAN',source:'KSKT18_BENHTHAN'},
 {header:'TSBT_NGHIEN_RUOU',source:'KSKT18_NGHIENRUOUBIA'},{header:'TSBT_DAI_THAO_DUONG',source:'KSKT18_DAITHAODUONG'},
 {header:'TSBT_BENH_TAM_THAN',source:'KSKT18_BENHTAMTHAN'},{header:'TSBT_MAT_Y_THUC',source:'KSKT18_MATYTHUC'},{header:'TSBT_NGAT',source:'KSKT18_NGATCHONGMAT'},
 {header:'TSBT_BENH_TIEU_HOA',source:'KSKT18_BENHTIEHOA'},{header:'TSBT_ROI_LOAN_GIAC_NGU',source:'KSKT18_ROILOANGIACNGU'},
 {header:'TSBT_TAI_BIEN',source:'KSKT18_TAIBIEN'},{header:'TSBT_BENH_COT_SONG',source:'KSKT18_BENHCOTSONG'},
 {header:'TSBT_RUOU_THUONG_XUYEN',source:'KSKT18_SUDUNGRUOU'},{header:'TSBT_MA_TUY',source:'KSKT18_SUDUNGMATUY'},
 {header:'TSBT_BENH_KHAC',source:'KSKT18_BENHKHAC_CHON'},{header:'TSBT_MA_BENH_KHAC',source:'KSKT18_TIENSUBENHNEUCO'},
 {header:'TSBT_DANG_DIEU_TRI_BENH',source:'KSKT18_TSBTDANGDIEUTRIBENH'},{header:'TSBT_MA_BENH',source:'KSKT18_TSBTMABENH'},
 {header:'TSBT_TEN_THUOC_LIEU_LUONG',source:'KSKT18_TSBTTENTHUOCLIEULUONG'},{header:'TSBT_THAI_SAN',source:'KSKT18_TSBTTHAISAN'},
 {header:'TSBT_MA_BENH_THAI_SAN',source:'KSKT18_TSBTMABENHTHAISAN'},{header:'TSBT_TEN_THUOC_THAI_SAN',source:'KSKT18_TSBTTENTHUOCTHAISAN'},
 {header:'CHIEU_CAO',source:'KSKT18_CHIEUCAO'},{header:'CAN_NANG',source:'KSKT18_CANNANG'},{header:'CHI_SO_BMI',source:'KSKT18_BMI'},
 {header:'MACH',source:'KSKT18_MACH'},{header:'HUYET_AP',source:['KSKT18_HUYETAP1','KSKT18_HUYETAP2']},{header:'KHAM_THE_LUC_PL',source:'KSKT18_PHANLOAITHELUC_CHON'},
 {header:'NOI_KHOA_TUAN_HOAN',source:'KSKT18_TUANHOAN'},{header:'NOI_KHOA_TUAN_HOAN_PL',source:'KSKT18_PHANLOAI_TUANHOAN'},
 {header:'NOI_KHOA_HO_HAP',source:'KSKT18_HOHAP'},{header:'NOI_KHOA_HO_HAP_PL',source:'KSKT18_PHANLOAI_HOHAP'},
 {header:'NOI_KHOA_TIEU_HOA',source:'KSKT18_TIEUHOA'},{header:'NOI_KHOA_TIEU_HOA_PL',source:'KSKT18_PHANLOAI_TIEUHOA'},
 {header:'NOI_KHOA_THAN_TN_SD',source:'KSKT18_THANTIETNIEU'},{header:'NOI_KHOA_THAN_TIETNIEU_PL',source:'KSKT18_PHANLOAI_THANTIETNIEU'},
 {header:'NOI_KHOA_NOI_TIET',source:'KSKT18_NOITIET'},{header:'NOI_KHOA_NOI_TIET_PL',source:'KSKT18_PHANLOAI_NOITIET'},
 {header:'NOI_KHOA_CO_XUONG_KHOP',source:'KSKT18_COXUONGKHOP'},{header:'NOI_KHOA_CO_XUONG_KHOP_PL',source:'KSKT18_PHANLOAI_CXK'},
 {header:'NOI_KHOA_THAN_KINH',source:'KSKT18_THANKINH'},{header:'NOI_KHOA_THAN_KINH_PL',source:'KSKT18_PHANLOAI_THANKINH'},
 {header:'NOI_KHOA_TAM_THAN',source:'KSKT18_TAMTHAN'},{header:'NOI_KHOA_TAM_THAN_PL',source:'KSKT18_PHANLOAI_TAMTHAN'},
 {header:'KET_QUA_KHAM_NGOAI_KHOA',source:'KSKT18_NGOAIKHOA'},{header:'KHAM_NGOAI_KHOA_PL',source:'KSKT18_PHANLOAI_NGOAIKHOA'},
 {header:'KET_QUA_KHAM_DA_LIEU',source:'KSKT18_DALIEU'},{header:'KHAM_DA_LIEU_PL',source:'KSKT18_PHANLOAI_DALIEU'},
 {header:'KET_QUA_KHAM_SAN_PHU_KHOA',source:'KSKT18_SANPHUKHOA'},{header:'KHAM_SAN_PHU_KHOA_PL',source:'KSKT18_PHANLOAI_SANPHUKHOA'},
 {header:'KHONG_KINH_MAT_PHAI',source:'KSKT18_KHONGKINH_MATPHAI'},{header:'KHONG_KINH_MAT_TRAI',source:'KSKT18_KHONGKINH_MATTRAI'},
 {header:'CO_KINH_MAT_PHAI',source:'KSKT18_COKINH_MATPHAI'},{header:'CO_KINH_MAT_TRAI',source:'KSKT18_COKINH_MATTRAI'},
 {header:'BENH_KHAC_MAT',source:'KSKT18_CACBENHVEMAT'},{header:'KHAM_MAT_PL',source:'KSKT18_PHANLOAI_MAT'},
 {header:'TAI_TRAI_NOI_THUONG',source:'KSKT18_TAITRAI_NOITHUONG'},{header:'TAI_TRAI_NOI_THAM',source:'KSKT18_TAITRAI_NOITHAM'},
 {header:'TAI_PHAI_NOI_THUONG',source:'KSKT18_TAIPHAI_NOITHUONG'},{header:'TAI_PHAI_NOI_THAM',source:'KSKT18_TAIPHAI_NOITHAM'},
 {header:'BENH_KHAC_TAI_MUI_HONG',source:'KSKT18_CACBENHVETMH'},{header:'KHAM_TAI_MUI_HONG_PL',source:'KSKT18_PHANLOAI_TMH'},
 {header:'HAM_TREN',source:'KSKT18_HAMTREN'},{header:'HAM_DUOI',source:'KSKT18_HAMDUOI'},
 {header:'BENH_KHAC_RANG_HAM_MAT',source:'KSKT18_CACBENHVERHM'},{header:'KHAM_RANG_HAM_MAT_PL',source:'KSKT18_PHANLOAI_RHM'},
 {header:'PHAN_LOAI_SK',source:'KSKT18_PHANLOAISUCKHOE_CHON'},{header:'KET_LUAN_BENH',source:'KSKT18_CHANDOANRAVIEN'},
 {header:'CAC_BENH_TAT_NEU_CO',source:'KSKT18_TINHTRANGBENH'}
];
const KSK_REPORT_IDS=new Set(['ksk-can-bo','ksk-dinh-ky','ksk-duoi-18','ksk-tren-18']);
const KSK_BASE_HEADERS=new Set(['MA_CSKCB','MA_LK','NGAY_VAO','HO_TEN','GIOI_TINH','NGAY_SINH','MA_DAN_TOC','SO_CCCD','NGAYCAP_CCCD','NOICAP_CCCD','DIA_CHI','MA_NGHE_NGHIEP','NOI_LAM_VIEC_HOC_TAP','DIEN_THOAI']);
const KSK_SOURCE_OVERRIDES:Record<string,Record<string,string|string[]>>={
 'ksk-dinh-ky':{
  NOI_LAM_VIEC_HOC_TAP:'KSK_DINHKY_CONGTAC',TSBT_BENH_KHAC:'KSK_DINHKY_TIENSU_BENHTAT',
  TSBT_DANG_DIEU_TRI_BENH:'KSK_DINHKY_DANGDIEUTRIBENH',TSBT_THAI_SAN:'KSK_DINHKY_TIENSU_THAISAN'
 },
 'ksk-can-bo':{
  NOI_LAM_VIEC_HOC_TAP:'KSKCB_NOICONGTAC',TSGD_MA_BENH:'KSKCB_TIENSUGIADINH',TSBT_MA_BENH:'KSKCB_TIENSUBANTHAN',
  KET_LUAN_BENH:'KSKCB_DANHGIA',CAC_BENH_TAT_NEU_CO:'KSKCB_CACBENHTATKHAC',BENH_KHAC_RANG_HAM_MAT:'KSKCB_CACBENHVERMH'
 },
 'ksk-duoi-18':{
  TSGD_MAC_BENH:'KSKD18_TIENSUGIADINH_NHIEM',TSBT_DANG_DIEU_TRI_BENH:'KSKD18_TIENSU_BENHTAT_DT',
  TSBT_MA_BENH:'KSKD18_TIENSUBENHNEUCO'
 }
};
const KSK_D18_EMPTY_HEADERS=new Set([
 'NOI_KHOA_TUAN_HOAN','NOI_KHOA_TUAN_HOAN_PL','NOI_KHOA_HO_HAP','NOI_KHOA_HO_HAP_PL','NOI_KHOA_TIEU_HOA','NOI_KHOA_TIEU_HOA_PL',
 'NOI_KHOA_THAN_TN_SD','NOI_KHOA_THAN_TIETNIEU_PL','NOI_KHOA_NOI_TIET','NOI_KHOA_NOI_TIET_PL','NOI_KHOA_CO_XUONG_KHOP',
 'NOI_KHOA_CO_XUONG_KHOP_PL','NOI_KHOA_THAN_KINH','NOI_KHOA_THAN_KINH_PL','NOI_KHOA_TAM_THAN','NOI_KHOA_TAM_THAN_PL',
 'KET_QUA_KHAM_NGOAI_KHOA','KHAM_NGOAI_KHOA_PL','KET_QUA_KHAM_DA_LIEU','KHAM_DA_LIEU_PL','KET_QUA_KHAM_SAN_PHU_KHOA',
 'KHAM_SAN_PHU_KHOA_PL','KHAM_MAT_PL','KHAM_TAI_MUI_HONG_PL','KHAM_RANG_HAM_MAT_PL','CAC_BENH_TAT_NEU_CO'
]);
@Component({selector:'app-root',imports:[CommonModule,FormsModule],templateUrl:'./app.html'})
export class App implements OnInit{
 private cd=inject(ChangeDetectorRef);
 private http=inject(HttpClient);page:Page='dashboard';menuOpen=true;groups:Record<string,boolean>={tongquan:true,tichhop:true,baocao:true,hethong:true};apis:ApiItem[]=[];selected?:ApiItem;query='';statusFilter='all';sortAsc=true;apiKey='';connectionId=sessionStorage.getItem('hisConnectionId')||'';connection?:Connection;showLogin=false;login={domain:'',username:'',password:''};loginError='';loading=false;connecting=false;dashboardDate=this.dateInput(new Date());notice='Kết nối HIS và bấm Lấy dữ liệu để hiển thị Dashboard.';noticeOk=false;patients:any[]=[];departments:any[]=[];rooms:any[]=[];activities:{label:string;ok:boolean;detail:string}[]=[];
 selectedReport?:ApiItem;reportParams:Record<string,string>={};reportRows:any[]=[];reportLoading=false;reportError='';reportPage=1;reportPageSize=20;
 async ngOnInit(){await this.bootstrap();this.cd.detectChanges()}
 get activeApis(){return this.apis.filter(x=>x.status==='Đang hoạt động').length}
 get reportApis(){return this.apis.filter(x=>x.type==='Báo cáo động')}
 get reportColumns(){return this.reportRows.length?Object.keys(this.reportRows[0]):[]}
 get visibleReportRows(){const start=(this.reportPage-1)*this.reportPageSize;return this.reportRows.slice(start,start+this.reportPageSize)}
 get reportPages(){return Math.max(1,Math.ceil(this.reportRows.length/this.reportPageSize))}
 get filteredApis(){const q=this.query.trim().toLowerCase(),status:{[key:string]:string}={active:'Đang hoạt động',paused:'Tạm dừng',cancelled:'Đã hủy'};return this.apis.filter(x=>(this.statusFilter==='all'||x.status===status[this.statusFilter])&&(`${x.name} ${x.path}`.toLowerCase().includes(q))).sort((a,b)=>a.name.localeCompare(b.name,'vi')*(this.sortAsc?1:-1))}
 get bedPlan(){return this.departments.reduce((s,x)=>s+Number(x.GiuongKeHoach||0),0)}get bedActual(){return this.departments.reduce((s,x)=>s+Number(x.GiuongThucKe||0),0)}get bedRatio(){return this.bedPlan?Math.min(100,Math.round(this.bedActual/this.bedPlan*100)):0}
 get receptions(){const map=new Map<string,any>();for(const[i,x]of this.patients.entries()){const key=String(x.TIEPNHANID??x.TiepNhanId??x.MABENHNHAN??i);if(!map.has(key))map.set(key,x)}return[...map.values()]}
 get departmentBars(){const map=new Map<string,number>();for(const x of this.receptions){const name=this.pick(x,['TENKHOA_BD','TenKhoaBd','TENKHOA','TenKhoa','KHOABATDAU','TENKHOABATDAU'])||'Chưa xác định';map.set(name,(map.get(name)||0)+1)}const rows=[...map].sort((a,b)=>b[1]-a[1]).slice(0,8),max=Math.max(...rows.map(x=>x[1]),1);return rows.map(([name,value])=>({name,value,width:Math.max(2,value/max*100)}))}
 get roomBars(){const map=new Map<string,number>();for(const x of this.rooms){const name=String(x.TenKhoa||'Chưa xác định');map.set(name,(map.get(name)||0)+1)}const rows=[...map].sort((a,b)=>b[1]-a[1]).slice(0,6),max=Math.max(...rows.map(x=>x[1]),1);return rows.map(([name,value])=>({name,value,width:Math.max(2,value/max*100)}))}
 get outpatientCount(){return this.receptions.filter(x=>Number(x.LOAIBENHANID??x.LoaiBenhAnId)===23).length}get otherPatientCount(){return Math.max(0,this.receptions.length-this.outpatientCount)}get outpatientRatio(){return this.receptions.length?Math.round(this.outpatientCount/this.receptions.length*100):0}
 get hourlySeries(){const values=Array.from({length:24},(_,hour)=>({hour,value:0}));for(const x of this.receptions){const text=String(x.NGAYTIEPNHAN??x.NgayTiepNhan??''),match=text.match(/\s(\d{2}):/);if(match)values[Number(match[1])].value++}return values}get hourlyPoints(){const max=Math.max(...this.hourlySeries.map(x=>x.value),1);return this.hourlySeries.map((x,i)=>`${i/23*100},${92-x.value/max*75}`).join(' ')}get hourlyAreaPoints(){return`0,100 ${this.hourlyPoints} 100,100`}get peakHour(){return this.hourlySeries.reduce((best,x)=>x.value>best.value?x:best,{hour:0,value:0})}
 get todayLabel(){return new Date().toLocaleDateString('vi-VN',{weekday:'long',day:'2-digit',month:'2-digit',year:'numeric'})}get maskedKey(){return this.apiKey?'••••••••••••':'Cấp riêng'}
 nav(page:Page){this.page=page;this.selected=undefined;location.hash=page;if(page==='reports')this.prepareReports()}toggleGroup(group:string){this.groups[group]=!this.groups[group]}cycleFilter(){const values=['all','active','paused','cancelled'];this.statusFilter=values[(values.indexOf(this.statusFilter)+1)%values.length]}format(value:number){return new Intl.NumberFormat('vi-VN').format(value||0)}
 private dateInput(d:Date){return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}private viDate(value:string){const[y,m,d]=value.split('-');return`${d}/${m}/${y}`}private reportDate(){return this.viDate(this.dashboardDate)}private pick(row:any,names:string[]){for(const n of names)if(row?.[n]!=null&&String(row[n]).trim())return row[n];return''}private headers(){return new HttpHeaders({'Content-Type':'application/json','X-API-Key':this.apiKey,'X-HIS-Connection-Id':this.connectionId})}private async post(path:string,body:unknown={}){return await this.http.post<any>(path,body,{headers:this.headers()}).toPromise()}
 async bootstrap(){try{const catalog=await this.http.get<any>('/api/catalog').toPromise();this.apis=catalog.data||[];const key=await this.http.get<any>('/api/admin/api-key').toPromise();this.apiKey=key.apiKey||''}catch{}await this.refreshConnection();const hash=location.hash;this.page=hash==='#apis'?'apis':hash==='#reports'?'reports':'dashboard';this.clearDashboard();if(this.page==='reports')await this.prepareReports()}
 async refreshConnection(){try{if(!this.apiKey||!this.connectionId)throw new Error();const out=await this.http.get<any>('/api/v1/connections/current',{headers:this.headers()}).toPromise();this.connection=out.data}catch{this.connection=undefined;this.connectionId='';sessionStorage.removeItem('hisConnectionId')}}
 async connect(){if(this.connecting)return;this.loginError='';this.connecting=true;try{const out=await this.http.post<any>('/api/v1/connections',this.login,{headers:new HttpHeaders({'Content-Type':'application/json','X-API-Key':this.apiKey})}).toPromise();this.connectionId=out.data.connectionId;sessionStorage.setItem('hisConnectionId',this.connectionId);this.login.password='';await this.refreshConnection();this.showLogin=false;this.clearDashboard()}catch(e:any){this.loginError=e?.error?.error?.message||'Không thể kết nối HIS'}finally{this.connecting=false;this.cd.detectChanges()}}
 async logout(){try{await this.http.delete('/api/v1/connections/current',{headers:this.headers()}).toPromise()}catch{}this.connection=undefined;this.connectionId='';sessionStorage.removeItem('hisConnectionId');this.clearDashboard();this.cd.detectChanges()}
 clearDashboard(){this.patients=[];this.departments=[];this.rooms=[];this.activities=[];this.noticeOk=false;this.notice='Kết nối HIS và bấm Lấy dữ liệu để hiển thị Dashboard.'}
 async loadDashboard(){if(!this.connection){this.clearDashboard();return}this.loading=true;this.notice='Đang lấy dữ liệu từ các API hiện có...';this.noticeOk=false;const sources=[{key:'patients',label:'Tiếp đón theo ngày',run:()=>this.post('/api/v1/reports/benh-nhan-tiep-don-ngay',{ngaytiepnhan:this.reportDate()})},{key:'departments',label:'Danh mục khoa',run:()=>this.post('/api/v1/catalogs/khoa')},{key:'rooms',label:'Danh mục phòng',run:()=>this.post('/api/v1/catalogs/phong')}];const results=await Promise.all(sources.map(async s=>{try{const out=await s.run();return{...s,ok:true,data:out.data||[],detail:`${this.format(out.meta?.count??out.data?.length??0)} bản ghi`}}catch(e:any){return{...s,ok:false,data:[],detail:e?.error?.error?.message||'Không tải được dữ liệu'}}}));for(const r of results)(this as any)[r.key]=r.data;this.activities=results.map(r=>({label:r.label,ok:r.ok,detail:r.detail}));const failed=results.filter(x=>!x.ok).length;this.noticeOk=!failed;this.notice=failed?`${failed} nguồn dữ liệu chưa tải được.`:`Đã cập nhật 3 nguồn dữ liệu lúc ${new Date().toLocaleTimeString('vi-VN')}`;this.loading=false;this.cd.detectChanges()}
 async prepareReports(){if(!this.selectedReport&&this.reportApis.length)this.selectReport(this.reportApis[0]);if(this.connection&&!this.departments.length){try{const out=await this.post('/api/v1/catalogs/khoa');this.departments=out.data||[]}catch{}this.cd.detectChanges()}}
 openReport(report:ApiItem){this.page='reports';location.hash='reports';if(this.selectedReport?.id!==report.id)this.selectReport(report);this.prepareReports()}
 selectReport(report:ApiItem){this.selectedReport=report;const today=this.dateInput(new Date()),first=today.slice(0,8)+'01';this.reportParams={tuNgay:first,denNgay:today,khoaId:'-1'};this.reportRows=[];this.reportError='';this.reportPage=1}
 resetReport(){if(this.selectedReport)this.selectReport(this.selectedReport)}
 async runReport(){if(!this.selectedReport||this.reportLoading)return;if(!this.connection){this.reportError='Vui lòng đăng nhập HIS trước khi xem báo cáo.';return}this.reportLoading=true;this.reportError='';this.reportRows=[];try{const body={tuNgay:this.viDate(this.reportParams['tuNgay']),denNgay:this.viDate(this.reportParams['denNgay']),khoaId:this.reportParams['khoaId']||'-1'};const out=await this.post(this.selectedReport.path,body);this.reportRows=out.data||[];this.reportPage=1}catch(e:any){this.reportError=e?.error?.error?.message||'Không tải được dữ liệu báo cáo.'}finally{this.reportLoading=false;this.cd.detectChanges()}}
 exportReport(){if(!this.reportRows.length)return;const quote=(v:any)=>`"${String(v??'').replace(/"/g,'""')}"`;const csv='\uFEFF'+[this.reportColumns.map(quote).join(','),...this.reportRows.map(row=>this.reportColumns.map(c=>quote(row[c])).join(','))].join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`${this.selectedReport?.id||'bao-cao'}-${this.reportParams['tuNgay']}-${this.reportParams['denNgay']}.csv`;link.click();URL.revokeObjectURL(url)}
 async exportXlsx(){if(!this.reportRows.length)return;try{const XLSX=await import('xlsx'),reportId=this.normalizedReportId();if(KSK_REPORT_IDS.has(reportId)){const response=await fetch('/assets/templates/Import_KSK_Tren%2018.xlsm');if(!response.ok)throw new Error('Không tải được file mẫu Import_KSK_Tren 18.xlsm');const workbook=XLSX.read(await response.arrayBuffer(),{type:'array',cellStyles:true,bookVBA:true});const sheet=workbook.Sheets['Trên 18'];if(!sheet)throw new Error('File mẫu không có sheet Trên 18');this.fillKskT18Template(XLSX,sheet);XLSX.writeFile(workbook,`Import_KSK_${reportId}-${this.reportParams['tuNgay']}-${this.reportParams['denNgay']}.xlsx`,{bookType:'xlsx',compression:true,cellStyles:true});return}const mapped=this.xlsxExportData();const sheet=XLSX.utils.aoa_to_sheet([mapped.headers,...mapped.rows]);sheet['!cols']=mapped.headers.map((column,index)=>({wch:Math.min(45,Math.max(12,column.length+2,...mapped.rows.slice(0,100).map(row=>String(row[index]??'').length+2)))}));sheet['!autofilter']={ref:sheet['!ref']||'A1:A1'};const workbook=XLSX.utils.book_new();XLSX.utils.book_append_sheet(workbook,sheet,'Bao cao');XLSX.writeFile(workbook,`${this.selectedReport?.id||'bao-cao'}-${this.reportParams['tuNgay']}-${this.reportParams['denNgay']}.xlsx`,{compression:true})}catch(e:any){this.reportError=e?.message||'Không thể xuất file XLSX theo mẫu.';this.cd.detectChanges()}}
 private fillKskT18Template(XLSX:any,sheet:any){const mapped=this.xlsxExportData(),values=mapped.rows.map(row=>Object.fromEntries(mapped.headers.map((header,index)=>[header,row[index]])));const range=XLSX.utils.decode_range(sheet['!ref']||'A1:CX235'),startRow=3,lastRow=Math.max(range.e.r,startRow+values.length-1),lastColumn=range.e.c;const templateStyles=Array.from({length:lastColumn+1},(_,column)=>{const cell=sheet[XLSX.utils.encode_cell({r:startRow,c:column})];return cell?.s});const columnKeys=Array.from({length:lastColumn+1},(_,column)=>column===0?'TT':String(sheet[XLSX.utils.encode_cell({r:1,c:column})]?.v||'').trim());for(let row=startRow;row<=lastRow;row++)for(let column=0;column<=lastColumn;column++){const address=XLSX.utils.encode_cell({r:row,c:column}),existing=sheet[address]||{},style=existing.s??templateStyles[column];delete existing.v;delete existing.w;delete existing.f;delete existing.t;if(style!=null)existing.s=style;const value=values[row-startRow]?.[columnKeys[column]];if(value!==undefined&&value!==null&&value!==''){existing.v=value;existing.t=typeof value==='number'?'n':'s';sheet[address]=existing}else if(Object.keys(existing).length)sheet[address]=existing;else delete sheet[address]}sheet['!ref']=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:Math.max(2,startRow+values.length-1),c:lastColumn}})}
 xlsxExportData(){const reportId=this.normalizedReportId();if(!KSK_REPORT_IDS.has(reportId))return{headers:this.reportColumns,rows:this.reportRows.map(row=>this.reportColumns.map(column=>this.reportValue(row,column)))};const columns=this.kskExportColumns(reportId),headers=['TT',...columns.map(column=>column.header)];const rows=this.reportRows.map((row,index)=>[index+1,...columns.map(column=>this.mappedExportValue(row,column.source,column.header))]);return{headers,rows}}
 private normalizedReportId(){return String(this.selectedReport?.id||'').replace(/^report-/,'')}
 private kskExportColumns(reportId:string){if(reportId==='ksk-tren-18')return KSK_T18_EXPORT_COLUMNS;const prefix=reportId==='ksk-dinh-ky'?'KSK_DINHKY_':reportId==='ksk-can-bo'?'KSKCB_':'KSKD18_';const overrides=KSK_SOURCE_OVERRIDES[reportId]||{};return KSK_T18_EXPORT_COLUMNS.map(column=>{if(overrides[column.header])return{header:column.header,source:overrides[column.header]};if(reportId==='ksk-duoi-18'&&KSK_D18_EMPTY_HEADERS.has(column.header))return{header:column.header,source:''};if((reportId==='ksk-dinh-ky'||reportId==='ksk-can-bo')&&KSK_BASE_HEADERS.has(column.header))return{header:column.header,source:column.header};if(Array.isArray(column.source))return{header:column.header,source:column.source.map(source=>this.convertKskSource(source,prefix,reportId))};return{header:column.header,source:this.convertKskSource(column.source,prefix,reportId)}})}
 private convertKskSource(source:string,prefix:string,reportId:string){if(!source.startsWith('KSKT18_'))return source;let suffix=source.slice(7);if(reportId==='ksk-can-bo')suffix=suffix.replace(/^PHANLOAI_/,'PHANLOAI').replace(/_CHON$/,'');if(reportId==='ksk-dinh-ky')suffix=suffix.replace(/_CHON$/,'');return prefix+suffix}
 private mappedExportValue(row:any,source:string|string[],header?:string){const keys=Array.isArray(source)?source:[source];const values=keys.map(key=>{const actual=Object.keys(row||{}).find(name=>name.toUpperCase()===key.toUpperCase());return actual?this.reportValue(row,actual):''});const mapped=Array.isArray(source)?values.filter(value=>String(value).trim()).join('/'):values[0];if(String(mapped??'').trim()||!header)return mapped;const direct=Object.keys(row||{}).find(name=>name.toUpperCase()===header.toUpperCase());return direct?this.reportValue(row,direct):mapped}
 reportValue(row:any,column:string){const value=row?.[column];return value==null?'':typeof value==='object'?JSON.stringify(value):value}
 runApi(api:ApiItem){this.selected=api}async copySnippet(){await navigator.clipboard.writeText(this.snippet())}snippet(){if(!this.selected)return'';const connection=this.selected.id==='his-connection'?'':`\nX-HIS-Connection-Id: ${this.connectionId||'<HIS_CONNECTION_ID>'}`;return`${this.selected.method} ${location.origin}${this.selected.path}\nX-API-Key: ${this.apiKey||'<API_KEY>'}${connection}\nContent-Type: application/json\n\n${JSON.stringify(this.selected.sampleBody,null,2)}`}
}
