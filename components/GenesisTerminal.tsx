'use client';

import React, { useState, useEffect } from 'react';
import { Press_Start_2P } from 'next/font/google';

const pressStart2P = Press_Start_2P({ weight: '400', subsets: ['latin'] });

export const GenesisTerminal: React.FC = () => {
  const [bootText, setBootText] = useState('');
  const fullText = 'CAMELOT-OS // 16-BIT BLAST PROCESSING ACTIVE...';

  useEffect(() => {
    let i = 0;
    const typing = setInterval(() => {
      setBootText(fullText.slice(0, i));
      i++;
      if (i > fullText.length) clearInterval(typing);
    }, 100);
    return () => clearInterval(typing);
  }, []);

  return (
    <div className="relative w-full h-screen bg-black overflow-hidden flex items-center justify-center selection:bg-[#FF00FF] selection:text-white">

      {/* CRT scanline overlay */}
      <div
        className="pointer-events-none absolute inset-0 z-50 opacity-20 mix-blend-overlay"
        style={{
          backgroundImage:
            'linear-gradient(rgba(18,16,16,0) 50%, rgba(0,0,0,0.25) 50%), linear-gradient(90deg, rgba(255,0,0,0.06), rgba(0,255,0,0.02), rgba(0,0,255,0.06))',
          backgroundSize: '100% 4px, 6px 100%',
        }}
      />

      {/* Vignette + bezel */}
      <div className="pointer-events-none absolute inset-0 z-40 shadow-[inset_0_0_100px_rgba(0,0,0,0.9)] rounded-[2rem] border-[16px] border-[#1a1a1a]" />

      {/* 320×224 render window — 2× pixel-doubled, responsive */}
      <div className="relative w-full max-w-[640px] aspect-[640/448] bg-[#0000AA] border-4 border-[#FFFFFF] p-6 shadow-[8px_8px_0px_#000000] flex flex-col justify-between">

        {/* Header */}
        <div className="flex justify-between items-center border-b-4 border-[#FFFFFF] pb-4">
          <h1
            className={`${pressStart2P.className} text-[#FFFF00] text-xl drop-shadow-[2px_2px_0px_#000000]`}
          >
            OMNI-ROUTER
          </h1>
          <div className="flex gap-2">
            <div className="w-4 h-4 bg-[#FF0000] border-2 border-white animate-pulse" />
            <div className="w-4 h-4 bg-[#00FF00] border-2 border-white" />
          </div>
        </div>

        {/* Terminal output */}
        <div className="flex-grow py-6">
          <p className={`${pressStart2P.className} text-[#FFFFFF] text-sm leading-loose drop-shadow-[2px_2px_0px_#000000]`}>
            {bootText}
            <span className="animate-blink inline-block w-3 h-4 bg-[#FFFFFF] ml-2 align-middle" />
          </p>

          {bootText.length === fullText.length && (
            <div className="mt-8 space-y-4 animate-fade-in">
              <p className={`${pressStart2P.className} text-[#00FFFF] text-xs drop-shadow-[2px_2px_0px_#000000]`}>
                &gt; VRAM: 64KB [PACKED]
              </p>
              <p className={`${pressStart2P.className} text-[#00FFFF] text-xs drop-shadow-[2px_2px_0px_#000000]`}>
                &gt; DAG: CONVEX
              </p>
              <p className={`${pressStart2P.className} text-[#00FFFF] text-xs drop-shadow-[2px_2px_0px_#000000]`}>
                &gt; AWAITING INPUT...
              </p>
            </div>
          )}
        </div>

        {/* Action button */}
        <button
          className={`${pressStart2P.className} w-full py-4 bg-[#FF00FF] text-white text-sm border-4 border-white hover:bg-[#FFFFFF] hover:text-[#FF00FF] hover:border-[#FF00FF] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none shadow-[4px_4px_0px_#000000]`}
        >
          PRESS START
        </button>

      </div>
    </div>
  );
};
