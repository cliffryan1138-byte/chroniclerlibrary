// The one place the app picks its branch. A second branch registers here and in config.
import * as cigar from '../branches/cigar'
import { AttributeSummary, DetailFields } from '../branches/cigar/ui'
import { appConfig } from '../config/captains-cellar'

const registry = {
  cigar: {
    spec: cigar.cigarBranch,
    sampleCatalog: cigar.sampleCatalog,
    strengthOptions: cigar.SIMPLE_STRENGTH_OPTIONS,
    detailedOfferAfter: cigar.DETAILED_OFFER_AFTER_LOGS,
    thirds: cigar.THIRDS,
    glossary: cigar.GLOSSARY,
    DetailFields,
    AttributeSummary,
  },
}

export type ActiveBranch = (typeof registry)[keyof typeof registry]
export const branch: ActiveBranch = registry[appConfig.branches[0]]
