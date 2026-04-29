import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

interface LiveChatProps {
  messages: { role: 'user' | 'model'; text: string }[];
}

export function LiveChat({ messages }: LiveChatProps) {
  return (
    <ScrollArea className="h-[400px] pr-4">
      <div className="flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "flex flex-col gap-1 max-w-[85%]",
                msg.role === 'user' ? "self-end items-end" : "self-start items-start"
              )}
            >
              <Badge variant={msg.role === 'user' ? "outline" : "secondary"} className="w-fit">
                {msg.role === 'user' ? "You" : "AI"}
              </Badge>
              <div className={cn(
                "p-3 rounded-2xl text-sm shadow-sm",
                msg.role === 'user' 
                  ? "bg-primary text-primary-foreground rounded-tr-none" 
                  : "bg-card border rounded-tl-none"
              )}>
                {msg.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-50 py-20">
            <p className="text-sm italic">Transcriptions will appear here...</p>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
