import rateLimit from 'express-rate-limit';

const base = {
  standardHeaders: 'draft-7',
  legacyHeaders: false,
};

function tooMany(message) {
  return (req, res) => res.status(429).json({ message });
}

// General limit for the whole API. Set high because a whole shop
// may share one internet connection (one IP address).
export const apiLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  handler: tooMany('Too many requests. Please slow down and try again shortly.'),
});

// Only failed logins count, so normal use never hits this
export const loginLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  handler: tooMany('Too many failed login attempts. Try again in 15 minutes.'),
});

export const passwordLimiter = rateLimit({
  ...base,
  windowMs: 15 * 60 * 1000,
  limit: 5,
  handler: tooMany('Too many password attempts. Try again in 15 minutes.'),
});

// Per logged-in user (must run after requireAuth)
export const salesLimiter = rateLimit({
  ...base,
  windowMs: 60 * 1000,
  limit: 30,
  keyGenerator: (req) => `user-${req.user.id}`,
  handler: tooMany('You are recording sales too fast. Wait a moment and try again.'),
});