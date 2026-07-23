import styles from './Button.module.css';

/**
 * One Button used everywhere (hero CTA, course card CTA, form submit).
 * Variant/size props avoid every page inventing its own button styles.
 */
export default function Button({
  children,
  variant = 'primary', // primary | secondary | ghost
  size = 'md', // sm | md | lg
  as: Component = 'button',
  ...props
}) {
  return (
    <Component className={`${styles.btn} ${styles[variant]} ${styles[size]}`} {...props}>
      {children}
    </Component>
  );
}
