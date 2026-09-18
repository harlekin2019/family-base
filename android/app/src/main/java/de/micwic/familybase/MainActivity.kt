package de.micwic.familybase

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.ui.unit.dp
import de.micwic.familybase.data.*
import de.micwic.familybase.widget.WidgetUpdater
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : ComponentActivity() {
    override fun onCreate(state: Bundle?) {
        super.onCreate(state)
        WidgetUpdater.schedule(this, SecureConfig(this).interval().toLong())
        setContent { FamilyBaseApp(FamilyRepository(this)) }
    }
}

private val Green = Color(0xFFB9F34A)
private val Background = Color(0xFF101613)
private val SurfaceDark = Color(0xFF1B241F)
private val ErrorRed = Color(0xFFFF8585)
private val categories = listOf("Obst & Gemüse", "Backwaren", "Kühlregal", "Fleisch & Fisch", "Tiefkühlkost", "Getränke", "Vorräte", "Hygiene", "Haushalt", "Sonstiges")
private val cleaningCatalog = mapOf(
    "Küche" to listOf("Spülmaschine einräumen", "Spülmaschine ausräumen", "Arbeitsflächen abwischen", "Herd reinigen", "Kühlschrank auswischen", "Boden wischen"),
    "Badezimmer" to listOf("Waschbecken reinigen", "Toilette reinigen", "Dusche reinigen", "Spiegel putzen", "Boden wischen"),
    "Wohnzimmer" to listOf("Staub wischen", "Sofa absaugen", "Aufräumen", "Boden saugen", "Fenster putzen"),
    "Schlafzimmer" to listOf("Bett machen", "Bettwäsche wechseln", "Schmutzwäsche einsammeln", "Boden saugen"),
    "Kinderzimmer" to listOf("Spielzeug einräumen", "Schreibtisch aufräumen", "Bücher einräumen", "Boden saugen"),
    "Hauswirtschaftsraum" to listOf("Waschmaschine einräumen", "Waschmaschine ausräumen", "Trockner einräumen", "Trockner ausräumen", "Wäsche zusammenlegen"),
    "Gesamtes Zuhause" to listOf("Mülleimer leeren", "Getränkekisten einräumen", "Mülltonnen rausstellen", "Staubsaugen", "Böden wischen")
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun FamilyBaseApp(repo: FamilyRepository) {
    val context = LocalContext.current
    val secure = remember { SecureConfig(context) }
    val scope = rememberCoroutineScope()
    var snapshot by remember { mutableStateOf(repo.cached()) }
    var selectedTab by remember { mutableIntStateOf(0) }
    var editor by remember { mutableStateOf<String?>(null) }
    var editing by remember { mutableStateOf<FamilyItem?>(null) }
    var showSetup by remember { mutableStateOf(!repo.configured()) }
    var status by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }

    fun runAction(action: String, values: Map<String, Any?> = emptyMap()) {
        scope.launch {
            busy = true
            try {
                snapshot = withContext(Dispatchers.IO) { repo.mutate(action, values) }
                WidgetUpdater.updateAll(context)
                editor = null
                editing = null
                status = "Gespeichert"
            } catch (error: Exception) {
                status = error.message ?: "Die Änderung konnte nicht gespeichert werden."
            } finally { busy = false }
        }
    }

    MaterialTheme(colorScheme = darkColorScheme(primary = Green, background = Background, surface = SurfaceDark)) {
        Scaffold(
            topBar = {
                Column {
                    TopAppBar(
                        title = { Column { Text("Family Base", fontWeight = FontWeight.Bold); Text(snapshot.member.ifBlank { "Android" }, style = MaterialTheme.typography.labelMedium, color = Color.Gray) } },
                        actions = {
                            TextButton(onClick = { showSetup = !showSetup }) { Text(if (showSetup) "Schließen" else "Verbindung") }
                            TextButton(onClick = {
                                scope.launch {
                                    busy = true
                                    try { snapshot = withContext(Dispatchers.IO) { repo.sync() }; WidgetUpdater.updateAll(context); status = "Aktualisiert" }
                                    catch (error: Exception) { status = error.message.orEmpty() }
                                    finally { busy = false }
                                }
                            }) { Text("↻") }
                        }
                    )
                    TabRow(selectedTabIndex = selectedTab) {
                        listOf("Einkauf", "Aufgaben", "Putzplan").forEachIndexed { index, title ->
                            Tab(selected = selectedTab == index, onClick = { selectedTab = index }, text = { Text(title) })
                        }
                    }
                }
            },
            floatingActionButton = {
                FloatingActionButton(onClick = {
                    editing = null
                    editor = listOf("shopping", "todo", "chore")[selectedTab]
                }) { Text("+", style = MaterialTheme.typography.headlineMedium) }
            }
        ) { padding ->
            Column(Modifier.fillMaxSize().padding(padding)) {
                if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                if (showSetup) ConnectionPanel(repo, secure, snapshot, { snapshot = it }, { status = it }, { showSetup = false })
                if (status.isNotBlank()) Text(status, color = if (status == "Gespeichert" || status == "Aktualisiert" || status.startsWith("Verbunden")) Green else ErrorRed, modifier = Modifier.padding(horizontal = 16.dp, vertical = 6.dp))
                val entries = when (selectedTab) { 0 -> snapshot.shopping; 1 -> snapshot.todos; else -> snapshot.chores }
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 12.dp, bottom = 92.dp),
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    if (entries.isEmpty()) item { Card(Modifier.fillMaxWidth()) { Text("Aktuell keine offenen Einträge", modifier = Modifier.padding(22.dp), color = Color.Gray) } }
                    items(entries, key = { it.id }) { item ->
                        EntryCard(
                            item = item,
                            kind = listOf("shopping", "todo", "chore")[selectedTab],
                            memberName = snapshot.members.firstOrNull { it.id == item.memberId }?.name.orEmpty(),
                            onDone = { repoType, id -> runAction(when (repoType) { "shopping" -> "toggle-shopping"; "todo" -> "toggle-todo"; else -> "complete-chore" }, mapOf("id" to id)) },
                            onEdit = { editing = item; editor = listOf("shopping", "todo", "chore")[selectedTab] },
                            onDelete = { runAction("delete-${listOf("shopping", "todo", "chore")[selectedTab]}", mapOf("id" to item.id)) }
                        )
                    }
                }
            }
        }
        when (editor) {
            "shopping" -> ShoppingDialog(editing, { editor = null }, { values -> runAction(if (editing == null) "create-shopping" else "update-shopping", values + mapOf("id" to editing?.id)) })
            "todo" -> TodoDialog(editing, snapshot, { editor = null }, { values -> runAction(if (editing == null) "create-todo" else "update-todo", values + mapOf("id" to editing?.id)) })
            "chore" -> ChoreDialog(editing, snapshot, { editor = null }, { values -> runAction(if (editing == null) "create-chore" else "update-chore", values + mapOf("id" to editing?.id)) })
        }
    }
}

@Composable
private fun ConnectionPanel(repo: FamilyRepository, secure: SecureConfig, snapshot: FamilySnapshot, setSnapshot: (FamilySnapshot) -> Unit, setStatus: (String) -> Unit, close: () -> Unit) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var server by remember { mutableStateOf(secure.server()) }
    var token by remember { mutableStateOf("") }
    var interval by remember { mutableIntStateOf(secure.interval()) }
    Card(Modifier.fillMaxWidth().padding(16.dp)) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            OutlinedTextField(server, { server = it }, label = { Text("HTTPS-Adresse des Servers") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            OutlinedTextField(token, { token = it }, label = { Text("Gerätezugang") }, modifier = Modifier.fillMaxWidth(), singleLine = true)
            Text("Aktualisierung", style = MaterialTheme.typography.labelLarge)
            Row(horizontalArrangement = Arrangement.spacedBy(5.dp)) { listOf(15, 30, 60, 180).forEach { value -> FilterChip(selected = interval == value, onClick = { interval = value }, label = { Text(if (value < 60) "$value Min." else "${value / 60} Std.") }) } }
            Button(onClick = {
                scope.launch {
                    try {
                        if (token.isNotBlank()) repo.configure(server, token)
                        secure.saveInterval(interval)
                        WidgetUpdater.schedule(context, interval.toLong())
                        val current = withContext(Dispatchers.IO) { repo.sync() }
                        setSnapshot(current)
                        WidgetUpdater.updateAll(context)
                        token = ""
                        setStatus("Verbunden als ${current.member}")
                        close()
                    } catch (error: Exception) { setStatus(error.message.orEmpty()) }
                }
            }, modifier = Modifier.fillMaxWidth()) { Text(if (snapshot.member.isBlank()) "Verbinden" else "Einstellungen speichern") }
        }
    }
}

@Composable
private fun EntryCard(item: FamilyItem, kind: String, memberName: String, onDone: (String, String) -> Unit, onEdit: () -> Unit, onDelete: () -> Unit) {
    Card(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(14.dp)) {
            Text(item.title, fontWeight = FontWeight.Bold)
            val detail = when (kind) {
                "shopping" -> listOf(item.detail, item.category).filter { it.isNotBlank() }.joinToString(" · ")
                "todo" -> listOf(item.detail, memberName, formatDate(item.dueAt)).filter { it.isNotBlank() }.joinToString(" · ")
                else -> listOf(memberName, formatDate(item.dueAt), "${item.points} Punkte", repeatLabel(item.repeatRule)).filter { it.isNotBlank() }.joinToString(" · ")
            }
            if (detail.isNotBlank()) Text(detail, style = MaterialTheme.typography.bodySmall, color = Color.Gray)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                TextButton(onClick = { onDone(kind, item.id) }) { Text(if (kind == "shopping") "Abhaken" else "Erledigt") }
                TextButton(onClick = onEdit) { Text("Ändern") }
                TextButton(onClick = onDelete, colors = ButtonDefaults.textButtonColors(contentColor = ErrorRed)) { Text("Löschen") }
            }
        }
    }
}

@Composable
private fun ShoppingDialog(item: FamilyItem?, dismiss: () -> Unit, save: (Map<String, Any?>) -> Unit) {
    var name by remember { mutableStateOf(item?.title.orEmpty()) }
    var quantity by remember { mutableStateOf(item?.detail.orEmpty()) }
    var category by remember { mutableStateOf(item?.category?.ifBlank { "Sonstiges" } ?: "Sonstiges") }
    FormDialog(if (item == null) "Artikel hinzufügen" else "Artikel ändern", dismiss, name.isNotBlank(), { save(mapOf("name" to name, "quantity" to quantity, "category" to category)) }) {
        OutlinedTextField(name, { name = it }, label = { Text("Artikel") }, modifier = Modifier.fillMaxWidth())
        OutlinedTextField(quantity, { quantity = it }, label = { Text("Menge") }, modifier = Modifier.fillMaxWidth())
        ChoiceField("Kategorie", category, categories, { it }, { category = it })
    }
}

@Composable
private fun TodoDialog(item: FamilyItem?, data: FamilySnapshot, dismiss: () -> Unit, save: (Map<String, Any?>) -> Unit) {
    var title by remember { mutableStateOf(item?.title.orEmpty()) }
    var projectId by remember { mutableStateOf(item?.projectId ?: data.projects.firstOrNull()?.id.orEmpty()) }
    var memberId by remember { mutableStateOf(item?.memberId.orEmpty()) }
    var due by remember { mutableStateOf(formatEditorDate(item?.dueAt ?: 0)) }
    val valid = title.isNotBlank() && projectId.isNotBlank() && (due.isBlank() || parseDate(due) != null)
    FormDialog(if (item == null) "Aufgabe hinzufügen" else "Aufgabe ändern", dismiss, valid, { save(mapOf("title" to title, "projectId" to projectId, "memberId" to memberId, "dueAt" to parseDate(due))) }) {
        OutlinedTextField(title, { title = it }, label = { Text("Aufgabe") }, modifier = Modifier.fillMaxWidth())
        ChoiceField("Projekt", projectId, data.projects, { it.name }, { projectId = it.id })
        ChoiceField("Mitglied", memberId, listOf(Choice("", "Gemeinsam / nicht zugeordnet")) + data.members, { it.name }, { memberId = it.id })
        DateField(due, { due = it }, required = false)
    }
}

@Composable
private fun ChoreDialog(item: FamilyItem?, data: FamilySnapshot, dismiss: () -> Unit, save: (Map<String, Any?>) -> Unit) {
    var room by remember { mutableStateOf("") }
    var title by remember { mutableStateOf(item?.title.orEmpty()) }
    var memberId by remember { mutableStateOf(item?.memberId.orEmpty()) }
    var due by remember { mutableStateOf(formatEditorDate(item?.dueAt ?: 0).ifBlank { formatEditorDate(System.currentTimeMillis() / 1000 + 3600) }) }
    var points by remember { mutableStateOf((item?.points?.takeIf { it > 0 } ?: 10).toString()) }
    var repeat by remember { mutableStateOf(repeatValue(item?.repeatRule.orEmpty())) }
    var rotate by remember { mutableStateOf(false) }
    val rotationMembers = remember { mutableStateListOf<String>() }
    val weekdays = remember { mutableStateListOf<Int>() }
    val valid = title.isNotBlank() && parseDate(due) != null && points.toIntOrNull() != null
    FormDialog(if (item == null) "Putzaufgabe hinzufügen" else "Putzaufgabe ändern", dismiss, valid, {
        save(mapOf("title" to title, "memberId" to memberId, "dueAt" to parseDate(due), "points" to points.toIntOrNull(), "repeatRule" to repeat, "weekdays" to JSONArray(weekdays), "rotationMemberIds" to JSONArray(if (rotate) rotationMembers else emptyList<String>())))
    }) {
        ChoiceField("Raum", room, cleaningCatalog.keys.toList(), { it }, { room = it })
        if (room.isNotBlank()) ChoiceField("Tätigkeit", "", cleaningCatalog[room].orEmpty(), { it }, { task -> title = "$room – $task" })
        OutlinedTextField(title, { title = it }, label = { Text("Aufgabe") }, modifier = Modifier.fillMaxWidth())
        Row(verticalAlignment = Alignment.CenterVertically) {
            Checkbox(checked = rotate, onCheckedChange = { rotate = it })
            Text("Mitglieder abwechselnd zuordnen")
        }
        if (rotate) {
            Text("Reihenfolge auswählen", style = MaterialTheme.typography.labelLarge)
            data.members.forEach { member ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Checkbox(
                        checked = member.id in rotationMembers,
                        onCheckedChange = { checked -> if (checked) rotationMembers.add(member.id) else rotationMembers.remove(member.id) }
                    )
                    Text(member.name)
                }
            }
        } else {
            ChoiceField("Mitglied", memberId, listOf(Choice("", "Gemeinsam / nicht zugeordnet")) + data.members, { it.name }, { memberId = it.id })
        }
        DateField(due, { due = it }, required = true)
        ChoiceField("Wiederholung", repeat, listOf("", "weekly", "biweekly", "monthly"), { when (it) { "weekly" -> "Wöchentlich"; "biweekly" -> "Alle zwei Wochen"; "monthly" -> "Monatlich"; else -> "Einmalig" } }, { repeat = it })
        if (repeat == "weekly" || repeat == "biweekly") {
            Text("Wochentage", style = MaterialTheme.typography.labelLarge)
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                listOf("Mo", "Di", "Mi", "Do", "Fr", "Sa", "So").forEachIndexed { index, day ->
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Checkbox(checked = index + 1 in weekdays, onCheckedChange = { checked -> if (checked) weekdays.add(index + 1) else weekdays.remove(index + 1) })
                        Text(day, style = MaterialTheme.typography.labelSmall)
                    }
                }
            }
        }
        OutlinedTextField(points, { points = it }, label = { Text("Punkte") }, modifier = Modifier.fillMaxWidth(), keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number))
    }
}

@Composable
private fun FormDialog(title: String, dismiss: () -> Unit, valid: Boolean, save: () -> Unit, content: @Composable ColumnScope.() -> Unit) {
    AlertDialog(
        onDismissRequest = dismiss,
        title = { Text(title) },
        text = { Column(Modifier.heightIn(max = 520.dp).verticalScroll(rememberScrollState()), verticalArrangement = Arrangement.spacedBy(9.dp), content = content) },
        confirmButton = { Button(onClick = save, enabled = valid) { Text("Speichern") } },
        dismissButton = { TextButton(onClick = dismiss) { Text("Abbrechen") } }
    )
}

@Composable
private fun <T> ChoiceField(label: String, selected: String, choices: List<T>, display: (T) -> String, choose: (T) -> Unit) {
    var open by remember { mutableStateOf(false) }
    val selectedChoice = choices.firstOrNull { choice -> when (choice) { is Choice -> choice.id == selected; else -> choice.toString() == selected } }
    Box(Modifier.fillMaxWidth()) {
        OutlinedButton(onClick = { open = true }, modifier = Modifier.fillMaxWidth()) {
            Text("$label: ${selectedChoice?.let(display) ?: "Auswählen"}", modifier = Modifier.weight(1f))
            Text("▾")
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            choices.forEach { choice -> DropdownMenuItem(text = { Text(display(choice)) }, onClick = { choose(choice); open = false }) }
        }
    }
}

@Composable
private fun DateField(value: String, change: (String) -> Unit, required: Boolean) {
    OutlinedTextField(value, change, label = { Text(if (required) "Termin (TT.MM.JJJJ HH:mm)" else "Fälligkeit – optional") }, modifier = Modifier.fillMaxWidth(), supportingText = { if (value.isNotBlank() && parseDate(value) == null) Text("Format: 31.12.2026 18:30", color = ErrorRed) })
}

private fun formatDate(seconds: Long): String = if (seconds <= 0) "" else SimpleDateFormat("dd.MM.yyyy HH:mm", Locale.GERMANY).format(Date(seconds * 1000))
private fun formatEditorDate(seconds: Long) = formatDate(seconds)
private fun parseDate(value: String): Long? = if (value.isBlank()) null else try { SimpleDateFormat("dd.MM.yyyy HH:mm", Locale.GERMANY).apply { isLenient = false }.parse(value)?.time?.div(1000) } catch (_: Exception) { null }
private fun repeatValue(value: String) = when { value.contains("biweekly") -> "biweekly"; value.contains("weekly") -> "weekly"; value.contains("monthly") -> "monthly"; else -> "" }
private fun repeatLabel(value: String) = when (repeatValue(value)) { "weekly" -> "wöchentlich"; "biweekly" -> "alle 2 Wochen"; "monthly" -> "monatlich"; else -> "" }
