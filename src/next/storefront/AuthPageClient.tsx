'use client';

import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { supabaseClient } from '../../lib/supabase';

type AuthStep = 'email' | 'password' | 'verify';

const inputClasses =
  'h-[2.9rem] w-full rounded-[0.7rem] border border-white/62 bg-transparent px-3.5 text-[0.82rem] text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)] outline-none transition-[border-color,box-shadow] placeholder:text-white/66 focus:border-white/78 focus:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.18)] sm:h-[3.35rem] sm:rounded-[0.85rem] sm:px-4 sm:text-[0.84rem]';

const buttonClasses =
  'inline-flex h-[2.9rem] w-full items-center justify-center rounded-[0.7rem] border text-[0.82rem] font-semibold transition-colors sm:h-[3.35rem] sm:rounded-[0.85rem] sm:text-[0.84rem]';

const primaryButtonClasses = `${buttonClasses} border-white bg-white text-[0.84rem] text-black hover:bg-zinc-100`;
const socialButtonClasses = `${buttonClasses} border-white/78 bg-transparent px-5 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)] hover:border-white/90 hover:bg-white/[0.04]`;
const subtleButtonClasses =
  'mt-3 inline-flex min-h-[2.55rem] w-full items-center justify-center rounded-[0.7rem] border border-white/22 px-4 text-[0.78rem] font-semibold text-white/78 transition-colors hover:border-white/38 hover:bg-white/[0.04] hover:text-white disabled:cursor-not-allowed disabled:opacity-60';

function GoogleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
      <path
        d="M21.6 12.23c0-.78-.07-1.53-.2-2.23H12v4.22h5.38a4.6 4.6 0 0 1-2 3.02v2.51h3.24c1.9-1.75 2.98-4.33 2.98-7.52Z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.97-.9 6.62-2.45l-3.24-2.51c-.9.6-2.04.95-3.38.95-2.6 0-4.8-1.76-5.59-4.12H3.07v2.59A9.99 9.99 0 0 0 12 22Z"
        fill="#34A853"
      />
      <path
        d="M6.41 13.87A6 6 0 0 1 6.1 12c0-.65.11-1.28.31-1.87V7.54H3.07A9.99 9.99 0 0 0 2 12c0 1.61.39 3.14 1.07 4.46l3.34-2.59Z"
        fill="#FBBC05"
      />
      <path
        d="M12 6.01c1.47 0 2.8.51 3.84 1.5l2.87-2.87A9.61 9.61 0 0 0 12 2a9.99 9.99 0 0 0-8.93 5.54l3.34 2.59C7.2 7.77 9.4 6.01 12 6.01Z"
        fill="#EA4335"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg aria-hidden="true" className="h-5 w-5 fill-current" viewBox="0 0 24 24">
      <path d="M16.16 12.64c-.02-2.24 1.83-3.32 1.91-3.37-1.04-1.52-2.66-1.73-3.23-1.75-1.38-.14-2.69.81-3.39.81-.7 0-1.78-.79-2.93-.77-1.51.02-2.91.88-3.69 2.23-1.57 2.73-.4 6.77 1.13 8.98.75 1.08 1.64 2.3 2.81 2.25 1.13-.04 1.56-.73 2.92-.73 1.37 0 1.75.73 2.94.71 1.22-.02 1.99-1.1 2.73-2.18.86-1.26 1.22-2.48 1.24-2.54-.03-.01-2.38-.91-2.44-3.64ZM13.94 6.06c.62-.75 1.04-1.8.92-2.84-.9.04-1.99.6-2.64 1.35-.58.67-1.09 1.73-.95 2.75 1 .08 2.04-.51 2.67-1.26Z" />
    </svg>
  );
}

function getRedirectUrl() {
  return `${window.location.origin}/account`;
}

function AuthShell({ children }: { children: ReactNode }) {
  return (
    <main className="auth-shell min-h-[100svh] bg-[#070b10] text-white">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-3 sm:px-5 sm:py-5">
        <Link
          className="inline-flex items-center text-[0.8rem] font-medium text-white/70 transition-colors hover:text-white sm:text-sm"
          href="/"
        >
          <ChevronLeft aria-hidden="true" className="mr-1 h-3.5 w-3.5 sm:h-4 sm:w-4" />
          Back
        </Link>
      </div>

      <div className="h-px bg-[linear-gradient(90deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.24)_16%,rgba(255,255,255,0.72)_50%,rgba(255,255,255,0.24)_84%,rgba(255,255,255,0)_100%)] sm:h-[2px]" />

      <div className="mx-auto flex min-h-[calc(100svh-45px)] w-full max-w-6xl items-start justify-center px-4 pt-3 pb-7 sm:min-h-[calc(100svh-73px)] sm:px-5 sm:pt-6 sm:pb-12">
        <div className="w-full max-w-[420px] text-center sm:max-w-[500px]">
          <img
            className="mx-auto mb-3 w-[104px] sm:mb-6 sm:w-[168px]"
            src="/armoze-logo.png"
            alt="Armoze"
          />
          <h1 className="text-[0.98rem] font-semibold leading-tight tracking-tight text-white sm:text-[2.15rem]">
            Log in or sign up
          </h1>
          <p className="mx-auto mt-1.5 max-w-[21rem] text-[0.72rem] leading-4 text-white/62 sm:mt-2 sm:max-w-[23rem] sm:text-[0.9rem] sm:leading-5">
            Get access to your Armoze account, order updates, and customer support.
          </p>

          <div className="mx-auto mt-5 w-full max-w-[388px] sm:mt-7 sm:max-w-[404px]">{children}</div>
        </div>
      </div>
    </main>
  );
}

export default function AuthPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const step: AuthStep = searchParams.has('verify')
    ? 'verify'
    : searchParams.has('password')
      ? 'password'
      : 'email';
  const [email, setEmail] = useState(searchParams.get('email') ?? '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);

  useEffect(() => {
    if (!supabaseClient) {
      return undefined;
    }

    let active = true;

    void supabaseClient.auth.getSession().then(({ data }) => {
      if (active && data.session) {
        router.replace('/account');
      }
    });

    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange((_event, nextSession) => {
      if (active && nextSession) {
        router.replace('/account');
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [router]);

  function goToEmailStep() {
    setError('');
    setInfo('');
    router.replace(normalizedEmail ? `/sign-in?email=${encodeURIComponent(normalizedEmail)}` : '/sign-in');
  }

  function goToPasswordStep(nextEmail = normalizedEmail) {
    setError('');
    setInfo('');
    router.replace(`/sign-in?password=1&email=${encodeURIComponent(nextEmail)}`);
  }

  function goToVerifyStep(nextEmail = normalizedEmail) {
    setError('');
    setInfo('');
    router.replace(`/sign-in?verify=1&email=${encodeURIComponent(nextEmail)}`);
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!normalizedEmail) {
      setError('Enter your email address.');
      return;
    }

    goToPasswordStep(normalizedEmail);
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!supabaseClient) {
      setError('Account sign in is almost ready. Store setup still needs to be completed.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setInfo('');

    try {
      const { error: signInError } = await supabaseClient.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (!signInError) {
        setInfo('Redirecting to your account.');
        router.replace('/account');
        return;
      }

      const { data, error: signUpError } = await supabaseClient.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: getRedirectUrl(),
        },
      });

      if (signUpError) {
        if (/already|registered|exists/i.test(signUpError.message)) {
          setError('That email already has an account. Check your password or use the sign-in link below.');
          return;
        }

        throw signUpError;
      }

      if (data.session) {
        setInfo('Redirecting to your account.');
        router.replace('/account');
        return;
      }

      goToVerifyStep(normalizedEmail);
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Sign in could not be completed.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleMagicLink() {
    if (!normalizedEmail) {
      setError('Enter your email address first.');
      return;
    }

    if (!supabaseClient) {
      setError('Account sign in is almost ready. Store setup still needs to be completed.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setInfo('');

    try {
      const { error: linkError } = await supabaseClient.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: getRedirectUrl(),
          shouldCreateUser: true,
        },
      });

      if (linkError) {
        throw linkError;
      }

      goToVerifyStep(normalizedEmail);
      setInfo('Check your email for a secure sign-in link.');
    } catch (linkError) {
      setError(linkError instanceof Error ? linkError.message : 'Sign-in link could not be sent.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResendVerification() {
    if (!normalizedEmail) {
      setError('Enter your email address first.');
      return;
    }

    if (!supabaseClient) {
      setError('Account sign in is almost ready. Store setup still needs to be completed.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setInfo('');

    try {
      const { error: resendError } = await supabaseClient.auth.resend({
        type: 'signup',
        email: normalizedEmail,
        options: {
          emailRedirectTo: getRedirectUrl(),
        },
      });

      if (resendError) {
        throw resendError;
      }

      setInfo('We sent a new confirmation link.');
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'Confirmation email could not be sent.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    if (!supabaseClient) {
      setError('Account sign in is almost ready. Store setup still needs to be completed.');
      return;
    }

    setError('');
    setInfo('');

    const { error: oauthError } = await supabaseClient.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: getRedirectUrl(),
      },
    });

    if (oauthError) {
      setError(oauthError.message);
    }
  }

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-[360px] text-white sm:max-w-[388px]">
        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit}>
            <label className="sr-only" htmlFor="auth-email">
              Email
            </label>
            <input
              className={inputClasses}
              id="auth-email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email"
              autoComplete="email"
              required
            />

            <button className={`${primaryButtonClasses} mt-3 sm:mt-4`} type="submit">
              Continue
            </button>
          </form>
        ) : null}

        {step === 'password' ? (
          <form onSubmit={handlePasswordSubmit}>
            <button
              className="inline-flex items-center gap-2 text-[0.76rem] font-medium text-white/72 transition-colors hover:text-white"
              type="button"
              onClick={goToEmailStep}
            >
              <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
              Back
            </button>

            <div className="mt-4 text-left sm:mt-5">
              <h2 className="text-[0.88rem] font-semibold tracking-tight text-white">Enter your password</h2>
              <p className="mt-1 text-[0.76rem] leading-5 text-white/64 sm:mt-1.5 sm:text-[0.78rem]">
                Log in with {normalizedEmail}. If this email is new, we will create your account.
              </p>
            </div>

            <label className="sr-only" htmlFor="auth-password">
              Password
            </label>
            <input
              className={`${inputClasses} mt-3 sm:mt-4`}
              id="auth-password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              minLength={8}
              required
            />

            <button className={`${primaryButtonClasses} mt-3 sm:mt-4`} type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Working' : 'Continue'}
            </button>

            <button
              className={subtleButtonClasses}
              type="button"
              onClick={() => void handleMagicLink()}
              disabled={isSubmitting}
            >
              Email me a secure sign-in link
            </button>
          </form>
        ) : null}

        {step === 'verify' ? (
          <div className="text-left">
            <button
              className="inline-flex items-center gap-2 text-[0.76rem] font-medium text-white/72 transition-colors hover:text-white"
              type="button"
              onClick={goToEmailStep}
            >
              <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
              Back
            </button>

            <div className="mt-4 sm:mt-5">
              <h2 className="text-[0.88rem] font-semibold tracking-tight text-white">Verify your email</h2>
              <p className="mt-1 text-[0.76rem] leading-5 text-white/64 sm:mt-1.5 sm:text-[0.78rem]">
                We sent a confirmation link to {normalizedEmail}. Open it to finish and go to your account.
              </p>
              <p className="mt-2 text-[0.76rem] leading-5 text-white/72 sm:mt-3">
                You can close this tab after confirming your email.
              </p>
              <button
                className={subtleButtonClasses}
                type="button"
                onClick={() => void handleResendVerification()}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Sending' : 'Resend confirmation email'}
              </button>
            </div>
          </div>
        ) : null}

        {step === 'email' ? (
          <>
            <div className="my-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 text-[0.72rem] font-semibold text-white/62 sm:my-7 sm:gap-4 sm:text-[0.76rem]">
              <span className="h-px bg-white/20" />
              OR
              <span className="h-px bg-white/20" />
            </div>

            <div className="grid gap-2.5 sm:gap-3">
              <button className={socialButtonClasses} type="button" onClick={() => void handleOAuth('google')}>
                <span className="grid w-full grid-cols-[20px_minmax(0,1fr)_20px] items-center gap-3">
                  <GoogleIcon />
                  <span>Continue with Google</span>
                  <span aria-hidden="true" />
                </span>
              </button>

              <button className={socialButtonClasses} type="button" onClick={() => void handleOAuth('apple')}>
                <span className="grid w-full grid-cols-[20px_minmax(0,1fr)_20px] items-center gap-3">
                  <AppleIcon />
                  <span>Continue with Apple</span>
                  <span aria-hidden="true" />
                </span>
              </button>
            </div>
          </>
        ) : null}

        {error ? <p className="mt-3 text-[0.76rem] leading-5 text-red-300">{error}</p> : null}
        {info ? <p className="mt-3 text-[0.76rem] leading-5 text-white/72">{info}</p> : null}

        {info === 'You are signed in.' || info === 'Your account is ready.' ? (
          <Link
            className="mt-4 inline-flex items-center gap-2 text-[0.76rem] font-medium text-white/72 transition-colors hover:text-white"
            href="/account"
          >
            View account
          </Link>
        ) : null}
      </div>
    </AuthShell>
  );
}
