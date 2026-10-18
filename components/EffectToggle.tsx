import { Pressable, StyleSheet, Text } from 'react-native';

type Props = {
  label: string;
  isEnabled: boolean;
  onPress: () => void;
};

export function EffectToggle({ label, isEnabled, onPress }: Props) {
  return (
    <Pressable style={styles.toggle} onPress={onPress}>
      <Text style={isEnabled ? styles.on : styles.off}>{`${label}: ${isEnabled ? 'On' : 'Off'}`}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  toggle: { paddingVertical: 8, paddingHorizontal: 16 },
  on: { color: '#2563eb', fontWeight: '600' },
  off: { color: '#777' },
});
