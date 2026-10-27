import React, { useState, useEffect } from 'react';
import {
  Incident,
  IncidentStatus,
  IncidentMedia,
} from '@/types/database';
import { useAuth } from '@/context/AuthContext';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { useIncidentDetails } from '@/hooks/useIncidentDetails';
import {
  confirmIncident,
  hasUserConfirmedIncident,
  updateIncidentStatus,
  addIncidentTimelineNote,
  uploadIncidentPhoto,
} from '@/services/incidentService';
import { compressImage } from '@/utils/imageCompressor';
import {
  X,
  MapPin,
  Users,
  AlertTriangle,
  Flame,
  CheckCircle,
  Clock,
  Camera,
  Send,
  CheckCircle2,
  ShieldCheck,
  Truck,
  MessageSquare,
} from 'lucide-react';

interface IncidentDetailModalProps {
  incident: Incident;
  onClose: () => void;
  onIncidentUpdated?: () => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  onClose,
  onIncidentUpdated,
}) => {
  const { user } = useAuth();
  const isOnline = useOnlineStatus();
  const { updates, media, refresh } = useIncidentDetails(incident.id);

  const [hasConfirmed, setHasConfirmed] = useState(false);
  const [confirmCount, setConfirmCount] = useState(incident.confirmations);
  const [currentStatus, setCurrentStatus] = useState<IncidentStatus>(incident.status);
  const [isConfirming, setIsConfirming] = useState(false);

  // Note form state
  const [noteText, setNoteText] = useState('');
  const [isPostingNote, setIsPostingNote] = useState(false);

  // Photo upload state
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);
  const isLowData = typeof window !== 'undefined' && localStorage.getItem('relief_desk_low_data') === 'true';
  const [allowPhotoLoad, setAllowPhotoLoad] = useState(!isLowData);

  // Responders access check: volunteer, coordinator, admin
  const isResponder = user?.role && ['volunteer', 'coordinator', 'admin'].includes(user.role);

  useEffect(() => {
    let mounted = true;
    hasUserConfirmedIncident(incident.id, user?.id).then((confirmed) => {
      if (mounted) setHasConfirmed(confirmed);
    });
    return () => {
      mounted = false;
    };
  }, [incident.id, user?.id]);

  useEffect(() => {
    setConfirmCount(incident.confirmations);
    setCurrentStatus(incident.status);
  }, [incident]);

  const handleConfirm = async () => {
    if (hasConfirmed || isConfirming) return;
    setIsConfirming(true);

    const res = await confirmIncident({
      incidentId: incident.id,
      userId: user?.id,
      note: 'I see this too',
      isOnline,
    });

    if (res.success) {
      setHasConfirmed(true);
      if (res.newCount) setConfirmCount(res.newCount);
      onIncidentUpdated?.();
      refresh();
    }
    setIsConfirming(false);
  };

  const handleStatusChange = async (newStatus: IncidentStatus) => {
    const res = await updateIncidentStatus({
      incidentId: incident.id,
      newStatus,
      userId: user?.id,
      isOnline,
    });

    if (res.success) {
      setCurrentStatus(newStatus);
      onIncidentUpdated?.();
      refresh();
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim() || isPostingNote) return;

    setIsPostingNote(true);
    const res = await addIncidentTimelineNote({
      incidentId: incident.id,
      note: noteText.trim(),
      userId: user?.id,
      isOnline,
    });

    if (res.success) {
      setNoteText('');
      refresh();
    }
    setIsPostingNote(false);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploadingPhoto(true);
    try {
      const { blob, dataUrl } = await compressImage(file, 1280, 200 * 1024);
      await uploadIncidentPhoto({
        incidentId: incident.id,
        blob,
        dataUrl,
        userId: user.id,
        isOnline,
      });
      refresh();
    } catch (err) {
      console.error('Failed to attach photo:', err);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const getSeverityBadge = () => {
    switch (incident.severity) {
      case 4:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-300 dark:border-red-800">
            <Flame className="w-4 h-4 text-red-600 animate-pulse" />
            <span>CRITICAL (Level 4)</span>
          </span>
        );
      case 3:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300 border border-orange-300 dark:border-orange-800">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <span>HIGH (Level 3)</span>
          </span>
        );
      case 2:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>MODERATE (Level 2)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>LOW (Level 1)</span>
          </span>
        );
    }
  };

  const getStatusBadge = (status: IncidentStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300">
            Verified
          </span>
        );
      case 'responding':
        return (
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300">
            Responding
          </span>
        );
      case 'resolved':
        return (
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            Resolved
          </span>
        );
      default:
        return (
          <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Reported
          </span>
        );
    }
  };

  const getTimeAgo = (dateStr: string) => {
    try {
      const ms = Date.now() - new Date(dateStr).getTime();
      const mins = Math.floor(ms / (1000 * 60));
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      return `${Math.floor(hours / 24)}d ago`;
    } catch {
      return '';
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="incident-detail-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-2xl max-h-[92vh] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 bg-slate-50 dark:bg-slate-900/60">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2
                id="incident-detail-title"
                className="text-lg sm:text-xl font-black text-slate-900 dark:text-slate-100"
              >
                {incident.type}
              </h2>
              {getStatusBadge(currentStatus)}
            </div>
            {incident.address_label && (
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                <span>{incident.address_label}</span>
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {getSeverityBadge()}
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="p-1.5 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Situation Description */}
          {incident.description && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60">
              <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Description
              </h4>
              <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                {incident.description}
              </p>
            </div>
          )}

          {/* Quick Metrics & "I see this too" Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/30">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-300">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{confirmCount} Citizen Confirmation{confirmCount > 1 ? 's' : ''}</span>
              </div>
              {incident.people_affected > 0 && (
                <div className="flex items-center gap-1.5 font-bold text-red-600 dark:text-red-400">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{incident.people_affected} affected</span>
                </div>
              )}
            </div>

            {/* "I see this too" button */}
            <button
              type="button"
              onClick={handleConfirm}
              disabled={hasConfirmed || isConfirming}
              className={`min-h-[44px] px-4 py-2 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition ${
                hasConfirmed
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 cursor-default'
                  : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm shadow-blue-500/20'
              }`}
            >
              {hasConfirmed ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Confirmed by you</span>
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  <span>{isConfirming ? 'Confirming...' : 'I see this too (+1)'}</span>
                </>
              )}
            </button>
          </div>

          {/* Incident Photos Gallery */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-slate-500" />
                Photos ({media.length})
              </h4>
              <label className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer flex items-center gap-1">
                <span>+ Attach Photo</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handlePhotoUpload}
                  disabled={isUploadingPhoto}
                  className="hidden"
                />
              </label>
            </div>

            {media.length > 0 ? (
              isLowData && !allowPhotoLoad ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40 text-center space-y-2">
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    Low-data mode active. {media.length} photo{media.length > 1 ? 's' : ''} available.
                  </p>
                  <button
                    type="button"
                    onClick={() => setAllowPhotoLoad(true)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-sm transition"
                  >
                    Load Ground Photos
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {media.map((item: IncidentMedia) => {
                    const src = item.local_data_url || item.signed_url;
                    return (
                      <div
                        key={item.id}
                        onClick={() => src && setSelectedPhotoPreview(src)}
                        className="relative h-28 sm:h-32 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 cursor-pointer group"
                      >
                        {src ? (
                          <img
                            src={src}
                            alt="Incident verification"
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400">
                            Photo Pending Sync
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            ) : (
              <p className="text-xs text-slate-400 italic">No ground photos attached yet.</p>
            )}
          </div>

          {/* Responders Workflow Actions (Volunteers / Coordinators) */}
          {isResponder && (
            <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Responder Workflow Actions
              </h4>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => handleStatusChange('verified')}
                  disabled={currentStatus === 'verified'}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    currentStatus === 'verified'
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange('responding')}
                  disabled={currentStatus === 'responding'}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    currentStatus === 'responding'
                      ? 'bg-purple-600 text-white'
                      : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <Truck className="w-4 h-4" />
                  <span>Dispatch</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange('resolved')}
                  disabled={currentStatus === 'resolved'}
                  className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                    currentStatus === 'resolved'
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  <CheckCircle className="w-4 h-4" />
                  <span>Resolve</span>
                </button>
              </div>

              {/* Add Note Form */}
              <form onSubmit={handleAddNote} className="flex gap-2 pt-1">
                <input
                  type="text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Post responder note (e.g. Boat dispatched)..."
                  className="flex-1 text-xs px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!noteText.trim() || isPostingNote}
                  className="min-h-[40px] px-3.5 py-2 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 font-bold text-xs flex items-center gap-1 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Post</span>
                </button>
              </form>
            </div>
          )}

          {/* Incident Updates Timeline */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-500" />
              Incident Timeline ({updates.length})
            </h4>

            {updates.length > 0 ? (
              <div className="relative pl-6 space-y-4 border-l-2 border-slate-200 dark:border-slate-800 ml-2">
                {updates.map((up) => (
                  <div key={up.id} className="relative group">
                    {/* Timeline bullet */}
                    <div className="absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white dark:border-slate-900 bg-blue-500 flex items-center justify-center" />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          {up.kind === 'status_change'
                            ? `Status changed to ${up.new_status}`
                            : up.kind === 'assignment'
                            ? 'Assignment updated'
                            : 'Responder Note'}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {getTimeAgo(up.created_at)}
                        </span>
                      </div>
                      {up.note && (
                        <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 whitespace-pre-wrap">
                          {up.note}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-500 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-slate-400" />
                <span>Initial report recorded. Awaiting responder updates.</span>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Reported {getTimeAgo(incident.created_at)}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-5 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* Lightbox Photo Preview */}
      {selectedPhotoPreview && (
        <div
          onClick={() => setSelectedPhotoPreview(null)}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 cursor-zoom-out"
        >
          <img
            src={selectedPhotoPreview}
            alt="Expanded view"
            className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
