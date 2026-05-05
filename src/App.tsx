import React, { useState, useEffect, useRef } from 'react';
import { 
  Phone, 
  Mic, 
  MicOff, 
  User, 
  Bot, 
  AlertCircle, 
  CheckCircle2, 
  XCircle, 
  ShieldAlert,
  History,
  Languages,
  MessageSquare,
  Activity,
  ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { interpretCitizenSpeech, InterpretationResult } from './services/geminiService';
import { useVoice } from './hooks/useVoice';

// Types
interface Message {
  id: string;
  sender: 'citizen' | 'ai' | 'agent';
  text: string;
  timestamp: Date;
  interpretation?: InterpretationResult;
  status: 'pending' | 'verified' | 'refuted' | 'neutral';
}

export default function App() {
  const [isCalling, setIsCalling] = useState(false);
  const [transcript, setTranscript] = useState<Message[]>([]);
  const [currentInterpretation, setCurrentInterpretation] = useState<InterpretationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [sessionConfidence, setSessionConfidence] = useState(1.0);
  const [humanHandover, setHumanHandover] = useState(false);
  
  const { isListening, startListening, stopListening, speak } = useVoice();
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Handle Speech Input and AI Processing
  const handleSpeechInput = async (text: string) => {
    if (!isCalling) return;
    
    const newMessage: Message = {
      id: Math.random().toString(36).substr(2, 9),
      sender: 'citizen',
      text,
      timestamp: new Date(),
      status: 'pending'
    };
    
    setTranscript(prev => [...prev, newMessage]);
    setIsAnalyzing(true);

    try {
      const result = await interpretCitizenSpeech(text);
      setCurrentInterpretation(result);
      
      // AI Response (Verification)
      const aiResponse: Message = {
        id: Math.random().toString(36).substr(2, 9),
        sender: 'ai',
        text: result.verificationQuestion,
        timestamp: new Date(),
        interpretation: result,
        status: 'neutral'
      };
      
      setTranscript(prev => [...prev, aiResponse]);
      
      // TTS for the AI's verification question
      speak(result.verificationQuestion, result.originalLanguage.toLowerCase().includes('kannada') ? 'kn-IN' : 'hi-IN');
      
      // If urgency is very high or confidence (simulated) is low, trigger handover
      if (result.urgencyScore > 8 || result.sentiment === 'distress') {
        setHumanHandover(true);
      }
    } catch (error) {
      console.error("AI Analysis failed", error);
      setHumanHandover(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleMicToggle = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening(handleSpeechInput);
    }
  };

  const handleVerification = (status: 'verified' | 'refuted') => {
    if (transcript.length === 0) return;
    
    const lastMsgIdx = transcript.findLastIndex(m => m.sender === 'citizen');
    if (lastMsgIdx !== -1) {
      const updated = [...transcript];
      updated[lastMsgIdx].status = status === 'verified' ? 'verified' : 'refuted';
      setTranscript(updated);
    }

    if (status === 'refuted') {
      setSessionConfidence(prev => Math.max(0, prev - 0.3));
      if (sessionConfidence < 0.5) setHumanHandover(true);
    }
    
    setCurrentInterpretation(null);
  };

  const toggleCall = () => {
    if (!isCalling) {
      setIsCalling(true);
      setTranscript([{
        id: 'init',
        sender: 'ai',
        text: "Namaskara, 1092 Helpline ge swagatha. Nimma samasye yenu? (Welcome to 1092 Helpline. How can we help you?)",
        timestamp: new Date(),
        status: 'neutral'
      }]);
    } else {
      setIsCalling(false);
      setTranscript([]);
      setCurrentInterpretation(null);
      setHumanHandover(false);
      setSessionConfidence(1.0);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm shadow-emerald-200">
            1092
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-800">Govt. of Karnataka Helpline</h1>
            <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">AI-Assisted Citizen Portal</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 border border-slate-200">
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            System Status: Active
          </div>
          <button 
            onClick={toggleCall}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-full font-bold transition-all transform active:scale-95 ${
              isCalling 
              ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-200' 
              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-200'
            }`}
          >
            <Phone className={`w-4 h-4 ${isCalling ? 'rotate-[135deg]' : ''}`} />
            {isCalling ? 'End Interaction' : 'Simulate Incoming Call'}
          </button>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Live Transcript */}
        <section className="lg:col-span-8 flex flex-col h-[calc(100vh-140px)]">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-slate-400" />
                <h2 className="font-bold text-slate-700">Live Transcript</h2>
              </div>
              <div className="flex items-center gap-2">
                 <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                 <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest">Real-time Stream</span>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              <AnimatePresence initial={false}>
                {transcript.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${msg.sender === 'citizen' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[80%] flex gap-3 ${msg.sender === 'citizen' ? 'flex-row-reverse' : 'flex-row'}`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        msg.sender === 'citizen' ? 'bg-indigo-100 text-indigo-600' : 
                        msg.sender === 'ai' ? 'bg-emerald-100 text-emerald-600' : 'bg-orange-100 text-orange-600'
                      }`}>
                        {msg.sender === 'citizen' ? <User className="w-5 h-5" /> : 
                         msg.sender === 'ai' ? <Bot className="w-5 h-5" /> : <ShieldAlert className="w-5 h-5" />}
                      </div>
                      
                      <div className="space-y-1">
                        <div className={`px-4 py-3 rounded-2xl text-sm font-medium leading-relaxed ${
                          msg.sender === 'citizen' 
                          ? 'bg-slate-900 text-white rounded-tr-none' 
                          : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                        }`}>
                          {msg.text}
                        </div>
                        
                        <div className={`flex items-center gap-2 px-1 ${msg.sender === 'citizen' ? 'justify-end' : 'justify-start'}`}>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">
                            {msg.sender} • {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {msg.status === 'verified' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                          {msg.status === 'refuted' && <XCircle className="w-3 h-3 text-rose-500" />}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={transcriptEndRef} />
            </div>

            <div className="p-4 border-t border-slate-100 bg-white">
              <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
                {!isCalling ? (
                  <p className="text-center text-slate-400 text-sm font-medium py-2 italic">
                    Establish a connection to start the interaction...
                  </p>
                ) : (
                  <div className="flex gap-3">
                    <button 
                      onClick={handleMicToggle}
                      title={isListening ? "Stop Listening" : "Start Voice Input"}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${
                        isListening ? 'bg-rose-500 text-white animate-pulse' : 'bg-white text-emerald-600 border border-emerald-100 hover:bg-emerald-50'
                      }`}
                    >
                      {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <div className="flex-1 relative">
                      <input 
                        type="text"
                        placeholder={isListening ? "Listening..." : "Type or speak (e.g. 'Ration cards issue')"}
                        disabled={isListening}
                        className="w-full h-12 bg-white border border-slate-200 rounded-lg px-4 text-sm focus:ring-2 focus:ring-emerald-500 outline-none pr-12 transition-all disabled:opacity-50"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && e.currentTarget.value) {
                            handleSpeechInput(e.currentTarget.value);
                            e.currentTarget.value = '';
                          }
                        }}
                      />
                      <button 
                        onClick={() => {
                          const input = document.querySelector('input') as HTMLInputElement;
                          if (input.value) {
                            handleSpeechInput(input.value);
                            input.value = '';
                          }
                        }}
                        className="absolute right-2 top-2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-600 transition-colors"
                      >
                        <ArrowRight className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: AI Insights & Agent Controls */}
        <aside className="lg:col-span-4 space-y-6">
          
          {/* AI Understanding Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col transition-all">
             <div className="px-5 py-4 bg-emerald-50/50 border-b border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="w-5 h-5 text-emerald-600" />
                  <h3 className="font-bold text-emerald-900">AI Interpretation</h3>
                </div>
                {isAnalyzing && (
                  <div className="flex gap-1">
                    {[1,2,3].map(i => (
                      <motion.div 
                        key={i}
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ repeat: Infinity, duration: 0.8, delay: i*0.2 }}
                        className="w-1.5 h-1.5 bg-emerald-500 rounded-full"
                      />
                    ))}
                  </div>
                )}
             </div>

             <div className="p-5 min-h-[200px]">
                {currentInterpretation ? (
                  <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Summary</label>
                      <p className="text-sm text-slate-700 leading-relaxed font-medium bg-slate-50 p-3 rounded-xl border border-slate-100">
                        {currentInterpretation.summary}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Sentiment</label>
                        <div className={`px-2 py-1 rounded text-[10px] font-bold text-center uppercase border ${
                          currentInterpretation.sentiment === 'distress' ? 'bg-rose-50 text-rose-600 border-rose-100' :
                          currentInterpretation.sentiment === 'urgency' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                          'bg-emerald-50 text-emerald-600 border-emerald-100'
                        }`}>
                          {currentInterpretation.sentiment}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-400 uppercase">Dialect/Lang</label>
                        <div className="px-2 py-1 bg-slate-50 text-slate-600 border border-slate-100 rounded text-[10px] font-bold text-center uppercase">
                          {currentInterpretation.dialectDetected || currentInterpretation.originalLanguage}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-slate-50">
                      <p className="text-[11px] font-semibold text-slate-500 italic text-center uppercase tracking-tight">
                        Verify understanding with citizen?
                      </p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleVerification('verified')}
                          className="flex-1 bg-emerald-600 text-white rounded-xl py-2.5 text-xs font-bold hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-100 flex items-center justify-center gap-2"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Confirmed
                        </button>
                        <button 
                          onClick={() => handleVerification('refuted')}
                          className="flex-1 bg-white text-slate-600 border border-slate-200 rounded-xl py-2.5 text-xs font-bold hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Correction
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-6 opacity-30 grayscale pointer-events-none">
                    <MessageSquare className="w-10 h-10 text-slate-300" />
                    <p className="text-xs font-medium text-slate-400">Waiting for speech input to analyze...</p>
                  </div>
                )}
             </div>
          </div>

          {/* Guardrails & Confidence Panel */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
             <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-sm">System Guardrails</h3>
                {humanHandover && <span className="bg-rose-100 text-rose-600 text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse border border-rose-200">INTERVENTION REQUIRED</span>}
             </div>
             
             <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>AI CONFIDENCE</span>
                    <span>{Math.round(sessionConfidence * 100)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: '100%' }}
                      animate={{ width: `${sessionConfidence * 100}%` }}
                      className={`h-full ${sessionConfidence > 0.7 ? 'bg-emerald-500' : sessionConfidence > 0.4 ? 'bg-amber-500' : 'bg-rose-500'}`}
                    />
                  </div>
                </div>

                <AnimatePresence>
                  {humanHandover && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="p-4 bg-rose-50 border border-rose-100 rounded-xl space-y-3"
                    >
                      <div className="flex gap-3">
                        <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0" />
                        <div>
                          <p className="text-xs font-bold text-rose-900">Emergency Handover Triggered</p>
                          <p className="text-[10px] text-rose-600 font-medium">Critical sentiment or low confidence detected. Agent must take manual control.</p>
                        </div>
                      </div>
                      <button className="w-full bg-rose-600 text-white rounded-lg py-2 text-xs font-bold hover:bg-rose-700 transition-shadow shadow-md shadow-rose-200">
                        Accept Control
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
          </div>

          {/* Quick Actions / Dialect Insights */}
          <div className="bg-[#0F172A] rounded-2xl p-5 text-white shadow-xl">
             <div className="flex items-center gap-2 mb-4">
                <Languages className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">Linguistic Insights</h3>
             </div>
             <div className="space-y-4">
               <div className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                  <p className="text-[10px] font-bold text-indigo-300 uppercase mb-1">Detected Language</p>
                  <p className="text-sm font-medium">Kannada (North Karnataka Dialect)</p>
               </div>
               <div className="p-3 bg-white/5 rounded-xl border border-white/10 hover:bg-white/10 transition-colors">
                  <p className="text-[10px] font-bold text-teal-300 uppercase mb-1">Cultural Nuance</p>
                  <p className="text-xs text-slate-300 leading-relaxed">Specific usage of "Re" signifies high formality/respect. User may be elderly or from a rural setting.</p>
               </div>
             </div>
          </div>

        </aside>
      </main>
    </div>
  );
}
