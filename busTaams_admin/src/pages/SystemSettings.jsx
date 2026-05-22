import React from 'react';
import { Check, RefreshCw, Headphones, Zap, Crown, Percent } from 'lucide-react';

const SystemSettings = () => {
  const plans = [
    {
      id: 'general',
      name: '일반',
      description: '안정적인 시작을 위한 선택',
      price: '300,000',
      features: [
        { icon: <Check className="w-5 h-5 text-[#0D3E35]" />, text: '월 10회 입찰 참여권' },
        { icon: <RefreshCw className="w-5 h-5 text-slate-500" />, text: '환불: 잔여일수 × ₩10,000' },
        { icon: <Headphones className="w-5 h-5 text-slate-400" />, text: '표준 고객 지원' }
      ]
    },
    {
      id: 'intermediate',
      name: '중급',
      description: '본격적인 비즈니스 확장',
      price: '500,000',
      features: [
        { icon: <Check className="w-5 h-5 text-[#0D3E35]" />, text: '월 20회 입찰 참여권' },
        { icon: <RefreshCw className="w-5 h-5 text-slate-500" />, text: '환불: 잔여일수 × ₩17,000' },
        { icon: <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />, text: '경매 알림 우선순위 배정' }
      ]
    },
    {
      id: 'advanced',
      name: '고급',
      description: '★ 베스트 밸류',
      price: '800,000',
      features: [
        { icon: <Check className="w-5 h-5 text-[#0D3E35]" />, text: '월 30회 입찰 참여권' },
        { icon: <RefreshCw className="w-5 h-5 text-slate-500" />, text: '환불: 잔여일수 × ₩27,000' },
        { icon: <Crown className="w-5 h-5 text-amber-600 fill-amber-600" />, text: 'VIP 전담 매니저 배정' },
        { icon: <Percent className="w-5 h-5 text-[#0D3E35]" />, text: '수수료 5% 추가 할인' }
      ]
    }
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto font-sans min-h-[calc(100vh-160px)] bg-slate-50/50">
      {/* 상단 타이틀 */}
      <div className="text-center md:text-left mb-12">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#0D3E35] tracking-tight">
          버스탐스 멤버쉽 상품입니다.
        </h1>
      </div>

      {/* 요금제 카드 리스트 (가로 배치) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="flex flex-col justify-between bg-white rounded-3xl p-8 border border-slate-100 shadow-sm relative"
          >
            <div>
              {/* 타이틀 및 서브 타이틀 */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 tracking-tight">
                    {plan.name}
                  </h3>
                  <p className="text-xs mt-1.5 font-medium text-slate-400">
                    {plan.description}
                  </p>
                </div>
                
                {/* 가격 표시 */}
                <div className="text-right">
                  <span className="text-2xl font-black text-[#0D3E35] tracking-tight">
                    ₩{plan.price}
                  </span>
                  <span className="text-xs text-slate-400 font-medium block">/ 월</span>
                </div>
              </div>

              <hr className="border-slate-100 my-6" />

              {/* 특징 리스트 */}
              <ul className="space-y-4 mb-8">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-3.5 text-sm text-slate-600 font-medium">
                    <span className="flex-shrink-0 p-1 bg-slate-50 rounded-lg">
                      {feature.icon}
                    </span>
                    <span>{feature.text}</span>
                  </li>
                ))}
              </ul>
            </div>

            </div>
        ))}
      </div>
    </div>
  );
};

export default SystemSettings;
