// src/app/services/auth.service.ts
import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { ApiService } from './api.service';
import { LoginRequest, LoginResponse } from '../models/sap.models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _isLoggedIn = new BehaviorSubject<boolean>(this.hasValidToken());
  private _kunnr      = new BehaviorSubject<string>(localStorage.getItem('portal_kunnr') || '');

  isLoggedIn$ = this._isLoggedIn.asObservable();
  kunnr$      = this._kunnr.asObservable();

  constructor(private api: ApiService, private router: Router) {}

  get kunnr(): string { return this._kunnr.getValue(); }
  get isLoggedIn(): boolean { return this._isLoggedIn.getValue(); }

  login(req: LoginRequest): Observable<LoginResponse> {
    return this.api.login(req).pipe(
      tap(res => {
        if (res.success && res.token) {
          localStorage.setItem('portal_token', res.token);
          localStorage.setItem('portal_kunnr', res.kunnr);
          this._isLoggedIn.next(true);
          this._kunnr.next(res.kunnr);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem('portal_token');
    localStorage.removeItem('portal_kunnr');
    this._isLoggedIn.next(false);
    this._kunnr.next('');
    this.router.navigate(['/login']);
  }

  private hasValidToken(): boolean {
    const token = localStorage.getItem('portal_token');
    if (!token) return false;
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  }
}
