import type { LucideIcon } from 'lucide-react-native';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, fonts, radii } from '../theme';

const BUTTON_SIZE = 44;
const ICON_SIZE = 26;

type Props = {
  Icon: LucideIcon;
  seconds: number;
  accessibilityLabel: string;
  onPress: () => void;
};

export function SkipButton({ Icon, seconds, accessibilityLabel, onPress }: Props) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={accessibilityLabel} style={styles.button} onPress={onPress}>
      <Icon color={colors.textSupporting} size={ICON_SIZE} />
      <Text style={styles.seconds}>{seconds}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seconds: { position: 'absolute', color: colors.textSupporting, fontFamily: fonts.labelBold, fontSize: 9 },
});
