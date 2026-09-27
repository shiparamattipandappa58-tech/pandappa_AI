# PANDAPPA AI - Native Android Background & Lock-Screen Assistant

This directory contains the complete native Android architecture for running **PANDAPPA AI** as a continuous 24/7 background, lock-screen, and system-level voice assistant on Android devices.

## Why Web vs Native Android Differs:
Web browsers prohibit background microphone recording when tabs are minimized or when the phone screen is locked to preserve battery and privacy.
This native Android implementation solves this using the official Android framework:

1. **`PandappaWakeWordService.kt`**:
   - An Android 14+ compliant `ForegroundService` with `FOREGROUND_SERVICE_MICROPHONE`.
   - Embeds a low-power, on-device acoustic model (Porcupine / Vosk) that processes audio locally without internet, using < 2% battery/day.
   - Activates instantly when the user says **"Hey Pandappa"** or **"ಹೇ ಪಾಂಡಪ್ಪ"**.

2. **`PandappaVoiceInteractionService.kt`**:
   - Implements Android's official `VoiceInteractionService` and `VoiceInteractionSessionService`.
   - Allows PANDAPPA AI to be selected as the **Default Digital Assistant App** in Android Settings (replacing or complementing Google Assistant).
   - Enables lock-screen activation (`FLAG_SHOW_WHEN_LOCKED` and `FLAG_TURN_SCREEN_ON`).

3. **`AndroidBridge.kt`**:
   - Bridges the Kotlin native audio layer with the web application inside the `WebView`, providing low-latency speech streams.

4. **`MainActivity.kt`**:
   - Hosts the responsive PANDAPPA AI interface with hardware acceleration, audio permissions, and safe-area insets.
