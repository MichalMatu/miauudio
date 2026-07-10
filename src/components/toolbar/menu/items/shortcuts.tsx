import { MdKeyboardCommandKey } from 'react-icons/md';

import { Item } from '../item';

interface ShortcutsProps {
  open: () => void;
}

export function Shortcuts({ open }: ShortcutsProps) {
  return (
    <Item
      icon={<MdKeyboardCommandKey />}
      label="Shortcuts"
      shortcut="Shift + H"
      onClick={open}
    />
  );
}
