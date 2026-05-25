# Command Reference

Useful commands for Windows PowerShell/CMD while working with this portal.

## First-Time Setup

From the repository root:

```powershell
cd "C:\KAAR\Portals\Customer Portal\kaartech-portal"
```

Install backend dependencies:

```powershell
cd backend
npm install
Copy-Item .env.example .env
```

Edit `backend/.env` and fill SAP/JWT values.

Install frontend dependencies:

```powershell
cd ..\frontend
npm install
```

## Run Locally

Terminal 1, backend:

```powershell
cd "C:\KAAR\Portals\Customer Portal\kaartech-portal\backend"
npm run dev
```

Terminal 2, frontend:

```powershell
cd "C:\KAAR\Portals\Customer Portal\kaartech-portal\frontend"
npm start
```

Open:

```text
http://localhost:4200
```

The frontend proxy sends `/api` requests to `http://localhost:3000`.

## Production Build Check

```powershell
cd "C:\KAAR\Portals\Customer Portal\kaartech-portal\frontend"
npm run build
```

## Backend Health Check

With backend running:

```powershell
Invoke-WebRequest http://localhost:3000/api/health -UseBasicParsing
```

Expected JSON includes:

```json
{
  "status": "ok"
}
```

## Git Commands Before Push

For this repository, use `git add -A` when preparing the first full push so new files such as `.gitignore`, `README.md`, `COMMANDS.md`, `backend/`, and `frontend/` are included.

```powershell
cd "C:\KAAR\Portals\Customer Portal\kaartech-portal"
git status
git add -A
git status
git commit -m "docs: update customer portal documentation"
git push
```

If you only want to stage documentation later:

```powershell
git add README.md COMMANDS.md
git status
```

Before committing, make sure these are not staged:

```text
backend/.env
frontend/dist/
backend/node_modules/
frontend/node_modules/
```

## Common Troubleshooting

Backend port already in use:

```powershell
Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
```

Frontend port already in use:

```powershell
Get-NetTCPConnection -LocalPort 4200 -ErrorAction SilentlyContinue
```

Clean frontend build output:

```powershell
Remove-Item -Recurse -Force frontend\dist
cd frontend
npm run build
```

Reinstall dependencies only when needed:

```powershell
cd backend
npm install
cd ..\frontend
npm install
```

## Important Files

```text
backend/.env.example
backend/src/server.js
backend/src/routes/index.js
backend/src/controllers/customer.controller.js
backend/src/services/sapSoap.service.js
frontend/proxy.conf.json
frontend/src/app/app-routing.module.ts
frontend/src/app/services/api.service.ts
frontend/src/styles.scss
```
