import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';
import { colors, radii } from '../theme';

const BUTTON_SIZE = 40;
const ICON_SIZE = 20;

type Props = { Icon: LucideIcon; accessibilityLabel: string; onPress: () => void; isActive?: boolean };

export function QueueButton({ Icon, accessibilityLabel, onPress, isActive = false }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: isActive }}
      style={[styles.button, isActive ? styles.buttonActive : null]}
      onPress={onPress}
    >
      <Icon color={isActive ? colors.primary : colors.textHigh} size={ICON_SIZE} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonActive: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
});
