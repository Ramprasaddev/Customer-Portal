import { Component, OnInit, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ApiService }  from '../../services/api.service';
import { SapInvoiceListItem } from '../../models/sap.models';

@Component({
  selector: 'app-invoice',
  templateUrl: './invoice.component.html',
  styleUrls: ['./invoice.component.scss'],
})
export class InvoiceComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // List
  invoiceList  : SapInvoiceListItem[] = [];
  loadingList  = true;
  errorList    = '';
  search       = '';

  // Per-row PDF loading state (stores the VBELN currently being fetched)
  pdfLoading   : string | null = null;
  pdfError     : string | null = null;

  // PDF preview modal
  showPdfModal  = false;
  modalVbeln    = '';
  pdfUrl        : SafeResourceUrl | null = null;
  private blobUrl : string | null = null;

  constructor(
    private api       : ApiService,
    private sanitizer : DomSanitizer,
  ) {}

  ngOnInit(): void { this.loadInvoiceList(); }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.revokeBlobUrl();
  }

  // ── LIST ─────────────────────────────────────────────────────────────────────
  loadInvoiceList(): void {
    this.loadingList = true;
    this.errorList   = '';
    this.api.getCustomerInvoiceList()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next : res => { this.invoiceList = res.data?.invoices ?? []; this.loadingList = false; },
        error: err => { this.errorList = err.message ?? 'Failed to load invoices'; this.loadingList = false; },
      });
  }

  get filteredInvoices(): SapInvoiceListItem[] {
    const q = this.search.trim().toLowerCase();
    if (!q) return this.invoiceList;
    return this.invoiceList.filter(i =>
      Object.values(i).some(v => String(v).toLowerCase().includes(q))
    );
  }

  get totalInvoiceValue(): number {
    return this.invoiceList.reduce((s, i) => s + (parseFloat(i.NETWR) || 0), 0);
  }

  get listCurrency(): string { return this.invoiceList[0]?.WAERK || 'EUR'; }

  get latestInvoiceDate(): string {
    if (!this.invoiceList.length) return '—';
    const dates = this.invoiceList.map(i => i.FKDAT).filter(Boolean).sort();
    return this.formatDate(dates[dates.length - 1]);
  }

  exportCsv(): void {
    const headers = ['Invoice #', 'Date', 'Amount', 'Currency', 'Sales Org', 'Dist. Channel'];
    const rows    = this.filteredInvoices.map(i =>
      [i.VBELN, i.FKDAT, i.NETWR, i.WAERK, i.VKORG, i.VTWEG]
    );
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a   = document.createElement('a');
    a.href    = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    a.download = `invoices_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  // ── PDF — called directly from a list row ────────────────────────────────────
  openPdf(inv: SapInvoiceListItem, action: 'preview' | 'download'): void {
    if (this.pdfLoading === inv.VBELN) return; // prevent double-click on same row
    this.pdfLoading = inv.VBELN;
    this.pdfError   = null;

    this.api.getInvoiceDetail(inv.VBELN)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: res => {
          this.pdfLoading = null;
          const b64 = res.data?.pdfBase64?.replace(/\s/g, '');
          if (!b64) {
            this.pdfError = `PDF not available for invoice ${inv.VBELN}. The document may not have a print form configured in SAP.`;
            return;
          }

          const blob = this.base64ToBlob(b64);
          if (!blob) { this.pdfError = 'PDF data is invalid or corrupted. Please try again.'; return; }

          if (action === 'preview') {
            this.revokeBlobUrl();
            this.blobUrl  = URL.createObjectURL(blob);
            this.pdfUrl   = this.sanitizer.bypassSecurityTrustResourceUrl(this.blobUrl);
            this.modalVbeln   = inv.VBELN;
            this.showPdfModal = true;
          } else {
            const url = URL.createObjectURL(blob);
            const a   = document.createElement('a');
            a.href    = url;
            a.download = `Invoice_${inv.VBELN}.pdf`;
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1500);
          }
        },
        error: err => {
          this.pdfLoading = null;
          const msg = err.message ?? '';
          this.pdfError = msg.includes('RABAX')
            ? `SAP could not generate the PDF for ${inv.VBELN}. Please contact your SAP administrator.`
            : (msg || 'Failed to fetch invoice PDF');
        },
      });
  }

  /** Download the PDF that is currently open in the modal (reuses the blob — no extra SAP call) */
  downloadFromModal(): void {
    if (!this.blobUrl) return;
    const a   = document.createElement('a');
    a.href    = this.blobUrl;
    a.download = `Invoice_${this.modalVbeln}.pdf`;
    a.click();
  }

  closePdfModal(): void {
    this.showPdfModal = false;
    this.revokeBlobUrl();
  }

  private revokeBlobUrl(): void {
    if (this.blobUrl) { URL.revokeObjectURL(this.blobUrl); this.blobUrl = null; }
    this.pdfUrl = null;
  }

  private base64ToBlob(b64: string): Blob | null {
    try {
      const binary = atob(b64);
      const bytes  = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return new Blob([bytes], { type: 'application/pdf' });
    } catch { return null; }
  }

  /** Alternative: Direct PDF download from backend (returns binary file) */
  downloadDirectPdf(vbeln: string): void {
    this.api.downloadInvoicePdf(vbeln)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (blob) => {
          const url = URL.createObjectURL(blob);
          const a   = document.createElement('a');
          a.href    = url;
          a.download = `Invoice_${vbeln}.pdf`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(url), 1500);
        },
        error: err => {
          this.pdfError = err.message ?? 'Failed to download PDF';
        },
      });
  }

  // ── FORMATTERS ────────────────────────────────────────────────────────────────
  formatAmount(v: string | number, dec = 2): string {
    const n = typeof v === 'string' ? parseFloat(v) : (v ?? 0);
    return isNaN(n) ? '0.00' : n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  }

  formatDate(d: string): string {
    if (!d || d === '0000-00-00' || d === '') return '—';
    try { return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return d; }
  }
}
