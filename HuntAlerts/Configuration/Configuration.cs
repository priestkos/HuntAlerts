using Dalamud.Configuration;
using Dalamud.Game.Text;
using Dalamud.Plugin;
using System;
using ECommons.DalamudServices;
using System.Collections.Generic;
using System.Linq;
using Newtonsoft.Json;

namespace HuntAlerts
{
    public enum ScopeMode
    {
        AllConfigured,
        CurrentDatacenterOnly,
        CurrentWorldOnly,
        HomeWorldOnly,
    }

    public enum ToastAnimation
    {
        None,
        Fade,
        Slide,
        SlideFade,
    }

    public static class HuntGroups
    {
        public const string Centurio       = "Centurio";
        public const string Shadowbringers = "Shadowbringers";
        public const string Endwalker      = "Endwalker";
        public const string Dawntrail      = "Dawntrail";

        public static readonly string[] All =
        {
            Centurio, Shadowbringers, Endwalker, Dawntrail,
        };
    }

    public class PlayerConfig
    {
        public string PlayerName { get; set; } = Svc.PlayerState.CharacterName;
        public string HomeWorld { get; set; } = "";
        public HashSet<string> RelayChannels { get; set; } = new HashSet<string>();

        public Dictionary<uint, HashSet<string>> _RegionCWLSChannels { get; set; } = new Dictionary<uint, HashSet<string>>();
        

        [JsonIgnore]
        public HashSet<string> RegionCWLSChannels
        {
            get
            {
                if (!Svc.PlayerState.IsLoaded) new HashSet<string>();
                var region = Svc.PlayerState?.CurrentWorld.Value.DataCenter.Value.Region.RowId;
                if (region == null) return new HashSet<string>();
                if (!_RegionCWLSChannels.TryGetValue((uint)region, out var cwchannels))
                {
                    cwchannels = new HashSet<string>();
                    _RegionCWLSChannels.Add((uint)region, cwchannels);
                }
                return cwchannels;
            }
        }

        [JsonIgnore]
        public HashSet<string> AllRelayChannels => RelayChannels.Concat(RegionCWLSChannels).ToHashSet();
        public bool RegionLock { get; set; } = true;
        
    }

    [Serializable]
    public class Configuration : IPluginConfiguration
    {
        public int Version { get; set; } = 4;

        public bool SuppressDuplicates { get; set; } = true;
        public bool ChatAlertsEnabled { get; set; } = true;
        public int TextColor { get; set; } = 57;
        public int SRankTextColor { get; set; } = 48;
        public int SRankKillTextColor { get; set; } = 16;
        public bool UseDalamudChat { get; set; } = true;
        public XivChatType OutputChat { get; set; } = (XivChatType)56;
        public bool OpenMapOnArrival { get; set; } = true;
        public bool ShowDatacenterInNotification { get; set; } = false;
        public int SoundEffect { get; set; } = 0;
        public bool UseCustomTrainSound { get; set; } = false;
        public float CustomTrainSoundVolume { get; set; } = 0.7f;

        public int SRankSoundEffect { get; set; } = 0;
        public bool UseCustomSRankSound { get; set; } = false;
        public float CustomSRankSoundVolume { get; set; } = 0.7f;

        public bool HideAlertsInDuty { get; set; } = false;
        public bool MuteAlertSoundInCutscene { get; set; } = false;
        public bool LifestreamIntegration { get; set; } = false;
        public bool ctrlclickTeleport { get; set; } = false;

        public ScopeMode Scope { get; set; } = ScopeMode.AllConfigured;

        public HashSet<string> EnabledTrainGroups { get; set; } = [];
        public HashSet<string> EnabledDatacenters { get; set; } = [];
        public HashSet<string> EnabledWorlds      { get; set; } = [];

        public bool SRankEnabled { get; set; } = true;
        public bool SRankKillNotifications { get; set; } = true;
        public ScopeMode SRankScope { get; set; } = ScopeMode.CurrentDatacenterOnly;
        public HashSet<string> EnabledSRankGroups       { get; set; } = [];
        public HashSet<string> EnabledSRankDatacenters  { get; set; } = [];
        public HashSet<string> EnabledSRankWorlds       { get; set; } = [];

        public int SnoozeDefaultMinutes { get; set; } = 30;
        public string DefaultRelayChannel { get; set; } = "/p";

        public Dictionary<ulong, PlayerConfig> _PlayerConfig { get; set; } = new();

        [JsonIgnore]
        public PlayerConfig PlayerConfig
        {
            get
            {
                var cid = Svc.PlayerState.ContentId;

                if (!_PlayerConfig.TryGetValue(cid, out var playerConfig))
                {
                    playerConfig = new();
                    _PlayerConfig.Add(cid, playerConfig);
                }

                var name = Svc.PlayerState.CharacterName;
                var world = Svc.PlayerState.HomeWorld.ValueNullable?.Name.ToString();
                if (!string.IsNullOrEmpty(name)) playerConfig.PlayerName = name;
                if (!string.IsNullOrEmpty(world)) playerConfig.HomeWorld = world;
                return playerConfig;
            }
        }



        public bool EchoTestRelay { get; set; } = false;
        public bool RelayFlagLink { get; set; } = true;
        public bool WorldArrowEnabled { get; set; } = true;
        public bool ArrowChatPickup { get; set; } = true;
        public bool ArrowChatPickupShout { get; set; } = true;
        public bool ArrowChatPickupYell { get; set; } = true;
        public bool ArrowChatPickupParty { get; set; } = false;
        public bool ToastEnabled { get; set; } = false;
        public int ToastDurationSeconds { get; set; } = 5;
        public ToastAnimation ToastAnimation { get; set; } = ToastAnimation.SlideFade;
        public bool ToastPosSet { get; set; } = false;
        public float ToastPosX { get; set; }
        public float ToastPosY { get; set; }
        public int LastSeenChangelogVersion { get; set; } = 0;
        public int AlertingNoticeVersion { get; set; } = 0;

        [NonSerialized]
        private IDalamudPluginInterface? PluginInterface;

        public void Initialize(IDalamudPluginInterface pluginInterface)
        {
            PluginInterface = pluginInterface;
        }

        public void Save()
        {
            Svc.PluginInterface.SavePluginConfig(this);
        }
    }
}
