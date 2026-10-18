import type { LucideIcon } from 'lucide-react-native';
import { Compass, Download, House, Library } from 'lucide-react-native';
import type { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../lib/theme';
import { MiniPlayer } from './MiniPlayer';

const TAB_ICON_SIZE = 24;
const TAB_ICONS: Record<string, LucideIcon> = { index: House, explore: Compass, library: Library, downloads: Download };

type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

type TabButtonProps = { label: string; Icon: LucideIcon; isFocused: boolean; onPress: () => void };

function TabButton({ label, Icon, isFocused, onPress }: TabButtonProps) {
  const color = isFocused ? colors.primary : colors.textSupporting;

  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: isFocused }} style={styles.tab} onPress={onPress}>
      <Icon color={color} size={TAB_ICON_SIZE} />
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

// The mini-player lives here so it always floats directly above the tabs.
export function AppTabBar({ state, descriptors, navigateToTab, insets }: TabBarProps) {
  return (
    <View style={styles.container}>
      <MiniPlayer />
      <View style={[styles.tabs, { paddingBottom: insets.bottom + spacing.sm }]}>
        {state.routes.map((route, index) => (
          <TabButton
            key={route.key}
            label={descriptors[route.key].options.title ?? route.name}
            Icon={TAB_ICONS[route.name]}
            isFocused={state.index === index}
            onPress={() => navigateToTab(route.key)}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: colors.canvas },
  tabs: { flexDirection: 'row', paddingTop: spacing.sm, borderTopWidth: 1, borderColor: colors.stroke },
  tab: { flex: 1, alignItems: 'center', paddingVertical: spacing.xs },
  label: { fontFamily: fonts.labelSemiBold, fontSize: 12, marginTop: spacing.xs },
});
