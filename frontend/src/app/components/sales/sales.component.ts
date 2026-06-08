import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { SalesOrder } from '../../models/sap.models';

@Component({
  selector: 'app-sales',
  templateUrl: './sales.component.html',
  styleUrls: ['./sales.component.scss'],
})
export class SalesComponent implements OnInit {
  orders:         SalesOrder[] = [];
  filteredOrders: SalesOrder[] = [];
  selectedOrder:  SalesOrder | null = null;

  loading = true;
  error   = '';

  dateFrom = '2024-01-01';
  dateTo   = new Date().toISOString().split('T')[0];
  search   = '';

  // Per-column filters
  cf: Record<string, string> = {};

  // Sorting
  sortField     = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // KPIs
  kpiTotal      = 0;
  kpiCompleted  = 0;
  kpiInProcess  = 0;
  kpiPartial    = 0;
  kpiTotalValue = 0;
  kpiCurrency   = '';

  // Pagination
  currentPage = 1;
  pageSize    = 10;
  pageSizes   = [10, 25, 50];

  chartData   : any = null;
  chartOptions: any = null;

  constructor(private api: ApiService) {}

  ngOnInit(): void { this.load(); }

  load(): void {
    this.loading = true; this.error = '';
    this.api.getOrders(this.dateFrom, this.dateTo).subscribe({
      next: res => {
        this.orders = res.data || [];
        this.applyFilter();
        this.buildKpis();
        this.buildChart();
        this.loading = false;
      },
      error: err => { this.error = err.message; this.loading = false; },
    });
  }

  buildKpis(): void {
    this.kpiTotal      = this.orders.length;
    this.kpiCompleted  = this.orders.filter(o => o.GBSTA === 'C').length;
    this.kpiInProcess  = this.orders.filter(o => o.GBSTA === 'A').length;
    this.kpiPartial    = this.orders.filter(o => o.GBSTA === 'B').length;
    this.kpiTotalValue = this.orders.reduce((sum, o) => sum + (parseFloat(o.NETWR) || 0), 0);
    this.kpiCurrency   = this.orders.find(o => o.WAERK)?.WAERK || '';
  }

  buildChart(): void {
    const labels = ['Completed', 'In Process', 'Partial'];
    const counts = [this.kpiCompleted, this.kpiInProcess, this.kpiPartial];
    const colors = ['#10B981', '#3B82F6', '#F59E0B'];  // bright green, blue, amber
    const borders = ['#059669', '#1D4ED8', '#D97706'];

    this.chartData = {
      labels,
      datasets: [{
        label: 'Orders',
        data: counts,
        backgroundColor: colors,
        borderColor: borders,
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }],
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',          // horizontal bars
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx: any) => {
              const total = this.orders.length;
              const pct   = total ? Math.round((ctx.raw / total) * 100) : 0;
              return `  ${ctx.raw} order${ctx.raw !== 1 ? 's' : ''} — ${pct}%`;
            },
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          ticks: {
            stepSize: 1,
            font: { size: 11, family: "'Inter', system-ui, sans-serif" },
            color: '#94A3B8',
          },
          grid: { color: 'rgba(0,0,0,0.05)' },
        },
        y: {
          ticks: {
            font: { size: 13, family: "'Inter', system-ui, sans-serif", weight: '600' },
            color: '#374151',
          },
          grid: { display: false },
        },
      },
    };
  }

  applyFilter(): void {
    const q = this.search.toLowerCase();
    let result = q
      ? this.orders.filter(o => Object.values(o).some(v => String(v).toLowerCase().includes(q)))
      : [...this.orders];

    // Apply per-column filters
    Object.entries(this.cf).forEach(([field, val]) => {
      if (val?.trim()) {
        const fv = val.trim().toLowerCase();
        result = result.filter(o => String(o[field as keyof SalesOrder] ?? '').toLowerCase().includes(fv));
      }
    });

    this.filteredOrders = result;
    this.applySort();
    this.currentPage = 1;
  }

  applySort(): void {
    if (!this.sortField) {
      return;
    }

    const direction = this.sortDirection === 'asc' ? 1 : -1;
    this.filteredOrders.sort((a, b) => {
      const left = String(a[this.sortField as keyof SalesOrder] ?? '').toLowerCase();
      const right = String(b[this.sortField as keyof SalesOrder] ?? '').toLowerCase();
      const leftNum = parseFloat(left);
      const rightNum = parseFloat(right);

      if (!Number.isNaN(leftNum) && !Number.isNaN(rightNum)) {
        return (leftNum - rightNum) * direction;
      }
      return left.localeCompare(right) * direction;
    });
  }

  sortBy(field: string): void {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applySort();
  }

  // ── Pagination computed properties ────────────────────────────────────────
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredOrders.length / this.pageSize));
  }

  get pagedOrders(): SalesOrder[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredOrders.slice(start, start + this.pageSize);
  }

  get startIndex(): number {
    return this.filteredOrders.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredOrders.length);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    let start = Math.max(1, this.currentPage - 2);
    const end = Math.min(total, start + 4);
    if (end === total) start = Math.max(1, end - 4);
    return Array.from({ length: end - start + 1 }, (_, i) => start + i);
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
  }

  onPageSizeChange(): void { this.currentPage = 1; }

  // ── Events ────────────────────────────────────────────────────────────────
  onSearch(): void { this.applyFilter(); }
  onColFilter(): void { this.applyFilter(); }
  onClearFilters(): void { this.cf = {}; this.search = ''; this.load(); }
  onDateChange(): void { this.load(); }

  viewOrder(order: SalesOrder): void { this.selectedOrder = order; }
  closeDetail(): void { this.selectedOrder = null; }

  detailRows(item: SalesOrder): { label: string; value: string }[] {
    if (!item) return [];
    return [
      { label: 'Sales Order Number', value: item.VBELN || '—' },
      { label: 'Created Date',       value: this.formatDate(item.ERDAT) },
      { label: 'Net Value',          value: this.formatAmount(item.NETWR, item.WAERK) },
      { label: 'Currency',           value: item.WAERK || '—' },
      { label: 'Order Type',         value: item.AUART || '—' },
      { label: 'Status',             value: this.orderStatus(item.GBSTA || '') },
    ];
  }

  formatDate(d: string): string {
    if (!d || d === '0000-00-00') return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatAmount(netwr: string, waerk?: string): string {
    const val = parseFloat(netwr);
    if (isNaN(val)) return '—';
    const formatted = val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return waerk ? `${formatted} ${waerk}` : formatted;
  }

  formatTotalValue(): string {
    if (!this.kpiTotalValue) return '0.00';
    return this.kpiTotalValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  orderStatus(gbsta: string): string {
    return ({ C: 'Completed', A: 'In Process', B: 'Partial', '': 'Open' } as Record<string, string>)[gbsta] ?? gbsta;
  }

  orderBadge(gbsta: string): string {
    return ({ C: 'badge-success', A: 'badge-info', B: 'badge-warning', '': 'badge-gray' } as Record<string, string>)[gbsta] ?? 'badge-gray';
  }
}
