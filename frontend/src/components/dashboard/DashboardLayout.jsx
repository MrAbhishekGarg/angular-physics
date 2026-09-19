import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import Logo from '../common/Logo.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { useTheme } from '../../hooks/useTheme.js';
import { notificationService } from '../../services/notificationService.js';
import TrackPromptModal from './TrackPromptModal.jsx';
import { getTrackMeta } from '../../data/examTracks.js';
import styles from './DashboardLayout.module.css';

// sectionKey here matches backend/src/constants/studentAccess.js — an admin
// restricting a student from a module (see StudentDetail.jsx's "Manage
// Access") hides its nav item the same way a mentor's restrictedSections
// already hides theirs, below. icon is a plain emoji — cheap, on-brand with
// the playful icons already used elsewhere (course cards, exam tracks), and
// gives the sidebar list actual visual texture instead of a wall of text.
const STUDENT_NAV = [
  {
    section: null,
    items: [
      { to: '/dashboard/student', label: 'Dashboard', icon: '🏠', end: true },
      { to: '/dashboard/student/notes', label: 'Notes', icon: '📝', sectionKey: 'notes' },
      { to: '/dashboard/student/tests', label: 'Tests', icon: '📋', sectionKey: 'tests' },
      { to: '/dashboard/student/worksheets', label: 'DPPs & Assignments', icon: '🧾', sectionKey: 'worksheets' },
      { to: '/dashboard/student/practice', label: 'Practice by Topic', icon: '🎯', sectionKey: 'tests' },
      { to: '/dashboard/student/doubts', label: 'Doubts', icon: '❓', sectionKey: 'doubts' },
      { to: '/dashboard/student/profile', label: 'My Profile', icon: '⚙️' },
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
      { to: '/dashboard/mentor', label: 'Dashboard', icon: '🏠', end: true },
      { to: '/dashboard/mentor/students', label: 'All Students', icon: '👥', sectionKey: 'students' },
      { to: '/dashboard/mentor/batches', label: 'Batches', icon: '🗂️', sectionKey: 'students' },
      { to: '/dashboard/mentor/practice-stats', label: 'Practice Stats', icon: '🎮', sectionKey: 'students' },
      { to: '/dashboard/mentor/enquiries', label: 'Enquiries', icon: '📨', sectionKey: 'enquiries' },
    ],
  },
  {
    section: 'Content',
    items: [
      { to: '/dashboard/mentor/questions/upload', label: 'Question Uploading', icon: '📤', sectionKey: 'questions' },
      { to: '/dashboard/mentor/questions', label: 'Question Bank', icon: '🗂️', sectionKey: 'questions', end: true },
      { to: '/dashboard/mentor/concept-codes', label: 'Concept Codes', icon: '🏷️', sectionKey: 'concept-codes' },
      { to: '/dashboard/mentor/articles', label: 'Articles', icon: '📰', sectionKey: 'articles' },
      { to: '/dashboard/mentor/videos', label: 'Videos & Playlists', icon: '🎬', sectionKey: 'videos' },
    ],
  },
  {
    section: 'Tests & Practice',
    items: [
      { to: '/dashboard/mentor/tests', label: 'Tests', icon: '📋', sectionKey: 'tests' },
      { to: '/dashboard/mentor/worksheets', label: 'Worksheets', icon: '🧾', sectionKey: 'worksheets' },
      { to: '/dashboard/mentor/notes', label: 'Notes', icon: '📝', sectionKey: 'notes' },
    ],
  },
  {
    section: 'Community',
    items: [
      { to: '/dashboard/mentor/toppers', label: 'Toppers', icon: '🏆', sectionKey: 'toppers' },
      { to: '/dashboard/mentor/testimonials', label: 'Testimonials', icon: '💬', sectionKey: 'testimonials' },
      { to: '/dashboard/mentor/doubts', label: 'Doubts', icon: '❓', sectionKey: 'doubts' },
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
    { to: '/dashboard/mentor/admin/mentors', label: 'Mentors', icon: '🧑‍🏫' },
    { to: '/dashboard/mentor/admin/students', label: 'Students', icon: '🎓' },
  ],
};

// A personal Aakash-job tracker, not part of the Angular Physics business —
// deliberately its own nav group (not folded into ADMIN_NAV_GROUP above) so
// it reads as a distinct thing, visible only to the real admin account.
const MY_JOB_NAV_GROUP = {
  section: 'My Job',
  items: [
    { to: '/dashboard/mentor/admin/job', label: 'Overview', icon: '💼', end: true },
    { to: '/dashboard/mentor/admin/job-schedule', label: 'Schedule', icon: '🗓️', end: true },
    { to: '/dashboard/mentor/admin/job-schedule/batches', label: 'Batch Progress', icon: '📈' },
  ],
};

const ROLE_META = {
  admin: { label: 'Admin', tone: 'admin' },
  mentor: { label: 'Mentor', tone: 'mentor' },
  student: { label: 'Student', tone: 'student' },
};

function initialsOf(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase() || name[0].toUpperCase();
}

// The entire notification system is in-portal only (no email/SMS in this
// app) — this bell is the whole delivery mechanism, so it's shared chrome
// across every role rather than something specific to Course Fees.
function NotificationsBell() {
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    notificationService
      .getMine()
      .then((data) => {
        setItems(data.items);
        setUnreadCount(data.unreadCount);
      })
      .catch(() => {});
  }, []);

  const markRead = async (id) => {
    setItems((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnreadCount((c) => Math.max(0, c - 1));
    try {
      await notificationService.markRead(id);
    } catch {
      // Best-effort — a failed mark-read just means it'll show unread again next load.
    }
  };

  return (
    <div className={styles.notifWrap}>
      <button type="button" className={styles.notifBell} aria-label="Notifications" onClick={() => setOpen((v) => !v)}>
        🔔
        {unreadCount > 0 && <span className={styles.notifBadge}>{unreadCount}</span>}
      </button>
      {open && (
        <div className={styles.notifDropdown}>
          {items.length === 0 ? (
            <p className={styles.notifEmpty}>No notifications yet.</p>
          ) : (
            items.slice(0, 15).map((n) => (
              <button
                type="button"
                key={n._id}
                className={`${styles.notifItem} ${n.read ? '' : styles.notifItemUnread}`}
                onClick={() => !n.read && markRead(n._id)}
              >
                <strong>{n.title}</strong>
                <span>{n.message}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function DashboardTopbar({ menuOpen, onToggleMenu }) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const trackMeta = user?.role === 'student' ? getTrackMeta(user.track) : null;

  return (
    <header className={styles.topbar}>
      <div className={styles.topbarInner}>
        <button
          type="button"
          className={styles.navToggle}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={onToggleMenu}
        >
          <span className={styles.navToggleIcon} data-open={menuOpen} />
        </button>
        <div className={styles.topbarBrand}>
          <Logo variant={theme === 'dark' ? 'light' : 'dark'} />
        </div>
        <div className={styles.topbarActions}>
          {trackMeta && (
            <Link to="/dashboard/student/profile" className={styles.trackBadge} title="Change in My Profile">
              {trackMeta.icon} {trackMeta.shortLabel}
            </Link>
          )}
          <button
            type="button"
            className={styles.themeToggle}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            onClick={toggleTheme}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
          <NotificationsBell />
          <Link to="/" className={styles.siteLink}>
            Visit Site
          </Link>
          <button type="button" className={styles.logoutBtn} onClick={logout}>
            Log Out
          </button>
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({ role, children }) {
  const { user } = useAuth();
  const location = useLocation();
  // On the mobile horizontal-scroll-turned-dropdown nav (see .module.css),
  // a long grouped list (11+ items for admin) is unusable as a strip you
  // have to keep swiping — this makes it an explicit open/close dropdown
  // instead, closing itself the moment a link is actually followed.
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => setMenuOpen(false), [location.pathname]);
  const baseNav = role === 'mentor' ? MENTOR_NAV : STUDENT_NAV;
  // Admin sees everything a mentor does (same pages, same DashboardLayout
  // calls) plus this one extra group — real role, not the `role` prop,
  // since every mentor page still passes role="mentor" unchanged.
  const withAdminGroup = user?.role === 'admin' ? [...baseNav, ADMIN_NAV_GROUP, MY_JOB_NAV_GROUP] : baseNav;
  // Drop any item the admin has restricted this account from, then drop any
  // group that's now empty. A mentor only ever carries restrictedSections
  // and a student only ever carries restrictedStudentAccess, so checking
  // both unconditionally is a no-op for whichever doesn't apply.
  const nav = withAdminGroup
    .map((group) => ({
      ...group,
      items: group.items.filter(
        (item) =>
          !item.sectionKey ||
          (!user?.restrictedSections?.includes(item.sectionKey) && !user?.restrictedStudentAccess?.includes(item.sectionKey))
      ),
    }))
    .filter((group) => group.items.length > 0);

  const roleMeta = ROLE_META[user?.role] || ROLE_META.student;

  return (
    <div className={styles.page} data-admin={user?.role === 'admin' ? 'true' : undefined}>
      {user?.role === 'student' && !user.track && <TrackPromptModal />}
      <DashboardTopbar menuOpen={menuOpen} onToggleMenu={() => setMenuOpen((v) => !v)} />
      <div className={styles.shell}>
        <div className={styles.layout}>
          <nav className={`${styles.sidebar} ${menuOpen ? styles.sidebarOpen : ''}`} aria-label="Dashboard sections">
            <div className={styles.profile}>
              <span className={styles.avatar}>{initialsOf(user?.name)}</span>
              <div className={styles.profileText}>
                <strong className={styles.profileName}>{user?.name || '—'}</strong>
                <span className={`${styles.roleTag} ${styles[`roleTag_${roleMeta.tone}`]}`}>{roleMeta.label}</span>
              </div>
            </div>
            <div className={styles.navScroll}>
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
                      <span className={styles.navIcon} aria-hidden="true">
                        {item.icon}
                      </span>
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              ))}
            </div>
          </nav>
          <main className={styles.content}>{children}</main>
        </div>
      </div>
    </div>
  );
}
