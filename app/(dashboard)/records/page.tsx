'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  FileText, 
  User, 
  Stethoscope, 
  Calendar, 
  Download, 
  MoreVertical,
  Pill,
  Activity,
  ClipboardList,
  ChevronRight,
  Paperclip,
  X,
  Printer,
  History,
  FileSearch
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  doc, 
  query, 
  orderBy, 
  deleteDoc,
  Timestamp
} from 'firebase/firestore';
import { db, auth } from '@/lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import ConfirmationModal from '@/components/ConfirmationModal';
import PromptModal from '@/components/PromptModal';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export default function MedicalRecordsPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'records' | 'attachments'>('records');
  const [loading, setLoading] = useState(true);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [isAttachmentPromptOpen, setIsAttachmentPromptOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<string | null>(null);
  const [activeRecordId, setActiveRecordId] = useState<string | null>(null);
  const [recordFormData, setRecordFormData] = useState({
    patient: '',
    diagnosis: '',
    notes: '',
    history: '',
    prescriptions: ''
  });

  useEffect(() => {
    const path = 'consultations';
    let unsubscribe: (() => void) | null = null;
    
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, path), orderBy('createdAt', 'desc'));
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setRecords(docs);
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, path);
        });
      } else {
        if (unsubscribe) {
          unsubscribe();
          unsubscribe = null;
        }
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const filteredRecords = React.useMemo(() => {
    return records.filter(rec => 
      rec.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rec.diagnosis.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [records, searchTerm]);

  const allAttachments = React.useMemo(() => {
    return records.flatMap(rec => 
      rec.attachments.map((att: any) => ({ ...att, patient: rec.patient, recordId: rec.id }))
    );
  }, [records]);

  const filteredAttachments = React.useMemo(() => {
    return allAttachments.filter((att: any) => 
      att.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      att.patient.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [allAttachments, searchTerm]);

  const addRecord = async () => {
    setRecordFormData({
      patient: '',
      diagnosis: '',
      notes: '',
      history: '',
      prescriptions: ''
    });
    setIsRecordModalOpen(true);
  };

  const handleRecordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'consultations';
    try {
      const newRecord = {
        patient: recordFormData.patient,
        doctor: 'Dr. Khadim',
        date: new Date().toISOString().split('T')[0],
        diagnosis: recordFormData.diagnosis,
        prescriptions: recordFormData.prescriptions.split(',').map(p => p.trim()).filter(p => p),
        attachments: [],
        notes: recordFormData.notes || 'Nouvelle consultation ajoutée.',
        history: recordFormData.history || 'Aucun antécédent spécifié.',
        vitals: { temp: '37.0°C', bp: '120/80', pulse: '70 bpm' },
        createdAt: Timestamp.now()
      };
      
      await addDoc(collection(db, 'consultations'), newRecord);
      setIsRecordModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const addAttachment = (recordId: string) => {
    setActiveRecordId(recordId);
    setIsAttachmentPromptOpen(true);
  };

  const handleAttachmentConfirm = async (fileName: string) => {
    if (!activeRecordId) return;
    const path = `consultations/${activeRecordId}`;
    try {
      const record = records.find(r => r.id === activeRecordId);
      if (record) {
        const newAttachments = [
          ...record.attachments,
          { name: fileName, size: '0.5 MB', date: new Date().toISOString().split('T')[0] }
        ];
        await updateDoc(doc(db, 'consultations', activeRecordId), {
          attachments: newAttachments
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }
  };

  const deleteRecord = async (id: string) => {
    setRecordToDelete(id);
    setIsConfirmDeleteOpen(true);
  };

  const confirmDeleteRecord = async () => {
    if (!recordToDelete) return;
    const path = `consultations/${recordToDelete}`;
    try {
      await deleteDoc(doc(db, 'consultations', recordToDelete));
      setRecordToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const openDetailModal = (record: any) => {
    setSelectedRecord(record);
    setIsDetailModalOpen(true);
  };

  const handleExport = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF();
    
    // Add title
    doc.setFontSize(20);
    doc.setTextColor(16, 185, 129); // Emerald 600
    doc.text('Clinique TOUBA - Dossiers Médicaux', 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Généré le : ${new Date().toLocaleString('fr-FR')}`, 14, 30);

    if (activeTab === 'records') {
      const tableData = filteredRecords.map(rec => [
        rec.date,
        rec.patient,
        rec.doctor,
        rec.diagnosis,
        rec.prescriptions.join(', ')
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Date', 'Patient', 'Médecin', 'Diagnostic', 'Prescriptions']],
        body: tableData,
        headStyles: { fillColor: [16, 185, 129] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
      
      doc.save('dossiers_medicaux.pdf');
    } else {
      const tableData = filteredAttachments.map(att => [
        att.date,
        att.name,
        att.patient,
        att.size
      ]);

      autoTable(doc, {
        startY: 40,
        head: [['Date', 'Nom du fichier', 'Patient', 'Taille']],
        body: tableData,
        headStyles: { fillColor: [16, 185, 129] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
      });
      
      doc.save('pieces_jointes.pdf');
    }
  };

  const handlePrint = async (record: any) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129);
    doc.text('Clinique TOUBA', 14, 20);
    
    doc.setFontSize(16);
    doc.setTextColor(50);
    doc.text('Dossier Médical', 14, 30);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Référence : ${record.id}`, 14, 38);
    doc.text(`Date : ${record.date}`, 14, 43);
    
    doc.setDrawColor(200);
    doc.line(14, 48, 196, 48);
    
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text('INFORMATIONS PATIENT', 14, 58);
    doc.setFontSize(10);
    doc.text(`Patient : ${record.patient}`, 14, 66);
    doc.text(`Médecin : ${record.doctor}`, 14, 71);
    
    doc.setFontSize(12);
    doc.text('SIGNES VITAUX', 14, 85);
    doc.setFontSize(10);
    doc.text(`Température : ${record.vitals?.temp || 'N/A'}`, 14, 93);
    doc.text(`Tension : ${record.vitals?.bp || 'N/A'}`, 14, 98);
    doc.text(`Pouls : ${record.vitals?.pulse || 'N/A'}`, 14, 103);
    
    doc.setFontSize(12);
    doc.text('DIAGNOSTIC & OBSERVATIONS', 14, 117);
    doc.setFontSize(10);
    const diagnosisLines = doc.splitTextToSize(record.diagnosis, 180);
    doc.text(diagnosisLines, 14, 125);
    
    const notesLines = doc.splitTextToSize(record.notes || '', 180);
    doc.text(notesLines, 14, 135 + (diagnosisLines.length * 5));
    
    doc.setFontSize(12);
    doc.text('PRESCRIPTIONS', 14, 160);
    doc.setFontSize(10);
    record.prescriptions.forEach((p: string, i: number) => {
      doc.text(`• ${p}`, 14, 168 + (i * 6));
    });
    
    doc.save(`dossier_${record.patient.replace(/\s+/g, '_')}.pdf`);
  };

  const downloadAttachment = async (att: any) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF();
    doc.text(`Document : ${att.name}`, 14, 20);
    doc.text(`Patient : ${att.patient}`, 14, 30);
    doc.text(`Date : ${att.date}`, 14, 40);
    doc.text(`Taille : ${att.size}`, 14, 50);
    doc.text('Ceci est un document généré pour la démonstration.', 14, 70);
    doc.save(`${att.name}.pdf`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Dossiers Médicaux</h2>
          <p className="text-slate-500 mt-1">Accédez et gérez les diagnostics, les prescriptions et l&apos;historique des patients.</p>
        </div>
          <button 
            onClick={addRecord}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
          >
            <Plus size={18} />
            <span>Nouveau dossier</span>
          </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button 
          onClick={() => setActiveTab('records')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'records' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Dossiers Médicaux
        </button>
        <button 
          onClick={() => setActiveTab('attachments')}
          className={`px-6 py-3 text-sm font-bold transition-all border-b-2 ${activeTab === 'attachments' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
        >
          Pièces Jointes
        </button>
      </div>

      {/* Stats / Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="flex-1 relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
            <input 
              type="text" 
              placeholder={activeTab === 'records' ? "Rechercher par patient ou diagnostic..." : "Rechercher une pièce jointe..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all outline-none"
            />
          </div>
          <button 
            onClick={handleExport}
            className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            title="Exporter en PDF"
          >
            <Download size={20} />
          </button>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ClipboardList size={20} />
            </div>
            <span className="text-sm font-bold text-slate-700">
              {searchTerm ? (activeTab === 'records' ? 'Dossiers trouvés' : 'Pièces trouvées') : (activeTab === 'records' ? 'Total des dossiers' : 'Total des pièces jointes')}
            </span>
          </div>
          <span className="text-xl font-bold text-slate-900">{activeTab === 'records' ? filteredRecords.length : filteredAttachments.length}</span>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-4">
        {activeTab === 'records' ? (
          filteredRecords.map((record, index) => (
            <motion.div
              key={record.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-all group"
            >
              <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                {/* Date & ID */}
                <div className="lg:w-32 flex flex-col items-center justify-center border-r border-slate-100 pr-6">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{record.id}</p>
                  <p className="text-lg font-bold text-slate-900 mt-1">{record.date.split('-')[2]}</p>
                  <p className="text-sm font-semibold text-slate-500">{record.date.split('-')[1]}/{record.date.split('-')[0]}</p>
                </div>

                {/* Patient & Doctor */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Patient</p>
                        <p className="text-base font-bold text-slate-900">{record.patient}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                        <Stethoscope size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Médecin</p>
                        <p className="text-base font-bold text-slate-900">{record.doctor}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                        <Activity size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Diagnostic</p>
                        <p className="text-base font-bold text-slate-900">{record.diagnosis}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                        <Pill size={20} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Prescriptions</p>
                        <div className="flex flex-wrap gap-2 mt-1">
                          {record.prescriptions.map((p: string) => (
                            <span key={p} className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-bold">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 lg:pl-6 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0">
                  <button 
                    onClick={() => {
                      setSelectedRecord(record);
                      setIsDetailModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 text-slate-400 text-sm font-medium hover:text-emerald-600 transition-all"
                  >
                    <Paperclip size={16} />
                    {record.attachments.length}
                  </button>
                  <button 
                    onClick={() => openDetailModal(record)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-sm font-bold hover:bg-slate-200 transition-all"
                  >
                    Voir le dossier complet
                    <ChevronRight size={16} />
                  </button>
                  <button 
                    onClick={() => deleteRecord(record.id)}
                    className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    title="Supprimer le dossier"
                  >
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAttachments.map((att, index) => (
              <motion.div
                key={`${att.recordId}-${index}`}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex items-center gap-4 group"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-all">
                  <FileText size={24} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 truncate">{att.name}</p>
                  <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">{att.patient} • {att.size}</p>
                </div>
                <button 
                  onClick={() => downloadAttachment(att)}
                  className="p-2 text-slate-400 hover:text-emerald-600 transition-colors"
                >
                  <Download size={18} />
                </button>
              </motion.div>
            ))}
            {filteredAttachments.length === 0 && (
              <div className="col-span-full py-12 text-center">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Paperclip size={32} className="text-slate-300" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">Aucune pièce jointe trouvée</h3>
                <p className="text-slate-500">Les pièces jointes ajoutées aux dossiers médicaux apparaîtront ici.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {isDetailModalOpen && selectedRecord && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-3xl w-full shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <FileSearch size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">Dossier Médical Complet</h3>
                    <p className="text-slate-500 font-medium">Référence : {selectedRecord.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => handlePrint(selectedRecord)}
                    className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all" 
                    title="Imprimer"
                  >
                    <Printer size={20} />
                  </button>
                  <button onClick={() => setIsDetailModalOpen(false)} className="p-2.5 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all">
                    <X size={24} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Patient & Vitals */}
                <div className="space-y-8">
                  <section>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <User size={14} />
                      Informations Patient
                    </h4>
                    <div className="bg-slate-50 p-4 rounded-2xl space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Nom complet</span>
                        <span className="text-sm font-bold text-slate-900">{selectedRecord.patient}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Date de visite</span>
                        <span className="text-sm font-bold text-slate-900">{selectedRecord.date}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-slate-500">Médecin traitant</span>
                        <span className="text-sm font-bold text-slate-900">{selectedRecord.doctor}</span>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Activity size={14} />
                      Signes Vitaux
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="bg-emerald-50 p-3 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase">Temp</p>
                        <p className="text-sm font-bold text-emerald-900">{selectedRecord.vitals?.temp || 'N/A'}</p>
                      </div>
                      <div className="bg-blue-50 p-3 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-blue-600 uppercase">Tension</p>
                        <p className="text-sm font-bold text-blue-900">{selectedRecord.vitals?.bp || 'N/A'}</p>
                      </div>
                      <div className="bg-purple-50 p-3 rounded-xl text-center">
                        <p className="text-[10px] font-bold text-purple-600 uppercase">Pouls</p>
                        <p className="text-sm font-bold text-purple-900">{selectedRecord.vitals?.pulse || 'N/A'}</p>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <History size={14} />
                      Antécédents
                    </h4>
                    <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-2xl leading-relaxed">
                      {selectedRecord.history || 'Aucun antécédent particulier renseigné.'}
                    </p>
                  </section>
                </div>

                {/* Right Column: Diagnosis & Prescriptions */}
                <div className="space-y-8">
                  <section>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Activity size={14} />
                      Diagnostic & Observations
                    </h4>
                    <div className="space-y-4">
                      <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                        <p className="text-sm font-bold text-emerald-900">{selectedRecord.diagnosis}</p>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed italic">
                        &quot;{selectedRecord.notes || 'Pas de notes supplémentaires.'}&quot;
                      </p>
                    </div>
                  </section>

                  <section>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Pill size={14} />
                      Prescriptions Médicales
                    </h4>
                    <div className="space-y-2">
                      {selectedRecord.prescriptions.map((p: string, i: number) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                          <div className="w-2 h-2 rounded-full bg-blue-500" />
                          <span className="text-sm font-medium text-slate-700">{p}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <Paperclip size={14} />
                        Pièces Jointes ({selectedRecord.attachments.length})
                      </h4>
                      <button 
                        onClick={() => addAttachment(selectedRecord.id)}
                        className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all"
                        title="Ajouter une pièce jointe"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                    {selectedRecord.attachments.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2">
                        {selectedRecord.attachments.map((att: any, i: number) => (
                          <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl group hover:bg-slate-100 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400">
                                <FileText size={16} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-slate-700">{att.name}</p>
                                <p className="text-[10px] text-slate-500">{att.size} • {att.date}</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => downloadAttachment(att)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Download size={16} />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Aucune pièce jointe.</p>
                    )}
                  </section>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => setIsDetailModalOpen(false)}
                  className="px-8 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/20"
                >
                  Fermer le dossier
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Record Modal */}
      <AnimatePresence>
        {isRecordModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-8 max-w-xl w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-slate-900">Nouvelle Consultation</h3>
                <button onClick={() => setIsRecordModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleRecordSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Patient</label>
                  <input 
                    type="text" 
                    required
                    value={recordFormData.patient}
                    onChange={(e) => setRecordFormData({ ...recordFormData, patient: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                    placeholder="Nom du patient" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Diagnostic</label>
                  <input 
                    type="text" 
                    required
                    value={recordFormData.diagnosis}
                    onChange={(e) => setRecordFormData({ ...recordFormData, diagnosis: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                    placeholder="Diagnostic principal" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Prescriptions (séparées par des virgules)</label>
                  <input 
                    type="text" 
                    value={recordFormData.prescriptions}
                    onChange={(e) => setRecordFormData({ ...recordFormData, prescriptions: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                    placeholder="Paracétamol, Amoxicilline..." 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Antécédents</label>
                    <textarea 
                      rows={2}
                      value={recordFormData.history}
                      onChange={(e) => setRecordFormData({ ...recordFormData, history: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none" 
                      placeholder="Antécédents médicaux..." 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Notes</label>
                    <textarea 
                      rows={2}
                      value={recordFormData.notes}
                      onChange={(e) => setRecordFormData({ ...recordFormData, notes: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none resize-none" 
                      placeholder="Notes cliniques..." 
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsRecordModalOpen(false)}
                    className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => setIsConfirmDeleteOpen(false)}
        onConfirm={confirmDeleteRecord}
        title="Supprimer le dossier"
        message="Êtes-vous sûr de vouloir supprimer ce dossier médical ? Cette action est irréversible."
        confirmText="Supprimer"
        type="danger"
      />

      <PromptModal
        isOpen={isAttachmentPromptOpen}
        onClose={() => setIsAttachmentPromptOpen(false)}
        onConfirm={handleAttachmentConfirm}
        title="Ajouter une pièce jointe"
        label="Nom du fichier"
        placeholder="Ex: Analyse_Sang.pdf"
        confirmText="Ajouter"
      />
    </div>
  );
}
