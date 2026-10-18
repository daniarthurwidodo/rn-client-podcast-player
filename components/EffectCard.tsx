import type { LucideIcon } from 'lucide-react-native';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../lib/theme';

const ICON_SIZE = 20;

type Props = {
  label: string;
  description: string;
  Icon: LucideIcon;
  isEnabled: boolean;
  onToggle: () => void;
};

export function EffectCard({ label, description, Icon, isEnabled, onToggle }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.iconBadge}>
        <Icon color={isEnabled ? colors.primary : colors.textSupporting} size={ICON_SIZE} />
      </View>
      <View style={styles.text}>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
        <Text style={styles.description} numberOfLines={2}>{description}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        value={isEnabled}
        onValueChange={onToggle}
        trackColor={{ false: colors.stroke, true: colors.primary }}
        thumbColor={isEnabled ? colors.onPrimary : colors.textSupporting}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm + spacing.xs,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.card,
  },
  iconBadge: {
    width: 36,
    height: 36,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { flex: 1, marginLeft: spacing.sm },
  label: { color: colors.textHigh, fontFamily: fonts.labelSemiBold, fontSize: 14 },
  description: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 12, marginTop: 2 },
});
