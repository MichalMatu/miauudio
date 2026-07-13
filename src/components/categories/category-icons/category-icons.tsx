import { bundledCategories } from '@/data/sounds';
import { Fragment, useMemo } from 'react';
import styles from './category-icons.module.css';
import { Container } from '@/components/container';
import { SoundIcon } from '@/components/sound-icon';
import { Tooltip } from '@/components/tooltip';
import { IS_NATIVE_APP } from '@/constants/app';
import { useFinePointer } from '@/hooks/use-fine-pointer';

export default function CategoryIcons() {
  const hasFinePointer = useFinePointer();

  const categories = useMemo(() => {
    if (!IS_NATIVE_APP) return bundledCategories;

    return [
      {
        icon: 'IoMusicalNotes' as const,
        id: 'my-sounds',
        sounds: [],
        title: 'My Sounds',
      },
      ...bundledCategories,
    ];
  }, []);

  const goto = (id: string) => {
    const category = document.getElementById(`category-${id}`);
    category?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const icons = categories.map(category => {
    const button = (
      <button
        className={styles.icon}
        onClick={event => {
          goto(category.id);
          event.currentTarget.blur();
        }}
      >
        <SoundIcon id={category.icon} />
      </button>
    );

    if (!hasFinePointer) {
      return <Fragment key={category.id}>{button}</Fragment>;
    }

    return (
      <Tooltip content={category.title} key={category.id} placement="bottom">
        {button}
      </Tooltip>
    );
  });

  return (
    <Container>
      <div className={styles.wrapper}>
        <h3 className={styles.title}>Categories</h3>
        <div className={styles.categoryIconsWrapper}>
          {hasFinePointer ? (
            <Tooltip.Provider delayDuration={0}>{icons}</Tooltip.Provider>
          ) : (
            icons
          )}
        </div>
      </div>
    </Container>
  );
}
