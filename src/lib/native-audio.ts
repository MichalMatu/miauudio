import { registerPlugin, type PluginListenerHandle } from '@capacitor/core';

import type { GeneratorId } from '@/data/types';

export interface NativeAudioAssetSource {
  kind: 'asset';
  path: string;
}

export interface NativeAudioAppFileSource {
  fileId: string;
  kind: 'app-file';
}

export type NativeAudioFileSource =
  | NativeAudioAssetSource
  | NativeAudioAppFileSource;

interface NativeAudioLayerBase {
  id: string;
  volume: number;
}

export interface NativeAudioFileLayer extends NativeAudioLayerBase {
  kind: 'file';
  loop: true;
  source: NativeAudioFileSource;
}

export interface NativeGeneratorSettings {
  baseFrequency: number;
  beatFrequency: number;
}

export interface NativeAudioGeneratorLayer extends NativeAudioLayerBase {
  generator: GeneratorId;
  kind: 'generator';
  settings: NativeGeneratorSettings;
}

export type NativeAudioLayer = NativeAudioFileLayer | NativeAudioGeneratorLayer;

export interface ApplyMixOptions {
  layers: ReadonlyArray<NativeAudioLayer>;
  masterVolume: number;
  playWhenReady: boolean;
  requestId: string;
  transitionMs: number;
}

export type NativePlaybackState = 'idle' | 'buffering' | 'ready' | 'error';

export type NativeAudioStateReason =
  | 'command'
  | 'media-button'
  | 'audio-focus'
  | 'headphones-disconnected'
  | 'timer'
  | 'service';

export interface NativeAudioState {
  activeLayerIds: Array<string>;
  playbackState: NativePlaybackState;
  playWhenReady: boolean;
  reason: NativeAudioStateReason;
  requestId: string | null;
  sequence: number;
  sessionId: string;
  timerEndsAt: number | null;
}

export interface ScheduleSleepTimerOptions {
  durationMs: number;
  fadeMs: number;
}

export interface NativeAudioLayerError {
  code: 'missing' | 'unsupported' | 'decode' | 'engine';
  layerId: string;
  message: string;
}

export interface ImportedSoundRecord {
  durationMs: number;
  fileId: string;
  id: string;
  importedAt: number;
  label: string;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
}

interface ImportedSoundResult {
  sound: ImportedSoundRecord;
}

interface ImportedSoundSelectionResult {
  sound: ImportedSoundRecord | null;
}

interface ImportedSoundsResult {
  sounds: Array<ImportedSoundRecord>;
}

interface DeleteImportedSoundOptions {
  id: string;
}

interface RenameImportedSoundOptions extends DeleteImportedSoundOptions {
  label: string;
}

export interface MiauudioAudioPlugin {
  addListener(
    eventName: 'layerError',
    listenerFunc: (error: NativeAudioLayerError) => void,
  ): Promise<PluginListenerHandle>;
  addListener(
    eventName: 'stateChanged',
    listenerFunc: (state: NativeAudioState) => void,
  ): Promise<PluginListenerHandle>;
  applyMix(options: ApplyMixOptions): Promise<NativeAudioState>;
  cancelSleepTimer(): Promise<NativeAudioState>;
  deleteImportedSound(options: DeleteImportedSoundOptions): Promise<void>;
  getState(): Promise<NativeAudioState>;
  importSound(): Promise<ImportedSoundSelectionResult>;
  listImportedSounds(): Promise<ImportedSoundsResult>;
  renameImportedSound(
    options: RenameImportedSoundOptions,
  ): Promise<ImportedSoundResult>;
  scheduleSleepTimer(
    options: ScheduleSleepTimerOptions,
  ): Promise<NativeAudioState>;
}

export const MiauudioAudio =
  registerPlugin<MiauudioAudioPlugin>('MiauudioAudio');

export function applyMix(options: ApplyMixOptions) {
  return MiauudioAudio.applyMix(options);
}

export function getState() {
  return MiauudioAudio.getState();
}

export function scheduleSleepTimer(options: ScheduleSleepTimerOptions) {
  return MiauudioAudio.scheduleSleepTimer(options);
}

export function cancelSleepTimer() {
  return MiauudioAudio.cancelSleepTimer();
}

export async function listImportedSounds() {
  const result = await MiauudioAudio.listImportedSounds();

  return result.sounds;
}

export async function importSound() {
  const result = await MiauudioAudio.importSound();

  return result.sound;
}

export function deleteImportedSound(id: string) {
  return MiauudioAudio.deleteImportedSound({ id });
}

export async function renameImportedSound(id: string, label: string) {
  const result = await MiauudioAudio.renameImportedSound({ id, label });

  return result.sound;
}

export function onNativeAudioStateChanged(
  listener: (state: NativeAudioState) => void,
) {
  return MiauudioAudio.addListener('stateChanged', listener);
}

export function onNativeAudioLayerError(
  listener: (error: NativeAudioLayerError) => void,
) {
  return MiauudioAudio.addListener('layerError', listener);
}
