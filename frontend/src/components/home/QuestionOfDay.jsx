import { useState } from 'react';
import Container from '../common/Container.jsx';
import SectionHeading from '../common/SectionHeading.jsx';
import Card from '../common/Card.jsx';
import { useQuestionOfDay } from '../../hooks/useQuestionOfDay.js';
import { questionOfDayService } from '../../services/questionOfDayService.js';
import { assetUrl } from '../../data/assetUrl.js';
import styles from './QuestionOfDay.module.css';

export default function QuestionOfDay() {
  const { data: question } = useQuestionOfDay();
  const [selected, setSelected] = useState([]);
  const [numericValue, setNumericValue] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  if (!question) return null;

  const isNumerical = question.type === 'numerical';
  const isMultiple = question.type === 'mcq-multiple';

  const toggleOption = (index) => {
    if (result) return;
    if (isMultiple) {
      setSelected((s) => (s.includes(index) ? s.filter((i) => i !== index) : [...s, index]));
    } else {
      setSelected([index]);
      submit([index]);
    }
  };

  const submit = async (optionIndexes) => {
    setBusy(true);
    try {
      const answer = isNumerical
        ? { numericAnswer: Number(numericValue) }
        : { selectedOptionIndexes: optionIndexes ?? selected };
      const res = await questionOfDayService.check(answer);
      setResult(res);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={styles.section} aria-labelledby="qotd-heading">
      <Container>
        <SectionHeading eyebrow="Daily Challenge" title="Question of the Day" subtitle="Test yourself — the answer reveals right after you pick." />
        <Card className={styles.card}>
          {question.text?.trim() && <p className={styles.stemText}>{question.text}</p>}
          {question.imageUrl && <img src={assetUrl(question.imageUrl)} alt={question.text} className={styles.stemImage} />}

          {isNumerical ? (
            <div className={styles.numericRow}>
              <input
                type="number"
                value={numericValue}
                disabled={Boolean(result)}
                onChange={(e) => setNumericValue(e.target.value)}
                className={styles.numericInput}
              />
              {!result && (
                <button type="button" className={styles.submitBtn} disabled={busy || numericValue === ''} onClick={() => submit()}>
                  Submit
                </button>
              )}
            </div>
          ) : (
            <div className={styles.options}>
              {question.options.map((opt, index) => {
                const isSelected = selected.includes(index);
                const isCorrectOption = result?.correctOptionIndexes?.includes(index);
                let tone = '';
                if (result) {
                  if (isCorrectOption) tone = styles.correct;
                  else if (isSelected) tone = styles.wrong;
                }
                return (
                  <button
                    key={index}
                    type="button"
                    className={`${styles.option} ${tone}`}
                    disabled={Boolean(result) || busy}
                    onClick={() => toggleOption(index)}
                  >
                    {opt.text?.trim() && opt.text}
                    {opt.imageUrl && <img src={assetUrl(opt.imageUrl)} alt={opt.text} className={styles.optionImage} />}
                  </button>
                );
              })}
            </div>
          )}

          {isMultiple && !result && (
            <button type="button" className={styles.submitBtn} disabled={busy || selected.length === 0} onClick={() => submit()}>
              Submit
            </button>
          )}

          {result && (
            <p className={result.correct ? styles.resultCorrect : styles.resultWrong}>
              {result.correct
                ? 'Correct! 🎉'
                : isNumerical
                  ? `Not quite — the correct answer is ${result.correctNumericAnswer}.`
                  : 'Not quite — the correct option is highlighted above.'}
            </p>
          )}
        </Card>
      </Container>
    </section>
  );
}
