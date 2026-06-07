'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { Upload, Sparkles, FileText, Calendar, MapPin, AlignLeft, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { NeonButton } from '@/components/ui/NeonButton';
import { parseInvite, ParsedInvite } from '@/lib/inviteParser';
import { geminiAvailable } from '@/lib/gemini';
import toast from 'react-hot-toast';

interface InviteImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (events: ParsedInvite[]) => Promise<void> | void;
}

export const InviteImportModal: React.FC<InviteImportModalProps> = ({ isOpen, onClose, onImport }) => {
  const [text, setText] = useState('');
  const [parsing, setParsing] = useState(false);
  const [preview, setPreview] = useState<ParsedInvite[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const hasGemini = geminiAvailable();

  const reset = () => {
    setText(''); setPreview(null); setError(null); setParsing(false); setSaving(false);
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const content = await f.text();
    setText(content);
    // Auto-parse if it's an ICS file
    if (content.trim().startsWith('BEGIN:VCALENDAR')) handleParse(content);
  };

  const handleParse = async (src?: string) => {
    const input = (src ?? text).trim();
    if (!input) { setError('Paste invite text or drop an .ics file first.'); return; }
    setParsing(true);
    setError(null);
    try {
      const events = await parseInvite(input);
      setPreview(events);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not parse the invite.');
    } finally {
      setParsing(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview) return;
    setSaving(true);
    try {
      await onImport(preview);
      toast.success(`Imported ${preview.length} event${preview.length !== 1 ? 's' : ''}`);
      reset();
      onClose();
    } catch {
      toast.error('Could not save the events.');
    } finally {
      setSaving(false);
    }
  };

  const fmtDate = (iso: string, allDay: boolean) => {
    const d = new Date(iso);
    return allDay
      ? d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
      : d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Modal isOpen={isOpen} onClose={() => { reset(); onClose(); }} title="Import event from invite" size="lg">
      {!preview ? (
        <div className="space-y-4">
          {/* File drop */}
          <div className="border border-dashed border-[#444444] rounded-xl p-5 text-center hover:border-white transition-colors">
            <input ref={fileRef} type="file" accept=".ics,text/calendar" onChange={handleFile} className="hidden" />
            <Upload className="w-6 h-6 text-white/40 mx-auto mb-2" />
            <p className="text-sm text-white mb-1">Drop an .ics file or browse</p>
            <p className="text-[11px] text-white/40 mb-3">From Google Calendar, Outlook, Apple Calendar, anything</p>
            <NeonButton size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
              Choose file
            </NeonButton>
          </div>

          {/* OR paste text */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-white/40" />
              <label className="text-xs uppercase tracking-wider text-white/50 font-medium">
                Or paste invite text {hasGemini ? '(AI-parsed)' : '(requires Gemini key)'}
              </label>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={hasGemini
                ? "e.g. \"Hey team, let's meet Wednesday at 3pm in the boardroom to review Q3 numbers. Zoom link: https://...\""
                : "Configure Gemini in Settings → Integrations to enable AI parsing for free-form text."}
              rows={6}
              className="w-full bg-black border border-[#444444] rounded-xl text-white placeholder:text-[#555555] px-3 py-2.5 text-sm focus:outline-none focus:border-white resize-y min-h-[120px]"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded-xl">{error}</p>
          )}

          <div className="flex gap-2">
            <NeonButton variant="ghost" onClick={() => { reset(); onClose(); }} className="flex-1">Cancel</NeonButton>
            <NeonButton
              onClick={() => handleParse()}
              loading={parsing}
              disabled={!text.trim() || parsing}
              icon={<Sparkles className="w-3.5 h-3.5" />}
              glow
              className="flex-1"
            >
              {parsing ? 'Parsing…' : 'Parse'}
            </NeonButton>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-white/50 uppercase tracking-wider">
            Preview ({preview.length} event{preview.length !== 1 ? 's' : ''})
          </p>
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {preview.map((e, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="p-3 rounded-xl bg-[#111111] border border-[#333333]"
              >
                <p className="text-sm font-semibold text-white">{e.title}</p>
                <div className="mt-1 space-y-0.5 text-xs text-white/60">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 text-white/40" />
                    <span>{fmtDate(e.startDate, e.allDay)} → {fmtDate(e.endDate, e.allDay)}</span>
                  </div>
                  {e.location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3 h-3 text-white/40" />
                      <span className="truncate">{e.location}</span>
                    </div>
                  )}
                  {e.description && (
                    <div className="flex items-start gap-1.5">
                      <AlignLeft className="w-3 h-3 text-white/40 mt-0.5 flex-shrink-0" />
                      <span className="text-white/40 line-clamp-2">{e.description}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
          <div className="flex gap-2 pt-1">
            <NeonButton variant="ghost" onClick={() => { setPreview(null); setError(null); }} className="flex-1">Back</NeonButton>
            <NeonButton onClick={handleConfirm} loading={saving} glow className="flex-1">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : `Create ${preview.length} event${preview.length !== 1 ? 's' : ''}`}
            </NeonButton>
          </div>
        </div>
      )}
    </Modal>
  );
};
