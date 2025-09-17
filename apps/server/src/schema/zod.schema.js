import { z } from 'zod';

export const clientSignupSchema = z.object({
    name: z.string().min(5, "Name must be at least 5 characters long").max(30, "Name cannot exceed 30 characters"),
    email: z.email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters long").max(30, "Password cannot exceed 30 characters"),
    slug: z.string().min(3, "Slug must be at least 3 characters long").max(30, "Slug cannot exceed 30 characters"),
    username: z.string().min(3, "Username must be at least 3 characters long").max(30, "Username cannot exceed 30 characters").optional(),
})

export const clientSignInSchema = z.object({
    // name: z.string().min(5, "Name must be at least 5 characters long").max(30, "Name cannot exceed 30 characters"),
    email: z.email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters long").max(30, "Password cannot exceed 30 characters"),
})