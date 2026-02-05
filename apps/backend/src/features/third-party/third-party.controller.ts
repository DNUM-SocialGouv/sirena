import { Hono } from 'hono';
import TestController from './v1/test.controller.js';

const app = new Hono().route('/v1', TestController);

export default app;
