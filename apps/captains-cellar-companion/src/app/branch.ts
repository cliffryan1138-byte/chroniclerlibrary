// The registry of branches this app knows. A new branch registers here and is listed in the app config.
import * as cigar from '../branches/cigar'
import { AttributeSummary as CigarSummary } from '../branches/cigar/ui'
import * as pipe from '../branches/pipe'
import { AttributeSummary as PipeSummary } from '../branches/pipe/ui'
import { appConfig } from '../config/captains-cellar'

export const registry = {
  cigar: {
    id: 'cigar',
    name: cigar.DISPLAY_NAME,
    spec: cigar.cigarBranch,
    sampleCatalog: cigar.sampleCatalog,
    strengthOptions: cigar.SIMPLE_STRENGTH_OPTIONS,
    detailedOfferAfter: cigar.DETAILED_OFFER_AFTER_LOGS,
    stages: cigar.STAGES,
    itemLabels: cigar.ITEM_LABELS,
    detailScores: cigar.DETAIL_SCORES,
    detailText: cigar.DETAIL_TEXT,
    glossary: cigar.GLOSSARY,
    scanKind: 'cigar_band',
    browse: null,
    collection: null,
    AttributeSummary: CigarSummary,
  },
  pipe_tobacco: {
    id: 'pipe_tobacco',
    name: pipe.DISPLAY_NAME,
    spec: pipe.pipeBranch,
    sampleCatalog: pipe.sampleCatalog,
    strengthOptions: pipe.SIMPLE_STRENGTH_OPTIONS,
    detailedOfferAfter: pipe.DETAILED_OFFER_AFTER_LOGS,
    stages: pipe.STAGES,
    itemLabels: pipe.ITEM_LABELS,
    detailScores: pipe.DETAIL_SCORES,
    detailText: pipe.DETAIL_TEXT,
    glossary: pipe.GLOSSARY,
    scanKind: 'pipe_tobacco_tin',
    // Discover groups the catalog by this attribute, with a line about each group.
    browse: { title: 'Browse by style', field: 'blend_style', groups: pipe.STYLE_GUIDE },
    // Pipes are kept, not smoked up: a personal collection grouped by shape, each pipe usable in a log.
    collection: {
      kind: 'pipe',
      title: 'Your pipes',
      noun: ['pipe', 'pipes'] as [string, string],
      add: 'Add a pipe',
      groupBy: 'shape',
      fields: [
        { key: 'shape', label: 'Shape', options: pipe.PIPE_SHAPES },
        { key: 'material', label: 'Material', options: pipe.PIPE_MATERIALS },
        { key: 'finish', label: 'Finish', options: pipe.PIPE_FINISHES.map((f) => ({ id: f, label: f })) },
        { key: 'filter', label: 'Filter', options: pipe.PIPE_FILTERS.map((f) => ({ id: f, label: f })) },
        { key: 'dedicated_style', label: 'Dedicated to a style', options: [{ id: '', label: 'Anything' }, ...pipe.STYLE_GUIDE.filter((s) => s.id !== 'Other')] },
      ],
      dedicatedLabel: 'Dedicated to a blend',
      usedLabel: pipe.ITEM_LABELS.smokedIn,
      usageNoun: ['bowl', 'bowls'] as [string, string],
    },
    AttributeSummary: PipeSummary,
  },
} as const

export type BranchId = keyof typeof registry
export type ActiveBranch = (typeof registry)[BranchId]

/** The branches this app instance offers, in display order. */
export const branches: ActiveBranch[] = appConfig.branches.map((id) => registry[id])

export const branchFor = (category: string): ActiveBranch | undefined =>
  branches.find((b) => b.spec.category === category)
