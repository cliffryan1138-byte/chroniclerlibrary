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
    AttributeSummary: PipeSummary,
  },
} as const

export type BranchId = keyof typeof registry
export type ActiveBranch = (typeof registry)[BranchId]

/** The branches this app instance offers, in display order. */
export const branches: ActiveBranch[] = appConfig.branches.map((id) => registry[id])

export const branchFor = (category: string): ActiveBranch | undefined =>
  branches.find((b) => b.spec.category === category)
