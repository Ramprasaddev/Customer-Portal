# Kaartech SAP Customer Portal

Full-stack SAP Customer Self-Service Portal built with an Angular 17 frontend and a Node.js/Express backend. The portal authenticates SAP customers, reads live SAP SD/FI data through SOAP services, and presents dashboard, sales, delivery, invoice, inquiry, aging, finance, and profile workflows in a consistent Kaartech UI.

## Current Scope

- Customer login through SAP RFC `ZF_SD_9086_LOGIN`.
- JWT-protected customer portal pages.
- Dashboard with KPIs, delivery status chart, aging snapshot, recent deliveries, and quick access.
- Dedicated Sales Orders page.
- Dedicated Deliveries page with delivery type mapping and status breakdown.
- Invoice page with list, PDF preview, PDF download, and CSV export.
- Inquiry page with product/value charts, filters, detail modal, and CSV export.
- Finance page for invoices and credit/debit note views.
- Aging page with bucket summary and aging detail table.
- Profile page for SAP customer master data.
- Shared table styling across Delivery, Sales, Inquiry, Invoice, Aging, Finance, and dashboard recent lists.

## Architecture

```text
Browser
  |
  | Angular 17 SPA (frontend, port 4200)
  | - Lazy routed modules
  | - PrimeNG tables/components
  | - Chart.js dashboards
  | - Auth guard and JWT interceptor
  |
  | /api proxied by frontend/proxy.conf.json
  v
Node.js Express API (backend, port 3000)
  | - Helmet, CORS, rate limiting
  | - JWT login/session validation
  | - Customer controllers
  | - SAP SOAP service wrapper
  v
SAP ERP SOAP Services
  | - Login
  | - Profile
  | - Dashboard / orders / deliveries
  | - Finance / aging
  | - Invoice list/detail/PDF
  | - Inquiry list
```

## Repository Layout

```text
kaartech-portal/
  backend/
    src/
      server.js                    Express app, security, CORS, routes
      routes/index.js              Public and protected API routes
      controllers/
        auth.controller.js         SAP login and JWT issue
        customer.controller.js     Customer portal API handlers
      middleware/
        auth.middleware.js         JWT verification middleware
      services/
        sapSoap.service.js         SAP SOAP calls, XML parsing, PDF handling
    .env.example                   Backend environment template
    package.json                   Backend scripts and dependencies

  frontend/
    src/
      app/
        app-routing.module.ts      Lazy route map
        app.component.*            Sidebar, topbar, shell layout
        guards/                    Auth route guard
        interceptors/              JWT HTTP interceptor
        models/sap.models.ts       Shared TypeScript models
        services/
          api.service.ts           API client and request de-duplication
          auth.service.ts          Login state and token storage
        components/
          login/                   Customer login
          dashboard/               KPI dashboard and recent activity
          sales/                   Sales order list
          delivery/                Delivery list and chart
          invoice/                 Invoice list, PDF preview/download
          inquiries/               Inquiry list, charts, detail modal
          finance/                 Credit/debit and finance data
          aging/                   Aging buckets and detail table
          profile/                 Customer profile
      styles.scss                  Global design tokens and table styling
    proxy.conf.json                Proxies /api to backend in development
    package.json                   Angular scripts and dependencies
```

## Frontend Routes

| Route | Module | Purpose |
| --- | --- | --- |
| `/login` | LoginModule | SAP customer authentication |
| `/dashboard` | DashboardModule | Business overview, KPIs, charts, recent deliveries |
| `/sales` | SalesModule | Sales order list and order status chart |
| `/delivery` | DeliveryModule | Delivery list, delivery type names, status chart |
| `/invoice` | InvoiceModule | Customer invoice list, PDF preview/download, CSV export |
| `/inquiries` | InquiriesModule | Sales inquiries, filters, charts, detail modal |
| `/finance` | FinanceModule | Finance summary and credit/debit records |
| `/aging` | AgingModule | Receivable aging buckets and detail report |
| `/profile` | ProfileModule | SAP customer master profile |

All routes except `/login` are protected by `AuthGuard`.

## Backend REST API

Public:

| Method | Endpoint | Description |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Validate SAP customer credentials and issue JWT |
| `GET` | `/api/health` | Health check |

Protected with `Authorization: Bearer <token>`:

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/customer/profile` | Customer master data |
| `GET` | `/api/customer/dashboard` | Dashboard data from SAP |
| `GET` | `/api/customer/orders` | Sales orders |
| `GET` | `/api/customer/deliveries` | Delivery list |
| `GET` | `/api/customer/finance` | Finance data |
| `GET` | `/api/customer/aging` | Aging report and bucket summary |
| `GET` | `/api/customer/invoices` | Legacy invoice data |
| `GET` | `/api/customer/invoice-list` | Dedicated invoice list |
| `GET` | `/api/customer/invoice-detail/:vbeln` | Invoice header, items, and PDF base64 |
| `GET` | `/api/customer/invoice-pdf/:vbeln` | PDF file download |
| `GET` | `/api/customer/inquiries` | Dashboard inquiry source |
| `GET` | `/api/customer/inquiry-list` | Dedicated customer inquiry list |

## SAP Service Map

| Business Area | SAP FM / Service | Backend Usage |
| --- | --- | --- |
| Login | `ZF_SD_9086_LOGIN` / `zf_sd_9086_login_s` | Authenticates KUNNR and password |
| Profile | `ZSD_FM_GET_PROFILE` / `zsd_fm_get_profile_sw` | Customer profile |
| Dashboard | `ZSD_FM_GET_DASHBOARD` / `zsd_fm_get_dashboard_sw` | Orders, deliveries, summary data |
| Finance | `ZFM_FM_GET_FIN` / `zfi_fm_get_fin_sw` | Credit/debit and invoice data |
| Aging | `ZFI_FM_GET_AGING` / `zfi_fm_get_aging_sw` | Aging buckets and documents |
| Invoice List | `ZFI_CUSTOMER_INVO_FM` / `zfi_customer_invo_sw` | Invoice list page |
| Invoice Detail/PDF | `ZFI_GET_INVOICE_DATA` / `zfi_get_invoice_data` | Invoice details and PDF xstring |
| Inquiry List | `ZFI_CUST_INQ_FM` / `zfi_cust_inq_sw` | Sales inquiry page |

SAP host and client are configured from `backend/.env`.

## UI/UX Notes

- Global table font is `Inter`.
- PrimeNG and native tables share navy headers, white uppercase header labels, consistent row height, grid lines, and tabular numeric rendering.
- Sales, Delivery, Inquiry, Invoice, Aging, Finance, and dashboard recent delivery lists are visually aligned.
- Topbar notification and external website buttons were removed for a cleaner dashboard header.
- Dashboard delivery status chart shows only `Completed`, `In Progress`, and `Partial`.
- Delivery type codes are converted to readable labels, for example `LF` -> `Outbound Delivery`.

## Setup

Prerequisites:

- Node.js 18 or newer
- npm
- Angular CLI 17, optional globally: `npm install -g @angular/cli`
- SAP network access and valid SOAP credentials

Backend:

```powershell
cd backend
npm install
Copy-Item .env.example .env
# Update .env with SAP host, client, SAP user, SAP password, JWT secret, and CORS origin.
npm run dev
```

Frontend:

```powershell
cd frontend
npm install
npm start
```

Open `http://localhost:4200`.

## Environment

Create `backend/.env` from `backend/.env.example`.

```env
PORT=3000
NODE_ENV=development
SAP_BASE_URL=http://your-sap-host:8000
SAP_INVOICE_LIST_BASE=http://your-sap-host:8000
SAP_CLIENT=100
SAP_USERNAME=your_sap_username
SAP_PASSWORD=your_sap_password
JWT_SECRET=replace_with_a_secure_secret
JWT_EXPIRES_IN=8h
CORS_ORIGIN=http://localhost:4200
```

Do not commit `backend/.env`.

## Build And Verification

Frontend production build:

```powershell
cd frontend
npm run build
```

Backend start check:

```powershell
cd backend
npm start
```

Health check:

```powershell
Invoke-WebRequest http://localhost:3000/api/health -UseBasicParsing
```

## Git Push Checklist

Before pushing:

```powershell
git status
cd frontend
npm run build
cd ..
git status
```

Confirm these are not staged:

- `backend/.env`
- `frontend/dist/`
- `node_modules/`

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Angular 17, TypeScript, RxJS |
| UI | PrimeNG, PrimeIcons, Chart.js |
| Backend | Node.js, Express |
| Auth | SAP login plus JWT |
| SAP Integration | SOAP over HTTPS, Axios, xml2js |
| Security | Helmet, CORS, express-rate-limit |

