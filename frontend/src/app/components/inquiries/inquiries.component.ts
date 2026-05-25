import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-inquiries',
  templateUrl: './inquiries.component.html',
  styleUrls: ['./inquiries.component.scss'],
})
export class InquiriesComponent implements OnInit {

  inquiries : any[] = [];
  filtered  : any[] = [];
  loading   = true;
  error     = '';
  search    = '';

  // Detail modal
  selected   : any = null;
  showDetail = false;

  // Per-column filters
  cf: Record<string, string> = {};

  // Charts
  barData    : any = null;
  barOptions : any = null;
  donutData  : any = null;
  donutOptions: any = null;

  // ── KPIs ──────────────────────────────────────────────────────────────────
  get totalCount()    { return this.inquiries.length; }
  get totalValue()    { return this.inquiries.reduce((s, i) => s + (parseFloat(i.NETWR) || 0), 0); }
  get totalQty()      { return this.inquiries.reduce((s, i) => s + (parseFloat(i.KWMENG) || 0), 0); }
  get uniqueProducts(){ return new Set(this.inquiries.map(i => i.MAKTX).filter(Boolean)).size; }
  get currency()      { return this.inquiries[0]?.WAERK || 'EUR'; }

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true;
    this.error   = '';
    this.api.getCustomerInquiries(this.search).subscribe({
      next: res => {
        this.inquiries = res.data?.inquiries ?? [];
        this.applyFilter();
        this.buildCharts();
        this.loading = false;
      },
      error: err => {
        this.error     = err?.message ?? 'Failed to load inquiries.';
        this.loading   = false;
        this.inquiries = [];
        this.filtered  = [];
      },
    });
  }

  applyFilter(): void {
    const q = this.search.trim().toLowerCase();
    let result = q
      ? this.inquiries.filter(i => Object.values(i).some(v => String(v ?? '').toLowerCase().includes(q)))
      : [...this.inquiries];

    // Per-column filters stacked on top
    Object.entries(this.cf).forEach(([field, val]) => {
      if (val?.trim()) {
        const fv = val.trim().toLowerCase();
        result = result.filter(i => String(i[field] ?? '').toLowerCase().includes(fv));
      }
    });

    this.filtered = result;
  }

  buildCharts(): void {
    if (!this.inquiries.length) return;

    // ── Bar: top 7 products by total quoted value ─────────────────────────
    const productMap: Record<string, number> = {};
    this.inquiries.forEach(i => {
      const name = i.MAKTX || i.MATNR || 'Unknown';
      productMap[name] = (productMap[name] || 0) + (parseFloat(i.NETWR) || 0);
    });
    const sorted  = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 7);
    const barColors = ['#E31E24','#3B82F6','#10B981','#F59E0B','#8B5CF6','#EC4899','#06B6D4'];

    this.barData = {
      labels: sorted.map(([name]) => name),
      datasets: [{
        label: `Value (${this.currency})`,
        data: sorted.map(([, val]) => val),
        backgroundColor: sorted.map((_, i) => barColors[i % barColors.length]),
        borderRadius: 7,
        borderSkipped: false,
      }],
    };
    this.barOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx: any) => ` ${this.formatAmount(ctx.raw)} ${this.currency}` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 11, family: "'Inter', sans-serif" }, color: '#6B7280' } },
        y: { grid: { color: 'rgba(0,0,0,.05)' }, ticks: { font: { size: 11, family: "'Inter', sans-serif" }, color: '#6B7280' } },
      },
    };

    // ── Doughnut: inquiries by product count ──────────────────────────────
    const countMap: Record<string, number> = {};
    this.inquiries.forEach(i => {
      const name = i.MAKTX || i.MATNR || 'Unknown';
      countMap[name] = (countMap[name] || 0) + 1;
    });
    const donutEntries = Object.entries(countMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

    this.donutData = {
      labels: donutEntries.map(([name]) => name),
      datasets: [{
        data: donutEntries.map(([, cnt]) => cnt),
        backgroundColor: barColors.slice(0, donutEntries.length),
        borderColor: '#ffffff',
        borderWidth: 3,
      }],
    };
    this.donutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { padding: 14, font: { size: 11, family: "'Inter', sans-serif" }, color: '#6B7280' },
        },
        tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} inquiry${ctx.raw !== 1 ? 's' : ''}` } },
      },
    };
  }

  onSearch(): void { this.applyFilter(); }
  onColFilter(): void { this.applyFilter(); }
  onRefresh(): void { this.cf = {}; this.search = ''; this.load(); }

  openDetail(inq: any): void { this.selected = inq; this.showDetail = true; }
  closeDetail(): void { this.showDetail = false; this.selected = null; }

  formatDate(d: string): string {
    if (!d || d === '0000-00-00') return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  }

  formatAmount(v: string | number): string {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    if (isNaN(n)) return '—';
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  exportCsv(): void {
    const headers = ['Inquiry #', 'Product', 'Material', 'Qty', 'Unit', 'Value', 'Currency', 'Date', 'Valid From', 'Valid To'];
    const rows = this.filtered.map(i => [
      i.VBELN, i.MAKTX || '', i.MATNR || '', i.KWMENG || '', i.VRKME || '',
      i.NETWR || '', i.WAERK || '', i.ERDAT || '', i.ANGDT || '', i.BNDDT || ''
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a   = document.createElement('a');
    a.href    = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `inquiries_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }
}
