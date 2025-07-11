import { NextResponse } from 'next/server';

// For static export, we need to move API calls to client side
// This is a fallback that returns empty results for static generation
export const dynamic = 'force-static';
export const revalidate = false;

export async function GET() {
  // For static export, this endpoint will serve static data
  // Real API calls will happen client-side
  return NextResponse.json({ 
    predictions: [],
    status: "STATIC_EXPORT"
  });
}
