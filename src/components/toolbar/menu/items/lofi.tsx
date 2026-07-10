import { IoIosMusicalNote } from 'react-icons/io';

import { Item } from '../item';

interface LofiProps {
  open: () => void;
}

export function Lofi({ open }: LofiProps) {
  return (
    <Item
      icon={<IoIosMusicalNote />}
      label="Lofi Music Player"
      onClick={open}
    />
  );
}
