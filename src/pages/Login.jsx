import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema } from '../scemas/auth';
import { Link, useNavigate } from 'react-router-dom';
import getErrorMessage from '../utils/getErrorMessages.js';
import api from '../api.js';

function Login() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  async function onSubmit(formData) {
    setServerError('');

    try {
      const response = await api.post('/login', formData);

      console.log('Login successful:', response.data);

      navigate('/', { replace: true });
    } catch (error) {
      console.error('Login error:', error.response?.data || error.message);

      setServerError(getErrorMessage(error));
    }
  }
  async function handleGoogleLogin() {
    setServerError('');
    try {
      const response = await api.post('/auth/google', {
        name: 'Mitrajit Outreach',
        email: 'growth@reachinbox.ai',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256',
      });
      console.log('Google login successful:', response.data);
      navigate('/', { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  }

  const [showPassword, setShowPassword] = useState(false);
  const [pointer, setPointer] = useState({ x: 50, y: 50 });

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-black px-4 py-10 text-black"
      onMouseMove={(e) =>
        setPointer({
          x: (e.clientX / window.innerWidth) * 100,
          y: (e.clientY / window.innerHeight) * 100,
        })
      }
      style={{
        background: `radial-gradient(200px circle at ${pointer.x}% ${pointer.y}%, rgba(245, 239, 239, 0.1), transparent 80%), #1e1c1c`,
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-gray-800 bg-white p-8 shadow-xl sm:p-10">
        <h1 className="text-3xl font-bold tracking-tight text-black">
          Welcome Back
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Sign in to your ReachInbox Email Scheduler.
        </p>

        {/* Google OAuth Login */}
        <div className="mt-6">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-700 shadow-sm transition hover:bg-gray-50 active:scale-[0.98]"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            Sign in with Google
          </button>
        </div>

        <div className="relative my-6 flex items-center justify-center">
          <div className="w-full border-t border-gray-200"></div>
          <span className="bg-white px-3 text-xs uppercase tracking-wider text-gray-400">
            or continue with credentials
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-black"
            >
              Email address
            </label>

            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              autoComplete="email"
              {...register('email')}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-black outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gray-200"
            />

            {errors.email && (
              <p className="mt-1 text-sm text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                htmlFor="password"
                className="text-sm font-semibold text-black"
              >
                Password
              </label>

              <a
                href="/forgot-password"
                className="text-sm font-medium text-gray-600 hover:text-black hover:underline"
              >
                Forgot password?
              </a>
            </div>

            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                autoComplete="current-password"
                {...register('password')}
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-16 text-sm text-black outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gray-200"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-black hover:text-gray-600"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            {errors.password && (
              <p className="mt-1 text-sm text-red-500">
                {errors.password.message}
              </p>
            )}
          </div>
          {serverError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {serverError}
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3.5 font-semibold text-white transition hover:bg-gray-800 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? 'Signing In...' : 'Sign In'}
            <span>→</span>
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="font-semibold text-black underline underline-offset-4 hover:text-gray-600"
          >
            Sign up
          </Link>
        </p>

        <div className="mt-8 border-t border-gray-200 pt-5 text-center text-xs text-gray-500">
          Stay focused. Keep learning. Achieve your goals.
        </div>
      </div>
    </div>
  );
}

export default Login;
