import { NextResponse } from "next/server";
import { getOptionalFeaturesStatus, hasAnyEnabledFeature } from "@/lib/features";

export async function GET() {
  const features = getOptionalFeaturesStatus();
  return NextResponse.json({
    configured: hasAnyEnabledFeature(features),
    features,
  });
}
