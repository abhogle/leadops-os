/**
 * Layer 4: Workflow Context
 * Context from the SMS_AI workflow node that triggered this AI call
 * Milestone 17: AI SMS Engine v1
 */

export interface WorkflowContext {
  workflowName?: string;
  nodeName?: string;
  nodeInstructions?: string;
  goalDescription?: string;
  customPrompt?: string;
}

export function buildWorkflowContextLayer(
  context?: WorkflowContext
): string {
  if (!context || !context.nodeInstructions) {
    return "## Workflow Context: None\n- Respond naturally to the lead's message";
  }

  let layer = "## Workflow Context\n\n";

  if (context.workflowName) {
    layer += `Workflow: ${context.workflowName}\n`;
  }

  if (context.nodeName) {
    layer += `Current Step: ${context.nodeName}\n`;
  }

  if (context.goalDescription) {
    layer += `\n### Goal:\n${context.goalDescription}\n`;
  }

  if (context.nodeInstructions) {
    layer += `\n### Instructions:\n${context.nodeInstructions}\n`;
  }

  if (context.customPrompt) {
    layer += `\n### Additional Context:\n${context.customPrompt}\n`;
  }

  return layer;
}
