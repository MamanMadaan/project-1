import { LitElement, html, css, nothing } from "lit";

class InstaGallery extends LitElement {
  static properties = {
    api: { type: String },          
    pageSize: { type: Number },    
    infinite: { type: Boolean, reflect: true }, 
    _all: { state: true },
    _visible: { state: true },
    _likes: { state: true },
    _lightboxIndex: { state: true },
    _loadingMore: { state: true },
    _genCounter: { state: true }
  };

  constructor() {
    super();
    this.api = "./api/chefs.json";
    this.pageSize = 15;
    this.infinite = true;              
    this._all = [];
    this._visible = [];
    this._likes = this._loadLikes();
    this._lightboxIndex = null;
    this._loadingMore = false;
    this._observer = null;
    this._genCounter = 1000;           
  }

  static styles = css`
    :host { display:block; }
    .grid{ display:grid; gap:1.5rem; grid-template-columns:repeat(auto-fill,minmax(250px,1fr)); }
    .card{ border-radius:1rem; overflow:hidden; background:#fff; border:1px solid #ddd; transition:.2s; }
    .card:hover{ transform:translateY(-2px); box-shadow:0 2px 8px rgba(0,0,0,.12); }
    .card.liked{ border-color:#ff4f81; box-shadow:0 0 12px rgba(255,79,129,.35); }
    .card.disliked{ border-color:#8bff6a; box-shadow:0 0 12px rgba(150,255,100,.3); }
    .head{ display:flex; align-items:center; gap:.7rem; padding:.8rem; }
    .head img{ width:40px; height:40px; border-radius:50%; object-fit:cover; }
    .media{ aspect-ratio:4/3; background:#f3f4f6; cursor:pointer; }
    .media img{ width:100%; height:100%; object-fit:cover; display:block; }
    .meta{ padding:.6rem .8rem; display:flex; justify-content:space-between; align-items:center; }
    .btn{ border:none; background:transparent; cursor:pointer; font-size:1.25rem; }
    .liked-btn{ transform:scale(1.15); }
    .footer{ padding:0 .8rem .9rem; opacity:.85; font-size:.9rem; }
    .sentinel{ height:1px; }
    @media (prefers-color-scheme: dark){
      .card{ background:#161b22; color:#e6edf3; border-color:#2a2f3a; }
      .media{ background:#0f172a; }
    }
    .lightbox{ position:fixed; inset:0; background:rgba(0,0,0,.9); display:grid; place-items:center; z-index:100; }
    .lightbox img{ max-width:90vw; max-height:85vh; }
    .nav{ position:fixed; inset:0; display:flex; align-items:center; justify-content:space-between; padding:1rem; }
    .nav button{ font-size:1.4rem; background:rgba(0,0,0,.6); color:#fff; border:none; padding:.5rem .8rem; border-radius:.6rem; cursor:pointer; }
  `;

  async connectedCallback() {
    super.connectedCallback();
    if (this.api === "gen") {
      this._all = this._generateBatch(2 * this.pageSize);
      this._visible = this._all.slice(0, this.pageSize);
    } else {
      await this._loadDataFromJson();
    }
  }

  firstUpdated() {
    const sentinel = this.renderRoot?.querySelector("#sentinel");
    if (!sentinel) return;
    this._observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) this._loadMore();
      },
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
      this._all = [...this._all];
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
        const nextCount = Math.min(this._visible.length + this.pageSize, this._all.length);
        this._visible = this._all.slice(0, nextCount);
      } else if (this.infinite) {
        const fresh = this._generateBatch(this.pageSize);
        this._all = [...this._all, ...fresh];
        this._visible = [...this._visible, ...fresh];
      }
      this._loadingMore = false;
    }, 0);
  }

 
  _generateBatch(n) {
    const chefNames = [
      "Gordon Ramsay","Jamie Oliver","Alain Ducasse","Thomas Keller","Heston Blumenthal",
      "Massimo Bottura","Ferran Adrià","René Redzepi","Marco Pierre White","Grant Achatz",
      "Paul Bocuse","Dominique Crenn","Mauro Colagreco","Nobu Matsuhisa","Clare Smyth",
      "José Andrés","Enrique Olvera","Virgilio Martínez","Gaggan Anand","Vikas Khanna"
    ];
    const batch = [];
    for (let i = 0; i < n; i++) {
      const idNum = this._genCounter++;
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

  _loadLikes() {
    try { return JSON.parse(localStorage.getItem("chefLikes")) || {}; }
    catch { return {}; }
  }
  _saveLikes(){ localStorage.setItem("chefLikes", JSON.stringify(this._likes)); }
  _toggle(id, val){
    const current = this._likes[id] || 0;
    this._likes = { ...this._likes, [id]: current === val ? 0 : val };
    this._saveLikes();
  }

  _openLightbox(i){ this._lightboxIndex = i; }
  _closeLightbox(){ this._lightboxIndex = null; }

  render(){
    return html`
      <div class="grid">
        ${this._visible.map((p,i)=>html`
          <article class="card ${this._likes[p.id]===1?'liked':this._likes[p.id]===-1?'disliked':''}">
            <header class="head">
              <img src="${p.author.avatar}" alt="${p.author.name}">
              <div>
                <div style="font-weight:700">${p.author.name}</div>
                <div style="opacity:.7;font-size:.9rem">${p.author.channel} • since ${new Date(p.author.userSince).getFullYear()}</div>
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
              <div>
                <button class="btn ${this._likes[p.id]===1?'liked-btn':''}"  @click=${()=>this._toggle(p.id,1)}>😍</button>
                <button class="btn ${this._likes[p.id]===-1?'liked-btn':''}" @click=${()=>this._toggle(p.id,-1)}>🤮</button>
              </div>
              <strong>${p.name}</strong>
            </div>

            <div class="footer">Taken on ${p.dateTaken}</div>
          </article>
        `)}
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
}

customElements.define("insta-gallery", InstaGallery);
