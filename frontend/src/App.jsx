import { BrowserRouter, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import Header from './components/layout/Header.jsx';
import Footer from './components/layout/Footer.jsx';
import AppRoutes from './routes/AppRoutes.jsx';
import CourseFinderWidget from './components/home/CourseFinderWidget.jsx';
import LatestBlogWidget from './components/home/LatestBlogWidget.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';

// Both widgets are public-marketing tools (course finder for prospective
// students, latest blog posts) — they have no business on any authenticated
// dashboard route. An earlier fix only hid them on the two exam-taking
// screens, but their fixed bottom-corner position can just as easily
// overlap real buttons anywhere in the dashboard (e.g. a test card's action
// row landing in the same bottom-right corner as "Find My Course"), so this
// is an allow-list of public routes rather than a deny-list of dashboard
// sub-routes — it can't miss a spot the way the narrower check could.
const PUBLIC_ROUTE_PREFIXES = ['/blog', '/mentor', '/about', '/contact', '/login', '/signup'];

function isPublicRoute(pathname) {
  if (pathname === '/') return true;
  return PUBLIC_ROUTE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// Every /dashboard/* route (mentor, student, and the live exam screen among
// them) now renders its own full-height shell — DashboardLayout.jsx has its
// own topbar (logo, theme toggle, notifications, logout), so stacking the
// marketing Header/Footer on top of that was pure double-chrome: it ate
// vertical space the sidebar needed (the original "sidebar doesn't fit"
// complaint) and, on the exam screen specifically, gave a student mid-test
// nav links (Home, the hamburger menu, About/Contact/Terms in the footer)
// as a way to leave — a real integrity risk, not just visual clutter.
function isDashboardRoute(pathname) {
  return pathname === '/dashboard' || pathname.startsWith('/dashboard/');
}

function FloatingWidgets() {
  const { pathname } = useLocation();
  if (!isPublicRoute(pathname)) return null;
  return (
    <>
      <CourseFinderWidget />
      <LatestBlogWidget />
    </>
  );
}

function SiteChrome({ children }) {
  const { pathname } = useLocation();
  if (isDashboardRoute(pathname)) return children;
  return (
    <>
      <Header />
      {children}
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <SiteChrome>
              <AppRoutes />
            </SiteChrome>
            <FloatingWidgets />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </HelmetProvider>
  );
}
