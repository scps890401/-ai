import { useState } from "react";
import { ArrowRight, Check, ChevronDown, ChevronUp, ExternalLink, Gift, Image as ImageIcon, Menu, Palette, Play, Sparkles, X, Zap } from "lucide-react";

/* Style reminder: fidelity-first dark ocean landing page, electric cyan/violet accents, asymmetrical hero, glass cards, and crisp motion. */

const logoUrl = "/manus-storage/sticker-tycoon-logo_d42e24d3.png";
const heroUrl = "/manus-storage/sticker-tycoon-hero-reference_07193460.png";
const featureArtUrl = "/manus-storage/sticker-tycoon-feature-art_39953123.png";

const stickerProducts = [
  { id: "32558253", name: "貼圖作品", status: "✨ 新上架", tone: "new", image: "https://stickershop.line-scdn.net/stickershop/v1/product/32558253/LINEStorePC/main.png" },
  { id: "32182921", name: "Andy's Talk", status: "🔥 熱賣中", tone: "hot", image: "https://stickershop.line-scdn.net/stickershop/v1/product/32182921/LINEStorePC/main.png" },
  { id: "32191704", name: "Andy's Talk2", status: "✨ 新上架", tone: "new", image: "https://stickershop.line-scdn.net/stickershop/v1/product/32191704/LINEStorePC/main.png" },
  { id: "32392279", name: "貼圖作品", status: "✨ 新上架", tone: "new", image: "https://stickershop.line-scdn.net/stickershop/v1/product/32392279/LINEStorePC/main.png" },
  { id: "32430992", name: "貼圖作品", status: "✨ 新上架", tone: "new", image: "https://stickershop.line-scdn.net/stickershop/v1/product/32430992/LINEStorePC/main.png" },
  { id: "32292454", name: "貼圖作品", status: "🔥 熱賣中", tone: "hot", image: "https://stickershop.line-scdn.net/stickershop/v1/product/32292454/LINEStorePC/main.png" },
];

const stickerPreviews = [645893161, 645893162, 645893163, 645893164, 646116401, 646116402, 646116403, 646116404];

function goTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedPreview, setSelectedPreview] = useState<number | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 3200);
  };

  return (
    <div className="site-shell">
      {notice && <div className="toast"><Sparkles size={16} />{notice}</div>}
      <header className="topbar">
        <a className="brand" href="#top" aria-label="貼圖大亨首頁">
          <img src={logoUrl} alt="貼圖大亨品牌標誌" />
          <span><strong>貼圖大亨</strong><small>Sticker Tycoon</small></span>
        </a>
        <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="開啟導覽選單"><Menu size={22} /></button>
        <nav className={menuOpen ? "nav-links open" : "nav-links"}>
          <button onClick={() => { goTo("features"); setMenuOpen(false); }}>功能特色</button>
          <button onClick={() => { goTo("gallery"); setMenuOpen(false); }}>作品展示</button>
          <button onClick={() => { goTo("guide"); setMenuOpen(false); }}>使用流程</button>
          <a href="#guide">📖 使用說明</a>
        </nav>
        <a className="button button-primary header-cta" href="https://line.me/R/ti/p/@sticker-tycoon" target="_blank" rel="noreferrer"><Play size={15} fill="currentColor" />立即開始</a>
      </header>

      <main id="top">
        <section className="hero section-pad">
          <div className="ambient orb-one" /><div className="ambient orb-two" />
          <div className="hero-copy reveal">
            <div className="eyebrow">AI 智能創作 · 3 分鐘完成</div>
            <h1>用 AI 創造<br /><span>專屬 LINE 貼圖</span></h1>
            <p className="hero-lead">上傳一張照片，AI 自動生成多種表情貼圖。<br /><b>8 種風格任選</b>，從創作、預覽到分享，全部免費體驗！</p>
            <div className="legal-note">本服務為貼圖大亨之 LINE Mini App 版本，僅於 LINE 應用程式內提供使用者貼圖製作與管理相關功能，不涉及任何未經授權的內容散布或行為。</div>
            <div className="hero-actions">
              <a className="button button-primary" href="https://line.me/R/ti/p/@sticker-tycoon" target="_blank" rel="noreferrer"><Gift size={16} />立即免費開始</a>
              <button className="button button-secondary" onClick={() => goTo("gallery")}><ImageIcon size={16} />看看作品</button>
            </div>
            <div className="trust-row"><span><Check size={14} />免費開始</span><span><Check size={14} />無需設計技能</span><span><Check size={14} />快速取得貼圖</span></div>
            <div className="coupon-card free-note"><Gift size={19} /><span><strong>全站免費開放</strong><small>全站免費開放，立即開始創作</small></span><Check size={17} /></div>
          </div>
          <div className="hero-visual reveal delay-one">
            <div className="hero-art-frame"><img src={heroUrl} alt="AI 貼圖創作示意圖" /></div>
            <div className="floating-chip chip-style"><Palette size={15} />8 種風格</div>
            <div className="floating-chip chip-speed"><Zap size={16} fill="currentColor" />3 分鐘生成</div>
            <div className="scanline" />
          </div>
        </section>

        <section className="announcement section-pad"><div className="announcement-icon">✓</div><div><strong>免費創作公告｜現在就開始你的第一套貼圖</strong><p>不用信用卡、不用訂閱，從 LINE 官方帳號進入即可免費使用創作功能。</p></div><a className="text-link" href="https://line.me/R/ti/p/@sticker-tycoon" target="_blank" rel="noreferrer">免費進入創作 <ArrowRight size={15} /></a></section>

        <section id="features" className="feature-section section-pad">
          <div className="section-heading"><div className="eyebrow">✨ 為什麼選擇我們</div><h2>強大功能，<span>超簡單操作</span></h2><p>結合 AI 技術，讓每個人都能輕鬆創作專業級 LINE 貼圖。</p></div>
          <div className="feature-layout"><div className="feature-art"><img src={heroUrl} alt="AI 貼圖創作示意圖" /></div><div className="feature-list">
            {[{icon: "📸", title: "照片變貼圖", body: "上傳任意照片，AI 自動提取特徵生成多種表情貼圖。"},{icon: "🎭", title: "24 種表情", body: "開心、難過、生氣、驚訝……豐富表情一次滿足。"},{icon: "🚀", title: "免費生成", body: "選擇風格後立即生成，從靈感到作品不需要等待複雜流程。"},{icon: "💬", title: "自由分享", body: "完成後即可保存與分享你的貼圖創作，讓朋友一起看見。"}].map((item) => <article className="feature-item" key={item.title}><div className="feature-icon">{item.icon}</div><div><h3>{item.title}</h3><p>{item.body}</p></div></article>)}
          </div></div>
        </section>

        <section id="gallery" className="gallery-section section-pad"><div className="section-heading center"><div className="eyebrow">🏆 創作者作品</div><h2>看看大家的 <span>可愛貼圖</span></h2><p>以下作品展示 AI 貼圖創作的可能性，喜歡的風格也能免費拿來當靈感。</p></div><div className="product-grid">{stickerProducts.map((product) => <article className="product-card" key={product.id}><div className="product-image"><img src={product.image} alt={`${product.name} LINE 貼圖`} /><span className={`status ${product.tone}`}>{product.status}</span><span className="visit"><ImageIcon size={13} />免費作品展示</span></div><div className="product-info"><div><h3>{product.name}</h3><p>40 張表情貼圖 · 可愛風格</p></div><span className="free-tag">免費展示</span></div></article>)}</div><div className="gallery-sheet"><div><div className="eyebrow">📸 貼圖預覽</div><h3>一張照片，八種可愛表情</h3><p>這些都是 AI 自動生成的貼圖，你也可以創作這樣的作品。</p></div><button className="sheet-art" onClick={() => setSelectedPreview(0)}><div className="sheet-grid">{stickerPreviews.map((id) => <img key={id} src={`https://stickershop.line-scdn.net/stickershop/v1/sticker/${id}/iPhone/sticker@2x.png`} alt="AI 貼圖預覽" />)}</div><span>點擊放大預覽 <ArrowRight size={15} /></span></button></div></section>

        <section className="download-section section-pad"><div className="section-heading"><div className="eyebrow">✨ 免費創作體驗</div><h2>把靈感帶走，<span>自由分享</span></h2><p>所有創作功能免費開放，完成後即可保存作品、分享給朋友，或繼續創作下一套貼圖。</p></div><div className="compare-grid"><article className="compare-card muted"><div className="compare-symbol">📷</div><h3>上傳照片</h3><ul><li>✅ 選擇一張喜歡的照片</li><li>✅ 不需要設計經驗</li><li>✅ 支援多種創作風格</li><li>✅ 立即開始免費生成</li></ul></article><article className="compare-card recommended"><div className="compare-symbol">🎉</div><h3>保存與分享</h3><ul><li>✅ 預覽多種表情變化</li><li>✅ 保存你的創作成果</li><li>✅ 分享給朋友一起欣賞</li><li>✅ 不綁定信用卡或訂閱</li></ul><button className="button button-primary" onClick={() => showNotice("免費創作功能將在 LINE Mini App 中開啟")}>免費開始 <ArrowRight size={15} /></button></article></div></section>

        <section id="pricing" className="pricing-section section-pad"><div className="section-heading center"><div className="eyebrow">💎 免費功能</div><h2>每個人都能 <span>免費創作</span></h2><p>沒有方案差異、沒有隱藏費用，所有創作者都能使用完整的基礎體驗。</p></div><div className="plans"><article className="plan-card popular"><div className="plan-top"><span>Free Creator</span><strong>完整開放</strong></div><p>適合想把日常照片變成可愛貼圖的每一位創作者。</p><div className="plan-price">FREE</div><ul><li><Check size={15} />AI 貼圖生成體驗</li><li><Check size={15} />8 種創作風格</li><li><Check size={15} />多種表情預覽</li><li><Check size={15} />保存與分享作品</li></ul><a className="button button-primary" href="https://line.me/R/ti/p/@sticker-tycoon" target="_blank" rel="noreferrer">立即免費開始 <ArrowRight size={15} /></a></article></div></section>

        <section id="guide" className="guide-section section-pad"><div className="guide-panel"><div><div className="eyebrow">📖 使用說明</div><h2>三步驟，開始你的<br /><span>免費創作之旅</span></h2><p>從 LINE 官方帳號進入，選擇風格、上傳照片，等待 AI 將你的日常變成一套可以分享的貼圖。</p></div><div className="steps">{[["01", "免費進入", "點擊立即開始，開啟 LINE Mini App。"],["02", "上傳照片與選風格", "選一張照片，再挑選你喜歡的創作風格。"],["03", "保存與分享", "預覽成果後保存作品，免費分享給朋友。"]].map(([n, t, d]) => <div className="step" key={n}><span>{n}</span><div><strong>{t}</strong><p>{d}</p></div></div>)}</div><a className="button button-primary" href="https://line.me/R/ti/p/@sticker-tycoon" target="_blank" rel="noreferrer">立即免費開始 <ArrowRight size={16} /></a></div></section>

        <section className="faq-section section-pad"><div className="section-heading"><div className="eyebrow">💬 常見問題</div><h2>開始前，先看看<span>大家都在問什麼</span></h2></div><div className="faq-list">{[["真的完全免費嗎？", "是的，目前網站提供完整免費的創作體驗。"],["可以創作哪些內容？", "你可以上傳照片、選擇風格，預覽多種表情並保存自己的貼圖作品。"],["可以分享給朋友嗎？", "可以。完成創作後即可保存與分享，邀請朋友一起欣賞你的作品。"]].map(([q, a]) => <div className="faq-item" key={q}><button onClick={() => setExpanded(expanded === q ? null : q)}><span>{q}</span>{expanded === q ? <ChevronUp size={17} /> : <ChevronDown size={17} />}</button>{expanded === q && <p>{a}</p>}</div>)}</div></section>
      </main>

      <footer className="footer"><div className="footer-brand"><img src={logoUrl} alt="貼圖大亨標誌" /><div><strong>貼圖大亨</strong><small>Sticker Tycoon</small></div></div><p>用 AI 創造，讓每個表情都有你的名字。</p><div className="footer-links"><a href="#guide">使用說明</a><a href="#guide">免費使用</a><a href="mailto:johnyarcher2100@yahoo.com.tw">聯絡我們</a><a href="#guide">隱私權政策</a><a href="#guide">使用條款</a></div><small className="copyright">© 2026 Sticker Tycoon. Crafted for creators.</small></footer>
      {selectedPreview !== null && <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setSelectedPreview(null)}><button className="close-lightbox" onClick={() => setSelectedPreview(null)} aria-label="關閉"><X /></button><div className="lightbox-content" onClick={(e) => e.stopPropagation()}><img src={`https://stickershop.line-scdn.net/stickershop/v1/sticker/${stickerPreviews[selectedPreview]}/iPhone/sticker@2x.png`} alt="貼圖放大預覽" /><div className="preview-dots">{stickerPreviews.map((id, index) => <button className={index === selectedPreview ? "active" : ""} key={id} onClick={() => setSelectedPreview(index)} />)}</div></div></div>}
    </div>
  );
}

