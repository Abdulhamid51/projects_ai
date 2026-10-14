package uz.musicapp

import android.app.Application
import android.content.Context
import android.content.Intent
import android.media.MediaMetadataRetriever
import android.net.Uri
import android.provider.OpenableColumns
import androidx.compose.runtime.mutableStateOf
import com.yausername.ffmpeg.FFmpeg
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.util.UUID

data class Track(val id: String, val title: String, val artist: String, val uri: String)
data class Playlist(val id: String, val name: String, val tracks: List<Track>, val source: String)

class App : Application() {
    override fun onCreate() {
        super.onCreate()
        Repo.init(this)
    }
}

object Repo {
    private lateinit var ctx: Context
    val playlists = mutableStateOf<List<Playlist>>(emptyList())
    val status = mutableStateOf<String?>(null)
    val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    @Volatile var busy = false
    private val file get() = File(ctx.filesDir, "playlists.json")

    fun init(c: Context) {
        ctx = c
        runCatching {
            val arr = JSONArray(file.readText())
            playlists.value = (0 until arr.length()).map { i ->
                val o = arr.getJSONObject(i)
                val ta = o.getJSONArray("tracks")
                Playlist(o.getString("id"), o.getString("name"), (0 until ta.length()).map { j ->
                    val t = ta.getJSONObject(j)
                    Track(t.getString("id"), t.getString("title"), t.optString("artist"), t.getString("uri"))
                }, o.getString("src"))
            }
        }
    }

    private fun save() {
        val arr = JSONArray()
        playlists.value.forEach { p ->
            val ta = JSONArray()
            p.tracks.forEach { t ->
                ta.put(JSONObject().put("id", t.id).put("title", t.title).put("artist", t.artist).put("uri", t.uri))
            }
            arr.put(JSONObject().put("id", p.id).put("name", p.name).put("src", p.source).put("tracks", ta))
        }
        file.writeText(arr.toString())
    }

    @Synchronized
    private fun update(f: (List<Playlist>) -> List<Playlist>) {
        playlists.value = f(playlists.value)
        save()
    }

    private fun addTracks(pid: String, new: List<Track>) =
        update { l -> l.map { if (it.id == pid) it.copy(tracks = it.tracks + new) else it } }

    fun create(name: String, source: String): String {
        val id = UUID.randomUUID().toString()
        update { it + Playlist(id, name, emptyList(), source) }
        return id
    }

    private fun deleteFile(t: Track) {
        if (t.uri.startsWith("file:")) runCatching { File(Uri.parse(t.uri).path!!).delete() }
    }

    fun delete(pid: String) {
        playlists.value.find { it.id == pid }?.tracks?.forEach(::deleteFile)
        update { l -> l.filter { it.id != pid } }
    }

    fun removeTrack(pid: String, tid: String) {
        playlists.value.find { it.id == pid }?.tracks?.find { it.id == tid }?.let(::deleteFile)
        update { l -> l.map { if (it.id == pid) it.copy(tracks = it.tracks.filter { t -> t.id != tid }) else it } }
    }

    fun addLocal(pid: String, uris: List<Uri>) = scope.launch {
        val new = uris.map { u ->
            runCatching { ctx.contentResolver.takePersistableUriPermission(u, Intent.FLAG_GRANT_READ_URI_PERMISSION) }
            val m = MediaMetadataRetriever()
            val md: Pair<String?, String?> = try {
                m.setDataSource(ctx, u)
                m.extractMetadata(MediaMetadataRetriever.METADATA_KEY_TITLE) to
                    m.extractMetadata(MediaMetadataRetriever.METADATA_KEY_ARTIST)
            } catch (e: Exception) {
                null to null
            } finally {
                m.release()
            }
            val name = ctx.contentResolver.query(u, null, null, null, null)?.use { c ->
                if (c.moveToFirst()) c.getString(c.getColumnIndexOrThrow(OpenableColumns.DISPLAY_NAME)) else null
            } ?: "Trek"
            Track(UUID.randomUUID().toString(), md.first?.takeIf { it.isNotBlank() } ?: name.substringBeforeLast('.'),
                md.second.orEmpty(), u.toString())
        }
        addTracks(pid, new)
    }

    suspend fun importYoutube(url: String, name: String) {
        busy = true
        try {
            status.value = "Tayyorlanmoqda..."
            val y = YoutubeDL.getInstance()
            y.init(ctx)
            FFmpeg.getInstance().init(ctx)
            status.value = "yt-dlp yangilanmoqda..."
            runCatching { y.updateYoutubeDL(ctx) }
            status.value = "Playlist o'qilmoqda..."
            val listing = YoutubeDLRequest(url).apply {
                addOption("--flat-playlist")
                addOption("--dump-json")
                addOption("--ignore-errors")
                addOption("--yes-playlist")
            }
            val items = y.execute(listing).out.lines().mapNotNull { runCatching { JSONObject(it) }.getOrNull() }
                .filter { it.optString("id").isNotBlank() }
            if (items.isEmpty()) error("Videolar topilmadi")
            val pname = name.ifBlank {
                items[0].optString("playlist_title").takeIf { it.isNotBlank() && it != "null" } ?: "YouTube playlist"
            }
            val pid = create(pname, "youtube")
            val dir = File(ctx.getExternalFilesDir(null) ?: ctx.filesDir, "yt/$pid").apply { mkdirs() }
            var ok = 0
            items.forEachIndexed { i, o ->
                val id = o.getString("id")
                val title = o.optString("title", id)
                val artist = o.optString("uploader", o.optString("channel")).takeIf { it != "null" }.orEmpty()
                val req = YoutubeDLRequest("https://www.youtube.com/watch?v=$id").apply {
                    addOption("-f", "bestaudio[ext=m4a]/bestaudio/best")
                    addOption("-x")
                    addOption("--audio-format", "m4a")
                    addOption("--no-playlist")
                    addOption("--no-mtime")
                    addOption("-o", "${dir.absolutePath}/%(id)s.%(ext)s")
                }
                try {
                    y.execute(req) { p, _, _ -> status.value = "${i + 1}/${items.size}: $title (${p.toInt()}%)" }
                    val f = dir.listFiles()?.firstOrNull { it.name.startsWith("$id.") && !it.name.endsWith(".part") }
                        ?: error("fayl topilmadi")
                    addTracks(pid, listOf(Track(id, title, artist, Uri.fromFile(f).toString())))
                    ok++
                } catch (e: Exception) {
                    status.value = "Xato (${i + 1}): ${e.message?.take(80)}"
                    delay(1500)
                }
            }
            status.value = "Tayyor: $ok/${items.size} ta audio yuklandi"
            delay(4000)
        } catch (e: Exception) {
            status.value = "Xatolik: ${e.message?.take(150)}"
            delay(6000)
        } finally {
            status.value = null
            busy = false
        }
    }
}
