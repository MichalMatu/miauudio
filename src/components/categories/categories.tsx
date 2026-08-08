import { useAutoAnimate } from '@formkit/auto-animate/react';

import { Category } from './category';

import type { Categories } from '@/data/types';

export type DisplayCategory = Categories[number] & {
  action?: React.ReactNode;
};

interface CategoriesProps {
  categories: Array<DisplayCategory>;
}

export function Categories({ categories }: CategoriesProps) {
  const [categoriesRef] = useAutoAnimate<HTMLDivElement>({ duration: 300 });

  return (
    <div ref={categoriesRef}>
      {categories.map(category => (
        <div key={category.id}>
          <Category functional={category.id !== 'favorites'} {...category} />
        </div>
      ))}
    </div>
  );
}
