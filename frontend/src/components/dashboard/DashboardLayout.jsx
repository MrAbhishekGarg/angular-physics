import { NavLink } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth.js';
import styles from './DashboardLayout.module.css';

const STUDENT_NAV = [
  {
    section: null,
    items: [
      { to: '/dashboard/student', label: 'Dashboard', end: true },
      { to: '/dashboard/student/notes', label: 'Notes' },
      { to: '/dashboard/student/tests', label: 'Tests' },
      { to: '/dashboard/student/worksheets', label: 'DPPs & Assignments' },
      { to: '/dashboard/student/practice', label: 'Practice by Topic' },
      { to: '/dashboard/student/doubts', label: 'Doubts' },
    ],
  },
];

// Grouped so an 11-item list scans instead of reading as a wall of links —
// each group is a distinct part of running the business (who you teach,
// what you teach them, how you test them, how you're perceived).
// Every item except the Dashboard overview itself carries a sectionKey
// (matching frontend/src/data/mentorSections.js and the backend's
// requireSection() gate) — a mentor with that key in restrictedSections
// has both the nav item AND the underlying route/API blocked.
const MENTOR_NAV = [
  {
    section: 'Overview',
    items: [
      { to: '/dashboard/mentor', label: 'Dashboard', end: true },
      { to: '/dashboard/mentor/students', label: 'All Students', sectionKey: 'students' },
      { to: '/dashboard/mentor/enquiries', label: 'Enquiries', sectionKey: 'enquiries' },
    ],
  },
  {
    section: 'Content',
    items: [
      { to: '/dashboard/mentor/notes', label: 'Notes', sectionKey: 'notes' },
      { to: '/dashboard/mentor/questions', label: 'Question Bank', sectionKey: 'questions' },
      { to: '/dashboard/mentor/concept-codes', label: 'Concept Codes', sectionKey: 'concept-codes' },
      { to: '/dashboard/mentor/articles', label: 'Articles', sectionKey: 'articles' },
      { to: '/dashboard/mentor/videos', label: 'Videos & Playlists', sectionKey: 'videos' },
    ],
  },
  {
    section: 'Tests & Practice',
    items: [
      { to: '/dashboard/mentor/tests', label: 'Tests', sectionKey: 'tests' },
      { to: '/dashboard/mentor/worksheets', label: 'Worksheets', sectionKey: 'worksheets' },
    ],
  },
  {
    section: 'Community',
    items: [
      { to: '/dashboard/mentor/toppers', label: 'Toppers', sectionKey: 'toppers' },
      { to: '/dashboard/mentor/testimonials', label: 'Testimonials', sectionKey: 'testimonials' },
      { to: '/dashboard/mentor/doubts', label: 'Doubts', sectionKey: 'doubts' },
    ],
  },
];

/**
 * Persistent sidebar (horizontal tab bar on mobile) so every dashboard
 * sub-page can jump straight to another section instead of going back to
 * the dashboard home first. Wraps the page's own <main> — call sites
 * should NOT nest their own.
 *
 * Deliberately does NOT use the marketing <Container> (capped at
 * --ap-container-width for readable prose line-length) — a data-dense
 * admin shell wants to use the available screen, not sit in a narrow
 * column with dead margins on a wide monitor. See .shell below instead.
 */
const ADMIN_NAV_GROUP = {
  section: 'Admin',
  items: [
    { to: '/dashboard/mentor/admin/mentors', label: 'Mentors' },
    { to: '/dashboard/mentor/admin/students', label: 'Students' },
  ],
};

export default function DashboardLayout({ role, children }) {
  const { user } = useAuth();
  const baseNav = role === 'mentor' ? MENTOR_NAV : STUDENT_NAV;
  // Admin sees everything a mentor does (same pages, same DashboardLayout
  // calls) plus this one extra group — real role, not the `role` prop,
  // since every mentor page still passes role="mentor" unchanged.
  const withAdminGroup = user?.role === 'admin' ? [...baseNav, ADMIN_NAV_GROUP] : baseNav;
  // Drop any item the admin has restricted this mentor from, then drop any
  // group that's now empty — admin never carries restrictedSections, so
  // this is a no-op for them regardless of which nav they're looking at.
  const nav = withAdminGroup
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.sectionKey || !user?.restrictedSections?.includes(item.sectionKey)),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <main>
      <div className={styles.shell} data-admin={user?.role === 'admin' ? 'true' : undefined}>
        <div className={styles.layout}>
          <nav className={styles.sidebar} aria-label="Dashboard sections">
            {nav.map((group) => (
              <div key={group.section || 'main'} className={styles.navGroup}>
                {group.section && <div className={styles.navGroupLabel}>{group.section}</div>}
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                  >
                    {item.label}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>
          <div className={styles.content}>{children}</div>
        </div>
      </div>
    </main>
  );
}
