
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.MODEL_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Meta API key is not configured." },
        { status: 500 }
      );
    }

    const {
      analysis,
      metal,
      environment,
      recommendations,
    } = await request.json();

    if (!analysis || !metal || !environment) {
      return NextResponse.json(
        { error: "Missing inspection information." },
        { status: 400 }
      );
    }

    const prompt = `
Create a professional industrial maintenance
educational infographic for a corrosion inspection application.

Metal: ${metal}
Environment: ${environment}

AI corrosion assessment:
${String(analysis).slice(0, 4000)}

Maintenance recommendations:
${String(recommendations || "").slice(0, 2000)}

Show a clear, technically plausible sequence of
general corrosion maintenance stages.

Use:
- Professional engineering infographic style
- Clear visual hierarchy
- Teal, navy and neutral colours
- Clean industrial illustrations
- Minimal text
- No fabricated inspection measurements

This is an educational illustration, not an actual
repair record or certification.
Do not claim structural integrity or guaranteed repair.
`;

    const response = await fetch(
      "https://api.meta.ai/v1/images/generations",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "muse-image-1.0",
          prompt,
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

    const data = await response.json();

    if (!response.ok) {
      console.error("Muse Image API error:", data);

      return NextResponse.json(
        { error: "Muse Image generation failed." },
        { status: response.status }
      );
    }

    const image = data.data?.[0]?.b64_json;

    if (!image) {
      throw new Error("No generated image returned.");
    }

    return NextResponse.json({
      image: `data:image/webp;base64,${image}`,
    });

  } catch (error) {
    console.error("Maintenance visual error:", error);

    return NextResponse.json(
      { error: "Unable to generate maintenance visual." },
      { status: 500 }
    );
  }
}
