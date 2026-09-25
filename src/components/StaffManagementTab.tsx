import React, { useState } from 'react';
import { AppUser, UserRole, UserStatus } from '../types';
import { useApiSync } from '../context/ApiSyncContext';
import { 
  Users, 
  UserPlus, 
  Shield, 
  UserCheck, 
  UserX, 
  Edit2, 
  Trash2, 
  Key, 
  CheckCircle, 
  AlertTriangle, 
  Lock, 
  Phone, 
  User as UserIcon,
  Search,
  Eye,
  EyeOff
} from 'lucide-react';
import { sound } from '../utils/audio';

interface StaffManagementTabProps {
  onNotify?: (msg: string) => void;
}

export const StaffManagementTab: React.FC<StaffManagementTabProps> = () => {
  const {
    user,
    currentUserProfile,
    staffUsers,
    isMasterAdmin,
    isAdmin,
    createStaffUser,
    updateStaffUser,
    toggleStaffStatus,
    deleteStaffUser
  } = useApiSync();

  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'cashier'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Staff Modal State
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [addName, setAddName] = useState('');
  const [addPhone, setAddPhone] = useState('');
  const [addLoginId, setAddLoginId] = useState('');
  const [addPassword, setAddPassword] = useState('');
  const [addConfirmPass, setAddConfirmPass] = useState('');
  const [addRole, setAddRole] = useState<'admin' | 'cashier'>('cashier');
  const [addStatus, setAddStatus] = useState<UserStatus>('active');
  const [addShowPass, setAddShowPass] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit Staff Modal State
  const [editingStaff, setEditingStaff] = useState<AppUser | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editLoginId, setEditLoginId] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('cashier');
  const [editStatus, setEditStatus] = useState<UserStatus>('active');
  const [editNewPassword, setEditNewPassword] = useState('');
  const [editShowPass, setEditShowPass] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Confirmation State
  const [staffToDelete, setStaffToDelete] = useState<AppUser | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Feedback Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Filtered staff list
  const filteredStaff = staffUsers.filter((st) => {
    if (roleFilter !== 'all') {
      if (roleFilter === 'admin' && st.role !== 'admin' && st.role !== 'master_admin') return false;
      if (roleFilter === 'cashier' && st.role !== 'cashier') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = st.name.toLowerCase().includes(q);
      const matchLogin = st.loginId.toLowerCase().includes(q);
      const matchPhone = st.phone.toLowerCase().includes(q);
      if (!matchName && !matchLogin && !matchPhone) return false;
    }
    return true;
  });

  const masterAdmins = staffUsers.filter((u) => u.role === 'master_admin');
  const admins = staffUsers.filter((u) => u.role === 'admin');
  const cashiers = staffUsers.filter((u) => u.role === 'cashier');

  // --- Handlers ---
  const handleOpenAddStaff = (presetRole: 'admin' | 'cashier' = 'cashier') => {
    setAddName('');
    setAddPhone('');
    setAddLoginId('');
    setAddPassword('');
    setAddConfirmPass('');
    setAddRole(presetRole);
    setAddStatus('active');
    setAddShowPass(false);
    setAddError(null);
    setIsAddingStaff(true);
    sound.playKeyBeep(550, 0.04);
  };

  const handleSaveNewStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const cleanName = addName.trim();
    const cleanPhone = addPhone.trim();
    const cleanLoginId = addLoginId.trim().toLowerCase();

    if (!cleanName) {
      setAddError('Nama staf wajib diisi.');
      sound.playVoidBeep();
      return;
    }
    if (!cleanPhone) {
      setAddError('No. telefon wajib diisi.');
      sound.playVoidBeep();
      return;
    }
    if (!cleanLoginId) {
      setAddError('Login ID wajib diisi.');
      sound.playVoidBeep();
      return;
    }
    if (!addPassword || addPassword.length < 6) {
      setAddError('Kata laluan mestilah sekurang-kurangnya 6 aksara.');
      sound.playVoidBeep();
      return;
    }
    if (addPassword !== addConfirmPass) {
      setAddError('Pengesahan kata laluan tidak sepadan.');
      sound.playVoidBeep();
      return;
    }

    setIsSubmittingAdd(true);
    const result = await createStaffUser({
      name: cleanName,
      phone: cleanPhone,
      loginId: cleanLoginId,
      password: addPassword,
      role: addRole,
      status: addStatus,
    });
    setIsSubmittingAdd(false);

    if (result.success) {
      sound.playOkBeep();
      setIsAddingStaff(false);
      showToast(`Akaun ${addRole === 'admin' ? 'Admin' : 'Cashier'} "${cleanName}" berjaya didaftarkan!`);
    } else {
      sound.playVoidBeep();
      setAddError(result.error || 'Gagal mendaftar staf.');
    }
  };

  const handleOpenEditStaff = (staff: AppUser) => {
    setEditingStaff(staff);
    setEditName(staff.name);
    setEditPhone(staff.phone || '');
    setEditLoginId(staff.loginId);
    setEditRole(staff.role);
    setEditStatus(staff.status);
    setEditNewPassword('');
    setEditShowPass(false);
    setEditError(null);
    sound.playKeyBeep(500, 0.04);
  };

  const handleSaveEditStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setEditError(null);

    const cleanName = editName.trim();
    const cleanPhone = editPhone.trim();
    const cleanLoginId = editLoginId.trim().toLowerCase();

    if (!cleanName) {
      setEditError('Nama staf wajib diisi.');
      sound.playVoidBeep();
      return;
    }
    if (!cleanPhone) {
      setEditError('No. telefon wajib diisi.');
      sound.playVoidBeep();
      return;
    }
    if (!cleanLoginId) {
      setEditError('Login ID wajib diisi.');
      sound.playVoidBeep();
      return;
    }
    if (editNewPassword && editNewPassword.length < 6) {
      setEditError('Kata laluan baharu mestilah sekurang-kurangnya 6 aksara.');
      sound.playVoidBeep();
      return;
    }

    setIsSubmittingEdit(true);
    const result = await updateStaffUser(editingStaff.uid, {
      name: cleanName,
      phone: cleanPhone,
      loginId: cleanLoginId,
      role: editRole,
      status: editStatus,
      newPassword: editNewPassword || undefined,
    });
    setIsSubmittingEdit(false);

    if (result.success) {
      sound.playOkBeep();
      setEditingStaff(null);
      showToast(`Maklumat "${cleanName}" berjaya dikemaskini.`);
    } else {
      sound.playVoidBeep();
      setEditError(result.error || 'Gagal mengemaskini maklumat.');
    }
  };

  const handleToggleStatus = async (staff: AppUser) => {
    sound.playKeyBeep(600, 0.04);
    const result = await toggleStaffStatus(staff.uid, staff.status);
    if (result.success) {
      sound.playOkBeep();
      showToast(`Status "${staff.name}" kini ${staff.status === 'active' ? 'Tidak Aktif' : 'Aktif'}.`);
    } else {
      sound.playVoidBeep();
      alert(result.error || 'Gagal mengubah status.');
    }
  };

  const handleOpenDelete = (staff: AppUser) => {
    if (staff.role === 'master_admin') {
      sound.playVoidBeep();
      alert('Master Admin tidak boleh dipadam!');
      return;
    }
    setStaffToDelete(staff);
    setDeleteError(null);
    sound.playVoidBeep();
  };

  const handleConfirmDelete = async () => {
    if (!staffToDelete) return;
    setIsSubmittingDelete(true);
    setDeleteError(null);
    const result = await deleteStaffUser(staffToDelete.uid);
    setIsSubmittingDelete(false);

    if (result.success) {
      sound.playOkBeep();
      showToast(`Akaun "${staffToDelete.name}" telah dipadam.`);
      setStaffToDelete(null);
    } else {
      sound.playVoidBeep();
      setDeleteError(result.error || 'Gagal memadam akaun.');
    }
  };

  return (
    <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto max-w-5xl mx-auto w-full space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-600 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 text-xs font-bold animate-fade-in border border-emerald-400/40">
          <CheckCircle className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="bg-slate-800/80 border border-slate-700/70 rounded-2xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg shadow-slate-950/40">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold uppercase text-slate-100 tracking-wider flex items-center gap-2">
                PENGURUSAN STAF & PENGGUNA
                {isMasterAdmin && (
                  <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/40">
                    MASTER ADMIN
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Urus akaun Master Admin, Admin POS dan Juruwang (Cashier) untuk kawalan akses selamat.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons for Master Admin */}
        {isMasterAdmin ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenAddStaff('cashier')}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-emerald-950/50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>+ TAMBAH CASHIER</span>
            </button>
            <button
              onClick={() => handleOpenAddStaff('admin')}
              className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-md shadow-cyan-950/50"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>+ TAMBAH ADMIN</span>
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/80 px-3 py-2 rounded-xl border border-slate-700 text-xs text-slate-400 flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Paparan Baca Sahaja (Perlu Master Admin)</span>
          </div>
        )}
      </div>

      {/* Role Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 text-center">
          <p className="text-[11px] font-bold uppercase text-amber-400 tracking-wider">Master Admin</p>
          <p className="text-xl font-extrabold text-white mt-1">{masterAdmins.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Akses Penuh</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 text-center">
          <p className="text-[11px] font-bold uppercase text-cyan-400 tracking-wider">Admin POS</p>
          <p className="text-xl font-extrabold text-white mt-1">{admins.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Pengurusan POS</p>
        </div>
        <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-3.5 text-center">
          <p className="text-[11px] font-bold uppercase text-emerald-400 tracking-wider">Cashier</p>
          <p className="text-xl font-extrabold text-white mt-1">{cashiers.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Jualan Sahaja</p>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/80 w-full sm:w-auto">
          <button
            onClick={() => setRoleFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              roleFilter === 'all'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Semua ({staffUsers.length})
          </button>
          <button
            onClick={() => setRoleFilter('admin')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              roleFilter === 'admin'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Admin ({masterAdmins.length + admins.length})
          </button>
          <button
            onClick={() => setRoleFilter('cashier')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
              roleFilter === 'cashier'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Cashier ({cashiers.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, Login ID, telefon..."
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Staff Cards List */}
      <div className="space-y-3">
        {filteredStaff.length === 0 ? (
          <div className="text-center py-12 bg-slate-800/40 rounded-2xl border border-dashed border-slate-700/60">
            <Users className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-400 font-bold">Tiada staf dijumpai.</p>
            {isMasterAdmin && (
              <p className="text-[11px] text-slate-500 mt-1">
                Klik butang <b>+ TAMBAH CASHIER</b> atau <b>+ TAMBAH ADMIN</b> di atas untuk mendaftar.
              </p>
            )}
          </div>
        ) : (
          filteredStaff.map((staff) => {
            const isSelf = staff.uid === user?.uid;
            const isMaster = staff.role === 'master_admin';
            const isAdminRole = staff.role === 'admin';
            const isActive = staff.status === 'active';

            return (
              <div
                key={staff.uid}
                className={`bg-slate-800/70 border rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition shadow-md ${
                  isSelf
                    ? 'border-emerald-500/50 bg-emerald-950/10'
                    : isMaster
                    ? 'border-amber-500/30'
                    : isAdminRole
                    ? 'border-cyan-500/30'
                    : 'border-slate-700/60'
                }`}
              >
                {/* Left: Info */}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm ${
                      isMaster
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : isAdminRole
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    }`}
                  >
                    {isMaster ? <Shield className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-extrabold text-sm text-slate-100">{staff.name}</h3>
                      {isSelf && (
                        <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                          (Akaun Anda)
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase border ${
                          isMaster
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : isAdminRole
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        }`}
                      >
                        {isMaster ? 'Master Admin' : isAdminRole ? 'Admin' : 'Cashier'}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                          isActive
                            ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-500/30'
                            : 'bg-rose-950/60 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        {isActive ? 'Aktif' : 'Tidak Aktif'}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-400 flex-wrap">
                      <div className="flex items-center gap-1">
                        <Key className="w-3.5 h-3.5 text-slate-500" />
                        <span>
                          Login ID: <strong className="text-slate-200 font-mono">{staff.loginId}</strong>
                        </span>
                      </div>
                      {staff.phone && (
                        <div className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-500" />
                          <span>{staff.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Actions */}
                {isMasterAdmin && (
                  <div className="flex items-center gap-2 self-end md:self-center">
                    {/* Toggle Active / Inactive */}
                    {!isMaster ? (
                      <button
                        onClick={() => handleToggleStatus(staff)}
                        title={isActive ? 'Nyahaktifkan Akaun' : 'Aktifkan Akaun'}
                        className={`p-2 rounded-xl border text-xs font-bold transition cursor-pointer flex items-center gap-1 ${
                          isActive
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
                            : 'bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 border-emerald-700/60'
                        }`}
                      >
                        {isActive ? <UserX className="w-4 h-4 text-rose-400" /> : <UserCheck className="w-4 h-4 text-emerald-400" />}
                        <span className="hidden sm:inline">{isActive ? 'Nyahaktif' : 'Aktifkan'}</span>
                      </button>
                    ) : null}

                    {/* Edit Staff */}
                    <button
                      onClick={() => handleOpenEditStaff(staff)}
                      title="Kemaskini Maklumat"
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <Edit2 className="w-4 h-4 text-cyan-400" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>

                    {/* Delete Staff (Forbidden for Master Admin) */}
                    {!isMaster ? (
                      <button
                        onClick={() => handleOpenDelete(staff)}
                        title="Padam Staf"
                        className="p-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 hover:border-rose-700 text-xs font-bold transition cursor-pointer flex items-center gap-1"
                      >
                        <Trash2 className="w-4 h-4 text-rose-400" />
                        <span className="hidden sm:inline">Padam</span>
                      </button>
                    ) : null}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* --- MODAL: TAMBAH STAF BAHARU --- */}
      {isAddingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold uppercase text-slate-100 tracking-wider">
                  TAMBAH STAF BAHARU
                </h3>
              </div>
              <button
                onClick={() => setIsAddingStaff(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                Batal
              </button>
            </div>

            {addError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewStaff} className="space-y-3.5">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">Peranan (Role) *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAddRole('cashier')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      addRole === 'cashier'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <UserIcon className="w-3.5 h-3.5" />
                    <span>Cashier (Jualan)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddRole('admin')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                      addRole === 'admin'
                        ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-950/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <Shield className="w-3.5 h-3.5" />
                    <span>Admin (Pengurusan)</span>
                  </button>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nama Penuh *</label>
                <input
                  type="text"
                  required
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Contoh: Siti Nurhaliza / Ali Ahmad"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">No. Telefon *</label>
                <input
                  type="tel"
                  required
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  placeholder="Contoh: 012-3456789"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Login ID */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Login ID (Untuk Log Masuk POS) *
                </label>
                <input
                  type="text"
                  required
                  value={addLoginId}
                  onChange={(e) => setAddLoginId(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  placeholder="Contoh: siti / ali / cashier1"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-emerald-400 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  ID ini digunakan oleh juruwang untuk log masuk pada terminal POS.
                </p>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Kata Laluan (Min 6 aksara) *</label>
                <div className="relative">
                  <input
                    type={addShowPass ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={addPassword}
                    onChange={(e) => setAddPassword(e.target.value)}
                    placeholder="Masukkan kata laluan"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setAddShowPass(!addShowPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                  >
                    {addShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Sahkan Kata Laluan *</label>
                <input
                  type={addShowPass ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={addConfirmPass}
                  onChange={(e) => setAddConfirmPass(e.target.value)}
                  placeholder="Ulang semula kata laluan"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Status Akaun</label>
                <select
                  value={addStatus}
                  onChange={(e) => setAddStatus(e.target.value as UserStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="active">Aktif (Boleh log masuk)</option>
                  <option value="inactive">Tidak Aktif (Disekat)</option>
                </select>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingStaff(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wider transition cursor-pointer shadow-lg shadow-emerald-950/60"
                >
                  {isSubmittingAdd ? 'Mendaftar...' : 'Daftar Staf'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: EDIT STAF --- */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 md:p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Edit2 className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-extrabold uppercase text-slate-100 tracking-wider">
                  KEMASKINI MAKLUMAT STAF
                </h3>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1"
              >
                Batal
              </button>
            </div>

            {editError && (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleSaveEditStaff} className="space-y-3.5">
              {/* Role Selection (Disabled for Master Admin) */}
              {editingStaff.role !== 'master_admin' ? (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">Peranan (Role)</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setEditRole('cashier')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        editRole === 'cashier'
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-950/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <UserIcon className="w-3.5 h-3.5" />
                      <span>Cashier</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditRole('admin')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        editRole === 'admin'
                          ? 'bg-cyan-600 text-white border-cyan-500 shadow-md shadow-cyan-950/50'
                          : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Admin</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold flex items-center gap-2">
                  <Shield className="w-4 h-4 shrink-0" />
                  <span>Akaun Master Admin (Peranan tidak boleh ditukar)</span>
                </div>
              )}

              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Nama Penuh *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">No. Telefon *</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Login ID */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Login ID</label>
                <input
                  type="text"
                  required
                  value={editLoginId}
                  onChange={(e) => setEditLoginId(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs font-mono text-emerald-400 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Status Akaun</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as UserStatus)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                >
                  <option value="active">Aktif (Boleh log masuk)</option>
                  <option value="inactive">Tidak Aktif (Disekat)</option>
                </select>
              </div>

              {/* Optional Reset Password */}
              {(editingStaff.role !== 'master_admin' || editingStaff.uid === user?.uid) && (
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Tukar Kata Laluan (Biarkan kosong jika tidak mahu tukar)
                  </label>
                  <div className="relative">
                    <input
                      type={editShowPass ? 'text' : 'password'}
                      value={editNewPassword}
                      onChange={(e) => setEditNewPassword(e.target.value)}
                      placeholder="Kata laluan baharu..."
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 pr-10 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setEditShowPass(!editShowPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                    >
                      {editShowPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex-1 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wider transition cursor-pointer shadow-lg shadow-cyan-950/60"
                >
                  {isSubmittingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL: CONFIRM DELETE --- */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-rose-900/50 rounded-3xl p-5 md:p-6 w-full max-w-sm shadow-2xl space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-sm font-extrabold uppercase text-slate-100 tracking-wider">
                PADAM AKAUN STAF?
              </h3>
              <p className="text-xs text-slate-400 mt-1.5">
                Adakah anda pasti mahu memadam akaun <strong>{staffToDelete.name}</strong> (ID: <code>{staffToDelete.loginId}</code>)?
              </p>
              <p className="text-[11px] text-amber-400/90 mt-2 bg-amber-950/30 p-2 rounded-xl border border-amber-800/40">
                Nota: Jika staf ini mempunyai rekod transaksi jualan terdahulu, disarankan memilih <strong>Nyahaktif</strong> dan bukannya memadam.
              </p>
            </div>

            {deleteError && (
              <p className="text-xs text-rose-400 font-bold">{deleteError}</p>
            )}

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingDelete}
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 disabled:opacity-50 text-white text-xs font-extrabold uppercase tracking-wider transition cursor-pointer shadow-lg shadow-rose-950/60"
              >
                {isSubmittingDelete ? 'Memadam...' : 'Sahkan Padam'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
