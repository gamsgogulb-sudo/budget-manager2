import React from 'react';
import { Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Config() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div className="flex flex-col items-center text-center space-y-4 mb-4">
        <div className="w-16 h-16 bg-[#6B705C] rounded-2xl flex items-center justify-center text-white shadow-lg">
          <Settings className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-display font-bold text-[#56514D]">설정</h1>
        <p className="text-sm text-gray-400 font-medium">서비스 이용에 필요한 설정을 관리합니다.</p>
      </div>

      <div className="bg-white rounded-3xl border border-[#EAE7E0] shadow-sm overflow-hidden">
        <div className="p-8 space-y-8">
          <div className="text-center space-y-2">
            <p className="text-sm font-bold text-[#5C544E]">현재 버전 1.0.0 (Beta)</p>
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">더욱 다양한 기능이 준비 중입니다.</p>
          </div>

          <button 
            onClick={handleLogout}
            className="w-full p-5 flex items-center justify-center gap-3 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl transition-all font-bold border border-rose-100 group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span>로그아웃</span>
          </button>
        </div>
      </div>

      <div className="p-8 bg-[#F9F7F2]/50 border border-dashed border-[#EAE7E0] rounded-3xl text-center">
        <p className="text-sm font-bold text-gray-400 italic">"더욱 정교한 자산 관리 설정을 위해 준비 중입니다."</p>
      </div>
    </div>
  );
}
