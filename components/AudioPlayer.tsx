import { Pause, Play } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { formatTime } from '../lib/formatTime';
import { usePlayerStore } from '../stores/playerStore';
import { EffectToggle } from './EffectToggle';
import { ErrorMessage, LoadingMessage } from './StatusMessage';

const LOADING_AUDIO_MESSAGE = 'Loading audio...';
const BUFFERING_MESSAGE = 'Buffering...';
const READY_MESSAGE = 'Ready';
const COMPRESSOR_LABEL = 'Compressor';
const VOCAL_BOOST_LABEL = 'Vocal boost';
const PLAY_ICON_SIZE = 30;
const PERCENT = 100;

export function AudioPlayer() {
  const isLoaded = usePlayerStore((state) => state.isLoaded);
  const isBuffering = usePlayerStore((state) => state.isBuffering);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const currentTime = usePlayerStore((state) => state.currentTime);
  const duration = usePlayerStore((state) => state.duration);
  const errorMessage = usePlayerStore((state) => state.errorMessage);
  const enabledEffects = usePlayerStore((state) => state.enabledEffects);
  const togglePlayback = usePlayerStore((state) => state.togglePlayback);
  const toggleEffect = usePlayerStore((state) => state.toggleEffect);
  const seekToFraction = usePlayerStore((state) => state.seekToFraction);

  const [trackWidth, setTrackWidth] = useState(0);
  const progressFraction = duration > 0 ? currentTime / duration : 0;

  const seekToTouch = (touchX: number) => {
    if (trackWidth > 0) seekToFraction(touchX / trackWidth);
  };

  if (!isLoaded) return <LoadingMessage message={LOADING_AUDIO_MESSAGE} />;

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
        {isBuffering ? <ActivityIndicator size="small" /> : null}
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
        {isPlaying ? <Pause color="#fff" fill="#fff" size={PLAY_ICON_SIZE} /> : <Play color="#fff" fill="#fff" size={PLAY_ICON_SIZE} />}
      </Pressable>
      <View style={styles.effects}>
        <EffectToggle label={COMPRESSOR_LABEL} isEnabled={enabledEffects.compressor} onPress={() => toggleEffect('compressor')} />
        <EffectToggle label={VOCAL_BOOST_LABEL} isEnabled={enabledEffects.vocalBoost} onPress={() => toggleEffect('vocalBoost')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch', alignItems: 'center' },
  track: { alignSelf: 'stretch', height: 24, justifyContent: 'center', backgroundColor: '#e5e7eb', borderRadius: 12, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: '#2563eb' },
  times: { alignSelf: 'stretch', flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  time: { color: '#555' },
  bufferStatus: { flexDirection: 'row', alignItems: 'center', marginTop: 8, minHeight: 24 },
  buffering: { color: '#b45309', marginLeft: 8 },
  ready: { color: '#15803d' },
  button: { marginTop: 16, width: 64, height: 64, borderRadius: 32, backgroundColor: '#2563eb', alignItems: 'center', justifyContent: 'center' },
  effects: { marginTop: 12, alignItems: 'center' },
});
