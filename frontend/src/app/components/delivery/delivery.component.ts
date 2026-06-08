import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { Delivery } from '../../models/sap.models';

@Component({
  selector: 'app-delivery',
  templateUrl: './delivery.component.html',
  styleUrls: ['./delivery.component.scss'],
})
export class DeliveryComponent implements OnInit {
  deliveries:         Delivery[] = [];
  filteredDeliveries: Delivery[] = [];
  selectedDelivery:   Delivery | null = null;

  loading = true;
  error   = '';

  dateFrom = '2024-01-01';
  dateTo   = new Date().toISOString().split('T')[0];
  search   = '';

  sortField     = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  kpiCompleted  = 0;
  kpiInProgress = 0;
  kpiPartial    = 0;
  kpiPending    = 0;

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
    this.api.getDeliveries(this.dateFrom, this.dateTo).subscribe({
      next: res => {
        this.deliveries = res.data || [];
        this.applyFilter();
        this.buildKpis();
        this.buildChart();
        this.loading = false;
      },
      error: err => { this.error = err.message; this.loading = false; },
    });
  }

  buildKpis(): void {
    this.kpiCompleted  = this.deliveries.filter(d => d.GBSTA === 'C').length;
    this.kpiInProgress = this.deliveries.filter(d => d.GBSTA === 'A').length;
    this.kpiPartial    = this.deliveries.filter(d => d.GBSTA === 'B').length;
    this.kpiPending    = this.deliveries.filter(d => !d.GBSTA || d.GBSTA === '').length;
  }

  buildChart(): void {
    const labels = ['Completed', 'In Progress', 'Partial'];
    const counts = [this.kpiCompleted, this.kpiInProgress, this.kpiPartial];
    const colors = ['#10B981', '#3B82F6', '#F59E0B'];

    const active = labels.reduce((acc: any, lbl, i) => {
      if (counts[i] > 0) {
        acc.labels.push(lbl);
        acc.counts.push(counts[i]);
        acc.colors.push(colors[i]);
      }
      return acc;
    }, { labels: [], counts: [], colors: [] });

    this.chartData = {
      labels: active.labels,
      datasets: [{
        data: active.counts,
        backgroundColor: active.colors,
        hoverBackgroundColor: active.colors,
        borderColor: '#ffffff',
        borderWidth: 3,
      }],
    };

    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 18,
            font: { size: 12, family: "'Inter', system-ui, sans-serif" },
            color: '#5A6478',
          },
        },
        tooltip: {
          callbacks: {
            label: (ctx: any) => ` ${ctx.raw} delivery${ctx.raw !== 1 ? 's' : ''} (${
              Math.round((ctx.raw / this.deliveries.length) * 100)
            }%)`,
          },
        },
      },
    };
  }

  applyFilter(): void {
    const q = this.search.toLowerCase();
    this.filteredDeliveries = q
      ? this.deliveries.filter(d => Object.values(d).some(v => String(v).toLowerCase().includes(q)))
      : [...this.deliveries];
    this.applySort();
    this.currentPage = 1;
  }

  applySort(): void {
    if (!this.sortField) {
      return;
    }

    const direction = this.sortDirection === 'asc' ? 1 : -1;
    this.filteredDeliveries.sort((a, b) => {
      const left = String(a[this.sortField as keyof Delivery] ?? '').toLowerCase();
      const right = String(b[this.sortField as keyof Delivery] ?? '').toLowerCase();
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

  // ── Pagination ────────────────────────────────────────────────────────────
  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredDeliveries.length / this.pageSize));
  }

  get pagedDeliveries(): Delivery[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredDeliveries.slice(start, start + this.pageSize);
  }

  get startIndex(): number {
    return this.filteredDeliveries.length === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.filteredDeliveries.length);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
    let start = Math.max(1, this.currentPage - 2);
    const end  = Math.min(total, start + 4);
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
  onDateChange(): void { this.load(); }

  viewDelivery(delivery: Delivery): void { this.selectedDelivery = delivery; }
  closeDetail(): void { this.selectedDelivery = null; }

  detailRows(item: Delivery): { label: string; value: string }[] {
    if (!item) return [];
    return [
      { label: 'Delivery Number', value: item.VBELN || '—' },
      { label: 'Created Date',    value: this.formatDate(item.ERDAT) },
      { label: 'Delivery Type',   value: this.deliveryTypeName(item.LFART) },
      { label: 'Actual GI Date',  value: this.formatDate(item.WADAT_IST) },
      { label: 'Status',          value: this.deliveryStatus(item.GBSTA || '') },
    ];
  }

  formatDate(d: string): string {
    if (!d || d === '0000-00-00') return '—';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
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

  deliveryStatus(gbsta: string): string {
    return ({ C: 'Completed', A: 'In Progress', B: 'Partial', '': 'Pending' } as Record<string, string>)[gbsta] ?? gbsta;
  }

  deliveryBadge(gbsta: string): string {
    return ({ C: 'badge-success', A: 'badge-info', B: 'badge-warning', '': 'badge-gray' } as Record<string, string>)[gbsta] ?? 'badge-gray';
  }
}
