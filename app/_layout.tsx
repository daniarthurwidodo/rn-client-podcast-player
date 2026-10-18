import { Stack } from 'expo-router';
import { MiniPlayer } from '../components/MiniPlayer';

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ title: 'Podcasts' }} />
        <Stack.Screen name="player" options={{ title: 'Player' }} />
      </Stack>
      <MiniPlayer />
    </>
  );
}
