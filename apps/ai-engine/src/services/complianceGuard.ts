/**
 * Compliance Guard Service
 * Validates AI-generated text against vertical-specific compliance rules
 * Milestone 17: AI SMS Engine v1
 */

import { loadVerticalPack } from "@leadops/vertical-packs";

export interface ComplianceCheckResult {
  compliant: boolean;
  ruleTriggered?: string;
  reason?: string;
}

export interface ComplianceRule {
  name: string;
  description: string;
  type: "forbidden_phrase" | "required_phrase" | "max_length" | "regex";
  pattern?: string; // For regex type
  phrases?: string[]; // For phrase types
  maxLength?: number; // For max_length type
  caseSensitive?: boolean;
}

/**
 * Validate AI response against compliance rules from vertical pack
 *
 * Note: Compliance rules should be added to vertical pack.json files under:
 * defaultSettings.complianceRules = ComplianceRule[]
 *
 * Example for insurance vertical:
 * {
 *   "name": "no_guarantees",
 *   "description": "Cannot guarantee coverage or claim approval",
 *   "type": "forbidden_phrase",
 *   "phrases": ["guarantee", "guaranteed", "definitely covered"],
 *   "caseSensitive": false
 * }
 */
export function validateCompliance(
  aiResponse: string,
  industry: string
): ComplianceCheckResult {
  try {
    const verticalPack = loadVerticalPack(industry);

    // Check if compliance rules exist in vertical pack
    const complianceRules = verticalPack.defaultSettings?.complianceRules as ComplianceRule[] | undefined;

    if (!complianceRules || complianceRules.length === 0) {
      // No rules defined - pass by default
      return { compliant: true };
    }

    // Apply each compliance rule
    for (const rule of complianceRules) {
      const result = applyRule(aiResponse, rule);
      if (!result.compliant) {
        return result;
      }
    }

    return { compliant: true };
  } catch (error) {
    // If vertical pack doesn't exist or can't be loaded, log warning and pass
    console.warn(`Could not load vertical pack for industry: ${industry}`, error);
    return { compliant: true };
  }
}

/**
 * Apply a single compliance rule to the AI response
 */
function applyRule(text: string, rule: ComplianceRule): ComplianceCheckResult {
  const textToCheck = rule.caseSensitive ? text : text.toLowerCase();

  switch (rule.type) {
    case "forbidden_phrase":
      if (rule.phrases) {
        for (const phrase of rule.phrases) {
          const phraseToCheck = rule.caseSensitive ? phrase : phrase.toLowerCase();
          if (textToCheck.includes(phraseToCheck)) {
            return {
              compliant: false,
              ruleTriggered: rule.name,
              reason: `Forbidden phrase detected: "${phrase}" - ${rule.description}`,
            };
          }
        }
      }
      break;

    case "required_phrase":
      if (rule.phrases) {
        // At least one required phrase must be present
        const hasRequired = rule.phrases.some((phrase) => {
          const phraseToCheck = rule.caseSensitive ? phrase : phrase.toLowerCase();
          return textToCheck.includes(phraseToCheck);
        });

        if (!hasRequired) {
          return {
            compliant: false,
            ruleTriggered: rule.name,
            reason: `Missing required phrase - ${rule.description}`,
          };
        }
      }
      break;

    case "max_length":
      if (rule.maxLength && text.length > rule.maxLength) {
        return {
          compliant: false,
          ruleTriggered: rule.name,
          reason: `Message too long: ${text.length} > ${rule.maxLength} chars`,
        };
      }
      break;

    case "regex":
      if (rule.pattern) {
        const flags = rule.caseSensitive ? "" : "i";
        const regex = new RegExp(rule.pattern, flags);
        if (regex.test(text)) {
          return {
            compliant: false,
            ruleTriggered: rule.name,
            reason: `Regex pattern matched - ${rule.description}`,
          };
        }
      }
      break;
  }

  return { compliant: true };
}

/**
 * Get compliance rules for a specific industry (for testing/debugging)
 */
export function getComplianceRules(industry: string): ComplianceRule[] {
  try {
    const verticalPack = loadVerticalPack(industry);
    return verticalPack.defaultSettings?.complianceRules as ComplianceRule[] || [];
  } catch {
    return [];
  }
}
