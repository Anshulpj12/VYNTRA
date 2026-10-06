/**
 * VYNTRA — District World Chat Screen
 * Six-Hour Data Cycle Architecture:
 * Windows: 12 AM–6 AM, 6 AM–12 PM, 12 PM–6 PM, 6 PM–12 AM.
 * Mandatory Category Selection before submission.
 * Category filtering, rate-limiting, and offline-first caching with IndexedDB.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { CHAT_CATEGORIES } from '../../shared/constants/chat-categories';
import { isRequestAllowed } from '../../shared/utils/rate-limiter';
import { getItem, putItem, STORES, addPendingSync } from '../../shared/utils/offline-cache';
import type { ChatMessage, SixHourRecord } from '../../shared/types';
import { db } from '../../shared/firebase/config';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import '../styles/chat.css';

// Helper to calculate current 6-hour window
function getSixHourPeriod(now = new Date()) {
  const h = now.getHours();
  let startHour = 0;
  let endHour = 6;
  let label = '12 AM – 6 AM';

  if (h >= 6 && h < 12) {
    startHour = 6;
    endHour = 12;
    label = '6 AM – 12 PM';
  } else if (h >= 12 && h < 18) {
    startHour = 12;
    endHour = 18;
    label = '12 PM – 6 PM';
  } else if (h >= 18) {
    startHour = 18;
    endHour = 24;
    label = '6 PM – 12 AM';
  }

  const start = new Date(now);
  start.setHours(startHour, 0, 0, 0);

  const end = new Date(now);
  if (endHour === 24) {
    end.setHours(23, 59, 59, 999);
  } else {
    end.setHours(endHour, 0, 0, 0);
  }

  const year = start.getFullYear();
  const month = String(start.getMonth() + 1).padStart(2, '0');
  const day = String(start.getDate()).padStart(2, '0');
  const periodId = `${year}-${month}-${day}_${startHour}-${endHour}`;
  return { start, end, label, periodId };
}

export default function DistrictChatScreen() {
  const { districtCode } = useParams<{ districtCode: string }>();
  const [searchParams] = useSearchParams();
  const stateCode = searchParams.get('state') || 'DL';
  const districtName = searchParams.get('district') || `District ${districtCode}`;

  const { vyntraUser, isOnline } = useAuth();
  const navigate = useNavigate();

  const [period, setPeriod] = useState(getSixHourPeriod());
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [activeFilterCategory, setActiveFilterCategory] = useState<string>('all');

  // New message composer
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [inputText, setInputText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Recalculate 6-hour period periodically
  useEffect(() => {
    const timer = setInterval(() => {
      setPeriod(getSixHourPeriod());
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  // Load chat messages from IndexedDB cache & Firestore
  useEffect(() => {
    if (!districtCode) return;

    const cacheKey = `chat-${stateCode}-${districtCode}-${period.periodId}`;

    async function loadChat() {
      // 1. Try local cache
      const cached = await getItem<{ record: SixHourRecord }>(STORES.CHAT_CACHE, cacheKey);
      if (cached?.record?.messages) {
        setMessages(cached.record.messages);
      }

      // 2. If online, fetch from Firestore
      if (isOnline) {
        try {
          const docRef = doc(db, `world-chat/${stateCode}/${districtCode}/current-record`);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data() as SixHourRecord;
            if (data.messages) {
              setMessages(data.messages);
              // Update offline cache
              await putItem(STORES.CHAT_CACHE, {
                cacheKey,
                record: data,
                fetchedAt: Date.now(),
              });
            }
          } else if (!cached) {
            // Initial seed if totally empty
            const seedMessages: ChatMessage[] = [
              {
                messageId: `seed-1`,
                userId: 'SYSTEM-ALERT',
                districtCode: districtCode || '',
                category: 'safety-alert',
                content: `Welcome to ${districtName} Regional Broadcast. Period: ${period.label}. Emergency helpline: 112.`,
                timestamp: Timestamp.now(),
              },
            ];
            setMessages(seedMessages);
          }
        } catch (err) {
          console.warn('Could not fetch remote chat record', err);
        }
      }
    }

    loadChat();
  }, [districtCode, stateCode, period.periodId, isOnline, districtName, period.label]);

  // Scroll to bottom on message update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    setErrorMsg('');

    if (!selectedCategory) {
      setErrorMsg('Please select a category before sharing.');
      return;
    }

    if (!inputText.trim()) {
      return;
    }

    if (!vyntraUser) {
      setErrorMsg('You must be signed in to post.');
      return;
    }

    // Rate limiter: Max 10 messages per minute
    const userRateKey = `chat-post-${vyntraUser.appId}`;
    if (!isRequestAllowed(userRateKey, 10, 60000)) {
      setErrorMsg('Posting too fast. Please wait a moment.');
      return;
    }

    setSubmitting(true);

    const newMsg: ChatMessage = {
      messageId: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      userId: vyntraUser.appId,
      districtCode: districtCode || '',
      category: selectedCategory,
      content: inputText.trim(),
      timestamp: Timestamp.now(),
    };

    const updatedMessages = [...messages, newMsg];
    setMessages(updatedMessages);
    setInputText('');

    const cacheKey = `chat-${stateCode}-${districtCode}-${period.periodId}`;

    const currentRecord: SixHourRecord = {
      recordId: period.periodId,
      districtCode: districtCode || '',
      stateCode,
      periodStart: Timestamp.fromDate(period.start),
      periodEnd: Timestamp.fromDate(period.end),
      status: 'active',
      messages: updatedMessages,
      messageCount: updatedMessages.length,
    };

    // Cache locally immediately
    await putItem(STORES.CHAT_CACHE, {
      cacheKey,
      record: currentRecord,
      updatedAt: Date.now(),
    });

    // Sync to Firestore
    if (isOnline) {
      try {
        const docRef = doc(db, `world-chat/${stateCode}/${districtCode}/current-record`);
        await setDoc(docRef, currentRecord);
      } catch (err) {
        console.warn('Chat remote sync failed, queued offline', err);
        await addPendingSync({
          type: 'update',
          collection: `world-chat/${stateCode}/${districtCode}`,
          docId: 'current-record',
          data: currentRecord,
        });
      }
    } else {
      await addPendingSync({
        type: 'update',
        collection: `world-chat/${stateCode}/${districtCode}`,
        docId: 'current-record',
        data: currentRecord,
      });
    }

    setSubmitting(false);
  };

  // Filter messages by category
  const filteredMessages = activeFilterCategory === 'all'
    ? messages
    : messages.filter((m) => m.category === activeFilterCategory);

  return (
    <div className="district-chat-screen">
      {/* Top Header */}
      <div className="chat-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => navigate('/chat')}
            style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer' }}
            aria-label="Back"
          >
            ←
          </button>
          <div className="chat-header-title">
            <h2>{districtName}</h2>
            <p>Code: #{districtCode} • State: {stateCode}</p>
          </div>
        </div>

        <div className="cycle-period-badge" title="6-Hour Rolling Period">
          <span>🕒</span>
          <span>{period.label}</span>
        </div>
      </div>

      {/* Category Filter Strip */}
      <div className="category-filter-strip">
        <button
          className={`category-filter-chip ${activeFilterCategory === 'all' ? 'active' : ''}`}
          onClick={() => setActiveFilterCategory('all')}
        >
          All Updates ({messages.length})
        </button>
        {CHAT_CATEGORIES.map((cat) => {
          const count = messages.filter((m) => m.category === cat.id).length;
          return (
            <button
              key={cat.id}
              className={`category-filter-chip ${activeFilterCategory === cat.id ? 'active' : ''}`}
              onClick={() => setActiveFilterCategory(cat.id)}
            >
              {cat.icon} {cat.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Messages Scroll Area */}
      <div className="messages-container">
        {filteredMessages.length === 0 ? (
          <div style={{ textAlign: 'center', color: 'var(--color-outline)', padding: '40px 20px' }}>
            No updates in this category for {period.label}.
            <br />
            Select a category below to broadcast the first update.
          </div>
        ) : (
          filteredMessages.map((msg) => {
            const isOwn = msg.userId === vyntraUser?.appId;
            const categoryObj = CHAT_CATEGORIES.find((c) => c.id === msg.category);
            const dateStr = msg.timestamp?.toDate
              ? msg.timestamp.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Now';

            return (
              <div
                key={msg.messageId}
                className={`chat-message-bubble ${isOwn ? 'own-message' : ''}`}
              >
                <div>
                  <span className="message-category-tag">
                    <span>{categoryObj?.icon || '📌'}</span>
                    <span>{categoryObj?.label || msg.category}</span>
                  </span>
                </div>

                <div className="message-content-text">{msg.content}</div>

                <div className="message-footer-info">
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {isOwn ? 'You' : msg.userId.slice(0, 14)}
                  </span>
                  <span>{dateStr}</span>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Composer */}
      <div className="chat-composer-box">
        {errorMsg && (
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--color-error)',
            fontWeight: 600,
            padding: '2px 8px',
          }}>
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Step 1: Mandatory Category Picker */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--color-outline)', fontWeight: 700 }}>
            SELECT CATEGORY BEFORE SHARING:
          </span>
          <div className="category-picker-row">
            {CHAT_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                className={`category-pick-btn ${selectedCategory === cat.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setErrorMsg('');
                }}
              >
                {cat.icon} {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Message Input & Send */}
        <div className="composer-input-row">
          <input
            type="text"
            className="composer-text-input"
            placeholder={
              selectedCategory
                ? `Write your ${CHAT_CATEGORIES.find((c) => c.id === selectedCategory)?.label} update...`
                : 'Select category above first...'
            }
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <button
            className="send-msg-btn"
            onClick={handleSendMessage}
            disabled={submitting || !selectedCategory || !inputText.trim()}
            title="Broadcast Message"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}
