using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;
using UnityEngine;
using UnityEngine.Networking;
using Yaad.Spatial.Models;

namespace Yaad.Spatial.Services
{
    #region Backend DTOs
    [Serializable]
    public class BackendUserDto
    {
        public string id;
        public string email;
    }

    [Serializable]
    public class BackendSessionDto
    {
        public string access_token;
        public string refresh_token;
        public long expires_at;
        public BackendUserDto user;
    }

    [Serializable]
    public class LoginRequestDto
    {
        public string email;
        public string password;
    }

    [Serializable]
    public class LoginResponseDto
    {
        public bool success;
        public BackendSessionDto session;
        public string error;
    }

    [Serializable]
    public class BackendTrackedItemDto
    {
        public string id;
        public string user_id;
        public string item_name;
        public string category;
        public string status;
        public string last_observation_id;
        public string last_location_description;
        public string[] last_landmarks;
        public string last_observed_at;
        public string image_reference;
        public string updated_at;
    }

    [Serializable]
    public class GetItemsResponseDto
    {
        public bool success;
        public BackendTrackedItemDto[] items;
        public int count;
        public string error;
    }

    [Serializable]
    public class AnalyzeRequestDto
    {
        public string image;
        public string requestedQuery;
        public string source;
        public string userId;
        public string requestedProvider;
        public bool liveConfirmed;
    }

    [Serializable]
    public class BackendCandidateDto
    {
        public string id;
        public string item_name;
        public string category;
        public string location_description;
        public string[] landmarks;
        public string description;
        public string confidence;
        public bool is_selected;
        public BackendCoordinatesDto coordinates;
        public string image_reference;
    }

    [Serializable]
    public class AnalyzeResponseDto
    {
        public bool success;
        public BackendCandidateDto[] candidates;
        public string source;
        public string metaModel;
        public bool cached;
        public string error;
    }

    [Serializable]
    public class ConfirmCandidatePayloadDto
    {
        public BackendCandidateDto candidate;
        public string source;
        public string image_reference;
        public BackendCoordinatesDto coordinates;
    }

    [Serializable]
    public class ConfirmCandidateResponseDto
    {
        public bool success;
        public BackendTrackedItemDto item;
        public string error;
    }

    [Serializable]
    public class RecallRequestDto
    {
        public string query;
    }

    [Serializable]
    public class BackendObservationDto
    {
        public string id;
        public string observed_at;
        public string confidence;
        public string description;
    }

    [Serializable]
    public class BackendCoordinatesDto
    {
        public double latitude;
        public double longitude;
        public float accuracy;
        public string place_name;
    }

    [Serializable]
    public class BackendRecallItemDto
    {
        public string id;
        public string item_name;
        public string category;
        public string last_location_description;
        public string last_observed_at;
        public string[] landmarks;
        public string image_reference;
        public BackendCoordinatesDto coordinates;
        public float geofence_radius_meters;
    }

    [Serializable]
    public class RecallResponseDto
    {
        public bool success;
        public bool found;
        public string query;
        public BackendRecallItemDto item;
        public BackendObservationDto observation;
        public string speechSummary;
        public string disclaimer;
        public string message;
        public bool isCloud;
        public string error;
    }
    #endregion

    /// <summary>
    /// YaadApiClient
    /// High-performance HTTP client bridging Unity with Yaad's Next.js backend and Supabase persistence.
    /// Supports authenticated cloud requests via JWT bearer tokens and strict zero-network Demo Mode.
    /// </summary>
    public class YaadApiClient : MonoBehaviour
    {
        public static YaadApiClient Instance { get; private set; }

        [Header("Backend Configuration")]
        [SerializeField] private string baseUrl = "https://yaad-khaki.vercel.app";
        [SerializeField] private float requestTimeoutSeconds = 10.0f;
        [SerializeField] private bool runInCloudMode = false;

        private string sessionAccessToken = null;
        private string authenticatedUserId = null;

        public bool IsCloudMode => runInCloudMode;
        public bool IsAuthenticated => !string.IsNullOrEmpty(sessionAccessToken);
        public string CurrentUserId => authenticatedUserId ?? "demo-user";

        private void Awake()
        {
            if (Instance != null && Instance != this)
            {
                Destroy(gameObject);
                return;
            }
            Instance = this;
            DontDestroyOnLoad(gameObject);
            LoadEnvironmentSession();
        }

        /// <summary>
        /// Reads developer/testing session token and backend URL from environment variables if present.
        /// Keeps secrets out of code and assets.
        /// </summary>
        public void LoadEnvironmentSession()
        {
            string envUrl = Environment.GetEnvironmentVariable("YAAD_BACKEND_URL") ?? Environment.GetEnvironmentVariable("NEXT_PUBLIC_APP_URL");
            if (!string.IsNullOrEmpty(envUrl))
            {
                SetBaseUrl(envUrl);
                Debug.Log($"[YaadApiClient] Configured backend base URL from environment: {baseUrl}");
            }

            string envToken = Environment.GetEnvironmentVariable("YAAD_SESSION_TOKEN") ?? Environment.GetEnvironmentVariable("SUPABASE_ACCESS_TOKEN");
            string envUser = Environment.GetEnvironmentVariable("YAAD_USER_ID") ?? Environment.GetEnvironmentVariable("SUPABASE_USER_ID");
            if (!string.IsNullOrEmpty(envToken))
            {
                SetSessionToken(envToken, envUser ?? "authenticated-user");
                Debug.Log("[YaadApiClient] Loaded session token from environment.");
            }
        }

        private void OnDestroy()
        {
            if (Instance == this)
            {
                Instance = null;
            }
        }

        public void SetBaseUrl(string url)
        {
            if (!string.IsNullOrWhiteSpace(url))
            {
                baseUrl = url.TrimEnd('/');
            }
        }

        public void SetCloudMode(bool cloudEnabled)
        {
            runInCloudMode = cloudEnabled;
            // Prevent demo token from ever being used in Cloud Mode
            if (runInCloudMode && sessionAccessToken == "demo_token")
            {
                ClearSession();
            }
            Debug.Log($"[YaadApiClient] Cloud Mode: {(runInCloudMode ? "ENABLED (Connecting to Next.js API)" : "DISABLED (Local Demo Mode)")}");
        }

        public void SetSessionToken(string token, string userId)
        {
            sessionAccessToken = token;
            authenticatedUserId = userId;
        }

        public void ClearSession()
        {
            sessionAccessToken = null;
            authenticatedUserId = null;
        }

        public void Logout()
        {
            ClearSession();
            Debug.Log("[YaadApiClient] Session cleared from memory on user sign-out.");
        }

        #region API Operations

        /// <summary>
        /// Authenticate with Next.js /api/auth/login
        /// </summary>
        public void Authenticate(string email, string password, Action<bool, string> onComplete)
        {
            if (!runInCloudMode)
            {
                // In demo mode, sign-in is instant and local
                SetSessionToken("demo_token", "demo-user");
                onComplete?.Invoke(true, "Signed in via Demo Mode");
                return;
            }

            var payload = new LoginRequestDto { email = email, password = password };
            string json = JsonUtility.ToJson(payload);

            StartCoroutine(PostJson<LoginResponseDto>($"{baseUrl}/api/auth/login", json, false, (success, response, error) =>
            {
                if (success && response != null && response.success && response.session != null)
                {
                    SetSessionToken(response.session.access_token, response.session.user.id);
                    onComplete?.Invoke(true, $"Signed in as {response.session.user.email}");
                }
                else
                {
                    string err = response != null && !string.IsNullOrEmpty(response.error) ? response.error : error;
                    onComplete?.Invoke(false, err ?? "Login failed");
                }
            }));
        }

        /// <summary>
        /// Fetch user's tracked belongings from /api/items
        /// </summary>
        public void FetchItems(Action<bool, List<SpatialTrackedItem>, string> onComplete)
        {
            if (!runInCloudMode || !IsAuthenticated)
            {
                // Demo Mode: Return fallback items without network requests
                onComplete?.Invoke(true, GetDemoFallbackItems(), null);
                return;
            }

            StartCoroutine(GetJson<GetItemsResponseDto>($"{baseUrl}/api/items", true, (success, response, error) =>
            {
                if (success && response != null && response.success)
                {
                    var resultList = new List<SpatialTrackedItem>();
                    if (response.items != null)
                    {
                        foreach (var item in response.items)
                        {
                            resultList.Add(MapDtoToSpatialItem(item));
                        }
                    }
                    onComplete?.Invoke(true, resultList, null);
                }
                else
                {
                    string err = response != null && !string.IsNullOrEmpty(response.error) ? response.error : error;
                    onComplete?.Invoke(false, null, err ?? "Failed to load belongings");
                }
            }));
        }

        /// <summary>
        /// Analyze simulated camera frame via /api/analyze.
        /// Defaults to mock provider and liveConfirmed = false for safety.
        /// Live Meta Muse inference requires explicit requestedProvider = "meta_muse" and liveConfirmed = true.
        /// </summary>
        public void AnalyzeFrame(
            string base64Image,
            string query,
            Action<bool, List<SpatialDetectedCandidate>, string> onComplete,
            string requestedProvider = "mock",
            bool liveConfirmed = false)
        {
            if (!runInCloudMode)
            {
                // Demo Mode: generate local grounded candidates with simulated latency
                StartCoroutine(SimulateLocalAnalysis(query, onComplete));
                return;
            }

            var payload = new AnalyzeRequestDto
            {
                image = base64Image,
                requestedQuery = query ?? "",
                source = "glasses_sdk",
                userId = CurrentUserId,
                requestedProvider = string.IsNullOrEmpty(requestedProvider) ? "mock" : requestedProvider,
                liveConfirmed = liveConfirmed
            };

            string json = JsonUtility.ToJson(payload);

            StartCoroutine(PostJson<AnalyzeResponseDto>($"{baseUrl}/api/analyze", json, true, (success, response, error) =>
            {
                if (success && response != null && response.success)
                {
                    var candidates = new List<SpatialDetectedCandidate>();
                    if (response.candidates != null)
                    {
                        foreach (var cand in response.candidates)
                        {
                            float conf = cand.confidence == "high" ? 0.94f : cand.confidence == "medium" ? 0.85f : 0.65f;

                            SpatialCoordinates coords = null;
                            if (cand.coordinates != null && (cand.coordinates.latitude != 0 || cand.coordinates.longitude != 0))
                            {
                                coords = new SpatialCoordinates(
                                    cand.coordinates.latitude,
                                    cand.coordinates.longitude,
                                    cand.coordinates.accuracy,
                                    cand.coordinates.place_name
                                );
                            }

                            candidates.Add(new SpatialDetectedCandidate(
                                cand.id,
                                cand.item_name,
                                cand.location_description,
                                conf,
                                "Just now",
                                cand.category,
                                cand.description,
                                cand.landmarks,
                                coords,
                                !string.IsNullOrEmpty(cand.image_reference) ? cand.image_reference : base64Image
                            ));
                        }
                    }
                    onComplete?.Invoke(true, candidates, null);
                }
                else
                {
                    string err = response != null && !string.IsNullOrEmpty(response.error) ? response.error : error;
                    onComplete?.Invoke(false, null, err ?? "Analysis failed");
                }
            }));
        }

        /// <summary>
        /// Explicit opt-in for live Meta Muse inference frame analysis.
        /// Explicitly passes requestedProvider: "meta_muse" and liveConfirmed = true.
        /// </summary>
        public void AnalyzeFrameLive(
            string base64Image,
            string query,
            Action<bool, List<SpatialDetectedCandidate>, string> onComplete)
        {
            AnalyzeFrame(base64Image, query, onComplete, requestedProvider: "meta_muse", liveConfirmed: true);
        }

        /// <summary>
        /// Confirm candidate and persist to /api/items/confirm
        /// </summary>
        public void ConfirmCandidate(SpatialDetectedCandidate candidate, Action<bool, SpatialTrackedItem, string> onComplete)
        {
            if (candidate == null)
            {
                onComplete?.Invoke(false, null, "Candidate cannot be null");
                return;
            }

            if (!runInCloudMode || !IsAuthenticated)
            {
                // Demo Mode: create local tracked item preserving candidate metadata
                var localItem = new SpatialTrackedItem(
                    candidate.id,
                    candidate.name,
                    candidate.category ?? "Belonging",
                    candidate.detectedLocation,
                    "Just now",
                    new Color(0.1f, 0.6f, 0.9f),
                    candidate.description ?? $"Observed at {candidate.detectedLocation}",
                    candidate.landmarks != null && candidate.landmarks.Length > 0
                        ? new List<string>(candidate.landmarks)
                        : new List<string> { $"Observed at {candidate.detectedLocation}" }
                );
                onComplete?.Invoke(true, localItem, null);
                return;
            }

            BackendCoordinatesDto coordsDto = null;
            if (candidate.coordinates != null && candidate.coordinates.IsValid())
            {
                coordsDto = new BackendCoordinatesDto
                {
                    latitude = candidate.coordinates.latitude,
                    longitude = candidate.coordinates.longitude,
                    accuracy = candidate.coordinates.accuracy,
                    place_name = candidate.coordinates.place_name
                };
            }

            string mappedConfidence = candidate.confidence >= 0.9f ? "high" : candidate.confidence >= 0.7f ? "medium" : "low";

            var payload = new ConfirmCandidatePayloadDto
            {
                candidate = new BackendCandidateDto
                {
                    id = candidate.id,
                    item_name = candidate.name,
                    category = !string.IsNullOrEmpty(candidate.category) ? candidate.category : "Belonging",
                    location_description = candidate.detectedLocation,
                    landmarks = candidate.landmarks ?? new string[0],
                    description = !string.IsNullOrEmpty(candidate.description) ? candidate.description : $"Observed at {candidate.detectedLocation}",
                    confidence = mappedConfidence,
                    is_selected = true,
                    coordinates = coordsDto,
                    image_reference = candidate.image_reference
                },
                source = "glasses_sdk",
                image_reference = candidate.image_reference,
                coordinates = coordsDto
            };

            string json = JsonUtility.ToJson(payload);

            StartCoroutine(PostJson<ConfirmCandidateResponseDto>($"{baseUrl}/api/items/confirm", json, true, (success, response, error) =>
            {
                if (success && response != null && response.success && response.item != null)
                {
                    var mappedItem = MapDtoToSpatialItem(response.item);
                    onComplete?.Invoke(true, mappedItem, null);
                }
                else
                {
                    string err = response != null && !string.IsNullOrEmpty(response.error) ? response.error : error;
                    onComplete?.Invoke(false, null, err ?? "Failed to save confirmed item");
                }
            }));
        }

        /// <summary>
        /// Query grounded recall via /api/recall
        /// Supports authenticated Cloud Mode and offline Demo Mode fallback.
        /// </summary>
        public void QueryRecall(string query, Action<bool, SpatialRecallResult, string> onComplete)
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                onComplete?.Invoke(false, null, "Query cannot be empty");
                return;
            }

            if (!runInCloudMode)
            {
                // Strict Demo Mode: zero network requests, offline deterministic recall
                SpatialRecallResult demoResult = ExecuteDemoOfflineRecall(query);
                onComplete?.Invoke(true, demoResult, null);
                return;
            }

            var payload = new RecallRequestDto { query = query };
            string json = JsonUtility.ToJson(payload);

            StartCoroutine(PostJson<RecallResponseDto>($"{baseUrl}/api/recall", json, IsAuthenticated, (success, response, error) =>
            {
                if (success && response != null && response.success)
                {
                    if (response.found && response.item != null)
                    {
                        string visualDesc = response.observation != null ? response.observation.description : null;

                        SpatialCoordinates coords = null;
                        if (response.item.coordinates != null)
                        {
                            var cDto = response.item.coordinates;
                            if (Math.Abs(cDto.latitude) > 0.000001 || Math.Abs(cDto.longitude) > 0.000001)
                            {
                                bool hasAcc = cDto.accuracy > 0f && !float.IsNaN(cDto.accuracy);
                                coords = new SpatialCoordinates(cDto.latitude, cDto.longitude, hasAcc ? cDto.accuracy : 0f, hasAcc, cDto.place_name);
                            }
                        }
                        float geofenceRadius = response.item.geofence_radius_meters > 0f ? response.item.geofence_radius_meters : 50f;

                        var result = new SpatialRecallResult(
                            response.query,
                            true,
                            response.item.item_name,
                            response.item.last_location_description,
                            response.item.last_observed_at ?? "Recent",
                            visualDesc,
                            response.item.landmarks,
                            response.speechSummary,
                            response.disclaimer,
                            response.isCloud,
                            0.94f,
                            coords,
                            geofenceRadius
                        );
                        onComplete?.Invoke(true, result, null);
                    }
                    else
                    {
                        var emptyResult = new SpatialRecallResult(
                            query,
                            false,
                            null,
                            null,
                            null,
                            null,
                            null,
                            response.message ?? "No sighting recorded.",
                            response.disclaimer ?? "Yaad records historical sightings only and never guesses present whereabouts.",
                            response.isCloud,
                            0.0f
                        );
                        onComplete?.Invoke(true, emptyResult, null);
                    }
                }
                else
                {
                    string err = response != null && !string.IsNullOrEmpty(response.error) ? response.error : error;
                    onComplete?.Invoke(false, null, err ?? "Recall query failed");
                }
            }));
        }

        private SpatialRecallResult ExecuteDemoOfflineRecall(string query)
        {
            string q = query.ToLower().Trim();
            if (q.Contains("key"))
            {
                return new SpatialRecallResult(
                    query, true, "Apartment Keys with Brass Carabiner",
                    "On the wooden coffee table near the ceramic coffee mug",
                    "Today at 10:15 AM",
                    "Brass carabiner keychain recorded lying flat on oak surface beside a white ceramic mug.",
                    new string[] { "wooden coffee table", "ceramic coffee mug", "open notebook" },
                    "Your Apartment Keys with Brass Carabiner was last recorded on the wooden coffee table near the ceramic coffee mug.",
                    "Last recorded historical sighting only (Demo Mode).",
                    false,
                    0.94f,
                    new SpatialCoordinates(37.7749, -122.4194, 8f, true, "Mission District Artisan Cafe"),
                    50f
                );
            }
            if (q.Contains("wallet") || q.Contains("card"))
            {
                return new SpatialRecallResult(
                    query, true, "Brown Leather Cardholder Wallet",
                    "On the café round bistro table next to the laptop charger",
                    "Today at 8:45 AM",
                    "Folded leather wallet recorded on the small cafe table next to an uncoiled USB-C power block.",
                    new string[] { "round bistro table", "laptop charger", "water glass" },
                    "Your Brown Leather Cardholder Wallet was last recorded on the café round bistro table next to the laptop charger.",
                    "Last recorded historical sighting only (Demo Mode).",
                    false,
                    0.92f,
                    new SpatialCoordinates(37.7749, -122.4194, 8f, true, "Mission District Artisan Cafe"),
                    50f
                );
            }
            if (q.Contains("glass"))
            {
                return new SpatialRecallResult(
                    query, true, "Prescription Reading Glasses",
                    "On the hall console table near the front door key dish",
                    "Yesterday at 9:30 PM",
                    "Prescription frames resting on wooden console table near front door key dish.",
                    new string[] { "hall console table", "ceramic key dish", "mail stack" },
                    "Your Prescription Reading Glasses was last recorded on the hall console table near the front door key dish.",
                    "Last recorded historical sighting only (Demo Mode).",
                    false,
                    0.90f,
                    new SpatialCoordinates(37.7785, -122.4121, 10f, true, "Home Entrance Hall"),
                    30f
                );
            }
            return new SpatialRecallResult(
                query, false, null, null, null, null, null,
                "No sighting recorded.",
                "Yaad records historical sightings only and never guesses present whereabouts.",
                false,
                0.0f,
                null,
                50f
            );
        }

        #endregion

        #region HTTP Helpers

        private IEnumerator GetJson<T>(string url, bool includeAuth, Action<bool, T, string> callback)
        {
            using (UnityWebRequest req = UnityWebRequest.Get(url))
            {
                req.timeout = Mathf.RoundToInt(requestTimeoutSeconds);
                req.SetRequestHeader("Accept", "application/json");

                if (includeAuth && !string.IsNullOrEmpty(sessionAccessToken))
                {
                    req.SetRequestHeader("Authorization", $"Bearer {sessionAccessToken}");
                }

                yield return req.SendWebRequest();

                ProcessResponse<T>(req, callback);
            }
        }

        private IEnumerator PostJson<T>(string url, string jsonBody, bool includeAuth, Action<bool, T, string> callback)
        {
            using (UnityWebRequest req = new UnityWebRequest(url, "POST"))
            {
                byte[] bodyRaw = Encoding.UTF8.GetBytes(jsonBody);
                req.uploadHandler = new UploadHandlerRaw(bodyRaw);
                req.downloadHandler = new DownloadHandlerBuffer();
                req.timeout = Mathf.RoundToInt(requestTimeoutSeconds);

                req.SetRequestHeader("Content-Type", "application/json");
                req.SetRequestHeader("Accept", "application/json");

                if (includeAuth && !string.IsNullOrEmpty(sessionAccessToken))
                {
                    req.SetRequestHeader("Authorization", $"Bearer {sessionAccessToken}");
                }

                yield return req.SendWebRequest();

                ProcessResponse<T>(req, callback);
            }
        }

        private void ProcessResponse<T>(UnityWebRequest req, Action<bool, T, string> callback)
        {
            if (req.result == UnityWebRequest.Result.ConnectionError || req.result == UnityWebRequest.Result.ProtocolError)
            {
                // Invalidate session on 401 Unauthorized to prevent sending stale/expired tokens
                if (req.responseCode == 401)
                {
                    ClearSession();
                }

                string errorMsg = $"Network Error ({req.responseCode}): {req.error}";
                if (!string.IsNullOrEmpty(req.downloadHandler?.text))
                {
                    try
                    {
                        T errorObj = JsonUtility.FromJson<T>(req.downloadHandler.text);
                        callback?.Invoke(false, errorObj, errorMsg);
                        return;
                    }
                    catch { }
                }
                callback?.Invoke(false, default, errorMsg);
                return;
            }

            try
            {
                string responseText = req.downloadHandler.text;
                T data = JsonUtility.FromJson<T>(responseText);
                callback?.Invoke(true, data, null);
            }
            catch (Exception ex)
            {
                callback?.Invoke(false, default, $"JSON Parse Exception: {ex.Message}");
            }
        }

        #endregion

        #region Mappers & Fallbacks

        public static SpatialTrackedItem MapDtoToSpatialItem(BackendTrackedItemDto dto)
        {
            if (dto == null) return null;

            Color accent = dto.category switch
            {
                "Everyday Carry" => new Color(0.2f, 0.6f, 0.95f),
                "Health & Vision" => new Color(0.95f, 0.6f, 0.2f),
                "Personal Item" => new Color(0.3f, 0.8f, 0.5f),
                _ => new Color(0.5f, 0.5f, 0.85f)
            };

            var history = new List<string>();
            if (dto.last_landmarks != null)
            {
                foreach (var lm in dto.last_landmarks)
                {
                    history.Add($"Landmark: {lm}");
                }
            }
            if (history.Count == 0)
            {
                history.Add($"Observed at {dto.last_location_description}");
            }

            return new SpatialTrackedItem(
                dto.id,
                dto.item_name,
                dto.category ?? "Belonging",
                dto.last_location_description ?? "Unknown location",
                dto.last_observed_at ?? "Recent",
                accent,
                $"Status: {dto.status}",
                history
            );
        }

        private List<SpatialTrackedItem> GetDemoFallbackItems()
        {
            return new List<SpatialTrackedItem>
            {
                new SpatialTrackedItem(
                    "item_1", "Car Keys with Blue Tag", "Everyday Carry", "Oak Wooden Desk near MacBook", "Today at 10:15 AM",
                    new Color(0.2f, 0.6f, 0.95f), "Attached to keychain with silver bottle opener.",
                    new List<string> { "Captured 10:15 AM on Desk", "Observed 8:30 AM in Kitchen Tray" }
                ),
                new SpatialTrackedItem(
                    "item_2", "Reading Glasses (Tortoise)", "Health & Vision", "Bedside Nightstand by Lamp", "Yesterday at 9:30 PM",
                    new Color(0.95f, 0.6f, 0.2f), "Tortoise shell frame, anti-glare lenses.",
                    new List<string> { "Captured 9:30 PM on Nightstand", "Observed 3:15 PM on Living Room Sofa" }
                ),
                new SpatialTrackedItem(
                    "item_3", "Brown Leather Wallet", "Everyday Carry", "Hallway Console Table near Entrance", "Today at 8:45 AM",
                    new Color(0.3f, 0.8f, 0.5f), "Bifold brown leather with transit pass in outer slot.",
                    new List<string> { "Captured 8:45 AM on Hallway Console" }
                ),
                new SpatialTrackedItem(
                    "item_4", "Stainless Water Bottle", "Personal Item", "Kitchen Countertop beside Espresso Machine", "Today at 11:20 AM",
                    new Color(0.6f, 0.4f, 0.9f), "Silver insulated bottle with black sports cap.",
                    new List<string> { "Captured 11:20 AM on Kitchen Counter" }
                ),
                new SpatialTrackedItem(
                    "item_5", "Front Door House Keys", "Everyday Carry", "Key Hook by Front Entrance", "Yesterday at 6:00 PM",
                    new Color(0.9f, 0.3f, 0.3f), "Brass keys with green lanyard.",
                    new List<string> { "Captured 6:00 PM on Key Hook" }
                )
            };
        }

        private IEnumerator SimulateLocalAnalysis(string query, Action<bool, List<SpatialDetectedCandidate>, string> onComplete)
        {
            yield return new WaitForSeconds(0.4f);

            var candidates = new List<SpatialDetectedCandidate>
            {
                new SpatialDetectedCandidate("cand_demo_1", "Car Keys with Blue Tag", "Oak Wooden Desk near MacBook", 0.94f, "Just now", "Keys", "Attached to keychain with silver bottle opener.", new string[] { "wooden desk", "MacBook" }),
                new SpatialDetectedCandidate("cand_demo_2", "Reading Glasses (Tortoise)", "Bedside Nightstand by Lamp", 0.91f, "Just now", "Health & Vision", "Tortoise shell frame, anti-glare lenses.", new string[] { "nightstand", "lamp" })
            };

            onComplete?.Invoke(true, candidates, null);
        }

        #endregion
    }
}

