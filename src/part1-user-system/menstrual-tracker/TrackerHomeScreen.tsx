/**
 * VYNTRA — Menstrual Cycle Health Tracker
 * Strictly record-keeping, historical log & visual timeline.
 * Features: Auto timestamp + manual edit, Active start/end pairing,
 * Duration calculation, local IndexedDB persistence + Firestore sync, Notes log.
 * (No predictions, no cramp rating scale).
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getAllItems, putItem, STORES, addPendingSync } from '../../shared/utils/offline-cache';
import type { CycleRecord, CycleNote } from '../../shared/types';
import { db } from '../../shared/firebase/config';
import { doc, setDoc, Timestamp } from 'firebase/firestore';
import '../styles/tracker.css';

export default function TrackerHomeScreen() {
  const { vyntraUser, isOnline } = useAuth();
  const navigate = useNavigate();

  const [cycles, setCycles] = useState<CycleRecord[]>([]);
  const [activeCycle, setActiveCycle] = useState<CycleRecord | null>(null);

  // Editing timestamps
  const [editingEvent, setEditingEvent] = useState<'start' | 'end' | null>(null);
  const [customDateTime, setCustomDateTime] = useState<string>('');

  // Adding personal note
  const [newNoteContent, setNewNoteContent] = useState('');
  const [selectedCycleForNote, setSelectedCycleForNote] = useState<string | null>(null);

  // Load cycles from IndexedDB
  useEffect(() => {
    async function loadData() {
      if (!vyntraUser) return;
      const allCycles = await getAllItems<CycleRecord>(STORES.CYCLES);
      const userCycles = allCycles.filter((c) => c.userId === vyntraUser.appId);

      // Sort chronological descending
      userCycles.sort((a, b) => {
        const timeA = a.startEvent.editedDateTime?.toMillis() || a.startEvent.autoDateTime.toMillis();
        const timeB = b.startEvent.editedDateTime?.toMillis() || b.startEvent.autoDateTime.toMillis();
        return timeB - timeA;
      });

      setCycles(userCycles);
      const active = userCycles.find((c) => c.isActive);
      setActiveCycle(active || null);
    }
    loadData();
  }, [vyntraUser]);

  // Sync a single cycle to offline cache and Firestore
  const persistCycle = async (cycle: CycleRecord) => {
    await putItem(STORES.CYCLES, cycle);

    if (isOnline && vyntraUser) {
      try {
        await setDoc(doc(db, `users/${vyntraUser.appId}/cycles`, cycle.cycleId), cycle);
      } catch (err) {
        console.warn('Sync failed, caching offline', err);
        await addPendingSync({
          type: 'update',
          collection: `users/${vyntraUser.appId}/cycles`,
          docId: cycle.cycleId,
          data: cycle,
        });
      }
    } else if (vyntraUser) {
      await addPendingSync({
        type: 'update',
        collection: `users/${vyntraUser.appId}/cycles`,
        docId: cycle.cycleId,
        data: cycle,
      });
    }
  };

  // Start new cycle
  const handleStartCycle = async () => {
    if (!vyntraUser || activeCycle) return;

    const newId = `CYC-${Date.now()}`;
    const newRecord: CycleRecord = {
      cycleId: newId,
      userId: vyntraUser.appId,
      startEvent: {
        autoDateTime: Timestamp.now(),
      },
      notes: [],
      isActive: true,
    };

    const updated = [newRecord, ...cycles];
    setCycles(updated);
    setActiveCycle(newRecord);
    await persistCycle(newRecord);
  };

  // End active cycle
  const handleEndCycle = async () => {
    if (!activeCycle || !vyntraUser) return;

    const now = Timestamp.now();
    const startTimeMillis = activeCycle.startEvent.editedDateTime?.toMillis() || activeCycle.startEvent.autoDateTime.toMillis();
    const endTimeMillis = now.toMillis();
    const diffDays = Math.max(1, Math.round((endTimeMillis - startTimeMillis) / (1000 * 60 * 60 * 24)));

    const updatedRecord: CycleRecord = {
      ...activeCycle,
      endEvent: {
        autoDateTime: now,
      },
      durationDays: diffDays,
      isActive: false,
    };

    const updated = cycles.map((c) => (c.cycleId === activeCycle.cycleId ? updatedRecord : c));
    setCycles(updated);
    setActiveCycle(null);
    await persistCycle(updatedRecord);
  };

  // Save edited timestamp
  const handleSaveTimestamp = async () => {
    if (!editingEvent || !customDateTime) return;
    const targetCycle = editingEvent === 'start' ? (activeCycle || cycles[0]) : (activeCycle || cycles[0]);
    if (!targetCycle) return;

    const customDate = new Date(customDateTime);
    if (isNaN(customDate.getTime())) return;

    const timestamp = Timestamp.fromDate(customDate);
    let updatedRecord: CycleRecord;

    if (editingEvent === 'start') {
      const endMillis = targetCycle.endEvent
        ? (targetCycle.endEvent.editedDateTime?.toMillis() || targetCycle.endEvent.autoDateTime.toMillis())
        : null;
      if (endMillis && timestamp.toMillis() > endMillis) {
        alert('Start date cannot be after end date.');
        return;
      }

      let diffDays = targetCycle.durationDays;
      if (endMillis) {
        diffDays = Math.max(1, Math.round((endMillis - timestamp.toMillis()) / (1000 * 60 * 60 * 24)));
      }

      updatedRecord = {
        ...targetCycle,
        startEvent: {
          ...targetCycle.startEvent,
          editedDateTime: timestamp,
        },
        durationDays: diffDays,
      };
    } else {
      // End event
      const startTimeMillis = updatedRecordStart(targetCycle);
      if (timestamp.toMillis() < startTimeMillis) {
        alert('End date cannot be earlier than start date.');
        return;
      }

      const diffDays = Math.max(1, Math.round((timestamp.toMillis() - startTimeMillis) / (1000 * 60 * 60 * 24)));
      updatedRecord = {
        ...targetCycle,
        endEvent: {
          autoDateTime: targetCycle.endEvent?.autoDateTime || Timestamp.now(),
          editedDateTime: timestamp,
        },
        durationDays: diffDays,
      };
    }

    const updated = cycles.map((c) => (c.cycleId === updatedRecord.cycleId ? updatedRecord : c));
    setCycles(updated);
    if (updatedRecord.isActive) setActiveCycle(updatedRecord);
    await persistCycle(updatedRecord);

    setEditingEvent(null);
    setCustomDateTime('');
  };

  const updatedRecordStart = (c: CycleRecord) => {
    return c.startEvent.editedDateTime?.toMillis() || c.startEvent.autoDateTime.toMillis();
  };

  // Add note
  const handleAddNote = async (cycleId: string) => {
    if (!newNoteContent.trim()) return;
    const target = cycles.find((c) => c.cycleId === cycleId);
    if (!target) return;

    const newNote: CycleNote = {
      noteId: crypto.randomUUID(),
      content: newNoteContent.trim(),
      createdAt: Timestamp.now(),
    };

    const updatedRecord: CycleRecord = {
      ...target,
      notes: [...(target.notes || []), newNote],
    };

    const updated = cycles.map((c) => (c.cycleId === target.cycleId ? updatedRecord : c));
    setCycles(updated);
    if (updatedRecord.isActive) setActiveCycle(updatedRecord);
    await persistCycle(updatedRecord);

    setNewNoteContent('');
    setSelectedCycleForNote(null);
  };

  // Completed cycles for graph
  const completedCycles = cycles.filter((c) => !c.isActive && c.durationDays);

  const currentDayNumber = activeCycle
    ? Math.max(1, Math.round((Date.now() - updatedRecordStart(activeCycle)) / (1000 * 60 * 60 * 24)))
    : 1;

  return (
    <div className="tracker-screen">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          onClick={() => navigate('/user/home')}
          style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
          aria-label="Back"
        >
          ←
        </button>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-on-surface)' }}>
            Menstrual Health Tracker
          </h2>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--color-on-surface-variant)' }}>
            Offline event log & duration history
          </p>
        </div>
      </div>

      {/* Cycle Status Card */}
      <div className="cycle-status-card">
        <div>
          <span className={`cycle-indicator-dot ${activeCycle ? 'active' : 'inactive'}`} />
          <strong style={{ fontSize: '0.85rem', color: activeCycle ? 'var(--color-primary)' : 'var(--color-outline)' }}>
            {activeCycle ? 'CYCLE CURRENTLY IN PROGRESS' : 'NO ACTIVE CYCLE RECORDED'}
          </strong>
        </div>

        <div className="cycle-state-title">
          {activeCycle
            ? `Day ${currentDayNumber}`
            : 'Track Cycle Start'}
        </div>

        <div className="cycle-state-subtitle">
          {activeCycle
            ? `Started: ${new Date(updatedRecordStart(activeCycle)).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}`
            : 'Tap below when your period begins to auto-log timestamp'}
        </div>

        {activeCycle ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button className="tracker-action-btn end-btn" onClick={handleEndCycle}>
              <span>✓</span> Mark Cycle Ended
            </button>
            <button
              onClick={() => {
                setEditingEvent('start');
                setCustomDateTime(new Date(updatedRecordStart(activeCycle)).toISOString().slice(0, 16));
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-primary)',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                textDecoration: 'underline',
              }}
            >
              Edit Start Date / Time
            </button>
          </div>
        ) : (
          <button className="tracker-action-btn start-btn" onClick={handleStartCycle}>
            <span>🌸</span> Record Cycle Start
          </button>
        )}

        {/* Edit Timestamp Drawer */}
        {editingEvent && (
          <div className="timestamp-edit-box">
            <label>Correct {editingEvent.toUpperCase()} Date & Time:</label>
            <input
              type="datetime-local"
              className="form-input"
              value={customDateTime}
              onChange={(e) => setCustomDateTime(e.target.value)}
              style={{ marginBottom: '10px' }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-primary" style={{ padding: '8px 14px', fontSize: '0.85rem' }} onClick={handleSaveTimestamp}>
                Update
              </button>
              <button
                className="btn-secondary"
                style={{ padding: '8px 14px', fontSize: '0.85rem' }}
                onClick={() => setEditingEvent(null)}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Visual History Graph */}
      <div className="cycle-graph-card">
        <div className="cycle-graph-header">
          <h3>Cycle Duration History</h3>
          <span style={{ fontSize: '0.75rem', color: 'var(--color-outline)', fontWeight: 700 }}>
            {completedCycles.length} Logged
          </span>
        </div>

        {completedCycles.length === 0 ? (
          <p style={{ fontSize: '0.82rem', color: 'var(--color-on-surface-variant)', textAlign: 'center', margin: '20px 0' }}>
            Completed cycles will appear here as a duration graph.
          </p>
        ) : (
          <div className="bars-chart-container">
            {completedCycles.slice(0, 6).reverse().map((c) => {
              const days = c.durationDays || 1;
              const maxDays = 12; // visual scaling
              const heightPercent = Math.min(100, Math.max(15, (days / maxDays) * 100));
              const startDt = new Date(updatedRecordStart(c));
              const monthLabel = startDt.toLocaleDateString(undefined, { month: 'short' });

              return (
                <div key={c.cycleId} className="bar-column">
                  <span className="bar-days-label">{days}d</span>
                  <div className="bar-fill" style={{ height: `${heightPercent}%` }} />
                  <span className="bar-month-label">{monthLabel}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History Log & Notes Section */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700 }}>Personal Logs & Observations</h3>

        {cycles.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-outline)' }}>
            No history yet. Start your first cycle above.
          </div>
        ) : (
          <div className="cycle-logs-list">
            {cycles.map((c) => {
              const startDt = new Date(updatedRecordStart(c));
              const endDt = c.endEvent
                ? new Date(c.endEvent.editedDateTime?.toMillis() || c.endEvent.autoDateTime.toMillis())
                : null;

              return (
                <div key={c.cycleId} className="cycle-log-item">
                  <div className="log-date-row">
                    <div>
                      <span className="log-date-title">
                        {startDt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        {endDt ? ` — ${endDt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}` : ' (Ongoing)'}
                      </span>
                    </div>
                    {c.durationDays && <span className="log-duration-badge">{c.durationDays} days</span>}
                  </div>

                  {/* Notes Display */}
                  {c.notes && c.notes.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                      {c.notes.map((note) => (
                        <div key={note.noteId} className="log-notes-text">
                          "{note.content}"
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Note Button / Input */}
                  {selectedCycleForNote === c.cycleId ? (
                    <div style={{ marginTop: '10px' }}>
                      <textarea
                        className="form-textarea"
                        rows={2}
                        placeholder="Write personal symptom or observation..."
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        style={{ fontSize: '0.85rem' }}
                      />
                      <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                        <button
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => handleAddNote(c.cycleId)}
                        >
                          Save Note
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                          onClick={() => setSelectedCycleForNote(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setSelectedCycleForNote(c.cycleId)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        padding: '6px 0 0',
                        textAlign: 'left',
                      }}
                    >
                      + Add Note
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
