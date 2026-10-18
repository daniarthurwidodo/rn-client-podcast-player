import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme';

export function LoadingSnackbar({ message }: { message: string | null }) {
  if (!message) return null;

  return (
    <View pointerEvents="none" style={styles.snackbar}>
      <ActivityIndicator size="small" color={colors.primary} />
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  snackbar: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + spacing.xs,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.stroke,
    backgroundColor: colors.surfaceElevated,
  },
  message: { color: colors.textHigh, fontFamily: fonts.labelMedium, fontSize: 13, marginLeft: spacing.sm },
});
