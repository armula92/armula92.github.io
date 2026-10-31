// 그림 크게 보기: 사진을 누르면 화면 가득 보여 주고, 바깥이나 Esc로 닫는다
document.addEventListener('DOMContentLoaded', () => {
  const box = document.querySelector('.lightbox');
  if (!box) return;
  const img = box.querySelector('img');
  document.querySelectorAll('a.ph').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    img.src = a.getAttribute('href');
    img.alt = a.querySelector('img').alt;
    box.showModal();
  }));
  box.addEventListener('click', e => { if (e.target !== img) box.close(); });
});
