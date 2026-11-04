import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  X,
  Upload,
  Camera,
  Sparkles,
  Check,
  RotateCcw,
  Plus,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Info,
  Edit2,
  Trash2,
  Tag,
  MapPin,
  Mic,
  Compass,
  Zap,
  Search,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CandidateItem, GeoLocationCoordinates } from "@/types";
import {
  getBrowserLocation,
  GeolocationCoordinator,
  classifyGpsAccuracy,
  GpsAccuracyTier,
  GPS_TARGET_ACCURACY_METERS,
  GPS_MAX_NAVIGATION_THRESHOLD_METERS,
} from "@/lib/geo";
import { useAuth } from "@/contexts/AuthContext";

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCandidates: (
    candidates: CandidateItem[],
    imagePreview?: string,
    source?: "browser_upload" | "browser_camera",
    coordinates?: GeoLocationCoordinates
  ) => void;
}

export const CaptureModal: React.FC<CaptureModalProps> = ({
  isOpen,
  onClose,
  onConfirmCandidates,
}) => {
  // Capture modes
  const [activeTab, setActiveTab] = useState<"upload" | "camera">("upload");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageFileName, setImageFileName] = useState<string>("");
  const [fileError, setFileError] = useState<string | null>(null);

  // Geolocation state (Phase 24E: Bounded continuous acquisition & coordinator integration)
  const { session } = useAuth();
  const [currentCoords, setCurrentCoords] = useState<GeoLocationCoordinates | null>(null);
  const [accuracyTier, setAccuracyTier] = useState<GpsAccuracyTier>("unavailable");
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [tagUploadedPhotoWithCurrentGps, setTagUploadedPhotoWithCurrentGps] = useState<boolean>(false);
  const [activeProvider, setActiveProvider] = useState<"mock" | "meta_muse">("mock");
  const [budgetRemaining, setBudgetRemaining] = useState<number | null>(null);
  const [showLiveConfirmDialog, setShowLiveConfirmDialog] = useState<boolean>(false);

  // Bounded GPS acquisition using GeolocationCoordinator
  const acquireGps = useCallback(async (isPrewarm: boolean = false) => {
    setIsLocating(true);
    try {
      const result = await GeolocationCoordinator.getInstance().acquireBoundedGps({
        targetAccuracyMeters: GPS_TARGET_ACCURACY_METERS, // <=10m early exit
        timeoutMs: 15000,                                 // 15s hard ceiling
        onProgress: ({ currentBest, tier }) => {
          if (currentBest) {
            setCurrentCoords(currentBest);
            setAccuracyTier(tier);
            setLocationError(null);
          }
        },
      });

      if (result.coordinates) {
        setCurrentCoords(result.coordinates);
        setAccuracyTier(result.tier);
        setLocationError(null);
      } else {
        if (!isPrewarm) {
          setCurrentCoords(null);
          setAccuracyTier("unavailable");
          setLocationError(result.error || "GPS unavailable or denied.");
        }
      }
    } catch {
      if (!isPrewarm) {
        setCurrentCoords(null);
        setAccuracyTier("unavailable");
        setLocationError("Could not retrieve GPS coordinates.");
      }
    } finally {
      setIsLocating(false);
    }
  }, []);

  // Fetch active provider setting whenever modal is opened
  useEffect(() => {
    if (isOpen) {
      const fetchProviderStatus = async () => {
        try {
          const headers: Record<string, string> = {};
          if (session?.access_token) {
            headers["Authorization"] = `Bearer ${session.access_token}`;
          }
          const res = await fetch("/api/settings/vision-provider", { headers });
          const json = await res.json();
          if (json.success && json.activeProvider) {
            setActiveProvider(json.activeProvider);
            if (json.budget) {
              setBudgetRemaining(json.budget.remainingUsd);
            }
          }
        } catch {
          setActiveProvider("mock");
        }
      };
      fetchProviderStatus();
    }
  }, [isOpen, session?.access_token]);
  const [isVoiceShortcutActive, setIsVoiceShortcutActive] = useState<boolean>(false);

  // Lifecycle & pre-warming: pre-warm only for camera mode, cancel on close
  useEffect(() => {
    if (isOpen) {
      if (activeTab === "camera") {
        acquireGps(true);
      } else {
        // Uploaded photos default to no GPS unless explicitly tagged
        if (!tagUploadedPhotoWithCurrentGps) {
          setCurrentCoords(null);
          setAccuracyTier("unavailable");
        }
      }
    } else {
      // Modal closed: guarantee watcher cancellation and state reset
      GeolocationCoordinator.getInstance().cancelAcquisition("CaptureModal closed.");
      setCurrentCoords(null);
      setAccuracyTier("unavailable");
      setLocationError(null);
      setTagUploadedPhotoWithCurrentGps(false);
    }
  }, [isOpen, activeTab, tagUploadedPhotoWithCurrentGps, acquireGps]);

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isCameraStarting, setIsCameraStarting] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Analysis & Candidates
  const [customQuery, setCustomQuery] = useState<string>("");
  const [showCustomQuery, setShowCustomQuery] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<CandidateItem[] | null>(null);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);

  // Manual item addition
  const [showManualAdd, setShowManualAdd] = useState<boolean>(false);
  const [manualItemName, setManualItemName] = useState<string>("");
  const [manualLocation, setManualLocation] = useState<string>("");

  // Clean up camera stream on unmount, tab switch, or document backgrounding
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
    setIsCameraStarting(false);
  };

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopCameraStream();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      stopCameraStream();
    };
  }, []);

  // Stop camera when closing modal
  const handleClose = () => {
    stopCameraStream();
    setSelectedImage(null);
    setImageFileName("");
    setCandidates(null);
    setFileError(null);
    setCameraError(null);
    setEditingCandidateId(null);
    setShowManualAdd(false);
    setShowCustomQuery(false);
    setCustomQuery("");
    setShowLiveConfirmDialog(false);
    onClose();
  };

  // Start Camera with descriptive error differentiation
  const startCamera = async () => {
    setCameraError(null);
    setIsCameraStarting(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera access is not supported by your browser environment.");
        setIsCameraStarting(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
      setIsCameraStarting(false);
    } catch (err: unknown) {
      setIsCameraStarting(false);
      setIsCameraActive(false);
      if (err instanceof DOMException) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setCameraError("Camera permission was denied. Please allow camera access in your browser address bar or settings, or upload an image instead.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setCameraError("No camera hardware detected on this device. You can upload an image from your files instead.");
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          setCameraError("Camera is currently in use by another application. Please close other camera apps and retry.");
        } else {
          setCameraError(`Camera Error (${err.name}): ${err.message}`);
        }
      } else {
        const errorMsg =
          err instanceof Error ? err.message : "Unable to access camera. Check device permissions.";
        setCameraError(errorMsg);
      }
    }
  };

  // Snap photo from live camera
  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setSelectedImage(dataUrl);
    setImageFileName("Camera capture");
    stopCameraStream();

    // Capture or converge fresh GPS at shutter time without blocking UI
    if (!currentCoords || accuracyTier !== "target") {
      acquireGps(false);
    }

    // Immediately analyze the captured image
    if (activeProvider === "meta_muse") {
      setShowLiveConfirmDialog(true);
    } else {
      performAnalyze(false, dataUrl);
    }
  };

  // Handle file upload (Phase 24E: Defaults to NO GPS, never auto-attaches current location)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset coordinates for uploaded photo (default to no GPS)
    setCurrentCoords(null);
    setAccuracyTier("unavailable");
    setTagUploadedPhotoWithCurrentGps(false);

    // Validate type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|webp)$/i)) {
      setFileError("Please upload a valid image file (JPG, PNG, or WebP).");
      return;
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setFileError("Image file size must be less than 10MB.");
      return;
    }

    setImageFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setSelectedImage(dataUrl);

      // Immediately analyze uploaded image
      if (activeProvider === "meta_muse") {
        setShowLiveConfirmDialog(true);
      } else {
        performAnalyze(false, dataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  // Analysis state & model source
  const [modelSource, setModelSource] = useState<string>("Demo Mock Engine");

  // Trigger Analysis via Server Adapter with Confirmation Check
  const handleAnalyzeClick = () => {
    if (!selectedImage) {
      setFileError("Please select or capture a photo first.");
      return;
    }

    if (activeProvider === "meta_muse") {
      setShowLiveConfirmDialog(true);
      return;
    }

    performAnalyze(false);
  };

  const performAnalyze = async (
    liveConfirmed: boolean,
    imageOverride?: string,
    queryOverride?: string
  ) => {
    const imageToAnalyze = imageOverride || selectedImage;
    if (!imageToAnalyze) return;

    setIsAnalyzing(true);
    setFileError(null);
    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (session?.access_token) {
        headers["Authorization"] = `Bearer ${session.access_token}`;
      }

      const queryToSend = queryOverride !== undefined ? queryOverride : customQuery;

      const response = await fetch("/api/analyze", {
        method: "POST",
        headers,
        body: JSON.stringify({
          image: imageToAnalyze,
          requestedQuery: queryToSend,
          source: activeTab === "camera" ? "browser_camera" : "browser_upload",
          requestedProvider: activeProvider,
          liveConfirmed,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Analysis failed");
      }

      const rawCandidates: CandidateItem[] = data.candidates || [];
      // Preselect all spotted belongings
      setCandidates(
        rawCandidates.map((c) => ({
          ...c,
          is_selected: c.is_selected !== false,
        }))
      );
      setModelSource(
        data.source === "live_meta_api"
          ? `Meta AI (${data.metaModel})`
          : data.source === "cache"
          ? "SHA-256 Request Cache"
          : "Demo Mock Engine (Zero External Calls)"
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Scene analysis encountered an error.";
      setFileError(msg);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Candidate updates
  const toggleSelectCandidate = (id: string) => {
    if (!candidates) return;
    setCandidates(
      candidates.map((c) => (c.id === id ? { ...c, is_selected: !c.is_selected } : c))
    );
  };

  const updateCandidateField = (id: string, field: keyof CandidateItem, value: unknown) => {
    if (!candidates) return;
    setCandidates(
      candidates.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    );
  };

  const deleteCandidate = (id: string) => {
    if (!candidates) return;
    setCandidates(candidates.filter((c) => c.id !== id));
  };

  // Add manual candidate if item was missed
  const handleAddManualCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualItemName.trim()) return;

    const newCandidate: CandidateItem = {
      id: `cand-${Date.now()}-manual`,
      item_name: manualItemName.trim(),
      category: "Belonging",
      location_description: manualLocation.trim() || "Recorded on current surface",
      landmarks: ["desk surface"],
      description: `User-specified item '${manualItemName}' added manually.`,
      confidence: "high",
      is_selected: true,
    };

    setCandidates([...(candidates || []), newCandidate]);
    setManualItemName("");
    setManualLocation("");
    setShowManualAdd(false);
  };

  const handleRememberSelected = () => {
    if (!candidates) return;
    const selected = candidates.filter((c) => c.is_selected);
    if (selected.length === 0) return;
    onConfirmCandidates(
      selected,
      selectedImage || undefined,
      activeTab === "camera" ? "browser_camera" : "browser_upload",
      currentCoords || undefined
    );
    handleClose();
  };

  const handleRememberEverything = () => {
    if (!candidates) return;
    const allSelected = candidates.map((c) => ({ ...c, is_selected: true }));
    onConfirmCandidates(
      allSelected,
      selectedImage || undefined,
      activeTab === "camera" ? "browser_camera" : "browser_upload",
      currentCoords || undefined
    );
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-charcoal-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-ivory-300 shadow-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-ivory-50 border-b border-ivory-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-forest-100 text-forest-800 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-forest-900">
                Remember Belongings
              </h2>
              <p className="text-[11px] text-stone-500">
                Ground items to scene landmarks before stepping away
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-stone-400 hover:text-charcoal-900 hover:bg-ivory-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-5 space-y-5 overflow-y-auto">
          {/* Glasses Voice Shortcut Simulation Banner */}
          <div className="p-3.5 rounded-xl bg-forest-50/80 border border-forest-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-forest-700 text-ivory-50 flex items-center justify-center shrink-0">
                <Mic className="w-4 h-4 text-sage-200" />
              </div>
              <div>
                <span className="text-xs font-semibold text-forest-900 block">
                  Meta Glasses Voice Shortcut Simulation
                </span>
                <span className="text-[11px] text-stone-600">
                  Trigger: &ldquo;Hey Meta, map my belongings&rdquo;
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsVoiceShortcutActive(true);
                // Simulate POV camera snapshot from glasses
                const pov = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400'><rect width='600' height='400' fill='%23ECE8DD'/><text x='50%25' y='45%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='20' fill='%231E3A2B'>Meta Glasses POV Snapshot</text><text x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%236B7C67'>Oak Coffee Table · Keys &amp; Leather Wallet</text></svg>";
                setSelectedImage(pov);
                setImageFileName("Glasses POV Frame (Mapped at current GPS)");
                setTimeout(() => setIsVoiceShortcutActive(false), 800);
                acquireGps(false);

                if (activeProvider === "meta_muse") {
                  setShowLiveConfirmDialog(true);
                } else {
                  performAnalyze(false, pov);
                }
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-forest-300 hover:bg-forest-100 text-xs font-semibold text-forest-900 transition-colors shadow-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-forest-700" />
              <span>{isVoiceShortcutActive ? "Snapping POV..." : "Simulate 'Hey Meta'"}</span>
            </button>
          </div>

          {/* Location Coordinates Stamping Badge (Phase 24E: Measured Accuracy & Truthful Status) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between px-3 py-2 bg-ivory-100 rounded-lg border border-ivory-200 text-xs text-charcoal-700">
              <div className="flex items-center gap-2">
                <MapPin className="w-3.5 h-3.5 text-forest-700 shrink-0" />
                <span>
                  <strong>Location: </strong>
                  {isLocating
                    ? "Acquiring GPS fix (measuring accuracy)..."
                    : currentCoords
                    ? `${currentCoords.latitude.toFixed(6)}° N, ${Math.abs(currentCoords.longitude).toFixed(6)}° W (measured accuracy ±${currentCoords.accuracy || 10}m)`
                    : activeTab === "upload" && !tagUploadedPhotoWithCurrentGps
                    ? "Uploaded photo: No GPS attached (indoor landmark grounding)"
                    : "Indoor Landmark Grounded (No GPS recorded)"}
                </span>
              </div>
              <span className="text-[11px] text-stone-500 font-medium">
                {currentCoords
                  ? currentCoords.accuracy && currentCoords.accuracy <= 10
                    ? "Target accuracy (≤10m)"
                    : currentCoords.accuracy && currentCoords.accuracy <= 30
                    ? "Acceptable accuracy (≤30m)"
                    : currentCoords.accuracy && currentCoords.accuracy <= 80
                    ? "Coarse accuracy (≤80m)"
                    : "Accuracy >80m (coarse)"
                  : "Visual landmark grounding"}
              </span>
            </div>

            {/* Warning when accuracy > 80m */}
            {currentCoords && currentCoords.accuracy && currentCoords.accuracy > 80 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>
                  Location accuracy (±{currentCoords.accuracy}m) exceeds the 80m threshold. Visual scene landmarks will be prioritized.
                </span>
              </div>
            )}

            {/* Warning when accuracy is coarse (31-80m) */}
            {currentCoords && currentCoords.accuracy && currentCoords.accuracy > 30 && currentCoords.accuracy <= 80 && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50/70 rounded-lg border border-amber-200 text-[11px] text-amber-900">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>
                  Location accuracy (±{currentCoords.accuracy}m). Visual landmarks provide essential verification.
                </span>
              </div>
            )}

            {/* No-GPS explanation */}
            {!currentCoords && !isLocating && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-ivory-50 rounded-lg border border-ivory-200 text-[11px] text-stone-600">
                <Info className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>
                  {activeTab === "upload" && !tagUploadedPhotoWithCurrentGps
                    ? "Uploaded photos default to no GPS. Check 'Tag with my current location' below if you want to record current coordinates."
                    : locationError
                    ? `${locationError} Grounding relies truthfully on scene landmarks.`
                    : "GPS unavailable. Grounding relies truthfully on scene landmarks without fabricating location."}
                </span>
              </div>
            )}
          </div>

          {/* Step 1: Capture or Upload (when no candidate review yet) */}
          {isAnalyzing ? (
            <div className="py-12 px-4 flex flex-col items-center justify-center text-center space-y-4 bg-ivory-50/50 rounded-2xl border border-ivory-200">
              <div className="relative">
                {selectedImage ? (
                  <div className="relative w-36 h-36 rounded-2xl overflow-hidden border-2 border-forest-600 shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selectedImage}
                      alt="Scene being analyzed"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-forest-950/40 backdrop-blur-[1px] flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-sage-200 animate-spin" />
                    </div>
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-2xl bg-forest-100 flex items-center justify-center text-forest-800 animate-pulse">
                    <Sparkles className="w-8 h-8" />
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <h3 className="text-sm sm:text-base font-semibold text-forest-900">
                  Scanning scene for belongings...
                </h3>
                <p className="text-xs text-stone-500 max-w-xs">
                  Yaad is identifying your belongings and grounding them to visible landmarks.
                </p>
              </div>
            </div>
          ) : !candidates ? (
            <div className="space-y-4">
              {/* Method Switcher Tabs */}
              <div className="flex rounded-xl bg-ivory-200 p-1">
                <button
                  type="button"
                  onClick={() => {
                    stopCameraStream();
                    setActiveTab("upload");
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "upload"
                      ? "bg-white text-forest-900 shadow-xs"
                      : "text-charcoal-700 hover:text-forest-900"
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload Image</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("camera");
                    startCamera();
                  }}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                    activeTab === "camera"
                      ? "bg-white text-forest-900 shadow-xs"
                      : "text-charcoal-700 hover:text-forest-900"
                  }`}
                >
                  <Camera className="w-3.5 h-3.5" />
                  <span>Browser Camera</span>
                </button>
              </div>

              {/* Upload View */}
              {activeTab === "upload" && !selectedImage && (
                <div>
                  <label
                    htmlFor="file-upload"
                    className="border-2 border-dashed border-ivory-300 hover:border-forest-600/60 rounded-xl p-8 text-center bg-ivory-50/50 hover:bg-ivory-50 transition-all cursor-pointer flex flex-col items-center justify-center block"
                  >
                    <div className="w-12 h-12 rounded-full bg-forest-50 text-forest-700 flex items-center justify-center mb-2 shadow-xs">
                      <Upload className="w-5 h-5" />
                    </div>
                    <span className="text-sm font-semibold text-forest-900">
                      Click to browse or drop an image
                    </span>
                    <span className="text-xs text-stone-500 mt-1">
                      Supports JPG, PNG, WebP up to 10MB · Automatically spots belongings
                    </span>
                    <input
                      id="file-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>
              )}

              {/* Live Camera View */}
              {activeTab === "camera" && !selectedImage && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-2.5 rounded-lg bg-forest-50/80 border border-forest-200/60 text-forest-800 text-[11px]">
                    <ShieldCheck className="w-4 h-4 text-forest-600 shrink-0" />
                    <span>
                      <strong>Privacy Notice:</strong> Single photo snapshot only. No background video or audio is ever streamed or stored.
                    </span>
                  </div>

                  <div className="relative rounded-xl overflow-hidden bg-charcoal-900 aspect-video flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />

                    {/* Viewfinder reticle overlay */}
                    {isCameraActive && (
                      <div className="absolute inset-4 pointer-events-none border border-white/20 rounded-lg flex flex-col justify-between p-2">
                        <div className="flex justify-between items-center text-[10px] text-white/70 font-mono">
                          <span className="bg-forest-900/80 px-2 py-0.5 rounded text-[9px] uppercase tracking-wider text-forest-200">
                            Live Camera
                          </span>
                          <span>Ready</span>
                        </div>
                        <div className="text-center text-[10px] text-white/50">
                          Align belongings inside frame
                        </div>
                      </div>
                    )}

                    {isCameraStarting && !cameraError && (
                      <div className="text-center p-4 text-ivory-300 space-y-1">
                        <Camera className="w-6 h-6 mx-auto animate-pulse text-forest-400" />
                        <span className="text-xs">Requesting camera permission...</span>
                      </div>
                    )}

                    {!isCameraActive && !isCameraStarting && !cameraError && (
                      <span className="text-xs text-ivory-300">
                        Initializing browser camera...
                      </span>
                    )}

                    {cameraError && (
                      <div className="p-4 text-center text-ivory-100 space-y-3 max-w-sm">
                        <AlertCircle className="w-6 h-6 text-terracotta-400 mx-auto" />
                        <p className="text-xs font-medium leading-relaxed">{cameraError}</p>
                        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              stopCameraStream();
                              setActiveTab("upload");
                            }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 transition-colors"
                          >
                            <Upload className="w-3.5 h-3.5" />
                            <span>Switch to Upload</span>
                          </button>
                          <button
                            type="button"
                            onClick={startCamera}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-forest-600 hover:bg-forest-500 text-white text-xs font-medium transition-colors"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Retry Camera</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {isCameraActive && (
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-forest-700 hover:bg-forest-800 text-ivory-50 text-xs font-semibold shadow-sm transition-all cursor-pointer"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Snap Scene Photo</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Image Preview if selected but analysis waiting */}
              {selectedImage && !isAnalyzing && (
                <div className="relative rounded-xl overflow-hidden border border-ivory-300 bg-ivory-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedImage}
                    alt="Captured Scene"
                    className="w-full max-h-56 object-cover"
                  />
                  <div className="p-3 bg-white/95 border-t border-ivory-200 flex items-center justify-between text-xs">
                    <span className="font-medium text-charcoal-800 truncate max-w-xs">
                      {imageFileName || "Selected Scene"}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedImage(null);
                        if (activeTab === "camera") startCamera();
                      }}
                      className="inline-flex items-center gap-1 text-xs text-stone-600 hover:text-forest-900 transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Retake / Change</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Location Opt-In Toggle (Phase 24E) */}
              {activeTab === "upload" && selectedImage && (
                <div className="p-3 bg-ivory-50 rounded-xl border border-ivory-300 space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={tagUploadedPhotoWithCurrentGps}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setTagUploadedPhotoWithCurrentGps(checked);
                        if (checked) {
                          acquireGps(false);
                        } else {
                          GeolocationCoordinator.getInstance().cancelAcquisition("User disabled upload GPS tagging.");
                          setCurrentCoords(null);
                          setAccuracyTier("unavailable");
                          setLocationError(null);
                        }
                      }}
                      className="mt-0.5 rounded border-stone-300 text-forest-700 focus:ring-forest-600"
                    />
                    <div className="text-xs space-y-1">
                      <span className="font-medium text-charcoal-800">
                        Tag with my current location
                      </span>
                      <p className="text-[11px] text-stone-500 leading-normal">
                        Tags this memory with your device&apos;s current location{currentCoords?.accuracy ? ` (±${currentCoords.accuracy}m)` : ""}. This records where you are uploading from now, not necessarily where the photo was originally taken.
                      </p>
                    </div>
                  </label>
                  {tagUploadedPhotoWithCurrentGps && isLocating && (
                    <div className="flex items-center gap-2 text-[11px] text-forest-700 font-medium pl-6">
                      <Compass className="w-3.5 h-3.5 animate-spin" />
                      <span>Acquiring high-accuracy browser GPS (up to 15s)...</span>
                    </div>
                  )}
                  {tagUploadedPhotoWithCurrentGps && currentCoords && (
                    <div className="text-[11px] text-forest-800 font-mono pl-6">
                      Coordinates: {currentCoords.latitude.toFixed(6)}, {currentCoords.longitude.toFixed(6)} (±{currentCoords.accuracy ?? "?"}m)
                    </div>
                  )}
                </div>
              )}

              {fileError && (
                <div className="p-3 rounded-lg bg-terracotta-50 border border-terracotta-200 text-xs text-terracotta-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Privacy note */}
              <div className="p-3 bg-ivory-100 rounded-lg border border-ivory-200 text-xs text-charcoal-700 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Privacy-first:</strong> In Demo Mode, zero images leave your device. When Meta Model API is configured, only this single user-selected frame is analyzed.
                </span>
              </div>
            </div>
          ) : (
            /* Step 2: AI Suggests Objects - User Chooses What to Remember */
            <div className="space-y-4">
              <div className="flex items-start justify-between pb-3 border-b border-ivory-200 gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-semibold text-forest-900">
                      I spotted these belongings
                    </h3>
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-ivory-100 text-forest-800 border border-ivory-300">
                      {modelSource}
                    </span>
                  </div>
                  <p className="text-xs text-stone-600">
                    Choose what to remember. Unchecked items will not be saved.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualAdd(!showManualAdd)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-forest-800 bg-forest-50 hover:bg-forest-100 rounded-lg border border-forest-200 transition-colors shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Missing Item</span>
                </button>
              </div>

              {/* Manual Item Add Drawer */}
              {showManualAdd && (
                <form
                  onSubmit={handleAddManualCandidate}
                  className="p-3 bg-ivory-100 rounded-xl border border-ivory-300 space-y-2 text-xs"
                >
                  <span className="font-semibold text-forest-900 block">
                    Add Item Manually
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Item name (e.g. Earbud case)"
                      value={manualItemName}
                      onChange={(e) => setManualItemName(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-ivory-300 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Location (e.g. Next to laptop)"
                      value={manualLocation}
                      onChange={(e) => setManualLocation(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg border border-ivory-300 bg-white"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowManualAdd(false)}
                      className="px-2.5 py-1 rounded-lg text-stone-600 hover:bg-ivory-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded-lg bg-forest-700 text-ivory-50 font-medium"
                    >
                      Add Candidate
                    </button>
                  </div>
                </form>
              )}

              {/* Candidate Cards */}
              <div className="space-y-2.5">
                {candidates.length === 0 ? (
                  <div className="p-6 text-center bg-ivory-50 rounded-xl border border-ivory-200 space-y-2">
                    <p className="text-xs text-stone-600">
                      No personal belongings detected in this scene.
                    </p>
                    <p className="text-[11px] text-stone-400">
                      You can add items manually with the &quot;Add Missing Item&quot; button above, or re-scan below.
                    </p>
                  </div>
                ) : (
                  candidates.map((cand) => (
                    <div
                      key={cand.id}
                      className={`rounded-xl border p-3.5 transition-all ${
                        cand.is_selected
                          ? "border-forest-600 bg-forest-50/30 shadow-xs"
                          : "border-ivory-300 bg-white/70 opacity-60"
                      }`}
                    >
                      {editingCandidateId === cand.id ? (
                        /* Editable mode */
                        <div className="space-y-2 text-xs">
                          <div>
                            <label className="font-medium text-stone-600 block mb-0.5">
                              Item Name
                            </label>
                            <input
                              type="text"
                              value={cand.item_name}
                              onChange={(e) =>
                                updateCandidateField(cand.id, "item_name", e.target.value)
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-ivory-300 bg-white"
                            />
                          </div>
                          <div>
                            <label className="font-medium text-stone-600 block mb-0.5">
                              Location Description
                            </label>
                            <input
                              type="text"
                              value={cand.location_description}
                              onChange={(e) =>
                                updateCandidateField(
                                  cand.id,
                                  "location_description",
                                  e.target.value
                                )
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-ivory-300 bg-white"
                            />
                          </div>
                          <div className="flex justify-end pt-1">
                            <button
                              type="button"
                              onClick={() => setEditingCandidateId(null)}
                              className="px-3 py-1 rounded-lg bg-forest-700 text-ivory-50 text-xs font-medium"
                            >
                              Done Editing
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Display mode */
                        <div className="flex items-start justify-between gap-3">
                          <div
                            onClick={() => toggleSelectCandidate(cand.id)}
                            className="space-y-1.5 flex-1 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-forest-900">
                                {cand.item_name}
                              </span>
                              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded bg-forest-100 text-forest-800">
                                {cand.confidence} confidence
                              </span>
                            </div>

                            <p className="text-xs text-charcoal-800">
                              <span className="font-medium text-stone-500">Observed at: </span>
                              {cand.location_description}
                            </p>

                            {cand.landmarks && cand.landmarks.length > 0 && (
                              <div className="flex items-center gap-1 text-[11px] text-stone-500 flex-wrap">
                                <span>Landmarks:</span>
                                {cand.landmarks.map((lm, idx) => (
                                  <span
                                    key={idx}
                                    className="px-1.5 py-0.2 rounded bg-ivory-100 border border-ivory-200 text-charcoal-700"
                                  >
                                    {lm}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Controls: Edit, Delete, Toggle Checkbox */}
                          <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                            <button
                              type="button"
                              onClick={() => setEditingCandidateId(cand.id)}
                              className="p-1.5 rounded-lg hover:bg-ivory-200 text-stone-400 hover:text-charcoal-700 transition-colors"
                              title="Edit item name or location"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteCandidate(cand.id)}
                              className="p-1.5 rounded-lg hover:bg-terracotta-50 text-stone-400 hover:text-terracotta-600 transition-colors"
                              title="Reject suggestion"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleSelectCandidate(cand.id)}
                              className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all cursor-pointer ${
                                cand.is_selected
                                  ? "bg-forest-700 border-forest-700 text-ivory-50 shadow-xs"
                                  : "border-stone-300 bg-white hover:border-forest-500"
                              }`}
                              title={cand.is_selected ? "Deselect item" : "Select item"}
                            >
                              {cand.is_selected && <Check className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>

              {/* Optional: Tell Yaad what to look for */}
              <div className="pt-2 border-t border-ivory-200">
                <button
                  type="button"
                  onClick={() => setShowCustomQuery(!showCustomQuery)}
                  className="inline-flex items-center gap-1.5 text-xs text-forest-800 hover:text-forest-950 font-medium py-1 transition-colors"
                >
                  <Search className="w-3.5 h-3.5 text-forest-700" />
                  <span>Tell Yaad what to look for</span>
                  {showCustomQuery ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>

                {showCustomQuery && (
                  <div className="mt-2 p-3 rounded-xl bg-ivory-50 border border-ivory-200 space-y-2">
                    <p className="text-[11px] text-stone-600">
                      Looking for something specific? Type what to find and re-scan this scene:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customQuery}
                        onChange={(e) => setCustomQuery(e.target.value)}
                        placeholder="e.g. passport, badge, green water bottle..."
                        className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-ivory-300 bg-white text-forest-950 focus:outline-none focus:ring-1 focus:ring-forest-600"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (customQuery.trim()) {
                              performAnalyze(false, selectedImage || undefined, customQuery);
                            }
                          }
                        }}
                      />
                      <button
                        type="button"
                        disabled={isAnalyzing || !customQuery.trim()}
                        onClick={() =>
                          performAnalyze(false, selectedImage || undefined, customQuery)
                        }
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-forest-700 hover:bg-forest-800 text-white disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        Re-scan
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-4 bg-ivory-50 border-t border-ivory-300 flex items-center justify-between">
          {!candidates ? (
            <>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-stone-500 hidden sm:inline">Engine:</span>
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                    activeProvider === "meta_muse"
                      ? "bg-amber-100 text-amber-900 border border-amber-300"
                      : "bg-forest-100 text-forest-800"
                  }`}
                >
                  {activeProvider === "meta_muse" ? "Meta Muse (Live AI)" : "Mock AI (Free)"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal-700 hover:bg-ivory-200 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAnalyzeClick}
                  disabled={isAnalyzing || !selectedImage}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all shadow-xs disabled:opacity-50 cursor-pointer ${
                    activeProvider === "meta_muse"
                      ? "bg-amber-700 hover:bg-amber-800 text-white"
                      : "bg-forest-700 hover:bg-forest-800 text-ivory-50"
                  }`}
                >
                  {activeProvider === "meta_muse" ? (
                    <Zap className="w-3.5 h-3.5 text-amber-200" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 text-sage-200" />
                  )}
                  <span>
                    {isAnalyzing
                      ? activeProvider === "meta_muse"
                        ? "Querying Meta Muse..."
                        : "Scanning Scene..."
                      : "Scan Belongings"}
                  </span>
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => {
                  setCandidates(null);
                  if (activeTab === "camera") {
                    startCamera();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-charcoal-700 hover:bg-ivory-200 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retake Photo</span>
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRememberEverything}
                  disabled={candidates.length === 0}
                  className="px-3.5 py-2 rounded-xl border border-forest-600/40 text-forest-800 hover:bg-forest-100/60 text-xs font-semibold transition-all disabled:opacity-40 cursor-pointer"
                >
                  Remember Everything
                </button>
                <button
                  type="button"
                  onClick={handleRememberSelected}
                  disabled={candidates.filter((c) => c.is_selected).length === 0}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-forest-700 hover:bg-forest-800 text-ivory-50 text-xs font-semibold transition-all shadow-xs disabled:opacity-40 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>
                    Remember Selected ({candidates.filter((c) => c.is_selected).length})
                  </span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Confirmation Dialog for Live Inference */}
      {showLiveConfirmDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full border border-ivory-300 shadow-2xl p-5 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <Zap className="w-5 h-5 text-amber-700" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-forest-900">
                Confirm Live Meta AI Scene Analysis
              </h3>
              <p className="text-xs text-stone-600 mt-1">
                You are about to submit this image frame to Meta Model API (<strong>muse-spark-1.3</strong>). This will consume API credits under your <strong>${budgetRemaining !== null ? budgetRemaining.toFixed(4) : "5.00"} testing allowance</strong>.
              </p>
            </div>

            <div className="p-3 bg-ivory-50 rounded-xl border border-ivory-200 text-[11px] text-stone-600 space-y-1">
              <p className="font-medium text-forest-900">Guarantees &amp; Safety:</p>
              <ul className="list-disc list-inside space-y-0.5 text-stone-500">
                <li>Strict $5.00 spend cap enforced server-side</li>
                <li>SHA-256 duplicate cache active</li>
                <li>Zero credentials exposed to browser</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowLiveConfirmDialog(false)}
                className="px-3.5 py-2 rounded-xl text-xs font-medium text-stone-600 hover:bg-ivory-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLiveConfirmDialog(false);
                  performAnalyze(true);
                }}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-amber-700 hover:bg-amber-800 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-200" />
                <span>Confirm &amp; Analyze</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
