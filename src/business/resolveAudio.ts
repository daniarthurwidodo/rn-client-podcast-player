import { loadResolvedAudio, saveResolvedAudio } from '../data/storage/resolvedAudioRepository';
import { resolveAudio as resolveAudioNatively } from '../../modules/newpipe-resolver';
import { createCachedResolveAudio } from './logic/resolvedAudioCache';

export const resolveAudio = createCachedResolveAudio({
  resolve: resolveAudioNatively,
  storage: { load: loadResolvedAudio, save: saveResolvedAudio },
  now: Date.now,
});
