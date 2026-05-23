'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, Zap, Chrome, Smartphone } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NeonInput } from '@/components/ui/NeonInput';
import { NeonButton } from '@/components/ui/NeonButton';
import toast from 'react-hot-toast';

const schema = z.object({
  email:    z.string().email('Invalid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signInWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await signIn(data.email, data.password);
      router.push('/dashboard');
      toast.success('Welcome back!');
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Sign in failed');
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.push('/dashboard');
      toast.success('Welcome!');
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Google sign in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #00d4ff, transparent)' }} />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        {/* Card */}
        <div
          className="rounded-2xl border border-white/10 p-8 space-y-6"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1)',
          }}
        >
          {/* Logo */}
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)', boxShadow: '0 0 30px rgba(0,212,255,0.3)' }}
            >
              <Zap className="w-7 h-7 text-black" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white tracking-widest font-orb">NEXUS</h1>
              <p className="text-white/40 text-sm mt-1">Sign in to your account</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <NeonInput
              label="Email"
              type="email"
              placeholder="you@example.com"
              icon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
            <NeonInput
              label="Password"
              type="password"
              placeholder="••••••••"
              icon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
            />
            <div className="flex justify-end">
              <Link href="/forgot-password" className="text-xs text-[var(--accent)] hover:text-white transition-colors">
                Forgot password?
              </Link>
            </div>
            <NeonButton type="submit" fullWidth loading={isSubmitting} glow size="lg">
              Sign In
            </NeonButton>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-white/30">or continue with</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Google */}
          <NeonButton
            variant="secondary"
            fullWidth
            loading={googleLoading}
            onClick={handleGoogle}
            icon={<Chrome className="w-4 h-4" />}
          >
            Continue with Google
          </NeonButton>

          {/* Sign up link */}
          <p className="text-center text-sm text-white/40">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[var(--accent)] hover:text-white transition-colors">
              Sign up
            </Link>
          </p>

          {/* Download app */}
          <div className="pt-2 border-t border-white/8">
            <a
              href="/nexus-app.bin"
              download="NEXUS.apk"
              className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(168,85,247,0.12))',
                border: '1px solid rgba(0,212,255,0.25)',
                color: '#00d4ff',
              }}
            >
              <Smartphone className="w-4 h-4" />
              Download Android App
            </a>
            <p className="text-center text-[10px] text-white/20 mt-1.5">Free · No Play Store needed · Enable &ldquo;Install unknown apps&rdquo;</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
