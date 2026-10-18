package expo.modules.audioeffects

interface SessionEffect {
  fun enable(audioSessionId: Int)

  fun disable()
}
