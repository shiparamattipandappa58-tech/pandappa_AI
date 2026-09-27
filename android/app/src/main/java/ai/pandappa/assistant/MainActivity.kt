package ai.pandappa.assistant

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import android.view.HapticFeedbackConstants
import android.view.WindowManager
import android.webkit.PermissionRequest
import android.webkit.WebChromeClient
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import ai.pandappa.assistant.bridge.AndroidBridge
import ai.pandappa.assistant.service.PandappaWakeWordService

/**
 * MainActivity
 * Runs full-screen with lock-screen bypass capability for PANDAPPA AI Voice Assistant.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private val RECORD_AUDIO_PERMISSION_CODE = 3001

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Allow assistant to appear on top of lock-screen if awakened by voice
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        } else {
            @Suppress("DEPRECATION")
            window.addFlags(
                WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON
            )
        }

        webView = WebView(this)
        setContentView(webView)

        setupWebView()
        checkPermissions()
        startWakeWordService()
        handleIncomingIntent(intent)
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun setupWebView() {
        val settings: WebSettings = webView.settings
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.mediaPlaybackRequiresUserGesture = false
        settings.cacheMode = WebSettings.LOAD_DEFAULT

        webView.addJavascriptInterface(AndroidBridge(this, this), "AndroidBridge")

        webView.webChromeClient = object : WebChromeClient() {
            override fun onPermissionRequest(request: PermissionRequest) {
                // Auto-grant microphone permission to local origin
                request.grant(request.resources)
            }
        }

        webView.webViewClient = WebViewClient()
        // Load production app URL or local asset bundle
        webView.loadUrl("https://localhost:3000")
    }

    private fun checkPermissions() {
        val permissionsNeeded = mutableListOf<String>()
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            permissionsNeeded.add(Manifest.permission.RECORD_AUDIO)
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                permissionsNeeded.add(Manifest.permission.POST_NOTIFICATIONS)
            }
        }
        if (permissionsNeeded.isNotEmpty()) {
            ActivityCompat.requestPermissions(this, permissionsNeeded.toTypedArray(), RECORD_AUDIO_PERMISSION_CODE)
        }
    }

    private fun startWakeWordService() {
        val serviceIntent = Intent(this, PandappaWakeWordService::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent)
        } else {
            startService(serviceIntent)
        }
    }

    private fun handleIncomingIntent(intent: Intent?) {
        if (intent?.getBooleanExtra("EXTRA_VOICE_TRIGGER", false) == true) {
            // Trigger Voice Mode inside WebView
            webView.evaluateJavascript("window.__pandappaTriggerVoiceMode && window.__pandappaTriggerVoiceMode();", null)
        }
    }

    override fun onNewIntent(intent: Intent?) {
        super.onNewIntent(intent)
        handleIncomingIntent(intent)
    }

    fun startNativeSpeechRecognizer() {
        // Invoked via JS bridge
    }

    fun stopNativeSpeechRecognizer() {
        // Invoked via JS bridge
    }

    fun triggerHapticFeedback() {
        webView.performHapticFeedback(HapticFeedbackConstants.LONG_PRESS)
    }
}
