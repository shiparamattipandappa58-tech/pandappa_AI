package ai.pandappa.assistant.bridge

import android.content.Context
import android.webkit.JavascriptInterface
import android.widget.Toast
import ai.pandappa.assistant.MainActivity

/**
 * AndroidBridge
 * Injected into WebView as `window.AndroidBridge`
 * Provides low-latency interop between web UI and Android OS capabilities.
 */
class AndroidBridge(private val context: Context, private val activity: MainActivity) {

    @JavascriptInterface
    fun isNative(): Boolean {
        return true
    }

    @JavascriptInterface
    fun getPlatform(): String {
        return "Android"
    }

    @JavascriptInterface
    fun onAction(action: String, payloadJson: String) {
        activity.runOnUiThread {
            when (action) {
                "START_VOICE_CAPTURE" -> {
                    activity.startNativeSpeechRecognizer()
                }
                "STOP_VOICE_CAPTURE" -> {
                    activity.stopNativeSpeechRecognizer()
                }
                "PLAY_HAPTIC" -> {
                    activity.triggerHapticFeedback()
                }
                "SHOW_TOAST" -> {
                    Toast.makeText(context, payloadJson, Toast.LENGTH_SHORT).show()
                }
            }
        }
    }
}
