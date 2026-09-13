package de.micwic.familybase.widget

import android.content.Context
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.glance.*
import androidx.glance.action.*
import androidx.glance.appwidget.*
import androidx.glance.appwidget.action.ActionCallback
import androidx.glance.appwidget.action.actionRunCallback
import androidx.glance.background
import androidx.glance.layout.*
import androidx.glance.text.*
import androidx.glance.unit.ColorProvider
import androidx.work.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import de.micwic.familybase.MainActivity
import de.micwic.familybase.data.*
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

private val ItemId=ActionParameters.Key<String>("item_id");private val ItemType=ActionParameters.Key<String>("item_type")
abstract class FamilyWidget(private val kind:String,private val heading:String):GlanceAppWidget(){override suspend fun provideGlance(context:Context,id:GlanceId){val repo=FamilyRepository(context);val data=withContext(Dispatchers.IO){runCatching{repo.sync()}.getOrElse{repo.cached()}};provideContent{val list=when(kind){"shopping"->data.shopping;"todo"->data.todos;else->data.chores};WidgetContent(heading,list,kind,repo.configured())}}}
class ShoppingWidget:FamilyWidget("shopping","Einkaufsliste");class TodoWidget:FamilyWidget("todo","Aufgaben");class ChoreWidget:FamilyWidget("chore","Putzplan heute")
class ShoppingWidgetReceiver:GlanceAppWidgetReceiver(){override val glanceAppWidget=ShoppingWidget()};class TodoWidgetReceiver:GlanceAppWidgetReceiver(){override val glanceAppWidget=TodoWidget()};class ChoreWidgetReceiver:GlanceAppWidgetReceiver(){override val glanceAppWidget=ChoreWidget()}

@Composable private fun WidgetContent(title:String,items:List<FamilyItem>,kind:String,configured:Boolean){Column(GlanceModifier.fillMaxSize().background(ColorProvider(Color(0xFF1B241F))).padding(14.dp)){Row(GlanceModifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically){Text(title,style=TextStyle(color=ColorProvider(Color(0xFFB9F34A)),fontWeight=FontWeight.Bold,fontSize=17.sp),modifier=GlanceModifier.defaultWeight());Text("↻",style=TextStyle(color=ColorProvider(Color(0xFFA6B0A8)),fontSize=18.sp),modifier=GlanceModifier.clickable(actionRunCallback<RefreshAction>()))};Spacer(GlanceModifier.height(8.dp));if(!configured)Text("App öffnen und Gerätezugang einrichten",style=TextStyle(color=ColorProvider(Color(0xFFA6B0A8))),modifier=GlanceModifier.clickable(actionStartActivity<MainActivity>()))else if(items.isEmpty())Text("Alles erledigt",style=TextStyle(color=ColorProvider(Color(0xFFA6B0A8))))else items.take(4).forEach{item->Text("□  ${item.title}",maxLines=1,style=TextStyle(color=ColorProvider(Color(0xFFF3F6F1)),fontSize=14.sp),modifier=GlanceModifier.fillMaxWidth().padding(vertical=5.dp).clickable(actionRunCallback<CompleteAction>(actionParametersOf(ItemId to item.id,ItemType to kind))))}}}
class CompleteAction:ActionCallback{override suspend fun onAction(context:Context,glanceId:GlanceId,parameters:ActionParameters){val id=parameters[ItemId]?:return;val type=parameters[ItemType]?:return;withContext(Dispatchers.IO){runCatching{FamilyRepository(context).complete(type,id)}};WidgetUpdater.updateAll(context)}}
class RefreshAction:ActionCallback{override suspend fun onAction(context:Context,glanceId:GlanceId,parameters:ActionParameters){withContext(Dispatchers.IO){runCatching{FamilyRepository(context).sync()}};WidgetUpdater.updateAll(context)}}
class SyncWorker(context:Context,params:WorkerParameters):CoroutineWorker(context,params){override suspend fun doWork():Result{runCatching{FamilyRepository(applicationContext).sync()}.onFailure{return Result.retry()};WidgetUpdater.updateAll(applicationContext);return Result.success()}}
object WidgetUpdater{fun schedule(context:Context,minutes:Long=30){WorkManager.getInstance(context).enqueueUniquePeriodicWork("family-base-sync",ExistingPeriodicWorkPolicy.UPDATE,PeriodicWorkRequestBuilder<SyncWorker>(minutes.coerceAtLeast(15),TimeUnit.MINUTES).setConstraints(Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()).build())};suspend fun updateAll(context:Context){ShoppingWidget().updateAll(context);TodoWidget().updateAll(context);ChoreWidget().updateAll(context)}}
