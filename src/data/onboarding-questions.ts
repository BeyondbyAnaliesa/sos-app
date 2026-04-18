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
    minChars: 40,
  },
  {
    key: 'practices_tried',
    domain: 'Your Journey So Far',
    text: 'What have you already tried for personal growth or self-understanding? Therapy, journaling, astrology, meditation — anything. What worked?',
    minChars: 30,
  },
  {
    key: 'relationships',
    domain: 'Relationships',
    text: 'How are your most important relationships right now? What feels good, and what feels hard?',
    minChars: 30,
  },
  {
    key: 'career',
    domain: 'Work & Purpose',
    text: 'What does your work or sense of purpose look like right now?',
    minChars: 30,
  },
  {
    key: 'emotions',
    domain: 'Emotional',
    text: 'What emotions have been most present for you lately — the real ones, not the polite ones?',
    minChars: 30,
  },
  {
    key: 'patterns',
    domain: 'Patterns',
    text: 'Is there a pattern in your life that keeps repeating? In relationships, work, or how you treat yourself?',
    minChars: 20,
  },
  {
    key: 'spirituality',
    domain: 'Spirituality',
    text: 'What is your relationship with astrology or spirituality? Believer, skeptic, curious?',
    minChars: 15,
  },
  {
    key: 'focus',
    domain: 'Focus',
    text: 'If SOS could help you with one thing in the next 30 days, what would it be?',
    minChars: 15,
  },
];
