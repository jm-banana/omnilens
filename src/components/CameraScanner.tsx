import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  RefreshCw,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertCircle,
  FileText,
  Sliders,
  ChevronRight,
  Eye,
  Info,
} from 'lucide-react';
import { SAMPLE_PRESETS, VisualPreset } from '../data/samplePresets';
import { ScanResult } from '../types';
import { sound } from '../utils/sound';

interface CameraScannerProps {
  onScanComplete: (result: ScanResult, imageSrc: string) => void;
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScanComplete }) => {
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [studyGoal, setStudyGoal] = useState<string>('Comprehensive Exam Prep');
  const [focusArea, setFocusArea] = useState<string>('Definitions & Mechanisms');
  const [selectedPreset, setSelectedPreset] = useState<VisualPreset | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start webcam
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
      setCapturedImage(null);
      setSelectedPreset(null);
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setCameraError(
        'Webcam access unavailable or permission denied. You can upload a photo or pick a sample study sheet below.'
      );
      setCameraActive(false);
    }
  };

  // Stop webcam
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Capture frame from webcam
  const captureSnapshot = () => {
    if (!videoRef.current || !canvasRef.current) return;
    sound.playShutter();

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      setCapturedImage(dataUrl);
      setSelectedPreset(null);
      stopCamera();
    }
  };

  // Handle uploaded file
  const handleFileUpload = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setCameraError('Please upload an image file (PNG, JPG, WEBP, or SVG).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        stopCamera();
        setCapturedImage(e.target.result as string);
        setSelectedPreset(null);
      }
    };
    reader.readAsDataURL(file);
  };

  // Handle Preset selection
  const handleSelectPreset = (preset: VisualPreset) => {
    stopCamera();
    setSelectedPreset(preset);
    setCapturedImage(preset.svgDataUri);
    setStudyGoal(preset.title);
  };

  // Submit scan to Gemini 3.8 Flash Vision backend
  const handleProcessScan = async () => {
    const imageToScan = capturedImage || selectedPreset?.svgDataUri;
    if (!imageToScan) return;

    setIsScanning(true);
    setScanStep('Inspecting resolution & document structure...');

    try {
      setTimeout(() => {
        setScanStep('Querying Gemini 3.8 Flash multimodal vision engine...');
      }, 700);

      setTimeout(() => {
        setScanStep('Verifying source evidence and factual accuracy...');
      }, 1500);

      const res = await fetch('/api/ai/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: imageToScan,
          mimeType: imageToScan.startsWith('data:image/svg') ? 'image/png' : 'image/jpeg',
          studyGoal,
          focusArea,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Server responded with ${res.status}`);
      }

      const data = await res.json();
      sound.playSuccess();
      onScanComplete(data.result, imageToScan);
    } catch (err: any) {
      console.error('Scan failed:', err);
      setCameraError(`AI Scan note: ${err.message || 'Temporary service busy'}. Please re-try or select another preset.`);
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 sm:py-8 space-y-8">
      {/* Hero Intro */}
      <div className="text-center max-w-3xl mx-auto space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <Sparkles className="w-3.5 h-3.5" />
          Powered by Gemini 3.8 Flash Vision & Fact Verification
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Point Camera. Synthesize. <span className="text-emerald-400">Master.</span>
        </h1>
        <p className="text-slate-400 text-sm sm:text-base">
          Scan handwritten notes, textbooks, diagrams, or lab sheets. OmniLens extracts
          organized flashcards, cross-checks factual accuracy against academic consensus, and sets up
          spaced repetition.
        </p>
      </div>

      {/* Main Viewfinder / Upload Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center: Camera & Image Box */}
        <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl relative">
          {/* Top Bar inside Viewfinder */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-950/80 border-b border-slate-800/80 text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              <span className={`w-2 h-2 rounded-full ${cameraActive ? 'bg-red-500 animate-pulse' : 'bg-emerald-500'}`} />
              <span className="font-medium">
                {cameraActive ? 'Live Camera Feed' : capturedImage ? 'Scan Document Loaded' : 'Camera Ready'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {!cameraActive && (
                <button
                  onClick={startCamera}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                >
                  <Camera className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Start Camera</span>
                </button>
              )}
              {cameraActive && (
                <button
                  onClick={stopCamera}
                  className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 rounded-lg text-xs font-medium transition-colors"
                >
                  Close Camera
                </button>
              )}
            </div>
          </div>

          {/* Viewfinder Canvas Area */}
          <div className="relative min-h-[260px] sm:min-h-[290px] flex items-center justify-center bg-slate-950 p-4">
            {/* 1. Live Video */}
            {cameraActive && (
              <div className="relative w-full h-full max-h-[360px] flex items-center justify-center overflow-hidden rounded-xl">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-full object-contain rounded-xl"
                />

                {/* Reticle Guides */}
                <div className="absolute inset-4 sm:inset-8 pointer-events-none border-2 border-emerald-500/40 rounded-xl">
                  {/* Corner accents */}
                  <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400" />
                  <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400" />
                  <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400" />
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400" />
                  
                  {/* Center reticle */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center opacity-40">
                    <div className="w-full h-px bg-emerald-400" />
                    <div className="h-full w-px bg-emerald-400 absolute" />
                  </div>
                </div>

                {/* Shutter Button on Camera Screen */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
                  <button
                    onClick={captureSnapshot}
                    className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md p-1 border-2 border-white hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shadow-lg group"
                    aria-label="Capture photo"
                  >
                    <div className="w-10 h-10 rounded-full bg-emerald-400 group-hover:bg-emerald-300 transition-colors shadow-inner" />
                  </button>
                </div>
              </div>
            )}

            {/* 2. Image Loaded Preview */}
            {!cameraActive && capturedImage && (
              <div className="relative w-full flex flex-col items-center justify-center group py-1">
                <div className="relative max-h-[290px] w-full flex items-center justify-center rounded-xl overflow-hidden border border-slate-800 bg-slate-900/60 shadow-xl p-2">
                  <img
                    src={capturedImage}
                    alt="Study material scan"
                    className="max-h-[270px] w-auto max-w-full object-contain rounded-lg shadow-md"
                  />

                  {/* Scanning Animation Overlay */}
                  {isScanning && (
                    <div className="absolute inset-0 bg-emerald-950/20 backdrop-blur-[1px] pointer-events-none">
                      <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#34d399] animate-scan-line" />
                    </div>
                  )}
                </div>

                {/* Retake / Change Button */}
                {!isScanning && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCapturedImage(null);
                        setSelectedPreset(null);
                      }}
                      className="px-3 py-1 text-xs text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Clear / Choose Different Scan
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* 3. Empty State / Drag and Drop Fallback */}
            {!cameraActive && !capturedImage && (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files?.[0]) {
                    handleFileUpload(e.dataTransfer.files[0]);
                  }
                }}
                className={`w-full border-2 border-dashed rounded-xl p-8 text-center transition-all flex flex-col items-center justify-center space-y-4 ${
                  dragActive
                    ? 'border-emerald-400 bg-emerald-500/10'
                    : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
                }`}
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Camera className="w-8 h-8" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-base font-semibold text-white">
                    Scan notes, textbooks, or formula sheets
                  </h3>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    Take a live photo with your camera, drop an image here, or pick one of the verified sample study sheets below.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={startCamera}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all"
                  >
                    <Camera className="w-4 h-4" />
                    Open Live Camera
                  </button>

                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    Upload Image
                  </button>

                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files?.[0]) {
                        handleFileUpload(e.target.files[0]);
                      }
                    }}
                  />
                </div>

                {cameraError && (
                  <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg text-left mt-2 max-w-md">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{cameraError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Hidden Canvas for Frame Capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Action Trigger Bar */}
          {capturedImage && (
            <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  Ready to process with <strong className="text-white">Gemini 3.8 Flash Vision</strong>
                </span>
              </div>

              <button
                onClick={handleProcessScan}
                disabled={isScanning}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/25 transition-all disabled:opacity-50"
              >
                {isScanning ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing Scan...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Synthesize & Verify Flashcards</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Scanning Progress Overlay */}
          {isScanning && (
            <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-6 space-y-4">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-emerald-400 animate-spin" />
                <Sparkles className="w-6 h-6 text-emerald-400 absolute" />
              </div>
              <div className="text-center space-y-1">
                <h4 className="text-lg font-bold text-white">Synthesizing Knowledge</h4>
                <p className="text-sm text-emerald-400 font-medium animate-pulse">{scanStep}</p>
                <p className="text-xs text-slate-400 max-w-sm">
                  Checking accuracy, eliminating hallucination risks, and formatting Spaced Repetition cards.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Scan Settings & High-Yield Presets */}
        <div className="lg:col-span-4 space-y-6">
          {/* Study Parameters */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span>Synthesis Parameters</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Study Focus / Deck Title
                </label>
                <input
                  type="text"
                  value={studyGoal}
                  onChange={(e) => setStudyGoal(e.target.value)}
                  placeholder="e.g. Chapter 8 Reaction Mechanisms"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Emphasis
                </label>
                <select
                  value={focusArea}
                  onChange={(e) => setFocusArea(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="Definitions & Mechanisms">Key Definitions & Mechanisms</option>
                  <option value="Formulas, Variables & Units">Formulas, Variables & Mathematical Laws</option>
                  <option value="Conceptual Relationships & Diagrams">Diagram Interpretation & Concepts</option>
                  <option value="High-Yield Exam Questions">High-Yield Exam Questions</option>
                </select>
              </div>
            </div>
          </div>

          {/* Quick-Load Educational Scan Presets */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FileText className="w-4 h-4 text-emerald-400" />
                <span>Verified Scan Presets</span>
              </div>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-semibold">
                Instant Test
              </span>
            </div>
            <p className="text-xs text-slate-400">
              No physical notes handy? Click a preset note sheet to test instant vision synthesis:
            </p>

            <div className="space-y-2.5">
              {SAMPLE_PRESETS.map((preset) => {
                const isSelected = selectedPreset?.id === preset.id;
                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/10'
                        : 'border-slate-800/80 bg-slate-950/60 hover:bg-slate-800/60 hover:border-slate-700'
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white leading-tight">
                          {preset.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {preset.description}
                      </p>
                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                          {preset.subject}
                        </span>
                        <span className="text-[10px] text-emerald-400 font-medium">
                          {preset.cardCount} cards
                        </span>
                      </div>
                    </div>
                    <ChevronRight
                      className={`w-4 h-4 shrink-0 mt-1 transition-transform ${
                        isSelected ? 'text-emerald-400 translate-x-0.5' : 'text-slate-600'
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
