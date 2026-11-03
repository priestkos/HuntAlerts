using System.Text;
using HuntAlerts.Helpers;
using HuntAlerts.Messaging;

int pass = 0, fail = 0;
void Check(bool ok, string name)
{
    if (ok) pass++; else { fail++; Console.WriteLine($"FAIL: {name}"); }
}

// Pre-change RelayFormat.Apply, kept to prove the defaults are byte-identical.
static string OldApply(string? format, string fallback, string world, string zone, string coords, string loc, string inst, string type)
{
    if (string.IsNullOrWhiteSpace(format)) format = fallback;
    return format!.Replace("{world}", world).Replace("{zone}", zone).Replace("{coords}", coords)
        .Replace("{loc}", loc).Replace("{inst}", inst).Replace("{type}", type).Trim();
}

// 1. Blank / missing templates fall back to the old hardcoded output, across the input space.
string[] worlds = { "", "Gilgamesh", "Ultros" };
string[] zones = { "", "Il Mheg" };
string[] coordsSet = { "", "(12.30, 4.50)" };
string[] locs = { "", "<flag>", "Il Mheg (12.30, 4.50)" };
string[] insts = { "", " i2", " i3" };
string?[] blanks = { null, "", "   " };
foreach (var w in worlds) foreach (var z in zones) foreach (var c in coordsSet) foreach (var l in locs) foreach (var i in insts)
foreach (var (fallback, type) in new[] { (RelayFormat.DefaultTrain, "TRAIN"), (RelayFormat.DefaultSRank, "S Rank") })
{
    foreach (var b in blanks)
        Check(RelayFormat.Apply(b, fallback, w, z, c, l, i, type) == OldApply(b, fallback, w, z, c, l, i, type), $"blank default {w}|{l}|{i}");
    Check(RelayFormat.Apply(fallback, fallback, w, z, c, l, i, type) == OldApply(fallback, fallback, w, z, c, l, i, type), $"explicit default {w}|{l}|{i}");
}
Check(RelayFormat.Apply(null, RelayFormat.DefaultTrain, "Ultros", "", "", "<flag>", " i2", "TRAIN") == "Ultros TRAIN: <flag> i2", "train literal");
Check(RelayFormat.Apply("", RelayFormat.DefaultSRank, "Ultros", "", "", "Il Mheg (1.00, 2.00)", "", "S Rank") == "S Rank Ultros: Il Mheg (1.00, 2.00)", "srank literal");

// 2. Single-pass replacement: a value containing a token is not expanded again.
Check(RelayFormat.Apply("{world} {zone} {loc}", "", "W{zone}{loc}", "Z", "", "L", "", "") == "W{zone}{loc} Z L", "no re-expansion");
Check(RelayFormat.Apply("{type}/{coords}/{inst}/{unknown}", "", "", "", "(1, 2)", "", " i2", "TRAIN") == "TRAIN/(1, 2)/ i2/{unknown}", "all tokens + unknown kept");

// 3. UTF-8 byte-aware truncation.
int Bytes(string s) => Encoding.UTF8.GetByteCount(s);
Check(RelayFormat.TruncateUtf8("short", 500) == "short", "no-op under limit");
var ascii = new string('a', 600);
Check(RelayFormat.TruncateUtf8(ascii, 500).Length == 500, "ascii cut to 500");
var jp = new string('あ', 200); // 3 bytes each = 600 bytes, only 200 UTF-16 chars
var jpCut = RelayFormat.TruncateUtf8(jp, 500);
Check(Bytes(jpCut) == 498 && jpCut.Length == 166, "jp cut by bytes");
var emoji = "a" + string.Concat(Enumerable.Repeat("😀", 200)); // 1 + 4*200 bytes
var emojiCut = RelayFormat.TruncateUtf8(emoji, 500);
Check(Bytes(emojiCut) <= 500 && !char.IsHighSurrogate(emojiCut[^1]), "surrogate pair not split");
Check(Bytes(emojiCut) == 497, "emoji cut at last whole char");
for (var max = 0; max <= 20; max++)
{
    const string mixed = "aé😀あb😀";
    var s = RelayFormat.TruncateUtf8(mixed, max);
    Check(Bytes(s) <= max && mixed.StartsWith(s, StringComparison.Ordinal) && (s.Length == 0 || !char.IsHighSurrogate(s[^1])), $"mixed max={max}");
}

// 4. <t:N:R> and <t:N:x> with extreme values: no throw, bad tokens left unchanged.
string[] extremes =
{
    "99999999999999999999999", // overflows long
    long.MaxValue.ToString(),
    (DateTimeOffset.MaxValue.ToUnixTimeSeconds() + 1).ToString(),
};
foreach (var n in extremes)
{
    var r = $"x <t:{n}:R> y";
    Check(Run(() => HuntMessageFormatting.ReplaceTimestampsWithRelativeTime(r)) == r, $"relative unchanged {n}");
    foreach (var f in "tTdDfF")
    {
        var l = $"x <t:{n}:{f}> y";
        Check(Run(() => HuntMessageFormatting.ReplaceTimestampsWithLocalTime(l)) == l, $"local unchanged {n}:{f}");
    }
}
// In-range extremes still convert (and must not throw in a non-UTC local zone).
var maxOk = DateTimeOffset.MaxValue.ToUnixTimeSeconds().ToString();
Check(Run(() => HuntMessageFormatting.ReplaceTimestampsWithRelativeTime($"<t:{maxOk}:R>")).EndsWith("from now"), "max relative converts");
Check(!Run(() => HuntMessageFormatting.ReplaceTimestampsWithLocalTime($"<t:{maxOk}:t>")).Contains("<t"), "max local converts");
Check(Run(() => HuntMessageFormatting.ReplaceTimestampsWithRelativeTime("<t:0:R>")).EndsWith("ago"), "epoch 0 relative");
var now = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
Check(HuntMessageFormatting.ReplaceTimestampsWithRelativeTime($"a <t:{now - 120}:R> b") == "a 2 minutes ago b", "normal relative");
Check(Run(() => HuntMessageFormatting.ConvertTime(long.MaxValue)) == long.MaxValue.ToString(), "ConvertTime max out of range");
Check(Run(() => HuntMessageFormatting.ConvertTime(long.MinValue)) == long.MinValue.ToString(), "ConvertTime min out of range");
Check(HuntMessageFormatting.ConvertTime(0) == DateTimeOffset.FromUnixTimeSeconds(0).LocalDateTime.ToString("hh:mm tt", System.Globalization.CultureInfo.GetCultureInfo("en-US")), "ConvertTime 0");

string Run(Func<string> f)
{
    try { return f(); }
    catch (Exception e) { fail++; Console.WriteLine($"FAIL (threw {e.GetType().Name}): {e.Message}"); return "<threw>"; }
}

Console.WriteLine($"{pass} passed, {fail} failed");
return fail == 0 ? 0 : 1;

namespace ECommons.Logging
{
    // Test shim for the one ECommons member HuntMessageFormatting.cs calls.
    internal static class PluginLog { public static void Verbose(string _) { } }
}
