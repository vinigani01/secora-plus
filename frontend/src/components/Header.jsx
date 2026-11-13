import { useEffect, useState } from "react";
import { Link } from "../lib/router.jsx";
import { useTheme } from "../lib/theme.jsx";
import { Icon, Logo } from "./ui.jsx";

const LINKS = [
  ["/", "Home"],
  ["/#how", "How it works"],
  ["/#ledger", "Audit ledger"],
  ["/app", "Dashboard"],
];

export default function Header({ path }) {
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 4);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const esc = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  const isActive = (to) => (to === "/app" ? path === "/app" : to === "/" && path === "/");
  const linkCls = (to) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition ${isActive(to) ? "text-ink" : "text-moss hover:text-ink"}`;

  return (
    <header className={`sticky top-0 z-40 border-b transition ${scrolled || open ? "border-rule bg-paper/85 backdrop-blur-md" : "border-transparent bg-paper/0"}`}>
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5" aria-label="SECORA home">
          <Logo />
          <span className="font-display text-xl font-extrabold tracking-tight">SECORA</span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex" aria-label="Main">
          {LINKS.map(([to, label]) => (
            <Link key={to} to={to} className={linkCls(to)} aria-current={isActive(to) ? "page" : undefined}
              onClick={(e) => jumpToSection(e, to, path)}>{label}</Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button onClick={toggle} className="btn-ghost h-9 w-9 px-0" aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>
            {theme === "dark" ? <Icon.sun className="h-5 w-5" /> : <Icon.moon className="h-5 w-5" />}
          </button>
          {path !== "/app" && (
            <Link to="/app" className="btn-primary hidden sm:inline-flex">Open dashboard</Link>
          )}
          <button onClick={() => setOpen((o) => !o)} className="btn-ghost h-9 w-9 px-0 md:hidden" aria-expanded={open} aria-controls="mobile-nav" aria-label="Menu">
            {open ? <Icon.x className="h-5 w-5" /> : <Icon.menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-nav" className="border-t border-rule px-4 pb-4 pt-2 md:hidden" aria-label="Main">
          {LINKS.map(([to, label]) => (
            <Link key={to} to={to} className="block rounded-lg px-3 py-3 text-base font-medium hover:bg-sunk"
              onClick={(e) => { jumpToSection(e, to, path); setOpen(false); }}>{label}</Link>
          ))}
        </nav>
      )}
    </header>
  );
}

// "/#how" while already on "/" should scroll, not re-route.
function jumpToSection(e, to, path) {
  if (!to.includes("#")) return;
  const id = to.split("#")[1];
  if (path === "/") {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    window.history.replaceState({}, "", `/#${id}`);
  }
}
