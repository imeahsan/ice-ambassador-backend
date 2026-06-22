import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const zodValidationMiddleware = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      return res.status(400).json({
        message: 'Validation failed',
        errors: fieldErrors,
      });
    }
    req.body = result.data; // Replace with validated and formatted data
    next();
  };
};
