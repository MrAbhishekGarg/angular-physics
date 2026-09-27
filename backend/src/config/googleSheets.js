import { google } from 'googleapis';
import { env } from './env.js';

const isConfigured = Boolean(env.googleSheetsClientEmail && env.googleSheetsPrivateKey && env.googleSheetsSpreadsheetId);

/**
 * Null until real service-account credentials are configured — matches the
 * graceful-degradation pattern used by config/razorpay.js, rather than
 * crashing the whole server on boot when Sheets sync hasn't been set up yet.
 */
const sheets = isConfigured
  ? google.sheets({
      version: 'v4',
      auth: new google.auth.JWT({
        email: env.googleSheetsClientEmail,
        key: env.googleSheetsPrivateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      }),
    })
  : null;

export function isGoogleSheetsConfigured() {
  return isConfigured;
}

export { sheets };
