/**
 * Layer 2: Vertical Pack Context
 * Industry-specific context and terminology
 * Milestone 17: AI SMS Engine v1
 */

import { loadVerticalPack } from "@leadops/vertical-packs";

export async function buildVerticalLayer(industry: string): Promise<string> {
  try {
    const verticalPack = loadVerticalPack(industry);

    // Extract industry-specific context from vertical pack
    const industryContext = verticalPack.defaultSettings?.aiContext as string | undefined;

    if (industryContext) {
      return `## Industry Context: ${verticalPack.industry}\n\n${industryContext}`;
    }

    // Fallback: Basic industry context
    return buildFallbackIndustryContext(industry);
  } catch (error) {
    console.warn(`Could not load vertical pack for ${industry}, using fallback`);
    return buildFallbackIndustryContext(industry);
  }
}

/**
 * Fallback industry context when vertical pack doesn't have AI context
 */
function buildFallbackIndustryContext(industry: string): string {
  const contexts: Record<string, string> = {
    insurance: `## Industry: Insurance
- Use industry terms like "policy," "coverage," "premium," "deductible"
- Be sensitive to timing around life events (death, accidents, health issues)
- Never guarantee coverage or claim approval - always say "typically" or "usually"
- Emphasize licensed agents are available for detailed questions`,

    medspa: `## Industry: Medical Spa / Aesthetics
- Use terms like "treatment," "consultation," "procedure," "results"
- Be sensitive about body image and personal appearance
- Never provide medical advice - always defer to licensed practitioners
- Focus on scheduling consultations rather than diagnosing`,

    dental: `## Industry: Dental Services
- Use terms like "appointment," "cleaning," "exam," "treatment plan"
- Be empathetic about dental anxiety
- Never diagnose conditions - defer to dentists
- Focus on scheduling and insurance verification`,

    pi: `## Industry: Personal Injury Law
- Use sensitive, empathetic language
- Never provide legal advice - defer to attorneys
- Use terms like "case evaluation," "consultation," "claim"
- Be respectful of potentially traumatic situations`,

    "home-services": `## Industry: Home Services
- Use terms like "appointment," "estimate," "service call," "technician"
- Focus on scheduling and availability
- Address common concerns: cost, timing, licensing
- Emphasize quality and reliability`,
  };

  return contexts[industry] || `## Industry: ${industry}\n- Provide professional, helpful service\n- Use appropriate industry terminology`;
}
