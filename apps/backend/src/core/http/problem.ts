import {HttpException} from '@nestjs/common';
import {z} from 'zod';

/** Thrown by SessionGuard; answered with 401 + a cleared session cookie (see ProblemFilter). */
export class SessionRequired extends Error {
  constructor(public reason: string) {
    super(reason);
  }
}

const UNPROCESSABLE_MYSQL = new Set([
  'ER_BAD_NULL_ERROR',
  'ER_DATA_TOO_LONG',
  'ER_TRUNCATED_WRONG_VALUE',
  'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD',
  'ER_WARN_DATA_OUT_OF_RANGE',
  'ER_DATA_OUT_OF_RANGE',
]);

/** Maps any thrown error to the RFC 7807 problem payload the frontend expects. Server errors never expose details. */
export function toProblem(error: any): {status: number; body: Record<string, unknown>} {
  let status: number = error instanceof HttpException ? error.getStatus() : error?.status || 500;
  let message: string = error?.message || 'Request failed';
  let errors = error?.errors || [];
  if (error instanceof z.ZodError) {
    status = 422;
    message = 'Validation failed';
    errors = error.issues.map(x => ({field: x.path.join('.'), detail: x.message}));
  } else if (error?.code === 'ER_DUP_ENTRY') {
    status = 409;
    message = 'Username/email atau data unik sudah digunakan';
  } else if (UNPROCESSABLE_MYSQL.has(error?.code)) {
    status = 422;
    message = 'One or more fields contain an invalid value';
  } else if (['ER_NO_REFERENCED_ROW_2', 'ER_ROW_IS_REFERENCED_2'].includes(error?.code)) {
    status = 422;
    message = 'Referenced record was not found';
  }
  if (status >= 500) {
    console.error('API error:', error);
    message = 'An unexpected server error occurred';
  }
  return {
    status,
    body: {
      type: 'about:blank',
      title: message,
      status,
      statusCode: status,
      error: status === 422 ? 'Unprocessable Entity' : message,
      message,
      errors,
      timestamp: new Date().toISOString(),
    },
  };
}
