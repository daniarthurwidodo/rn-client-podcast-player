import { Pause, Play } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatTime } from '../lib/formatTime';
import { colors, fonts, radii, spacing } from '../lib/theme';
import { usePlayerStore } from '../stores/playerStore';
import { EffectsPanel } from './EffectsPanel';
import { ErrorMessage, LoadingMessage } from './StatusMessage';

const LOADING_AUDIO_MESSAGE = 'Loading audio...';
const BUFFERING_MESSAGE = 'Buffering...';
const READY_MESSAGE = 'Ready';
const PLAY_ICON_SIZE = 30;
const PERCENT = 100;

export function AudioPlayer() {
  const isLoaded = usePlayerStore((state) => state.isLoaded);
  const isBuffering = usePlayerStore((state) => state.isBuffering);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const errorMessage = usePlayerStore((state) => state.errorMessage);
  const togglePlayback = usePlayerStore((state) => state.togglePlayback);
  const seekToFraction = usePlayerStore((state) => state.seekToFraction);

  const [trackWidth, setTrackWidth] = useState(0);
  const progressFraction = duration > 0 ? currentTime / duration : 0;

  const seekToTouch = (touchX: number) => {
    if (trackWidth > 0) seekToFraction(touchX / trackWidth);
  };

  if (!isLoaded) return <LoadingMessage message={LOADING_AUDIO_MESSAGE} />;

  const PlaybackIcon = isPlaying ? Pause : Play;

  return (
    <View style={styles.container}>
      {errorMessage ? <ErrorMessage message={errorMessage} /> : null}
      <Pressable
        testID="progress-track"
        style={styles.track}
        onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
        onPress={(event) => seekToTouch(event.nativeEvent.locationX)}
      >
        <View style={[styles.fill, { width: `${progressFraction * PERCENT}%` }]} />
      </Pressable>
      <View style={styles.times}>
        <Text testID="current-time" style={styles.time}>{formatTime(currentTime)}</Text>
        <Text testID="duration-time" style={styles.time}>{formatTime(duration)}</Text>
      </View>
      <View style={styles.bufferStatus}>
        {isBuffering ? <ActivityIndicator size="small" color={colors.primary} /> : null}
        <Text style={isBuffering ? styles.buffering : styles.ready}>
          {isBuffering ? BUFFERING_MESSAGE : READY_MESSAGE}
        </Text>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        style={styles.button}
        onPress={togglePlayback}
      >
        <PlaybackIcon color={colors.onPrimary} fill={colors.onPrimary} size={PLAY_ICON_SIZE} />
      </Pressable>
      <View style={styles.effects}>
        <EffectsPanel />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch', alignItems: 'center' },
  track: { alignSelf: 'stretch', height: 24, justifyContent: 'center', backgroundColor: colors.stroke, borderRadius: radii.pill, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary },
  times: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  time: { color: colors.textSupporting, fontFamily: fonts.labelMedium, fontVariant: ['tabular-nums'] },
  bufferStatus: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm, minHeight: 24 },
  buffering: { color: colors.primary, fontFamily: fonts.body, marginLeft: spacing.sm },
  ready: { color: colors.tertiary, fontFamily: fonts.body },
  button: { marginTop: spacing.md, width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  effects: { alignSelf: 'stretch', marginTop: spacing.lg },
});
