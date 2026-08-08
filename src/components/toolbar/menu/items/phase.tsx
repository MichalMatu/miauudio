import { TbArrowsLeftRight } from 'react-icons/tb';

import { Item } from '../item';
import { useGeneratorStore } from '@/stores/generator';
import { useSoundStore } from '@/stores/sound';

interface PhaseProps {
  open: () => void;
}

export function Phase({ open }: PhaseProps) {
  const active = useSoundStore(state => state.sounds.phase.isSelected);
  const rotationSpeed = useGeneratorStore(
    state => state.settings.phase.rotationSpeed,
  );
  const phaseOffset = useGeneratorStore(
    state => state.settings.phase.phaseOffset,
  );
  const spatialDepth = useGeneratorStore(
    state => state.settings.phase.spatialDepth,
  );

  const status =
    rotationSpeed > 0
      ? `${rotationSpeed} Hz · ${Math.round(spatialDepth)}%`
      : `${Math.round(phaseOffset)}° · ${Math.round(spatialDepth)}%`;

  return (
    <Item
      active={active}
      icon={<TbArrowsLeftRight />}
      label="Phase Settings"
      status={status}
      onClick={open}
    />
  );
}
