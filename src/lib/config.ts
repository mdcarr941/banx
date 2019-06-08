import * as dotenv from 'dotenv';

import { cleanPrefix } from './common';

/* Load environment variables saved in the file '.env' into process.env. */
dotenv.config();

const config = {
    'port': process.env.PORT || 3000,
    /* Mongo configuration. */
    'mongoUri': process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/banx',
    /* Email configuration. */
    'smtpUser': process.env.SMTP_USER || 'username',
    'smtpPass': process.env.SMTP_PASS || 'password',
    'emailRecipient': process.env.EMAIL_RECIPIENT || 'email@example.com',
    /* The prefix under which the banx app is served. */
    'banxPrefix': cleanPrefix(process.env.BANX_PREFIX || '/')
};

export default config;