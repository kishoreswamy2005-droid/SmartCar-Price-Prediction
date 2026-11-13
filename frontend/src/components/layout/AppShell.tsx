import { Menu, X, Wifi, WifiOff, ShieldCheck, Gauge } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";

import { BrandWordmark, Logo } from "@/components/layout/Logo";
import { NAV_ITEMS, PAGE_TITLES } from "@/components/layout/nav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Button } from "@/components/ui/button";
import { getHealth } from "@/services/predictionService";
import { cn } from "@/lib/utils";

const APP_VERSION = "v1.0.0";

/** Small pill that reflects real API availability (checked on mount). */
function HealthPill() {
  const [status, setStatus] = useState<"checking" | "online" | "offline">("checking");

  useEffect(() => {
    let cancelled = false;
    getHealth()
      .then((health) => {
        if (!cancelled) {
          setStatus(health.status === "ok" ? "online" : "offline");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("offline");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const label =
    status === "checking"
      ? "Checking API…"
      : status === "online"
        ? "API online"
        : "API offline";

  return (
    <span
      className={cn(
        "hidden items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tracking-tight shadow-xs backdrop-blur-sm sm:inline-flex",
        status === "online" &&
          "border-success/30 bg-success/10 text-success dark:bg-success/15",
        status === "offline" &&
          "border-destructive/30 bg-destructive/10 text-destructive",
        status === "checking" &&
          "border-border/70 bg-card/70 text-muted-foreground",
      )}
      title={
        status === "offline"
          ? "The backend on port 8000 did not respond"
          : "FastAPI, model and database are reachable"
      }
    >
      <span className="relative flex h-2 w-2">
        <span
          className={cn(
            "absolute inline-flex h-full w-full rounded-full",
            status === "online" && "animate-ping bg-success/70",
            status === "offline" && "bg-destructive",
            status === "checking" && "bg-muted-foreground/60",
          )}
        />
        <span
          className={cn(
            "relative inline-flex h-2 w-2 rounded-full",
            status === "online" && "bg-success",
            status === "offline" && "bg-destructive",
            status === "checking" && "bg-muted-foreground",
          )}
        />
      </span>
      {status === "online" ? (
        <Wifi className="hidden h-3.5 w-3.5 sm:block" aria-hidden="true" />
      ) : status === "offline" ? (
        <WifiOff className="hidden h-3.5 w-3.5 sm:block" aria-hidden="true" />
      ) : (
        <ShieldCheck className="hidden h-3.5 w-3.5 sm:block" aria-hidden="true" />
      )}
      {label}
    </span>
  );
}

function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1.5 px-3" aria-label="Primary">
      <p className="eyebrow px-3 pb-2 pt-3 text-sidebar-muted/60">Workspace</p>
      {NAV_ITEMS.map(({ label, href, icon: Icon, description }) => (
        <NavLink
          key={href}
          to={href}
          end={href === "/"}
          onClick={onNavigate}
          title={description}
          className={({ isActive }) =>
            cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150",
              isActive
                ? "bg-primary/15 text-white shadow-[inset_0_0_0_1px_hsl(var(--primary)/0.22)]"
                : "text-sidebar-muted hover:bg-white/[0.06] hover:text-white",
            )
          }
        >
          {({ isActive }) => (
            <>
              <span
                className={cn(
                  "absolute -left-3 h-6 w-1 rounded-r-full bg-primary transition-opacity",
                  isActive ? "opacity-100" : "opacity-0",
                )}
                aria-hidden="true"
              />
              <span
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors",
                  isActive
                    ? "bg-primary/20 text-electric-400"
                    : "text-sidebar-muted/90 group-hover:bg-white/[0.07] group-hover:text-white",
                )}
                aria-hidden="true"
              >
                <Icon className="h-[17px] w-[17px]" />
              </span>
              <span className="min-w-0 truncate">{label}</span>
              {isActive && (
                <span
                  className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
                  aria-hidden="true"
                />
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export function AppShell() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const pageTitle =
    PAGE_TITLES[location.pathname] ?? {
      title: "SmartCar",
      subtitle: "Used-car price prediction",
    };

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setDrawerOpen(false);
  }, [location.pathname]);

  // Lock background scroll while the drawer is open.
  useEffect(() => {
    if (!drawerOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [drawerOpen]);

  const sidebarBrand = (
    <>
      <Logo />
      <BrandWordmark />
    </>
  );

  const sidebarFooter = (
    <div className="border-t border-sidebar-border px-5 py-4">
      <p className="eyebrow text-sidebar-muted">SmartCar {APP_VERSION}</p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-sidebar-muted/70">
        Estimates come from a trained ML model — not guaranteed market prices.
      </p>
      <span className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-sidebar-border bg-white/[0.04] px-2 py-1 text-[10px] font-medium uppercase tracking-wider text-sidebar-muted">
        <Gauge className="h-3 w-3" aria-hidden="true" />
        Linear Regression · MAE ₹95,267
      </span>
    </div>
  );

  return (
    <div className="min-h-screen">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="no-print fixed inset-y-0 left-0 z-40 hidden w-64 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar lg:flex">
        <div
          className="pointer-events-none absolute inset-x-0 -top-24 h-64 bg-[radial-gradient(120%_100%_at_20%_50%,hsl(var(--primary)/0.22),transparent_70%)]"
          aria-hidden="true"
        />
        <Link
          to="/"
          className="relative flex items-center gap-3 border-b border-sidebar-border/70 px-5 py-5"
          aria-label="SmartCar home"
        >
          {sidebarBrand}
        </Link>

        <div className="relative flex-1 overflow-y-auto pb-4 scrollbar-thin">
          <SidebarNav />
        </div>

        <div className="relative">{sidebarFooter}</div>
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="no-print fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-[3px] animate-fade-in"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col overflow-hidden bg-sidebar shadow-2xl animate-fade-in">
            <div
              className="pointer-events-none absolute inset-x-0 -top-24 h-56 bg-[radial-gradient(120%_100%_at_20%_50%,hsl(var(--primary)/0.22),transparent_70%)]"
              aria-hidden="true"
            />
            <div className="relative flex items-center justify-between border-b border-sidebar-border/70 px-5 py-4">
              <Link to="/" className="flex items-center gap-3" aria-label="SmartCar home">
                {sidebarBrand}
              </Link>
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-sidebar-muted hover:bg-white/10 hover:text-white"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="relative flex-1 overflow-y-auto pb-4 scrollbar-thin">
              <SidebarNav onNavigate={() => setDrawerOpen(false)} />
            </div>
            <div className="relative">{sidebarFooter}</div>
          </div>
        </div>
      )}

      {/* Content column */}
      <div className="flex min-h-screen min-w-0 flex-col lg:pl-64">
        <header className="no-print sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/70">
          <div className="mx-auto flex h-16 max-w-[1500px] items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button
              variant="outline"
              size="icon-sm"
              className="lg:hidden"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <Link to="/" className="flex items-center gap-2 lg:hidden" aria-label="SmartCar home">
              <Logo className="h-8 w-8" />
              <span className="text-sm font-bold tracking-tight">
                Smart<span className="text-primary">Car</span>
              </span>
            </Link>

            <div className="hidden min-w-0 flex-col lg:flex">
              <h1 className="truncate text-xl font-semibold leading-tight tracking-tight">
                {pageTitle.title}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                {pageTitle.subtitle}
              </p>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <HealthPill />
              <ThemeToggle />
            </div>
          </div>
          <div
            className="h-px bg-gradient-to-r from-primary/50 via-primary/10 to-transparent"
            aria-hidden="true"
          />
        </header>

        <main
          id="main-content"
          className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8"
        >
          <div key={location.pathname} className="animate-fade-in">
            <Outlet />
          </div>
        </main>

        <footer className="no-print border-t border-border/70 bg-card/30 py-5">
          <div className="mx-auto flex max-w-[1500px] flex-col items-center justify-between gap-2 px-4 text-xs text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
            <span>
              SmartCar {APP_VERSION} — predictions from a scikit-learn model trained on the
              CarDekho dataset.
            </span>
            <span>Not a guaranteed selling price.</span>
          </div>
        </footer>
      </div>
    </div>
  );
}
