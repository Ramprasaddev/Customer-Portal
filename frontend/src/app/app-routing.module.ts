// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  {
    path: 'login',
    loadChildren: () => import('./components/login/login.module').then(m => m.LoginModule),
  },
  {
    path: 'dashboard',
    canActivate: [AuthGuard],
    loadChildren: () => import('./components/dashboard/dashboard.module').then(m => m.DashboardModule),
  },
  {
    path: 'profile',
    canActivate: [AuthGuard],
    loadChildren: () => import('./components/profile/profile.module').then(m => m.ProfileModule),
  },
  {
    path: 'sales',
    canActivate: [AuthGuard],
    loadChildren: () => import('./components/sales/sales.module').then(m => m.SalesModule),
  },
  {
    path: 'delivery',
    canActivate: [AuthGuard],
    loadChildren: () => import('./components/delivery/delivery.module').then(m => m.DeliveryModule),
  },
  {
    path: 'finance',
    canActivate: [AuthGuard],
    loadChildren: () => import('./components/finance/finance.module').then(m => m.FinanceModule),
  },
  {
    path: 'aging',
    canActivate: [AuthGuard],
    loadChildren: () => import('./components/aging/aging.module').then(m => m.AgingModule),
  },
  {
    path: 'inquiries',
    canActivate: [AuthGuard],
    loadChildren: () => import('./components/inquiries/inquiries.module').then(m => m.InquiriesModule),
  },
  {
    path: 'invoice',
    canActivate: [AuthGuard],
    loadChildren: () => import('./components/invoice/invoice.module').then(m => m.InvoiceModule),
  },
  { path: '**', redirectTo: 'dashboard' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
