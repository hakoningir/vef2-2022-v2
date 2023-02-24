import express from 'express';
import { body, validationResult } from 'express-validator';
import { catchErrors } from '../lib/catch-errors.js';
import passport from '../lib/login.js';
import { createUser, findByUsername } from '../lib/users.js';

export const userRouter = express.Router();


function login(req, res){
  if (req.isAuthenticated()){
    return res.redirect('/');
  }

  let message = '';

  if (req.session.messages && req.session.messages.length > 0){
    message = req.session.messages.join(', ');
    req.session.messages = [];
  }

  return res.render('login', {message, title: 'Innskráning'});
}

function signup(req, res) {
  const { user: { username, password } = {}, errors = []} = req;
  return res.render('signup', { admin:false,
    username, password, errors, data:{}, title:'Nýskráning'});
}

function signupValidation(req, res){
  try {
    validationResult(req).throw(); // inserta inn í gagnagrunninn hér
    const { name, username, password} = req.body;
    createUser(name, username, password);
    return login(req, res);
  } catch (err){
    req.errors = err.errors;
    return signup(req, res);
  }
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

userRouter.get('/signup', catchErrors(signup));
userRouter.post('/signup', registerValidation, signupValidation);

userRouter.get('/login', login);
userRouter.post(
  '/login',

  // Þetta notar strat að ofan til að skrá notanda inn
  passport.authenticate('local', {
    failureMessage: 'Notandanafn eða lykilorð vitlaust.',
    failureRedirect: '/login',
  }),

  (req, res) => {
    res.redirect('/');
  }
);

userRouter.get('/logout', (req, res, next) => {
  // logout hendir session cookie og session
  req.logout(err=> {if(err){ next(err)}});
  res.redirect('/');
});
