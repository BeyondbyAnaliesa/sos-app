export interface OnboardingQuestion {
  key: string;
  domain: string;
  text: string;
  minChars: number;
}

export const ONBOARDING_QUESTIONS: OnboardingQuestion[] = [
  {
    key: 'intent',
    domain: 'Why You Are Here',
    text: 'What made you open SOS today? Tell us what you want help understanding in your life right now, and what would make this feel useful instead of generic.',
    minChars: 140,
  },
  {
    key: 'practices_tried',
    domain: 'What You Have Tried',
    text: 'What have you already tried for self-understanding or growth? Therapy, journaling, astrology, meditation, coaching, books, anything. What actually helped, and what did not?',
    minChars: 140,
  },
  {
    key: 'relationships',
    domain: 'Relationships',
    text: 'What is happening in your closest relationships right now? Include what feels good, what feels strained, what you keep avoiding, and what you wish people understood about you.',
    minChars: 160,
  },
  {
    key: 'career',
    domain: 'Work & Direction',
    text: 'What is happening with your work, money, purpose, or ambition right now? Be specific about decisions, pressure points, frustration, desire, or the thing you are trying to build.',
    minChars: 160,
  },
  {
    key: 'emotions',
    domain: 'Your Actual State',
    text: 'What emotions have been most present lately? Say the real ones, not the polished version. What are you tired of carrying, and what keeps pulling your attention?',
    minChars: 140,
  },
  {
    key: 'patterns',
    domain: 'Repeating Patterns',
    text: 'What pattern keeps repeating in your life? This can be in love, work, family, money, confidence, responsibility, avoidance, or how you treat yourself when things get hard.',
    minChars: 160,
  },
  {
    key: 'spirituality',
    domain: 'How You Read Signals',
    text: 'What is your relationship with astrology, intuition, timing, or spiritual tools? What do you trust, what makes you skeptical, and what would make SOS earn your attention?',
    minChars: 130,
  },
  {
    key: 'focus',
    domain: 'Next 30 Days',
    text: 'If SOS could help you with one thing over the next 30 days, what should it watch with you? Name the area, the decision, the tension, or the outcome you care about.',
    minChars: 130,
  },
];
