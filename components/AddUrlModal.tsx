import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, fonts, radii, spacing } from '../lib/theme';

const CHECKING_URL_MESSAGE = 'Checking URL...';

type Props = {
  isVisible: boolean;
  isSubmitting: boolean;
  input: string;
  errorMessage: string | null;
  onChangeInput: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
};

export function AddUrlModal({ isVisible, isSubmitting, input, errorMessage, onChangeInput, onSubmit, onClose }: Props) {
  return (
    <Modal transparent animationType="fade" visible={isVisible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Paste URL</Text>
          <TextInput
            style={styles.input}
            testID="add-url-input"
            value={input}
            onChangeText={onChangeInput}
            onSubmitEditing={onSubmit}
            editable={!isSubmitting}
            placeholder="https://..."
            placeholderTextColor={colors.textMuted}
            selectionColor={colors.primary}
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
          />
          {isSubmitting ? (
            <View style={styles.checking}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.checkingText}>{CHECKING_URL_MESSAGE}</Text>
            </View>
          ) : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <View style={styles.actions}>
            <Pressable onPress={onClose} disabled={isSubmitting} style={styles.action}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onSubmit} disabled={isSubmitting} style={[styles.action, styles.confirmButton]}>
              <Text style={isSubmitting ? styles.confirmDisabled : styles.confirm}>Add</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.backdrop,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.sheet,
    padding: spacing.lg,
  },
  title: { color: colors.textHigh, fontFamily: fonts.headlineSemiBold, fontSize: 18, marginBottom: spacing.sm + spacing.xs },
  input: {
    borderWidth: 1,
    borderColor: colors.stroke,
    borderRadius: radii.card,
    paddingVertical: spacing.sm + spacing.xs,
    paddingHorizontal: spacing.md,
    color: colors.textHigh,
    fontFamily: fonts.body,
    backgroundColor: colors.surface,
  },
  checking: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  checkingText: { color: colors.textSupporting, fontFamily: fonts.body, marginLeft: spacing.sm },
  error: { color: colors.error, fontFamily: fonts.body, marginTop: spacing.sm },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', marginTop: spacing.md },
  action: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  confirmButton: { marginLeft: spacing.sm, borderRadius: radii.pill, backgroundColor: colors.primary },
  cancel: { color: colors.textSupporting, fontFamily: fonts.labelSemiBold },
  confirm: { color: colors.onPrimary, fontFamily: fonts.labelBold },
  confirmDisabled: { color: colors.textMuted, fontFamily: fonts.labelBold },
});
