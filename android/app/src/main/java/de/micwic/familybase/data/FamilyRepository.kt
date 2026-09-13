package de.micwic.familybase.data

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

data class FamilyItem(val id:String,val title:String,val detail:String="")
data class FamilySnapshot(val member:String="",val shopping:List<FamilyItem> = emptyList(),val todos:List<FamilyItem> = emptyList(),val chores:List<FamilyItem> = emptyList())

class SecureConfig(private val context:Context) {
    private val prefs=context.getSharedPreferences("family_base",Context.MODE_PRIVATE)
    private val alias="family_base_device_key"
    private fun key():SecretKey { val ks=KeyStore.getInstance("AndroidKeyStore").apply{load(null)}; (ks.getKey(alias,null) as? SecretKey)?.let{return it}; return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES,"AndroidKeyStore").run{init(KeyGenParameterSpec.Builder(alias,KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());generateKey()} }
    fun save(server:String,token:String){require(server.startsWith("https://")){"Es sind nur HTTPS-Adressen erlaubt."}; val c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.ENCRYPT_MODE,key()); val value=c.iv+ c.doFinal(token.toByteArray());prefs.edit().putString("server",server.trimEnd('/')).putString("token",android.util.Base64.encodeToString(value,android.util.Base64.NO_WRAP)).apply()}
    fun server()=prefs.getString("server","").orEmpty()
    fun interval()=prefs.getInt("interval",30)
    fun saveInterval(minutes:Int)=prefs.edit().putInt("interval",minutes.coerceAtLeast(15)).apply()
    fun token():String { val raw=prefs.getString("token",null)?:return "";return try{val data=android.util.Base64.decode(raw,android.util.Base64.NO_WRAP);val c=Cipher.getInstance("AES/GCM/NoPadding");c.init(Cipher.DECRYPT_MODE,key(),GCMParameterSpec(128,data.copyOfRange(0,12)));String(c.doFinal(data.copyOfRange(12,data.size)))}catch(_:Exception){""} }
}

class FamilyRepository(private val context:Context){
    private val config=SecureConfig(context)
    private val cache=context.getSharedPreferences("family_cache",Context.MODE_PRIVATE)
    fun configured()=config.server().isNotBlank()&&config.token().isNotBlank()
    fun configure(server:String,token:String)=config.save(server,token)
    fun cached()=parse(cache.getString("snapshot",null)?:"{}")
    fun sync():FamilySnapshot { val text=request("GET",null);cache.edit().putString("snapshot",text).apply();return parse(text) }
    fun complete(type:String,id:String):FamilySnapshot { val action=when(type){"shopping"->"toggle-shopping";"todo"->"toggle-todo";else->"complete-chore"};val text=request("POST",JSONObject().put("action",action).put("id",id).toString());cache.edit().putString("snapshot",text).apply();return parse(text) }
    private fun request(method: String, body: String?): String {
        val base = config.server()
        val token = config.token()
        require(base.isNotBlank() && token.isNotBlank()) {
            "Bitte Server und Gerätezugang einrichten."
        }
        val connection = URL("$base/api/mobile").openConnection() as HttpURLConnection
        connection.requestMethod = method
        connection.connectTimeout = 12_000
        connection.readTimeout = 12_000
        connection.setRequestProperty("Authorization", "Bearer $token")
        connection.setRequestProperty("Accept", "application/json")
        if (body != null) {
            connection.doOutput = true
            connection.setRequestProperty("Content-Type", "application/json")
            connection.outputStream.use { stream ->
                stream.write(body.toByteArray())
            }
        }
        val code = connection.responseCode
        val responseStream = if (code in 200..299) {
            connection.inputStream
        } else {
            connection.errorStream
        }
        val responseText = responseStream.bufferedReader().use { it.readText() }
        if (code !in 200..299) {
            throw IllegalStateException(
                JSONObject(responseText).optString("error", "Serverfehler $code")
            )
        }
        return responseText
    }
    private fun parse(text:String):FamilySnapshot { val root=JSONObject(text);fun items(name:String,title:String,detail:String)=root.optJSONArray(name)?.let{arr->(0 until arr.length()).map{arr.getJSONObject(it)}.map{FamilyItem(it.getString("id"),it.optString(title),it.optString(detail))}}?: emptyList();return FamilySnapshot(root.optJSONObject("member")?.optString("name").orEmpty(),items("shopping","name","quantity"),items("todos","title","project"),items("chores","title","points")) }
}
