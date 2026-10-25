import { useState } from 'react';
import { signupSchema } from '../scemas/auth';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import getErrorMessage from '../utils/getErrorMessages.js';
import api from '../api.js';

function Signup() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  async function onSubmit(formData) {
    setServerError('');

    try {
      // formData has already been validated and transformed by Zod.
      await api.post('/signup', formData);
      navigate('/', { replace: true });
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  }
  // const onSubmit = (data) => {
  //   console.log('Validated signup data:', data);
  // };

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
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
          Create Account
        </h1>

        <p className="mt-2 text-sm text-gray-600">
          Join Email Scheduler and start organizing your emails.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-5">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block text-sm font-semibold text-black"
            >
              Full Name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              placeholder="Enter your full name"
              {...register('name')}
              autoComplete="name"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-black outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gray-200"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-semibold text-black"
            >
              Email Address
            </label>

            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              {...register('email')}
              autoComplete="email"
              required
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm text-black outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gray-200"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="password"
              className="mb-2 block text-sm font-semibold text-black"
            >
              Password
            </label>

            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a password"
                {...register('password')}
                autoComplete="new-password"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-16 text-sm text-black outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gray-200"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-black hover:text-gray-600"
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>

            <p className="mt-1 text-xs text-gray-500">
              Password must contain at least 8 characters.
            </p>
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-2 block text-sm font-semibold text-black"
            >
              Confirm Password
            </label>

            <div className="relative">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                {...register('confirmPassword')}
                autoComplete="new-password"
                required
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3 pr-16 text-sm text-black outline-none transition placeholder:text-gray-400 focus:border-black focus:ring-2 focus:ring-gray-200"
              />
              {serverError && (
                <div role="alert" className="mt-1 text-sm text-red-500">
                  {serverError}
                </div>
              )}

              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-black hover:text-gray-600"
              >
                {showConfirmPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-black py-3.5 font-semibold text-white transition hover:bg-gray-800 active:scale-[0.98]"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Account'}
            <span>→</span>
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-black underline underline-offset-4 hover:text-gray-600"
          >
            Login
          </Link>
        </p>

        <div className="mt-8 border-t border-gray-200 pt-5 text-center text-xs text-gray-500">
          Start small. Stay consistent. Achieve more.
        </div>
      </div>
    </div>
  );
}

export default Signup;
