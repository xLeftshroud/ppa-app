import { z } from "zod";

export const simulateFormSchema = z.object({
  customer: z.string().min(1, "Customer is required"),
  promotion_indicator: z.union([z.literal(0), z.literal(1)]),
  week: z.number().int().min(1).max(52),
  baseline_override: z.number().min(0.01).nullable(),
  price_change_pct: z.number().min(-100).max(100),
  new_price: z.number().min(0.01).nullable(),
});

export type SimulateFormValues = z.infer<typeof simulateFormSchema>;
