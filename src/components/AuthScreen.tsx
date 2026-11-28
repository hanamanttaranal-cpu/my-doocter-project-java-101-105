import React, { useState } from 'react';
import { Eye, EyeOff, AlertCircle, ArrowRight, Check } from 'lucide-react';
import { UserSession } from '../types';

interface AuthScreenProps {
  initialMode?: 'login' | 'signup';
  onAuthSuccess: (session: UserSession, isNewAccount?: boolean) => void;
  onBrowseAsGuest: () => void;
}

const SPECIALTIES = [
  'General Physician',
  'Cardiology',
  'Neurology',
  'Dermatology',
  'Orthopedics',
];

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialMode = 'login',
  onAuthSuccess,
  onBrowseAsGuest,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Sign Up fields
  const [signupRole, setSignupRole] = useState<'PATIENT' | 'DOCTOR'>('PATIENT');
  const [fullName, setFullName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [specialization, setSpecialization] = useState('General Physician');
  const [yearsOfExperience, setYearsOfExperience] = useState('5');
  const [consultationFee, setConsultationFee] = useState('100');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!loginEmail.trim() || !loginPassword) {
      setErrorMsg('Please enter your email address and password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Could not log in. Please check your email and password.');
        return;
      }
      onAuthSuccess(data as UserSession, false);
    } catch {
      setErrorMsg('Unable to reach the server right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemoLogin = async (email: string) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password' }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Demo sign-in failed.');
        return;
      }
      onAuthSuccess(data as UserSession, false);
    } catch {
      setErrorMsg('Unable to reach the server right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!fullName.trim() || !signupEmail.trim() || !signupPassword) {
      setErrorMsg('Please fill out your full name, email address, and password.');
      return;
    }
    if (signupPassword.length < 6) {
      setErrorMsg('Please choose a password with at least 6 characters.');
      return;
    }
    if (signupPassword !== confirmPassword) {
      setErrorMsg('Your passwords do not match. Please re-enter them.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          email: signupEmail.trim(),
          password: signupPassword,
          role: signupRole,
          specialization: signupRole === 'DOCTOR' ? specialization : undefined,
          yearsOfExperience: signupRole === 'DOCTOR' ? Number(yearsOfExperience) || 5 : undefined,
          consultationFee: signupRole === 'DOCTOR' ? Number(consultationFee) || 100 : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Unable to create your account. Please try again.');
        return;
      }
      onAuthSuccess(data as UserSession, true);
    } catch {
      setErrorMsg('Unable to reach the server right now. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
        {/* Left Column: Plain-English Orientation */}
        <div className="lg:col-span-6 space-y-8 pt-2">
          <div className="space-y-4">
            <p className="text-sm font-medium text-teal-700 dark:text-teal-400">
              Online Doctor Consultations
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 dark:text-slate-50 leading-[1.15] text-balance">
              See a verified doctor online in three simple steps.
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-xl">
              MediConnect helps you find the right specialist, share medical records safely, and talk directly with your doctor once your appointment is confirmed.
            </p>
          </div>

          <div className="space-y-5 border-t border-slate-200 dark:border-slate-800 pt-6">
            <div className="flex items-start gap-4">
              <span className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-teal-600 text-white text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums">
                1
              </span>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Find the right specialist
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Browse doctors by specialty, experience, and visit fee — or describe your symptoms to get a specialist recommendation.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-teal-600 text-white text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums">
                2
              </span>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Book a date and share notes
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  Pick a convenient date, explain how you feel, and attach lab reports or prescriptions for your doctor to review.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <span className="w-7 h-7 rounded-lg bg-slate-900 dark:bg-teal-600 text-white text-xs font-semibold flex items-center justify-center shrink-0 tabular-nums">
                3
              </span>
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  Chat directly after approval
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  As soon as the doctor approves your request, open your private visit chat to message them directly.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={onBrowseAsGuest}
              className="inline-flex items-center gap-2 text-sm font-medium text-teal-700 dark:text-teal-400 hover:text-teal-800 dark:hover:text-teal-300 underline underline-offset-4 cursor-pointer whitespace-nowrap shrink-0"
            >
              Browse doctors without signing in
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Right Column: Login & Sign Up Card */}
        <div className="lg:col-span-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
            {/* Segmented Switch: Log In | Create Account */}
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg(null);
                }}
                className={`py-2.5 px-4 text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  mode === 'login'
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Log In
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signup');
                  setErrorMsg(null);
                }}
                className={`py-2.5 px-4 text-sm font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  mode === 'signup'
                    ? 'bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                Sign Up
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-sm text-rose-800 dark:text-rose-200"
              >
                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {mode === 'login' ? (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Log in to your account
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Access your appointments, messages, or doctor schedule.
                  </p>
                </div>

                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <label
                      htmlFor="login-email"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Email address
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full h-11 px-3.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="login-password"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Password
                    </label>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Enter your password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full h-11 pl-3.5 pr-11 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((prev) => !prev)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 p-1 cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    {isSubmitting ? 'Logging in...' : 'Log In'}
                  </button>
                </form>

                {/* Quick Demo Access */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-5 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-medium text-slate-700 dark:text-slate-300">Quick demo sign-in</span>
                    <span>Password: <code className="font-mono text-slate-700 dark:text-slate-300">password</code></span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleDemoLogin('patient@mediconnect.pro')}
                      className="py-2.5 px-3 text-left border border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/40 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">Demo Patient</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">patient@mediconnect.pro</div>
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleDemoLogin('doctor@mediconnect.pro')}
                      className="py-2.5 px-3 text-left border border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/40 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">Demo Doctor</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">doctor@mediconnect.pro</div>
                    </button>
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleDemoLogin('admin@mediconnect.pro')}
                      className="py-2.5 px-3 text-left border border-slate-200 dark:border-slate-700 hover:border-teal-500 hover:bg-teal-50/50 dark:hover:bg-teal-950/40 rounded-xl transition-colors cursor-pointer"
                    >
                      <div className="text-xs font-semibold text-slate-900 dark:text-slate-100 whitespace-nowrap">Demo Admin</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">admin@mediconnect.pro</div>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                    Create your account
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Register as a patient to book visits, or as a doctor to accept consultations.
                  </p>
                </div>

                <form onSubmit={handleSignupSubmit} className="space-y-4">
                  {/* Account Role Picker */}
                  <div className="space-y-1.5">
                    <span className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                      I am signing up as a
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setSignupRole('PATIENT')}
                        className={`h-11 px-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                          signupRole === 'PATIENT'
                            ? 'border-teal-700 bg-teal-50 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {signupRole === 'PATIENT' && <Check className="w-4 h-4 text-teal-700 dark:text-teal-400" />}
                        Patient
                      </button>
                      <button
                        type="button"
                        onClick={() => setSignupRole('DOCTOR')}
                        className={`h-11 px-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
                          signupRole === 'DOCTOR'
                            ? 'border-teal-700 bg-teal-50 dark:bg-teal-950/50 text-teal-900 dark:text-teal-200'
                            : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {signupRole === 'DOCTOR' && <Check className="w-4 h-4 text-teal-700 dark:text-teal-400" />}
                        Doctor
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="signup-name"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Full name
                    </label>
                    <input
                      id="signup-name"
                      type="text"
                      placeholder={signupRole === 'DOCTOR' ? 'Dr. Alex Rivera' : 'Jane Doe'}
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full h-11 px-3.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label
                      htmlFor="signup-email"
                      className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Email address
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="w-full h-11 px-3.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                    />
                  </div>

                  {signupRole === 'DOCTOR' && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                      <div className="sm:col-span-1 space-y-1.5">
                        <label
                          htmlFor="doc-spec"
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                        >
                          Specialty
                        </label>
                        <select
                          id="doc-spec"
                          value={specialization}
                          onChange={(e) => setSpecialization(e.target.value)}
                          className="w-full h-10 px-2.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-600"
                        >
                          {SPECIALTIES.map((spec) => (
                            <option key={spec} value={spec}>
                              {spec}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label
                          htmlFor="doc-exp"
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                        >
                          Years exp.
                        </label>
                        <input
                          id="doc-exp"
                          type="number"
                          min={1}
                          max={60}
                          value={yearsOfExperience}
                          onChange={(e) => setYearsOfExperience(e.target.value)}
                          className="w-full h-10 px-3 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label
                          htmlFor="doc-fee"
                          className="block text-xs font-medium text-slate-700 dark:text-slate-300"
                        >
                          Visit fee ($)
                        </label>
                        <input
                          id="doc-fee"
                          type="number"
                          min={20}
                          max={1000}
                          value={consultationFee}
                          onChange={(e) => setConsultationFee(e.target.value)}
                          className="w-full h-10 px-3 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 tabular-nums focus:outline-none focus:ring-2 focus:ring-teal-600"
                        />
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label
                        htmlFor="signup-password"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Password
                      </label>
                      <input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="At least 6 characters"
                        value={signupPassword}
                        onChange={(e) => setSignupPassword(e.target.value)}
                        className="w-full h-11 px-3.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label
                        htmlFor="signup-confirm"
                        className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                      >
                        Confirm password
                      </label>
                      <input
                        id="signup-confirm"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        placeholder="Repeat password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full h-11 px-3.5 text-sm bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-teal-600"
                      />
                    </div>
                  </div>

                  <label className="inline-flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={(e) => setShowPassword(e.target.checked)}
                      className="rounded border-slate-300 dark:border-slate-600 text-teal-700 focus:ring-teal-600"
                    />
                    Show password
                  </label>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 bg-teal-700 hover:bg-teal-800 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    {isSubmitting ? 'Creating account...' : 'Create Account'}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
