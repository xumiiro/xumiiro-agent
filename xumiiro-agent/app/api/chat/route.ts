// FILE: app/api/chat/route.ts
// REPLACE your existing route.ts with this entire file
// NEW: Auto-emails conversation to contact@xumiiro.com when qualified lead detected

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Redis } from '@upstash/redis';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '',
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '',
});

const KNOWLEDGE_KEY = 'xumiiro-agent-knowledge';

const SYSTEM_PROMPT = `You are the digital concierge for Xumiiro Gallery, representing artist 0010×0010 exclusively.

You are an intelligent AI agent — not a chatbot. You think, qualify, and route.
Keep responses to 1–3 sentences when possible. No bullet points. No headers. Sound human, not like a form.
Respond in whatever language the visitor uses.
Always guide qualified visitors to xumiiro.com/inquiry or contact@xumiiro.com.
`;

// ── LEAD DETECTION ──────────────────────────────────────────────
// Detects if the conversation contains a qualified lead that should
// be emailed to contact@xumiiro.com

const LEAD_TRIGGERS = [
  // Budget signals
  /\b\d{2,3}k\b/i,
  /\$\d/,
  /budget/i,
  /price range/i,
  /invest/i,
  /acquire|acquisition/i,
  /purchase/i,
  // Institutional signals
  /museum/i,
  /institution/i,
  /curator|curatorial/i,
  /gallery director/i,
  /exhibition/i,
  /permanent install/i,
  // Brand signals
  /brand collab/i,
  /partnership/i,
  /licensing/i,
  /commission/i,
  /corporate/i,
  /hotel/i,
  /residence/i,
  // Serious intent
  /private viewing/i,
  /private experience/i,
  /remote immersion/i,
  /visit.*gallery/i,
  /want to (buy|collect|see)/i,
  /interested in (buying|collecting|acquiring)/i,
  /schedule|appointment|book/i,
  // Contact sharing
  /my email/i,
  /contact me/i,
  /reach me/i,
  /here'?s my/i,
  /@.*\.(com|org|net|io)/i,
];

function detectLeadTrigger(messages: any[]): string | null {
  // Only check user messages
  const userMessages = messages.filter((m: any) => m.role === 'user');
  
  // Need at least 2 user messages (not just "hello")
  if (userMessages.length < 2) return null;

  const allUserText = userMessages.map((m: any) => m.content).join(' ');
  
  const matches: string[] = [];

  // Check for budget signals
  if (/\b\d{2,3}k\b|\$\d|budget|price range/i.test(allUserText)) {
    matches.push('Budget discussed');
  }
  // Check for institutional
  if (/museum|institution|curator|exhibition|gallery director/i.test(allUserText)) {
    matches.push('Institutional inquiry');
  }
  // Check for brand/corporate
  if (/brand|partnership|licensing|commission|corporate|hotel/i.test(allUserText)) {
    matches.push('Brand/Corporate inquiry');
  }
  // Check for serious collector intent
  if (/acqui|purchase|buy|collect|private viewing|private experience|remote immersion/i.test(allUserText)) {
    matches.push('Collector interest');
  }
  // Check for contact info shared
  if (/@.*\.(com|org|net|io)|my email|contact me|reach me/i.test(allUserText)) {
    matches.push('Contact info shared');
  }
  // Check for visit request
  if (/visit|schedule|appointment|book|viewing/i.test(allUserText)) {
    matches.push('Visit requested');
  }

  if (matches.length >= 1) {
    return matches.join(' · ');
  }

  return null;
}

// Send email in background (non-blocking)
async function sendLeadEmail(messages: any[], trigger: string, origin: string) {
  try {
    const baseUrl = origin || process.env.VERCEL_URL 
      ? `https://${process.env.VERCEL_URL}` 
      : 'http://localhost:3000';
    
    await fetch(`${baseUrl}/api/send-lead`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages, trigger }),
    });
  } catch (err) {
    console.error('Lead email failed:', err);
  }
}

// ── MAIN HANDLER ────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Load dynamic knowledge from admin panel
    let dynamicKnowledge = '';
    try {
      const stored = await redis.get<string>(KNOWLEDGE_KEY);
      if (stored) {
        dynamicKnowledge = `\n\n${stored}`;
      }
    } catch (err) {
      console.error('Redis read error:', err);
    }

    const fullPrompt = SYSTEM_PROMPT + dynamicKnowledge;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: fullPrompt },
        ...messages.slice(-10),
      ],
      temperature: 0.7,
      max_tokens: 300,
    });

    const reply = response.choices[0]?.message?.content || 'Please try again.';

    // ── CHECK FOR QUALIFIED LEAD ──
    // Include the AI reply in the check
    const fullConversation = [
      ...messages,
      { role: 'assistant', content: reply },
    ];

    const trigger = detectLeadTrigger(fullConversation);

    if (trigger) {
      // Get origin for internal API call
      const origin = req.headers.get('origin') || req.nextUrl.origin;
      
      // Send email in background — don't slow down the chat response
      sendLeadEmail(fullConversation, trigger, origin).catch(() => {});
    }

    return NextResponse.json({ reply });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'An error occurred.' }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
