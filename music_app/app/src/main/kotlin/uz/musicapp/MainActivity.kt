package uz.musicapp

import android.Manifest
import android.content.ComponentName
import android.content.Intent
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FloatingActionButton
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import kotlinx.coroutines.delay

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(colorScheme = darkColorScheme()) {
                Surface(Modifier.fillMaxSize()) { Root() }
            }
        }
    }
}

private fun playFrom(c: MediaController, p: Playlist, index: Int) {
    val items = p.tracks.map {
        MediaItem.Builder().setUri(it.uri).setMediaId(it.id)
            .setMediaMetadata(MediaMetadata.Builder().setTitle(it.title).setArtist(it.artist).build()).build()
    }
    c.setMediaItems(items, index, 0)
    c.prepare()
    c.play()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun Root() {
    val ctx = LocalContext.current
    var ctl by remember { mutableStateOf<MediaController?>(null) }
    var open by remember { mutableStateOf<String?>(null) }
    var showNew by remember { mutableStateOf(false) }
    var pickFor by remember { mutableStateOf<String?>(null) }
    var delId by remember { mutableStateOf<String?>(null) }
    var playing by remember { mutableStateOf(false) }
    var cur by remember { mutableStateOf<MediaItem?>(null) }
    var shuffle by remember { mutableStateOf(false) }
    var repeatAll by remember { mutableStateOf(false) }
    var pos by remember { mutableLongStateOf(0L) }
    var dur by remember { mutableLongStateOf(0L) }
    val lists = Repo.playlists.value
    val openList = lists.find { it.id == open }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        pickFor?.let { id -> if (uris.isNotEmpty()) Repo.addLocal(id, uris) }
        pickFor = null
    }
    val notifPerm = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}

    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= 33) notifPerm.launch(Manifest.permission.POST_NOTIFICATIONS)
    }
    DisposableEffect(Unit) {
        val f = MediaController.Builder(ctx, SessionToken(ctx, ComponentName(ctx, PlaybackService::class.java)))
            .buildAsync()
        f.addListener({ runCatching { ctl = f.get() } }, ContextCompat.getMainExecutor(ctx))
        onDispose { MediaController.releaseFuture(f) }
    }
    DisposableEffect(ctl) {
        val c = ctl
        val sync = { p: Player ->
            playing = p.isPlaying
            cur = p.currentMediaItem
            dur = maxOf(0L, p.duration)
            shuffle = p.shuffleModeEnabled
            repeatAll = p.repeatMode == Player.REPEAT_MODE_ALL
        }
        val l = object : Player.Listener {
            override fun onEvents(player: Player, events: Player.Events) = sync(player)
        }
        c?.addListener(l)
        c?.let(sync)
        onDispose { c?.removeListener(l) }
    }
    LaunchedEffect(ctl, playing) {
        while (playing) {
            pos = ctl?.currentPosition ?: 0L
            delay(500)
        }
        ctl?.let { pos = it.currentPosition }
    }
    BackHandler(open != null) { open = null }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text(openList?.name ?: "Playlistlar", maxLines = 1, overflow = TextOverflow.Ellipsis) },
                navigationIcon = { if (open != null) TextButton({ open = null }) { Text("←", fontSize = 22.sp) } },
            )
        },
        floatingActionButton = {
            if (open == null) FloatingActionButton({ showNew = true }) { Text("+", fontSize = 28.sp) }
        },
        bottomBar = {
            val c = ctl
            if (c != null && cur != null) {
                Column(Modifier.fillMaxWidth().padding(horizontal = 12.dp)) {
                    Slider(
                        value = pos.toFloat(),
                        valueRange = 0f..maxOf(dur, 1L).toFloat(),
                        onValueChange = { pos = it.toLong() },
                        onValueChangeFinished = { c.seekTo(pos) },
                    )
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Column(Modifier.weight(1f)) {
                            Text(cur?.mediaMetadata?.title?.toString().orEmpty(), maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text(cur?.mediaMetadata?.artist?.toString().orEmpty(), maxLines = 1,
                                overflow = TextOverflow.Ellipsis, fontSize = 12.sp, modifier = Modifier.alpha(0.6f))
                        }
                        TextButton({ c.shuffleModeEnabled = !shuffle }, modifier = Modifier.alpha(if (shuffle) 1f else 0.4f)) { Text("🔀") }
                        TextButton({ c.seekToPreviousMediaItem() }) { Text("⏮", fontSize = 20.sp) }
                        TextButton({ if (playing) c.pause() else c.play() }) { Text(if (playing) "⏸" else "▶", fontSize = 24.sp) }
                        TextButton({ c.seekToNextMediaItem() }) { Text("⏭", fontSize = 20.sp) }
                        TextButton(
                            { c.repeatMode = if (repeatAll) Player.REPEAT_MODE_OFF else Player.REPEAT_MODE_ALL },
                            modifier = Modifier.alpha(if (repeatAll) 1f else 0.4f),
                        ) { Text("🔁") }
                    }
                }
            }
        },
    ) { pad ->
        Column(Modifier.padding(pad).fillMaxSize()) {
            Repo.status.value?.let {
                Text(it, Modifier.fillMaxWidth().padding(12.dp), color = MaterialTheme.colorScheme.primary, maxLines = 2)
            }
            if (openList == null) {
                if (lists.isEmpty()) Text("Hali playlist yo'q. + tugmasini bosing.", Modifier.padding(16.dp))
                LazyColumn {
                    itemsIndexed(lists) { _, p ->
                        Row(Modifier.fillMaxWidth().clickable { open = p.id }.padding(start = 16.dp, top = 8.dp, bottom = 8.dp),
                            verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                Text(p.name, fontSize = 17.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text("${p.tracks.size} ta trek • " + if (p.source == "youtube") "YouTube" else "Qurilma",
                                    fontSize = 12.sp, modifier = Modifier.alpha(0.6f))
                            }
                            TextButton({ delId = p.id }) { Text("🗑") }
                        }
                        HorizontalDivider()
                    }
                }
            } else {
                Row(Modifier.padding(horizontal = 12.dp), Arrangement.spacedBy(8.dp)) {
                    TextButton({ ctl?.let { c -> if (openList.tracks.isNotEmpty()) playFrom(c, openList, 0) } }) { Text("▶ Hammasini ijro etish") }
                    if (openList.source == "local") {
                        TextButton({ pickFor = openList.id; picker.launch(arrayOf("audio/*")) }) { Text("+ Fayl qo'shish") }
                    }
                }
                LazyColumn {
                    itemsIndexed(openList.tracks) { i, t ->
                        Row(Modifier.fillMaxWidth().clickable { ctl?.let { playFrom(it, openList, i) } }
                            .padding(start = 16.dp, top = 6.dp, bottom = 6.dp), verticalAlignment = Alignment.CenterVertically) {
                            Column(Modifier.weight(1f)) {
                                val now = cur?.mediaId == t.id
                                Text((if (now) "♪ " else "") + t.title, maxLines = 1, overflow = TextOverflow.Ellipsis,
                                    color = if (now) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface)
                                if (t.artist.isNotBlank()) Text(t.artist, fontSize = 12.sp, maxLines = 1, modifier = Modifier.alpha(0.6f))
                            }
                            TextButton({ Repo.removeTrack(openList.id, t.id) }) { Text("✕") }
                        }
                    }
                }
            }
        }
    }

    if (showNew) {
        var name by remember { mutableStateOf("") }
        var url by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showNew = false },
            title = { Text("Yangi playlist") },
            text = {
                Column {
                    OutlinedTextField(name, { name = it }, label = { Text("Nomi") }, singleLine = true)
                    OutlinedTextField(url, { url = it }, label = { Text("YouTube playlist linki") }, singleLine = true)
                }
            },
            confirmButton = {
                Row {
                    TextButton({
                        pickFor = Repo.create(name.ifBlank { "Playlist" }, "local")
                        showNew = false
                        picker.launch(arrayOf("audio/*"))
                    }) { Text("Fayllar") }
                    TextButton({
                        ContextCompat.startForegroundService(ctx, Intent(ctx, DownloadService::class.java)
                            .putExtra("url", url.trim()).putExtra("name", name.trim()))
                        showNew = false
                    }, enabled = url.isNotBlank() && !Repo.busy) { Text("YouTube") }
                }
            },
            dismissButton = { TextButton({ showNew = false }) { Text("Bekor") } },
        )
    }
    delId?.let { id ->
        AlertDialog(
            onDismissRequest = { delId = null },
            title = { Text("Playlist o'chirilsinmi?") },
            confirmButton = { TextButton({ if (open == id) open = null; Repo.delete(id); delId = null }) { Text("O'chirish") } },
            dismissButton = { TextButton({ delId = null }) { Text("Bekor") } },
        )
    }
}
