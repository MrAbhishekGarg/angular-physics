import { useEffect, useState } from 'react';
import SEO from '../../components/seo/SEO.jsx';
import DashboardLayout from '../../components/dashboard/DashboardLayout.jsx';
import Spinner from '../../components/common/Spinner.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { courseFeesService } from '../../services/courseFeesService.js';
import styles from './CourseFees.module.css';

function money(n) {
  return `₹${Math.round(n || 0).toLocaleString('en-IN')}`;
}
function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatMonth(monthStr) {
  const [y, m] = monthStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-IN', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function MonthRow({ month, onClaim, claiming }) {
  return (
    <li className={styles.monthItem}>
      <span className={styles.monthLabel}>{formatMonth(month.month)}</span>
      <span className={styles.paymentAmount}>{money(month.amount)}</span>
      {month.dueDate && <span className={styles.tileSub}>Due {formatDate(month.dueDate)}</span>}
      {month.paid ? (
        <span className={styles.monthBadgePaid}>
          Paid {formatDate(month.paidDate)}
          {month.paidVia === 'security' ? ' (security)' : ''}
        </span>
      ) : month.claimedByStudent ? (
        <span className={styles.monthBadgePending}>Pending approval</span>
      ) : (
        <>
          <span className={styles.monthBadgePending}>Pending</span>
          <button type="button" className={styles.editLink} disabled={claiming} onClick={() => onClaim(month._id)}>
            {claiming ? 'Saving…' : "I've paid this"}
          </button>
        </>
      )}
    </li>
  );
}

export default function MyCourseFee() {
  const [fee, setFee] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claimingId, setClaimingId] = useState(null);

  const refetch = async () => {
    setLoading(true);
    setError('');
    try {
      const [feeData, scheduleData] = await Promise.all([courseFeesService.getMine(), courseFeesService.getMySchedule()]);
      setFee(feeData);
      setSchedule(scheduleData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  const handleClaim = async (monthId) => {
    setClaimingId(monthId);
    try {
      await courseFeesService.claimMonth(monthId);
      await refetch();
    } finally {
      setClaimingId(null);
    }
  };

  const isMonthly = fee?.feeType === 'monthly';

  return (
    <>
      <SEO title="My Course" description="Your fees, schedule, and progress for your live course." path="/dashboard/student/my-course" />
      <DashboardLayout role="student">
        <div className={styles.wrap}>
          <h1>My Course</h1>

          {loading && <Spinner />}
          {error && <ErrorState message={error} onRetry={refetch} />}

          {!loading && !error && fee && (
            <>
              <p className={styles.lede}>{fee.batch?.course?.title || 'Your course'}</p>

              <div className={styles.summaryRow}>
                <div className={styles.summaryTile}>
                  <span className={styles.summaryValue}>{money(fee.feeTotal)}</span>
                  <span className={styles.tileLabel}>Total fee</span>
                </div>
                <div className={`${styles.summaryTile} ${styles.summaryOk}`}>
                  <span className={styles.summaryValue}>{money(fee.feePaid)}</span>
                  <span className={styles.tileLabel}>Paid</span>
                </div>
                <div className={`${styles.summaryTile} ${fee.feeDue > 0 ? styles.summaryWarn : ''}`}>
                  <span className={styles.summaryValue}>{money(fee.feeDue)}</span>
                  <span className={styles.tileLabel}>Due</span>
                </div>
                {fee.securityAmount > 0 && (
                  <div className={styles.summaryTile}>
                    <span className={styles.summaryValue}>{money(fee.securityAvailable)}</span>
                    <span className={styles.tileLabel}>Security available</span>
                  </div>
                )}
              </div>

              <section className={styles.panel}>
                <div className={styles.panelHead}>
                  <div className={styles.panelTitle}>{isMonthly ? 'Monthly fees' : 'Payments'}</div>
                </div>
                {isMonthly ? (
                  fee.monthlyPayments.length === 0 ? (
                    <p className={styles.tileSub}>No months added yet.</p>
                  ) : (
                    <ul className={styles.months}>
                      {[...fee.monthlyPayments]
                        .sort((a, b) => a.month.localeCompare(b.month))
                        .map((m) => (
                          <MonthRow key={m._id} month={m} onClaim={handleClaim} claiming={claimingId === m._id} />
                        ))}
                    </ul>
                  )
                ) : fee.payments.length === 0 ? (
                  <p className={styles.tileSub}>No payments recorded yet.</p>
                ) : (
                  <ul className={styles.payments}>
                    {fee.payments.map((p) => (
                      <li key={p._id} className={styles.paymentItem}>
                        <span>{formatDate(p.date)}</span>
                        <span className={styles.paymentAmount}>{money(p.amount)}</span>
                        {p.note && <span className={styles.tileSub}>{p.note}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {schedule && (
                <section className={styles.panel} style={{ marginTop: '0.75rem' }}>
                  <div className={styles.panelHead}>
                    <div className={styles.panelTitle}>
                      Schedule — {schedule.classesDone} class{schedule.classesDone === 1 ? '' : 'es'} done ({schedule.hoursDone}h)
                    </div>
                  </div>

                  <p className={styles.sectionLabel}>Classes & topics covered</p>
                  {schedule.classLogs.length === 0 ? (
                    <p className={styles.tileSub}>No classes logged yet.</p>
                  ) : (
                    <ul className={styles.months}>
                      {schedule.classLogs.map((l) => (
                        <li key={l._id} className={styles.monthItem}>
                          <span className={styles.monthLabel}>{formatDate(l.date)}</span>
                          <span className={styles.paymentAmount}>{l.hours}h</span>
                          {l.topicsCovered && <span className={styles.tileSub}>{l.topicsCovered}</span>}
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className={styles.sectionLabel} style={{ marginTop: '0.75rem' }}>
                    Upcoming topics
                  </p>
                  {schedule.upcomingTopics.length === 0 ? (
                    <p className={styles.tileSub}>None planned.</p>
                  ) : (
                    <ul className={styles.months}>
                      {schedule.upcomingTopics.map((t) => (
                        <li key={t._id} className={styles.monthItem}>
                          <span className={styles.monthLabel}>{t.title}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className={styles.sectionLabel} style={{ marginTop: '0.75rem' }}>
                    Upcoming tests
                  </p>
                  {schedule.upcomingTests.length === 0 ? (
                    <p className={styles.tileSub}>None planned.</p>
                  ) : (
                    <ul className={styles.months}>
                      {schedule.upcomingTests.map((t) => (
                        <li key={t._id} className={styles.monthItem}>
                          <span className={styles.monthLabel}>{t.title}</span>
                          {t.date && <span className={styles.tileSub}>{formatDate(t.date)}</span>}
                        </li>
                      ))}
                    </ul>
                  )}

                  <p className={styles.sectionLabel} style={{ marginTop: '0.75rem' }}>
                    Upcoming worksheets
                  </p>
                  {schedule.upcomingWorksheets.length === 0 ? (
                    <p className={styles.tileSub}>None planned.</p>
                  ) : (
                    <ul className={styles.months}>
                      {schedule.upcomingWorksheets.map((t) => (
                        <li key={t._id} className={styles.monthItem}>
                          <span className={styles.monthLabel}>{t.title}</span>
                          {t.date && <span className={styles.tileSub}>{formatDate(t.date)}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              )}
            </>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
