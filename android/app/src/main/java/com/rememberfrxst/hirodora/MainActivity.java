package com.rememberfrxst.hirodora;

import android.app.Activity;
import android.app.AlertDialog;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.*;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.util.Collections;
import java.util.Locale;

/** Offline Android host. All game requests are served from packaged assets. */
public final class MainActivity extends Activity {
    private static final String HOST = "appassets.androidplatform.net";
    private WebView web;
    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        openGame();
    }
    private void openGame() {
        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(9, 19, 23));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(true);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String path = uri.getPath();
                if (!"https".equals(uri.getScheme()) || !HOST.equals(uri.getHost()) ||
                    path == null || !path.startsWith("/assets/game/") || path.contains("..")) return missing();
                try {
                    String asset = path.substring("/assets/".length());
                    String ext = asset.substring(asset.lastIndexOf('.') + 1).toLowerCase(Locale.ROOT);
                    String mime = switch (ext) {
                        case "js", "mjs" -> "application/javascript";
                        case "css" -> "text/css";
                        case "html" -> "text/html";
                        case "json" -> "application/json";
                        case "svg" -> "image/svg+xml";
                        case "webp" -> "image/webp";
                        case "png" -> "image/png";
                        case "ogg" -> "audio/ogg";
                        case "glb" -> "model/gltf-binary";
                        default -> "application/octet-stream";
                    };
                    return new WebResourceResponse(mime, "UTF-8", 200, "OK",
                        Collections.singletonMap("Cache-Control", "public, max-age=31536000"),
                        getAssets().open(asset));
                } catch (IOException error) { return missing(); }
            }
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                return !HOST.equals(request.getUrl().getHost());
            }
            @Override public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
                // A killed WebView must be destroyed and replaced, never reloaded.
                if (view.getParent() instanceof ViewGroup) ((ViewGroup)view.getParent()).removeView(view);
                view.destroy();
                web = null;
                LinearLayout recovery = new LinearLayout(MainActivity.this);
                recovery.setOrientation(LinearLayout.VERTICAL);
                recovery.setPadding(40, 32, 40, 24);
                recovery.setBackgroundColor(Color.rgb(9, 19, 23));
                TextView message = new TextView(MainActivity.this);
                message.setText("Hirodora's graphics process stopped.\n\nClose other apps or update Android System WebView, then retry. Your saved checkpoint is kept.");
                message.setTextColor(Color.rgb(227, 231, 223));
                message.setTextSize(18);
                recovery.addView(message);
                Button retry = new Button(MainActivity.this);
                retry.setText("Retry game");
                retry.setOnClickListener(v -> openGame());
                recovery.addView(retry);
                setContentView(recovery);
                return true;
            }
        });
        setContentView(web);
        immersive();
        web.loadUrl("https://" + HOST + "/assets/game/index.html");
    }
    private static WebResourceResponse missing() {
        return new WebResourceResponse("text/plain", "UTF-8", 404, "Not Found",
            Collections.emptyMap(), new ByteArrayInputStream(new byte[0]));
    }
    private void immersive() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY |
            View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION |
            View.SYSTEM_UI_FLAG_LAYOUT_STABLE);
    }
    @Override public void onWindowFocusChanged(boolean focused) {
        super.onWindowFocusChanged(focused);
        if (focused) immersive();
    }
    @Override protected void onPause() {
        if (web != null) {
            web.evaluateJavascript("window.dispatchEvent(new Event('hirodora:native-pause'))", null);
            web.onPause();
            web.pauseTimers();
        }
        super.onPause();
    }
    @Override protected void onResume() {
        super.onResume();
        if (web != null) { web.onResume(); web.resumeTimers(); }
    }
    @Override public void onBackPressed() {
        if (web != null) web.evaluateJavascript("window.dispatchEvent(new Event('hirodora:native-pause'))", null);
        new AlertDialog.Builder(this).setTitle("Leave Hirodora?")
            .setMessage("Your chapter progress is saved. You can continue your escape later.")
            .setNegativeButton("Stay", (dialog, which) -> immersive())
            .setPositiveButton("Exit", (dialog, which) -> finish()).show();
    }
    @Override protected void onDestroy() {
        if (web != null) { web.stopLoading(); web.destroy(); }
        super.onDestroy();
    }
}
