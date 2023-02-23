import express from 'express';
import { body, validationResult } from 'express-validator';
import { catchErrors } from '../lib/catch-errors.js';
import {
  createEvent,
  listEvent,
  listEventByName,
  listEvents,
  updateEvent,
} from '../lib/db.js';
import passport, { ensureLoggedIn } from '../lib/login.js';
import { slugify } from '../lib/slugify.js';
import { findByUsername } from '../lib/users.js';
import {
  registrationValidationMiddleware,
  sanitizationMiddleware,
  xssSanitizationMiddleware,
} from '../lib/validation.js';

export const userRouter = express.Router();

async function index(req, res) {
  const events = await listEvents();
  const {user: {username} = {} } = req || {};

  return res.render('user', {
    username,
    events,
    errors: [],
    data: {},
    title: 'Viðburðir - umsjón',
    user: true,
  });
}

function login(req, res){
  if (req.isAuthenticated()){
    return res.redirect('/user');
  }

  let message = '';

  if (req.session.messages && req.session.messages.length > 0){
    message = req.session.messages.join(', ');
    req.session.messages = [];
  }

  return res.render('login', {message, title: 'Innskráning'});
}

const registerValidation = [
  body('name')
    .isLength({min:1, max: 64})
    .withMessage('Skrá verður nafn, hámarki 64 stafir.'),
  body('username')
    .isLength({min: 1, max: 64})
    .withMessage('Skrá verður notendanafn, hámarki 64 stafir.'),
  body('password')
    .isLength({min: 6, max: 256})
    .withMessage('Skrá verður lykilorð, lágmarki 6 stafir.'),
  body('username').custom(async(username) => {
    const user = await findByUsername(username);
    if (user){
      return Promise.reject(new Error('Notendanafn er þegar skráð.'));
    }
    return Promise.resolve();
  })
];

async function validationCheck(req, res, next){
  const { name } = req.body;

  const events = await listEvents();
  const { user: { username, password } = {} } = req;

  const data = {
    name,
    username,
    password,
  };

  const validation = validationResult(req);

  const customValidations = [];

  const eventNameExists = await listEventByName(name);

  if (eventNameExists !== null) {
    customValidations.push({
      param: 'name',
      msg: 'Viðburður með þessu nafni er til',
    });
  }

  if (!validation.isEmpty() || customValidations.length > 0) {
    return res.render('user', {
      events,
      username,
      title: 'Viðburðir — umsjón',
      data,
      errors: validation.errors.concat(customValidations),
      user: true,
    });
  }

  return next();
}


async function validationCheckUpdate(req, res, next) {
  const { name, description } = req.body;
  const { slug } = req.params;
  const { user: { username } = {} } = req;

  const event = await listEvent(slug);

  const data = {
    name,
    description,
  };

  const validation = validationResult(req);

  const customValidations = [];

  const eventNameExists = await listEventByName(name);

  if (eventNameExists !== null && eventNameExists.id !== event.id) {
    customValidations.push({
      param: 'name',
      msg: 'Viðburður með þessu nafni er til',
    });
  }

  if (!validation.isEmpty() || customValidations.length > 0) {
    return res.render('user-event', {
      username,
      event,
      title: 'Viðburðir — umsjón',
      data,
      errors: validation.errors.concat(customValidations),
      user: true,
    });
  }

  return next();
}

async function registerRoute(req, res) {
  const { name, description } = req.body;
  const slug = slugify(name);
  const created = await createEvent({ name, slug, description });
  if (created) {
    return res.redirect('/user');
  }

  return res.render('error');
}

userRouter.get('/signup');
userRouter.post('/signup', registerValidation);

async function updateRoute(req, res) {
  const { name, description } = req.body;
  const { slug } = req.params;

  const event = await listEvent(slug);

  const newSlug = slugify(name);

  const updated = await updateEvent(event.id, {
    name,
    slug: newSlug,
    description,
  });

  if (updated) {
    return res.redirect('/user');
  }

  return res.render('error');
}


async function eventRoute(req, res, next) {
  const { slug } = req.params;
  const { user: { username } = {} } = req;

  const event = await listEvent (slug);

  if (!event) {
    return next();
  }

  return res.render('user-event', {
    username,
    title: `${event.name} — Viðburðir — umsjón`,
    event,
    errors: [],
    data: { name: event.name, description: event.description },
  });
}

userRouter.get('/', ensureLoggedIn, catchErrors(index));
userRouter.post(
  '/',
  ensureLoggedIn,
  registrationValidationMiddleware('description'),
  xssSanitizationMiddleware('description'),
  catchErrors(validationCheck),
  sanitizationMiddleware('description'),
  catchErrors(registerRoute)
);

userRouter.get('/login', login);
userRouter.post(
  '/login',

  // Þetta notar strat að ofan til að skrá notanda inn
  passport.authenticate('local', {
    failureMessage: 'Notandanafn eða lykilorð vitlaust.',
    failureRedirect: '/user/login',
  }),

  // Ef við komumst hingað var notandi skráður inn, senda á /user
  (req, res) => {
    res.redirect('/user');
  }
);

userRouter.get('/logout', (req, res, next) => {
  // logout hendir session cookie og session
  req.logout(err=> {if(err){ next(err)}});
  res.redirect('/');
});

// Verður að vera seinast svo það taki ekki yfir önnur route
userRouter.get('/:slug', ensureLoggedIn, catchErrors(eventRoute));
userRouter.post(
  '/:slug',
  ensureLoggedIn,
  registrationValidationMiddleware('description'),
  xssSanitizationMiddleware('description'),
  catchErrors(validationCheckUpdate),
  sanitizationMiddleware('description'),
  catchErrors(updateRoute)
);
