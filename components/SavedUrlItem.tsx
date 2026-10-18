import { X } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { SavedUrl } from '../lib/savedUrl';

const DELETE_ICON_SIZE = 20;

type Props = {
  item: SavedUrl;
  onPress: (item: SavedUrl) => void;
  onDelete: (url: string) => void;
};

export function SavedUrlItem({ item, onPress, onDelete }: Props) {
  const hasDistinctTitle = item.title !== item.url;

  return (
    <Pressable style={styles.row} onPress={() => onPress(item)}>
      {item.thumbnailUrl ? (
        <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
      ) : (
        <View style={[styles.thumbnail, styles.placeholder]} />
      )}
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
        {hasDistinctTitle ? <Text style={styles.url} numberOfLines={1}>{item.url}</Text> : null}
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Delete ${item.title}`}
        hitSlop={8}
        style={styles.delete}
        onPress={() => onDelete(item.url)}
      >
        <X color="#dc2626" size={DELETE_ICON_SIZE} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#ccc',
  },
  thumbnail: { width: 96, height: 54, borderRadius: 6 },
  placeholder: { backgroundColor: '#e5e7eb' },
  text: { flex: 1, marginLeft: 12 },
  title: { fontSize: 15, fontWeight: '600' },
  url: { color: '#777', fontSize: 12, marginTop: 4 },
  delete: { paddingHorizontal: 10, paddingVertical: 6 },
});
