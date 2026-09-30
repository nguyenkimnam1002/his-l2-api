import { TestBed } from '@angular/core/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the VNPT HIS L2 navigation', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.agency')?.textContent).toContain('VNPT HIS L2');
  });

  it('maps the over-18 XLSX export to the import template', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.selectedReport = { id: 'report-ksk-tren-18' } as any;
    app.reportRows = [{
      MA_CSKCB: '26007', TENBENHNHAN: 'NGUYEN VAN A', NGAY_SINH_DMY: '01/01/1980',
      DC_HIENTAI: 'Vinh Phuc', KSKT18_NGAYVAOKSK: '30/09/2026',
      KSKT18_HUYETAP1: '120', KSKT18_HUYETAP2: '80', KSKT18_BMI: '22.5'
    }];

    const exported = app.xlsxExportData();
    expect(exported.headers.length).toBe(101);
    expect(exported.headers.slice(0, 6)).toEqual(['TT', 'MA_CSKCB', 'MA_LK', 'MA_GTIN_CSKCB', 'NGAY_VAO', 'HO_TEN']);
    expect(exported.rows[0][0]).toBe(1);
    expect(exported.rows[0][exported.headers.indexOf('NGAY_VAO')]).toBe('30/09/2026');
    expect(exported.rows[0][exported.headers.indexOf('HO_TEN')]).toBe('NGUYEN VAN A');
    expect(exported.rows[0][exported.headers.indexOf('DIA_CHI')]).toBe('Vinh Phuc');
    expect(exported.rows[0][exported.headers.indexOf('HUYET_AP')]).toBe('120/80');
    expect(exported.rows[0][exported.headers.indexOf('CHI_SO_BMI')]).toBe('22.5');
  });

  it.each([
    ['report-ksk-dinh-ky', { HO_TEN: 'BN DINH KY', KSK_DINHKY_BMI: '21', KSK_DINHKY_HUYETAP1: '110', KSK_DINHKY_HUYETAP2: '70' }, 'BN DINH KY', '21', '110/70'],
    ['report-ksk-can-bo', { HO_TEN: 'BN CAN BO', KSKCB_CHIEUCAO: '170', KSKCB_HUYETAP1: '120', KSKCB_HUYETAP2: '80' }, 'BN CAN BO', '', '120/80'],
    ['report-ksk-duoi-18', { TENBENHNHAN: 'BN DUOI 18', KSKD18_BMI: '18', KSKD18_HUYETAP1: '100', KSKD18_HUYETAP2: '60' }, 'BN DUOI 18', '18', '100/60'],
  ])('uses the common import template mapping for %s', (id, row, name, bmi, bloodPressure) => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    app.selectedReport = { id } as any;
    app.reportRows = [row];
    const exported = app.xlsxExportData();
    expect(exported.headers.length).toBe(101);
    expect(exported.rows[0][exported.headers.indexOf('HO_TEN')]).toBe(name);
    expect(exported.rows[0][exported.headers.indexOf('CHI_SO_BMI')]).toBe(bmi);
    expect(exported.rows[0][exported.headers.indexOf('HUYET_AP')]).toBe(bloodPressure);
  });
});
