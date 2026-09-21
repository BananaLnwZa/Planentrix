export const getSharedLoginUrl = (): string =>
  process.env.NEXT_PUBLIC_LOGIN_URL || "http://localhost:3000/LogIn";
