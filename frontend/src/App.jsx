import { useEffect } from "react";
import Header from "./components/Header.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Landing from "./pages/Landing.jsx";
import { useLocation } from "./lib/router.jsx";

export default function App() {
  const { path, search } = useLocation();
  const page = path.startsWith("/app") ? "app" : "home";

  useEffect(() => {
    document.title = page === "app" ? "Dashboard · SECORA" : "SECORA - ESG and cyber risk monitor";
  }, [page]);

  return (
    <div className="min-h-screen">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-panel focus:px-4 focus:py-2 focus:shadow-lift">
        Skip to content
      </a>
      <Header path={page === "app" ? "/app" : "/"} />
      <main id="main">
        {page === "app" ? <Dashboard search={search} /> : <Landing />}
      </main>
    </div>
  );
}
