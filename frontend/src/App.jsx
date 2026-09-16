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

// The live exam screen (/dashboard/student/tests/:id) already renders its
// own self-contained header (candidate name, timer, subject) — stacking the
// site's marketing Header/Footer on top of that isn't just visual clutter,
// it's an integrity risk: their nav links (Home, Courses, the hamburger
// menu, About/Contact/Terms in the footer) give a student mid-test a way to
// navigate away, and on a tall mobile layout the footer sits right where a
// thumb scrolling past the answer buttons would land. Excludes the
// non-exam siblings under the same prefix (the tests list, history, and the
// post-submit result page) which are safe to keep normal site chrome on.
function isExamRoute(pathname) {
  return /^\/dashboard\/student\/tests\/(?!history$)[^/]+$/.test(pathname);
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
  if (isExamRoute(pathname)) return children;
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
