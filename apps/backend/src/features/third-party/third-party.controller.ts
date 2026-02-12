import factoryWithLogs from '../../helpers/factories/appWithLogs.js';
import EnumsController from './v1/enums.controller.js';
import TestController from './v1/test.controller.js';

const app = factoryWithLogs.createApp().route('/v1', TestController).route('/v1/enums', EnumsController);

export default app;
