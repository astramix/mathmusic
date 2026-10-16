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
[assembly: AssemblyVersion("1.0.0.0")]

static class App {
    const int PORT = 5178;
    const string TITLE = "MathMusic";
    static string root, page;
    static readonly Regex Host = new Regex(@"^(localhost|127\.0\.0\.1)(:\d+)?$");
    static readonly Regex Api = new Regex(@"^/api/(mine|gen|songs)(?:/([^/]+))?$");
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
    class Res {
        public int Code; public string Type = "text/plain; charset=utf-8"; public byte[] Body = new byte[0]; public string Mtime;
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
        sb.Append("\r\n");
        byte[] hd = Encoding.ASCII.GetBytes(sb.ToString());
        net.Write(hd, 0, hd.Length);
        if (r.Code != 204) net.Write(r.Body, 0, r.Body.Length);
        net.Flush();
    }

    static string Mtime(string f) {
        return ((long)(File.GetLastWriteTimeUtc(f) - new DateTime(1970, 1, 1, 0, 0, 0, DateTimeKind.Utc)).TotalMilliseconds).ToString(CultureInfo.InvariantCulture);
    }
    static bool OkName(string f) { return SongFile.IsMatch(f) || f == "library.json"; }

    static Res Route(string method, string target, Dictionary<string, string> h, byte[] body) {
        string host;
        if (!h.TryGetValue("host", out host) || !Host.IsMatch(host)) return new Res(403, "host");
        string path = target.Split('?')[0];
        if (path == "/" && method == "GET") {
            if (!File.Exists(page)) return new Res(404, "no MathMusic Live.html");
            Res p = new Res(200, null);
            p.Type = "text/html; charset=utf-8";
            p.Body = File.ReadAllBytes(page);
            return p;
        }
        if (path == "/api/hello") { Res r = new Res(200, "{\"app\":\"mathmusic\"}"); r.Type = "application/json"; return r; }
        Match m = Api.Match(path);
        if (!m.Success) return new Res(404, "not found");
        string mark;
        if (!h.TryGetValue("x-mathmusic", out mark) || mark != "1") return new Res(403, "header");
        string g = m.Groups[1].Value, dir = Path.Combine(root, g == "mine" ? "my_songs" : g == "gen" ? "generated" : "songs");
        if (!m.Groups[2].Success) {
            if (method != "GET") return new Res(405, null);
            Directory.CreateDirectory(dir);
            StringBuilder j = new StringBuilder("[");
            foreach (string f in Directory.GetFiles(dir)) {
                string n = Path.GetFileName(f);
                if (!OkName(n)) continue;
                if (j.Length > 1) j.Append(',');
                j.Append("{\"name\":\"").Append(n).Append("\",\"mtime\":").Append(Mtime(f)).Append('}');
            }
            Res r = new Res(200, j.Append(']').ToString());
            r.Type = "application/json";
            return r;
        }
        string name = Uri.UnescapeDataString(m.Groups[2].Value);
        if (!OkName(name)) return new Res(400, "name");
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
            File.WriteAllBytes(file, body);
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
