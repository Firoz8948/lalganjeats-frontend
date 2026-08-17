package com.lalganjeats.customer;

import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.View;

import androidx.core.graphics.Insets;
import androidx.core.view.ViewCompat;
import androidx.core.view.WindowInsetsCompat;

import com.getcapacitor.BridgeActivity;

/**
 * Android 15+ lays every window out edge to edge, so the WebView would sit
 * underneath the status bar and the gesture bar. The web build is shared with
 * the browser and must render identically there, so the system bar gaps are
 * reserved natively instead of in CSS.
 *
 * Capacitor's own inset handling is turned off through the SystemBars
 * `insetsHandling` option in capacitor.config.ts, because `viewport-fit=cover`
 * otherwise makes it forward the insets to the page.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        View webViewParent = (View) getBridge().getWebView().getParent();
        if (webViewParent == null) {
            return;
        }
        webViewParent.setBackgroundColor(Color.WHITE);

        ViewCompat.setOnApplyWindowInsetsListener(webViewParent, (view, insets) -> {
            int barTypes = WindowInsetsCompat.Type.systemBars() | WindowInsetsCompat.Type.displayCutout();
            Insets bars = insets.getInsets(barTypes);
            boolean keyboardVisible = insets.isVisible(WindowInsetsCompat.Type.ime());

            // Below Android 15 the system already keeps the window clear of the
            // bars, so padding here would double the gap.
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.VANILLA_ICE_CREAM) {
                int bottom = keyboardVisible ? insets.getInsets(WindowInsetsCompat.Type.ime()).bottom : bars.bottom;
                view.setPadding(bars.left, bars.top, bars.right, bottom);
            }

            // Report zero to the page rather than returning CONSUMED, which
            // would break the WebView's own safe-area recalculation.
            return new WindowInsetsCompat.Builder(insets).setInsets(barTypes, Insets.NONE).build();
        });
    }
}
