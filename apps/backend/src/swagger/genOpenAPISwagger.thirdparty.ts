import ThirdPartyController from '../features/third-party/third-party.controller.js';
import { generateThirdPartySwaggerDocs } from '../openAPI.thirdparty.js';

await generateThirdPartySwaggerDocs(ThirdPartyController);
process.exit(0);
