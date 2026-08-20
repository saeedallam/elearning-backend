export function validateEnv(env: Record<string, unknown>) {
  const required = [
    'DATABASE_URL',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missing = required.filter((key) => {
    const value = env[key];

    return typeof value !== 'string' || value.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }

  const accessExpires =
    typeof env.JWT_ACCESS_EXPIRES_IN === 'string'
      ? env.JWT_ACCESS_EXPIRES_IN
      : '15m';

  const refreshExpires =
    typeof env.JWT_REFRESH_EXPIRES_IN === 'string'
      ? env.JWT_REFRESH_EXPIRES_IN
      : '7d';

  const durationPattern = /^\d+[smhd]$/i;

  if (!durationPattern.test(accessExpires)) {
    throw new Error(
      `Invalid JWT_ACCESS_EXPIRES_IN: ${accessExpires}. Use values such as 15m, 1h, or 7d.`,
    );
  }

  if (!durationPattern.test(refreshExpires)) {
    throw new Error(
      `Invalid JWT_REFRESH_EXPIRES_IN: ${refreshExpires}. Use values such as 15m, 1h, or 7d.`,
    );
  }

  return env;
}
