// Shared between ContentPlanner.jsx (the planning board) and
// ContentPlannerReport.jsx (the tabular drill-down) so both always agree on
// labels, icons, colors, and the status pipeline order.

export const STATUS_META = {
  planned: { label: 'Planned', icon: '💡', tone: 'planned', color: '#94a3b8' },
  scripted: { label: 'Scripted', icon: '📝', tone: 'scripted', color: '#06b6d4' },
  recorded: { label: 'Recorded', icon: '🎥', tone: 'recorded', color: '#3b82f6' },
  edited: { label: 'Edited', icon: '✂️', tone: 'edited', color: '#f59e0b' },
  uploaded: { label: 'Uploaded', icon: '☁️', tone: 'uploaded', color: '#8b5cf6' },
  scheduled: { label: 'Scheduled', icon: '📅', tone: 'scheduled', color: '#ec4899' },
  published: { label: 'Published', icon: '✅', tone: 'published', color: '#10b981' },
  'on-hold': { label: 'On Hold', icon: '⏸️', tone: 'onhold', color: '#ef4444' },
};

export const STATUS_ORDER = ['planned', 'scripted', 'recorded', 'edited', 'uploaded', 'scheduled', 'published'];

export const NEXT_STATUS = {
  planned: 'scripted',
  scripted: 'recorded',
  recorded: 'edited',
  edited: 'uploaded',
  uploaded: 'scheduled',
  scheduled: 'published',
};

export const PLATFORM_META = {
  youtube: { label: 'YouTube', icon: '▶️', color: '#f59e0b' },
  instagram: { label: 'Instagram', icon: '📸', color: '#8b5cf6' },
};

export const TYPE_META = {
  'long-video': { label: 'Long Video', icon: '🎬', color: '#3b82f6' },
  short: { label: 'Short', icon: '⚡', color: '#f59e0b' },
  carousel: { label: 'Carousel', icon: '🖼️', color: '#8b5cf6' },
  'community-post': { label: 'Community Post', icon: '💬', color: '#10b981' },
};
