// ป้องกัน HTML Injection
window.escapeHTML = (str) => {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
};

function navigate(pageId) {
    document.querySelectorAll('.page-section').forEach(sec => sec.classList.add('hidden'));
    const targetSection = document.getElementById(pageId);
    if (targetSection) targetSection.classList.remove('hidden');

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active', 'text-mmsblue-600', 'border-mmsblue-600', 'bg-mmsblue-50');
        if(!link.classList.contains('mobile')) link.classList.add('text-slate-600', 'border-transparent');
        else link.classList.add('text-slate-700');
    });

    document.querySelectorAll(`[data-target="${pageId}"]`).forEach(link => {
        link.classList.add('active');
        if(!link.classList.contains('mobile')) {
            link.classList.remove('text-slate-600', 'border-transparent');
            link.classList.add('text-mmsblue-600', 'border-mmsblue-600');
        } else {
            link.classList.remove('text-slate-700');
            link.classList.add('text-mmsblue-600', 'bg-mmsblue-50');
        }
    });

    window.scrollTo({ top: 0, behavior: 'smooth' });
    const mobileMenu = document.getElementById('mobile-menu');
    if (!mobileMenu.classList.contains('hidden')) mobileMenu.classList.add('hidden');
}

document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('mobile-menu').classList.toggle('hidden');
});

// Popup สำหรับแสดงรายละเอียดข่าว/ประกาศ พร้อมสไลเดอร์รูประบบใหม่
window.showDetails = (encodedData) => {
    const data = JSON.parse(decodeURIComponent(encodedData));
    let badgeColor = 'bg-mmsblue-600';
    let badgeText = data.category || 'ประกาศ';
    
    if (data.category === 'กิจกรรม') badgeColor = 'bg-teal-500';
    if (data.category === 'ประกาศสภานักเรียน') badgeColor = 'bg-mmsblue-600';
    if (data.category === 'ประกาศโรงเรียน') badgeColor = 'bg-indigo-500';
    if (data.category === 'ประกาศทั่วไป') badgeColor = 'bg-slate-500';

    // จัดเตรียมรูปภาพหลายรูปให้พร้อม
    let images = [];
    if (data.imageUrls && Array.isArray(data.imageUrls) && data.imageUrls.length > 0) {
        images = data.imageUrls;
    } else if (data.imageUrl) {
        images = [data.imageUrl];
    }

    let imageHtml = '';
    if (images.length > 0) {
        let isDoc = (data.category === 'ประกาศสภานักเรียน' || data.category === 'ประกาศโรงเรียน' || data.category === 'ประกาศทั่วไป');
        let imgClass = isDoc ? 'w-full h-auto object-contain max-h-[80vh] bg-slate-100' : 'w-full h-64 md:h-80 object-cover';

        if (images.length === 1) {
            imageHtml = `<img src="${images[0]}" class="${imgClass} border-b border-slate-100" alt="Cover">`;
        } else {
            // หากมีหลายรูป ให้สร้างระบบ Slider Scroll Snap
            const sliderId = 'slider-' + Date.now();
            let slidesHtml = images.map((url, index) => `
                <div class="min-w-full snap-center relative shrink-0">
                    <img src="${url}" class="${imgClass}" alt="Slide ${index + 1}">
                    <div class="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2.5 py-1 rounded-full backdrop-blur-sm shadow-sm">${index + 1} / ${images.length}</div>
                </div>
            `).join('');

            imageHtml = `
                <div class="w-full relative group border-b border-slate-100 bg-slate-100">
                    <div id="${sliderId}" class="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar scroll-smooth">
                        ${slidesHtml}
                    </div>
                    <button onclick="document.getElementById('${sliderId}').scrollBy({left: -300, behavior: 'smooth'})" class="absolute left-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 w-8 h-8 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition focus:outline-none"><i class="fa-solid fa-chevron-left"></i></button>
                    <button onclick="document.getElementById('${sliderId}').scrollBy({left: 300, behavior: 'smooth'})" class="absolute right-3 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white text-slate-800 w-8 h-8 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition focus:outline-none"><i class="fa-solid fa-chevron-right"></i></button>
                </div>
            `;
        }
    } else {
        imageHtml = `<div class="w-full h-40 bg-slate-100 flex items-center justify-center border-b border-slate-100"><i class="fa-regular fa-image text-4xl text-slate-300"></i></div>`;
    }

    Swal.fire({
        html: `
            <div class="text-left font-sans flex flex-col h-full">
                ${imageHtml}
                <div class="p-6 md:p-8">
                    <div class="mb-4 flex items-center justify-between">
                        <span class="${badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">${badgeText}</span>
                        <span class="text-sm text-slate-500 font-medium"><i class="fa-regular fa-calendar mr-1"></i> ${data.date || 'ไม่ระบุวันที่'}</span>
                    </div>
                    <h2 class="text-2xl md:text-3xl font-bold text-slate-800 mb-4 leading-tight">${window.escapeHTML(data.title)}</h2>
                    <div class="text-slate-700 text-base leading-relaxed whitespace-pre-wrap mt-4 border-t border-slate-100 pt-4">${window.escapeHTML(data.content) || '<span class="text-slate-400 italic">ไม่มีรายละเอียดเพิ่มเติม</span>'}</div>
                </div>
            </div>
        `,
        showCloseButton: true, showConfirmButton: false, width: 700,
        customClass: { popup: 'rounded-[1.2rem] p-0 overflow-hidden shadow-2xl font-sans', htmlContainer: '!m-0', closeButton: 'bg-white/80 hover:bg-white text-slate-800 rounded-full shadow-md m-2 focus:outline-none' }
    });
};

// --- Slider Logic ---
let currentSlideIndex = 0;
let slideInterval;
let totalSlides = 0;

window.initSlider = (count) => {
    totalSlides = count;
    if(totalSlides <= 1) return; 
    startSlideTimer();
    setupTouchEvents();
}

window.goToSlide = (index) => {
    if (totalSlides === 0) return;
    currentSlideIndex = index;
    if (currentSlideIndex >= totalSlides) currentSlideIndex = 0;
    if (currentSlideIndex < 0) currentSlideIndex = totalSlides - 1;
    
    const track = document.getElementById('slider-track');
    if(track) track.style.transform = `translateX(-${currentSlideIndex * 100}%)`;
    
    document.querySelectorAll('.slider-dot').forEach((dot, i) => {
        if(i === currentSlideIndex) {
            dot.classList.add('bg-mmsblue-600', 'scale-125');
            dot.classList.remove('bg-white/50');
        } else {
            dot.classList.remove('bg-mmsblue-600', 'scale-125');
            dot.classList.add('bg-white/50');
        }
    });

    startSlideTimer(); 
}

window.nextSlide = () => window.goToSlide(currentSlideIndex + 1);
window.prevSlide = () => window.goToSlide(currentSlideIndex - 1);

function startSlideTimer() {
    clearInterval(slideInterval);
    slideInterval = setInterval(window.nextSlide, 5000);
}

let touchStartX = 0;
let touchEndX = 0;
function setupTouchEvents() {
    const sliderArea = document.getElementById('hero-banner-container');
    if(!sliderArea) return;
    sliderArea.addEventListener('touchstart', e => { touchStartX = e.changedTouches[0].screenX; }, {passive: true});
    sliderArea.addEventListener('touchend', e => { touchEndX = e.changedTouches[0].screenX; handleSwipe(); }, {passive: true});
}
function handleSwipe() {
    const threshold = 50; 
    if (touchEndX < touchStartX - threshold) window.nextSlide(); 
    if (touchEndX > touchStartX + threshold) window.prevSlide(); 
}
