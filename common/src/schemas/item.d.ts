import { z } from 'zod';
export declare const ItemSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodString;
    description: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodDate;
    updatedAt: z.ZodDate;
}, "strip", z.ZodTypeAny, {
    id: number;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}, {
    id: number;
    name: string;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
}>;
export declare const CreateItemSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    name: string;
    description?: string | null | undefined;
}, {
    name: string;
    description?: string | null | undefined;
}>;
export declare const UpdateItemSchema: z.ZodObject<{
    id: z.ZodNumber;
    name: z.ZodOptional<z.ZodString>;
    description: z.ZodOptional<z.ZodNullable<z.ZodString>>;
}, "strip", z.ZodTypeAny, {
    id: number;
    name?: string | undefined;
    description?: string | null | undefined;
}, {
    id: number;
    name?: string | undefined;
    description?: string | null | undefined;
}>;
export type Item = z.infer<typeof ItemSchema>;
export type CreateItem = z.infer<typeof CreateItemSchema>;
export type UpdateItem = z.infer<typeof UpdateItemSchema>;
//# sourceMappingURL=item.d.ts.map