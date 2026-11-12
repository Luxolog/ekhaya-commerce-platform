import { NextRequest, NextResponse } from 'next/server';

const features: Record<string, string> = {
  storefront: 'Open your online store',
  product_selling: 'Sell your products',
  vendor_dashboard: 'Vendor dashboard',
  fulfilment: 'Orders & fulfilment',
  suppliers: 'Find suppliers',
  payments: 'Payments & invoicing',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const featureKey = typeof body.featureKey === 'string' ? body.featureKey : '';
    const consent = body.consent === true;
    const honeypot = typeof body.website === 'string' ? body.website : '';

    if (honeypot) return NextResponse.json({ ok: true });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (!features[featureKey]) return NextResponse.json({ error: 'Please select a valid feature.' }, { status: 400 });
    if (!consent) return NextResponse.json({ error: 'Please confirm that we may email you about this feature.' }, { status: 400 });

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'The early-access list is temporarily unavailable. Please try again later.' }, { status: 503 });
    }

    const response = await fetch(`${supabaseUrl}/rest/v1/marketplace_early_access_waitlist`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        email,
        feature_key: featureKey,
        feature_name: features[featureKey],
        source: 'homepage',
        consented_at: new Date().toISOString(),
      }),
      cache: 'no-store',
    });

    if (response.status === 409) {
      return NextResponse.json({ ok: true, message: 'You are already on the early-access list for this feature.' });
    }
    if (!response.ok) {
      console.error('Waitlist insert failed:', response.status, await response.text());
      return NextResponse.json({ error: 'We could not save your details right now. Please try again.' }, { status: 503 });
    }
    return NextResponse.json({ ok: true, message: 'You are on the list! We will email you when this feature is ready.' });
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 400 });
  }
}
