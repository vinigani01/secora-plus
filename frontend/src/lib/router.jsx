import { useEffect, useState } from "react";

// Minimal path router: two routes do not justify a dependency. nginx and Vite both
// fall back to index.html for unknown paths, so /app works on refresh.
const read = () => ({ path: window.location.pathname.replace(/\/+$/, "") || "/", search: window.location.search });

export function navigate(to, { replace = false } = {}) {
  window.history[replace ? "replaceState" : "pushState"]({}, "", to);
  window.dispatchEvent(new PopStateEvent("popstate"));
  if (!replace && !to.includes("#")) window.scrollTo({ top: 0 });
}

export function useLocation() {
  const [loc, setLoc] = useState(read);
  useEffect(() => {
    const on = () => setLoc(read());
    window.addEventListener("popstate", on);
    return () => window.removeEventListener("popstate", on);
  }, []);
  return loc;
}

export function Link({ to, onClick, ...props }) {
  return (
    <a
      href={to}
      onClick={(e) => {
        onClick?.(e);
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(to);
      }}
      {...props}
    />
  );
}
