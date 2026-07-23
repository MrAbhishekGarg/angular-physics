import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { ApiError } from '../utils/ApiError.js';

const SALT_ROUNDS = 10;

function toSafeUser(user) {
  return { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
}

export async function registerStudent({ name, email, password, phone }) {
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  try {
    // role is always 'student' here — there is no open mentor signup,
    // the sole mentor account is created only by the seed script.
    const user = await User.create({ name, email, passwordHash, phone, role: 'student' });
    return toSafeUser(user);
  } catch (err) {
    if (err.code === 11000) throw new ApiError(409, 'Email already registered');
    throw err;
  }
}

export async function authenticateUser({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+passwordHash');
  if (!user) throw new ApiError(401, 'Invalid email or password');

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw new ApiError(401, 'Invalid email or password');

  return { user, safeUser: toSafeUser(user) };
}

export { toSafeUser };
