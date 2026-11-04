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
  dl: sv('<path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/>'),
  play: sv('<circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/>'),
  filter: sv('<path d="M3 5h18l-7 8v6l-4 2v-8z"/>'),
  wand: sv('<path d="m15 4 5 5L9 20H4v-5z"/><path d="m13 6 5 5"/>'),
  flow: sv('<rect x="3" y="3" width="6" height="6" rx="1.5"/><rect x="15" y="15" width="6" height="6" rx="1.5"/><path d="M6 9v4a2 2 0 0 0 2 2h7"/>'),
  win: sv('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/>'),
  x: sv('<path d="M6 6l12 12M18 6 6 18"/>')
};
const logo = `<img class="brand-logo" src="assets/img/logo.webp" width="880" height="150" alt="" decoding="async">`;
function catStyle(name){
  const n = norm(name);
  if (/\bai\b|tri tue/.test(n)) return { icon:I.spark, c:"#7C3AED", bg:"#F3E8FF", d:"Ứng dụng trí tuệ nhân tạo vào công việc hằng ngày", need:"Muốn dùng AI nhưng chưa biết đưa vào công việc thế nào." };
  if (/giao duc|hoc|truong/.test(n)) return { icon:I.cap, c:"#2563EB", bg:"#EFF6FF", d:"Công cụ cho giáo viên, tổ chuyên môn và nhà trường", need:"Ra đề, rà soát và chấm bài thủ công tốn nhiều giờ, dễ sót lỗi." };
  if (/quan tri|van phong|nhan su/.test(n)) return { icon:I.brief, c:"#0891B2", bg:"#ECFEFF", d:"Hồ sơ, biểu mẫu và công việc văn phòng", need:"Hồ sơ, biểu mẫu, số liệu nằm rải rác; tổng hợp mất thời gian." };
  if (/kinh doanh|dich vu|ban hang/.test(n)) return { icon:I.store, c:"#EA580C", bg:"#FFF7ED", d:"Bán hàng, đặt lịch và chăm sóc khách hàng", need:"Đơn hàng, lịch hẹn, khách hàng quản lý thủ công, dễ bỏ sót." };
  if (/web/.test(n)) return { icon:I.grid, c:"#4F46E5", bg:"#EEF2FF", d:"Ứng dụng chạy ngay trên trình duyệt", need:"Cần công cụ dùng được trên mọi máy, không phải cài đặt." };
  if (/tien ich|cong cu/.test(n)) return { icon:I.cube, c:"#16A34A", bg:"#F0FDF4", d:"Công cụ giúp máy tính và việc hằng ngày gọn hơn", need:"Máy tính chậm, đầy rác, tệp lộn xộn làm gián đoạn công việc." };
  return { icon:I.code, c:"#DB2777", bg:"#FDF2F8", d:"Phần mềm theo nhóm nhu cầu", need:"Công việc lặp lại tốn thời gian, cần một công cụ phù hợp." };
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
function videoEmbed(u){
  u = String(u||"").trim(); if (!u) return "";
  const y = u.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (y) return `<iframe src="https://www.youtube-nocookie.com/embed/${y[1]}" title="Video giới thiệu" loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  if (/\.(mp4|webm)(\?|$)/i.test(u)) return `<video controls preload="metadata" playsinline src="${esc(u)}"></video>`;
  return "";
}
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
  if (!v.length) return "Liên hệ dùng thử";
  const paid = v.filter(x => isNum(x) && Number(x) > 0).map(Number);
  if (v.every(x => isNum(x) && Number(x) === 0)) return "Miễn phí";
  if (paid.length) return "Từ " + vnd(Math.min(...paid));
  return v.some(x => !isNum(x)) ? "Liên hệ dùng thử" : "Miễn phí";
}
const priceClass = p => { const t = fromPrice(p); return /^Từ/.test(t) ? "" : (/Miễn phí/.test(t) ? "free" : "ask"); };
const minPaid = p => { const v = (p.plans||[]).map(x=>x.price).filter(x => isNum(x) && Number(x) > 0).map(Number); return v.length ? Math.min(...v) : Infinity; };
const dlBtn = (p, cls, label) => `<a class="btn ${cls}" href="${esc(p.download)}" download data-dl>${I.dl} ${label}</a>`;
const dlLabel = p => "Tải về miễn phí" + (p.downloadSize ? ` (${esc(p.downloadSize)})` : "");
const hasFree = p => (p.plans||[]).some(x => isNum(x.price) && Number(x.price) === 0);
const statusPill = p => p.status === "beta" ? `<span class="pill beta">Thử nghiệm</span>` : `<span class="pill live">Đã phát hành</span>`;
const visible = () => S.products.filter(p => p.published !== false);
const usedCats = () => (S.site.categories||[]).concat(visible().map(p=>p.category).filter(c => c && !(S.site.categories||[]).includes(c))).filter((c,i,a) => a.indexOf(c)===i && visible().some(p => p.category === c));
const zalo = () => S.site.zalo ? "https://zalo.me/" + String(S.site.zalo).replace(/\D/g,"") : "";
const isRecent = p => { if (!p.updated) return false; const d = new Date(p.updated); if (isNaN(d) || (Date.now() - d) >= 30*864e5) return false;
  const newest = visible().filter(x => x.updated).sort((a,b) => String(b.updated).localeCompare(String(a.updated))).slice(0,2);
  return newest.includes(p); };

function setMeta(title, desc){
  if (S.preview) return;
  document.title = title;
  const m = $('meta[name="description"]'); if (m && desc) m.setAttribute("content", String(desc).slice(0,300));
}
document.addEventListener("click", e => { const a = e.target.closest("[data-skip]"); if (!a) return; e.preventDefault(); const m = $("#app"); m.focus(); m.scrollIntoView(); });
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
    <a class="brand" href="#" aria-label="${esc(s.name)} – Trang chủ">${logo}</a>
    <nav class="nav" aria-label="Điều hướng chính">
      <a href="#" data-nav="home">Trang chủ</a>
      <div class="dd"><button type="button" data-nav="san-pham" aria-expanded="false" aria-haspopup="true">Sản phẩm ${I.chev}</button><div class="dd-menu">${catLinks}</div></div>
      <a href="#giai-phap" data-nav="giai-phap">Giải pháp</a>
      <a href="#dat-lam" data-nav="dat-lam">Đặt làm riêng</a>
      <a href="#lien-he" data-nav="lien-he">Liên hệ</a>
    </nav>
    <div class="tools">
      <button type="button" class="iconbtn" id="sBtn" aria-label="Tìm sản phẩm">${I.search}</button>
      <button type="button" class="btn btn-primary btn-sm" id="trialBtn">${I.play} Liên hệ dùng thử</button>
      <button type="button" class="iconbtn menu-btn" id="mBtn" aria-label="Mở menu" aria-expanded="false">${I.menu}</button>
    </div></div>`;
  $("#drawer").innerHTML = `<div class="scrim" data-close-drawer></div><nav aria-label="Menu">
    <div class="dhead"><a class="brand" href="#" aria-label="${esc(s.name)} – Trang chủ">${logo}</a><button type="button" class="iconbtn" data-close-drawer aria-label="Đóng menu">${I.x}</button></div>
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
  $("#trialBtn").onclick = () => contactDialog("Liên hệ dùng thử", `Chào bạn, mình ở [tên đơn vị]. Mình muốn dùng thử [tên phần mềm].`, "Liên hệ dùng thử", `<p>Ghi tên phần mềm bạn quan tâm (xem ở <a href="#san-pham" data-setcat="" data-close>trang Sản phẩm</a>), rồi gửi qua Zalo hoặc email. ${esc(S.site.owner)} gửi link hoặc mã dùng thử trong ${esc(S.site.responseHours)} giờ làm việc.</p>`);
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeDrawer(); });

  $("#foot").innerHTML = `<div class="wrap">
    <div class="f-brand"><a class="brand" href="#" aria-label="${esc(s.name)} – Trang chủ">${logo}</a>
      ${s.slogan ? `<p class="about"><b>${esc(s.slogan)}</b></p>` : ""}
      <p class="about">Phần mềm, Web App và công cụ số do ${esc(s.name)} nghiên cứu, phát triển cho cá nhân, tổ chức và doanh nghiệp.</p>
      ${s.badgeHtml ? `<div style="margin-top:14px">${s.badgeHtml}</div>` : ""}</div>
    <div><h4>Sản phẩm</h4><ul><li><a href="#san-pham" data-setcat="">Tất cả sản phẩm</a></li>${cats.slice(0,5).map(c=>`<li><a href="#san-pham" data-setcat="${esc(c)}">${esc(c)}</a></li>`).join("")}<li><a href="#giai-phap">Giải pháp</a></li></ul></div>
    <div><h4>Hỗ trợ</h4><ul><li><a href="#cach-mua">Cách dùng thử và mua</a></li><li><a href="#dat-lam">Đặt làm phần mềm riêng</a></li><li><a href="#lien-he">Liên hệ</a></li></ul></div>
    <div><h4>Chính sách</h4><ul><li><a href="#giay-phep">Giấy phép sử dụng</a></li><li><a href="#bao-mat">Bảo mật</a></li><li><a href="#hoan-tien">Bảo hành, hoàn tiền</a></li></ul></div>
    <div><h4>Liên hệ</h4><ul class="f-contact">${s.email ? `<li><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></li>` : ""}${s.zalo ? `<li><a href="${zalo()}" target="_blank" rel="noopener">Zalo ${esc(s.zalo)}</a></li>` : ""}${s.phone && s.phone !== s.zalo ? `<li><a href="tel:${esc(String(s.phone).replace(/\s/g,""))}">${esc(s.phone)}</a></li>` : ""}${s.area ? `<li>${esc(s.area)}</li>` : ""}</ul></div>
    <div class="legal"><span>© ${new Date().getFullYear()} ${esc(s.name)}${s.owner ? ` · ${esc(s.owner)}` : ""}${s.taxCode ? ` · MST ${esc(s.taxCode)}` : ""}</span><span>Website giới thiệu sản phẩm; mua và thanh toán qua liên hệ trực tiếp.</span></div>
  </div>`;
}
function closeDrawer(){ const d = $("#drawer"); if (d) d.classList.remove("open"); const b = $("#mBtn"); if (b) b.setAttribute("aria-expanded","false"); }

/* ---------- cards ---------- */
function cardHTML(p){
  const plats = (p.platforms||[]).join(" · ");
  return `<a class="card" href="#sp-${esc(p.id)}">
    <div class="media"><img src="${esc(cover(p))}" alt="Giao diện ${esc(p.name)}" loading="lazy" decoding="async" width="800" height="500"></div>
    <div class="body">
      <div class="meta">${p.category ? `<span class="pill">${esc(p.category)}</span>` : ""}${statusPill(p)}</div>
      <h3>${esc(p.name)}</h3>
      <p>${esc(p.tagline)}</p>
      ${plats ? `<span class="plats">${I.win}${esc(plats)}</span>` : ""}
      <div class="foot"><span class="price-tag ${priceClass(p)}">${esc(fromPrice(p))}</span><span class="go">Xem chi tiết ${I.arrow}</span></div>
    </div></a>`;
}
const emptyBox = (title, text, cta) => `<div class="empty"><div class="tile">${I.box}</div><b>${title}</b><span class="muted">${text}</span>${cta||""}</div>`;

/* ---------- home ---------- */
const shot = (p, cls, eager) => `<figure class="win ${cls||""}"><div class="win-bar" aria-hidden="true"><i></i><i></i><i></i><span>${esc(p.name)}</span></div><img src="${esc(cover(p))}" alt="Giao diện ${esc(p.name)}" width="1600" height="1000" ${eager?'fetchpriority="high"':'loading="lazy"'} decoding="async"></figure>`;
function viewHome(){
  const s = S.site, list = visible(), cats = usedCats();
  const feat = list.find(p => p.featured && hasImg(p)) || list.find(hasImg) || list[0];
  const second = list.find(p => p !== feat && hasImg(p));
  const title = esc(s.heroTitle || "Công nghệ thông minh. Giải pháp thực tiễn.");
  const hl = s.heroHighlight && (s.heroTitle||"").includes(s.heroHighlight) ? title.replace(esc(s.heroHighlight), `<span class="accent">${esc(s.heroHighlight)}</span>`) : title;
  const featured = [...list].sort((a,b) => (b.featured?1:0) - (a.featured?1:0)).slice(0,4);
  const setup = String(s.owner||"").startsWith("[");
  setMeta(`${s.name} · ${s.slogan||""}`.replace(/ · $/,""), s.heroText);
  $("#app").innerHTML = `
  <section class="hero"><div class="wrap">
    <div class="hero-copy">
      ${s.slogan ? `<span class="eyebrow">${I.spark} ${esc(s.slogan)}</span>` : ""}
      <h1>${hl}</h1>
      ${s.heroText ? `<p class="lead">${esc(s.heroText)}</p>` : ""}
      <div class="cta"><a class="btn btn-primary" href="#san-pham" data-setcat="">${I.bag} Khám phá sản phẩm</a><a class="btn btn-outline" href="#dat-lam">${I.code} Đặt làm phần mềm riêng</a></div>
      ${setup && !S.preview ? `<div class="notice">Thông tin người bán còn trống. Vào trang quản trị → Cài đặt cửa hàng để điền.</div>` : ""}
    </div>
    ${feat && hasImg(feat) ? `<div class="hero-visual">
      <a href="#sp-${esc(feat.id)}" class="hero-main" aria-label="Xem ${esc(feat.name)}">${shot(feat, "", true)}</a>
      ${second ? `<a href="#sp-${esc(second.id)}" class="hero-second" aria-label="Xem ${esc(second.name)}">${shot(second, "small")}</a>` : ""}
      <a class="float-tag" href="#sp-${esc(feat.id)}"><span class="dot">${catStyle(feat.category).icon}</span><span><b>${esc(feat.name)}</b><small>${esc(feat.category||"")} · ${esc(fromPrice(feat))}</small></span></a>
    </div>` : ""}
  </div></section>
  <section class="trust" aria-label="Cam kết của ${esc(s.name)}"><div class="wrap">
    <div>${I.code}<span><b>Do ${esc(s.name)} phát triển</b><small>Tự nghiên cứu, làm từ công việc thật</small></span></div>
    <div>${I.user}<span><b>Hỗ trợ trực tiếp</b><small>${[s.zalo?"Zalo":"", s.email?"email":""].filter(Boolean).join(" và ") || "Liên hệ"} với người làm ra sản phẩm</small></span></div>
    <div>${I.doc}<span><b>Có hướng dẫn</b><small>Hướng dẫn cài đặt và sử dụng</small></span></div>
    <div>${I.shield}<span><b>Chính sách rõ ràng</b><small><a href="#giay-phep">Giấy phép</a>, <a href="#bao-mat">bảo mật</a>, <a href="#hoan-tien">hoàn tiền</a></small></span></div>
  </div></section>

  ${cats.length ? `<section class="section"><div class="wrap">
    <div class="s-head"><div><h2>Danh mục sản phẩm</h2><p>Chọn nhóm phù hợp với công việc của bạn</p></div></div>
    <div class="cats">${cats.map(c => { const st = catStyle(c), n = list.filter(p=>p.category===c).length;
      return `<a class="cat" href="#san-pham" data-setcat="${esc(c)}" style="--tile:${st.c};--tile-bg:${st.bg}"><span class="tile">${st.icon}</span><span class="t"><b>${esc(c)}</b><span>${esc(st.d)}</span><small>${n} sản phẩm</small></span></a>`; }).join("")}
      <a class="cat" href="#dat-lam" style="--tile:#DB2777;--tile-bg:#FDF2F8"><span class="tile">${I.code}</span><span class="t"><b>Theo yêu cầu</b><span>Website, Web App, công cụ nội bộ cho riêng bạn</span><small>Đặt làm riêng</small></span></a></div>
  </div></section>` : ""}

  <section class="section alt"><div class="wrap">
    <div class="s-head"><div><h2>Sản phẩm nổi bật</h2><p>Phần mềm và Web App do ${esc(s.name)} phát triển</p></div>${list.length > featured.length ? `<a class="link-more" href="#san-pham" data-setcat="">Xem tất cả ${list.length} sản phẩm ${I.arrow}</a>` : ""}</div>
    <div class="grid feat-grid n${featured.length}">${featured.length ? featured.map(cardHTML).join("") : emptyBox("Sản phẩm đang được cập nhật", "Bạn có nhu cầu riêng? Hãy gửi mô tả để nhận đề xuất và báo giá.", `<a class="btn btn-primary btn-sm" href="#dat-lam">Đặt làm phần mềm riêng</a>`)}</div>
  </div></section>

  ${cats.length ? `<section class="section"><div class="wrap">
    <div class="s-head"><div><h2>Giải pháp theo nhu cầu</h2><p>Bắt đầu từ việc bạn đang gặp khó, rồi chọn công cụ phù hợp</p></div><a class="link-more" href="#giai-phap">Tất cả giải pháp ${I.arrow}</a></div>
    ${solutionsHTML(3)}
  </div></section>` : ""}

  <section class="section alt"><div class="wrap">
    <div class="s-head"><div><h2>Vì sao chọn ${esc(s.name)}?</h2></div></div>
    <div class="why">
      <div><span class="tile">${I.brief}</span><span><b>Tập trung thực tiễn</b><span>Mỗi sản phẩm bắt đầu từ một công việc cụ thể cần làm nhanh và đúng hơn.</span></span></div>
      <div><span class="tile">${I.heart}</span><span><b>Dễ dùng</b><span>Giao diện tiếng Việt, thao tác rõ ràng, không cần rành kỹ thuật.</span></span></div>
      <div><span class="tile">${I.user}</span><span><b>Hỗ trợ trực tiếp</b><span>Trao đổi với chính người làm ra phần mềm khi cần hướng dẫn.</span></span></div>
      <div><span class="tile">${I.refund}</span><span><b>Cập nhật minh bạch</b><span>Mỗi trang sản phẩm có nhật ký phiên bản công khai.</span></span></div>
    </div>
  </div></section>

  <section class="section"><div class="wrap">
    <div class="s-head"><div><h2>Bắt đầu như thế nào?</h2><p>Không cần tạo tài khoản, không thanh toán trên web</p></div><a class="link-more" href="#cach-mua">Chi tiết cách mua ${I.arrow}</a></div>
    <ol class="process">
      <li><b>Khám phá</b><span>Xem tính năng, ảnh giao diện và yêu cầu hệ thống.</span></li>
      <li><b>Dùng thử</b><span>Tải bản miễn phí hoặc liên hệ để được dùng thử.</span></li>
      <li><b>Chọn gói</b><span>Gói, phạm vi và giá được xác nhận khi liên hệ.</span></li>
      <li><b>Hướng dẫn</b><span>Nhận hướng dẫn cài đặt và sử dụng.</span></li>
      <li><b>Hỗ trợ</b><span>Hỗ trợ qua ${s.zalo ? "Zalo, " : ""}email; thay đổi ghi trong nhật ký cập nhật.</span></li>
    </ol>
  </div></section>

  <section class="section" style="padding-top:0"><div class="wrap">${ctaBand()}</div></section>`;
}
const processHTML = () => `<ol class="process">
  <li><b>Liên hệ</b><span>Nhắn Zalo hoặc email kèm mã sản phẩm.</span></li>
  <li><b>Dùng thử</b><span>Liên hệ để nhận link hoặc mã dùng thử.</span></li>
  <li><b>Báo giá</b><span>Xác nhận gói, phạm vi, thời hạn.</span></li>
  <li><b>Thanh toán</b><span>Chuyển khoản theo thông tin gửi riêng.</span></li>
  <li><b>Bàn giao</b><span>Mã kích hoạt, hướng dẫn trong ${esc(S.site.deliveryHours)} giờ.</span></li></ol>`;
const ctaBand = () => `<div class="cta-band"><div><h2>Chưa thấy phần mềm phù hợp?</h2><p>Xem toàn bộ sản phẩm, hoặc gửi yêu cầu để ${esc(S.site.name)} tư vấn phát triển riêng cho cá nhân, tổ chức và doanh nghiệp.</p></div><div class="acts"><a class="btn btn-primary" href="#san-pham" data-setcat="">${I.bag} Khám phá sản phẩm</a><a class="btn btn-outline" href="#dat-lam">Gửi yêu cầu phát triển riêng</a></div></div>`;
function solutionsHTML(limit){
  const cats = usedCats().slice(0, limit || 99);
  return `<div class="sols">${cats.map(c => { const st = catStyle(c), ps = visible().filter(p => p.category === c);
    return `<article class="sol" style="--tile:${st.c};--tile-bg:${st.bg}"><div class="sol-h"><span class="tile">${st.icon}</span><h3>${esc(c)}</h3></div>
      <p class="need"><span>Vấn đề</span>${esc(st.need)}</p>
      <div class="how"><span>${esc(S.site.name)} hỗ trợ bằng</span><ul>${ps.slice(0,4).map(p => `<li><a href="#sp-${esc(p.id)}"><b>${esc(p.name)}</b><small>${esc(p.tagline)}</small></a></li>`).join("")}</ul></div>
      <a class="link-more" href="#san-pham" data-setcat="${esc(c)}">Xem ${ps.length} sản phẩm ${esc(c.toLowerCase())} ${I.arrow}</a></article>`; }).join("")}</div>`;
}

/* ---------- catalog ---------- */
const PRICE = [["all","Tất cả mức giá"],["free","Có bản miễn phí"],["lt500","Dưới 500.000đ"],["500-2m","500.000đ – 2.000.000đ"],["gt2m","Trên 2.000.000đ"],["ask","Liên hệ dùng thử"]];
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
  setMeta(`Sản phẩm · ${S.site.name}`, `Phần mềm, Web App và công cụ do ${S.site.name} phát triển: ${list.map(p=>p.name).join(", ")}.`);
  $("#app").innerHTML = `
  <section class="phead"><div class="wrap"><nav class="crumbs" aria-label="Đường dẫn"><a href="#">Trang chủ</a><span aria-hidden="true">/</span><span aria-current="page">Sản phẩm</span></nav>
    <h1>Sản phẩm</h1><p>Phần mềm, Web App và công cụ do ${esc(S.site.name)} phát triển. Xem kỹ tính năng, dùng thử rồi chọn gói phù hợp.</p></div></section>
  <div class="wrap catalog">
    <div class="fscrim" id="fScrim" hidden></div>
    <aside class="filters" id="filters" aria-label="Bộ lọc">
      <div class="fs-head"><h2>Bộ lọc</h2><button type="button" class="iconbtn" id="fClose" aria-label="Đóng bộ lọc">${I.x}</button></div>
      <div><h3>Danh mục</h3>${cats.map(c => `<label class="opt"><input type="checkbox" data-fc="${esc(c)}" ${f.cats.includes(c)?"checked":""}><span>${esc(c)}</span><small>${list.filter(p=>p.category===c).length}</small></label>`).join("") || `<p class="muted">Chưa có danh mục.</p>`}</div>
      ${plats.length ? `<div><h3>Nền tảng</h3>${plats.map(x => `<label class="opt"><input type="checkbox" data-fp="${esc(x)}" ${f.plats.includes(x)?"checked":""}><span>${esc(x)}</span><small>${list.filter(p=>(p.platforms||[]).includes(x)).length}</small></label>`).join("")}</div>` : ""}
      <div><h3>Mức giá</h3>${PRICE.map(([k,l]) => `<label class="opt"><input type="radio" name="fprice" value="${k}" ${f.price===k?"checked":""}><span>${l}</span></label>`).join("")}</div>
      <button type="button" class="reset" id="fReset">Xóa bộ lọc</button>
      <div class="fs-foot"><button type="button" class="btn btn-primary btn-block" id="fApply">Xem kết quả</button></div>
    </aside>
    <div>
      <div class="toolbar">
        <label class="search">${I.search}<input id="q" type="search" placeholder="Tìm theo tên, tính năng…" aria-label="Tìm sản phẩm" value="${esc(f.q)}"></label>
        <button type="button" class="btn btn-ghost filter-btn" id="fBtn" aria-controls="filters" aria-expanded="false">${I.filter} Bộ lọc<span class="fcount" id="fCount" hidden></span></button>
        <label class="select"><span>Sắp xếp</span><select id="sort" aria-label="Sắp xếp sản phẩm">${SORT.map(([k,l]) => `<option value="${k}" ${f.sort===k?"selected":""}>${l}</option>`).join("")}</select></label>
      </div>
      <p class="count" id="count" aria-live="polite"></p>
      <div class="grid" id="grid"></div>
    </div>
  </div>`;
  const draw = () => {
    const l = filtered();
    $("#count").innerHTML = `Hiển thị <b>${l.length}</b> / ${list.length} sản phẩm`;
    const nf = f.cats.length + f.plats.length + (f.price !== "all" ? 1 : 0);
    $("#fCount").hidden = !nf; $("#fCount").textContent = nf; $("#fApply").textContent = `Xem ${l.length} kết quả`;
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
  const sheet = o => { $("#filters").classList.toggle("open", o); $("#fScrim").hidden = !o; document.body.classList.toggle("lock", o && matchMedia("(max-width:900px)").matches); $("#fBtn").setAttribute("aria-expanded", String(o)); if (o) $("#fClose").focus(); };
  $("#fBtn").onclick = () => sheet(!$("#filters").classList.contains("open"));
  $("#fClose").onclick = $("#fApply").onclick = $("#fScrim").onclick = () => { sheet(false); $("#fBtn").focus(); };
  $("#filters").onkeydown = e => { if (e.key === "Escape") { sheet(false); $("#fBtn").focus(); } };
  draw();
}

/* ---------- product ---------- */
function viewProduct(p){
  const s = S.site, imgs = hasImg(p) ? p.images : [{ caption:"", gen:true }];
  const im = i => imgs[i].gen ? genCover(p) : src(imgs[i].src);
  const vid = videoEmbed(p.video);
  const secs = [["tong-quan","Tổng quan",!!p.description],["tinh-nang","Tính năng",(p.features||[]).length],["video","Video",!!vid],["bang-gia","Bảng giá",(p.plans||[]).length],["yeu-cau","Yêu cầu hệ thống",(p.requirements||[]).length],["hoi-dap","Hỏi đáp",(p.faq||[]).length],["cap-nhat","Cập nhật",(p.changelog||[]).length]].filter(x=>x[2]);
  setMeta(`${p.name} · ${s.name}`, p.tagline);
  const pc = priceClass(p);
  $("#app").innerHTML = `
  <div class="wrap">
    <nav class="crumbs" aria-label="Đường dẫn" style="padding-top:24px"><a href="#">Trang chủ</a><span aria-hidden="true">/</span><a href="#san-pham" data-setcat="">Sản phẩm</a><span aria-hidden="true">/</span>${p.category ? `<a href="#san-pham" data-setcat="${esc(p.category)}">${esc(p.category)}</a><span aria-hidden="true">/</span>` : ""}<span aria-current="page">${esc(p.name)}</span></nav>
    <div class="p-top">
      <div>
        <div class="stage"><button type="button" class="main" id="gMain" aria-label="Phóng to ảnh"><img class="big" id="gImg" src="${esc(im(0))}" alt="${esc(imgs[0].caption || "Giao diện " + p.name)}" width="1600" height="1000" fetchpriority="high" decoding="async"></button>
          ${imgs.length > 1 ? `<div class="thumbs" role="group" aria-label="Ảnh sản phẩm">${imgs.map((x,i)=>`<button type="button" data-i="${i}" aria-current="${i===0}" aria-label="Xem ảnh ${i+1}"><img src="${esc(im(i))}" alt="" loading="lazy" decoding="async" width="160" height="100"></button>`).join("")}</div>` : ""}</div>
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
          ${p.download ? dlBtn(p, "btn-primary", dlLabel(p)) : `<button type="button" class="btn btn-primary" data-buy="">${I.play} ${fromPrice(p) === "Miễn phí" ? "Nhận bản miễn phí" : "Liên hệ dùng thử"}</button>`}
          ${(p.plans||[]).length ? `<a class="btn btn-outline" href="#bang-gia" data-jump="bang-gia">Xem bảng giá</a>` : ""}
          ${vid ? `<a class="btn btn-ghost" href="#video" data-jump="video">${I.play} Xem video</a>` : (p.video && /^https?:\/\//.test(p.video) ? `<a class="btn btn-ghost" href="${esc(p.video)}" target="_blank" rel="noopener">${I.play} Video</a>` : "")}
        </div>
        ${p.download && p.downloadNote ? `<p class="dl-note">${esc(p.downloadNote)}</p>` : ""}
        <div class="p-note">${Number(s.responseHours) > 0 ? `<span>${I.reply} Phản hồi trong ${esc(s.responseHours)} giờ làm việc</span>` : ""}<span>${I.shield} <a href="#giay-phep">Giấy phép sử dụng</a></span><span>Mã sản phẩm <span class="mono">${esc(String(p.id).toUpperCase())}</span></span></div>
      </div>
    </div>
  </div>
  ${secs.length ? `<nav class="tabbar" aria-label="Nội dung sản phẩm"><div class="wrap">${secs.map((x,i)=>`<a href="#${x[0]}" data-jump="${x[0]}" aria-current="${i===0}">${x[1]}</a>`).join("")}</div></nav>` : ""}
  <div class="wrap">
    ${p.description ? `<section class="p-sec" id="tong-quan"><h2>Tổng quan</h2><div class="prose">${md(p.description)}</div></section>` : ""}
    ${(p.features||[]).length ? `<section class="p-sec" id="tinh-nang"><h2>Tính năng</h2><div class="feats">${p.features.map((f,i)=>`<div class="feat"><span class="tile">${String(i+1).padStart(2,"0")}</span><b>${esc(f.title)}</b><span>${esc(f.text)}</span></div>`).join("")}</div></section>` : ""}
    ${vid ? `<section class="p-sec" id="video"><h2>Video giới thiệu</h2><div class="vid">${vid}</div></section>` : ""}
    ${(p.plans||[]).length ? `<section class="p-sec" id="bang-gia"><h2>Bảng giá</h2><div class="plans${p.plans.length===1?" one":""}">${p.plans.map((pl,i)=>`
      <div class="plan${pl.highlight?" hot":""}">${pl.highlight&&p.plans.length>1?`<span class="flag">Nên chọn</span>`:""}
        ${String(pl.name||"").trim().toLowerCase()===String(planPrice(pl)).replace(/<[^>]+>/g,"").trim().toLowerCase()?"":`<h3>${esc(pl.name)}</h3>`}${pl.audience?`<p class="aud">${esc(pl.audience)}</p>`:""}
        <div class="amt">${planPrice(pl)}${pl.unit && !(isNum(pl.price)&&Number(pl.price)===0) ? ` <small>${esc(pl.unit)}</small>` : ""}</div>
        ${(pl.items||[]).filter(Boolean).length?`<ul>${pl.items.filter(Boolean).map(x=>`<li>${I.check}<span>${esc(x)}</span></li>`).join("")}</ul>`:""}
        ${p.download && isNum(pl.price) && Number(pl.price)===0 ? dlBtn(p, (pl.highlight?"btn-primary":"btn-outline")+" btn-block", "Tải về miễn phí") : `<button type="button" class="btn ${pl.highlight?"btn-primary":"btn-outline"} btn-block" data-buy="${i}">${isNum(pl.price)&&Number(pl.price)===0?"Nhận bản miễn phí":(!isNum(pl.price)?"Nhận báo giá":"Chọn gói này")}</button>`}
      </div>`).join("")}</div>${p.plans.every(pl=>isNum(pl.price)&&Number(pl.price)===0)?"":`<p class="fine">Giá chưa gồm chi phí máy chủ, tên miền, khóa AI (nếu có) do đơn vị tự đăng ký. Cần hóa đơn, vui lòng báo trước khi thanh toán.</p>`}</section>` : ""}
    ${(p.requirements||[]).length ? `<section class="p-sec" id="yeu-cau"><h2>Yêu cầu hệ thống</h2><table class="req"><tbody>${p.requirements.map(r=>`<tr><th scope="row">${esc(r.label)}</th><td>${esc(r.value)}</td></tr>`).join("")}</tbody></table></section>` : ""}
    ${(p.faq||[]).length ? `<section class="p-sec" id="hoi-dap"><h2>Hỏi đáp</h2><div class="faq">${p.faq.map(f=>`<details><summary>${esc(f.q)}</summary><p>${esc(f.a)}</p></details>`).join("")}</div></section>` : ""}
    ${(p.changelog||[]).length ? `<section class="p-sec" id="cap-nhat"><h2>Nhật ký cập nhật</h2><ul class="log">${p.changelog.map(c=>`<li><div class="v"><b>Phiên bản ${esc(c.version)}</b><small>${esc(fmtDate(c.date))}</small></div><p>${esc(c.text)}</p></li>`).join("")}</ul></section>` : ""}
    <div class="buybar" id="buybar" role="region" aria-label="Mua nhanh"><div><b class="${pc}">${esc(fromPrice(p))}</b><small>${esc(p.name)}</small></div>${p.download ? dlBtn(p, "btn-primary btn-sm", "Tải về") : `<button type="button" class="btn btn-primary btn-sm" data-buy="">${fromPrice(p) === "Miễn phí" ? "Nhận miễn phí" : "Liên hệ dùng thử"}</button>`}</div>
    <section style="padding-block:24px 72px"><div class="cta-band"><div><h2>${fromPrice(p) === "Miễn phí" ? `Dùng ${esc(p.name)} miễn phí ngay hôm nay` : `Thử ${esc(p.name)} trên công việc thật của bạn`}</h2><p>${fromPrice(p) === "Miễn phí" ? "Miễn phí, có hướng dẫn cài đặt và hỗ trợ trực tiếp khi cần." : "Liên hệ để được dùng thử, có hướng dẫn cài đặt và hỗ trợ trực tiếp."}</p></div><div class="acts">${p.download ? dlBtn(p, "btn-primary", "Tải về miễn phí") : `<button type="button" class="btn btn-primary" data-buy="">${fromPrice(p) === "Miễn phí" ? "Nhận bản miễn phí" : "Liên hệ dùng thử"} ${I.arrow}</button>`}<a class="btn btn-outline" href="#san-pham" data-setcat="">Xem sản phẩm khác</a></div></div></section>
  </div>`;
  let cur = 0;
  const show = i => { cur = i; $("#gImg").src = im(i); $("#gImg").alt = imgs[i].caption || "Giao diện " + p.name; $("#gCap").textContent = imgs[i].caption || "";
    $$(".thumbs button").forEach(b => b.setAttribute("aria-current", String(+b.dataset.i === i))); };
  $$(".thumbs button").forEach(b => b.onclick = () => show(+b.dataset.i));
  $("#gMain").onclick = () => lightbox(imgs.map((x,i)=>({ src:im(i), caption:x.caption })), cur);
  $$("[data-buy]").forEach(b => b.onclick = () => buy(p, b.dataset.buy === "" ? null : p.plans[+b.dataset.buy]));
  $$("[data-jump]").forEach(a => a.onclick = e => { e.preventDefault(); const t = document.getElementById(a.dataset.jump); if (t) t.scrollIntoView(); });
  // buybar mobile: chỉ hiện khi nút chính đã cuộn khỏi màn hình
  const cta = $(".p-cta"), bb = $("#buybar");
  if (cta && bb && "IntersectionObserver" in window) new IntersectionObserver(es => bb.classList.toggle("show", !es[0].isIntersecting && es[0].boundingClientRect.top < 0)).observe(cta);
  else if (bb) bb.classList.add("show");
  // scroll-spy cho thanh tab
  const tabs = $$(".tabbar a");
  if (tabs.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(es => { es.forEach(en => { if (en.isIntersecting) tabs.forEach(a => a.setAttribute("aria-current", String(a.dataset.jump === en.target.id))); }); }, { rootMargin:"-160px 0px -60% 0px" });
    secs.forEach(x => { const el = document.getElementById(x[0]); if (el) io.observe(el); });
  }
}

/* ---------- solutions & custom pages ---------- */
function viewSolutions(){
  setMeta(`Giải pháp · ${S.site.name}`, `Giải pháp phần mềm theo nhu cầu: ${usedCats().join(", ")}. Chưa thấy đúng nhu cầu? ${S.site.name} nhận phát triển riêng.`);
  $("#app").innerHTML = `<section class="phead"><div class="wrap"><nav class="crumbs" aria-label="Đường dẫn"><a href="#">Trang chủ</a><span aria-hidden="true">/</span><span aria-current="page">Giải pháp</span></nav>
    <h1>Giải pháp cho từng nhu cầu</h1><p>Bắt đầu từ việc bạn đang gặp khó, xem ${esc(S.site.name)} hỗ trợ bằng sản phẩm nào. Chưa thấy đúng nhu cầu? ${esc(S.site.name)} nhận phát triển riêng.</p></div></section>
  <section class="section"><div class="wrap">${usedCats().length ? solutionsHTML() : emptyBox("Giải pháp đang được cập nhật", "Gửi mô tả bài toán của bạn để nhận đề xuất phù hợp.", `<a class="btn btn-primary btn-sm" href="#dat-lam">Gửi yêu cầu</a>`)}</div></section>
  <section class="section alt"><div class="wrap">${ctaBand()}</div></section>`;
}
function viewCustom(){
  const s = S.site, z = zalo();
  setMeta(`Đặt làm phần mềm riêng · ${s.name}`, `${s.name} tư vấn và xây dựng website, Web App, công cụ nội bộ theo yêu cầu: phân tích nghiệp vụ, thiết kế UI/UX, phát triển, triển khai, bảo trì.`);
  const box = `<span class="box">${I.check.replace('class="ic"','')}</span>`;
  $("#app").innerHTML = `<section class="phead"><div class="wrap"><nav class="crumbs" aria-label="Đường dẫn"><a href="#">Trang chủ</a><span aria-hidden="true">/</span><span aria-current="page">Đặt làm riêng</span></nav>
    <h1>Tư vấn và xây dựng phần mềm theo yêu cầu</h1><p>Website, Web App và công cụ nội bộ được làm đúng quy trình của đơn vị bạn: từ phân tích nghiệp vụ đến triển khai và bảo trì.</p>
    <div class="cta" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:20px"><a class="btn btn-primary" href="#yeu-cau-form" data-jump="yeu-cau-form">Gửi yêu cầu ${I.arrow}</a><a class="btn btn-outline" href="#san-pham" data-setcat="">Xem sản phẩm có sẵn</a></div></div></section>
  <section class="section"><div class="wrap">
    <div class="s-head"><div><h2>Dịch vụ</h2><p>Nhận trọn gói hoặc từng phần, tùy nhu cầu</p></div></div>
    <div class="svc">
      <div><span class="tile">${I.flow}</span><b>Phân tích nghiệp vụ</b><span>Tìm hiểu quy trình, mẫu biểu đang dùng; xác định chức năng cần có.</span></div>
      <div><span class="tile">${I.wand}</span><b>Thiết kế UI/UX</b><span>Bố cục, giao diện dễ dùng trên máy tính và điện thoại.</span></div>
      <div><span class="tile">${I.code}</span><b>Phát triển</b><span>Lập trình website, Web App, công cụ nội bộ, tự động hóa Excel.</span></div>
      <div><span class="tile">${I.store}</span><b>Triển khai</b><span>Đưa lên tên miền, hosting hoặc máy chủ của đơn vị; hướng dẫn sử dụng.</span></div>
      <div><span class="tile">${I.shield}</span><b>Bảo trì</b><span>Sửa lỗi, cập nhật, bổ sung chức năng theo thỏa thuận.</span></div>
    </div>
  </div></section>
  <section class="section alt"><div class="wrap">
    <div class="s-head"><div><h2>Có thể làm gì?</h2></div></div>
    <ul class="ticks two">
      <li>${box}<span><b>Công cụ nội bộ:</b> tra cứu, biểu mẫu, quản lý danh sách, duyệt hồ sơ.</span></li>
      <li>${box}<span><b>Tự động hóa Excel:</b> công thức, menu, macro; xuất đúng mẫu của đơn vị.</span></li>
      <li>${box}<span><b>Web App cho dịch vụ:</b> đặt lịch, đăng ký, theo dõi tiến độ cho khách hàng.</span></li>
      <li>${box}<span><b>Số hóa quy trình:</b> chuyển quy trình giấy, tin nhắn sang hệ thống có phân quyền.</span></li>
    </ul>
  </div></section>
  <section class="section"><div class="wrap">
    <div class="s-head"><div><h2>Quy trình làm việc</h2></div></div>
    <ol class="process"><li><b>Tiếp nhận</b><span>Bạn gửi mô tả công việc, mẫu biểu (đã che dữ liệu cá nhân).</span></li><li><b>Phân tích</b><span>Trao đổi để làm rõ quy trình và chức năng cần có.</span></li><li><b>Phạm vi, chi phí</b><span>Đề xuất chức năng, nơi lưu dữ liệu, thời gian và báo giá.</span></li><li><b>Phát triển</b><span>Làm bản mẫu để bạn bấm thử, rồi hoàn thiện và kiểm thử.</span></li><li><b>Bàn giao, hỗ trợ</b><span>Cài đặt, hướng dẫn, bảo hành theo thỏa thuận.</span></li></ol>
  </div></section>
  <section class="section alt" id="yeu-cau-form"><div class="wrap req-wrap">
    <div><h2 style="font-size:var(--fs-h2)">Gửi yêu cầu</h2><p class="muted" style="margin-top:8px">Điền vài dòng, trang sẽ soạn sẵn tin nhắn để bạn gửi cho ${esc(s.name)} qua ${z ? "Zalo hoặc " : ""}email.</p>
      <ul class="ticks" style="margin-top:18px"><li>${box}<span>Website không lưu và không tự gửi thông tin bạn nhập; nội dung chỉ đi khi bạn bấm gửi${z ? " qua Zalo hoặc" : " qua"} email.</span></li><li>${box}<span>Không đưa dữ liệu cá nhân của học sinh, khách hàng vào mô tả.</span></li></ul></div>
    <form class="rform" id="rForm" novalidate>
      <div class="g2"><label class="fld"><span>Họ tên <i aria-hidden="true">*</i></span><input id="rName" name="name" autocomplete="name" required aria-describedby="eName"><small class="ferr" id="eName"></small></label>
        <label class="fld"><span>Đơn vị</span><input id="rOrg" name="org" autocomplete="organization"></label></div>
      <div class="g2"><label class="fld"><span>Số Zalo hoặc email <i aria-hidden="true">*</i></span><input id="rContact" name="contact" required aria-describedby="eContact"><small class="ferr" id="eContact"></small></label>
        <label class="fld"><span>Loại sản phẩm</span><select id="rType" name="type"><option>Website</option><option>Web App</option><option>Công cụ nội bộ</option><option>Tự động hóa Excel</option><option>Khác / chưa rõ</option></select></label></div>
      <label class="fld"><span>Mô tả nhu cầu <i aria-hidden="true">*</i></span><textarea id="rDesc" name="desc" rows="5" required aria-describedby="eDesc" placeholder="Công việc cần làm, hiện đang làm bằng gì (Excel, giấy…), ai sẽ dùng."></textarea><small class="ferr" id="eDesc"></small></label>
      <label class="fld"><span>Thời gian mong muốn</span><input id="rWhen" name="when" placeholder="Ví dụ: trước tháng 12"></label>
      <div class="fstate" id="rState" role="status" aria-live="polite"></div>
      <button type="submit" class="btn btn-primary">Soạn yêu cầu ${I.arrow}</button>
    </form>
  </div></section>`;
  $$("[data-jump]").forEach(a => a.onclick = e => { e.preventDefault(); const t = document.getElementById(a.dataset.jump); if (t) { t.scrollIntoView(); setTimeout(() => $("#rName").focus({preventScroll:true}), 400); } });
  const f = $("#rForm"), st = $("#rState");
  const setErr = (id, eid, msg) => { const el = $(id); el.setAttribute("aria-invalid", msg ? "true" : "false"); $(eid).textContent = msg || ""; return !msg; };
  f.onsubmit = e => {
    e.preventDefault();
    const v = k => $(k).value.trim(), contact = v("#rContact");
    const okC = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) || /^\+?[\d\s.]{9,14}$/.test(contact);
    const ok = [setErr("#rName","#eName", v("#rName") ? "" : "Vui lòng nhập họ tên."),
      setErr("#rContact","#eContact", !contact ? "Vui lòng nhập số Zalo hoặc email." : okC ? "" : "Số điện thoại hoặc email chưa đúng định dạng."),
      setErr("#rDesc","#eDesc", v("#rDesc").length >= 20 ? "" : "Mô tả ít nhất 20 ký tự để được tư vấn đúng.")].every(Boolean);
    if (!ok) { st.className = "fstate err"; st.innerHTML = `<b>Chưa soạn được yêu cầu.</b> Vui lòng kiểm tra các ô được đánh dấu.`; const bad = $('[aria-invalid="true"]', f); if (bad) bad.focus(); return; }
    const msg = `Chào ${s.name}, mình là ${v("#rName")}${v("#rOrg") ? " (" + v("#rOrg") + ")" : ""}.\nMình cần làm: ${$("#rType").value}.\nMô tả: ${v("#rDesc")}${v("#rWhen") ? "\nThời gian mong muốn: " + v("#rWhen") : ""}\nLiên hệ: ${contact}`;
    st.className = "fstate ok";
    st.innerHTML = `<b>Đã soạn xong yêu cầu.</b> Bước cuối: gửi cho ${esc(s.name)}.<div class="copyline" style="margin-top:10px"><code style="white-space:pre-wrap">${esc(msg)}</code></div>
      <div class="acts">${z ? `<a class="btn btn-primary btn-sm" href="${z}" target="_blank" rel="noopener" id="rZalo">Sao chép và mở Zalo</a>` : ""}${s.email ? `<a class="btn ${z?"btn-outline":"btn-primary"} btn-sm" href="mailto:${esc(s.email)}?subject=${encodeURIComponent("Yêu cầu làm phần mềm riêng")}&body=${encodeURIComponent(msg)}">Gửi email</a>` : ""}<button type="button" class="copybtn" data-copy="${esc(msg)}">Sao chép</button></div>`;
    const zb = $("#rZalo"); if (zb) zb.addEventListener("click", () => { try { navigator.clipboard.writeText(msg).then(() => toast("Đã sao chép, dán vào khung chat Zalo"), () => {}); } catch(err) {} });
    st.scrollIntoView({ block:"nearest" });
  };
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
  contactDialog(plan ? `${plan.name} · ${planPrice(plan)}` : `Liên hệ dùng thử ${p.name}`, msg, (plan ? "Mua " : "Dùng thử ") + code, extra);
}

/* ---------- text pages ---------- */
const ptabs = cur => `<div class="ptabs" role="navigation" aria-label="Chính sách">${[["giay-phep","Giấy phép sử dụng"],["bao-mat","Bảo mật"],["hoan-tien","Bảo hành & hoàn tiền"],["cach-mua","Cách mua & thanh toán"]].map(([h,l])=>`<a href="#${h}"${h===cur?' aria-current="page"':""}>${l}</a>`).join("")}</div>`;
const PAGES = {
  "cach-mua": s => ["Cách dùng thử và mua", "Website giới thiệu sản phẩm. Dùng thử, báo giá và thanh toán thực hiện qua trao đổi trực tiếp.", `${ptabs("cach-mua")}${processHTML()}
    <h2>1. Liên hệ</h2><p>Mở trang sản phẩm, bấm "Liên hệ dùng thử" để lấy tin nhắn mẫu có mã sản phẩm, gửi qua Zalo hoặc email.</p>
    <h2>2. Dùng thử</h2><p>Nhận link hoặc mã dùng thử; thời hạn dùng thử được thống nhất khi liên hệ. Hết hạn, dữ liệu vẫn nằm trên máy bạn; nhập mã chính thức là dùng tiếp.</p>
    <h2>3. Báo giá và thanh toán</h2><p>Báo giá ghi rõ gói, thời hạn, phạm vi sử dụng. Chuyển khoản theo thông tin gửi riêng, nội dung ghi mã sản phẩm. Cần hóa đơn, vui lòng báo trước khi thanh toán.</p>
    <h2>4. Bàn giao</h2><p>Trong ${esc(s.deliveryHours)} giờ sau khi nhận tiền: mã kích hoạt hoặc bộ cài, hướng dẫn sử dụng, xác nhận giấy phép. Sản phẩm cần máy chủ được cài lên tài khoản của đơn vị.</p>`],
  "giay-phep": s => ["Giấy phép sử dụng phần mềm", `Cập nhật ${esc(s.updated)}.`, `${ptabs("giay-phep")}
    <h2>1. Bên cung cấp</h2><p>${esc(s.owner)}${s.taxCode ? `, mã số thuế ${esc(s.taxCode)}` : ""}${s.area ? `, ${esc(s.area)}` : ""}. Liên hệ: ${esc(s.email)}${s.phone ? `, ${esc(s.phone)}` : ""}.</p>
    <h2>2. Bạn nhận được gì</h2><p>Quyền sử dụng phần mềm theo gói đã mua: phạm vi (một đơn vị, một máy hoặc một người) và thời hạn (theo năm, theo đợt hoặc vĩnh viễn) ghi trong xác nhận giấy phép. Quyền tác giả và mã nguồn vẫn thuộc bên cung cấp, trừ khi có thỏa thuận khác bằng văn bản.</p>
    <h2>3. Không được làm</h2><ul><li>Bán lại, cho thuê, chia sẻ mã kích hoạt hoặc bộ cài cho đơn vị khác.</li><li>Dịch ngược, sửa đổi để gỡ cơ chế kích hoạt hay dùng thử.</li><li>Dùng phần mềm cho mục đích trái pháp luật.</li></ul>
    <h2>4. Dùng thử</h2><p>Bản dùng thử có đủ tính năng trong thời hạn được thống nhất khi liên hệ, trừ khi trang sản phẩm ghi khác. Hết hạn, phần mềm khóa thao tác nhưng không xóa dữ liệu.</p>
    <h2>5. Cập nhật và hỗ trợ</h2><p>Gói theo năm: cập nhật và hỗ trợ trong thời hạn. Gói vĩnh viễn: dùng mãi phiên bản đã mua, kèm 12 tháng cập nhật.</p>
    <h2>6. Dữ liệu</h2><p>Dữ liệu bạn nhập thuộc về bạn. Bạn chịu trách nhiệm sao lưu định kỳ theo hướng dẫn của từng phần mềm.</p>
    <h2>7. Giới hạn trách nhiệm</h2><p>Phần mềm được kiểm thử như mô tả nhưng không cam kết hoàn toàn không có lỗi. Kết quả quan trọng (điểm thi, hồ sơ) cần người có thẩm quyền rà soát trước khi dùng. Trách nhiệm bồi thường không vượt số tiền đã trả cho gói liên quan, trừ trường hợp pháp luật quy định khác. Điều khoản này không làm mất quyền của người tiêu dùng theo pháp luật Việt Nam.</p>
    <h2>8. Thành phần bên thứ ba</h2><p>Một số phần mềm dùng thư viện mã nguồn mở; danh sách và giấy phép đi kèm bộ cài. Dịch vụ bên ngoài (máy chủ, AI) do đơn vị tự đăng ký áp dụng điều khoản của nhà cung cấp đó.</p>`],
  "bao-mat": s => ["Chính sách bảo mật", `Cập nhật ${esc(s.updated)}. Áp dụng theo Luật Bảo vệ dữ liệu cá nhân 2025.`, `${ptabs("bao-mat")}
    <h2>Website này</h2><p>Không có tài khoản hay form đăng ký, không dùng cookie theo dõi hay công cụ thống kê. Trình duyệt chỉ ghi nhớ bộ lọc bạn đã chọn, lưu trên máy bạn. Form "Gửi yêu cầu" ở trang Đặt làm riêng chỉ soạn sẵn tin nhắn ngay trên máy bạn; website không lưu và không tự gửi nội dung này.</p>
    <h2>Khi bạn liên hệ, mua</h2><p>${esc(s.owner)} nhận được: tên, tên đơn vị, số điện thoại hoặc email, nội dung trao đổi, thông tin chuyển khoản. Chỉ dùng để tư vấn, cấp giấy phép, hỗ trợ, xuất hóa đơn và xử lý khiếu nại; không bán, không chia sẻ, không gửi quảng cáo khi chưa được đồng ý. Thông tin giao dịch lưu tối đa 3 năm cho nghĩa vụ thuế, sau đó xóa.</p>
    <h2>Dữ liệu trong phần mềm</h2><p>Trang mỗi sản phẩm ghi rõ nơi lưu dữ liệu. Bên cung cấp không giữ bản sao dữ liệu học sinh, nhân viên của bạn; khi hỗ trợ chỉ truy cập khi bạn đồng ý và trong phạm vi cần thiết.</p>
    <h2>Dữ liệu trẻ em</h2><p>Sản phẩm dành cho học sinh tiểu học không thu họ tên, ảnh của trẻ. Đơn vị dùng phần mềm có dữ liệu học sinh chịu trách nhiệm có sự đồng ý của cha mẹ hoặc người đại diện khi pháp luật yêu cầu.</p>
    <h2>Tính năng AI</h2><p>Chỉ bật khi đơn vị tự gắn khóa API của nhà cung cấp AI. Phần mềm ghi rõ dữ liệu nào được gửi đi; kết quả AI cần người kiểm tra lại.</p>
    <h2>Quyền của bạn</h2><p>Yêu cầu xem, sửa, xóa dữ liệu, rút lại đồng ý: gửi tới ${esc(s.email)}${Number(s.responseHours) > 0 ? `; phản hồi trong ${esc(s.responseHours)} giờ làm việc` : ""}.</p>`],
  "hoan-tien": s => ["Bảo hành, hoàn tiền, khiếu nại", `Cập nhật ${esc(s.updated)}.`, `${ptabs("hoan-tien")}
    <h2>Bảo hành</h2><p>Sửa lỗi miễn phí trong thời hạn giấy phép. Lỗi làm sai kết quả (điểm, tính toán) được ưu tiên xử lý trong 2 ngày làm việc.</p>
    <h2>Hoàn tiền 100% trong ${esc(s.refundDays)} ngày khi</h2><ol><li>Phần mềm không chạy được trên máy đáp ứng yêu cầu ghi ở trang sản phẩm và không khắc phục được.</li><li>Phần mềm khác với mô tả.</li><li>Đã thanh toán nhưng không được bàn giao sau ${esc(s.deliveryHours)} giờ.</li><li>Thanh toán trùng.</li></ol>
    <h2>Không hoàn tiền khi</h2><p>Đổi ý sau khi đã kích hoạt mà phần mềm chạy đúng mô tả. Vì vậy hãy dùng thử trước khi mua.</p>
    <h2>Gửi yêu cầu</h2><p>Gửi tới ${esc(s.email)}${s.phone ? ` hoặc ${esc(s.phone)}` : ""}: mã sản phẩm, thời gian thanh toán, mô tả lỗi kèm ảnh chụp.${Number(s.responseHours) > 0 ? ` Phản hồi trong ${esc(s.responseHours)} giờ làm việc;` : ""} hoàn tiền về đúng tài khoản đã chuyển trong 5 ngày làm việc sau khi xác nhận.</p>
    <h2>Giải quyết tranh chấp</h2><p>Ưu tiên thương lượng. Nếu không thống nhất, bạn có thể gửi yêu cầu tới cơ quan bảo vệ quyền lợi người tiêu dùng hoặc tòa án theo pháp luật Việt Nam.</p>`],
  "lien-he": s => ["Liên hệ", "Xin dùng thử, nhận báo giá, đặt làm phần mềm riêng, báo lỗi.", `<div class="channels">
      ${s.zalo ? `<a class="channel" href="${zalo()}" target="_blank" rel="noopener">${I.chat}<span><b>Zalo</b><small>${esc(s.zalo)}</small></span></a>` : ""}
      ${s.email ? `<a class="channel" href="mailto:${esc(s.email)}">${I.reply}<span><b>Email</b><small>${esc(s.email)}</small></span></a>` : ""}
      ${s.phone ? `<a class="channel" href="tel:${esc(String(s.phone).replace(/\s/g,""))}">${I.user}<span><b>Điện thoại</b><small>${esc(s.phone)}</small></span></a>` : ""}
    </div>
    <dl class="contact">
      ${s.owner ? `<div><dt>Người bán</dt><dd>${esc(s.owner)}</dd></div>` : ""}
      ${s.taxCode ? `<div><dt>Mã số thuế</dt><dd>${esc(s.taxCode)}</dd></div>` : ""}
      ${s.email ? `<div><dt>Email</dt><dd class="copyline"><code>${esc(s.email)}</code><button type="button" class="copybtn" data-copy="${esc(s.email)}">Sao chép</button></dd></div>` : ""}
      ${s.phone ? `<div><dt>Điện thoại</dt><dd class="copyline"><code>${esc(s.phone)}</code><button type="button" class="copybtn" data-copy="${esc(s.phone)}">Sao chép</button></dd></div>` : ""}
      ${s.area ? `<div><dt>Khu vực</dt><dd>${esc(s.area)}</dd></div>` : ""}
    </dl>${Number(s.responseHours) > 0 ? `<p class="muted" style="margin-top:16px">Phản hồi trong ${esc(s.responseHours)} giờ làm việc.</p>` : ""}
    <p style="margin-top:20px">Cần làm phần mềm riêng? <a href="#dat-lam">Gửi yêu cầu ở trang Đặt làm riêng</a>.</p>`]
};
function viewPage(h){
  const [title, lead, body] = PAGES[h](S.site);
  setMeta(`${title} · ${S.site.name}`, lead.replace(/<[^>]+>/g,""));
  $("#app").innerHTML = `<section class="phead"><div class="wrap"><nav class="crumbs" aria-label="Đường dẫn"><a href="#">Trang chủ</a><span aria-hidden="true">/</span><span aria-current="page">${esc(title)}</span></nav><h1>${esc(title)}</h1><p>${lead}</p></div></section><div class="wrap page">${body}</div>`;
}
function view404(){
  setMeta(`Không tìm thấy trang · ${S.site.name}`, "");
  $("#app").innerHTML = `<section class="nf"><div class="wrap"><p class="code" aria-hidden="true">404</p><h1>Không tìm thấy trang</h1><p class="muted">Đường dẫn có thể đã thay đổi hoặc gõ nhầm. Bạn có thể quay về trang chủ hoặc xem danh sách sản phẩm.</p>
    <div class="acts"><a class="btn btn-primary" href="#">Về trang chủ</a><a class="btn btn-outline" href="#san-pham" data-setcat="">Xem sản phẩm</a></div></div></section>`;
}

/* ---------- router ---------- */
const SECTION_IDS = ["tong-quan","tinh-nang","video","bang-gia","yeu-cau","hoi-dap","cap-nhat"];
function route(){
  const h = decodeURIComponent(location.hash.replace("#",""));
  if (h === "preview") return;
  closeDrawer();
  if (SECTION_IDS.includes(h) && document.getElementById(h)) { document.getElementById(h).scrollIntoView(); return; }
  const nav = h === "" ? "home" : (h.startsWith("sp-") || h === "san-pham" ? "san-pham" : (["giay-phep","bao-mat","hoan-tien"].includes(h) ? "" : h));
  $$("[data-nav]").forEach(a => a.dataset.nav === nav ? a.setAttribute("aria-current","page") : a.removeAttribute("aria-current"));
  if (h === "san-pham") viewCatalog();
  else if (h.startsWith("sp-")) { const p = visible().find(x => x.id === h.slice(3)); if (p) viewProduct(p); else { setMeta(`Không tìm thấy sản phẩm · ${S.site.name}`, ""); $("#app").innerHTML = `<div class="wrap" style="padding-block:72px">${emptyBox("Không tìm thấy sản phẩm", "Sản phẩm có thể đã ngừng hiển thị hoặc đổi đường dẫn.", `<a class="btn btn-primary btn-sm" href="#san-pham" data-setcat="">Xem tất cả sản phẩm</a>`)}</div>`; } }
  else if (h === "giai-phap") viewSolutions();
  else if (h === "dat-lam") viewCustom();
  else if (PAGES[h]) viewPage(h);
  else if (h === "") viewHome();
  else view404();
  window.scrollTo(0,0);
}

let booted = false;
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
    const get = u => fetch(u, opt).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    const [site, products] = await Promise.all([get("data/site.json"), get("data/products.json")]);
    S.site = site; S.products = Array.isArray(products) ? products : [];
  } catch(e) {
    $("#app").innerHTML = `<div class="wrap" style="padding-block:72px">${emptyBox("Không tải được dữ liệu cửa hàng", "Kết nối mạng có thể đang chập chờn. Bấm Thử lại, hoặc quay lại sau ít phút.", `<button type="button" class="btn btn-primary btn-sm" id="retry">Thử lại</button>`)}</div>`;
    $("#retry").onclick = () => { $("#app").innerHTML = `<div class="loading">Đang tải cửa hàng…</div>`; boot(); }; return;
  }
  shell(); if (!booted) { addEventListener("hashchange", route); booted = true; } route();
}
window.XAStore = { genCover, fromPrice, planPrice, esc };
boot();
})();
