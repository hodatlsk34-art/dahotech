/* Trang quản trị: soạn sản phẩm, nén ảnh, lưu thẳng lên kho GitHub (một commit) để Render tự cập nhật website. */
(function(){
"use strict";
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const norm = s => String(s||"").normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/đ/g,"d").replace(/Đ/g,"D").toLowerCase();
const slugify = s => norm(s).replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"").slice(0,48) || "san-pham";
const vnd = n => Number(n).toLocaleString("vi-VN") + "đ";
const today = () => new Date().toISOString().slice(0,10);
const clone = o => JSON.parse(JSON.stringify(o));
const app = $("#app");

const PLATFORMS = ["Web","Điện thoại","Windows","macOS","Excel","Android","iOS","Máy chủ"];
const TINTS = ["#3434c9","#0f6e8c","#7b3fc4","#157a4f","#c2410c","#d43f7a","#1f5aa6","#2f7a6a","#334155","#a16207"];
const UNITS = [["","Không ghi"],["/năm","/năm"],["/tháng","/tháng"],["/đợt","/đợt"],["/máy","/máy"],["vĩnh viễn","vĩnh viễn"]];
const REQ_SUGGEST = ["Hệ điều hành","Trình duyệt","Excel","Cấu hình tối thiểu","Kết nối mạng","Nơi lưu dữ liệu"];

const A = {
  mode: null,              // "github" | "local"
  cfg: { repo:"", branch:"main", token:"" },
  site: null, products: [], saved: "", shaProducts: null,
  uploads: {},             // path -> {b64, url, size}
  deletes: new Set(),      // repo paths to delete on next save
  view: "list", editId: null, saving: false, lastCommit: null
};

/* ---------- utilities ---------- */
function toast(msg, ms=2600){ const t=document.createElement("div"); t.className="toast"; t.setAttribute("role","status"); t.textContent=msg; document.body.appendChild(t); setTimeout(()=>t.remove(),ms); }
function dialog(html, cls){
  const d = document.createElement("dialog"); if (cls) d.className = cls; d.innerHTML = html; document.body.appendChild(d);
  d.addEventListener("close", () => d.remove()); d.querySelectorAll("[data-close]").forEach(b => b.onclick = () => d.close());
  d.showModal(); return d;
}
function ask(title, text, okLabel="Đồng ý", danger=false){
  return new Promise(res => {
    const d = dialog(`<div class="dlg"><h3>${esc(title)}</h3><p style="margin:0" class="muted">${text}</p><div class="acts"><button class="btn" data-close>Hủy</button><button class="btn ${danger?"btn-danger":"btn-primary"}" id="okBtn">${esc(okLabel)}</button></div></div>`);
    let ok = false; $("#okBtn", d).onclick = () => { ok = true; d.close(); }; d.addEventListener("close", () => res(ok));
  });
}
const getPath = (o,p) => p.split(".").reduce((a,k) => a == null ? a : a[k], o);
function setPath(o,p,v){ const ks = p.split("."); let a = o; for (const k of ks.slice(0,-1)) { if (a[k] == null) a[k] = {}; a = a[k]; } a[ks[ks.length-1]] = v; }
const imgSrc = s => (A.uploads[s] && A.uploads[s].url) || s;
const snapshot = () => JSON.stringify({ s:A.site, p:A.products });
const isDirty = () => snapshot() !== A.saved || Object.keys(A.uploads).some(k => !A.uploads[k].committed) || A.deletes.size > 0;
const priceOf = v => v === null || v === undefined || v === "" ? "Liên hệ" : (Number(v) === 0 ? "Miễn phí" : vnd(v));
function fromPrice(p){
  const v = (p.plans||[]).map(x => x.price); if (!v.length) return "Chưa có giá";
  const isNum = x => x !== null && x !== "" && x !== undefined;
  const paid = v.filter(x => isNum(x) && Number(x) > 0).map(Number);
  if (v.every(x => isNum(x) && Number(x) === 0)) return "Miễn phí";
  if (paid.length) return "Từ " + vnd(Math.min(...paid));
  return v.some(x => isNum(x) && Number(x) === 0) ? "Dùng thử miễn phí" : "Liên hệ báo giá";
}
function thumbHTML(p){
  if (p.images && p.images.length) return `<img class="thumb" src="${esc(imgSrc(p.images[0].src))}" alt="">`;
  return `<div class="thumb" style="background:${esc(p.tint||"#3434c9")}">${esc((p.name||"?").trim().charAt(0).toUpperCase())}</div>`;
}
function newProduct(){
  return { id:"", example:false, published:false, featured:false, name:"", category:(A.site.categories||[])[0]||"", platforms:["Web"], status:"live",
    version:"1.0", updated:today(), tint:TINTS[A.products.length % TINTS.length], tagline:"", highlights:["","",""], description:"",
    images:[], video:"", demo:"", features:[{title:"",text:""},{title:"",text:""},{title:"",text:""}],
    plans:[{name:"Dùng thử", price:0, unit:"", audience:"", items:[], highlight:false},{name:"Đơn vị", price:null, unit:"/năm", audience:"", items:[], highlight:true}],
    requirements:[{label:"Hệ điều hành / trình duyệt", value:""}], faq:[], changelog:[], rightsConfirmed:false, cleanConfirmed:false };
}

/* ---------- checklist ---------- */
function checks(p){
  const real = (p.images||[]).length > 0;
  const feats = (p.features||[]).filter(f => f.title && f.title.trim()).length;
  return [
    {k:"name", ok: !!(p.name||"").trim(), req:true, t:"Tên sản phẩm", go:"s-co-ban"},
    {k:"tag", ok: (p.tagline||"").trim().length >= 30, req:true, t:"Câu giới thiệu từ 30 ký tự", go:"s-gioi-thieu"},
    {k:"plan", ok: (p.plans||[]).some(x => (x.name||"").trim()), req:true, t:"Ít nhất 1 gói giá", go:"s-bang-gia"},
    {k:"rights", ok: !!p.rightsConfirmed, req:true, t:"Xác nhận có quyền bán", go:"s-xac-nhan"},
    {k:"clean", ok: !!p.cleanConfirmed, req:true, t:"Xác nhận đã gỡ dữ liệu thật", go:"s-xac-nhan"},
    {k:"img", ok: real, req:false, t:"Ảnh chụp màn hình thật", go:"s-hinh-anh"},
    {k:"img3", ok: (p.images||[]).length >= 3, req:false, t:"Từ 3 ảnh trở lên", go:"s-hinh-anh"},
    {k:"feat", ok: feats >= 3, req:false, t:"Từ 3 tính năng", go:"s-tinh-nang"},
    {k:"hl", ok: (p.highlights||[]).filter(x => (x||"").trim()).length >= 2, req:false, t:"2–3 điểm nổi bật", go:"s-gioi-thieu"},
    {k:"desc", ok: (p.description||"").trim().length >= 80, req:false, t:"Mô tả chi tiết", go:"s-gioi-thieu"},
    {k:"req", ok: (p.requirements||[]).some(r => (r.value||"").trim()), req:false, t:"Yêu cầu hệ thống", go:"s-yeu-cau"},
    {k:"faq", ok: (p.faq||[]).length >= 2, req:false, t:"Từ 2 câu hỏi đáp", go:"s-hoi-dap"}
  ];
}
const canPublish = p => checks(p).filter(c => c.req).every(c => c.ok);
const score = p => { const c = checks(p); return Math.round(100 * c.filter(x => x.ok).length / c.length); };

/* ---------- GitHub ---------- */
const GH = "https://api.github.com";
async function gh(path, opt={}){
  const r = await fetch(GH + path, { ...opt, headers: { "Accept":"application/vnd.github+json", "Authorization":"Bearer " + A.cfg.token, "X-GitHub-Api-Version":"2022-11-28", ...(opt.body ? {"Content-Type":"application/json"} : {}) } });
  if (!r.ok) {
    let m = ""; try { m = (await r.json()).message || ""; } catch(e) {}
    const hint = r.status === 401 ? "Mã truy cập sai hoặc đã hết hạn." : r.status === 404 ? "Không thấy kho, nhánh hoặc tệp. Kiểm tra tên kho và quyền của mã truy cập." : r.status === 403 ? "Mã truy cập chưa có quyền ghi (Contents: Read and write)." : r.status === 409 || r.status === 422 ? "Kho vừa thay đổi. Tải lại trang rồi lưu lại." : "";
    const e = new Error((hint || "Lỗi GitHub " + r.status) + (m ? ` (${m})` : "")); e.status = r.status; throw e;
  }
  return r.status === 204 ? null : r.json();
}
const b64ToText = b => new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\n/g,"")), c => c.charCodeAt(0)));
async function ghRead(path){ const j = await gh(`/repos/${A.cfg.repo}/contents/${path}?ref=${encodeURIComponent(A.cfg.branch)}`); return { text: b64ToText(j.content), sha: j.sha }; }
async function ghCommit(files, message, onStep){
  const R = `/repos/${A.cfg.repo}`;
  onStep("Đọc nhánh " + A.cfg.branch);
  const ref = await gh(`${R}/git/ref/heads/${encodeURIComponent(A.cfg.branch)}`);
  const base = await gh(`${R}/git/commits/${ref.object.sha}`);
  const tree = [];
  let i = 0;
  for (const f of files) {
    i++;
    if (f.delete) { tree.push({ path:f.path, mode:"100644", type:"blob", sha:null }); continue; }
    onStep(`Tải lên ${i}/${files.length}: ${f.path}`);
    const blob = await gh(`${R}/git/blobs`, { method:"POST", body: JSON.stringify(f.b64 ? { content:f.b64, encoding:"base64" } : { content:f.text, encoding:"utf-8" }) });
    tree.push({ path:f.path, mode:"100644", type:"blob", sha:blob.sha });
  }
  onStep("Tạo bản ghi thay đổi");
  const t = await gh(`${R}/git/trees`, { method:"POST", body: JSON.stringify({ base_tree: base.tree.sha, tree }) });
  const c = await gh(`${R}/git/commits`, { method:"POST", body: JSON.stringify({ message, tree: t.sha, parents:[ref.object.sha] }) });
  await gh(`${R}/git/refs/heads/${encodeURIComponent(A.cfg.branch)}`, { method:"PATCH", body: JSON.stringify({ sha: c.sha }) });
  return c;
}

/* ---------- login ---------- */
function loadCfg(){
  for (const st of [localStorage, sessionStorage]) { try { const c = JSON.parse(st.getItem("xa-admin")||"null"); if (c) return c; } catch(e) {} }
  return null;
}
function viewLogin(err){
  const c = loadCfg() || {};
  app.innerHTML = `<div class="wrap login"><form class="login-card" id="lf" autocomplete="off">
    <div class="logo"><span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M8 7 3 12l5 5M16 7l5 5-5 5"/></svg></span><b class="muted">Quản trị cửa hàng</b></div>
    <h1>Kết nối kho dữ liệu</h1>
    <p class="muted" style="margin:0">Sản phẩm được lưu trong kho GitHub của bạn. Mỗi lần bấm Lưu, Render tự cập nhật website sau khoảng 1–2 phút.</p>
    ${err ? `<div class="err">${esc(err)}</div>` : ""}
    <label class="field"><span>Kho GitHub</span><input id="repo" required placeholder="ten-tai-khoan/ten-kho" value="${esc(c.repo||"")}"><small>Ví dụ: hodatlsk34-art/xuong-app</small></label>
    <div class="g2">
      <label class="field"><span>Nhánh</span><input id="branch" value="${esc(c.branch||"main")}"></label>
      <label class="field"><span>Mã truy cập</span><input id="token" type="password" required placeholder="github_pat_…" value="${esc(c.token||"")}"></label>
    </div>
    <label class="check"><input type="checkbox" id="remember" ${c.remember?"checked":""}> <span>Ghi nhớ trên máy này <span class="muted small">(chỉ chọn trên máy cá nhân)</span></span></label>
    <button class="btn btn-primary" type="submit" id="go">Kết nối</button>
    <details class="help"><summary>Cách tạo mã truy cập (1 lần, khoảng 2 phút)</summary><ol>
      <li>Vào GitHub → Settings → Developer settings → Personal access tokens → <b>Fine-grained tokens</b> → Generate new token.</li>
      <li>Expiration: tối đa 1 năm. Repository access: <b>Only select repositories</b> → chọn kho của cửa hàng.</li>
      <li>Permissions → Repository permissions → <b>Contents: Read and write</b>. Bấm Generate, sao chép mã.</li>
      <li>Mã chỉ ghi được vào đúng kho này. Không gửi mã cho người khác, không dán vào mã nguồn.</li></ol></details>
    <button class="btn" type="button" id="local">Xem thử không cần kết nối</button>
    <p class="muted small" style="margin:0">Chế độ xem thử: soạn và xem trước được, nhưng không cập nhật website.</p>
  </form></div>`;
  $("#lf").onsubmit = async e => {
    e.preventDefault();
    const repo = $("#repo").value.trim().replace(/^https?:\/\/github\.com\//,"").replace(/\.git$/,"").replace(/\/$/,"");
    if (!/^[\w.-]+\/[\w.-]+$/.test(repo)) return viewLogin("Tên kho cần có dạng ten-tai-khoan/ten-kho.");
    A.cfg = { repo, branch: $("#branch").value.trim() || "main", token: $("#token").value.trim() };
    const remember = $("#remember").checked;
    $("#go").disabled = true; $("#go").textContent = "Đang kết nối…";
    try {
      const [p, s] = await Promise.all([ghRead("data/products.json"), ghRead("data/site.json")]);
      A.products = JSON.parse(p.text); A.shaProducts = p.sha; A.site = JSON.parse(s.text);
      try { (remember ? localStorage : sessionStorage).setItem("xa-admin", JSON.stringify({ ...A.cfg, remember })); if (!remember) localStorage.removeItem("xa-admin"); } catch(e) {}
      A.mode = "github"; start();
    } catch(err) { viewLogin(err.message.includes("Failed to fetch") ? "Không gọi được GitHub từ trang này. Hãy mở trang quản trị trên website đã triển khai (Render)." : err.message); }
  };
  $("#local").onclick = async () => {
    try {
      const [p, s] = await Promise.all([fetch("data/products.json",{cache:"no-cache"}).then(r=>r.json()), fetch("data/site.json",{cache:"no-cache"}).then(r=>r.json())]);
      let d = null; try { d = JSON.parse(localStorage.getItem("xa-draft")||"null"); } catch(e) {}
      A.products = d ? d.p : p; A.site = d ? d.s : s; A.mode = "local"; start();
      if (d) toast("Đã mở bản nháp lưu trên máy này");
    } catch(e) { viewLogin("Không đọc được data/products.json. Mở trang qua website, không mở trực tiếp tệp."); }
  };
}
function start(){
  A.products.forEach(p => { p.highlights = p.highlights || []; while (p.highlights.length < 3) p.highlights.push(""); });
  A.saved = snapshot(); A.view = "list"; render();
}

/* ---------- shell ---------- */
function render(){
  const pending = isDirty();
  app.innerHTML = `
  <header class="bar"><div class="wrap">
    <div class="logo"><span><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"><path d="M8 7 3 12l5 5M16 7l5 5-5 5"/></svg></span><b>${esc(A.site.name)}</b></div>
    <nav class="tabsnav"><button data-go="list" aria-current="${A.view!=="settings"?"page":"false"}">Sản phẩm</button><button data-go="settings" aria-current="${A.view==="settings"?"page":"false"}">Cài đặt cửa hàng</button></nav>
    <div class="right">
      <span class="pill ${A.mode==="github"?"ok":"warn"}" title="${esc(A.cfg.repo)}">${A.mode==="github" ? "Đã kết nối " + esc(A.cfg.repo) : "Chế độ xem thử"}</span>
      <span class="dirty" id="dirty">${pending ? "● Có thay đổi chưa lưu" : ""}</span>
      <a class="btn btn-sm" href="index.html" target="_blank" rel="noopener">Mở cửa hàng</a>
      <button class="btn btn-primary" id="saveBtn">${A.mode==="github" ? "Lưu & cập nhật website" : "Lưu bản nháp"}</button>
      <button class="btn btn-sm" id="outBtn">Thoát</button>
    </div></div></header>
  <main class="wrap page" id="main"></main>`;
  $$("[data-go]").forEach(b => b.onclick = () => { A.view = b.dataset.go; A.editId = null; render(); });
  $("#saveBtn").onclick = save;
  $("#outBtn").onclick = async () => {
    if (isDirty() && !(await ask("Thoát khi chưa lưu?", "Các thay đổi chưa lưu sẽ mất.", "Thoát", true))) return;
    try { localStorage.removeItem("xa-admin"); sessionStorage.removeItem("xa-admin"); } catch(e) {}
    A.saved = snapshot(); A.uploads = {}; A.deletes.clear(); viewLogin();
  };
  if (A.view === "settings") viewSettings(); else if (A.view === "edit") viewEditor(); else viewList();
}
function markDirty(){ const d = $("#dirty"); if (d) d.textContent = isDirty() ? "● Có thay đổi chưa lưu" : ""; }
addEventListener("beforeunload", e => { if (A.site && isDirty()) { e.preventDefault(); e.returnValue = ""; } });

/* ---------- list ---------- */
function viewList(){
  const m = $("#main"), ex = A.products.filter(p => p.example).length;
  m.innerHTML = `
    <div class="page-head"><div><h1>Sản phẩm (${A.products.length})</h1><p class="muted small" style="margin:4px 0 0">${A.products.filter(p=>p.published!==false).length} đang hiện trên website. Thứ tự dưới đây là thứ tự hiển thị.</p></div>
      <div class="addbar">${ex ? `<button class="btn btn-danger" id="delEx">Xóa ${ex} sản phẩm mẫu</button>` : ""}<button class="btn btn-primary" id="addP">+ Thêm sản phẩm</button></div></div>
    ${A.products.length ? `<div class="plist">${A.products.map((p,i) => {
      const sc = score(p), pub = p.published !== false, ok = canPublish(p);
      return `<div class="prow">${thumbHTML(p)}
        <div><h3>${esc(p.name || "(Chưa đặt tên)")}${p.example ? `<span class="pill warn">Mẫu</span>` : ""}${p.featured ? `<span class="pill ac">Nổi bật</span>` : ""}</h3>
          <div class="meta"><span class="pill ${pub?"ok":""}">${pub ? "Đang hiện" : "Bản nháp"}</span>${pub && !ok ? `<span class="pill bad">Thiếu mục bắt buộc</span>` : ""}<span class="pill">${esc(p.category||"Chưa chọn lĩnh vực")}</span><span class="pill">${esc(fromPrice(p))}</span></div>
          <div class="meter" title="Mức hoàn thiện ${sc}%"><i style="width:${sc}%;${sc<60?"background:var(--warn)":""}"></i></div><span class="muted small">Hoàn thiện ${sc}% · ${(p.images||[]).length} ảnh</span></div>
        <div class="acts">
          <button class="btn btn-sm btn-icon" data-mv="${i}:-1" aria-label="Lên" ${i===0?"disabled":""}>↑</button>
          <button class="btn btn-sm btn-icon" data-mv="${i}:1" aria-label="Xuống" ${i===A.products.length-1?"disabled":""}>↓</button>
          <button class="btn btn-sm" data-pub="${i}">${pub ? "Ẩn" : "Hiện"}</button>
          <button class="btn btn-sm" data-dup="${i}">Nhân bản</button>
          <button class="btn btn-sm btn-danger" data-del="${i}">Xóa</button>
          <button class="btn btn-sm btn-primary" data-ed="${i}">Sửa</button>
        </div></div>`; }).join("")}</div>`
    : `<div class="emptybox"><b style="color:var(--ink);font-size:1.1rem">Chưa có sản phẩm nào</b><span>Bắt đầu bằng tên sản phẩm và vài ảnh chụp màn hình. Bạn lưu nháp được, chỉ hiện lên website khi đủ mục bắt buộc.</span><button class="btn btn-primary" id="addP2">+ Thêm sản phẩm đầu tiên</button></div>`}`;
  const add = () => { const p = newProduct(); A.products.push(p); A._new = p; A.editId = A.products.length - 1; A.view = "edit"; render(); };
  ($("#addP")||{}).onclick = add; ($("#addP2")||{}).onclick = add;
  if ($("#delEx")) $("#delEx").onclick = async () => {
    if (!(await ask("Xóa sản phẩm mẫu?", `Xóa ${ex} sản phẩm có nhãn "Mẫu". Website chỉ thay đổi sau khi bạn bấm Lưu.`, "Xóa", true))) return;
    A.products.filter(p => p.example).forEach(dropImages); A.products = A.products.filter(p => !p.example); render();
  };
  $$("[data-ed]").forEach(b => b.onclick = () => { A.editId = +b.dataset.ed; A.view = "edit"; render(); });
  $$("[data-mv]").forEach(b => b.onclick = () => { const [i,d] = b.dataset.mv.split(":").map(Number); const a = A.products; [a[i], a[i+d]] = [a[i+d], a[i]]; render(); });
  $$("[data-pub]").forEach(b => b.onclick = () => {
    const p = A.products[+b.dataset.pub];
    if (p.published === false && !canPublish(p)) { toast("Chưa hiện được: còn thiếu mục bắt buộc. Mở Sửa để xem danh sách kiểm tra."); return; }
    p.published = p.published === false; render();
  });
  $$("[data-dup]").forEach(b => b.onclick = () => { const p = clone(A.products[+b.dataset.dup]); p.name += " (bản sao)"; p.id = uniqueId(slugify(p.name)); p.published = false; p.example = false; A.products.splice(+b.dataset.dup+1, 0, p); render(); });
  $$("[data-del]").forEach(b => b.onclick = async () => {
    const i = +b.dataset.del, p = A.products[i];
    if (!(await ask("Xóa sản phẩm?", `Xóa "${esc(p.name||"(chưa đặt tên)")}" và ảnh của nó. Website chỉ thay đổi sau khi bạn bấm Lưu.`, "Xóa", true))) return;
    dropImages(p); A.products.splice(i,1); render();
  });
}
function dropImages(p){ (p.images||[]).forEach(im => { if (A.uploads[im.src] && !A.uploads[im.src].committed) delete A.uploads[im.src]; else if (/^uploads\//.test(im.src)) A.deletes.add(im.src); }); }
function uniqueId(base, self){ let id = base, n = 2; while (A.products.some(p => p !== self && p.id === id)) id = `${base}-${n++}`; return id; }

/* ---------- editor ---------- */
const SECS = [["s-co-ban","Cơ bản"],["s-gioi-thieu","Giới thiệu"],["s-hinh-anh","Hình ảnh"],["s-tinh-nang","Tính năng"],["s-bang-gia","Bảng giá"],["s-yeu-cau","Yêu cầu"],["s-hoi-dap","Hỏi đáp"],["s-cap-nhat","Cập nhật"],["s-xac-nhan","Xác nhận"]];
function viewEditor(keepScroll){
  const p = A.products[A.editId]; if (!p) { A.view = "list"; return render(); }
  const y = scrollY;
  const inp = (k, ph="", type="text", extra="") => `<input type="${type}" data-k="${k}" value="${esc(getPath(p,k) ?? "")}" placeholder="${esc(ph)}" ${extra}>`;
  const cats = A.site.categories || [];
  $("#main").innerHTML = `
  <div class="ed-head"><button class="btn btn-sm" id="back">← Danh sách</button><h1 id="edTitle">${esc(p.name || "Sản phẩm mới")}</h1>
    <button class="btn" id="pvBtn">Xem trước trang</button>
    <label class="check" style="align-items:center"><input type="checkbox" id="pubT" ${p.published!==false?"checked":""}> <b>Hiện trên website</b></label></div>
  <div class="ed">
    <div>
      <nav class="secnav" id="secnav"></nav>
      <section class="box" id="s-co-ban"><h2><span class="n">1</span>Thông tin cơ bản</h2>
        <label class="field"><span>Tên sản phẩm</span>${inp("name","Ví dụ: Chấm Phiếu Trắc Nghiệm")}</label>
        <div class="g2">
          <label class="field"><span>Mã sản phẩm</span>${inp("id","tu-dong-tao","text",'data-type="slug"')}<small>Dùng trong đường dẫn và tin nhắn mua. Tự tạo từ tên.</small></label>
          <label class="field"><span>Lĩnh vực</span><select data-k="category">${cats.map(c=>`<option ${p.category===c?"selected":""}>${esc(c)}</option>`).join("")}${p.category && !cats.includes(p.category) ? `<option selected>${esc(p.category)}</option>` : ""}</select><small>Thêm lĩnh vực ở Cài đặt cửa hàng.</small></label>
        </div>
        <div class="field"><span>Chạy trên</span><div class="chipset" id="plats">${[...new Set([...PLATFORMS, ...(p.platforms||[])])].map(x=>`<button type="button" data-plat="${esc(x)}" aria-pressed="${(p.platforms||[]).includes(x)}">${esc(x)}</button>`).join("")}</div></div>
        <div class="g3">
          <label class="field"><span>Trạng thái</span><select data-k="status"><option value="live" ${p.status!=="beta"?"selected":""}>Đang dùng thực tế</option><option value="beta" ${p.status==="beta"?"selected":""}>Thử nghiệm</option></select></label>
          <label class="field"><span>Phiên bản</span>${inp("version","1.0")}</label>
          <label class="field"><span>Ngày cập nhật</span>${inp("updated","","date")}</label>
        </div>
        <div class="field"><span>Màu chủ đạo</span><div class="swatches">${TINTS.map(t=>`<button type="button" data-tint="${t}" style="background:${t}" aria-label="Màu ${t}" aria-pressed="${p.tint===t}"></button>`).join("")}<input type="color" data-k="tint" value="${esc(p.tint||"#3434c9")}" aria-label="Chọn màu khác"></div><small>Dùng cho ảnh minh họa khi chưa có ảnh chụp màn hình.</small></div>
        <label class="check"><input type="checkbox" data-k="featured" data-type="bool" ${p.featured?"checked":""}> <span>Đặt làm sản phẩm nổi bật trên trang chủ</span></label>
      </section>
      <section class="box" id="s-gioi-thieu"><h2><span class="n">2</span>Giới thiệu</h2>
        <label class="field"><span>Câu giới thiệu <span class="count" data-count="tagline"></span></span><textarea data-k="tagline" rows="2" maxlength="160" placeholder="Một câu nói rõ phần mềm làm việc gì, cho ai. Ví dụ: Chấm phiếu tô THPT 2025 từ ảnh scan hoặc camera điện thoại.">${esc(p.tagline)}</textarea></label>
        <div class="field"><span>Điểm nổi bật (hiện cạnh nút mua)</span>${[0,1,2].map(i=>inp(`highlights.${i}`, ["Lợi ích lớn nhất, ví dụ: Dữ liệu không rời khỏi máy","Lợi ích thứ hai","Lợi ích thứ ba (không bắt buộc)"][i])).join("")}</div>
        <label class="field"><span>Mô tả chi tiết</span><textarea data-k="description" rows="6" placeholder="Viết 2–3 đoạn ngắn: phần mềm giải quyết việc gì, khác gì cách làm cũ.">${esc(p.description)}</textarea><small>Dòng trống để tách đoạn · dòng bắt đầu bằng "- " thành gạch đầu dòng · **chữ đậm**</small></label>
      </section>
      <section class="box" id="s-hinh-anh"><h2><span class="n">3</span>Hình ảnh và liên kết</h2>
        <p class="lead">Ảnh đầu tiên là ảnh bìa. Nên dùng ảnh chụp màn hình ngang, rộng từ 1280px, không có dữ liệu học sinh thật. Ảnh được tự nén về tối đa 1600px.</p>
        <label class="drop" id="drop" tabindex="0"><input type="file" id="fileIn" accept="image/*" multiple hidden>
          <b>Kéo thả ảnh vào đây</b><span>hoặc bấm để chọn · hoặc dán ảnh (Ctrl+V)</span></label>
        <div class="imgs">${(p.images||[]).map((im,i)=>`<div class="img"><div class="ph"><img src="${esc(imgSrc(im.src))}" alt="">${i===0?`<span class="pill ac cov">Ảnh bìa</span>`:""}</div>
          <div class="tools"><span><button type="button" class="btn btn-sm btn-icon" data-imv="${i}:-1" aria-label="Lên trước" ${i===0?"disabled":""}>←</button> <button type="button" class="btn btn-sm btn-icon" data-imv="${i}:1" aria-label="Ra sau" ${i===p.images.length-1?"disabled":""}>→</button></span><button type="button" class="btn btn-sm btn-danger" data-idel="${i}">Xóa</button></div>
          <input data-k="images.${i}.caption" value="${esc(im.caption||"")}" placeholder="Chú thích ảnh"></div>`).join("")}</div>
        <div class="g2">
          <label class="field"><span>Link bản demo</span>${inp("demo","https://… (bản dùng dữ liệu giả)","url")}</label>
          <label class="field"><span>Link video giới thiệu</span>${inp("video","https://youtube.com/…","url")}</label>
        </div>
      </section>
      <section class="box" id="s-tinh-nang"><h2><span class="n">4</span>Tính năng</h2>
        <p class="lead">Mỗi tính năng: tiêu đề ngắn + một câu nói lợi ích. 4–6 tính năng là đẹp nhất.</p>
        <div class="rows">${(p.features||[]).map((f,i)=>`<div class="rowi"><div class="fl"><input data-k="features.${i}.title" value="${esc(f.title)}" placeholder="Tiêu đề, ví dụ: Chấm hàng loạt"><textarea data-k="features.${i}.text" rows="2" placeholder="Mô tả ngắn">${esc(f.text)}</textarea></div>${rowTools("features",i,p.features.length)}</div>`).join("")}</div>
        <div class="addbar"><button type="button" class="btn btn-sm" data-add="features">+ Thêm tính năng</button></div>
        <details class="quick"><summary>Dán nhanh nhiều tính năng</summary><textarea id="quickF" rows="4" placeholder="Mỗi dòng một tính năng, dạng: Tiêu đề: mô tả"></textarea><button type="button" class="btn btn-sm" id="quickFBtn" style="margin-top:8px">Thêm vào danh sách</button></details>
      </section>
      <section class="box" id="s-bang-gia"><h2><span class="n">5</span>Bảng giá</h2>
        <p class="lead">Tối đa 3 gói, đánh dấu 1 gói "Nên chọn". Ô giá: để trống = Liên hệ, 0 = Miễn phí, nhập số = giá (đồng).</p>
        <div class="plans-ed">${(p.plans||[]).map((pl,i)=>`<div class="plan-ed${pl.highlight?" hot":""}">
          <div class="ph"><b>Gói ${i+1}</b><span style="display:flex;gap:4px"><label class="check small" style="align-items:center"><input type="radio" name="hot" data-hot="${i}" ${pl.highlight?"checked":""}> Nên chọn</label><button type="button" class="btn btn-sm btn-icon btn-danger" data-rm="plans:${i}" aria-label="Xóa gói">×</button></span></div>
          <input data-k="plans.${i}.name" value="${esc(pl.name)}" placeholder="Tên gói, ví dụ: Trường học">
          <div class="g2" style="gap:8px"><input data-k="plans.${i}.price" data-type="price" inputmode="numeric" value="${pl.price===null||pl.price===undefined?"":esc(pl.price)}" placeholder="Liên hệ"><select data-k="plans.${i}.unit">${UNITS.map(([v,l])=>`<option value="${esc(v)}" ${pl.unit===v?"selected":""}>${l}</option>`).join("")}</select></div>
          <small class="muted" data-pp="${i}">${priceOf(pl.price)}${pl.unit && Number(pl.price)>0 ? " " + esc(pl.unit) : ""}</small>
          <input data-k="plans.${i}.audience" value="${esc(pl.audience||"")}" placeholder="Dành cho ai, ví dụ: Toàn trường">
          <textarea data-k="plans.${i}.items" data-type="lines" rows="3" placeholder="Mỗi dòng một quyền lợi">${esc((pl.items||[]).join("\n"))}</textarea>
        </div>`).join("")}</div>
        ${(p.plans||[]).length < 3 ? `<div class="addbar"><button type="button" class="btn btn-sm" data-add="plans">+ Thêm gói</button></div>` : ""}
      </section>
      <section class="box" id="s-yeu-cau"><h2><span class="n">6</span>Yêu cầu hệ thống</h2>
        <div class="rows">${(p.requirements||[]).map((r,i)=>`<div class="rowi"><div class="fl g2" style="gap:8px"><input data-k="requirements.${i}.label" value="${esc(r.label)}" placeholder="Mục" list="reqs"><input data-k="requirements.${i}.value" value="${esc(r.value)}" placeholder="Yêu cầu"></div>${rowTools("requirements",i,p.requirements.length)}</div>`).join("")}</div>
        <datalist id="reqs">${REQ_SUGGEST.map(x=>`<option value="${esc(x)}">`).join("")}</datalist>
        <div class="addbar"><button type="button" class="btn btn-sm" data-add="requirements">+ Thêm dòng</button></div>
      </section>
      <section class="box" id="s-hoi-dap"><h2><span class="n">7</span>Hỏi đáp</h2>
        <p class="lead">Trả lời trước những băn khoăn khi mua: dữ liệu lưu ở đâu, hết hạn dùng thử thì sao, có xuất hóa đơn không.</p>
        <div class="rows">${(p.faq||[]).map((f,i)=>`<div class="rowi"><div class="fl"><input data-k="faq.${i}.q" value="${esc(f.q)}" placeholder="Câu hỏi"><textarea data-k="faq.${i}.a" rows="2" placeholder="Trả lời">${esc(f.a)}</textarea></div>${rowTools("faq",i,p.faq.length)}</div>`).join("")}</div>
        <div class="addbar"><button type="button" class="btn btn-sm" data-add="faq">+ Thêm câu hỏi</button></div>
      </section>
      <section class="box" id="s-cap-nhat"><h2><span class="n">8</span>Nhật ký cập nhật</h2>
        <div class="rows">${(p.changelog||[]).map((c,i)=>`<div class="rowi"><div class="fl"><div class="g2" style="gap:8px"><input data-k="changelog.${i}.version" value="${esc(c.version)}" placeholder="Phiên bản"><input type="date" data-k="changelog.${i}.date" value="${esc(c.date)}"></div><input data-k="changelog.${i}.text" value="${esc(c.text)}" placeholder="Thay đổi chính"></div>${rowTools("changelog",i,p.changelog.length)}</div>`).join("")}</div>
        <div class="addbar"><button type="button" class="btn btn-sm" data-add="changelog">+ Thêm phiên bản</button></div>
      </section>
      <section class="box" id="s-xac-nhan"><h2><span class="n">9</span>Xác nhận trước khi đăng</h2>
        <label class="check"><input type="checkbox" data-k="rightsConfirmed" data-type="bool" ${p.rightsConfirmed?"checked":""}> <span>Tôi có quyền bán phần mềm này: tự làm ngoài nhiệm vụ được giao, hoặc đã có thỏa thuận bằng văn bản với đơn vị liên quan.</span></label>
        <label class="check"><input type="checkbox" data-k="cleanConfirmed" data-type="bool" ${p.cleanConfirmed?"checked":""}> <span>Ảnh, demo và bản phát hành không chứa dữ liệu học sinh thật, tên đơn vị khác, mật khẩu hay mã truy cập.</span></label>
      </section>
    </div>
    <aside class="side"><div class="pcard" id="pcard"></div><div class="checklist" id="clist"></div>
      <button class="btn btn-primary" id="pvBtn2">Xem trước trang sản phẩm</button></aside>
  </div>`;
  refreshSide();
  if (keepScroll) scrollTo(0, y); else scrollTo(0,0);
  bindEditor(p);
}
const rowTools = (arr,i,n) => `<div class="tl"><button type="button" class="btn btn-sm btn-icon" data-up="${arr}:${i}" aria-label="Lên" ${i===0?"disabled":""}>↑</button><button type="button" class="btn btn-sm btn-icon" data-down="${arr}:${i}" aria-label="Xuống" ${i===n-1?"disabled":""}>↓</button><button type="button" class="btn btn-sm btn-icon btn-danger" data-rm="${arr}:${i}" aria-label="Xóa">×</button></div>`;

function refreshSide(){
  const p = A.products[A.editId]; if (!p) return;
  const pc = $("#pcard"); if (!pc) return;
  pc.innerHTML = `${thumbHTML(p)}<div class="b"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="pill ${p.status==="beta"?"warn":"ok"}">${p.status==="beta"?"Thử nghiệm":"Đang dùng thực tế"}</span>${(p.platforms||[]).map(x=>`<span class="pill">${esc(x)}</span>`).join("")}</div>
    <h3>${esc(p.name||"Tên sản phẩm")}</h3><p>${esc(p.tagline||"Câu giới thiệu sẽ hiện ở đây.")}</p><div class="foot"><span>${esc(fromPrice(p))}</span><span style="color:var(--accent)">Xem chi tiết →</span></div></div>`;
  const c = checks(p), sc = score(p), req = c.filter(x => x.req);
  $("#clist").innerHTML = `<h3><span>Danh sách kiểm tra</span><span class="muted small">${sc}%</span></h3>
    <div class="meter" style="max-width:none"><i style="width:${sc}%"></i></div>
    <p class="small muted" style="margin:0">${req.every(x=>x.ok) ? "Đủ điều kiện hiện trên website." : "Cần đủ các mục có dấu ! để hiện trên website."}</p>
    <ul>${c.map(x=>`<li class="${x.ok?"y":"n"} ${x.req?"r":""}"><i>${x.ok?"✓":(x.req?"!":"·")}</i><a href="#${x.go}" data-sec="${x.go}">${esc(x.t)}</a></li>`).join("")}</ul>`;
  $$("#clist [data-sec]").forEach(a => a.onclick = e => { e.preventDefault(); document.getElementById(a.dataset.sec).scrollIntoView({behavior:"smooth"}); });
  const done = { "s-co-ban": !!p.name, "s-gioi-thieu": (p.tagline||"").length>=30, "s-hinh-anh": (p.images||[]).length>0, "s-tinh-nang": (p.features||[]).filter(f=>f.title).length>=3, "s-bang-gia": (p.plans||[]).length>0, "s-yeu-cau": (p.requirements||[]).some(r=>r.value), "s-hoi-dap": (p.faq||[]).length>=2, "s-cap-nhat": (p.changelog||[]).length>0, "s-xac-nhan": p.rightsConfirmed && p.cleanConfirmed };
  $("#secnav").innerHTML = SECS.map(([id,l]) => `<a href="#${id}" class="${done[id]?"done":""}" data-sec="${id}">${done[id]?"✓ ":""}${l}</a>`).join("");
  $$("#secnav [data-sec]").forEach(a => a.onclick = e => { e.preventDefault(); document.getElementById(a.dataset.sec).scrollIntoView({behavior:"smooth"}); });
  $$("[data-count]").forEach(s => s.textContent = `${(getPath(p, s.dataset.count)||"").length}/160`);
  const pub = $("#pubT"); if (pub && pub.checked && !canPublish(p)) { /* keep but warn via checklist */ }
  $("#edTitle").textContent = p.name || "Sản phẩm mới";
  markDirty();
}

function bindEditor(p){
  const m = $("#main");
  m.oninput = e => {
    const el = e.target, k = el.dataset.k; if (!k) return;
    let v = el.type === "checkbox" ? el.checked : el.value;
    const t = el.dataset.type;
    if (t === "price") { const d = String(v).replace(/[^\d]/g,""); v = d === "" ? null : Number(d); const i = k.split(".")[1]; const pl = p.plans[i]; const s = $(`[data-pp="${i}"]`); if (s) s.textContent = priceOf(v) + (pl.unit && Number(v)>0 ? " " + pl.unit : ""); }
    if (t === "lines") v = String(v).split("\n").map(x => x.trim()).filter(Boolean);
    if (t === "slug") { v = slugify(v); }
    setPath(p, k, v);
    if (k === "name" && (A._new === p || !p.id)) { p.id = uniqueId(slugify(v), p); const idI = $('[data-k="id"]'); if (idI) idI.value = p.id; }
    if (k === "tint") $$("[data-tint]").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tint === v)));
    refreshSide();
  };
  m.onchange = e => {
    const el = e.target;
    if (el.dataset.type === "slug") { p.id = uniqueId(slugify(el.value), p); el.value = p.id; }
    if (el.dataset.k && el.dataset.k.endsWith(".unit")) { const i = el.dataset.k.split(".")[1]; const pl = p.plans[i]; const s = $(`[data-pp="${i}"]`); if (s) s.textContent = priceOf(pl.price) + (pl.unit && Number(pl.price)>0 ? " " + pl.unit : ""); }
    if (el.dataset.k === "rightsConfirmed" || el.dataset.k === "cleanConfirmed") { if (!canPublish(p) && p.published !== false) { p.published = false; $("#pubT").checked = false; toast("Đã chuyển về bản nháp vì chưa đủ mục bắt buộc."); } }
  };
  $("#back").onclick = () => { A._new = null; A.view = "list"; render(); };
  $("#pubT").onchange = e => {
    if (e.target.checked && !canPublish(p)) { e.target.checked = false; toast("Chưa hiện được: còn thiếu mục có dấu ! trong danh sách kiểm tra."); return; }
    p.published = e.target.checked; refreshSide();
  };
  $("#pvBtn").onclick = () => preview(p); $("#pvBtn2").onclick = () => preview(p);
  $$("[data-plat]").forEach(b => b.onclick = () => { const x = b.dataset.plat; p.platforms = p.platforms || []; p.platforms = p.platforms.includes(x) ? p.platforms.filter(y => y !== x) : [...p.platforms, x]; b.setAttribute("aria-pressed", String(p.platforms.includes(x))); refreshSide(); });
  $$("[data-tint]").forEach(b => b.onclick = () => { p.tint = b.dataset.tint; $('[data-k="tint"]').value = p.tint; $$("[data-tint]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); refreshSide(); });
  $$("[data-hot]").forEach(r => r.onchange = () => { p.plans.forEach((pl,i) => pl.highlight = i === +r.dataset.hot); viewEditor(true); });
  const blank = { features:{title:"",text:""}, plans:{name:"",price:null,unit:"/năm",audience:"",items:[],highlight:false}, requirements:{label:"",value:""}, faq:{q:"",a:""}, changelog:{version:p.version||"",date:today(),text:""} };
  $$("[data-add]").forEach(b => b.onclick = () => { const a = b.dataset.add; p[a] = p[a] || []; if (a === "changelog") p[a].unshift(clone(blank[a])); else p[a].push(clone(blank[a])); viewEditor(true); });
  $$("[data-rm]").forEach(b => b.onclick = () => { const [a,i] = b.dataset.rm.split(":"); p[a].splice(+i,1); viewEditor(true); });
  const mv = (a,i,d) => { const x = p[a]; [x[i], x[i+d]] = [x[i+d], x[i]]; viewEditor(true); };
  $$("[data-up]").forEach(b => b.onclick = () => { const [a,i] = b.dataset.up.split(":"); mv(a,+i,-1); });
  $$("[data-down]").forEach(b => b.onclick = () => { const [a,i] = b.dataset.down.split(":"); mv(a,+i,1); });
  $("#quickFBtn").onclick = () => {
    const lines = $("#quickF").value.split("\n").map(x => x.trim()).filter(Boolean); if (!lines.length) return;
    p.features = (p.features||[]).filter(f => f.title || f.text);
    lines.forEach(l => { const k = l.replace(/^[-•\d.)\s]+/,""); const j = k.indexOf(":"); p.features.push(j > 0 ? { title:k.slice(0,j).trim(), text:k.slice(j+1).trim() } : { title:k, text:"" }); });
    viewEditor(true); toast(`Đã thêm ${lines.length} tính năng`);
  };
  // images
  const drop = $("#drop"), fi = $("#fileIn");
  drop.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fi.click(); } };
  fi.onchange = () => { addImages(p, [...fi.files]); fi.value = ""; };
  ["dragenter","dragover"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add("over"); }));
  ["dragleave","drop"].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove("over"); }));
  drop.addEventListener("drop", e => addImages(p, [...e.dataTransfer.files]));
  $$("[data-imv]").forEach(b => b.onclick = () => { const [i,d] = b.dataset.imv.split(":").map(Number); const x = p.images; [x[i], x[i+d]] = [x[i+d], x[i]]; viewEditor(true); });
  $$("[data-idel]").forEach(b => b.onclick = () => { const im = p.images.splice(+b.dataset.idel,1)[0]; if (A.uploads[im.src] && !A.uploads[im.src].committed) delete A.uploads[im.src]; else if (/^uploads\//.test(im.src)) A.deletes.add(im.src); viewEditor(true); });
}
document.addEventListener("paste", e => {
  if (A.view !== "edit") return; const p = A.products[A.editId]; if (!p) return;
  const files = [...(e.clipboardData||{}).files||[]].filter(f => f.type.startsWith("image/"));
  if (files.length) { e.preventDefault(); addImages(p, files); }
});

async function compress(file){
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas"); c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k);
  c.getContext("2d").drawImage(bmp, 0, 0, c.width, c.height);
  let blob = await new Promise(r => c.toBlob(r, "image/webp", 0.86)), ext = "webp";
  if (!blob || blob.type !== "image/webp") { blob = await new Promise(r => c.toBlob(r, "image/jpeg", 0.88)); ext = "jpg"; }
  const buf = new Uint8Array(await blob.arrayBuffer()); let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return { b64: btoa(bin), url: URL.createObjectURL(blob), size: blob.size, ext, w: c.width, h: c.height };
}
async function addImages(p, files){
  files = files.filter(f => f.type.startsWith("image/")); if (!files.length) return toast("Chỉ nhận tệp ảnh (PNG, JPG, WebP).");
  if (!p.id) p.id = uniqueId(slugify(p.name || "san-pham"), p);
  toast(`Đang nén ${files.length} ảnh…`, 1500);
  let small = 0;
  for (const f of files) {
    try {
      const r = await compress(f);
      const path = `uploads/${p.id}/${Date.now().toString(36)}${Math.random().toString(36).slice(2,5)}.${r.ext}`;
      A.uploads[path] = { b64: r.b64, url: r.url, size: r.size };
      p.images = p.images || []; p.images.push({ src: path, caption: "" });
      if (r.w < 1000) small++;
    } catch(e) { toast("Không đọc được ảnh " + f.name); }
  }
  viewEditor(true);
  if (small) toast(`${small} ảnh nhỏ hơn 1000px, có thể bị mờ trên trang sản phẩm.`, 4000);
}

/* ---------- preview ---------- */
function preview(p){
  const d = dialog(`<div class="pv-wrap"><div class="pv-bar"><b style="margin-right:auto">Xem trước: ${esc(p.name||"Sản phẩm mới")}</b>
    <div class="chipset"><button type="button" data-dev="desk" aria-pressed="true">Máy tính</button><button type="button" data-dev="phone" aria-pressed="false">Điện thoại</button></div>
    <button class="btn btn-sm" data-close>Đóng</button></div><div class="pv-stage" id="stage"><iframe title="Xem trước" src="index.html#preview"></iframe></div></div>`, "pv");
  const fr = $("iframe", d);
  const overrides = {}; Object.entries(A.uploads).forEach(([k,v]) => overrides[k] = v.url);
  const send = () => fr.contentWindow.postMessage({ type:"xa-preview", site: A.site, products: cleanProducts(), product: cleanOne(p), overrides }, "*");
  const onMsg = e => { if (e.source === fr.contentWindow && e.data && e.data.type === "xa-ready") send(); };
  addEventListener("message", onMsg); d.addEventListener("close", () => removeEventListener("message", onMsg));
  fr.addEventListener("load", () => setTimeout(send, 50));
  $$("[data-dev]", d).forEach(b => b.onclick = () => { $$("[data-dev]", d).forEach(x => x.setAttribute("aria-pressed", String(x===b))); $("#stage", d).classList.toggle("phone", b.dataset.dev === "phone"); });
}

/* ---------- settings ---------- */
function viewSettings(){
  const s = A.site;
  const f = (k, label, ph="", type="text", hint="") => `<label class="field"><span>${label}</span><input type="${type}" data-s="${k}" value="${esc(s[k] ?? "")}" placeholder="${esc(ph)}">${hint?`<small>${hint}</small>`:""}</label>`;
  $("#main").innerHTML = `
  <div class="page-head"><h1>Cài đặt cửa hàng</h1></div>
  <div style="max-width:820px">
    <section class="box"><h2>Thông tin người bán</h2><p class="lead">Bắt buộc công khai trên website bán hàng.</p>
      <div class="g2">${f("name","Tên cửa hàng","Xưởng App")}${f("owner","Người bán (họ và tên)")}</div>
      <div class="g2">${f("taxCode","Mã số thuế")}${f("area","Khu vực","Phường/xã, Tỉnh/thành phố")}</div>
      <div class="g3">${f("email","Email","","email")}${f("phone","Điện thoại")}${f("zalo","Số Zalo","","text","Để trống nếu không dùng")}</div>
    </section>
    <section class="box"><h2>Trang chủ</h2>
      ${f("slogan","Dòng giới thiệu nhỏ")}
      ${f("heroTitle","Tiêu đề lớn")}
      ${f("heroHighlight","Cụm từ tô vàng trong tiêu đề","","text","Phải trùng đúng một cụm trong tiêu đề lớn")}
      <label class="field"><span>Đoạn giới thiệu</span><textarea data-s="heroText" rows="3">${esc(s.heroText||"")}</textarea></label>
    </section>
    <section class="box"><h2>Cam kết hiển thị</h2>
      <div class="g2">${f("trialDays","Số ngày dùng thử","","number")}${f("refundDays","Số ngày hoàn tiền","","number")}</div>
      <div class="g2">${f("responseHours","Phản hồi trong (giờ làm việc)","","number")}${f("deliveryHours","Bàn giao sau khi nhận tiền (giờ)","","number")}</div>
      ${f("updated","Ngày cập nhật chính sách","04/11/2026")}
    </section>
    <section class="box"><h2>Lĩnh vực sản phẩm</h2>
      <div class="rows">${(s.categories||[]).map((c,i)=>`<div class="rowi"><div class="fl"><input data-cat="${i}" value="${esc(c)}"></div><div class="tl" style="flex-direction:row"><button type="button" class="btn btn-sm btn-icon" data-cup="${i}" ${i===0?"disabled":""} aria-label="Lên">↑</button><button type="button" class="btn btn-sm btn-icon btn-danger" data-crm="${i}" aria-label="Xóa">×</button></div></div>`).join("")}</div>
      <div class="addbar"><button type="button" class="btn btn-sm" id="cadd">+ Thêm lĩnh vực</button></div>
    </section>
    <section class="box"><h2>Cách bán</h2>
      <label class="check"><input type="radio" name="mode" value="catalog" ${s.mode!=="order"?"checked":""}> <span><b>Chỉ giới thiệu, khách liên hệ để mua</b> (đang dùng). Không phải thông báo thương mại điện tử.</span></label>
      <label class="check"><input type="radio" name="mode" value="order" ${s.mode==="order"?"checked":""}> <span><b>Hiện mã QR thanh toán trên web.</b> Chỉ bật sau khi có hộ kinh doanh và được UBND tỉnh xác nhận thông báo website.</span></label>
      <div id="bankBox" ${s.mode==="order"?"":"hidden"} style="display:grid;gap:12px">
        <div class="info">Bật chế độ này khi chưa được xác nhận có thể bị phạt 10–20 triệu đồng (cá nhân).</div>
        <div class="g2">${["bin","account"].map(k=>`<label class="field"><span>${k==="bin"?"Mã ngân hàng (BIN)":"Số tài khoản"}</span><input data-bank="${k}" value="${esc((s.bank||{})[k]||"")}" ${k==="bin"?'placeholder="Ví dụ: 970436"':""}></label>`).join("")}</div>
        <div class="g2">${["holder","bankName"].map(k=>`<label class="field"><span>${k==="holder"?"Tên chủ tài khoản (không dấu)":"Tên ngân hàng"}</span><input data-bank="${k}" value="${esc((s.bank||{})[k]||"")}"></label>`).join("")}</div>
        <label class="field"><span>Mã biểu tượng "Đã thông báo"</span><textarea data-s="badgeHtml" rows="3" placeholder="Dán mã HTML được cấp sau khi xác nhận">${esc(s.badgeHtml||"")}</textarea></label>
      </div>
    </section>
    ${A.mode==="local" ? `<section class="box"><h2>Tệp dữ liệu</h2><p class="lead">Ở chế độ xem thử, bạn có thể tải hai tệp này rồi tự đưa lên kho GitHub (thư mục data/). Ảnh mới thêm không nằm trong tệp.</p><div class="addbar"><button class="btn" data-dl="products">Tải products.json</button><button class="btn" data-dl="site">Tải site.json</button></div></section>` : ""}
  </div>`;
  const m = $("#main");
  m.onchange = null;
  m.oninput = e => {
    const el = e.target;
    if (el.dataset.s) { s[el.dataset.s] = el.type === "number" ? Number(el.value) : el.value; }
    if (el.dataset.bank) { s.bank = s.bank || {}; s.bank[el.dataset.bank] = el.value.trim(); }
    if (el.dataset.cat !== undefined) { const old = s.categories[+el.dataset.cat], v = el.value; A.products.forEach(p => { if (p.category === old) p.category = v; }); s.categories[+el.dataset.cat] = v; }
    markDirty();
  };
  $$('[name="mode"]').forEach(r => r.onchange = async () => {
    if (r.value === "order" && !(await ask("Bật thanh toán trên web?", "Chỉ bật khi đã có hộ kinh doanh và website đã được UBND tỉnh xác nhận thông báo. Nếu chưa, hãy giữ chế độ chỉ giới thiệu.", "Tôi đã được xác nhận"))) { $('[value="catalog"]').checked = true; return; }
    s.mode = r.value; $("#bankBox").hidden = s.mode !== "order"; markDirty();
  });
  $("#cadd").onclick = () => { s.categories.push("Lĩnh vực mới"); viewSettings(); markDirty(); };
  $$("[data-crm]").forEach(b => b.onclick = () => { const c = s.categories[+b.dataset.crm]; const n = A.products.filter(p => p.category === c).length; if (n) return toast(`Còn ${n} sản phẩm thuộc "${c}". Đổi lĩnh vực của chúng trước.`); s.categories.splice(+b.dataset.crm,1); viewSettings(); markDirty(); });
  $$("[data-cup]").forEach(b => b.onclick = () => { const i = +b.dataset.cup, c = s.categories; [c[i-1], c[i]] = [c[i], c[i-1]]; viewSettings(); markDirty(); });
  $$("[data-dl]").forEach(b => b.onclick = () => { const k = b.dataset.dl; const blob = new Blob([JSON.stringify(k==="site"?A.site:cleanProducts(), null, 2) + "\n"], {type:"application/json"}); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = k + ".json"; a.click(); });
}

/* ---------- save ---------- */
function cleanProducts(){ return A.products.map(cleanOne); }
function cleanOne(p){
  { const q = clone(p);
    q.highlights = (q.highlights||[]).map(x => (x||"").trim()).filter(Boolean);
    q.features = (q.features||[]).filter(f => (f.title||"").trim() || (f.text||"").trim());
    q.requirements = (q.requirements||[]).filter(r => (r.value||"").trim());
    q.faq = (q.faq||[]).filter(f => (f.q||"").trim());
    q.changelog = (q.changelog||[]).filter(c => (c.text||"").trim() || (c.version||"").trim());
    q.plans = (q.plans||[]).filter(pl => (pl.name||"").trim());
    if (!q.id) q.id = slugify(q.name);
    return q; }
}
async function save(){
  if (A.saving) return;
  const bad = A.products.filter(p => p.published !== false && !canPublish(p));
  if (bad.length && !(await ask("Có sản phẩm đang hiện nhưng thiếu mục bắt buộc", `${bad.map(p=>"“"+esc(p.name||"(chưa đặt tên)")+"”").join(", ")} chưa đủ mục có dấu !. Vẫn lưu và để chúng hiện trên website?`, "Vẫn lưu"))) return;
  const ids = A.products.map(p => p.id || slugify(p.name)); const dup = ids.find((x,i) => ids.indexOf(x) !== i);
  if (dup) return toast(`Hai sản phẩm trùng mã "${dup}". Đổi mã một sản phẩm rồi lưu lại.`, 4000);
  const products = cleanProducts();
  if (A.mode === "local") {
    try { localStorage.setItem("xa-draft", JSON.stringify({ s:A.site, p:A.products })); } catch(e) { return toast("Không lưu được bản nháp trên máy này."); }
    A.saved = snapshot(); render(); return toast("Đã lưu bản nháp trên máy này. Website chưa thay đổi (chế độ xem thử).", 4000);
  }
  A.saving = true;
  const d = dialog(`<div class="dlg"><h3>Đang lưu lên kho dữ liệu</h3><div class="progress"><span id="step">Bắt đầu…</span><div class="meter" style="max-width:none"><i id="bar" style="width:5%"></i></div></div><p class="muted small" style="margin:0">Đừng đóng trang cho đến khi xong.</p></div>`);
  d.addEventListener("cancel", e => { if (A.saving) e.preventDefault(); });
  try {
    try { const cur = await ghRead("data/products.json"); if (A.shaProducts && cur.sha !== A.shaProducts) { d.close(); A.saving = false;
      if (!(await ask("Dữ liệu trên kho đã thay đổi", "Có người (hoặc một tab khác) vừa lưu sản phẩm sau khi bạn mở trang. Lưu bây giờ sẽ ghi đè thay đổi đó.", "Ghi đè", true))) return; return saveForce(products); } } catch(e) { if (e.status !== 404) throw e; }
    await doCommit(products, d);
  } catch(e) { A.saving = false; try { d.close(); } catch(x) {} dialog(`<div class="dlg"><h3>Chưa lưu được</h3><div class="err">${esc(e.message)}</div><div class="acts"><button class="btn btn-primary" data-close>Đóng</button></div></div>`); }
}
async function saveForce(products){ A.saving = true; const d = dialog(`<div class="dlg"><h3>Đang lưu</h3><div class="progress"><span id="step"></span><div class="meter" style="max-width:none"><i id="bar" style="width:5%"></i></div></div></div>`); try { await doCommit(products, d); } catch(e) { A.saving = false; d.close(); toast(e.message, 5000); } }
async function doCommit(products, d){
  const files = [{ path:"data/products.json", text: JSON.stringify(products, null, 2) + "\n" }, { path:"data/site.json", text: JSON.stringify(A.site, null, 2) + "\n" }];
  const used = new Set(A.products.flatMap(p => (p.images||[]).map(i => i.src)));
  Object.entries(A.uploads).forEach(([path, u]) => { if (!u.committed && used.has(path)) files.push({ path, b64: u.b64 }); });
  A.deletes.forEach(path => { if (!used.has(path)) files.push({ path, delete:true }); });
  let n = 0; const total = files.filter(f => !f.delete).length + 3;
  const names = A.products.filter(p => p.name).slice(0,3).map(p => p.name).join(", ");
  const c = await ghCommit(files, `Cập nhật cửa hàng: ${names || "dữ liệu"}${A.products.length>3?"…":""}`, s => { n++; $("#step", d).textContent = s; $("#bar", d).style.width = Math.min(95, Math.round(100*n/total)) + "%"; });
  Object.values(A.uploads).forEach(u => { u.committed = true; delete u.b64; });
  A.deletes.clear(); A.saved = snapshot(); A.lastCommit = c; A.saving = false;
  try { A.shaProducts = (await ghRead("data/products.json")).sha; } catch(e) {}
  d.close(); render();
  dialog(`<div class="dlg"><h3>Đã lưu</h3><p style="margin:0">Render đang cập nhật website, thường mất 1–2 phút. Sau đó tải lại trang cửa hàng để thấy thay đổi.</p><p class="muted small" style="margin:0">Mã thay đổi: <span class="mono">${esc(c.sha.slice(0,7))}</span></p><div class="acts"><a class="btn" href="https://github.com/${esc(A.cfg.repo)}/commit/${esc(c.sha)}" target="_blank" rel="noopener">Xem trên GitHub</a><button class="btn btn-primary" data-close>Xong</button></div></div>`);
}

/* ---------- boot ---------- */
const c = loadCfg();
if (c && c.token && c.remember) { A.cfg = c; (async () => { try { const [p,s] = await Promise.all([ghRead("data/products.json"), ghRead("data/site.json")]); A.products = JSON.parse(p.text); A.shaProducts = p.sha; A.site = JSON.parse(s.text); A.mode = "github"; start(); } catch(e) { viewLogin(e.message.includes("Failed to fetch") ? "" : e.message); } })(); }
else viewLogin();
})();
