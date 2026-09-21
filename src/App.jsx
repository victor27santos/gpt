import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Search, Plus, Wrench, Activity, FileText, ChevronRight, Save, ArrowLeft,
  CheckCircle2, Lock, User, LogOut, Image as ImageIcon, Video, ShieldCheck,
  PlayCircle, Calendar as CalendarIcon, ChevronLeft, Building, MapPin,
  ClipboardList, AlertTriangle, Lightbulb, TrendingUp, Sparkles, Loader2,
  RefreshCw, Check, X, Send, HardDrive, MessageSquare, FileEdit, Download,
  GraduationCap, Hash, FileSpreadsheet, Upload, Pencil,
  Mail, Bot, Zap, CloudOff, Trash2, History, BookOpen, Mic, Square, Paperclip
} from 'lucide-react';
import { api } from './api';

// --- CONFIGURAÇÕES E DADOS ---
const LOGIN_PROFILES = [
  { id: 'coord', name: 'Equipe de Coordenação', role: 'Gestão de Engenharia', canAddImprovements: false, canEditStatus: true, canEditSectorDetails: true },
  { id: 'tec5x2', name: 'Técnicos 5x2', role: 'Manutenção Rotineira', canAddImprovements: true, canEditStatus: true, canEditSectorDetails: false },
  { id: 'plantonista', name: 'Técnicos Plantonistas 12x36', role: 'Manutenção de Emergência', canAddImprovements: true, canEditStatus: true, canEditSectorDetails: false }
];

const PENDING_STATUS_FLOW = ['Aberto', 'Em atendimento', 'Aguardando peça', 'Concluído', 'Encerrado'];
const STATUS_COLORS = { 'Aberto': 'bg-rose-100 text-rose-700 border-rose-200', 'Em atendimento': 'bg-blue-100 text-blue-700 border-blue-200', 'Aguardando peça': 'bg-amber-100 text-amber-700 border-amber-200', 'Concluído': 'bg-emerald-100 text-emerald-700 border-emerald-200', 'Encerrado': 'bg-slate-200 text-slate-600 border-slate-300' };

// ============================================================================
// APP PRINCIPAL
// ============================================================================
export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [view, setView] = useState('sectors');
  const [entries, setEntries] = useState([]);
  const [events, setEvents] = useState([]);
  const [sectors, setSectors] = useState([]);
  const [fichas, setFichas] = useState([]);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [editingEntry, setEditingEntry] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const [sectorsData, fichasData, entriesData, eventsData] = await Promise.all([
          api.sectors.list(),
          api.fichas.list(),
          api.entries.list(),
          api.events.list(),
        ]);
        if (cancelled) return;
        setSectors(sectorsData);
        setFichas(fichasData);
        setEntries(entriesData);
        setEvents(eventsData);
      } catch (err) {
        if (!cancelled) setLoadError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isAuthenticated, reloadKey]);

  const handleLogin = (id, name) => {
    const profile = LOGIN_PROFILES.find(p => p.id === id) || LOGIN_PROFILES[0];
    setUser({ ...profile, name });
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    setView('sectors');
  };

  const handleInstallApp = () => {
      alert("Na versão real (PWA), isso instalaria o App Pegasus na tela inicial.");
      setInstallPrompt(false);
  };

  const handleSaveEntry = async (data) => {
      try {
          if (editingEntry) {
              const updated = await api.entries.update(editingEntry.id, {
                  ...data,
                  lastEditor: user.name,
                  lastEditDate: new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})
              });
              setEntries(entries.map(entry => entry.id === updated.id ? updated : entry));
              setEditingEntry(null);
          } else {
              const created = await api.entries.create({
                  ...data,
                  date: new Date().toLocaleDateString('pt-BR'),
                  author: user.name,
                  createdAt: new Date().toISOString()
              });
              setEntries([created, ...entries]);
          }
          setView('list');
      } catch (err) {
          alert(`Erro ao salvar registro: ${err.message}`);
      }
  };

  const handleDeleteEntry = async (id) => {
      const confirm = window.confirm(`Atenção ${user.name}: Deseja realmente excluir este registro? Esta ação não pode ser desfeita.`);
      if (!confirm) return;
      try {
          await api.entries.remove(id);
          setEntries(entries.filter(e => e.id !== id));
      } catch (err) {
          alert(`Erro ao excluir registro: ${err.message}`);
      }
  };

  const handleAddEvent = async (eventData) => {
      try {
          const created = await api.events.create(eventData);
          setEvents(prev => [...prev, created]);
      } catch (err) {
          alert(`Erro ao agendar: ${err.message}`);
      }
  };

  const handleEditClick = (entry) => {
      setEditingEntry(entry);
      setView('form');
  };

  if (!isAuthenticated) return <LoginScreen onLogin={handleLogin} />;

  if (loading) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
              <Loader2 className="animate-spin text-blue-600" size={40} />
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Carregando dados...</p>
          </div>
      );
  }

  if (loadError) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50 p-6 text-center">
              <CloudOff className="text-rose-400" size={40} />
              <p className="text-sm font-bold text-slate-600 max-w-sm">Não foi possível conectar ao servidor Pegasus. Verifique se o backend está rodando.</p>
              <p className="text-xs text-slate-400 max-w-sm">{loadError}</p>
              <button onClick={() => setReloadKey(k => k + 1)} className="mt-2 bg-blue-600 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-700">Tentar novamente</button>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-white flex flex-col font-sans selection:bg-blue-100 pb-20 md:pb-0">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-100/50 sticky top-0 z-30 px-4 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setView('sectors')}>
            <div className="bg-gradient-to-br from-blue-600 to-indigo-600 p-2.5 rounded-xl text-white shadow-md">
              <Activity size={22} />
            </div>
            <div>
              <h2 className="font-black text-slate-900 leading-tight text-lg">Pegasus</h2>
              <p className="text-xs text-blue-600 font-bold uppercase tracking-wider">{user.name}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{user.role}</p>
            </div>
          </div>

          <nav className="hidden md:flex bg-slate-100/50 p-1.5 rounded-2xl items-center backdrop-blur-sm overflow-x-auto no-scrollbar">
            <NavBtn active={view === 'sectors'} onClick={() => setView('sectors')} label="Setores" icon={<Building size={18}/>} />
            <NavBtn active={view === 'list'} onClick={() => setView('list')} label="Processos" icon={<FileText size={18}/>} />
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <NavBtn active={view === 'fichas'} onClick={() => setView('fichas')} label="Fichas" icon={<ClipboardList size={18} className={view === 'fichas' ? "text-amber-600" : ""}/>} />
            <NavBtn active={view === 'library'} onClick={() => setView('library')} label="Biblioteca" icon={<BookOpen size={18} className={view === 'library' ? "text-emerald-600" : ""}/>} />
            <NavBtn active={view === 'emails'} onClick={() => setView('emails')} label="Agente IA" icon={<Bot size={18} className={view === 'emails' ? "text-indigo-600" : ""}/>} />
            <NavBtn active={view === 'consultor'} onClick={() => setView('consultor')} label="Consultor Bot" icon={<Sparkles size={18} className={view === 'consultor' ? "text-purple-600" : ""}/>} />
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <NavBtn active={view === 'calendar'} onClick={() => setView('calendar')} label="Agenda" icon={<CalendarIcon size={18}/>} />
            <NavBtn active={view === 'improvements'} onClick={() => setView('improvements')} label="Melhorias" icon={<Lightbulb size={18}/>} />
          </nav>

          <div className="flex items-center gap-2">
            {installPrompt && (
                <button onClick={handleInstallApp} className="hidden md:flex items-center gap-2 bg-emerald-50 text-emerald-600 border border-emerald-200 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm">
                    <Download size={16} /> Instalar
                </button>
            )}
            <button onClick={handleLogout} className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"><LogOut size={22} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full p-4 md:p-6 flex-grow">
        {view === 'sectors' && <SectorsView sectors={sectors} onUpdateSector={s => setSectors(sectors.map(sec => sec.id === s.id ? s : sec))} user={user} onAddEvent={handleAddEvent} />}
        {view === 'list' && <HistoryView entries={entries} onAddClick={() => { setEditingEntry(null); setView('form'); }} onItemClick={e => { setSelectedEntry(e); setView('detail'); }} onEditClick={handleEditClick} onDeleteClick={handleDeleteEntry} />}
        {view === 'fichas' && <FichasView fichas={fichas} setFichas={setFichas} sectors={sectors} user={user} />}
        {view === 'library' && <LibraryView sectors={sectors} user={user} />}
        {view === 'calendar' && <CalendarView events={events} onAddEvent={handleAddEvent} techs={LOGIN_PROFILES} />}
        {view === 'improvements' && <ImprovementsView sectors={sectors} onUpdateSector={s => setSectors(sectors.map(sec => sec.id === s.id ? s : sec))} user={user} />}
        {view === 'emails' && <EmailsIAView />}
        {view === 'consultor' && <ConsultorView user={user} fichas={fichas} onSaveToLibrary={handleSaveEntry} />}
        {view === 'form' && <Form initialData={editingEntry} onSave={handleSaveEntry} onCancel={() => setView('list')} user={user} />}
        {view === 'detail' && selectedEntry && <Detail data={selectedEntry} onBack={() => setView('list')} />}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-start overflow-x-auto no-scrollbar p-3 shadow-2xl z-40 pb-safe gap-6 px-6">
          <MobileBtn active={view === 'sectors'} onClick={() => setView('sectors')} icon={<Building size={24}/>} label="Setores" />
          <MobileBtn active={view === 'fichas'} onClick={() => setView('fichas')} icon={<ClipboardList size={24} className={view === 'fichas' ? 'text-amber-600' : ''}/>} label="Fichas" />
          <MobileBtn active={view === 'library'} onClick={() => setView('library')} icon={<BookOpen size={24} className={view === 'library' ? 'text-emerald-600' : ''}/>} label="Biblioteca" />
          <MobileBtn active={view === 'emails'} onClick={() => setView('emails')} icon={<Bot size={24}/>} label="Agente" />
          <MobileBtn active={view === 'consultor'} onClick={() => setView('consultor')} icon={<Sparkles size={24}/>} label="Bot" />
          <MobileBtn active={view === 'improvements'} onClick={() => setView('improvements')} icon={<Lightbulb size={24}/>} label="Ideias" />
          <MobileBtn active={view === 'list'} onClick={() => setView('list')} icon={<FileText size={24}/>} label="Processos" />
      </nav>
    </div>
  );
}

// ============================================================================
// COMPONENTES PRINCIPAIS
// ============================================================================

function FichasView({ fichas, setFichas, sectors, user }) {
    const [search, setSearch] = useState('');
    const [showModal, setShowModal] = useState(false);
    const [selectedFicha, setSelectedFicha] = useState(null);

    const [formData, setFormData] = useState({
        equipamento: '', fabricante: '', modelo: '', patrimonio: '',
        setor: sectors[0]?.name || '', instalacao: '', ultimaCalib: '',
        proxCalib: '', status: 'Ativo', especificacoes: '', customFields: []
    });

    const filteredFichas = fichas.filter(f =>
        (f.equipamento || '').toLowerCase().includes(search.toLowerCase()) ||
        (f.patrimonio || '').includes(search)
    );

    const handleAddCustomField = () => {
        setFormData({ ...formData, customFields: [...formData.customFields, { key: '', value: '' }] });
    };

    const handleCustomFieldChange = (index, field, newValue) => {
        const updatedFields = [...formData.customFields];
        updatedFields[index][field] = newValue;
        setFormData({ ...formData, customFields: updatedFields });
    };

    const handleRemoveCustomField = (index) => {
        const updatedFields = formData.customFields.filter((_, i) => i !== index);
        setFormData({ ...formData, customFields: updatedFields });
    };

    const handleSave = async () => {
        if(!formData.equipamento || !formData.patrimonio) return alert("Preencha Equipamento e Patrimônio.");
        try {
            const created = await api.fichas.create(formData);
            setFichas([created, ...fichas]);
            setShowModal(false);
            setFormData({ equipamento: '', fabricante: '', modelo: '', patrimonio: '', setor: sectors[0]?.name || '', instalacao: '', ultimaCalib: '', proxCalib: '', status: 'Ativo', especificacoes: '', customFields: [] });
        } catch (err) {
            alert(`Erro ao salvar ficha: ${err.message}`);
        }
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden min-h-[500px] flex flex-col relative">
                <div className="p-8 border-b bg-slate-50/50 flex flex-col gap-4 relative">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2"><ClipboardList className="text-amber-600"/> Inventário e Fichas</h1>
                            <p className="text-slate-500 font-medium">Controle de equipamentos, garantias, calibrações e dados técnicos customizáveis.</p>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto items-center">
                            <div className="relative w-full md:w-auto">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={16} />
                                <input type="text" placeholder="Buscar Patrimônio ou Nome..." className="w-full md:w-72 pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl outline-none focus:border-amber-400 font-bold text-xs shadow-sm transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
                            </div>
                            <button onClick={() => setShowModal(true)} className="bg-amber-600 text-white px-4 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-amber-700 shadow-md flex items-center gap-2 transition-all active:scale-95">
                                <Plus size={16}/> <span className="hidden sm:block">Nova Ficha</span>
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-8 bg-slate-50/30 flex-grow">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredFichas.map(ficha => (
                            <div key={ficha.id} onClick={() => setSelectedFicha(ficha)} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-amber-300 transition-all flex flex-col cursor-pointer group">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 rounded-2xl bg-amber-50 text-amber-600"><HardDrive size={24}/></div>
                                    <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border">PAT: {ficha.patrimonio}</span>
                                </div>
                                <h3 className="font-black text-slate-800 text-sm mb-1 leading-tight group-hover:text-amber-700 transition-colors">{ficha.equipamento}</h3>
                                <p className="text-[10px] text-slate-400 font-black uppercase mb-4 tracking-[0.1em]">{ficha.fabricante} • {ficha.modelo}</p>
                                <div className="mt-auto pt-4 border-t border-slate-50 flex flex-col gap-2 text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                    <div className="flex justify-between"><span className="flex items-center gap-1"><MapPin size={10}/> {ficha.setor}</span></div>
                                    <div className="flex justify-between"><span className="text-emerald-600 border border-emerald-200 bg-emerald-50 px-2 py-0.5 rounded">Calib: {ficha.proxCalib || 'N/A'}</span></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white w-full max-w-3xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-black text-slate-800 flex items-center gap-2"><ClipboardList className="text-amber-600"/> Cadastrar Ficha Técnica</h3>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-rose-50 hover:text-rose-500 rounded-full transition-colors"><X size={20}/></button>
                        </div>
                        <div className="p-8 flex-grow overflow-y-auto space-y-6">

                            <div className="grid grid-cols-2 gap-4">
                                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Equipamento *</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400" value={formData.equipamento} onChange={e=>setFormData({...formData, equipamento: e.target.value})} placeholder="Ex: Bomba de Infusão"/></div>
                                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Patrimônio *</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400" value={formData.patrimonio} onChange={e=>setFormData({...formData, patrimonio: e.target.value})} placeholder="Ex: 12345"/></div>
                                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Fabricante</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400" value={formData.fabricante} onChange={e=>setFormData({...formData, fabricante: e.target.value})}/></div>
                                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Modelo</label><input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400" value={formData.modelo} onChange={e=>setFormData({...formData, modelo: e.target.value})}/></div>
                                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Última Calibração</label><input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400" value={formData.ultimaCalib} onChange={e=>setFormData({...formData, ultimaCalib: e.target.value})}/></div>
                                <div><label className="text-[10px] font-black uppercase text-slate-400 ml-1">Próxima Calibração</label><input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400" value={formData.proxCalib} onChange={e=>setFormData({...formData, proxCalib: e.target.value})}/></div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Especificações Técnicas Gerais</label>
                                <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium outline-none resize-none focus:ring-2 focus:ring-amber-400" rows={3} value={formData.especificacoes} onChange={e=>setFormData({...formData, especificacoes: e.target.value})}/>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <div className="flex justify-between items-center mb-3">
                                    <label className="text-[10px] font-black uppercase text-slate-400">Campos Personalizados (Opcional)</label>
                                    <button onClick={handleAddCustomField} className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                                        <Plus size={12}/> Adicionar Campo
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {formData.customFields.map((field, idx) => (
                                        <div key={idx} className="flex gap-2 animate-slide-up">
                                            <input className="w-1/3 p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400" placeholder="Nome (Ex: Tensão)" value={field.key} onChange={e => handleCustomFieldChange(idx, 'key', e.target.value)} />
                                            <input className="flex-grow p-3 bg-white border border-slate-200 rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-amber-400" placeholder="Valor (Ex: 220V)" value={field.value} onChange={e => handleCustomFieldChange(idx, 'value', e.target.value)} />
                                            <button onClick={() => handleRemoveCustomField(idx)} className="p-3 text-rose-400 hover:bg-rose-50 hover:text-rose-600 rounded-xl transition-colors border border-transparent">
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    ))}
                                    {formData.customFields.length === 0 && (
                                        <p className="text-xs text-slate-400 italic">Adicione informações extras que a sua ficha exige.</p>
                                    )}
                                </div>
                            </div>

                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                            <button onClick={() => setShowModal(false)} className="px-6 py-3 text-slate-500 font-bold text-xs uppercase hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                            <button onClick={handleSave} className="bg-amber-600 text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-md hover:bg-amber-700 transition-all active:scale-95 flex items-center gap-2"><Save size={16}/> Salvar Ficha</button>
                        </div>
                    </div>
                </div>
            )}

            {selectedFicha && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 border-b bg-slate-50 flex justify-between items-start">
                            <div>
                                <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border border-amber-200">PAT: {selectedFicha.patrimonio}</span>
                                <h2 className="text-3xl font-black text-slate-800 mt-4 leading-tight">{selectedFicha.equipamento}</h2>
                                <p className="text-slate-500 font-bold text-sm mt-1">{selectedFicha.fabricante} • Modelo {selectedFicha.modelo}</p>
                            </div>
                            <button onClick={() => setSelectedFicha(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-rose-500 shadow-sm border border-slate-200 transition-all"><X size={20}/></button>
                        </div>
                        <div className="p-8 space-y-6 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Setor Atual</p><p className="font-bold text-slate-700 text-sm flex items-center gap-1"><MapPin size={14}/> {selectedFicha.setor}</p></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Status Operacional</p><p className="font-black text-emerald-600 text-sm uppercase flex items-center gap-1"><CheckCircle2 size={14}/> {selectedFicha.status}</p></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Última Calibração</p><p className="font-bold text-slate-700 text-sm">{selectedFicha.ultimaCalib || 'Não informada'}</p></div>
                                <div><p className="text-[9px] font-black text-slate-400 uppercase mb-1">Vencimento Calibração</p><p className="font-bold text-rose-600 text-sm">{selectedFicha.proxCalib || 'Não informada'}</p></div>
                            </div>

                            <div>
                                <h3 className="text-xs font-black text-slate-400 uppercase mb-2">Especificações Gerais</h3>
                                <p className="text-sm text-slate-600 whitespace-pre-wrap bg-slate-50 p-6 rounded-3xl border border-slate-100">{selectedFicha.especificacoes || 'Sem descrições adicionais.'}</p>
                            </div>

                            {selectedFicha.customFields && selectedFicha.customFields.length > 0 && (
                                <>
                                    <h3 className="text-xs font-black text-slate-400 uppercase mb-2 mt-6 border-t pt-6 border-slate-100">Informações Personalizadas da Ficha</h3>
                                    <div className="grid grid-cols-2 gap-4 bg-amber-50/50 p-6 rounded-3xl border border-amber-100/50">
                                        {selectedFicha.customFields.map((field, idx) => (
                                            <div key={idx}>
                                                <p className="text-[9px] font-black text-amber-600 uppercase mb-1">{field.key || 'Campo Extra'}</p>
                                                <p className="font-bold text-slate-700 text-sm">{field.value || '-'}</p>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            <span>Data Instalação: {selectedFicha.instalacao || 'N/A'}</span>
                            <button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl transition-all shadow-md"><FileText size={14}/> Exportar Ficha PDF</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function ImprovementsView({ sectors, onUpdateSector, user }) {
    const [selectedSectorId, setSelectedSectorId] = useState(sectors[0]?.id || '');
    const [newImprovement, setNewImprovement] = useState({ title: '', description: '' });
    const [commentText, setCommentText] = useState('');
    const [activeImprovementId, setActiveImprovementId] = useState(null);

    const allImprovements = useMemo(() => {
        let all = [];
        sectors.forEach(sector => {
            if (sector.improvements) {
                sector.improvements.forEach(imp => {
                    all.push({ ...imp, sectorName: sector.name, sectorId: sector.id });
                });
            }
        });
        return all.sort((a, b) => b.id - a.id);
    }, [sectors]);

    const handleAddImprovement = async () => {
        if (!newImprovement.title || !newImprovement.description) return;
        const sectorIndex = sectors.findIndex(s => s.id === selectedSectorId);
        if (sectorIndex === -1) return;
        try {
            const created = await api.improvements.create(selectedSectorId, {
                title: newImprovement.title,
                description: newImprovement.description,
                author: user.name,
                authorRole: user.role,
            });
            const updatedSector = { ...sectors[sectorIndex], improvements: [created, ...(sectors[sectorIndex].improvements || [])] };
            onUpdateSector(updatedSector);
            setNewImprovement({ title: '', description: '' });
        } catch (err) {
            alert(`Erro ao publicar sugestão: ${err.message}`);
        }
    };

    const handleAddComment = async (sectorId, improvementId) => {
        if (!commentText) return;
        const sector = sectors.find(s => s.id === sectorId);
        if (!sector) return;
        try {
            const updated = await api.improvements.addComment(improvementId, {
                text: commentText,
                author: user.name,
                authorRole: user.role,
            });
            const updatedSector = { ...sector, improvements: sector.improvements.map(i => i.id === improvementId ? updated : i) };
            onUpdateSector(updatedSector);
            setCommentText('');
            setActiveImprovementId(null);
        } catch (err) {
            alert(`Erro ao comentar: ${err.message}`);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 animate-fade-in h-[calc(100vh-140px)]">

            <div className="w-full lg:w-1/3 space-y-6">
                {user.canAddImprovements ? (
                    <div className="bg-amber-50 p-8 rounded-[40px] border border-amber-100 shadow-xl">
                        <div className="flex items-center gap-3 mb-6 text-amber-700">
                            <div className="bg-white p-3 rounded-2xl shadow-sm"><Lightbulb size={24}/></div>
                            <h2 className="text-xl font-black uppercase tracking-tight">Nova Ideia</h2>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-[10px] font-black uppercase text-amber-400 mb-1 ml-2">Setor</label>
                                <select className="w-full p-4 bg-white border border-amber-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-400" value={selectedSectorId} onChange={e => setSelectedSectorId(e.target.value)}>
                                    {sectors.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-amber-400 mb-1 ml-2">Título da Sugestão</label>
                                <input className="w-full p-4 bg-white border border-amber-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-amber-400" placeholder="Ex: Instalação de Fechaduras" value={newImprovement.title} onChange={e => setNewImprovement({...newImprovement, title: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black uppercase text-amber-400 mb-1 ml-2">Justificativa / Detalhes</label>
                                <textarea rows={6} className="w-full p-4 bg-white border border-amber-200 rounded-2xl font-medium text-sm outline-none focus:ring-2 focus:ring-amber-400 resize-none" placeholder="Descreva por que isso é importante..." value={newImprovement.description} onChange={e => setNewImprovement({...newImprovement, description: e.target.value})}/>
                            </div>
                            <button onClick={handleAddImprovement} className="w-full py-4 bg-amber-500 text-white font-black rounded-2xl shadow-lg hover:bg-amber-600 transition-all flex items-center justify-center gap-2 uppercase tracking-widest text-xs active:scale-95">
                                <Plus size={18}/> Publicar Sugestão
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-slate-100 p-8 rounded-[40px] border border-slate-200 text-center h-full flex flex-col justify-center items-center opacity-70">
                        <Lock size={48} className="text-slate-400 mb-4"/>
                        <h3 className="text-lg font-black text-slate-600 uppercase">Apenas Leitura</h3>
                        <p className="text-sm text-slate-500 mt-2 max-w-xs">A equipe de coordenação pode visualizar e comentar as ideias no mural, mas a criação de melhorias é exclusiva da equipe de campo.</p>
                    </div>
                )}
            </div>

            <div className="w-full lg:w-2/3 flex flex-col h-full bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden">
                <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                    <h2 className="text-xl font-black text-slate-800 flex items-center gap-3"><TrendingUp className="text-blue-600"/> Mural de Evolução</h2>
                    <span className="bg-slate-200 text-slate-600 text-xs font-bold px-3 py-1 rounded-full">{allImprovements.length} Sugestões</span>
                </div>

                <div className="flex-grow overflow-y-auto p-6 space-y-6 bg-slate-50/30">
                    {allImprovements.length === 0 ? (
                        <div className="text-center py-20 opacity-30">
                            <Lightbulb size={64} className="mx-auto mb-4"/>
                            <p className="font-black text-xl text-slate-400">Nenhuma ideia publicada ainda.</p>
                        </div>
                    ) : (
                        allImprovements.map(imp => (
                            <div key={imp.id} className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 font-bold">{imp.author.charAt(0)}</div>
                                        <div>
                                            <p className="text-sm font-black text-slate-800">{imp.author}</p>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{imp.authorRole}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">{imp.sectorName}</span>
                                        <p className="text-[10px] font-bold text-slate-300 mt-1">{imp.date}</p>
                                    </div>
                                </div>
                                <h3 className="text-xl font-black text-slate-800 mb-2">{imp.title}</h3>
                                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-2xl border border-slate-100">{imp.description}</p>

                                <div className="mt-6 pt-6 border-t border-slate-100">
                                    <div className="space-y-4 mb-4">
                                        {(imp.comments || []).map(comment => (
                                            <div key={comment.id} className="flex gap-3 text-xs">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center font-bold text-slate-500">{comment.author.charAt(0)}</div>
                                                <div className="bg-slate-50 p-3 rounded-r-2xl rounded-bl-2xl border border-slate-100 flex-grow">
                                                    <div className="flex justify-between mb-1">
                                                        <span className="font-bold text-slate-700">{comment.author} <span className="opacity-50 font-normal">({comment.authorRole})</span></span>
                                                        <span className="text-[9px] text-slate-400">{comment.date}</span>
                                                    </div>
                                                    <p className="text-slate-600">{comment.text}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 items-center">
                                        <div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center font-bold text-blue-600">{user.name.charAt(0)}</div>
                                        <input className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs outline-none focus:border-blue-400" placeholder="Escreva um comentário..." value={activeImprovementId === imp.id ? commentText : ''} onChange={e => { setActiveImprovementId(imp.id); setCommentText(e.target.value); }} onKeyDown={e => { if (e.key === 'Enter') handleAddComment(imp.sectorId, imp.id); }}/>
                                        <button onClick={() => handleAddComment(imp.sectorId, imp.id)} disabled={activeImprovementId !== imp.id || !commentText} className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"><Send size={14}/></button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function Form({ onSave, onCancel, initialData, user }) {
  const [f, setF] = useState(initialData || { title: '', equipment: '', category: 'corretiva', description: '', solution: '', mediaUrl: '', mediaType: 'image' });
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const fileInputRef = useRef(null);

  const startRecording = async () => {
      try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaRecorderRef.current = new MediaRecorder(stream);
          mediaRecorderRef.current.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
          mediaRecorderRef.current.onstop = async () => {
              const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
              audioChunksRef.current = [];
              setUploading(true);
              try {
                  const audioFile = new File([audioBlob], `gravacao-${Date.now()}.webm`, { type: 'audio/webm' });
                  const mediaUrl = await api.uploads.upload(audioFile);
                  setF(prev => ({ ...prev, mediaUrl, mediaType: 'audio' }));
              } catch (err) {
                  alert(`Erro ao enviar áudio: ${err.message}`);
              } finally {
                  setUploading(false);
              }
          };
          mediaRecorderRef.current.start();
          setIsRecording(true);
      } catch (err) { alert("Erro no microfone."); }
  };

  const stopRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
  };

  const handleAIMagic = async () => {
      if (!f.description || !f.equipment) { alert("Preencha Equipamento e Descrição."); return; }
      setAnalyzing(true);
      try {
          const data = await api.ai.melhorarRelato(f.description, f.equipment);
          const sugestao = data.sugestao;
          setF(prev => ({ ...prev, title: sugestao.titulo_sugerido, description: sugestao.descricao_tecnica, solution: sugestao.solucao_passo_a_passo }));
      } catch (error) { alert(`Erro IA: ${error.message}`); } finally { setAnalyzing(false); }
  };

  const handleSaveClick = async () => {
      onSave(f);
      try { await api.ai.salvarConhecimento({ ...f, author: user ? user.name : "Técnico", date: new Date().toISOString() }); } catch (err) {}
  };

  const handleFileUpload = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      try {
          const mediaUrl = await api.uploads.upload(file);
          let type = 'image';
          if (file.type.includes('video')) type = 'video';
          if (file.type.includes('audio')) type = 'audio';
          setF(prev => ({ ...prev, mediaUrl, mediaType: type }));
      } catch (err) {
          alert(`Erro ao enviar arquivo: ${err.message}`);
      } finally {
          setUploading(false);
          e.target.value = '';
      }
  };

  return (
    <div className="animate-slide-up max-w-2xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
          <button onClick={onCancel} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><ArrowLeft size={24} /></button>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">{initialData ? `Editar Registro` : 'Novo Processo'}</h2>
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden">
          <div className="p-8 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Equipamento</label>
                    <input className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:border-blue-500 transition-all font-bold" placeholder="Modelo / Marca" value={f.equipment} onChange={e => setF({...f, equipment: e.target.value})} />
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Título do Processo</label>
                    <input className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:border-blue-500 transition-all font-bold" placeholder="Título" value={f.title} onChange={e => setF({...f, title: e.target.value})} />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Categoria</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {['corretiva', 'preventiva', 'calibracao', 'qualificacao'].map(c => (
                        <button key={c} type="button" onClick={() => setF({...f, category: c})} className={`py-3 rounded-xl border text-[10px] font-black uppercase transition-all ${f.category === c ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{c}</button>
                    ))}
                </div>
            </div>

            <div className="space-y-1 border border-slate-200 rounded-3xl p-4 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Descrição</label>
                </div>
                <textarea rows={3} className="w-full p-4 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 transition-all resize-none" placeholder="Relate o problema em texto para a IA processar..." value={f.description} onChange={e => setF({...f, description: e.target.value})} />
                <div className="flex justify-end mt-2">
                    <button onClick={handleAIMagic} disabled={analyzing || !f.description} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50 active:scale-95">
                        {analyzing ? <Loader2 className="animate-spin" size={12}/> : <Sparkles size={12}/>} Melhorar Texto IA
                    </button>
                </div>
            </div>

            <div className="space-y-1">
                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Solução Técnica</label>
                <textarea rows={5} className="w-full p-4 bg-emerald-50/30 border border-emerald-100 rounded-2xl outline-none focus:border-emerald-500 transition-all resize-none font-medium text-slate-700" placeholder="Solução adotada..." value={f.solution} onChange={e => setF({...f, solution: e.target.value})} />
            </div>

            <div className="p-6 bg-slate-50 border border-slate-200 rounded-3xl space-y-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-slate-600 font-black text-xs uppercase tracking-widest"><Paperclip size={18} /> Anexar Mídia</div>
                    {isRecording ? (
                        <button onClick={stopRecording} type="button" className="flex items-center gap-2 bg-rose-500 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase shadow-md animate-pulse"><Square size={12}/> Parar Áudio</button>
                    ) : (
                        <button onClick={startRecording} type="button" className="flex items-center gap-2 bg-slate-800 text-white px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase hover:bg-slate-700 transition-all shadow-md"><Mic size={12}/> Gravar Áudio</button>
                    )}
                </div>

                <div className="flex gap-2">
                    <input className="flex-grow p-3 bg-white border rounded-xl text-sm outline-none" placeholder="Nenhuma mídia..." value={f.mediaType === 'audio' && f.mediaUrl ? '🎙️ Áudio Anexado' : (f.mediaUrl || '')} readOnly />
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*,audio/*" onChange={handleFileUpload}/>
                    <button type="button" onClick={() => fileInputRef.current.click()} disabled={uploading} className="p-3 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center justify-center gap-2 transition-colors">
                        {uploading ? <Loader2 className="animate-spin" size={16}/> : <Upload size={16} />} Arquivo
                    </button>
                </div>
            </div>

          </div>

          <div className="bg-slate-50 p-8 flex justify-end gap-3 border-t border-slate-200">
              <button onClick={onCancel} className="px-6 py-3 font-black text-slate-400 hover:text-slate-800 transition-colors text-xs uppercase">Cancelar</button>
              <button onClick={handleSaveClick} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2 uppercase text-xs tracking-widest">
                  <Save size={18} /> Salvar
              </button>
          </div>
      </div>
    </div>
  );
}

function Detail({ data, onBack }) {
  const renderMedia = () => {
      if (!data.mediaUrl) return null;
      if (data.mediaType === 'video') return <video src={data.mediaUrl} controls className="w-full max-h-[400px] rounded-2xl object-contain bg-black z-10 relative" />;
      if (data.mediaType === 'audio') return (<div className="p-8 w-full flex flex-col items-center justify-center gap-4 bg-blue-50 rounded-2xl border border-blue-100 z-10 relative"><Mic size={48} className="text-blue-400 opacity-50"/><audio src={data.mediaUrl} controls className="w-full" /></div>);
      return (
          <img
              src={data.mediaUrl}
              alt="Evidência"
              className="w-full max-h-[400px] object-contain rounded-2xl z-10 relative"
              onError={(e) => {
                  e.target.onerror = null;
                  e.target.style.display = 'none';
                  const fallback = document.getElementById(`fallback-${data.id}`);
                  if (fallback) fallback.style.display = 'flex';
              }}
          />
      );
  };

  return (
    <div className="animate-slide-up">
      <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-bold mb-4 hover:text-blue-600 transition-colors">
        <ArrowLeft size={20} /> Voltar
      </button>
      <div className="bg-white rounded-[40px] p-8 shadow-xl border border-slate-200">
        <div className="flex justify-between items-start mb-6">
            <div>
                <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${data.category === 'corretiva' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
                    {data.category}
                </span>
                <h1 className="text-3xl font-black text-slate-800 mt-3 leading-tight">{data.title}</h1>
            </div>
            <div className="text-right">
                <p className="text-xs font-bold text-slate-400 uppercase">Data</p>
                <p className="font-bold text-slate-700">{data.date}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                    <h3 className="text-xs font-black text-slate-400 uppercase mb-2 flex items-center gap-2"><Wrench size={14}/> Equipamento</h3>
                    <p className="text-lg font-bold text-slate-800">{data.equipment}</p>
                </div>
                <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase mb-2">Descrição do Problema</h3>
                    <p className="text-slate-600 font-medium leading-relaxed">{data.description}</p>
                </div>
                {data.solution && (
                    <div className="bg-emerald-50 p-6 rounded-3xl border border-emerald-100">
                        <h3 className="text-xs font-black text-emerald-600 uppercase mb-2">Solução Técnica</h3>
                        <p className="text-emerald-800 font-medium whitespace-pre-wrap">{data.solution}</p>
                    </div>
                )}
            </div>

            <div>
                {data.mediaUrl ? (
                    <div className="rounded-3xl overflow-hidden shadow-lg border border-slate-200 bg-slate-50 relative min-h-[200px] flex flex-col items-center justify-center p-2">
                        {renderMedia()}
                        <div id={`fallback-${data.id}`} className="hidden absolute inset-0 flex-col items-center justify-center text-slate-400 bg-slate-50 z-0">
                            <ImageIcon size={48} className="opacity-20 mb-2" />
                            <span className="text-xs font-bold uppercase text-center px-4">Mídia Indisponível<br/>(Arquivo expirou)</span>
                        </div>
                        <div className="w-full mt-2 bg-white p-3 text-center text-xs font-bold text-slate-400 uppercase border-t border-slate-100 rounded-b-2xl z-10 relative">
                            Registro Anexado
                        </div>
                    </div>
                ) : (
                    <div className="h-40 bg-slate-50 rounded-3xl border border-dashed border-slate-200 flex items-center justify-center text-slate-300 font-bold text-xs uppercase">Sem Mídia Anexada</div>
                )}
            </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-100 flex justify-between items-center text-xs text-slate-400 font-bold uppercase tracking-widest">
            <div className="flex items-center gap-2"><User size={14}/> {data.author}</div>
            <div>ID: {data.id}</div>
        </div>
      </div>
    </div>
  );
}

function ConsultorView({ user, fichas, onSaveToLibrary }) {
    const [mode, setMode] = useState('chat');
    const [question, setQuestion] = useState('');
    const [chatLoading, setChatLoading] = useState(false);

    const [chatHistory, setChatHistory] = useState([
        {
            type: 'bot',
            text: `Olá ${user?.name || 'Usuário'}. Consultor de Fichas ativado.\nDigite o patrimônio ou modelo do equipamento para puxar a Ficha Técnica.`,
        }
    ]);

    const [input, setInput] = useState({ description: '', equipment: '' });
    const [result, setResult] = useState(null);
    const [createLoading, setCreateLoading] = useState(false);

    const handleOptionClick = (text) => {
        const newHistory = [...chatHistory, { type: 'user', text: text }];
        setChatHistory(newHistory);

        const textLower = text.toLowerCase().trim();
        const fichaEncontrada = (fichas || []).find(f =>
            (f.patrimonio || '') === textLower ||
            (f.equipamento || '').toLowerCase().includes(textLower) ||
            (f.modelo || '').toLowerCase().includes(textLower)
        );

        if (fichaEncontrada) {
            let customFieldsText = '';
            if(fichaEncontrada.customFields && fichaEncontrada.customFields.length > 0) {
                customFieldsText = '\n\n**Extras:**\n' + fichaEncontrada.customFields.map(cf => `- **${cf.key}:** ${cf.value}`).join('\n');
            }

            setTimeout(() => {
                setChatHistory(prev => [...prev, {
                    type: 'bot',
                    text: `✅ **Ficha Técnica Localizada**\n\n**Equipamento:** ${fichaEncontrada.equipamento}\n**Fabricante:** ${fichaEncontrada.fabricante} (${fichaEncontrada.modelo})\n**Patrimônio:** ${fichaEncontrada.patrimonio}\n**Setor:** ${fichaEncontrada.setor}\n**Prox. Calibração:** ${fichaEncontrada.proxCalib}${customFieldsText}`,
                    options: ['Consultar Falha deste equipamento', 'Buscar outro Patrimônio']
                }]);
            }, 500);
            return;
        }

        if (text === 'Buscar outro Patrimônio') {
            setTimeout(() => { setChatHistory(prev => [...prev, { type: 'bot', text: 'Certo. Pode digitar o novo patrimônio ou nome do equipamento:' }]); }, 300);
            return;
        }

        if (text.includes('Consultar Falha deste equipamento')) {
            setTimeout(() => { setChatHistory(prev => [...prev, { type: 'bot', text: 'Ok, conectando ao cérebro IA Pegasus. Descreva o defeito ou erro (Ex: Erro E04, Tela Piscando):' }]); }, 300);
            return;
        }

        askAI(text, newHistory);
    };

    const askAI = async (text, history) => {
        setChatLoading(true);
        try {
            const data = await api.ai.perguntarAssistente(text);
            let safeText = "Desculpe, equipamento não encontrado no inventário e a IA não conseguiu formular uma resposta.";
            if (data && data.resposta) {
                safeText = typeof data.resposta === 'string' ? data.resposta : JSON.stringify(data.resposta);
            }
            setChatHistory(prev => [...prev, { type: 'bot', text: safeText }]);
        } catch (error) {
            setChatHistory(prev => [...prev, { type: 'bot', text: `⚠️ Erro de conexão com o servidor: ${error.message}` }]);
        } finally {
            setChatLoading(false);
        }
    };

    const handleAsk = () => {
        if (!question.trim()) return;
        const text = question;
        setQuestion('');
        handleOptionClick(text);
    };

    const handleConsult = async () => {
        if (!input.description || !input.equipment) return alert("Preencha os campos.");
        setCreateLoading(true);
        try {
            const data = await api.ai.melhorarRelato(input.description, input.equipment);
            setResult(data.sugestao);
        } catch (error) {
            alert(`Erro na IA: ${error.message}`);
        } finally {
            setCreateLoading(false);
        }
    };

    const handleSave = async () => {
        if (!result) return;
        try {
            await api.ai.salvarConhecimento({ title: result.titulo_sugerido, equipment: input.equipment, solution: result.solucao_passo_a_passo, author: user.name, date: new Date().toISOString() });
        } catch(e) { console.error(e); }

        onSaveToLibrary({ title: result.titulo_sugerido, equipment: input.equipment, description: result.descricao_tecnica, solution: result.solucao_passo_a_passo, category: 'corretiva', mediaType: 'image' });
        setInput({ description: '', equipment: '' });
        setResult(null);
    };

    return (
        <div className="animate-fade-in space-y-6 h-full flex flex-col">
            <div className="bg-white p-4 rounded-[32px] border border-slate-200 shadow-lg flex justify-between items-center">
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 ml-4">
                    <Sparkles className="text-purple-600"/> Consultor IA
                </h2>
                <div className="bg-slate-100 p-1 rounded-2xl flex">
                    <button onClick={() => setMode('chat')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'chat' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                        <MessageSquare size={16}/> Chat Rápido
                    </button>
                    <button onClick={() => setMode('create')} className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${mode === 'create' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>
                        <FileEdit size={16}/> Novo Protocolo
                    </button>
                </div>
            </div>

            {mode === 'chat' && (
                <div className="flex-grow flex flex-col bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden h-[600px]">
                    <div className="flex-grow overflow-y-auto p-8 space-y-6 bg-slate-50/50">
                        {chatHistory.map((msg, i) => (
                            <div key={i} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] p-5 rounded-3xl ${msg.type === 'user' ? 'bg-purple-600 text-white rounded-tr-sm' : 'bg-white border border-slate-200 text-slate-700 rounded-tl-sm shadow-sm'}`}>
                                    <div className="text-sm font-medium leading-relaxed whitespace-pre-wrap font-sans">
                                        {msg.text}
                                    </div>
                                    {msg.options && (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {msg.options.map((opt, idx) => (
                                                <button key={idx} onClick={() => handleOptionClick(opt)} disabled={chatLoading || i !== chatHistory.length - 1} className="px-4 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl border border-purple-200 transition-colors disabled:opacity-50 shadow-sm active:scale-95 text-left">
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {chatLoading && (
                            <div className="flex justify-start animate-pulse">
                                <div className="bg-white px-6 py-4 rounded-3xl border border-slate-200 flex items-center gap-2 text-purple-600 font-bold text-xs">
                                    <Loader2 className="animate-spin" size={16}/> Processando...
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-white border-t border-slate-100 flex gap-3">
                        <input
                            className="flex-grow bg-slate-100 border-none rounded-2xl px-6 py-4 text-slate-700 font-bold outline-none focus:ring-2 focus:ring-purple-200 placeholder-slate-400"
                            placeholder="Ou descreva o problema aqui..."
                            value={question}
                            onChange={e => setQuestion(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleOptionClick(question);
                                    setQuestion('');
                                }
                            }}
                        />
                        <button onClick={() => {handleOptionClick(question); setQuestion('')}} disabled={!question || chatLoading} className="bg-purple-600 text-white p-4 rounded-2xl hover:bg-purple-700 transition-colors shadow-lg disabled:opacity-50">
                            <Send size={20} />
                        </button>
                    </div>
                </div>
            )}

            {mode === 'create' && (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                   <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-lg h-fit">
                       <div className="space-y-4">
                           <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 text-purple-800 text-xs font-bold mb-4">Use esta área para ensinar a IA. Descreva o que você consertou.</div>
                           <div>
                               <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Equipamento</label>
                               <input className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:border-purple-500 font-bold" placeholder="Ex: Monitor Dixtal" value={input.equipment} onChange={e => setInput({...input, equipment: e.target.value})}/>
                           </div>
                           <div>
                               <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Relato Informal</label>
                               <textarea rows={6} className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:border-purple-500 resize-none font-medium text-slate-600" placeholder="Ex: Troquei a bateria..." value={input.description} onChange={e => setInput({...input, description: e.target.value})}/>
                           </div>
                           <button onClick={handleConsult} disabled={createLoading} className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-black shadow-lg transition-all flex items-center justify-center gap-2 uppercase tracking-widest disabled:opacity-50">
                               {createLoading ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />} {createLoading ? "Processando..." : "Gerar Protocolo"}
                           </button>
                       </div>
                   </div>
                   <div className={`transition-all duration-500 ${result ? 'opacity-100' : 'opacity-50 blur-sm'}`}>
                       {result ? (
                           <div className="bg-white p-8 rounded-[32px] border-2 border-purple-100 shadow-xl relative overflow-hidden">
                               <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-purple-500 to-indigo-500"></div>
                               <h3 className="text-xl font-black text-slate-800 mb-4">{result.titulo_sugerido}</h3>
                               <div className="space-y-4 mb-8">
                                   <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100"><p className="text-sm font-medium text-slate-700">{result.descricao_tecnica}</p></div>
                                   <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100"><p className="text-sm font-medium text-slate-700 whitespace-pre-wrap">{result.solucao_passo_a_passo}</p></div>
                               </div>
                               <div className="flex gap-3">
                                   <button onClick={() => setResult(null)} className="flex-1 py-3 text-slate-400 font-bold hover:bg-slate-50 rounded-xl transition-colors text-xs uppercase">Descartar</button>
                                   <button onClick={handleSave} className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-black rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 text-xs uppercase tracking-widest"><CheckCircle2 size={16}/> Salvar</button>
                               </div>
                           </div>
                       ) : (
                           <div className="h-full flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-100 rounded-[32px] p-10"><Bot size={64} className="mb-4 opacity-50"/><p className="font-bold text-center">O protocolo gerado aparecerá aqui.</p></div>
                       )}
                   </div>
               </div>
            )}
        </div>
    );
}

function LoginScreen({ onLogin }) {
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [name, setName] = useState('');

  const handleSelectProfile = (profile) => {
      setSelectedProfile(profile);
      let savedName = '';
      try { savedName = localStorage.getItem(`pegasus_name_${profile.id}`) || ''; } catch (err) {}
      setName(savedName);
  };

  const handleConfirm = () => {
      const trimmed = name.trim();
      if (!trimmed) return;
      try { localStorage.setItem(`pegasus_name_${selectedProfile.id}`, trimmed); } catch (err) {}
      onLogin(selectedProfile.id, trimmed);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="absolute -bottom-8 right-10 w-72 h-72 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        <div className="relative z-10 w-full max-w-md p-6">
            <div className="backdrop-blur-sm bg-white/80 border border-white/60 rounded-3xl p-10 shadow-xl hover:shadow-2xl transition-all duration-300">
                <div className="mb-10 text-center"><div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg"><Activity size={32} className="text-white" /></div><h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">PEGASUS</h1><p className="text-indigo-600 text-sm font-semibold">Gestão Inteligente de Ativos Hospitalares</p></div>
                {!selectedProfile ? (
                    <div className="space-y-3"><p className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] text-center mb-6">Selecione seu perfil</p>{LOGIN_PROFILES.map(profile => (<button key={profile.id} onClick={() => handleSelectProfile(profile)} className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border border-blue-200/60 text-slate-900 font-bold py-4 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md flex items-center justify-between px-6 group hover:scale-[1.02]"><div><span className="text-sm tracking-wide block">{profile.name}</span><span className="text-xs text-slate-500 font-normal">{profile.role}</span></div><ChevronRight size={20} className="opacity-40 group-hover:opacity-100 transition-all group-hover:translate-x-1" /></button>))}</div>
                ) : (
                    <div className="space-y-4 animate-fade-in">
                        <button onClick={() => setSelectedProfile(null)} className="flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-600"><ArrowLeft size={14}/> Trocar perfil</button>
                        <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3">
                            <p className="text-sm font-bold text-slate-800">{selectedProfile.name}</p>
                            <p className="text-xs text-slate-500">{selectedProfile.role}</p>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-1">Seu nome</label>
                            <input
                                autoFocus
                                className="w-full p-4 bg-white border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-400"
                                placeholder="Como você quer ser identificado"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleConfirm()}
                            />
                        </div>
                        <button onClick={handleConfirm} disabled={!name.trim()} className="w-full py-4 bg-blue-600 disabled:opacity-40 text-white font-black rounded-2xl shadow-lg hover:bg-blue-700 transition-all uppercase tracking-widest text-xs">Entrar</button>
                    </div>
                )}
                <p className="text-center text-slate-400 text-xs mt-10 font-semibold opacity-60 tracking-widest">PEGASUS v5.1 • Engenharia Clínica</p>
            </div>
        </div>
    </div>
  );
}

function NavBtn({ active, onClick, label, icon }) {
    return (
        <button onClick={onClick} className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-200 ${active ? 'bg-white text-blue-600 shadow-sm scale-105' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}`}>
            {icon} {label}
        </button>
    );
}

function MobileBtn({ active, onClick, label, icon }) {
    return (
        <button onClick={onClick} className={`flex flex-col items-center gap-1.5 transition-all duration-200 ${active ? 'text-blue-600 scale-125' : 'text-slate-400'}`}>
            {icon} <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
        </button>
    );
}

function LibraryView({ sectors, user }) {
    const [filterSector, setFilterSector] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [selectedDoc, setSelectedDoc] = useState(null);
    const fileInputRef = useRef(null);

    const [docs, setDocs] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(true);
    const [uploadingDoc, setUploadingDoc] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await api.library.list();
                if (!cancelled) setDocs(data);
            } catch (err) {
                console.error('Erro ao carregar biblioteca:', err);
            } finally {
                if (!cancelled) setLoadingDocs(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const handleAddDocument = async (e) => {
        const file = e.target.files[0]; if (!file) return;
        setUploadingDoc(true);
        try {
            const mediaUrl = await api.uploads.upload(file);
            const type = file.type.includes('image') ? 'image' : file.type.includes('video') ? 'video' : 'pdf';
            const created = await api.library.create({
                title: file.name,
                equipment: 'Geral',
                sectorId: filterSector !== 'all' ? filterSector : 'floor-0',
                category: filterCategory !== 'all' ? filterCategory : 'procedimentos',
                type,
                author: user ? user.name : 'Técnico',
                desc: 'Arquivo importado.',
                mediaUrl,
            });
            setDocs([created, ...docs]);
            alert("Documento adicionado à biblioteca com sucesso!");
        } catch (err) {
            alert(`Erro ao enviar documento: ${err.message}`);
        } finally {
            setUploadingDoc(false);
            e.target.value = '';
        }
    };

    const categories = [{ id: 'all', label: 'Todos' }, { id: 'procedimentos', label: 'Manuais' }, { id: 'corretiva', label: 'Corretiva' }, { id: 'preventiva', label: 'Preventiva' }, { id: 'calibracao', label: 'Calibração' }];

    const filteredDocs = docs.filter(doc => {
        const matchSector = filterSector === 'all' || doc.sectorId === filterSector;
        const matchCategory = filterCategory === 'all' || doc.category === filterCategory;
        const matchSearch = (doc.title || '').toLowerCase().includes(search.toLowerCase()) || (doc.equipment || '').toLowerCase().includes(search.toLowerCase());
        return matchSector && matchCategory && matchSearch;
    });

    const getIconForType = (type) => {
        if(type === 'pdf') return <FileText size={24} className="text-rose-500" />;
        if(type === 'video') return <Video size={24} className="text-indigo-500" />;
        return <ImageIcon size={24} className="text-emerald-500" />;
    };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden min-h-[500px] flex flex-col relative">
                <div className="p-8 border-b bg-slate-50/50 flex flex-col gap-4"><div className="flex flex-col md:flex-row justify-between md:items-center gap-4"><div><h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2"><BookOpen className="text-emerald-600"/> Biblioteca Técnica</h1><p className="text-slate-500 font-medium">Acervo de Manuais e Relatórios.</p></div><div className="flex gap-2 items-center"><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" placeholder="Buscar..." className="pl-10 pr-4 py-2.5 bg-white border rounded-xl outline-none focus:border-emerald-400 font-bold text-xs shadow-sm" value={search} onChange={(e) => setSearch(e.target.value)} /></div><input type="file" className="hidden" ref={fileInputRef} onChange={handleAddDocument} disabled={uploadingDoc} /><button onClick={() => fileInputRef.current.click()} disabled={uploadingDoc} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest hover:bg-emerald-700 shadow-md flex items-center gap-2 disabled:opacity-50">{uploadingDoc ? <Loader2 size={14} className="animate-spin"/> : <Plus size={14}/>} {uploadingDoc ? 'Enviando...' : 'Add Doc'}</button></div></div></div>
                <div className="p-8 bg-slate-50/30 flex-grow">
                    <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar"><button onClick={() => setFilterSector('all')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${filterSector === 'all' ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>Todos Setores</button>{sectors.map(s => (<button key={s.id} onClick={() => setFilterSector(s.id)} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${filterSector === s.id ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{s.name}</button>))}</div>
                    <div className="flex gap-2 overflow-x-auto pb-6 no-scrollbar border-b border-slate-200/60 mb-6">{categories.map(cat => (<button key={cat.id} onClick={() => setFilterCategory(cat.id)} className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase transition-all whitespace-nowrap ${filterCategory === cat.id ? 'bg-emerald-50 text-emerald-700 font-black border border-emerald-200' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'}`}>{cat.label}</button>))}</div>
                    {loadingDocs ? (
                        <div className="p-20 text-center text-slate-400 flex flex-col items-center"><Loader2 size={40} className="animate-spin mb-4"/><p className="font-bold text-sm uppercase tracking-widest">Carregando...</p></div>
                    ) : filteredDocs.length === 0 ? (
                        <div className="p-20 text-center text-slate-400 border-4 border-dashed border-white rounded-[40px] bg-slate-100/50 flex flex-col items-center"><BookOpen size={48} className="mb-4 opacity-50"/><p className="font-bold text-sm uppercase tracking-widest">Nenhum arquivo encontrado.</p></div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {filteredDocs.map(doc => {
                                return (
                                    <div key={doc.id} onClick={() => setSelectedDoc(doc)} className="bg-white p-6 rounded-[32px] border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-emerald-300 transition-all flex flex-col cursor-pointer group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className={`p-3 rounded-2xl ${doc.type === 'pdf' ? 'bg-rose-50 text-rose-600' : doc.type === 'video' ? 'bg-indigo-50 text-indigo-600' : 'bg-emerald-50 text-emerald-600'}`}>{getIconForType(doc.type)}</div>
                                            <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border border-slate-200">{doc.category}</span>
                                        </div>
                                        <h3 className="font-black text-slate-800 text-sm mb-1 leading-tight group-hover:text-emerald-700 transition-colors line-clamp-2">{doc.title}</h3>
                                        <p className="text-[10px] text-slate-400 font-black uppercase mb-4 tracking-[0.1em] flex items-center gap-1"><Wrench size={10}/> {doc.equipment}</p>
                                        <div className="mt-auto pt-4 border-t border-slate-50 flex justify-between items-center text-[9px] font-bold uppercase tracking-widest text-slate-400">
                                            <div className="flex items-center gap-1"><User size={10}/> {doc.author}</div>
                                            <div>{doc.date}</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
            {selectedDoc && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-fade-in"><div className="bg-white w-full max-w-4xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[90vh]"><div className="p-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center"><div><span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border mr-2 ${selectedDoc.type === 'pdf' ? 'bg-rose-50 text-rose-700 border-rose-200' : selectedDoc.type === 'video' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>Formato {selectedDoc.type}</span><span className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">{selectedDoc.category}</span></div><button onClick={() => setSelectedDoc(null)} className="p-2 bg-white rounded-full text-slate-400 hover:text-rose-500 shadow-sm border border-slate-200 transition-all"><X size={20}/></button></div><div className="p-8 flex-grow flex flex-col overflow-y-auto"><h2 className="text-2xl font-black text-slate-800 mb-2">{selectedDoc.title}</h2><p className="text-slate-500 font-medium mb-6 text-sm">{selectedDoc.desc}</p><div className="flex-grow bg-slate-100 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 relative overflow-hidden min-h-[300px]">{selectedDoc.mediaUrl ? ( selectedDoc.type === 'image' ? <img src={selectedDoc.mediaUrl} className="max-w-full max-h-full object-contain rounded-xl"/> : selectedDoc.type === 'video' ? <video src={selectedDoc.mediaUrl} controls className="max-w-full max-h-full rounded-xl"/> : <div className="text-center"><FileText size={64} className="mx-auto mb-4 opacity-50" /><p className="font-bold uppercase tracking-widest text-sm">Visualizador de PDF</p></div> ) : ( <div className="text-center"><FileText size={64} className="mx-auto mb-4 opacity-50" /><p className="font-bold uppercase tracking-widest text-sm">Arquivo Temporário</p></div> )}</div></div><div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-between items-center"><div className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2"><MapPin size={14}/> Local: Geral</div><button className="flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-md"><Download size={16}/> Baixar Arquivo</button></div></div></div>
            )}
        </div>
    );
}

function HistoryView({ entries, onAddClick, onItemClick, onEditClick, onDeleteClick }) {
    const [filter, setFilter] = useState('todos');
    const filteredEntries = entries.filter(e => filter === 'todos' || e.category.toLowerCase() === filter.toLowerCase());
    const categories = [{ id: 'todos', label: 'Todos' }, { id: 'corretiva', label: 'Corretiva' }, { id: 'preventiva', label: 'Preventiva' }, { id: 'calibracao', label: 'Calibração' }, { id: 'qualificacao', label: 'Qualificação' }, { id: 'treinamento', label: 'Treinamento de Equipe' }];

    const handleExport = () => {
        if (filteredEntries.length === 0) return alert("Nada para exportar!");
        const headers = ["ID", "Data", "Equipamento", "Categoria", "Título", "Responsável", "Última Edição"];
        const escapeCsv = (value) => {
            const str = String(value ?? '');
            if (/[",\n]/.test(str)) return '"' + str.replace(/"/g, '""') + '"';
            return str;
        };
        const rows = filteredEntries.map(e => [e.id, e.date, e.equipment, e.category, e.title, e.author, e.lastEditDate || '-']);
        let csvContent = "data:text/csv;charset=utf-8," + headers.map(escapeCsv).join(",") + "\n" + rows.map(row => row.map(escapeCsv).join(",")).join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `relatorio_pegasus_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
    };

    return (
        <div className="animate-fade-in space-y-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2"><GraduationCap className="text-blue-600"/> Registro de Processos</h1>
                    <p className="text-slate-500 font-medium">Gestão do Conhecimento, Vídeo-Aulas e Manutenções Realizadas.</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExport} className="bg-slate-100 hover:bg-slate-200 text-slate-600 px-4 py-3 rounded-2xl flex items-center gap-2 font-bold transition-all"><FileSpreadsheet size={18}/> Exportar Relatório</button>
                    <button onClick={onAddClick} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl flex items-center justify-center gap-2 transition-all font-bold shadow-lg shadow-blue-200 active:scale-95"><Plus size={20} /> Novo Registro</button>
                </div>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
                {categories.map(cat => (
                    <button key={cat.id} onClick={() => setFilter(cat.id)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${filter === cat.id ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>{cat.label}</button>
                ))}
            </div>

            {filteredEntries.length === 0 ? (
                <div className="p-20 text-center text-slate-400 border-4 border-dashed border-white rounded-[40px] bg-slate-100/50 flex flex-col items-center">
                    <Video size={48} className="mb-4 opacity-50"/>
                    <p className="font-bold text-sm uppercase tracking-widest">Nenhum processo registrado ainda.</p>
                    <p className="text-xs mt-2">Clique em "Novo Registro" para adicionar.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredEntries.map(e => (<Card key={e.id} data={e} onClick={() => onItemClick(e)} onEdit={onEditClick} onDelete={onDeleteClick} />))}
                </div>
            )}
        </div>
    );
}

function Card({ data, onClick, onEdit, onDelete }) {
    const hasMedia = data.mediaType === 'video' || data.mediaUrl;
    return (
        <div onClick={onClick} className="bg-white p-6 rounded-[36px] border border-slate-200 shadow-lg hover:shadow-2xl hover:border-blue-300 transition-all flex flex-col h-full group relative overflow-hidden cursor-pointer">
            <div className="absolute top-4 right-4 flex gap-2 z-30">
                <button onClick={(e) => { e.stopPropagation(); onEdit(data); }} className="p-2 bg-white rounded-full text-slate-400 hover:text-blue-600 hover:bg-blue-50 shadow-md border border-slate-100 transition-all" title="Editar Registro"><Pencil size={14} /></button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(data.id); }} className="p-2 bg-white rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 shadow-md border border-slate-100 transition-all" title="Excluir Registro"><Trash2 size={14} /></button>
            </div>
            {hasMedia && (<div className="absolute top-0 right-0 bg-indigo-500 text-white p-2 rounded-bl-2xl shadow-md z-10"><PlayCircle size={16} fill="white" className="text-indigo-500"/></div>)}
            <div className="flex justify-between mb-5 pr-20">
                <div className="flex gap-2">
                    <span className={`px-4 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${data.category === 'corretiva' ? 'bg-rose-50 text-rose-700 border-rose-100' : data.category === 'preventiva' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{data.category === 'treinamento' ? 'Treinamento' : data.category}</span>
                    <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-xl text-[9px] font-black tracking-widest border border-slate-200 flex items-center gap-1"><Hash size={9} /> {data.id}</span>
                </div>
            </div>
            <span className="text-[10px] font-bold text-slate-300 block mb-2">{data.date}</span>
            <h3 className="font-extrabold text-slate-800 text-xl group-hover:text-blue-700 transition-colors mb-3 leading-tight tracking-tight">{data.title}</h3>
            <p className="text-[10px] text-slate-400 font-black uppercase mb-5 tracking-[0.2em] flex items-center gap-1"><Wrench size={10}/> {data.equipment}</p>
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4 flex-grow"><p className="text-sm text-slate-600 line-clamp-3 leading-relaxed font-medium italic">"{data.description}"</p></div>
            <div className="mt-auto pt-4 border-t border-slate-50">
                <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest"><User size={12}/> {data.author}</div>
                    {hasMedia && (<span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest flex items-center gap-1">Ver Aula <ChevronRight size={10}/></span>)}
                </div>
                {data.lastEditor && (<div className="text-[9px] text-slate-400 italic text-right bg-slate-50 px-2 py-1 rounded-lg inline-block w-full">Editado por <strong>{data.lastEditor}</strong> em {data.lastEditDate}</div>)}
            </div>
        </div>
    );
}

function EmailsIAView() {
    const [emails, setEmails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [deletedEmails, setDeletedEmails] = useState([]);
    const [showHistory, setShowHistory] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [emailToDelete, setEmailToDelete] = useState(null);
    const [justification, setJustification] = useState("");

    const fetchEmails = async () => { setLoading(true); setError(null); try { const data = await api.ai.emails(); setEmails(prev => { const newItems = data.filter(d => !prev.some(p => p.original_assunto === d.original_assunto) && !deletedEmails.some(del => del.original_assunto === d.original_assunto)); return [...prev, ...newItems]; }); } catch (err) { setError(`O Agente IA (Python) parece estar desligado ou sem chave configurada: ${err.message}`); } finally { setLoading(false); } };
    const handleDeleteClick = (email) => { setEmailToDelete(email); setJustification(""); setIsDeleteModalOpen(true); };
    const confirmDelete = () => { if (!justification.trim()) { alert("A justificativa é obrigatória."); return; } const deletedItem = { ...emailToDelete, justificativa: justification, dataExclusao: new Date().toLocaleDateString('pt-BR') + ' às ' + new Date().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) }; setDeletedEmails([deletedItem, ...deletedEmails]); setEmails(emails.filter(e => e.original_assunto !== emailToDelete.original_assunto)); setIsDeleteModalOpen(false); setEmailToDelete(null); };

    return (
        <div className="animate-fade-in space-y-6">
            <div className="bg-indigo-900 text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full mix-blend-overlay filter blur-3xl opacity-20 -mr-10 -mt-10"></div>
                <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                    <div><h2 className="text-3xl font-black tracking-tight flex items-center gap-3"><Bot size={32} className="text-indigo-300"/> Agente de Triagem IA</h2><p className="text-indigo-200 mt-2 font-medium max-w-xl">Leitura automática de caixa de entrada e classificação de urgências.</p></div>
                    <button onClick={fetchEmails} disabled={loading} className="bg-white text-indigo-900 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-indigo-50 transition-all shadow-lg disabled:opacity-50">{loading ? <Loader2 className="animate-spin"/> : <RefreshCw size={16}/>} {loading ? "Processando..." : "Analisar E-mails"}</button>
                </div>
            </div>

            <div className="flex gap-4 border-b border-gray-200 mb-4">
                <button onClick={() => setShowHistory(false)} className={`pb-3 px-2 text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${!showHistory ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><Zap size={16} /> Alertas Ativos ({emails.length})</button>
                <button onClick={() => setShowHistory(true)} className={`pb-3 px-2 text-sm font-bold uppercase tracking-wider flex items-center gap-2 transition-colors ${showHistory ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-400 hover:text-gray-600'}`}><History size={16} /> Histórico Auditoria ({deletedEmails.length})</button>
            </div>

            {error && (<div className="p-10 text-center border-2 border-dashed border-rose-200 bg-rose-50 rounded-[32px] text-rose-500 font-bold"><CloudOff size={48} className="mx-auto mb-4 opacity-50"/>{error}</div>)}

            {!showHistory && (
                <div className="grid grid-cols-1 gap-4">
                    {!loading && !error && emails.length === 0 && (<div className="text-center py-20 opacity-40"><Bot size={64} className="mx-auto mb-4 text-slate-400"/><p className="font-black text-slate-500">Caixa Limpa. Aguardando ordens.</p></div>)}
                    {emails.map((email, index) => {
                        const isUrgent = email.urgencia === 'ALTA';
                        return (
                            <div key={index} className={`bg-white p-6 rounded-[32px] border shadow-lg transition-all ${isUrgent ? 'border-rose-200 shadow-rose-100' : 'border-slate-200'}`}>
                                <div className="flex flex-col md:flex-row gap-6 relative">
                                    <button onClick={() => handleDeleteClick(email)} className="absolute top-0 right-0 p-2 text-gray-300 hover:text-red-500 transition-colors" title="Descartar Missão"><Trash2 size={20} /></button>
                                    <div className="md:w-1/4 flex flex-col gap-2 border-b md:border-b-0 md:border-r border-slate-100 pb-4 md:pb-0 md:pr-4">
                                        <div className="flex gap-2"><span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border text-center flex-grow ${isUrgent ? 'bg-rose-500 text-white border-rose-500' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>{email.urgencia}</span><span className="bg-slate-50 text-slate-500 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-slate-100 truncate">{email.categoria}</span></div>
                                        <div className="mt-auto"><p className="text-[9px] text-slate-400 font-black uppercase tracking-widest mb-1">Equipamento Identificado</p><p className="font-bold text-slate-700 text-sm flex items-center gap-2"><HardDrive size={14} className="text-slate-400"/> {email.equipamento || "Nenhum"}</p></div>
                                    </div>
                                    <div className="md:w-2/4 flex flex-col justify-between">
                                        <div>
                                            <h3 className="text-lg font-black text-slate-800 mb-2">{email.resumo}</h3>
                                            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4"><p className="text-xs text-slate-500 font-medium italic mb-2"><span className="font-bold not-italic text-slate-400 uppercase text-[9px] mr-2">Original:</span>"{email.original_assunto}"</p><p className="text-sm text-slate-600 leading-relaxed">Sugestão: <strong className="text-indigo-600">{email.acao_sugerida}</strong></p></div>
                                        </div>
                                    </div>
                                    <div className="md:w-1/4 flex flex-col justify-center items-center gap-2 pl-4 border-l border-slate-100">
                                        <div className="text-center mb-2"><div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-1 text-slate-500 font-bold">{email.original_remetente ? email.original_remetente.charAt(0) : '?'}</div><p className="text-[10px] font-bold text-slate-400 uppercase truncate max-w-[100px]">{email.original_remetente}</p></div>
                                        <a href="mailto:" className="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"><Mail size={14}/> Abrir E-mail</a>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showHistory && (
                <div className="space-y-4">
                    {deletedEmails.length === 0 && <div className="text-center py-10 text-slate-400 border border-dashed border-slate-200 rounded-3xl"><p>Nenhum item foi descartado ainda.</p></div>}
                    {deletedEmails.map((item, index) => (
                        <div key={index} className="bg-slate-50 p-6 rounded-2xl border border-slate-200 opacity-90 hover:opacity-100 transition-opacity">
                            <div className="flex justify-between items-start mb-3"><h4 className="font-bold text-slate-600 line-through decoration-slate-400 decoration-2">{item.resumo}</h4><span className="text-[10px] font-bold bg-slate-200 text-slate-500 px-2 py-1 rounded-lg">{item.dataExclusao}</span></div>
                            <div className="bg-white border-l-4 border-l-rose-400 p-3 rounded-r-xl shadow-sm"><p className="text-[10px] font-black text-rose-400 uppercase mb-1">Motivo da Exclusão</p><p className="text-slate-700 text-sm font-medium">"{item.justificativa}"</p></div>
                        </div>
                    ))}
                </div>
            )}

            {isDeleteModalOpen && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-[32px] shadow-2xl p-8 w-full max-w-md">
                        <h3 className="text-xl font-black text-slate-800 mb-2 flex items-center gap-2"><ShieldCheck className="text-blue-600" /> Auditoria de Qualidade</h3>
                        <p className="text-sm text-slate-500 mb-6 font-medium">Para manter a conformidade do setor, justifique o descarte desta missão crítica.</p>
                        <div className="space-y-2 mb-6"><label className="text-[10px] font-black uppercase text-slate-400 ml-2">Justificativa Técnica</label><textarea className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 resize-none text-slate-700" rows="3" placeholder="Ex: Equipamento já foi recolhido..." value={justification} onChange={(e) => setJustification(e.target.value)} autoFocus /></div>
                        <div className="flex gap-3"><button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors text-xs uppercase">Cancelar</button><button onClick={confirmDelete} className="flex-1 py-3 bg-red-600 text-white font-black rounded-xl hover:bg-red-700 shadow-lg text-xs uppercase tracking-widest">Confirmar Exclusão</button></div>
                    </div>
                </div>
            )}
        </div>
    );
}

function SectorsView({ sectors, onUpdateSector, user, onAddEvent }) {
  const [selectedId, setSelectedId] = useState(sectors[0].id);
  const [tab, setTab] = useState('pendings');
  const [subId, setSubId] = useState(null);
  const [showAddPending, setShowAddPending] = useState(false);
  const [newPendingData, setNewPendingData] = useState({ id: null, description: '', reason: '', type: 'Corretiva' });
  const [selectedPending, setSelectedPending] = useState(null);
  const [updateText, setUpdateText] = useState('');

  const current = sectors.find(s => s.id === selectedId);
  useEffect(() => { if (current.hasSubSectors && current.subSectors.length > 0) { setSubId(current.subSectors[0].id); } else { setSubId(null); } }, [selectedId]);
  const filteredPendings = current.pendings.filter(p => !subId || p.subSectorId === subId);

  const handleSavePending = async () => {
      if (!newPendingData.description || !newPendingData.reason) return;
      try {
          const created = await api.pendings.create(current.id, {
              type: newPendingData.type,
              description: newPendingData.description,
              reason: newPendingData.reason,
              author: user.name,
              subSectorId: subId,
          });
          onUpdateSector({ ...current, pendings: [...current.pendings, created] });
          if (onAddEvent) { onAddEvent({ title: `[PENDÊNCIA] ${newPendingData.description}`, date: new Date().toISOString().split('T')[0], assignedTo: user.name, priority: 'normal', description: newPendingData.reason }); }
          setShowAddPending(false);
      } catch (err) {
          alert(`Erro ao criar pendência: ${err.message}`);
      }
  };

  const handleStatusChange = async (pendingId, newStatus) => {
      try {
          const updated = await api.pendings.updateStatus(pendingId, newStatus, user.name);
          const updatedPendings = current.pendings.map(p => p.id === pendingId ? updated : p);
          onUpdateSector({ ...current, pendings: updatedPendings });
          if (selectedPending && selectedPending.id === pendingId) setSelectedPending(updated);
      } catch (err) {
          alert(`Erro ao atualizar status: ${err.message}`);
      }
  };

  const handleAddUpdate = async () => {
      if (!updateText || !selectedPending) return;
      try {
          const updated = await api.pendings.addUpdate(selectedPending.id, updateText, user.name);
          const updatedPendings = current.pendings.map(p => p.id === selectedPending.id ? updated : p);
          onUpdateSector({ ...current, pendings: updatedPendings });
          setSelectedPending(updated);
          setUpdateText('');
      } catch (err) {
          alert(`Erro ao adicionar atualização: ${err.message}`);
      }
  };

  return (
      <div className="flex flex-col gap-6 animate-fade-in relative">
          <div className="overflow-x-auto flex p-1 gap-2 no-scrollbar">
              {sectors.map(s => (<button key={s.id} onClick={() => setSelectedId(s.id)} className={`whitespace-nowrap px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider border transition-all ${selectedId === s.id ? 'bg-slate-800 text-white border-slate-800 shadow-xl scale-105' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50 shadow-sm'}`}>{s.name}</button>))}
          </div>

          <div className="bg-white rounded-[40px] border border-slate-200 shadow-2xl overflow-hidden min-h-[300px] flex flex-col relative">
              <div className="p-8 border-b bg-slate-50/50 flex flex-col gap-4 relative">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                          <div className="flex items-center gap-3 mb-2"><span className="bg-blue-600 text-white px-4 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{current.name}</span><span className="text-slate-400 text-xs font-bold flex items-center gap-1"><MapPin size={14}/> {current.areas}</span></div>
                          <p className="text-slate-500 text-sm italic font-medium">"{current.description}"</p>
                      </div>
                      {current.hasSubSectors && (<div className="flex gap-2 p-1 bg-white border rounded-2xl w-fit overflow-x-auto no-scrollbar">{current.subSectors.map(sub => (<button key={sub.id} onClick={() => setSubId(sub.id)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${subId === sub.id ? 'bg-blue-100 text-blue-700 shadow-inner' : 'text-slate-400 hover:text-slate-600'}`}>{sub.name}</button>))}</div>)}
                  </div>
              </div>

              <div className="flex border-b bg-slate-50">
                  <button onClick={() => setTab('pendings')} className={`flex-1 py-5 font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-3 border-r ${tab === 'pendings' ? 'bg-white text-rose-600 border-t-4 border-t-rose-600 shadow-sm' : 'text-slate-400'}`}><AlertTriangle size={18}/> Pendências ({filteredPendings.length})</button>
              </div>

              <div className="p-8 bg-slate-50/30 flex-grow">
                  {tab === 'pendings' && (
                      <>
                          <div className="flex justify-end mb-6"><button onClick={() => {setNewPendingData({ id: null, description: '', reason: '', type: 'Corretiva' }); setShowAddPending(true)}} className="bg-rose-500 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg hover:bg-rose-600 transition-all flex items-center gap-2 active:scale-95"><Plus size={16}/> Nova Pendência</button></div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                              {filteredPendings.length === 0 ? (
                                  <div className="col-span-full text-center py-20 opacity-20 flex flex-col items-center"><CheckCircle2 size={64} className="text-emerald-500 mb-4"/><p className="font-black text-xs uppercase tracking-[0.3em]">Operação Limpa</p></div>
                              ) : (
                                  filteredPendings.map(p => (
                                      <div key={p.id} onClick={() => setSelectedPending(p)} className="bg-white p-6 rounded-[32px] border-l-[12px] border-l-rose-500 shadow-xl border border-slate-100 cursor-pointer hover:scale-[1.01] transition-transform">
                                          <div className="flex justify-between items-start mb-3 pr-20"><div className="flex gap-2"><span className="text-[9px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-3 py-1 rounded-full border border-slate-200">ID #{p.id}</span><span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${STATUS_COLORS[p.status] || 'bg-slate-100 text-slate-500'}`}>{p.status}</span></div><span className="text-[10px] font-bold text-slate-300">{p.date}</span></div>
                                          <h4 className="font-bold text-slate-800 text-lg mb-2">{p.description}</h4>
                                          <div className="bg-slate-50 p-4 rounded-2xl text-[11px] font-medium text-slate-600 border border-slate-100"><span className="block font-black text-slate-400 uppercase text-[9px] mb-2">Motivo / Origem</span>{p.reason}</div>
                                          <div className="mt-4 flex justify-between items-center"><div className="flex items-center gap-2 text-slate-400 font-bold text-[10px] uppercase tracking-wider"><User size={12}/> {p.author}</div><button className="text-slate-300 hover:text-blue-600 transition-colors"><ChevronRight size={20}/></button></div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </>
                  )}
              </div>
          </div>

          {showAddPending && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl p-8 space-y-6"><div className="flex justify-between items-center"><h3 className="text-xl font-black text-rose-600 flex items-center gap-2"><AlertTriangle size={24}/> Nova Pendência</h3><button onClick={() => setShowAddPending(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button></div><div className="space-y-4"><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-2">Equipamento / Falha</label><input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-rose-400" value={newPendingData.description} onChange={e => setNewPendingData({...newPendingData, description: e.target.value})}/></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-2">Motivo / Detalhes</label><textarea rows={3} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-sm outline-none focus:ring-2 focus:ring-rose-400 resize-none" value={newPendingData.reason} onChange={e => setNewPendingData({...newPendingData, reason: e.target.value})}/></div><div><label className="block text-[10px] font-black uppercase text-slate-400 mb-1 ml-2">Tipo de Serviço</label><select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-rose-400" value={newPendingData.type} onChange={e => setNewPendingData({...newPendingData, type: e.target.value})}><option>Corretiva</option><option>Preventiva</option></select></div></div><button onClick={handleSavePending} className="w-full py-4 bg-rose-600 text-white font-black rounded-2xl shadow-lg hover:bg-rose-700 transition-all uppercase tracking-widest text-xs">Confirmar</button></div></div>
          )}
          {selectedPending && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"><div className="p-8 bg-slate-50 border-b border-slate-200 flex justify-between items-start"><div><div className="flex gap-2 mb-2"><span className="bg-slate-200 text-slate-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">ID #{selectedPending.id}</span><span className="bg-white border text-slate-400 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest">{selectedPending.date}</span></div><h2 className="text-2xl font-black text-slate-800 leading-tight">{selectedPending.description}</h2></div><button onClick={() => setSelectedPending(null)} className="p-2 hover:bg-slate-200 rounded-full"><X size={24} className="text-slate-400"/></button></div><div className="flex-grow overflow-y-auto p-8 space-y-8"><div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100"><h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-3">Status do Atendimento</h4><div className="flex flex-wrap gap-2">{PENDING_STATUS_FLOW.map(status => (<button key={status} onClick={() => handleStatusChange(selectedPending.id, status)} className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase transition-all border ${selectedPending.status === status ? `${STATUS_COLORS[status]} shadow-md scale-105` : 'bg-white text-slate-400 border-slate-200 hover:bg-slate-50'}`}>{status}</button>))}</div></div><div className="bg-slate-50 p-6 rounded-3xl border border-slate-100"><h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2"><FileText size={14}/> Detalhes do Chamado</h4><p className="text-slate-700 font-medium leading-relaxed">{selectedPending.reason}</p></div><div><h4 className="text-xs font-black text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-2"><MessageSquare size={14}/> Atualizações</h4><div className="space-y-4 mb-6">{(!selectedPending.updates || selectedPending.updates.length === 0) && (<p className="text-center text-slate-400 text-xs italic py-4">Nenhuma atualização registrada ainda.</p>)}{selectedPending.updates?.map((upd, idx) => (<div key={idx} className="flex gap-4"><div className="w-8 h-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center font-bold text-blue-600 text-xs">{upd.author.charAt(0)}</div><div className="bg-white border border-slate-100 p-4 rounded-r-2xl rounded-bl-2xl shadow-sm flex-grow"><div className="flex justify-between mb-1"><span className="font-bold text-slate-800 text-xs">{upd.author}</span><span className="text-[10px] text-slate-400">{upd.date}</span></div><p className="text-sm text-slate-600">{upd.text}</p></div></div>))}</div><div className="flex gap-2 items-center bg-slate-50 p-2 rounded-2xl border border-slate-200"><input className="flex-grow bg-transparent px-4 py-2 text-sm outline-none font-medium text-slate-700 placeholder-slate-400" placeholder="Adicionar atualização..." value={updateText} onChange={e => setUpdateText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddUpdate()}/><button onClick={handleAddUpdate} disabled={!updateText} className="p-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:bg-slate-300 transition-colors shadow-md"><Send size={16}/></button></div></div></div></div></div>
          )}
      </div>
  );
}

function CalendarView({ events, onAddEvent, techs }) {
    const [date, setDate] = useState(new Date());
    const [showModal, setShowModal] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [newEvent, setNewEvent] = useState({ title: '', date: '', assignedTo: techs[0].name, priority: 'normal', description: '' });
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
    const year = date.getFullYear();
    const month = date.getMonth();
    const totalDays = getDaysInMonth(year, month);
    const startingDay = getFirstDayOfMonth(year, month);
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const calendarCells = []; for (let i = 0; i < startingDay; i++) calendarCells.push(null); for (let i = 1; i <= totalDays; i++) calendarCells.push(i);
    const handleSave = () => { onAddEvent(newEvent); setShowModal(false); };

    return (
        <div className="animate-fade-in relative">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div><h1 className="text-2xl font-black text-slate-900 tracking-tight">Cronograma Técnico</h1><p className="text-slate-500 font-medium">Visualização integrada de preventivas e corretivas</p></div>
                <div className="flex gap-2 w-full md:w-auto"><button onClick={() => setShowModal(true)} className="flex-grow md:flex-grow-0 bg-slate-900 text-white px-4 py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 hover:bg-slate-700 transition-colors shadow-lg"><Plus size={16}/> Agendar</button></div>
            </div>
            <div className="bg-white rounded-[48px] border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
                <div className="p-6 bg-slate-50 border-b flex justify-between items-center"><button onClick={() => setDate(new Date(year, month - 1, 1))} className="p-2 hover:bg-white rounded-full transition-colors"><ChevronLeft size={20}/></button><h2 className="text-lg font-black text-slate-800 uppercase tracking-widest">{monthNames[month]} {year}</h2><button onClick={() => setDate(new Date(year, month + 1, 1))} className="p-2 hover:bg-white rounded-full transition-colors"><ChevronRight size={20}/></button></div>
                <div className="grid grid-cols-7 border-b bg-slate-50/50">{["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => <div key={d} className="py-3 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest">{d}</div>)}</div>
                <div className="grid grid-cols-7 auto-rows-[140px]">
                    {calendarCells.map((day, i) => {
                        const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : '';
                        const dayEvents = day ? events.filter(e => e.date === dateStr) : [];
                        const isToday = day && new Date().toDateString() === new Date(year, month, day).toDateString();
                        return (
                            <div key={i} className={`border-r border-b border-slate-100 p-2 transition-colors hover:bg-slate-50/50 relative ${!day ? 'bg-slate-50/20' : 'bg-white'}`}>
                                {day && (
                                    <>
                                        <span className={`text-[10px] font-black absolute top-2 left-2 ${isToday ? 'bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-slate-400'}`}>{day}</span>
                                        <div className="mt-6 space-y-1 overflow-y-auto max-h-[100px] no-scrollbar">
                                            {dayEvents.map((ev, idx) => (
                                                <div key={idx} onClick={() => setSelectedEvent(ev)} className={`p-1.5 rounded-lg text-[9px] font-black uppercase tracking-tight border shadow-sm truncate cursor-pointer hover:opacity-80 transition-opacity ${ev.priority === 'alta' ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>{ev.title}</div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {selectedEvent && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 space-y-6 relative border-4 border-white"><button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors"><X size={20} className="text-slate-500" /></button><div><span className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest ${selectedEvent.priority === 'alta' ? 'bg-rose-100 text-rose-600' : 'bg-blue-100 text-blue-600'}`}>{selectedEvent.priority === 'alta' ? 'Prioridade Alta' : 'Normal'}</span><h3 className="text-2xl font-black text-slate-800 mt-4 leading-tight">{selectedEvent.title}</h3><p className="text-xs font-bold text-slate-400 mt-2 flex items-center gap-2 uppercase tracking-wider"><CalendarIcon size={14}/> {selectedEvent.date}</p></div><div className="bg-slate-50 p-6 rounded-2xl border border-slate-100"><p className="text-sm text-slate-600 font-medium italic leading-relaxed">"{selectedEvent.description}"</p></div><div className="flex items-center gap-4 pt-4 border-t border-slate-100"><div className="w-12 h-12 rounded-2xl bg-slate-200 flex items-center justify-center"><User size={24} className="text-slate-500"/></div><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Responsável Técnico</p><p className="text-sm font-bold text-slate-800">{selectedEvent.assignedTo}</p></div></div></div></div>
            )}

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl p-8 space-y-4"><h3 className="text-xl font-bold text-slate-800">Novo Agendamento</h3><input className="w-full p-3 bg-slate-50 border rounded-xl outline-none font-bold" placeholder="Título da Atividade" value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} /><div className="grid grid-cols-2 gap-4"><input type="date" className="p-3 bg-slate-50 border rounded-xl outline-none" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} /><select className="p-3 bg-slate-50 border rounded-xl outline-none" value={newEvent.assignedTo} onChange={e => setNewEvent({...newEvent, assignedTo: e.target.value})}>{techs.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}</select></div><div className="flex gap-2 pt-2"><button onClick={() => setShowModal(false)} className="flex-1 py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button><button onClick={handleSave} className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-lg">Salvar</button></div></div></div>
            )}
        </div>
    );
}
