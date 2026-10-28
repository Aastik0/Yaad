import React, { useState, useRef, useEffect } from "react";
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
  Edit2,
  Trash2,
  Tag,
} from "lucide-react";
import { CandidateItem } from "@/types";
import { analyzeSceneWithMock } from "@/lib/mockVision";

interface CaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmCandidates: (
    candidates: CandidateItem[],
    imagePreview?: string,
    source?: "browser_upload" | "browser_camera"
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

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Analysis & Candidates
  const [requestedQuery, setRequestedQuery] = useState<string>("keys and wallet");
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<CandidateItem[] | null>(null);
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);

  // Manual item addition
  const [showManualAdd, setShowManualAdd] = useState<boolean>(false);
  const [manualItemName, setManualItemName] = useState<string>("");
  const [manualLocation, setManualLocation] = useState<string>("");

  // Clean up camera stream on unmount or tab switch
  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
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
    onClose();
  };

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera access is not supported by your browser environment.");
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
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : "Unable to access camera. Check device permissions.";
      setCameraError(errorMsg);
      setIsCameraActive(false);
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
  };

  // Handle file upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError(null);
    const file = e.target.files?.[0];
    if (!file) return;

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
      setSelectedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Trigger Mock Analysis
  const handleAnalyze = async () => {
    if (!selectedImage) {
      setFileError("Please select or capture a photo first.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const results = await analyzeSceneWithMock({
        imageName: imageFileName,
        requestedQuery: requestedQuery,
        source: activeTab === "camera" ? "browser_camera" : "browser_upload",
      });
      setCandidates(results);
    } catch {
      setFileError("Scene analysis encountered an error. Please try again.");
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

  const handleConfirmAll = () => {
    if (!candidates) return;
    const selected = candidates.filter((c) => c.is_selected);
    onConfirmCandidates(
      selected,
      selectedImage || undefined,
      activeTab === "camera" ? "browser_camera" : "browser_upload"
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
          {/* Step 1: Capture or Upload (when no candidate review yet) */}
          {!candidates ? (
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
                      Supports JPG, PNG, WebP up to 10MB
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
                  <div className="relative rounded-xl overflow-hidden bg-charcoal-900 aspect-video flex items-center justify-center">
                    <video
                      ref={videoRef}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {!isCameraActive && !cameraError && (
                      <span className="text-xs text-ivory-300">
                        Initializing browser camera...
                      </span>
                    )}

                    {cameraError && (
                      <div className="p-4 text-center text-ivory-100 space-y-2">
                        <AlertCircle className="w-6 h-6 text-terracotta-500 mx-auto" />
                        <p className="text-xs font-medium">{cameraError}</p>
                        <p className="text-[11px] text-stone-400">
                          You can switch to File Upload above to select a photo.
                        </p>
                      </div>
                    )}
                  </div>

                  {isCameraActive && (
                    <div className="flex items-center justify-center gap-3">
                      <button
                        type="button"
                        onClick={capturePhoto}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-forest-700 hover:bg-forest-800 text-ivory-50 text-xs font-semibold shadow-sm transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Snap Scene Photo</span>
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Image Preview if selected */}
              {selectedImage && (
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

              {fileError && (
                <div className="p-3 rounded-lg bg-terracotta-50 border border-terracotta-200 text-xs text-terracotta-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{fileError}</span>
                </div>
              )}

              {/* Target items query input & chips */}
              <div className="space-y-2">
                <label className="block text-xs font-medium text-charcoal-800">
                  Target belongings to identify:
                </label>
                <input
                  type="text"
                  value={requestedQuery}
                  onChange={(e) => setRequestedQuery(e.target.value)}
                  placeholder="e.g. keys, wallet, sunglasses, water bottle"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-ivory-300 focus:outline-none focus:border-forest-600 focus:ring-1 focus:ring-forest-600"
                />

                {/* Quick preset tags */}
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  <span className="text-[11px] text-stone-500 flex items-center gap-1">
                    <Tag className="w-3 h-3" /> Quick fill:
                  </span>
                  {[
                    "keys and wallet",
                    "reading glasses",
                    "water bottle",
                    "backpack and laptop",
                  ].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setRequestedQuery(tag)}
                      className="px-2 py-0.5 rounded bg-ivory-200 hover:bg-ivory-300 text-[11px] text-charcoal-700 font-medium transition-colors"
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Privacy note */}
              <div className="p-3 bg-ivory-100 rounded-lg border border-ivory-200 text-xs text-charcoal-700 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-forest-700 shrink-0 mt-0.5" />
                <span>
                  <strong>Privacy-first:</strong> In Demo Mode, zero images leave your device. When Meta Model API is configured, only this single user-selected frame is analyzed.
                </span>
              </div>
            </div>
          ) : (
            /* Step 2: Candidate Review & Human Confirmation */
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-ivory-200">
                <div>
                  <h3 className="text-sm font-semibold text-forest-900">
                    Review AI Suggestions ({candidates.filter((c) => c.is_selected).length} selected)
                  </h3>
                  <p className="text-[11px] text-stone-500">
                    Verify location and landmarks before tracking. Suggestions do not become memories until confirmed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowManualAdd(!showManualAdd)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-forest-800 bg-forest-50 hover:bg-forest-100 rounded-md border border-forest-200 transition-colors"
                >
                  <Plus className="w-3 h-3" />
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
                      className="px-2.5 py-1.5 rounded border border-ivory-300 bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Location (e.g. Next to laptop)"
                      value={manualLocation}
                      onChange={(e) => setManualLocation(e.target.value)}
                      className="px-2.5 py-1.5 rounded border border-ivory-300 bg-white"
                    />
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowManualAdd(false)}
                      className="px-2.5 py-1 rounded text-stone-600 hover:bg-ivory-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-3 py-1 rounded bg-forest-700 text-ivory-50 font-medium"
                    >
                      Add Candidate
                    </button>
                  </div>
                </form>
              )}

              {/* Candidate Cards */}
              <div className="space-y-3">
                {candidates.map((cand) => (
                  <div
                    key={cand.id}
                    className={`rounded-xl border p-4 transition-all ${
                      cand.is_selected
                        ? "border-forest-600 bg-forest-50/20 shadow-xs"
                        : "border-ivory-300 bg-white opacity-60"
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
                            className="w-full px-2.5 py-1.5 rounded border border-ivory-300 bg-white"
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
                            className="w-full px-2.5 py-1.5 rounded border border-ivory-300 bg-white"
                          />
                        </div>
                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={() => setEditingCandidateId(null)}
                            className="px-3 py-1 rounded bg-forest-700 text-ivory-50 text-xs font-medium"
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
                          className="space-y-1 flex-1 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-forest-900">
                              {cand.item_name}
                            </span>
                            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-forest-100 text-forest-800">
                              {cand.confidence} confidence
                            </span>
                          </div>

                          <p className="text-xs text-charcoal-800">
                            <span className="font-medium text-stone-500">Observed at: </span>
                            {cand.location_description}
                          </p>

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
                        </div>

                        {/* Controls: Edit, Delete, Toggle Checkbox */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setEditingCandidateId(cand.id)}
                            className="p-1.5 rounded hover:bg-ivory-200 text-stone-400 hover:text-charcoal-700 transition-colors"
                            title="Edit suggestion"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteCandidate(cand.id)}
                            className="p-1.5 rounded hover:bg-terracotta-50 text-stone-400 hover:text-terracotta-600 transition-colors"
                            title="Reject suggestion"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSelectCandidate(cand.id)}
                            className={`w-6 h-6 rounded-md flex items-center justify-center border transition-all ${
                              cand.is_selected
                                ? "bg-forest-700 border-forest-700 text-ivory-50"
                                : "border-stone-300 bg-white"
                            }`}
                            title={cand.is_selected ? "Track this item" : "Do not track"}
                          >
                            {cand.is_selected && <Check className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="px-5 py-4 bg-ivory-50 border-t border-ivory-300 flex items-center justify-between">
          {!candidates ? (
            <>
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-charcoal-700 hover:bg-ivory-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || !selectedImage}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-ivory-50 text-xs font-semibold transition-all shadow-xs disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5 text-sage-200" />
                <span>{isAnalyzing ? "Analyzing Scene..." : "Analyze Scene"}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setCandidates(null)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-charcoal-700 hover:bg-ivory-200 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Back to Image</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmAll}
                disabled={candidates.filter((c) => c.is_selected).length === 0}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-forest-700 hover:bg-forest-800 text-ivory-50 text-xs font-semibold transition-all shadow-xs disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>
                  Confirm &amp; Track ({candidates.filter((c) => c.is_selected).length}) Items
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
