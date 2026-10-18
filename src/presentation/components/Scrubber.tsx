import { useState } from 'react';
import type { GestureResponderEvent } from 'react-native';
import { StyleSheet, View } from 'react-native';
import { colors, radii } from '../theme';

const TRACK_HEIGHT = 6;
const TOUCH_HEIGHT = 40;
const THUMB_SIZE = 16;
const THUMB_ACTIVE_SIZE = 22;
const THUMB_BORDER_WIDTH = 2;
const PERCENT = 100;

type Props = {
  fraction: number;
  onScrubChange: (fraction: number | null) => void;
  onSeek: (fraction: number) => Promise<void>;
};

export function Scrubber({ fraction, onScrubChange, onSeek }: Props) {
  const [width, setWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const fractionAt = (event: GestureResponderEvent) =>
    width > 0 ? Math.min(Math.max(event.nativeEvent.locationX / width, 0), 1) : 0;

  const handleStart = (event: GestureResponderEvent) => {
    setIsDragging(true);
    onScrubChange(fractionAt(event));
  };

  const handleEnd = async (event: GestureResponderEvent) => {
    const target = fractionAt(event);
    setIsDragging(false);
    try {
      await onSeek(target);
    } finally {
      onScrubChange(null);
    }
  };

  const handleCancel = () => {
    setIsDragging(false);
    onScrubChange(null);
  };

  const thumbSize = isDragging ? THUMB_ACTIVE_SIZE : THUMB_SIZE;

  // Children ignore touches so locationX is always measured against this view.
  return (
    <View
      testID="progress-track"
      style={styles.touchArea}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
      onTouchStart={handleStart}
      onTouchMove={(event) => onScrubChange(fractionAt(event))}
      onTouchEnd={handleEnd}
      onTouchCancel={handleCancel}
    >
      <View pointerEvents="none" style={styles.track}>
        <View style={[styles.fill, { width: `${fraction * PERCENT}%` }]} />
      </View>
      <View
        pointerEvents="none"
        style={[
          styles.thumb,
          { width: thumbSize, height: thumbSize, left: fraction * width - thumbSize / 2, top: (TOUCH_HEIGHT - thumbSize) / 2 },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  touchArea: { alignSelf: 'stretch', height: TOUCH_HEIGHT, justifyContent: 'center' },
  track: { height: TRACK_HEIGHT, borderRadius: radii.pill, backgroundColor: colors.stroke, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.primary },
  thumb: {
    position: 'absolute',
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    borderWidth: THUMB_BORDER_WIDTH,
    borderColor: colors.textHigh,
  },
});
