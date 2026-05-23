'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Mail, Zap, ArrowLeft, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { NeonInput } from '@/components/ui/NeonInput';
import { NeonButton } from '@/components/ui/NeonButton';
import toast from 'react-hot-toast';

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    try {
      await resetPassword(email);
      setSent(true);
      toast.success('Reset email sent!');
    } catch (err: unknown) {
      toast.error((err as Error).message ?? 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div
          className="rounded-2xl border border-white/10 p-8 space-y-6"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #00d4ff, #a855f7)' }}>
              <Zap className="w-7 h-7 text-black" />
            </div>
            <div className="text-center">
              <h1 className="text-xl font-bold text-white">Reset Password</h1>
              <p className="text-white/40 text-sm mt-1">
                {sent ? 'Check your inbox' : "We'll send you a reset link"}
              </p>
            </div>
          </div>

          {sent ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <CheckCircle className="w-12 h-12 text-green-400" />
              <p className="text-white/60 text-sm text-center">
                A password reset link has been sent to <strong className="text-white">{email}</strong>.
                Check your inbox and follow the instructions.
              </p>
              <NeonButton variant="secondary" onClick={() => setSent(false)}>
                Send again
              </NeonButton>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <NeonInput
                label="Email"
                type="email"
                placeholder="you@example.com"
                icon={<Mail className="w-4 h-4" />}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <NeonButton type="submit" fullWidth loading={loading} glow>
                Send Reset Link
              </NeonButton>
            </form>
          )}

          <Link href="/login" className="flex items-center justify-center gap-2 text-sm text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Back to sign in
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
