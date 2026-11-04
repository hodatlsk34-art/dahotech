/* HodaTech — cửa hàng đọc data/site.json + data/products.json rồi dựng trang.
   Giữ nguyên schema dữ liệu, mã sản phẩm, đường dẫn (#sp-<id>, #san-pham, chính sách) và chế độ xem trước cho trang quản trị. */
(function(){
"use strict";
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase();
const vnd = n => Number(n).toLocaleString("vi-VN") + "đ";
const fmtDate = d => { if(!d) return ""; const m = String(d).match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[3]}/${m[2]}/${m[1]}` : d; };
const isNum = x => x !== null && x !== "" && x !== undefined && !isNaN(Number(x));

const S = { site:{}, products:[], overrides:{}, preview:false,
  filter:{ q:"", cats:[], plats:[], price:"all", sort:"noi-bat" } };
try { const f = JSON.parse(localStorage.getItem("xa-filter")||"{}"); if (Array.isArray(f.cats)) S.filter.cats = f.cats; else if (f.cat && f.cat !== "Tất cả") S.filter.cats = [f.cat]; if (f.sort) S.filter.sort = f.sort; } catch(e) {}
const saveFilter = () => { try { localStorage.setItem("xa-filter", JSON.stringify({ cats:S.filter.cats, sort:S.filter.sort })); } catch(e) {} };

/* ---------- icons (nét 2px) ---------- */
const sv = (d, extra="") => `<svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
const I = {
  search: sv('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>'),
  chat: sv('<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M8 9h8M8 13h5"/>'),
  menu: sv('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  chev: sv('<path d="m6 9 6 6 6-6"/>','style="width:14px;height:14px"').replace('class="ic"','class="ic chev"'),
  arrow: sv('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  check: sv('<path d="m5 12.5 4.5 4.5L19 7.5"/>'),
  bag: sv('<path d="M6 7h12l1 13H5z"/><path d="M9 7a3 3 0 0 1 6 0"/>'),
  code: sv('<path d="m8 7-5 5 5 5M16 7l5 5-5 5M14 4l-4 16"/>'),
  box: sv('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
  timer: sv('<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2M9 2h6"/>'),
  reply: sv('<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><path d="M12 7v4h3"/>'),
  shield: sv('<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/><path d="m9 12 2 2 4-4"/>'),
  refund: sv('<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>'),
  cap: sv('<path d="m2 9 10-5 10 5-10 5z"/><path d="M6 11v5c0 1.5 3 3 6 3s6-1.5 6-3v-5M22 9v6"/>'),
  spark: sv('<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8"/>'),
  brief: sv('<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18"/>'),
  store: sv('<path d="M3 9 5 4h14l2 5M4 9v11h16V9M3 9h18M9 20v-6h6v6"/>'),
  grid: sv('<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>'),
  cube: sv('<path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="m3 8 9 5 9-5M12 13v8"/>'),
  user: sv('<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>'),
  heart: sv('<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21.2l8.8-8.8a5.5 5.5 0 0 0 0-7.8z"/>'),
  doc: sv('<path d="M14 3H6v18h12V7z"/><path d="M14 3v4h4M9 13h6M9 17h4"/>'),
  play: sv('<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>'),
  filter: sv('<path d="M3 5h18l-7 8v6l-4 2v-8z"/>'),
  wand: sv('<path d="m15 4 5 5L9 20H4v-5z"/><path d="m13 6 5 5"/>'),
  flow: sv('<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M6 9v4a2 2 0 0 0 2 2h7"/>'),
  win: sv('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>'),
  x: sv('<path d="M6 6l12 12M18 6 6 18"/>')
};
const logo = `<span class="brand-mark" aria-hidden="true"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7 5v14M17 5v14M7 12h10"/></svg></span>`;
function catStyle(name){
  const n = norm(name);
  if (/\bai\b|tri tue/.test(n)) return { icon:I.spark, c:"#7C3AED", bg:"#F3E8FF" };
  if (/giao duc|hoc|truong/.test(n)) return { icon:I.cap, c:"#2563EB", bg:"#EFF6FF" };
  if (/quan tri|van phong|nhan su/.test(n)) return { icon:I.brief, c:"#0891B2", bg:"#ECFEFF" };
  if (/kinh doanh|dich vu|ban hang/.test(n)) return { icon:I.store, c:"#EA580C", bg:"#FFF7ED" };
  if (/web/.test(n)) return { icon:I.grid, c:"#4F46E5", bg:"#EEF2FF" };
  if (/tien ich|cong cu/.test(n)) return { icon:I.cube, c:"#16A34A", bg:"#F0FDF4" };
  return { icon:I.code, c:"#DB2777", bg:"#FDF2F8" };
}

/* ---------- data helpers ---------- */
const src = s => S.overrides[s] || s;
function genCover(p, phone){
  const t = p.tint || "#2563EB", name = esc(p.name || "Sản phẩm mới");
  const W = phone ? 540 : 1600, H = phone ? 1080 : 1000;
  const bars = [0.42,0.66,0.5,0.82,0.6,0.92,0.72].map((h,i) => phone
    ? `<rect x="${60+i*62}" y="${720-h*200}" width="34" height="${h*200}" rx="8" fill="${i%2?"#06B6D4":t}" fill-opacity="${i%2?.75:.9}"/>`
    : `<rect x="${560+i*86}" y="${780-h*230}" width="46" height="${h*230}" rx="9" fill="${i%2?"#06B6D4":t}" fill-opacity="${i%2?.75:.9}"/>`).join("");
  const svg = phone
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#F5F8FC"/><rect width="${W}" height="150" fill="${t}"/><text x="40" y="100" font-family="Segoe UI,Arial" font-size="40" font-weight="700" fill="#fff">${name.slice(0,18)}</text><g fill="#fff"><rect x="40" y="190" width="215" height="150" rx="22"/><rect x="285" y="190" width="215" height="150" rx="22"/><rect x="40" y="370" width="460" height="380" rx="22"/><rect x="40" y="780" width="460" height="110" rx="22"/><rect x="40" y="910" width="460" height="110" rx="22"/></g><circle cx="95" cy="245" r="22" fill="${t}" fill-opacity=".15"/><circle cx="340" cy="245" r="22" fill="#06B6D4" fill-opacity=".2"/><rect x="70" y="285" width="120" height="16" rx="8" fill="#CBD5E1"/><rect x="315" y="285" width="120" height="16" rx="8" fill="#CBD5E1"/>${bars}<rect x="70" y="820" width="260" height="16" rx="8" fill="#CBD5E1"/><rect x="70" y="850" width="180" height="14" rx="7" fill="#E2E8F0"/><rect x="70" y="950" width="300" height="16" rx="8" fill="#CBD5E1"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}"><rect width="${W}" height="${H}" fill="#F5F8FC"/><rect width="300" height="${H}" fill="#fff"/><rect x="40" y="44" width="44" height="44" rx="12" fill="${t}"/><text x="100" y="76" font-family="Segoe UI,Arial" font-size="28" font-weight="700" fill="#172554">${name.slice(0,14)}</text>${[0,1,2,3,4,5].map(i=>`<rect x="40" y="${150+i*64}" width="${i===0?220:170}" height="40" rx="10" fill="${i===0?t:"#EEF4FF"}" fill-opacity="${i===0?.12:1}"/>`).join("")}<rect x="340" y="40" width="1220" height="70" rx="16" fill="#fff"/><text x="372" y="86" font-family="Segoe UI,Arial" font-size="30" font-weight="700" fill="#172554">${name}</text>${[0,1,2,3].map(i=>`<rect x="${340+i*310}" y="140" width="290" height="150" rx="18" fill="#fff"/><circle cx="${390+i*310}" cy="192" r="24" fill="${i%2?"#06B6D4":t}" fill-opacity=".16"/><rect x="${370+i*310}" y="236" width="150" height="16" rx="8" fill="#CBD5E1"/><rect x="${440+i*310}" y="180" width="90" height="24" rx="8" fill="#172554" fill-opacity=".85"/>`).join("")}<rect x="340" y="320" width="800" height="520" rx="18" fill="#fff"/><rect x="380" y="356" width="220" height="20" rx="10" fill="#172554" fill-opacity=".8"/>${bars}<rect x="1170" y="320" width="390" height="520" rx="18" fill="#fff"/><circle cx="1365" cy="520" r="110" fill="none" stroke="${t}" stroke-width="34" stroke-dasharray="460 700" transform="rotate(-90 1365 520)"/><circle cx="1365" cy="520" r="110" fill="none" stroke="#06B6D4" stroke-width="34" stroke-dasharray="200 700" stroke-dashoffset="-460" transform="rotate(-90 1365 520)"/>${[0,1,2].map(i=>`<rect x="1210" y="${690+i*44}" width="${260-i*50}" height="16" rx="8" fill="#E2E8F0"/>`).join("")}<rect x="340" y="870" width="1220" height="100" rx="18" fill="#fff"/></svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}
const hasImg = p => p.images && p.images.length;
const cover = p => hasImg(p) ? src(p.images[0].src) : genCover(p);
function md(text){
  const blocks = String(text||"").trim().split(/\n\s*\n/);
  const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g,"<b>$1</b>");
  return blocks.filter(Boolean).map(b => {
    const lines = b.split("\n");
    if (lines.every(l => /^\s*[-•]\s+/.test(l))) return "<ul>" + lines.map(l=>`<li>${inline(l.replace(/^\s*[-•]\s+/,""))}</li>`).join("") + "</ul>";
    return `<p>${lines.map(inline).join("<br>")}</p>`;
  }).join("");
}
const planPrice = pl => !isNum(pl.price) ? "Liên hệ" : (Number(pl.price) === 0 ? "Miễn phí" : vnd(pl.price));
function fromPrice(p){
  const v = (p.plans||[]).map(x => x.price);
  if (!v.length) return "Liên hệ báo giá";
  const paid = v.filter(x => isNum(x) && Number(x) > 0).map(Number);
  if (v.every(x => isNum(x) && Number(x) === 0)) return "Miễn phí";
  if (paid.length) return "Từ " + vnd(Math.min(...paid));
  return v.some(x => !isNum(x)) ? "Liên hệ báo giá" : "Miễn phí";
}
const priceClass = p => { const t = fromPrice(p); return /^Từ/.test(t) ? "" : (/Miễn phí/.test(t) ? "free" : "ask"); };
const minPaid = p => { const v = (p.plans||[]).map(x=>x.price).filter(x => isNum(x) && Number(x) > 0).map(Number); return v.length ? Math.min(...v) : Infinity; };
const hasFree = p => (p.plans||[]).some(x => isNum(x.price) && Number(x.price) === 0);
const statusPill = p => p.status === "beta" ? `<span class="pill beta">Thử nghiệm</span>` : `<span class="pill live">Đang dùng thực tế</span>`;
const visible = () => S.products.filter(p => p.published !== false);
const usedCats = () => (S.site.categories||[]).concat(visible().map(p=>p.category).filter(c => c && !(S.site.categories||[]).includes(c))).filter((c,i,a) => a.indexOf(c)===i && visible().some(p => p.category === c));
const zalo = () => S.site.zalo ? "https://zalo.me/" + String(S.site.zalo).replace(/\D/g,"") : "";
const isRecent = p => { if (!p.updated) return false; const d = new Date(p.updated); if (isNaN(d) || (Date.now() - d) >= 30*864e5) return false;
  const newest = visible().filter(x => x.updated).sort((a,b) => String(b.updated).localeCompare(String(a.updated))).slice(0,2);
  return newest.includes(p); };

function toast(msg){ const t=document.createElement("div"); t.className="toast"; t.setAttribute("role","status"); t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),2200); }
document.addEventListener("click", e => {
  const b = e.target.closest("[data-copy]"); if (!b) return;
  const fallback = () => { const c = b.previousElementSibling; if (c){ const r=document.createRange(); r.selectNodeContents(c); const s=getSelection(); s.removeAllRanges(); s.addRange(r); } toast("Đã chọn sẵn, nhấn Ctrl+C để sao chép"); };
  try { navigator.clipboard.writeText(b.dataset.copy).then(()=>toast("Đã sao chép"), fallback); } catch(err) { fallback(); }
});
document.addEventListener("click", e => {   // liên kết lọc theo danh mục
  const a = e.target.closest("[data-setcat]"); if (!a) return;
  S.filter.cats = a.dataset.setcat ? [a.dataset.setcat] : []; S.filter.q = ""; saveFilter();
  closeDrawer(); $$(".dd.open").forEach(d => d.classList.remove("open"));
  if (location.hash === "#san-pham") { e.preventDefault(); viewCatalog(); window.scrollTo(0,0); }
});

/* ---------- shell ---------- */
function shell(){
  const s = S.site, cats = usedCats();
  const catLinks = `<a href="#san-pham" data-setcat="">Tất cả sản phẩm <span>${visible().length}</span></a>` + cats.map(c => `<a href="#san-pham" data-setcat="${esc(c)}">${esc(c)} <span>${visible().filter(p=>p.category===c).length}</span></a>`).join("");
  $("#top").innerHTML = `<div class="wrap">
    <a class="brand" href="#" aria-label="${esc(s.name)} – Trang chủ">${logo}<b>${esc(s.name)}</b></a>
    <nav class="nav" aria-label="Điều hướng chính">
      <a href="#" data-nav="home">Trang chủ</a>
      <div class="dd"><button type="button" data-nav="san-pham" aria-expanded="false" aria-haspopup="true">Sản phẩm ${I.chev}</button><div class="dd-menu">${catLinks}</div></div>
      <a href="#giai-phap" data-nav="giai-phap">Giải pháp</a>
      <a href="#dat-lam" data-nav="dat-lam">Đặt làm riêng</a>
      <a href="#lien-he" data-nav="lien-he">Liên hệ</a>
    </nav>
    <div class="tools">
      <button type="button" class="iconbtn" id="sBtn" aria-label="Tìm sản phẩm">${I.search}</button>
      <button type="button" class="btn btn-primary btn-sm" id="trialBtn">${I.play} Dùng thử miễn phí</button>
      <button type="button" class="iconbtn menu-btn" id="mBtn" aria-label="Mở menu" aria-expanded="false">${I.menu}</button>
    </div></div>`;
  $("#drawer").innerHTML = `<div class="scrim" data-close-drawer></div><nav aria-label="Menu">
    <div class="dhead"><a class="brand" href="#">${logo}<b>${esc(s.name)}</b></a><button type="button" class="iconbtn" data-close-drawer aria-label="Đóng menu">${I.x}</button></div>
    <a href="#">Trang chủ</a><a href="#san-pham" data-setcat="">Sản phẩm</a>
    ${cats.map(c => `<a class="sub" href="#san-pham" data-setcat="${esc(c)}">${esc(c)} <span>${visible().filter(p=>p.category===c).length}</span></a>`).join("")}
    <a href="#giai-phap">Giải pháp</a><a href="#dat-lam">Đặt làm riêng</a><a href="#cach-mua">Cách mua</a><a href="#lien-he">Liên hệ</a>
    <a href="#giay-phep">Chính sách</a></nav>`;
  const dd = $(".dd"), ddb = $(".dd>button");
  ddb.onclick = () => { const o = !dd.classList.contains("open"); dd.classList.toggle("open", o); ddb.setAttribute("aria-expanded", String(o)); };
  dd.addEventListener("mouseenter", () => { if (matchMedia("(hover:hover)").matches) { dd.classList.add("open"); ddb.setAttribute("aria-expanded","true"); } });
  dd.addEventListener("mouseleave", () => { dd.classList.remove("open"); ddb.setAttribute("aria-expanded","false"); });
  document.addEventListener("click", e => { if (!e.target.closest(".dd")) { dd.classList.remove("open"); ddb.setAttribute("aria-expanded","false"); } });
  $("#mBtn").onclick = () => { $("#drawer").classList.add("open"); $("#mBtn").setAttribute("aria-expanded","true"); };
  $$("[data-close-drawer]").forEach(b => b.onclick = closeDrawer);
  $$("#drawer a").forEach(a => a.addEventListener("click", closeDrawer));
  $("#sBtn").onclick = searchDialog;
  $("#trialBtn").onclick = () => contactDialog("Xin dùng thử miễn phí", `Chào bạn, mình ở [tên đơn vị]. Mình muốn dùng thử [tên phần mềm] trong ${S.site.trialDays} ngày.`, "Xin dùng thử", `<p>Ghi tên phần mềm bạn quan tâm (xem ở <a href="#san-pham" data-setcat="" data-close>trang Sản phẩm</a>), rồi gửi qua Zalo hoặc email. ${esc(S.site.owner)} gửi link hoặc mã dùng thử trong ${esc(S.site.responseHours)} giờ làm việc.</p>`);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });

  $("#foot").innerHTML = `<div class="wrap">
    <div><a class="brand" href="#">${logo}<b>${esc(s.name)}</b></a>
      <p class="about">${esc(s.slogan||"")}</p>
      <p class="about">Người bán: ${esc(s.owner)} · MST ${esc(s.taxCode)}<br>${esc(s.area)}<br>${esc(s.email)} · ${esc(s.phone)}</p>
      ${s.badgeHtml ? `<div style="margin-top:14px">${s.badgeHtml}</div>` : ""}</div>
    <div><h4>Sản phẩm</h4><ul><li><a href="#san-pham" data-setcat="">Tất cả sản phẩm</a></li>${cats.slice(0,5).map(c=>`<li><a href="#san-pham" data-setcat="${esc(c)}">${esc(c)}</a></li>`).join("")}</ul></div>
    <div><h4>Hỗ trợ</h4><ul><li><a href="#cach-mua">Cách dùng thử và mua</a></li><li><a href="#dat-lam">Đặt làm phần mềm riêng</a></li><li><a href="#giai-phap">Giải pháp theo nhu cầu</a></li><li><a href="#lien-he">Liên hệ</a></li></ul></div>
    <div><h4>Chính sách</h4><ul><li><a href="#giay-phep">Giấy phép sử dụng</a></li><li><a href="#bao-mat">Bảo mật</a></li><li><a href="#hoan-tien">Bảo hành, hoàn tiền</a></li></ul></div>
    <div class="legal"><span>© ${new Date().getFullYear()} ${esc(s.name)}. Sản phẩm do ${esc(s.owner)} tự nghiên cứu và phát triển.</span><span>Website giới thiệu sản phẩm; mua và thanh toán qua liên hệ trực tiếp.</span></div>
  </div>`;
}
function closeDrawer(){ const d = $("#drawer"); if (d) d.classList.remove("open"); const b = $("#mBtn"); if (b) b.setAttribute("aria-expanded","false"); }

/* ---------- cards ---------- */
function cardHTML(p){
  const badge = p.featured ? `<span class="badge hot">Nổi bật</span>` : isRecent(p) ? `<span class="badge new">Mới cập nhật</span>` : (hasFree(p) ? `<span class="badge free">Có bản miễn phí</span>` : "");
  return `<a class="card" href="#sp-${esc(p.id)}">
    <div class="media"><img src="${esc(cover(p))}" alt="Giao diện ${esc(p.name)}" loading="lazy" width="800" height="500">${badge ? `<div class="badges">${badge}</div>` : ""}</div>
    <div class="body">
      <div class="meta">${statusPill(p)}${(p.platforms||[]).slice(0,1).map(x=>`<span class="pill gray">${esc(x)}</span>`).join("")}</div>
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.tagline)}</p>
      <div class="foot"><span class="price-tag ${priceClass(p)}">${esc(fromPrice(p))}</span><span class="go">Chi tiết ${I.arrow}</span></div>
    </div></a>`;
}
const emptyBox = (title, text, cta) => `<div class="empty"><div class="tile">${I.box}</div><b>${title}</b><span class="muted">${text}</span>${cta||""}</div>`;

/* ---------- home ---------- */
function viewHome(){
  const s = S.site, list = visible(), cats = usedCats();
  const feat = list.find(p => p.featured) || list[0];
  const second = list.find(p => p !== feat && hasImg(p)) || feat;
  const fake = { name: s.name, tint:"#2563EB" };
  const title = esc(s.heroTitle || "Công nghệ thông minh. Giải pháp thực tiễn.");
  const hl = s.heroHighlight && (s.heroTitle||"").includes(s.heroHighlight) ? title.replace(esc(s.heroHighlight), `<span class="accent">${esc(s.heroHighlight)}</span>`) : title;
  const featured = [...list].sort((a,b) => (b.featured?1:0) - (a.featured?1:0)).slice(0,8);
  const setup = String(s.owner||"").startsWith("[");
  $("#app").innerHTML = `
  <section class="hero"><div class="wrap">
    <div>
      <span class="eyebrow">${I.spark} ${esc(s.slogan || "Digital Product Store")}</span>
      <h1>${hl}</h1>
      <p class="lead">${esc(s.heroText||"")}</p>
      <div class="cta"><a class="btn btn-primary" href="#san-pham" data-setcat="">${I.bag} Khám phá sản phẩm</a><a class="btn btn-outline" href="#dat-lam">${I.code} Đặt làm phần mềm riêng</a></div>
      ${setup && !S.preview ? `<div class="notice">Thông tin người bán còn trống. Vào trang quản trị → Cài đặt cửa hàng để điền.</div>` : ""}
    </div>
    <div class="devices" aria-hidden="${feat ? "false" : "true"}">
      <div class="laptop"><div class="screen"><img src="${esc(feat ? cover(feat) : genCover(fake))}" alt="${feat ? "Giao diện " + esc(feat.name) : ""}" width="1600" height="1000"></div><div class="base"></div></div>
      <div class="phone"><img src="${esc(second && hasImg(second) ? cover(second) : genCover(second || fake, true))}" alt="" width="540" height="1080"></div>
      ${feat ? `<a class="float-tag" href="#sp-${esc(feat.id)}"><span class="dot">${I.spark}</span><span><b>${esc(feat.name)}</b><small>${esc(fromPrice(feat))}</small></span></a>` : ""}
    </div>
  </div></section>
  <section class="statbar" aria-label="Cam kết"><div class="wrap">
    ${list.length ? `<div class="stat">${I.box}<div><b>${list.length} sản phẩm</b><span>đang bán</span></div></div>` : ""}
    <div class="stat">${I.timer}<div><b>${esc(s.trialDays)} ngày</b><span>dùng thử miễn phí</span></div></div>
    <div class="stat">${I.reply}<div><b>${esc(s.responseHours)} giờ</b><span>phản hồi yêu cầu</span></div></div>
    <div class="stat">${I.refund}<div><b>${esc(s.refundDays)} ngày</b><span>hoàn tiền</span></div></div>
  </div></section>

  ${cats.length ? `<section class="section"><div class="wrap">
    <div class="s-head center"><h2>Danh mục sản phẩm</h2><p>Chọn nhóm sản phẩm phù hợp với công việc của bạn</p></div>
    <div class="cats">${cats.map(c => { const st = catStyle(c), n = list.filter(p=>p.category===c).length;
      return `<a class="cat" href="#san-pham" data-setcat="${esc(c)}" style="--tile:${st.c};--tile-bg:${st.bg}"><span class="tile">${st.icon}</span><b>${esc(c)}</b><span>${n} sản phẩm</span></a>`; }).join("")}
      <a class="cat" href="#dat-lam" style="--tile:#DB2777;--tile-bg:#FDF2F8"><span class="tile">${I.code}</span><b>Theo yêu cầu</b><span>Phát triển riêng</span></a></div>
  </div></section>` : ""}

  <section class="section ${cats.length ? "alt" : ""}"><div class="wrap">
    <div class="s-head"><div><h2>Sản phẩm nổi bật</h2><p>Phần mềm và Web App do ${esc(s.name)} phát triển</p></div>${list.length ? `<a class="link-more" href="#san-pham" data-setcat="">Xem tất cả ${I.arrow}</a>` : ""}</div>
    <div class="grid four home-feat">${featured.length ? featured.map(cardHTML).join("") : emptyBox("Sản phẩm đang được cập nhật", "Bạn có nhu cầu riêng? Hãy gửi mô tả để nhận đề xuất và báo giá.", `<a class="btn btn-primary btn-sm" href="#dat-lam">Đặt làm phần mềm riêng</a>`)}</div>
    ${list.length > 4 ? `<div class="more-m"><a class="btn btn-outline" href="#san-pham" data-setcat="">Xem tất cả ${list.length} sản phẩm ${I.arrow}</a></div>` : ""}
  </div></section>

  ${cats.length >= 2 ? `<section class="section"><div class="wrap">
    <div class="s-head center"><h2>Giải pháp theo nhu cầu</h2><p>Nhóm sản phẩm theo bài toán bạn đang cần giải quyết</p></div>
    ${solutionsHTML(3)}
  </div></section>` : ""}

  <section class="section alt"><div class="wrap">
    <div class="s-head center"><h2>Vì sao chọn ${esc(s.name)}?</h2></div>
    <div class="why">
      <div><span class="tile">${I.code}</span><span><b>Tự phát triển</b><span>Làm từ công việc thật, cập nhật liên tục theo góp ý.</span></span></div>
      <div><span class="tile">${I.play}</span><span><b>Dùng thử trước khi mua</b><span>${esc(s.trialDays)} ngày đủ tính năng, không cần trả trước.</span></span></div>
      <div><span class="tile">${I.user}</span><span><b>Hỗ trợ trực tiếp</b><span>Trao đổi với người làm ra phần mềm, hướng dẫn cài đặt.</span></span></div>
      <div><span class="tile">${I.shield}</span><span><b>Giấy phép rõ ràng</b><span>Phạm vi, thời hạn, bảo hành ghi rõ khi bàn giao.</span></span></div>
    </div>
  </div></section>

  <section class="section"><div class="wrap">
    <div class="s-head center"><h2>Quy trình mua</h2><p>Không cần tạo tài khoản, không thanh toán trên web</p></div>
    ${processHTML()}
  </div></section>

  <section class="section" style="padding-top:0"><div class="wrap">${ctaBand()}</div></section>`;
}
const processHTML = () => `<ol class="process">
  <li><b>Liên hệ</b><span>Nhắn Zalo hoặc email kèm mã sản phẩm.</span></li>
  <li><b>Dùng thử</b><span>Nhận link hoặc mã dùng thử ${esc(S.site.trialDays)} ngày.</span></li>
  <li><b>Báo giá</b><span>Xác nhận gói, phạm vi, thời hạn.</span></li>
  <li><b>Thanh toán</b><span>Chuyển khoản theo thông tin gửi riêng.</span></li>
  <li><b>Bàn giao</b><span>Mã kích hoạt, hướng dẫn trong ${esc(S.site.deliveryHours)} giờ.</span></li></ol>`;
const ctaBand = () => `<div class="cta-band"><span class="art">${I.code.replace('class="ic"','')}</span><div><h2>Bạn cần phần mềm theo yêu cầu?</h2><p>${esc(S.site.name)} nhận thiết kế và phát triển phần mềm, Web App, công cụ riêng cho cá nhân, tổ chức và doanh nghiệp.</p></div><a class="btn btn-white" href="#dat-lam">Liên hệ tư vấn ${I.arrow}</a></div>`;
function solutionsHTML(limit){
  const cats = usedCats().slice(0, limit || 99);
  return `<div class="sols">${cats.map(c => { const st = catStyle(c), ps = visible().filter(p => p.category === c);
    return `<div class="sol" style="--tile:${st.c};--tile-bg:${st.bg}"><span class="tile">${st.icon}</span><h3>${esc(c)}</h3><p class="muted">${ps.length} sản phẩm</p>
      <ul>${ps.slice(0,4).map(p => `<li><a href="#sp-${esc(p.id)}">${esc(p.name)}</a></li>`).join("")}</ul>
      <a class="link-more" href="#san-pham" data-setcat="${esc(c)}">Khám phá ${I.arrow}</a></div>`; }).join("")}</div>`;
}

/* ---------- catalog ---------- */
const PRICE = [["all","Tất cả mức giá"],["free","Có bản miễn phí"],["lt500","Dưới 500.000đ"],["500-2m","500.000đ – 2.000.000đ"],["gt2m","Trên 2.000.000đ"],["ask","Liên hệ báo giá"]];
const SORT = [["noi-bat","Nổi bật"],["moi","Mới cập nhật"],["gia-tang","Giá thấp đến cao"],["gia-giam","Giá cao đến thấp"],["ten","Tên A – Z"]];
function priceMatch(p, k){
  const m = minPaid(p);
  return k==="all" || (k==="free" && hasFree(p)) || (k==="lt500" && m < 500000) || (k==="500-2m" && m >= 500000 && m <= 2000000) || (k==="gt2m" && m > 2000000 && m !== Infinity) || (k==="ask" && m === Infinity && !(p.plans||[]).every(x => isNum(x.price)));
}
function filtered(){
  const f = S.filter, q = norm(f.q.trim());
  let l = visible().filter(p => (!f.cats.length || f.cats.includes(p.category)) && (!f.plats.length || (p.platforms||[]).some(x => f.plats.includes(x))) && priceMatch(p, f.price) &&
    (!q || norm([p.name,p.tagline,p.category,(p.platforms||[]).join(" "),(p.features||[]).map(x=>x.title+" "+x.text).join(" ")].join(" ")).includes(q)));
  const idx = new Map(S.products.map((p,i)=>[p,i]));
  const by = { "noi-bat": (a,b) => (b.featured?1:0)-(a.featured?1:0) || idx.get(a)-idx.get(b), "moi": (a,b) => String(b.updated||"").localeCompare(String(a.updated||"")),
    "gia-tang": (a,b) => minPaid(a)-minPaid(b), "gia-giam": (a,b) => (minPaid(b)===Infinity?-1:minPaid(b))-(minPaid(a)===Infinity?-1:minPaid(a)), "ten": (a,b) => a.name.localeCompare(b.name,"vi") };
  return l.sort(by[f.sort] || by["noi-bat"]);
}
function viewCatalog(){
  const f = S.filter, list = visible(), cats = usedCats();
  const plats = [...new Set(list.flatMap(p => p.platforms||[]))];
  f.cats = f.cats.filter(c => cats.includes(c));
  document.title = `Sản phẩm · ${S.site.name}`;
  $("#app").innerHTML = `
  <section class="phead"><div class="wrap"><nav class="crumbs" aria-label="Đường dẫn"><a href="#">Trang chủ</a><span>/</span><span>Sản phẩm</span></nav>
    <h1>Sản phẩm</h1><p>Phần mềm, Web App và công cụ do ${esc(S.site.name)} phát triển. Dùng thử trước, mua khi phù hợp.</p></div></section>
  <div class="wrap catalog">
    <aside class="filters" id="filters" aria-label="Bộ lọc">
      <div><h3>Danh mục</h3>${cats.map(c => `<label class="opt"><input type="checkbox" data-fc="${esc(c)}" ${f.cats.includes(c)?"checked":""}><span>${esc(c)}</span><small>${list.filter(p=>p.category===c).length}</small></label>`).join("") || `<p class="muted">Chưa có danh mục.</p>`}</div>
      ${plats.length ? `<div><h3>Nền tảng</h3>${plats.map(x => `<label class="opt"><input type="checkbox" data-fp="${esc(x)}" ${f.plats.includes(x)?"checked":""}><span>${esc(x)}</span><small>${list.filter(p=>(p.platforms||[]).includes(x)).length}</small></label>`).join("")}</div>` : ""}
      <div><h3>Mức giá</h3>${PRICE.map(([k,l]) => `<label class="opt"><input type="radio" name="fprice" value="${k}" ${f.price===k?"checked":""}><span>${l}</span></label>`).join("")}</div>
      <button type="button" class="reset" id="fReset">Xóa bộ lọc</button>
    </aside>
    <div>
      <div class="toolbar">
        <label class="search">${I.search}<input id="q" type="search" placeholder="Tìm theo tên, tính năng…" aria-label="Tìm sản phẩm" value="${esc(f.q)}"></label>
        <button type="button" class="btn btn-ghost btn-sm filter-btn" id="fBtn" aria-controls="filters" aria-expanded="false">${I.filter} Bộ lọc</button>
        <label class="select"><span>Sắp xếp</span><select id="sort">${SORT.map(([k,l]) => `<option value="${k}" ${f.sort===k?"selected":""}>${l}</option>`).join("")}</select></label>
      </div>
      <p class="count" id="count"></p>
      <div class="grid" id="grid" style="margin-top:14px"></div>
    </div>
  </div>`;
  const draw = () => {
    const l = filtered();
    $("#count").innerHTML = `Hiển thị <b>${l.length}</b> / ${list.length} sản phẩm`;
    $("#grid").innerHTML = l.length ? l.map(cardHTML).join("") : (list.length ? emptyBox("Không có sản phẩm phù hợp", "Thử bỏ bớt bộ lọc hoặc dùng từ khóa khác.", `<button type="button" class="btn btn-outline btn-sm" id="fReset2">Xóa bộ lọc</button>`) : emptyBox("Sản phẩm đang được cập nhật", "Hãy quay lại sau, hoặc gửi nhu cầu để được tư vấn.", `<a class="btn btn-primary btn-sm" href="#dat-lam">Đặt làm phần mềm riêng</a>`));
    const r2 = $("#fReset2"); if (r2) r2.onclick = reset;
  };
  const reset = () => { Object.assign(S.filter, { q:"", cats:[], plats:[], price:"all" }); saveFilter(); viewCatalog(); };
  $("#q").addEventListener("input", e => { f.q = e.target.value; draw(); });
  $("#sort").onchange = e => { f.sort = e.target.value; saveFilter(); draw(); };
  $$("[data-fc]").forEach(c => c.onchange = () => { f.cats = $$("[data-fc]").filter(x=>x.checked).map(x=>x.dataset.fc); saveFilter(); draw(); });
  $$("[data-fp]").forEach(c => c.onchange = () => { f.plats = $$("[data-fp]").filter(x=>x.checked).map(x=>x.dataset.fp); draw(); });
  $$('[name="fprice"]').forEach(r => r.onchange = () => { f.price = r.value; draw(); });
  $("#fReset").onclick = reset;
  $("#fBtn").onclick = () => { const o = $("#filters").classList.toggle("open"); $("#fBtn").setAttribute("aria-expanded", String(o)); };
  draw();
}

/* ---------- product ---------- */
function viewProduct(p){
  const s = S.site, imgs = hasImg(p) ? p.images : [{ caption:"", gen:true }];
  const im = i => imgs[i].gen ? genCover(p) : src(imgs[i].src);
  const secs = [["tong-quan","Tổng quan",!!p.description],["tinh-nang","Tính năng",(p.features||[]).length],["bang-gia","Bảng giá",(p.plans||[]).length],["yeu-cau","Yêu cầu hệ thống",(p.requirements||[]).length],["hoi-dap","Hỏi đáp",(p.faq||[]).length],["cap-nhat","Cập nhật",(p.changelog||[]).length]].filter(x=>x[2]);
  document.title = `${p.name} · ${s.name}`;
  const md0 = $('meta[name="description"]'); if (md0 && !S.preview) md0.setAttribute("content", p.tagline || "");
  const pc = priceClass(p);
  $("#app").innerHTML = `
  <div class="wrap">
    <nav class="crumbs" aria-label="Đường dẫn" style="padding-top:24px"><a href="#">Trang chủ</a><span>/</span><a href="#san-pham" data-setcat="">Sản phẩm</a><span>/</span>${p.category ? `<a href="#san-pham" data-setcat="${esc(p.category)}">${esc(p.category)}</a><span>/</span>` : ""}<span>${esc(p.name)}</span></nav>
    <div class="p-top">
      <div>
        <div class="stage"><button type="button" class="main" id="gMain" aria-label="Phóng to ảnh"><img class="big" id="gImg" src="${esc(im(0))}" alt="${esc(imgs[0].caption || "Giao diện " + p.name)}" width="1600" height="1000"></button>
          ${imgs.length > 1 ? `<div class="thumbs" role="group" aria-label="Ảnh sản phẩm">${imgs.map((x,i)=>`<button type="button" data-i="${i}" aria-current="${i===0}" aria-label="Xem ảnh ${i+1}"><img src="${esc(im(i))}" alt="" loading="lazy"></button>`).join("")}</div>` : ""}</div>
        <p class="caption" id="gCap">${esc(imgs[0].gen ? "Ảnh minh họa. Ảnh chụp giao diện thật sẽ được cập nhật." : (imgs[0].caption||""))}</p>
      </div>
      <div class="p-info">
        <div class="meta">${statusPill(p)}${p.category?`<span class="pill">${esc(p.category)}</span>`:""}${(p.platforms||[]).map(x=>`<span class="pill gray">${esc(x)}</span>`).join("")}${p.version?`<span class="pill gray">Phiên bản ${esc(p.version)}</span>`:""}</div>
        <h1>${esc(p.name)}</h1>
        <p class="tagline">${esc(p.tagline)}</p>
        <div class="p-price"><b class="${pc}">${esc(fromPrice(p))}</b>${hasFree(p) && fromPrice(p) !== "Miễn phí" ? `<span class="pill live">Có bản dùng thử miễn phí</span>` : ""}</div>
        ${p.updated?`<p class="muted small-note">Cập nhật ${esc(fmtDate(p.updated))}</p>`:""}
        ${(p.highlights||[]).filter(Boolean).length ? `<ul class="checks">${p.highlights.filter(Boolean).map(h=>`<li><span class="ok">${I.check}</span><span>${esc(h)}</span></li>`).join("")}</ul>` : ""}
        <div class="p-cta">
          <button type="button" class="btn btn-primary" data-buy="">${I.play} ${fromPrice(p) === "Miễn phí" ? "Nhận bản miễn phí" : "Dùng thử " + esc(s.trialDays) + " ngày"}</button>
          ${(p.plans||[]).length ? `<a class="btn btn-outline" href="#bang-gia" data-jump="bang-gia">Xem bảng giá</a>` : ""}
          ${p.demo ? `<a class="btn btn-ghost" href="${esc(p.demo)}" target="_blank" rel="noopener">Mở bản demo</a>` : ""}
          ${p.video ? `<a class="btn btn-ghost" href="${esc(p.video)}" target="_blank" rel="noopener">${I.play} Video</a>` : ""}
        </div>
        <div class="p-note"><span>${I.reply} Phản hồi trong ${esc(s.responseHours)} giờ làm việc</span><span>${I.shield} <a href="#giay-phep">Giấy phép sử dụng</a></span><span>Mã sản phẩm <span class="mono">${esc(String(p.id).toUpperCase())}</span></span></div>
      </div>
    </div>
  </div>
  ${secs.length ? `<nav class="tabbar" aria-label="Nội dung sản phẩm"><div class="wrap">${secs.map((x,i)=>`<a href="#${x[0]}" data-jump="${x[0]}" aria-current="${i===0}">${x[1]}</a>`).join("")}</div></nav>` : ""}
  <div class="wrap">
    ${p.description ? `<section class="p-sec" id="tong-quan"><h2>Tổng quan</h2><div class="prose">${md(p.description)}</div></section>` : ""}
    ${(p.features||[]).length ? `<section class="p-sec" id="tinh-nang"><h2>Tính năng</h2><div class="feats">${p.features.map((f,i)=>`<div class="feat"><span class="tile">${String(i+1).padStart(2,"0")}</span><b>${esc(f.title)}</b><span>${esc(f.text)}</span></div>`).join("")}</div></section>` : ""}
    ${(p.plans||[]).length ? `<section class="p-sec" id="bang-gia"><h2>Bảng giá</h2><div class="plans">${p.plans.map((pl,i)=>`
      <div class="plan${pl.highlight?" hot":""}">${pl.highlight?`<span class="flag">Nên chọn</span>`:""}
        <h3>${esc(pl.name)}</h3>${pl.audience?`<p class="aud">${esc(pl.audience)}</p>`:""}
        <div class="amt">${planPrice(pl)}${isNum(pl.price)&&Number(pl.price)>0&&pl.unit?` <small>${esc(pl.unit)}</small>`:""}</div>
        ${(pl.items||[]).filter(Boolean).length?`<ul>${pl.items.filter(Boolean).map(x=>`<li>${I.check}<span>${esc(x)}</span></li>`).join("")}</ul>`:""}
        <button type="button" class="btn ${pl.highlight?"btn-primary":"btn-outline"} btn-block" data-buy="${i}">${isNum(pl.price)&&Number(pl.price)===0?"Nhận bản miễn phí":(!isNum(pl.price)?"Nhận báo giá":"Chọn gói này")}</button>
      </div>`).join("")}</div><p class="fine">Giá chưa gồm chi phí máy chủ, tên miền, khóa AI (nếu có) do đơn vị tự đăng ký. Cần hóa đơn, vui lòng báo trước khi thanh toán.</p></section>` : ""}
    ${(p.requirements||[]).length ? `<section class="p-sec" id="yeu-cau"><h2>Yêu cầu hệ thống</h2><table class="req"><tbody>${p.requirements.map(r=>`<tr><th scope="row">${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`).join("")}</tbody></table></section>` : ""}
    ${(p.faq||[]).length ? `<section class="p-sec" id="hoi-dap"><h2>Hỏi đáp</h2><div class="faq">${p.faq.map(f=>`<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div></section>` : ""}
    ${(p.changelog||[]).length ? `<section class="p-sec" id="cap-nhat"><h2>Nhật ký cập nhật</h2><ul class="log">${p.changelog.map(c=>`<li><div class="v"><b>Phiên bản ${esc(c.version)}</b><small>${esc(fmtDate(c.date))}</small></div><p>${esc(c.text)}</p></li>`).join("")}</ul></section>` : ""}
    <div class="buybar" role="region" aria-label="Mua nhanh"><div><b class="${pc}">${esc(fromPrice(p))}</b><small>${esc(p.name)}</small></div><button type="button" class="btn btn-primary btn-sm" data-buy="">${fromPrice(p) === "Miễn phí" ? "Nhận miễn phí" : "Dùng thử"}</button></div>
    <section style="padding-block:24px 72px"><div class="cta-band"><span class="art">${I.play.replace('class="ic"','')}</span><div><h2>Thử ${esc(p.name)} trên công việc thật của bạn</h2><p>Dùng thử ${esc(s.trialDays)} ngày, có hướng dẫn cài đặt và hỗ trợ trực tiếp.</p></div><button type="button" class="btn btn-white" data-buy="">Xin dùng thử ${I.arrow}</button></div></section>
  </div>`;
  let cur = 0;
  const show = i => { cur = i; $("#gImg").src = im(i); $("#gImg").alt = imgs[i].caption || "Giao diện " + p.name; $("#gCap").textContent = imgs[i].caption || "";
    $$(".thumbs button").forEach(b => b.setAttribute("aria-current", String(+b.dataset.i === i))); };
  $$(".thumbs button").forEach(b => b.onclick = () => show(+b.dataset.i));
  $("#gMain").onclick = () => lightbox(imgs.map((x,i)=>({ src:im(i), caption:x.caption })), cur);
  $$("[data-buy]").forEach(b => b.onclick = () => buy(p, b.dataset.buy === "" ? null : p.plans[+b.dataset.buy]));
  $$("[data-jump]").forEach(a => a.onclick = e => { e.preventDefault(); const t = document.getElementById(a.dataset.jump); if (t) t.scrollIntoView(); });
  // scroll-spy cho thanh tab
  const tabs = $$(".tabbar a");
  if (tabs.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => { es.forEach(en => { if (en.isIntersecting) tabs.forEach(a => a.setAttribute("aria-current", String(a.dataset.jump === en.target.id))); }); }, { rootMargin:"-160px 0px -60% 0px" });
    secs.forEach(x => { const el = document.getElementById(x[0]); if (el) io.observe(el); });
  }
}

/* ---------- solutions & custom pages ---------- */
function viewSolutions(){
  document.title = `Giải pháp · ${S.site.name}`;
  $("#app").innerHTML = `<section class="phead"><div class="wrap"><nav class="crumbs"><a href="#">Trang chủ</a><span>/</span><span>Giải pháp</span></nav>
    <h1>Giải pháp cho từng nhu cầu</h1><p>Các nhóm phần mềm giúp cá nhân, trường học và doanh nghiệp làm việc gọn hơn. Chưa thấy đúng nhu cầu? ${esc(S.site.name)} nhận phát triển riêng.</p></div></section>
  <section class="section"><div class="wrap">${usedCats().length ? solutionsHTML() : emptyBox("Giải pháp đang được cập nhật", "Gửi mô tả bài toán của bạn để nhận đề xuất phù hợp.", `<a class="btn btn-primary btn-sm" href="#dat-lam">Gửi yêu cầu</a>`)}</div></section>
  <section class="section alt"><div class="wrap">${ctaBand()}</div></section>`;
}
function viewCustom(){
  const s = S.site;
  document.title = `Đặt làm phần mềm riêng · ${s.name}`;
  const box = `<span class="box">${I.check.replace('class="ic"','')}</span>`;
  $("#app").innerHTML = `<section class="phead"><div class="wrap"><nav class="crumbs"><a href="#">Trang chủ</a><span>/</span><span>Đặt làm riêng</span></nav>
    <h1>Phát triển phần mềm theo yêu cầu</h1><p>Biến ý tưởng của bạn thành sản phẩm chạy được: công cụ nội bộ, Web App, tự động hóa Excel, ứng dụng Windows.</p></div></section>
  <div class="wrap custom">
    <div class="art-laptop"><div class="screen">${I.code.replace('class="ic"','')}</div><div class="base"></div></div>
    <div>
      <h2 style="font-size:clamp(1.4rem,2.6vw,1.9rem);font-weight:800">Bạn mô tả công việc, ${esc(s.name)} đề xuất cách làm</h2>
      <ul class="ticks">
        <li>${box}<span>Thiết kế đúng nhu cầu, dùng thử bản mẫu trước khi làm bản hoàn chỉnh</span></li>
        <li>${box}<span>Tư vấn phương án tối ưu, so sánh ưu nhược điểm và chi phí vận hành</span></li>
        <li>${box}<span>Phát triển, triển khai lên máy chủ của bạn, hướng dẫn và bảo trì</span></li>
        <li>${box}<span>Thỏa thuận rõ quyền với mã nguồn và nơi lưu dữ liệu</span></li>
      </ul>
      <div class="p-cta"><button type="button" class="btn btn-primary" id="askCustom">Gửi yêu cầu tư vấn ${I.arrow}</button><a class="btn btn-ghost" href="#san-pham" data-setcat="">Xem sản phẩm có sẵn</a></div>
    </div>
  </div>
  <section class="section alt"><div class="wrap">
    <div class="s-head center"><h2>Những gì có thể làm</h2></div>
    <div class="svc">
      <div><span class="tile">${I.win}</span><b>Công cụ nội bộ</b><span>Tra cứu, biểu mẫu, quản lý danh sách, duyệt hồ sơ.</span></div>
      <div><span class="tile">${I.doc}</span><b>Tự động hóa Excel</b><span>Công thức, menu, macro; xuất đúng mẫu đơn vị.</span></div>
      <div><span class="tile">${I.grid}</span><b>Web App cho dịch vụ</b><span>Đặt lịch, đăng ký, theo dõi tiến độ cho khách hàng.</span></div>
      <div><span class="tile">${I.flow}</span><b>Số hóa quy trình</b><span>Chuyển quy trình giấy, Zalo sang hệ thống có phân quyền.</span></div>
    </div>
  </div></section>
  <section class="section"><div class="wrap">
    <div class="s-head center"><h2>Quy trình làm việc</h2></div>
    <ol class="process"><li><b>Gửi mô tả</b><span>Công việc, mẫu biểu đang dùng (đã che dữ liệu cá nhân).</span></li><li><b>Đề xuất</b><span>Chức năng, nơi lưu dữ liệu, thời gian, báo giá.</span></li><li><b>Bản mẫu</b><span>Bấm thử được trước khi làm hoàn chỉnh.</span></li><li><b>Phát triển</b><span>Làm, kiểm thử, cài đặt.</span></li><li><b>Bàn giao</b><span>Hướng dẫn, bảo hành theo thỏa thuận.</span></li></ol>
  </div></section>`;
  $("#askCustom").onclick = () => contactDialog("Đặt làm phần mềm riêng", `Chào bạn, mình ở [tên đơn vị]. Mình cần làm phần mềm để [mô tả công việc]. Hiện đang làm bằng [Excel/giấy/…].`, "Yêu cầu làm phần mềm riêng");
}

/* ---------- dialogs ---------- */
function dialog(html, cls){
  const d = document.createElement("dialog"); if (cls) d.className = cls; d.innerHTML = html; document.body.appendChild(d);
  d.addEventListener("close", () => d.remove()); d.addEventListener("click", e => { if (e.target === d) d.close(); });
  $$("[data-close]", d).forEach(b => b.onclick = () => d.close());
  d.showModal(); return d;
}
function lightbox(list, i){
  const d = dialog(`<img alt=""><div class="lb-bar"><span class="cap"></span><span style="display:flex;gap:8px">${list.length>1?`<button type="button" class="copybtn" data-p="-1">← Trước</button><button type="button" class="copybtn" data-p="1">Sau →</button>`:""}<button type="button" class="copybtn" data-close>Đóng</button></span></div>`, "lightbox");
  const set = k => { i = (k + list.length) % list.length; $("img", d).src = list[i].src; $(".cap", d).textContent = list[i].caption || ""; };
  $$("[data-p]", d).forEach(b => b.onclick = () => set(i + +b.dataset.p));
  d.addEventListener("keydown", e => { if (e.key==="ArrowRight") set(i+1); if (e.key==="ArrowLeft") set(i-1); });
  set(i);
}
function searchDialog(){
  const d = dialog(`<div class="dlg"><div class="dlg-head"><h3>Tìm sản phẩm</h3><button type="button" class="x" data-close aria-label="Đóng">×</button></div>
    <label class="search">${I.search}<input id="sq" type="search" placeholder="Nhập tên hoặc tính năng…" aria-label="Từ khóa"></label><div class="sres" id="sres"></div></div>`, "search-dlg");
  const draw = () => { const q = norm($("#sq", d).value.trim()); const l = visible().filter(p => !q || norm([p.name,p.tagline,p.category,(p.features||[]).map(x=>x.title).join(" ")].join(" ")).includes(q)).slice(0,8);
    $("#sres", d).innerHTML = l.length ? l.map(p => `<a href="#sp-${esc(p.id)}" data-close><img src="${esc(cover(p))}" alt=""><span><b>${esc(p.name)}</b><small>${esc(p.category||"")}</small></span><small class="price-tag ${priceClass(p)}">${esc(fromPrice(p))}</small></a>`).join("") : `<p class="muted" style="padding:12px">Không tìm thấy sản phẩm phù hợp.</p>`;
    $$("#sres a", d).forEach(a => a.onclick = () => d.close()); };
  $("#sq", d).addEventListener("input", draw);
  $("#sq", d).addEventListener("keydown", e => { if (e.key === "Escape") { e.preventDefault(); d.close(); return; } if (e.key === "Enter") { S.filter.q = $("#sq", d).value; S.filter.cats = []; d.close(); if (location.hash === "#san-pham") viewCatalog(); else location.hash = "san-pham"; } });
  draw(); setTimeout(() => $("#sq", d).focus(), 30);
}
function contactDialog(title, msg, subject, extra){
  const s = S.site, z = zalo();
  dialog(`<div class="dlg">
    <div class="dlg-head"><div><h3>${esc(title)}</h3></div><button type="button" class="x" data-close aria-label="Đóng">×</button></div>
    ${extra || `<p>Gửi tin nhắn dưới đây qua Zalo hoặc email. ${esc(s.owner)} phản hồi trong ${esc(s.responseHours)} giờ làm việc.</p>`}
    <div class="copyline"><code>${esc(msg)}</code><button type="button" class="copybtn" data-copy="${esc(msg)}">Sao chép</button></div>
    <div style="display:flex;gap:10px;flex-wrap:wrap">${z ? `<a class="btn btn-primary" href="${z}" target="_blank" rel="noopener">Mở Zalo</a>` : ""}<a class="btn ${z?"btn-outline":"btn-primary"}" href="mailto:${esc(s.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(msg)}">Gửi email</a></div>
    <div class="copyline muted">Email: <code>${esc(s.email)}</code><button type="button" class="copybtn" data-copy="${esc(s.email)}">Sao chép</button></div>
    ${s.zalo ? `<div class="copyline muted">Zalo: <code>${esc(s.zalo)}</code><button type="button" class="copybtn" data-copy="${esc(s.zalo)}">Sao chép</button></div>` : ""}
  </div>`);
}
function buy(p, plan){
  const s = S.site, code = String(p.id).toUpperCase();
  const what = plan ? `gói "${plan.name}" của "${p.name}"` : `"${p.name}"`;
  const msg = `Chào bạn, mình ở [tên đơn vị]. Mình muốn ${plan && Number(plan.price)>0 ? "mua" : "dùng thử / nhận báo giá"} ${what} (mã ${code}).`;
  let extra = "";
  if (s.mode === "order" && plan && isNum(plan.price) && Number(plan.price) > 0 && s.bank && s.bank.account) {
    const qr = `https://img.vietqr.io/image/${encodeURIComponent(s.bank.bin)}-${encodeURIComponent(s.bank.account)}-compact2.png?amount=${Number(plan.price)}&addInfo=${encodeURIComponent(code)}&accountName=${encodeURIComponent(s.bank.holder)}`;
    extra = `<img class="qr" src="${qr}" alt="Mã VietQR chuyển khoản ${vnd(plan.price)}"><div class="copyline">Nội dung chuyển khoản:<code>${esc(code)} + số điện thoại</code></div>`;
  }
  contactDialog(plan ? `${plan.name} · ${planPrice(plan)}` : `Dùng thử ${p.name}`, msg, (plan ? "Mua " : "Dùng thử ") + code, extra);
}

/* ---------- text pages ---------- */
const ptabs = cur => `<div class="ptabs">${[["giay-phep","Giấy phép sử dụng"],["bao-mat","Bảo mật"],["hoan-tien","Bảo hành & hoàn tiền"]].map(([h,l])=>`<a href="#${h}"${h===cur?' aria-current="page"':""}>${l}</a>`).join("")}</div>`;
const PAGES = {
  "cach-mua": s => ["Cách dùng thử và mua", "Website giới thiệu sản phẩm. Dùng thử, báo giá và thanh toán thực hiện qua trao đổi trực tiếp.", `${processHTML()}
    <h2>1. Liên hệ</h2><p>Mở trang sản phẩm, bấm "Dùng thử" để lấy tin nhắn mẫu có mã sản phẩm, gửi qua Zalo hoặc email.</p>
    <h2>2. Dùng thử</h2><p>Nhận link hoặc mã dùng thử ${esc(s.trialDays)} ngày. Hết hạn, dữ liệu vẫn nằm trên máy bạn; nhập mã chính thức là dùng tiếp.</p>
    <h2>3. Báo giá và thanh toán</h2><p>Báo giá ghi rõ gói, thời hạn, phạm vi sử dụng. Chuyển khoản theo thông tin gửi riêng, nội dung ghi mã sản phẩm. Cần hóa đơn, vui lòng báo trước khi thanh toán.</p>
    <h2>4. Bàn giao</h2><p>Trong ${esc(s.deliveryHours)} giờ sau khi nhận tiền: mã kích hoạt hoặc bộ cài, hướng dẫn sử dụng, xác nhận giấy phép. Sản phẩm cần máy chủ được cài lên tài khoản của đơn vị.</p>`],
  "giay-phep": s => ["Giấy phép sử dụng phần mềm", `Cập nhật ${esc(s.updated)}.`, `${ptabs("giay-phep")}
    <h2>1. Bên cung cấp</h2><p>${esc(s.owner)}, mã số thuế ${esc(s.taxCode)}, ${esc(s.area)}. Liên hệ: ${esc(s.email)}, ${esc(s.phone)}.</p>
    <h2>2. Bạn nhận được gì</h2><p>Quyền sử dụng phần mềm theo gói đã mua: phạm vi (một đơn vị, một máy hoặc một người) và thời hạn (theo năm, theo đợt hoặc vĩnh viễn) ghi trong xác nhận giấy phép. Quyền tác giả và mã nguồn vẫn thuộc bên cung cấp, trừ khi có thỏa thuận khác bằng văn bản.</p>
    <h2>3. Không được làm</h2><ul><li>Bán lại, cho thuê, chia sẻ mã kích hoạt hoặc bộ cài cho đơn vị khác.</li><li>Dịch ngược, sửa đổi để gỡ cơ chế kích hoạt hay dùng thử.</li><li>Dùng phần mềm cho mục đích trái pháp luật.</li></ul>
    <h2>4. Dùng thử</h2><p>Bản dùng thử có đủ tính năng trong ${esc(s.trialDays)} ngày, trừ khi trang sản phẩm ghi khác. Hết hạn, phần mềm khóa thao tác nhưng không xóa dữ liệu.</p>
    <h2>5. Cập nhật và hỗ trợ</h2><p>Gói theo năm: cập nhật và hỗ trợ trong thời hạn. Gói vĩnh viễn: dùng mãi phiên bản đã mua, kèm 12 tháng cập nhật.</p>
    <h2>6. Dữ liệu</h2><p>Dữ liệu bạn nhập thuộc về bạn. Bạn chịu trách nhiệm sao lưu định kỳ theo hướng dẫn của từng phần mềm.</p>
    <h2>7. Giới hạn trách nhiệm</h2><p>Phần mềm được kiểm thử như mô tả nhưng không cam kết hoàn toàn không có lỗi. Kết quả quan trọng (điểm thi, hồ sơ) cần người có thẩm quyền rà soát trước khi dùng. Trách nhiệm bồi thường không vượt số tiền đã trả cho gói liên quan, trừ trường hợp pháp luật quy định khác. Điều khoản này không làm mất quyền của người tiêu dùng theo pháp luật Việt Nam.</p>
    <h2>8. Thành phần bên thứ ba</h2><p>Một số phần mềm dùng thư viện mã nguồn mở; danh sách và giấy phép đi kèm bộ cài. Dịch vụ bên ngoài (máy chủ, AI) do đơn vị tự đăng ký áp dụng điều khoản của nhà cung cấp đó.</p>`],
  "bao-mat": s => ["Chính sách bảo mật", `Cập nhật ${esc(s.updated)}. Áp dụng theo Luật Bảo vệ dữ liệu cá nhân 2025.`, `${ptabs("bao-mat")}
    <h2>Website này</h2><p>Không có form đăng ký, không dùng cookie theo dõi hay công cụ thống kê. Trình duyệt chỉ ghi nhớ bộ lọc bạn đã chọn, lưu trên máy bạn.</p>
    <h2>Khi bạn liên hệ, mua</h2><p>${esc(s.owner)} nhận được: tên, tên đơn vị, số điện thoại hoặc email, nội dung trao đổi, thông tin chuyển khoản. Chỉ dùng để tư vấn, cấp giấy phép, hỗ trợ, xuất hóa đơn và xử lý khiếu nại; không bán, không chia sẻ, không gửi quảng cáo khi chưa được đồng ý. Thông tin giao dịch lưu tối đa 3 năm cho nghĩa vụ thuế, sau đó xóa.</p>
    <h2>Dữ liệu trong phần mềm</h2><p>Trang mỗi sản phẩm ghi rõ nơi lưu dữ liệu. Bên cung cấp không giữ bản sao dữ liệu học sinh, nhân viên của bạn; khi hỗ trợ chỉ truy cập khi bạn đồng ý và trong phạm vi cần thiết.</p>
    <h2>Dữ liệu trẻ em</h2><p>Sản phẩm dành cho học sinh tiểu học không thu họ tên, ảnh của trẻ. Đơn vị dùng phần mềm có dữ liệu học sinh chịu trách nhiệm có sự đồng ý của cha mẹ hoặc người đại diện khi pháp luật yêu cầu.</p>
    <h2>Tính năng AI</h2><p>Chỉ bật khi đơn vị tự gắn khóa API của nhà cung cấp AI. Phần mềm ghi rõ dữ liệu nào được gửi đi; kết quả AI cần người kiểm tra lại.</p>
    <h2>Quyền của bạn</h2><p>Yêu cầu xem, sửa, xóa dữ liệu, rút lại đồng ý: gửi tới ${esc(s.email)}; phản hồi trong ${esc(s.responseHours)} giờ làm việc.</p>`],
  "hoan-tien": s => ["Bảo hành, hoàn tiền, khiếu nại", `Cập nhật ${esc(s.updated)}.`, `${ptabs("hoan-tien")}
    <h2>Bảo hành</h2><p>Sửa lỗi miễn phí trong thời hạn giấy phép. Lỗi làm sai kết quả (điểm, tính toán) được ưu tiên xử lý trong 2 ngày làm việc.</p>
    <h2>Hoàn tiền 100% trong ${esc(s.refundDays)} ngày khi</h2><ol><li>Phần mềm không chạy được trên máy đáp ứng yêu cầu ghi ở trang sản phẩm và không khắc phục được.</li><li>Phần mềm khác với mô tả.</li><li>Đã thanh toán nhưng không được bàn giao sau ${esc(s.deliveryHours)} giờ.</li><li>Thanh toán trùng.</li></ol>
    <h2>Không hoàn tiền khi</h2><p>Đổi ý sau khi đã kích hoạt mà phần mềm chạy đúng mô tả. Vì vậy hãy dùng thử trước khi mua.</p>
    <h2>Gửi yêu cầu</h2><p>Gửi tới ${esc(s.email)} hoặc ${esc(s.phone)}: mã sản phẩm, thời gian thanh toán, mô tả lỗi kèm ảnh chụp. Phản hồi trong ${esc(s.responseHours)} giờ làm việc; hoàn tiền về đúng tài khoản đã chuyển trong 5 ngày làm việc sau khi xác nhận.</p>
    <h2>Giải quyết tranh chấp</h2><p>Ưu tiên thương lượng. Nếu không thống nhất, bạn có thể gửi yêu cầu tới cơ quan bảo vệ quyền lợi người tiêu dùng hoặc tòa án theo pháp luật Việt Nam.</p>`],
  "lien-he": s => ["Liên hệ", "Xin dùng thử, nhận báo giá, đặt làm phần mềm riêng, báo lỗi.", `<dl class="contact">
      <div><dt>Người bán</dt><dd>${esc(s.owner)}</dd></div>
      <div><dt>Mã số thuế</dt><dd>${esc(s.taxCode)}</dd></div>
      <div><dt>Email</dt><dd class="copyline"><code>${esc(s.email)}</code><button type="button" class="copybtn" data-copy="${esc(s.email)}">Sao chép</button></dd></div>
      <div><dt>Điện thoại</dt><dd class="copyline"><code>${esc(s.phone)}</code><button type="button" class="copybtn" data-copy="${esc(s.phone)}">Sao chép</button></dd></div>
      ${s.zalo ? `<div><dt>Zalo</dt><dd><a class="btn btn-primary btn-sm" href="${zalo()}" target="_blank" rel="noopener">Nhắn Zalo</a></dd></div>` : ""}
      <div><dt>Khu vực</dt><dd>${esc(s.area)}</dd></div>
    </dl><p class="muted" style="margin-top:16px">Phản hồi trong ${esc(s.responseHours)} giờ làm việc.</p>`]
};
function viewPage(h){
  const [title, lead, body] = PAGES[h](S.site);
  document.title = `${title} · ${S.site.name}`;
  $("#app").innerHTML = `<section class="phead"><div class="wrap"><nav class="crumbs"><a href="#">Trang chủ</a><span>/</span><span>${esc(title)}</span></nav><h1>${esc(title)}</h1><p>${lead}</p></div></section><div class="wrap page">${body}</div>`;
}

/* ---------- router ---------- */
const SECTION_IDS = ["tong-quan","tinh-nang","bang-gia","yeu-cau","hoi-dap","cap-nhat"];
function route(){
  const h = decodeURIComponent(location.hash.replace("#",""));
  if (h === "preview") return;
  closeDrawer();
  if (SECTION_IDS.includes(h) && document.getElementById(h)) { document.getElementById(h).scrollIntoView(); return; }
  const nav = h === "" ? "home" : (h.startsWith("sp-") || h === "san-pham" ? "san-pham" : (["giay-phep","bao-mat","hoan-tien"].includes(h) ? "" : h));
  $$("[data-nav]").forEach(a => a.dataset.nav === nav ? a.setAttribute("aria-current","page") : a.removeAttribute("aria-current"));
  document.title = `${S.site.name || "Cửa hàng phần mềm"} · ${S.site.slogan || ""}`.replace(/ · $/,"");
  if (h === "san-pham") viewCatalog();
  else if (h.startsWith("sp-")) { const p = visible().find(x => x.id === h.slice(3)); if (p) viewProduct(p); else $("#app").innerHTML = `<div class="wrap" style="padding-block:72px">${emptyBox("Không tìm thấy sản phẩm", "Sản phẩm có thể đã ngừng hiển thị.", `<a class="btn btn-primary btn-sm" href="#san-pham" data-setcat="">Xem tất cả sản phẩm</a>`)}</div>`; }
  else if (h === "giai-phap") viewSolutions();
  else if (h === "dat-lam") viewCustom();
  else if (PAGES[h]) viewPage(h);
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
    if (parent !== window) parent.postMessage({ type:"xa-ready" }, "*");
    return;
  }
  try {
    const opt = { cache:"no-cache" };
    const [site, products] = await Promise.all([fetch("data/site.json",opt).then(r=>r.json()), fetch("data/products.json",opt).then(r=>r.json())]);
    S.site = site; S.products = Array.isArray(products) ? products : [];
  } catch(e) {
    $("#app").innerHTML = `<div class="wrap loading">Không tải được dữ liệu cửa hàng. Vui lòng tải lại trang sau ít phút.</div>`; return;
  }
  shell(); addEventListener("hashchange", route); route();
}
window.XAStore = { genCover, fromPrice, planPrice, esc };
boot();
})();
