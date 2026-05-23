'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, Lock, User, Zap, Chrome } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NeonInput } from '@/components/ui/NeonInput';
import { NeonButton } from '@/components/ui/NeonButton';
import toast from 'react-hot-toast';

const schema = z.object({
  displayName: z.string().min(2, 'Name must be at least 2 characters'),
  email:       z.string().email('Invalid email'),
  password:    z.string().min(8, 'Password must be at least 8 characters'),
  confirm:     z.string(),
}).refine((d) => d.password === d.confirm, { message: "Passwords don't match", path: ['confirm'] });

type FormData = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const { signUp, signInWithGoogle } = useAuth();
  const [googleLoading, setGoogleLoading] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    try {
      await signUp(data.email, data.password, data.displayName);
      router.push('/dashboard');
      toast.success('Welcome to NEXUS!');
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Registration failed');
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      router.push('/dashboard');
      toast.success('Welcome to NEXUS!');
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Google sign in failed');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #a855f7, transparent)' }} />
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 rounded-full blur-3xl opacity-10"
          style={{ background: 'radial-gradient(circle, #00d4ff, transparent)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-md"
      >
        <div
          className="rounded-2xl border border-white/10 p-8 space-y-6"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6), 0 0 1px rgba(255,255,255,0.1)',
          }}
        >
          <div className="flex flex-col items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #a855f7, #00d4ff)', boxShadow: '0 0 30px rgba(168,85,247,0.3)' }}
            >
              <Zap className="w-7 h-7 text-black" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white tracking-widest font-orb">NEXUS</h1>
              <p className="text-white/40 text-sm mt-1">Create your account</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <NeonInput
              label="Display Name"
              placeholder="John Doe"
              icon={<User className="w-4 h-4" />}
              error={errors.displayName?.message}
              {...register('displayName')}
            />
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
              placeholder="Min 8 characters"
              icon={<Lock className="w-4 h-4" />}
              error={errors.password?.message}
              {...register('password')}
            />
            <NeonInput
              label="Confirm Password"
              type="password"
              placeholder="Repeat password"
              icon={<Lock className="w-4 h-4" />}
              error={errors.confirm?.message}
              {...register('confirm')}
            />
            <NeonButton type="submit" fullWidth loading={isSubmitting} glow size="lg">
              Create Account
            </NeonButton>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-xs text-white/30">or</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          <NeonButton
            variant="secondary"
            fullWidth
            loading={googleLoading}
            onClick={handleGoogle}
            icon={<Chrome className="w-4 h-4" />}
          >
            Continue with Google
          </NeonButton>

          <p className="text-center text-sm text-white/40">
            Already have an account?{' '}
            <Link href="/login" className="text-[var(--accent)] hover:text-white transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
