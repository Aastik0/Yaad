using System;
using System.Collections.Generic;
using UnityEngine;

namespace Yaad.Spatial.Models
{
    [Serializable]
    public class SpatialTrackedItem
    {
        public string id;
        public string name;
        public string category;
        public string lastSeenLocation;
        public string lastSeenTimestamp;
        public Color accentColor;
        public string notes;
        public string status;
        public List<string> observationHistory = new List<string>();

        public SpatialTrackedItem(string id, string name, string category, string location, string timestamp, Color color, string notes, List<string> history)
        {
            this.id = id;
            this.name = name;
            this.category = category;
            this.lastSeenLocation = location;
            this.lastSeenTimestamp = timestamp;
            this.accentColor = color;
            this.notes = notes;
            this.status = "confirmed";
            if (history != null) this.observationHistory = history;
        }
    }

    [Serializable]
    public class SpatialDetectedCandidate
    {
        public string id;
        public string name;
        public string detectedLocation;
        public float confidence;
        public string timestamp;
        public bool isConfirmed;

        // Phase 25B.3 Bidirectional Synchronization Metadata
        public string category;
        public string description;
        public string[] landmarks;
        public SpatialCoordinates coordinates;
        public string image_reference;

        // Legacy / simplified constructor for backward compatibility
        public SpatialDetectedCandidate(string id, string name, string location, float confidence, string timestamp)
            : this(id, name, location, confidence, timestamp, "Belonging", $"Observed at {location}", new string[0], null, null)
        {
        }

        // Full metadata candidate constructor
        public SpatialDetectedCandidate(
            string id,
            string name,
            string location,
            float confidence,
            string timestamp,
            string category,
            string description,
            string[] landmarks,
            SpatialCoordinates coordinates = null,
            string image_reference = null)
        {
            this.id = id;
            this.name = name;
            this.detectedLocation = location;
            this.confidence = confidence;
            this.timestamp = timestamp;
            this.category = !string.IsNullOrEmpty(category) ? category : "Belonging";
            this.description = description;
            this.landmarks = landmarks ?? new string[0];
            this.coordinates = coordinates;
            this.image_reference = image_reference;
            this.isConfirmed = false;
        }
    }

    public enum GpsAccuracyTier
    {
        Target,       // <= 10m (Excellent)
        Acceptable,   // 11-30m (High Precision)
        Uncertain,    // 31-80m (Uncertain - Amber warning, landmarks prioritized)
        Unusable,     // > 80m (Unusable for navigation)
        Unavailable   // Missing / invalid / null / (0,0) (No GPS recorded - Indoor Landmark Grounded)
    }

    [Serializable]
    public class SpatialCoordinates
    {
        public double latitude;
        public double longitude;
        public float accuracy;
        public bool hasAccuracy;
        public string place_name;

        public SpatialCoordinates()
        {
            this.latitude = 0;
            this.longitude = 0;
            this.accuracy = 0;
            this.hasAccuracy = false;
            this.place_name = null;
        }

        public SpatialCoordinates(double lat, double lon, float acc = 0f, bool hasAcc = false, string place = null)
        {
            this.latitude = lat;
            this.longitude = lon;
            this.accuracy = acc;
            this.hasAccuracy = hasAcc && acc > 0f && !float.IsNaN(acc);
            this.place_name = place;
        }

        public SpatialCoordinates(double lat, double lon, float acc, string place)
            : this(lat, lon, acc, acc > 0f && !float.IsNaN(acc), place)
        {
        }

        /// <summary>
        /// Validates whether coordinates are non-zero, within Earth bounds, and not Null Island (0,0).
        /// </summary>
        public bool IsValid()
        {
            if (double.IsNaN(latitude) || double.IsNaN(longitude)) return false;
            if (latitude < -90.0 || latitude > 90.0) return false;
            if (longitude < -180.0 || longitude > 180.0) return false;
            if (Math.Abs(latitude) < 0.000001 && Math.Abs(longitude) < 0.000001) return false;
            return true;
        }

        public static GpsAccuracyTier ClassifyAccuracy(SpatialCoordinates coords)
        {
            if (coords == null || !coords.IsValid())
            {
                return GpsAccuracyTier.Unavailable;
            }
            if (!coords.hasAccuracy || coords.accuracy <= 0f || float.IsNaN(coords.accuracy))
            {
                return GpsAccuracyTier.Uncertain; // Not high precision
            }
            if (coords.accuracy <= 10f) return GpsAccuracyTier.Target;
            if (coords.accuracy <= 30f) return GpsAccuracyTier.Acceptable;
            if (coords.accuracy <= 80f) return GpsAccuracyTier.Uncertain;
            return GpsAccuracyTier.Unusable;
        }

        public static GpsAccuracyTier ClassifyAccuracy(float? accuracy)
        {
            if (!accuracy.HasValue || accuracy.Value <= 0f || float.IsNaN(accuracy.Value))
            {
                return GpsAccuracyTier.Unavailable;
            }
            if (accuracy.Value <= 10f) return GpsAccuracyTier.Target;
            if (accuracy.Value <= 30f) return GpsAccuracyTier.Acceptable;
            if (accuracy.Value <= 80f) return GpsAccuracyTier.Uncertain;
            return GpsAccuracyTier.Unusable;
        }
    }

    [Serializable]
    public class SpatialRecallResult
    {
        public string query;
        public bool found;
        public string itemName;
        public string lastRecordedLocation;
        public string lastRecordedTimestamp;
        public string visualDescription;
        public string[] landmarks;
        public string speechSummary;
        public string disclaimer;
        public bool isCloud;
        public float confidence;

        // Phase 25B.2 GPS & Location Grounding Fields
        public SpatialCoordinates coordinates;
        public bool hasGps;
        public float accuracyMeters;
        public bool hasAccuracy;
        public GpsAccuracyTier locationTier;
        public string placeName;
        public float geofenceRadiusMeters;

        // Legacy / simplified constructor for backward compatibility
        public SpatialRecallResult(string query, bool found, string itemName, string location, string timestamp, string speechSummary, float confidence)
            : this(query, found, itemName, location, timestamp, null, null, speechSummary, null, false, confidence, null, 50f)
        {
        }

        // Full grounded recall constructor (Phase 25B.1)
        public SpatialRecallResult(
            string query,
            bool found,
            string itemName,
            string location,
            string timestamp,
            string visualDescription,
            string[] landmarks,
            string speechSummary,
            string disclaimer,
            bool isCloud,
            float confidence)
            : this(query, found, itemName, location, timestamp, visualDescription, landmarks, speechSummary, disclaimer, isCloud, confidence, null, 50f)
        {
        }

        // Phase 25B.2 Grounded Location & GPS constructor
        public SpatialRecallResult(
            string query,
            bool found,
            string itemName,
            string location,
            string timestamp,
            string visualDescription,
            string[] landmarks,
            string speechSummary,
            string disclaimer,
            bool isCloud,
            float confidence,
            SpatialCoordinates coordinates,
            float geofenceRadiusMeters = 50f)
        {
            this.query = query;
            this.found = found;
            this.itemName = itemName;
            this.lastRecordedLocation = location;
            this.lastRecordedTimestamp = timestamp;
            this.visualDescription = visualDescription;
            this.landmarks = landmarks;
            this.speechSummary = speechSummary;
            this.disclaimer = disclaimer;
            this.isCloud = isCloud;
            this.confidence = confidence;

            this.geofenceRadiusMeters = geofenceRadiusMeters;
            if (coordinates != null && coordinates.IsValid())
            {
                this.coordinates = coordinates;
                this.hasGps = true;
                this.accuracyMeters = coordinates.accuracy;
                this.hasAccuracy = coordinates.hasAccuracy;
                this.placeName = coordinates.place_name;
                this.locationTier = SpatialCoordinates.ClassifyAccuracy(coordinates);
            }
            else
            {
                this.coordinates = null;
                this.hasGps = false;
                this.accuracyMeters = 0f;
                this.hasAccuracy = false;
                this.placeName = null;
                this.locationTier = GpsAccuracyTier.Unavailable;
            }
        }
    }

    #region Phase 26A Models: Spatial Guidance & Proactive Departure Intelligence

    public enum SpatialGuidanceState
    {
        Inactive,
        GroundedLocationAvailable,
        ActiveGpsGuidance = GroundedLocationAvailable,
        LandmarkOnlyGuidance,
        GpsUncertain,
        GpsUnavailable,
        NoRecordedSighting,
        Dismissed,
        Cancelled
    }

    [Serializable]
    public class SpatialGuidanceData
    {
        public string query;
        public string itemName;
        public string locationDescription;
        public string[] landmarks;
        public string timestamp;
        public GpsAccuracyTier tier;
        public string disclaimer;
        public bool isSimulatedIndoor;
        public Vector3 simulatedWorldPosition;
        public SpatialCoordinates coordinates;

        public string locationName => locationDescription;
        public GpsAccuracyTier locationTier => tier;
        public float accuracyMeters => coordinates != null ? (float)coordinates.accuracy : 0f;

        public SpatialGuidanceData(
            string query,
            string itemName,
            string locationDescription,
            string[] landmarks,
            string timestamp,
            GpsAccuracyTier tier,
            string disclaimer,
            bool isSimulatedIndoor,
            Vector3 simulatedWorldPosition,
            SpatialCoordinates coordinates = null)
        {
            this.query = query;
            this.itemName = itemName;
            this.locationDescription = locationDescription;
            this.landmarks = landmarks ?? new string[0];
            this.timestamp = timestamp;
            this.tier = tier;
            this.disclaimer = disclaimer;
            this.isSimulatedIndoor = isSimulatedIndoor;
            this.simulatedWorldPosition = simulatedWorldPosition;
            this.coordinates = coordinates;
        }
    }

    public enum DepartureBoundaryType
    {
        RoomLevel,
        GeofenceHome,
        HomeGeofence = GeofenceHome
    }

    public enum DepartureEventState
    {
        Inside,
        ApproachingBoundary,
        CrossedBoundary,
        ReturnedInside,
        Dismissed
    }

    [Serializable]
    public class SpatialDepartureReminder
    {
        public string itemId;
        public string itemName;
        public string lastLocation;
        public string lastSeenTimestamp;
        public DepartureBoundaryType boundaryType;
        public string reminderMessage;
        public long timestampMs;

        public string lastSeenLocation => lastLocation;
        public string calmSpokenPrompt => reminderMessage;

        public SpatialDepartureReminder(
            string itemId,
            string itemName,
            string lastLocation,
            string lastSeenTimestamp,
            DepartureBoundaryType boundaryType,
            string reminderMessage,
            long timestampMs)
        {
            this.itemId = itemId;
            this.itemName = itemName;
            this.lastLocation = lastLocation;
            this.lastSeenTimestamp = lastSeenTimestamp;
            this.boundaryType = boundaryType;
            this.reminderMessage = reminderMessage;
            this.timestampMs = timestampMs;
        }
    }

    #endregion
}

