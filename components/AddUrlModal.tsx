import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

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
            placeholderTextColor="#9ca3af"
            autoFocus
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            returnKeyType="done"
          />
          {isSubmitting ? (
            <View style={styles.checking}>
              <ActivityIndicator size="small" />
              <Text style={styles.checkingText}>{CHECKING_URL_MESSAGE}</Text>
            </View>
          ) : null}
          {errorMessage ? <Text style={styles.error}>{errorMessage}</Text> : null}
          <View style={styles.actions}>
            <Pressable onPress={onClose} disabled={isSubmitting} style={styles.action}>
              <Text style={styles.cancel}>Cancel</Text>
            </Pressable>
            <Pressable onPress={onSubmit} disabled={isSubmitting} style={styles.action}>
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 24,
  },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 20 },
  title: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
  input: { borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 10, color: '#000' },
  checking: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  checkingText: { color: '#555', marginLeft: 8 },
  error: { color: '#dc2626', marginTop: 8 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  action: { paddingVertical: 8, paddingHorizontal: 16 },
  cancel: { color: '#555' },
  confirm: { color: '#2563eb', fontWeight: '600' },
  confirmDisabled: { color: '#9ca3af', fontWeight: '600' },
});
