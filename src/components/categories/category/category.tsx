import { Sounds } from '@/components/sounds';
import { SoundIcon } from '@/components/sound-icon';

import styles from './category.module.css';

import type { Category } from '@/data/types';

interface CategoryProps extends Category {
  action?: React.ReactNode;
  functional?: boolean;
}

export function Category({
  action,
  functional = true,
  icon,
  id,
  sounds,
  title,
}: CategoryProps) {
  return (
    <div className={styles.category} id={`category-${id}`}>
      <div className={styles.iconContainer}>
        <div className={styles.tail} />
        <div aria-hidden="true" className={styles.icon}>
          <SoundIcon id={icon} />
        </div>
      </div>

      <div className={styles.title}>{title}</div>

      <Sounds action={action} functional={functional} id={id} sounds={sounds} />
    </div>
  );
}
