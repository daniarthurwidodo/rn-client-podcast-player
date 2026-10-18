package expo.modules.newpiperesolver

import java.util.concurrent.TimeUnit
import okhttp3.OkHttpClient
import okhttp3.RequestBody.Companion.toRequestBody
import org.schabi.newpipe.extractor.downloader.Downloader
import org.schabi.newpipe.extractor.downloader.Request
import org.schabi.newpipe.extractor.downloader.Response
import org.schabi.newpipe.extractor.exceptions.ReCaptchaException

private const val USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; rv:128.0) Gecko/20100101 Firefox/128.0"
private const val READ_TIMEOUT_SECONDS = 30L
private const val HTTP_TOO_MANY_REQUESTS = 429

class OkHttpDownloader : Downloader() {
  private val client = OkHttpClient.Builder()
    .readTimeout(READ_TIMEOUT_SECONDS, TimeUnit.SECONDS)
    .build()

  override fun execute(request: Request): Response {
    val builder = okhttp3.Request.Builder()
      .method(request.httpMethod(), request.dataToSend()?.toRequestBody())
      .url(request.url())
      .header("User-Agent", USER_AGENT)
    request.headers().forEach { (name, values) ->
      builder.removeHeader(name)
      values.forEach { builder.addHeader(name, it) }
    }

    client.newCall(builder.build()).execute().use { response ->
      if (response.code == HTTP_TOO_MANY_REQUESTS) {
        throw ReCaptchaException("reCaptcha Challenge requested", request.url())
      }
      return Response(
        response.code,
        response.message,
        response.headers.toMultimap(),
        response.body?.string(),
        response.request.url.toString(),
      )
    }
  }
}
