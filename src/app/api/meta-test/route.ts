
import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.MODEL_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "MODEL_API_KEY is missing from .env.local" },
      { status: 500 }
    );
  }

  try {
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
              content:
                "Reply with exactly this word: READY",
            },
          ],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Meta API error:", response.status);

      return NextResponse.json(
        {
          error: "Meta API request failed",
          status: response.status,
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.choices?.[0]?.message?.content ?? null,
      model: data.model,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not connect to Meta API" },
      { status: 502 }
    );
  }
}
