import React from 'react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'motion/react';
import { CreditCard, Shield, TrendingUp, Users } from 'lucide-react';

export default function Landing() {
  const { signIn } = useAuth();

  return (
    <div className="min-h-screen bg-[#F9F7F2] flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#EAE7E0] via-[#F9F7F2] to-[#F9F7F2]">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl shadow-[#D9D4C7]/50 p-10 text-center border border-[#EAE7E0]"
      >
        <div className="w-20 h-20 bg-[#6B705C] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-[#6B705C]/30">
          <CreditCard className="text-white w-10 h-10" />
        </div>
        
        <h1 className="text-4xl font-display font-bold text-[#5C544E] mb-3 tracking-tight">MoMoney</h1>
        <p className="text-gray-400 mb-10 font-bold uppercase text-[10px] tracking-[0.2em]">Authentic Asset Management</p>

        <div className="space-y-5 mb-12 text-left">
          <Feature icon={Shield} text="자연스러운 자산 데이터 동기화" />
          <Feature icon={Users} text="함께 나누는 공유용 모드" />
          <Feature icon={TrendingUp} text="투자 포트폴리오 감각적 관리" />
        </div>

        <button
          onClick={signIn}
          className="w-full bg-[#5C544E] text-white rounded-2xl py-4.5 font-bold flex items-center justify-center gap-4 hover:bg-[#3D3D3D] transition-all shadow-xl hover:translate-y-[-2px]"
        >
          <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-6 h-6" alt="Google" />
          구글 계정으로 연동하기
        </button>

        <p className="mt-8 text-[10px] text-gray-400 font-bold uppercase tracking-wider">
          Managed by WiseLedger Studio
        </p>
      </motion.div>
    </div>
  );
}

function Feature({ icon: Icon, text }: { icon: any, text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="p-2 bg-slate-100 rounded-lg">
        <Icon className="w-4 h-4 text-primary-600" />
      </div>
      <span className="text-sm font-medium text-slate-700">{text}</span>
    </div>
  );
}
