import { IoSettingsSharp } from 'react-icons/io5';

import { Item } from '../item';

interface SettingsProps {
  open: () => void;
}

export function Settings({ open }: SettingsProps) {
  return (
    <Item
      icon={<IoSettingsSharp />}
      label="Settings"
      shortcut="Shift + G"
      onClick={open}
    />
  );
}
