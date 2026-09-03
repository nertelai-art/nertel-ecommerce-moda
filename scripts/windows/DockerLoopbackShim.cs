// Windows-only compatibility wrapper for this project's Supabase CLI.
// Docker Desktop ignores the per-network default bind on the tested version.
// Keep explicit port binding local without changing Docker's global settings.
using System;
using System.Diagnostics;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

internal static class DockerLoopbackShim
{
    private const string Suffix = "_nertel-ecommerce-moda";

    internal static string[] Rewrite(string[] input)
    {
        var args = (string[])input.Clone();
        if (args.Length == 0 || (args[0] != "create" && args[0] != "run")) return args;
        string name = null;
        for (var i = 1; i < args.Length; i++)
        {
            if (args[i] == "--name" && i + 1 < args.Length) name = args[i + 1];
            if (args[i].StartsWith("--name=", StringComparison.Ordinal)) name = args[i].Substring(7);
        }
        if (name == null || !name.StartsWith("supabase_", StringComparison.Ordinal) || !name.EndsWith(Suffix, StringComparison.Ordinal)) return args;
        for (var i = 1; i < args.Length; i++)
        {
            if (args[i] == "-P" || args[i] == "--publish-all") throw new InvalidOperationException("Publish-all is not permitted for the local project.");
            if (args[i] == "-p" || args[i] == "--publish")
            {
                if (++i >= args.Length) throw new InvalidOperationException("Missing port mapping.");
                args[i] = BindLoopback(args[i]);
            }
            else if (args[i].StartsWith("--publish=", StringComparison.Ordinal))
                args[i] = "--publish=" + BindLoopback(args[i].Substring(10));
        }
        return args;
    }

    private static string BindLoopback(string mapping)
    {
        var parts = mapping.Split(':');
        if (parts.Length == 3 && parts[0] == "127.0.0.1") return mapping;
        int hostPort;
        if (parts.Length != 2 || !int.TryParse(parts[0], out hostPort) || hostPort < 55320 || hostPort > 55324)
            throw new InvalidOperationException("Unexpected port mapping for the local project.");
        return "127.0.0.1:" + mapping;
    }

    // Windows CreateProcess quoting; no command shell or string interpolation.
    internal static string Quote(string value)
    {
        var result = new StringBuilder("\"");
        var slashes = 0;
        foreach (var character in value)
        {
            if (character == '\\') { slashes++; continue; }
            result.Append('\\', character == '"' ? slashes * 2 + 1 : slashes);
            result.Append(character);
            slashes = 0;
        }
        result.Append('\\', slashes * 2);
        return result.Append('"').ToString();
    }

    private static void Assert(bool condition)
    {
        if (!condition) throw new InvalidOperationException("Loopback adapter self-test failed.");
    }

    private static int SelfTest()
    {
        var local = new[] { "create", "--name", "supabase_db" + Suffix, "-p", "55322:5432", "image" };
        Assert(Rewrite(local)[4] == "127.0.0.1:55322:5432");
        Assert(local[4] == "55322:5432");
        var other = new[] { "create", "--name", "supabase_db_other", "-p", "54322:5432", "image" };
        Assert(Rewrite(other).SequenceEqual(other));
        Assert(Quote("a b") == "\"a b\"");
        Assert(Quote("a\"b") == "\"a\\\"b\"");
        Assert(Quote("a\\") == "\"a\\\\\"");
        Assert(Quote("") == "\"\"");
        var rejected = false;
        try { BindLoopback("0.0.0.0:55322:5432"); } catch (InvalidOperationException) { rejected = true; }
        Assert(rejected);
        Console.WriteLine("Loopback adapter self-tests passed.");
        return 0;
    }

    private static int Main(string[] args)
    {
        try
        {
            if (args.Length == 1 && args[0] == "--self-test") return SelfTest();
            var realDocker = Environment.GetEnvironmentVariable("MODA_REAL_DOCKER");
            if (string.IsNullOrEmpty(realDocker) || !Path.IsPathRooted(realDocker) || !File.Exists(realDocker))
                throw new InvalidOperationException("Real Docker executable not configured.");
            var info = new ProcessStartInfo(realDocker, string.Join(" ", Rewrite(args).Select(Quote))) {
                UseShellExecute = false, CreateNoWindow = true,
                RedirectStandardInput = true, RedirectStandardOutput = true, RedirectStandardError = true
            };
            using (var process = Process.Start(info))
            {
                // Preserve binary streams (Docker also sends tar archives on stdin).
                Task.Run(() => {
                    try { Console.OpenStandardInput().CopyTo(process.StandardInput.BaseStream); process.StandardInput.Close(); }
                    catch (IOException) { }
                    catch (ObjectDisposedException) { }
                });
                var output = process.StandardOutput.BaseStream.CopyToAsync(Console.OpenStandardOutput());
                var error = process.StandardError.BaseStream.CopyToAsync(Console.OpenStandardError());
                process.WaitForExit();
                Task.WaitAll(output, error);
                return process.ExitCode;
            }
        }
        catch (Exception error) { Console.Error.WriteLine(error.Message); return 1; }
    }
}
