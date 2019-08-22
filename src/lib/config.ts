import * as dotenv from 'dotenv';

import { cleanPrefix } from './common';

/* Load environment variables saved in the file '.env' into process.env. */
dotenv.config();

function parseBoolString(boolString: string): boolean {
    switch (boolString.toLowerCase()) {
        case 'true':
            return true;
        case 'false':
            return false;
        default:
            throw new Error('Invalid string representation of a boolean: ' + boolString);
    }
}

const config = Object.freeze({
    'port': process.env.PORT || '3000',
    /* Mongo configuration. */
    'mongoUri': process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/banx',
    /* Email configuration. */
    'smtpHost': process.env.SMTP_HOST || 'localhost',
    'smtpPort': parseInt(process.env.SMTP_PORT || '25'),
    'smtpUser': process.env.SMTP_USER || 'username',
    'smtpPass': process.env.SMTP_PASS || 'password',
    // Use TLS from the start.
    'smtpSecure': parseBoolString(process.env.SMTP_SECURE || 'false'),
    // Require that TLS is started at some point (eg STARTTLS)
    'smtpRequireTls': parseBoolString(process.env.SMTP_REQUIRE_TLS || 'true'),
    'emailRecipient': process.env.EMAIL_RECIPIENT || 'email@example.com',
    /* The prefix under which the banx app is served. */
    'banxPrefix': cleanPrefix(process.env.BANX_PREFIX || '/')
});

export default config;