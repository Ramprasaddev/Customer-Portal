// src/app/components/finance/finance.component.ts
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { FinanceData, CreditDebit, Invoice } from '../../models/sap.models';

@Component({
  selector: 'app-finance',
  templateUrl: './finance.component.html',
  styleUrls: ['./finance.component.scss'],
})
export class FinanceComponent implements OnInit {
  activeTab: 'creditDebit' | 'invoices' = 'creditDebit';

  financeData : FinanceData | null = null;
  filteredCD  : CreditDebit[] = [];
  filteredInv : Invoice[]     = [];

  loading  = true;
  error    = '';
  search   = '';
  dateFrom = '2024-01-01';
  dateTo   = new Date().toISOString().split('T')[0];

  // Totals
  totalCredit   = 0;
  totalDebit    = 0;
  totalInvoices = 0;

  // Chart
  donutData   : any = null;
  donutOptions: any = null;
  barData     : any = null;
  barOptions  : any = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true; this.error = '';
    this.api.getFinance(this.dateFrom, this.dateTo, this.search).subscribe({
      next: res => {
        this.financeData = res.data;
        this.calcTotals();
        this.buildCharts();
        this.applyFilter();
        this.loading = false;
      },
      error: err => { this.error = err.message; this.loading = false; },
    });
  }

  calcTotals(): void {
    if (!this.financeData) return;
    this.totalCredit = this.financeData.creditDebit
      .filter(i => (i.FKART || '').toUpperCase().startsWith('G'))
      .reduce((s, i) => s + (parseFloat(i.NETWR) || 0), 0);
    this.totalDebit = this.financeData.creditDebit
      .filter(i => (i.FKART || '').toUpperCase().startsWith('L'))
      .reduce((s, i) => s + (parseFloat(i.NETWR) || 0), 0);
    this.totalInvoices = (this.financeData.invoices || [])
      .reduce((s, i) => s + (parseFloat(i.NETWR) || 0), 0);
  }

  buildCharts(): void {
    if (!this.financeData) return;

    // Donut – credit memo count vs debit memo count only
    const creditCount = this.financeData.creditDebit.filter(i => (i.FKART || '').toUpperCase().startsWith('G')).length;
    const debitCount  = this.financeData.creditDebit.filter(i => (i.FKART || '').toUpperCase().startsWith('L')).length;

    this.donutData = {
      labels: ['Credit Memos', 'Debit Memos'],
      datasets: [{
        data: [creditCount, debitCount],
        backgroundColor: ['#10B981', '#E31E24'],
        borderColor: ['#fff', '#fff'],
        borderWidth: 3,
      }],
    };
    this.donutOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: { position: 'bottom', labels: { padding: 16, font: { size: 12 } } },
        tooltip: { callbacks: { label: (ctx: any) => ` ${ctx.raw} document${ctx.raw !== 1 ? 's' : ''}` } },
      },
    };

    // Bar – top 8 credit/debit items by value
    const top8 = [...this.financeData.creditDebit]
      .sort((a, b) => (parseFloat(b.NETWR) || 0) - (parseFloat(a.NETWR) || 0))
      .slice(0, 8);

    this.barData = {
      labels: top8.map(i => i.VBELN?.slice(-6) || '—'),
      datasets: [{
        label: 'Net Value',
        data: top8.map(i => parseFloat(i.NETWR) || 0),
        backgroundColor: top8.map(i =>
          (i.FKART || '').toUpperCase().startsWith('G') ? 'rgba(16,185,129,.75)' : 'rgba(227,30,36,.75)'
        ),
        borderRadius: 6,
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
        x: { grid: { display: false }, ticks: { font: { size: 11 } } },
        y: { grid: { color: 'rgba(0,0,0,.04)' }, ticks: { font: { size: 11 } } },
      },
    };
  }

  applyFilter(): void {
    if (!this.financeData) return;
    const q = this.search.toLowerCase();
    this.filteredCD  = q
      ? this.financeData.creditDebit.filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(q)))
      : [...this.financeData.creditDebit];
    this.filteredInv = q
      ? (this.financeData.invoices || []).filter(i => Object.values(i).some(v => String(v).toLowerCase().includes(q)))
      : [...(this.financeData.invoices || [])];
  }

  onSearch(): void { this.applyFilter(); }
  onDateChange(): void { this.load(); }
  setTab(t: 'creditDebit' | 'invoices'): void { this.activeTab = t; }

  exportCsv(type: 'cd' | 'inv'): void {
    const rows  = type === 'cd' ? this.filteredCD : this.filteredInv;
    const hdrs  = ['Document #', 'Date', 'Type', 'Net Value', 'Currency'];
    const lines = rows.map(r => [r.VBELN, r.FKDAT, r.FKART || '', r.NETWR, r.WAERK]);
    const csv   = [hdrs, ...lines].map(r => r.join(',')).join('\n');
    const a     = document.createElement('a');
    a.href      = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download  = `finance_${type}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  severity(fkart: string): 'success' | 'warning' | 'info' | 'secondary' {
    const t = (fkart || '').toUpperCase();
    if (t.startsWith('G')) return 'success';
    if (t.startsWith('L') || t === 'RE') return 'warning';
    if (['F2', 'IV', 'ZF2'].includes(t)) return 'info';
    return 'secondary';
  }

  docTypeLabel(fkart: string): string {
    const map: Record<string, string> = {
      G2: 'Credit Note', L2: 'Debit Note', F2: 'Invoice', RE: 'Return', IV: 'Invoice', ZF2: 'Invoice',
    };
    return map[fkart] || (fkart || '—');
  }

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

  get currency(): string {
    return this.financeData?.creditDebit[0]?.WAERK
      || this.financeData?.invoices?.[0]?.WAERK
      || 'SAR';
  }
}
