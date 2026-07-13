/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { Consultant, Holiday } from '../types';
import { Sun, Moon, Plus, Trash2, ShieldAlert, Check, Heart, UserPlus, Sparkles, X, Download, Upload, LogOut, UserCircle, Power, Mail, Archive, RotateCcw } from 'lucide-react';
import { getConsultantColor, getInitials } from '../utils/consultantColors';

interface SettingsProps {
  consultants: Consultant[];
  holidays: Holiday[];
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onAddConsultant: (name: string, role: string, avatar?: string, userEmail?: string) => void;
  onUpdateConsultant: (id: string, userEmail: string) => void;
  onSetConsultantActive: (id: string, active: boolean) => void;
  consultantIdsInUse: Set<string>;
  onDeleteConsultant: (id: string) => void;
  onAddHoliday: (name: string, date: string) => void;
  onDeleteHoliday: (id: string) => void;
  onExportData: () => void;
  onImportData: (file: File) => void;
  userEmail: string | null;
  onSignOut: () => void;
  isAdmin: boolean;
  admins: string[];
  onUpdateAdmins: (admins: string[]) => void;
  members: string[];
  onUpdateMembers: (members: string[]) => void;
}

export default function Settings({
  consultants,
  holidays,
  darkMode,
  onToggleDarkMode,
  onAddConsultant,
  onUpdateConsultant,
  onSetConsultantActive,
  consultantIdsInUse,
  onDeleteConsultant,
  onAddHoliday,
  onDeleteHoliday,
  onExportData,
  onImportData,
  userEmail,
  onSignOut,
  isAdmin,
  admins,
  onUpdateAdmins,
  members,
  onUpdateMembers
}: SettingsProps) {
  // Hidden file input used to pick a backup file to import.
  const importInputRef = useRef<HTMLInputElement>(null);

  // New-admin & new-member email inputs.
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    const email = newMemberEmail.trim().toLowerCase();
    if (!email || members.map(m => m.toLowerCase()).includes(email)) {
      setNewMemberEmail('');
      return;
    }
    onUpdateMembers([...members, email]);
    setNewMemberEmail('');
  };

  const handleRemoveMember = (email: string) => {
    onUpdateMembers(members.filter(m => m !== email));
  };

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const email = newAdminEmail.trim().toLowerCase();
    if (!email || admins.map(a => a.toLowerCase()).includes(email)) {
      setNewAdminEmail('');
      return;
    }
    onUpdateAdmins([...admins, email]);
    setNewAdminEmail('');
  };

  const handleExit = () => {
    // Closes the window when running as an installed PWA / script-opened window.
    // In a normal browser tab this is a no-op, so we hint the user afterwards.
    window.close();
    setTimeout(() => {
      alert('You can now close this tab to exit ICU Consultant.');
    }, 250);
  };

  const handleRemoveAdmin = (email: string) => {
    if (admins.length <= 1) {
      alert('You cannot remove the last administrator.');
      return;
    }
    if (email.toLowerCase() === (userEmail ?? '').toLowerCase()) {
      if (!window.confirm('Remove yourself as an administrator? You will lose admin access.')) return;
    }
    onUpdateAdmins(admins.filter(a => a !== email));
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onImportData(file);
    e.target.value = ''; // allow re-importing the same file
  };

  // Modal states
  const [showAddConsultantModal, setShowAddConsultantModal] = useState(false);
  const [newConsultantName, setNewConsultantName] = useState('');
  const [newConsultantRole, setNewConsultantRole] = useState('Senior Consultant');
  const [newConsultantAvatar, setNewConsultantAvatar] = useState('');
  const [newConsultantEmail, setNewConsultantEmail] = useState('');

  // Which consultant's login-email field is currently being edited inline.
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [linkEmail, setLinkEmail] = useState('');

  const startLinking = (id: string, current?: string) => {
    setLinkingId(id);
    setLinkEmail(current ?? '');
  };
  const saveLink = () => {
    if (linkingId) onUpdateConsultant(linkingId, linkEmail);
    setLinkingId(null);
    setLinkEmail('');
  };

  const [showAddHolidayModal, setShowAddHolidayModal] = useState(false);
  const [newHolidayName, setNewHolidayName] = useState('');
  const [newHolidayDate, setNewHolidayDate] = useState('');

  const handleAddConsultantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newConsultantName) return;
    onAddConsultant(newConsultantName, newConsultantRole, newConsultantAvatar, newConsultantEmail);
    setNewConsultantName('');
    setNewConsultantRole('Senior Consultant');
    setNewConsultantAvatar('');
    setNewConsultantEmail('');
    setShowAddConsultantModal(false);
  };

  const handleAddHolidaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newHolidayName || !newHolidayDate) return;
    onAddHoliday(newHolidayName, newHolidayDate);
    setNewHolidayName('');
    setNewHolidayDate('');
    setShowAddHolidayModal(false);
  };

  return (
    <div id="settings-view" className="space-y-6">
      {/* App Theme Section (iOS Style) */}
      <section className="space-y-3">
        <h3 className="px-4 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-widest">
          Display
        </h3>
        <div className="bg-surface-container-low rounded-xl overflow-hidden shadow-sm border border-outline-variant/10">
          <div className="flex items-center justify-between px-4 py-3 hover:bg-surface-container-high/40 transition-colors">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-container flex items-center justify-center">
                {darkMode ? (
                  <Moon className="w-5 h-5 text-on-primary-container" />
                ) : (
                  <Sun className="w-5 h-5 text-on-primary-container" />
                )}
              </div>
              <span className="text-body-lg font-bold">Dark Mode</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={darkMode}
                onChange={onToggleDarkMode}
                className="sr-only peer"
              />
              <div className="w-12 h-7 bg-outline-variant/30 rounded-full transition-colors peer-checked:bg-[#34c759] after:content-[''] after:absolute after:top-1 after:left-1 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
            </label>
          </div>
        </div>
      </section>

      {isAdmin && (
      <>
      {/* Manage Consultants Section */}
      <section className="space-y-3">
        <div className="flex items-center justify-between px-4">
          <h3 className="text-label-sm font-label-sm text-on-surface-variant uppercase tracking-widest">
            Manage Consultants
          </h3>
          <button
            onClick={() => setShowAddConsultantModal(true)}
            className="text-primary font-bold text-headline-sm flex items-center gap-2 active:scale-95 transition-transform cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add New
          </button>
        </div>
        <div className="bg-surface-container-low rounded-xl overflow-hidden shadow-sm border border-outline-variant/10 divide-y divide-outline-variant/20">
          {consultants.map(c => {
            const archived = !c.active;
            const inUse = consultantIdsInUse.has(c.id);
            return (
            <div
              key={c.id}
              className={`px-4 py-3 group hover:bg-surface-container-high/40 transition-colors space-y-2 ${archived ? 'opacity-60' : ''}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold ${getConsultantColor(consultants, c.id).solid} ${archived ? 'grayscale' : ''}`}>
                      {getInitials(c.name)}
                    </div>
                    <div className={`absolute bottom-0 right-0 w-3 h-3 border-2 border-surface-container-low rounded-full ${archived ? 'bg-outline' : 'bg-[#34c759]'}`} />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-body-lg font-bold text-on-surface truncate flex items-center gap-2">
                      {c.name}
                      {archived && (
                        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface-variant shrink-0">
                          Archived
                        </span>
                      )}
                    </span>
                    <span className="text-label-sm font-label-sm text-on-surface-variant truncate">{c.role}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onSetConsultantActive(c.id, archived)}
                    className="text-on-surface-variant hover:text-primary p-1 hover:bg-surface-container-high rounded-lg active:scale-95 transition-transform cursor-pointer"
                    title={archived ? 'Restore consultant' : 'Archive consultant'}
                  >
                    {archived ? <RotateCcw className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => onDeleteConsultant(c.id)}
                    disabled={inUse}
                    className="text-error/70 hover:text-error p-1 hover:bg-error-container/20 rounded-lg active:scale-95 transition-transform disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                    title={inUse ? 'Has schedule or leave history — archive instead of deleting' : 'Delete consultant permanently'}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Login link — attributes this profile to a Google account so that
                  account's own leave requests count towards this consultant. */}
              {linkingId === c.id ? (
                <form
                  onSubmit={(e) => { e.preventDefault(); saveLink(); }}
                  className="flex items-center gap-2 pl-1"
                >
                  <input
                    type="email"
                    autoFocus
                    value={linkEmail}
                    onChange={(e) => setLinkEmail(e.target.value)}
                    placeholder="consultant@gmail.com"
                    className="flex-1 min-w-0 bg-surface-container border-none rounded-lg px-3 py-2 text-body-md text-on-surface focus:ring-2 focus:ring-primary outline-none"
                  />
                  <button type="submit" title="Save link" className="shrink-0 p-2 rounded-lg text-secondary hover:bg-secondary/10 active:scale-90 transition-all cursor-pointer">
                    <Check className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setLinkingId(null)} title="Cancel" className="shrink-0 p-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high active:scale-90 transition-all cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <button
                  onClick={() => startLinking(c.id, c.userEmail)}
                  className={`flex items-center gap-2 text-label-sm pl-1 rounded-md active:scale-95 transition-transform cursor-pointer ${
                    c.userEmail ? 'text-on-surface-variant hover:text-primary' : 'text-outline hover:text-primary'
                  }`}
                  title="Link a login email"
                >
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{c.userEmail || 'Link a login email'}</span>
                </button>
              )}
            </div>
            );
          })}
        </div>
      </section>

      {/* Official Holidays Section */}
      <section className="space-y-3">
        <h3 className="px-4 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-widest">
          Official Holidays
        </h3>
        <div className="bg-surface-container-low rounded-xl p-4 shadow-sm border border-outline-variant/10 space-y-4">
          {/* Holiday List */}
          <div className="space-y-2">
            {holidays.map(h => (
              <div
                key={h.id}
                className="flex items-center justify-between p-3 bg-surface-container-lowest rounded-lg border border-outline-variant/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-tertiary rounded-full" />
                  <div>
                    <p className="text-body-md font-bold text-on-surface">{h.name}</p>
                    <p className="text-label-sm text-on-surface-variant">
                      {new Date(h.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => onDeleteHoliday(h.id)}
                  className="text-error/70 hover:text-error p-1 hover:bg-error-container/25 rounded-lg active:scale-90 transition-transform cursor-pointer"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                </button>
              </div>
            ))}

            <button
              onClick={() => setShowAddHolidayModal(true)}
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-outline-variant/30 rounded-lg text-outline hover:border-primary/50 hover:text-primary transition-all active:scale-[0.98] cursor-pointer"
            >
              <Plus className="w-4.5 h-4.5" />
              <span className="text-label-sm font-label-sm font-bold">Add New Holiday Event</span>
            </button>
          </div>
        </div>
      </section>

      {/* Data & Backup Section */}
      <section className="space-y-3">
        <h3 className="px-4 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-widest">
          Data &amp; Backup
        </h3>
        <div className="bg-surface-container-low rounded-xl p-4 shadow-sm border border-outline-variant/10 space-y-3">
          <p className="text-label-sm text-on-surface-variant leading-relaxed">
            Your data is saved only in this browser. Export a backup file to keep it safe or move it to
            another device or browser, then use Import there to restore it.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={onExportData}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-on-primary font-bold text-sm active:scale-95 transition-all cursor-pointer shadow-sm hover:bg-primary-container"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              onClick={() => importInputRef.current?.click()}
              className="flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm active:scale-95 transition-all cursor-pointer border border-outline-variant/20 hover:bg-surface-container-highest"
            >
              <Upload className="w-4 h-4" /> Import
            </button>
          </div>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={handleImportFile}
          />
        </div>
      </section>

      {/* Administrators (Access) Section */}
      <section className="space-y-3">
        <h3 className="px-4 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-widest">
          Administrators
        </h3>
        <div className="bg-surface-container-low rounded-xl p-4 shadow-sm border border-outline-variant/10 space-y-3">
          <p className="text-label-sm text-on-surface-variant leading-relaxed">
            These Google accounts have full admin control. Everyone else can view the schedule and submit
            leave requests.
          </p>
          <div className="space-y-2">
            {admins.map(email => (
              <div
                key={email}
                className="flex items-center justify-between gap-2 bg-surface-container-lowest rounded-lg p-2.5 border border-outline-variant/10"
              >
                <span className="text-body-md text-on-surface truncate">{email}</span>
                <button
                  onClick={() => handleRemoveAdmin(email)}
                  className="text-error/70 hover:text-error p-1 rounded-lg hover:bg-error-container/20 active:scale-95 transition-transform cursor-pointer shrink-0"
                  title="Remove administrator"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddAdmin} className="flex gap-2">
            <input
              type="email"
              value={newAdminEmail}
              onChange={(e) => setNewAdminEmail(e.target.value)}
              placeholder="new.admin@gmail.com"
              className="flex-1 min-w-0 bg-surface-container border-none rounded-lg px-3 py-2.5 text-body-md text-on-surface focus:ring-2 focus:ring-primary outline-none"
            />
            <button
              type="submit"
              className="shrink-0 flex items-center gap-1 bg-primary text-on-primary font-bold text-sm px-3 rounded-lg active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </form>
        </div>
      </section>

      {/* Members (Access) Section */}
      <section className="space-y-3">
        <h3 className="px-4 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-widest">
          Members (Access)
        </h3>
        <div className="bg-surface-container-low rounded-xl p-4 shadow-sm border border-outline-variant/10 space-y-3">
          <p className="text-label-sm text-on-surface-variant leading-relaxed">
            Only these Google accounts (plus administrators) can sign in and view the schedule. Add each
            consultant's Gmail to grant access.
          </p>
          {members.length === 0 ? (
            <p className="text-label-sm text-on-surface-variant italic">No members added yet.</p>
          ) : (
            <div className="space-y-2">
              {members.map(email => (
                <div
                  key={email}
                  className="flex items-center justify-between gap-2 bg-surface-container-lowest rounded-lg p-2.5 border border-outline-variant/10"
                >
                  <span className="text-body-md text-on-surface truncate">{email}</span>
                  <button
                    onClick={() => handleRemoveMember(email)}
                    className="text-error/70 hover:text-error p-1 rounded-lg hover:bg-error-container/20 active:scale-95 transition-transform cursor-pointer shrink-0"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleAddMember} className="flex gap-2">
            <input
              type="email"
              value={newMemberEmail}
              onChange={(e) => setNewMemberEmail(e.target.value)}
              placeholder="consultant@gmail.com"
              className="flex-1 min-w-0 bg-surface-container border-none rounded-lg px-3 py-2.5 text-body-md text-on-surface focus:ring-2 focus:ring-primary outline-none"
            />
            <button
              type="submit"
              className="shrink-0 flex items-center gap-1 bg-primary text-on-primary font-bold text-sm px-3 rounded-lg active:scale-95 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Add
            </button>
          </form>
        </div>
      </section>
      </>
      )}

      {/* Account Section */}
      <section className="space-y-3">
        <h3 className="px-4 text-label-sm font-label-sm text-on-surface-variant uppercase tracking-widest">
          Account
        </h3>
        <div className="bg-surface-container-low rounded-xl p-4 shadow-sm border border-outline-variant/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <UserCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-body-md font-semibold text-on-surface truncate">{userEmail ?? 'Signed in'}</p>
              <p className="text-label-sm text-on-surface-variant">Signed in</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="shrink-0 flex items-center gap-2 text-error font-bold text-sm px-3 py-2 rounded-lg hover:bg-error-container/30 active:scale-95 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        <button
          onClick={handleExit}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-surface-container-high text-on-surface font-bold text-sm active:scale-95 transition-all cursor-pointer border border-outline-variant/20"
        >
          <Power className="w-4 h-4" /> Exit App
        </button>
      </section>

      {/* System Health Block (Bento Style) */}
      <section className="bg-primary p-4 rounded-xl text-white shadow-md overflow-hidden relative border border-primary/25">
        <div className="relative z-10 space-y-2">
          <h4 className="text-headline-sm font-headline-sm font-bold flex items-center gap-1">
            <Heart className="w-5 h-5 text-white fill-white/20 animate-pulse" /> System Health
          </h4>
          <p className="text-label-sm opacity-80 mb-3">
            All clinical shift automated rotations are active and fully operational.
          </p>
          <div className="flex items-center gap-2 text-[11px] font-bold bg-white/15 px-2.5 py-1 rounded-full w-max">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
            LIVE SYNCING & SECURED
          </div>
        </div>
        <Sparkles className="absolute -right-4 -bottom-4 w-28 h-28 opacity-10 rotate-12" />
      </section>

      {/* Footer copyright */}
      <footer className="pt-8 text-center space-y-2 opacity-50 pb-12">
        <p className="text-label-sm font-semibold">ICU Consultant Management System v4.2.0</p>
        <p className="text-[10px] uppercase tracking-widest">© 2026 Clinical Operations Dept.</p>
      </footer>

      {/* Modal - Add Consultant */}
      {showAddConsultantModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl p-4 border border-outline-variant/30 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
              <h3 className="font-headline-md text-headline-sm text-on-surface flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-primary" /> Add Consultant
              </h3>
              <button onClick={() => setShowAddConsultantModal(false)} className="text-outline hover:text-on-surface">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddConsultantSubmit} className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Full Name</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Jane Smith"
                  value={newConsultantName}
                  onChange={(e) => setNewConsultantName(e.target.value)}
                  className="bg-surface-container border-none rounded-xl p-4 text-body-md text-on-surface focus:ring-2 focus:ring-primary outline-none"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Designation Role</label>
                <select
                  value={newConsultantRole}
                  onChange={(e) => setNewConsultantRole(e.target.value)}
                  className="bg-surface-container border-none rounded-xl p-4 text-body-md text-on-surface focus:ring-2 focus:ring-primary outline-none"
                >
                  <option value="Senior Consultant">Senior Consultant</option>
                  <option value="Intensivist">Intensivist</option>
                  <option value="Assistant Consultant">Assistant Consultant</option>
                  <option value="Fellow">Fellow</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Login Email (Optional)</label>
                <input
                  type="email"
                  placeholder="Their Google account, to attribute their leave"
                  value={newConsultantEmail}
                  onChange={(e) => setNewConsultantEmail(e.target.value)}
                  className="bg-surface-container border-none rounded-xl p-4 text-body-md text-on-surface focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Avatar Photo URL (Optional)</label>
                <input
                  type="url"
                  placeholder="Leave empty for professional avatar fallback"
                  value={newConsultantAvatar}
                  onChange={(e) => setNewConsultantAvatar(e.target.value)}
                  className="bg-surface-container border-none rounded-xl p-4 text-body-md text-on-surface focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Add Consultant Profile
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal - Add Holiday */}
      {showAddHolidayModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-2xl p-4 border border-outline-variant/30 shadow-2xl space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-outline-variant/10 pb-3">
              <h3 className="font-headline-md text-headline-sm text-on-surface flex items-center gap-2">
                Add Holiday Event
              </h3>
              <button onClick={() => setShowAddHolidayModal(false)} className="text-outline hover:text-on-surface">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddHolidaySubmit} className="space-y-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Holiday Name</label>
                <input
                  type="text"
                  placeholder="e.g. Labor Day"
                  value={newHolidayName}
                  onChange={(e) => setNewHolidayName(e.target.value)}
                  className="bg-surface-container border-none rounded-xl p-4 text-body-md text-on-surface focus:ring-2 focus:ring-primary outline-none"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Event Date</label>
                <input
                  type="date"
                  value={newHolidayDate}
                  onChange={(e) => setNewHolidayDate(e.target.value)}
                  className="bg-surface-container border-none rounded-xl p-4 text-body-md text-on-surface focus:ring-2 focus:ring-primary outline-none"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full h-12 bg-primary hover:bg-primary-container text-on-primary font-bold rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                Create Holiday Event
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
