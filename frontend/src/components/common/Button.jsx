import styles from './Button.module.css';

// Filled variants get their corners chamfered (the "angular" shape
// language); outlined variants stay plain rectangles — see Button.module.css.
const CHAMFERED_VARIANTS = new Set(['primary', 'secondary', 'highlight']);

/**
 * One Button used everywhere (hero CTA, course card CTA, form submit).
 * Variant/size props avoid every page inventing its own button styles.
 */
export default function Button({
  children,
  variant = 'primary', // primary | secondary | ghost | ghostInverse | danger | highlight
  size = 'md', // sm | md | lg
  as: Component = 'button',
  ...props
}) {
  const chamfer = CHAMFERED_VARIANTS.has(variant) ? styles.chamfer : '';
  return (
    <Component className={`${styles.btn} ${styles[variant]} ${chamfer} ${styles[size]}`} {...props}>
      {children}
    </Component>
  );
}
