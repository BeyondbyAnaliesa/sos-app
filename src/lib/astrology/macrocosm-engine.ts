import { buildMacroConfigurationsFromCurrentSky } from '@/lib/astrology/macro-configuration-graph';
import type {
  MacroConfigurationReceipt,
  MacroLandscapeReceipt,
} from '@/lib/astrology/macrocosm-types';
import type {
  AstrologyJudgmentCurrentSky,
  AstrologyJudgmentMacrocosm,
} from '@/lib/astrology/judgment-types';

function dedupe<T>(values: T[]): T[] {
  return values.filter((value, index, all) => all.indexOf(value) === index);
}

function dedupeByTopic(values: MacroLandscapeReceipt[]): MacroLandscapeReceipt[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    if (seen.has(value.topicKey)) return false;
    seen.add(value.topicKey);
    return true;
  });
}

function rankConfiguration(configuration: MacroConfigurationReceipt) {
  const statusBonus = configuration.rarity.status === 'computed' ? 0.5 : 0;
  const landscapeBonus = configuration.landscape?.statusLabel === 'under_discussed'
    ? 0.4
    : configuration.landscape?.statusLabel === 'niche'
      ? 0.3
      : configuration.landscape?.statusLabel === 'emerging'
        ? 0.15
        : 0;
  return configuration.consequence.score + statusBonus + landscapeBonus;
}

export function buildMacrocosmEngine(params: {
  currentSky: AstrologyJudgmentCurrentSky;
  date: string | Date;
}): AstrologyJudgmentMacrocosm {
  const configurations = (params.currentSky.macroConfigurations?.length
    ? params.currentSky.macroConfigurations
    : buildMacroConfigurationsFromCurrentSky(params.currentSky, params.date)
  ).slice().sort((a, b) => {
    const scoreDiff = rankConfiguration(b) - rankConfiguration(a);
    if (scoreDiff !== 0) return scoreDiff;
    return a.id.localeCompare(b.id);
  });

  const landscapeTopics = dedupeByTopic(
    configurations
      .map((configuration) => configuration.landscape)
      .filter((value): value is MacroLandscapeReceipt => Boolean(value)),
  );

  const limitations = dedupe([
    ...configurations.flatMap((configuration) => configuration.limitations),
    ...configurations.flatMap((configuration) => configuration.rarity.limitations),
    ...landscapeTopics.flatMap((topic) => topic.limitations),
    configurations.length === 0
      ? 'No macro configurations were supported by currentSky.events in this pass.'
      : null,
    'Macrocosm receipts are internal source-truth only and do not authorize final novelty copy on their own.',
    configurations.some((configuration) => configuration.landscape?.statusLabel === 'saturated')
      ? 'At least one macro configuration is already saturated in the existing astrology landscape; downstream copy must not pretend novelty.'
      : null,
    configurations.some((configuration) => configuration.rarity.status !== 'computed')
      ? 'Macro recurrence remains fenced where receipts are not_computed.'
      : null,
  ].filter((value): value is string => Boolean(value)));

  return {
    status: 'macrocosm-engine-v1',
    configurations,
    landscapeTopics,
    limitations,
  };
}
