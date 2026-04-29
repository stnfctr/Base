/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  doc, 
  onSnapshot, 
  setDoc, 
  getDoc,
  query,
  orderBy,
  limit,
  serverTimestamp
} from 'firebase/firestore';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Wallet, 
  Terminal, 
  Activity, 
  ShieldCheck, 
  CreditCard,
  LogOut,
  ChevronRight,
  Code,
  Globe,
  Cpu,
  RefreshCw,
  Search,
  Database
} from 'lucide-react';
import { auth, db, OperationType, handleFirestoreError } from './lib/firebase';
import { connectWallet } from './services/web3Service';
import { UserProfile, ApiListing, Transaction } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Initial Mock APIs
const MOCK_APIS: Partial<ApiListing>[] = [
  { id: 'ai-vision-01', name: 'Vision Pro', description: 'Real-time object detection and classification.', pricePerCall: 0.05, category: 'AI', provider: 'NanoCore', status: 'active' },
  { id: 'ai-nlp-02', name: 'Semantic Search', description: 'Advanced vector-based semantic retrieval.', pricePerCall: 0.02, category: 'Data', provider: 'NanoCore', status: 'active' },
  { id: 'weather-01', name: 'HyperLocal Weather', description: 'Ultra-precise current weather and forecasts.', pricePerCall: 0.005, category: 'Utility', provider: 'SkyNet', status: 'active' },
  { id: 'stock-01', name: 'Global Equities', description: 'Real-time stock price streaming and history.', pricePerCall: 0.01, category: 'Finance', provider: 'TickStream', status: 'active' },
  { id: 'geo-01', name: 'Reverse Geocoder', description: 'Convert coordinates to human-readable addresses.', pricePerCall: 0.002, category: 'Maps', provider: 'MapsEdge', status: 'active' },
];

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [apis, setApis] = useState<ApiListing[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isCalling, setIsCalling] = useState<string | null>(null);
  const [logs, setLogs] = useState<{ id: string; msg: string; type: 'info' | 'success' | 'error' }[]>([]);
  const [search, setSearch] = useState('');

  // 1. Auth & Profile Listener
  useEffect(() => {
    let unsubProfile: (() => void) | null = null;
    let unsubTrans: (() => void) | null = null;

    const unsubAuth = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      // Cleanup previous listeners
      unsubProfile?.();
      unsubTrans?.();

      if (u) {
        // Ensure profile exists
        const userRef = doc(db, 'users', u.uid);
        try {
          const userDoc = await getDoc(userRef);
          if (!userDoc.exists()) {
            const newProfile: any = {
              uid: u.uid,
              email: u.email || '',
              balance: 5.0, // Start with $5 free credits
              createdAt: serverTimestamp()
            };
            await setDoc(userRef, newProfile);
          }
        } catch (err) {
          console.error("Profile check/init error:", err);
        }

        // Real-time profile updates
        unsubProfile = onSnapshot(userRef, (snap) => {
          if (snap.exists()) setProfile(snap.data() as UserProfile);
        }, (err) => handleFirestoreError(err, OperationType.GET, `users/${u.uid}`));

        // Real-time transaction updates
        const q = query(collection(db, 'users', u.uid, 'transactions'), orderBy('timestamp', 'desc'), limit(10));
        unsubTrans = onSnapshot(q, (snap) => {
          setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
        }, (err) => handleFirestoreError(err, OperationType.GET, `users/${u.uid}/transactions`));
      } else {
        setProfile(null);
        setTransactions([]);
      }
    });

    return () => {
      unsubAuth();
      unsubProfile?.();
      unsubTrans?.();
    };
  }, []);

  // 2. Fetch APIs
  useEffect(() => {
    const unsubApis = onSnapshot(collection(db, 'apis'), (snap) => {
      setApis(snap.docs.map(d => ({ id: d.id, ...d.data() } as ApiListing)));
    }, (err) => handleFirestoreError(err, OperationType.GET, 'apis'));

    return () => unsubApis();
  }, []);

  const addLog = (msg: string, type: 'info' | 'success' | 'error' = 'info') => {
    setLogs(prev => [{ id: Math.random().toString(36), msg, type }, ...prev].slice(0, 50));
  };

  const handleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCallAPI = async (api: ApiListing) => {
    if (!user || !profile) return;
    if (profile.balance < api.pricePerCall) {
      addLog(`Insufficient balance for ${api.name}. Please top up.`, 'error');
      return;
    }

    setIsCalling(api.id);
    addLog(`Calling ${api.name} (Cost: $${api.pricePerCall})...`, 'info');

    try {
      const response = await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          apiId: api.id,
          prompt: `Simulate a response for ${api.name}`
        })
      });

      const data = await response.json();
      if (response.ok) {
        addLog(`Success from ${api.name}: ${data.result.substring(0, 100)}...`, 'success');
      } else {
        addLog(`Error: ${data.error}`, 'error');
      }
    } catch (err: any) {
      addLog(`Connection failed: ${err.message}`, 'error');
    } finally {
      setIsCalling(null);
    }
  };

  const handleTopup = async () => {
    if (!user) return;
    try {
      const amount = 10.0;
      addLog(`Processing top-up of $${amount}...`, 'info');
      const response = await fetch('/api/wallet/topup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid, amount })
      });
      if (response.ok) {
        addLog(`Successfully topped up $${amount}!`, 'success');
      }
    } catch (err: any) {
      addLog(`Top-up failed: ${err.message}`, 'error');
    }
  };

  const handleConnectWeb3 = async () => {
    const connection = await connectWallet();
    if (connection) {
      setWalletAddress(connection.address);
      addLog(`Connected to Base Sepolia: ${connection.address}`, 'success');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] text-white flex flex-col items-center justify-center p-6 font-sans antialiased overflow-hidden selection:bg-orange-500/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(45,45,45,1)_0%,rgba(10,10,10,1)_100%)] opacity-50" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 text-center max-w-xl"
        >
          <div className="flex justify-center mb-8">
            <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center rotate-12 shadow-2xl shadow-orange-500/20">
              <Zap className="text-white w-8 h-8 fill-white" />
            </div>
          </div>
          <h1 className="text-6xl font-bold tracking-tighter mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-white/50">
            NanoPay API
          </h1>
          <p className="text-white/60 text-lg mb-10 leading-relaxed">
            The first decentralized-style micro-payment marketplace for APIs. 
            Quit subscriptions. Pay exactly for what you execute.
          </p>
          <button 
            onClick={handleLogin}
            className="group relative px-8 py-4 bg-white text-black font-semibold rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 bg-orange-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
            <span className="relative z-10 flex items-center gap-2 group-hover:text-white transition-colors">
              Get Started with Google <ChevronRight className="w-4 h-4" />
            </span>
          </button>
        </motion.div>
      </div>
    );
  }

  const filteredApis = apis.filter(api => 
    api.name.toLowerCase().includes(search.toLowerCase()) || 
    api.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0C0C0E] text-[#E4E4E7] font-sans overflow-x-hidden selection:bg-orange-500/30">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-orange-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 border-bottom border-white/5 bg-[#0C0C0E]/80 backdrop-blur-md px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20">
              <Zap className="text-white w-5 h-5 fill-white" />
            </div>
            <span className="text-xl font-bold tracking-tight">NanoPay</span>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
              <Wallet className="w-4 h-4 text-orange-500" />
              <span className="font-mono font-medium text-sm">
                ${profile?.balance?.toFixed(3) || '0.000'}
              </span>
            </div>
            <button 
              onClick={() => signOut(auth)}
              className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">
        
        {/* Left Column: Marketplace */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white mb-2 italic serif">Marketplace</h2>
              <p className="text-white/40 text-sm">Browse high-performance payloads ready for execution.</p>
            </div>
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20 group-focus-within:text-orange-500 transition-colors" />
              <input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search resources..."
                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-orange-500/50 transition-all w-full md:w-64"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {filteredApis.map((api, idx) => (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  key={api.id}
                  className="group bg-[#151518] border border-white/5 p-6 rounded-2xl hover:border-orange-500/20 transition-all hover:bg-[#1A1A1F]"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center border border-white/10 group-hover:border-orange-500/20 transition-colors">
                      {api.category === 'AI' ? <Cpu className="w-6 h-6 text-orange-500" /> : 
                       api.category === 'Maps' ? <Globe className="w-6 h-6 text-blue-500" /> :
                       <Activity className="w-6 h-6 text-emerald-500" />}
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-mono font-bold text-white">${api.pricePerCall}</div>
                      <div className="text-[10px] text-white/30 uppercase tracking-widest font-bold">Per Call</div>
                    </div>
                  </div>
                  
                  <h3 className="text-lg font-bold text-white mb-1">{api.name}</h3>
                  <p className="text-white/50 text-sm mb-6 line-clamp-2 leading-relaxed">
                    {api.description}
                  </p>

                  <div className="flex items-center justify-between">
                    <span className="px-2 py-1 bg-white/5 rounded text-[10px] uppercase font-bold tracking-wider text-white/40 border border-white/5">
                      {api.provider}
                    </span>
                    <button
                      disabled={isCalling !== null}
                      onClick={() => handleCallAPI(api)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all",
                        isCalling === api.id 
                          ? "bg-orange-500/20 text-orange-500" 
                          : "bg-white text-black hover:bg-orange-500 hover:text-white"
                      )}
                    >
                      {isCalling === api.id ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Terminal className="w-4 h-4" />
                      )}
                      {isCalling === api.id ? 'Processing' : 'Execute'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: Console & Wallet */}
        <div className="space-y-8">
          
          {/* Wallet Card */}
          <section className="bg-gradient-to-br from-orange-500/20 to-blue-500/10 border border-white/10 rounded-3xl p-8 relative overflow-hidden group">
            <div className="relative z-10">
              <div className="flex items-center gap-2 text-white/60 text-xs font-bold uppercase tracking-widest mb-2">
                <CreditCard className="w-4 h-4" />
                Live Balance
              </div>
              <div className="text-5xl font-mono font-bold text-white mb-8 tracking-tighter">
                ${profile?.balance?.toFixed(4) || '0.000'}
              </div>
              
              <button 
                onClick={handleTopup}
                className="w-full bg-white/10 hover:bg-white/20 border border-white/20 py-3 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                Top up Credits <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            
            {/* Visual background details */}
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Zap className="w-32 h-32 text-orange-500" />
            </div>
          </section>

          {/* Console / Activity Log */}
          <section className="bg-[#08080A] border border-white/5 rounded-3xl flex flex-col h-[500px]">
            <div className="p-5 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-widest text-white/60">Live Console</span>
              </div>
              <Activity className="w-4 h-4 text-white/20" />
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-[11px]">
              {logs.length === 0 && (
                <div className="text-white/20 h-full flex items-center justify-center italic">
                  Waiting for activity...
                </div>
              )}
              {logs.map(log => (
                <div key={log.id} className={cn(
                  "flex gap-3 animate-in fade-in slide-in-from-left-2 transition-all",
                  log.type === 'error' ? "text-red-400" : 
                  log.type === 'success' ? "text-emerald-400" : "text-white/60"
                )}>
                  <span className="shrink-0 opacity-20">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                  <p className="leading-relaxed">{log.msg}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Transaction History */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Base Sepolia Deployment</h4>
              <Database className="w-4 h-4 text-orange-500" />
            </div>
            <div className="bg-[#151518] border border-orange-500/10 p-5 rounded-2xl space-y-4">
               <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-blue-500/20 rounded flex items-center justify-center">
                   <Code className="w-4 h-4 text-blue-400" />
                 </div>
                 <div className="text-[11px] font-mono text-white/60">npx hardhat run scripts/deploy.ts --network base-sepolia</div>
               </div>
               <button 
                onClick={handleConnectWeb3}
                className="w-full py-2 bg-blue-500/20 border border-blue-500/30 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-blue-500/30 transition-all"
               >
                 {walletAddress ? `Base: ${walletAddress.substring(0,6)}...${walletAddress.substring(38)}` : "Connect to Base Sepolia"}
               </button>
            </div>
          </section>

          {/* Transaction History */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white/40">Recent History</h4>
              <ShieldCheck className="w-4 h-4 text-white/20" />
            </div>
            <div className="space-y-2">
              {transactions.map(tx => (
                <div key={tx.id} className="bg-white/[0.02] border border-white/5 p-3 rounded-xl flex items-center justify-between hover:bg-white/[0.05] transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center",
                      tx.type === 'deposit' ? "bg-emerald-500/10" : "bg-white/5"
                    )}>
                      {tx.type === 'deposit' ? <CreditCard className="w-4 h-4 text-emerald-500" /> : <Terminal className="w-4 h-4 text-white/40" />}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-white">{tx.apiName || 'Deposit'}</div>
                      <div className="text-[10px] text-white/30">{tx.type}</div>
                    </div>
                  </div>
                  <div className={cn(
                    "text-xs font-bold italic serif font-mono",
                    tx.type === 'deposit' ? "text-emerald-500" : "text-white"
                  )}>
                    {tx.type === 'deposit' ? '+' : '-'}${tx.amount.toFixed(3)}
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto px-6 py-20 border-t border-white/5 opacity-40">
        <div className="flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-sm font-light">© 2026 NanoPay Infrastructure. All operations cryptographically verified.</div>
          <div className="flex items-center gap-8 text-xs font-bold tracking-widest uppercase">
            <a href="#" className="hover:text-white transition-colors">Documentation</a>
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Network Status</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

