import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../theme';

const RETRY_LABEL = 'Retry';

export function LoadingMessage({ message }: { message: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

type ErrorMessageProps = { message: string; onRetry?: () => void };

export function ErrorMessage({ message, onRetry }: ErrorMessageProps) {
  return (
    <View style={styles.errorBlock}>
      <Text style={styles.error}>{message}</Text>
      {onRetry ? (
        <Pressable accessibilityRole="button" accessibilityLabel={RETRY_LABEL} style={styles.retryButton} onPress={onRetry}>
          <Text style={styles.retryLabel}>{RETRY_LABEL}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center' },
  loadingText: { color: colors.textSupporting, fontFamily: fonts.body, marginTop: 12, textAlign: 'center' },
  errorBlock: { alignItems: 'center' },
  error: { color: colors.error, fontFamily: fonts.body, textAlign: 'center' },
  retryButton: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  retryLabel: { color: colors.onPrimary, fontFamily: fonts.labelBold, fontSize: 14 },
});
