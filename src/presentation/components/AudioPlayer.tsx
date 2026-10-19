import { Pause, Play, Repeat, Repeat1, RotateCcw, RotateCw, Shuffle, SkipBack, SkipForward } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatTime } from '../format/formatTime';
import { colors, fonts, radii, spacing } from '../theme';
import { usePlayerStore } from '../../business/stores/playerStore';
import { QueueButton } from './QueueButton';
import { Scrubber } from './Scrubber';
import { SkipButton } from './SkipButton';
import { ErrorMessage } from './StatusMessage';

const SKIP_BACK_SECONDS = 15;
const SKIP_FORWARD_SECONDS = 30;
const PLAY_BUTTON_SIZE = 72;
const PLAY_ICON_SIZE = 32;

export function AudioPlayer() {
  const isLoaded = usePlayerStore((state) => state.isLoaded);
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
      <View style={styles.progress} pointerEvents={isLoaded ? 'auto' : 'none'}>
        <Scrubber fraction={scrubFraction ?? progressFraction} onScrubChange={setScrubFraction} onSeek={seekToFraction} />
        <View style={styles.times}>
          <Text testID="current-time" style={styles.time}>{formatTime(shownTime)}</Text>
          <Text testID="duration-time" style={styles.time}>{formatTime(duration)}</Text>
        </View>
      </View>
      <View style={[styles.mainRow, hasQueue ? null : styles.mainRowCentered]}>
        {hasQueue ? (
          <QueueButton Icon={Shuffle} accessibilityLabel={`Shuffle ${isShuffled ? 'on' : 'off'}`} isActive={isShuffled} onPress={toggleShuffle} />
        ) : null}
        {hasQueue ? <QueueButton Icon={SkipBack} accessibilityLabel="Previous track" onPress={playPrevious} /> : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          style={styles.playButton}
          onPress={togglePlayback}
        >
          <PlaybackIcon color={colors.onPrimary} fill={colors.onPrimary} size={PLAY_ICON_SIZE} />
        </Pressable>
        {hasQueue ? <QueueButton Icon={SkipForward} accessibilityLabel="Next track" onPress={playNext} /> : null}
        {hasQueue ? (
          <QueueButton Icon={RepeatIcon} accessibilityLabel={`Repeat ${repeatMode}`} isActive={repeatMode !== 'off'} onPress={cycleRepeat} />
        ) : null}
      </View>
      <View style={styles.secondaryRow}>
        <SkipButton
          Icon={RotateCcw}
          seconds={SKIP_BACK_SECONDS}
          accessibilityLabel={`Back ${SKIP_BACK_SECONDS} seconds`}
          onPress={() => skipBySeconds(-SKIP_BACK_SECONDS)}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Playback speed ${playbackRate}x`}
          style={[styles.speedChip, playbackRate === 1 ? null : styles.speedChipActive]}
          onPress={cyclePlaybackRate}
        >
          <Text style={playbackRate === 1 ? styles.speedLabel : styles.speedLabelActive}>{`${playbackRate}×`}</Text>
        </Pressable>
        <SkipButton
          Icon={RotateCw}
          seconds={SKIP_FORWARD_SECONDS}
          accessibilityLabel={`Forward ${SKIP_FORWARD_SECONDS} seconds`}
          onPress={() => skipBySeconds(SKIP_FORWARD_SECONDS)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch', alignItems: 'center' },
  progress: { alignSelf: 'stretch' },
  times: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { color: colors.textSupporting, fontFamily: fonts.labelMedium, fontSize: 13, letterSpacing: 0.5, fontVariant: ['tabular-nums'] },
  mainRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', alignSelf: 'stretch', marginTop: spacing.sm },
  mainRowCentered: { justifyContent: 'center' },
  playButton: {
    width: PLAY_BUTTON_SIZE,
    height: PLAY_BUTTON_SIZE,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  speedChip: {
    height: 32,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.surface,
  },
  secondaryRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginTop: spacing.xs },
  speedChipActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  speedLabel: { color: colors.textSupporting, fontFamily: fonts.labelSemiBold, fontSize: 14 },
  speedLabelActive: { color: colors.primary, fontFamily: fonts.labelSemiBold, fontSize: 14 },
});
