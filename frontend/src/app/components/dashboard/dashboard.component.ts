import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ApiService }  from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { DashboardData, CustomerProfile, AgingData, FinanceData } from '../../models/sap.models';

export interface DashNotification {
  type: 'critical' | 'warning' | 'info';
  icon: string;
  title: string;
  message: string;
  route: string;
  count: number;
}

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
})
export class DashboardComponent implements OnInit {

  dashboard   : DashboardData | null = null;
  profile     : CustomerProfile | null = null;
  agingData   : AgingData | null = null;
  financeData : FinanceData | null = null;
  inquiryCount = 0;

  loading          = true;
  error            = '';
  kunnr            = '';
  today            = new Date();
  invoiceListCount = 0;

  // ── Chart configs ──────────────────────────────────────────────────────────
  readonly chartOptions = {
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { boxWidth: 10, padding: 16, font: { size: 11, family: "'Inter', sans-serif" }, color: '#6B7280' },
      },
    },
    cutout: '70%',
    responsive: true,
    maintainAspectRatio: false,
  };

  readonly barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10, family: "'Inter', sans-serif" }, color: '#9CA3AF' } },
      y: { grid: { color: '#F3F4F6' }, ticks: { font: { size: 10, family: "'Inter', sans-serif" }, color: '#9CA3AF' } },
    },
  };

  constructor(
    private api    : ApiService,
    private auth   : AuthService,
    private router : Router,
  ) {}

  ngOnInit(): void {
    this.kunnr = this.auth.kunnr;
    this.loadAll();
  }

  // ── Greeting ───────────────────────────────────────────────────────────────
  get greeting(): string {
    const h = new Date().getHours();
    return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  }

  // ── KPI getters ────────────────────────────────────────────────────────────
  get totalDeliveries()    { return this.dashboard?.summary?.totalDeliveries ?? 0; }
  get completedDeliveries(){ return this.dashboard?.summary?.completedDeliveries ?? 0; }
  get totalOrders()        { return this.dashboard?.summary?.totalOrders ?? 0; }
  get openOrders()         { return this.dashboard?.summary?.openOrders ?? 0; }
  get totalInvoices()      { return this.invoiceListCount || (this.dashboard?.summary?.totalInvoices ?? 0); }

  // ── Sales Orders KPIs (ET_SALES_ORDER from ZSD_FM_GET_DASHBOARD) ───────────
  get totalSalesOrders(): number {
    return (this.dashboard?.orders ?? []).length;
  }
  get completedSalesOrders(): number {
    return (this.dashboard?.orders ?? []).filter(o => o.GBSTA === 'C').length;
  }
  get inProcessSalesOrders(): number {
    return (this.dashboard?.orders ?? []).filter(o => o.GBSTA === 'A').length;
  }
  get partialSalesOrders(): number {
    return (this.dashboard?.orders ?? []).filter(o => o.GBSTA === 'B').length;
  }

  get totalRevenue(): number {
    const finInvoices = (this.financeData?.invoices ?? []).reduce((s, i) => s + (parseFloat(i.NETWR) || 0), 0);
    const dashInvoices = (this.dashboard?.invoices ?? []).reduce((s, i) => s + (parseFloat(i.NETWR) || 0), 0);
    return finInvoices || dashInvoices;
  }
  get revenueCurrency(): string { 
    return this.financeData?.invoices?.[0]?.WAERK || this.dashboard?.invoices?.[0]?.WAERK || 'EUR'; 
  }

  get creditNoteCount(): number {
    return (this.financeData?.creditDebit ?? []).filter(i => (i.FKART || '').toUpperCase().startsWith('G')).length;
  }
  get debitNoteCount(): number {
    return (this.financeData?.creditDebit ?? []).filter(i => (i.FKART || '').toUpperCase().startsWith('L')).length;
  }
  get overdueCount(): number { return this.agingData?.bucketSummary?.['90+']?.count ?? 0; }

  // ── Delivery chart ─────────────────────────────────────────────────────────
  get deliveryChartData() {
    const d = this.dashboard?.deliveries ?? [];
    const stats = [
      { label: 'Completed', count: d.filter(x => x.GBSTA === 'C').length, color: '#10B981' },
      { label: 'In Progress', count: d.filter(x => x.GBSTA === 'A').length, color: '#3B82F6' },
      { label: 'Partial', count: d.filter(x => x.GBSTA === 'B').length, color: '#F59E0B' },
    ];
    return {
      labels: stats.map(s => s.label),
      datasets: [{
        data: stats.map(s => s.count),
        backgroundColor: stats.map(s => s.color),
        borderWidth: 0, hoverOffset: 4,
      }],
    };
  }

  // ── Bar: top 8 orders by value ─────────────────────────────────────────────
  get orderBarData() {
    const orders = (this.dashboard?.orders ?? []).filter(o => parseFloat(o.NETWR) > 0).slice(0, 8);
    return {
      labels: orders.map(o => o.VBELN?.slice(-5) || ''),
      datasets: [{
        data: orders.map(o => parseFloat(o.NETWR) || 0),
        backgroundColor: '#E31E24',
        borderRadius: 5,
        borderSkipped: false,
      }],
    };
  }

  // ── Aging buckets ──────────────────────────────────────────────────────────
  get agingBuckets(): Array<{ label: string; count: number; total: number; color: string; currency: string }> {
    const bs = this.agingData?.bucketSummary ?? {};
    const map: Record<string, { label: string; color: string }> = {
      'Current':  { label: 'Current',   color: '#10B981' },
      '1-30':     { label: '1–30 days', color: '#3B82F6' },
      '31-60':    { label: '31–60 days',color: '#F59E0B' },
      '61-90':    { label: '61–90 days',color: '#F97316' },
      '90+':      { label: '90+ days',  color: '#E31E24' },
    };
    return Object.entries(map)
      .map(([key, meta]) => ({
        label   : meta.label,
        color   : meta.color,
        count   : bs[key]?.count  ?? 0,
        total   : bs[key]?.total  ?? 0,
        currency: bs[key]?.currency ?? '',
      }))
      .filter(b => b.count > 0);
  }

  get totalAgingAmount(): number {
    return this.agingBuckets.reduce((s, b) => s + b.total, 0);
  }

  // ── Recent deliveries (last 5) ─────────────────────────────────────────────
  get recentDeliveries() {
    return (this.dashboard?.deliveries ?? []).slice(0, 5);
  }

  // ── Recent invoices from finance (last 5) ──────────────────────────────────
  get recentInvoices() {
    return (this.financeData?.invoices ?? []).slice(0, 5);
  }

  // ── Notifications ──────────────────────────────────────────────────────────
  get notifications(): DashNotification[] {
    const notifs: DashNotification[] = [];
    const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const b90 = this.agingData?.bucketSummary?.['90+'];
    if (b90 && b90.count > 0) {
      notifs.push({ type: 'critical', icon: 'pi-exclamation-circle',
        title: '90+ Days Overdue',
        message: `${b90.count} document${b90.count > 1 ? 's' : ''} — ${b90.currency} ${fmt(b90.total)}`,
        route: '/aging', count: b90.count });
    }

    if (this.debitNoteCount > 0) {
      const total = (this.financeData?.creditDebit ?? [])
        .filter(i => (i.FKART || '').toUpperCase().startsWith('L'))
        .reduce((s, i) => s + (parseFloat(i.NETWR) || 0), 0);
      const cur = this.financeData?.creditDebit?.find(i => (i.FKART || '').toUpperCase().startsWith('L'))?.WAERK || '';
      notifs.push({ type: 'warning', icon: 'pi-arrow-down-right',
        title: 'Debit Notes Pending',
        message: `${this.debitNoteCount} note${this.debitNoteCount > 1 ? 's' : ''} — ${cur} ${fmt(total)}`,
        route: '/finance', count: this.debitNoteCount });
    }

    if (this.openOrders > 0) {
      notifs.push({ type: 'warning', icon: 'pi-shopping-bag',
        title: 'Open Sales Orders',
        message: `${this.openOrders} order${this.openOrders > 1 ? 's' : ''} pending fulfillment`,
        route: '/sales', count: this.openOrders });
    }

    const pending = (this.dashboard?.deliveries ?? []).filter(d => !d.GBSTA || d.GBSTA === '').length;
    if (pending > 0) {
      notifs.push({ type: 'info', icon: 'pi-truck',
        title: 'Pending Deliveries',
        message: `${pending} delivery${pending > 1 ? 'ies' : ''} awaiting dispatch`,
        route: '/sales', count: pending });
    }

    return notifs;
  }

  get criticalCount(): number {
    return this.notifications.filter(n => n.type === 'critical' || n.type === 'warning').length;
  }

  // ── Delivery status bars ───────────────────────────────────────────────────
  get deliveryStats() {
    const d = this.dashboard?.deliveries ?? [];
    const total = d.length || 1;
    return [
      { label: 'Completed',   count: d.filter(x => x.GBSTA === 'C').length,                 color: '#10B981' },
      { label: 'In Progress', count: d.filter(x => x.GBSTA === 'A').length,                 color: '#3B82F6' },
      { label: 'Partial',     count: d.filter(x => x.GBSTA === 'B').length,                 color: '#F59E0B' },
    ].map(r => ({ ...r, pct: Math.round((r.count / total) * 100) }));
  }

  // ── Data loaders ───────────────────────────────────────────────────────────
  loadAll(): void {
    this.loading = true; this.error = '';

    this.api.getProfile().subscribe({ next: r => { this.profile = r.data; }, error: () => {} });

    this.api.getDashboard('2024-01-01', new Date().toISOString().split('T')[0]).subscribe({
      next: r => { this.dashboard = r.data; this.loading = false; },
      error: err => { this.error = err?.message ?? 'Failed to load dashboard.'; this.loading = false; },
    });

    this.api.getAging().subscribe({ next: r => { this.agingData = r.data; },    error: () => {} });
    this.api.getFinance().subscribe({ next: r => { this.financeData = r.data; }, error: () => {} });
    this.api.getCustomerInquiries().subscribe({
      next: r => { this.inquiryCount = r.data?.inquiries?.length ?? 0; }, error: () => {}
    });
    this.api.getCustomerInvoiceList().subscribe({
      next: r => { this.invoiceListCount = r.data?.invoices?.length ?? 0; }, error: () => {}
    });
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  navigate(route: string): void { this.router.navigate([route]); }

  deliveryStatus(g: string): string {
    return ({ C: 'Completed', A: 'In Progress', B: 'Partial', '': 'Pending' } as any)[g ?? ''] ?? 'Pending';
  }

  deliveryTypeName(lfart: string): string {
    if (!lfart || lfart.trim() === '') return '—';
    const map: Record<string, string> = {
      'LF'  : 'Outbound Delivery',
      'LR'  : 'Returns Delivery',
      'EL'  : 'Stock Transfer Delivery',
      'NL'  : 'Replenishment Delivery',
      'NLCC': 'Cross-Company Replenishment',
      'UL'  : 'Stock Transfer (STO)',
      'KG'  : 'Returns to Vendor',
      'RL'  : 'Returns from Customer',
      'WN'  : 'Non-Stock Item Delivery',
      'LO'  : 'Outbound Delivery (Lean WM)',
      'LD'  : 'Outbound Delivery (Decentralised)',
      'NCR' : 'Cross-Docking Delivery',
    };
    return map[lfart.trim().toUpperCase()] ?? lfart;
  }

  deliveryColor(g: string): string {
    return ({ C: '#10B981', A: '#3B82F6', B: '#F59E0B', '': '#94A3B8' } as any)[g ?? ''] ?? '#94A3B8';
  }

  formatDate(d: string): string {
    if (!d || d === '0000-00-00') return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  }
  fmt(n: number): string {
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
