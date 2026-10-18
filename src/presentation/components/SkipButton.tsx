import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radii } from '../theme';

const BUTTON_SIZE = 48;
const ICON_SIZE = 28;

type Props = {
  Icon: LucideIcon;
  seconds: number;
  accessibilityLabel: string;
  onPress: () => void;
};

export function SkipButton({ Icon, seconds, accessibilityLabel, onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.button} onPress={onPress}>
      <Icon color={colors.textHigh} size={ICON_SIZE} />
      <Text style={styles.seconds}>{seconds}</Text>
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
  seconds: { position: 'absolute', color: colors.textHigh, fontFamily: fonts.labelBold, fontSize: 9 },
});
