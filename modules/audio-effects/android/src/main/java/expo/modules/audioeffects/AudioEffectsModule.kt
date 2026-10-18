package expo.modules.audioeffects

import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Queues
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val EFFECT_FAILED_CODE = "ERR_AUDIO_EFFECT"
private const val COMPRESSOR_EFFECT = "compressor"
private const val VOCAL_BOOST_EFFECT = "vocalBoost"

class UnknownEffectException(effectName: String) : Exception("Unknown audio effect: $effectName")

class AudioEffectException(cause: Throwable) :
  CodedException(EFFECT_FAILED_CODE, cause.cause?.message ?: cause.message, cause)

class AudioEffectsModule : Module() {
  private val effects: Map<String, SessionEffect> = mapOf(
    COMPRESSOR_EFFECT to PlaybackCompressor(),
    VOCAL_BOOST_EFFECT to VocalBoostEqualizer(),
  )

  override fun definition() = ModuleDefinition {
    Name("AudioEffects")

    OnDestroy { effects.values.forEach { it.disable() } }

    // ExoPlayer only allows its getters on the application (main) thread.
    AsyncFunction("setEffectEnabled") { playerId: String, effectName: String, enabled: Boolean ->
      try {
        val effect = effects[effectName] ?: throw UnknownEffectException(effectName)
        if (enabled) effect.enable(findAudioSessionId(appContext, playerId)) else effect.disable()
      } catch (error: Exception) {
        throw AudioEffectException(error)
      }
    }.runOnQueue(Queues.MAIN)
  }
}
