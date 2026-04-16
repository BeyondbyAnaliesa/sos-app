export interface OnboardingQuestion {
  key: string;
  domain: string;
  text: string;
  minChars: number;
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    key: 'intent',
    domain: 'Goals',
    text: 'What brought you here today? What are you hoping SOS can help you understand or work through?',
    minChars: 100,
  },
  {
    key: 'practices_tried',
    domain: 'Your Journey So Far',
    text: 'What have you already tried in your personal or spiritual development? Journaling, meditation, therapy, breathwork, astrology, plant medicine, movement practices — whatever applies. What stuck, what didn\'t, and where are you now?',
    minChars: 120,
  },
  {
    key: 'relationships',
    domain: 'Relationships',
    text: 'Describe your relationship life right now — not just romantic, but the connections that matter most to you. What feels alive, and what feels stuck?',
    minChars: 150,
  },
  {
    key: 'career',
    domain: 'Work & Purpose',
    text: 'What does your work life or sense of purpose look like right now? Where do you feel aligned, and where do you feel friction?',
    minChars: 150,
  },
  {
    key: 'emotions',
    domain: 'Emotional',
    text: 'What emotions have been most present for you lately? Not what you think you should feel — what you actually feel when no one is watching.',
    minChars: 100,
  },
  {
    key: 'patterns',
    domain: 'Patterns',
    text: 'Is there a pattern in your life that keeps repeating — in relationships, work, or how you relate to yourself? Describe it as honestly as you can.',
    minChars: 150,
  },
  {
    key: 'spirituality',
    domain: 'Spirituality',
    text: 'What is your relationship with spirituality or astrology? Are you a believer, skeptic, curious? What have you tried before, and what resonated?',
    minChars: 100,
  },
  {
    key: 'focus',
    domain: 'Focus',
    text: 'If SOS could help you with one thing over the next 30 days — one shift, one insight, one breakthrough — what would it be?',
    minChars: 80,
  },
];
