import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { MiniPlayer } from '../../presentation/components/MiniPlayer';
import { colors } from '../../presentation/theme';

export default function TabsLayout() {
  return (
    <Tabs
      tabBar={({ insets }) => (
        <View style={{ backgroundColor: colors.canvas, paddingBottom: insets.bottom }}>
          <MiniPlayer />
        </View>
      )}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="library" options={{ title: 'Library' }} />
      <Tabs.Screen name="downloads" options={{ title: 'Downloads' }} />
    </Tabs>
  );
}
