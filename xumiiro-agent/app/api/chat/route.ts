// FILE: app/api/chat/route.ts
// REPLACE your existing route.ts with this entire file

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
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

// ── CHANGE THIS after you verify your domain in Resend ──
// For now: xumiiro@gmail.com (your Resend signup email)
// Later:  contact@xumiiro.com (after domain verification)
const EMAIL_TO = 'xumiiro@gmail.com';

const SYSTEM_PROMPT = `You are the digital concierge for Xumiiro Gallery, representing artist 0010×0010 exclusively.

You are an intelligent AI agent — not a chatbot. You think, qualify, and route.
Keep responses to 1–3 sentences when possible. No bullet points. No headers. Sound human, not like a form.
Respond in whatever language the visitor uses.

For serious buyers, collectors, and business partners — direct them to email contact@xumiiro.com directly.
Real clients don't fill forms. Tell them: "Email contact@xumiiro.com — our director will respond personally."
Only use xumiiro.com/inquiry for casual visitors who want exhibition updates.
`;

// ── LEAD EVALUATOR ──────────────────────────────────────────────

const EVALUATOR_PROMPT = `You evaluate conversations for Xumiiro Gallery, a high-end art gallery.

Analyze the conversation. Reply with EXACTLY one of:
QUALIFIED: [short reason]
NOT_QUALIFIED

QUALIFIED when visitor shows:
- Budget or price range mentioned
- Identifies as collector, curator, gallerist, brand rep, hotel, institution
- Wants to acquire, purchase, commission, or install
- Shares contact info (email, phone, company)
- Requests private viewing or remote immersion
- Mentions specific project, space, venue, timeline

NOT_QUALIFIED when:
- Just hello or general questions
- Students, researchers, fans
- No budget, no project, no intent
- Casual browsing`;

// ── SEND EMAIL VIA RESEND ───────────────────────────────────────

async function sendEmail(messages: any[], reason: string) {
  const now = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Bangkok',
    weekday: 'short', year: 'numeric', month: 'short',
    day: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const htmlBody = `
    <div style="font-family:-apple-system,Helvetica,sans-serif;max-width:640px;margin:0 auto;background:#0a0a0a;color:#e0e0e0;padding:32px;border-radius:4px;">
      <div style="border-bottom:1px solid #222;padding-bottom:16px;margin-bottom:24px;">
        <h2 style="color:#fff;font-size:13px;letter-spacing:3px;text-transform:uppercase;margin:0;font-weight:400;">XUMIIRO · QUALIFIED LEAD</h2>
        <p style="color:#666;font-size:12px;margin:8px 0 0 0;">${now} (Bangkok)</p>
        <p style="color:#fff;font-size:13px;margin:8px 0 0 0;letter-spacing:1px;">${reason.toUpperCase()}</p>
      </div>
      <div style="font-size:14px;line-height:1.7;">
        ${messages.map((m: any) => {
          const isUser = m.role === 'user';
          return `<div style="margin-bottom:16px;padding:12px 16px;background:${isUser ? '#111' : '#0a0a0a'};border-left:2px solid ${isUser ? '#fff' : '#333'};border-radius:2px;">
            <div style="font-size:10px;letter-spacing:2px;color:${isUser ? '#fff' : '#555'};margin-bottom:6px;text-transform:uppercase;">${isUser ? 'VISITOR' : 'XUMIIRO AI'}</div>
            <div style="color:${isUser ? '#e0e0e0' : '#888'};">${m.content.replace(/\n/g, '<br>')}</div>
          </div>`;
        }).join('')}
      </div>
      <div style="border-top:1px solid #222;padding-top:16px;margin-top:24px;">
        <p style="font-size:11px;color:#444;margin:0;">Xumiiro AI · ${messages.length} messages</p>
      </div>
    </div>`;

  const transcript = messages
    .map((m: any) => `${m.role === 'user' ? 'VISITOR' : 'XUMIIRO AI'}:\n${m.content}`)
    .join('\n\n---\n\n');

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: 'Xumiiro AI <onboarding@resend.dev>',
      to: EMAIL_TO,
      subject: `Xumiiro Lead · ${reason}`,
      html: htmlBody,
      text: `XUMIIRO QUALIFIED LEAD\n${now}\n${reason}\n\n${transcript}`,
    }),
  });

  const data = await res.json();
  console.log('Resend response:', JSON.stringify(data));
  return data;
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

    // ── STEP 1: Generate chat response ──
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

    // ── STEP 2: Evaluate + email (INLINE, before responding) ──
    const userMsgCount = messages.filter((m: any) => m.role === 'user').length;

    if (userMsgCount >= 1 && RESEND_API_KEY) {
      try {
        const convoText = messages
          .map((m: any) => `${m.role === 'user' ? 'VISITOR' : 'AGENT'}: ${m.content}`)
          .join('\n');

        const evaluation = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: EVALUATOR_PROMPT },
            { role: 'user', content: convoText },
          ],
          temperature: 0,
          max_tokens: 50,
        });

        const result = evaluation.choices[0]?.message?.content || 'NOT_QUALIFIED';
        console.log('Lead evaluation:', result);

        if (result.startsWith('QUALIFIED:')) {
          const reason = result.replace('QUALIFIED:', '').trim();
          const fullConvo = [...messages, { role: 'assistant', content: reply }];
          await sendEmail(fullConvo, reason);
        }
      } catch (evalErr) {
        console.error('Evaluation error:', evalErr);
      }
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
