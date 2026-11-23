import { z } from 'zod';
export const ItemSchema = z.object({
    id: z.number(),
    name: z.string().min(1).max(255),
    description: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export const CreateItemSchema = z.object({
    name: z.string().min(1).max(255),
    description: z.string().nullable().optional(),
});
export const UpdateItemSchema = z.object({
    id: z.number(),
    name: z.string().min(1).max(255).optional(),
    description: z.string().nullable().optional(),
});
//# sourceMappingURL=item.js.map