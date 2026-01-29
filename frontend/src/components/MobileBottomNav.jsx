import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { BookOpen, CalendarCheck2, Star, Coins } from "lucide-react";

const items = [
  { label: "Skills", to: "/skills", Icon: BookOpen },
  { label: "Bookings", to: "/bookings", Icon: CalendarCheck2 },
  { label: "Ratings", to: "/ratings", Icon: Star },
  { label: "Credits", to: "/credits", Icon: Coins },
];

function isActivePath(itemTo, pathname) {
  if (itemTo === "/skills") return pathname === "/skills" || pathname.startsWith("/skills/");
  if (itemTo === "/credits") return pathname === "/credits" || pathname === "/transactions";
  return pathname === itemTo;
}

export function MobileBottomNav() {
  const { user } = useAuth();
  const location = useLocation();

  // Only show to logged-in users; logged-out users should see Landing/Login CTAs.
  if (!user) return null;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto grid max-w-screen-sm grid-cols-4 px-2 pb-[env(safe-area-inset-bottom)]">
        {items.map(({ label, to, Icon }) => {
          const active = isActivePath(to, location.pathname);
          return (
            <Link
              key={to}
              to={to}
              className={[
                "flex flex-col items-center justify-center gap-1 py-3 text-xs font-semibold transition-colors",
                active ? "text-blue-700" : "text-slate-600 hover:text-blue-600",
              ].join(" ")}
              aria-current={active ? "page" : undefined}
            >
              <Icon className={active ? "h-5 w-5" : "h-5 w-5 opacity-80"} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

