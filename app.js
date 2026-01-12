(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const state = {
    data: null,
    series: "all", // all | angel | parenting
    type: "all",   // all | tool | pick | note
    q: ""
  };

  function esc(str){
    return String(str ?? "")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;")
      .replaceAll('"',"&quot;")
      .replaceAll("'","&#039;");
  }

  function kindBadge(type){
    if(type === "tool") return { label: "工具", cls: "kind-tool" };
    if(type === "pick") return { label: "精選分享", cls: "kind-pick" };
    return { label: "創作日誌", cls: "kind-note" };
  }

  function seriesLabel(series){
    return series === "angel" ? "Angel｜陪你回穩" : "幸福教養｜陪你在關係中站穩";
  }

  function itemMatches(item){
    if(state.series !== "all" && item.series !== state.series) return false;
    if(state.type !== "all" && item.type !== state.type) return false;

    const q = state.q.trim().toLowerCase();
    if(!q) return true;

    const hay = [
      item.title, item.desc, item.why,
      (item.tags || []).join(" "),
      item.series, item.type
    ].join(" ").toLowerCase();

    return hay.includes(q);
  }

  function cardHTML(item){
    const kb = kindBadge(item.type);
    const tags = (item.tags || []).slice(0, 6).map(t => `<span class="tag">${esc(t)}</span>`).join("");
    return `
      <a class="cardlink" href="./tool.html?id=${encodeURIComponent(item.id)}">
        <article class="card">
          <div class="row">
            <h3 class="title">${esc(item.title)}</h3>
          </div>
          <div class="badges" style="margin-top:10px">
            <span class="badge ${kb.cls}">${kb.label}</span>
            <span class="badge">${esc(seriesLabel(item.series))}</span>
          </div>
          <p class="small">${esc(item.desc)}</p>
          ${tags ? `<div class="tagline">${tags}</div>` : ""}
          <div class="arrow">點開 → 工具介紹頁</div>
        </article>
      </a>
    `;
  }

  function renderIndex(){
    const pinnedGrid = $("#pinnedGrid");
    const listGrid = $("#listGrid");
    const empty = $("#empty");
    if(!pinnedGrid || !listGrid) return;

    const items = state.data.items || [];
    const pinnedIds = state.data.pinned_ids || [];
    const pinned = pinnedIds
      .map(id => items.find(x => x.id === id))
      .filter(Boolean)
      .filter(itemMatches);

    pinnedGrid.innerHTML = pinned.map(cardHTML).join("") || `<div class="card"><p class="small">（目前沒有置頂內容）</p></div>`;

    const list = items
      .filter(x => !pinnedIds.includes(x.id))
      .filter(itemMatches);

    listGrid.innerHTML = list.map(cardHTML).join("");
    empty.classList.toggle("hidden", list.length > 0);
  }

  function setActive(btns, activeBtn){
    btns.forEach(b => b.classList.toggle("is-active", b === activeBtn));
  }

  function bindIndexUI(){
    const tabs = $$(".tab");
    const chips = $$(".chip");
    const q = $("#q");

    tabs.forEach(btn => {
      btn.addEventListener("click", () => {
        state.series = btn.dataset.series || "all";
        setActive(tabs, btn);
        renderIndex();
      });
    });

    chips.forEach(btn => {
      btn.addEventListener("click", () => {
        state.type = btn.dataset.type || "all";
        setActive(chips, btn);
        renderIndex();
      });
    });

    if(q){
      q.addEventListener("input", () => {
        state.q = q.value || "";
        renderIndex();
      });
    }
  }

  function getParam(name){
    const url = new URL(location.href);
    return url.searchParams.get(name);
  }

  async function copyText(text){
    try{
      await navigator.clipboard.writeText(text);
      return true;
    }catch(e){
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try{
        document.execCommand("copy");
        ta.remove();
        return true;
      }catch(err){
        ta.remove();
        return false;
      }
    }
  }

  function renderDetail(){
    const id = getParam("id");
    if(!id) return;

    const title = $("#title");
    const subtitle = $("#subtitle");
    const desc = $("#desc");
    const why = $("#why");
    const whyBox = $("#whyBox");
    const go = $("#go");
    const copy = $("#copy");
    const badges = $("#badges");
    const relatedGrid = $("#relatedGrid");

    const items = state.data.items || [];
    const item = items.find(x => x.id === id);

    if(!item){
      if(title) title.textContent = "找不到這張卡";
      if(subtitle) subtitle.textContent = "可能是連結打錯了，或卡片已被移動。";
      if(desc) desc.textContent = "你可以回首頁再挑一張。";
      if(go){
        go.textContent = "回到首頁";
        go.href = "./index.html";
        go.removeAttribute("target");
      }
      if(copy) copy.style.display = "none";
      if(whyBox) whyBox.style.display = "none";
      return;
    }

    document.title = `${item.title}｜angel-home`;

    const kb = kindBadge(item.type);
    if(title) title.textContent = item.title;
    if(subtitle) subtitle.textContent = item.desc || "";
    if(desc) desc.textContent = item.desc || "";

    if(why && (item.why || "").trim()){
      why.textContent = item.why;
      whyBox.style.display = "";
    }else if(whyBox){
      whyBox.style.display = "none";
    }

    if(badges){
      badges.innerHTML = `
        <span class="badge ${kb.cls}">${kb.label}</span>
        <span class="badge">${esc(seriesLabel(item.series))}</span>
        ${(item.tags || []).slice(0, 8).map(t => `<span class="badge">${esc(t)}</span>`).join("")}
      `;
    }

    if(go){
      go.href = item.url || "#";
      go.textContent = item.type === "tool" ? "前往工具" : "前往內容";
    }

    if(copy){
      copy.addEventListener("click", async () => {
        const ok = await copyText(location.href);
        copy.textContent = ok ? "已複製 ✅" : "複製失敗";
        setTimeout(() => (copy.textContent = "複製連結"), 1200);
      });
    }

    if(relatedGrid){
      const pinnedIds = state.data.pinned_ids || [];
      const related = items
        .filter(x => x.id !== item.id)
        .filter(x => x.series === item.series)
        .filter(x => !pinnedIds.includes(x.id))
        .slice(0, 6);

      relatedGrid.innerHTML = related.map(cardHTML).join("") || `<div class="card"><p class="small">（目前沒有其他同系列內容）</p></div>`;
    }
  }

  /* =========================
     音景控制：夜鳥/海浪/雨聲
     - 一次只播一種
     - 不記錄、不綁住
     ========================= */
  function bindSoundDock(){
    const buttons = $$(".soundbtn");
    if(buttons.length === 0) return;

    const audios = {
      night: $("#sound-night"),
      ocean: $("#sound-ocean"),
      rain: $("#sound-rain")
    };

    function stopAll(){
      Object.values(audios).forEach(a => {
        if(!a) return;
        a.pause();
        a.currentTime = 0;
      });
      buttons.forEach(b => {
        b.classList.remove("is-on");
        b.setAttribute("aria-pressed", "false");
      });
    }

    async function toggle(key, btn){
      const a = audios[key];
      if(!a) return;

      const isOn = btn.classList.contains("is-on");
      if(isOn){
        stopAll();
        return;
      }

      stopAll();
      try{
        await a.play(); // 需要使用者點擊才可播放（瀏覽器規則）
        btn.classList.add("is-on");
        btn.setAttribute("aria-pressed", "true");
      }catch(e){
        // 若音檔路徑不存在或瀏覽器阻擋，保持安靜即可
        stopAll();
        alert("播放失敗：請確認音檔已上傳到 assets/audio/，且檔名正確。");
      }
    }

    buttons.forEach(btn => {
      btn.addEventListener("click", () => {
        const key = btn.dataset.sound;
        toggle(key, btn);
      });
    });

    // 轉頁/離開時停止（不綁住）
    window.addEventListener("pagehide", stopAll);
    window.addEventListener("beforeunload", stopAll);
  }

  async function load(){
    try{
      const res = await fetch("./tools.json", { cache: "no-store" });
      const data = await res.json();
      state.data = data;

      // 音景
      bindSoundDock();

      // index page
      if($("#listGrid")){
        bindIndexUI();
        renderIndex();
      }

      // detail page
      if(getParam("id")){
        renderDetail();
      }
    }catch(e){
      const pinnedGrid = $("#pinnedGrid");
      const listGrid = $("#listGrid");
      if(pinnedGrid) pinnedGrid.innerHTML = `<div class="card"><p class="small">tools.json 載入失敗</p></div>`;
      if(listGrid) listGrid.innerHTML = `<div class="card"><p class="small">請確認 tools.json 在同一層，且 JSON 格式正確。</p></div>`;
      const title = $("#title");
      if(title) title.textContent = "載入失敗";
    }
  }

  load();
})();