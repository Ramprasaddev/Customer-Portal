// src/app/components/profile/profile.component.ts
import { Component, OnInit } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { CustomerProfile } from '../../models/sap.models';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  profile: CustomerProfile | null = null;
  loading = true;
  error   = '';
  kunnr   = '';

  countryNames: Record<string, string> = {
    IN: 'India', DE: 'Germany', US: 'United States', GB: 'United Kingdom',
    SG: 'Singapore', AU: 'Australia', AE: 'UAE',
  };

  constructor(private api: ApiService, private auth: AuthService) {}

  ngOnInit(): void {
    this.kunnr = this.auth.kunnr;
    this.api.getProfile().subscribe({
      next: res  => { this.profile = res.data; this.loading = false; },
      error: err => { this.error   = err.message; this.loading = false; },
    });
  }

  countryName(code: string): string {
    return this.countryNames[code] || code;
  }

  initials(name: string): string {
    return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
}
