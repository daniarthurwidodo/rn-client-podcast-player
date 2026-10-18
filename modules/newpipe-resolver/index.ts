import { requireNativeModule } from 'expo';

export type ResolvedAudio = {
  url: string;
  title: string;
  mimeType: string;
  contentLength: number;
  thumbnailUrl: string | null;
};

type NewPipeResolverModule = {
  resolveAudio: (videoUrl: string) => Promise<ResolvedAudio>;
};

const NativeModule = requireNativeModule<NewPipeResolverModule>('NewPipeResolver');

export function resolveAudio(videoUrl: string): Promise<ResolvedAudio> {
  return NativeModule.resolveAudio(videoUrl);
}
