import { ArgumentMetadata, BadRequestException, PipeTransform } from '@nestjs/common';
import { ZodError, ZodSchema } from 'zod';

/**
 * ZodValidationPipe - NestJS pipe for validating request data with Zod schemas
 *
 * Usage:
 * @Post()
 * async create(@Body(new ZodValidationPipe(CreateUserSchema)) data: CreateUserInput) { ... }
 *
 * @Get()
 * async findAll(@Query(new ZodValidationPipe(ListUsersQuerySchema)) query: ListUsersQuery) { ... }
 */
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private schema: ZodSchema<T>) {}

  transform(value: unknown, _metadata: ArgumentMetadata): T {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: this.formatErrors(result.error),
      });
    }

    return result.data;
  }

  private formatErrors(error: ZodError) {
    return error.issues.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
      code: e.code,
    }));
  }
}

/**
 * Helper function to create a validation pipe for a schema
 * Usage: @Body(zodPipe(CreateUserSchema)) data: CreateUserInput
 */
export function zodPipe<T>(schema: ZodSchema<T>): ZodValidationPipe<T> {
  return new ZodValidationPipe(schema);
}
