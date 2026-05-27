import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="auth-shell min-h-[100svh] bg-[#070b10] text-white">
      <div className="mx-auto flex max-w-6xl items-center px-4 py-3 sm:px-5 sm:py-5">
        <Link
          className="inline-flex items-center text-[0.8rem] font-medium text-white/70 transition-colors hover:text-white sm:text-sm"
          to="/"
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
