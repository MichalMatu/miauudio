import { FaHeadphonesAlt } from 'react-icons/fa';

import { Item } from '../item';
import { useGeneratorStore } from '@/stores/generator';
import { useSoundStore } from '@/stores/sound';

interface BinauralProps {
  open: () => void;
}

export function Binaural({ open }: BinauralProps) {
  const active = useSoundStore(state => state.sounds.binaural.isSelected);
  const beatFrequency = useGeneratorStore(
    state => state.settings.binaural.beatFrequency,
  );

  return (
    <Item
      active={active}
      icon={<FaHeadphonesAlt />}
      label="Binaural Settings"
      status={`${beatFrequency} Hz`}
      onClick={open}
    />
  );
}
