package expo.modules.audioeffects

import android.media.audiofx.DynamicsProcessing
import android.os.Build

private const val CHANNEL_COUNT = 2
private const val MBC_BAND_COUNT = 1
private const val MBC_BAND_INDEX = 0
private const val EFFECT_PRIORITY = 0
private const val LIMITER_LINK_GROUP = 0

// One full-range band: everything above -30 dB is squeezed 3:1, then lifted 6 dB so quiet speech
// comes up while loud peaks stay put. A fast limiter after it prevents clipping from the lift.
private const val FULL_RANGE_CUTOFF_HZ = 20_000f
private const val COMPRESSOR_ATTACK_MS = 10f
private const val COMPRESSOR_RELEASE_MS = 150f
private const val COMPRESSOR_RATIO = 3f
private const val COMPRESSOR_THRESHOLD_DB = -30f
private const val COMPRESSOR_KNEE_DB = 6f
private const val NOISE_GATE_THRESHOLD_DB = -90f
private const val EXPANDER_RATIO = 1f
private const val PRE_GAIN_DB = 0f
private const val MAKEUP_GAIN_DB = 6f
private const val LIMITER_ATTACK_MS = 1f
private const val LIMITER_RELEASE_MS = 60f
private const val LIMITER_RATIO = 10f
private const val LIMITER_THRESHOLD_DB = -2f
private const val LIMITER_POST_GAIN_DB = 0f

class UnsupportedAndroidVersionException :
  Exception("The audio compressor needs Android 9 or newer")

class PlaybackCompressor : SessionEffect {
  private var effect: DynamicsProcessing? = null

  override fun enable(audioSessionId: Int) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.P) throw UnsupportedAndroidVersionException()

    disable()
    val config = DynamicsProcessing.Config.Builder(
      DynamicsProcessing.VARIANT_FAVOR_FREQUENCY_RESOLUTION,
      CHANNEL_COUNT,
      false, 0,
      true, MBC_BAND_COUNT,
      false, 0,
      true,
    ).build()

    val newEffect = DynamicsProcessing(EFFECT_PRIORITY, audioSessionId, config)
    newEffect.setMbcBandAllChannelsTo(
      MBC_BAND_INDEX,
      DynamicsProcessing.MbcBand(
        true,
        FULL_RANGE_CUTOFF_HZ,
        COMPRESSOR_ATTACK_MS,
        COMPRESSOR_RELEASE_MS,
        COMPRESSOR_RATIO,
        COMPRESSOR_THRESHOLD_DB,
        COMPRESSOR_KNEE_DB,
        NOISE_GATE_THRESHOLD_DB,
        EXPANDER_RATIO,
        PRE_GAIN_DB,
        MAKEUP_GAIN_DB,
      ),
    )
    newEffect.setLimiterAllChannelsTo(
      DynamicsProcessing.Limiter(
        true,
        true,
        LIMITER_LINK_GROUP,
        LIMITER_ATTACK_MS,
        LIMITER_RELEASE_MS,
        LIMITER_RATIO,
        LIMITER_THRESHOLD_DB,
        LIMITER_POST_GAIN_DB,
      ),
    )
    newEffect.enabled = true
    effect = newEffect
  }

  override fun disable() {
    effect?.release()
    effect = null
  }
}
