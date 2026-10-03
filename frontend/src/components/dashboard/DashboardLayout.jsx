import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  Users,
  FolderKanban,
  Gamepad2,
  Mail,
  Upload,
  Database,
  Tag,
  Newspaper,
  Clapperboard,
  ClipboardList,
  FileText,
  StickyNote,
  Trophy,
  MessageCircle,
  HelpCircle,
  Settings,
  UserCog,
  GraduationCap,
  LayoutGrid,
  BarChart3,
  Briefcase,
  Calendar,
  TrendingUp,
  Target,
  ChevronDown,
} from 'lucide-react';
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
// already hides theirs, below. icon is a lucide component reference (not an
// element) so it can be sized/colored consistently wherever it's rendered.
const STUDENT_NAV = [
  {
    section: null,
    items: [
      { to: '/dashboard/student', label: 'Dashboard', icon: Home, end: true },
      { to: '/dashboard/student/notes', label: 'Notes', icon: StickyNote, sectionKey: 'notes' },
      { to: '/dashboard/student/tests', label: 'Tests', icon: ClipboardList, sectionKey: 'tests' },
      { to: '/dashboard/student/worksheets', label: 'DPPs & Assignments', icon: FileText, sectionKey: 'worksheets' },
      { to: '/dashboard/student/practice', label: 'Practice by Topic', icon: Target, sectionKey: 'tests' },
      { to: '/dashboard/student/doubts', label: 'Doubts', icon: HelpCircle, sectionKey: 'doubts' },
      { to: '/dashboard/student/profile', label: 'My Profile', icon: Settings },
    ],
  },
];

// Grouped so an 11-item list scans instead of reading as a wall of links —
// each group is a distinct part of running the business (who you teach,
// what you teach them, how you test them, how you're perceived). Groups are
// individually collapsible (see openGroups below) since admin ends up with
// 20+ items across 7 groups — a flat scrolling list made distant sections a
// chore to reach.
// Every item except the Dashboard overview itself carries a sectionKey
// (matching frontend/src/data/mentorSections.js and the backend's
// requireSection() gate) — a mentor with that key in restrictedSections
// has both the nav item AND the underlying route/API blocked.
const MENTOR_NAV = [
  {
    section: 'Overview',
    items: [
      { to: '/dashboard/mentor', label: 'Dashboard', icon: Home, end: true },
      { to: '/dashboard/mentor/students', label: 'All Students', icon: Users, sectionKey: 'students' },
      { to: '/dashboard/mentor/batches', label: 'Batches', icon: FolderKanban, sectionKey: 'students' },
      { to: '/dashboard/mentor/practice-stats', label: 'Practice Stats', icon: Gamepad2, sectionKey: 'students' },
      { to: '/dashboard/mentor/enquiries', label: 'Enquiries', icon: Mail, sectionKey: 'enquiries' },
    ],
  },
  {
    section: 'Content',
    items: [
      { to: '/dashboard/mentor/questions/upload', label: 'Question Uploading', icon: Upload, sectionKey: 'questions' },
      { to: '/dashboard/mentor/questions', label: 'Question Bank', icon: Database, sectionKey: 'questions', end: true },
      { to: '/dashboard/mentor/concept-codes', label: 'Concept Codes', icon: Tag, sectionKey: 'concept-codes' },
      { to: '/dashboard/mentor/articles', label: 'Articles', icon: Newspaper, sectionKey: 'articles' },
      { to: '/dashboard/mentor/videos', label: 'Videos & Playlists', icon: Clapperboard, sectionKey: 'videos' },
    ],
  },
  {
    section: 'Tests & Practice',
    items: [
      { to: '/dashboard/mentor/tests', label: 'Tests', icon: ClipboardList, sectionKey: 'tests' },
      { to: '/dashboard/mentor/worksheets', label: 'Worksheets', icon: FileText, sectionKey: 'worksheets' },
      { to: '/dashboard/mentor/notes', label: 'Notes', icon: StickyNote, sectionKey: 'notes' },
    ],
  },
  {
    section: 'Community',
    items: [
      { to: '/dashboard/mentor/toppers', label: 'Toppers', icon: Trophy, sectionKey: 'toppers' },
      { to: '/dashboard/mentor/testimonials', label: 'Testimonials', icon: MessageCircle, sectionKey: 'testimonials' },
      { to: '/dashboard/mentor/doubts', label: 'Doubts', icon: HelpCircle, sectionKey: 'doubts' },
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
    { to: '/dashboard/mentor/admin/mentors', label: 'Mentors', icon: UserCog },
    { to: '/dashboard/mentor/admin/students', label: 'Students', icon: GraduationCap },
  ],
};

// A personal Aakash-job tracker, not part of the Angular Physics business —
// deliberately its own nav group (not folded into ADMIN_NAV_GROUP above) so
// it reads as a distinct thing, visible only to the real admin account.
const MY_JOB_NAV_GROUP = {
  section: 'My Job',
  items: [
    { to: '/dashboard/mentor/admin/job', label: 'Overview', icon: Briefcase, end: true },
    { to: '/dashboard/mentor/admin/job-schedule', label: 'Schedule', icon: Calendar, end: true },
    { to: '/dashboard/mentor/admin/job-schedule/batches', label: 'Batch Progress', icon: TrendingUp },
  ],
};

// Content Planner — its own module, one level up from a single video: plans
// a teaching concept and every piece of content (across YouTube AND
// Instagram) it should spawn. Deliberately not merged into YouTube Studio.
const CONTENT_PLANNER_NAV_GROUP = {
  section: 'Content Planner',
  items: [
    { to: '/dashboard/mentor/admin/content-planner', label: 'Concepts & Pieces', icon: LayoutGrid, end: true },
    { to: '/dashboard/mentor/admin/content-planner/report', label: 'Report', icon: BarChart3, end: true },
  ],
};

const ROLE_META = {
  admin: { label: 'Admin', tone: 'admin' },
  mentor: { label: 'Mentor', tone: 'mentor' },
  student: { label: 'Student', tone: 'student' },
};

function isItemActive(item, pathname) {
  return item.end ? pathname === item.to : pathname.startsWith(item.to);
}

function findActiveSection(nav, pathname) {
  return nav.find((group) => group.items.some((item) => isItemActive(item, pathname)))?.section || null;
}

function findActiveGroup(nav, pathname) {
  return nav.find((group) => group.items.some((item) => isItemActive(item, pathname))) || null;
}

/**
 * Every page's real "way around" shouldn't depend on going back through the
 * sidebar or topbar menu — this sits at the bottom of every page's content
 * and links to the other pages in its own group (e.g. a Question Bank page
 * links to Question Uploading/Concept Codes/Articles/Videos, not to Tests or
 * Community), so moving between closely-related sections never requires
 * leaving the content area at all. Deliberately scoped to the current
 * group, not the whole site — a wall of 20 links would defeat the point.
 */
function CrossLinks({ nav, pathname }) {
  const group = findActiveGroup(nav, pathname);
  if (!group) return null;
  const siblings = group.items.filter((item) => !isItemActive(item, pathname));
  if (siblings.length === 0) return null;

  return (
    <nav className={styles.crossLinks} aria-label={group.section ? `More in ${group.section}` : 'More pages'}>
      <span className={styles.crossLinksLabel}>{group.section ? `More in ${group.section}` : 'More pages'}</span>
      <div className={styles.crossLinksRow}>
        {siblings.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className={styles.crossLinkChip}>
              <Icon size={15} strokeWidth={2} aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

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
  const withAdminGroup =
    user?.role === 'admin'
      ? [...baseNav, ADMIN_NAV_GROUP, CONTENT_PLANNER_NAV_GROUP, MY_JOB_NAV_GROUP]
      : baseNav;
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

  // Admin alone racks up 7 groups / 20+ items — a flat always-expanded list
  // made far-down sections (Content Planner, My Job) a scroll-hunt. Groups
  // collapse individually instead, remembered per role in localStorage so a
  // mentor who always keeps "Content" open doesn't re-expand it every visit.
  const storageKey = `ap-sidebar-open-${user?.role || 'guest'}`;
  const [openGroups, setOpenGroups] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return new Set(JSON.parse(saved));
    } catch {
      // Corrupt or inaccessible storage — fall through to the empty-set
      // default below, which the next effect fills from the active route.
    }
    return new Set();
  });

  // Whichever group holds the current route is always force-opened (without
  // closing anything else) so navigating somewhere new never hides the item
  // you just landed on — but a group the user manually collapsed elsewhere
  // stays collapsed until its own route is visited again.
  useEffect(() => {
    const activeSection = findActiveSection(nav, location.pathname);
    if (!activeSection) return;
    setOpenGroups((prev) => (prev.has(activeSection) ? prev : new Set(prev).add(activeSection)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify([...openGroups]));
    } catch {
      // Best-effort persistence only — a private window or full storage
      // just means group state resets next visit, nothing breaks.
    }
  }, [openGroups, storageKey]);

  const toggleGroup = (section) => {
    setOpenGroups((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

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
              {nav.map((group) => {
                const isOpen = !group.section || openGroups.has(group.section);
                return (
                  <div key={group.section || 'main'} className={styles.navGroup}>
                    {group.section && (
                      <button
                        type="button"
                        className={styles.navGroupHeader}
                        onClick={() => toggleGroup(group.section)}
                        aria-expanded={isOpen}
                      >
                        <span className={styles.navGroupLabel}>{group.section}</span>
                        <ChevronDown
                          size={15}
                          strokeWidth={2.5}
                          className={`${styles.navGroupChevron} ${isOpen ? styles.navGroupChevronOpen : ''}`}
                          aria-hidden="true"
                        />
                      </button>
                    )}
                    {isOpen && (
                      <div className={styles.navGroupItems}>
                        {group.items.map((item) => {
                          const Icon = item.icon;
                          return (
                            <NavLink
                              key={item.to}
                              to={item.to}
                              end={item.end}
                              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
                            >
                              <Icon size={18} strokeWidth={2} className={styles.navIcon} aria-hidden="true" />
                              {item.label}
                            </NavLink>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </nav>
          <main className={styles.content}>
            {children}
            <CrossLinks nav={nav} pathname={location.pathname} />
          </main>
        </div>
      </div>
    </div>
  );
}
