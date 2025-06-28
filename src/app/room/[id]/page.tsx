'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { use } from 'react';
import { useLanguage } from '@/i18n/LanguageContext';
import { Language } from '@/i18n/translations';
import { PaymentButton } from '@/components/PaymentButton';

interface Message {
  role: string;
  content: string;
}

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const { t, language, setLanguage } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [needsPayment, setNeedsPayment] = useState(false);
  const initialLoadDone = useRef(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [time, setTime] = useState(0);

  const ai1Role = searchParams.get('ai1') || '';
  const ai2Role = searchParams.get('ai2') || '';
  const initialTopic = searchParams.get('topic') || '';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Sprawdzanie czy potrzebna jest płatność za kontynuację (co 3 wiadomości po pierwszej parze)
  const checkIfPaymentNeeded = useCallback(() => {
    const messagesAfterInitial = messages.length - 2; // Odejmujemy pierwszą parę wiadomości
    console.log('Sprawdzanie płatności:', { 
      totalMessages: messages.length, 
      messagesAfterInitial, 
      needsPayment: messagesAfterInitial > 0 && messagesAfterInitial % 3 === 0 
    });
    
    if (messagesAfterInitial > 0 && messagesAfterInitial % 3 === 0) {
      setNeedsPayment(true);
      return true;
    }
    return false;
  }, [messages.length]);

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

  const generateResponse = useCallback(async (prompt: string) => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt, language }),
    });

    const data = await response.json();
    return data.content || 'Przepraszam, nie mogę teraz odpowiedzieć.';
  }, [language]);

  const getPromptByLanguage = (role: string, topic: string, language: string) => {
    const prompts = {
      pl: `Jesteś ${role}. Rozpocznij rozmowę o temacie: ${topic}.`,
      en: `You are ${role}. Start a conversation about: ${topic}.`,
      de: `Du bist ${role}. Beginne ein Gespräch über: ${topic}.`,
      ua: `Ви є ${role}. Почніть розмову про: ${topic}.`,
      ru: `Вы ${role}. Начните разговор о: ${topic}.`,
      es: `Eres ${role}. Comienza una conversación sobre: ${topic}.`,
      fr: `Vous êtes ${role}. Commencez une conversation sur: ${topic}.`
    };
    return prompts[language as keyof typeof prompts] || prompts.en;
  };

  const getResponsePromptByLanguage = (role: string, content: string, language: string) => {
    const prompts = {
      pl: `Jesteś ${role}. Odpowiedz na wiadomość: "${content}".`,
      en: `You are ${role}. Respond to the message: "${content}".`,
      de: `Du bist ${role}. Antworte auf die Nachricht: "${content}".`,
      ua: `Ви є ${role}. Відповідь на повідомлення: "${content}".`,
      ru: `Вы ${role}. Ответьте на сообщение: "${content}".`,
      es: `Eres ${role}. Responde al mensaje: "${content}".`,
      fr: `Vous êtes ${role}. Répondez au message: "${content}".`
    };
    return prompts[language as keyof typeof prompts] || prompts.en;
  };

  const getConversationPromptByLanguage = (role: string, history: string, language: string) => {
    const prompts = {
      pl: `Jesteś ${role}. Oto historia konwersacji:\n${history}\n\nOdpowiedz na ostatnią wiadomość, biorąc pod uwagę cały kontekst rozmowy.`,
      en: `You are ${role}. Here's the conversation history:\n${history}\n\nRespond to the last message, taking into account the entire conversation context.`,
      de: `Du bist ${role}. Hier ist die Gesprächsgeschichte:\n${history}\n\nAntworte auf die letzte Nachricht unter Berücksichtigung des gesamten Gesprächskontexts.`,
      ua: `Ви є ${role}. Ось історія розмови:\n${history}\n\nВідповідь на останнє повідомлення, враховуючи весь контекст розмови.`,
      ru: `Вы ${role}. Вот история разговора:\n${history}\n\nОтветьте на последнее сообщение, учитывая весь контекст разговора.`,
      es: `Eres ${role}. Aquí está el historial de la conversación:\n${history}\n\nResponde al último mensaje, teniendo en cuenta todo el contexto de la conversación.`,
      fr: `Vous êtes ${role}. Voici l'historique de la conversation:\n${history}\n\nRépondez au dernier message en tenant compte de tout le contexte de la conversation.`
    };
    return prompts[language as keyof typeof prompts] || prompts.en;
  };

  const generateConversation = useCallback(async () => {
    if (isGenerating) return;

    // Sprawdź czy potrzebna jest płatność przed generowaniem
    if (checkIfPaymentNeeded()) {
      return; // Zatrzymaj generowanie jeśli potrzebna jest płatność
    }

    try {
      setIsGenerating(true);
      
      if (messages.length === 0) {
        const initialPrompt = getPromptByLanguage(ai1Role, initialTopic, language);
        const initialContent = await generateResponse(initialPrompt);
        
        const initialMessage: Message = {
          role: ai1Role,
          content: initialContent
        };

        const responsePrompt = getResponsePromptByLanguage(ai2Role, initialContent, language);
        const responseContent = await generateResponse(responsePrompt);

        const responseMessage: Message = {
          role: ai2Role,
          content: responseContent
        };

        setMessages([initialMessage, responseMessage]);
      } else {
        const lastMessage = messages[messages.length - 1];
        const nextRole = lastMessage.role === ai1Role ? ai2Role : ai1Role;
        
        const conversationHistory = messages
          .map(msg => `${msg.role}: ${msg.content}`)
          .join('\n');
        
        const prompt = getConversationPromptByLanguage(nextRole, conversationHistory, language);
        const content = await generateResponse(prompt);

        const newMessage: Message = {
          role: nextRole,
          content
        };

        setMessages(prev => [...prev, newMessage]);
      }
    } catch (error) {
      console.error('Błąd podczas generowania konwersacji:', error);
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
    }
  }, [ai1Role, ai2Role, initialTopic, messages, isGenerating, generateResponse, language, checkIfPaymentNeeded]);

  useEffect(() => {
    if (!initialLoadDone.current && messages.length === 0) {
      initialLoadDone.current = true;
      generateConversation();
    }
  }, [messages.length, generateConversation]);

  // Sprawdzaj czy potrzebna jest płatność po każdej zmianie wiadomości
  useEffect(() => {
    if (messages.length > 2 && !isGenerating) {
      checkIfPaymentNeeded();
    }
  }, [messages, checkIfPaymentNeeded, isGenerating]);

  const handleContinuePayment = async () => {
    setNeedsPayment(false);
    
    // Generuj wiadomość bez sprawdzania płatności
    if (isGenerating) return;

    try {
      setIsGenerating(true);
      
      const lastMessage = messages[messages.length - 1];
      const nextRole = lastMessage.role === ai1Role ? ai2Role : ai1Role;
      
      const conversationHistory = messages
        .map(msg => `${msg.role}: ${msg.content}`)
        .join('\n');
      
      const prompt = getConversationPromptByLanguage(nextRole, conversationHistory, language);
      const content = await generateResponse(prompt);

      const newMessage: Message = {
        role: nextRole,
        content
      };

      setMessages(prev => [...prev, newMessage]);
    } catch (error) {
      console.error('Błąd podczas generowania konwersacji:', error);
    } finally {
      setIsGenerating(false);
      setIsLoading(false);
      
      // Sprawdź czy potrzebna jest kolejna płatność po zakończeniu generowania
      setTimeout(() => {
        if (messages.length + 1 > 2) {
          const messagesAfterInitial = (messages.length + 1) - 2;
          if (messagesAfterInitial > 0 && messagesAfterInitial % 3 === 0) {
            setNeedsPayment(true);
          }
        }
      }, 100);
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-gray-900">
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
      <div className="relative z-10">
        <div className="max-w-4xl mx-auto p-4 sm:p-8">
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

          <div className="flex justify-between items-center mb-8">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md rounded-2xl shadow-lg p-6 transform transition-all duration-300 hover:shadow-xl border border-white/20">
              <h1 className="text-3xl font-bold mb-4 text-gray-800 dark:text-white">
                {t('room')}: <span className="text-indigo-600 dark:text-indigo-400">{resolvedParams.id}</span>
              </h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-gray-600 dark:text-gray-300">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <p>AI 1: <span className="font-medium">{ai1Role}</span></p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <p>AI 2: <span className="font-medium">{ai2Role}</span></p>
                </div>
                <div className="sm:col-span-2 flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                  <p>{t('initialTopic')}: <span className="font-medium">{initialTopic}</span></p>
                </div>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : (
            <>
              <div className="space-y-6 mb-8 pb-24">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`transform transition-all duration-300 hover:scale-[1.02] backdrop-blur-md ${
                      message.role === ai1Role
                        ? 'bg-blue-50/90 dark:bg-blue-900/40 ml-4 border border-blue-200/50'
                        : 'bg-green-50/90 dark:bg-green-900/40 mr-4 border border-green-200/50'
                    } p-6 rounded-2xl shadow-lg`}
                  >
                    <div className="flex items-center space-x-3 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === ai1Role
                          ? 'bg-blue-500'
                          : 'bg-green-500'
                      }`}>
                        <span className="text-white font-bold">
                          {message.role === ai1Role ? '1' : '2'}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-800 dark:text-white">{message.role}</p>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{message.content}</p>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-gray-800/90 backdrop-blur-md shadow-lg p-4 border-t border-white/20">
                <div className="max-w-4xl mx-auto">
                  {needsPayment ? (
                    <div className="flex flex-col items-center space-y-4">
                      <p className="text-gray-700 dark:text-gray-300 text-center">
                        {t('continuePaymentRequired')}
                      </p>
                      <div className="flex items-center space-x-4">
                        <PaymentButton 
                          onPaymentComplete={handleContinuePayment} 
                          isContinuePayment={true}
                        />
                        <button
                          onClick={() => window.open('https://pump.fun/coin/J3D728v2apramx6UydCVHfKtBC7wfKmc1YUHJJ6Ppump', '_blank')}
                          className="px-6 py-3 rounded-xl font-medium transition-all duration-300 transform hover:scale-105 bg-green-600 hover:bg-green-700 text-white"
                        >
                          {t('buyDevToken')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={generateConversation}
                      disabled={isGenerating}
                      className={`w-full sm:w-auto px-8 py-3 rounded-xl text-white font-medium transition-all duration-300 transform hover:scale-105 ${
                        isGenerating
                          ? 'bg-gray-400 cursor-not-allowed'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      {isGenerating ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                          <span>{t('generating')}</span>
                        </div>
                      ) : (
                        t('continueConversation')
                      )}
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
} 