import { FaHeadphonesAlt } from 'react-icons/fa';

import { Item } from '../item';

interface BinauralProps {
  open: () => void;
}

export function Binaural({ open }: BinauralProps) {
  return (
    <Item icon={<FaHeadphonesAlt />} label="Binaural Beats" onClick={open} />
  );
}
