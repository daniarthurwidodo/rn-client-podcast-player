import { Link2 } from 'lucide-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radii, spacing } from '../lib/theme';

const ICON_SIZE = 22;
const BUTTON_LABEL = 'Paste URL';
const GLOW_OPACITY = 0.35;
const GLOW_RADIUS = 12;
const GLOW_ELEVATION = 8;

type Props = { onPress: () => void };

export function FloatingAddButton({ onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="Add URL" onPress={onPress} style={styles.button}>
      <Link2 color={colors.onPrimary} size={ICON_SIZE} />
      <Text style={styles.label}>{BUTTON_LABEL}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
    shadowColor: colors.primary,
    shadowOpacity: GLOW_OPACITY,
    shadowRadius: GLOW_RADIUS,
    elevation: GLOW_ELEVATION,
  },
  label: { color: colors.onPrimary, fontFamily: fonts.labelBold, fontSize: 16, marginLeft: spacing.sm },
});
