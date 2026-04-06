import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, apikey');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get API key from environment variable or request header
    const apiKey = process.env.OCR_API_KEY || req.headers['apikey'] as string;
    
    if (!apiKey) {
      return res.status(400).json({ error: 'OCR API key not configured. Set OCR_API_KEY in Vercel environment variables.' });
    }

    // Parse the incoming body - Vercel may parse it as JSON or leave as string
    let bodyParams: URLSearchParams;
    if (typeof req.body === 'string') {
      bodyParams = new URLSearchParams(req.body);
    } else if (req.body && typeof req.body === 'object') {
      // If it's already parsed as an object, convert to URLSearchParams
      bodyParams = new URLSearchParams();
      for (const [key, value] of Object.entries(req.body)) {
        bodyParams.append(key, String(value));
      }
    } else {
      return res.status(400).json({ error: 'Invalid request body' });
    }

    // Forward the request to OCR.space
    const response = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: {
        'apikey': apiKey,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: bodyParams.toString(),
    });

    const result = await response.json();
    return res.status(200).json(result);
  } catch (error: any) {
    console.error('OCR API error:', error);
    return res.status(500).json({ error: error.message || 'OCR processing failed' });
  }
}
