using ECommons.Automation;
using ECommons.DalamudServices;
using ECommons.Logging;
using ECommons.Schedulers;
using System;
using System.Globalization;

namespace HuntAlerts.Helpers;

public readonly record struct RelayChannel(string Display, string Command);

public static class RelayChannels
{
    public static readonly RelayChannel[] All =
    {
        new("Say",           "/s"),
        new("Yell",          "/y"),
        new("Shout",         "/sh"),
        new("Party",         "/p"),
        new("Alliance",      "/a"),
        new("Free Company",  "/fc"),
        new("Linkshell 1",   "/l1"),
        new("Linkshell 2",   "/l2"),
        new("Linkshell 3",   "/l3"),
        new("Linkshell 4",   "/l4"),
        new("Linkshell 5",   "/l5"),
        new("Linkshell 6",   "/l6"),
        new("Linkshell 7",   "/l7"),
        new("Linkshell 8",   "/l8"),
        new("CWLS 1",        "/cwl1"),
        new("CWLS 2",        "/cwl2"),
        new("CWLS 3",        "/cwl3"),
        new("CWLS 4",        "/cwl4"),
        new("CWLS 5",        "/cwl5"),
        new("CWLS 6",        "/cwl6"),
        new("CWLS 7",        "/cwl7"),
        new("CWLS 8",        "/cwl8"),
        new("Echo (test)",   "/echo"),
    };

    public static string DisplayFor(string command)
    {
        foreach (var ch in All)
            if (ch.Command.Equals(command, StringComparison.OrdinalIgnoreCase))
                return ch.Display;
        return "Party";
    }

    public static int IndexOfCommand(string command)
    {
        for (var i = 0; i < All.Length; i++)
            if (All[i].Command.Equals(command, StringComparison.OrdinalIgnoreCase))
                return i;
        return 3;
    }

    public static void RelayMessage(HuntTrainMessage entry, string channelCommand, bool withFlag)
    {
        if (entry == null) return;

        new TickScheduler(() =>
        {
            Send(entry, channelCommand, withFlag);
        }, 40);
    }

    private static void Send(HuntTrainMessage entry, string channelCommand, bool withFlag)
    {
        var text = BuildRelayText(entry, withFlag);
        if (string.IsNullOrWhiteSpace(text)) return;
        var line = $"{(HuntAlerts.C.EchoTestRelay ? "/echo " : "")}{channelCommand} {text}";
        if (line.Length > 500) line = line.Substring(0, 500);
        try
        {
            Chat.SendMessage(line);
            PluginLog.Verbose($"Relayed hunt to {channelCommand}: {text}");
        }
        catch (Exception ex)
        {
            PluginLog.Warning($"Relay failed ({channelCommand}): {ex.Message}");
        }
    }

    public static string BuildRelayText(HuntTrainMessage entry, bool useFlag)
    {
        var isTrain = entry.huntType == "new_hunt";
        var world = Clean(entry.huntWorld);
        var showinst = Svc.ClientState.TerritoryType == entry.startTerritoryTypeId ? entry.instance != Svc.ClientState.Instance : entry.instance > 1;
        var inst = showinst ? $" i{entry.instance}" : "";

        var loc = useFlag ? "<flag>" : PlainLocation(entry);

        return RelayFormat.Apply(
            isTrain ? HuntAlerts.C.TrainRelayFormat : HuntAlerts.C.SRankRelayFormat,
            isTrain ? RelayFormat.DefaultTrain : RelayFormat.DefaultSRank,
            world, Zone(entry), Coords(entry), loc, inst, isTrain ? "TRAIN" : "S Rank");
    }

    private static string Zone(HuntTrainMessage entry) => Clean(entry.startZone);

    private static string Coords(HuntTrainMessage entry) =>
        entry.mapLocationX == 0f && entry.mapLocationY == 0f
            ? ""
            : $"({entry.mapLocationX.ToString("F2", CultureInfo.InvariantCulture)}, {entry.mapLocationY.ToString("F2", CultureInfo.InvariantCulture)})";

    private static string PlainLocation(HuntTrainMessage entry)
    {
        var zone = Zone(entry);
        var coords = Coords(entry);
        if (zone.Length > 0 && coords.Length > 0) return $"{zone} {coords}";
        return zone.Length > 0 ? zone : coords;
    }

    private static string Clean(string s)
    {
        if (string.IsNullOrWhiteSpace(s)) return "";
        var t = s.Trim();
        if (t.Equals("invalid", StringComparison.OrdinalIgnoreCase)) return "";
        if (t.Equals("unknown", StringComparison.OrdinalIgnoreCase)) return "";
        return t;
    }
}
