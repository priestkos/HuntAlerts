using System;

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
        return format!
            .Replace("{world}", world)
            .Replace("{zone}", zone)
            .Replace("{coords}", coords)
            .Replace("{loc}", loc)
            .Replace("{inst}", inst)
            .Replace("{type}", type)
            .Trim();
    }
}
