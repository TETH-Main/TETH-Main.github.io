(function(){
  const body = document.body
  const pagesEl = document.getElementById('pages')
  const sections = Array.from(pagesEl.querySelectorAll('.page'))
  let index = 0

  function show(i){
    index = Math.max(0, Math.min(i, sections.length-1))
    sections.forEach((s, idx)=> s.classList.toggle('active', idx===index))
    const current = sections[index]
    if(current && current.classList.contains('page--deep')) body.classList.add('theme-light')
    else body.classList.remove('theme-light')

    if(index >= 4){
      body.classList.add('page-bg-white', 'bg-video-hidden')
    } else {
      body.classList.remove('page-bg-white', 'bg-video-hidden')
    }
  }

  show(0)

  const intro = document.getElementById('intro-video')
  if(intro){
    intro.classList.remove('hidden')
    requestAnimationFrame(()=> intro.classList.add('is-open'))
    const closeIntro = intro.querySelector('.intro__close')
    const frames = Array.from(intro.querySelectorAll('.intro__frame'))
    if(closeIntro){
      closeIntro.addEventListener('click', ()=>{
        intro.classList.remove('is-open')
        const onEnd = (e)=>{
          if(e.propertyName !== 'opacity') return
          intro.removeEventListener('transitionend', onEnd)
          intro.classList.add('hidden')
          frames.forEach(f=>{ try{ f.src = '' }catch(_){ } })
        }
        intro.addEventListener('transitionend', onEnd)
      })
    }
  }

  document.addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-action]')
    if(!btn) return
    const act = btn.getAttribute('data-action')
    if(act==='next' || act==='deep') show(index+1)
    else if(act==='home') show(0)
  })

  let lock = false
  function navNext(){ if(index < sections.length-1) show(index+1) }
  function navPrev(){ if(index > 0) show(index-1) }
  function withLock(fn){ if(lock) return; lock = true; fn(); setTimeout(()=> lock = false, 550) }
  window.addEventListener('wheel', (e)=>{
    if(e.target.closest('.carousel')) return
    if(Math.abs(e.deltaY) < 10) return
    e.preventDefault()
    if(e.deltaY > 0) withLock(navNext)
    else withLock(navPrev)
  }, {passive:false})

  let touchY = null
  window.addEventListener('touchstart', (e)=> touchY = e.touches[0].clientY, {passive:true})
  window.addEventListener('touchend', (e)=>{
    if(touchY==null) return
    const dy = e.changedTouches[0].clientY - touchY
    if(Math.abs(dy) > 40){ if(dy < 0) withLock(navNext); else withLock(navPrev) }
    touchY = null
  }, {passive:true})

  const gallery = document.getElementById('gallery')
  function updateCenter(){
    const page = gallery && gallery.closest('.page')
    if(!gallery || !page || !page.classList.contains('active')) return
    const cards = Array.from(gallery.querySelectorAll('.card'))
    if(cards.length === 0) return
    const rect = gallery.getBoundingClientRect()
    const cx = rect.left + rect.width / 2

    let best = null
    const el = document.elementFromPoint(cx, rect.top + rect.height/2)
    if(el) best = el.closest && el.closest('.card')

    if(!best){
      let bestD = Infinity
      cards.forEach(c=>{
        const r = c.getBoundingClientRect()
        const midX = r.left + r.width/2
        const d = Math.abs(midX - cx)
        if(d < bestD){ bestD = d; best = c }
      })
    }

    cards.forEach((c)=>{
      if(!c.dataset.gkey){
        const href = c.getAttribute('href') || ''
        const labelEl = c.querySelector('span')
        const label = labelEl ? labelEl.textContent.trim() : (c.querySelector('img')?.alt || '')
        c.dataset.gkey = href + '|' + label
      }
    })

    const bestKey = best ? best.dataset.gkey : null
    cards.forEach(c=> c.classList.toggle('is-center', bestKey && c.dataset.gkey === bestKey))
  }

  if(gallery){
    updateCenter()
    function rafLoop(){ updateCenter(); requestAnimationFrame(rafLoop) }
    requestAnimationFrame(rafLoop)
    window.addEventListener('resize', updateCenter)
  }

  const modal = document.getElementById('modal')
  const titleEl = document.getElementById('modalTitle')
  const bodyEl = document.getElementById('modalBody')
  const thumbEl = document.getElementById('modalThumb')
  const noteEl = document.getElementById('modalNote')
  const modalClose = document.querySelector('.modal__close')

  function preloadImage(url){
    return new Promise((res)=>{
      if(!url) return res(null)
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = ()=> res(url)
      img.onerror = ()=> res(null)
      img.src = url
    })
  }

  function setModalContent(title, text, thumbUrl, linkText){
    titleEl.textContent = title
    bodyEl.textContent = text
    noteEl.textContent = linkText ? `参考リンク: ${linkText}（詳細は『もっと知りたくなった方へ』で案内）` : ''
    if(thumbUrl){
      thumbEl.style.opacity = 0
      thumbEl.style.display = 'none'
      thumbEl.src = ''
      preloadImage(thumbUrl).then((u)=>{
        if(u){ thumbEl.src = u; thumbEl.style.display = 'block'; requestAnimationFrame(()=> thumbEl.style.opacity = 1) }
        else thumbEl.style.display = 'none'
      })
    } else thumbEl.style.display = 'none'
  }

  function openModal(title, text, thumbUrl, linkText){
    const content = modal.querySelector('.modal__content')
    if(modal.open){
      content.classList.add('is-hidden')
      const onEnd = (e)=>{ if(e.propertyName !== 'opacity') return; content.removeEventListener('transitionend', onEnd); setModalContent(title, text, thumbUrl, linkText); requestAnimationFrame(()=> content.classList.remove('is-hidden')) }
      content.addEventListener('transitionend', onEnd)
      return
    }
    preloadImage(thumbUrl).then(()=>{
      setModalContent(title, text, thumbUrl, linkText)
      try{ modal.showModal() }catch(_){ }
      requestAnimationFrame(()=> modal.classList.add('is-open'))
    })
  }

  function closeModalAnimated(){
    const content = modal.querySelector('.modal__content')
    content.classList.add('is-hidden')
    modal.classList.remove('is-open')
    const onEnd = (e)=>{ if(e.propertyName !== 'opacity') return; content.removeEventListener('transitionend', onEnd); try{ modal.close() }catch(_){ } }
    content.addEventListener('transitionend', onEnd)
  }

  modalClose.addEventListener('click', ()=> closeModalAnimated())
  modal.addEventListener('click', (e)=>{
    const rect = modal.querySelector('.modal__content').getBoundingClientRect()
    const x = e.clientX, y = e.clientY
    const inside = x>=rect.left && x<=rect.right && y>=rect.top && y<=rect.bottom
    if(!inside) closeModalAnimated()
  })
  modal.addEventListener('cancel', (e)=>{ e.preventDefault(); closeModalAnimated() })
  document.addEventListener('click', (e)=>{
    const hub = e.target.closest('.hub')
    if(!hub) return
    const type = hub.getAttribute('data-hub')
    if(type==='learn') openModal('学ぶ', '関数アートの技術を学べる動画が400本！初心者でも理解できる内容がたくさん！', 'https://i.ytimg.com/vi/jn11n_hRMRg/mqdefault.jpg', 'https://www.youtube.com/@TETH_Main')
    else if(type==='watch') openModal('観る', '同じ年代の方が作った関数アートギャラリーがある！毎年100作品が掲載中', 'https://pbs.twimg.com/media/F_GhafkXkAAeBFL?format=jpg&name=900x900', 'https://www.desmos.com/art?lang=ja')
    else if(type==='join') openModal('参加する', '関数アートについておしゃべりするコミュニティ！関数アート専門だから、何でも質問ができる！※13歳以上のみ', 'https://pbs.twimg.com/media/G3Q9NnWboAAk1NF?format=jpg&name=large', 'http://discord.gg/298vPa6re7')
  })
})()
