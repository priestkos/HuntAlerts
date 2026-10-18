using ECommons.Logging;
using System;
using System.Globalization;
using System.Text.RegularExpressions;

namespace HuntAlerts.Messaging;

public static class HuntMessageFormatting
{
    public static string ReplaceTimestampsWithLocalTime(string input)
    {
        const string pattern = @"<t:(\d+):(t|T|d|D|f|F)>";

        return Regex.Replace(input, pattern, match =>
        {
            long unixTimestamp = long.Parse(match.Groups[1].Value);
            
            var dateTime = DateTimeOffset.FromUnixTimeSeconds(unixTimestamp).LocalDateTime;
            PluginLog.Verbose($"Posted Time:  {unixTimestamp}");
            string convertedTime = dateTime.ToString("hh:mm tt", CultureInfo.GetCultureInfo("en-US"));
            PluginLog.Verbose($"converted time: {convertedTime}");
            return convertedTime;


        });
    }

    public static string ReplaceTimestampsWithRelativeTime(string input)
    {
        const string pattern = @"<t:(\d+):R>";

        return Regex.Replace(input, pattern, match =>
        {

            long unixTimestamp = long.Parse(match.Groups[1].Value);
            var dateTime = DateTimeOffset.FromUnixTimeSeconds(unixTimestamp).UtcDateTime;
            return GetRelativeTime(dateTime);
        });
    }

    public static string RemoveDiscordEmojis(string input)
    {
        const string customEmojiPattern = @"<(a)?:([a-zA-Z0-9_]+):(\d+)>";
        return Regex.Replace(input, customEmojiPattern, "");
    }

    public static string ConvertTime(long epochTime)
    {
        DateTime dateTime = DateTimeOffset.FromUnixTimeSeconds(epochTime).ToLocalTime().DateTime;

        PluginLog.Verbose($"Posted Time:  {epochTime}");
        string convertedTime = dateTime.ToString("hh:mm tt", CultureInfo.GetCultureInfo("en-US"));
        PluginLog.Verbose($"converted time: {convertedTime}");
        return convertedTime;
    }
    public static string GetRelativeTime(DateTime dateTime)
    {
        TimeSpan ts = DateTime.UtcNow - dateTime;
        bool isFuture = ts.TotalSeconds < 0;

        if (isFuture) ts = ts.Negate();

        string suffix = isFuture ? "from now" : "ago";

        if (ts.TotalSeconds < 60)
            return isFuture ? "in a moment" : "just now";

        if (ts.TotalMinutes < 60)
        {
            int mins = (int)ts.TotalMinutes;
            return $"{mins} {(mins == 1 ? "minute" : "minutes")} {suffix}";
        }

        if (ts.TotalHours < 24)
        {
            int hours = (int)ts.TotalHours;
            return $"{hours} {(hours == 1 ? "hour" : "hours")} {suffix}";
        }

        if (ts.TotalDays < 30)
        {
            int days = (int)ts.TotalDays;
            if (days == 1) return isFuture ? "tomorrow" : "yesterday";
            return $"{days} days {suffix}";
        }

        if (ts.TotalDays < 365)
        {
            int months = (int)(ts.TotalDays / 30);
            return $"{months} {(months == 1 ? "month" : "months")} {suffix}";
        }

        int years = (int)(ts.TotalDays / 365);
        return $"{years} {(years == 1 ? "year" : "years")} {suffix}";
    }
}
