import { TbWaveSine } from 'react-icons/tb';

import { Item } from '../item';
import { useGeneratorStore } from '@/stores/generator';
import { useSoundStore } from '@/stores/sound';

interface IsochronicProps {
  open: () => void;
}

export function Isochronic({ open }: IsochronicProps) {
  const active = useSoundStore(state => state.sounds.isochronic.isSelected);
  const beatFrequency = useGeneratorStore(
    state => state.settings.isochronic.beatFrequency,
  );

  return (
    <Item
      active={active}
      icon={<TbWaveSine />}
      label="Isochronic Settings"
      status={`${beatFrequency} Hz`}
      onClick={open}
    />
  );
}
