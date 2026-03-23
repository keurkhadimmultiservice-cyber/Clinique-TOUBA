'use client';

import React, { useState } from 'react';
import { Hospital, Mail, Lock, ArrowRight, Shield, Stethoscope, UserCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { db } from '@/lib/firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect } from 'react';

export default function LoginPage() {
  const [role, setRole] = useState<'admin' | 'doctor' | 'receptionist'>('admin');
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.push('/dashboard');
      }
    });
    return () => unsubscribe();
  }, [router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Sign Up
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        await updateProfile(user, {
          displayName: role
        });

        // Save to Firestore
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          name: email.split('@')[0],
          email: email,
          role: role,
          createdAt: serverTimestamp()
        });
      } else {
        // Sign In
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Ensure profile exists (in case it wasn't created during signup)
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          await setDoc(docRef, {
            uid: user.uid,
            name: user.displayName || user.email?.split('@')[0] || 'Utilisateur',
            email: user.email,
            role: 'receptionist', // Default role for existing users without profile
            createdAt: serverTimestamp()
          });
        }
      }
      
      router.push('/dashboard');
    } catch (err: any) {
      console.error('Auth error:', err);
      let message = 'Une erreur est survenue lors de l\'authentification.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        message = 'Identifiants invalides. Veuillez réessayer.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'Cette adresse e-mail est déjà utilisée.';
      } else if (err.code === 'auth/weak-password') {
        message = 'Le mot de passe est trop faible (6 caractères minimum).';
      } else if (err.code === 'auth/invalid-email') {
        message = 'L\'adresse e-mail n\'est pas valide.';
      }
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    const provider = new GoogleAuthProvider();
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if profile exists
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        // Create profile for new Google user
        await setDoc(docRef, {
          uid: user.uid,
          name: user.displayName || user.email?.split('@')[0] || 'Utilisateur',
          email: user.email,
          role: 'receptionist', // Default role for new Google users
          createdAt: serverTimestamp()
        });
      }

      router.push('/dashboard');
    } catch (err: any) {
      console.error('Google Auth error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError('Erreur lors de la connexion avec Google.');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Left Side - Visual */}
        <div className="hidden lg:flex flex-col justify-between p-12 bg-emerald-600 text-white relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                <Hospital size={28} />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">Clinique TOUBA</h1>
            </div>
            
            <h2 className="text-5xl font-bold leading-tight mb-6">
              Soins Modernes, <br />
              <span className="text-emerald-200">Simplifiés.</span>
            </h2>
            <p className="text-emerald-50/80 text-lg max-w-md">
              La plateforme de gestion tout-en-un pour les professionnels de santé. 
              L&apos;efficacité à portée de main.
            </p>
          </div>

          <div className="relative z-10 space-y-6">
            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl backdrop-blur-sm border border-white/10">
              <div className="w-10 h-10 bg-emerald-400/20 rounded-xl flex items-center justify-center">
                <Shield size={20} className="text-emerald-200" />
              </div>
              <div>
                <p className="font-bold">Données Sécurisées</p>
                <p className="text-xs text-emerald-100/60">Chiffrement de bout en bout pour les dossiers des patients.</p>
              </div>
            </div>
          </div>

          {/* Abstract Shapes */}
          <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute top-20 -left-20 w-60 h-60 bg-emerald-400/20 rounded-full blur-2xl"></div>
        </div>

        {/* Right Side - Form */}
        <div className="p-8 lg:p-16 flex flex-col justify-center">
          <div className="mb-10 text-center lg:text-left">
            <h3 className="text-3xl font-bold text-slate-900">
              {isSignUp ? 'Créer un compte' : 'Bon retour'}
            </h3>
            <p className="text-slate-500 mt-2">
              {isSignUp 
                ? 'Inscrivez-vous pour commencer à gérer votre clinique.' 
                : 'Veuillez entrer vos informations pour vous connecter.'}
            </p>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-sm font-medium"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Role Selector */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[
              { id: 'admin', label: 'Admin', icon: Shield },
              { id: 'doctor', label: 'Docteur', icon: Stethoscope },
              { id: 'receptionist', label: 'Personnel', icon: UserCircle },
            ].map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => setRole(r.id as any)}
                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border-2 transition-all ${
                  role === r.id 
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-700' 
                    : 'border-slate-100 bg-slate-50 text-slate-400 hover:border-slate-200'
                }`}
              >
                <r.icon size={20} />
                <span className="text-xs font-bold uppercase tracking-wider">{r.label}</span>
              </button>
            ))}
          </div>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700 ml-1">Adresse e-mail</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all outline-none text-slate-900" 
                  placeholder="nom@exemple.com" 
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between ml-1">
                <label className="text-sm font-bold text-slate-700">Mot de passe</label>
                {!isSignUp && (
                  <button type="button" className="text-xs font-bold text-emerald-600 hover:underline">Mot de passe oublié ?</button>
                )}
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={20} />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all outline-none text-slate-900" 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            {!isSignUp && (
              <div className="flex items-center gap-2 ml-1">
                <input type="checkbox" id="remember" className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500" />
                <label htmlFor="remember" className="text-sm font-medium text-slate-600">Se souvenir de moi pendant 30 jours</label>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading || isGoogleLoading}
              className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold text-lg hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isSignUp ? 'S\'inscrire' : 'Se connecter'}
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>

            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-slate-500 font-medium">Ou continuer avec</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isLoading || isGoogleLoading}
              className="w-full py-4 bg-white border-2 border-slate-100 text-slate-700 rounded-2xl font-bold text-lg hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-3 group disabled:opacity-70"
            >
              {isGoogleLoading ? (
                <div className="w-6 h-6 border-2 border-slate-200 border-t-emerald-600 rounded-full animate-spin"></div>
              ) : (
                <>
                  <svg className="w-6 h-6" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Google
                </>
              )}
            </button>
          </form>

          <p className="text-center text-slate-500 mt-8 text-sm">
            {isSignUp ? (
              <>
                Vous avez déjà un compte ? <button onClick={() => setIsSignUp(false)} className="text-emerald-600 font-bold hover:underline">Se connecter</button>
              </>
            ) : (
              <>
                Vous n&apos;avez pas de compte ? <button onClick={() => setIsSignUp(true)} className="text-emerald-600 font-bold hover:underline">S&apos;inscrire</button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
