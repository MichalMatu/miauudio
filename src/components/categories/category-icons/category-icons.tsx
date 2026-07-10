import { bundledCategories } from '@/data/sounds';
import { useMemo } from 'react';
import styles from './category-icons.module.css';
import { Container } from '@/components/container';
import { SoundIcon } from '@/components/sound-icon';
import { Tooltip } from '@/components/tooltip';
import { IS_NATIVE_APP } from '@/constants/app';

export default function CategoryIcons() {
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
    category?.scrollIntoView();
  };

  return (
    <Container>
      <div className={styles.wrapper}>
        <h3 className={styles.title}>Categories</h3>
        <div className={styles.categoryIconsWrapper}>
          <Tooltip.Provider delayDuration={0}>
            {categories.map(category => {
              return (
                <Tooltip
                  content={category.title}
                  key={category.id}
                  placement="bottom"
                >
                  <button
                    className={styles.icon}
                    onClick={() => goto(category.id)}
                  >
                    <SoundIcon id={category.icon} />
                  </button>
                </Tooltip>
              );
            })}
          </Tooltip.Provider>
        </div>
      </div>
    </Container>
  );
}
