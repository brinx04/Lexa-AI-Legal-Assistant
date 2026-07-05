"use client";

import { useState, useEffect, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";
import { uploadDocument, getDocuments, deleteDocument, chatWithDocument, getDocumentDetails } from "@/lib/api";

export default function LexaDashboard() {
  const { data: session, status } = useSession();
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [docDetails, setDocDetails] = useState<any | null>(null);
  const [chatHistory, setChatHistory] = useState<{ role: string; text: string }[]>([]);
  const [question, setQuestion] = useState("");
  const [pastedText, setPastedText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isChatting, setIsChatting] = useState(false);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [expandedFlag, setExpandedFlag] = useState<number | null>(null);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch documents on load & auto-poll
  useEffect(() => {
    fetchDocs();
    const interval = setInterval(() => {
      fetchDocs();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const fetchDocs = async () => {
    try {
      const docs = await getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error("Failed to load documents", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setIsUploading(true);
    try {
      await uploadDocument(e.target.files[0]);
      await fetchDocs();
    } catch (error) {
      alert("Upload failed. Check your API key.");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handlePasteText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pastedText.trim()) return;

    setIsUploading(true);
    try {
      const blob = new Blob([pastedText], { type: "text/plain" });
      const file = new File([blob], `Pasted_Document_${new Date().getTime()}.txt`, { type: "text/plain" });
      
      await uploadDocument(file);
      await fetchDocs();
      setPastedText(""); 
    } catch (error) {
      console.error("Upload failed", error);
      alert("Failed to analyze pasted text. Check your API key.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async (docId: string) => {
    try {
      await deleteDocument(docId);
      if (selectedDoc?.document_id === docId) {
        setSelectedDoc(null);
        setDocDetails(null);
        setChatHistory([]);
      }
      await fetchDocs();
    } catch (error) {
      console.error("Delete failed", error);
    }
  };

  const handleSelectDoc = async (doc: any) => {
    setSelectedDoc(doc);
    setChatHistory([]);
    setDocDetails(null);
    
    if (doc.status === "COMPLETED") {
      setIsLoadingDetails(true);
      try {
        const details = await getDocumentDetails(doc.document_id);
        setDocDetails(details);
      } catch (error) {
        console.error("Failed to fetch document details", error);
      } finally {
        setIsLoadingDetails(false);
      }
    }
  };

  const handleChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !selectedDoc) return;

    const userMessage = question;
    setQuestion("");
    setChatHistory((prev) => [...prev, { role: "user", text: userMessage }]);
    setIsChatting(true);

    try {
      const response = await chatWithDocument(selectedDoc.document_id, userMessage);
      setChatHistory((prev) => [...prev, { role: "ai", text: response.answer }]);
    } catch (error) {
      setChatHistory((prev) => [...prev, { role: "ai", text: "Error: Could not connect to AI engine." }]);
    } finally {
      setIsChatting(false);
    }
  };

  // ── Auth: Loading state ──────────────────────────────────────────────────
  if (status === "loading") {
    return (
      <div className="flex h-screen bg-gray-950 items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Verifying your identity...</p>
        </div>
      </div>
    );
  }

  // ── Auth: Gate — redirect unauthenticated users to sign-in ───────────────
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl" />
        </div>
        <div className="relative w-full max-w-md">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 shadow-2xl text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl mb-4">
              <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white tracking-wider mb-1">LEXA AI</h1>
            <p className="text-gray-400 text-sm mb-8">Your Private Legal Intelligence Engine</p>
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-100 text-gray-900 font-semibold py-3 px-4 rounded-xl transition-all duration-200 shadow-lg"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
            <p className="text-xs text-gray-600 mt-4">Your documents are private and isolated to your account.</p>
          </div>
        </div>
      </div>
    );
  }

  // ── Authenticated: Render the full dashboard ──────────────────────────────
  return (
    <div className="flex h-screen bg-gray-950 text-white font-sans overflow-hidden">
      
      {/* SIDEBAR: Document Management */}
      <div className="w-1/4 max-w-xs bg-gray-900 border-r border-gray-800 flex flex-col z-10 shadow-xl">
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold tracking-wider text-emerald-400">LEXA AI</h1>
              <p className="text-xs text-gray-500 mt-0.5">Smart Legal Engine</p>
            </div>
            {/* User avatar + sign out */}
            <div className="flex items-center gap-2">
              {session?.user?.image ? (
                <img src={session.user.image} alt="avatar" className="w-8 h-8 rounded-full border border-gray-700" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
                  {session?.user?.email?.[0]?.toUpperCase() ?? "U"}
                </div>
              )}
              <button
                onClick={() => signOut()}
                title="Sign out"
                className="text-gray-600 hover:text-red-400 transition-colors text-xs"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div className="p-4">
          <label className="flex items-center justify-center w-full p-4 border-2 border-dashed border-gray-700 rounded-lg cursor-pointer hover:border-emerald-500 hover:bg-gray-800 transition-all">
            <span className="text-sm font-medium text-gray-300 text-center">
              {isUploading ? "Processing..." : "+ Upload PDF"}
            </span>
            <input type="file" accept=".pdf, .docx, .txt" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
          </label>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {documents.map((doc) => (
            <div 
              key={doc.document_id} 
              className={`p-3 rounded-lg border cursor-pointer transition-all flex justify-between items-center group ${selectedDoc?.document_id === doc.document_id ? "bg-gray-800 border-emerald-500" : "bg-gray-950 border-gray-800 hover:border-gray-600"}`}
              onClick={() => handleSelectDoc(doc)}
            >
              <div className="overflow-hidden">
                <p className="text-sm font-medium truncate">{doc.filename}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Status: <span className={doc.status === "COMPLETED" ? "text-emerald-400" : doc.status === "FAILED" ? "text-red-500" : "text-yellow-500"}>{doc.status}</span>
                </p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDelete(doc.document_id); }}
                className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                title="Delete Document"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col relative bg-gray-950">
        {selectedDoc ? (
          <>
            {/* Header */}
            <div className="p-4 border-b border-gray-800 bg-gray-900 shadow-sm shrink-0 flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-200">Analyzing: {selectedDoc.filename}</h2>
              {selectedDoc.status !== "COMPLETED" && (
                <span className="text-xs bg-yellow-500/20 text-yellow-500 px-3 py-1 rounded-full border border-yellow-500/30 animate-pulse">
                  AI processing in background...
                </span>
              )}
            </div>

            {/* Split Screen Container */}
            <div className="flex-1 flex overflow-hidden">
              
              {/* LEFT PANE: AI Insights */}
              <div className="w-1/2 border-r border-gray-800 bg-gray-900/50 overflow-y-auto p-6 flex flex-col gap-6 custom-scrollbar">
                <div className="flex justify-between items-center shrink-0">
                  <h3 className="text-sm font-bold tracking-widest text-gray-500 uppercase">Proactive AI Audit</h3>
                  
                  {/* Dynamic Health Score Badge */}
                  {docDetails && (
                    <div className="flex items-center gap-2 bg-gray-950 px-3 py-1.5 rounded-lg border border-gray-800">
                      <span className="text-xs text-gray-400 font-medium">Health Score:</span>
                      <span className={`text-sm font-bold ${
                        (docDetails.red_flags?.length || 0) === 0 ? "text-emerald-400" :
                        (docDetails.red_flags?.length || 0) <= 2 ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {Math.max(100 - (docDetails.red_flags?.length || 0) * 15, 30)}%
                      </span>
                    </div>
                  )}
                </div>
                
                {isLoadingDetails ? (
                  <div className="text-gray-400 animate-pulse text-sm flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                    Reviewing compliance structures...
                  </div>
                ) : docDetails ? (
                  <>
                    {/* Summary Card */}
                    {docDetails.summary && (
                      <div className="bg-gray-800/40 border border-gray-800 rounded-xl p-5 shadow-inner">
                        <h4 className="text-emerald-400 font-medium mb-2 flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>
                          Document Executive Summary
                        </h4>
                        <p className="text-xs text-gray-300 leading-relaxed">{docDetails.summary}</p>
                      </div>
                    )}

                    {/* Red Flags Accordion Group */}
                    {docDetails.red_flags && docDetails.red_flags.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-red-400 font-medium flex items-center gap-2 text-sm">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          Critical Anomalies Detected ({docDetails.red_flags.length})
                        </h4>
                        
                        {docDetails.red_flags.map((flag: any, idx: number) => {
                          const isExpanded = expandedFlag === idx;
                          return (
                            <div 
                              key={idx} 
                              className={`border rounded-xl transition-all overflow-hidden ${
                                isExpanded ? "bg-red-950/20 border-red-800/60 shadow-lg" : "bg-gray-800/20 border-gray-800 hover:border-red-900/40"
                              }`}
                            >
                              {/* Accordion Header */}
                              <button
                                onClick={() => setExpandedFlag(isExpanded ? null : idx)}
                                className="w-full p-4 flex justify-between items-center text-left focus:outline-none"
                              >
                                <div className="flex items-center gap-3">
                                  {/* Deterministic Severity Badge */}
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${
                                    flag.severity === "CRITICAL" ? "bg-red-600 text-white" :
                                    flag.severity === "HIGH" ? "bg-orange-500/20 text-orange-400 border border-orange-500/50" :
                                    "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                                  }`}>
                                    {flag.severity || "MODERATE"}
                                  </span>
                                  <span className="text-xs font-semibold text-red-200 tracking-wide">
                                    {flag.issue || "Unspecified Liability"}
                                  </span>
                                </div>
                                <span className="text-gray-500 text-xs transition-transform duration-200">
                                  {isExpanded ? "▼" : "▶"}
                                </span>
                              </button>

                              {/* Accordion Content */}
                              {isExpanded && (
                                <div className="px-4 pb-4 pt-1 border-t border-red-900/30 text-xs text-gray-300 space-y-3 animate-fadeIn">
                                  <div>
                                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider block mb-1">Analysis</span>
                                    <p className="leading-relaxed bg-black/10 p-2.5 rounded-lg border border-red-950/40">
                                      {flag.reasoning || flag.explanation || flag.description || "No contextual reasoning supplied by agent node."}
                                    </p>
                                  </div>
                                  {flag.clause_reference && (
                                    <div>
                                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1">Document Evidence</span>
                                      <p className="font-mono bg-gray-950/60 p-2 rounded border border-gray-800 text-[11px] text-gray-400">
                                        "{flag.clause_reference}"
                                      </p>
                                    </div>
                                  )}
                                  {flag.kanoon_citation && (
                                    <div className="mt-2 pt-2 border-t border-gray-800">
                                      <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-1">
                                        ⚖️ Verified Case Law
                                      </span>
                                      <a 
                                        href={flag.kanoon_url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="font-mono bg-blue-950/30 p-2 rounded border border-blue-900/50 text-[11px] text-blue-300 hover:bg-blue-900/50 transition-colors block truncate"
                                      >
                                        {flag.kanoon_citation.replace(/<[^>]+>/g, '')}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-gray-500 text-xs italic">Select a finalized asset mapping from the sidebar workspace.</div>
                )}
              </div>

              {/* RIGHT PANE: Interactive Chat */}
              <div className="w-1/2 flex flex-col bg-gray-950 relative">
                <div className="absolute inset-0 overflow-y-auto p-6 space-y-6 pb-32 custom-scrollbar">
                  {chatHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-600 opacity-50">
                      <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                      <p className="text-sm font-medium">Chat with this document</p>
                    </div>
                  ) : (
                    chatHistory.map((msg, idx) => (
                      <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] p-4 rounded-2xl shadow-sm text-sm ${msg.role === "user" ? "bg-emerald-600 text-white rounded-tr-none" : "bg-gray-800 text-gray-200 border border-gray-700 leading-relaxed rounded-tl-none"}`}>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                  {isChatting && (
                    <div className="flex justify-start">
                      <div className="max-w-[85%] p-4 rounded-2xl bg-gray-800 text-gray-400 border border-gray-700 rounded-tl-none text-sm flex items-center gap-3">
                        <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                        Searching clauses...
                      </div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Input Box - Pinned to bottom of right pane */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent">
                  <form onSubmit={handleChat} className="flex gap-3 bg-gray-900 p-2 rounded-xl border border-gray-800 shadow-2xl">
                    <input 
                      type="text" 
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder="Ask about this document..." 
                      className="flex-1 bg-transparent text-white px-3 py-2 text-sm focus:outline-none placeholder-gray-500"
                      disabled={isChatting || selectedDoc.status !== "COMPLETED"}
                    />
                    <button 
                      type="submit" 
                      disabled={isChatting || !question.trim() || selectedDoc.status !== "COMPLETED"}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Send
                    </button>
                  </form>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 w-full max-w-3xl mx-auto p-8">
            <svg className="w-16 h-16 mb-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <h2 className="text-xl font-medium text-gray-400 mb-6">Paste Legal Document</h2>
            <form onSubmit={handlePasteText} className="w-full flex flex-col gap-4">
              <textarea 
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste the full text of your contract, NDA, or agreement here..."
                className="w-full h-64 bg-gray-950 text-gray-300 p-4 rounded-xl border border-gray-800 focus:border-emerald-500 focus:outline-none custom-scrollbar resize-none"
              />
              <button 
                type="submit"
                disabled={isUploading || !pastedText.trim()}
                className="self-end bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isUploading ? "Analyzing..." : "Analyze Text"}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}