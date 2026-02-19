// FILE: app/api/send-lead/route.ts
// Sends qualified lead conversations to contact@xumiiro.com via Resend

import { NextRequest, NextResponse } from 'next/server';

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { messages, trigger } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'No messages' }, { status: 400 });
    }

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not set');
      return NextResponse.json({ error: 'Email not configured' }, { status: 500 });
    }

    const now = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Bangkok',
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const triggerLabel = trigger || 'Qualified lead';

    // Plain text version
    const transcript = messages
      .map((m: any) => `${m.role === 'user' ? 'VISITOR' : 'XUMIIRO AI'}:\n${m.content}`)
      .join('\n\n---\n\n');

    // HTML version - dark Xumiiro style
    const htmlBody = `
      <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 640px; margin: 0 auto; background: #0a0a0a; color: #e0e0e0; padding: 32px; border-radius: 4px;">
        <div style="border-bottom: 1px solid #222; padding-bottom: 16px; margin-bottom: 24px;">
          <h2 style="color: #fff; font-size: 13px; letter-spacing: 3px; text-transform: uppercase; margin: 0; font-weight: 400;">XUMIIRO · LEAD ALERT</h2>
          <p style="color: #666; font-size: 12px; margin: 8px 0 0 0;">${now} (Bangkok)</p>
          <p style="color: #999; font-size: 12px; margin: 4px 0 0 0; letter-spacing: 1px;">TRIGGER: ${triggerLabel.toUpperCase()}</p>
        </div>
        <div style="font-size: 14px; line-height: 1.7;">
          ${messages.map((m: any) => {
            const isUser = m.role === 'user';
            return `<div style="margin-bottom: 16px; padding: 12px 16px; background: ${isUser ? '#111' : '#0a0a0a'}; border-left: 2px solid ${isUser ? '#fff' : '#333'}; border-radius: 2px;">
              <div style="font-size: 10px; letter-spacing: 2px; color: ${isUser ? '#fff' : '#555'}; margin-bottom: 6px; text-transform: uppercase;">${isUser ? 'VISITOR' : 'XUMIIRO AI'}</div>
              <div style="color: ${isUser ? '#e0e0e0' : '#888'};">${m.content.replace(/\n/g, '<br>')}</div>
            </div>`;
          }).join('')}
        </div>
        <div style="border-top: 1px solid #222; padding-top: 16px; margin-top: 24px;">
          <p style="font-size: 11px; color: #444; margin: 0;">Xumiiro AI Agent · ${messages.length} messages · ${triggerLabel}</p>
        </div>
      </div>
    `;

    // Send via Resend API (no npm package needed)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Xumiiro AI <onboarding@resend.dev>',
        to: 'contact@xumiiro.com',
        subject: `Xumiiro Lead · ${triggerLabel}`,
        html: htmlBody,
        text: `XUMIIRO LEAD ALERT\n${now} (Bangkok)\nTrigger: ${triggerLabel}\n\n${transcript}`,
      }),
    });

    const data = await res.json();
    return NextResponse.json({ sent: true, id: data.id });

  } catch (error: any) {
    console.error('Email send error:', error);
    return NextResponse.json({ error: 'Failed to send' }, { status: 500 });
  }
}
