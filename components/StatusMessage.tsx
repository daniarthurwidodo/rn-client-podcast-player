import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, fonts } from '../lib/theme';

export function LoadingMessage({ message }: { message: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return <Text style={styles.error}>{message}</Text>;
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center' },
  loadingText: { color: colors.textSupporting, fontFamily: fonts.body, marginTop: 12, textAlign: 'center' },
  error: { color: colors.error, fontFamily: fonts.body, textAlign: 'center' },
});
