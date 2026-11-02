// Public HTTP endpoint for the enquiry form: POST /_functions/enquire.
// It exists because web modules cannot see the caller's IP address, which
// the rate limit needs. Everything else about the enquiry lives in
// backend/enquiries.js.

import { ok } from 'wix-http-functions';
import { handleEnquiry } from 'backend/enquiries';

const MAX_BODY_BYTES = 8000;

function json(body) {
  return ok({ headers: { 'Content-Type': 'application/json' }, body });
}

export async function post_enquire(request) {
  let body;
  try {
    const text = await request.body.text();
    if (!text || text.length > MAX_BODY_BYTES) return json({ ok: false, error: 'Please check the form and try again.' });
    body = JSON.parse(text);
  } catch (error) {
    return json({ ok: false, error: 'Please check the form and try again.' });
  }
  try {
    const ip = request.ip || (request.headers && request.headers['x-forwarded-for']) || 'unknown';
    return json(await handleEnquiry(body, String(ip).split(',')[0].trim()));
  } catch (error) {
    console.error('[portal] post_enquire', error && error.stack ? error.stack : error);
    return json({ ok: false, error: 'Something went wrong on my side. Try again in a moment.' });
  }
}
