import { Pause, Play, Repeat, Repeat1, RotateCcw, RotateCw, Shuffle, SkipBack, SkipForward } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatTime } from '../format/formatTime';
import { colors, fonts, radii, spacing } from '../theme';
import { usePlayerStore } from '../../business/player/playerStore';
import { QueueButton } from './QueueButton';
import { Scrubber } from './Scrubber';
import { SkipButton } from './SkipButton';
import { ErrorMessage, LoadingMessage } from './StatusMessage';

const LOADING_AUDIO_MESSAGE = 'Loading audio...';
const BUFFERING_MESSAGE = 'Buffering...';
const SKIP_BACK_SECONDS = 15;
const SKIP_FORWARD_SECONDS = 30;
const PLAY_BUTTON_SIZE = 64;
const PLAY_ICON_SIZE = 30;
const GLOW_OPACITY = 0.4;
const GLOW_RADIUS = 8;
const GLOW_ELEVATION = 8;

export function AudioPlayer() {
  const isLoaded = usePlayerStore((state) => state.isLoaded);
  const isBuffering = usePlayerStore((state) => state.isBuffering);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const notice = usePlayerStore((state) => state.notice);
  const playbackRate = usePlayerStore((state) => state.playbackRate);
  const togglePlayback = usePlayerStore((state) => state.togglePlayback);
  const seekToFraction = usePlayerStore((state) => state.seekToFraction);
  const skipBySeconds = usePlayerStore((state) => state.skipBySeconds);
  const cyclePlaybackRate = usePlayerStore((state) => state.cyclePlaybackRate);
  const clearNotice = usePlayerStore((state) => state.clearNotice);
  const hasQueue = usePlayerStore((state) => state.queue !== null);
  const playNext = usePlayerStore((state) => state.playNext);
  const playPrevious = usePlayerStore((state) => state.playPrevious);
  const repeatMode = usePlayerStore((state) => state.repeatMode);
  const isShuffled = usePlayerStore((state) => state.isShuffled);
  const cycleRepeat = usePlayerStore((state) => state.cycleRepeat);
  const toggleShuffle = usePlayerStore((state) => state.toggleShuffle);

  const [scrubFraction, setScrubFraction] = useState<number | null>(null);

  if (!isLoaded) return <LoadingMessage message={LOADING_AUDIO_MESSAGE} />;

  const progressFraction = duration > 0 ? currentTime / duration : 0;
  const shownTime = scrubFraction === null ? currentTime : scrubFraction * duration;
  const PlaybackIcon = isPlaying ? Pause : Play;
  const RepeatIcon = repeatMode === 'one' ? Repeat1 : Repeat;

  return (
    <View style={styles.container}>
      {notice ? (
        <Pressable accessibilityRole="button" accessibilityHint="Dismiss message" onPress={clearNotice}>
          <ErrorMessage message={notice} />
        </Pressable>
      ) : null}
      <Scrubber fraction={scrubFraction ?? progressFraction} onScrubChange={setScrubFraction} onSeek={seekToFraction} />
      <View style={styles.times}>
        <Text testID="current-time" style={styles.time}>{formatTime(shownTime)}</Text>
        <View style={styles.buffering}>
          {isBuffering ? <ActivityIndicator size="small" color={colors.primary} /> : null}
          {isBuffering ? <Text style={styles.bufferingLabel}>{BUFFERING_MESSAGE}</Text> : null}
        </View>
        <Text testID="duration-time" style={styles.time}>{formatTime(duration)}</Text>
      </View>
      <View style={styles.transport}>
        <SkipButton
          Icon={RotateCcw}
          seconds={SKIP_BACK_SECONDS}
          accessibilityLabel={`Back ${SKIP_BACK_SECONDS} seconds`}
          onPress={() => skipBySeconds(-SKIP_BACK_SECONDS)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          style={[styles.playButton, isPlaying ? styles.playButtonGlow : null]}
          onPress={togglePlayback}
        >
          <PlaybackIcon color={colors.onPrimary} fill={colors.onPrimary} size={PLAY_ICON_SIZE} />
        </Pressable>
        <SkipButton
          Icon={RotateCw}
          seconds={SKIP_FORWARD_SECONDS}
          accessibilityLabel={`Forward ${SKIP_FORWARD_SECONDS} seconds`}
          onPress={() => skipBySeconds(SKIP_FORWARD_SECONDS)}
        />
      </View>
      <View style={styles.secondaryRow}>
        {hasQueue ? (
          <QueueButton Icon={Shuffle} accessibilityLabel={`Shuffle ${isShuffled ? 'on' : 'off'}`} isActive={isShuffled} onPress={toggleShuffle} />
        ) : null}
        {hasQueue ? <QueueButton Icon={SkipBack} accessibilityLabel="Previous track" onPress={playPrevious} /> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Playback speed ${playbackRate}x`}
          style={[styles.speedChip, playbackRate === 1 ? null : styles.speedChipActive]}
          onPress={cyclePlaybackRate}
        >
          <Text style={playbackRate === 1 ? styles.speedLabel : styles.speedLabelActive}>{`${playbackRate}×`}</Text>
        </Pressable>
        {hasQueue ? <QueueButton Icon={SkipForward} accessibilityLabel="Next track" onPress={playNext} /> : null}
        {hasQueue ? (
          <QueueButton Icon={RepeatIcon} accessibilityLabel={`Repeat ${repeatMode}`} isActive={repeatMode !== 'off'} onPress={cycleRepeat} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch', alignItems: 'center' },
  times: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { color: colors.textSupporting, fontFamily: fonts.labelMedium, fontSize: 13, letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  buffering: { flexDirection: 'row', alignItems: 'center' },
  bufferingLabel: { color: colors.primary, fontFamily: fonts.body, fontSize: 12, marginLeft: spacing.sm },
  transport: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.md },
  playButton: {
    width: PLAY_BUTTON_SIZE,
    height: PLAY_BUTTON_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButtonGlow: { shadowColor: colors.primary, shadowOpacity: GLOW_OPACITY, shadowRadius: GLOW_RADIUS, elevation: GLOW_ELEVATION },
  speedChip: {
    height: 32,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.surface,
  },
  secondaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm + spacing.xs, marginTop: spacing.md },
  speedChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  speedLabel: { color: colors.textSupporting, fontFamily: fonts.labelSemiBold, fontSize: 14 },
  speedLabelActive: { color: colors.primary, fontFamily: fonts.labelSemiBold, fontSize: 14 },
});
