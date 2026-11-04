
"use client";


import { useEffect, useState } from "react";
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  image?: string | null;
};

export default function Home() {
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [reportDate, setReportDate] = useState("");
  
  const [afterImagePreview, setAfterImagePreview] = useState<string | null>(null);
  const [afterFileName, setAfterFileName] = useState("");

  const [comparison, setComparison] = useState("");
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonError, setComparisonError] = useState("");

  const [chatQuestion, setChatQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  const [maintenanceVisual, setMaintenanceVisual] =
    useState<string>("");
  

  const [isGeneratingVisual, setIsGeneratingVisual] =
    useState(false);

  const [visualError, setVisualError] =
    useState("");

  const [repairOutcome, setRepairOutcome] = useState("Not assessed");
  const [repairNotes, setRepairNotes] = useState("");
  const [reportId, setReportId] = useState("");
  useEffect(() => {
    setReportDate(new Date().toLocaleString());

    setReportId(
      `CS-${Date.now().toString(36).toUpperCase()}`
    );
   }, []);
  const [imageDimensions, setImageDimensions] = useState({
    width: 0,
    height: 0,
  });
  const [fileName, setFileName] = useState("");
  const [metal, setMetal] = useState("Carbon steel")
  const [environment, setEnvironment] = useState("Outdoor");
  const [notes, setNotes] = useState("");
  const [visibleExtent, setVisibleExtent] = useState("Not assessed");
  const inspectionFieldsCompleted = [
    metal !== "Unknown",
    environment !== "Unknown",
    visibleExtent !== "Not assessed",
  ].filter(Boolean).length;

  const inspectionCompleteness = Math.round(
    (inspectionFieldsCompleted / 3) * 100
  );
  const severityAssessment =
  visibleExtent === "Not assessed"
    ? {
        level: "Not assessed",
        description: "Insufficient visual information to classify corrosion extent.",
        color: "text-slate-300",
      }
    : visibleExtent === "Localized"
    ? {
        level: "Limited visible extent",
        description: "Corrosion is reported in a localized area. Monitor the affected surface and investigate the cause.",
        color: "text-teal-300",
      }
    : visibleExtent === "Moderate"
    ? {
        level: "Moderate visible extent",
        description: "Corrosion is reported across several areas. A closer inspection and appropriate maintenance planning are recommended.",
        color: "text-amber-300",
      }
    : {
        level: "Extensive visible extent",
        description: "Corrosion is reported across a substantial portion of the surface. Arrange a qualified corrosion inspection promptly.",
        color: "text-red-300",
      };
  const treatmentRecommendations = [
    {
      title: "Surface preparation",
      priority:"Essential",
      description:
        visibleExtent === "Not assessed"
          ? "Assess the surface condition before selecting a preparation method."
          : "Remove loose corrosion, dirt and contaminants using a preparation method appropriate for the metal and its condition.",
    },
    {
      title: "Protective coating",
      priority: "Recommended",
      description:
        environment === "Coastal or salty"
          ? "Consider a coating system specifically rated for marine or high-salinity exposure."
          : environment === "Humid or frequently wet"
          ? "Consider a protective coating system suitable for frequent moisture exposure."
          : environment === "Industrial environment"
          ? "Consider an industrial-grade coating system compatible with the exposure conditions."
          : "Consider a protective coating compatible with the metal type and service environment.",
    },
    { 
      title: "Preventive maintenance",
      priority: "Ongoing",
      description:
        visibleExtent === "Widespread"
          ? "Arrange a qualified corrosion inspection and establish a documented maintenance plan."
          : "Monitor the affected surface periodically and document any changes in corrosion extent.",
    },
    {
      title: "Material compatibility",
      priority: "Safety check",
      description:
        metal === "Unknown"
          ? "Identify the metal before selecting chemical treatments or protective coatings."
          : `Ensure all cleaning products, treatments and coatings are compatible with ${metal}.`,
    },
  ];
  
  const [analysis, setAnalysis] = useState("");
  const [segmentationInfo, setSegmentationInfo] = useState<{
    available: boolean;
    totalMasks: number;
    totalBoundingBoxes: number;
    metricsAvailable: boolean;
  } | null>(null);
  const hasVisualAssessment = analysis.trim().length > 0;

  const assessmentContext = hasVisualAssessment
    ? "AI visual assessment is available. Review its findings alongside the inspector's recorded observations before selecting a treatment."
    : "No AI visual assessment is available. Recommendations are based on the recorded inspection details.";
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState("");
  const [masks, setMasks] = useState<
    {
      objectId: string
      width: number;
      height: number;
      left: number;
      top: number;
      right: number;
      bottom: number;
      svgPath: string;
    }[]
  >([]);
  

const [boxes, setBoxes] = useState<
  {
    objectId: string;
    left: number;
    top: number;
    right: number;
    bottom: number;
    confidence?: number;
  }[]
>([]);
const [isSegmenting, setIsSegmenting] = useState(false);


  
function resetInspectionState() {
  // Reset AI assessment
  setAnalysis("");
  setAnalysisError("");
  setIsAnalyzing(false);

  // Reset segmentation
  setMasks([]);
  setBoxes([]);
  setSegmentationInfo(null);
  setIsSegmenting(false);

  // Reset image dimensions
  setImageDimensions({
    width: 0,
    height: 0,
  });

  // Reset Ask AI conversation
  setChatQuestion("");
  setChatMessages([]);
  setChatError("");
  setIsChatLoading(false);

  // Reset repair comparison
  setAfterImagePreview(null);
  setAfterFileName("");
  setComparison("");
  setComparisonError("");
  setIsComparing(false);

  // Reset repair verification
  setRepairOutcome("Not assessed");
  setRepairNotes("");

  // Reset inspection observations
  setMetal("Carbon steel");
  setEnvironment("Outdoor");
  setNotes("");
  setVisibleExtent("Not assessed");
}

  function handleImageChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please choose an image file.");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("Please choose an image smaller than 10 MB.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImagePreview(reader.result as string);
      setFileName(file.name);

      resetInspectionState();
    };

    reader.readAsDataURL(file);
  }
  
function handleAfterImageChange(
  event: React.ChangeEvent<HTMLInputElement>
) {
  const file = event.target.files?.[0];

  if (!file) return;

  if (!file.type.startsWith("image/")) {
    alert("Please choose an image file.");
    event.target.value = "";
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    alert("Please choose an image smaller than 10 MB.");
    event.target.value = "";
    return;
  }

  const reader = new FileReader();

  reader.onload = () => {
    if (typeof reader.result !== "string") return;

    setAfterImagePreview(reader.result);
    setAfterFileName(file.name);

    // Clear previous comparison
    setComparison("");
    setComparisonError("");
  };

  reader.readAsDataURL(file);
}


  

async function handleAnalyze() {
  if (!imagePreview || isAnalyzing || isSegmenting) return;

  setAnalysisError("");
  setAnalysis("");
  setSegmentationInfo(null);

  try {
    // PHASE 1: Run segmentation first.
    setIsSegmenting(true);

    const segmentation = await segmentImage();

    if (
      !segmentation ||
      !Array.isArray(segmentation.masks) ||
      !Array.isArray(segmentation.boxes)
    ) {
      throw new Error("Segmentation returned invalid data.");
    }

    setIsSegmenting(false);

    // PHASE 2: Send image and segmentation to Muse Spark.
    setIsAnalyzing(true);

    const response = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: imagePreview,
        metal,
        environment,
        notes,
        visibleExtent,
        masks: segmentation.masks,
        boxes: segmentation.boxes,
        imageDimensions,
      }),
    });

    const data = await response.json();
    

    if (!response.ok) {
      throw new Error(
        data.error || "Image analysis failed."
      );
    }

    if (
      typeof data.analysis !== "string" ||
      !data.analysis.trim()
    ) {
      throw new Error("The API returned invalid analysis.");
    }

    setAnalysis(data.analysis);
    setSegmentationInfo(data.segmentation);

  } catch (error) {
    console.error("Analysis error:", error);

    setAnalysisError(
      error instanceof Error
        ? error.message
        : "Something went wrong. Please try again."
    );

  } finally {
    setIsSegmenting(false);
    setIsAnalyzing(false);
  }
}
async function handleCompare() {
  if (!imagePreview || !afterImagePreview || isComparing) {
    return;
  }

  setIsComparing(true);
  setComparison("");
  setComparisonError("");

  try {
    const response = await fetch("/api/compare", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        beforeImage: imagePreview,
        afterImage: afterImagePreview,
        metal,
        environment,
        repairOutcome,
        repairNotes,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Image comparison failed."
      );
    }

    if (
      typeof data.comparison !== "string" ||
      !data.comparison.trim()
    ) {
      throw new Error("The AI returned an invalid comparison.");
    }

    setComparison(data.comparison);

  } catch (error) {
    console.error("Comparison error:", error);

    setComparisonError(
      error instanceof Error
        ? error.message
        : "Could not compare the images."
    );

  } finally {
    setIsComparing(false);
  }
}
async function handleShareImage(image: string) {
  try {
    const response = await fetch(image);
    const blob = await response.blob();

    const file = new File(
      [blob],
      "CorroSense-Maintenance-Guide.webp",
      { type: blob.type || "image/webp" }
    );

    if (
      navigator.canShare &&
      navigator.canShare({ files: [file] })
    ) {
      await navigator.share({
        files: [file],
        title: "CorroSense AI Visual Maintenance Guide",
        text: "AI-generated educational corrosion maintenance illustration.",
      });
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = "CorroSense-Maintenance-Guide.webp";
      link.click();

      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error("Image sharing failed:", error);
  }
}
async function handleChat() {
  const question = chatQuestion.trim();

  if (!question || isChatLoading) return;

  const updatedMessages = [
    ...chatMessages,
    { role: "user" as const, content: question },
  ];

  setChatMessages(updatedMessages);
  setChatQuestion("");
  setChatError("");
  setIsChatLoading(true);

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        question,
        metal,
        environment,
        notes,
        visibleExtent,

        analysis,
        comparison,
        repairNotes,
        repairOutcome,

        masks,
        boxes,

        history: chatMessages,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Could not get an AI response.");
    }

    if (typeof data.reply !== "string" || !data.reply.trim()) {
      throw new Error("The AI returned an invalid response.");
    }

    setChatMessages((previous) => [
      ...previous,
      {
        role: "assistant",
        content: data.reply,
        image: data.image || null,
      },
    ]);
    
    

  } catch (error) {
    console.error("Chat error:", error);

    setChatError(
      error instanceof Error
        ? error.message
        : "Something went wrong. Please try again."
    );

  } finally {
    setIsChatLoading(false);
  }
}
async function handleGenerateVisual() {
  if (!analysis || isGeneratingVisual) return;

  setIsGeneratingVisual(true);
  setVisualError("");
  setMaintenanceVisual("");

  try {
    const response = await fetch(
      "/api/maintenance-visual",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          analysis,
          metal,
          environment,
          recommendations: treatmentRecommendations
            .map((item) =>
              `${item.title}: ${item.description}`
            )
            .join("\n"),
        }),
      }
    );
    
    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error || "Image generation failed."
      );
    }

    if (!data.image) {
      throw new Error("No image was generated.");
    }

    setMaintenanceVisual(data.image);

  } catch (error) {
    setVisualError(
      error instanceof Error
        ? error.message
        : "Could not generate maintenance visual."
    );
  } finally {
    setIsGeneratingVisual(false);
  }
}
  
async function segmentImage() {
  if (!imagePreview) {
    throw new Error("Please upload an image first.");
  }

  const response = await fetch("/api/segment", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image: imagePreview,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Image segmentation failed.");
  }

  if (
    !Array.isArray(data.masks) ||
    !Array.isArray(data.boxes)
  ) {
    throw new Error("The SAM API returned invalid segmentation data.");
  }

  setMasks(data.masks);
  setBoxes(data.boxes);

  return {
    masks: data.masks,
    boxes: data.boxes,
  };
}


  const visualMaintenanceImages = chatMessages.filter(
    (message) =>
      message.role === "assistant" &&
      typeof message.image === "string" &&
      message.image.startsWith("data:image/")
  );
  return (
    <main className="min-h-screen bg-[#0b1120] px-5 py-8 text-slate-100 md:px-10 print:bg-white print:p-0">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 flex items-center justify-between border-b border-slate-800 pb-6 print:hidden">
          <div>
            <p className="text-xl font-bold tracking-[0.2em] text-teal-300">
              CORROSENSE
            </p>
            <p className="mt-1 text-xs text-slate-500">
              CORROSION INSPECTION WORKSPACE
            </p>
          </div>
          <span className="rounded-full border border-teal-900 bg-teal-950/50 px-3 py-1 text-xs text-teal-300">
            Prototype · v0.1
          </span>
        </header>

        <section className="mb-10 max-w-3xl print:hidden">
          <p className="mb-3 text-sm font-medium uppercase tracking-[0.2em] text-teal-300">
            Inspect · Understand · Verify
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
            Give corrosion
            <br />
            nowhere to hide.
          </h1>
          <p className="mt-5 max-w-2xl leading-7 text-slate-400">
            Assess visible metal corrosion, understand the surrounding
            conditions, and prepare for a more informed repair and
            verification workflow.
          </p>
        </section>
        <section className="mb-8 rounded-2xl border border-slate-800 bg-[#111c30] p-6 md:p-8 print:hidden">

          <div className="mb-6">
            <p className="text-sm font-semibold text-teal-300">
              INSPECTION WORKFLOW
            </p>

            <h2 className="mt-2 text-2xl font-semibold text-slate-100">
              Inspection Pipeline
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Follow the inspection stages from image analysis
              through maintenance and repair verification.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {[
              ["01", "Image segmentation", "SAM 3.1"],
              ["02", "Visual assessment", "Muse Spark"],
              ["03", "Guided treatment rules", "Rules engine"],
              ["04", "Repair verification", "Before / after"],
            ].map(([number, title, detail]) => (
              <div
                key={number}
                className="rounded-xl border border-slate-700 bg-slate-900/60 p-5"
              >
                <span className="text-lg font-bold text-teal-300">
                  {number}
                </span>

                <p className="mt-3 text-sm font-semibold text-slate-100">
                  {title}
                </p>

                <p className="mt-2 text-xs text-slate-500">
                  {detail}
                </p>
              </div>
            ))}

          </div>
        </section>

        <section className="flex flex-col gap-6 print:hidden">
          <div className="rounded-2xl border border-slate-800 bg-[#111c30] p-6 md:p-8">
            <div className="mb-6">
              <p className="text-sm font-semibold text-slate-100">
                Surface image
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Choose a clear photo of the metal surface.
              </p>
            </div>

            <label className="flex min-h-64 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-600 bg-slate-900/60 p-5 text-center transition hover:border-teal-400">
              
            {imagePreview ? (
              <div
                className="relative mx-auto"
                style={
                  imageDimensions.width > 0 && imageDimensions.height > 0
                    ? {
                        aspectRatio: `${imageDimensions.width} / ${imageDimensions.height}`,
                        width: `min(100%, ${(320 * imageDimensions.width) / imageDimensions.height}px)`,
                      }
                    : { width: "100%" }
                }
              >
                <img
                  src={imagePreview}
                  alt="Selected metal surface preview"
                  onLoad={(event) => {
                    setImageDimensions({
                      width: event.currentTarget.naturalWidth,
                      height: event.currentTarget.naturalHeight,
                    });
                  }}
                  className="block h-full w-full rounded-lg object-contain"
                />
                <p className="mt-2 text-xs text-teal-300">
                  Image size: {imageDimensions.width} × {imageDimensions.height}
                </p>

                {imageDimensions.width > 0 &&
                  imageDimensions.height > 0 &&
                  (boxes.length > 0 || masks.length > 0) && (
                    <svg
                      viewBox={`0 0 ${imageDimensions.width} ${imageDimensions.height}`}
                      preserveAspectRatio="xMidYMid meet"
                      className="pointer-events-none absolute inset-0 h-full w-full"
                    >
                      {masks.map((mask, index) => (
                        <path
                          key={`mask-${mask.objectId}-${index}`}
                          d={mask.svgPath}
                          transform={`translate(${mask.left} ${mask.top}) scale(${(mask.right - mask.left) / mask.width} ${(mask.bottom - mask.top) / mask.height})`}
                          fill="rgba(45, 212, 191, 0.35)"
                          stroke="#2dd4bf"
                          strokeWidth={Math.max(imageDimensions.width * 0.002, 1)}
                          fillRule="evenodd"
                        />
                      ))}

                      {boxes.map((box, index) => (
                        <rect
                          key={`box-${box.objectId}-${index}`}
                          x={box.left}
                          y={box.top}
                          width={box.right - box.left}
                          height={box.bottom - box.top}
                          fill="none"
                          stroke="#fbbf24"
                          strokeWidth={Math.max(imageDimensions.width * 0.003, 2)}
                        />
                      ))}
                    </svg>
                  )}
              </div>
          ) : (
            <>
              <span className="mb-4 text-4xl text-teal-300">↑</span>
              <span className="font-medium">
                Drop your image here, or browse
              </span>
              <span className="mt-2 text-sm text-slate-500">
                PNG, JPG, or WEBP · Max 10 MB
              </span>
            </>
          )}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={handleImageChange}
              />
            </label>

            {(masks.length > 0 || boxes.length > 0) && (
              <section
                aria-live="polite"
                className="mt-4 rounded-xl border border-teal-900 bg-slate-900/70 p-4"
              >
                <h2 className="font-semibold text-teal-300">
                  Corrosion segmentation results
                </h2>
                <p className="mt-2 text-sm text-slate-300">
                  Detected masks: {masks.length}
                </p>
                <p className="mt-1 text-sm text-slate-300">
                  Detected bounding boxes: {boxes.length}
                </p>
              </section>
            )}

            {fileName && (
              <p className="mt-3 truncate text-sm text-teal-300">
                Selected: {fileName}
              </p>
            )}

            <div className="mt-8">
              <label
                htmlFor="metal"
                className="mb-2 block text-sm font-medium"
              >
                Metal type
              </label>
              <select
                id="metal"
                value={metal}
                onChange={(event) => setMetal(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-teal-400"
              >
                <option>Carbon steel</option>
                <option>Stainless steel</option>
                <option>Galvanized steel</option>
                <option>Aluminum</option>
                <option>Cast iron</option>
                <option>Unknown</option>
              </select>
            </div>

            <div className="mt-5">
              <label
                htmlFor="environment"
                className="mb-2 block text-sm font-medium"
              >
                Environment
              </label>
              <select
                id="environment"
                value={environment}
                onChange={(event) => setEnvironment(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-teal-400"
              >
                <option>Outdoor</option>
                <option>Indoor and dry</option>
                <option>Humid or frequently wet</option>
                <option>Coastal or salty</option>
                <option>Industrial environment</option>
                <option>Unknown</option>
              </select>
            </div>

            <div className="mt-5">
              <label
                htmlFor="notes"
                className="mb-2 block text-sm font-medium"
              >
                Additional observations (optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                placeholder="For example: rust appeared after the rainy season..."
                rows={3}
                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-teal-400"
              />
            </div>
            <div className="mt-5">
              <label
                htmlFor="visibleExtent"
                className="mb-2 block text-sm font-medium"
              >
                Visible corrosion extent
              </label>

              <select
                id="visibleExtent"
                value={visibleExtent}
                onChange={(event) => setVisibleExtent(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-teal-400"
              >
                <option value="Not assessed">Not assessed</option>
                <option value="Localized">Localized — limited area</option>
                <option value="Moderate">Moderate — several areas</option>
                <option value="Widespread">Widespread — substantial surface area</option>
              </select>
            </div>

            
            <button
              type="button"
              disabled={!imagePreview || isAnalyzing || isSegmenting}
              className="mt-6 w-full rounded-lg bg-teal-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={handleAnalyze}
            >
              {isSegmenting
                ? "Segmenting image..."
                : isAnalyzing
                  ? "Analysing corrosion..."
                  : "Analyse & detect corrosion →"}
            </button>

            {(isAnalyzing || isSegmenting) && (
              <p role="status" className="mt-3 text-sm text-teal-300">
                {isSegmenting
                  ? "Step 1/2: Detecting candidate corrosion regions..."
                  : "Step 2/2: Muse Spark is analysing your image and segmentation results..."}
              </p>
            )}



            {analysisError && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-900 bg-red-950/30 p-4 text-sm text-red-200"
              >
                <p className="font-semibold">Analysis failed</p>
                <p className="mt-1">{analysisError}</p>
              </div>
            )}

            {analysis && (
              <section
                aria-live="polite"
                className="mt-6 rounded-xl border border-teal-900 bg-slate-900/70 p-5"
              >
                <p className="text-sm font-semibold text-teal-300">
                  AI corrosion assessment
                </p>
                <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-200">
                  {analysis}
                </div>
                {segmentationInfo && (
                  <div className="mt-5 rounded-xl border border-teal-900 bg-slate-900/70 p-4">
                    <h3 className="font-semibold text-teal-300">
                      SAM 3.1 Integration
                    </h3>

                    <p className="mt-2 text-sm text-slate-300">
                      {segmentationInfo.available
                        ? "Segmentation data supplied to Muse Spark."
                        : "No segmentation data supplied."}
                    </p>

                    <p className="mt-2 text-xs text-slate-400">
                      Masks: {segmentationInfo.totalMasks} ·
                      Bounding boxes: {segmentationInfo.totalBoundingBoxes}
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Spatial measurements:{" "}
                      {segmentationInfo.metricsAvailable
                        ? "Available"
                        : "Unavailable"}
                    </p>
                  </div>
                )}
                <p className="mt-5 border-t border-slate-700 pt-4 text-xs leading-5 text-amber-200/80">
                  AI-generated visual assessment only. A photograph
                  cannot establish corrosion depth or structural
                  integrity. Seek qualified professional assessment
                  for safety-critical components.
                </p>
              </section>
              
            )}
            <section className="mt-8 rounded-2xl border border-teal-900/70 bg-[#111c30] p-6 md:p-8 print:hidden">

              <p className="text-sm font-semibold text-teal-300">
                POWERED BY MUSE IMAGE
              </p>

              <h2 className="mt-2 text-2xl font-semibold text-white">
                AI Visual Maintenance Guide
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Generate an educational visual guide based on
                your corrosion assessment and maintenance
                recommendations.
              </p>

              <button
                type="button"
                onClick={handleGenerateVisual}
                disabled={!analysis || isGeneratingVisual}
                className="mt-6 w-full rounded-lg bg-teal-300 px-5 py-3 font-semibold text-slate-950 disabled:opacity-40"
              >
                {isGeneratingVisual
                  ? "Generating visual guide..."
                  : "Generate Visual Maintenance Guide →"}
              </button>

              {visualError && (
                <p className="mt-4 text-sm text-red-300">
                  {visualError}
                </p>
              )}

              {maintenanceVisual && (
                <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-4">

                  <img
                    src={maintenanceVisual}
                    alt="AI-generated illustrative corrosion maintenance guide"
                    className="w-full rounded-lg"
                  />

                  <p className="mt-3 text-xs leading-5 text-slate-400">
                    AI-generated educational illustration.
                    Not an actual repair record or engineering certification.
                  </p>
                  <button
                    type="button"
                    onClick={() => handleShareImage(maintenanceVisual)}
                    className="mt-4 print:hidden inline-flex items-center gap-2 rounded-lg border border-teal-700 bg-teal-950/40 px-4 py-2 text-sm font-medium text-teal-300 transition hover:bg-teal-900/60"
                    >
                    <span>↗</span>
                    Share Maintenance Guide
                  </button>


                </div>
              )}

            </section>
          </div>
          {/* CORROSENSE ASK AI */}
              {analysis && !isAnalyzing && (
              <section className="mt-8 rounded-2xl border border-teal-900/70 bg-[#111c30] p-6 md:p-8 print:hidden">

                <div className="mb-5">
                  <p className="text-sm font-semibold text-teal-300">
                    CORROSENSE ASK AI
                  </p>

                  <h2 className="mt-2 text-2xl font-semibold text-white">
                    Need help fixing corrosion?
                  </h2>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Ask questions about your inspection results, repair
                    methods and ways to prevent further corrosion.
                  </p>
                </div>

                {/* Suggested questions */}
                <div className="mb-5 flex flex-wrap gap-2">
                  {[
                    "How do I prepare the surface before repainting?",
                    "Explain sacrificial anode protection.",
                    "What are volatile corrosion inhibitors?",
                    "How can I prevent corrosion from returning?",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      disabled={isChatLoading}
                      onClick={() => setChatQuestion(suggestion)}
                      className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-300 transition hover:border-teal-400 hover:text-teal-300 disabled:opacity-40"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>

                {/* Conversation */}
                <div className="mb-5 max-h-96 space-y-4 overflow-y-auto rounded-xl bg-slate-950/50 p-4">

                  {chatMessages.length === 0 && (
                    <div className="py-8 text-center">
                      <p className="text-3xl">💬</p>
                      <p className="mt-3 text-sm font-medium text-slate-200">
                        Your corrosion maintenance assistant
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        Ask anything about your assessment or recommended repairs.
                      </p>
                    </div>
                  )}

                  {chatMessages.map((message, index) => (
                    <div
                      key={index}
                      className={`flex ${
                      message.role === "user"
                        ? "justify-end"
                        : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[90%] rounded-xl p-4 text-sm leading-6 ${
                        message.role === "user"
                          ? "bg-teal-900/60 text-teal-100"
                          : "border border-slate-700 bg-slate-800 text-slate-200"
                        }`}
                      >
                        <p className="mb-2 text-xs font-semibold opacity-70">
                          {message.role === "user" ? "YOU" : "CORROSENSE AI"}
                        </p>

                        <div className="whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                        

                        {message.role === "assistant" && message.image && (
                          <div className="mt-4 rounded-xl border border-teal-800 bg-slate-900 p-3">

                            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-teal-300">
                              AI-generated maintenance guide
                            </p>

                            <img
                              src={message.image}
                              alt="CorroSense AI maintenance illustration"
                              className="block h-auto w-full max-w-full rounded-lg object-contain"
                              onError={() => console.error("Generated image failed to render")}
                            />
                            
                            <p className="mt-3 text-xs leading-5 text-slate-400">
                              AI-generated educational illustration.
                              Not an actual repair record or engineering certification.
                            </p>
                            <button
                              type="button"
                              onClick={() => handleShareImage(message.image!)}
                              className="mt-3 inline-flex items-center gap-2 rounded-lg border border-teal-700 bg-teal-950/40 px-4 py-2 text-sm font-medium text-teal-300 transition hover:bg-teal-900/60"
                            >
                              <span>↗</span>
                              Share Image
                            </button>


                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isChatLoading && (
                    <p role="status" className="text-sm text-teal-300">
                      Muse Spark is preparing your answer...
                    </p>
                  )}
                </div>

                {/* Error message */}
                {chatError && (
                  <div
                    role="alert"
                    className="mb-4 rounded-lg border border-red-900 bg-red-950/30 p-3 text-sm text-red-200"
                  >
                    {chatError}
                  </div>
                )}

                {/* Message input */}
                <form
                  onSubmit={(event) => {
                  event.preventDefault();
                  handleChat();
                }}
                className="flex flex-col gap-3 sm:flex-row"
              >
                <input
                  type="text"
                  value={chatQuestion}
                  onChange={(event) => setChatQuestion(event.target.value)}
                  placeholder="Ask how to repair or prevent corrosion..."
                  maxLength={1500}
                  disabled={isChatLoading}
                  className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-teal-400 disabled:opacity-50"
                />

                <button
                  type="submit"
                  disabled={!chatQuestion.trim() || isChatLoading}
                  className="rounded-lg bg-teal-300 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isChatLoading ? "Thinking..." : "Ask AI →"}
                </button>
              </form>

              <p className="mt-3 text-xs leading-5 text-slate-500">
                AI-generated guidance is preliminary. Verify treatment
                compatibility and consult qualified professionals for
                safety-critical components.
              </p>

            </section>
            
          )}

          <aside className="space-y-5">

            <div className="rounded-2xl border border-amber-900/60 bg-amber-950/20 p-5">
              <p className="text-sm font-semibold text-amber-200 print-avoid-break">
                Safety first
              </p>
              <p className="mt-2 text-sm leading-6 text-amber-100/70">
                Photographs cannot establish structural integrity or
                hidden corrosion. Structural, load-bearing, and
                pressure-bearing components require qualified
                professional assessment.
              </p>
            </div>

            <p className="px-1 text-xs leading-5 text-slate-500">
              Prototype notice: AI assessment is preliminary and does
              not replace a qualified corrosion inspection.
            </p>
          </aside>
        </section>
        <section className="hidden print:block mt-10 rounded-2xl border border-slate-300 bg-white p-6 md:p-8 text-slate-900 report-section">
          <div className="mb-6 report-section">
            <p className="text-sm font-semibold text-teal-300">
               Inspection report
            </p>
            <div className="mb-6 border-b border-slate-700 pb-5 print:border-slate-300 print-avoid-break">
              <p className="text-lg font-bold tracking-widest text-teal-300 print:text-teal-800">
                CORROSENSE
              </p>

              <p className="mt-1 text-xs uppercase tracking-wider text-slate-400 print:text-slate-600">
                Corrosion inspection report
              </p>

              <p className="mt-3 text-xs text-slate-500 print:text-slate-600">
                Report generated: {reportDate || "Generating date..."}
              </p>
            </div>
            <h2 className="mt-2 text-2xl font-semibold ">
              Surface inspection summary
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              A consolidated record of the uploaded surface, inspection
              conditions and available assessment results.
            </p>
            <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900/60 p-4 print-avoid-break">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-200">
                  Inspection completeness
                </p>
                <p className="text-sm font-semibold text-teal-300">
                  {inspectionCompleteness}%
                </p>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-700">
                <div
                  className="h-full rounded-full bg-teal-400 transition-all"
                  style={{ width: `${inspectionCompleteness}%` }}
                />
              </div>

              <p className="mt-2 text-xs text-slate-400">
                {inspectionFieldsCompleted} of 3 required inspection fields completed.
              </p>
              <p
                className={`mt-3 text-xs font-medium ${
                  inspectionCompleteness === 100
                    ? "text-teal-300"
                    : "text-amber-300"
                }`}
              >
                {inspectionCompleteness === 100
                  ? "Inspection details complete."
                  : "Additional inspection details required."}
              </p>
            </div>
          </div>
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-5 print-avoid-break">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Visible corrosion classification
            </p>

            <p className={`mt-3 text-xl font-semibold ${severityAssessment.color}`}>
              {severityAssessment.level}
            </p>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              {severityAssessment.description}
            </p>

            <p className="mt-4 border-t border-slate-700 pt-3 text-xs leading-5 text-slate-500">
              This classification reflects reported visible corrosion extent only.
              It does not establish corrosion depth, metal loss or structural integrity.
            </p>
            <p className="mt-2 text-xs text-slate-500 print:text-slate-600">
              Report reference: {reportId}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 print-avoid-break">
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-500">IMAGE</p>
              <p className="mt-2 text-sm font-medium">
                {fileName || "No image uploaded"}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-500">METAL TYPE</p>
              <p className="mt-2 text-sm font-medium">{metal}</p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-500">ENVIRONMENT</p>
              <p className="mt-2 text-sm font-medium">{environment}</p>
            </div>
            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-500">
                VISIBLE CORROSION EXTENT
              </p>
              <p className="mt-2 text-sm font-medium">
                {visibleExtent}
              </p>
            </div>

            <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4">
              <p className="text-xs text-slate-500">SEGMENTATION FINDINGS</p>
              <p className="mt-2 text-sm font-medium">
                {boxes.length} bounding boxes · {masks.length} masks
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-400">
                Bounding boxes identify detected regions, while masks represent
                the segmented image areas. These results are AI-generated
                visual detections and may require manual verification.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-xl border border-slate-700 bg-slate-900/60 p-4 print-avoid-break">
            <p className="text-xs text-slate-500">
              ADDITIONAL OBSERVATIONS
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
              {notes.trim() || "No additional observations provided."}
            </p>
          </div>
          {analysis && (
            <div className="mt-6 rounded-xl border border-teal-800 bg-slate-900/60 p-5 print-avoid-break">
              <p className="text-sm font-semibold text-teal-300">
                AI VISUAL ASSESSMENT
              </p>

              <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                {analysis}
              </div>
            </div>
          )}
          <div className="mt-6 print-avoid-break">
            <p className="text-xs font-semibold uppercase tracking-wider text-teal-300">
              Recommended maintenance actions
            </p>
            <div className="mt-3 flex items-center gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  hasVisualAssessment ? "bg-teal-400" : "bg-amber-400"
                }`}
              />

              <p className="text-xs text-slate-400">
                {hasVisualAssessment
                  ? "AI visual assessment available"
                  : "Manual inspection only"}
              </p>
            </div>
            

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {treatmentRecommendations.map((recommendation, index) => (
                <div
                  key={index}
                  className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-slate-100">
                      {index + 1}. {recommendation.title}
                    </p>

                    <span className="rounded-full border border-teal-700/60 bg-teal-950/40 px-2 py-1 text-xs text-teal-300">
                      {recommendation.priority}
                    </span>
                  </div>

                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {recommendation.description}
                  </p>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs leading-5 text-slate-400">
              {assessmentContext}
            </p>
            <p className="mt-4 rounded-lg border border-amber-700/40 bg-amber-950/20 p-3 text-xs leading-5 text-amber-200">
              Treatment recommendations are preliminary and must be
              verified against the material, corrosion condition and
              operating environment. Structural or safety-critical
              components require assessment by a qualified professional.
            </p>
          </div>
          <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900/60 p-5 print-avoid-break">
            <p className="text-sm font-semibold text-teal-300">
              REPAIR VERIFICATION
            </p>

            <p className="mt-3 text-sm text-slate-400">
              Follow-up image:
            </p>

            <p className="mt-1 text-sm text-slate-200">
              {afterFileName || "No follow-up image uploaded"}
            </p>

            <p className="mt-4 text-sm text-slate-400">
              Recorded repair outcome:
            </p>

            <p className="mt-1 text-sm font-medium text-slate-200">
              {repairOutcome}
            </p>

            <p className="mt-4 text-sm text-slate-400">
              Maintenance notes:
            </p>

            <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">
              {repairNotes.trim() || "No repair notes provided."}
            </p>

            <p className="mt-4 border-t border-slate-700 pt-3 text-xs leading-5 text-slate-500">
              This outcome represents an inspector-recorded visual observation.
              It does not establish structural integrity or confirm complete corrosion removal.
            </p>
          </div>
          
          
          {/* PRINTABLE AI VISUAL MAINTENANCE GUIDE */}

          {maintenanceVisual && (
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-900 p-4">

              <img
                src={maintenanceVisual}
                alt="AI-generated illustrative corrosion maintenance guide"
                className="w-full rounded-lg"
              />

              <p className="mt-3 text-xs leading-5 text-slate-400">
                AI-generated educational illustration.
                Not an actual repair record or engineering certification.
              </p>

              
            </div>
          )}

          
          {/* PRINTABLE CORROSENSE AI CHAT HISTORY */}

          
          {chatMessages.length > 0 && (
            <section className="chat-history-print mt-8 rounded-xl border border-slate-300 bg-white p-5 text-slate-900">

              <div className="mb-5 border-b border-slate-300 pb-4">
                <p className="text-sm font-bold tracking-wider text-teal-700">
                  CORROSENSE
                </p>

                <h2 className="mt-3 text-lg font-bold text-slate-900">
                  AI Maintenance Consultation
                </h2>

                <p className="mt-2 text-xs leading-5 text-slate-600">
                  Record of questions and AI-generated corrosion
                  maintenance guidance during this inspection.
                </p>
              </div>

              <div className="space-y-5">

                {chatMessages.map((message, index) => (
                  <div
                    key={index}
                    className="rounded-lg border border-slate-200 p-4"
                    style={{ breakInside: "avoid" }}
                  >

                    <p className={`mb-2 text-xs font-bold tracking-wide ${
                      message.role === "user"
                        ? "text-amber-700"
                        : "text-teal-700"
                    }`}>
                      {message.role === "user"
                        ? "USER QUESTION"
                        : "CORROSENSE AI RESPONSE"}
                    </p>

                    <div className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
                      {message.content}
                    </div>

                    {message.role === "assistant" && message.image && (
                      <div className="mt-4 rounded-lg border border-slate-200 p-3">
                        
                        <img
                          src={message.image}
                          alt="CorroSense AI-generated maintenance illustration"
                          className="mx-auto block h-auto w-full rounded-lg object-contain"
                          style={{ maxHeight: "500px" }}
                        />

                        <p className="mt-3 text-xs text-slate-600">
                          AI-generated educational illustration.
                          Not an actual inspection result or engineering certification.
                        </p>

                      </div>
                    )}

                  </div>
                ))}

              </div>

              <div className="mt-5 border-t border-slate-300 pt-4">
                <p className="text-xs leading-5 text-slate-600">
                  Note: AI-generated maintenance guidance is preliminary.
                  Verify material compatibility and follow appropriate
                  safety procedures. This conversation does not establish
                  structural integrity or confirm successful repairs.
                </p>
              </div>

            </section>
          )}

          <div className="mt-8 border-t border-slate-700 pt-5 print:border-slate-300 print-avoid-break">
            <p className="text-sm font-semibold text-amber-300 print:text-amber-800">
                Inspection limitations and safety notice
            </p>

            <p className="mt-2 text-xs leading-6 text-slate-400 print:text-slate-700">
              This report documents an AI-assisted visual assessment of the
              submitted photographs. Visual analysis cannot establish corrosion
              depth, remaining wall thickness, material strength or structural
              integrity. Segmentation results and treatment suggestions require
              human verification. Safety-critical components must be assessed by
              a qualified corrosion or structural inspection professional.
           </p>
          </div>
          
        </section>
        <section className="mt-8 rounded-2xl border border-slate-800 bg-[#111c30] p-6 md:p-8 print:hidden">

          <p className="text-sm font-semibold text-teal-300">
            Repair verification
          </p>

          <h2 className="mt-2 text-2xl font-semibold">
            Before-and-after comparison
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            Upload a photograph of the surface after maintenance to
            document visible changes.
          </p>

          <label className="mt-6 flex min-h-40 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-slate-600 bg-slate-900/60 p-5 text-center hover:border-teal-400">
            {afterImagePreview ? (
              <img
                src={afterImagePreview}
                alt="Metal surface after repair"
                className="max-h-64 w-full rounded-lg object-contain"
              />
            ) : (
              <>
                <span className="text-3xl text-teal-300">↑</span>
                <span className="mt-3 text-sm font-medium">
                  Upload after-repair photograph
                </span>
                <span className="mt-2 text-xs text-slate-500">
                  PNG, JPG or WEBP · Max 10 MB
                </span>
              </>
            )}

            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              onChange={handleAfterImageChange}
            />
          </label>
          {imagePreview && afterImagePreview && (
            <div className="mt-8">
              <h3 className="mb-4 text-sm font-semibold text-slate-200">
                Surface comparison
              </h3>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                  <p className="mb-3 text-sm font-medium text-amber-300">
                    Before repair
                  </p>

                  <img
                    src={imagePreview}
                    alt="Original metal surface before repair"
                    className="w-full rounded-lg object-contain"
                  />

                  <p className="mt-2 truncate text-xs text-slate-500">
                    {fileName}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-3">
                  <p className="mb-3 text-sm font-medium text-teal-300">
                    After repair
                  </p>

                  <img
                    src={afterImagePreview}
                    alt="Metal surface after repair"
                    className="w-full rounded-lg object-contain"
                  />

                  <p className="mt-2 truncate text-xs text-slate-500">
                    {afterFileName}
                  </p>
                </div>
              </div>
            </div>
          )}

          {afterFileName && (
            <p className="mt-3 text-sm text-teal-300">
              Selected: {afterFileName}
            </p>
          )}
          
          <div className="mt-6 print-avoid-break">
            <label
              htmlFor="repairOutcome"
              className="mb-2 block text-sm font-medium"
            >
              Observed repair outcome
            </label>

            <select
              id="repairOutcome"
              value={repairOutcome}
              onChange={(event) => setRepairOutcome(event.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none focus:border-teal-400"
            >
              <option value="Not assessed">Not assessed</option>
              <option value="Visible improvement">Visible improvement</option>
              <option value="No significant visible change">
                No significant visible change
              </option>
              <option value="Visible deterioration">
                Visible deterioration
              </option>
            </select>
          </div>
          <div className="mt-5">
            <label
              htmlFor="repairNotes"
              className="mb-2 block text-sm font-medium"
            >
              Repair and maintenance notes
            </label>

            <textarea
              id="repairNotes"
              value={repairNotes}
              onChange={(event) => setRepairNotes(event.target.value)}
              placeholder="Describe the maintenance performed, materials used, or any remaining concerns..."
              rows={4}
              className="w-full resize-y rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm outline-none placeholder:text-slate-600 focus:border-teal-400"
            />
          </div>
          <button
            type="button"
            disabled={!imagePreview || !afterImagePreview || isComparing}
            onClick={handleCompare}
            className="mt-6 w-full rounded-lg bg-teal-300 px-5 py-3 font-semibold text-slate-950 transition hover:bg-teal-200 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isComparing
              ? "Comparing photographs..."
              : "Compare before & after with AI →"}
          </button>
          {isComparing && (
            <p role="status" className="mt-3 text-sm text-teal-300">
              Muse Spark is examining both photographs and evaluating
              visible repair progress. Please wait...
            </p>
          )}

          {comparisonError && (
            <div role="alert" className="mt-4 rounded-lg border border-red-900 bg-red-950/30 p-4 text-sm text-red-200">
              {comparisonError}
            </div>
          )}

          {comparison && (
            <div className="mt-6 rounded-xl border border-teal-800 bg-slate-900/70 p-5">
              <h3 className="font-semibold text-teal-300">
                AI repair progress assessment
              </h3>

              <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-slate-200">
                {comparison}
              </div>
              
            </div>
            
          )}
        </section>
        <div className="mt-8 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="w-full rounded-lg bg-teal-300 px-5 py-4 font-semibold text-slate-950 transition hover:bg-teal-200"
          >
            Print or Download Inspection Report ↓
          </button>

          <p className="mt-2 text-center text-xs text-slate-500">
            Export your completed inspection record as a PDF.
          </p>
        </div>

        <footer className="mt-12 border-t border-slate-800 py-6 text-xs text-slate-500">
          CorroSense · AI-assisted visible corrosion assessment
        </footer>
      </div>
    </main>
  );
}
