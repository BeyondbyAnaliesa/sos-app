import { z } from 'zod';

export const signupSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

export const loginSchema = signupSchema;

export const onboardingSchema = z.object({
  birthDate: z.iso.date(),
  birthTime: z.string().regex(/^\d{2}:\d{2}$/).optional().nullable(),
  timeUnknown: z.boolean().default(false),
  locationText: z.string().trim().min(2),
});

export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;

export type PlanetPlacement = {
  key: string;
  label: string;
  longitude: number;
  sign: string;
  degree: number;
  minute: number;
  speed: number;
  retrograde: boolean;
  warning: string | null;
};

export type AnglePlacement = Omit<PlanetPlacement, 'key' | 'label' | 'speed' | 'retrograde' | 'warning'>;

export type NatalChart = {
  metadata: {
    jdUt: number;
    timeExact: boolean;
    coordinates: { latitude: number; longitude: number };
    warnings: { houses: string | null };
  };
  placements: PlanetPlacement[];
  angles: {
    ascendant: AnglePlacement;
    midheaven: AnglePlacement;
  };
  aspects: Array<{
    type: string;
    between: [string, string];
    angle: number;
    orb: number;
  }>;
};

export type AuthResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    onboardingComplete: boolean;
  };
};

export type MeResponse = {
  user: {
    id: string;
    email: string;
    onboardingComplete: boolean;
  };
  birthData: null | {
    birthDate: string;
    birthTime: string | null;
    timeUnknown: boolean;
    locationText: string;
    latitude: number;
    longitude: number;
    normalizedLocation: string;
    timezone: string | null;
  };
  natalChart: NatalChart | null;
};
