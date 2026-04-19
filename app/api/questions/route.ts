// ─────────────────────────────────────────────
// API: GET/POST Questions
// ─────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';
import { QUESTIONS, QUESTIONS_B } from '@/data/questions';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const set = searchParams.get('set'); // 'a', 'b', 'trial', or null for all

  if (set === 'a') {
    return NextResponse.json({ questions: QUESTIONS });
  } else if (set === 'b') {
    return NextResponse.json({ questions: QUESTIONS_B });
  } else if (set === 'trial') {
    // Return trial questions (3 TWK + 4 TIU + 3 TKP)
    const trialQuestions = [
      ...QUESTIONS.filter((q) => q.cat === 'TWK').slice(0, 3),
      ...QUESTIONS.filter((q) => q.cat === 'TIU').slice(0, 4),
      ...QUESTIONS.filter((q) => q.cat === 'TKP').slice(0, 3),
    ];
    return NextResponse.json({ questions: trialQuestions });
  }

  // Return all questions
  return NextResponse.json({ questions: [...QUESTIONS, ...QUESTIONS_B] });
}

export async function POST(request: NextRequest) {
  // In production, this would save to database
  // For now, just echo back the question
  const body = await request.json();
  return NextResponse.json({ success: true, question: body });
}
