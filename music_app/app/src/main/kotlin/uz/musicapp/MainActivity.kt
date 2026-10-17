package uz.musicapp

import android.Manifest
import android.content.ComponentName
import android.graphics.Color as AColor
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.SystemBarStyle
import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ExtendedFloatingActionButton
import androidx.compose.material3.FilledTonalButton
import androidx.compose.material3.Icon
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
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
        enableEdgeToEdge(
            statusBarStyle = SystemBarStyle.dark(AColor.TRANSPARENT),
            navigationBarStyle = SystemBarStyle.dark(AColor.TRANSPARENT),
        )
        setContent { AppTheme { Surface(Modifier.fillMaxSize(), color = Bg) { Root() } } }
    }
}

class Ps {
    var ctl by mutableStateOf<MediaController?>(null)
    var playing by mutableStateOf(false)
    var cur by mutableStateOf<MediaItem?>(null)
    var shuffle by mutableStateOf(false)
    var repeatAll by mutableStateOf(false)
    var pos by mutableLongStateOf(0L)
    var dur by mutableLongStateOf(0L)
    val title get() = cur?.mediaMetadata?.title?.toString().orEmpty()
    val artist get() = cur?.mediaMetadata?.artist?.toString()?.takeIf { it.isNotBlank() } ?: "Noma'lum ijrochi"
}

private fun playFrom(c: MediaController, p: Playlist, index: Int, shuffle: Boolean? = null) {
    val items = p.tracks.map {
        MediaItem.Builder().setUri(it.uri).setMediaId(it.id)
            .setMediaMetadata(MediaMetadata.Builder().setTitle(it.title).setArtist(it.artist).build()).build()
    }
    shuffle?.let { c.shuffleModeEnabled = it }
    c.setMediaItems(items, index, 0)
    c.prepare()
    c.play()
}

@Composable
fun Root() {
    val ctx = LocalContext.current
    val ps = remember { Ps() }
    var open by remember { mutableStateOf<String?>(null) }
    var showNew by remember { mutableStateOf(false) }
    var pickFor by remember { mutableStateOf<String?>(null) }
    var delId by remember { mutableStateOf<String?>(null) }
    var full by remember { mutableStateOf(false) }
    val lists = Repo.playlists.value
    val openList = lists.find { it.id == open }

    val picker = rememberLauncherForActivityResult(ActivityResultContracts.OpenMultipleDocuments()) { uris ->
        pickFor?.let { id -> if (uris.isNotEmpty()) Repo.addLocal(id, uris) }
        pickFor = null
    }
    val notifPerm = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) {}
    val pick = { id: String -> pickFor = id; picker.launch(arrayOf("audio/*")) }

    LaunchedEffect(Unit) {
        if (Build.VERSION.SDK_INT >= 33) notifPerm.launch(Manifest.permission.POST_NOTIFICATIONS)
    }
    DisposableEffect(Unit) {
        val f = MediaController.Builder(ctx, SessionToken(ctx, ComponentName(ctx, PlaybackService::class.java))).buildAsync()
        f.addListener({ runCatching { ps.ctl = f.get() } }, ContextCompat.getMainExecutor(ctx))
        onDispose { MediaController.releaseFuture(f) }
    }
    DisposableEffect(ps.ctl) {
        val c = ps.ctl
        val sync = { p: Player ->
            ps.playing = p.isPlaying
            ps.cur = p.currentMediaItem
            ps.dur = maxOf(0L, p.duration)
            ps.shuffle = p.shuffleModeEnabled
            ps.repeatAll = p.repeatMode == Player.REPEAT_MODE_ALL
        }
        val l = object : Player.Listener {
            override fun onEvents(player: Player, events: Player.Events) = sync(player)
        }
        c?.addListener(l)
        c?.let(sync)
        onDispose { c?.removeListener(l) }
    }
    LaunchedEffect(ps.ctl, ps.playing, ps.cur) {
        ps.ctl?.let { ps.pos = it.currentPosition }
        while (ps.playing) {
            delay(500)
            ps.ctl?.let { ps.pos = it.currentPosition }
        }
    }
    BackHandler(full) { full = false }
    BackHandler(open != null && !full) { open = null }

    Box(Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xFF1C1844), Bg)))) {
        Column(Modifier.fillMaxSize().statusBarsPadding()) {
            Box(Modifier.weight(1f)) {
                if (openList == null) Home(lists, { open = it }, { delId = it }) { showNew = true }
                else Detail(openList, ps, { open = null }, pick)
            }
            if (ps.cur != null) MiniPlayer(ps) { full = true }
            Spacer(Modifier.navigationBarsPadding())
        }
        if (full && ps.cur != null) NowPlaying(ps) { full = false }
    }

    if (showNew) {
        var name by remember { mutableStateOf("") }
        AlertDialog(
            onDismissRequest = { showNew = false },
            containerColor = Card,
            title = { Text("Yangi playlist") },
            text = { OutlinedTextField(name, { name = it }, label = { Text("Nomi") }, singleLine = true) },
            confirmButton = {
                TextButton({
                    showNew = false
                    pick(Repo.create(name.ifBlank { "Playlist" }, "local"))
                }) { Text("Fayllar tanlash") }
            },
            dismissButton = { TextButton({ showNew = false }) { Text("Bekor") } },
        )
    }
    delId?.let { id ->
        AlertDialog(
            onDismissRequest = { delId = null },
            containerColor = Card,
            title = { Text("Playlist o'chirilsinmi?") },
            confirmButton = { TextButton({ if (open == id) open = null; Repo.delete(id); delId = null }) { Text("O'chirish") } },
            dismissButton = { TextButton({ delId = null }) { Text("Bekor") } },
        )
    }
}

@Composable
fun Home(lists: List<Playlist>, onOpen: (String) -> Unit, onDelete: (String) -> Unit, onNew: () -> Unit) {
    Box(Modifier.fillMaxSize()) {
        Column(Modifier.fillMaxSize()) {
            Column(Modifier.padding(start = 20.dp, top = 20.dp, end = 20.dp, bottom = 8.dp)) {
                Text("Musiqa", fontSize = 32.sp, fontWeight = FontWeight.Bold)
                Text("${lists.size} ta playlist", color = Muted, fontSize = 14.sp)
            }
            if (lists.isEmpty()) {
                Column(Modifier.fillMaxSize().padding(32.dp), Arrangement.Center, Alignment.CenterHorizontally) {
                    Box(Modifier.size(96.dp).clip(CircleShape).background(Card), contentAlignment = Alignment.Center) {
                        Icon(Ic.Playlist, null, tint = Accent, modifier = Modifier.size(44.dp))
                    }
                    Spacer(Modifier.height(16.dp))
                    Text("Hali playlist yo'q", fontSize = 18.sp, fontWeight = FontWeight.SemiBold)
                    Text("Pastdagi tugma orqali birinchi playlistingizni yarating", color = Muted,
                        textAlign = TextAlign.Center, modifier = Modifier.padding(top = 4.dp))
                }
            } else {
                LazyVerticalGrid(
                    GridCells.Fixed(2),
                    contentPadding = androidx.compose.foundation.layout.PaddingValues(16.dp, 8.dp, 16.dp, 96.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                ) {
                    items(lists) { p ->
                        Column(Modifier.clip(RoundedCornerShape(20.dp)).background(Card).clickable { onOpen(p.id) }.padding(10.dp)) {
                            Box {
                                Cover(p.id, Modifier.fillMaxWidth().aspectRatio(1f), 14.dp, 48.dp)
                                IconBtn(Ic.Delete, "O'chirish", { onDelete(p.id) }, Color.White, 18.dp,
                                    Modifier.align(Alignment.TopEnd).size(40.dp))
                            }
                            Text(p.name, Modifier.padding(top = 10.dp, start = 4.dp), fontWeight = FontWeight.SemiBold,
                                maxLines = 1, overflow = TextOverflow.Ellipsis)
                            Text("${p.tracks.size} ta trek", Modifier.padding(start = 4.dp, bottom = 2.dp),
                                color = Muted, fontSize = 13.sp)
                        }
                    }
                }
            }
        }
        ExtendedFloatingActionButton(
            text = { Text("Yangi playlist") },
            icon = { Icon(Ic.Add, null) },
            onClick = onNew,
            containerColor = Accent,
            contentColor = Color(0xFF1A1033),
            modifier = Modifier.align(Alignment.BottomEnd).padding(16.dp),
        )
    }
}

@Composable
fun Detail(p: Playlist, ps: Ps, onBack: () -> Unit, onPick: (String) -> Unit) {
    LazyColumn(Modifier.fillMaxSize(), contentPadding = androidx.compose.foundation.layout.PaddingValues(bottom = 16.dp)) {
        item {
            Column(Modifier.padding(horizontal = 16.dp)) {
                IconBtn(Ic.Back, "Orqaga", onBack, modifier = Modifier.padding(top = 4.dp))
                Row(Modifier.padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Cover(p.id, Modifier.size(120.dp), 18.dp, 52.dp)
                    Column(Modifier.padding(start = 16.dp)) {
                        Text(p.name, fontSize = 24.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis)
                        Text("${p.tracks.size} ta trek", color = Muted, modifier = Modifier.padding(top = 4.dp))
                    }
                }
                Row(Modifier.padding(vertical = 16.dp), horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    Button(
                        { ps.ctl?.let { c -> if (p.tracks.isNotEmpty()) playFrom(c, p, 0, false) } },
                        colors = androidx.compose.material3.ButtonDefaults.buttonColors(containerColor = Accent, contentColor = Color(0xFF1A1033)),
                    ) { Icon(Ic.Play, null, Modifier.size(20.dp)); Text(" Ijro", fontWeight = FontWeight.SemiBold) }
                    FilledTonalButton({
                        ps.ctl?.let { c -> if (p.tracks.isNotEmpty()) playFrom(c, p, p.tracks.indices.random(), true) }
                    }) { Icon(Ic.Shuffle, null, Modifier.size(20.dp)); Text(" Aralash") }
                    FilledTonalButton({ onPick(p.id) }) { Icon(Ic.Add, null, Modifier.size(20.dp)); Text(" Qo'shish") }
                }
                if (p.tracks.isEmpty()) {
                    Text("Playlist bo'sh. \"Qo'shish\" orqali musiqa tanlang.", color = Muted, modifier = Modifier.padding(vertical = 24.dp))
                }
            }
        }
        itemsIndexed(p.tracks) { i, t ->
            val now = ps.cur?.mediaId == t.id
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 8.dp).clip(RoundedCornerShape(14.dp))
                    .background(if (now) Accent.copy(alpha = 0.14f) else Color.Transparent)
                    .clickable { ps.ctl?.let { playFrom(it, p, i) } }
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Cover(t.id, Modifier.size(48.dp), 10.dp, 22.dp)
                Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                    Text(t.title, maxLines = 1, overflow = TextOverflow.Ellipsis,
                        color = if (now) Accent else MaterialTheme.colorScheme.onSurface, fontWeight = FontWeight.Medium)
                    Text(t.artist.ifBlank { "Noma'lum ijrochi" }, maxLines = 1, overflow = TextOverflow.Ellipsis,
                        color = Muted, fontSize = 13.sp)
                }
                IconBtn(Ic.Close, "Olib tashlash", { Repo.removeTrack(p.id, t.id) }, Muted, 18.dp)
            }
        }
    }
}

@Composable
fun MiniPlayer(ps: Ps, onOpen: () -> Unit) {
    val c = ps.ctl ?: return
    Surface(
        Modifier.fillMaxWidth().padding(horizontal = 12.dp, vertical = 8.dp).clip(RoundedCornerShape(20.dp)).clickable(onClick = onOpen),
        color = Card,
    ) {
        Column {
            LinearProgressIndicator(
                progress = { if (ps.dur > 0) (ps.pos.toFloat() / ps.dur).coerceIn(0f, 1f) else 0f },
                modifier = Modifier.fillMaxWidth().height(3.dp), color = Accent, trackColor = Color.Transparent,
            )
            Row(Modifier.padding(start = 10.dp, end = 4.dp, top = 8.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                Cover(ps.cur?.mediaId.orEmpty(), Modifier.size(44.dp), 10.dp, 20.dp)
                Column(Modifier.weight(1f).padding(horizontal = 12.dp)) {
                    Text(ps.title, maxLines = 1, overflow = TextOverflow.Ellipsis, fontWeight = FontWeight.SemiBold)
                    Text(ps.artist, maxLines = 1, overflow = TextOverflow.Ellipsis, color = Muted, fontSize = 13.sp)
                }
                IconBtn(Ic.Prev, "Oldingi", { c.seekToPreviousMediaItem() })
                IconBtn(if (ps.playing) Ic.Pause else Ic.Play, "Ijro", { if (ps.playing) c.pause() else c.play() }, Accent, 30.dp)
                IconBtn(Ic.Next, "Keyingi", { c.seekToNextMediaItem() })
            }
        }
    }
}

@Composable
fun NowPlaying(ps: Ps, onClose: () -> Unit) {
    val c = ps.ctl ?: return
    var drag by remember { mutableStateOf<Float?>(null) }
    val value = drag ?: ps.pos.toFloat()
    Column(
        Modifier.fillMaxSize().background(Brush.verticalGradient(listOf(Color(0xFF2A2360), Bg)))
            .statusBarsPadding().navigationBarsPadding().padding(horizontal = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Row(Modifier.fillMaxWidth().padding(top = 8.dp), verticalAlignment = Alignment.CenterVertically) {
            IconBtn(Ic.Down, "Yopish", onClose, size = 30.dp)
            Text("Hozir ijro etilmoqda", Modifier.weight(1f), textAlign = TextAlign.Center, color = Muted, fontSize = 14.sp)
            Spacer(Modifier.width(48.dp))
        }
        Spacer(Modifier.weight(1f))
        Cover(ps.cur?.mediaId.orEmpty(), Modifier.fillMaxWidth(0.85f).aspectRatio(1f), 28.dp, 110.dp)
        Spacer(Modifier.weight(1f))
        Text(ps.title, fontSize = 22.sp, fontWeight = FontWeight.Bold, maxLines = 2, overflow = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center)
        Text(ps.artist, color = Muted, modifier = Modifier.padding(top = 4.dp), maxLines = 1)
        Slider(
            value = value.coerceIn(0f, maxOf(ps.dur, 1L).toFloat()),
            valueRange = 0f..maxOf(ps.dur, 1L).toFloat(),
            onValueChange = { drag = it },
            onValueChangeFinished = { drag?.let { c.seekTo(it.toLong()); ps.pos = it.toLong() }; drag = null },
            colors = SliderDefaults.colors(thumbColor = Accent, activeTrackColor = Accent, inactiveTrackColor = Color(0xFF3A3C5C)),
            modifier = Modifier.padding(top = 16.dp),
        )
        Row(Modifier.fillMaxWidth().padding(horizontal = 4.dp), Arrangement.SpaceBetween) {
            Text(fmt(value.toLong()), color = Muted, fontSize = 12.sp)
            Text(fmt(ps.dur), color = Muted, fontSize = 12.sp)
        }
        Row(Modifier.fillMaxWidth().padding(vertical = 20.dp), Arrangement.SpaceEvenly, Alignment.CenterVertically) {
            IconBtn(Ic.Shuffle, "Aralash", { c.shuffleModeEnabled = !ps.shuffle }, if (ps.shuffle) Accent else Muted)
            IconBtn(Ic.Prev, "Oldingi", { c.seekToPreviousMediaItem() }, size = 36.dp)
            Box(Modifier.size(72.dp).clip(CircleShape).background(Accent).clickable { if (ps.playing) c.pause() else c.play() },
                contentAlignment = Alignment.Center) {
                Icon(if (ps.playing) Ic.Pause else Ic.Play, "Ijro", tint = Color(0xFF1A1033), modifier = Modifier.size(40.dp))
            }
            IconBtn(Ic.Next, "Keyingi", { c.seekToNextMediaItem() }, size = 36.dp)
            IconBtn(Ic.Repeat, "Takrorlash",
                { c.repeatMode = if (ps.repeatAll) Player.REPEAT_MODE_OFF else Player.REPEAT_MODE_ALL },
                if (ps.repeatAll) Accent else Muted)
        }
        Spacer(Modifier.height(12.dp))
    }
}
