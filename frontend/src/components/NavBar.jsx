import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "./ui/button";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { NotificationBell } from "./NotificationBell";
import { Sun, Moon, RefreshCw } from "lucide-react";

const navItems = [
  { label: "Skills", to: "/skills" },
  { label: "Bookings", to: "/bookings" },
  { label: "Ratings", to: "/ratings" },
  { label: "Credits", to: "/credits" },
];

export const NavBar = () => {
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const isDark = theme === "dark" || (theme === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const handleRefresh = () => {
    window.location.reload();
  };

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-sm dark:border-slate-700/80 dark:bg-slate-900/95">
      <div className="container flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link 
          to={user ? "/dashboard" : "/"} 
          className="flex items-center gap-2 text-lg font-bold text-slate-900 hover:opacity-80 transition-opacity dark:text-slate-100"
        >
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white font-bold shadow-md">
            SS
          </span>
          <span className="hidden sm:inline">SkillSwap</span>
        </Link>
        <nav className="hidden items-center gap-1 text-sm font-medium text-slate-700 dark:text-slate-300 md:flex">
          {user && navItems.map((item) => {
            let isActive = false;
            if (item.to === "/skills") {
              isActive = location.pathname === "/skills" || location.pathname.startsWith("/skills/");
            } else if (item.to === "/bookings") {
              isActive = location.pathname === "/bookings";
            } else if (item.to === "/ratings") {
              isActive = location.pathname === "/ratings";
            } else if (item.to === "/credits") {
              isActive = location.pathname === "/credits" || location.pathname === "/transactions";
            }
            
            return (
              <Link 
                key={item.to} 
                to={item.to} 
                className={`px-3 py-2 rounded-md transition-all ${
                  isActive 
                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md font-semibold" 
                    : "hover:bg-slate-100 hover:text-blue-600 dark:hover:bg-slate-700 dark:hover:text-blue-400"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            title={isDark ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            className="p-2 rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
            title="Refresh page"
            aria-label="Refresh page"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
          {user ? (
            <>
              <Link 
                to="/dashboard" 
                className="hidden sm:block text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors dark:text-slate-300 dark:hover:text-blue-400"
              >
                Dashboard
              </Link>
              <NotificationBell />
              <Link 
                to="/profile" 
                className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors dark:text-slate-300 dark:hover:text-blue-400"
              >
                {user.name}
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link 
                to="/login" 
                className="text-sm font-semibold text-slate-700 hover:text-blue-600 transition-colors dark:text-slate-300 dark:hover:text-blue-400"
              >
                Login
              </Link>
              <Button size="sm" onClick={() => navigate("/register")}>
                Get Started
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};

