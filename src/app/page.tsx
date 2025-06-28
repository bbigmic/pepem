'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/i18n/LanguageContext';
import { Language } from '@/i18n/translations';
import { PaymentButton } from '@/components/PaymentButton';

export default function Home() {
  const router = useRouter();
  const { t, language, setLanguage } = useLanguage();
  const [formData, setFormData] = useState({
    ai1Role: '',
    ai2Role: '',
    initialTopic: ''
  });
  const [isPaid, setIsPaid] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [time, setTime] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: e.clientX / window.innerWidth,
        y: e.clientY / window.innerHeight
      });
    };

    const animationFrame = requestAnimationFrame(() => {
      setTime(prev => (prev + 0.01) % 1);
    });

    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isPaid) {
      alert('Please complete the payment first');
      return;
    }
    const roomId = Math.random().toString(36).substring(7);
    router.push(`/room/${roomId}?ai1=${encodeURIComponent(formData.ai1Role)}&ai2=${encodeURIComponent(formData.ai2Role)}&topic=${encodeURIComponent(formData.initialTopic)}`);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gray-900">
      <div 
        className="fixed inset-0 transition-transform duration-500 ease-out"
        style={{
          background: `
            radial-gradient(
              circle at ${mousePosition.x * 100}% ${mousePosition.y * 100}%,
              rgba(99, 102, 241, 0.4) 0%,
              rgba(79, 70, 229, 0.3) 25%,
              rgba(67, 56, 202, 0.2) 50%,
              transparent 70%
            )
          `,
          transform: `scale(1.5) rotate(${time * 360}deg)`
        }}
      />
      <div 
        className="fixed inset-0 transition-transform duration-500 ease-out"
        style={{
          background: `
            radial-gradient(
              circle at ${(1 - mousePosition.x) * 100}% ${(1 - mousePosition.y) * 100}%,
              rgba(16, 185, 129, 0.4) 0%,
              rgba(5, 150, 105, 0.3) 25%,
              rgba(4, 120, 87, 0.2) 50%,
              transparent 70%
            )
          `,
          transform: `scale(1.5) rotate(${-time * 360}deg)`
        }}
      />
      <div 
        className="fixed inset-0 transition-transform duration-500 ease-out"
        style={{
          background: `
            radial-gradient(
              circle at ${50 + Math.sin(time * Math.PI * 2) * 20}% ${50 + Math.cos(time * Math.PI * 2) * 20}%,
              rgba(236, 72, 153, 0.3) 0%,
              rgba(219, 39, 119, 0.2) 25%,
              rgba(190, 24, 93, 0.1) 50%,
              transparent 70%
            )
          `,
          transform: `scale(1.5)`
        }}
      />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-8">
        <div className="absolute top-4 right-4">
          <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-md rounded-xl p-2">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="bg-transparent text-gray-300 rounded-lg px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="pl" className="bg-gray-800">PL</option>
              <option value="en" className="bg-gray-800">EN</option>
              <option value="de" className="bg-gray-800">DE</option>
              <option value="ua" className="bg-gray-800">UA</option>
              <option value="ru" className="bg-gray-800">RU</option>
              <option value="es" className="bg-gray-800">ES</option>
              <option value="fr" className="bg-gray-800">FR</option>
            </select>
          </div>
        </div>

        <div className="max-w-2xl w-full">
          <h1 className="text-5xl font-bold mb-2 text-center text-white">{t('title')}</h1>
          <p className="text-xl text-gray-300 text-center mb-8">{t('subtitle')}</p>
          
          <form onSubmit={handleSubmit} className="space-y-6 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-8 rounded-2xl shadow-lg border border-white/20">
            <div>
              <label htmlFor="ai1Role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('ai1Role')}
              </label>
              <input
                type="text"
                id="ai1Role"
                value={formData.ai1Role}
                onChange={(e) => setFormData({ ...formData, ai1Role: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm
                focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20
                transition-all duration-200 ease-in-out
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                hover:border-indigo-400 dark:hover:border-indigo-500
                text-gray-900 dark:text-white"
                placeholder={t('ai1Placeholder')}
                required
              />
            </div>
            
            <div>
              <label htmlFor="ai2Role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('ai2Role')}
              </label>
              <input
                type="text"
                id="ai2Role"
                value={formData.ai2Role}
                onChange={(e) => setFormData({ ...formData, ai2Role: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm
                focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20
                transition-all duration-200 ease-in-out
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                hover:border-indigo-400 dark:hover:border-indigo-500
                text-gray-900 dark:text-white"
                placeholder={t('ai2Placeholder')}
                required
              />
            </div>

            <div>
              <label htmlFor="initialTopic" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('initialTopic')}
              </label>
              <textarea
                id="initialTopic"
                value={formData.initialTopic}
                onChange={(e) => setFormData({ ...formData, initialTopic: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-700/50 backdrop-blur-sm
                focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/20 dark:focus:ring-indigo-400/20
                transition-all duration-200 ease-in-out
                placeholder:text-gray-400 dark:placeholder:text-gray-500
                hover:border-indigo-400 dark:hover:border-indigo-500
                text-gray-900 dark:text-white
                resize-none"
                rows={4}
                placeholder={t('topicPlaceholder')}
                required
              />
            </div>

            {!isPaid ? (
              <div className="flex flex-col items-center space-y-4">
                <p className="text-gray-700 dark:text-gray-300 text-center">
                  Please connect your wallet and pay 1M DEV token to create a room
                </p>
                <PaymentButton onPaymentComplete={() => setIsPaid(true)} />
              </div>
            ) : (
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl hover:bg-indigo-700 
                focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 
                transform transition-all duration-300 hover:scale-105 hover:shadow-lg
                font-medium shadow-md"
              >
                {t('createRoom')}
              </button>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
