import * as dotenv from 'dotenv';

/* Load environment variables saved in the file '.env' into process.env. */
dotenv.config();

const config = {
    /* Mongo configuration. */
    'mongoUri': process.env.MONGO_URI || 'mongodb://localhost:27017/banx',
    'problemCollection': process.env.PROBLEM_COLLECTION || 'problems',
    /* Email configuration. */
    'smtpUser': process.env.SMTP_USER || 'username',
    'smtpPass': process.env.SMTP_PASS || 'password',
    'emailRecipient': process.env.EMAIL_RECIPIENT || 'email@example.com'
};

export default config;