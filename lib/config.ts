import * as dotenv from 'dotenv';

/* Load environment variables saved in the file '.env' into process.env. */
dotenv.config();

const config = {
    'port': process.env.PORT || 8080,
    /* Mongo configuration. */
    'mongoUri': process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/banx',
    /* Email configuration. */
    'smtpUser': process.env.SMTP_USER || 'username',
    'smtpPass': process.env.SMTP_PASS || 'password',
    'emailRecipient': process.env.EMAIL_RECIPIENT || 'email@example.com'
};

export default config;