import { AudioWaveform, Mic } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, spacing } from '../lib/theme';
import { usePlayerStore } from '../stores/playerStore';
import { EffectCard } from './EffectCard';

const SECTION_TITLE = 'SOUND STUDIO ENGINE';
const ACTIVE_LABEL = 'Active DSP';
const VOCAL_BOOST_LABEL = 'Vocal boost';
const VOCAL_BOOST_DESCRIPTION = 'Emphasizes speech';
const COMPRESSOR_LABEL = 'Compressor';
const COMPRESSOR_DESCRIPTION = 'Evens out loud and quiet';
const ACTIVE_DOT_SIZE = 6;

export function EffectsPanel() {
  const enabledEffects = usePlayerStore((state) => state.enabledEffects);
  const toggleEffect = usePlayerStore((state) => state.toggleEffect);
  const isAnyEffectActive = enabledEffects.compressor || enabledEffects.vocalBoost;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{SECTION_TITLE}</Text>
        {isAnyEffectActive ? (
          <View style={styles.active}>
            <View style={styles.activeDot} />
            <Text style={styles.activeLabel}>{ACTIVE_LABEL}</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.cards}>
        <EffectCard
          label={VOCAL_BOOST_LABEL}
          description={VOCAL_BOOST_DESCRIPTION}
          Icon={Mic}
          isEnabled={enabledEffects.vocalBoost}
          onToggle={() => toggleEffect('vocalBoost')}
        />
        <EffectCard
          label={COMPRESSOR_LABEL}
          description={COMPRESSOR_DESCRIPTION}
          Icon={AudioWaveform}
          isEnabled={enabledEffects.compressor}
          onToggle={() => toggleEffect('compressor')}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignSelf: 'stretch' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  title: { color: colors.textSupporting, fontFamily: fonts.labelBold, fontSize: 12, letterSpacing: 1 },
  active: { flexDirection: 'row', alignItems: 'center' },
  activeDot: { width: ACTIVE_DOT_SIZE, height: ACTIVE_DOT_SIZE, borderRadius: ACTIVE_DOT_SIZE / 2, backgroundColor: colors.tertiary },
  activeLabel: { color: colors.tertiary, fontFamily: fonts.labelSemiBold, fontSize: 12, marginLeft: spacing.xs },
  cards: { gap: spacing.sm },
});
