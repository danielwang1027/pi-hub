import { useState, useEffect } from "react";

const MOLOCO_BLUE   = "#1249E9";
const MOLOCO_NAVY   = "#0A2E8A";
const MOLOCO_ORANGE = "#FF6B2B";
const WEBHOOK_URL   = "https://moloco.app.n8n.cloud/webhook/pi-hub-data";
const RESOURCES_URL = "https://moloco.app.n8n.cloud/webhook/pi-hub-resources";

const PI_LIST = ["All","X","Kakao","Naver","Samsung","Xiaomi","Pinterest","Yahoo","LINE","Other"];

const CATEGORY_STYLE = {
  "Policy Update":        { bg:"#F3F0FF", text:"#6230C8", border:"#D5C8FF" },
  "Creative Spec Update": { bg:"#EEF3FF", text:"#1B4FD8", border:"#BFD0FF" },
  "Issue / Incident":     { bg:"#FFF1EE", text:"#C84B11", border:"#FFD0C0" },
  "Process / How-to":     { bg:"#EDFAF4", text:"#0F7A45", border:"#B5E8CC" },
  "General Inquiry":      { bg:"#F5F5F5", text:"#666",    border:"#DDD"    },
  "New Inventory":        { bg:"#FFFBEB", text:"#B45309", border:"#FDE68A" },
};

const PI_COLOR = {
  "X":"#000000","Kakao":"#F9E000","Naver":"#03C75A","Samsung":"#1428A0",
  "Xiaomi":"#FF6900","Pinterest":"#E60023","Yahoo":"#6001D2","LINE":"#06C755","Other":"#888888",
};

async function fetchNotionData() {
  const res = await fetch(WEBHOOK_URL);
  if (!res.ok) throw new Error("Webhook error: " + res.status);
  const data = await res.json();
  if (!data.results) throw new Error(data.message || "No results from Notion");
  const results = [];
  for (const page of data.results) {
    const p = page.properties;
    const title       = p["Title"]?.title?.[0]?.plain_text || "";
    const summary     = p["Summary"]?.rich_text?.[0]?.plain_text || "";
    const source      = p["Source"]?.select?.name || "Slack";
    const url         = p["Original URL"]?.url || "#";
    const publishedAt = p["Published At"]?.date?.start?.slice(0,10) || "";
    const category    = p["category"]?.select?.name || "General Inquiry";
    const platforms   = (p["PI Platform"]?.multi_select || []).map(x => x.name);
    const featured    = p["Featured"]?.checkbox || false;
    if (title) results.push({ id:page.id, title, summary, source, url, publishedAt, category, featured, platforms: platforms.length ? platforms : ["Other"] });
  }
  return results;
}

async function fetchResources() {
  const res = await fetch(RESOURCES_URL);
  if (!res.ok) return {};
  const data = await res.json();
  if (!data.results) return {};
  const links = {};
  for (const page of data.results) {
    const p = page.properties;
    const platform = p["Platform"]?.select?.name || "";
    const title    = p["Title"]?.title?.[0]?.plain_text || "";
    const url      = p["URL"]?.url || "#";
    if (!platform || !title) continue;
    if (!links[platform]) links[platform] = [];
    links[platform].push({ label: title, url });
  }
  return links;
}

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { margin: 0; padding: 0; }
  button, select, input { font-family: 'Montserrat', sans-serif; }
  @keyframes pulseRing { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.5;transform:scale(1.8)} }
  @keyframes fadeSlide { from{opacity:0;transform:translateY(-6px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideOut  { 0%{transform:translateY(0);opacity:1} 100%{transform:translateY(-100%);opacity:0} }
  @keyframes slideIn   { 0%{transform:translateY(100%);opacity:0} 100%{transform:translateY(0);opacity:1} }
  @keyframes slideUp   { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
  @keyframes spin      { to{transform:rotate(360deg)} }
  .ticker-out{animation:slideOut .4s ease forwards}
  .ticker-in{animation:slideIn .4s ease forwards}
  .card{transition:box-shadow .2s ease,transform .15s ease}
  .card:hover{transform:translateY(-2px)}
  .expand-body{animation:fadeSlide .2s ease}
  .tab-pill{transition:background .2s,color .2s,box-shadow .2s}
  .drawer{animation:slideUp .25s ease forwards}
  .spinner{width:28px;height:28px;border:3px solid #E8EDF5;border-top-color:#1249E9;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 12px}
`;

export default function App() {
  const [data,        setData]        = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [selPI,       setSelPI]       = useState("All");
  const [selCat,      setSelCat]      = useState("All");
  const [expanded,    setExpanded]    = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [tickerIdx,   setTickerIdx]   = useState(0);
  const [tickerPhase, setTickerPhase] = useState("idle");
  const [quickLinks,  setQuickLinks]  = useState({});
  const [submitOpen,  setSubmitOpen]  = useState(false);
  const [submitForm,  setSubmitForm]  = useState({ title:"", summary:"", platforms:[], category:"", author:"", url:"" });
  const [submitting,  setSubmitting]  = useState(false);
  const [submitDone,  setSubmitDone]  = useState(false);

  useEffect(() => {
    fetchNotionData()
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  useEffect(() => {
    fetchResources().then(d => setQuickLinks(d)).catch(() => {});
  }, []);

  useEffect(() => { setDrawerOpen(false); }, [selPI]);

  const HOT = data.filter(d => d.featured).slice(0, 5);

  useEffect(() => {
    if (HOT.length === 0) return;
    let t;
    if (tickerPhase === "idle")     t = setTimeout(() => setTickerPhase("out"), 3000);
    else if (tickerPhase === "out") t = setTimeout(() => { setTickerIdx(i => (i+1)%HOT.length); setTickerPhase("idle"); }, 400);
    return () => clearTimeout(t);
  }, [tickerPhase, tickerIdx, HOT.length]);

  const scrollToCard = (id) => {
    setSelPI("All"); setSelCat("All"); setSearchQuery("");
    setTimeout(() => {
      const el = document.getElementById("card-"+id);
      if (el) { el.scrollIntoView({ behavior:"smooth", block:"center" }); setExpanded(id); }
    }, 50);
  };

  const filtered = data.filter(d => {
    const q = searchQuery.toLowerCase();
    const matchSearch = !q || d.title.toLowerCase().includes(q) || d.summary.toLowerCase().includes(q) || d.platforms.some(p => p.toLowerCase().includes(q));
    return (selPI === "All" || d.platforms.includes(selPI)) && (selCat === "All" || d.category === selCat) && matchSearch;
  });

  const grouped = filtered.reduce((acc, item) => {
    const date = item.publishedAt.slice(0,10);
    (acc[date] = acc[date] || []).push(item);
    return acc;
  }, {});

  const drawerEntries = selPI === "All"
    ? Object.entries(quickLinks)
    : Object.entries(quickLinks).filter(([pi]) => pi === selPI);
  const showResources = drawerEntries.length > 0;

  return (
    <div style={{ minHeight:"100vh", background:"#F7F9FC", fontFamily:"'Montserrat', sans-serif", paddingBottom: showResources ? 72 : 0 }}>
      <style>{css}</style>

      {/* Header */}
      <div style={{ background:"linear-gradient(120deg, #1a56f0 0%, "+MOLOCO_BLUE+" 40%, "+MOLOCO_NAVY+" 100%)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"32px 32px", display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div>
            <div style={{ color:"#fff", fontWeight:700, fontSize:36, letterSpacing:.3 }}>PI Intelligence Hub</div>
            <div style={{ color:"rgba(255,255,255,0.6)", fontSize:18, marginTop:5 }}>All PI discussions, one place.</div>
          </div>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ position:"relative", width:8, height:8 }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#22C55E", position:"absolute" }} />
              <div style={{ width:8, height:8, borderRadius:"50%", background:"#22C55E", position:"absolute", animation:"pulseRing 2s ease infinite" }} />
            </div>
            <span style={{ color:"rgba(255,255,255,0.5)", fontSize:11 }}>Live Sync</span>
          </div>
        </div>
      </div>

      {/* Submit Modal */}
      {submitOpen && (
        <div onClick={() => setSubmitOpen(false)}
          style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.45)", zIndex:100, display:"flex", alignItems:"center", justifyContent:"center", padding:24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background:"#fff", borderRadius:16, width:"100%", maxWidth:520, padding:28, boxShadow:"0 20px 60px rgba(0,0,0,0.2)", fontFamily:"'Montserrat', sans-serif" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20 }}>
              <div style={{ fontWeight:800, fontSize:18, color:"#0F1729" }}>Submit a PI Update</div>
              <button onClick={() => setSubmitOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:18, color:"#9AA5B8" }}>✕</button>
            </div>
            {submitDone ? (
              <div style={{ textAlign:"center", padding:"32px 0" }}>
                <div style={{ fontSize:40, marginBottom:12 }}>✅</div>
                <div style={{ fontWeight:700, fontSize:16, color:"#0F1729", marginBottom:6 }}>Submitted!</div>
                <div style={{ fontSize:13, color:"#9AA5B8" }}>Your update has been published.</div>
                <button onClick={() => setSubmitOpen(false)}
                  style={{ marginTop:20, padding:"10px 24px", borderRadius:999, background:MOLOCO_BLUE, border:"none", cursor:"pointer", color:"#fff", fontSize:13, fontWeight:600, fontFamily:"'Montserrat', sans-serif" }}>
                  Close
                </button>
              </div>
            ) : (
              <div style={{ display:"flex", flexDirection:"column", gap:14 }}>
                {/* PI Platform */}
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#4A5568", marginBottom:6 }}>PI Platform <span style={{ color:"#E53E3E" }}>*</span></div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {["X","Kakao","Naver","Samsung","Xiaomi","Pinterest","Yahoo","LINE","Other"].map(pi => {
                      const active = submitForm.platforms.includes(pi);
                      const color = PI_COLOR[pi] || "#888";
                      return (
                        <button key={pi} onClick={() => setSubmitForm(f => ({ ...f, platforms: active ? f.platforms.filter(p => p !== pi) : [...f.platforms, pi] }))}
                          style={{ padding:"4px 12px", borderRadius:999, fontSize:12, fontWeight:600, cursor:"pointer", border:`1.5px solid ${active ? color : "#DDE4F0"}`, background: active ? color : "#fff", color: active ? (pi==="Kakao"?"#333":"#fff") : "#555", fontFamily:"'Montserrat', sans-serif" }}>
                          {pi}
                        </button>
                      );
                    })}
                  </div>
                </div>
                {/* Category */}
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#4A5568", marginBottom:6 }}>Category <span style={{ color:"#E53E3E" }}>*</span></div>
                  <select value={submitForm.category} onChange={e => setSubmitForm(f => ({ ...f, category: e.target.value }))}
                    style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1.5px solid #DDE4F0", fontSize:13, color:"#0F1729", outline:"none", fontFamily:"'Montserrat', sans-serif" }}>
                    <option value="">Select a category...</option>
                    {Object.keys(CATEGORY_STYLE).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                {/* Title */}
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#4A5568", marginBottom:6 }}>Title <span style={{ color:"#E53E3E" }}>*</span></div>
                  <input type="text" placeholder="Brief title of the update..." value={submitForm.title} onChange={e => setSubmitForm(f => ({ ...f, title: e.target.value }))}
                    style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1.5px solid #DDE4F0", fontSize:13, color:"#0F1729", outline:"none", fontFamily:"'Montserrat', sans-serif" }} />
                </div>
                {/* Summary */}
                <div>
                  <div style={{ fontSize:12, fontWeight:600, color:"#4A5568", marginBottom:6 }}>Summary <span style={{ color:"#E53E3E" }}>*</span></div>
                  <textarea placeholder="Describe the update in detail..." value={submitForm.summary} onChange={e => setSubmitForm(f => ({ ...f, summary: e.target.value }))}
                    rows={4} style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1.5px solid #DDE4F0", fontSize:13, color:"#0F1729", outline:"none", resize:"vertical", fontFamily:"'Montserrat', sans-serif" }} />
                </div>
                {/* Author + URL */}
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:"#4A5568", marginBottom:6 }}>Your Name <span style={{ color:"#9AA5B8", fontWeight:400 }}>(optional)</span></div>
                    <input type="text" placeholder="Anonymous" value={submitForm.author} onChange={e => setSubmitForm(f => ({ ...f, author: e.target.value }))}
                      style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1.5px solid #DDE4F0", fontSize:13, color:"#0F1729", outline:"none", fontFamily:"'Montserrat', sans-serif" }} />
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:"#4A5568", marginBottom:6 }}>Source URL <span style={{ color:"#9AA5B8", fontWeight:400 }}>(optional)</span></div>
                    <input type="text" placeholder="https://..." value={submitForm.url} onChange={e => setSubmitForm(f => ({ ...f, url: e.target.value }))}
                      style={{ width:"100%", padding:"9px 12px", borderRadius:8, border:"1.5px solid #DDE4F0", fontSize:13, color:"#0F1729", outline:"none", fontFamily:"'Montserrat', sans-serif" }} />
                  </div>
                </div>
                {/* Submit Button */}
                <button
                  disabled={submitting || !submitForm.title || !submitForm.summary || !submitForm.category || submitForm.platforms.length === 0}
                  onClick={async () => {
                    setSubmitting(true);
                    try {
                      await fetch("https://moloco.app.n8n.cloud/webhook/pi-hub-submit", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          title: submitForm.title,
                          summary: submitForm.summary,
                          platforms: submitForm.platforms,
                          category: submitForm.category,
                          author: submitForm.author || "Community",
                          url: submitForm.url || null
                        })
                      });
                      setSubmitDone(true);
                    } catch(e) {}
                    setSubmitting(false);
                  }}
                  style={{ marginTop:4, padding:"12px", borderRadius:10, background: (!submitForm.title || !submitForm.summary || !submitForm.category || submitForm.platforms.length === 0) ? "#DDE4F0" : MOLOCO_BLUE, border:"none", cursor: (!submitForm.title || !submitForm.summary || !submitForm.category || submitForm.platforms.length === 0) ? "not-allowed" : "pointer", color: (!submitForm.title || !submitForm.summary || !submitForm.category || submitForm.platforms.length === 0) ? "#9AA5B8" : "#fff", fontSize:14, fontWeight:700, fontFamily:"'Montserrat', sans-serif" }}>
                  {submitting ? "Submitting..." : "Submit Update"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Ticker */}
      {HOT.length > 0 && (
        <div style={{ background:MOLOCO_NAVY, padding:"0 24px" }}>
          <div style={{ maxWidth:1100, margin:"0 auto", display:"flex", alignItems:"stretch", height:30 }}>
            <div style={{ display:"flex", alignItems:"center", gap:6, paddingRight:14, borderRight:"1px solid rgba(255,255,255,0.15)", flexShrink:0 }}>
              <div style={{ width:5, height:5, borderRadius:"50%", background:MOLOCO_ORANGE }} />
              <span style={{ fontSize:10, fontWeight:700, color:MOLOCO_ORANGE, letterSpacing:1.2, textTransform:"uppercase" }}>Featured</span>
            </div>
            <div style={{ flex:1, overflow:"hidden", paddingLeft:14, position:"relative" }}>
              {(() => {
                const t = HOT[tickerIdx];
                if (!t) return null;
                const pc = PI_COLOR[t.platforms[0]] || "#888";
                return (
                  <div key={tickerIdx} className={tickerPhase === "out" ? "ticker-out" : "ticker-in"}
                    onClick={() => scrollToCard(t.id)}
                    style={{ height:30, display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
                    <span style={{ fontSize:10, fontWeight:700, padding:"1px 6px", borderRadius:4, flexShrink:0, background: pc==="F9E000" ? pc : pc+"22", color: pc==="#F9E000"?"#333":(pc==="#000000"?"#555":pc), border:"1px solid "+pc+"55" }}>{t.platforms[0]}</span>
                    <span style={{ fontSize:12, color:"#fff", fontWeight:500, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{t.title}</span>
                    <span style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginLeft:4, flexShrink:0 }}>→</span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Sticky Filter Bar */}
      <div style={{ position:"sticky", top:0, zIndex:40, background:"#F7F9FC", borderBottom:"1px solid #E8EDF5", boxShadow:"0 2px 8px rgba(0,0,0,0.06)" }}>
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"12px 32px" }}>
          {/* PI Tabs */}
          <div style={{ display:"flex", flexWrap:"wrap", gap:8, marginBottom:10 }}>
          {PI_LIST.map(pi => {
            const active = selPI === pi;
            const color  = pi === "All" ? MOLOCO_BLUE : (PI_COLOR[pi] || "#888");
            return (
              <button key={pi} className="tab-pill" onClick={() => setSelPI(pi)}
                style={{ padding:"6px 16px", borderRadius:999, fontSize:13, fontWeight:600, cursor:"pointer", border:"none",
                  background: active ? color : "#fff",
                  color:      active ? (pi==="Kakao"?"#333":"#fff") : "#555",
                  boxShadow:  active ? "0 2px 12px "+color+"55" : "0 1px 4px rgba(0,0,0,0.08)" }}>
                {pi}
              </button>
            );
          })}
        </div>

          {/* Search */}
          <div style={{ position:"relative", marginBottom:10 }}>
            <span style={{ position:"absolute", left:14, top:"50%", transform:"translateY(-50%)", fontSize:14, color:"#9AA5B8", pointerEvents:"none" }}>🔍</span>
            <input type="text" placeholder="Search by title, summary or platform..."
              value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width:"100%", padding:"9px 14px 9px 38px", borderRadius:10, border:"1.5px solid #DDE4F0", background:"#fff", fontSize:13, fontFamily:"'Montserrat', sans-serif", color:"#0F1729", outline:"none" }} />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")}
                style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", fontSize:14, color:"#9AA5B8" }}>✕</button>
            )}
          </div>

          {/* Category + Submit + Count */}
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <select value={selCat} onChange={e => setSelCat(e.target.value)}
              style={{ fontSize:13, padding:"6px 12px", borderRadius:8, border:"1.5px solid #DDE4F0", background:"#fff", color:"#333", outline:"none", cursor:"pointer", fontFamily:"'Montserrat', sans-serif" }}>
              <option value="All">All Categories</option>
              {Object.keys(CATEGORY_STYLE).map(c => <option key={c}>{c}</option>)}
            </select>
            <button onClick={() => { setSubmitOpen(true); setSubmitDone(false); setSubmitForm({ title:"", summary:"", platforms:[], category:"", author:"", url:"" }); }}
              style={{ display:"flex", alignItems:"center", gap:6, padding:"7px 14px", borderRadius:8, background:"#fff", border:"1.5px solid "+MOLOCO_BLUE, cursor:"pointer", color:MOLOCO_BLUE, fontSize:12, fontWeight:700, fontFamily:"'Montserrat', sans-serif" }}>
              💡 Share your thoughts!
            </button>
            <div style={{ marginLeft:"auto", background:MOLOCO_BLUE+"12", border:"1.5px solid "+MOLOCO_BLUE+"30", borderRadius:8, padding:"5px 14px", fontSize:12, color:MOLOCO_BLUE, fontWeight:600 }}>
              {filtered.length} items
            </div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"28px 32px" }}>

        {/* Loading / Error / Content */}
        {loading && (
          <div style={{ textAlign:"center", padding:"60px 0" }}>
            <div className="spinner" />
            <div style={{ color:"#9AA5B8", fontSize:14 }}>Loading latest PI updates...</div>
          </div>
        )}
        {error && (
          <div style={{ textAlign:"center", padding:"60px 0" }}>
            <div style={{ fontSize:32, marginBottom:12 }}>⚠️</div>
            <div style={{ color:"#C84B11", fontSize:13, fontWeight:600, marginBottom:6 }}>Failed to load data</div>
            <div style={{ color:"#9AA5B8", fontSize:12, maxWidth:320, margin:"0 auto" }}>{error}</div>
          </div>
        )}

        {!loading && !error && (
          <div style={{ display:"flex", flexDirection:"column", gap:28 }}>
            {Object.keys(grouped).sort((a,b) => b.localeCompare(a)).map(date => (
              <div key={date}>
                <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:12 }}>
                  <div style={{ background:"#D1D9E6", color:"#4A5568", fontSize:10, fontWeight:700, letterSpacing:1.2, padding:"3px 10px", borderRadius:5, textTransform:"uppercase" }}>{date}</div>
                  <div style={{ flex:1, height:1, background:"#D1D9E6" }} />
                </div>
                <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
                  {grouped[date].map(item => {
                    const cs   = CATEGORY_STYLE[item.category] || CATEGORY_STYLE["General Inquiry"];
                    const pc   = PI_COLOR[item.platforms[0]] || "#888";
                    const open = expanded === item.id;
                    return (
                      <div key={item.id} id={"card-"+item.id} className="card"
                        onClick={() => setExpanded(open ? null : item.id)}
                        style={{ background:"#fff", borderRadius:14, cursor:"pointer",
                          border: open ? "2px solid "+MOLOCO_BLUE : "2px solid #E8EDF5",
                          boxShadow: open ? "0 4px 20px "+MOLOCO_BLUE+"18" : "0 1px 6px rgba(0,0,0,0.06)",
                          overflow:"hidden" }}>
                        <div style={{ display:"flex" }}>
                          <div style={{ width:4, flexShrink:0, background:pc, borderRadius:"14px 0 0 14px" }} />
                          <div style={{ flex:1, padding:"14px 16px 14px 14px" }}>
                            <div style={{ display:"flex", alignItems:"flex-start", gap:12 }}>
                              <div style={{ width:36, height:36, borderRadius:10, flexShrink:0, background:pc, display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:13, color: pc==="#F9E000"||pc==="#888888"?"#333":"#fff", boxShadow:"0 2px 8px "+pc+"55", marginTop:2 }}>
                                {item.platforms[0]?.[0] || "?"}
                              </div>
                              <div style={{ flex:1 }}>
                                <div style={{ display:"flex", alignItems:"center", flexWrap:"wrap", gap:4, marginBottom:4 }}>
                                  {item.platforms.map(p => (
                                    <span key={p} style={{ fontSize:9, fontWeight:600, color: PI_COLOR[p]==="#F9E000"?"#B8960C":(PI_COLOR[p]||"#888"), textTransform:"uppercase", letterSpacing:.5 }}>{p}</span>
                                  ))}
                                  <span style={{ color:"#D1D9E6", fontSize:9 }}>·</span>
                                  <span style={{ fontSize:9, fontWeight:500, padding:"1px 6px", borderRadius:999, background:cs.bg, color:cs.text, border:"1px solid "+cs.border }}>{item.category}</span>
                                  {item.featured && <span style={{ fontSize:9, fontWeight:700, padding:"1px 6px", borderRadius:999, background:"#FFF7ED", color:MOLOCO_ORANGE, border:"1px solid #FFD6B8" }}>⭐ Featured</span>}
                                </div>
                                <div style={{ fontWeight:500, fontSize:15, color:"#0F1729", lineHeight:1.4, marginTop:2 }}>{item.title}</div>
                                <div style={{ marginTop:7, display:"flex", alignItems:"center", gap:8 }}>
                                  <span style={{ fontSize:11, color:"#6B7A99", background:"#F2F5FA", border:"1px solid #E0E7F0", borderRadius:6, padding:"2px 8px" }}>{item.source}</span>
                                  <span style={{ fontSize:11, color:"#9AA5B8" }}>{item.publishedAt}</span>
                                </div>
                              </div>
                              <div style={{ color:"#BCC6D9", fontSize:11, flexShrink:0 }}>{open?"▲":"▼"}</div>
                            </div>
                                                            {open && (
                              <div className="expand-body" style={{ marginTop:12, paddingTop:12, borderTop:"1px solid #EEF2FA", marginLeft:48 }}>
                                <p style={{ fontSize:13, color:"#3D4F70", lineHeight:1.7, margin:0 }}>{item.summary}</p>
                                {item.url && item.url !== "#" && (
                                  <a href={item.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                    style={{ display:"inline-block", marginTop:10, fontSize:12, color:MOLOCO_BLUE, fontWeight:600, textDecoration:"none" }}>
                                    View source →
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <div style={{ textAlign:"center", padding:"60px 0", color:"#AAB4C8", fontSize:14 }}>No results found</div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Resources Bar */}
      {showResources && (
        <div style={{ position:"fixed", bottom:0, left:0, right:0, zIndex:50, fontFamily:"'Montserrat', sans-serif" }}>
          {drawerOpen && (
            <div className="drawer" style={{ background:"#fff", borderTop:"1px solid #E8EDF5", boxShadow:"0 -4px 24px rgba(0,0,0,0.10)" }}>
              <div style={{ maxWidth:1100, margin:"0 auto", padding:"16px 32px 20px" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ width:6, height:6, borderRadius:"50%", background:MOLOCO_BLUE }} />
                    <span style={{ fontSize:13, fontWeight:700, color:"#0F1729" }}>{selPI==="All"?"All PI Resource Links":selPI+" Resource Links"}</span>
                    <span style={{ fontSize:11, color:"#9AA5B8" }}>Specs, portals & guides</span>
                  </div>
                  <button onClick={() => setDrawerOpen(false)} style={{ background:"none", border:"none", cursor:"pointer", fontSize:15, color:"#9AA5B8" }}>✕</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(220px, 1fr))", gap:12 }}>
                  {[...drawerEntries].sort(([a], [b]) => {
                    if (a === "All") return -1;
                    if (b === "All") return 1;
                    return 0;
                  }).map(([pi, links]) => {
                    const pc = PI_COLOR[pi] || "#888";
                    const tc = pc==="#F9E000"?"#B8960C":pc;
                    return (
                      <div key={pi} style={{ background:"#F7F9FC", borderRadius:8, padding:"10px 12px", border:"1px solid #E8EDF5" }}>
                        <div style={{ fontSize:11, fontWeight:800, color:tc, marginBottom:6, letterSpacing:.3 }}>{pi}</div>
                        {links.map(l => (
                          <a key={l.label} href={l.url} target="_blank" rel="noreferrer"
                            style={{ display:"block", fontSize:10, color:"#4A5568", textDecoration:"none", padding:"3px 0", lineHeight:1.4 }}>
                            → {l.label}
                          </a>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <div style={{ background: drawerOpen?"#fff":"transparent", borderTop: drawerOpen?"1px solid #E8EDF5":"none", display:"flex", justifyContent:"flex-end", padding:"10px 24px" }}>
            <button onClick={() => setDrawerOpen(o => !o)}
              style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 18px", borderRadius:999, background:MOLOCO_BLUE, border:"none", cursor:"pointer", boxShadow:"0 4px 16px rgba(18,73,233,0.35)", fontFamily:"'Montserrat', sans-serif" }}>
              <span style={{ fontSize:13 }}>🔗</span>
              <span style={{ fontSize:12, fontWeight:700, color:"#fff", letterSpacing:.3 }}>{selPI==="All"?"PI Resources":selPI+" Resources"}</span>
              <span style={{ fontSize:10, color:"rgba(255,255,255,0.7)", display:"inline-block", transform: drawerOpen?"rotate(180deg)":"rotate(0deg)", transition:"transform .2s" }}>▲</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
