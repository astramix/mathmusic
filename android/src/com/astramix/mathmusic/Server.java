package com.astramix.mathmusic;

import java.io.BufferedInputStream;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.BindException;
import java.net.InetAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

// The app's local server inside the APK — the same as viz/serve.js and the one in MathMusic.exe (viz/launcher.cs):
// the page on http://localhost:<port>/, my_songs/, generated/, songs/ and videos/ through /api/…, and only for the app
// (a localhost Host, the x-mathmusic header, plain file names). Plain Java with no Android classes, so test/serve.test.js
// runs it on the desktop JVM with the same checks:  java -cp <classes> com.astramix.mathmusic.Server <root> <port>
public final class Server {
    public interface Page { byte[] bytes() throws IOException; }

    static final Pattern HOST = Pattern.compile("^(localhost|127\\.0\\.0\\.1)(:\\d+)?$");
    static final Pattern API = Pattern.compile("^/api/(mine|gen|songs|video)(?:/([^/]+))?$");
    static final Pattern SONG_FILE = Pattern.compile("^[A-Za-z0-9_-][A-Za-z0-9_.-]*\\.js$");
    static final Pattern VIDEO_FILE = Pattern.compile("^[A-Za-z0-9_-][A-Za-z0-9_.-]*\\.(mp4|webm)$");

    final Map<String, File> dirs; // mine gen songs video → folders
    final Page page;
    ServerSocket socket;

    public Server(Map<String, File> dirs, Page page) {
        this.dirs = dirs;
        this.page = page;
    }

    // port, or the next free one (another app may hold it); 0 = any → the port it got
    public int start(int port) throws IOException {
        for (int p = port; ; p++) {
            try {
                socket = new ServerSocket(p, 50, InetAddress.getByName("127.0.0.1"));
                break;
            } catch (BindException e) {
                if (port == 0 || p >= port + 20) throw e;
            }
        }
        Thread t = new Thread(new Runnable() { public void run() { loop(); } }, "mathmusic-server");
        t.setDaemon(true);
        t.start();
        return socket.getLocalPort();
    }

    void loop() {
        while (!socket.isClosed()) {
            try {
                final Socket c = socket.accept();
                Thread t = new Thread(new Runnable() { public void run() { handle(c); } });
                t.setDaemon(true);
                t.start();
            } catch (IOException e) {
                if (socket.isClosed()) return;
            }
        }
    }

    static final class Res {
        int code; String type = "text/plain; charset=utf-8"; byte[] body; Long mtime;
        Res(int code, String text) { this.code = code; body = text == null ? new byte[0] : text.getBytes(StandardCharsets.UTF_8); }
    }

    void handle(Socket c) {
        try {
            InputStream in = new BufferedInputStream(c.getInputStream());
            // the head: up to the empty line
            ByteArrayOutputStream head = new ByteArrayOutputStream();
            int b, last4 = 0;
            while ((b = in.read()) >= 0) {
                head.write(b);
                last4 = (last4 << 8) | b;
                if (last4 == 0x0d0a0d0a) break;
                if (head.size() > 65536) { c.close(); return; }
            }
            String[] lines = new String(head.toByteArray(), StandardCharsets.ISO_8859_1).split("\r\n");
            String[] start = lines[0].split(" ");
            if (start.length < 2) { c.close(); return; }
            Map<String, String> h = new HashMap<String, String>();
            for (int i = 1; i < lines.length; i++) {
                int k = lines[i].indexOf(':');
                if (k > 0) h.put(lines[i].substring(0, k).trim().toLowerCase(Locale.ROOT), lines[i].substring(k + 1).trim());
            }
            int len = h.containsKey("content-length") ? Integer.parseInt(h.get("content-length")) : 0;
            byte[] body = new byte[len];
            for (int at = 0, n; at < len; at += n) if ((n = in.read(body, at, len - at)) < 0) throw new IOException("short body");
            Res r;
            try {
                r = route(start[0], start[1], h, body);
            } catch (Exception e) {
                r = new Res(500, String.valueOf(e.getMessage()));
            }
            write(c.getOutputStream(), r);
        } catch (IOException e) {
            // the page went away mid-request: nothing to answer
        } finally {
            try { c.close(); } catch (IOException e) { }
        }
    }

    static void write(OutputStream net, Res r) throws IOException {
        StringBuilder sb = new StringBuilder();
        sb.append("HTTP/1.1 ").append(r.code).append(r.code == 200 ? " OK" : r.code == 204 ? " No Content" : " Error").append("\r\n");
        sb.append("Content-Type: ").append(r.type).append("\r\n");
        sb.append("Content-Length: ").append(r.code == 204 ? 0 : r.body.length).append("\r\n");
        sb.append("Cache-Control: no-store\r\nConnection: close\r\n");
        if (r.mtime != null) sb.append("X-Mtime: ").append(r.mtime).append("\r\n");
        sb.append("\r\n");
        net.write(sb.toString().getBytes(StandardCharsets.US_ASCII));
        if (r.code != 204) net.write(r.body);
        net.flush();
    }

    static boolean okName(String f, String g) {
        return g.equals("video") ? VIDEO_FILE.matcher(f).matches() : SONG_FILE.matcher(f).matches() || f.equals("library.json");
    }

    Res route(String method, String target, Map<String, String> h, byte[] body) throws IOException {
        String host = h.get("host");
        if (host == null || !HOST.matcher(host).matches()) return new Res(403, "host");
        int q = target.indexOf('?');
        String path = q < 0 ? target : target.substring(0, q), query = q < 0 ? "" : target.substring(q + 1);
        if (path.equals("/") && method.equals("GET")) {
            Res p = new Res(200, null);
            p.type = "text/html; charset=utf-8";
            p.body = page.bytes();
            return p;
        }
        if (path.equals("/api/hello")) { Res r = new Res(200, "{\"app\":\"mathmusic\"}"); r.type = "application/json"; return r; }
        Matcher m = API.matcher(path);
        if (!m.matches()) return new Res(404, "not found");
        if (!"1".equals(h.get("x-mathmusic"))) return new Res(403, "header");
        String g = m.group(1);
        File dir = dirs.get(g);
        if (m.group(2) == null) {
            if (!method.equals("GET")) return new Res(405, null);
            dir.mkdirs();
            StringBuilder j = new StringBuilder("[");
            String[] names = dir.list();
            if (names != null) for (String n : names) {
                if (!okName(n, g)) continue;
                if (j.length() > 1) j.append(',');
                j.append("{\"name\":\"").append(n).append("\",\"mtime\":").append(new File(dir, n).lastModified()).append('}');
            }
            Res r = new Res(200, j.append(']').toString());
            r.type = "application/json";
            return r;
        }
        String name = URLDecoder.decode(m.group(2).replace("+", "%2B"), "UTF-8");
        if (!okName(name, g)) return new Res(400, "name");
        File file = new File(dir, name);
        if (method.equals("GET")) {
            if (!file.isFile()) return new Res(404, "no file");
            Res r = new Res(200, null);
            r.body = Files.readAllBytes(file.toPath());
            r.mtime = file.lastModified();
            return r;
        }
        if (method.equals("PUT")) {
            dir.mkdirs();
            // ?append=1: the next piece of a large file (a video comes in 16 MB pieces)
            OutputStream o = new FileOutputStream(file, query.contains("append=1"));
            try { o.write(body); } finally { o.close(); }
            return new Res(204, null);
        }
        if (method.equals("DELETE")) {
            if (!file.isFile()) return new Res(404, "no file");
            if (!file.delete()) return new Res(500, "delete");
            return new Res(204, null);
        }
        return new Res(405, null);
    }

    // on the desktop (the tests): the folders under <root>, the page from <root>/MathMusic Live.html
    public static void main(String[] args) throws Exception {
        final File root = new File(args[0]);
        Map<String, File> dirs = new HashMap<String, File>();
        dirs.put("mine", new File(root, "my_songs"));
        dirs.put("gen", new File(root, "generated"));
        dirs.put("songs", new File(root, "songs"));
        dirs.put("video", new File(root, "videos"));
        Server s = new Server(dirs, new Page() {
            public byte[] bytes() throws IOException { return Files.readAllBytes(new File(root, "MathMusic Live.html").toPath()); }
        });
        System.out.println("port " + s.start(Integer.parseInt(args[1])));
        Thread.currentThread().join();
    }
}
