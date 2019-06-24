import * as createError from 'http-errors';
import * as express from 'express';
import * as path from 'path';
import * as cookieParser from 'cookie-parser';
import * as logger from 'morgan';

import usersRouter from './routes/users';
import indexRouter from './routes/index';
import apiRouter from './routes/api';
import { printError } from './common';
import { BanxUser } from './schema';
import { UnknownUserError, getGlobalUserRepo, UserRepo } from './userRepo';
import config from './config';

export const app = express();

// View engine setup.
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

export function getGlid(req: any): string {
    return req.headers.ufshib_glid;
}

export interface BanxContext {
  remoteUser?: BanxUser;
  userRepo?: UserRepo;
  requestedUser?: BanxUser;
}

declare global {
  namespace Express {
    interface Request {
      banxContext: BanxContext;
    }
  }
}

// Only allow users who are in the database to access the app.
app.use(async (req, res, next) => {
  // Initialize the BanxContext.
  req.banxContext = {};
  const glid = getGlid(req);
  try {
    req.banxContext.userRepo = await getGlobalUserRepo();
    req.banxContext.remoteUser = await req.banxContext.userRepo.get(glid);
    next();
  }
  catch (err) {
    if (err instanceof UnknownUserError) res.sendStatus(403);
    else {
      printError(err, `An unkown error occured while looking up user '${glid}'`);
      next(err);
    }
  }
});

// The index router handles all requests with the /app prefix and requests
// which have no path are redirected to /app.
app.use('/app', indexRouter);
app.use(new RegExp(`^/${config.banxPrefix}$`), (req, res) => res.redirect('app'));

app.use('/users', usersRouter);

// The apiRouter handles all requests prefixed by /api.
app.use('/api', apiRouter);

// Static file setup.
app.use('/public', express.static(path.join(__dirname, '../public')));

// Catch 404 errors and forward them to the error handler.
app.use(function(req, res, next) {
  next(createError(404));
});

// Error handling.
app.use(function(err: any, req: any, res: any, next: any) {
  // Set locals, only providing error in development.
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // Render the error page.
  res.status(err.status || 500);
  res.render('error');
});