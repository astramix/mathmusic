package com.astramix.mathmusic;

import android.app.Activity;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

// MathMusic for Android: the page of MathMusic.exe (assets/index.html, built by android/build-apk.js) in a full-screen
// WebView, served by Server on http://localhost — so it saves songs exactly as the exe does (my_songs/ and generated/ in
// the app's folder, videos into Movies/MathMusic). Exports (<a download> of a blob — a WebView downloads nothing itself)
// come through the MathMusicAndroid bridge (android/bridge.js) into Download/MathMusic.
public class MainActivity extends Activity {
    WebView web;
    long backAt;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        File base = getExternalFilesDir(null);
        if (base == null) base = getFilesDir();
        Map<String, File> dirs = new HashMap<String, File>();
        dirs.put("mine", new File(base, "my_songs"));
        dirs.put("gen", new File(base, "generated"));
        dirs.put("songs", new File(base, "songs"));
        dirs.put("video", new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_MOVIES), "MathMusic"));
        int port;
        try {
            port = new Server(dirs, new Server.Page() {
                public byte[] bytes() throws IOException { return asset("index.html"); }
            }).start(5178);
        } catch (IOException e) {
            Toast.makeText(this, "MathMusic: нет свободного порта — " + e.getMessage(), Toast.LENGTH_LONG).show();
            finish();
            return;
        }

        // npm run apk -- --debug: chrome://inspect sees the page
        if ((getApplicationInfo().flags & ApplicationInfo.FLAG_DEBUGGABLE) != 0) WebView.setWebContentsDebuggingEnabled(true);
        web = new WebView(this);
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        // the page is laid out for a desktop window (android/build-apk.js sets its viewport): shown whole, zoomable
        s.setUseWideViewPort(true);
        s.setLoadWithOverviewMode(true);
        s.setSupportZoom(true);
        s.setBuiltInZoomControls(true);
        s.setDisplayZoomControls(false);
        s.setAllowFileAccess(false);
        web.setBackgroundColor(0xff0b0b14);
        web.addJavascriptInterface(new Bridge(), "MathMusicAndroid");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("localhost".equals(u.getHost()) || "127.0.0.1".equals(u.getHost())) return false;
                // links out (mail, the site): another app
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception e) { }
                return true;
            }
        });
        // the page keeps clear of the camera cut-out and the gesture bar
        web.setOnApplyWindowInsetsListener(new View.OnApplyWindowInsetsListener() {
            public WindowInsets onApplyWindowInsets(View v, WindowInsets w) {
                Insets i = w.getInsets(WindowInsets.Type.displayCutout());
                v.setPadding(i.left, i.top, i.right, i.bottom);
                return WindowInsets.CONSUMED;
            }
        });
        setContentView(web);
        immersive();
        web.loadUrl("http://localhost:" + port + "/");
    }

    byte[] asset(String name) throws IOException {
        InputStream in = getAssets().open(name);
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream(1 << 22);
            byte[] buf = new byte[1 << 16];
            for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
            return out.toByteArray();
        } finally {
            in.close();
        }
    }

    void immersive() {
        WindowInsetsController c = getWindow().getInsetsController();
        if (c == null) return;
        c.hide(WindowInsets.Type.systemBars());
        c.setSystemBarsBehavior(WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE);
    }

    @Override
    public void onWindowFocusChanged(boolean focus) {
        super.onWindowFocusChanged(focus);
        if (focus) immersive();
    }

    // «назад» closes what is open (Esc: menus, the gallery, dialogs); twice within 2 s leaves the app
    @Override
    public void onBackPressed() {
        long now = System.currentTimeMillis();
        if (now - backAt < 2000) { super.onBackPressed(); return; }
        backAt = now;
        web.evaluateJavascript("dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true }))", null);
        Toast.makeText(this, "Ещё раз «назад» — выйти", Toast.LENGTH_SHORT).show();
    }

    @Override
    protected void onDestroy() {
        if (web != null) web.destroy();
        super.onDestroy();
    }

    // a file from the page, in base64 pieces → Download/MathMusic (MediaStore: no permission; a taken name gets «(1)»)
    final class Bridge {
        final Map<String, OutputStream> open = new HashMap<String, OutputStream>();
        final Map<String, String> names = new HashMap<String, String>();
        int next = 0;

        // the WebView's width in screen pixels (bridge.js: the canvas gets as many pixels as the screen shows, no more)
        @JavascriptInterface
        public int width() { return web.getWidth(); }

        @JavascriptInterface
        public synchronized String begin(String name, String type) throws IOException {
            ContentValues v = new ContentValues();
            v.put(MediaStore.MediaColumns.DISPLAY_NAME, name);
            if (type != null && !type.isEmpty()) v.put(MediaStore.MediaColumns.MIME_TYPE, type);
            v.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/MathMusic");
            ContentResolver cr = getContentResolver();
            Uri u = cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
            if (u == null) throw new IOException("MediaStore: " + name);
            String id = String.valueOf(next++);
            open.put(id, cr.openOutputStream(u));
            names.put(id, name);
            return id;
        }

        @JavascriptInterface
        public synchronized void chunk(String id, String b64) throws IOException {
            open.get(id).write(Base64.decode(b64, Base64.DEFAULT));
        }

        @JavascriptInterface
        public synchronized void end(String id) throws IOException {
            open.remove(id).close();
            final String name = names.remove(id);
            runOnUiThread(new Runnable() {
                public void run() { Toast.makeText(MainActivity.this, "⬇ Загрузки/MathMusic/" + name, Toast.LENGTH_LONG).show(); }
            });
        }
    }
}
