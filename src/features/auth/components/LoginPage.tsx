import React, { useState } from 'react';
import { Lock, User, ChevronRight, Eye, EyeOff } from 'lucide-react';
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google';

interface LoginPageProps {
  onLogin: (username: string, password: string, rememberMe: boolean) => void;
  loading?: boolean;
  error?: string;
  initialUsername?: string;
  initialRememberMe?: boolean;
}

function LoginPageContent({
  onLogin,
  loading,
  error,
  initialUsername = '',
  initialRememberMe = false,
}: LoginPageProps) {
  const [step, setStep] = useState<'login' | 'otp'>('login');

  const [username, setUsername] = useState(initialUsername || '');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(initialRememberMe || false);
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');

  React.useEffect(() => {
    initialUsername ? setUsername(initialUsername) : null;
  }, [initialUsername]);

  React.useEffect(() => {
    initialRememberMe ? setRememberMe(initialRememberMe) : null;
  }, [initialRememberMe]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError('');
    setPasswordError('');

    let hasError = false;

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(username)) {
      setEmailError('Please enter a valid email address.');
      hasError = true;
    }

    // Password validation (must be at least 6 characters)
    if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters.');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    if (username && password && !loading) {
      setStep('otp');
    }
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    if (otp.length < 6) {
      setOtpError('Please enter a valid 6-digit code.');
      return;
    }
    onLogin(username, password, rememberMe);
  };

  const handleGoogleLogin = useGoogleLogin({
    onSuccess: (codeResponse) => {
      console.log('Google login success:', codeResponse);
      // Here you would send codeResponse.access_token to your backend.
      // After validation from backend, transition to OTP if 2FA applies.
      setStep('otp');
    },
    onError: (error) => {
      console.log('Google Login Failed:', error);
    },
  });

  return (
    <div className="bg-mc-beige-light selection:bg-mc-gold relative flex min-h-screen items-center justify-center overflow-hidden p-4 font-sans selection:text-white">
      {/* Dynamic Background subtle geometric shapes matching the theme */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden opacity-50">
        <div className="bg-mc-gold/20 absolute -top-[10%] -left-[5%] h-[40%] w-[40%] rounded-full mix-blend-multiply blur-[120px]" />
        <div className="absolute top-[70%] -right-[5%] h-[35%] w-[35%] rounded-full bg-amber-500/10 mix-blend-multiply blur-[100px]" />
      </div>

      <div className="bg-mc-white border-mc-beige-dark/50 animate-fadeIn relative z-10 flex w-full max-w-5xl overflow-hidden rounded-3xl border shadow-2xl">
        {/* Left Side: Branding / Logo display */}
        <div className="bg-mc-beige-light relative hidden flex-1 flex-col items-center justify-center overflow-hidden p-12 lg:flex">
          {/* Subtle background overlay */}
          <div className="via-mc-beige-light to-mc-beige-light absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-white/60 opacity-90" />

          <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-10">
            <div className="transform p-8 transition-transform duration-700 hover:scale-105">
              <img
                src="/manhattan_logo.png"
                alt="Manhattan Comfort Logo"
                className="h-32 object-contain drop-shadow-sm"
              />
            </div>

            <div className="w-full space-y-4 text-center">
              <div className="bg-mc-gold/70 mx-auto mb-4 h-1 w-16 rounded-full"></div>
              <p className="text-mc-gray-dark/80 text-sm leading-relaxed font-medium tracking-widest uppercase">
                Enterprise Resource Portal
                <br />
                <span className="mt-2 block text-xs font-normal tracking-normal opacity-70">
                  Streamlining furniture lifecycle management
                </span>
              </p>
            </div>
          </div>

          {/* Decorative corner elements */}
          <div className="border-mc-gold/40 pointer-events-none absolute top-0 left-0 m-6 h-32 w-32 rounded-tl-3xl border-t-2 border-l-2 opacity-50" />
          <div className="border-mc-gold/40 pointer-events-none absolute right-0 bottom-0 m-6 h-32 w-32 rounded-br-3xl border-r-2 border-b-2 opacity-50" />
        </div>

        {/* Right Side: Form */}
        <div className="relative flex w-full flex-col justify-center bg-white p-8 md:p-12 lg:w-[480px] lg:p-16">
          <div className="mb-10 flex w-full flex-col">
            {/* Logo for mobile view */}
            <div className="bg-mc-beige-light border-mc-gold/10 relative mb-8 flex flex-col items-center justify-center overflow-hidden rounded-2xl border p-6 lg:hidden">
              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/40 via-transparent to-transparent opacity-90" />
              <img
                src="/manhattan_logo.png"
                alt="Manhattan Comfort Logo"
                className="relative z-10 h-20 object-contain drop-shadow-sm"
              />
            </div>

            <h1 className="text-mc-gray-dark font-display mb-2 text-3xl font-extrabold tracking-tight">
              {step === 'login' ? 'Welcome Back' : 'Two-Factor Authentication'}
            </h1>
            <p className="text-sm font-medium text-slate-500">
              {step === 'login'
                ? 'Sign in to Manhattan Comfort CRM'
                : `Enter the verification code sent to ${username || 'your device'}`}
            </p>
          </div>

          {step === 'login' ? (
            <form
              onSubmit={handleSubmit}
              className="w-full space-y-6"
              noValidate
            >
              {error ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-center text-sm font-medium text-red-600 shadow-sm">
                  {error}
                </div>
              ) : null}
              <div className="space-y-5">
                <div>
                  <label className="text-mc-gray-soft mb-2.5 block text-xs font-bold tracking-wider uppercase">
                    Email Address
                  </label>
                  <div className="group relative">
                    <div className="group-focus-within:text-mc-gold pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors duration-300">
                      <User className="h-5 w-5" />
                    </div>
                    <input
                      type="email"
                      required
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value);
                        if (emailError) setEmailError('');
                      }}
                      className="focus:ring-mc-gold/40 focus:border-mc-gold w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 pr-4 pl-12 text-sm font-medium text-slate-900 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus:bg-white focus:ring-2 focus:outline-none"
                      placeholder="Enter your email address"
                    />
                  </div>
                  {emailError && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-red-500">
                      <span className="inline-block h-1 w-1 rounded-full bg-red-500" />{' '}
                      {emailError}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-mc-gray-soft mb-2.5 block text-xs font-bold tracking-wider uppercase">
                    Password
                  </label>
                  <div className="group relative">
                    <div className="group-focus-within:text-mc-gold pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-400 transition-colors duration-300">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => {
                        setPassword(e.target.value);
                        if (passwordError) setPasswordError('');
                      }}
                      className="focus:ring-mc-gold/40 focus:border-mc-gold w-full rounded-xl border border-slate-200 bg-slate-50/50 py-3.5 pr-12 pl-12 text-sm font-medium text-slate-900 shadow-sm transition-all placeholder:text-slate-400 hover:border-slate-300 focus:bg-white focus:ring-2 focus:outline-none"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      tabIndex={-1}
                      onClick={() => setShowPassword(!showPassword)}
                      className="hover:text-mc-gold absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 transition-colors focus:outline-none"
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {passwordError && (
                    <p className="mt-2 flex items-center gap-1 text-xs font-medium text-red-500">
                      <span className="inline-block h-1 w-1 rounded-full bg-red-500" />{' '}
                      {passwordError}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="group flex cursor-pointer items-center gap-2.5">
                  <div className="relative flex items-center">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="peer text-mc-gold focus:ring-mc-gold/50 checked:bg-mc-gold checked:border-mc-gold h-4 w-4 cursor-pointer appearance-none rounded border-slate-300 bg-white transition-colors"
                    />
                    <svg
                      className="pointer-events-none absolute top-0.5 left-0.5 h-3 w-3 text-white opacity-0 peer-checked:opacity-100"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                  <span className="group-hover:text-mc-gray-dark text-xs font-medium text-slate-500 transition-colors">
                    Remember me
                  </span>
                </label>
                <a
                  href="#"
                  className="text-mc-gold hover:text-mc-orange text-xs font-bold underline-offset-2 transition-colors hover:underline"
                >
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="bg-mc-gray-dark shadow-mc-gray-dark/20 group mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-4 font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-black hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span>{loading ? 'Authenticating...' : 'Continue'}</span>
                {!loading ? (
                  <ChevronRight className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
                ) : null}
              </button>

              <div className="my-6 flex items-center">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="mx-4 flex-shrink-0 text-xs font-semibold tracking-wider text-slate-400 uppercase">
                  OR
                </span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <button
                type="button"
                onClick={() => handleGoogleLogin()}
                className="group flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 font-bold text-slate-700 shadow-sm transition-all duration-300 hover:bg-slate-50 active:scale-[0.98]"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                <span>Sign in with Google</span>
              </button>
            </form>
          ) : (
            <form
              onSubmit={handleOtpSubmit}
              className="animate-fadeIn w-full space-y-6"
              noValidate
            >
              {error ? (
                <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3.5 text-center text-sm font-medium text-red-600 shadow-sm">
                  {error}
                </div>
              ) : null}
              <div className="space-y-5">
                <div>
                  <label className="text-mc-gray-soft mb-2.5 block text-center text-xs font-bold tracking-wider uppercase">
                    6-Digit Verification Code
                  </label>
                  <div className="group relative">
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        setOtp(val);
                        if (otpError) setOtpError('');
                      }}
                      className="focus:ring-mc-gold/40 focus:border-mc-gold w-full rounded-xl border border-slate-200 bg-slate-50/50 py-4 text-center text-xl font-bold tracking-[0.5em] text-slate-900 shadow-sm transition-all placeholder:text-slate-300 hover:border-slate-300 focus:bg-white focus:ring-2 focus:outline-none"
                      placeholder="------"
                    />
                  </div>
                  {otpError && (
                    <p className="mt-2 text-center text-xs font-medium text-red-500">
                      {otpError}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="bg-mc-gray-dark shadow-mc-gray-dark/20 group mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-transparent px-4 py-4 font-bold text-white shadow-lg transition-all duration-300 hover:-translate-y-0.5 hover:bg-black hover:shadow-xl active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-70"
              >
                <span>
                  {loading ? 'Verifying...' : 'Verify & Access Portal'}
                </span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setStep('login');
                  setOtp(''); // Optionally clear OTP when going back
                }}
                className="hover:text-mc-gold relative z-20 mt-4 w-full cursor-pointer p-3 text-center text-sm font-semibold text-slate-500 transition-colors"
              >
                Back to login
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage(props: LoginPageProps) {
  // Prefer environment variable, otherwise fallback to placeholder
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const clientId =
    ((import.meta as any).env?.VITE_GOOGLE_CLIENT_ID as string) ||
    'YOUR_GOOGLE_CLIENT_ID_GOES_HERE';
  return (
    <GoogleOAuthProvider clientId={clientId}>
      <LoginPageContent {...props} />
    </GoogleOAuthProvider>
  );
}
