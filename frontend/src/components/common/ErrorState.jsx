import styles from './ErrorState.module.css';
import Button from './Button.jsx';

export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className={styles.wrap} role="alert">
      <p>{message}</p>
      {onRetry && (
        <Button variant="ghost" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
