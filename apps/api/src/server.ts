import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Pool } from 'pg';
import { generateNatalChart } from '@sos/chart-service';
import { loginSchema, onboardingSchema, signupSchema, type AuthResponse, type MeResponse } from '@sos/shared';

const app = Fastify({ logger: true });
const port = Number(process.env.SOS_API_PORT ?? 4000);
const host = process.env.SOS_API_HOST ?? '0.0.0.0';
const allowedOrigins = (process.env.SOS_ALLOWED_ORIGINS ?? 'http://localhost:8081,http://localhost:3000').split(',').map((value) => value.trim());
const jwtSecret = process.env.SOS_JWT_SECRET ?? 'dev-secret-change-me';
const geocoderUserAgent = process.env.SOS_GEOCODER_USER_AGENT ?? 'SOS App Onboarding/1.0';
const databaseUrl = process.env.SOS_DATABASE_URL;

if (!databaseUrl) {
  throw new Error('SOS_DATABASE_URL is required');
}

const pool = new Pool({ connectionString: databaseUrl });

await app.register(cors, {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('Origin not allowed'), false);
  },
  credentials: true,
});
await app.register(sensible);

app.get('/health', async () => ({ ok: true }));

app.post<{ Body: unknown }>('/auth/signup', async (request, reply) => {
  const payload = signupSchema.parse(request.body);
  const passwordHash = await bcrypt.hash(payload.password, 12);

  const client = await pool.connect();
  try {
    const insert = await client.query(
      `insert into app_users (email, password_hash)
       values ($1, $2)
       on conflict (email) do nothing
       returning id, email, onboarding_complete`,
      [payload.email.toLowerCase(), passwordHash]
    );

    if (!insert.rowCount) {
      return reply.conflict('Email already exists');
    }

    const user = insert.rows[0];
    const token = jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });
    const response: AuthResponse = { token, user: { id: user.id, email: user.email, onboardingComplete: user.onboarding_complete } };
    return response;
  } finally {
    client.release();
  }
});

app.post<{ Body: unknown }>('/auth/login', async (request, reply) => {
  const payload = loginSchema.parse(request.body);
  const result = await pool.query('select id, email, password_hash, onboarding_complete from app_users where email = $1', [payload.email.toLowerCase()]);
  const user = result.rows[0];
  if (!user || !(await bcrypt.compare(payload.password, user.password_hash))) {
    return reply.unauthorized('Invalid email or password');
  }
  const token = jwt.sign({ sub: user.id, email: user.email }, jwtSecret, { expiresIn: '7d' });
  const response: AuthResponse = { token, user: { id: user.id, email: user.email, onboardingComplete: user.onboarding_complete } };
  return response;
});

app.addHook('preHandler', async (request, reply) => {
  if (request.url === '/health' || request.url.startsWith('/auth/')) {
    return;
  }
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return reply.unauthorized('Missing bearer token');
  }
  try {
    const decoded = jwt.verify(header.slice(7), jwtSecret) as { sub: string; email: string };
    (request as typeof request & { auth: { userId: string; email: string } }).auth = { userId: decoded.sub, email: decoded.email };
  } catch {
    return reply.unauthorized('Invalid bearer token');
  }
});

app.get('/me', async (request) => {
  const auth = (request as typeof request & { auth: { userId: string; email: string } }).auth;
  const userResult = await pool.query('select id, email, onboarding_complete from app_users where id = $1', [auth.userId]);
  const user = userResult.rows[0];
  const birthResult = await pool.query('select birth_date, birth_time, time_unknown, location_text, latitude, longitude, normalized_location, timezone from birth_data where user_id = $1', [auth.userId]);
  const chartResult = await pool.query('select chart_json from natal_charts where user_id = $1', [auth.userId]);

  const response: MeResponse = {
    user: { id: user.id, email: user.email, onboardingComplete: user.onboarding_complete },
    birthData: birthResult.rows[0]
      ? {
          birthDate: birthResult.rows[0].birth_date,
          birthTime: birthResult.rows[0].birth_time,
          timeUnknown: birthResult.rows[0].time_unknown,
          locationText: birthResult.rows[0].location_text,
          latitude: Number(birthResult.rows[0].latitude),
          longitude: Number(birthResult.rows[0].longitude),
          normalizedLocation: birthResult.rows[0].normalized_location,
          timezone: birthResult.rows[0].timezone,
        }
      : null,
    natalChart: chartResult.rows[0]?.chart_json ?? null,
  };

  return response;
});

app.post<{ Body: unknown }>('/onboarding', async (request, reply) => {
  const auth = (request as typeof request & { auth: { userId: string; email: string } }).auth;
  const payload = onboardingSchema.parse(request.body);

  const geocodeUrl = new URL('https://nominatim.openstreetmap.org/search');
  geocodeUrl.searchParams.set('q', payload.locationText);
  geocodeUrl.searchParams.set('format', 'jsonv2');
  geocodeUrl.searchParams.set('limit', '1');
  geocodeUrl.searchParams.set('addressdetails', '1');

  const geocodeResponse = await fetch(geocodeUrl, {
    headers: { accept: 'application/json', 'user-agent': geocoderUserAgent },
  });
  if (!geocodeResponse.ok) {
    return reply.badGateway('Geocoding failed');
  }
  const geocodeResults = (await geocodeResponse.json()) as Array<{ lat: string; lon: string; display_name: string; address?: { city?: string; town?: string; village?: string; state?: string; country?: string } }>;
  const match = geocodeResults[0];
  if (!match) {
    return reply.notFound('Birth location not found');
  }

  const [year, month, day] = payload.birthDate.split('-').map(Number);
  const [hour, minute] = payload.timeUnknown || !payload.birthTime ? [12, 0] : payload.birthTime.split(':').map(Number);
  const latitude = Number(match.lat);
  const longitude = Number(match.lon);
  const chart = generateNatalChart({ year, month, day, hour, minute, latitude, longitude, timeExact: !payload.timeUnknown && Boolean(payload.birthTime) });

  await pool.query(
    `insert into birth_data (user_id, birth_date, birth_time, time_unknown, location_text, normalized_location, latitude, longitude, timezone)
     values ($1, $2, $3, $4, $5, $6, $7, $8, null)
     on conflict (user_id) do update set
       birth_date = excluded.birth_date,
       birth_time = excluded.birth_time,
       time_unknown = excluded.time_unknown,
       location_text = excluded.location_text,
       normalized_location = excluded.normalized_location,
       latitude = excluded.latitude,
       longitude = excluded.longitude,
       timezone = excluded.timezone,
       updated_at = now()`,
    [auth.userId, payload.birthDate, payload.timeUnknown || !payload.birthTime ? null : `${payload.birthTime}:00`, payload.timeUnknown, payload.locationText, match.display_name, latitude, longitude]
  );

  await pool.query(
    `insert into natal_charts (user_id, chart_json, chart_embedding)
     values ($1, $2, null)
     on conflict (user_id) do update set chart_json = excluded.chart_json, updated_at = now()`,
    [auth.userId, JSON.stringify(chart)]
  );

  await pool.query('update app_users set onboarding_complete = true, updated_at = now() where id = $1', [auth.userId]);

  return { ok: true, normalizedLocation: match.display_name, chart };
});

app.listen({ port, host }).catch((error) => {
  app.log.error(error);
  process.exit(1);
});
