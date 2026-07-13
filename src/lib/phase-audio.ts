import type { GeneratorSettings } from '@/stores/generator';

/** Keep in sync with ProceduralAudioTrack.java */
export const PHASE_ROTATION_EPSILON = 0.0001;

/** Keep in sync with ProceduralAudioTrack.java */
export const PHASE_PAN_SHAPE_FACTOR = 0.4;

function clampDepth(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(value, 0), 100) / 100;
}

export function isPhaseRotating(rotationSpeed: number) {
  return rotationSpeed > PHASE_ROTATION_EPSILON;
}

/** Keep in sync with ProceduralAudioTrack.shapePhasePan */
export function shapePhasePan(pan: number, depth: number) {
  if (depth <= 0) return pan;

  const exponent = 1 - PHASE_PAN_SHAPE_FACTOR * depth;
  return Math.sign(pan) * Math.abs(pan) ** exponent;
}

export function getPhaseChannelLevels(
  settings: Pick<
    GeneratorSettings,
    'baseFrequency' | 'phaseOffset' | 'rotationSpeed' | 'spatialDepth'
  >,
  elapsedSeconds: number,
) {
  const depth = clampDepth(settings.spatialDepth);
  const staticPhase = (settings.phaseOffset * Math.PI) / 180;
  const effectivePhase = staticPhase * depth;

  if (!isPhaseRotating(settings.rotationSpeed)) {
    return {
      delaySeconds: effectivePhase / (Math.PI * 2 * settings.baseFrequency),
      leftAmp: 1,
      rightAmp: 1,
      usePhaseOffset: effectivePhase !== 0,
    };
  }

  const rawPan = Math.sin(
    Math.PI * 2 * settings.rotationSpeed * elapsedSeconds,
  );
  const pan = shapePhasePan(rawPan, depth);

  return {
    delaySeconds: effectivePhase / (Math.PI * 2 * settings.baseFrequency),
    leftAmp: Math.sqrt(0.5 * (1 - pan)),
    rightAmp: Math.sqrt(0.5 * (1 + pan)),
    usePhaseOffset: effectivePhase !== 0,
  };
}
