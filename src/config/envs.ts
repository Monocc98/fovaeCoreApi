import 'dotenv/config';
import { get } from 'env-var';


export const envs = {

  PORT: get('PORT').required().asPortNumber(),
  MONGO_URL: get('MONGO_URL').required().asString(),
  MONGO_DB_NAME: get('MONGO_DB_NAME').required().asString(),
  JWT_SEED: get('JWT_SEED').required().asString(),
  WEBSERVICE_URL: get('WEBSERVICE_URL').required().asString(),
  FRONTEND_ORIGINS: get('FRONTEND_ORIGINS').default('http://localhost:5173').asString(),
  ACCESS_TOKEN_TTL: get('ACCESS_TOKEN_TTL').default('15m').asString(),
  REFRESH_TOKEN_TTL: get('REFRESH_TOKEN_TTL').default('7d').asString(),
  COOKIE_SECURE: get('COOKIE_SECURE').default('false').asBool(),
  COOKIE_SAMESITE: get('COOKIE_SAMESITE').default('lax').asString(),
  ACCESS_COOKIE_NAME: get('ACCESS_COOKIE_NAME').default('fovae_access').asString(),
  REFRESH_COOKIE_NAME: get('REFRESH_COOKIE_NAME').default('fovae_refresh').asString(),
  CSRF_COOKIE_NAME: get('CSRF_COOKIE_NAME').default('fovae_csrf').asString(),
  CSRF_HEADER_NAME: get('CSRF_HEADER_NAME').default('x-csrf-token').asString(),

}


