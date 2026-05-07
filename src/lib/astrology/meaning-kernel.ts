import type { MajorTransitPhase } from '@/lib/astrology/major-transits';
import type {
  AstrologyCollectiveSkyEvent,
  JudgmentDemandType,
  JudgmentPhase,
} from '@/lib/astrology/judgment-types';

export interface AstrologyMeaningReference {
  key: string;
  label: string;
  keywords: string[];
  functions: string[];
  pressureModes: string[];
  opportunityModes: string[];
  defaultDemands: JudgmentDemandType[];
  riskFlags: string[];
  constructiveActions: string[];
  limitations: string[];
}

export interface AstrologyMeaningCurrentSkyFactor {
  eventId: string;
  kind: AstrologyCollectiveSkyEvent['kind'];
  score: number;
  keywords: string[];
  pressureModes: string[];
  opportunityModes: string[];
  limitations: string[];
}

export interface AstrologyMeaningFactors {
  transitBody: AstrologyMeaningReference | null;
  aspect: AstrologyMeaningReference | null;
  natalTarget: AstrologyMeaningReference | null;
  house: AstrologyMeaningReference | null;
  demand: AstrologyMeaningReference | null;
  phase: AstrologyMeaningReference | null;
  currentSky: AstrologyMeaningCurrentSkyFactor | null;
  combinedKeywords: string[];
  combinedFunctions: string[];
  pressureModes: string[];
  opportunityModes: string[];
  defaultDemands: JudgmentDemandType[];
  riskFlags: string[];
  constructiveActions: string[];
  limitations: string[];
}

const TIER_1_BODY_MEANINGS: Record<string, AstrologyMeaningReference> = {
  Sun: {
    key: 'sun',
    label: 'Sun',
    keywords: ['identity', 'visibility', 'leadership'],
    functions: ['core direction', 'vitality allocation', 'public signal'],
    pressureModes: ['ego strain', 'visibility pressure', 'role conflict'],
    opportunityModes: ['clear direction', 'strong presence', 'purpose alignment'],
    defaultDemands: ['clarification'],
    riskFlags: ['overexposure', 'rigid self-definition'],
    constructiveActions: ['state priorities', 'protect energy', 'accept accountability'],
    limitations: ['Body meanings are baseline only and do not include sign dignity weighting in this layer.'],
  },
  Moon: {
    key: 'moon',
    label: 'Moon',
    keywords: ['emotional regulation', 'habits', 'timing'],
    functions: ['felt response', 'body rhythm', 'short-cycle adaptation'],
    pressureModes: ['reactivity', 'mood volatility', 'routine disruption'],
    opportunityModes: ['better timing', 'responsive care', 'habit repair'],
    defaultDemands: ['pressure'],
    riskFlags: ['overreaction', 'energy drain'],
    constructiveActions: ['slow the reaction', 'adjust routine', 'name the feeling accurately'],
    limitations: ['Moon meanings are fast-cycle and should be weighted with timing context.'],
  },
  Mercury: {
    key: 'mercury',
    label: 'Mercury',
    keywords: ['thinking', 'communication', 'coordination'],
    functions: ['message flow', 'analysis', 'decisions'],
    pressureModes: ['confusion', 'misstatement', 'over-processing'],
    opportunityModes: ['better framing', 'useful data', 'clean decisions'],
    defaultDemands: ['clarification'],
    riskFlags: ['mixed signals', 'hasty conclusions'],
    constructiveActions: ['verify facts', 'write it down', 'simplify the message'],
    limitations: ['No retrograde-specific Mercury rules are added here beyond phase blending.'],
  },
  Venus: {
    key: 'venus',
    label: 'Venus',
    keywords: ['relationships', 'values', 'resources'],
    functions: ['attraction', 'agreement', 'preference'],
    pressureModes: ['avoidance', 'people-pleasing', 'resource leakage'],
    opportunityModes: ['better agreement', 'value alignment', 'resource support'],
    defaultDemands: ['support'],
    riskFlags: ['soft boundaries', 'comfort spending'],
    constructiveActions: ['name standards', 'rebalance exchange', 'protect what matters'],
    limitations: ['Venus here covers relationship and value dynamics only.'],
  },
  Mars: {
    key: 'mars',
    label: 'Mars',
    keywords: ['drive', 'conflict', 'activation'],
    functions: ['initiation', 'assertion', 'separation'],
    pressureModes: ['impatience', 'conflict escalation', 'injury risk'],
    opportunityModes: ['decisive action', 'clean boundary', 'useful courage'],
    defaultDemands: ['pressure'],
    riskFlags: ['overforce', 'reactive conflict'],
    constructiveActions: ['channel force into one task', 'set a direct boundary', 'move the body'],
    limitations: ['Mars meanings do not replace practical risk assessment.'],
  },
  Jupiter: {
    key: 'jupiter',
    label: 'Jupiter',
    keywords: ['growth', 'beliefs', 'reach'],
    functions: ['expansion', 'permission', 'larger horizon'],
    pressureModes: ['overreach', 'false confidence', 'excess'],
    opportunityModes: ['growth with strategy', 'teaching', 'better options'],
    defaultDemands: ['expansion'],
    riskFlags: ['overpromising', 'inflation'],
    constructiveActions: ['scale deliberately', 'choose the useful opportunity', 'keep proportion'],
    limitations: ['Jupiter is not treated as automatically positive in this layer.'],
  },
  Saturn: {
    key: 'saturn',
    label: 'Saturn',
    keywords: ['structure', 'limits', 'consequence'],
    functions: ['commitment', 'reality testing', 'durability'],
    pressureModes: ['restriction', 'delay', 'responsibility load'],
    opportunityModes: ['strong structure', 'competence', 'long-term credibility'],
    defaultDemands: ['restructuring'],
    riskFlags: ['fear freeze', 'rigidity'],
    constructiveActions: ['define the boundary', 'work the plan', 'remove weak structure'],
    limitations: ['Saturn meanings are baseline and do not encode house-specific strategy by themselves.'],
  },
  Uranus: {
    key: 'uranus',
    label: 'Uranus',
    keywords: ['disruption', 'liberation', 'break pattern'],
    functions: ['interrupt stagnation', 'accelerate change', 'separate from stale systems'],
    pressureModes: ['volatility', 'instability', 'sudden break'],
    opportunityModes: ['innovation', 'freedom', 'useful reset'],
    defaultDemands: ['destabilization'],
    riskFlags: ['chaotic reaction', 'burning bridges'],
    constructiveActions: ['leave margin', 'update the system', 'separate signal from panic'],
    limitations: ['Uranus does not justify impulsive decisions by itself.'],
  },
  Neptune: {
    key: 'neptune',
    label: 'Neptune',
    keywords: ['diffusion', 'ideals', 'porosity'],
    functions: ['dissolve certainty', 'sensitize perception', 'expose fantasy'],
    pressureModes: ['confusion', 'avoidance', 'boundary blur'],
    opportunityModes: ['cleaner intuition', 'release stale attachment', 'reduce false control'],
    defaultDemands: ['clarification'],
    riskFlags: ['escapism', 'projection'],
    constructiveActions: ['restate facts', 'reduce noise', 'test assumptions'],
    limitations: ['Neptune meanings should be checked against concrete evidence.'],
  },
  Pluto: {
    key: 'pluto',
    label: 'Pluto',
    keywords: ['power', 'exposure', 'irreversible change'],
    functions: ['intensify pressure', 'surface control issues', 'force deep revision'],
    pressureModes: ['compulsion', 'power struggle', 'obsession'],
    opportunityModes: ['deep repair', 'strategic focus', 'clean power use'],
    defaultDemands: ['restructuring'],
    riskFlags: ['control fight', 'all-or-nothing behavior'],
    constructiveActions: ['track leverage', 'remove the rot', 'act with discipline'],
    limitations: ['Pluto meanings are high-intensity and should not be overstated on wide orbs alone.'],
  },
  Chiron: {
    key: 'chiron',
    label: 'Chiron',
    keywords: ['sensitivity', 'repair', 'skill through difficulty'],
    functions: ['reopen weak points', 'teach through lived strain', 'support precise repair'],
    pressureModes: ['old pain trigger', 'defensive story', 'exposed inadequacy'],
    opportunityModes: ['useful repair', 'better language for pain', 'earned skill'],
    defaultDemands: ['clarification'],
    riskFlags: ['self-protection loop', 'identity around the wound'],
    constructiveActions: ['name the weak point', 'seek the right tool', 'practice instead of dramatizing'],
    limitations: ['Chiron here is treated as a repair vector, not a complete healing model.'],
  },
  'North Node': {
    key: 'north-node',
    label: 'North Node',
    keywords: ['direction', 'future pull', 'development edge'],
    functions: ['increase pressure toward growth', 'shift orientation', 'reweight priorities'],
    pressureModes: ['unstable appetite', 'rushed growth', 'overcorrection'],
    opportunityModes: ['forward traction', 'useful stretch', 'clear direction'],
    defaultDemands: ['expansion'],
    riskFlags: ['chasing novelty', 'mistaking urgency for destiny'],
    constructiveActions: ['choose the stretch deliberately', 'build capacity', 'stay specific'],
    limitations: ['Node meanings are directional only in this layer.'],
  },
  'South Node': {
    key: 'south-node',
    label: 'South Node',
    keywords: ['history', 'habit memory', 'release'],
    functions: ['expose repetition', 'drain stale attachments', 'show legacy pattern'],
    pressureModes: ['regression', 'drain', 'stuck pattern'],
    opportunityModes: ['clean release', 'simplification', 'better pattern choice'],
    defaultDemands: ['pressure'],
    riskFlags: ['fallback behavior', 'overidentifying with the past'],
    constructiveActions: ['stop the known loop', 'drop excess load', 'keep what still works'],
    limitations: ['South Node does not justify fatalistic claims.'],
  },
  ASC: {
    key: 'asc',
    label: 'Ascendant',
    keywords: ['identity interface', 'body', 'presentation'],
    functions: ['filter experience', 'set approach', 'show immediate impact'],
    pressureModes: ['identity strain', 'body stress', 'presentation conflict'],
    opportunityModes: ['cleaner self-definition', 'stronger approach', 'visible adjustment'],
    defaultDemands: ['clarification'],
    riskFlags: ['performing a false self', 'ignoring body feedback'],
    constructiveActions: ['adjust presentation', 'protect the body', 'choose the approach consciously'],
    limitations: ['Angle meanings intensify signal but do not define content alone.'],
  },
  MC: {
    key: 'mc',
    label: 'Midheaven',
    keywords: ['public role', 'career direction', 'authority'],
    functions: ['set status pressure', 'organize visibility', 'define external responsibility'],
    pressureModes: ['career strain', 'authority conflict', 'reputation exposure'],
    opportunityModes: ['role clarity', 'credible advancement', 'public consolidation'],
    defaultDemands: ['restructuring'],
    riskFlags: ['status panic', 'image management over substance'],
    constructiveActions: ['state the role', 'strengthen delivery', 'accept visible accountability'],
    limitations: ['MC meanings focus on public/career themes only.'],
  },
  DSC: {
    key: 'dsc',
    label: 'Descendant',
    keywords: ['partnership mirror', 'contracts', 'others'],
    functions: ['surface relational terms', 'show counterpart pressure', 'test agreement quality'],
    pressureModes: ['projection', 'imbalanced agreement', 'open conflict'],
    opportunityModes: ['better terms', 'clearer cooperation', 'useful feedback'],
    defaultDemands: ['clarification'],
    riskFlags: ['outsourcing power', 'blaming the other side'],
    constructiveActions: ['state the terms', 'listen for the mismatch', 'renegotiate directly'],
    limitations: ['DSC meanings should be grounded in actual relationship context.'],
  },
  IC: {
    key: 'ic',
    label: 'IC',
    keywords: ['home base', 'roots', 'private foundation'],
    functions: ['show underlying support', 'surface family pattern', 'set private baseline'],
    pressureModes: ['home instability', 'family load', 'foundation strain'],
    opportunityModes: ['sturdier base', 'private repair', 'clearer roots work'],
    defaultDemands: ['restructuring'],
    riskFlags: ['avoiding the root issue', 'private depletion'],
    constructiveActions: ['stabilize the base', 'deal with the root cause', 'protect private recovery'],
    limitations: ['IC meanings are foundation-focused only.'],
  },
  'Part of Fortune': {
    key: 'part-of-fortune',
    label: 'Part of Fortune',
    keywords: ['material flow', 'body support', 'ease channel'],
    functions: ['show where support can move', 'connect effort and payoff', 'track practical benefit'],
    pressureModes: ['misreading support', 'overusing the easy path', 'comfort dependence'],
    opportunityModes: ['practical gain', 'body support', 'efficient alignment'],
    defaultDemands: ['support'],
    riskFlags: ['coasting', 'short-term comfort bias'],
    constructiveActions: ['back the workable option', 'support the body', 'use the efficient path without overrelying on it'],
    limitations: ['Part of Fortune is included as a practical support point only.'],
  },
};

const ASPECT_MEANINGS: Record<string, AstrologyMeaningReference> = {
  conjunction: {
    key: 'conjunction',
    label: 'Conjunction',
    keywords: ['fusion', 'compression', 'single-channel focus'],
    functions: ['combine forces', 'intensify the topic', 'remove distance'],
    pressureModes: ['overload', 'loss of separation', 'domination by one factor'],
    opportunityModes: ['clear focus', 'strong alignment', 'high relevance'],
    defaultDemands: ['clarification'],
    riskFlags: ['overidentification', 'compression without perspective'],
    constructiveActions: ['prioritize the fused topic', 'reduce noise', 'work one decisive point'],
    limitations: ['Conjunction quality depends on the bodies involved.'],
  },
  opposition: {
    key: 'opposition',
    label: 'Opposition',
    keywords: ['polarity', 'counterforce', 'relationship tension'],
    functions: ['surface a split', 'show the opposite side', 'force negotiation'],
    pressureModes: ['deadlock', 'projection', 'binary thinking'],
    opportunityModes: ['clear contrast', 'better negotiation', 'fuller view'],
    defaultDemands: ['pressure'],
    riskFlags: ['blame loop', 'false either-or choice'],
    constructiveActions: ['name both sides', 'set terms', 'resolve the real tension'],
    limitations: ['Opposition does not mean one side must win.'],
  },
  square: {
    key: 'square',
    label: 'Square',
    keywords: ['friction', 'obstacle', 'forced action'],
    functions: ['create pressure', 'show weak structure', 'demand adjustment'],
    pressureModes: ['frustration', 'constraint', 'repeated conflict'],
    opportunityModes: ['useful push', 'stronger execution', 'problem solving'],
    defaultDemands: ['pressure'],
    riskFlags: ['fight with reality', 'wasted force'],
    constructiveActions: ['fix the bottleneck', 'use disciplined effort', 'stop waiting for easier timing'],
    limitations: ['Square pressure should be read with orb and body weight.'],
  },
  trine: {
    key: 'trine',
    label: 'Trine',
    keywords: ['flow', 'ease', 'low resistance'],
    functions: ['open movement', 'support coherence', 'reduce friction'],
    pressureModes: ['coasting', 'missed use', 'comfort inertia'],
    opportunityModes: ['efficient progress', 'skillful support', 'natural coordination'],
    defaultDemands: ['support'],
    riskFlags: ['taking ease for granted', 'underusing available support'],
    constructiveActions: ['use the easy opening', 'move while support exists', 'build on what is already working'],
    limitations: ['Trines do not guarantee results without action.'],
  },
  sextile: {
    key: 'sextile',
    label: 'Sextile',
    keywords: ['opening', 'usable option', 'cooperation'],
    functions: ['offer a tool', 'support coordination', 'reward initiative'],
    pressureModes: ['hesitation', 'missed option', 'passive waiting'],
    opportunityModes: ['timely help', 'clean collaboration', 'smart small move'],
    defaultDemands: ['support'],
    riskFlags: ['failing to act', 'scattering the opening'],
    constructiveActions: ['take the small useful step', 'accept help', 'connect the right people or tools'],
    limitations: ['Sextiles need initiative to matter.'],
  },
};

const HOUSE_MEANINGS: Record<number, AstrologyMeaningReference> = {
  1: { key: 'house-1', label: 'House 1', keywords: ['self', 'body', 'approach'], functions: ['set personal stance', 'show immediate impact', 'mark new cycle'], pressureModes: ['identity strain', 'body load', 'poor self-management'], opportunityModes: ['stronger self-direction', 'body awareness', 'fresh start'], defaultDemands: ['clarification'], riskFlags: ['performing under strain'], constructiveActions: ['adjust personal pace', 'protect the body', 'choose the approach deliberately'], limitations: ['House meanings are domain-level only in this layer.'] },
  2: { key: 'house-2', label: 'House 2', keywords: ['money', 'values', 'security'], functions: ['track resources', 'define standards', 'measure stability'], pressureModes: ['resource strain', 'value conflict', 'security fear'], opportunityModes: ['resource repair', 'better pricing', 'stable support'], defaultDemands: ['restructuring'], riskFlags: ['fear spending', 'mispricing value'], constructiveActions: ['audit resources', 'name the standard', 'secure the base'], limitations: ['House meanings are domain-level only in this layer.'] },
  3: { key: 'house-3', label: 'House 3', keywords: ['communication', 'learning', 'local systems'], functions: ['move information', 'coordinate nearby activity', 'support decisions'], pressureModes: ['message clutter', 'miscommunication', 'mental overload'], opportunityModes: ['better coordination', 'clear learning', 'useful message'], defaultDemands: ['clarification'], riskFlags: ['noise spiral', 'short-term distraction'], constructiveActions: ['organize information', 'keep it simple', 'verify the message'], limitations: ['House meanings are domain-level only in this layer.'] },
  4: { key: 'house-4', label: 'House 4', keywords: ['home', 'roots', 'private base'], functions: ['stabilize the foundation', 'surface family pattern', 'support private recovery'], pressureModes: ['home instability', 'family pressure', 'private depletion'], opportunityModes: ['root repair', 'base strengthening', 'private reset'], defaultDemands: ['restructuring'], riskFlags: ['ignoring root causes', 'carrying inherited load'], constructiveActions: ['stabilize home systems', 'address the root issue', 'protect recovery time'], limitations: ['House meanings are domain-level only in this layer.'] },
  5: { key: 'house-5', label: 'House 5', keywords: ['creativity', 'romance', 'expression'], functions: ['show desire', 'generate output', 'test pleasure and risk'], pressureModes: ['attention drama', 'creative block', 'risk inflation'], opportunityModes: ['creative momentum', 'joy with intent', 'clean expression'], defaultDemands: ['support'], riskFlags: ['performative risk', 'validation chase'], constructiveActions: ['make the thing', 'name the desire', 'use play with structure'], limitations: ['House meanings are domain-level only in this layer.'] },
  6: { key: 'house-6', label: 'House 6', keywords: ['work', 'health', 'routine'], functions: ['manage the load', 'improve systems', 'maintain the body'], pressureModes: ['burnout', 'inefficiency', 'health neglect'], opportunityModes: ['better process', 'health repair', 'daily competence'], defaultDemands: ['restructuring'], riskFlags: ['martyr routine', 'unsustainable workload'], constructiveActions: ['fix the workflow', 'reduce friction', 'support the body daily'], limitations: ['House meanings are domain-level only in this layer.'] },
  7: { key: 'house-7', label: 'House 7', keywords: ['partnership', 'contracts', 'mirrors'], functions: ['set relational terms', 'surface counterpart dynamics', 'test cooperation'], pressureModes: ['conflict', 'imbalance', 'dependency'], opportunityModes: ['better agreement', 'clean partnership', 'useful feedback'], defaultDemands: ['clarification'], riskFlags: ['projection', 'ceding leverage'], constructiveActions: ['state terms', 'negotiate directly', 'track reciprocity'], limitations: ['House meanings are domain-level only in this layer.'] },
  8: { key: 'house-8', label: 'House 8', keywords: ['shared resources', 'trust', 'deep change'], functions: ['expose entanglement', 'manage risk', 'rework power exchange'], pressureModes: ['control fight', 'debt strain', 'trust breach'], opportunityModes: ['deeper honesty', 'smart risk management', 'cleaner exchange'], defaultDemands: ['pressure'], riskFlags: ['secrecy', 'financial or emotional entrapment'], constructiveActions: ['review shared terms', 'track power dynamics', 'cut hidden liabilities'], limitations: ['House meanings are domain-level only in this layer.'] },
  9: { key: 'house-9', label: 'House 9', keywords: ['beliefs', 'study', 'distance'], functions: ['expand worldview', 'test doctrine', 'support long-range perspective'], pressureModes: ['dogma conflict', 'meaning crisis', 'overreach'], opportunityModes: ['better framework', 'serious study', 'wider range'], defaultDemands: ['expansion'], riskFlags: ['certainty without proof', 'escaping into theory'], constructiveActions: ['update the framework', 'study seriously', 'connect belief to action'], limitations: ['House meanings are domain-level only in this layer.'] },
  10: { key: 'house-10', label: 'House 10', keywords: ['career', 'authority', 'status'], functions: ['set public direction', 'measure responsibility', 'show consequences'], pressureModes: ['role strain', 'authority conflict', 'reputation exposure'], opportunityModes: ['earned advancement', 'role clarity', 'public competence'], defaultDemands: ['restructuring'], riskFlags: ['status anxiety', 'performance without substance'], constructiveActions: ['state the responsibility', 'strengthen delivery', 'take public accountability'], limitations: ['House meanings are domain-level only in this layer.'] },
  11: { key: 'house-11', label: 'House 11', keywords: ['community', 'networks', 'future goals'], functions: ['coordinate groups', 'measure belonging', 'support future planning'], pressureModes: ['group friction', 'misaligned goals', 'audience strain'], opportunityModes: ['better network fit', 'group support', 'future traction'], defaultDemands: ['expansion'], riskFlags: ['crowd dependence', 'scattered social energy'], constructiveActions: ['choose the right group', 'update the future plan', 'use the network intentionally'], limitations: ['House meanings are domain-level only in this layer.'] },
  12: { key: 'house-12', label: 'House 12', keywords: ['retreat', 'hidden factors', 'closure'], functions: ['reduce noise', 'surface what is unseen', 'support ending or recovery'], pressureModes: ['avoidance', 'drain', 'self-sabotage'], opportunityModes: ['restoration', 'quiet repair', 'clean closure'], defaultDemands: ['clarification'], riskFlags: ['withdrawing without purpose', 'confusion through isolation'], constructiveActions: ['create quiet structure', 'close the leaking loop', 'separate recovery from avoidance'], limitations: ['House meanings are domain-level only in this layer.'] },
};

const DEMAND_MEANINGS: Record<JudgmentDemandType, AstrologyMeaningReference> = {
  pressure: { key: 'demand-pressure', label: 'Pressure', keywords: ['load', 'friction', 'forced response'], functions: ['raise stakes', 'remove avoidance', 'demand action'], pressureModes: ['stress spike', 'reactive behavior', 'compression'], opportunityModes: ['decisive response', 'priority clarity', 'useful discipline'], defaultDemands: ['pressure'], riskFlags: ['panic action', 'strain without strategy'], constructiveActions: ['prioritize', 'contain scope', 'respond directly'], limitations: ['Demand types are simplified buckets in this layer.'] },
  expansion: { key: 'demand-expansion', label: 'Expansion', keywords: ['growth', 'reach', 'capacity'], functions: ['open range', 'increase scale', 'invite development'], pressureModes: ['overextension', 'inflation', 'undisciplined growth'], opportunityModes: ['larger range', 'new access', 'stronger capacity'], defaultDemands: ['expansion'], riskFlags: ['too much too fast'], constructiveActions: ['grow with structure', 'choose the right opening', 'keep proportion'], limitations: ['Demand types are simplified buckets in this layer.'] },
  clarification: { key: 'demand-clarification', label: 'Clarification', keywords: ['precision', 'sorting', 'truth test'], functions: ['reduce confusion', 'name the issue', 'improve signal quality'], pressureModes: ['ambiguity strain', 'misread data', 'indecision'], opportunityModes: ['clean understanding', 'better message', 'accurate decision'], defaultDemands: ['clarification'], riskFlags: ['endless analysis'], constructiveActions: ['define terms', 'check evidence', 'say the exact thing'], limitations: ['Demand types are simplified buckets in this layer.'] },
  restructuring: { key: 'demand-restructuring', label: 'Restructuring', keywords: ['rebuild', 'durability', 'constraint'], functions: ['replace weak structure', 'reset commitments', 'stabilize the system'], pressureModes: ['loss of old structure', 'hard limits', 'slow progress'], opportunityModes: ['durable repair', 'competence', 'strong boundaries'], defaultDemands: ['restructuring'], riskFlags: ['rigidity', 'overcontrol'], constructiveActions: ['rebuild the frame', 'cut what fails load', 'commit to the workable structure'], limitations: ['Demand types are simplified buckets in this layer.'] },
  destabilization: { key: 'demand-destabilization', label: 'Destabilization', keywords: ['disruption', 'shock', 'release'], functions: ['break stale patterns', 'remove false stability', 'force adaptation'], pressureModes: ['volatility', 'panic', 'fragmentation'], opportunityModes: ['rapid update', 'freedom', 'system reset'], defaultDemands: ['destabilization'], riskFlags: ['chaotic reaction'], constructiveActions: ['leave margin', 'update fast where needed', 'avoid making fear the plan'], limitations: ['Demand types are simplified buckets in this layer.'] },
  support: { key: 'demand-support', label: 'Support', keywords: ['ease', 'resource', 'cooperation'], functions: ['reduce friction', 'support progress', 'create a workable opening'], pressureModes: ['complacency', 'underuse of support', 'soft focus'], opportunityModes: ['efficient movement', 'helpful alliance', 'stable gain'], defaultDemands: ['support'], riskFlags: ['coasting'], constructiveActions: ['use the opening', 'accept help', 'build on the stable base'], limitations: ['Demand types are simplified buckets in this layer.'] },
};

const PHASE_MEANINGS: Record<JudgmentPhase | MajorTransitPhase, AstrologyMeaningReference> = {
  applying: { key: 'phase-applying', label: 'Applying', keywords: ['building', 'approach', 'set-up'], functions: ['increase relevance', 'build pressure', 'prepare the field'], pressureModes: ['ignoring early signal', 'late preparation'], opportunityModes: ['timely adjustment', 'early strategy', 'preparation'], defaultDemands: ['clarification'], riskFlags: ['waiting too long'], constructiveActions: ['prepare early', 'watch what is tightening', 'set terms before peak'], limitations: ['Phase meanings are timing-only.'] },
  exact: { key: 'phase-exact', label: 'Exact', keywords: ['peak', 'contact', 'maximum relevance'], functions: ['concentrate signal', 'force visibility', 'mark the hit'], pressureModes: ['peak strain', 'high stakes', 'noisy reaction'], opportunityModes: ['decisive action', 'clear evidence', 'timely intervention'], defaultDemands: ['pressure'], riskFlags: ['acting without containment'], constructiveActions: ['respond to the real issue', 'keep the response tight', 'note what becomes undeniable'], limitations: ['Phase meanings are timing-only.'] },
  separating: { key: 'phase-separating', label: 'Separating', keywords: ['aftereffect', 'integration', 'follow-through'], functions: ['show consequences', 'turn event into pattern', 'support review'], pressureModes: ['missing the lesson', 'cleanup avoidance'], opportunityModes: ['integration', 'measured adjustment', 'repair'], defaultDemands: ['support'], riskFlags: ['assuming it is over too early'], constructiveActions: ['review results', 'repair what was exposed', 'integrate the change'], limitations: ['Phase meanings are timing-only.'] },
  building: { key: 'arc-building', label: 'Arc Building', keywords: ['approach', 'developing wave', 'pressure build'], functions: ['accumulate relevance', 'show early pattern', 'prepare longer cycle'], pressureModes: ['underestimating the wave', 'weak preparation'], opportunityModes: ['strategic setup', 'early structural changes', 'measured pacing'], defaultDemands: ['clarification'], riskFlags: ['treating a long arc like one-day weather'], constructiveActions: ['prepare for duration', 'watch repetition', 'start the structural move early'], limitations: ['Arc phase meanings are lifecycle-only.'] },
  peaking: { key: 'arc-peaking', label: 'Arc Peaking', keywords: ['crest', 'peak pressure', 'visible demand'], functions: ['concentrate the arc', 'surface core issue', 'force response'], pressureModes: ['overwhelm', 'compressed stakes'], opportunityModes: ['decisive structural move', 'clear diagnosis', 'timely commitment'], defaultDemands: ['pressure'], riskFlags: ['overpersonalizing the peak'], constructiveActions: ['handle the main issue directly', 'protect capacity', 'keep to the essential move'], limitations: ['Arc phase meanings are lifecycle-only.'] },
  fading: { key: 'arc-fading', label: 'Arc Fading', keywords: ['aftermath', 'settlement', 'integration'], functions: ['show consequences over time', 'consolidate changes', 'close the pass'], pressureModes: ['unfinished cleanup', 'false relief'], opportunityModes: ['durable integration', 'review', 'consolidation'], defaultDemands: ['support'], riskFlags: ['dropping follow-through'], constructiveActions: ['complete cleanup', 'lock in the better structure', 'review what changed'], limitations: ['Arc phase meanings are lifecycle-only.'] },
};

const CURRENT_SKY_KIND_MEANINGS: Record<AstrologyCollectiveSkyEvent['kind'], AstrologyMeaningReference> = {
  transit_aspect: { key: 'current-sky-aspect', label: 'Current sky aspect', keywords: ['collective emphasis', 'shared pressure', 'background signal'], functions: ['amplify the body pattern', 'add context', 'increase relevance'], pressureModes: ['shared pressure spike', 'environmental noise'], opportunityModes: ['better timing context', 'collective confirmation'], defaultDemands: ['clarification'], riskFlags: ['confusing collective weather with only personal story'], constructiveActions: ['separate personal and collective layers', 'note timing overlap'], limitations: ['Current-sky factor is coarse and event-level only.'] },
  station_proximity: { key: 'current-sky-station', label: 'Current sky station', keywords: ['slowdown', 'amplification', 'stalled motion'], functions: ['lengthen exposure', 'hold pressure in place', 'increase concentration'], pressureModes: ['drag', 'fixation', 'slow reaction'], opportunityModes: ['deeper review', 'clearer signal under slower motion'], defaultDemands: ['restructuring'], riskFlags: ['mistaking delay for failure'], constructiveActions: ['allow for slower movement', 'work what is stuck deliberately'], limitations: ['Current-sky factor is coarse and event-level only.'] },
  sign_ingress_proximity: { key: 'current-sky-ingress', label: 'Current sky ingress', keywords: ['threshold', 'boundary change', 'new frame'], functions: ['shift context', 'change sign conditions', 'mark transition'], pressureModes: ['boundary instability', 'mixed old/new conditions'], opportunityModes: ['fresh setup', 'clear transition signal'], defaultDemands: ['clarification'], riskFlags: ['forcing a new phase before it lands'], constructiveActions: ['track the threshold', 'adjust expectations across the sign boundary'], limitations: ['Current-sky factor is coarse and event-level only.'] },
  lunation: { key: 'current-sky-lunation', label: 'Current sky lunation', keywords: ['reset', 'peak visibility', 'collective phase change'], functions: ['mark the monthly pivot', 'concentrate Sun/Moon emphasis', 'change the public emotional/weather field'], pressureModes: ['overreacting at a monthly peak', 'treating mood as full truth'], opportunityModes: ['clear reset', 'better timing awareness', 'use the phase change intentionally'], defaultDemands: ['clarification'], riskFlags: ['making the lunation abstract'], constructiveActions: ['name what is ending or beginning', 'treat the lunation as timing context, not magic by itself'], limitations: ['Current-sky factor is coarse and event-level only.'] },
  eclipse: { key: 'current-sky-eclipse', label: 'Current sky eclipse', keywords: ['node pressure', 'exposure', 'threshold'], functions: ['increase consequence', 'tighten the collective threshold', 'amplify the lunation story'], pressureModes: ['compressed stakes', 'faster consequences', 'overstating certainty'], opportunityModes: ['timely release', 'clear threshold crossing', 'stronger timing signal'], defaultDemands: ['restructuring'], riskFlags: ['fatalism', 'grand claims without receipts'], constructiveActions: ['stay concrete about the demand', 'track what is getting exposed', 'separate real consequence from eclipse mythology'], limitations: ['Current-sky factor is coarse and event-level only.'] },
  sign_cluster: { key: 'current-sky-sign-cluster', label: 'Current sky sign cluster', keywords: ['concentration', 'same-sign pileup', 'compressed emphasis'], functions: ['stack multiple bodies into one sign story', 'raise the density of a sign condition', 'amplify collective attention around one terrain'], pressureModes: ['overconcentration', 'single-sign overload', 'narrow framing'], opportunityModes: ['clear concentration', 'stronger thematic coherence', 'usable compression'], defaultDemands: ['clarification'], riskFlags: ['treating any same-sign pile as equally important'], constructiveActions: ['name the concentrated sign story', 'separate the cluster from unrelated sky noise', 'track which bodies are actually stacked'], limitations: ['Current-sky factor is coarse and event-level only.'] },
  major_aspect_pattern: { key: 'current-sky-major-pattern', label: 'Current sky major aspect pattern', keywords: ['geometry', 'multi-body pressure', 'pattern lock'], functions: ['link separate bodies into one configuration', 'increase systemic tension or flow', 'amplify the whole pattern beyond one pair'], pressureModes: ['cross-pressure', 'locked pattern strain', 'overreading pattern meaning'], opportunityModes: ['clear pattern diagnosis', 'coherent systems reading', 'better timing context'], defaultDemands: ['restructuring'], riskFlags: ['making grand pattern claims without tight geometry'], constructiveActions: ['verify the actual aspect structure', 'keep the claim tied to the bodies involved', 'separate pattern geometry from mythic inflation'], limitations: ['Current-sky factor is coarse and event-level only.'] },
};

function dedupe(items: string[]) {
  return [...new Set(items.filter(Boolean))];
}

function compactLimitations(items: Array<string | null | undefined>) {
  return dedupe(items.filter((item): item is string => Boolean(item)));
}

function lookupBodyMeaning(name: string | null | undefined): AstrologyMeaningReference | null {
  if (!name) return null;
  const normalized = name.toLowerCase();
  const direct = TIER_1_BODY_MEANINGS[name] ?? TIER_1_BODY_MEANINGS[name.toUpperCase()];
  if (direct) return direct;
  if (normalized === 'ascendant') return TIER_1_BODY_MEANINGS.ASC;
  if (normalized === 'midheaven') return TIER_1_BODY_MEANINGS.MC;
  if (normalized === 'descendant') return TIER_1_BODY_MEANINGS.DSC;
  if (normalized === 'imumcoeli' || normalized === 'ic') return TIER_1_BODY_MEANINGS.IC;
  if (normalized === 'north node') return TIER_1_BODY_MEANINGS['North Node'];
  if (normalized === 'south node') return TIER_1_BODY_MEANINGS['South Node'];
  return null;
}

export function getTransitBodyMeaning(body: string | null | undefined) {
  return lookupBodyMeaning(body);
}

export function getAspectMeaning(aspect: string | null | undefined) {
  if (!aspect) return null;
  return ASPECT_MEANINGS[aspect] ?? null;
}

export function getHouseMeaning(house: number | null | undefined) {
  if (house == null) return null;
  return HOUSE_MEANINGS[house] ?? null;
}

export function getDemandMeaning(demand: JudgmentDemandType | null | undefined) {
  if (!demand) return null;
  return DEMAND_MEANINGS[demand] ?? null;
}

export function getPhaseMeaning(phase: JudgmentPhase | MajorTransitPhase | null | undefined) {
  if (!phase) return null;
  return PHASE_MEANINGS[phase] ?? null;
}

export function pickMeaningDemand(factors: AstrologyMeaningFactors | null | undefined, fallback: JudgmentDemandType): JudgmentDemandType {
  return factors?.defaultDemands[0] ?? fallback;
}

export function meaningScoreBonus(factors: AstrologyMeaningFactors | null | undefined) {
  if (!factors) return 0;
  let bonus = 0;
  if (factors.currentSky) bonus += 0.12;
  if (factors.phase?.key === 'arc-peaking' || factors.phase?.key === 'phase-exact') bonus += 0.08;
  if (factors.defaultDemands.includes('restructuring') && factors.defaultDemands.includes('pressure')) bonus += 0.06;
  if (factors.house?.key === 'house-1' || factors.house?.key === 'house-4' || factors.house?.key === 'house-7' || factors.house?.key === 'house-10') bonus += 0.05;
  return Number(bonus.toFixed(2));
}

export function resolveMeaningFactors(params: {
  transitBody: string;
  aspect: string;
  natalTargetLabel?: string | null;
  targetHouse?: number | null;
  demand?: JudgmentDemandType | null;
  phase?: JudgmentPhase | MajorTransitPhase | null;
  currentSkyEvent?: AstrologyCollectiveSkyEvent | null;
}): AstrologyMeaningFactors {
  const transitBody = getTransitBodyMeaning(params.transitBody);
  const aspect = getAspectMeaning(params.aspect);
  const natalTarget = lookupBodyMeaning(params.natalTargetLabel);
  const house = getHouseMeaning(params.targetHouse);
  const demand = getDemandMeaning(params.demand ?? null);
  const phase = getPhaseMeaning(params.phase ?? null);
  const currentSkyBase = params.currentSkyEvent ? CURRENT_SKY_KIND_MEANINGS[params.currentSkyEvent.kind] : null;
  const currentSky: AstrologyMeaningCurrentSkyFactor | null = params.currentSkyEvent && currentSkyBase
    ? {
        eventId: params.currentSkyEvent.id,
        kind: params.currentSkyEvent.kind,
        score: params.currentSkyEvent.score,
        keywords: dedupe([...currentSkyBase.keywords, ...params.currentSkyEvent.bodies.map((body) => `body:${body.toLowerCase().replace(/\s+/g, '-')}`)]),
        pressureModes: currentSkyBase.pressureModes,
        opportunityModes: currentSkyBase.opportunityModes,
        limitations: compactLimitations([
          ...currentSkyBase.limitations,
          ...params.currentSkyEvent.limitations,
        ]),
      }
    : null;

  const references = [transitBody, aspect, natalTarget, house, demand, phase].filter((item): item is AstrologyMeaningReference => Boolean(item));

  return {
    transitBody,
    aspect,
    natalTarget,
    house,
    demand,
    phase,
    currentSky,
    combinedKeywords: dedupe([
      ...references.flatMap((item) => item.keywords),
      ...(currentSky?.keywords ?? []),
    ]),
    combinedFunctions: dedupe(references.flatMap((item) => item.functions)),
    pressureModes: dedupe([
      ...references.flatMap((item) => item.pressureModes),
      ...(currentSky?.pressureModes ?? []),
    ]),
    opportunityModes: dedupe([
      ...references.flatMap((item) => item.opportunityModes),
      ...(currentSky?.opportunityModes ?? []),
    ]),
    defaultDemands: dedupe(references.flatMap((item) => item.defaultDemands)) as JudgmentDemandType[],
    riskFlags: dedupe(references.flatMap((item) => item.riskFlags)),
    constructiveActions: dedupe(references.flatMap((item) => item.constructiveActions)),
    limitations: compactLimitations([
      ...references.flatMap((item) => item.limitations),
      ...(currentSky?.limitations ?? []),
      natalTarget ? null : 'Natal target meaning falls back to chart structure when no Tier 1 body or point label matches.',
      house ? null : 'House meaning is omitted when natal house is unavailable.',
      params.currentSkyEvent ? null : 'No matching current-sky event was attached to this signal.',
    ]),
  };
}
