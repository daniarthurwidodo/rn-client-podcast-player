import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, spacing } from '../theme';

const COMING_SOON_MESSAGE = 'Coming soon';

type Props = { title: string };

export function ComingSoonScreen({ title }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.title}>{title}</Text>
      <View style={styles.body}>
        <Text style={styles.message}>{COMING_SOON_MESSAGE}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.canvas, paddingHorizontal: spacing.md },
  title: { color: colors.textHigh, fontFamily: fonts.headlineBold, fontSize: 26, lineHeight: 32, letterSpacing: -0.5 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  message: { color: colors.textSupporting, fontFamily: fonts.body, fontSize: 16 },
});
