(() => {
  'use strict';
  if (document.body.dataset.page !== 'story') return;
  const items = new Map(window.ALBUM.items.map(item => [item.key, item]));
  const track = document.getElementById('book-track');
  const esc = text => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const keyOf = id => 'p' + String(id).padStart(3, '0');
  const chapters = [
    ['cover', '표지'], ['itinerary', '행사 개요'], ['program', '답사 일정'],
    ['chapter-one', '01 · 양림골목비엔날레'], ['chapter-two', '02 · 공간과 예술'],
    ['chapter-three', '03 · 국립아시아문화전당'], ['chapter-four', '04 · 함께한 순간'], ['epilogue', '마지막 장']
  ];
  const groups = [
    {id:'chapter-one',chapter:'chapter-one',title:'골목이 전시장이 되는 순간.',copy:'익숙한 담장 너머로 새로운 풍경이 열립니다. 양림골목비엔날레를 따라, 일상과 예술이 만나는 자리를 걸었습니다.',photos:[4,2]},
    {id:'alley-scenes',chapter:'chapter-one',title:'처마가 만든 그늘에 앉아.',copy:'잠깐의 쉼도 답사의 한 장면이 됩니다.',photos:[195,210,208]},
    {id:'film-yanglim',chapter:'chapter-one',title:'사진을 찍기 전, 그 웃음까지.',copy:'양림동에서 함께 웃던 순간.',video:'v01'},
    {id:'chapter-two',chapter:'chapter-two',title:'오래된 공간, 새로운 시선.',copy:'작품을 들여다보는 눈, 창 너머의 초록, 빛에 따라 달라지는 색. 각자의 시선으로 채운 양림동의 오후.',photos:[372],tone:'tinted'},
    {id:'colours',chapter:'chapter-two',title:'겹겹의 색 사이로.',copy:'작품 앞에서 잠시 멈추고, 한 장을 남깁니다.',photos:[224,227],tone:'tinted'},
    {id:'exhibitions',chapter:'chapter-two',title:'자세히, 천천히.',copy:'한 번 더 돌아보고, 서로의 발견을 나누는 시간. 공간을 읽는 방법도 조금씩 넓어집니다.',photos:[357,217,393,168,402],tone:'tinted'},
    {id:'green-pause',chapter:'chapter-two',title:'걷는 사이, 잠깐의 쉼표.',copy:'초록 그늘 아래 나눈 대화, 나무 사이로 이어지는 길.',photos:[386,262,232],tone:'tinted'},
    {id:'film-green',chapter:'chapter-two',title:'나무 그늘을 따라 걷다.',copy:'나무 그늘 사이로 발걸음이 이어집니다.',video:'v04',tone:'tinted'},
    {id:'chapter-three',chapter:'chapter-three',title:'도시를 함께 읽는 시간.',copy:'국립아시아문화전당에서 만난 건축과 빛, 도시의 기억. 공간을 함께 살펴보고 이야기를 들었습니다.',photos:[291,301]},
    {id:'acc-walk',chapter:'chapter-three',title:'건축을 따라 걷는 오후.',copy:'공간에 귀를 기울이고, 각자의 시선으로 도시를 읽습니다.',photos:[287,274,413]},
    {id:'acc-plaza',chapter:'chapter-three',title:'사람들이 모이는 자리.',copy:'도시를 향해 열린 ACC의 풍경을 바라봅니다.',photos:[306]},
    {id:'film-acc',chapter:'chapter-three',title:'공간에 담긴 이야기를 듣다.',copy:'현장에서 듣고, 함께 바라보던 시간.',video:'v03'},
    {id:'acc-group',chapter:'chapter-three',title:'같은 곳에 앉아, 하나의 장면으로.',copy:'함께한 얼굴들이 모이면 그날의 풍경은 더 오래 남습니다.',photos:[299]},
    {id:'film-group',chapter:'chapter-three',title:'ACC 계단 위의 우리.',copy:'카메라를 향해 함께 웃던 순간.',video:'v02'},
    {id:'chapter-four',chapter:'chapter-four',title:'결국, 오래 남는 건 함께한 순간.',copy:'시장 골목에서 마주친 웃음, 식탁을 둘러싸고 나눈 이야기. 도시의 풍경 옆에 우리의 하루를 남깁니다.',photos:[350,104],tone:'dark'},
    {id:'our-memories',chapter:'chapter-four',title:'한 장씩, 오래 꺼내 볼 기억.',copy:'반가운 얼굴을 따라 그날의 장면을 다시 펼쳐봅니다.',photos:[183,182,116,173,185],tone:'dark'}
  ];
  const schedule = [
    ['06:29–08:28','용산역 → 광주송정역'],['08:28–09:00','양림동 방면 이동'],['09:00–10:00','양림동 집결 및 휴식'],
    ['10:00–11:30','양림골목비엔날레 도슨트 투어'],['11:30–12:30','점심 식사'],['12:30–13:30','양림동 역사문화마을 자유 답사'],
    ['13:30–14:00','국립아시아문화전당 이동'],['14:00–15:00','국립아시아문화전당 도슨트 투어'],['15:00–16:30','광주폴리 공공건축 도보 답사'],
    ['16:30–17:20','1913 송정역시장 방면 이동'],['17:20–18:30','저녁 식사'],['18:30–19:30','송정역시장 자유 답사 및 승차 준비'],['19:56–21:54','광주송정역 → 용산역']
  ];
  function photo(id, eager = false) {
    const item = items.get(keyOf(id));
    return `<figure data-photo="${id}"><button class="photo-button" data-open="${item.key}" aria-label="${esc(item.title)} — 크게 보기"><img src="${item.src}" alt="${esc(item.title)}" width="${item.width}" height="${item.height}" loading="${eager ? 'eager' : 'lazy'}" decoding="async"></button><figcaption><span>${esc(item.title)}</span><span class="photo-number">${String(id).padStart(3,'0')}</span></figcaption></figure>`;
  }
  function heading(page) {
    return `<div class="sheet-heading"><div><h2>${esc(page.title)}</h2></div>${page.copy ? `<p>${esc(page.copy)}</p>` : ''}</div>`;
  }
  const narrow = () => window.innerWidth <= 900;
  let pages = [], current = 0, lastNarrow = narrow(), frame;
  function buildPages() {
    pages = [{id:'cover',chapter:'cover',type:'cover'}, {id:'itinerary',chapter:'itinerary',type:'intro'},
      {id:'program',chapter:'program',type:'program',part:0}, {id:'program-afternoon',chapter:'program',type:'program',part:1}];
    if (narrow()) pages = pages.filter(page => page.id !== 'program-afternoon');
    if (narrow()) pages.splice(1,0,{id:'first-group',chapter:'cover',title:'양림동에서, 함께.',copy:'홍익대학교 공공디자인전공 학술답사',photos:[266]});
    for (const group of groups) {
      if (!group.photos) { pages.push({...group}); continue; }
      const perPage = narrow() ? group.photos.length : 2;
      for (let start = 0; start < group.photos.length; start += perPage) {
        pages.push({...group,id:group.id+(start ? '-'+start : ''),photos:group.photos.slice(start,start+perPage)});
      }
    }
    pages.push({id:'epilogue',chapter:'epilogue',type:'closing'});
  }
  function sheetContent(page) {
    if (page.type === 'cover') return `<div class="cover-topline"><span>2026. 10. 17. (토)</span></div><div class="cover-heading"><h1>광주에서,<br><em>함께 본 풍경.</em></h1><div><p>골목을 걷고, 공간을 읽고,<br>우리의 시선을 나눈 하루.</p><span>홍익대학교 공공디자인전공<br>광주 학술답사 사진 기록집</span></div></div><div class="cover-images">${photo(337,true)}${narrow() ? '' : photo(266,true)}</div><div class="cover-caption"><span>양림골목비엔날레 · 광주 일원</span><a href="#chapter-one">기록집 펼쳐보기 ${narrow() ? '↓' : '→'}</a></div>`;
    if (page.type === 'intro') return `<div class="intro-sheet-text"><h2>현장에서 발견하고,<br>디자인으로 탐구하다.</h2><p>양림동의 골목과 오래된 집, 예술을 품은 전시장, 그리고 도시를 향해 열린 문화공간까지. 함께 걷고 바라본 광주의 하루를 이곳에 모았습니다.</p><p>작은 발견과 반가운 얼굴을 따라,<br>그날의 장면을 다시 펼쳐봅니다.</p><a class="text-link" href="#program">하루의 일정 보기 →</a></div><div class="intro-sheet-image">${photo(423)}</div>`;
    if (page.type === 'program') {
      const rows = narrow() ? schedule : page.part === 0 ? schedule.slice(0,6) : schedule.slice(6);
      if (narrow()) return `<h2>하루의 여정</h2><details class="mobile-schedule"><summary>전체 일정 보기 <span>＋</span></summary><ol class="sheet-program">${rows.map(row=>`<li><time>${row[0]}</time><span>${row[1]}</span></li>`).join('')}</ol><button class="text-link schedule-source" data-open="p424">일정표 사진 보기 ↗</button></details>`;
      return `${heading({title:page.part ? '문화공간에서, 시장 골목까지.' : '광주로 향하는 아침.',copy:''})}<ol class="sheet-program">${rows.map(row=>`<li><time>${row[0]}</time><span>${row[1]}</span></li>`).join('')}</ol><button class="text-link schedule-source" data-open="p424">일정표 사진 크게 보기 ↗</button>`;
    }
    if (page.type === 'closing') return `${heading({title:'하루의 답사, 오래 꺼내 볼 기억.',copy:'함께 걸은 길과 나눈 시선이 다음의 질문으로 이어지기를.'})}<div class="sheet-photos one-photo">${photo(292)}</div><div class="sheet-closing"><span>모든 순간이 여기에. <small>사진 424장 · 영상 4개</small></span><a class="button" href="gallery.html">전체 사진첩 열기 ↗</a></div>`;
    if (page.video) {
      const item = items.get(page.video);
      return `${heading(page)}<div class="sheet-film"><button class="video-button" data-open="${item.key}" aria-label="${esc(item.title)} — 영상 재생"><img src="${item.thumb}" loading="lazy" alt="${esc(item.title)}"><span class="play-circle" aria-hidden="true">▶</span><span class="video-duration">${Math.round(item.duration)}초</span></button></div>`;
    }
    return `${heading(page)}<div class="sheet-photos ${page.photos.length === 1 ? 'one-photo' : ''}">${page.photos.map(id=>photo(id)).join('')}</div>`;
  }
  function render(preserveId) {
    buildPages();
    document.body.classList.toggle('scroll-reader',narrow());
    track.setAttribute('aria-label',narrow() ? '광주 학술답사 기록집' : '좌우로 넘기는 답사 기록집');
    track.innerHTML = pages.map((page,index)=>`<section id="${page.id}" class="book-sheet ${page.type ? 'sheet-'+({program:'schedule',closing:'ending'}[page.type] || page.type) : ''} ${page.tone ? 'sheet-'+page.tone : ''}" data-chapter="${page.chapter}" aria-label="${esc(page.title || chapters.find(c=>c[0]===page.chapter)[1])}" ${!narrow() && index ? 'inert' : ''}>${sheetContent(page)}</section>`).join('');
    document.getElementById('book-chapter').innerHTML = chapters.map(c=>`<option value="${c[0]}">${c[1]}</option>`).join('');
    const requested = preserveId || location.hash.slice(1);
    const exact = pages.findIndex(page=>page.id === requested);
    const base = requested.startsWith('program') ? 'program' : requested.replace(/-\d+$/,'');
    const fallback = pages.findIndex(page=>page.id === base);
    current = Math.max(0, exact >= 0 ? exact : fallback);
    requestAnimationFrame(()=>{goTo(current,true);sync(false);});
  }
  function sync(writeHash = true) {
    const page = pages[current];
    [...track.children].forEach((sheet,index)=>{sheet.inert = !narrow() && index !== current;});
    document.getElementById('book-counter').textContent = `${String(current+1).padStart(2,'0')} / ${String(pages.length).padStart(2,'0')}`;
    document.getElementById('book-prev').disabled = current === 0;
    document.getElementById('book-next').disabled = current === pages.length - 1;
    document.getElementById('book-chapter').value = page.chapter;
    if (writeHash && !document.querySelector('.viewer[open]')) {
      try { history.replaceState(null,'',location.pathname+location.search+'#'+page.id); } catch {}
    }
    if (!narrow()) [current,current+1].forEach(index=>{track.children[index]?.querySelectorAll('img').forEach(img=>img.loading='eager');});
  }
  function goTo(index, instant = false) {
    const target = Math.max(0,Math.min(pages.length-1,index));
    const behavior = instant || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
    if (narrow()) {
      const top = target === 0 ? 0 : track.children[target].getBoundingClientRect().top + window.scrollY - document.querySelector('.site-header').offsetHeight - 12;
      window.scrollTo({top,behavior});
      current = target;
      sync(false);
    } else track.scrollTo({left:target*track.clientWidth,behavior});
  }
  function goToId(id) { const index = pages.findIndex(page=>page.id === id); if (index >= 0) goTo(index,!narrow()); }
  document.getElementById('book-prev').addEventListener('click',()=>goTo(current-1));
  document.getElementById('book-next').addEventListener('click',()=>goTo(current+1));
  document.getElementById('book-chapter').addEventListener('change',event=>goToId(event.target.value));
  track.addEventListener('scroll',()=>{
    if (narrow() || lastNarrow !== narrow() || frame) return;
    frame = requestAnimationFrame(()=>{frame=0; if(narrow() || lastNarrow !== narrow())return; const next=Math.round(track.scrollLeft/track.clientWidth); if(next!==current){current=next;sync();}});
  },{passive:true});
  window.addEventListener('scroll',()=>{
    if (!narrow() || lastNarrow !== narrow() || frame || document.querySelector('.viewer[open]')) return;
    frame=requestAnimationFrame(()=>{
      frame=0;
      if(!narrow() || lastNarrow !== narrow())return;
      let next=0;
      [...track.children].forEach((section,index)=>{if(section.getBoundingClientRect().top < Math.min(240,innerHeight*.3))next=index;});
      if(next!==current){current=next;sync(false);}
    });
  },{passive:true});
  document.addEventListener('click',event=>{
    const anchor=event.target.closest('a[href^="#"]');
    if (!anchor || anchor.classList.contains('skip')) return;
    const id=anchor.getAttribute('href').slice(1);
    if(pages.some(page=>page.id===id)){event.preventDefault();goToId(id);}
  });
  document.addEventListener('keydown',event=>{
    if(narrow() || document.querySelector('dialog[open]') || /INPUT|SELECT|TEXTAREA|VIDEO/.test(event.target.tagName) || event.altKey || event.metaKey || event.ctrlKey) return;
    if(event.key==='ArrowRight' || event.key==='PageDown'){event.preventDefault();goTo(current+1);}
    if(event.key==='ArrowLeft' || event.key==='PageUp'){event.preventDefault();goTo(current-1);}
    if(event.key==='Home'){event.preventDefault();goTo(0,true);}
    if(event.key==='End'){event.preventDefault();goTo(pages.length-1,true);}
  });
  window.addEventListener('hashchange',()=>{if(!location.hash.startsWith('#photo-'))goToId(location.hash.slice(1));});
  let resizeTimer;
  window.addEventListener('resize',()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{
    if(lastNarrow!==narrow()){const id=pages[current].id;lastNarrow=narrow();window.scrollTo({top:0,behavior:'instant'});render(id);}
    else if(!narrow()){goTo(current,true);sync(false);}
  },120);});
  render();
})();
