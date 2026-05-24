import publicConfigHandler from '../../server/handlers/public-config.mjs';
import { runHandler } from './_adapter.mjs';

export async function handler(event) {
  return runHandler(event, publicConfigHandler);
}
