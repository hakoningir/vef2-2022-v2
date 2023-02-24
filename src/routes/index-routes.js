import express from 'express';
import { validationResult } from 'express-validator';
import { catchErrors } from '../lib/catch-errors.js';
import { listEvent, listEvents, listRegistered, register } from '../lib/db.js';
import { isAdmin } from '../lib/users.js';
import {
  registrationValidationMiddleware,
  sanitizationMiddleware,
  xssSanitizationMiddleware
} from '../lib/validation.js';

export const indexRouter = express.Router();

async function indexRoute(req, res) {
  const events = await listEvents();
  const admin = await isAdmin(req.user?.username);
  res.render('index', {
    title: 'Viðburðasíðan',
    admin,
    authenticated: req.isAuthenticated(),
    events,
  });
}

async function eventRoute(req, res, next) {
  const { slug } = req.params;
  const event = await listEvent(slug);

  if (!event) {
    return next();
  }

  const registered = await listRegistered(event.id);

  return res.render('event', {
    title: `${event.name} — Viðburðasíðan`,
    event,
    registered,
    authenticated: req.isAuthenticated(),
    errors: [],
    data: {},
  });
}

async function eventRegisteredRoute(req, res) {
  const events = await listEvents();

  res.render('registered', {
    title: 'Viðburðasíðan',
    events,
  });
}


async function validationCheck(req, res, next) {
  const { name, comment } = req.body;

  // TODO tvítekning frá því að ofan
  const event = await listEvents();
  const registered = await listRegistered(event.id);

  const data = {
    name,
    comment,
  };

  const validation = validationResult(req);

  if (!validation.isEmpty()) {
    return res.render('event', {
      title: `${event.title} — Viðburðasíðan`,
      data,
      event,
      authenticated: req.isAuthenticated(),
      registered,
      errors: validation.errors,
    });
  }

  return next();
}

async function registerRoute(req, res) {
  const { comment } = req.body;
  const { slug } = req.params;
  const event = await listEvent(slug);
  const {name} = req.user;
  const registered = await register({
    name,
    comment,
    event: event.id,
  });

  if (registered) {
    return res.redirect(`/${event.slug}`);
  }

  return res.render('error');
}

indexRouter.get('/', catchErrors(indexRoute));
indexRouter.get('/:slug', catchErrors(eventRoute));
indexRouter.post(
  '/:slug',
  registrationValidationMiddleware('comment'),
  xssSanitizationMiddleware('comment'),
  catchErrors(validationCheck),
  sanitizationMiddleware('comment'),
  catchErrors(registerRoute)
);
indexRouter.get('/:slug/thanks', catchErrors(eventRegisteredRoute));
