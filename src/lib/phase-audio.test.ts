import { describe, expect, it } from 'vitest';

import {
  getPhaseChannelLevels,
  PHASE_PAN_SHAPE_FACTOR,
  PHASE_ROTATION_EPSILON,
  shapePhasePan,
} from './phase-audio';

describe('shapePhasePan', () => {
  it('returns raw pan when depth is 0', () => {
    expect(shapePhasePan(0.5, 0)).toBe(0.5);
    expect(shapePhasePan(-0.25, 0)).toBe(-0.25);
  });

  it('sharpens pan toward the extremes at full depth', () => {
    const shaped = shapePhasePan(0.5, 1);

    expect(shaped).toBeCloseTo(0.5 ** (1 - PHASE_PAN_SHAPE_FACTOR), 5);
    expect(Math.abs(shaped)).toBeGreaterThan(0.5);
  });
});

describe('getPhaseChannelLevels', () => {
  it('smoothly pans between ears when rotating', () => {
    const settings = {
      baseFrequency: 100,
      phaseOffset: 180,
      rotationSpeed: 0.5,
      spatialDepth: 100,
    };

    const leftHeavy = getPhaseChannelLevels(settings, 1.5);
    const rightHeavy = getPhaseChannelLevels(settings, 0.5);
    const center = getPhaseChannelLevels(settings, 0);

    expect(leftHeavy.leftAmp).toBeGreaterThan(0.9);
    expect(leftHeavy.rightAmp).toBeLessThan(0.1);
    expect(rightHeavy.rightAmp).toBeGreaterThan(0.9);
    expect(rightHeavy.leftAmp).toBeLessThan(0.1);
    expect(center.leftAmp).toBeCloseTo(0.707, 2);
    expect(center.rightAmp).toBeCloseTo(0.707, 2);
    expect(leftHeavy.usePhaseOffset).toBe(true);
  });

  it('treats tiny rotation speeds as static', () => {
    const levels = getPhaseChannelLevels(
      {
        baseFrequency: 100,
        phaseOffset: 180,
        rotationSpeed: PHASE_ROTATION_EPSILON,
        spatialDepth: 100,
      },
      1,
    );

    expect(levels.leftAmp).toBe(1);
    expect(levels.rightAmp).toBe(1);
    expect(levels.usePhaseOffset).toBe(true);
  });

  it('keeps phase offset on the right channel when static', () => {
    const levels = getPhaseChannelLevels(
      {
        baseFrequency: 100,
        phaseOffset: 180,
        rotationSpeed: 0,
        spatialDepth: 100,
      },
      0,
    );

    expect(levels.leftAmp).toBe(1);
    expect(levels.rightAmp).toBe(1);
    expect(levels.usePhaseOffset).toBe(true);
    expect(levels.delaySeconds).toBeCloseTo(0.005, 3);
  });

  it('scales phase offset with spatial depth', () => {
    const full = getPhaseChannelLevels(
      {
        baseFrequency: 100,
        phaseOffset: 180,
        rotationSpeed: 0,
        spatialDepth: 100,
      },
      0,
    );
    const half = getPhaseChannelLevels(
      {
        baseFrequency: 100,
        phaseOffset: 180,
        rotationSpeed: 0,
        spatialDepth: 50,
      },
      0,
    );

    expect(half.delaySeconds).toBeCloseTo(full.delaySeconds / 2, 3);
    expect(half.usePhaseOffset).toBe(true);
  });

  it('applies phase offset while rotating at full depth', () => {
    const levels = getPhaseChannelLevels(
      {
        baseFrequency: 100,
        phaseOffset: 180,
        rotationSpeed: 0.5,
        spatialDepth: 100,
      },
      0,
    );

    expect(levels.usePhaseOffset).toBe(true);
    expect(levels.delaySeconds).toBeCloseTo(0.005, 3);
  });

  it('uses a softer pan curve when spatial depth is low', () => {
    const elapsed = 1 / 12;
    const shallow = getPhaseChannelLevels(
      {
        baseFrequency: 100,
        phaseOffset: 180,
        rotationSpeed: 1,
        spatialDepth: 0,
      },
      elapsed,
    );
    const deep = getPhaseChannelLevels(
      {
        baseFrequency: 100,
        phaseOffset: 180,
        rotationSpeed: 1,
        spatialDepth: 100,
      },
      elapsed,
    );

    expect(shallow.leftAmp).toBeCloseTo(0.5, 2);
    expect(deep.leftAmp).toBeLessThan(shallow.leftAmp);
  });
});
