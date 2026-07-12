import googleOAuthHandler from '../../server/handlers/google-oauth.mjs';
import { runHandler } from './_adapter.mjs';

export async function handler(event) {
  return runHandler(event, googleOAuthHandler);
}
