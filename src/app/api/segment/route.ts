
import { NextResponse } from "next/server";
import OpenAI from "openai";
import {
  parseImageStream,
  recordsOfKind,
  decodeMaskToSVGPath,
} from "@meta-sam/parser";

export async function POST(request: Request) {
  // Keep live model calls disabled unless explicitly enabled.
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
    const body = await request.json();
    const { image } = body;

    if (
      typeof image !== "string" ||
      !/^data:image\/(jpeg|png|webp);base64,/i.test(image)
    ) {
      return NextResponse.json(
        { error: "Please provide a valid JPEG, PNG, or WEBP image." },
        { status: 400 }
      );
    }

    if (image.length > 14_000_000) {
      return NextResponse.json(
        { error: "The image is too large to segment." },
        { status: 413 }
      );
    }

    const client = new OpenAI({
      baseURL: "https://api.meta.ai/v1",
      apiKey,
    });

    const stream = await client.responses.create({
      model: "sam-3.1",
      input: [
        {
          type: "message",
          role: "user",
          content: [
            {
              type: "input_text",
              text: "corrosion or rust on metal",
            },
            {
              type: "input_image",
              image_url: image,
              detail:"auto",
            },
          ],
        },
      ],
      stream: true,
      metadata: { mask_encoding: "one_bit" },
    });

    const parsed = parseImageStream(stream);
    const result = await parsed.finalResult;

    if (result.outcome.status !== "completed") {
      return NextResponse.json(
        { error: "Segmentation did not complete." },
        { status: 502 }
      );
    }

    console.log("SAM SEGMENTATION DEBUG:",
      JSON.stringify( {
        recordCount: result.records.length,
        maskCount: recordsOfKind(result.records, "mask").length,
        boxCount: recordsOfKind(result.records, "box").length,
        records: result.records.map((record) => ({
            kind: record.kind,
            objectId: "objectId" in record ? record.objectId : undefined,
            bounds: record.kind === "mask" 
              ? record.bounds 
              : undefined,
            box:
                record.kind === "box"
                    ? {
                        left: record.left,
                        top: record.top,
                        right: record.right,
                        bottom: record.bottom,
                    }
                : undefined,
            confidence: 
              "confidence" in record 
                ? record.confidence 
                : undefined,
        })),
      },
      null,
      2
    )
  );
    const masks = recordsOfKind(result.records, "mask").map(
        (record) => ({
            objectId: record.objectId,
            width: record.mask.width,
            height: record.mask.height,
            left: record.bounds.left,
            top: record.bounds.top,
            right: record.bounds.right,
            bottom: record.bounds.bottom,
            svgPath: decodeMaskToSVGPath(record.mask),
        })
    );


    const boxes = recordsOfKind(result.records, "box").map(
      (record) => ({
        objectId: record.objectId,
        left: record.left,
        top: record.top,
        right: record.right,
        bottom: record.bottom,

        ...("confidence" in record &&
        typeof record.confidence === "number"
          ? { confidence: record.confidence }
          : {}),
      })
    );

    return NextResponse.json({ masks, boxes });
  } catch (error) {
    console.error(
      "SAM segmentation error:",
      error instanceof Error ? error.message : "Unknown error"
    );

    return NextResponse.json(
      { error: "Could not segment the image." },
      { status: 502 }
    );
  }
}
