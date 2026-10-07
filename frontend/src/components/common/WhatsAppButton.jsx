import Button from './Button.jsx';
import { buildWhatsAppLink } from '../../data/contactConfig.js';
import styles from './WhatsAppButton.module.css';

function WhatsAppIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.52 0-10 4.48-10 10 0 1.86.52 3.6 1.4 5.1L2 22l5.07-1.4a9.9 9.9 0 0 0 4.97 1.33h.01c5.52 0 10-4.48 10-10s-4.49-9.93-10.01-9.93zm5.84 14.1c-.25.7-1.45 1.33-2 1.42-.51.08-1.16.12-1.87-.12-.43-.14-.97-.33-1.68-.64-2.96-1.28-4.9-4.25-5.04-4.44-.15-.2-1.2-1.6-1.2-3.04 0-1.45.76-2.15 1.03-2.45.27-.3.6-.37.8-.37l.57.01c.18.01.43-.07.67.52.25.6.85 2.08.92 2.23.08.15.13.33.03.52-.1.2-.15.32-.3.5-.15.17-.3.38-.44.51-.14.14-.3.29-.13.58.18.3.8 1.31 1.72 2.12 1.18 1.05 2.18 1.38 2.49 1.53.31.15.49.13.67-.06.19-.2.8-.93 1.02-1.25.21-.31.43-.26.72-.15.3.1 1.87.88 2.2 1.04.32.16.53.24.61.37.08.14.08.77-.17 1.48z" />
    </svg>
  );
}

/**
 * Shared "contact us on WhatsApp" CTA — used wherever a payment gateway
 * would otherwise be, since enrollment is handled manually until Razorpay
 * is live. `message` should already mention the course/context.
 */
export default function WhatsAppButton({ message, size = 'lg', className = '', children }) {
  return (
    <Button
      as="a"
      href={buildWhatsAppLink(message)}
      target="_blank"
      rel="noopener noreferrer"
      size={size}
      className={`${styles.whatsapp} ${className}`.trim()}
    >
      <WhatsAppIcon />
      {children || 'Chat on WhatsApp to Enroll'}
    </Button>
  );
}
