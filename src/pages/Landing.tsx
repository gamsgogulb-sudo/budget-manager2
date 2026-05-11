import React from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { Wallet } from 'lucide-react';

export default function Landing() {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen bg-[#F5F5F7] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Frosted Glass Background & Noise Texture */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Animated Blue & Purple Gradients */}
        <motion.div
          animate={{
            x: [0, 60, -40, 0],
            y: [0, 80, 40, 0],
            scale: [1, 1.4, 1],
          }}
          transition={{
            duration: 12,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[-15%] left-[-10%] w-[85%] h-[85%] bg-blue-500/20 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            x: [0, -80, -40, 0],
            y: [0, -60, -100, 0],
            scale: [1, 1.3, 1.5, 1],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute bottom-[-10%] right-[-10%] w-[75%] h-[75%] bg-purple-400/20 rounded-full blur-[100px]"
        />
        <motion.div
          animate={{
            scale: [1, 1.8, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute top-[15%] right-[5%] w-[50%] h-[50%] bg-indigo-400/20 rounded-full blur-[120px]"
        />

        {/* Noise Texture Overlay - Increased visibility */}
        <div className="absolute inset-0 opacity-[0.12] mix-blend-soft-light pointer-events-none">
          <svg viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
            <filter id="noiseFilter">
              <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch" />
              <feColorMatrix type="saturate" values="0" />
            </filter>
            <rect width="100%" height="100%" filter="url(#noiseFilter)" />
          </svg>
        </div>

        {/* Global Frost Layer */}
        <div className="absolute inset-0 backdrop-blur-[40px] bg-white/20" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center w-full max-w-sm relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="w-full flex flex-col items-center"
        >
          {/* Floating Logo Icon */}
          <motion.div
            animate={{ y: [0, -12, 0] }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="w-24 h-24 bg-[#1D1D1F] rounded-[2.2rem] flex items-center justify-center mb-10 shadow-2xl shadow-black/15"
          >
            <Wallet className="text-white w-12 h-12" />
          </motion.div>
          
          {/* Service Name */}
          <div className="text-center mb-16">
            <h1 className="text-5xl font-black text-[#1D1D1F] tracking-[-0.05em] mb-4">
              GULBZZUS
            </h1>
            <p className="text-[#86868B] font-bold text-[13px] uppercase tracking-[0.4em] opacity-80">
              Budget Manager
            </p>
          </div>

          {/* Google Login Button - Reduced width and balanced style */}
          <button
            onClick={signIn}
            className="w-[85%] bg-white/40 backdrop-blur-md text-[#1D1D1F] border border-white/60 rounded-[1.5rem] h-16 font-semibold flex items-center justify-center gap-4 hover:bg-white/60 hover:border-white transition-all active:scale-[0.98] shadow-[0_4px_24px_rgba(0,0,0,0.06)] group"
          >
            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 group-hover:scale-110 transition-transform">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
            </div>
            <span className="text-[15px] tracking-tight">Google 로 로그인</span>
          </button>
        </motion.div>
      </div>

      {/* Version Info at the bottom */}
      <footer className="py-8 relative z-10">
        <p className="text-[10px] text-[#86868B] font-bold tracking-[0.2em] opacity-40">
          V1.1.0
        </p>
      </footer>
    </div>
  );
}
