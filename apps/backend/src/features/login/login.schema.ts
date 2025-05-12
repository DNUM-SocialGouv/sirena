import { z } from 'zod';
import 'zod-openapi/extend';



export const LoginParamsIdSchema = z.object({
  code: z.string(),
  state: z.string(),
  iss: z.string(),
});
