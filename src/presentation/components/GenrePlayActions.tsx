import { Play, Shuffle } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme';

const ICON_SIZE = 18;

type Props = { onPlay: () => void; onShuffle: () => void };

export function GenrePlayActions({ onPlay, onShuffle }: Props) {
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="button" style={[styles.button, styles.primary]} onPress={onPlay}>
        <Play color={colors.onPrimary} fill={colors.onPrimary} size={ICON_SIZE} />
        <Text style={styles.primaryLabel}>Play</Text>
      </Pressable>
      <Pressable accessibilityRole="button" style={[styles.button, styles.secondary]} onPress={onShuffle}>
        <Shuffle color={colors.textHigh} size={ICON_SIZE} />
        <Text style={styles.secondaryLabel}>Shuffle</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + spacing.xs,
    borderRadius: radii.pill,
  },
  primary: { backgroundColor: colors.primary },
  secondary: { borderWidth: 1, borderColor: colors.stroke, backgroundColor: colors.surfaceElevated },
  primaryLabel: { color: colors.onPrimary, fontFamily: fonts.labelBold, fontSize: 14 },
  secondaryLabel: { color: colors.textHigh, fontFamily: fonts.labelSemiBold, fontSize: 14 },
});
