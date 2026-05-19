import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';

type AuthShellProps = {
  children: ReactNode;
};

export function AuthShell({ children }: AuthShellProps) {
  return (
    <main className="auth-shell min-h-[100svh] bg-[#070b10] text-white">
      <div className="mx-auto flex max-w-6xl items-center px-5 py-5">
        <Link
          className="inline-flex items-center text-sm font-medium text-white/70 transition-colors hover:text-white"
          to="/"
        >
          <ChevronLeft aria-hidden="true" className="mr-1 h-4 w-4" />
          Back
        </Link>
      </div>

      <div className="h-[2px] bg-[linear-gradient(90deg,rgba(14,165,233,0)_0%,rgba(56,189,248,0.28)_16%,rgba(56,189,248,0.72)_50%,rgba(56,189,248,0.28)_84%,rgba(14,165,233,0)_100%)]" />

      <div className="mx-auto flex min-h-[calc(100svh-73px)] w-full max-w-6xl items-start justify-center px-5 pt-7 pb-12 sm:pt-9">
        <div className="w-full max-w-[500px] text-center">
          <img
            className="mx-auto mb-7 w-[144px] sm:w-[168px]"
            src="/armoze-logo.png"
            alt="Armoze"
          />
          <h1 className="text-[1.02rem] font-semibold leading-tight tracking-tight text-white sm:text-[2.15rem]">
            Log in or sign up
          </h1>
          <p className="mx-auto mt-2 max-w-[23rem] text-[0.74rem] leading-5 text-white/62 sm:text-[0.9rem]">
            Get access to your Armoze account, order updates, and customer support.
          </p>

          <div className="mx-auto mt-7 w-full max-w-[404px]">{children}</div>
        </div>
      </div>
    </main>
  );
}
