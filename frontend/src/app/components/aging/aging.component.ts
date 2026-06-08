// src/app/components/aging/aging.component.ts
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { AgingData, AgingItem } from '../../models/sap.models';

@Component({
  selector: 'app-aging',
  templateUrl: './aging.component.html',
  styleUrls: ['./aging.component.scss'],
})
export class AgingComponent implements OnInit {
  agingData    : AgingData | null = null;
  filteredItems: AgingItem[] = [];

  loading = true;
  error   = '';
  search  = '';

  totalOutstanding = 0;
  selectedBucket: string | null = null;
  bucketOrder = ['Current', '1-30', '31-60', '90+'];
  bucketList: { label: string; count: number; total: number; currency: string; pct: number; severity: 'success'|'warning'|'info'|'danger' }[] = [];

  // Chart
  barData    : any = null;
  barOptions : any = null;

  private bucketSeverity: Record<string, 'success'|'warning'|'info'|'danger'> = {
    'Current': 'success',
    '1-30'   : 'info',
    '31-60'  : 'warning',
    '61-90'  : 'danger',
    '90+'    : 'danger',
  };

  private bucketColor: Record<string, string> = {
    'Current': 'rgba(16,185,129,.75)',
    '1-30'   : 'rgba(59,130,246,.75)',
    '31-60'  : 'rgba(245,158,11,.75)',
    '61-90'  : 'rgba(239,68,68,.75)',
    '90+'    : 'rgba(153,27,27,.75)',
  };

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true; this.error = '';
    this.api.getAging(this.search).subscribe({
      next: res => {
        this.agingData = res.data;
        this.buildBucketList();
        this.buildChart();
        this.applyFilter();
        this.loading = false;
      },
      error: err => { this.error = err.message; this.loading = false; },
    });
  }

  buildBucketList(): void {
    if (!this.agingData) return;
    this.totalOutstanding = this.agingData.aging.reduce((s, i) => s + (parseFloat(i.NETWR) || 0), 0);
    const bs = this.agingData.bucketSummary || {};

    const normalized: Record<string, { count: number; total: number; currency: string }> = {};
    Object.entries(bs).forEach(([label, data]) => {
      const normalizedLabel = label === '61-90' ? '90+' : label;
      if (!normalized[normalizedLabel]) {
        normalized[normalizedLabel] = { count: 0, total: 0, currency: data.currency };
      }
      normalized[normalizedLabel].count += data.count;
      normalized[normalizedLabel].total += data.total;
    });

    this.bucketList = this.bucketOrder.map(label => {
      const data = normalized[label] || { count: 0, total: 0, currency: this.currency };
      return {
        label,
        count   : data.count,
        total   : data.total,
        currency: data.currency,
        pct     : this.totalOutstanding > 0 ? Math.round((data.total / this.totalOutstanding) * 100) : 0,
        severity: this.bucketSeverity[label] || 'info',
      };
    });
  }

  buildChart(): void {
    const labels = this.bucketList.map(b => `${b.label} days`);
    const values = this.bucketList.map(b => b.total);
    const colors = this.bucketList.map(b => this.bucketColor[b.label] || 'rgba(107,114,128,.6)');

    this.barData = {
      labels,
      datasets: [{
        label: 'Outstanding',
        data: values,
        backgroundColor: colors,
        borderRadius: 8,
        borderSkipped: false,
      }],
    };

    this.barOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: (ctx: any) => ` ${this.formatAmount(ctx.raw)}` } },
      },
      scales: {
        x: { grid: { display: false }, ticks: { font: { size: 12 } } },
        y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 11 } } },
      },
    };
  }

  applyFilter(): void {
    if (!this.agingData) return;
    const q = this.search.toLowerCase();
    let rows = q
      ? this.agingData.aging.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(q)))
      : [...this.agingData.aging];

    if (this.selectedBucket) {
      rows = rows.filter(i => this.normalizeBucket(i.AGING_BUCKET) === this.selectedBucket);
    }

    this.filteredItems = rows;
  }

  selectBucket(bucket: string): void {
    this.selectedBucket = this.selectedBucket === bucket ? null : bucket;
    this.applyFilter();
  }

  normalizeBucket(bucket: string): string {
    if (!bucket) { return 'Current'; }
    if (bucket === '61-90') { return '90+'; }
    return bucket;
  }

  onSearch(): void { this.applyFilter(); }

  exportCsv(): void {
    const hdrs  = ['Document #', 'Invoice Date', 'Due Date', 'Aging Days', 'Bucket', 'Net Value', 'Currency', 'Status'];
    const lines = this.filteredItems.map(r => [
      r.VBELN, r.FKDAT, r.ZFBDT, r.AGING_DAYS, r.AGING_BUCKET, r.NETWR, r.WAERK, r.RFBSK ? 'Cleared' : 'Open'
    ]);
    const csv = [hdrs, ...lines].map(r => r.join(',')).join('\n');
    const a   = document.createElement('a');
    a.href    = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `aging_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  bucketSev(bucket: string): 'success'|'warning'|'info'|'danger' {
    return this.bucketSeverity[bucket] || 'info';
  }

  paidSeverity(rfbsk: string): 'success'|'secondary' {
    return rfbsk ? 'success' : 'secondary';
  }
  paidLabel(rfbsk: string): string { return rfbsk ? 'Cleared' : 'Open'; }

  formatDate(d: string): string {
    if (!d || d === '0000-00-00') return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  }

  formatAmount(v: string | number): string {
    const n = typeof v === 'string' ? parseFloat(v) : v;
    if (isNaN(n)) return '—';
    return n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  agingDays(raw: string): string {
    const n = parseInt((raw || '').trim(), 10);
    if (isNaN(n) || n <= 0) return '—';
    return n.toLocaleString();
  }

  get currency(): string { return this.agingData?.aging?.[0]?.WAERK || 'SAR'; }
}
