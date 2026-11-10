import express, {type ErrorRequestHandler, type RequestHandler} from 'express';
import multer from 'multer';
import {Problem} from '../domain';
import {toProblem} from './problem';
import type {HttpRequest} from './api-request';

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;

/** Multipart: text fields go to req.body, the (last) file to req.uploadedFile. Files stay in memory, max 20 MB. */
const multipart = multer({storage: multer.memoryStorage(), limits: {fileSize: MAX_UPLOAD_BYTES}}).any();
const keepUploadedFile: RequestHandler = (req, _res, next) => {
  const files = (req as any).files as Express.Multer.File[] | undefined;
  const file = files?.[files.length - 1];
  if (file) {
    (req as HttpRequest).uploadedFile = {
      buffer: file.buffer,
      mimetype: file.mimetype,
      originalname: file.originalname,
      size: file.size,
    };
  }
  next();
};

/** Body parsing for /api (Nest's built-in parser is off): JSON, HTML form posts and multipart uploads. */
export const bodyParsers: RequestHandler[] = [
  express.json({limit: '30mb'}),
  express.urlencoded({extended: false, limit: '1mb'}),
  multipart,
  keepUploadedFile,
];

/** Turns body-parser and upload errors into problem responses (malformed JSON → 400, file too large → 422). */
export const bodyParserErrors: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  let problem = error;
  if (error?.type === 'entity.parse.failed') problem = new Problem(400, 'Request body is not valid JSON');
  else if (error?.type === 'entity.too.large') problem = new Problem(413, 'Request body is too large');
  else if (error?.code === 'LIMIT_FILE_SIZE') problem = new Problem(422, 'File exceeds the 20 MB limit');
  else if (error instanceof multer.MulterError) problem = new Problem(400, error.message);
  const {status, body} = toProblem(problem);
  res.status(status).type('application/problem+json').send(JSON.stringify(body));
};
