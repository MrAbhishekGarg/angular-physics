import {
  ResponsiveContainer,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import ErrorState from '../common/ErrorState.jsx';
import styles from './AnalyticsChart.module.css';

// Brand hex values (not CSS vars) — recharts renders raw SVG attributes and
// var() resolution inside those is inconsistent across browsers.
const BORDER = '#e5e3f5';
const TEXT_MUTED = '#5b5b76';
const TOOLTIP_STYLE = {
  background: '#fff',
  border: `1px solid ${BORDER}`,
  borderRadius: 10,
  fontSize: 13,
  boxShadow: '0 8px 24px rgba(30, 27, 75, 0.12)',
};
const AXIS_TICK = { fill: TEXT_MUTED, fontSize: 12 };

export default function AnalyticsChart({ title, type, data, xKey, yKey, color, emptyMessage }) {
  const isEmpty = !data || data.length === 0;

  return (
    <div className={styles.wrap}>
      <h3 className={styles.title}>{title}</h3>
      {isEmpty ? (
        <ErrorState message={emptyMessage || 'No data yet.'} />
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          {type === 'bar' ? (
            <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={BORDER} />
              <XAxis dataKey={xKey} tick={AXIS_TICK} axisLine={{ stroke: BORDER }} tickLine={false} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: 'rgba(30,27,75,0.04)' }} />
              <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} maxBarSize={24} />
            </BarChart>
          ) : (
            <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke={BORDER} />
              <XAxis dataKey={xKey} tick={AXIS_TICK} axisLine={{ stroke: BORDER }} tickLine={false} />
              <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={32} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Area
                type="monotone"
                dataKey={yKey}
                stroke={color}
                strokeWidth={2}
                fill={color}
                fillOpacity={0.1}
                dot={false}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      )}
    </div>
  );
}
