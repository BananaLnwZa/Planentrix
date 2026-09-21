# Planentrix User Web

The user application also owns the shared login page for users and
administrators.

## Development

Copy `.env.example` to `.env.local`, then run:

```powershell
npm install
npm run dev
```

The app runs at `http://localhost:3000` and the shared login page is
`http://localhost:3000/LogIn`.

After a successful login, a user remains in this app while an administrator is
redirected to `NEXT_PUBLIC_ADMIN_WEB_URL`.
