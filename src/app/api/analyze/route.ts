
import { NextResponse } from "next/server";

type SegmentationRegion = {
  left: number;
  top: number;
  right: number;
  bottom: number;
};

type SegmentationMask = SegmentationRegion & {
  objectId: string;
  width: number;
  height: number;
  svgPath: string;
};

type SegmentationBox = SegmentationRegion & {
  objectId: string;
  confidence?: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isValidRegion(value: unknown): value is SegmentationRegion {
  if (!isRecord(value)) return false;

  const { left, top, right, bottom } = value;

  return (
    typeof left === "number" &&
    Number.isFinite(left) &&
    typeof top === "number" &&
    Number.isFinite(top) &&
    typeof right === "number" &&
    Number.isFinite(right) &&
    typeof bottom === "number" &&
    Number.isFinite(bottom) &&
    left >= 0 &&
    top >= 0 &&
    right > left &&
    bottom > top
  );
}

function isValidMask(value: unknown): value is SegmentationMask {
  if (!isRecord(value) || !isValidRegion(value)) {
    return false;
  }

  const mask = value as Record<string, unknown>;

  return (
    typeof mask.objectId === "string" &&
    mask.objectId.length > 0 &&
    mask.objectId.length <= 100 &&
    typeof mask.width === "number" &&
    Number.isFinite(mask.width) &&
    mask.width > 0 &&
    typeof mask.height === "number" &&
    Number.isFinite(mask.height) &&
    mask.height > 0 &&
    typeof mask.svgPath === "string" &&
    mask.svgPath.length > 0 &&
    mask.svgPath.length <= 200_000
  );
}
function isValidBox(value: unknown): value is SegmentationBox {
  if (!isRecord(value) || !isValidRegion(value)) {
    return false;
  }

  const box = value as Record<string, unknown>;

  return (
    typeof box.objectId === "string" &&
    box.objectId.length > 0 &&
    box.objectId.length <= 100 &&
    (
      box.confidence === undefined ||
      (
        typeof box.confidence === "number" &&
        Number.isFinite(box.confidence)
      )
    )
  );
}


function getRegionMetrics(
  region: SegmentationRegion,
  imageWidth: number,
  imageHeight: number
) {
  const width = region.right - region.left;
  const height = region.bottom - region.top;

  const imageArea = imageWidth * imageHeight;
  const regionBoxArea = width * height;

  return {
    left: region.left,
    top: region.top,
    right: region.right,
    bottom: region.bottom,

    width,
    height,

    centerX: Math.round((region.left + region.right) / 2),
    centerY: Math.round((region.top + region.bottom) / 2),

    approximateBoundingBoxArea: Math.round(regionBoxArea),

    approximateImageAreaPercentage:
      imageArea > 0
        ? Number(((regionBoxArea / imageArea) * 100).toFixed(4))
        : 0,

    normalizedPosition: {
      x: Number(
        (((region.left + region.right) / 2) / imageWidth).toFixed(4)
      ),
      y: Number(
        (((region.top + region.bottom) / 2) / imageHeight).toFixed(4)
      ),
    },
  };
}
function isWithinImage(
  region: SegmentationRegion,
  width: number,
  height: number
) {
  return (
    region.left < width &&
    region.top < height &&
    region.right <= width &&
    region.bottom <= height
  );
}
export async function POST(request: Request) {
  if (process.env.CORROSENSE_LIVE_ANALYSIS !== "true") {
    return NextResponse.json(
      {
        error:
          "Live AI analysis is temporarily disabled. Please use demo mode.",
      },
      { status: 503 }
    );
  }

  const apiKey = process.env.MODEL_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Meta API key is not configured." },
      { status: 500 }
    );
  }

  try {
    const body: unknown = await request.json();

    if (!isRecord(body)) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const {
      image,
      metal,
      environment,
      notes,
      visibleExtent,
      imageDimensions,
    } = body;

    const rawMasks = body.masks ?? [];
    const rawBoxes = body.boxes ?? [];

    // Validate the original image.

    if (
      typeof image !== "string" ||
      !/^data:image\/(jpeg|png|webp);base64,/i.test(image)
    ) {
      return NextResponse.json(
        { error: "Please provide a valid supported image." },
        { status: 400 }
      );
    }

    if (image.length > 14_000_000) {
      return NextResponse.json(
        { error: "The image is too large to analyze." },
        { status: 413 }
      );
    }

    // Validate segmentation arrays.

    if (
      !Array.isArray(rawMasks) ||
      !Array.isArray(rawBoxes) ||
      rawMasks.length > 100 ||
      rawBoxes.length > 100
    ) {
      return NextResponse.json(
        { error: "Invalid or excessive segmentation data." },
        { status: 400 }
      );
    }

    // Validate image dimensions.

    let imageWidth = 0;
    let imageHeight = 0;

    if (
      isRecord(imageDimensions) &&
      typeof imageDimensions.width === "number" &&
      Number.isFinite(imageDimensions.width) &&
      imageDimensions.width > 0 &&
      typeof imageDimensions.height === "number" &&
      Number.isFinite(imageDimensions.height) &&
      imageDimensions.height > 0
    ) {
      imageWidth = imageDimensions.width;
      imageHeight = imageDimensions.height;
    }
    if (
      (rawMasks.length > 0 || rawBoxes.length > 0) &&
      (imageWidth <= 0 || imageHeight <= 0)
    ) {
      return NextResponse.json(
        {
          error:
            "Valid image dimensions are required for segmentation data.",
        },
        { status: 400 }
      );
    }

    // Validate masks without silently accepting malformed entries.

    const masks: SegmentationMask[] = [];

    for (const mask of rawMasks as unknown[]) {
      if (!isValidMask(mask)) {
        return NextResponse.json(
          { error: "Segmentation contains an invalid mask." },
          { status: 400 }
        );
      }
      if (!isWithinImage(mask, imageWidth, imageHeight)) {
        return NextResponse.json(
          { error: "Mask coordinates exceed image boundaries." },
          { status: 400 }
        );
      }

      masks.push({
        objectId: mask.objectId,
        left: mask.left,
        top: mask.top,
        right: mask.right,
        bottom: mask.bottom,
        width: mask.width,
        height: mask.height,
        svgPath: mask.svgPath,
      });
    }
    // Validate bounding boxes.

    const boxes: SegmentationBox[] = [];

    for (const box of rawBoxes as unknown[]) {
      if (!isValidBox(box)) {
        return NextResponse.json(
          { error: "Segmentation contains an invalid bounding box." },
          { status: 400 }
        );
      }

      if (!isWithinImage(box, imageWidth, imageHeight)) {
        return NextResponse.json(
          { error: "Box coordinates exceed image boundaries." },
          { status: 400 }
        );
      }

      boxes.push({
        objectId: box.objectId,
        left: box.left,
        top: box.top,
        right: box.right,
        bottom: box.bottom,
        ...(box.confidence !== undefined
          ? { confidence: box.confidence }
          : {}),
      });
    }
    // Calculate useful measurements from segmentation.
    // These are bounding-box measurements, not true corrosion areas.

    const metricsAvailable =
      imageWidth > 0 && imageHeight > 0;

    const segmentationSummary = metricsAvailable
      ? {
          imageDimensions: {
            width: imageWidth,
            height: imageHeight,
          },

          totalMasks: masks.length,
          totalBoundingBoxes: boxes.length,

          masks: masks.map((mask, index) => ({
            id: index + 1,
            objectId: mask.objectId,

            ...getRegionMetrics(
              mask,
              imageWidth,
              imageHeight
            ),

            maskWidth: mask.width,
            maskHeight: mask.height,

            maskGeometryPreserved: true,
          })),

          boundingBoxes: boxes.map((box, index) => ({
            id: index + 1,
            objectId: box.objectId,

            ...getRegionMetrics(
              box,
              imageWidth,
              imageHeight
            ),

            ...(box.confidence !== undefined
              ? { confidence: box.confidence }
              : {}),
          })),
        }
      : {
          totalMasks: masks.length,
          totalBoundingBoxes: boxes.length,
          coordinateMetrics:
            "Image dimensions unavailable; normalized measurements omitted.",
          masks,
          boundingBoxes: boxes,
        };

    const segmentationAvailable =
      masks.length > 0 || boxes.length > 0;

    const segmentationContext = segmentationAvailable
      ? JSON.stringify(segmentationSummary)
      : "No segmentation results were supplied.";

    // Prepare inspection context.

    const safeMetal =
      typeof metal === "string"
        ? metal.slice(0, 100)
        : "Not provided";

    const safeEnvironment =
      typeof environment === "string"
        ? environment.slice(0, 100)
        : "Not provided";

    const safeNotes =
      typeof notes === "string"
        ? notes.slice(0, 1000)
        : "None";

    const safeVisibleExtent =
      typeof visibleExtent === "string"
        ? visibleExtent.slice(0, 100)
        : "Not assessed";

    // Segmentation-aware assessment instructions.

    const prompt = `
You are Muse Spark, the visual assessment intelligence
for CorroSense, an AI-assisted corrosion inspection system.

YOUR TASK:
Analyse the original photograph together with image
segmentation results generated by Meta SAM 3.1.

You must use BOTH sources of information to produce
a reasoned visual assessment.

INPUTS:

1. Original photograph of a metal surface.
2. SAM 3.1 segmentation masks and bounding boxes.
3. Inspector-provided material and environmental information.
4. Inspector-recorded visible corrosion extent.

IMPORTANT TECHNICAL DISTINCTION:

SAM 3.1 is a segmentation model, NOT a corrosion classifier.

A segmented region is a candidate region of interest.
It is not automatically rust, corrosion or material damage.

Segmentation provides spatial information about visually
distinctive regions. Your task is to interpret those regions
using the original photograph.

SEGMENTATION DATA:

${segmentationContext}

INSPECTION CONTEXT:

Metal: ${safeMetal}
Environment: ${safeEnvironment}
Inspector-recorded visible extent: ${safeVisibleExtent}
Additional observations: ${safeNotes}

ANALYSIS PROCEDURE:

STEP 1 - Examine the original photograph.

Identify visible surface characteristics, including:
- Reddish-brown or orange discoloration.
- Dark spots or patches.
- Linear streaks.
- Surface deposits.
- Peeling or coating deterioration.
- Other visible irregularities.

Do not assume every irregularity is corrosion.

STEP 2 - Interpret the segmentation results.

Use the bounding-box coordinates and region measurements
to understand where the segmented regions occur.

Consider:
- Number of segmented regions.
- Relative region sizes.
- Spatial distribution.
- Clusters of nearby regions.
- Larger continuous or elongated regions.
- Whether the regions correspond to visible discoloration
  or other suspicious characteristics in the photograph.

Do not interpret bounding-box area as actual corrosion area.

Do not assume masks and bounding boxes are independent
detections. They may describe the same underlying regions.

STEP 3 - Compare segmentation with the photograph.

For each meaningful group of candidate regions, explain:

- Where the regions occur.
- What they look like in the original photograph.
- Whether they correspond to possible corrosion.
- Whether they may instead represent shadows, lighting,
  surface texture, dirt or unrelated image features.
- How confident the visual correspondence is.

Do not invent image coordinates or observations.

If exact individual regions cannot be visually distinguished,
explain this limitation.

STEP 4 - Evaluate possible corrosion characteristics.

Consider the metal type and environment.

Explain whether the visible pattern is consistent with
possible corrosion, coating deterioration or another
surface condition.

Do not diagnose a specific corrosion mechanism unless
the available evidence supports it.

STEP 5 - Make an evidence-based preliminary assessment.

Consider:
- Visual appearance.
- Distribution of candidate regions.
- Apparent concentration of discoloration.
- Inspector-recorded visible extent.
- Environmental exposure.
- Material information.

Give a preliminary visual severity:
Low, Moderate, High or Uncertain.

Explain the evidence behind the classification.

Do not confuse the number of segmentation regions
with corrosion severity.

STEP 6 - Provide practical recommendations.

Recommend appropriate next inspection steps.

Consider whether additional inspection, cleaning assessment,
coating evaluation, environmental monitoring or professional
assessment is appropriate.

Do not prescribe a chemical treatment or coating without
sufficient material and environmental information.

REQUIRED RESPONSE FORMAT:

Write a concise, user-friendly corrosion assessment.

MAXIMUM LENGTH: 350 words.

Use short paragraphs, clear headings and bullet points.
Avoid unnecessarily technical language.
Do not repeat the same information.

Prioritize practical solutions over lengthy explanations.

Use exactly these sections:

1. WHAT DID WE FIND?
- Briefly describe the visible corrosion or suspected damage.
- Explain where it appears.
- Mention how SAM segmentation helped identify the affected regions.
- Maximum 45 words.

2. HOW SERIOUS IS IT?
- Classification: Low, Moderate, High or Uncertain.
- Explain why in no more than 40 words.
- Clearly distinguish visible severity from structural severity.

3. HOW CAN YOU FIX IT?
Give 3-4 prioritized practical actions.

Consider two levels of protection:

A. PRIMARY PROTECTIVE MEASURES
Recommend practical measures suitable for the identified
metal and exposure conditions.

B. ADVANCED CORROSION PROTECTION
Where technically appropriate, consider advanced options
such as:
- Sacrificial anode cathodic protection.
- Volatile corrosion inhibitors (VCIs).
- Suitable corrosion inhibitors.
- Advanced protective coating systems.

For every advanced option:
- Explain briefly how it works.
- Explain when it is appropriate.
- Identify material and environmental compatibility requirements.
- Do not recommend it if the necessary conditions are unknown.

Do not imply that every method is suitable for every metal.

For each action include:
- What needs to be done.
- Why it is necessary.
- Any important material or safety consideration.

Prioritize inspection, appropriate surface preparation,
and compatible protective measures.

Do not recommend a specific chemical or coating without
sufficient material and environmental information.

4. HOW CAN YOU PREVENT IT?
Give 2-3 practical preventive recommendations.

Consider:
- Moisture and water exposure.
- Protective coating maintenance.
- Environmental conditions.
- Regular inspection and monitoring.

5. WHAT SHOULD YOU WATCH OUT FOR?
Mention important uncertainties and safety limitations.

Keep this section brief.

WRITING STYLE:

- Maximum 350 words for the entire assessment.
- Use simple, professional English.
- Use bullet points instead of long paragraphs.
- Avoid repeating observations.
- Avoid unnecessary numerical details.
- Explain technical terms in simple language.
- Do not overwhelm the user with segmentation statistics.
- Include segmentation findings only when they help explain
  the corrosion assessment.
- Never treat SAM regions as confirmed corrosion.
- Do not invent observations or measurements.
- Clearly distinguish confirmed visual observations
  from possible interpretations.

MOST IMPORTANT:

The user's primary concern is resolving the corrosion
problem and preventing further deterioration.

Make the recommended actions the most useful part
of the assessment.

Do not sacrifice important safety warnings to meet
the word limit.

If the evidence is insufficient, explain what additional
inspection is needed before recommending a repair.
`;

    // Send the original photograph and segmentation-informed
    // assessment instructions to Muse Spark.

    const response = await fetch(
      "https://api.meta.ai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "muse-spark-1.3",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image,
                  },
                },
              ],
            },
          ],
        }),
        signal: AbortSignal.timeout(60_000),
      }
    );

    if (!response.ok) {
      console.error(
        "Meta analysis request failed:",
        response.status
      );

      return NextResponse.json(
        { error: "Meta image analysis failed. Please try again." },
        { status: 502 }
      );
    }

    const data = await response.json();

    const analysis = data.choices?.[0]?.message?.content;

    if (typeof analysis !== "string" || !analysis.trim()) {
      return NextResponse.json(
        { error: "Meta returned no analysis text." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      analysis,

      segmentation: {
        source: "SAM 3.1",

        status: segmentationAvailable
          ? "completed"
          : "empty",

        available: segmentationAvailable,
        totalMasks: masks.length,
        totalBoundingBoxes: boxes.length,
        metricsAvailable,

        detections: {
          masks: masks.map((mask) => ({
            objectId: mask.objectId,
            bounds: {
              left: mask.left,
              top: mask.top,
              right: mask.right,
              bottom: mask.bottom,
            },
            maskWidth: mask.width,
            maskHeight: mask.height,
            geometryPreserved: true,
          })),

          boxes: boxes.map((box) => ({
            objectId: box.objectId,
            bounds: {
              left: box.left,
              top: box.top,
              right: box.right,
              bottom: box.bottom,
            },
          })),
        },
      },
    });

  } catch (error) {
    console.error(
      "CorroSense analysis error:",
      error instanceof Error
        ? error.message
        : "Unknown error"
    );

    return NextResponse.json(
      { error: "Could not complete the image analysis." },
      { status: 500 }
    );
  }
}
