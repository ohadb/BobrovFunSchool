import { NextRequest, NextResponse } from "next/server";
import { getImage } from "@/lib/imageStore";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;
  const image = await getImage(id);

  if (!image) {
    return new NextResponse("Not found", { status: 404 });
  }

  const buffer = Buffer.from(image.base64, "base64");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": image.mimeType,
      "Cache-Control": "public, max-age=604800, immutable",
    },
  });
}
