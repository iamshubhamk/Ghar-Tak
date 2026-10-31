import createClient, { type Middleware } from 'openapi-fetch';
import type { paths } from './schema';
import { getAccessToken } from '../auth/tokens';

const baseUrl = process.env.EXPO_PUBLIC_API_URL;
if (!baseUrl) throw new Error('EXPO_PUBLIC_API_URL is not set (see .env.example)');

// The contract's paths already start with /api/v1, so the client takes the host only.
export const api = createClient<paths>({ baseUrl: baseUrl.replace(/\/api\/v1\/?$/, '') });

const auth: Middleware = {
  async onRequest({ request }) {
    const token = await getAccessToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
    return request;
  },
};
// shortcut: no refresh-on-401 yet, add in T3-02 once POST /auth/refresh is in the contract.
api.use(auth);
