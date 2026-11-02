using System;
using System.IO;
using UnityEditor;
using UnityEngine;

namespace Yaad.Spatial.Editor
{
    /// <summary>
    /// MetaXRSimulatorProfileSwitcher
    /// Provides device profile inspection and switching for Meta XR Simulator in Unity:
    /// - Meta Quest 3: Officially supported production profile (6DoF controllers + hand tracking).
    /// - Meta VR Glasses: Experimental pre-release profile (look-and-pinch input emulation).
    /// </summary>
    public static class MetaXRSimulatorProfileSwitcher
    {
        private const string DefaultConfigPath = "/Applications/MetaXRSimulator.app/Contents/Resources/MetaXRSimulator/config/sim_core_configuration.json";
        private const string WorkspaceGlassesConfigPath = "config/meta_vr_glasses_sim_config.json";

        [MenuItem("Yaad/Simulator Profile/Select Meta Quest 3 (Production Fallback)", false, 101)]
        public static void SetQuest3Profile()
        {
            Environment.SetEnvironmentVariable("META_XRSIM_CONFIG_JSON", DefaultConfigPath);
            Debug.Log($"[MetaXRSimulator] Profile set to 'Meta Quest 3' (Config: {DefaultConfigPath})");
            EditorUtility.DisplayDialog("Meta XR Simulator Profile", "Active Profile: Meta Quest 3 (Officially Supported Production Profile)\nInput: 6DoF Controllers + Hand Tracking\nDisplay: Full Stereoscopic MR", "OK");
        }

        [MenuItem("Yaad/Simulator Profile/Select Meta VR Glasses (Experimental)", false, 102)]
        public static void SetGlassesProfile()
        {
            string absPath = Path.GetFullPath(WorkspaceGlassesConfigPath);
            if (File.Exists(absPath))
            {
                Environment.SetEnvironmentVariable("META_XRSIM_CONFIG_JSON", absPath);
                Debug.Log($"[MetaXRSimulator] Profile set to 'Meta VR Glasses' (Config: {absPath})");
                EditorUtility.DisplayDialog("Meta XR Simulator Profile", "Active Profile: Meta VR Glasses (Experimental Pre-Release Profile)\nInput: Look-and-Pinch Emulation\nDisplay: Optical See-Through Emulation\nNotice: Physical camera feed requires hardware tether.", "OK");
            }
            else
            {
                Debug.LogWarning($"[MetaXRSimulator] Workspace config not found at {absPath}");
            }
        }

        [MenuItem("Yaad/Simulator Profile/Show Active Simulator Status", false, 103)]
        public static void ShowStatus()
        {
            string currentEnv = Environment.GetEnvironmentVariable("META_XRSIM_CONFIG_JSON");
            string profile = (currentEnv != null && currentEnv.Contains("glasses")) ? "Meta VR Glasses (Experimental)" : "Meta Quest 3 (Production Fallback)";
            string details = $"Active Profile: {profile}\n\n" +
                             $"Runtime: Meta XR Simulator v207 (macOS Apple Silicon)\n" +
                             $"OpenXR JSON: /Applications/MetaXRSimulator.app/Contents/Resources/MetaXRSimulator/meta_openxr_simulator.json\n\n" +
                             $"Distinction:\n" +
                             $"• Meta Quest 3: Officially supported production profile for standalone XR.\n" +
                             $"• Meta VR Glasses: Prototype smart glasses profile (emulates head gaze + micro-pinch; no camera sensor hardware stream on desktop).";

            Debug.Log($"[MetaXRSimulator] {details}");
            EditorUtility.DisplayDialog("Meta XR Simulator Status", details, "OK");
        }
    }
}
