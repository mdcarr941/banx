import * as createError from 'http-errors';
import * as express from 'express';
import * as path from 'path';
import * as cookieParser from 'cookie-parser';
import * as logger from 'morgan';

import usersRouter from './routes/users';
import indexRouter from './routes/index';
import apiRouter from './routes/api';

export const app = express();

// View engine setup.
app.set('views', path.join(__dirname, '../views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

// Router setup.
//app.use('/', indexRouter);
app.use('/app', indexRouter);
app.get('/', (req, res) => res.redirect('app'));
//app.use('/users', usersRouter);
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