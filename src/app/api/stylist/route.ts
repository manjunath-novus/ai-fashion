
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/firebase/admin";
import { stylistRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_BODY_SIZE = 32 * 1024;
const MAX_ATTEMPTS = 3;

const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

function getErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return undefined;
}

async function generateWithRetry(
  model: ReturnType<GoogleGenerativeAI["getGenerativeModel"]>,
  prompt: string
) {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await model.generateContent(prompt);
    } catch (error) {
      const status = getErrorStatus(error);
      const retryableStatuses = [429, 500, 502, 503, 504];

      if (!status || !retryableStatuses.includes(status)) {
        throw error;
      }

      if (attempt === MAX_ATTEMPTS) {
        throw error;
      }

      const delay = 1000 * 2 ** (attempt - 1);
      console.warn(
        `Gemini temporarily unavailable (${status}). Retry ${attempt}/${MAX_ATTEMPTS - 1} in ${delay}ms.`
      );

      await sleep(delay);
    }
  }

  throw new Error("Gemini generation failed after retries.");
}

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Firebase authentication
    const authorization = request.headers.get("authorization");

    if (!authorization?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Authentication required." },
        { status: 401 }
      );
    }

    const idToken = authorization.slice(7).trim();

    if (!idToken) {
      return NextResponse.json(
        { error: "Invalid authentication token." },
        { status: 401 }
      );
    }

    let decodedToken;

    try {
      decodedToken = await adminAuth.verifyIdToken(idToken, true);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired authentication token." },
        { status: 401 }
      );
    }

    // 2. Rate limit each authenticated user
    const { success, limit, remaining, reset } =
      await stylistRateLimit.limit(decodedToken.uid);

    if (!success) {
      return NextResponse.json(
        {
          error: "Too many requests. Please try again later.",
          retryAfter: Math.max(
            1,
            Math.ceil((reset - Date.now()) / 1000)
          ),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": String(limit),
            "X-RateLimit-Remaining": String(remaining),
            "X-RateLimit-Reset": String(reset),
          },
        }
      );
    }

    // 3. Check request size
    const contentLengthHeader = request.headers.get("content-length");

    if (contentLengthHeader !== null) {
      const contentLength = Number(contentLengthHeader);

      if (
        !Number.isFinite(contentLength) ||
        contentLength < 0 ||
        contentLength > MAX_BODY_SIZE
      ) {
        return NextResponse.json(
          { error: "Request size is invalid or too large." },
          { status: 413 }
        );
      }
    }

    const rawBody = await request.text();

    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_SIZE) {
      return NextResponse.json(
        { error: "Request payload is too large." },
        { status: 413 }
      );
    }

    // 4. Parse and validate request
    let body;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const { message, conversationContext, wardrobeContext } = body;

    if (
      typeof message !== "string" ||
      !message.trim() ||
      message.length > 1000
    ) {
      return NextResponse.json(
        { error: "Message must contain 1–1000 characters." },
        { status: 400 }
      );
    }

    if (
      conversationContext !== undefined &&
      (typeof conversationContext !== "string" ||
        conversationContext.length > 12000)
    ) {
      return NextResponse.json(
        { error: "Invalid conversation context." },
        { status: 400 }
      );
    }

    if (
      wardrobeContext !== undefined &&
      (typeof wardrobeContext !== "string" ||
        wardrobeContext.length > 12000)
    ) {
      return NextResponse.json(
        { error: "Invalid wardrobe context." },
        { status: 400 }
      );
    }

    // 5. Check Gemini API configuration
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Gemini API key is not configured." },
        { status: 500 }
      );
    }

    // 6. Generate AI stylist response with automatic retries
    const genAI = new GoogleGenerativeAI(apiKey);

    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash-lite",
    });

    const prompt = `
You are a luxury AI fashion stylist.

User wardrobe:
${wardrobeContext || "No wardrobe information available."}

Previous conversation:
${conversationContext || "No previous conversation."}

Current request:
${message}

Give stylish, premium, personalized fashion advice.
`;

    const result = await generateWithRetry(model, prompt);
    const response = await result.response;

    return NextResponse.json({
      reply: response.text(),
    });
  } catch (error) {
    const status = getErrorStatus(error);

    console.error("Stylist API error:", error);

    if (status === 429 || [500, 502, 503, 504].includes(status ?? 0)) {
      return NextResponse.json(
        {
          error:
            "Our AI stylist is temporarily busy. Please try again in a moment.",
        },
        {
          status: 503,
          headers: {
            "Retry-After": "5",
          },
        }
      );
    }

    return NextResponse.json(
      { error: "Unable to generate a response. Please try again." },
      { status: 500 }
    );
  }
}
