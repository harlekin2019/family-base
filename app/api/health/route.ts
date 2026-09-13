export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ status: 'ok', service: 'family-base' }, { headers: { 'cache-control': 'no-store' } });
}
