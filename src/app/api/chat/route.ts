
import { NextResponse } from "next/server";

function wantsVisual(question: string) {
  const visualKeywords = [
    "show me",
    "visual",
    "image",
    "picture",
    "illustration",
    "diagram",
    "draw",
    "visualise",
    "visualize",
    "how does it look",
    "show what",
  ];

  const normalized = question.toLowerCase();

  return visualKeywords.some((keyword) =>
    normalized.includes(keyword)
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function getSafeSegmentation(value: unknown): string {
  if (!isRecord(value)) {
    return "No SAM 3.1 segmentation information available.";
  }

  const detections = isRecord(value.detections)
    ? value.detections
    : {};

  const rawMasks = Array.isArray(detections.masks)
    ? detections.masks
    : [];

  const rawBoxes = Array.isArray(detections.boxes)
    ? detections.boxes
    : [];

  function safeDetection(item: unknown) {
    if (!isRecord(item) || !isRecord(item.bounds)) {
      return null;
    }

    const bounds = item.bounds;

    const { left, top, right, bottom } = bounds;

    if (
      !isFiniteNumber(left) ||
      !isFiniteNumber(top) ||
      !isFiniteNumber(right) ||
      !isFiniteNumber(bottom) ||
      left < 0 ||
      top < 0 ||
      right <= left ||
      bottom <= top
    ) {
      return null;
    }

    return {
      objectId:
        typeof item.objectId === "string"
          ? item.objectId.slice(0, 100)
          : "Unknown",
      bounds: { left, top, right, bottom },
    };
  }

  const masks = rawMasks
    .slice(0, 100)
    .map(safeDetection)
    .filter((item) => item !== null);

  const boxes = rawBoxes
    .slice(0, 100)
    .map(safeDetection)
    .filter((item) => item !== null);

  return JSON.stringify({
    source: "SAM 3.1",
    status:
      value.status === "completed"
        ? "completed"
        : "unknown",
    available: value.available === true,
    totalMasks: masks.length,
    totalBoundingBoxes: boxes.length,
    masks,
    boxes,
  });
}

export async function POST(request: Request) {
  if (process.env.CORROSENSE_LIVE_ANALYSIS !== "true") {
    return NextResponse.json(
      { error: "Live AI chat is currently disabled." },
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
      question,
      metal,
      environment,
      analysis,
      segmentation,
      comparison,
      repairNotes,
      history,
    } = body;

    if (
      typeof question !== "string" ||
      !question.trim() ||
      question.length > 1500
    ) {
      return NextResponse.json(
        { error: "Please enter a question (maximum 1500 characters)." },
        { status: 400 }
      );
    }
    const visualRequested = wantsVisual(question);
    const visualInstruction = visualRequested
      ? `
    The user has requested visual assistance.
    Explain briefly what visual illustration would help
    them understand the corrosion maintenance procedure.
    `
      : "";

    if (
      history !== undefined &&
      (!Array.isArray(history) || history.length > 12)
    ) {
      return NextResponse.json(
        { error: "Invalid chat history." },
        { status: 400 }
      );
    }

    const safeMetal =
      typeof metal === "string" ? metal.slice(0, 100) : "Unknown";

    const safeEnvironment =
      typeof environment === "string"
        ? environment.slice(0, 100)
        : "Unknown";

    const safeAnalysis =
      typeof analysis === "string"
        ? analysis.slice(0, 5000)
        : "No inspection assessment available.";

    const safeComparison =
      typeof comparison === "string"
        ? comparison.slice(0, 3000)
        : "No repair comparison available.";

    const safeRepairNotes =
      typeof repairNotes === "string"
        ? repairNotes.slice(0, 1000)
        : "No repair notes provided.";
    const safeSegmentation = getSafeSegmentation(segmentation);

    const safeHistory = Array.isArray(history)
      ? history.filter(
          (item): item is Record<string, unknown> =>
            isRecord(item) &&
            (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string" &&
            item.content.length <= 2000
        ).slice(-12)
      : [];
    let generatedImage: string | null = null;

    if (visualRequested) {
      const imageResponse = await fetch(
        "https://api.meta.ai/v1/images/generations",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.MODEL_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "muse-image-1.0",
            prompt: `
    Create a professional industrial educational
    illustration explaining this corrosion maintenance topic:

    ${question}

    Metal type: ${metal}
    Environment: ${environment}

    Use a clean engineering infographic style,
    teal and navy colour palette,
    clear visual stages and realistic materials.

    Do not present this as an actual inspection result.
    `,
            n: 1,
            size: "1536x1024",
            response_format: "b64_json",
            output_format: "webp",
            reasoning_strength: "low",
            tool_enablement: {
              enable_image_search: false,
              enable_web_search: false,
              enable_shell: false,
            },
          }),
        }
      );

      const imageData = await imageResponse.json();

      if (!imageResponse.ok) {
        console.error("Muse Image error:", imageData);
      } else {
        generatedImage =
          imageData.data?.[0]?.b64_json
            ? `data:image/webp;base64,${imageData.data[0].b64_json}`
            : null;
      }
    }

    const systemPrompt = `
You are CorroSense Ask AI, a practical corrosion
maintenance assistant powered by Muse Spark.



YOUR PURPOSE:
Help users understand their corrosion assessment,
choose appropriate protective measures and understand
how to carry out maintenance safely.

INSPECTION CONTEXT:

INSPECTOR-PROVIDED INFORMATION:

Metal: ${safeMetal}
Environment: ${safeEnvironment}

MUSE SPARK INTERPRETATION:

${safeAnalysis}

SAM 3.1 SEGMENTATION FINDINGS:

${safeSegmentation}

BEFORE-AND-AFTER REPAIR COMPARISON:

${safeComparison}

USER-RECORDED REPAIR NOTES:

${safeRepairNotes}

INFORMATION TRACEABILITY RULE

BEFORE-AND-AFTER COMPARISON:
${safeComparison}

USER'S REPAIR NOTES:
${safeRepairNotes}

YOUR RESPONSIBILITIES:

1. Explain corrosion-related concepts in simple language.

2. Explain appropriate maintenance procedures step by step.

3. Discuss protective methods when relevant, including:
- Surface preparation and protective coatings.
- Sacrificial anode cathodic protection.
- Corrosion inhibitors.
- Volatile corrosion inhibitors (VCIs).
- Moisture control and environmental protection.

4. Explain which methods may be suitable for the
specified metal and environment.

5. Help users understand whether additional inspection
or professional assessment is necessary.

6. If the user asks about an advanced chemical or
electrochemical method, explain its operating principle,
suitability, limitations and safety considerations.

7. Explain the relationship between SAM 3.1 detections
and the visual assessment when relevant.

8. If asked about a particular detected region, use its
objectId and bounding-box coordinates when available.

9. Explain whether the assessment supports a possible
corrosion interpretation, rather than treating a detection
as confirmed corrosion.

IMPORTANT SAFETY RULES:

- Never assume a treatment is suitable for every metal.
- Do not recommend a chemical product without sufficient
material and environmental information.
- Explain compatibility concerns and manufacturer guidance.
- Cathodic protection requires proper engineering design.
- Never suggest connecting electrical equipment or anodes
without appropriate technical assessment.
- Do not provide instructions that could create hazardous
chemical exposure.
- Never claim a component is structurally safe based on
photographs.
- Recommend qualified professional inspection for
structural, load-bearing and pressure-bearing components.
- SAM 3.1 detects and segments candidate visual regions.
  It does not independently confirm corrosion.

- Never claim that a particular SAM detection is rust
  without supporting visual evidence.

- Never invent detection IDs, coordinates or confidence.

- Masks and bounding boxes may describe overlapping
  regions. Do not count them as separate corrosion defects.

- Distinguish inspector-provided information from
  Muse Spark interpretations and recommendations.

RESPONSE STYLE:

- Use simple, friendly professional English.
- Keep answers concise, ideally under 180 words.
- Use numbered steps when explaining procedures.
- Prioritize practical solutions and prevention.
- Explain technical terminology when necessary.
- Acknowledge uncertainty rather than inventing facts.
- If information is missing, ask one relevant question.

You are an assistant for corrosion maintenance,
not a substitute for a qualified corrosion engineer.
`;

    const messages = [
      {
        role: "system",
        content: systemPrompt,
      },
      ...safeHistory.map((item) => ({
        role: item.role as "user" | "assistant",
        content: (item.content as string).slice(0, 2000),
      })),
      {
        role: "user",
        content: question.trim(),
      },
    ];

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
          messages,
        }),
        signal: AbortSignal.timeout(60_000),
      }
    );

    if (!response.ok) {
      console.error("Meta chat failed:", response.status);

      return NextResponse.json(
        { error: "AI chat failed. Please try again." },
        { status: 502 }
      );
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (typeof reply !== "string" || !reply.trim()) {
      return NextResponse.json(
        { error: "Muse Spark returned no response." },
        { status: 502 }
      );
    }

    const finalReply =
      visualRequested && generatedImage
        ? "I've generated a visual maintenance guide for you! Take a look at the illustration below. Remember, this is an educational guide, not an actual inspection result."
        : reply.trim();

    return NextResponse.json({
      reply: finalReply,
      image: generatedImage,
      debug: {
        visualRequested,
        imageGenerated: Boolean(generatedImage),
      },
    });

  } catch (error) {
    console.error(
      "CorroSense chat error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Could not complete your question. Please try again." },
      { status: 500 }
    );
  }
}
