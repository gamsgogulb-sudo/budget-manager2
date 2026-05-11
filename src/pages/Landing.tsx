import React from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { CreditCard, Shield, TrendingUp, Users } from 'lucide-react';

export default function Landing() {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_-20%,#E3F2FD,transparent)] pointer-events-none" />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-[0_8px_40px_rgba(0,0,0,0.06)] p-10 text-center border border-gray-100 relative z-10"
      >
        <div className="w-20 h-20 bg-[#007AFF] rounded-[1.25rem] flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-500/30">
          <CreditCard className="text-white w-10 h-10" />
        </div>
        
        <h1 className="text-4xl font-bold text-[#1D1D1F] mb-2 tracking-tight">MoMoney</h1>
        <p className="text-[#86868B] mb-10 font-medium text-xs uppercase tracking-widest">Minimal Asset Management</p>

        <div className="space-y-4 mb-12 text-left px-2">
          <Feature icon={Shield} text="보안이 강화된 클라우드 데이터 동기화" />
          <Feature icon={Users} text="가족, 친구와 함께 관리하는 공유 모드" />
          <Feature icon={TrendingUp} text="한눈에 파악하는 투자 대시보드" />
        </div>

        <button
          onClick={signIn}
          className="w-full bg-[#1D1D1F] text-white rounded-2xl h-14 font-semibold flex items-center justify-center gap-4 hover:bg-black transition-all active:scale-[0.98] shadow-lg"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
          Google 계정으로 시작하기
        </button>

        <p className="mt-8 text-[11px] text-[#86868B] font-medium tracking-wide">
          Designed by WiseLedger Studio in Seoul
        </p>
      </motion.div>
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: any, text: string }) {
  return (
    <div className="flex items-center gap-4">
      <div className="p-2 bg-[#F5F5F7] rounded-xl">
        <Icon className="w-4 h-4 text-[#007AFF]" />
      </div>
      <span className="text-sm font-medium text-[#1D1D1F]">{text}</span>
    </div>
  );
}
