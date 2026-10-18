package expo.modules.newpiperesolver

import org.schabi.newpipe.extractor.Image
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.stream.DeliveryMethod
import org.schabi.newpipe.extractor.MediaFormat
import org.schabi.newpipe.extractor.stream.StreamInfo

private const val UNKNOWN_CONTENT_LENGTH = -1L
private const val MIN_THUMBNAIL_HEIGHT = 180

data class ResolvedAudio(
  val url: String,
  val title: String,
  val mimeType: String,
  val contentLength: Long,
  val thumbnailUrl: String?,
)

class NoPlayableAudioException(videoUrl: String) :
  Exception("No progressive m4a audio stream found for $videoUrl")

class AudioResolver(downloader: Downloader) {
  init {
    NewPipe.init(downloader)
  }

  fun resolve(videoUrl: String): ResolvedAudio {
    val info = StreamInfo.getInfo(videoUrl)
    val stream = info.audioStreams
      .filter { it.format == MediaFormat.M4A && it.deliveryMethod == DeliveryMethod.PROGRESSIVE_HTTP }
      .maxByOrNull { it.averageBitrate }
      ?: throw NoPlayableAudioException(videoUrl)

    return ResolvedAudio(
      url = stream.content,
      title = info.name,
      mimeType = MediaFormat.M4A.mimeType,
      contentLength = stream.itagItem?.contentLength ?: UNKNOWN_CONTENT_LENGTH,
      thumbnailUrl = pickThumbnailUrl(info.thumbnails),
    )
  }

  private fun pickThumbnailUrl(thumbnails: List<Image>): String? {
    val smallestSharpEnough = thumbnails
      .filter { it.height >= MIN_THUMBNAIL_HEIGHT }
      .minByOrNull { it.height }
    return (smallestSharpEnough ?: thumbnails.maxByOrNull { it.height })?.url
  }
}
