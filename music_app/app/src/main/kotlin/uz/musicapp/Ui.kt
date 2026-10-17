package uz.musicapp

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.graphics.vector.PathParser
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

val Bg = Color(0xFF0D0E1A)
val Card = Color(0xFF1B1D33)
val Accent = Color(0xFF9D8CFF)
val Muted = Color(0xFFA9A8C8)

private val scheme = darkColorScheme(
    primary = Accent, onPrimary = Color(0xFF1A1033),
    secondary = Color(0xFFFF7EB6),
    background = Bg, surface = Bg, onSurface = Color(0xFFEDEBFF),
    surfaceVariant = Card, onSurfaceVariant = Muted,
)

@Composable
fun AppTheme(content: @Composable () -> Unit) = MaterialTheme(colorScheme = scheme, content = content)

private fun icon(name: String, path: String) =
    ImageVector.Builder(name, 24.dp, 24.dp, 24f, 24f)
        .addPath(PathParser().parsePathString(path).toNodes(), fill = SolidColor(Color.Black)).build()

object Ic {
    val Play = icon("play", "M8,5v14l11,-7z")
    val Pause = icon("pause", "M6,19h4V5H6v14zm8,-14v14h4V5h-4z")
    val Next = icon("next", "M6,18l8.5,-6L6,6v12zM16,6v12h2V6h-2z")
    val Prev = icon("prev", "M6,6h2v12H6zm3.5,6l8.5,6V6z")
    val Shuffle = icon("shuffle", "M10.59,9.17L5.41,4 4,5.41l5.17,5.17 1.42,-1.41zM14.5,4l2.04,2.04L4,18.59 5.41,20 17.96,7.46 20,9.5V4h-5.5zm0.33,9.41l-1.41,1.41 3.13,3.13L14.5,20H20v-5.5l-2.04,2.04 -3.13,-3.13z")
    val Repeat = icon("repeat", "M7,7h10v3l4,-4 -4,-4v3H5v6h2V7zm10,10H7v-3l-4,4 4,4v-3h12v-6h-2v4z")
    val Add = icon("add", "M19,13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z")
    val Delete = icon("delete", "M6,19c0,1.1 0.9,2 2,2h8c1.1,0 2,-0.9 2,-2V7H6v12zM19,4h-3.5l-1,-1h-5l-1,1H5v2h14V4z")
    val Close = icon("close", "M19,6.41L17.59,5 12,10.59 6.41,5 5,6.41 10.59,12 5,17.59 6.41,19 12,13.41 17.59,19 19,17.59 13.41,12z")
    val Back = icon("back", "M20,11H7.83l5.59,-5.59L12,4l-8,8 8,8 1.41,-1.41L7.83,13H20v-2z")
    val Down = icon("down", "M7.41,8.59L12,13.17l4.59,-4.58L18,10l-6,6 -6,-6 1.41,-1.41z")
    val Note = icon("note", "M12,3v10.55c-0.59,-0.34 -1.27,-0.55 -2,-0.55 -2.21,0 -4,1.79 -4,4s1.79,4 4,4 4,-1.79 4,-4V7h4V3h-6z")
    val Playlist = icon("playlist", "M15,6H3v2h12V6zM15,10H3v2h12v-2zM3,16h8v-2H3v2zM17,6v8.18c-0.31,-0.11 -0.65,-0.18 -1,-0.18 -1.66,0 -3,1.34 -3,3s1.34,3 3,3 3,-1.34 3,-3V8h3V6h-5z")
}

private fun coverBrush(seed: String): Brush {
    val h = (seed.hashCode() and 0x7fffffff) % 360
    return Brush.linearGradient(listOf(Color.hsv(h.toFloat(), 0.55f, 0.85f), Color.hsv(((h + 50) % 360).toFloat(), 0.65f, 0.5f)))
}

@Composable
fun Cover(seed: String, modifier: Modifier, radius: Dp, iconSize: Dp) {
    Box(modifier.clip(RoundedCornerShape(radius)).background(coverBrush(seed)), contentAlignment = Alignment.Center) {
        Icon(Ic.Note, null, tint = Color.White.copy(alpha = 0.85f), modifier = Modifier.size(iconSize))
    }
}

@Composable
fun IconBtn(icon: ImageVector, desc: String, onClick: () -> Unit, tint: Color = Color(0xFFEDEBFF),
            size: Dp = 24.dp, modifier: Modifier = Modifier) {
    IconButton(onClick, modifier) { Icon(icon, desc, tint = tint, modifier = Modifier.size(size)) }
}

fun fmt(ms: Long): String {
    val s = maxOf(0L, ms) / 1000
    return "%d:%02d".format(s / 60, s % 60)
}
