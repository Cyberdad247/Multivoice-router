import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from './ui/dialog';
import { Button } from './ui/button';
import { 
  CheckCircle2, 
  AlertCircle, 
  XCircle, 
  Loader2, 
  RefreshCw,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { runDiagnostics } from '../services/diagnosticService';
import { DiagnosticResult } from '../types/diagnostics';
import { motion, AnimatePresence } from 'motion/react';

interface DiagnosticDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DiagnosticDialog({ isOpen, onClose }: DiagnosticDialogProps) {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const performCheck = async () => {
    setIsLoading(true);
    try {
      const data = await runDiagnostics();
      setResults(data);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      performCheck();
    }
  }, [isOpen]);

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    switch (status) {
      case 'ok': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      case 'loading': return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            System Diagnostics
          </DialogTitle>
          <DialogDescription>
            Troubleshoot security, network, and cloud integrations.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center py-12 space-y-4"
              >
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-medium">Running system integrity checks...</p>
              </motion.div>
            ) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-3"
              >
                {results.map((result) => (
                  <div key={result.id} className="p-3 rounded-lg border bg-secondary/50 border-border group transition-all hover:bg-secondary">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">{getStatusIcon(result.status)}</div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-bold">{result.name}</p>
                          {result.actionLabel && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-6 text-[10px] px-2 gap-1"
                              onClick={() => result.actionPath && window.open(result.actionPath)}
                            >
                              {result.actionLabel}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </Button>
                          )}
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{result.message}</p>
                        
                        {result.status !== 'ok' && result.troubleshootingSteps && (
                          <div className="pt-2 space-y-1">
                            <p className="text-[9px] font-bold uppercase text-muted-foreground tracking-wider">Troubleshooting</p>
                            <ul className="text-[10px] space-y-1 list-disc pl-3 text-muted-foreground/80">
                              {result.troubleshootingSteps.map((step, i) => (
                                <li key={i}>{step}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <DialogFooter className="sm:justify-between flex items-center gap-3">
          <p className="text-[10px] text-muted-foreground hidden sm:block">
            Everything looks okay? <span className="font-medium text-foreground">App status: Operational</span>
          </p>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button variant="outline" size="sm" className="flex-1 sm:flex-none gap-2" onClick={performCheck} disabled={isLoading}>
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Re-run
            </Button>
            <Button size="sm" className="flex-1 sm:flex-none" onClick={onClose}>Close</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
