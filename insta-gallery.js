/**
 * Copyright 2025 NamanMadaan
 * @license Apache-2.0, see LICENSE for full text.
 */
import { LitElement, html, css, nothing } from "lit";
import { DDDSuper } from "@haxtheweb/d-d-d/d-d-d.js";

export class InstaGallery extends DDDSuper(LitElement) {
  static get tag() { return "insta-gallery"; }

  static get properties() {
    return {
      ...super.properties,
      api: { type: String },
      pageSize: { type: Number, attribute: "page-size" },
      infinite: { type: Boolean, reflect: true },
      _all: { state: true },
      _visible: { state: true },
      _likes: { state: true },    
      _counts: { state: true },    
      _lightboxIndex: { state: true },
      _loadingMore: { state: true },
      _genCounter: { state: true }
    };
  }

  constructor() {
    super();
    this.api = "./api/chefs.json";
    this.pageSize = 15;
    this.infinite = true;
    this._all = [];
    this._visible = [];
    this._likes = this._loadLikes();
    this._counts = this._loadCounts();
    this._lightboxIndex = null;
    this._loadingMore = false;
    this._observer = null;
    this._genCounter = 1000;
  }

  static get styles() {
    return [super.styles, css`
      :host {
        display: block;
        background: var(--ddd-theme-default-white);
        color: var(--ddd-theme-default-coalyGray);
        font-family: var(--ddd-font-navigation);
      }
      .grid{
        display:grid;
        gap: var(--ddd-spacing-4);
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        padding: var(--ddd-spacing-4);
        max-width: 1200px;
        margin: 0 auto;
      }
      .card{
        border-radius: var(--ddd-radius-lg);
        overflow:hidden;
        background: var(--ddd-theme-default-white);
        border: var(--ddd-border-sm);
        border-color: var(--ddd-theme-default-limestoneGray);
        box-shadow: var(--ddd-boxShadow-sm);
        transition: transform .2s ease, box-shadow .2s ease;
      }
      .card:hover{ transform: translateY(-2px); box-shadow: var(--ddd-boxShadow-md); }
      .card.liked{
        border-color: var(--ddd-theme-default-error);
        box-shadow: 0 0 12px rgba(220, 53, 69, .25);
      }
      .card.disliked{
        border-color: var(--ddd-theme-default-keystoneYellow);
        box-shadow: 0 0 12px rgba(255, 193, 7, .25);
      }

      .head{
        display:flex; align-items:center; gap: var(--ddd-spacing-2);
        padding: var(--ddd-spacing-3);
      }
      .head img{
        width: 40px; height: 40px; border-radius: 50%;
        object-fit: cover;
        border: 2px solid var(--ddd-theme-default-limestoneGray);
      }
      .head .name{
        font-weight: var(--ddd-font-weight-bold);
        font-size: var(--ddd-font-size-s);
        color: var(--ddd-theme-default-coalyGray);
      }
      .head .sub{
        font-size: var(--ddd-font-size-xs);
        color: var(--ddd-theme-default-slateGray);
      }

      .media{ aspect-ratio: 4/3; background: var(--ddd-theme-default-limestoneLight); cursor: pointer; }
      .media img{ width:100%; height:100%; object-fit:cover; display:block; }

      .meta{
        padding: var(--ddd-spacing-3);
        display:flex; justify-content:space-between; align-items:center;
        border-top: var(--ddd-border-sm);
        border-color: var(--ddd-theme-default-limestoneGray);
        gap: var(--ddd-spacing-2);
      }
      .reactions{ display:flex; align-items:center; gap: var(--ddd-spacing-2); }
      .btn{
        border:none; background:transparent; cursor:pointer;
        font-size: var(--ddd-font-size-l);
        padding: var(--ddd-spacing-1);
        border-radius: var(--ddd-radius-sm);
        transition: transform .15s ease, background-color .15s ease;
      }
      .btn:hover{ transform: scale(1.08); background-color: var(--ddd-theme-default-limestoneLight); }
      .liked-btn{ transform: scale(1.12); }
      .count{
        font-size: var(--ddd-font-size-xs);
        color: var(--ddd-theme-default-slateGray);
        min-width: 1.5rem;
        text-align: right;
      }

      .title{ font-weight: var(--ddd-font-weight-bold); font-size: var(--ddd-font-size-s); }
      .footer{ padding: 0 var(--ddd-spacing-3) var(--ddd-spacing-3); color: var(--ddd-theme-default-slateGray); font-size: var(--ddd-font-size-xs); }

      .sentinel{ height: 1px; }

      
      .lightbox{
        position: fixed; inset: 0;
        background: rgba(0,0,0,.9);
        display: grid; place-items: center;
        z-index: 1000;
      }
      .lightbox img{ max-width: 90vw; max-height: 85vh; object-fit: contain; }
      .nav{
        position: fixed; inset: 0; display:flex; align-items:center; justify-content:space-between;
        padding: var(--ddd-spacing-4);
      }
      .nav button{
        font-size: var(--ddd-font-size-l);
        background: rgba(0,0,0,.6);
        color: var(--ddd-theme-default-white);
        border: none;
        padding: var(--ddd-spacing-2) var(--ddd-spacing-3);
        border-radius: var(--ddd-radius-md);
        cursor: pointer;
      }

      
      @media (prefers-color-scheme: dark) {
        :host{ background: var(--ddd-theme-default-coalyGray); color: var(--ddd-theme-default-white); }
        .card{ background: var(--ddd-theme-default-coalyGray); border-color: var(--ddd-theme-default-slateGray); }
        .head .name{ color: var(--ddd-theme-default-white); }
        .head .sub{ color: var(--ddd-theme-default-limestoneGray); }
        .media{ background: var(--ddd-theme-default-slateGray); }
        .meta{ border-color: var(--ddd-theme-default-slateGray); }
        .footer{ color: var(--ddd-theme-default-limestoneGray); }
      }

      @media (max-width: 768px) {
        .grid { gap: var(--ddd-spacing-3); padding: var(--ddd-spacing-3); }
      }
    `];
  }

  async connectedCallback() {
    super.connectedCallback();
    if (this.api === "gen") {
      this._all = this._generateBatch(2 * this.pageSize);
      this._visible = this._all.slice(0, this.pageSize);
      this._ensureCountsForVisible();
    } else {
      await this._loadDataFromJson();
      this._ensureCountsForVisible();
    }
  }

  firstUpdated() {
    const sentinel = this.renderRoot?.querySelector("#sentinel");
    if (!sentinel) return;
    this._observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) this._loadMore(); },
      { root: null, rootMargin: "400px 0px", threshold: 0 }
    );
    this._observer.observe(sentinel);
  }

  disconnectedCallback() {
    if (this._observer) this._observer.disconnect();
    super.disconnectedCallback();
  }

  async _loadDataFromJson() {
    try {
      const r = await fetch(this.api, { cache: "no-store" });
      const data = await r.json();
      this._all = Array.isArray(data) ? data : (data.chefs || data.photos || []);
      this._visible = this._all.slice(0, this.pageSize);
    } catch (e) {
      console.error("Failed to load JSON, switching to generator mode", e);
      this.api = "gen";
      this._all = this._generateBatch(2 * this.pageSize);
      this._visible = this._all.slice(0, this.pageSize);
    }
  }

  _loadMore() {
    if (this._loadingMore) return;
    this._loadingMore = true;
    setTimeout(() => {
      if (this._visible.length < this._all.length) {
        const next = Math.min(this._visible.length + this.pageSize, this._all.length);
        this._visible = this._all.slice(0, next);
      } else if (this.infinite) {
        const fresh = this._generateBatch(this.pageSize);
        this._all = [...this._all, ...fresh];
        this._visible = [...this._visible, ...fresh];
      }
      this._ensureCountsForVisible();
      this._loadingMore = false;
    }, 0);
  }

 
  _loadLikes() {
    try { return JSON.parse(localStorage.getItem("chefLikes")) || {}; }
    catch { return {}; }
  }
  _saveLikes(){ localStorage.setItem("chefLikes", JSON.stringify(this._likes)); }

  _loadCounts() {
    try { return JSON.parse(localStorage.getItem("chefCounts")) || {}; }
    catch { return {}; }
  }
  _saveCounts(){ localStorage.setItem("chefCounts", JSON.stringify(this._counts)); }

  _ensureCountsForVisible() {
    
    const next = { ...this._counts };
    for (const p of this._visible) {
      if (!next[p.id]) next[p.id] = { heart: 0, vomit: 0 };
    }
    this._counts = next;
    this._saveCounts();
  }

  _toggle(id, val){
    
    const current = this._likes[id] || 0;
    const counts = { ...(this._counts[id] || { heart: 0, vomit: 0 }) };

    if (current === val) {
      
      if (val === 1 && counts.heart > 0) counts.heart -= 1;
      if (val === -1 && counts.vomit > 0) counts.vomit -= 1;
      this._likes = { ...this._likes, [id]: 0 };
    } else {
      
      if (current === 1 && counts.heart > 0) counts.heart -= 1; // undo previous heart
      if (current === -1 && counts.vomit > 0) counts.vomit -= 1; // undo previous vomit
      if (val === 1) counts.heart += 1;
      if (val === -1) counts.vomit += 1;
      this._likes = { ...this._likes, [id]: val };
    }

    this._counts = { ...this._counts, [id]: counts };
    this._saveLikes();
    this._saveCounts();
  }

  
  _openLightbox(i){ this._lightboxIndex = i; }
  _closeLightbox(){ this._lightboxIndex = null; }

  
  _generateBatch(n) {
    const chefNames = [
      "Gordon Ramsay","Jamie Oliver","Alain Ducasse","Thomas Keller","Heston Blumenthal",
      "Massimo Bottura","Ferran Adrià","René Redzepi","Marco Pierre White","Grant Achatz",
      "Paul Bocuse","Dominique Crenn","Mauro Colagreco","Nobu Matsuhisa","Clare Smyth",
      "José Andrés","Enrique Olvera","Virgilio Martínez","Gaggan Anand","Vikas Khanna"
    ];
    const batch = [];
    for (let i = 0; i < n; i++) {
      const idNum = (this._genCounter++);
      const name = chefNames[idNum % chefNames.length] + " #" + idNum;
      const lock = idNum;
      batch.push({
        id: "g-" + idNum,
        name,
        dateTaken: new Date(Date.now() - lock * 86400000).toISOString().slice(0,10),
        thumbSrc: `https://loremflickr.com/800/600/chef,portrait,restaurant/all?lock=${lock}`,
        fullSrc:  `https://loremflickr.com/1600/1200/chef,portrait,restaurant/all?lock=${lock}`,
        author: {
          name,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&bold=true&size=80`,
          userSince: "2019-01-01",
          channel: "@chef" + idNum
        }
      });
    }
    return batch;
  }

  render(){
    return html`
      <div class="grid">
        ${this._visible.map((p,i)=>{
          const my = this._likes[p.id] || 0;
          const c = this._counts[p.id] || { heart: 0, vomit: 0 };
          return html`
            <article class="card ${my===1?'liked':my===-1?'disliked':''}">
              <header class="head">
                <img src="${p.author.avatar}" alt="${p.author.name}">
                <div>
                  <div class="name">${p.author.name}</div>
                  <div class="sub">${p.author.channel} • since ${new Date(p.author.userSince).getFullYear()}</div>
                </div>
              </header>

              <div class="media" @click=${()=>this._openLightbox(i)}>
                <img
                  src="${p.thumbSrc}"
                  alt="${p.name}"
                  loading="lazy"
                  @error=${e=>{ e.target.src=`https://loremflickr.com/800/600/chef,portrait,restaurant/all?lock=${i+1}`; }}
                >
              </div>

              <div class="meta">
                <div class="reactions">
                  <button class="btn ${my===1?'liked-btn':''}"  @click=${()=>this._toggle(p.id,1)}>😍</button>
                  <span class="count" title="Total heart-eyes">${c.heart}</span>
                  <button class="btn ${my===-1?'liked-btn':''}" @click=${()=>this._toggle(p.id,-1)}>🤮</button>
                  <span class="count" title="Total vomits">${c.vomit}</span>
                </div>
                <strong class="title">${p.name}</strong>
              </div>

              <div class="footer">Taken on ${p.dateTaken}</div>
            </article>
          `;
        })}
      </div>

      <div id="sentinel" class="sentinel" aria-hidden="true"></div>

      ${this._lightboxIndex!=null ? html`
        <div class="lightbox" @click=${this._closeLightbox}>
          <img
            src="${this._visible[this._lightboxIndex].fullSrc || this._visible[this._lightboxIndex].thumbSrc}"
            alt="${this._visible[this._lightboxIndex].name}"
            @error=${e=>{ e.target.src=`https://loremflickr.com/1600/1200/chef,portrait,restaurant/all?lock=${this._lightboxIndex+1}`; }}
          >
          <div class="nav" @click=${e=>e.stopPropagation()}>
            <button @click=${()=>this._lightboxIndex=Math.max(0,this._lightboxIndex-1)}>◀</button>
            <button @click=${this._closeLightbox}>✕</button>
            <button @click=${()=>this._lightboxIndex=Math.min(this._visible.length-1,this._lightboxIndex+1)}>▶</button>
          </div>
        </div>
      ` : nothing}
    `;
  }

  static get haxProperties() {
    return new URL(`./lib/${this.tag}.haxProperties.json`, import.meta.url).href;
  }
}

customElements.define(InstaGallery.tag, InstaGallery);