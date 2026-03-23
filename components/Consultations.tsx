'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, onSnapshot, addDoc, serverTimestamp, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { Search, Plus, ClipboardList, User, Stethoscope, FileText, Pill, MoreVertical, Filter, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Consultations() {
  const [consultations, setConsultations] = useState<any[]>([]);
  const [patients, setPatients] = useState<any[]>([]);
  const [doctors, setDoctors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newConsultation, setNewConsultation] = useState({
    patientId: '',
    doctorId: '',
    diagnosis: '',
    prescription: '',
    notes: ''
  });

  useEffect(() => {
    // Fetch consultations
    const q = query(collection(db, 'consultations'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const consultationData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setConsultations(consultationData);
      setLoading(false);
    });

    // Fetch patients for selection
    const fetchPatients = async () => {
      const snapshot = await getDocs(collection(db, 'patients'));
      setPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    };

    // Fetch doctors for selection
    const fetchDoctors = async () => {
      const snapshot = await getDocs(collection(db, 'users'));
      setDoctors(snapshot.docs.filter(doc => doc.data().role === 'doctor').map(doc => ({ id: doc.id, ...doc.data() })));
    };

    fetchPatients();
    fetchDoctors();

    return () => unsubscribe();
  }, []);

  const handleAddConsultation = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'consultations'), {
        ...newConsultation,
        date: serverTimestamp(),
        createdAt: serverTimestamp()
      });
      setIsAddModalOpen(false);
      setNewConsultation({
        patientId: '',
        doctorId: '',
        diagnosis: '',
        prescription: '',
        notes: ''
      });
    } catch (error) {
      console.error("Error adding consultation:", error);
    }
  };

  const getPatientName = (id: string) => patients.find(p => p.id === id)?.name || 'Patient Inconnu';
  const getDoctorName = (id: string) => doctors.find(d => d.id === id)?.name || 'Docteur Inconnu';

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <h2 className="text-2xl font-bold text-slate-900">Dossiers Médicaux & Consultations</h2>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 font-bold hover:bg-slate-50 transition-all shadow-sm">
            <Filter size={20} />
            Filtrer
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
          >
            <Stethoscope size={20} />
            Nouvelle Consultation
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
          </div>
        ) : consultations.length === 0 ? (
          <div className="bg-white p-20 rounded-[2.5rem] border border-slate-200 text-center">
            <ClipboardList size={48} className="mx-auto text-slate-200 mb-4" />
            <p className="text-slate-500 italic">Aucune consultation enregistrée.</p>
          </div>
        ) : (
          consultations.map((con) => (
            <motion.div 
              key={con.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
                    <ClipboardList size={28} />
                  </div>
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-xl font-bold text-slate-900">{getPatientName(con.patientId)}</h4>
                      <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                        <span className="flex items-center gap-1.5"><Calendar size={14} /> {con.date ? format(con.date.toDate(), 'dd MMMM yyyy', { locale: fr }) : ''}</span>
                        <span className="flex items-center gap-1.5"><User size={14} /> Dr. {getDoctorName(con.doctorId)}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <FileText size={12} /> Diagnostic
                        </p>
                        <p className="text-slate-700 font-medium leading-relaxed">{con.diagnosis}</p>
                      </div>
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Pill size={12} /> Prescription
                        </p>
                        <p className="text-slate-700 font-medium leading-relaxed">{con.prescription || 'Aucune prescription'}</p>
                      </div>
                    </div>
                  </div>
                </div>
                <button className="p-2 text-slate-400 hover:text-slate-900 transition-colors">
                  <MoreVertical size={20} />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Add Consultation Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200"
            >
              <div className="p-8 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-900">Nouvelle Consultation</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-900 transition-colors">
                  <Plus className="rotate-45" size={28} />
                </button>
              </div>
              <form onSubmit={handleAddConsultation} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Patient</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      value={newConsultation.patientId}
                      onChange={(e) => setNewConsultation({...newConsultation, patientId: e.target.value})}
                    >
                      <option value="">Sélectionner un patient</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Docteur</label>
                    <select 
                      required
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                      value={newConsultation.doctorId}
                      onChange={(e) => setNewConsultation({...newConsultation, doctorId: e.target.value})}
                    >
                      <option value="">Sélectionner un docteur</option>
                      {doctors.map(d => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Diagnostic</label>
                  <textarea 
                    required
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    rows={3}
                    placeholder="Entrez le diagnostic..."
                    value={newConsultation.diagnosis}
                    onChange={(e) => setNewConsultation({...newConsultation, diagnosis: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Prescription</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    rows={3}
                    placeholder="Entrez la prescription..."
                    value={newConsultation.prescription}
                    onChange={(e) => setNewConsultation({...newConsultation, prescription: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Notes Additionnelles</label>
                  <textarea 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                    rows={2}
                    placeholder="Notes supplémentaires..."
                    value={newConsultation.notes}
                    onChange={(e) => setNewConsultation({...newConsultation, notes: e.target.value})}
                  />
                </div>
                <div className="flex justify-end gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-6 py-3 text-slate-600 font-bold hover:bg-slate-50 rounded-xl transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    Enregistrer la Consultation
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
