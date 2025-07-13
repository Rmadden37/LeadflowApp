export async function GET() {
  return Response.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'LeadFlow App',
    deployment: 'Firebase App Hosting'
  });
}
