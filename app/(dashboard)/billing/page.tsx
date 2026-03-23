'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Download, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  MoreVertical,
  Printer,
  FileText,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  X,
  Trash2,
  Ticket,
  Eye
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

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [previewInvoice, setPreviewInvoice] = useState<any | null>(null);
  const [previewType, setPreviewType] = useState<'invoice' | 'ticket' | null>(null);

  useEffect(() => {
    const path = 'invoices';
    let unsubscribe: (() => void) | null = null;
    
    const authUnsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        const q = query(collection(db, path), orderBy('createdAt', 'desc'));
        
        unsubscribe = onSnapshot(q, (snapshot) => {
          const docs = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setInvoices(docs);
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
  const [formData, setFormData] = useState({
    patient: '',
    amount: '',
    status: 'Impayé',
    method: 'Espèces'
  });

  const filteredInvoices = React.useMemo(() => {
    return invoices.filter(inv => 
      inv.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.id.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [invoices, searchTerm]);

  const financialStats = React.useMemo(() => {
    const totalRevenue = invoices.filter(inv => inv.status === 'Payé').reduce((acc, inv) => acc + inv.amount, 0);
    const pendingPayments = invoices.filter(inv => inv.status === 'Impayé').reduce((acc, inv) => acc + inv.amount, 0);
    const paidInvoicesCount = invoices.filter(inv => inv.status === 'Payé').length;
    const averageValue = invoices.length > 0 ? Math.round(invoices.reduce((acc, inv) => acc + inv.amount, 0) / invoices.length) : 0;
    
    return { totalRevenue, pendingPayments, paidInvoicesCount, averageValue };
  }, [invoices]);

  const handleOpenModal = () => {
    setFormData({
      patient: '',
      amount: '',
      status: 'Impayé',
      method: 'Espèces'
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const path = 'invoices';
    try {
      const invoiceId = `INV-${(invoices.length + 1).toString().padStart(3, '0')}`;
      const newInvoice = {
        invoiceId,
        patient: formData.patient,
        amount: parseFloat(formData.amount),
        status: formData.status,
        date: new Date().toISOString().split('T')[0],
        method: formData.status === 'Impayé' ? '-' : formData.method,
        createdAt: Timestamp.now()
      };
      
      await addDoc(collection(db, 'invoices'), newInvoice);
      setIsModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  const deleteInvoice = async (id: string) => {
    setInvoiceToDelete(id);
    setIsConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!invoiceToDelete) return;
    const path = `invoices/${invoiceToDelete}`;
    try {
      await deleteDoc(doc(db, 'invoices', invoiceToDelete));
      setInvoiceToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, path);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Payé': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
      case 'Impayé': return 'bg-rose-50 text-rose-600 border-rose-100';
      case 'Partiel': return 'bg-amber-50 text-amber-600 border-amber-100';
      default: return 'bg-slate-50 text-slate-600 border-slate-100';
    }
  };

  const exportToPDF = async (invoice: any) => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF() as any;
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(244, 166, 8); // Yellow-Clinic (#F4A608)
    doc.text('TOUBA CLINIC', 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text('Dakar, Senegal', 20, 28);
    doc.text('Phone: +221 33 123 45 67', 20, 33);
    
    // Invoice Info
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // Slate-900
    doc.text('FACTURE', 140, 20);
    
    doc.setFontSize(10);
    doc.text(`Facture #: ${invoice.id}`, 140, 28);
    doc.text(`Date: ${invoice.date}`, 140, 33);
    doc.text(`Statut: ${invoice.status}`, 140, 38);
    
    // Patient Info
    doc.setDrawColor(226, 232, 240); // Slate-200
    doc.line(20, 45, 190, 45);
    
    doc.setFontSize(12);
    doc.text('Facturer à :', 20, 55);
    doc.setFontSize(10);
    doc.text(invoice.patient, 20, 62);
    
    // Table
    autoTable(doc, {
      startY: 75,
      head: [['Description', 'Quantité', 'Prix unitaire', 'Total']],
      body: [
        ['Consultation médicale', '1', `${invoice.amount} CFA`, `${invoice.amount} CFA`],
        ['Analyses de laboratoire', '0', '0 CFA', '0 CFA'],
        ['Médicaments sur ordonnance', '0', '0 CFA', '0 CFA'],
      ],
      headStyles: { fillColor: [244, 166, 8] },
      theme: 'grid'
    });
    
    // Total
    const finalY = (doc as any).lastAutoTable.finalY;
    doc.setFontSize(12);
    doc.text(`Montant total : ${invoice.amount} CFA`, 140, finalY + 20);
    
    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text('Merci d\'avoir choisi la Clinique TOUBA.', 20, 280);
    
    doc.save(`Invoice-${invoice.id}.pdf`);
  };

  const exportToTicket = async (invoice: any) => {
    const { default: jsPDF } = await import('jspdf');
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [80, 150]
    }) as any;

    const width = 80;
    let y = 10;

    doc.setFontSize(14);
    doc.setTextColor(244, 166, 8);
    doc.text('TOUBA CLINIC', width / 2, y, { align: 'center' });
    
    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text('Dakar, Senegal', width / 2, y, { align: 'center' });
    y += 4;
    doc.text('Tel: +221 33 123 45 67', width / 2, y, { align: 'center' });
    
    y += 6;
    doc.setDrawColor(200);
    doc.line(5, y, width - 5, y);
    
    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(0);
    doc.text('RECU DE PAIEMENT', width / 2, y, { align: 'center' });
    
    y += 8;
    doc.setFontSize(8);
    doc.text(`Facture: ${invoice.id}`, 5, y);
    y += 4;
    doc.text(`Date: ${invoice.date}`, 5, y);
    y += 4;
    doc.text(`Patient: ${invoice.patient}`, 5, y);
    
    y += 6;
    doc.line(5, y, width - 5, y);
    
    y += 6;
    doc.setFontSize(9);
    doc.text('Description', 5, y);
    doc.text('Total', width - 5, y, { align: 'right' });
    
    y += 6;
    doc.setFontSize(8);
    doc.text('Consultation médicale', 5, y);
    doc.text(`${invoice.amount} CFA`, width - 5, y, { align: 'right' });
    
    y += 10;
    doc.line(5, y, width - 5, y);
    
    y += 6;
    doc.setFontSize(10);
    doc.text('TOTAL:', 5, y);
    doc.text(`${invoice.amount} CFA`, width - 5, y, { align: 'right' });
    
    y += 6;
    doc.setFontSize(8);
    doc.text(`Méthode: ${invoice.method}`, 5, y);
    
    y += 10;
    doc.setFontSize(7);
    doc.text('Merci de votre confiance.', width / 2, y, { align: 'center' });
    
    doc.save(`Ticket-${invoice.id}.pdf`);
  };

  const handlePreview = (invoice: any, type: 'invoice' | 'ticket') => {
    setPreviewInvoice(invoice);
    setPreviewType(type);
  };

  const confirmPrint = () => {
    if (!previewInvoice || !previewType) return;
    if (previewType === 'invoice') {
      exportToPDF(previewInvoice);
    } else {
      exportToTicket(previewInvoice);
    }
    setPreviewInvoice(null);
    setPreviewType(null);
  };

  const exportAllToPDF = async () => {
    const { default: jsPDF } = await import('jspdf');
    const { default: autoTable } = await import('jspdf-autotable');
    const doc = new jsPDF() as any;
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(16, 185, 129); // Emerald-600
    doc.text('TOUBA CLINIC - Rapport de Facturation', 20, 20);
    
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate-500
    doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, 20, 28);
    
    // Table
    const tableData = filteredInvoices.map(inv => [
      inv.id,
      inv.patient,
      inv.date,
      `${inv.amount} CFA`,
      inv.method,
      inv.status
    ]);

    autoTable(doc, {
      startY: 35,
      head: [['ID Facture', 'Patient', 'Date', 'Montant', 'Méthode', 'Statut']],
      body: tableData,
      headStyles: { fillColor: [16, 185, 129] },
      theme: 'grid'
    });
    
    doc.save(`Rapport-Facturation-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Facturation et factures</h2>
          <p className="text-slate-500 mt-1">Gérez les paiements des patients, les factures et les rapports financiers.</p>
        </div>
        <button 
          onClick={handleOpenModal}
          className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10"
        >
          <Plus size={16} />
          <span>Nouvelle facture</span>
        </button>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <DollarSign size={20} />
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full">
              <ArrowUpRight size={12} />
              +15.2%
            </div>
          </div>
          <p className="text-slate-500 text-xs font-medium">Revenu total</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{financialStats.totalRevenue.toLocaleString()} CFA</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Clock size={20} />
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full">
              <ArrowDownRight size={12} />
              -5.4%
            </div>
          </div>
          <p className="text-slate-500 text-xs font-medium">Paiements en attente</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{financialStats.pendingPayments.toLocaleString()} CFA</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <CheckCircle2 size={20} />
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full">
              <ArrowUpRight size={12} />
              +8.1%
            </div>
          </div>
          <p className="text-slate-500 text-xs font-medium">Factures payées</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{financialStats.paidInvoicesCount.toLocaleString()}</h3>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
            <div className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
              <ArrowUpRight size={12} />
              +12.5%
            </div>
          </div>
          <p className="text-slate-500 text-xs font-medium">Valeur moyenne</p>
          <h3 className="text-xl font-bold text-slate-900 mt-1">{financialStats.averageValue.toLocaleString()} CFA</h3>
        </div>
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-slate-900">Factures récentes</h3>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Rechercher..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all outline-none"
              />
            </div>
            <button 
              onClick={exportAllToPDF}
              className="p-2 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
              title="Exporter toutes les factures"
            >
              <Download size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">ID Facture</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Patient</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Montant</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Méthode</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-slate-400" />
                      <span className="text-sm font-bold text-slate-900">{invoice.id}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-700">{invoice.patient}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{invoice.date}</td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{invoice.amount} CFA</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{invoice.method}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wider ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handlePreview(invoice, 'invoice')}
                        className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                        title="Aperçu Facture"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => handlePreview(invoice, 'ticket')}
                        className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-all"
                        title="Aperçu Ticket"
                      >
                        <Ticket size={18} />
                      </button>
                      <button 
                        onClick={() => handlePreview(invoice, 'invoice')}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" 
                        title="Aperçu et Imprimer"
                      >
                        <Printer size={18} />
                      </button>
                      <button 
                        onClick={() => deleteInvoice(invoice.id)}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Supprimer la facture"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-slate-900">Nouvelle Facture</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                  <X size={24} className="text-slate-400" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Patient</label>
                  <input 
                    type="text" 
                    required
                    value={formData.patient}
                    onChange={(e) => setFormData({ ...formData, patient: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                    placeholder="Nom du patient" 
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-700">Montant (CFA)</label>
                  <input 
                    type="number" 
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none" 
                    placeholder="0.00" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Statut</label>
                    <select 
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none"
                    >
                      <option value="Payé">Payé</option>
                      <option value="Impayé">Impayé</option>
                      <option value="Partiel">Partiel</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">Méthode</label>
                    <select 
                      value={formData.method}
                      disabled={formData.status === 'Impayé'}
                      onChange={(e) => setFormData({ ...formData, method: e.target.value })}
                      className="w-full px-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-emerald-500/20 outline-none disabled:opacity-50"
                    >
                      <option value="Espèces">Espèces</option>
                      <option value="Carte">Carte</option>
                      <option value="Virement">Virement</option>
                      <option value="Wave">Wave</option>
                      <option value="Orange Money">Orange Money</option>
                    </select>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-200 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10"
                  >
                    Créer la facture
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmationModal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Supprimer la facture"
        message="Êtes-vous sûr de vouloir supprimer cette facture ? Cette action est irréversible."
        confirmText="Supprimer"
        type="danger"
      />

      {/* Preview Modal */}
      <AnimatePresence>
        {previewInvoice && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col ${previewType === 'ticket' ? 'max-w-xs w-full' : 'max-w-2xl w-full'}`}
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                  <Eye size={20} className="text-emerald-600" />
                  Aperçu du {previewType === 'ticket' ? 'Ticket' : 'Document'}
                </h3>
                <button onClick={() => setPreviewInvoice(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                  <X size={20} className="text-slate-500" />
                </button>
              </div>

              <div className="p-8 overflow-y-auto max-h-[70vh] bg-slate-50/30">
                {previewType === 'ticket' ? (
                  <div className="bg-white p-6 shadow-sm border border-slate-200 mx-auto font-mono text-sm space-y-4 max-w-[280px]">
                    <div className="text-center border-b border-dashed border-slate-200 pb-4">
                      <h4 className="font-bold text-lg text-amber-600">TOUBA CLINIC</h4>
                      <p className="text-[10px] text-slate-500">Dakar, Senegal</p>
                      <p className="text-[10px] text-slate-500">Tel: +221 33 123 45 67</p>
                    </div>
                    <div className="py-4 space-y-1 text-[11px]">
                      <p className="font-bold text-center mb-2">RECU DE PAIEMENT</p>
                      <p>Facture: {previewInvoice.id}</p>
                      <p>Date: {previewInvoice.date}</p>
                      <p>Patient: {previewInvoice.patient}</p>
                    </div>
                    <div className="border-t border-b border-dashed border-slate-200 py-2 text-[11px]">
                      <div className="flex justify-between">
                        <span>Consultation</span>
                        <span>{previewInvoice.amount} CFA</span>
                      </div>
                    </div>
                    <div className="pt-2">
                      <div className="flex justify-between font-bold text-base">
                        <span>TOTAL:</span>
                        <span>{previewInvoice.amount} CFA</span>
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">Méthode: {previewInvoice.method}</p>
                    </div>
                    <div className="text-center pt-4 text-[10px] text-slate-400">
                      Merci de votre confiance.
                    </div>
                  </div>
                ) : (
                  <div className="bg-white p-10 shadow-sm border border-slate-200 rounded-lg space-y-8">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="text-2xl font-bold text-amber-600">TOUBA CLINIC</h4>
                        <p className="text-sm text-slate-500">Dakar, Senegal</p>
                        <p className="text-sm text-slate-500">Phone: +221 33 123 45 67</p>
                      </div>
                      <div className="text-right">
                        <h4 className="text-xl font-bold text-slate-900">FACTURE</h4>
                        <p className="text-sm text-slate-500">Facture #: {previewInvoice.id}</p>
                        <p className="text-sm text-slate-500">Date: {previewInvoice.date}</p>
                      </div>
                    </div>
                    <div className="border-t border-slate-100 pt-6">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Facturer à :</p>
                      <p className="text-lg font-bold text-slate-900">{previewInvoice.patient}</p>
                    </div>
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b-2 border-slate-900">
                          <th className="py-3 text-sm font-bold">Description</th>
                          <th className="py-3 text-sm font-bold text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="py-4 text-sm">Consultation médicale</td>
                          <td className="py-4 text-sm text-right font-bold">{previewInvoice.amount} CFA</td>
                        </tr>
                      </tbody>
                    </table>
                    <div className="flex justify-end pt-6 border-t border-slate-100">
                      <div className="text-right">
                        <p className="text-sm text-slate-500">Montant total</p>
                        <p className="text-2xl font-bold text-slate-900">{previewInvoice.amount} CFA</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button 
                  onClick={() => setPreviewInvoice(null)}
                  className="px-4 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-100 transition-all"
                >
                  Annuler
                </button>
                <button 
                  onClick={confirmPrint}
                  className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all shadow-md shadow-emerald-600/10"
                >
                  <Printer size={16} />
                  <span>Confirmer et Imprimer</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
