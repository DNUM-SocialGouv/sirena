import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import TestController from './v1/test.controller.js';

const app = factoryWithLogs.createApp().route('/v1', TestController);

export default app;
