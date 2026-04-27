import React from 'react';

const formatComma = (num) => {
  if (!num && num !== 0) return '';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const parseComma = (str) => {
  if (!str) return 0;
  return parseInt(str.toString().replace(/,/g, '')) || 0;
};

const BusCard = ({ title, img, type, qty, price, desc, color, adjustQty, handleChange }) => (
  <div className="group bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden hover:shadow-xl transition-all p-4">
    <div className="flex gap-4 mb-4">
      <div className="w-24 h-24 rounded-xl overflow-hidden shrink-0 border border-white shadow-sm">
        <img className="w-full h-full object-cover" src={img} alt={title} />
      </div>
      <div className="flex-1">
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-1 text-white bg-${color}`}>
          {title.split(' ')[0]}
        </div>
        <h4 className="font-bold text-slate-800 text-sm">{title}</h4>
        <p className="text-[10px] text-slate-400 mt-1">{desc}</p>
      </div>
    </div>
    
    <div className="space-y-3 pt-3 border-t border-slate-200/50">
      <div className="flex items-center justify-between">
         <span className="text-[11px] font-bold text-slate-500 uppercase">차량 대수</span>
         <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-full px-2 py-1">
           <button type="button" onClick={() => adjustQty(`${type}Qty`, -1)} className="w-6 h-6 rounded-full hover:bg-slate-100 text-primary flex items-center justify-center">
             <span className="material-symbols-outlined text-[14px]">remove</span>
           </button>
           <span className="text-sm font-black w-4 text-center">{qty}</span>
           <button type="button" onClick={() => adjustQty(`${type}Qty`, 1)} className="w-6 h-6 rounded-full hover:bg-slate-100 text-primary flex items-center justify-center">
             <span className="material-symbols-outlined text-[14px]">add</span>
           </button>
         </div>
      </div>

      <div>
         <p className="text-[11px] font-bold text-slate-500 uppercase mb-1">버스 가격 (1대당)</p>
         <div className="relative">
           <input 
             type="text"
             name={`${type}Price`}
             value={formatComma(price)}
             onChange={handleChange}
             placeholder="0"
             className="w-full bg-white border border-slate-200 rounded-lg p-2 text-right pr-6 font-bold text-primary focus:ring-2 focus:ring-primary/20 transition-all"
           />
           <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">원</span>
         </div>
      </div>
    </div>
  </div>
);

const BusReRegistrationModal = ({ reqId, onClose, onSuccess }) => {
  const [qtys, setQtys] = React.useState({
    premiumQty: 0,
    standardQty: 0,
    premiumGoldQty: 0,
    vvipQty: 0,
    miniBusQty: 0,
    largeVanQty: 0,
  });
  const [prices, setPrices] = React.useState({
    premiumPrice: 0,
    standardPrice: 0,
    premiumGoldPrice: 0,
    vvipPrice: 0,
    miniBusPrice: 0,
    largeVanPrice: 0,
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const adjustQty = (name, delta) => {
    setQtys(prev => ({ ...prev, [name]: Math.max(0, prev[name] + delta) }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setPrices(prev => ({ ...prev, [name]: parseComma(value) }));
  };

  const totalAmount = 
    (qtys.premiumQty * prices.premiumPrice) +
    (qtys.standardQty * prices.standardPrice) +
    (qtys.premiumGoldQty * prices.premiumGoldPrice) +
    (qtys.vvipQty * prices.vvipPrice) +
    (qtys.miniBusQty * prices.miniBusPrice) +
    (qtys.largeVanQty * prices.largeVanPrice);

  const handleSubmit = async () => {
    const vehicles = [
      { type: 'PREMIUM_28', qty: qtys.premiumQty, price: prices.premiumPrice },
      { type: 'STANDARD_45', qty: qtys.standardQty, price: prices.standardPrice },
      { type: 'GOLD_21', qty: qtys.premiumGoldQty, price: prices.premiumGoldPrice },
      { type: 'VVIP_16', qty: qtys.vvipQty, price: prices.vvipPrice },
      { type: 'MINI_25', qty: qtys.miniBusQty, price: prices.miniBusPrice },
      { type: 'VAN_11', qty: qtys.largeVanQty, price: prices.largeVanPrice }
    ].filter(v => v.qty > 0);

    if (vehicles.length === 0) {
      alert('최소 1대 이상의 차량을 선택해주세요.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('http://localhost:8080/api/auction/re-register-bus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reqId, vehicles })
      });

      if (response.ok) {
        alert('새로운 버스가 성공적으로 등록되었습니다.');
        onSuccess();
      } else {
        const err = await response.json();
        alert(err.error || '등록 실패');
      }
    } catch (e) {
      alert('통통신 오류');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <header className="px-10 py-8 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-md z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tighter">새로운 차량 선택</h2>
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest">Bus Re-registration for REQ: {reqId}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-50 flex items-center justify-center transition-colors">
            <span className="material-symbols-outlined text-slate-400">close</span>
          </button>
        </header>

        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[60vh]">
          <BusCard title="프리미엄 골드 (21석)" img="/images/buses/premium_gold.png" type="premiumGold" qty={qtys.premiumGoldQty} price={prices.premiumGoldPrice} color="[#D4AF37]" adjustQty={adjustQty} handleChange={handleChange} desc="최고급 전용 좌석" />
          <BusCard title="V-VIP 리무진 (16석)" img="/images/buses/v_vip.png" type="vvip" qty={qtys.vvipQty} price={prices.vvipPrice} color="black" adjustQty={adjustQty} handleChange={handleChange} desc="최상위 의전용 차량" />
          <BusCard title="우등 고속 (28석)" img="https://lh3.googleusercontent.com/aida-public/AB6AXuAGncAn9mwP0CppdRcVNcRyyp7BM0Fwr-7IAo-UukujgT7dSh2z_8Ba0-8jHE15cYFNL1CW_lTPzVeSOiKP9OvIwyPH7sUwITsY_pZIwfEo8Us4ucyhl70uOHt6njBNLkODWl9T37DIWWsUWRerSxgzmhYBw7L-a45ye0ewYfPS9sY9Dj9O2wx2Q62XKSoHR7t0ol0eOTUQGqVGpnA0hqylsq4zJc6AmqSUSV_9IzmJGprI0TaVm5kP2ih028fYvHDVfAjM1oqvTLE" type="premium" qty={qtys.premiumQty} price={prices.premiumPrice} color="primary" adjustQty={adjustQty} handleChange={handleChange} desc="안락한 우등 버스" />
          <BusCard title="일반 고속 (45석)" img="https://lh3.googleusercontent.com/aida-public/AB6AXuAfK78k5ZUsYSniO-ql0ZmiRyc1AoDCtW69CIjw1G3fTvwXaM1WWnx61DQshz68pgzkuOrTbpW-B4_scGSd1XIdySNfhJkSxYFdvur9B5KpmX3CYtQox2eqsSZz0jRCDYbDnLr6cuy_GAOlx3wl7CJW_h2BtJGU-zroRQYQy35IvU5-eweGfcCFLRdaOkScLoUdn4B3rdiS4Mb-7xWuAHQKFhKLuIBuk654T5MMPKbt2cIwMoS1KcLILRtEGlFw4wBHN2o_oisl0go" type="standard" qty={qtys.standardQty} price={prices.standardPrice} color="slate-400" adjustQty={adjustQty} handleChange={handleChange} desc="합리적인 단체 이동" />
          <BusCard title="중형 미니버스 (25석)" img="/images/buses/mini_bus.png" type="miniBus" qty={qtys.miniBusQty} price={prices.miniBusPrice} color="secondary" adjustQty={adjustQty} handleChange={handleChange} desc="소규모 실속 여정" />
          <BusCard title="대형 밴 (11석)" img="/images/buses/large_van.png" type="largeVan" qty={qtys.largeVanQty} price={prices.largeVanPrice} color="primary" adjustQty={adjustQty} handleChange={handleChange} desc="소수 VIP 전문 차량" />
        </div>

        <footer className="px-10 py-8 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Estimated Amount</p>
            <p className="text-3xl font-black text-white tracking-tighter">
              <span className="text-primary text-xl mr-1">₩</span>
              {formatComma(totalAmount)}
            </p>
          </div>
          <button 
            onClick={handleSubmit}
            disabled={isSubmitting || totalAmount === 0}
            className="px-10 py-4 bg-white text-slate-900 font-black rounded-2xl hover:bg-primary hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
          >
            새로운 버스로 등록 완료
          </button>
        </footer>
      </div>
    </div>
  );
};

export default BusReRegistrationModal;
