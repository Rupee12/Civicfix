import { z } from "zod";

const hours = z.coerce.number().int().min(1).max(8760);
export const slaConfigurationSchema = z.object({
  CRITICAL: hours,
  HIGH: hours,
  MEDIUM: hours,
  LOW: hours,
});
export type SlaConfigurationInput = z.infer<typeof slaConfigurationSchema>;
