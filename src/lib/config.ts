import * as dotenv from 'dotenv';

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
    /* Request whose 'ufshib_glid' are in this comma delimited list will be granted admin access. */
    'admins': process.env.ADMINS || 'mdcarr,jnowell'
};

export default config;