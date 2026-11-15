// MathMusic's VST 2.4 host: renders a part through a plugin offline, as a DAW would (src/vst.js runs it). Built twice from this
// file (vst/build.js, Windows' own csc, C# 5): vsthost32.exe for 32-bit plugins (DSK of 2010 — loaded directly, no jBridge) and
// vsthost64.exe for 64-bit ones. A plugin's state comes from the user's Ableton set (its bank chunk), so it sounds as there.
//   vsthost --info <plugin.dll>                     → one line of JSON: name, vendor, uniqueId, outputs, synth, programs
//   vsthost <plugin.dll> <chunk.bin | -> <program | -1> <notes.txt> <seconds> <out.wav> [sampleRate]
// notes.txt: one note per line — start (s), length (s), MIDI note, velocity 1..127. The WAV: 32-bit float, stereo.
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;

static class VstHost {
    [DllImport("kernel32", SetLastError = true, CharSet = CharSet.Unicode)] static extern IntPtr LoadLibrary(string path);
    [DllImport("kernel32", CharSet = CharSet.Ansi)] static extern IntPtr GetProcAddress(IntPtr mod, string name);
    [DllImport("kernel32", CharSet = CharSet.Unicode)] static extern bool SetDllDirectory(string dir);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate IntPtr HostCallback(IntPtr effect, int opcode, int index, IntPtr value, IntPtr ptr, float opt);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate IntPtr PluginMain(HostCallback host);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate IntPtr Dispatcher(IntPtr effect, int opcode, int index, IntPtr value, IntPtr ptr, float opt);
    [UnmanagedFunctionPointer(CallingConvention.Cdecl)] delegate void ProcessReplacing(IntPtr effect, IntPtr inputs, IntPtr outputs, int frames);

    static HostCallback hostCb; // kept alive for the plugin's lifetime
    static IntPtr timeInfo;
    static double sampleRate = 44100, samplePos = 0;
    static int blockSize = 256;

    // MM_VST_TRACE=1: every step and every call of the plugin into the host on stderr (to find where a plugin stops)
    static readonly bool trace = Environment.GetEnvironmentVariable("MM_VST_TRACE") == "1";
    static void T(string s) { if (trace) { Console.Error.WriteLine("[vst] " + s); Console.Error.Flush(); } }
    static IntPtr Host(IntPtr effect, int opcode, int index, IntPtr value, IntPtr ptr, float opt) {
        T("host opcode " + opcode + " index " + index);
        switch (opcode) {
            case 1: return (IntPtr)2400;                       // audioMasterVersion
            case 6: return (IntPtr)1;                          // audioMasterWantMidi
            case 7:                                            // audioMasterGetTime
                Marshal.Copy(BitConverter.GetBytes(samplePos), 0, timeInfo, 8);
                Marshal.Copy(BitConverter.GetBytes(sampleRate), 0, timeInfo + 8, 8);
                return timeInfo;
            case 16: return (IntPtr)(int)sampleRate;           // audioMasterGetSampleRate
            case 17: return (IntPtr)blockSize;                 // audioMasterGetBlockSize
            case 23: return (IntPtr)4;                         // audioMasterGetCurrentProcessLevel: offline
            case 32: WriteString(ptr, "MathMusic"); return (IntPtr)1;     // audioMasterGetVendorString
            case 33: WriteString(ptr, "MathMusic VST host"); return (IntPtr)1; // audioMasterGetProductString
            case 34: return (IntPtr)1;                         // audioMasterGetVendorVersion
            case 37: {                                         // audioMasterCanDo
                string s = Marshal.PtrToStringAnsi(ptr) ?? "";
                return (IntPtr)(s == "sendVstEvents" || s == "sendVstMidiEvent" || s == "sendVstTimeInfo" || s == "receiveVstEvents" || s == "receiveVstMidiEvent" || s == "supplyIdle" ? 1 : 0);
            }
            case 38: return (IntPtr)1;                         // audioMasterGetLanguage: English
            default: return IntPtr.Zero;
        }
    }
    static void WriteString(IntPtr p, string s) { if (p == IntPtr.Zero) return; byte[] b = System.Text.Encoding.ASCII.GetBytes(s + "\0"); Marshal.Copy(b, 0, p, b.Length); }

    struct Ev { public int at; public byte status, note, vel; }

    static string Json(string s) { return "\"" + (s ?? "").Replace("\\", "\\\\").Replace("\"", "\\\"") + "\""; }
    static string Ansi(IntPtr p) { string s = Marshal.PtrToStringAnsi(p) ?? ""; return s.Trim(); }

    static int Main(string[] a) {
        bool info = a.Length == 2 && a[0] == "--info";
        if (!info && a.Length < 6) { Console.Error.WriteLine("usage: vsthost --info <plugin.dll> | vsthost <plugin.dll> <chunk|-> <program|-1> <notes.txt> <seconds> <out.wav> [sr]"); return 2; }
        string dll = info ? a[1] : a[0], chunkFile = info ? "-" : a[1], notesFile = info ? null : a[3], outFile = info ? null : a[5];
        int program = info ? -1 : int.Parse(a[2]);
        double seconds = info ? 0 : double.Parse(a[4], CultureInfo.InvariantCulture);
        if (!info && a.Length > 6) sampleRate = double.Parse(a[6], CultureInfo.InvariantCulture);
        timeInfo = Marshal.AllocHGlobal(256);
        for (int i = 0; i < 256; i++) Marshal.WriteByte(timeInfo, i, 0);
        Marshal.Copy(BitConverter.GetBytes(120.0), 0, timeInfo + 32, 8); // tempo
        Marshal.WriteInt32(timeInfo + 64, 4); Marshal.WriteInt32(timeInfo + 68, 4); // 4/4

        SetDllDirectory(Path.GetDirectoryName(Path.GetFullPath(dll)));
        T("LoadLibrary " + dll + " (" + (IntPtr.Size * 8) + "-bit host)");
        IntPtr mod = LoadLibrary(dll);
        if (mod == IntPtr.Zero) { Console.Error.WriteLine("LoadLibrary failed: " + Marshal.GetLastWin32Error() + " (a 32-bit plugin needs this host built for x86)"); return 3; }
        IntPtr entry = GetProcAddress(mod, "VSTPluginMain");
        if (entry == IntPtr.Zero) entry = GetProcAddress(mod, "main");
        if (entry == IntPtr.Zero) { Console.Error.WriteLine("no VSTPluginMain / main: not a VST 2 plugin"); return 4; }
        T("entry found; calling it");
        hostCb = Host;
        IntPtr eff = ((PluginMain)Marshal.GetDelegateForFunctionPointer(entry, typeof(PluginMain)))(hostCb);
        if (eff == IntPtr.Zero || Marshal.ReadInt32(eff) != 0x56737450) { Console.Error.WriteLine("the plugin returned no AEffect"); return 5; }
        int P = IntPtr.Size;
        T("AEffect at " + eff);
        var disp = (Dispatcher)Marshal.GetDelegateForFunctionPointer(Marshal.ReadIntPtr(eff, P), typeof(Dispatcher));
        // AEffect: magic, then 4 function pointers (aligned to P: at P on x64), 5 ints, 2 pointers (aligned), 4 ints/floats, 2 pointers,
        // uniqueID, version, processReplacing (aligned) — x86: 20 / 40 / 64 / 72 / 80, x64: 40 / 64 / 96 / 112 / 120
        int ints = 5 * P, resvd = (ints + 20 + P - 1) / P * P, objOff = resvd + 2 * P + 16, uidOff = objOff + 2 * P, procOff = (uidOff + 8 + P - 1) / P * P;
        int numPrograms = Marshal.ReadInt32(eff, ints), numParams = Marshal.ReadInt32(eff, ints + 4);
        int numIn = Marshal.ReadInt32(eff, ints + 8), numOut = Marshal.ReadInt32(eff, ints + 12), flags = Marshal.ReadInt32(eff, ints + 16);
        var proc = (ProcessReplacing)Marshal.GetDelegateForFunctionPointer(Marshal.ReadIntPtr(eff, procOff), typeof(ProcessReplacing));
        if (!info) Console.WriteLine("plugin: {0} programs, {1} params, {2} in, {3} out, flags 0x{4:x}", numPrograms, numParams, numIn, numOut, flags);

        T("effOpen");
        disp(eff, 0, 0, IntPtr.Zero, IntPtr.Zero, 0);                         // effOpen
        T("opened");
        if (info) {
            IntPtr s = Marshal.AllocHGlobal(512);
            var names = new List<string>();
            for (int i = 0; i < numPrograms; i++) {
                for (int b = 0; b < 512; b++) Marshal.WriteByte(s, b, 0);
                if (disp(eff, 29, i, IntPtr.Zero, s, 0) == IntPtr.Zero) {          // effGetProgramNameIndexed, else set + get
                    disp(eff, 2, 0, (IntPtr)i, IntPtr.Zero, 0); disp(eff, 5, 0, IntPtr.Zero, s, 0);
                }
                names.Add(Json(Ansi(s)));
            }
            for (int b = 0; b < 512; b++) Marshal.WriteByte(s, b, 0);
            disp(eff, 45, 0, IntPtr.Zero, s, 0); string name = Ansi(s);          // effGetEffectName
            for (int b = 0; b < 512; b++) Marshal.WriteByte(s, b, 0);
            disp(eff, 47, 0, IntPtr.Zero, s, 0); string vendor = Ansi(s);        // effGetVendorString
            int uid = Marshal.ReadInt32(eff, uidOff);
            Console.WriteLine("{{\"name\":{0},\"vendor\":{1},\"uniqueId\":{2},\"outputs\":{3},\"synth\":{4},\"chunks\":{5},\"programs\":[{6}]}}",
                Json(name), Json(vendor), uid, numOut, (flags & 256) != 0 ? "true" : "false", (flags & 32) != 0 ? "true" : "false", string.Join(",", names));
            Environment.Exit(0);
        }
        disp(eff, 10, 0, IntPtr.Zero, IntPtr.Zero, (float)sampleRate);       // effSetSampleRate
        disp(eff, 11, 0, (IntPtr)blockSize, IntPtr.Zero, 0);                  // effSetBlockSize
        if (chunkFile != "-") {
            byte[] chunk = File.ReadAllBytes(chunkFile);
            IntPtr cp = Marshal.AllocHGlobal(chunk.Length);
            Marshal.Copy(chunk, 0, cp, chunk.Length);
            IntPtr r = disp(eff, 24, 0, (IntPtr)chunk.Length, cp, 0);         // effSetChunk (bank)
            Console.WriteLine("setChunk ({0} bytes) → {1}", chunk.Length, r);
        }
        if (program >= 0) disp(eff, 2, 0, (IntPtr)program, IntPtr.Zero, 0);  // effSetProgram (−1: as the chunk left it)
        IntPtr nameBuf = Marshal.AllocHGlobal(256);
        disp(eff, 5, 0, IntPtr.Zero, nameBuf, 0);                            // effGetProgramName
        Console.WriteLine("program {0}: {1}", program, Marshal.PtrToStringAnsi(nameBuf));
        disp(eff, 12, 0, (IntPtr)1, IntPtr.Zero, 0);                          // effMainsChanged on
        disp(eff, 71, 0, IntPtr.Zero, IntPtr.Zero, 0);                        // effStartProcess

        // the notes → on / off events at sample positions
        var evs = new List<Ev>();
        foreach (string line in File.ReadAllLines(notesFile)) {
            string[] f = line.Trim().Split(new[] { ' ', '\t' }, StringSplitOptions.RemoveEmptyEntries);
            if (f.Length < 4) continue;
            double t = double.Parse(f[0], CultureInfo.InvariantCulture), d = double.Parse(f[1], CultureInfo.InvariantCulture);
            int n = (int)Math.Round(double.Parse(f[2], CultureInfo.InvariantCulture)), v = Math.Max(1, Math.Min(127, (int)Math.Round(double.Parse(f[3], CultureInfo.InvariantCulture))));
            evs.Add(new Ev { at = (int)Math.Round(t * sampleRate), status = 0x90, note = (byte)n, vel = (byte)v });
            evs.Add(new Ev { at = (int)Math.Round((t + d) * sampleRate), status = 0x80, note = (byte)n, vel = 0 });
        }
        evs.Sort((x, y) => x.at != y.at ? x.at.CompareTo(y.at) : x.status.CompareTo(y.status)); // offs first at the same sample
        int total = (int)Math.Ceiling(seconds * sampleRate), outs = Math.Max(2, numOut);
        float[][] result = { new float[total], new float[total] };
        IntPtr[] bufs = new IntPtr[outs];
        for (int c = 0; c < outs; c++) bufs[c] = Marshal.AllocHGlobal(blockSize * 4);
        IntPtr outPtrs = Marshal.AllocHGlobal(outs * P), inPtrs = Marshal.AllocHGlobal(Math.Max(1, numIn) * P);
        for (int c = 0; c < outs; c++) Marshal.WriteIntPtr(outPtrs, c * P, bufs[c]);
        IntPtr silent = Marshal.AllocHGlobal(blockSize * 4);
        for (int i = 0; i < blockSize; i++) Marshal.WriteInt32(silent, i * 4, 0);
        for (int c = 0; c < Math.Max(1, numIn); c++) Marshal.WriteIntPtr(inPtrs, c * P, silent);
        const int MaxEv = 512;
        IntPtr evBlock = Marshal.AllocHGlobal(2 * P + MaxEv * P), evData = Marshal.AllocHGlobal(MaxEv * 32);
        int ei = 0;
        float[] tmp = new float[blockSize];
        for (int pos = 0; pos < total; pos += blockSize) {
            int n = Math.Min(blockSize, total - pos), k = 0;
            while (ei < evs.Count && evs[ei].at < pos + n && k < MaxEv) {
                IntPtr e = evData + k * 32;
                for (int b = 0; b < 32; b++) Marshal.WriteByte(e, b, 0);
                Marshal.WriteInt32(e, 0, 1); Marshal.WriteInt32(e, 4, 32); Marshal.WriteInt32(e, 8, Math.Max(0, evs[ei].at - pos));
                Marshal.WriteByte(e, 24, evs[ei].status); Marshal.WriteByte(e, 25, evs[ei].note); Marshal.WriteByte(e, 26, evs[ei].vel);
                Marshal.WriteIntPtr(evBlock, 2 * P + k * P, e);
                k++; ei++;
            }
            if (k > 0) { Marshal.WriteInt32(evBlock, 0, k); Marshal.WriteIntPtr(evBlock, P, IntPtr.Zero); disp(eff, 25, 0, IntPtr.Zero, evBlock, 0); } // effProcessEvents
            samplePos = pos;
            proc(eff, inPtrs, outPtrs, n);
            for (int c = 0; c < 2; c++) { Marshal.Copy(bufs[Math.Min(c, outs - 1)], tmp, 0, n); Array.Copy(tmp, 0, result[c], pos, n); }
        }
        disp(eff, 72, 0, IntPtr.Zero, IntPtr.Zero, 0);                        // effStopProcess
        disp(eff, 12, 0, IntPtr.Zero, IntPtr.Zero, 0);                        // effMainsChanged off
        WriteWav(outFile, result, (int)sampleRate);
        float peak = 0; foreach (var ch in result) foreach (float s in ch) peak = Math.Max(peak, Math.Abs(s));
        Console.WriteLine("rendered {0:F2} s → {1} (peak {2:F3})", seconds, outFile, peak);
        Environment.Exit(0); // (no effClose: some old plugins hang on unload)
        return 0;
    }
    static void WriteWav(string file, float[][] ch, int sr) {
        using (var w = new BinaryWriter(File.Create(file))) {
            int n = ch[0].Length, bytes = n * 2 * 4;
            w.Write(System.Text.Encoding.ASCII.GetBytes("RIFF")); w.Write(36 + bytes); w.Write(System.Text.Encoding.ASCII.GetBytes("WAVEfmt "));
            w.Write(16); w.Write((short)3); w.Write((short)2); w.Write(sr); w.Write(sr * 8); w.Write((short)8); w.Write((short)32);
            w.Write(System.Text.Encoding.ASCII.GetBytes("data")); w.Write(bytes);
            for (int i = 0; i < n; i++) { w.Write(ch[0][i]); w.Write(ch[1][i]); }
        }
    }
}
