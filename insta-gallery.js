/**
 * insta-gallery
 * Instagram-style gallery using Lit + DDD + RandomFox API
 * - Loads images from https://randomfox.ca/floof/ (one fox per call)
 * - Lazy/conditional loading via IntersectionObserver (fetches per page)
 * - Like / Dislike stored in localStorage
 * - Share (Web Share API with clipboard fallback)
 * - Dark mode (system + toggle)
 * - Lightbox / slider for full images
 */
import { LitElement, html, css, nothing } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";

export class InstaGallery extends DDDSuper(LitElement) {
  static get tag() { return "insta-gallery"; }

  static get properties() {
    return {
      api: { type: String },                       // e.g., https://randomfox.ca/floof/
      pageSize: { type: Number, attribute: "page-size" },
      _visible: { state: true },                   // photos currently rendered
      _loading: { state: true },
      _likes: { state: true },                     // { [id]: 1|-1|0 }
      _theme: { state: true },                     // "light" | "dark"
      _lightboxIndex: { state: true },             // number | null
    };
  }

  static get styles() {
    return [super.styles, css`
      :host{ display:block; color:var(--ddd-foreground-100,#111827); }
      :host([theme="dark"]){ color:#f9fafb; background:transparent; }

      .toolbar{
        position:sticky; top:0; z-index:5;
        display:flex; gap:.75rem; align-items:center;
        padding:.6rem .8rem; margin:0 0 .75rem 0;
        border-radius:.75rem; border:1px solid var(--ddd-border-50,#e5e7eb);
        background:var(--ddd-card-background-color,rgba(255,255,255,.75));
        backdrop-filter:saturate(160%) blur(6px);
      }
      :host([theme="dark"]) .toolbar{
        background:rgba(17,24,39,.65); border-color:#374151;
      }
      .chip{
        border:1px solid var(--ddd-border-50,#e5e7eb);
        padding:.35rem .7rem; border-radius:999px;
        background:var(--ddd-card-background-color,#fff);
        font-weight:600;
      }
      :host([theme="dark"]) .chip{
        background:#111827; border-color:#374151; color:#f3f4f6;
      }
      .toolbar button{
        border:1px solid var(--ddd-border-50,#e5e7eb);
        border-radius:999px; padding:.45rem .8rem; cursor:pointer;
        background:var(--ddd-card-background-color,#fff); font:inherit;
      }
      :host([theme="dark"]) .toolbar button{
        background:#111827; border-color:#374151; color:#f3f4f6;
      }

      .grid{
        display:grid; gap:1rem;
        grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));
      }

      .card{
        border:1px solid var(--ddd-border-50,#e5e7eb);
        border-radius:1rem; overflow:hidden;
        background:var(--ddd-card-background-color,#fff);
      }
      :host([theme="dark"]) .card{
        background:#0b1220; border-color:#1f2937;
      }

      .head{ display:flex; align-items:center; gap:.6rem; padding:.7rem; }
      .head img{ width:36px; height:36px; border-radius:50%; object-fit:cover; }

      .media{ aspect-ratio: 4 / 3; background:#f3f4f6; display:grid; place-items:center; }
      .media img{ width:100%; height:100%; object-fit:cover; display:block; }

      .meta{ padding:.7rem; display:flex; justify-content:space-between; align-items:center; }
      .meta .left{ display:flex; gap:.5rem; align-items:center; }
      .iconbtn{ border:none; background:transparent; cursor:pointer; font-size:1rem; }
      .liked{ color:#ef4444; } .disliked{ color:#3b82f6; }

      .footer{ padding:0 .7rem .8rem; font-size:.85rem; opacity:.8; }
      .sentinel{ height:1px; }

      /* Lightbox */
      .lightbox{ position:fixed; inset:0; background:rgba(0,0,0,.92); display:grid; place-items:center; z-index:50; }
      .lightbox img{ max-width:90vw; max-height:86vh; }
      .nav{ position:fixed; inset:0; display:flex; align-items:center; justify-content:space-between; padding:1rem; }
      .nav button{ font-size:1.4rem; background:rgba(0,0,0,.6); color:#fff; border:none; padding:.5rem .7rem; border-radius:.6rem; }

      @media (max-width:520px){ .grid{ grid-template-columns:1fr 1fr; } }
    `];
  }

  constructor(){
    super();
    this.api = "https://randomfox.ca/floof/";
    this.pageSize = 10;
    this._visible = [];
    this._loading = false;
    this._likes = this._loadLikes();
    this._theme = this._prefersDark() ? "dark" : "light";
    this._lightboxIndex = null;
  }

  connectedCallback(){
    super.connectedCallback();
    this.setAttribute("theme", this._theme);
  }

  firstUpdated(){
    // Build first page, then start infinite scroll observer
    this._appendPage();
    this._setupObserver();
  }

  // ---------- Fetch n new fox images ----------
  async _fetchFoxBatch(n=10){
    const out = [];
    for (let i=0; i<n; i++){
      const res = await fetch(this.api, { cache: "no-store" });
      const f = await res.json(); // { image, link }
      out.push({
        id: `fox-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
        name: `Fox #${this._visible.length + out.length + 1}`,
        dateTaken: new Date().toISOString().slice(0,10),
        thumbSrc: f.image,
        fullSrc: f.image,
        author: {
          name: "RandomFox API",
          avatar: "https://i.pravatar.cc/80?img=12",
          userSince: "2024-01-01",
          channel: "@randomfox"
        }
      });
    }
    return out;
  }

  async _appendPage(){
    if(this._loading) return;
    this._loading = true;
    try{
      const next = await this._fetchFoxBatch(this.pageSize || 10);
      this._visible = [...this._visible, ...next];
    }catch(e){
      console.warn("RandomFox fetch failed", e);
    }finally{
      this._loading = false;
    }
  }

  _setupObserver(){
    this._io = new IntersectionObserver((entries)=>{
      entries.forEach(e => { if(e.isIntersecting) this._appendPage(); });
    }, { rootMargin: "1200px 0px 1200px 0px" });

    const attach = () => {
      const s = this.renderRoot?.querySelector?.(".sentinel");
      if(s) this._io.observe(s);
    };
    attach();
    this.updateComplete.then(attach);
  }

  // ---------- Likes (localStorage) ----------
  _storageKey(){ return "insta-gallery-likes"; }
  _loadLikes(){
    try { return JSON.parse(localStorage.getItem(this._storageKey())) || {}; }
    catch(_) { return {}; }
  }
  _persistLikes(){ localStorage.setItem(this._storageKey(), JSON.stringify(this._likes)); }
  _toggleLike(id, val){
    const cur = this._likes[id] || 0;                // 0 none, 1 like, -1 dislike
    this._likes = { ...this._likes, [id]: cur === val ? 0 : val };
    this._persistLikes();
    this.requestUpdate();
  }

  // ---------- Share ----------
  async _share(p){
    const shareData = { title: p.name, text: `${p.name} — via RandomFox`, url: p.fullSrc };
    if(navigator.share){
      try { await navigator.share(shareData); } catch(_) { /* canceled */ }
    } else {
      try { await navigator.clipboard.writeText(shareData.url); alert("Link copied to clipboard"); }
      catch(_) { /* ignore */ }
    }
  }

  // ---------- Theme ----------
  _prefersDark(){ return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches; }
  _toggleTheme(){
    this._theme = this._theme === "dark" ? "light" : "dark";
    this.setAttribute("theme", this._theme);
  }

  // ---------- Lightbox ----------
  _openLightbox(idx){ this._lightboxIndex = idx; }
  _closeLightbox(){ this._lightboxIndex = null; }
  _next(){ if(this._lightboxIndex != null && this._lightboxIndex < this._visible.length - 1) this._lightboxIndex++; }
  _prev(){ if(this._lightboxIndex != null && this._lightboxIndex > 0) this._lightboxIndex--; }

  // ---------- Helpers ----------
  _likeClass(id){ return this._likes[id] === 1 ? "liked" : ""; }
  _dislikeClass(id){ return this._likes[id] === -1 ? "disliked" : ""; }
  _year(v){
    const d = new Date(v);
    return isNaN(d) ? v : d.getFullYear();
  }

  // ---------- Render ----------
  render(){
    return html`
      <div class="toolbar">
        <span class="chip">Gallery</span>
        <div style="flex:1"></div>
        <button @click=${this._toggleTheme.bind(this)} aria-label="Toggle theme">
          ${this._theme === "dark" ? "☀️ Light" : "🌙 Dark"}
        </button>
      </div>

      <div class="grid">
        ${this._visible.map((p, i) => html`
          <article class="card">
            <header class="head">
              <img loading="lazy" src="${p.author?.avatar}" alt="${p.author?.name}">
              <div>
                <div style="font-weight:600">${p.author?.name}</div>
                <div style="font-size:.8rem;opacity:.7">
                  ${p.author?.channel} • since ${this._year(p.author?.userSince)}
                </div>
              </div>
            </header>

            <a class="media" @click=${() => this._openLightbox(i)} title="Open image">
              <img loading="lazy" src="${p.thumbSrc}" alt="${p.name}">
            </a>

            <div class="meta">
              <div class="left">
                <button class="iconbtn ${this._likeClass(p.id)}"
                        @click=${() => this._toggleLike(p.id, 1)} title="Like">❤</button>
                <button class="iconbtn ${this._dislikeClass(p.id)}"
                        @click=${() => this._toggleLike(p.id, -1)} title="Dislike">👎</button>
                <button class="iconbtn" @click=${() => this._share(p)} title="Share">↗</button>
              </div>
              <div style="font-weight:600">${p.name}</div>
            </div>

            <div class="footer">Taken on ${p.dateTaken}</div>
          </article>
        `)}
      </div>

      <div class="sentinel" aria-hidden="true"></div>

      ${this._lightboxIndex != null ? this._renderLightbox() : nothing}
    `;
  }

  _renderLightbox(){
    const p = this._visible[this._lightboxIndex];
    if(!p) return nothing;
    return html`
      <div class="lightbox" @click=${this._closeLightbox.bind(this)}>
        <img src="${p.fullSrc}" alt="${p.name}">
        <div class="nav" @click=${(e)=>e.stopPropagation()}>
          <button @click=${this._prev.bind(this)} aria-label="Previous">◀</button>
          <button @click=${this._closeLightbox.bind(this)} aria-label="Close">✕</button>
          <button @click=${this._next.bind(this)} aria-label="Next">▶</button>
        </div>
      </div>
    `;
  }
}

customElements.define(InstaGallery.tag, InstaGallery);
