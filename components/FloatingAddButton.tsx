import { Plus } from 'lucide-react-native';
import { Pressable, StyleSheet } from 'react-native';

const ICON_SIZE = 28;

type Props = { onPress: () => void };

export function FloatingAddButton({ onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Add URL"
      onPress={onPress}
      style={styles.button}
    >
      <Plus color="#fff" size={ICON_SIZE} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    right: 24,
    bottom: 48,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#2563eb',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
});
