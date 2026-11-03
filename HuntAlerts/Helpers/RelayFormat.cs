using System;
using System.Text;
using System.Text.RegularExpressions;

namespace HuntAlerts.Helpers;

/// <summary>Relay message templates. Pure text so it can be tested off-game.</summary>
public static class RelayFormat
{
    public const string DefaultTrain = "{world} TRAIN: {loc}{inst}";
    public const string DefaultSRank = "S Rank {world}: {loc}{inst}";
    public const string Tokens = "{world}  {zone}  {coords}  {loc}  {inst}  {type}";

    public static string Apply(string? format, string fallback, string world, string zone, string coords,
        string loc, string inst, string type)
    {
        if (string.IsNullOrWhiteSpace(format)) format = fallback;
        // One pass, so a value containing "{zone}" etc. is never expanded again.
        return Regex.Replace(format!, @"\{(world|zone|coords|loc|inst|type)\}", m => m.Groups[1].Value switch
        {
            "world"  => world,
            "zone"   => zone,
            "coords" => coords,
            "loc"    => loc,
            "inst"   => inst,
            _        => type,
        }).Trim();
    }

    /// <summary>Cut to at most <paramref name="maxBytes"/> UTF-8 bytes without splitting a character.</summary>
    public static string TruncateUtf8(string s, int maxBytes)
    {
        if (Encoding.UTF8.GetByteCount(s) <= maxBytes) return s;
        int i = 0, bytes = 0;
        while (i < s.Length)
        {
            var len = char.IsSurrogatePair(s, i) ? 2 : 1;
            var b = Encoding.UTF8.GetByteCount(s.AsSpan(i, len));
            if (bytes + b > maxBytes) break;
            bytes += b;
            i += len;
        }
        return s[..i];
    }
}
