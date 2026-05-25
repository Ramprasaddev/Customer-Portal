// src/app/models/sap.models.ts

export interface LoginRequest {
  kunnr: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  kunnr: string;
  expiresIn: string;
}

export interface CustomerProfile {
  KUNNR:     string;
  NAME1:     string;
  STRAS:     string;
  ORT01:     string;
  PSTLZ:     string;
  LAND1:     string;
  TELF1:     string;
  SMTP_ADDR: string;
  VKORG:     string;
  VTWEG:     string;
  WAERS:     string;
}

export interface Delivery {
  VBELN:     string;
  ERDAT:     string;
  LFART:     string;
  WADAT_IST: string;
  GBSTA:     string;
}

export interface SalesOrder {
  VBELN:  string;
  ERDAT:  string;
  AUART:  string;
  NETWR:  string;
  WAERK:  string;
  GBSTA:  string;
}

export interface Invoice {
  VBELN:  string;
  FKDAT:  string;
  NETWR:  string;
  WAERK:  string;
  FKART:  string;
}

export interface DashboardSummary {
  totalDeliveries:     number;
  totalOrders:         number;
  totalInvoices:       number;
  openOrders:          number;
  completedDeliveries: number;
}

export interface DashboardData {
  deliveries: Delivery[];
  orders:     SalesOrder[];
  invoices:   Invoice[];
  returns:    any[];
  openOrders: SalesOrder[];
  summary:    DashboardSummary;
}

export interface CreditDebit {
  VBELN:  string;
  FKDAT:  string;
  NETWR:  string;
  WAERK:  string;
  FKART:  string;
}

export interface FinanceData {
  creditDebit: CreditDebit[];
  invoices:    Invoice[];
}

export interface AgingItem {
  VBELN:        string;
  FKDAT:        string;
  ZFBDT:        string;
  NETWR:        string;
  WAERK:        string;
  AGING_DAYS:   string;
  AGING_BUCKET: string;
  RFBSK:        string;
}

export interface AgingData {
  aging:         AgingItem[];
  bucketSummary: { [key: string]: { count: number; total: number; currency: string } };
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data:     T;
}

// ─── INVOICE PORTAL MODELS (ZFI_CUSTOMER_INVO_FM + ZFI_GET_INVOICE_DATA) ────

export interface SapInvoiceListItem {
  VBELN: string;
  FKDAT: string;
  NETWR: string;
  WAERK: string;
  KUNAG: string;
  KUNRG: string;
  VKORG: string;
  ERDAT: string;
  VTWEG: string;
}

export interface SapInvoiceHeader {
  BELNR:   string;
  BUKRS:   string;
  LIFNR:   string;
  BLDAT:   string;
  BUDAT:   string;
  WAERS:   string;
  EBELN:   string;
  XBLNR:   string;
  RMWWR:   string;
  VBELN:   string;
  NAME1:   string;
  TAX_AMT: string;
}

export interface SapInvoiceItem {
  EBELN:    string;
  EBELP:    string;
  MEINS:    string;
  MENGE:    string;
  WAERS:    string;
  WRBTR:    string;
  NETPR:    string;
  DMBTR:    string;
  AREWR:    string;
  DIFF_AMT: string;
  TXZ01:    string;
}

export interface SapInvoiceDetail {
  header:    SapInvoiceHeader;
  items:     SapInvoiceItem[];
  pdfBase64: string;
}
