# Planentrix Staff Web

The staff application serves both `university_staff` and `instructor` accounts
and uses the shared login page from the user application.
Opening `/LogIn` here redirects to `NEXT_PUBLIC_LOGIN_URL`.

## Development

Copy `.env.example` to `.env.local`, then run:

```powershell
npm install
npm run dev
```

The staff app runs at `http://localhost:3001`. University staff use `/Main` and
instructors use `/Instructor/Main`. Both web applications use the same
`accessToken` cookie on localhost.

When deploying the applications on separate subdomains, set the same
`NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` value in both applications so the session can
be shared securely between them.
