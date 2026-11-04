
import { NextResponse } from "next/server";

function isValidImage(image: unknown): image is string {
  return (
    typeof image === "string" &&
    /^data:image\/(jpeg|png|webp);base64,/i.test(image) &&
    image.length <= 14_000_000
  );
}

export async function POST(request: Request) {
  if (process.env.CORROSENSE_LIVE_ANALYSIS !== "true") {
    return NextResponse.json(
      { error: "Live AI analysis is disabled." },
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

    if (
      typeof body !== "object" ||
      body === null ||
      !("beforeImage" in body) ||
      !("afterImage" in body)
    ) {
      return NextResponse.json(
        { error: "Both before and after images are required." },
        { status: 400 }
      );
    }

    const {
        beforeImage,
        afterImage,
        metal,
        environment,
        repairOutcome,
        repairNotes,
    } = body as Record<string, unknown>;

    if (!isValidImage(beforeImage) || !isValidImage(afterImage)) {
      return NextResponse.json(
        { error: "Please provide valid JPEG, PNG or WEBP images." },
        { status: 400 }
      );
    }
    if (beforeImage.length + afterImage.length > 20_000_000) {
        return NextResponse.json(
            { error: "Combined image size is too large. Please use smaller images." },
            { status: 413 }
        );
    }

    const safeMetal =
      typeof metal === "string" ? metal.slice(0, 100) : "Not provided";

    const safeEnvironment =
      typeof environment === "string"
        ? environment.slice(0, 100)
        : "Not provided";

    const safeRepairNotes =
      typeof repairNotes === "string"
        ? repairNotes.slice(0, 1000)
        : "No repair details provided.";
    const safeRepairOutcome =
        typeof repairOutcome === "string"
            ? repairOutcome.slice(0, 100)
            : "Not assessed";

    const prompt = `
You are Muse Spark, the repair verification assistant
for CorroSense.

Compare the two photographs of the SAME metal surface.

IMAGE 1: BEFORE maintenance.
IMAGE 2: AFTER maintenance.

METAL: ${safeMetal}
ENVIRONMENT: ${safeEnvironment}
MAINTENANCE PERFORMED: ${safeRepairNotes}

INSPECTOR-RECORDED REPAIR OUTCOME: ${
  typeof repairOutcome === "string"
    ? repairOutcome.slice(0, 100)
    : "Not assessed"
}

YOUR TASK:

Compare both photographs and determine what visible
changes can reasonably be observed.

Assess:

1. Whether the surface shows visible improvement,
   no significant change, deterioration or uncertainty.

2. Whether suspected corrosion or discoloration remains.

3. Whether the maintenance appears visually effective.

4. Whether new suspicious surface characteristics
   are visible.

5. What the user should do next.

IMPORTANT RULES:
ADDITIONAL COMPARISON REQUIREMENTS:

- Determine whether both photographs show approximately
  the same physical surface and inspection area.
- If the photographs cannot be reliably aligned visually,
  classify the result as Inconclusive.
- Distinguish actual visible surface changes from changes
  caused by lighting, camera angle or image quality.
- A cleaner-looking surface does not necessarily mean
  corrosion has been eliminated.
- If corrosion remains visible, explain what further
  inspection or maintenance may be appropriate.
- Never declare the repair successful solely because
  the inspector selected "Visible improvement".
- Give greater importance to photographic evidence than
  the inspector's recorded repair outcome.

- Compare the same physical area wherever possible.
- Account for differences in lighting, camera angle,
  distance and image quality.
- Do not mistake different lighting or reflections
  for corrosion removal or deterioration.
- Never claim that corrosion has been completely removed
  without sufficient evidence.
- Photographs cannot establish corrosion depth,
  metal loss or structural integrity.
- Do not recommend specific chemicals or coatings
  without sufficient material and environmental details.
- Structural and pressure-bearing components require
  qualified professional inspection.

RESPONSE FORMAT:

Maximum 250 words.

Use these sections:

1. COMPARISON RESULT
Choose one:
Visible improvement / No significant change /
Visible deterioration / Inconclusive.

2. WHAT CHANGED?
Briefly explain the visible differences.

3. IS THE REPAIR EFFECTIVE?
Explain what appears successful and what remains uncertain.

4. WHAT SHOULD YOU DO NEXT?
Give 2-3 practical, prioritized recommendations.

5. MONITORING ADVICE
Explain what the user should watch for.

Use simple, professional English.
Prioritize practical actions.
Do not invent observations.
`;

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
                  type: "text",
                  text: "IMAGE 1 — BEFORE MAINTENANCE",
                },
                {
                  type: "image_url",
                  image_url: { url: beforeImage },
                },
                {
                  type: "text",
                  text: "IMAGE 2 — AFTER MAINTENANCE",
                },
                {
                  type: "image_url",
                  image_url: { url: afterImage },
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
        "Meta comparison failed:",
        response.status
      );

      return NextResponse.json(
        { error: "AI image comparison failed. Please try again." },
        { status: 502 }
      );
    }

    const data = await response.json();

    const comparison = data.choices?.[0]?.message?.content;

    if (typeof comparison !== "string" || !comparison.trim()) {
      return NextResponse.json(
        { error: "Meta returned no comparison results." },
        { status: 502 }
      );
    }

    return NextResponse.json({ comparison });

  } catch (error) {
    console.error(
      "CorroSense comparison error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Could not compare the images." },
      { status: 500 }
    );
  }
}
