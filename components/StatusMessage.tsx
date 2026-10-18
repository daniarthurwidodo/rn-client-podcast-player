import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

export function LoadingMessage({ message }: { message: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

export function ErrorMessage({ message }: { message: string }) {
  return <Text style={styles.error}>{message}</Text>;
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center' },
  loadingText: { color: '#555', marginTop: 12, textAlign: 'center' },
  error: { color: '#dc2626', textAlign: 'center' },
});
