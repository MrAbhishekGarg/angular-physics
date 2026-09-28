// Shared between ContentPlanner.jsx (the planning board) and
// ContentPlannerReport.jsx (the tabular drill-down) so both always agree on
// labels, icons, colors, and the status pipeline order.
//
// Each status carries an explicit `actionHint` ("what does this count mean
// for me right now") and an `urgency` tier used purely for styling weight —
// `backlog`/`attention` statuses are the ones actually waiting on the
// mentor and get a louder treatment; `ready` statuses are a green light to
// do the next mechanical step; `done`/`neutral` need no action at all.

export const STATUS_META = {
  planned: {
    label: 'Planned',
    icon: '💡',
    tone: 'planned',
    urgency: 'neutral',
    color: '#94a3b8',
    pillBg: '#f1f5f9',
    pillText: '#475569',
  },
  scripted: {
    label: 'Scripted',
    icon: '📝',
    tone: 'scripted',
    urgency: 'backlog',
    actionHint: 'Needs recording',
    color: '#8b5cf6',
    pillBg: '#ede9fe',
    pillText: '#6d28d9',
  },
  recorded: {
    label: 'Recorded',
    icon: '🎥',
    tone: 'recorded',
    urgency: 'backlog',
    actionHint: 'Needs editing',
    color: '#d98c0f',
    pillBg: '#fef3c7',
    pillText: '#b45309',
  },
  edited: {
    label: 'Edited',
    icon: '✂️',
    tone: 'edited',
    urgency: 'ready',
    actionHint: 'Ready to upload',
    color: '#1fa971',
    pillBg: '#d1fae5',
    pillText: '#047857',
  },
  uploaded: {
    label: 'Uploaded',
    icon: '☁️',
    tone: 'uploaded',
    urgency: 'ready',
    actionHint: 'Ready to publish',
    color: '#17b8cf',
    pillBg: '#cffafe',
    pillText: '#0e7490',
  },
  scheduled: {
    label: 'Scheduled',
    icon: '📅',
    tone: 'scheduled',
    urgency: 'neutral',
    color: '#ec4899',
    pillBg: '#fce7f3',
    pillText: '#be185d',
  },
  published: {
    label: 'Published',
    icon: '✅',
    tone: 'published',
    urgency: 'done',
    color: '#14284a',
    pillBg: '#e0e7ef',
    pillText: '#14284a',
  },
  'on-hold': {
    label: 'On Hold',
    icon: '⏸️',
    tone: 'onhold',
    urgency: 'attention',
    actionHint: 'Needs a decision',
    color: '#dc2626',
    pillBg: '#fee2e2',
    pillText: '#b91c1c',
  },
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
  youtube: { label: 'YouTube', icon: '▶️', color: '#d98c0f' },
  instagram: { label: 'Instagram', icon: '📸', color: '#8b5cf6' },
};

export const TYPE_META = {
  'long-video': { label: 'Long Video', icon: '🎬', color: '#17b8cf' },
  short: { label: 'Short', icon: '⚡', color: '#d98c0f' },
  carousel: { label: 'Carousel', icon: '🖼️', color: '#8b5cf6' },
  'community-post': { label: 'Community Post', icon: '💬', color: '#1fa971' },
};
