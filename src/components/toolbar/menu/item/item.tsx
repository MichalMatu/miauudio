import { FiExternalLink } from 'react-icons/fi';
import { Item as DropdownItem } from '@radix-ui/react-dropdown-menu';

import styles from './item.module.css';

interface ItemProps {
  active?: boolean;
  disabled?: boolean;
  href?: string;
  icon: React.ReactElement;
  label: string;
  onClick?: () => void;
  shortcut?: string;
  status?: string;
}

export function Item({
  active,
  disabled = false,
  href,
  icon,
  label,
  onClick = () => {},
  shortcut,
  status,
}: ItemProps) {
  const Comp = href ? 'a' : 'button';
  const detail = status ?? shortcut;
  const ariaLabel = [label, active ? 'active' : null, status]
    .filter(Boolean)
    .join(', ');

  return (
    <DropdownItem asChild onClick={onClick}>
      <Comp
        className={styles.item}
        disabled={disabled}
        {...(href ? { href, target: '_blank' } : {})}
        aria-label={ariaLabel}
      >
        <span className={styles.label}>
          <span className={styles.icon}>{icon}</span> {label}
          {active && <div className={styles.active} />}
        </span>

        {detail && <span className={styles.detail}>{detail}</span>}

        {href && (
          <span className={styles.external}>
            <FiExternalLink />
          </span>
        )}
      </Comp>
    </DropdownItem>
  );
}
