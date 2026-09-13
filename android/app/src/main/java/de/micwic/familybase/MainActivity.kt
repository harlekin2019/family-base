package de.micwic.familybase

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import de.micwic.familybase.data.*
import de.micwic.familybase.widget.WidgetUpdater
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity:ComponentActivity(){override fun onCreate(state:Bundle?){super.onCreate(state);WidgetUpdater.schedule(this,SecureConfig(this).interval().toLong());setContent{FamilyBaseApp(FamilyRepository(this))}}}

@Composable fun FamilyBaseApp(repo:FamilyRepository){
    val green=Color(0xFFB9F34A);val bg=Color(0xFF101613);val secure=SecureConfig(LocalContext.current);var server by remember{mutableStateOf(secure.server())};var token by remember{mutableStateOf("")};var interval by remember{mutableIntStateOf(secure.interval())};var snapshot by remember{mutableStateOf(repo.cached())};var status by remember{mutableStateOf("")};val scope=rememberCoroutineScope()
    MaterialTheme(colorScheme=darkColorScheme(primary=green,background=bg,surface=Color(0xFF1B241F))){Surface(Modifier.fillMaxSize()){LazyColumn(Modifier.fillMaxSize().padding(20.dp),verticalArrangement=Arrangement.spacedBy(14.dp)){
        item{Text("Family Base",style=MaterialTheme.typography.headlineLarge,fontWeight=FontWeight.Bold);Text("Android & Widgets",color=Color.Gray)}
        item {
            val context=LocalContext.current
            OutlinedTextField(server,{server=it},label={Text("HTTPS-Adresse deines Servers")},modifier=Modifier.fillMaxWidth(),singleLine=true)
            Spacer(Modifier.height(8.dp))
            OutlinedTextField(token,{token=it},label={Text("Gerätezugang aus der Administration")},modifier=Modifier.fillMaxWidth(),singleLine=true)
            Spacer(Modifier.height(8.dp))
            Text("Automatische Aktualisierung",style=MaterialTheme.typography.labelLarge)
            Row(horizontalArrangement=Arrangement.spacedBy(6.dp)){listOf(15,30,60,180).forEach{value->FilterChip(selected=interval==value,onClick={interval=value},label={Text(if(value<60)"$value Min." else "${value/60} Std.")})}}
            Button(onClick={ scope.launch { try { repo.configure(server,token); secure.saveInterval(interval); WidgetUpdater.schedule(context,interval.toLong()); snapshot=withContext(Dispatchers.IO){repo.sync()}; WidgetUpdater.updateAll(context); token=""; status="Verbunden als ${snapshot.member}" } catch(e:Exception) { status=e.message.orEmpty() } } },modifier=Modifier.fillMaxWidth()){Text("Verbinden und synchronisieren")}
            if(status.isNotBlank()) Text(status,color=if(status.startsWith("Verbunden"))green else Color(0xFFFF8585))
        }
        item{Section("Einkaufsliste",snapshot.shopping)};item{Section("Offene Aufgaben",snapshot.todos)};item{Section("Heutiger Putzplan",snapshot.chores)}
    }}}
}

@Composable private fun Section(title:String,entries:List<FamilyItem>){Column(Modifier.fillMaxWidth().background(Color(0xFF1B241F),MaterialTheme.shapes.large).padding(16.dp)){Text(title,fontWeight=FontWeight.Bold,color=Color(0xFFB9F34A));Spacer(Modifier.height(8.dp));if(entries.isEmpty())Text("Aktuell keine Einträge",color=Color.Gray) else entries.take(5).forEach{Text("○  ${it.title}",modifier=Modifier.padding(vertical=4.dp))}}}
