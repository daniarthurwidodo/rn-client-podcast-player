import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radii, spacing } from '../lib/theme';

const CHIP_HEIGHT = 32;
const CHIP_HIT_SLOP = 8;

type Props = { label: string; isSelected: boolean; onPress: () => void };

export function Chip({ label, isSelected, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      hitSlop={CHIP_HIT_SLOP}
      style={[styles.chip, isSelected ? styles.chipSelected : null]}
      onPress={onPress}
    >
      <Text style={isSelected ? styles.labelSelected : styles.label} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    height: CHIP_HEIGHT,
    paddingHorizontal: spacing.md,
    justifyContent: 'center',
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.surface,
  },
  chipSelected: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  label: { color: colors.textSupporting, fontFamily: fonts.labelSemiBold, fontSize: 14 },
  labelSelected: { color: colors.primary, fontFamily: fonts.labelSemiBold, fontSize: 14 },
});
