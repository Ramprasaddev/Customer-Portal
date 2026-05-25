import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/auth.service';
import { ApiService }  from './services/api.service';
import { CustomerProfile } from './models/sap.models';

export interface Notification {
  id: number;
  icon: string;
  iconClass: string;
  title: string;
  body: string;
  time: string;
  read: boolean;
}

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  isLoggedIn   = false;
  mobileOpen   = false;
  sidebarPinned = false;     // pinned = always expanded, no JS needed
  currentRoute  = '';
  kunnr = '';
  profile: CustomerProfile | null = null;

  // Topbar
  globalSearch    = '';
  showNotifPanel  = false;
  showSearchBar   = false;

  notifications: Notification[] = [
    { id: 1, icon: 'pi-truck',       iconClass: 'notif-green',  title: 'Delivery Shipped',    body: 'Order #100234 is out for delivery.',           time: '2 min ago',  read: false },
    { id: 2, icon: 'pi-file',        iconClass: 'notif-blue',   title: 'New Invoice',         body: 'Invoice #90017 has been generated for you.',   time: '1 hr ago',   read: false },
    { id: 3, icon: 'pi-clock',       iconClass: 'notif-amber',  title: 'Payment Due',         body: 'Invoice #89954 is due in 3 days.',             time: '5 hrs ago',  read: true  },
    { id: 4, icon: 'pi-check-circle',iconClass: 'notif-green',  title: 'Order Completed',     body: 'Sales order #100198 has been fully delivered.','time': 'Yesterday', read: true  },
    { id: 5, icon: 'pi-exclamation-triangle', iconClass: 'notif-red', title: 'Overdue Balance', body: 'You have 2 invoices overdue by 30+ days.', time: '2 days ago', read: true },
  ];

  navItems = [
    { label: 'Dashboard',  icon: 'pi-home',            route: '/dashboard',  badge: 0 },
    { label: 'Inquiries',  icon: 'pi-question-circle', route: '/inquiries',  badge: 0 },
    { label: 'Sales',      icon: 'pi-shopping-bag',    route: '/sales',      badge: 0 },
    { label: 'Delivery',   icon: 'pi-send',            route: '/delivery',   badge: 0 },
    { label: 'Finance',    icon: 'pi-wallet',          route: '/finance',    badge: 0 },
    { label: 'Aging',      icon: 'pi-clock',           route: '/aging',      badge: 0 },
    { label: 'Invoices',   icon: 'pi-file',            route: '/invoice',    badge: 0 },
    { label: 'Profile',    icon: 'pi-user',            route: '/profile',    badge: 0 },
  ];

  constructor(
    private auth:    AuthService,
    private api:     ApiService,
    private router:  Router,
    private elRef:   ElementRef,
  ) {}

  ngOnInit(): void {
    this.auth.isLoggedIn$.subscribe(v => {
      this.isLoggedIn = v;
      if (v) this.loadProfile();
    });
    this.auth.kunnr$.subscribe(k => { this.kunnr = k; });
    this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe((e: any) => {
        this.currentRoute = e.urlAfterRedirects;
        this.mobileOpen   = false;
        this.showNotifPanel = false;
      });
  }

  loadProfile(): void {
    this.api.getProfile().subscribe({
      next: res => { this.profile = res.data; },
      error: () => {},
    });
  }

  get userInitials(): string {
    return (this.profile?.NAME1 || this.kunnr || 'U').slice(0, 2).toUpperCase();
  }

  get unreadCount(): number { return this.notifications.filter(n => !n.read).length; }

  isActive(route: string): boolean { return this.currentRoute.startsWith(route); }

  toggleMobile():  void { this.mobileOpen = !this.mobileOpen; }
  closeMobile():   void { this.mobileOpen = false; }
  togglePin():     void { this.sidebarPinned = !this.sidebarPinned; }

  toggleNotifPanel(): void {
    this.showNotifPanel = !this.showNotifPanel;
    this.showSearchBar  = false;
  }

  toggleSearchBar(): void {
    this.showSearchBar  = !this.showSearchBar;
    this.showNotifPanel = false;
  }

  markAllRead(): void { this.notifications.forEach(n => n.read = true); }

  markRead(n: Notification): void { n.read = true; }

  onGlobalSearch(event: KeyboardEvent): void {
    if (event.key === 'Enter' && this.globalSearch.trim()) {
      this.router.navigate(['/sales'], { queryParams: { q: this.globalSearch.trim() } });
      this.showSearchBar = false;
      this.globalSearch  = '';
    }
    if (event.key === 'Escape') {
      this.showSearchBar = false;
      this.globalSearch  = '';
    }
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent): void {
    if (!this.elRef.nativeElement.contains(event.target)) {
      this.showNotifPanel = false;
    }
  }

  logout(event?: Event): void {
    event?.stopImmediatePropagation();
    this.auth.logout();
  }

  goToProfile(): void { this.router.navigate(['/profile']); }
}
