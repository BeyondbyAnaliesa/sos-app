import type { Transit } from '@/data/transits';
import type { NatalChart } from '@/data/natal-chart';

export type Domain = 'relationships' | 'career' | 'growth';
export type Intensity = 'high' | 'medium' | 'low';

export interface GuidanceResult {
  domain: Domain;
  title: string;
  message: string;
  intensity: Intensity;
}

// Which domains does each transiting planet govern?
const PLANET_DOMAINS: Record<string, Domain[]> = {
  Sun:     ['growth'],
  Moon:    ['growth', 'relationships'],
  Mercury: ['career'],
  Venus:   ['relationships'],
  Mars:    ['relationships', 'career'],
  Jupiter: ['growth'],
  Saturn:  ['career', 'growth'],
  Uranus:  ['career', 'growth'],
  Neptune: ['relationships', 'growth'],
  Pluto:   ['growth'],
};

const ASPECT_INTENSITY: Record<string, Intensity> = {
  conjunction: 'high',
  opposition:  'high',
  square:      'high',
  trine:       'medium',
  sextile:     'low',
};

const DOMAIN_TITLES: Record<Domain, string> = {
  relationships: 'Relationships',
  career:        'Work & Career',
  growth:        'Personal Growth',
};

// Guidance lookup indexed by [transitPlanet][aspect][domain].
// Swap this block for real engine output in production.
type GuidanceLookup = Partial<
  Record<string, Partial<Record<string, Partial<Record<Domain, string>>>>>
>;

const GUIDANCE: GuidanceLookup = {
  Sun: {
    conjunction: {
      growth: 'Your sense of self is amplified. What you choose to focus on today becomes a statement about who you are.',
    },
    opposition: {
      relationships: 'Someone close reflects back a truth about you. The discomfort is useful — sit with it.',
      growth: 'You are being asked to see yourself through another lens. It may not be comfortable, but it is accurate.',
    },
    trine: {
      growth: 'Vitality and clarity align. A good day to make decisions that require self-trust.',
    },
    square: {
      career: 'Your identity and your role may feel at odds. Name the gap instead of performing around it.',
      growth: 'Something about how you see yourself is being challenged. The tension is growth, not failure.',
    },
    sextile: {
      growth: 'A quiet confidence is available. Small steps taken from this place tend to hold.',
    },
  },
  Moon: {
    conjunction: {
      relationships: 'Emotional truth is close to the surface. What you feel right now is real and worth honoring.',
      growth: 'Your emotional body is running the show today. Let it. It knows something your mind is still catching up to.',
    },
    opposition: {
      relationships: 'An emotional pull between what you need and what someone else needs. Both are valid — do not sacrifice yours.',
    },
    trine: {
      relationships: 'Emotional ease flows into your closest connections. A good day to be present with someone.',
      growth: 'Your inner world feels settled. Use this stability to make a decision you have been sitting on.',
    },
    square: {
      relationships: 'Emotional reactivity is heightened. Pause before responding to anything that stings.',
      growth: 'A feeling you have been avoiding is pushing to be felt. Let it arrive without making it mean something catastrophic.',
    },
    sextile: {
      relationships: 'A subtle emotional opening makes honest conversation easier today.',
      growth: 'Intuition is gently available. Pay attention to what catches your attention — it is not random.',
    },
  },
  Venus: {
    conjunction: {
      relationships: 'Your magnetic pull is at a peak. Reach out to someone meaningful — what you initiate today lands with unusual depth.',
      career: 'Collaborative energy is strong. A well-timed, genuine proposal shifts dynamics in your favor.',
      growth: 'Honor what you truly value. Let pleasure be intentional today, not incidental.',
    },
    opposition: {
      relationships: 'What you desire and what is available may not match. Examine whether you are projecting an ideal onto someone real.',
      growth: 'A tension between comfort and growth. Comfort is not always the right answer.',
    },
    trine: {
      relationships: 'Ease and warmth flow naturally. A low-stakes conversation could quietly deepen a relationship.',
      career: 'Your social intelligence is your asset right now. Lean into it.',
      growth: 'A gentle day to reconnect with what brings you joy.',
    },
    square: {
      relationships: 'A disconnect between what you want and what others expect may surface. Clarity now prevents resentment later.',
      career: 'Avoid people-pleasing in professional settings. Stay grounded in your actual needs.',
      growth: 'Examine where you have been giving more than you receive.',
    },
    sextile: {
      relationships: 'A small gesture of affection or appreciation lands well today. Do not overthink it.',
      growth: 'Beauty and pleasure are not frivolous right now. Let yourself enjoy something fully.',
    },
  },
  Mercury: {
    conjunction: {
      relationships: 'Honesty comes easily. Say the thing you usually hold back.',
      career: 'A decisive, focused day for strategy and communication. Move ideas forward.',
      growth: 'Your inner voice is loud and clear. Pay attention to recurring thoughts — they are pointing at something real.',
    },
    opposition: {
      relationships: 'Someone sees the situation differently than you do. Hear them out before defending your position.',
      career: 'A negotiation or discussion requires more listening than talking. The other side has data you need.',
    },
    trine: {
      relationships: 'Your words carry clarity today. A conversation you have been postponing is worth having now.',
      career: 'Mental focus and articulation are sharp. Write, present, or negotiate — ideas land cleanly.',
      growth: 'Your mind is receptive. A deep conversation or focused reading will leave a lasting impression.',
    },
    square: {
      relationships: 'Miscommunication is possible. Slow down before reacting — re-read messages, clarify tone.',
      career: 'Mental static is high. Avoid major decisions; use today for research and drafting.',
      growth: 'Friction in how you are thinking about a problem may be showing you a blind spot.',
    },
    sextile: {
      career: 'A useful piece of information or connection arrives if you stay open to conversation.',
      growth: 'Your curiosity is pointed at something worth exploring. Follow the thread.',
    },
  },
  Mars: {
    conjunction: {
      relationships: 'Intensity is high. Passionate and direct — but potentially overwhelming. Stay grounded before responding.',
      career: 'You have unusual drive and stamina today. Channel it into your most important work.',
      growth: 'Your willpower is amplified. Use it consciously and intentionally.',
    },
    opposition: {
      relationships: 'Someone may push back hard. The question is whether you are fighting for something real or just fighting.',
      career: 'External resistance is real. Decide whether to push through or redirect your energy.',
    },
    trine: {
      relationships: 'Assertive, honest energy serves you well in negotiations and direct conversations.',
      career: 'Drive and momentum are yours to direct. A bold move lands well today.',
      growth: 'Physical movement and direct action are therapeutic right now. Act, do not ruminate.',
    },
    square: {
      relationships: 'Tension may surface in close relationships. Name the frustration before it becomes an argument.',
      career: 'Resistance and obstacles are real today. Push only where it truly matters — pick your battles carefully.',
      growth: 'Something is being tested. The discomfort is the signal, not the enemy.',
    },
    sextile: {
      career: 'A productive burst of energy is available. Use it on something concrete rather than spinning on planning.',
      growth: 'Initiative feels natural. A small bold action today sets something larger in motion.',
    },
  },
  Jupiter: {
    conjunction: {
      relationships: 'A significant person or social opportunity may appear. Be present.',
      career: 'Luck and effort compound right now. Take a meaningful risk in your work.',
      growth: 'A breakthrough in perspective is available. Look for it in the unexpected.',
    },
    opposition: {
      career: 'Overextension is the risk. Enthusiasm is high but so is the temptation to promise more than you can deliver.',
      growth: 'A belief you hold is being tested by reality. Let the truth refine your optimism rather than deflate it.',
    },
    trine: {
      relationships: 'Generosity and warmth flow outward. A generous gesture in a relationship will be felt and remembered.',
      career: 'Expansion is favored. Think bigger than usual about what is possible.',
      growth: 'A growth-oriented perspective comes naturally today. Let it guide your decisions.',
    },
    square: {
      career: 'Overcommitment or overconfidence is likely. Double-check the scope before saying yes.',
      growth: 'Growth requires discomfort right now. The easy path and the right path are not the same today.',
    },
    sextile: {
      relationships: 'A light expansiveness makes social connection feel easy and rewarding today.',
      career: 'A subtle opportunity in your field may open. Stay alert — it is quiet but real.',
      growth: 'Optimism is available to you. Lean into it for vision-setting or creative planning.',
    },
  },
  Saturn: {
    conjunction: {
      relationships: 'Serious conversations about commitment, limits, or shared roles are available and productive.',
      career: 'Accountability and structure are your allies. A plan made today will be durable.',
      growth: 'You are being asked to grow in some area of your life. Meet it directly.',
    },
    opposition: {
      relationships: 'A relationship structure is being tested. What felt stable may need renegotiation.',
      career: 'External pressure reveals whether your foundations are solid. Reinforce before expanding.',
    },
    trine: {
      relationships: 'Steady energy supports long-term commitments. A conversation about shared goals or structure goes well.',
      career: 'Disciplined effort pays off cleanly. Today rewards methodical work over improvisation.',
      growth: 'Commitments you make now will hold. Clarity around limits comes without conflict.',
    },
    square: {
      relationships: 'A relationship may be asking for more structure or honesty than you have given it. Address it.',
      career: 'Systemic friction or delays require patience. Identify the actual bottleneck instead of pushing harder.',
      growth: 'A pattern is resisting change. The resistance itself is information.',
    },
    sextile: {
      career: 'A practical step forward is available. It is not exciting but it is load-bearing.',
      growth: 'Discipline feels natural rather than forced. Use this window to build a habit or structure that matters.',
    },
  },
  Uranus: {
    conjunction: {
      career: 'An unexpected shift in your work or role may arrive. Stay flexible — rigidity is the only real risk.',
      growth: 'Something about how you have been living is ready to change. Do not fight the disruption.',
    },
    opposition: {
      relationships: 'Someone or something disrupts your equilibrium. The question is whether the disruption is overdue.',
      growth: 'A part of your identity that felt fixed is being questioned. Let the question in.',
    },
    trine: {
      career: 'Innovation and unconventional thinking are your advantage today. Trust the unusual idea.',
      growth: 'Freedom and authenticity align. A good day to break a pattern that no longer serves you.',
    },
    square: {
      career: 'Restlessness and impatience are signals, not problems. Something needs to change — name what.',
      growth: 'The urge to blow something up is real. Channel it into deliberate change rather than reactive destruction.',
    },
    sextile: {
      career: 'A fresh angle on an old problem appears. Stay open to approaches you would normally dismiss.',
      growth: 'A gentle nudge toward something new. You do not have to leap — just look.',
    },
  },
  Neptune: {
    conjunction: {
      relationships: 'Boundaries may dissolve. Beautiful for intimacy, dangerous for clarity. Know which you need more of right now.',
      growth: 'Spiritual sensitivity is heightened. Creative and contemplative work is deeply supported.',
    },
    opposition: {
      relationships: 'Confusion or idealization in a relationship needs a reality check. What is real versus what you wish were true?',
      growth: 'A fog around your direction may be present. Do not force clarity — let it come.',
    },
    trine: {
      relationships: 'Compassion and understanding flow easily. A good day to listen deeply to someone you love.',
      growth: 'Imagination and intuition are strong. Trust the vision that comes to you today, even if it does not yet make logical sense.',
    },
    square: {
      relationships: 'Illusion or avoidance in a relationship is up for review. Gentle truth is still truth.',
      growth: 'Something you believed may turn out to be wishful thinking. Better to know now.',
    },
    sextile: {
      relationships: 'Empathy is quietly available. A small act of understanding strengthens a bond.',
      growth: 'Creative or spiritual insight arrives softly. Do not force it into a plan yet — just receive it.',
    },
  },
  Pluto: {
    conjunction: {
      growth: 'A deep transformation is underway. What falls away now was already finished — let it go.',
    },
    opposition: {
      relationships: 'A power dynamic in a relationship is surfacing. Name it honestly rather than maneuvering around it.',
      growth: 'Something you have been avoiding confronting is demanding your attention. Face it.',
    },
    trine: {
      growth: 'Depth and insight come easily. A good day to do the inner work that usually feels too heavy.',
      career: 'Strategic power is available. You can see beneath the surface of a situation — use that clarity.',
    },
    square: {
      relationships: 'Control or intensity in a relationship needs examination. Whose power is this really about?',
      growth: 'A deep pattern is being exposed. The discomfort is proportional to how long it has been hidden.',
    },
    sextile: {
      growth: 'A subtle but meaningful insight about yourself is available. Pay attention to what moves you emotionally today.',
      career: 'An opportunity to gain influence or deepen your impact arrives quietly. Recognize it.',
    },
  },
};

export function interpretTransits(
  transits: Transit[],
  _natalChart: NatalChart,
): GuidanceResult[] {
  const domains: Domain[] = ['relationships', 'career', 'growth'];

  return domains.map((domain) => {
    // Find relevant transits for this domain, tightest orb first
    const candidates = transits
      .filter((t) => PLANET_DOMAINS[t.transitPlanet]?.includes(domain))
      .sort((a, b) => a.orb - b.orb);

    // Pick the first transit that has a lookup entry for this domain
    const match = candidates.find(
      (t) => GUIDANCE[t.transitPlanet]?.[t.aspect]?.[domain] != null,
    );

    if (!match) {
      return {
        domain,
        title: DOMAIN_TITLES[domain],
        message:
          'The cosmic pattern today is quiet in this area. A good moment to observe rather than act.',
        intensity: 'low',
      };
    }

    return {
      domain,
      title:     DOMAIN_TITLES[domain],
      message:   GUIDANCE[match.transitPlanet]![match.aspect]![domain]!,
      intensity: ASPECT_INTENSITY[match.aspect] ?? 'low',
    };
  });
}
