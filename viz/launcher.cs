// MathMusic.exe — the app as a program (built by viz/build-exe.js with the C# compiler that ships with
// Windows, .NET Framework 4: C# 5, so no $"…", ?. or => members). It serves "MathMusic Live.html" from
// its own folder on http://localhost:5178 and reads / writes my_songs\ (and songs\) for it — the same
// API as viz/serve.js, so nobody needs Node.js — then opens the page as an app window (Chrome or Edge
// with --app and a profile of its own) and stops when that window closes. Only this computer can
// reach the server (127.0.0.1, Host checked), a request to the folders needs the app's header (no other
// site can send it), and only plain file names inside the folder.
//   MathMusic.exe            the app
//   MathMusic.exe --port N   the app, from port N on
//   MathMusic.exe --serve N  only the server, on port N (for the tests)
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

[assembly: AssemblyTitle("MathMusic")]
[assembly: AssemblyProduct("MathMusic")]
[assembly: AssemblyCompany("Astramix")]
[assembly: AssemblyCopyright("Автор: Astramix")]
[assembly: AssemblyVersion("1.5.0.0")]

static class App {
    const int PORT = 5178;
    const string TITLE = "MathMusic";
    static string root, page;
    static readonly Regex Host = new Regex(@"^(localhost|127\.0\.0\.1)(:\d+)?$");
    static readonly Regex Origin = new Regex(@"^https?://(localhost|127\.0\.0\.1)(:\d+)?$");
    static readonly Regex Api = new Regex(@"^/api/(mine|gen|songs|export/(?:mp3|wav|ogg|midi|stems|tuning|musicxml|code|video))(?:/([^/]+))?$");
    static readonly Regex SongFile = new Regex(@"^[A-Za-z0-9_-][A-Za-z0-9_.-]*\.js$");

    [STAThread]
    static void Main(string[] args) {
        root = AppDomain.CurrentDomain.BaseDirectory;
        page = Path.Combine(root, "MathMusic Live.html");
        if (args.Length == 2 && args[0] == "--serve") {
            int p = int.Parse(args[1], CultureInfo.InvariantCulture);
            TcpListener l = new TcpListener(IPAddress.Loopback, p);
            l.Start();
            Serve(l);
            return;
        }
        if (!File.Exists(page)) {
            Say("Рядом с программой нет файла «MathMusic Live.html».\nОн собирается командой: npm run viz", true);
            return;
        }
        // 5178, or the next free port; MathMusic already running there: just one more window
        TcpListener server = null;
        int from = args.Length == 2 && args[0] == "--port" ? int.Parse(args[1], CultureInfo.InvariantCulture) : PORT, port = from;
        for (; port < from + 20; port++) {
            if (IsOurs(port)) { Open(port, false); return; }
            try { server = new TcpListener(IPAddress.Loopback, port); server.Start(); break; }
            catch (SocketException) { server = null; }
        }
        if (server == null) { Say("Не получилось запустить MathMusic: порты " + from + "–" + (from + 19) + " заняты.", true); return; }
        TcpListener s = server;
        Thread t = new Thread(delegate () { Serve(s); });
        t.IsBackground = true;
        t.Start();
        Open(port, true);
    }

    static void Say(string text, bool error) {
        MessageBox.Show(text, TITLE, MessageBoxButtons.OK, error ? MessageBoxIcon.Error : MessageBoxIcon.Information);
    }

    static bool IsOurs(int port) {
        try {
            HttpWebRequest r = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:" + port + "/api/hello");
            r.Timeout = 800;
            r.Proxy = null;
            using (WebResponse w = r.GetResponse())
            using (StreamReader rd = new StreamReader(w.GetResponseStream()))
                return rd.ReadToEnd().Contains("\"mathmusic\"");
        } catch { return false; }
    }

    // ---- the window ------------------------------------------------------------------------------------
    // Chrome or Edge as an app window (no address bar, its own taskbar icon). A profile of its own makes
    // the started browser the one that owns the window, so its exit is the window closing.
    static void Open(int port, bool wait) {
        string url = "http://localhost:" + port + "/";
        string browser = FindBrowser();
        if (browser == null) {
            Process.Start(url);
            if (wait) Say("MathMusic открыт в браузере.\nПока это окно открыто, песни сохраняются в my_songs.\nНажмите OK, чтобы выключить MathMusic.", false);
            return;
        }
        string profile = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "MathMusic\\browser");
        string argv = "--app=" + url + " --user-data-dir=\"" + profile + "\" --window-size=1440,900 --no-first-run --no-default-browser-check --disable-background-mode";
        // shell start: the browser must not inherit the server's socket (it would keep the port after we exit)
        Process p = Process.Start(new ProcessStartInfo(browser, argv) { UseShellExecute = true });
        if (wait && p != null) p.WaitForExit();
    }

    static string FindBrowser() {
        string[] names = { "chrome.exe", "msedge.exe" };
        foreach (string n in names) {
            foreach (RegistryKey hive in new RegistryKey[] { Registry.CurrentUser, Registry.LocalMachine }) {
                try {
                    using (RegistryKey k = hive.OpenSubKey(@"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths\" + n)) {
                        string v = k == null ? null : k.GetValue("") as string;
                        if (v != null && File.Exists(v.Trim('"'))) return v.Trim('"');
                    }
                } catch { }
            }
        }
        string local = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
        string pf = Environment.GetEnvironmentVariable("ProgramFiles") ?? @"C:\Program Files";
        string pf86 = Environment.GetEnvironmentVariable("ProgramFiles(x86)") ?? @"C:\Program Files (x86)";
        string[] paths = {
            Path.Combine(pf, @"Google\Chrome\Application\chrome.exe"), Path.Combine(pf86, @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(local, @"Google\Chrome\Application\chrome.exe"),
            Path.Combine(pf86, @"Microsoft\Edge\Application\msedge.exe"), Path.Combine(pf, @"Microsoft\Edge\Application\msedge.exe"),
        };
        foreach (string f in paths) if (File.Exists(f)) return f;
        return null;
    }

    // ---- the server ------------------------------------------------------------------------------------
    internal class Res {
        public int Code; public string Type = "text/plain; charset=utf-8"; public byte[] Body = new byte[0]; public string Mtime, Samples;
        public Res(int code, string text) { Code = code; if (text != null) Body = Encoding.UTF8.GetBytes(text); }
    }

    static void Serve(TcpListener l) {
        while (true) {
            TcpClient c;
            try { c = l.AcceptTcpClient(); } catch { return; }
            ThreadPool.QueueUserWorkItem(delegate (object o) { Handle((TcpClient)o); }, c);
        }
    }

    static void Handle(TcpClient c) {
        using (c) {
            try {
                c.ReceiveTimeout = 15000;
                Stream net = c.GetStream();
                BufferedStream s = new BufferedStream(net);
                // the head: up to the blank line
                MemoryStream head = new MemoryStream();
                int b, tail = 0;
                while ((b = s.ReadByte()) >= 0) {
                    head.WriteByte((byte)b);
                    tail = (b == '\r' || b == '\n') ? tail + 1 : 0;
                    if (tail == 4) break;
                    if (head.Length > 65536) return;
                }
                string[] lines = Encoding.UTF8.GetString(head.ToArray()).Split(new[] { "\r\n" }, StringSplitOptions.None);
                string[] first = lines[0].Split(' ');
                if (first.Length < 2) return;
                Dictionary<string, string> h = new Dictionary<string, string>();
                for (int i = 1; i < lines.Length; i++) {
                    int k = lines[i].IndexOf(':');
                    if (k > 0) h[lines[i].Substring(0, k).Trim().ToLowerInvariant()] = lines[i].Substring(k + 1).Trim();
                }
                string lenText;
                int len = h.TryGetValue("content-length", out lenText) ? int.Parse(lenText, CultureInfo.InvariantCulture) : 0;
                if (len < 0 || len > 64 << 20) return;
                byte[] body = new byte[len];
                for (int got = 0; got < len; ) {
                    int n = s.Read(body, got, len - got);
                    if (n <= 0) return;
                    got += n;
                }
                Res r;
                try { r = Route(first[0], first[1], h, body); }
                catch (Exception e) { r = new Res(500, e.Message); }
                Write(net, r);
            } catch { }
        }
    }

    static void Write(Stream net, Res r) {
        StringBuilder sb = new StringBuilder();
        sb.Append("HTTP/1.1 ").Append(r.Code).Append(r.Code == 200 ? " OK" : r.Code == 204 ? " No Content" : " Error").Append("\r\n");
        sb.Append("Content-Type: ").Append(r.Type).Append("\r\n");
        sb.Append("Content-Length: ").Append(r.Code == 204 ? 0 : r.Body.Length).Append("\r\n");
        sb.Append("Cache-Control: no-store\r\nConnection: close\r\n");
        if (r.Mtime != null) sb.Append("X-Mtime: ").Append(r.Mtime).Append("\r\n");
        if (r.Samples != null) sb.Append("X-Samples: ").Append(r.Samples).Append("\r\n");
        sb.Append("\r\n");
        byte[] hd = Encoding.ASCII.GetBytes(sb.ToString());
        net.Write(hd, 0, hd.Length);
        if (r.Code != 204) net.Write(r.Body, 0, r.Body.Length);
        net.Flush();
    }

    static string Mtime(string f) {
        return ((long)(File.GetLastWriteTimeUtc(f) - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds).ToString(CultureInfo.InvariantCulture);
    }
    static readonly Regex ExportFile = new Regex(@"^[A-Za-z0-9_-][A-Za-z0-9_.-]*\.(mp3|wav|ogg|mid|zip|musicxml|js|mp4|webm)$");
    static bool OkName(string f, string g) { return g.StartsWith("export/") ? ExportFile.IsMatch(f) : SongFile.IsMatch(f) || f == "library.json"; }

    static Res Route(string method, string target, Dictionary<string, string> h, byte[] body) {
        string host;
        if (!h.TryGetValue("host", out host) || !Host.IsMatch(host)) return new Res(403, "host");
        // (a request that names its origin must come from the app's own page: not another site, not a foreign song's sandbox — "null")
        string origin;
        if (h.TryGetValue("origin", out origin) && origin.Length > 0 && !Origin.IsMatch(origin)) return new Res(403, "origin");
        string path = target.Split('?')[0];
        if (path == "/" && method == "GET") {
            if (!File.Exists(page)) return new Res(404, "no MathMusic Live.html");
            Res p = new Res(200, null);
            p.Type = "text/html; charset=utf-8";
            p.Body = File.ReadAllBytes(page);
            return p;
        }
        if (path == "/api/hello") { Res r = new Res(200, "{\"app\":\"mathmusic\"}"); r.Type = "application/json"; return r; }
        if (path == "/api/vst" || path == "/api/vst/render") {
            string mk;
            if (!h.TryGetValue("x-mathmusic", out mk) || mk != "1") return new Res(403, "header");
            return path == "/api/vst" ? (method == "GET" ? Vst.List() : new Res(405, null)) : (method == "POST" ? Vst.Render(body) : new Res(405, null));
        }
        Match m = Api.Match(path);
        if (!m.Success) return new Res(404, "not found");
        string mark;
        if (!h.TryGetValue("x-mathmusic", out mark) || mark != "1") return new Res(403, "header");
        string g = m.Groups[1].Value, dir = g.StartsWith("export/") ? Path.Combine(root, "exports", g.Substring(7)) : Path.Combine(root, g == "mine" ? "my_songs" : g == "gen" ? "generated" : "songs");
        if (!m.Groups[2].Success) {
            if (method != "GET") return new Res(405, null);
            Directory.CreateDirectory(dir);
            StringBuilder j = new StringBuilder("[");
            foreach (string f in Directory.GetFiles(dir)) {
                string n = Path.GetFileName(f);
                if (!OkName(n, g)) continue;
                if (j.Length > 1) j.Append(',');
                j.Append("{\"name\":\"").Append(n).Append("\",\"mtime\":").Append(Mtime(f)).Append('}');
            }
            Res r = new Res(200, j.Append(']').ToString());
            r.Type = "application/json";
            return r;
        }
        string name = Uri.UnescapeDataString(m.Groups[2].Value);
        if (!OkName(name, g)) return new Res(400, "name");
        string file = Path.Combine(dir, name);
        if (method == "GET") {
            if (!File.Exists(file)) return new Res(404, "no file");
            Res r = new Res(200, null);
            r.Body = File.ReadAllBytes(file);
            r.Mtime = Mtime(file);
            return r;
        }
        if (method == "PUT") {
            Directory.CreateDirectory(dir);
            // ?append=1: the next piece of a large file (a video comes in 16 MB pieces)
            if (target.Contains("append=1")) using (FileStream a = new FileStream(file, FileMode.Append)) a.Write(body, 0, body.Length);
            else File.WriteAllBytes(file, body);
            return new Res(204, null);
        }
        if (method == "DELETE") {
            if (!File.Exists(file)) return new Res(404, "no file");
            File.Delete(file);
            return new Res(204, null);
        }
        return new Res(405, null);
    }
}

// ---- the user's VST plugins (as src/vst.js does for Node) --------------------------------------------------------------
// GET /api/vst: the plugins in the usual VST folders (a jBridge stub — a few KB, its .txt names the original — leads to the
// original DLL; 32-bit ones run in vsthost32.exe beside this program, no bridge needed), their programs, and the presets out of
// the user's Ableton sets (tools/als.mjs presets → %USERPROFILE%\.mathmusic\vst-presets, local). POST /api/vst/render
// { plugin, preset, program, notes: [[s, s, MIDI, vel]], seconds, sr }: the part through the plugin → float32 L then R.
static class Vst {
    class Plugin { public string Name, File; public int Bits; public bool Vst3; }
    static readonly string Home = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".mathmusic");
    static readonly string Presets = Path.Combine(Home, "vst-presets"), Cache = Path.Combine(Home, "vst-cache");
    static readonly System.Web.Script.Serialization.JavaScriptSerializer Js = new System.Web.Script.Serialization.JavaScriptSerializer { MaxJsonLength = 1 << 30 };
    static readonly Dictionary<string, string> Info = new Dictionary<string, string>();

    static string[] Dirs() {
        string pf = Environment.GetEnvironmentVariable("ProgramFiles") ?? @"C:\Program Files", pf86 = Environment.GetEnvironmentVariable("ProgramFiles(x86)") ?? @"C:\Program Files (x86)";
        List<string> d = new List<string>();
        string extra = Environment.GetEnvironmentVariable("MATHMUSIC_VST_PATH");
        if (!string.IsNullOrEmpty(extra)) d.AddRange(extra.Split(';'));
        d.AddRange(new[] { Path.Combine(pf, "VSTPlugins"), Path.Combine(pf, "VSTPlugX"), Path.Combine(pf, @"Common Files\VST2"), Path.Combine(pf, @"Steinberg\VSTPlugins"),
            Path.Combine(pf86, "VSTPlugins"), Path.Combine(pf86, @"Steinberg\VSTPlugins"), Path.Combine(pf, @"Common Files\VST3") });
        return d.ToArray();
    }
    static int Bits(string f) {
        try {
            byte[] b = new byte[4096];
            using (FileStream s = File.OpenRead(f)) s.Read(b, 0, b.Length);
            if (b[0] != 'M' || b[1] != 'Z') return 0;
            int pe = BitConverter.ToInt32(b, 0x3c);
            if (pe + 6 >= b.Length) return 0;
            int m = BitConverter.ToUInt16(b, pe + 4);
            return m == 0x8664 ? 64 : m == 0x14c ? 32 : 0;
        } catch { return 0; }
    }
    static string Original(string dll) {
        string txt = Path.ChangeExtension(dll, ".txt");
        try {
            if (File.Exists(txt) && new FileInfo(dll).Length < 64 << 10) {
                Match m = Regex.Match(File.ReadAllText(txt, Encoding.Default), "^\\s*\"([^\"]+\\.dll)\"", RegexOptions.IgnoreCase);
                if (m.Success && File.Exists(m.Groups[1].Value)) return m.Groups[1].Value;
            }
        } catch { }
        return dll;
    }
    static void Walk(string dir, int depth, List<string> found) {
        try {
            foreach (string f in Directory.GetFiles(dir)) if (f.EndsWith(".dll", StringComparison.OrdinalIgnoreCase)) found.Add(f);
            foreach (string d in Directory.GetDirectories(dir)) {
                if (d.EndsWith(".vst3", StringComparison.OrdinalIgnoreCase)) found.Add(d);
                else if (depth > 0) Walk(d, depth - 1, found);
            }
        } catch { }
    }
    static List<Plugin> Scan() {
        Dictionary<string, Plugin> found = new Dictionary<string, Plugin>(StringComparer.OrdinalIgnoreCase);
        foreach (string dir in Dirs()) {
            List<string> files = new List<string>();
            Walk(dir, 4, files);
            foreach (string f in files) {
                string name = Path.GetFileNameWithoutExtension(f);
                if (found.ContainsKey(name)) continue;
                if (f.EndsWith(".vst3", StringComparison.OrdinalIgnoreCase)) { found[name] = new Plugin { Name = name, File = f, Bits = 64, Vst3 = true }; continue; }
                string o = Original(f);
                int bits = Bits(o);
                if (bits != 0) found[name] = new Plugin { Name = name, File = o, Bits = bits };
            }
        }
        List<Plugin> list = new List<Plugin>(found.Values);
        list.Sort(delegate (Plugin a, Plugin b) { return string.Compare(a.Name, b.Name, StringComparison.OrdinalIgnoreCase); });
        return list;
    }
    static string HostExe(int bits) { return Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "vsthost" + bits + ".exe"); }
    static string Run(string exe, string args, int ms, out int code) {
        ProcessStartInfo si = new ProcessStartInfo(exe, args) { UseShellExecute = false, RedirectStandardOutput = true, RedirectStandardError = true, CreateNoWindow = true };
        using (Process p = Process.Start(si)) {
            string o = p.StandardOutput.ReadToEnd() + p.StandardError.ReadToEnd();
            if (!p.WaitForExit(ms)) { try { p.Kill(); } catch { } code = -1; return "timeout"; }
            code = p.ExitCode;
            return o;
        }
    }
    static string Q(string s) { return "\"" + s.Replace("\"", "") + "\""; }
    static string PluginInfo(Plugin p) {
        lock (Info) {
            string have;
            if (Info.TryGetValue(p.File, out have)) return have;
            int code;
            string o = File.Exists(HostExe(p.Bits)) ? Run(HostExe(p.Bits), "--info " + Q(p.File), 60000, out code) : null;
            string line = null;
            if (o != null) foreach (string l in o.Split('\n')) if (l.Trim().StartsWith("{")) line = l.Trim();
            Info[p.File] = line;
            return line;
        }
    }
    static string Safe(string s) { foreach (char c in Path.GetInvalidFileNameChars()) s = s.Replace(c, '_'); return s.Trim(); }

    public static App.Res List() {
        StringBuilder j = new StringBuilder("{\"host\":true,\"plugins\":[");
        bool first = true;
        foreach (Plugin p in Scan()) {
            string info = p.Vst3 ? null : PluginInfo(p);
            if (!first) j.Append(',');
            first = false;
            Dictionary<string, object> d = info != null ? Js.Deserialize<Dictionary<string, object>>(info) : null;
            j.Append("{\"name\":").Append(Js.Serialize(p.Name)).Append(",\"kind\":\"").Append(p.Vst3 ? "vst3" : "vst2").Append("\",\"bits\":").Append(p.Bits)
             .Append(",\"hosted\":").Append(d != null ? "true" : "false").Append(",\"programs\":").Append(d != null ? Js.Serialize(d["programs"]) : "[]")
             .Append(",\"synth\":").Append(d != null ? Js.Serialize(d["synth"]) : "null").Append('}');
        }
        j.Append("],\"presets\":[");
        first = true;
        if (Directory.Exists(Presets)) foreach (string d in Directory.GetDirectories(Presets)) foreach (string f in Directory.GetFiles(d, "*.json")) {
            try {
                Dictionary<string, object> pr = Js.Deserialize<Dictionary<string, object>>(File.ReadAllText(f, Encoding.UTF8));
                if (!first) j.Append(',');
                first = false;
                j.Append("{\"plugin\":").Append(Js.Serialize(pr["plugin"])).Append(",\"name\":").Append(Js.Serialize(pr["name"])).Append(",\"program\":").Append(Js.Serialize(pr["program"]))
                 .Append(",\"set\":").Append(Js.Serialize(pr.ContainsKey("set") ? pr["set"] : null)).Append(",\"track\":").Append(Js.Serialize(pr.ContainsKey("track") ? pr["track"] : null)).Append('}');
            } catch { }
        }
        App.Res r = new App.Res(200, j.Append("],\"kits\":").Append(KitsJson()).Append("}").ToString());
        r.Type = "application/json";
        return r;
    }

    // ---- sample kits (tools/als.mjs kit → %USERPROFILE%\.mathmusic\kits\*.json): each pad a sample on this computer, its transpose,
    // volume and slice; played as src/vst.js renderKit does — resampled, × velocity, then the kit's measured curve and a soft clip
    static readonly string Kits = Path.Combine(Home, "kits");
    static string KitsJson() {
        StringBuilder j = new StringBuilder("[");
        bool first = true;
        if (Directory.Exists(Kits)) foreach (string f in Directory.GetFiles(Kits, "*.json")) {
            try {
                Dictionary<string, object> k = Js.Deserialize<Dictionary<string, object>>(File.ReadAllText(f, Encoding.UTF8));
                Dictionary<string, object> pads = (Dictionary<string, object>)k["pads"];
                if (!first) j.Append(',');
                first = false;
                j.Append("{\"name\":").Append(Js.Serialize(k["name"])).Append(",\"pads\":[");
                bool f2 = true;
                foreach (KeyValuePair<string, object> p in pads) {
                    if (!f2) j.Append(',');
                    f2 = false;
                    j.Append("{\"note\":").Append(p.Key).Append(",\"name\":").Append(Js.Serialize(((Dictionary<string, object>)p.Value)["name"])).Append('}');
                }
                j.Append("]}");
            } catch { }
        }
        return j.Append(']').ToString();
    }
    class Audio { public int Sr; public float[][] Ch; }
    static readonly Dictionary<string, Audio> Decoded = new Dictionary<string, Audio>();
    static Audio Decode(string file) {
        lock (Decoded) {
            Audio have;
            if (Decoded.TryGetValue(file, out have)) return have;
            byte[] b = File.ReadAllBytes(file);
            string id = Encoding.ASCII.GetString(b, 0, 4);
            int ch = 0, bits = 16, sr = 44100, data = -1, frames = 0, fmt = 1;
            bool big = id == "FORM", little = !big;
            Func<int, int> u32 = o => big ? (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3] : BitConverter.ToInt32(b, o);
            Func<int, int> u16 = o => big ? (b[o] << 8) | b[o + 1] : BitConverter.ToUInt16(b, o);
            for (int o = 12; o + 8 <= b.Length; ) {
                string c = Encoding.ASCII.GetString(b, o, 4);
                int size = u32(o + 4);
                if (big && c == "COMM") {
                    ch = (short)u16(o + 8); frames = u32(o + 10); bits = (short)u16(o + 14);
                    int e = u16(o + 16) & 0x7fff; long hi = (uint)u32(o + 18), lo = (uint)u32(o + 22);
                    sr = (int)Math.Round((hi * 4294967296.0 + lo) * Math.Pow(2, e - 16383 - 63));
                    if (Encoding.ASCII.GetString(b, 8, 4) == "AIFC" && size >= 22) { string comp = Encoding.ASCII.GetString(b, o + 26, 4); if (comp == "sowt") little = true; if (comp == "fl32" || comp == "FL32") fmt = 3; }
                }
                if (big && c == "SSND") data = o + 16 + u32(o + 8);
                if (!big && c == "fmt ") { fmt = BitConverter.ToUInt16(b, o + 8); ch = BitConverter.ToUInt16(b, o + 10); sr = BitConverter.ToInt32(b, o + 12); bits = BitConverter.ToUInt16(b, o + 22); if (fmt == 0xfffe) fmt = bits >= 32 ? 3 : 1; }
                if (!big && c == "data") { data = o + 8; frames = Math.Min(size, b.Length - data) / (bits / 8 * Math.Max(1, ch)); }
                o += 8 + size + (size & 1);
            }
            if (ch == 0 || data < 0) throw new Exception(file + ": not a WAV / AIFF file");
            int bps = bits / 8;
            frames = Math.Min(frames, (b.Length - data) / (bps * ch));
            float[][] outc = new float[ch][];
            for (int c = 0; c < ch; c++) outc[c] = new float[frames];
            for (int i = 0; i < frames; i++) for (int c = 0; c < ch; c++) {
                int o = data + (i * ch + c) * bps;
                float v;
                if (fmt == 3) { byte[] t = new byte[4]; Array.Copy(b, o, t, 0, 4); if (!little) Array.Reverse(t); v = BitConverter.ToSingle(t, 0); }
                else if (bits == 8) v = big ? (sbyte)b[o] / 128f : (b[o] - 128) / 128f;
                else if (bits == 16) v = (short)(little ? b[o] | (b[o + 1] << 8) : (b[o] << 8) | b[o + 1]) / 32768f;
                else if (bits == 24) v = (((little ? b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) : (b[o] << 16) | (b[o + 1] << 8) | b[o + 2]) << 8) >> 8) / 8388608f;
                else v = (little ? BitConverter.ToInt32(b, o) : (b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) / 2147483648f;
                outc[c][i] = v;
            }
            Audio a = new Audio { Sr = sr, Ch = outc };
            Decoded[file] = a;
            return a;
        }
    }
    static double D(object o, double d) { return o == null ? d : Convert.ToDouble(o, CultureInfo.InvariantCulture); }
    static App.Res RenderKit(Dictionary<string, object> q) {
        string name = (string)q["kit"], file = Path.Combine(Kits, Safe(name) + ".json");
        if (!File.Exists(file)) return new App.Res(404, "кит «" + name + "» не найден");
        Dictionary<string, object> k = Js.Deserialize<Dictionary<string, object>>(File.ReadAllText(file, Encoding.UTF8));
        Dictionary<string, object> pads = (Dictionary<string, object>)k["pads"];
        double seconds = D(q["seconds"], 1);
        int sr = q.ContainsKey("sr") && q["sr"] != null ? Convert.ToInt32(q["sr"], CultureInfo.InvariantCulture) : 44100, n = (int)Math.Ceiling(seconds * sr);
        float[] L = new float[n], R = new float[n];
        foreach (object o in (System.Collections.ArrayList)q["notes"]) {
            System.Collections.ArrayList e = (System.Collections.ArrayList)o;
            string note = ((int)Math.Round(D(e[2], 36))).ToString(CultureInfo.InvariantCulture);
            if (!pads.ContainsKey(note)) continue;
            Dictionary<string, object> p = (Dictionary<string, object>)pads[note];
            Audio w;
            try { w = Decode((string)p["file"]); } catch { continue; }
            float[] a = w.Ch[0], bb = w.Ch.Length > 1 ? w.Ch[1] : a;
            int from = Math.Min(a.Length, Math.Max(0, (int)Math.Round(D(p.ContainsKey("start") ? p["start"] : null, 0))));
            double endv = D(p.ContainsKey("end") ? p["end"] : null, 0);
            int to = endv > from ? Math.Min(a.Length, (int)Math.Round(endv)) : a.Length;
            double step = (double)w.Sr / sr * Math.Pow(2, D(p.ContainsKey("transpose") ? p["transpose"] : null, 0) / 12);
            double g = Math.Pow(10, D(p.ContainsKey("volume") ? p["volume"] : null, 0) / 20) * (e.Count > 3 && e[3] != null ? D(e[3], 0.8) : 0.8);
            int i0 = (int)Math.Round(D(e[0], 0) * sr), len = (int)Math.Floor((to - from) / step);
            for (int i = 0; i < len && i0 + i < n; i++) {
                double pos = from + i * step; int j = (int)pos; double f = pos - j, fade = i > len - 64 ? (len - i) / 64.0 : 1;
                if (j + 1 >= to) break;
                L[i0 + i] += (float)(g * fade * (a[j] + f * (a[j + 1] - a[j])));
                R[i0 + i] += (float)(g * fade * (bb[j] + f * (bb[j + 1] - bb[j])));
            }
        }
        if (k.ContainsKey("match") && k["match"] != null) {
            Dictionary<string, object> m = (Dictionary<string, object>)k["match"];
            System.Collections.ArrayList bands = (System.Collections.ArrayList)m["bands"];
            double gain = Math.Pow(10, D(m.ContainsKey("gain") ? m["gain"] : null, 0) / 20);
            foreach (float[] c in new[] { L, R }) {
                for (int bi = 0; bi < bands.Count; bi++) {
                    double dB = D(bands[bi], 0);
                    if (Math.Abs(dB) < 0.2) continue;
                    double f0 = 100 * Math.Pow(2, bi / 3.0) * Math.Pow(2, 1 / 6.0), A = Math.Pow(10, dB / 40), w0 = 2 * Math.PI * f0 / sr, al = Math.Sin(w0) / (2 * 4.3);
                    double b0 = 1 + al * A, b1 = -2 * Math.Cos(w0), b2 = 1 - al * A, a0 = 1 + al / A, a1 = b1, a2 = 1 - al / A, x1 = 0, x2 = 0, y1 = 0, y2 = 0;
                    for (int j = 0; j < c.Length; j++) { double x = c[j], y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0; x2 = x1; x1 = x; y2 = y1; y1 = y; c[j] = (float)y; }
                }
                for (int j = 0; j < c.Length; j++) c[j] = (float)(0.966 * Math.Tanh(gain * c[j] / 0.966));
            }
        }
        byte[] outb = new byte[n * 8];
        Buffer.BlockCopy(L, 0, outb, 0, n * 4);
        Buffer.BlockCopy(R, 0, outb, n * 4, n * 4);
        App.Res r = new App.Res(200, null);
        r.Type = "application/octet-stream";
        r.Body = outb;
        r.Samples = n.ToString(CultureInfo.InvariantCulture);
        return r;
    }

    public static App.Res Render(byte[] body) {
        Dictionary<string, object> q = Js.Deserialize<Dictionary<string, object>>(Encoding.UTF8.GetString(body));
        if (q.ContainsKey("kit") && q["kit"] != null) return RenderKit(q);
        string name = (string)q["plugin"];
        Plugin p = Scan().Find(delegate (Plugin x) { return string.Equals(x.Name, name, StringComparison.OrdinalIgnoreCase); });
        if (p == null) return new App.Res(404, "плагин «" + name + "» не найден");
        if (p.Vst3) return new App.Res(400, name + ": VST3 — хост пока играет только VST2");
        double seconds = Convert.ToDouble(q["seconds"], CultureInfo.InvariantCulture);
        int sr = q.ContainsKey("sr") && q["sr"] != null ? Convert.ToInt32(q["sr"], CultureInfo.InvariantCulture) : 44100;
        byte[] chunk = null;
        int program = q.ContainsKey("program") && q["program"] != null ? Convert.ToInt32(q["program"], CultureInfo.InvariantCulture) : int.MinValue;
        string preset = q.ContainsKey("preset") ? q["preset"] as string : null;
        if (preset != null) {
            string pf = Path.Combine(Path.Combine(Presets, Safe(p.Name)), Safe(preset) + ".json");
            if (File.Exists(pf)) {
                Dictionary<string, object> pr = Js.Deserialize<Dictionary<string, object>>(File.ReadAllText(pf, Encoding.UTF8));
                if (pr["chunk"] != null) chunk = Convert.FromBase64String((string)pr["chunk"]);
                if (program == int.MinValue && pr["program"] != null) program = Convert.ToInt32(pr["program"], CultureInfo.InvariantCulture);
            }
        }
        if (program == int.MinValue) program = chunk != null ? -1 : 0;
        StringBuilder notes = new StringBuilder();
        foreach (object o in (System.Collections.ArrayList)q["notes"]) {
            System.Collections.ArrayList e = (System.Collections.ArrayList)o;
            double t = Convert.ToDouble(e[0], CultureInfo.InvariantCulture), d = Math.Max(0.005, Convert.ToDouble(e[1], CultureInfo.InvariantCulture));
            double n = Convert.ToDouble(e[2], CultureInfo.InvariantCulture), v = e.Count > 3 && e[3] != null ? Convert.ToDouble(e[3], CultureInfo.InvariantCulture) : 0.8;
            notes.Append(t.ToString("0.00000", CultureInfo.InvariantCulture)).Append(' ').Append(d.ToString("0.00000", CultureInfo.InvariantCulture)).Append(' ')
                 .Append(Math.Round(n).ToString(CultureInfo.InvariantCulture)).Append(' ').Append(Math.Max(1, Math.Min(127, (int)Math.Round(v * 127)))).Append('\n');
        }
        Directory.CreateDirectory(Cache);
        string key;
        using (System.Security.Cryptography.SHA1 sha = System.Security.Cryptography.SHA1.Create()) {
            byte[] hash = sha.ComputeHash(Encoding.UTF8.GetBytes(p.File + "|" + File.GetLastWriteTimeUtc(p.File).Ticks + "|" + (chunk != null ? Convert.ToBase64String(chunk) : "") + "|" + program + "|" + seconds.ToString("0.000", CultureInfo.InvariantCulture) + "|" + sr + "|" + notes));
            key = "exe-" + BitConverter.ToString(hash).Replace("-", "").Substring(0, 20).ToLowerInvariant();
        }
        string wav = Path.Combine(Cache, key + ".wav");
        if (!File.Exists(wav)) {
            string nf = Path.Combine(Cache, key + ".notes"), cf = Path.Combine(Cache, key + ".chunk");
            File.WriteAllText(nf, notes.ToString());
            if (chunk != null) File.WriteAllBytes(cf, chunk);
            int code;
            string o = Run(HostExe(p.Bits), Q(p.File) + " " + (chunk != null ? Q(cf) : "-") + " " + program + " " + Q(nf) + " " + seconds.ToString("0.000", CultureInfo.InvariantCulture) + " " + Q(wav) + " " + sr, 600000, out code);
            try { File.Delete(nf); File.Delete(cf); } catch { }
            if (code != 0 || !File.Exists(wav)) return new App.Res(500, p.Name + ": " + o.Trim());
        }
        // the host's WAV: 32-bit float stereo, the samples after its 44-byte header → L then R
        byte[] w = File.ReadAllBytes(wav);
        int total = (w.Length - 44) / 8, n2 = Math.Min(total, (int)Math.Ceiling(seconds * sr));
        byte[] outb = new byte[n2 * 8];
        for (int i = 0; i < n2; i++) {
            Buffer.BlockCopy(w, 44 + i * 8, outb, i * 4, 4);
            Buffer.BlockCopy(w, 44 + i * 8 + 4, outb, (n2 + i) * 4, 4);
        }
        App.Res r = new App.Res(200, null);
        r.Type = "application/octet-stream";
        r.Body = outb;
        r.Samples = n2.ToString(CultureInfo.InvariantCulture);
        return r;
    }
}
