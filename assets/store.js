/* Cửa hàng: đọc data/site.json + data/products.json rồi dựng trang. Không cần sửa tệp này. */
(function(){
"use strict";
const $ = (s, el=document) => el.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase();
const vnd = n => Number(n).toLocaleString("vi-VN") + "đ";
const fmtDate = d => { if(!d) return ""; const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : d; };

const S = { site:{}, products:[], overrides:{}, preview:false, filter:{ q:"", cat:"Tất cả" } };
try { const f = JSON.parse(localStorage.getItem("xa-filter")||"{}"); if (f.cat) S.filter.cat = f.cat; } catch(e) {}

const ICON = {
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>',
  trial:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/></svg>',
  lang:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/></svg>',
  lock:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>',
  refund:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 8v8M9.5 10.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.6c0 2.4-5 1.2-5 3.6 0 1 1 1.8 2.5 1.8s2.5-.5 2.5-1.5"/></svg>',
  search:'<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  logo:'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M8 7 3 12l5 5M16 7l5 5-5 5"/></svg>'
};

/* ---------- helpers ---------- */
const src = s => S.overrides[s] || s;
function genCover(p){
  const t = p.tint || "#3434c9";
  const name = esc(p.name || "Sản phẩm mới");
  const plat = esc((p.platforms||[]).join(" · ") || "Phần mềm");
  const tag = esc((p.tagline||"").length>52?(p.tagline||"").slice(0,50)+"…":(p.tagline||""));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 1000"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t}"/><stop offset="1" stop-color="${t}" stop-opacity=".72"/></linearGradient></defs><rect width="1600" height="1000" fill="url(#g)"/><g fill="#fff"><rect x="120" y="150" width="1360" height="760" rx="28" fill-opacity=".12"/><rect x="120" y="150" width="1360" height="64" rx="28" fill-opacity=".14"/><circle cx="170" cy="182" r="10" fill-opacity=".6"/><circle cx="204" cy="182" r="10" fill-opacity=".6"/><circle cx="238" cy="182" r="10" fill-opacity=".6"/><rect x="180" y="280" width="300" height="560" rx="18" fill-opacity=".1"/><rect x="530" y="280" width="890" height="250" rx="18" fill-opacity=".1"/><rect x="530" y="570" width="420" height="270" rx="18" fill-opacity=".1"/><rect x="1000" y="570" width="420" height="270" rx="18" fill-opacity=".1"/><text x="560" y="390" font-family="Segoe UI,Arial,sans-serif" font-size="72" font-weight="800">${name}</text><text x="562" y="460" font-family="Segoe UI,Arial,sans-serif" font-size="34" fill-opacity=".85">${tag}</text><text x="210" y="340" font-family="Consolas,monospace" font-size="26" fill-opacity=".8">${plat}</text></g></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
const cover = p => (p.images && p.images.length) ? src(p.images[0].src) : genCover(p);
function md(text){
  const blocks = String(text||"").trim().split(/\n\s*\n/);
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");
  return blocks.filter(Boolean).map(b => {
    const lines = b.split("\n");
    if (lines.every(l => /^\s*[-•]\s+/.test(l))) return "<ul>" + lines.map(l=>`<li>${inline(l.replace(/^\s*[-•]\s+/,""))}</li>`).join("") + "</ul>";
    return `<p>${lines.map(inline).join("<br>")}</p>`;
  }).join("");
}
const planPrice = pl => pl.price === null || pl.price === undefined || pl.price === "" ? "Liên hệ" : (Number(pl.price) === 0 ? "Miễn phí" : vnd(pl.price));
function fromPrice(p){
  const v = (p.plans||[]).map(x => x.price);
  if (!v.length) return "Liên hệ báo giá";
  const paid = v.filter(x => x !== null && x !== "" && x !== undefined && Number(x) > 0).map(Number);
  if (v.every(x => x !== null && x !== "" && Number(x) === 0)) return "Miễn phí";
  if (paid.length) return "Từ " + vnd(Math.min(...paid));
  return v.some(x => x !== null && x !== "" && Number(x) === 0) ? "Dùng thử miễn phí" : "Liên hệ báo giá";
}
const statusPill = p => p.status === "beta" ? `<span class="pill beta">Thử nghiệm</span>` : `<span class="pill live">Đang dùng thực tế</span>`;
const visible = () => S.products.filter(p => p.published !== false);
const zalo = () => S.site.zalo ? "https://zalo.me/" + String(S.site.zalo).replace(/\D/g,"") : "";

function toast(msg){ const t=document.createElement("div"); t.className="toast"; t.setAttribute("role","status"); t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2200); }
document.addEventListener("click", e => {
  const b = e.target.closest("[data-copy]"); if (!b) return;
  const fallback = () => { const c = b.previousElementSibling; if (c){ const r=document.createRange(); r.selectNodeContents(c); const s=getSelection(); s.removeAllRanges(); s.addRange(r); } toast("Đã chọn sẵn, nhấn Ctrl+C để sao chép"); };
  try { navigator.clipboard.writeText(b.dataset.copy).then(()=>toast("Đã sao chép"), fallback); } catch(err) { fallback(); }
});

/* ---------- shell ---------- */
function shell(){
  const s = S.site;
  $("#top").innerHTML = `<div class="wrap">
    <a class="brand" href="#"><span class="brand-mark" aria-hidden="true">${ICON.logo}</span><b>${esc(s.name)}</b></a>
    <nav class="nav" aria-label="Điều hướng chính">
      <a href="#san-pham" data-nav="san-pham">Sản phẩm</a>
      <a href="#dat-lam" data-nav="dat-lam">Làm theo yêu cầu</a>
      <a href="#cach-mua" data-nav="cach-mua">Cách mua</a>
      <a href="#giay-phep" data-nav="chinh-sach">Chính sách</a>
      <a href="#lien-he" data-nav="lien-he">Liên hệ</a>
      <a class="btn btn-primary" href="#lien-he">Xin dùng thử</a>
    </nav></div>`;
  $("#foot").innerHTML = `<div class="wrap">
    <div><h4>${esc(s.name)}</h4><div>${esc(s.slogan||"")}</div>
      <div style="margin-top:10px">Người bán: ${esc(s.owner)}<br>Mã số thuế: ${esc(s.taxCode)}<br>${esc(s.area)}<br>${esc(s.email)} · ${esc(s.phone)}</div>
      ${s.badgeHtml ? `<div style="margin-top:12px">${s.badgeHtml}</div>` : ""}</div>
    <div><h4>Chính sách</h4><ul><li><a href="#giay-phep">Giấy phép sử dụng</a></li><li><a href="#bao-mat">Chính sách bảo mật</a></li><li><a href="#hoan-tien">Bảo hành, hoàn tiền, khiếu nại</a></li></ul></div>
    <div><h4>Hỗ trợ</h4><ul><li><a href="#cach-mua">Cách dùng thử và mua</a></li><li><a href="#dat-lam">Đặt làm phần mềm riêng</a></li><li><a href="#lien-he">Liên hệ</a></li></ul></div>
  </div>`;
}

/* ---------- home ---------- */
function cardHTML(p){
  return `<a class="card" href="#sp-${esc(p.id)}">
    <img class="shot" src="${esc(cover(p))}" alt="" loading="lazy">
    <div class="card-body">
      <div class="card-meta">${statusPill(p)}${(p.platforms||[]).map(x=>`<span class="pill">${esc(x)}</span>`).join("")}</div>
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.tagline)}</p>
      <div class="card-foot"><b>${fromPrice(p)}</b><span>Xem chi tiết →</span></div>
    </div></a>`;
}
function viewHome(){
  const s = S.site, list = visible();
  const feat = list.find(p => p.featured) || list[0];
  const hl = s.heroHighlight && s.heroTitle.includes(s.heroHighlight)
    ? esc(s.heroTitle).replace(esc(s.heroHighlight), `<span class="hl">${esc(s.heroHighlight)}</span>`) : esc(s.heroTitle);
  const cats = (s.categories||[]).filter(c => list.some(p => p.category === c));
  if (!["Tất cả",...cats].includes(S.filter.cat)) S.filter.cat = "Tất cả";
  const setup = String(s.owner||"").startsWith("[") || list.some(p => p.example);
  $("#app").innerHTML = `
  <div class="wrap">
    <section class="hero">
      <div>
        <div class="eyebrow">${esc(s.slogan||"")}</div>
        <h1 style="margin-top:10px">${hl}</h1>
        <p>${esc(s.heroText||"")}</p>
        <div class="cta"><a class="btn btn-primary" href="#san-pham">Xem ${list.length} sản phẩm</a><a class="btn btn-ghost" href="#dat-lam">Đặt làm phần mềm riêng</a></div>
        ${setup && !S.preview ? `<div class="notice">Cửa hàng đang dựng: còn thông tin người bán trống hoặc sản phẩm mẫu. Vào trang quản trị để sửa.</div>` : ""}
      </div>
      ${feat ? `<a class="hero-shot" href="#sp-${esc(feat.id)}" style="text-decoration:none;color:inherit">
        <div class="frame"><div class="frame-bar"><i></i><i></i><i></i><span>${esc(feat.name)}</span></div><img class="shot" src="${esc(cover(feat))}" alt="Ảnh giao diện ${esc(feat.name)}"></div>
        <div class="tag"><b>${esc(feat.name)}</b><span>${esc(fromPrice(feat))} · ${esc((feat.platforms||[]).join(", "))}</span></div></a>` : ""}
    </section>
    <div class="trust">
      <div>${ICON.trial}<div><b>Dùng thử ${esc(s.trialDays)} ngày</b><span>Đủ tính năng, không cần thanh toán trước</span></div></div>
      <div>${ICON.lang}<div><b>Hỗ trợ tiếng Việt</b><span>Trực tiếp với người làm ra phần mềm</span></div></div>
      <div>${ICON.lock}<div><b>Dữ liệu ở phía bạn</b><span>Trên máy hoặc tài khoản của đơn vị</span></div></div>
      <div>${ICON.refund}<div><b>Hoàn tiền ${esc(s.refundDays)} ngày</b><span>Khi phần mềm không chạy đúng mô tả</span></div></div>
    </div>
  </div>
  <section class="section" id="san-pham" style="scroll-margin-top:72px"><div class="wrap">
    <div class="section-head"><div><div class="eyebrow">Sản phẩm</div><h2 style="margin-top:6px">Chọn phần mềm theo công việc</h2></div></div>
    <div class="filters">
      <label class="search">${ICON.search}<input id="q" type="search" placeholder="Tìm: chấm thi, thời khóa biểu, Excel…" aria-label="Tìm phần mềm" value="${esc(S.filter.q)}"></label>
      <div class="chips" role="group" aria-label="Lĩnh vực">${["Tất cả",...cats].map(c=>`<button type="button" class="chip" data-cat="${esc(c)}" aria-pressed="${S.filter.cat===c}">${esc(c)}<span class="n">${c==="Tất cả"?list.length:list.filter(p=>p.category===c).length}</span></button>`).join("")}</div>
    </div>
    <div class="grid" id="grid"></div>
  </div></section>
  <section class="band"><div class="wrap">
    <div><div class="eyebrow">Cách mua</div><h2 style="margin-top:6px">Không cần tài khoản, không thanh toán trên web</h2><p class="muted">Bạn trao đổi trực tiếp, dùng thử trước, chỉ trả tiền khi phần mềm chạy đúng nhu cầu.</p><a href="#cach-mua">Xem chi tiết</a></div>
    <ol class="steps">
      <li><b>Liên hệ</b><span>Nhắn Zalo hoặc email kèm mã sản phẩm và tên đơn vị.</span></li>
      <li><b>Dùng thử</b><span>Nhận link hoặc mã dùng thử ${esc(s.trialDays)} ngày, có hướng dẫn.</span></li>
      <li><b>Báo giá</b><span>Theo quy mô; chuyển khoản theo thông tin gửi riêng.</span></li>
      <li><b>Bàn giao</b><span>Mã kích hoạt hoặc bộ cài trong ${esc(s.deliveryHours)} giờ, kèm xác nhận giấy phép.</span></li>
    </ol></div></section>`;
  renderGrid();
  $("#q").addEventListener("input", e => { S.filter.q = e.target.value; renderGrid(); });
  document.querySelectorAll("[data-cat]").forEach(b => b.onclick = () => {
    S.filter.cat = b.dataset.cat; try { localStorage.setItem("xa-filter", JSON.stringify({cat:S.filter.cat})); } catch(e) {}
    document.querySelectorAll("[data-cat]").forEach(x => x.setAttribute("aria-pressed", String(x===b))); renderGrid();
  });
}
function renderGrid(){
  const q = norm(S.filter.q.trim());
  const list = visible().filter(p => (S.filter.cat==="Tất cả" || p.category===S.filter.cat) &&
    (!q || norm([p.name,p.tagline,p.category,(p.platforms||[]).join(" "),(p.features||[]).map(f=>f.title+" "+f.text).join(" ")].join(" ")).includes(q)));
  $("#grid").innerHTML = list.length ? list.map(cardHTML).join("") :
    `<div class="empty">${visible().length ? `Không có phần mềm khớp. Thử từ khóa khác hoặc <a href="#dat-lam">đặt làm riêng</a>.` : "Chưa có sản phẩm nào được đăng."}</div>`;
}

/* ---------- product ---------- */
function viewProduct(p){
  const s = S.site, imgs = (p.images && p.images.length) ? p.images : [{src:"", caption:"Ảnh minh họa tự tạo. Thêm ảnh chụp màn hình thật trong trang quản trị.", gen:true}];
  const im = i => imgs[i].gen ? genCover(p) : src(imgs[i].src);
  const secs = [["tong-quan","Tổng quan",!!p.description],["tinh-nang","Tính năng",(p.features||[]).length],["bang-gia","Bảng giá",(p.plans||[]).length],["yeu-cau","Yêu cầu hệ thống",(p.requirements||[]).length],["hoi-dap","Hỏi đáp",(p.faq||[]).length],["cap-nhat","Nhật ký cập nhật",(p.changelog||[]).length]].filter(x=>x[2]);
  document.title = `${p.name} · ${s.name}`;
  $("#app").innerHTML = `
  <div class="wrap">
    <nav class="crumbs" aria-label="Đường dẫn"><a href="#">Trang chủ</a><span>/</span><a href="#san-pham">${esc(p.category||"Sản phẩm")}</a><span>/</span><span>${esc(p.name)}</span></nav>
    <div class="p-top">
      <div class="gallery">
        <div class="frame"><div class="frame-bar"><i></i><i></i><i></i><span>${esc(p.name)}</span></div>
          <button type="button" class="main" id="gMain" aria-label="Phóng to ảnh"><img class="shot" id="gImg" src="${esc(im(0))}" alt="${esc(imgs[0].caption||p.name)}"></button></div>
        <div class="caption" id="gCap">${esc(imgs[0].caption||"")}</div>
        ${imgs.length > 1 ? `<div class="thumbs" role="group" aria-label="Ảnh sản phẩm">${imgs.map((x,i)=>`<button type="button" data-i="${i}" aria-current="${i===0}" aria-label="Ảnh ${i+1}"><img src="${esc(im(i))}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}
      </div>
      <div class="p-info">
        <div class="card-meta">${statusPill(p)}${(p.platforms||[]).map(x=>`<span class="pill">${esc(x)}</span>`).join("")}${p.version?`<span class="pill mono">v${esc(p.version)}</span>`:""}</div>
        <h1>${esc(p.name)}</h1>
        <p class="tagline">${esc(p.tagline)}</p>
        ${(p.highlights||[]).filter(Boolean).length ? `<ul class="p-hl">${p.highlights.filter(Boolean).map(h=>`<li>${ICON.check}<span>${esc(h)}</span></li>`).join("")}</ul>` : ""}
        <div class="buybox">
          <div class="price"><b>${esc(fromPrice(p))}</b>${p.updated?`<span class="muted mono">cập nhật ${esc(fmtDate(p.updated))}</span>`:""}</div>
          <div class="row"><button type="button" class="btn btn-primary" data-buy="">Xin dùng thử ${esc(s.trialDays)} ngày</button><a class="btn btn-ghost" href="#bang-gia" data-jump="bang-gia">Xem bảng giá</a></div>
          ${p.demo||p.video ? `<div class="row">${p.demo?`<a class="btn btn-mark" href="${esc(p.demo)}" target="_blank" rel="noopener">Mở bản demo</a>`:""}${p.video?`<a class="btn btn-ghost" href="${esc(p.video)}" target="_blank" rel="noopener">Xem video giới thiệu</a>`:""}</div>`:""}
          <small>Mã sản phẩm <span class="mono">${esc(String(p.id).toUpperCase())}</span> · Phản hồi trong ${esc(s.responseHours)} giờ làm việc · <a href="#giay-phep">Giấy phép sử dụng</a></small>
        </div>
      </div>
    </div>
  </div>
  ${secs.length > 1 ? `<nav class="subnav" aria-label="Mục trong trang"><div class="wrap">${secs.map(x=>`<a href="#${x[0]}" data-jump="${x[0]}">${x[1]}</a>`).join("")}</div></nav>` : ""}
  <div class="wrap">
    ${p.description ? `<section class="p-sec" id="tong-quan"><h2>Tổng quan</h2><div class="prose">${md(p.description)}</div></section>` : ""}
    ${(p.features||[]).length ? `<section class="p-sec" id="tinh-nang"><h2>Tính năng</h2><div class="feats">${p.features.map((f,i)=>`<div class="feat"><div class="ic">${i+1}</div><b>${esc(f.title)}</b><span>${esc(f.text)}</span></div>`).join("")}</div></section>` : ""}
    ${(p.plans||[]).length ? `<section class="p-sec" id="bang-gia"><h2>Bảng giá</h2><div class="plans">${p.plans.map((pl,i)=>`
      <div class="plan${pl.highlight?" hot":""}">${pl.highlight?`<span class="badge">Nên chọn</span>`:""}
        <h3>${esc(pl.name)}</h3><p class="aud">${esc(pl.audience||"")}</p>
        <div class="amt">${planPrice(pl)}${pl.price!==null&&pl.price!==""&&Number(pl.price)>0&&pl.unit?` <small>${esc(pl.unit)}</small>`:""}</div>
        ${(pl.items||[]).length?`<ul>${pl.items.map(x=>`<li>${esc(x)}</li>`).join("")}</ul>`:""}
        <button type="button" class="btn ${pl.highlight?"btn-primary":"btn-ghost"}" data-buy="${i}">${Number(pl.price)===0&&pl.price!==null&&pl.price!==""?"Nhận bản miễn phí":(pl.price===null||pl.price===""?"Nhận báo giá":"Chọn gói này")}</button>
      </div>`).join("")}</div><p class="muted" style="font-size:.86rem;margin-top:14px">Giá chưa gồm chi phí máy chủ, tên miền, khóa AI (nếu có) do đơn vị tự đăng ký. Cần hóa đơn, vui lòng báo trước khi thanh toán.</p></section>` : ""}
    ${(p.requirements||[]).length ? `<section class="p-sec" id="yeu-cau"><h2>Yêu cầu hệ thống</h2><table class="req"><tbody>${p.requirements.map(r=>`<tr><th scope="row">${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`).join("")}</tbody></table></section>` : ""}
    ${(p.faq||[]).length ? `<section class="p-sec" id="hoi-dap"><h2>Hỏi đáp</h2><div class="faq">${p.faq.map(f=>`<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div></section>` : ""}
    ${(p.changelog||[]).length ? `<section class="p-sec" id="cap-nhat"><h2>Nhật ký cập nhật</h2><ul class="log">${p.changelog.map(c=>`<li><div><b>v${esc(c.version)}</b><small>${esc(fmtDate(c.date))}</small></div><span>${esc(c.text)}</span></li>`).join("")}</ul></section>` : ""}
    <div class="final"><div><h2>Thử ${esc(p.name)} trên công việc thật của bạn</h2><p>Dùng thử ${esc(s.trialDays)} ngày, có hướng dẫn cài đặt.</p></div><button type="button" class="btn btn-ghost" data-buy="">Xin dùng thử</button></div>
  </div>`;
  // gallery
  let cur = 0;
  const show = i => { cur = i; $("#gImg").src = im(i); $("#gImg").alt = imgs[i].caption || p.name; $("#gCap").textContent = imgs[i].caption || "";
    document.querySelectorAll(".thumbs button").forEach(b => b.setAttribute("aria-current", String(+b.dataset.i===i))); };
  document.querySelectorAll(".thumbs button").forEach(b => b.onclick = () => show(+b.dataset.i));
  $("#gMain").onclick = () => lightbox(imgs.map((x,i)=>({src:im(i), caption:x.caption})), cur);
  document.querySelectorAll("[data-buy]").forEach(b => b.onclick = () => buy(p, b.dataset.buy === "" ? null : p.plans[+b.dataset.buy]));
  document.querySelectorAll("[data-jump]").forEach(a => a.onclick = e => { e.preventDefault(); const t = document.getElementById(a.dataset.jump); if (t) t.scrollIntoView(); });
}

/* ---------- dialogs ---------- */
function dialog(html, cls){
  const d = document.createElement("dialog"); if (cls) d.className = cls; d.innerHTML = html; document.body.appendChild(d);
  d.addEventListener("close", () => d.remove()); d.addEventListener("click", e => { if (e.target === d) d.close(); });
  d.querySelectorAll("[data-close]").forEach(b => b.onclick = () => d.close());
  d.showModal(); return d;
}
function lightbox(list, i){
  const d = dialog(`<img alt=""><div class="lb-bar"><span class="cap"></span><span style="display:flex;gap:8px">${list.length>1?`<button type="button" class="copybtn" data-p="-1">← Trước</button><button type="button" class="copybtn" data-p="1">Sau →</button>`:""}<button type="button" class="copybtn" data-close>Đóng</button></span></div>`, "lightbox");
  const set = k => { i = (k + list.length) % list.length; d.querySelector("img").src = list[i].src; d.querySelector(".cap").textContent = list[i].caption || ""; };
  d.querySelectorAll("[data-p]").forEach(b => b.onclick = () => set(i + +b.dataset.p));
  d.addEventListener("keydown", e => { if (e.key==="ArrowRight") set(i+1); if (e.key==="ArrowLeft") set(i-1); });
  set(i);
}
function buy(p, plan){
  const s = S.site, code = String(p.id).toUpperCase();
  const what = plan ? `gói "${plan.name}" của "${p.name}"` : `"${p.name}"`;
  const msg = `Chào bạn, mình ở [tên đơn vị]. Mình muốn ${plan && Number(plan.price)>0 ? "mua" : "dùng thử / nhận báo giá"} ${what} (mã ${code}).`;
  const z = zalo();
  let pay = "";
  if (s.mode === "order" && plan && Number(plan.price) > 0 && s.bank && s.bank.account) {
    const qr = `https://img.vietqr.io/image/${encodeURIComponent(s.bank.bin)}-${encodeURIComponent(s.bank.account)}-compact2.png?amount=${Number(plan.price)}&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(s.bank.holder)}`;
    pay = `<img class="qr" src="${qr}" alt="Mã VietQR chuyển khoản ${vnd(plan.price)}"><div class="copyline">Nội dung chuyển khoản:<code>${esc(code)} + số điện thoại</code></div>`;
  }
  dialog(`<div class="dlg">
    <div class="dlg-head"><div><div class="eyebrow">${esc(p.name)}</div><h3 style="margin-top:4px">${plan ? esc(plan.name) + " · " + planPrice(plan) : "Xin dùng thử hoặc nhận báo giá"}</h3></div><button type="button" class="x" data-close aria-label="Đóng">×</button></div>
    ${pay || `<p style="margin:0">Gửi tin nhắn dưới đây qua Zalo hoặc email. ${esc(s.owner)} phản hồi trong ${esc(s.responseHours)} giờ làm việc và gửi link, mã dùng thử hoặc báo giá.</p>`}
    <div class="copyline"><code>${esc(msg)}</code><button type="button" class="copybtn" data-copy="${esc(msg)}">Sao chép</button></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      ${z ? `<a class="btn btn-primary" href="${z}" target="_blank" rel="noopener">Mở Zalo</a>` : ""}
      <a class="btn ${z?"btn-ghost":"btn-primary"}" href="mailto:${esc(s.email)}?subject=${encodeURIComponent((plan?"Mua ":"Dùng thử ")+code)}&body=${encodeURIComponent(msg)}">Gửi email</a>
    </div>
    <div class="copyline muted">Email: <code>${esc(s.email)}</code><button type="button" class="copybtn" data-copy="${esc(s.email)}">Sao chép</button></div>
    ${s.zalo ? `<div class="copyline muted">Zalo: <code>${esc(s.zalo)}</code><button type="button" class="copybtn" data-copy="${esc(s.zalo)}">Sao chép</button></div>` : ""}
  </div>`);
}

/* ---------- text pages ---------- */
function tabs(cur){ return `<div class="tabs">${[["giay-phep","Giấy phép sử dụng"],["bao-mat","Bảo mật"],["hoan-tien","Bảo hành & hoàn tiền"]].map(([h,l])=>`<a href="#${h}"${h===cur?' aria-current="page"':""}>${l}</a>`).join("")}</div>`; }
const PAGES = {
  "dat-lam": s => `<h1>Làm phần mềm theo yêu cầu</h1>
    <p class="lead">Có một việc lặp đi lặp lại trên Excel, giấy tờ, Zalo? Gửi mô tả, bạn nhận đề xuất cách làm và báo giá.</p>
    <ul class="svc"><li><b>Công cụ nội bộ</b><span>Tra cứu, biểu mẫu, quản lý danh sách, duyệt hồ sơ.</span></li><li><b>Tự động hóa Excel</b><span>Công thức, menu, macro; xuất đúng mẫu đơn vị.</span></li><li><b>Web app cho dịch vụ</b><span>Đặt lịch, đăng ký, theo dõi tiến độ cho khách hàng.</span></li><li><b>Ứng dụng Windows</b><span>Chạy trên máy tính, không cần mạng.</span></li></ul>
    <h2>Quy trình</h2><ol><li>Gửi mô tả công việc, mẫu biểu đang dùng (đã che dữ liệu cá nhân).</li><li>Nhận đề xuất: chức năng, nơi lưu dữ liệu, so sánh phương án, thời gian, báo giá.</li><li>Xem bản mẫu bấm thử được trước khi làm bản hoàn chỉnh.</li><li>Bàn giao, hướng dẫn, bảo hành sửa lỗi theo thỏa thuận.</li></ol>
    <h2>Quyền với phần mềm đặt làm</h2><p>Hai bên thỏa thuận bằng văn bản: bên đặt nhận toàn quyền mã nguồn, hoặc chỉ quyền sử dụng (giá thấp hơn, người làm được dùng lại phần chung).</p>
    <p><a class="btn btn-primary" href="#lien-he">Gửi yêu cầu</a></p>`,
  "cach-mua": s => `<h1>Cách dùng thử và mua</h1><p class="lead">Website chỉ giới thiệu sản phẩm. Dùng thử, báo giá và thanh toán thực hiện qua trao đổi trực tiếp.</p>
    <h2>1. Liên hệ</h2><p>Mở trang sản phẩm, bấm "Xin dùng thử" để lấy tin nhắn mẫu có mã sản phẩm, gửi qua Zalo hoặc email.</p>
    <h2>2. Dùng thử</h2><p>Nhận link hoặc mã dùng thử ${esc(s.trialDays)} ngày. Hết hạn, dữ liệu vẫn nằm trên máy bạn; nhập mã chính thức là dùng tiếp.</p>
    <h2>3. Báo giá và thanh toán</h2><p>Báo giá ghi rõ gói, thời hạn, phạm vi sử dụng. Chuyển khoản theo thông tin gửi riêng, nội dung ghi mã sản phẩm. Cần hóa đơn, vui lòng báo trước khi thanh toán.</p>
    <h2>4. Bàn giao</h2><p>Trong ${esc(s.deliveryHours)} giờ sau khi nhận tiền: mã kích hoạt hoặc bộ cài, hướng dẫn sử dụng, xác nhận giấy phép. Sản phẩm cần máy chủ được cài lên tài khoản của đơn vị.</p>`,
  "giay-phep": s => `<h1>Giấy phép sử dụng phần mềm</h1><p class="lead">Cập nhật ${esc(s.updated)}.</p>${tabs("giay-phep")}
    <h2>1. Bên cung cấp</h2><p>${esc(s.owner)}, mã số thuế ${esc(s.taxCode)}, ${esc(s.area)}. Liên hệ: ${esc(s.email)}, ${esc(s.phone)}.</p>
    <h2>2. Bạn nhận được gì</h2><p>Quyền sử dụng phần mềm theo gói đã mua: phạm vi (một đơn vị, một máy hoặc một người) và thời hạn (theo năm, theo đợt hoặc vĩnh viễn) ghi trong xác nhận giấy phép. Quyền tác giả và mã nguồn vẫn thuộc bên cung cấp, trừ khi có thỏa thuận khác bằng văn bản.</p>
    <h2>3. Không được làm</h2><ul><li>Bán lại, cho thuê, chia sẻ mã kích hoạt hoặc bộ cài cho đơn vị khác.</li><li>Dịch ngược, sửa đổi để gỡ cơ chế kích hoạt hay dùng thử.</li><li>Dùng phần mềm cho mục đích trái pháp luật.</li></ul>
    <h2>4. Dùng thử</h2><p>Bản dùng thử có đủ tính năng trong ${esc(s.trialDays)} ngày, trừ khi trang sản phẩm ghi khác. Hết hạn, phần mềm khóa thao tác nhưng không xóa dữ liệu.</p>
    <h2>5. Cập nhật và hỗ trợ</h2><p>Gói theo năm: cập nhật và hỗ trợ trong thời hạn. Gói vĩnh viễn: dùng mãi phiên bản đã mua, kèm 12 tháng cập nhật.</p>
    <h2>6. Dữ liệu</h2><p>Dữ liệu bạn nhập thuộc về bạn. Bạn chịu trách nhiệm sao lưu định kỳ theo hướng dẫn của từng phần mềm.</p>
    <h2>7. Giới hạn trách nhiệm</h2><p>Phần mềm được kiểm thử như mô tả nhưng không cam kết hoàn toàn không có lỗi. Kết quả quan trọng (điểm thi, hồ sơ) cần người có thẩm quyền rà soát trước khi dùng. Trách nhiệm bồi thường không vượt số tiền đã trả cho gói liên quan, trừ trường hợp pháp luật quy định khác. Điều khoản này không làm mất quyền của người tiêu dùng theo pháp luật Việt Nam.</p>
    <h2>8. Thành phần bên thứ ba</h2><p>Một số phần mềm dùng thư viện mã nguồn mở; danh sách và giấy phép đi kèm bộ cài. Dịch vụ bên ngoài (máy chủ, AI) do đơn vị tự đăng ký áp dụng điều khoản của nhà cung cấp đó.</p>`,
  "bao-mat": s => `<h1>Chính sách bảo mật</h1><p class="lead">Cập nhật ${esc(s.updated)}. Áp dụng theo Luật Bảo vệ dữ liệu cá nhân 2025.</p>${tabs("bao-mat")}
    <h2>Website này</h2><p>Không có form đăng ký, không dùng cookie theo dõi hay công cụ thống kê. Trình duyệt chỉ ghi nhớ lĩnh vực bạn đã lọc, lưu trên máy bạn.</p>
    <h2>Khi bạn liên hệ, mua</h2><p>${esc(s.owner)} nhận được: tên, tên đơn vị, số điện thoại hoặc email, nội dung trao đổi, thông tin chuyển khoản. Chỉ dùng để tư vấn, cấp giấy phép, hỗ trợ, xuất hóa đơn và xử lý khiếu nại; không bán, không chia sẻ, không gửi quảng cáo khi chưa được đồng ý. Thông tin giao dịch lưu tối đa 3 năm cho nghĩa vụ thuế, sau đó xóa.</p>
    <h2>Dữ liệu trong phần mềm</h2><p>Trang mỗi sản phẩm ghi rõ nơi lưu dữ liệu. Bên cung cấp không giữ bản sao dữ liệu học sinh, nhân viên của bạn; khi hỗ trợ chỉ truy cập khi bạn đồng ý và trong phạm vi cần thiết.</p>
    <h2>Dữ liệu trẻ em</h2><p>Sản phẩm dành cho học sinh tiểu học không thu họ tên, ảnh của trẻ. Đơn vị dùng phần mềm có dữ liệu học sinh chịu trách nhiệm có sự đồng ý của cha mẹ hoặc người đại diện khi pháp luật yêu cầu.</p>
    <h2>Tính năng AI</h2><p>Chỉ bật khi đơn vị tự gắn khóa API của nhà cung cấp AI. Phần mềm ghi rõ dữ liệu nào được gửi đi; kết quả AI cần người kiểm tra lại.</p>
    <h2>Quyền của bạn</h2><p>Yêu cầu xem, sửa, xóa dữ liệu, rút lại đồng ý: gửi tới ${esc(s.email)}; phản hồi trong ${esc(s.responseHours)} giờ làm việc.</p>`,
  "hoan-tien": s => `<h1>Bảo hành, hoàn tiền, khiếu nại</h1><p class="lead">Cập nhật ${esc(s.updated)}.</p>${tabs("hoan-tien")}
    <h2>Bảo hành</h2><p>Sửa lỗi miễn phí trong thời hạn giấy phép. Lỗi làm sai kết quả (điểm, tính toán) được ưu tiên xử lý trong 2 ngày làm việc.</p>
    <h2>Hoàn tiền 100% trong ${esc(s.refundDays)} ngày khi</h2><ol><li>Phần mềm không chạy được trên máy đáp ứng yêu cầu ghi ở trang sản phẩm và không khắc phục được.</li><li>Phần mềm khác với mô tả.</li><li>Đã thanh toán nhưng không được bàn giao sau ${esc(s.deliveryHours)} giờ.</li><li>Thanh toán trùng.</li></ol>
    <h2>Không hoàn tiền khi</h2><p>Đổi ý sau khi đã kích hoạt mà phần mềm chạy đúng mô tả. Vì vậy hãy dùng thử trước khi mua.</p>
    <h2>Gửi yêu cầu</h2><p>Gửi tới ${esc(s.email)} hoặc ${esc(s.phone)}: mã sản phẩm, thời gian thanh toán, mô tả lỗi kèm ảnh chụp. Phản hồi trong ${esc(s.responseHours)} giờ làm việc; hoàn tiền về đúng tài khoản đã chuyển trong 5 ngày làm việc sau khi xác nhận.</p>
    <h2>Giải quyết tranh chấp</h2><p>Ưu tiên thương lượng. Nếu không thống nhất, bạn có thể gửi yêu cầu tới cơ quan bảo vệ quyền lợi người tiêu dùng hoặc tòa án theo pháp luật Việt Nam.</p>`,
  "lien-he": s => `<h1>Liên hệ</h1><p class="lead">Xin dùng thử, nhận báo giá, đặt làm phần mềm riêng, báo lỗi.</p>
    <dl class="contact">
      <div><dt>Người bán</dt><dd>${esc(s.owner)}</dd></div>
      <div><dt>Mã số thuế</dt><dd class="mono">${esc(s.taxCode)}</dd></div>
      <div><dt>Email</dt><dd class="copyline"><code>${esc(s.email)}</code><button type="button" class="copybtn" data-copy="${esc(s.email)}">Sao chép</button></dd></div>
      <div><dt>Điện thoại</dt><dd class="copyline"><code>${esc(s.phone)}</code><button type="button" class="copybtn" data-copy="${esc(s.phone)}">Sao chép</button></dd></div>
      ${s.zalo ? `<div><dt>Zalo</dt><dd><a class="btn btn-primary" href="${zalo()}" target="_blank" rel="noopener">Nhắn Zalo</a></dd></div>` : ""}
      <div><dt>Khu vực</dt><dd>${esc(s.area)}</dd></div>
    </dl><p class="muted">Phản hồi trong ${esc(s.responseHours)} giờ làm việc.</p>`
};

/* ---------- router ---------- */
function route(){
  const h = decodeURIComponent(location.hash.replace("#","")) ;
  if (h === "preview") return;
  const nav = h.startsWith("sp-") || h === "san-pham" || h === "" ? "san-pham" : (["giay-phep","bao-mat","hoan-tien"].includes(h) ? "chinh-sach" : h);
  document.querySelectorAll("[data-nav]").forEach(a => a.dataset.nav===nav && h!=="" ? a.setAttribute("aria-current","page") : a.removeAttribute("aria-current"));
  document.title = S.site.name || "Cửa hàng phần mềm";
  if (h === "san-pham" || ["tong-quan","tinh-nang","bang-gia","yeu-cau","hoi-dap","cap-nhat"].includes(h)) {
    if (["tong-quan","tinh-nang","bang-gia","yeu-cau","hoi-dap","cap-nhat"].includes(h) && document.getElementById(h)) { document.getElementById(h).scrollIntoView(); return; }
    if (!$("#grid")) viewHome(); const t = $("#san-pham"); if (t) t.scrollIntoView(); return;
  }
  if (h.startsWith("sp-")) {
    const p = visible().find(x => x.id === h.slice(3));
    if (p) viewProduct(p); else $("#app").innerHTML = `<div class="wrap page"><h1>Không tìm thấy sản phẩm</h1><p><a href="#san-pham">Xem tất cả sản phẩm</a></p></div>`;
  } else if (PAGES[h]) $("#app").innerHTML = `<div class="wrap page">${PAGES[h](S.site)}</div>`;
  else viewHome();
  window.scrollTo(0,0);
}

async function boot(){
  if (location.hash === "#preview") {
    S.preview = true;
    addEventListener("message", e => {
      const d = e.data; if (!d || d.type !== "xa-preview") return;
      S.site = d.site; S.products = d.products; S.overrides = d.overrides || {}; shell();
      if (d.product) viewProduct(d.product); else viewHome();
    });
    if (parent !== window) parent.postMessage({type:"xa-ready"}, "*");
    return;
  }
  try {
    const opt = { cache:"no-cache" };
    const [site, products] = await Promise.all([fetch("data/site.json",opt).then(r=>r.json()), fetch("data/products.json",opt).then(r=>r.json())]);
    S.site = site; S.products = Array.isArray(products) ? products : [];
  } catch(e) {
    $("#app").innerHTML = `<div class="wrap loading">Không tải được dữ liệu cửa hàng. Kiểm tra tệp data/site.json và data/products.json, rồi tải lại trang.</div>`; return;
  }
  shell(); addEventListener("hashchange", route); route();
}
window.XAStore = { genCover, fromPrice, planPrice, esc };
boot();
})();
