import { useAutoAnimate } from '@formkit/auto-animate/react';

import { Category } from './category';

import type { Categories } from '@/data/types';

interface CategoriesProps {
  categories: Categories;
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
