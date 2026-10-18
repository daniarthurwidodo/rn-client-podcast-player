import { resolveAudio as resolveAudioNatively } from '../modules/newpipe-resolver';
import { createCachedResolveAudio } from './resolvedAudioCache';
import { loadResolvedAudio, saveResolvedAudio } from './resolvedAudioStorage';

export const resolveAudio = createCachedResolveAudio({
  resolve: resolveAudioNatively,
  storage: { load: loadResolvedAudio, save: saveResolvedAudio },
  now: Date.now,
});
