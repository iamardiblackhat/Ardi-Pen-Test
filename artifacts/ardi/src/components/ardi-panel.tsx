import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Bot, Command } from 'lucide-react';
import { ArdiAvatar, type ArdiMood } from '@/components/ardi-avatar';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@workspace/ardi-ds/components/ui/sheet';
import { ArdiChatView } from '@/features/ardi/components/ardi-chat-view';
import { ArdiCommandCenter } from '@/features/ardi/components/ardi-command-center';
import { cn } from '@workspace/ardi-ds/lib/utils';

type ArdiPanelProps = {
  open: boolean;
  onClose: () => void;
  context?: string;
  authenticated?: boolean;
};

export function ArdiPanel({
  open,
  onClose,
  context,
  authenticated = true,
}: ArdiPanelProps) {
  const [mode, setMode] = useState<'chat' | 'commands'>('chat');

  return (
    <Sheet
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <SheetContent
        side="right"
        className="flex h-dvh w-full flex-col gap-0 border-violet-300/20 bg-[radial-gradient(circle_at_75%_0%,rgba(99,102,241,.32),transparent_30%),linear-gradient(180deg,#17113a,#0e0b24)] p-0 text-white sm:max-w-lg"
      >
        <SheetHeader className="border-b border-violet-200/15 px-4 pb-4 pt-5 text-left">
          <div className="flex items-center gap-3 pr-9">
            <ArdiAvatar mood="idle" size={42} />
            <div>
              <SheetTitle className="text-lg text-white">ARDI SEC command</SheetTitle>
              <SheetDescription className="text-xs text-cyan-100/70">
                Site-wide security assistant
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div
          className="grid grid-cols-2 border-b border-violet-200/15 p-2"
          role="tablist"
          aria-label="ARDI mode"
        >
          <ModeButton
            active={mode === 'chat'}
            icon={Bot}
            label="Chat"
            onClick={() => setMode('chat')}
          />
          <ModeButton
            active={mode === 'commands'}
            icon={Command}
            label="Execute"
            onClick={() => setMode('commands')}
          />
        </div>

        {mode === 'chat' ? (
          <ArdiChatView open={open} authenticated={authenticated} context={context} />
        ) : (
          <ArdiCommandCenter authenticated={authenticated} onClose={onClose} />
        )}
      </SheetContent>
    </Sheet>
  );
}

function ModeButton({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: typeof Bot;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'flex min-h-11 items-center justify-center gap-2 rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200',
        active
          ? 'bg-violet-500/25 text-white'
          : 'text-indigo-100/55 hover:text-white',
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

export function ArdiLauncher({
  onClick,
  mood = 'idle',
  className,
}: {
  onClick: () => void;
  mood?: ArdiMood;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.button
      type="button"
      onClick={onClick}
      aria-label="Open ARDI"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={reduceMotion ? undefined : { scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      transition={{ type: 'spring', stiffness: 400, damping: 20 }}
      className={cn(
        'fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-600 shadow-[0_16px_45px_rgba(79,70,229,.45)] ring-1 ring-cyan-200/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200 focus-visible:ring-offset-2',
        className,
      )}
    >
      <ArdiAvatar mood={mood} size={36} />
    </motion.button>
  );
}
