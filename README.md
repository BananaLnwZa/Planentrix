# Planentrix

Planentrix uses one backend API and two web frontends:

- Backend API: `http://localhost:4000`
- User web and shared login: `http://localhost:3000`
- Staff web (`university_staff` and `instructor`): `http://localhost:3001`

Run each application in a separate terminal:

```powershell
cd backend
npm run dev

cd frontend/web/user
npm run dev

cd frontend/web/admin
npm run dev
```

All roles sign in through the same page at `http://localhost:3000/LogIn`. The
backend returns `user`, `instructor`, or `university_staff`, and the frontend
redirects the session to the correct page.
