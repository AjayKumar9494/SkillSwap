import { NavBar } from "./NavBar";

export const PageLayout = ({ children, hideNav = false }) => (
  <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 text-slate-900">
    {!hideNav && <NavBar />}
    <main className="container py-8">{children}</main>
  </div>
);

