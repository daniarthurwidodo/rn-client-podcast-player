package expo.modules.audioeffects

import android.media.audiofx.Equalizer

private const val EFFECT_PRIORITY = 0

// Speech clarity and presence sit between roughly 800 Hz and 5 kHz. Band centres are in millihertz.
private const val VOCAL_MIN_CENTER_MILLIHZ = 800_000
private const val VOCAL_MAX_CENTER_MILLIHZ = 5_000_000
private const val VOCAL_BOOST_MILLIBEL: Short = 300

class NoVocalBandsException : Exception("This device's equalizer has no bands in the vocal range")

class VocalBoostEqualizer : SessionEffect {
  private var equalizer: Equalizer? = null

  override fun enable(audioSessionId: Int) {
    disable()
    val newEqualizer = Equalizer(EFFECT_PRIORITY, audioSessionId)

    val maxLevel = newEqualizer.bandLevelRange[1]
    val boostLevel = minOf(VOCAL_BOOST_MILLIBEL, maxLevel)
    var boostedBandCount = 0
    for (band in 0 until newEqualizer.numberOfBands) {
      val bandIndex = band.toShort()
      if (newEqualizer.getCenterFreq(bandIndex) in VOCAL_MIN_CENTER_MILLIHZ..VOCAL_MAX_CENTER_MILLIHZ) {
        newEqualizer.setBandLevel(bandIndex, boostLevel)
        boostedBandCount++
      }
    }

    if (boostedBandCount == 0) {
      newEqualizer.release()
      throw NoVocalBandsException()
    }
    newEqualizer.enabled = true
    equalizer = newEqualizer
  }

  override fun disable() {
    equalizer?.release()
    equalizer = null
  }
}
