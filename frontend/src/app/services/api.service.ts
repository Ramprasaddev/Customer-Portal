// src/app/services/api.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, shareReplay } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import {
  LoginRequest, LoginResponse,
  CustomerProfile, DashboardData, FinanceData, AgingData,
  Delivery, SalesOrder, ApiResponse,
  SapInvoiceListItem, SapInvoiceDetail,
} from '../models/sap.models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private baseUrl = environment.apiUrl;
  private requestCache = new Map<string, Observable<any>>();

  constructor(private http: HttpClient) {}

  private get headers(): HttpHeaders {
    const token = localStorage.getItem('portal_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    });
  }

  private buildParams(filters: Record<string, string>): HttpParams {
    let p = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) p = p.set(k, v); });
    return p;
  }

  // Deduplicate concurrent requests
  private cachedRequest<T>(cacheKey: string, request: Observable<T>): Observable<T> {
    if (this.requestCache.has(cacheKey)) {
      return this.requestCache.get(cacheKey) as Observable<T>;
    }
    const cached = request.pipe(
      shareReplay(1),
      catchError(err => {
        this.requestCache.delete(cacheKey);
        return throwError(() => err);
      })
    );
    this.requestCache.set(cacheKey, cached);
    setTimeout(() => this.requestCache.delete(cacheKey), 150);
    return cached;
  }

  // ─── AUTH ───────────────────────────────────────────────────────────────────
  login(req: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, req)
      .pipe(catchError(this.handleError));
  }

  // ─── PROFILE ────────────────────────────────────────────────────────────────
  getProfile(): Observable<ApiResponse<CustomerProfile>> {
    const cacheKey = 'profile';
    return this.cachedRequest(cacheKey,
      this.http.get<ApiResponse<CustomerProfile>>(
        `${this.baseUrl}/customer/profile`, { headers: this.headers }
      ).pipe(catchError(this.handleError))
    );
  }

  // ─── DASHBOARD ──────────────────────────────────────────────────────────────
  getDashboard(dateFrom?: string, dateTo?: string): Observable<ApiResponse<DashboardData>> {
    const params = this.buildParams({ dateFrom: dateFrom || '', dateTo: dateTo || '' });
    const cacheKey = `dashboard:${dateFrom}:${dateTo}`;
    return this.cachedRequest(cacheKey,
      this.http.get<ApiResponse<DashboardData>>(
        `${this.baseUrl}/customer/dashboard`, { headers: this.headers, params }
      ).pipe(catchError(this.handleError))
    );
  }

  // ─── FINANCE ────────────────────────────────────────────────────────────────
  getFinance(dateFrom?: string, dateTo?: string, search?: string): Observable<ApiResponse<FinanceData>> {
    const params = this.buildParams({ dateFrom: dateFrom || '', dateTo: dateTo || '', search: search || '' });
    const cacheKey = `finance:${dateFrom}:${dateTo}:${search}`;
    return this.cachedRequest(cacheKey,
      this.http.get<ApiResponse<FinanceData>>(
        `${this.baseUrl}/customer/finance`, { headers: this.headers, params }
      ).pipe(catchError(this.handleError))
    );
  }

  // ─── AGING ──────────────────────────────────────────────────────────────────
  getAging(search?: string): Observable<ApiResponse<AgingData>> {
    const params = this.buildParams({ search: search || '' });
    const cacheKey = `aging:${search}`;
    return this.cachedRequest(cacheKey,
      this.http.get<ApiResponse<AgingData>>(
        `${this.baseUrl}/customer/aging`, { headers: this.headers, params }
      ).pipe(catchError(this.handleError))
    );
  }

  // ─── DELIVERIES ─────────────────────────────────────────────────────────────
  getDeliveries(dateFrom?: string, dateTo?: string, search?: string): Observable<ApiResponse<Delivery[]>> {
    const params = this.buildParams({ dateFrom: dateFrom || '', dateTo: dateTo || '', search: search || '' });
    const cacheKey = `deliveries:${dateFrom}:${dateTo}:${search}`;
    return this.cachedRequest(cacheKey,
      this.http.get<ApiResponse<Delivery[]>>(
        `${this.baseUrl}/customer/deliveries`, { headers: this.headers, params }
      ).pipe(catchError(this.handleError))
    );
  }

  // ─── CUSTOMER INQUIRY LIST (ZFI_CUST_INQ_FM) ────────────────────────────────
  getCustomerInquiries(search?: string): Observable<ApiResponse<{ inquiries: any[]; total: number }>> {
    const params   = this.buildParams({ search: search || '' });
    const cacheKey = `customer-inquiry-list:${search}`;
    return this.cachedRequest(cacheKey,
      this.http.get<ApiResponse<{ inquiries: any[]; total: number }>>(
        `${this.baseUrl}/customer/inquiry-list`, { headers: this.headers, params }
      ).pipe(catchError(this.handleError))
    );
  }

  // ─── INQUIRIES ──────────────────────────────────────────────────────────────
  getInquiries(dateFrom?: string, dateTo?: string, search?: string): Observable<ApiResponse<any[]>> {
    const params = this.buildParams({ dateFrom: dateFrom || '', dateTo: dateTo || '', search: search || '' });
    const cacheKey = `inquiries:${dateFrom}:${dateTo}:${search}`;
    return this.cachedRequest(cacheKey,
      this.http.get<ApiResponse<any[]>>(
        `${this.baseUrl}/customer/inquiries`, { headers: this.headers, params }
      ).pipe(catchError(this.handleError))
    );
  }

  // ─── INVOICES (dedicated ZFI_GET_INVOICE endpoint) ──────────────────────────
  getInvoices(dateFrom?: string, dateTo?: string, search?: string): Observable<ApiResponse<any>> {
    const params   = this.buildParams({ dateFrom: dateFrom || '', dateTo: dateTo || '', search: search || '' });
    const cacheKey = `invoices:${dateFrom}:${dateTo}:${search}`;
    return this.cachedRequest(cacheKey,
      this.http.get<ApiResponse<any>>(
        `${this.baseUrl}/customer/invoices`, { headers: this.headers, params }
      ).pipe(catchError(this.handleError))
    );
  }

  // ─── ORDERS ─────────────────────────────────────────────────────────────────
  getOrders(dateFrom?: string, dateTo?: string, search?: string): Observable<ApiResponse<SalesOrder[]>> {
    const params = this.buildParams({ dateFrom: dateFrom || '', dateTo: dateTo || '', search: search || '' });
    const cacheKey = `orders:${dateFrom}:${dateTo}:${search}`;
    return this.cachedRequest(cacheKey,
      this.http.get<ApiResponse<SalesOrder[]>>(
        `${this.baseUrl}/customer/orders`, { headers: this.headers, params }
      ).pipe(catchError(this.handleError))
    );
  }

  // ─── CUSTOMER INVOICE LIST (ZFI_CUSTOMER_INVO_FM via backend) ───────────────
  getCustomerInvoiceList(search?: string): Observable<ApiResponse<{ invoices: SapInvoiceListItem[]; total: number }>> {
    const params   = this.buildParams({ search: search || '' });
    const cacheKey = `customer-invoice-list:${search}`;
    return this.cachedRequest(cacheKey,
      this.http.get<ApiResponse<{ invoices: SapInvoiceListItem[]; total: number }>>(
        `${this.baseUrl}/customer/invoice-list`, { headers: this.headers, params }
      ).pipe(catchError(this.handleError))
    );
  }

  // ─── SINGLE INVOICE DETAIL + PDF (ZFI_GET_INVOICE_DATA via backend) ─────────
  getInvoiceDetail(vbeln: string): Observable<ApiResponse<SapInvoiceDetail>> {
    const cacheKey = `invoice-detail:${vbeln}`;
    return this.cachedRequest(cacheKey,
      this.http.get<ApiResponse<SapInvoiceDetail>>(
        `${this.baseUrl}/customer/invoice-detail/${encodeURIComponent(vbeln)}`,
        { headers: this.headers }
      ).pipe(catchError(this.handleError))
    );
  }

  // ─── DIRECT PDF DOWNLOAD (returns actual PDF file blob) ──────────────────────
  downloadInvoicePdf(vbeln: string): Observable<Blob> {
    return this.http.get(
      `${this.baseUrl}/customer/invoice-pdf/${encodeURIComponent(vbeln)}`,
      { headers: this.headers, responseType: 'blob' }
    ).pipe(catchError(this.handleError));
  }

  private handleError(error: any): Observable<never> {
    console.error('API Error:', error);
    const message = error?.error?.message || error?.message || 'An unexpected error occurred';
    return throwError(() => new Error(message));
  }
}
