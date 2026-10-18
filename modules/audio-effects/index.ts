import { requireNativeModule } from 'expo';

export type AudioEffect = 'compressor' | 'vocalBoost';

type AudioEffectsModule = {
  setEffectEnabled: (playerId: string, effect: AudioEffect, enabled: boolean) => Promise<void>;
};

const NativeModule = requireNativeModule<AudioEffectsModule>('AudioEffects');

export function setEffectEnabled(playerId: string, effect: AudioEffect, enabled: boolean): Promise<void> {
  return NativeModule.setEffectEnabled(playerId, effect, enabled);
}
