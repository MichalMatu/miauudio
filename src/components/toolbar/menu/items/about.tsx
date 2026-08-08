import { IoInformationCircleOutline } from 'react-icons/io5';

import { Item } from '../item';

interface AboutProps {
  open: () => void;
}

export function About({ open }: AboutProps) {
  return (
    <Item
      icon={<IoInformationCircleOutline />}
      label="About & Privacy"
      onClick={open}
    />
  );
}
