import { AppError } from '../utils/AppError.js';

export async function resolveGoogleAccount({ profile, intent, role, UserModel }) {
  const email = profile.email.trim().toLowerCase();
  const existing = await UserModel.findOne({ email }).select('+googleSubject');

  if (intent === 'register') {
    if (existing) throw new AppError(409, 'An account already exists with this email. Please log in.');
    if (await UserModel.exists({ googleSubject: profile.subject })) throw new AppError(409, 'This Google account is already registered. Please log in.');
    return UserModel.create({
      name: profile.name || email,
      email,
      photoURL: profile.photoURL || '',
      googleSubject: profile.subject,
      role,
      subscription: 'free',
    });
  }

  if (!existing) throw new AppError(404, 'No account was found for this Google email. Please register first.');
  if (!existing.googleSubject || existing.googleSubject !== profile.subject) throw new AppError(401, 'This account was not registered with Google. Use email and password to log in.');
  if (existing.role !== role) throw new AppError(403, `This account is registered as ${existing.role}. Select ${existing.role} to continue.`);
  existing.name = profile.name || existing.name;
  existing.photoURL = profile.photoURL || existing.photoURL;
  await existing.save();
  return existing;
}
