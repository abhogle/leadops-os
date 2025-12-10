import { z } from "zod";

export const VerticalPackSchema = z.object({
  industry: z.string(),
  defaultLeadFields: z.array(
    z.object({
      key: z.string(),
      label: z.string(),
      type: z.enum(["string", "number", "boolean", "date"]),
      required: z.boolean().optional(),
    })
  ),
  defaultWorkflows: z.array(z.any()),   // workflows will have dedicated schema later
  defaultSettings: z.record(z.any()),
});

export type VerticalPack = z.infer<typeof VerticalPackSchema>;
