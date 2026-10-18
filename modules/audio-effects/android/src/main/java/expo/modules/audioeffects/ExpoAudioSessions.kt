package expo.modules.audioeffects

import expo.modules.kotlin.AppContext

private const val EXPO_AUDIO_MODULE_NAME = "ExpoAudio"
private const val PLAYERS_FIELD = "players"
private const val PLAYER_REF_GETTER = "getRef"
private const val EXO_PLAYER_CLASS = "androidx.media3.exoplayer.ExoPlayer"
private const val AUDIO_SESSION_ID_GETTER = "getAudioSessionId"

class AudioSessionNotFoundException(playerId: String) :
  Exception("No audio session found for player $playerId")

// expo-audio keeps its players in a private map and never exposes the audio session id, so both are
// read reflectively. Re-check this against expo-audio's AudioModule/BaseAudioPlayer when upgrading it.
fun findAudioSessionId(appContext: AppContext, playerId: String): Int {
  val audioModule = appContext.registry.getModuleHolder(EXPO_AUDIO_MODULE_NAME)?.module
    ?: throw AudioSessionNotFoundException(playerId)

  val playersField = audioModule.javaClass.getDeclaredField(PLAYERS_FIELD).apply { isAccessible = true }
  val player = (playersField.get(audioModule) as Map<*, *>)[playerId]
    ?: throw AudioSessionNotFoundException(playerId)

  val exoPlayer = player.javaClass.getMethod(PLAYER_REF_GETTER).invoke(player)
  val sessionId = Class.forName(EXO_PLAYER_CLASS).getMethod(AUDIO_SESSION_ID_GETTER).invoke(exoPlayer) as Int
  if (sessionId <= 0) throw AudioSessionNotFoundException(playerId)
  return sessionId
}
