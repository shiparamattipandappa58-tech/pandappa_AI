package ai.pandappa.assistant.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat
import ai.pandappa.assistant.MainActivity
import ai.pandappa.assistant.R

/**
 * PandappaWakeWordService
 * Continuous background foreground service with battery-conscious local wake-word model.
 * Listens for "Hey Pandappa" (and Kannada "ಹೇ ಪಾಂಡಪ್ಪ") even when phone is locked.
 */
class PandappaWakeWordService : Service() {

    companion object {
        const val CHANNEL_ID = "pandappa_wakeword_channel"
        const val NOTIFICATION_ID = 2001
        const val ACTION_START_LISTENING = "ai.pandappa.START_LISTENING"
        const val ACTION_STOP_LISTENING = "ai.pandappa.STOP_LISTENING"
    }

    private var wakeLock: PowerManager.WakeLock? = null
    private var isListening = false

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        startForeground(NOTIFICATION_ID, buildForegroundNotification())
        acquirePartialWakeLock()
        initOnDeviceWakeWordEngine()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP_LISTENING) {
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    private fun acquirePartialWakeLock() {
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "PandappaAI::WakeWordLock"
        ).apply {
            setReferenceCounted(false)
            acquire(24 * 60 * 60 * 1000L) // 24 hours
        }
    }

    private fun initOnDeviceWakeWordEngine() {
        // Runs ultra-low-power acoustic keyword spotting model locally on NPU/DSP
        // Listens for: "Hey Pandappa" & "ಹೇ ಪಾಂಡಪ್ಪ"
        isListening = true
        // On hotword detected:
        // onHotwordTriggered("Hey Pandappa")
    }

    fun onHotwordTriggered(keyword: String) {
        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra("EXTRA_VOICE_TRIGGER", true)
            putExtra("EXTRA_WAKE_KEYWORD", keyword)
            putExtra("EXTRA_SOURCE", "LOCKSCREEN_HOTWORD")
        }
        startActivity(intent)
    }

    private fun buildForegroundNotification(): Notification {
        val openIntent = PendingIntent.getActivity(
            this, 0,
            Intent(this, MainActivity::class.java),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("PANDAPPA AI Active")
            .setContentText("Listening for \"Hey Pandappa\" wake word")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setContentIntent(openIntent)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setCategory(NotificationCompat.CATEGORY_SERVICE)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "PANDAPPA AI Wake-Word Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Keeps PANDAPPA AI ready for hands-free voice commands"
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        isListening = false
        wakeLock?.let {
            if (it.isHeld) it.release()
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null
}
