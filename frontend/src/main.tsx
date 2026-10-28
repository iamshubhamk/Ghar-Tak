import { ComponentType, lazy, StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";

import "./styles.css";

// Each area is its own chunk, so a marketing visitor never downloads the admin or the old app.
const App = lazy(() => import("./App"));
const AdminLogin = lazy(() => import("./admin/AdminLogin"));
const AdminApp = lazy(() => import("./admin/AdminApp"));
const SiteLayout = lazy(() => import("./site/SiteLayout"));
const sitePage = (pick: (m: typeof import("./site/pages")) => ComponentType) =>
  lazy(() => import("./site/pages").then((m) => ({ default: pick(m) })));
const Landing = sitePage((m) => m.Landing);
const ServicePage = sitePage((m) => m.ServicePage);
const Partner = sitePage((m) => m.Partner);
const Support = sitePage((m) => m.Support);
const Install = sitePage((m) => m.Install);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/*" element={<AdminApp />} />
          {/* New marketing site. "/" still serves the old app until the swap (T6-04). */}
          <Route element={<SiteLayout />}>
            <Route path="/welcome" element={<Landing />} />
            <Route path="/services/:slug" element={<ServicePage />} />
            <Route path="/partner" element={<Partner />} />
            <Route path="/support" element={<Support />} />
            <Route path="/install" element={<Install />} />
          </Route>
          <Route path="/*" element={<App />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </StrictMode>
);
