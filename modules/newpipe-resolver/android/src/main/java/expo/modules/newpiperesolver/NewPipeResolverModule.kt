package expo.modules.newpiperesolver

import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

private const val RESOLVE_FAILED_CODE = "ERR_RESOLVE_AUDIO"

class ResolveAudioException(cause: Throwable) :
  CodedException(RESOLVE_FAILED_CODE, cause.message, cause)

class NewPipeResolverModule : Module() {
  private val resolver = AudioResolver(OkHttpDownloader())

  override fun definition() = ModuleDefinition {
    Name("NewPipeResolver")

    AsyncFunction("resolveAudio") { videoUrl: String ->
      try {
        val audio = resolver.resolve(videoUrl)
        mapOf(
          "url" to audio.url,
          "title" to audio.title,
          "mimeType" to audio.mimeType,
          "contentLength" to audio.contentLength.toDouble(),
          "thumbnailUrl" to audio.thumbnailUrl,
        )
      } catch (error: Exception) {
        throw ResolveAudioException(error)
      }
    }
  }
}
