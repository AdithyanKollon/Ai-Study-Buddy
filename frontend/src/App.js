import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { jsPDF } from "jspdf";
import "./App.css";
import Auth from "./Auth";

const API = "https://ai-study-buddy-production-7d72.up.railway.app/api";

function formatTime(iso) {
  if (!iso) return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("access_token"));
  const [userEmail, setUserEmail] = useState(localStorage.getItem("user_email"));
  const [docs, setDocs] = useState([]);
  const [activeDocId, setActiveDocId] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [chatMap, setChatMap] = useState({});
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [streamingSources, setStreamingSources] = useState([]);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  const messages = chatMap[activeDocId] || [];
  const activeDoc = docs.find(d => d.doc_id === activeDocId);

  const handleLogout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_email");
    setToken(null);
    setUserEmail(null);
    setDocs([]);
    setActiveDocId(null);
    setChatMap({});
  }, []);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/docs/list?access_token=${token}`);
      setDocs(res.data.documents);
    } catch {
      handleLogout();
    }
  }, [token, handleLogout]);

  const loadMessages = useCallback(async (docId) => {
    if (chatMap[docId]) return;
    try {
      const res = await axios.post(`${API}/messages/get`, {
        doc_id: docId,
        access_token: token
      });
      const loaded = res.data.messages.map(m => ({
        role: m.role,
        content: m.content,
        time: m.created_at,
        sources: []
      }));
      setChatMap(prev => ({ ...prev, [docId]: loaded }));
    } catch {}
  }, [token, chatMap]);

  useEffect(() => {
    if (token) fetchDocs();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMap, activeDocId, streamingText]);

  useEffect(() => {
    setSuggestions([]);
    if (activeDocId && token) loadMessages(activeDocId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDocId]);

  const saveMessage = async (docId, role, content) => {
    try {
      await axios.post(`${API}/messages/save`, {
        doc_id: docId,
        role,
        content,
        access_token: token
      });
    } catch {}
  };

  const handleLogin = (accessToken, email) => {
    setToken(accessToken);
    setUserEmail(email);
  };

  const addMessage = (docId, msg) => {
    setChatMap(prev => ({
      ...prev,
      [docId]: [...(prev[docId] || []), msg]
    }));
  };

  const fetchSuggestions = async (docId) => {
    setLoadingSuggestions(true);
    try {
      const res = await axios.post(`${API}/suggest`, { doc_id: docId });
      setSuggestions(res.data.questions);
    } catch {
      setSuggestions([]);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const handleDeleteDoc = async (e, docId) => {
    e.stopPropagation();
    if (!window.confirm("Delete this document and its chat history?")) return;
    try {
      await axios.delete(`${API}/messages/delete/${docId}?access_token=${token}`);
      await axios.delete(`${API}/docs/delete/${docId}?access_token=${token}`);
      setDocs(prev => prev.filter(d => d.doc_id !== docId));
      setChatMap(prev => { const n = { ...prev }; delete n[docId]; return n; });
      if (activeDocId === docId) setActiveDocId(null);
    } catch {
      alert("Failed to delete document.");
    }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post(`${API}/upload`, formData);
      const newDoc = { doc_id: res.data.doc_id, filename: res.data.filename };

      await axios.post(`${API}/docs/save`, {
        doc_id: newDoc.doc_id,
        filename: newDoc.filename,
        access_token: token
      });

      setDocs(prev => [newDoc, ...prev]);
      setActiveDocId(newDoc.doc_id);

      const welcomeMsg = {
        role: "assistant",
        content: `✅ **${res.data.filename}** uploaded! ${res.data.chunks_stored} chunks processed. Ask me anything about this document.`,
        time: new Date().toISOString(),
        sources: []
      };
      addMessage(newDoc.doc_id, welcomeMsg);
      await saveMessage(newDoc.doc_id, "assistant", welcomeMsg.content);
      fetchSuggestions(newDoc.doc_id);

    } catch {
      alert("Upload failed. Make sure backend is running.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleChat = async (question) => {
    const q = question || input;
    if (!q.trim() || !activeDocId || loading) return;

    const currentDocId = activeDocId;
    const userMsg = { role: "user", content: q, time: new Date().toISOString(), sources: [] };
    addMessage(currentDocId, userMsg);
    await saveMessage(currentDocId, "user", q);

    setInput("");
    setSuggestions([]);
    setLoading(true);
    setStreamingText("");
    setStreamingSources([]);

    const currentMessages = chatMap[currentDocId] || [];

    try {
      const response = await fetch(`${API}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doc_id: currentDocId,
          question: q,
          chat_history: currentMessages.slice(-6)
        })
      });

      if (!response.ok) throw new Error("Failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";
      let sources = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;
            try {
              const parsed = JSON.parse(data);
              if (parsed.token) {
                fullText += parsed.token;
                setStreamingText(fullText);
              }
              if (parsed.sources) {
                sources = parsed.sources;
                setStreamingSources(sources);
              }
            } catch { }
          }
        }
      }

      setStreamingText("");
      setStreamingSources([]);
      addMessage(currentDocId, {
        role: "assistant",
        content: fullText,
        time: new Date().toISOString(),
        sources
      });
      await saveMessage(currentDocId, "assistant", fullText);

    } catch {
      addMessage(currentDocId, {
        role: "assistant",
        content: "Sorry, something went wrong. Please try again.",
        time: new Date().toISOString(),
        sources: []
      });
      setStreamingText("");
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 16;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    doc.setFontSize(18);
    doc.setTextColor(30, 30, 30);
    doc.text(`Chat Summary — ${activeDoc?.filename || "Document"}`, margin, y);
    y += 10;

    doc.setFontSize(10);
    doc.setTextColor(120, 120, 120);
    doc.text(`Exported on ${new Date().toLocaleDateString()}`, margin, y);
    y += 10;

    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    messages.forEach((msg) => {
      if (y > 270) { doc.addPage(); y = 20; }

      doc.setFontSize(9);
      doc.setTextColor(
        msg.role === "user" ? 37 : 100,
        msg.role === "user" ? 99 : 100,
        msg.role === "user" ? 235 : 100
      );
      doc.text(msg.role === "user" ? "You" : "AI Study Buddy", margin, y);
      y += 6;

      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);
      const clean = msg.content.replace(/[*_#`]/g, "");
      const lines = doc.splitTextToSize(clean, maxWidth);
      lines.forEach(line => {
        if (y > 275) { doc.addPage(); y = 20; }
        doc.text(line, margin, y);
        y += 6;
      });
      y += 6;
    });

    doc.save(`${activeDoc?.filename || "chat"}-summary.pdf`);
  };

  const handleTextareaChange = (e) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
  };

  if (!token) return <Auth onLogin={handleLogin} />;

  return (
    <div className="layout">
      <div className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">📚</div>
          <div className="sidebar-logo-text">Study<span>Buddy</span></div>
        </div>

        <button className="new-doc-btn" onClick={() => fileInputRef.current.click()}>
          {uploading ? "⏳ Uploading..." : "✏️ New Document"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          style={{ display: "none" }}
          onChange={handleUpload}
          disabled={uploading}
        />

        {docs.length > 0 && (
          <div className="sidebar-section-title">Recent</div>
        )}

        {docs.map(doc => (
          <div
            key={doc.doc_id}
            className={`doc-item ${doc.doc_id === activeDocId ? "active" : ""}`}
            onClick={() => setActiveDocId(doc.doc_id)}
          >
            <div className="doc-item-left">
              <div className="doc-icon-wrapper">📄</div>
              <span className="doc-name" title={doc.filename}>{doc.filename}</span>
            </div>
            <button
              className="delete-doc-btn"
              onClick={(e) => handleDeleteDoc(e, doc.doc_id)}
              title="Delete document"
            >🗑</button>
          </div>
        ))}

        <div className="sidebar-bottom">
          <div className="user-pill">
            <div className="user-avatar">{userEmail?.[0]}</div>
            <div className="user-email">{userEmail}</div>
          </div>
          <button className="logout-btn" onClick={handleLogout}>↪ Sign out</button>
        </div>
      </div>

      <div className="main">
        {!activeDocId ? (
          <div className="empty-state">
            <div className="empty-state-orb">📖</div>
            <h2>Start learning smarter</h2>
            <p>Upload any PDF — lecture notes, research papers, textbooks — and chat with it instantly.</p>
            <button className="upload-btn-main" onClick={() => fileInputRef.current.click()}>
              Upload your first PDF →
            </button>
          </div>
        ) : (
          <>
            <div className="topbar">
              <div className="topbar-left">
                <div className="topbar-doc-icon">📄</div>
                <div>
                  <div className="topbar-title">{activeDoc?.filename}</div>
                  <div className="topbar-subtitle">{messages.length} messages</div>
                </div>
              </div>
              <div className="topbar-actions">
                <button
                  className="pdf-btn"
                  onClick={handleExportPDF}
                  disabled={messages.length === 0}
                >
                  ⬇ Export PDF
                </button>
              </div>
            </div>

            <div className="messages">
              {messages.map((msg, i) => (
                <div key={i} className={`message-row ${msg.role}`}>
                  <div className={`avatar ${msg.role}`}>
                    {msg.role === "user" ? "👤" : "🤖"}
                  </div>
                  <div className="message-content">
                    <div className="bubble">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="source-chips">
                        {msg.sources.map((s, j) => (
                          <span key={j} className="source-chip">📎 Source {j + 1}</span>
                        ))}
                      </div>
                    )}
                    <div className="timestamp">{formatTime(msg.time)}</div>
                  </div>
                </div>
              ))}

              {streamingText && (
                <div className="message-row assistant">
                  <div className="avatar assistant">🤖</div>
                  <div className="message-content">
                    <div className="bubble">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {streamingText}
                      </ReactMarkdown>
                      <span className="cursor">▋</span>
                    </div>
                    {streamingSources.length > 0 && (
                      <div className="source-chips">
                        {streamingSources.map((s, j) => (
                          <span key={j} className="source-chip">📎 Source {j + 1}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {loading && !streamingText && (
                <div className="message-row assistant">
                  <div className="avatar assistant">🤖</div>
                  <div className="message-content">
                    <div className="bubble">
                      <div className="thinking-dots">
                        <span /><span /><span />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {loadingSuggestions && (
              <div className="suggestions-bar">
                <span style={{ color: "#444", fontSize: "0.82rem", fontStyle: "italic" }}>
                  Generating suggestions...
                </span>
              </div>
            )}
            {!loadingSuggestions && suggestions.length > 0 && (
              <div className="suggestions-bar">
                <div className="suggestions-label">Suggested questions</div>
                {suggestions.map((q, i) => (
                  <button key={i} className="chip" onClick={() => handleChat(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}

            <div className="input-area">
              <div className="input-row">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  placeholder="Ask anything about your document..."
                  value={input}
                  onChange={handleTextareaChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleChat();
                    }
                  }}
                />
                <button
                  className="send-btn"
                  onClick={() => handleChat()}
                  disabled={loading || !input.trim()}
                >
                  ➤
                </button>
              </div>
              <div className="input-hint">Enter to send · Shift+Enter for new line</div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}