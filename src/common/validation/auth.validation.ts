import { z } from 'zod';

// Password complexity: min 8 characters, at least one uppercase, one lowercase, one number, and one special character.
export const PasswordSchema = z
  .string()
  .min(8, { message: 'Password must be at least 8 characters long' })
  .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  .regex(/[0-9]/, { message: 'Password must contain at least one number' })
  .regex(/[^a-zA-Z0-9]/, { message: 'Password must contain at least one special character' });

export const RegisterSchema = z
  .object({
    email: z.string().email({ message: 'Email must be valid' }),
    phone: z
      .string()
      .min(1, { message: 'Phone number is required' })
      .refine((val) => val.replace(/\D/g, '').length >= 10, {
        message: 'Phone number must contain at least 10 digits',
      }),
    password: PasswordSchema,
    firstName: z.string().min(1, { message: 'First name is required' }),
    lastName: z.string().min(1, { message: 'Last name is required' }),
    userType: z.enum(['PARTNER', 'AMBASSADOR'] as const, {
      message: 'userType must be either PARTNER or AMBASSADOR',
    }),
    referredByCode: z.string().optional(),
    iceDriverId: z.string().optional(),
  })
  .refine((data) => data.userType !== 'PARTNER' || (data.iceDriverId && data.iceDriverId.trim().length > 0), {
    message: 'iceDriverId is required for PARTNER (driver) signups',
    path: ['iceDriverId'],
  });

export const LoginSchema = z.object({
  email: z.string().email({ message: 'Email must be valid' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().email({ message: 'Email must be valid' }),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(1, { message: 'Token is required' }),
  newPassword: PasswordSchema,
});

export const VerifyEmailSchema = z.object({
  token: z.string().min(1, { message: 'Token is required' }),
});

export const ResendVerificationSchema = z.object({
  email: z.string().email({ message: 'Email must be valid' }),
});
