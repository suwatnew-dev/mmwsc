import { initializeApp } from "[https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js](https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js)";
import { getFirestore, collection, getDocs, addDoc, getDoc, doc } from "[https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js](https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js)";
import { getAuth, signInAnonymously } from "[https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js](https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js)";

const firebaseConfig = {
    apiKey: "AIzaSyBvYde85fsk0QgbQVUpHkX7gHH96MbK6IU",
    authDomain: "mmwsc-app.firebaseapp.com",
    projectId: "mmwsc-app",
    storageBucket: "mmwsc-app.firebasestorage.app",
    messagingSenderId: "151104958067",
    appId: "1:151104958067:web:94f302fc9db8493550c406"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// ตัวแปรสำหรับปฏิทิน
let allCalendarEvents = [];
let currentCalMonth = new Date().getMonth();
let currentCalYear = new Date().getFullYear();

// ตัวแปรสำหรับแบ่งหน้า (Pagination)
window.paginations = {
    news: { page: 1, data: [], render: null, limit: 9 },
    announcements: { page: 1, data: [], render: null, limit: 9 },
    activities: { page: 1, data: [], render: null, limit: 9 }
};

window.renderPaginatedGrid = (containerId, stateKey, itemRenderer, emptyMessage) => {
    const state = window.paginations[stateKey];
    const container = document.getElementById(containerId);
    if (!container) return;

    if (state.data.length === 0) {
        container.innerHTML = emptyMessage;
        return;
    }

    const totalPages = Math.ceil(state.data.length / state.limit) || 1;
    if (state.page > totalPages) state.page = totalPages;
    if (state.page < 1) state.page = 1;

    const startIdx = (state.page - 1) * state.limit;
    const currentData = state.data.slice(startIdx, startIdx + state.limit);

    let html = currentData.map(itemRenderer).join('');

    if (state.data.length > state.limit) {
        html += `
        <div class="col-span-full flex justify-between items-center mt-6 pt-6 border-t border-slate-200 fade-in-content">
            <button onclick="window.changePage('${stateKey}', -1)" class="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-mmsblue-50 hover:text-mmsblue-600 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center" ${state.page === 1 ? 'disabled' : ''}>
                <i class="fa-solid fa-chevron-left mr-2"></i> ย้อนกลับ
            </button>
            <span class="text-sm font-bold text-mmsblue-600 bg-mmsblue-50 px-4 py-2 rounded-xl shadow-sm">หน้า ${state.page} / ${totalPages}</span>
            <button onclick="window.changePage('${stateKey}', 1)" class="px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-600 hover:bg-mmsblue-50 hover:text-mmsblue-600 transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center" ${state.page === totalPages ? 'disabled' : ''}>
                หน้าถัดไป <i class="fa-solid fa-chevron-right ml-2"></i>
            </button>
        </div>`;
    }
    container.innerHTML = html;
};

window.changePage = (stateKey, dir) => {
    window.paginations[stateKey].page += dir;
    if (window.paginations[stateKey].render) window.paginations[stateKey].render();
    const sectionId = stateKey === 'members' ? 'directory' : stateKey;
    const section = document.getElementById(sectionId);
    if(section) {
        const y = section.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({top: y, behavior: 'smooth'});
    }
};

const thaiMonthsOrder = [
    'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
    'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

signInAnonymously(auth).then(() => {
    loadUrgentAnnouncement(); 
    loadBanners();
    loadNews();
    loadAnnouncements();
    loadActivities();
    loadCalendarEvents();
    loadMembers();
    loadContact();
}).catch((error) => console.error("Firebase Auth Error:", error));

// ----------------------------------------------------
// ฟังก์ชันโหลดประกาศด่วน (Urgent Popup)
// ----------------------------------------------------
async function loadUrgentAnnouncement() {
    try {
        const urgentSnap = await getDoc(doc(db, "settings", "urgent"));
        if (urgentSnap.exists()) {
            const data = urgentSnap.data();
            
            if (data.isActive && data.title) {
                const hideKey = 'hideUrgent_' + (data.updatedAt || '0');
                if (localStorage.getItem(hideKey)) return;

                let imageHtml = '';
                if (data.imageUrl) {
                    imageHtml = `<img src="${data.imageUrl}" class="w-full h-auto max-h-[40vh] object-contain bg-slate-100 border-b border-slate-100" alt="ประกาศด่วน">`;
                }

                let linkHtml = '';
                if (data.link) {
                    linkHtml = `<a href="${data.link}" target="_blank" class="mt-5 inline-block w-full text-center bg-mmsblue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-mmsblue-700 transition shadow-sm active:scale-95"><i class="fa-solid fa-link mr-2"></i> อ่านรายละเอียดเพิ่มเติม</a>`;
                }

                Swal.fire({
                    html: `
                        <div class="text-left font-sans flex flex-col h-full relative">
                            ${imageHtml}
                            <div class="p-6 md:p-8 ${imageHtml ? 'pt-6' : 'pt-10'}">
                                <div class="mb-3 flex items-center">
                                    <span class="bg-red-500 text-white text-[10px] md:text-xs font-bold px-3 py-1 rounded-full shadow-sm animate-pulse"><i class="fa-solid fa-bell mr-1"></i> ประกาศด่วนจากสภาฯ</span>
                                </div>
                                <h2 class="text-xl md:text-2xl font-bold text-slate-800 mb-3 leading-tight">${window.escapeHTML(data.title)}</h2>
                                ${data.content ? `<div class="text-slate-600 text-sm md:text-base leading-relaxed whitespace-pre-wrap border-t border-slate-100 pt-4">${window.escapeHTML(data.content)}</div>` : ''}
                                ${linkHtml}
                            </div>
                            <div class="bg-slate-50 px-6 py-4 border-t border-slate-200 mt-auto rounded-b-[1.2rem] flex justify-center">
                                <label class="inline-flex items-center cursor-pointer group">
                                    <input type="checkbox" id="dont-show-again" class="w-4 h-4 text-mmsblue-600 bg-white border-slate-300 rounded focus:ring-mmsblue-50 cursor-pointer">
                                    <span class="ml-2 text-xs md:text-sm text-slate-500 font-medium group-hover:text-slate-700 transition">ไม่แสดงหน้านี้อีก</span>
                                </label>
                            </div>
                        </div>
                    `,
                    showCloseButton: true, showConfirmButton: false, width: 550, padding: 0,
                    customClass: { popup: 'rounded-[1.2rem] p-0 overflow-hidden shadow-2xl font-sans', htmlContainer: '!m-0', closeButton: 'bg-white/90 hover:bg-white text-slate-800 rounded-full shadow-md m-3 focus:outline-none z-10 transition' },
                    willClose: () => {
                        const checkbox = document.getElementById('dont-show-again');
                        if (checkbox && checkbox.checked) localStorage.setItem(hideKey, 'true');
                    }
                });
            }
        }
    } catch (error) { console.error("Error loading urgent:", error); }
}

// ----------------------------------------------------
// ฟังก์ชันโหลดแบนเนอร์ (Banners Slider)
// ----------------------------------------------------
async function loadBanners() {
    const container = document.getElementById('hero-banner-container');
    try {
        const querySnapshot = await getDocs(collection(db, "banners"));
        const bannersArray = [];
        querySnapshot.forEach(doc => bannersArray.push({ id: doc.id, ...doc.data() }));
        
        bannersArray.sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));

        if (bannersArray.length === 0) {
            container.innerHTML = `
                <div class="relative bg-gradient-to-r from-mmsblue-900 via-mmsblue-800 to-mmsblue-600 text-white overflow-hidden w-full aspect-video md:max-h-[500px] flex items-center justify-center">
                    <div class="absolute inset-0 bg-black/20"></div>
                    <div class="absolute inset-0 opacity-10" style="background-image: radial-gradient(#ffffff 1px, transparent 1px); background-size: 20px 20px;"></div>
                    <div class="relative px-4 text-center z-10 w-full pb-10">
                        <h2 class="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 text-transparent bg-clip-text bg-gradient-to-r from-white to-mmsblue-100">ขับเคลื่อนนโยบาย <br class="md:hidden"> สานใจนักเรียน</h2>
                        <p class="text-sm sm:text-base md:text-xl text-blue-100 max-w-2xl mx-auto mb-6 sm:mb-10 px-4">สภานักเรียนโรงเรียนเมืองมุกวิทยาคม มุ่งมั่นที่จะเป็นกระบอกเสียงแทนนักเรียนทุกคน</p>
                    </div>
                </div>`;
            return;
        }

        let slidesHtml = ''; let dotsHtml = '';
        
        bannersArray.forEach((banner, index) => {
            const isActive = index === 0;
            let content = banner.link ? `<a href="${banner.link}" target="_blank" class="block w-full h-full relative group cursor-pointer">` : `<div class="block w-full h-full relative">`;
            content += `<img src="${banner.imageUrl}" class="w-full h-full object-cover" alt="Banner ${index + 1}">`;
            if(banner.title) {
                content += `<div class="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/80 to-transparent p-6 sm:p-10 text-white"><h3 class="text-xl sm:text-3xl font-bold drop-shadow-md truncate">${banner.title}</h3></div>`;
            }
            content += banner.link ? `</a>` : `</div>`;
            slidesHtml += `<div class="w-full h-full flex-shrink-0 relative">${content}</div>`;
            dotsHtml += `<button onclick="goToSlide(${index})" class="slider-dot w-3 h-3 rounded-full transition-all duration-300 ${isActive ? 'bg-mmsblue-600 scale-125' : 'bg-white/50 hover:bg-white/80'} shadow-md"></button>`;
        });

        container.innerHTML = `
            <div class="w-full mx-auto relative overflow-hidden bg-slate-200">
                <div class="w-full max-w-7xl mx-auto relative aspect-video shadow-xl">
                    <div id="slider-track" class="flex w-full h-full transition-transform duration-500 ease-in-out">${slidesHtml}</div>
                    ${bannersArray.length > 1 ? `
                    <button onclick="prevSlide()" class="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition backdrop-blur-sm z-10 hidden sm:flex"><i class="fa-solid fa-chevron-left text-lg"></i></button>
                    <button onclick="nextSlide()" class="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 bg-black/30 hover:bg-black/60 text-white w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition backdrop-blur-sm z-10 hidden sm:flex"><i class="fa-solid fa-chevron-right text-lg"></i></button>
                    <div class="absolute bottom-4 left-0 w-full flex justify-center space-x-2 sm:space-x-3 z-10">${dotsHtml}</div>
                    ` : ''}
                </div>
            </div>`;

        if(window.initSlider) window.initSlider(bannersArray.length);
    } catch (error) { container.innerHTML = ''; }
}

// ----------------------------------------------------
// ฟังก์ชันโหลดข่าวสาร (News)
// ----------------------------------------------------
async function loadNews() {
    const container = document.getElementById('news-container');
    const latestContainer = document.getElementById('latest-news-container');
    const monthSelect = document.getElementById('news-month-filter');
    const yearSelect = document.getElementById('news-year-filter');
    const filterContainer = document.getElementById('news-filter-container');

    try {
        const querySnapshot = await getDocs(collection(db, "news"));
        if (querySnapshot.empty) { 
            container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500"><i class="fa-regular fa-folder-open text-4xl mb-3 block text-slate-300"></i>ยังไม่มีข่าวสารในขณะนี้</div>'; 
            if (latestContainer) latestContainer.innerHTML = '<div class="p-10 text-center w-full text-slate-500"><i class="fa-regular fa-folder-open text-3xl mb-2 block text-slate-300"></i>ยังไม่มีข่าวสารในขณะนี้</div>';
            return; 
        }

        const newsArray = []; const months = new Set(); const years = new Set();
        querySnapshot.forEach(doc => {
            const data = doc.data();
            let itemMonth = "ไม่ระบุ"; let itemYear = "ไม่ระบุ";
            
            if (data.rawDate) {
                const date = new Date(data.rawDate);
                itemMonth = date.toLocaleDateString('th-TH', { month: 'long' });
                itemYear = date.toLocaleDateString('th-TH', { year: 'numeric' });
            } else if (data.timestamp) {
                const date = new Date(data.timestamp.seconds * 1000);
                itemMonth = date.toLocaleDateString('th-TH', { month: 'long' });
                itemYear = date.toLocaleDateString('th-TH', { year: 'numeric' });
            }
            
            months.add(itemMonth); years.add(itemYear);
            newsArray.push({ id: doc.id, ...data, itemMonth, itemYear });
        });
        newsArray.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        if (latestContainer && newsArray.length > 0) {
            const latest = newsArray[0];
            let badgeColor = 'bg-mmsblue-600'; if (latest.category === 'กิจกรรม') badgeColor = 'bg-teal-500'; if (latest.category === 'ทั่วไป') badgeColor = 'bg-slate-500';
            let hasManyImages = latest.imageUrls && latest.imageUrls.length > 1;

            latestContainer.innerHTML = `
            <div onclick="showDetails('${encodeURIComponent(JSON.stringify(latest))}')" class="flex flex-col md:flex-row group cursor-pointer hover:bg-slate-50 transition duration-300 h-full border border-slate-100 rounded-[1.2rem] overflow-hidden">
                <div class="md:w-2/5 lg:w-1/3 relative overflow-hidden flex items-center justify-center bg-slate-100 shrink-0 h-48 md:h-auto md:min-h-[12rem] border-b md:border-b-0 md:border-r border-slate-100">
                    ${latest.imageUrl ? `<img src="${latest.imageUrl}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">` : `<i class="fa-regular fa-newspaper text-6xl text-slate-300 group-hover:scale-110 transition duration-500"></i>`}
                    <div class="absolute top-4 left-4 ${badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center"><i class="fa-solid fa-fire mr-1.5"></i> ล่าสุด - ${latest.category || 'ข่าวสาร'}</div>
                    ${hasManyImages ? `<div class="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm shadow-sm"><i class="fa-regular fa-images mr-1"></i> ${latest.imageUrls.length} รูป</div>` : ''}
                </div>
                <div class="p-4 md:p-5 flex flex-col flex-grow justify-start md:justify-center bg-white">
                    <div class="flex items-center text-xs text-slate-500 mb-1.5"><i class="fa-regular fa-calendar mr-2"></i> ${latest.date || 'ไม่ระบุวันที่'}</div>
                    <h3 class="text-base md:text-xl font-bold text-slate-800 mb-1.5 line-clamp-2 group-hover:text-mmsblue-600 transition">${latest.title}</h3>
                    ${latest.content ? `<p class="text-slate-600 text-xs md:text-sm mb-2 line-clamp-2">${latest.content}</p>` : ''}
                    <div class="mt-auto text-mmsblue-600 text-xs md:text-sm font-semibold flex items-center pt-2 border-t border-slate-50">อ่านรายละเอียด <i class="fa-solid fa-arrow-right ml-2 text-[10px]"></i></div>
                </div>
            </div>`;
        }

        if (monthSelect && yearSelect && filterContainer) {
            const sortedMonths = Array.from(months).sort((a, b) => thaiMonthsOrder.indexOf(a) - thaiMonthsOrder.indexOf(b));
            const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
            monthSelect.innerHTML = '<option value="all">ทุกเดือน</option>'; sortedMonths.forEach(m => { if(m !== 'ไม่ระบุ') monthSelect.innerHTML += `<option value="${m}">${m}</option>`; }); if(months.has('ไม่ระบุ')) monthSelect.innerHTML += `<option value="ไม่ระบุ">ไม่ระบุ</option>`;
            yearSelect.innerHTML = '<option value="all">ทุกปี</option>'; sortedYears.forEach(y => { if(y !== 'ไม่ระบุ') yearSelect.innerHTML += `<option value="${y}">${y}</option>`; }); if(years.has('ไม่ระบุ')) yearSelect.innerHTML += `<option value="ไม่ระบุ">ไม่ระบุ</option>`;
            
            if(newsArray.length > 0) filterContainer.classList.remove('hidden');

            const renderFiltered = () => {
                const sMonth = monthSelect.value; const sYear = yearSelect.value;
                window.paginations.news.data = newsArray.filter(item => (sMonth === 'all' || item.itemMonth === sMonth) && (sYear === 'all' || item.itemYear === sYear));
                window.paginations.news.page = 1;
                
                window.paginations.news.render = () => {
                    window.renderPaginatedGrid('news-container', 'news', (data) => {
                        let badgeColor = 'bg-mmsblue-600'; if (data.category === 'กิจกรรม') badgeColor = 'bg-teal-500'; if (data.category === 'ทั่วไป') badgeColor = 'bg-slate-500';
                        let hasManyImages = data.imageUrls && data.imageUrls.length > 1;

                        return `
                        <div onclick="showDetails('${encodeURIComponent(JSON.stringify(data))}')" class="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition duration-300 border border-slate-100 group flex flex-col cursor-pointer h-full fade-in-content">
                            <div class="h-48 relative overflow-hidden flex items-center justify-center bg-slate-100 shrink-0">
                                ${data.imageUrl ? `<img src="${data.imageUrl}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">` : `<i class="fa-regular fa-newspaper text-5xl text-slate-300 group-hover:scale-110 transition duration-500"></i>`}
                                <div class="absolute top-4 left-4 ${badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">${data.category || 'ข่าวสาร'}</div>
                                ${hasManyImages ? `<div class="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm shadow-sm"><i class="fa-regular fa-images mr-1"></i> ${data.imageUrls.length} รูป</div>` : ''}
                            </div>
                            <div class="p-4 md:p-5 flex flex-col flex-grow bg-white">
                                <div class="flex items-center text-xs text-slate-500 mb-1.5"><i class="fa-regular fa-calendar mr-2"></i> ${data.date || 'ไม่ระบุวันที่'}</div>
                                <h3 class="text-base md:text-lg font-bold text-slate-800 mb-1.5 line-clamp-2 group-hover:text-mmsblue-600 transition">${data.title}</h3>
                                ${data.content ? `<p class="text-slate-600 text-xs md:text-sm mb-2 line-clamp-2 flex-grow">${data.content}</p>` : ''}
                                <div class="mt-auto text-mmsblue-600 text-xs md:text-sm font-semibold flex items-center pt-2 border-t border-slate-50 opacity-100 md:opacity-0 group-hover:opacity-100 transition">อ่านรายละเอียด <i class="fa-solid fa-arrow-right ml-2 text-[10px]"></i></div>
                            </div>
                        </div>`;
                    }, '<div class="col-span-full text-center py-10 text-slate-500"><i class="fa-regular fa-folder-open text-4xl mb-3 block text-slate-300"></i>ไม่มีข่าวสารในเดือน/ปีที่เลือก</div>');
                };
                window.paginations.news.render();
            };
            monthSelect.addEventListener('change', renderFiltered); yearSelect.addEventListener('change', renderFiltered); renderFiltered();
        }
    } catch (error) { 
        container.innerHTML = '<div class="col-span-full text-center py-10 text-red-500">เกิดข้อผิดพลาด</div>'; 
        if (latestContainer) latestContainer.innerHTML = '<div class="text-center py-10 text-red-500 w-full">เกิดข้อผิดพลาด</div>';
    }
}

// ----------------------------------------------------
// ฟังก์ชันโหลดประกาศ (Announcements)
// ----------------------------------------------------
async function loadAnnouncements() {
    const container = document.getElementById('announcements-container');
    const latestContainer = document.getElementById('latest-announcement-container'); 
    const monthSelect = document.getElementById('announcements-month-filter');
    const yearSelect = document.getElementById('announcements-year-filter');
    const filterContainer = document.getElementById('announcements-filter-container');

    try {
        const querySnapshot = await getDocs(collection(db, "announcements"));
        if (querySnapshot.empty) { 
            container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500"><i class="fa-solid fa-bullhorn text-4xl mb-3 block text-slate-300"></i>ยังไม่มีประกาศในขณะนี้</div>'; 
            if (latestContainer) latestContainer.innerHTML = '<div class="p-10 text-center w-full text-slate-500"><i class="fa-solid fa-bullhorn text-3xl mb-2 block text-slate-300"></i>ยังไม่มีประกาศในขณะนี้</div>';
            return; 
        }
        
        const annArray = []; const months = new Set(); const years = new Set();
        querySnapshot.forEach(doc => {
            const data = doc.data();
            let itemMonth = "ไม่ระบุ"; let itemYear = "ไม่ระบุ";
            
            if (data.rawDate) {
                const date = new Date(data.rawDate);
                itemMonth = date.toLocaleDateString('th-TH', { month: 'long' });
                itemYear = date.toLocaleDateString('th-TH', { year: 'numeric' });
            } else if (data.timestamp) {
                const date = new Date(data.timestamp.seconds * 1000);
                itemMonth = date.toLocaleDateString('th-TH', { month: 'long' });
                itemYear = date.toLocaleDateString('th-TH', { year: 'numeric' });
            }
            
            months.add(itemMonth); years.add(itemYear);
            annArray.push({ id: doc.id, ...data, itemMonth, itemYear });
        });
        annArray.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));

        if (latestContainer && annArray.length > 0) {
            const latest = annArray[0];
            let badgeColor = 'bg-mmsblue-600'; if (latest.category === 'ประกาศโรงเรียน') badgeColor = 'bg-indigo-500'; if (latest.category === 'ประกาศทั่วไป') badgeColor = 'bg-slate-500';
            let imageContainerClass = (latest.category === 'ประกาศสภานักเรียน' || latest.category === 'ประกาศโรงเรียน') ? 'md:w-2/5 lg:w-1/3 h-56 md:h-auto md:min-h-[14rem] relative overflow-hidden flex items-center justify-center bg-slate-100 shrink-0 border-b md:border-b-0 md:border-r border-slate-100' : 'md:w-2/5 lg:w-1/3 relative overflow-hidden flex items-center justify-center bg-slate-100 shrink-0 h-48 md:h-auto md:min-h-[12rem] border-b md:border-b-0 md:border-r border-slate-100';
            let imageClass = (latest.category === 'ประกาศสภานักเรียน' || latest.category === 'ประกาศโรงเรียน') ? 'w-full h-full object-cover object-top group-hover:scale-105 transition duration-500' : 'w-full h-full object-contain p-2 max-h-48 md:max-h-full group-hover:scale-105 transition duration-500';
            let hasManyImages = latest.imageUrls && latest.imageUrls.length > 1;

            latestContainer.innerHTML = `
            <div onclick="showDetails('${encodeURIComponent(JSON.stringify(latest))}')" class="flex flex-col md:flex-row group cursor-pointer hover:bg-slate-50 transition duration-300 border border-slate-100 rounded-[1.2rem] overflow-hidden h-full">
                <div class="${imageContainerClass}">
                    ${latest.imageUrl ? `<img src="${latest.imageUrl}" class="${imageClass}">` : `<i class="fa-solid fa-bullhorn text-6xl text-slate-300 group-hover:scale-110 transition duration-500"></i>`}
                    <div class="absolute top-4 left-4 ${badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm flex items-center"><i class="fa-solid fa-fire mr-1.5"></i> ล่าสุด - ${latest.category || 'ประกาศ'}</div>
                    ${hasManyImages ? `<div class="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm shadow-sm"><i class="fa-regular fa-images mr-1"></i> ${latest.imageUrls.length} รูป</div>` : ''}
                </div>
                <div class="p-4 md:p-5 flex flex-col flex-grow justify-start md:justify-center bg-white">
                    <div class="flex items-center text-xs text-slate-500 mb-1.5"><i class="fa-regular fa-calendar mr-2"></i> ${latest.date || 'ไม่ระบุวันที่'}</div>
                    <h3 class="text-base md:text-xl font-bold text-slate-800 mb-1.5 line-clamp-2 group-hover:text-mmsblue-600 transition">${latest.title}</h3>
                    ${latest.content ? `<p class="text-slate-600 text-xs md:text-sm mb-2 line-clamp-2">${latest.content}</p>` : ''}
                    <div class="mt-auto text-mmsblue-600 text-xs md:text-sm font-semibold flex items-center pt-2 border-t border-slate-50">อ่านรายละเอียด <i class="fa-solid fa-arrow-right ml-2 text-[10px]"></i></div>
                </div>
            </div>`;
        }
        
        if (monthSelect && yearSelect && filterContainer) {
            const sortedMonths = Array.from(months).sort((a, b) => thaiMonthsOrder.indexOf(a) - thaiMonthsOrder.indexOf(b));
            const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
            monthSelect.innerHTML = '<option value="all">ทุกเดือน</option>'; sortedMonths.forEach(m => { if(m !== 'ไม่ระบุ') monthSelect.innerHTML += `<option value="${m}">${m}</option>`; }); if(months.has('ไม่ระบุ')) monthSelect.innerHTML += `<option value="ไม่ระบุ">ไม่ระบุ</option>`;
            yearSelect.innerHTML = '<option value="all">ทุกปี</option>'; sortedYears.forEach(y => { if(y !== 'ไม่ระบุ') yearSelect.innerHTML += `<option value="${y}">${y}</option>`; }); if(years.has('ไม่ระบุ')) yearSelect.innerHTML += `<option value="ไม่ระบุ">ไม่ระบุ</option>`;
            
            if(annArray.length > 0) filterContainer.classList.remove('hidden');

            const renderFiltered = () => {
                const sMonth = monthSelect.value; const sYear = yearSelect.value;
                window.paginations.announcements.data = annArray.filter(item => (sMonth === 'all' || item.itemMonth === sMonth) && (sYear === 'all' || item.itemYear === sYear));
                window.paginations.announcements.page = 1;
                
                window.paginations.announcements.render = () => {
                    window.renderPaginatedGrid('announcements-container', 'announcements', (data) => {
                        let badgeColor = 'bg-mmsblue-600'; if (data.category === 'ประกาศโรงเรียน') badgeColor = 'bg-indigo-500'; if (data.category === 'ประกาศทั่วไป') badgeColor = 'bg-slate-500';
                        let imageContainerClass = (data.category === 'ประกาศสภานักเรียน' || data.category === 'ประกาศโรงเรียน') ? 'h-56 md:h-auto md:aspect-[1/1.414] relative overflow-hidden flex items-center justify-center bg-slate-100 shrink-0 border-b border-slate-100' : 'relative overflow-hidden flex items-center justify-center bg-slate-100 shrink-0 border-b border-slate-100 h-48';
                        let imageClass = (data.category === 'ประกาศสภานักเรียน' || data.category === 'ประกาศโรงเรียน') ? 'w-full h-full object-cover object-top md:object-center group-hover:scale-105 transition duration-500' : 'w-full h-full object-contain p-2 group-hover:scale-105 transition duration-500';
                        let hasManyImages = data.imageUrls && data.imageUrls.length > 1;
                        
                        return `
                        <div onclick="showDetails('${encodeURIComponent(JSON.stringify(data))}')" class="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition duration-300 border border-slate-100 group flex flex-col cursor-pointer h-full fade-in-content">
                            <div class="${imageContainerClass}">
                                ${data.imageUrl ? `<img src="${data.imageUrl}" class="${imageClass}">` : `<i class="fa-solid fa-bullhorn text-5xl text-slate-300 group-hover:scale-110 transition duration-500"></i>`}
                                <div class="absolute top-4 left-4 ${badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">${data.category || 'ประกาศ'}</div>
                                ${hasManyImages ? `<div class="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm shadow-sm"><i class="fa-regular fa-images mr-1"></i> ${data.imageUrls.length} รูป</div>` : ''}
                            </div>
                            <div class="p-4 md:p-5 flex flex-col flex-grow bg-white">
                                <div class="flex items-center text-xs text-slate-500 mb-1.5"><i class="fa-regular fa-calendar mr-2"></i> ${data.date || 'ไม่ระบุวันที่'}</div>
                                <h3 class="text-base md:text-lg font-bold text-slate-800 mb-1.5 line-clamp-2 group-hover:text-mmsblue-600 transition">${data.title}</h3>
                                ${data.content ? `<p class="text-slate-600 text-xs md:text-sm mb-2 line-clamp-2 flex-grow">${data.content}</p>` : ''}
                                <div class="mt-auto text-mmsblue-600 text-xs md:text-sm font-semibold flex items-center pt-2 border-t border-slate-50 opacity-100 md:opacity-0 group-hover:opacity-100 transition">อ่านรายละเอียด <i class="fa-solid fa-arrow-right ml-2 text-[10px]"></i></div>
                            </div>
                        </div>`;
                    }, '<div class="col-span-full text-center py-10 text-slate-500"><i class="fa-solid fa-bullhorn text-4xl mb-3 block text-slate-300"></i>ไม่มีประกาศในเดือน/ปีที่เลือก</div>');
                };
                window.paginations.announcements.render();
            };
            monthSelect.addEventListener('change', renderFiltered); yearSelect.addEventListener('change', renderFiltered); renderFiltered();
        }
    } catch (error) { 
        container.innerHTML = '<div class="col-span-full text-center py-10 text-red-500">เกิดข้อผิดพลาด</div>'; 
        if (latestContainer) latestContainer.innerHTML = '<div class="text-center py-10 text-red-500 w-full">เกิดข้อผิดพลาด</div>';
    }
}

// ----------------------------------------------------
// ฟังก์ชันโหลดกิจกรรม (Activities)
// ----------------------------------------------------
async function loadActivities() {
    const container = document.getElementById('activities-container');
    const monthSelect = document.getElementById('activities-month-filter');
    const yearSelect = document.getElementById('activities-year-filter');
    const filterContainer = document.getElementById('activities-filter-container');

    try {
        const querySnapshot = await getDocs(collection(db, "activities"));
        if (querySnapshot.empty) { container.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500"><i class="fa-regular fa-folder-open text-4xl mb-3 block text-slate-300"></i>ยังไม่มีภาพกิจกรรม</div>'; return; }
        
        const actArray = []; const months = new Set(); const years = new Set();
        querySnapshot.forEach(doc => {
            const data = doc.data();
            let itemMonth = "ไม่ระบุ"; let itemYear = "ไม่ระบุ";
            
            if (data.rawDate) {
                const date = new Date(data.rawDate);
                itemMonth = date.toLocaleDateString('th-TH', { month: 'long' });
                itemYear = date.toLocaleDateString('th-TH', { year: 'numeric' });
            } else if (data.timestamp) {
                const date = new Date(data.timestamp.seconds * 1000);
                itemMonth = date.toLocaleDateString('th-TH', { month: 'long' });
                itemYear = date.toLocaleDateString('th-TH', { year: 'numeric' });
            }
            
            months.add(itemMonth); years.add(itemYear);
            actArray.push({ id: doc.id, ...data, itemMonth, itemYear });
        });
        actArray.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        
        if (monthSelect && yearSelect && filterContainer) {
            const sortedMonths = Array.from(months).sort((a, b) => thaiMonthsOrder.indexOf(a) - thaiMonthsOrder.indexOf(b));
            const sortedYears = Array.from(years).sort((a, b) => b.localeCompare(a));
            monthSelect.innerHTML = '<option value="all">ทุกเดือน</option>'; sortedMonths.forEach(m => { if(m !== 'ไม่ระบุ') monthSelect.innerHTML += `<option value="${m}">${m}</option>`; }); if(months.has('ไม่ระบุ')) monthSelect.innerHTML += `<option value="ไม่ระบุ">ไม่ระบุ</option>`;
            yearSelect.innerHTML = '<option value="all">ทุกปี</option>'; sortedYears.forEach(y => { if(y !== 'ไม่ระบุ') yearSelect.innerHTML += `<option value="${y}">${y}</option>`; }); if(years.has('ไม่ระบุ')) yearSelect.innerHTML += `<option value="ไม่ระบุ">ไม่ระบุ</option>`;
            
            if(actArray.length > 0) filterContainer.classList.remove('hidden');

            const renderFiltered = () => {
                const sMonth = monthSelect.value; const sYear = yearSelect.value;
                window.paginations.activities.data = actArray.filter(item => (sMonth === 'all' || item.itemMonth === sMonth) && (sYear === 'all' || item.itemYear === sYear));
                window.paginations.activities.page = 1;
                
                window.paginations.activities.render = () => {
                    window.renderPaginatedGrid('activities-container', 'activities', (data) => {
                        let hasManyImages = data.imageUrls && data.imageUrls.length > 1;
                        return `
                        <div onclick="showDetails('${encodeURIComponent(JSON.stringify(data))}')" class="bg-white rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition duration-300 border border-slate-100 group flex flex-col cursor-pointer h-full fade-in-content">
                            <div class="h-48 relative overflow-hidden flex items-center justify-center bg-teal-50 shrink-0">
                                ${data.imageUrl ? `<img src="${data.imageUrl}" class="w-full h-full object-cover group-hover:scale-105 transition duration-500">` : `<i class="fa-solid fa-images text-5xl text-teal-200 group-hover:scale-110 transition duration-500"></i>`}
                                <div class="absolute top-4 left-4 bg-teal-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-sm">กิจกรรม</div>
                                ${hasManyImages ? `<div class="absolute bottom-3 right-3 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-sm shadow-sm"><i class="fa-regular fa-images mr-1"></i> ${data.imageUrls.length} รูป</div>` : ''}
                            </div>
                            <div class="p-4 md:p-5 flex flex-col flex-grow bg-white">
                                <div class="flex items-center text-xs text-slate-500 mb-1.5"><i class="fa-regular fa-calendar mr-2"></i> ${data.date || 'ไม่ระบุวันที่'}</div>
                                <h3 class="text-base md:text-lg font-bold text-slate-800 mb-1.5 line-clamp-2 group-hover:text-teal-600 transition">${data.title}</h3>
                                ${data.content ? `<p class="text-slate-600 text-xs md:text-sm mb-2 line-clamp-2 flex-grow">${data.content}</p>` : ''}
                                <div class="mt-auto text-teal-600 text-xs md:text-sm font-semibold flex items-center pt-2 border-t border-slate-50 opacity-100 md:opacity-0 group-hover:opacity-100 transition">ดูรูปภาพและรายละเอียด <i class="fa-solid fa-arrow-right ml-2 text-[10px]"></i></div>
                            </div>
                        </div>`;
                    }, '<div class="col-span-full text-center py-10 text-slate-500"><i class="fa-regular fa-folder-open text-4xl mb-3 block text-slate-300"></i>ไม่มีกิจกรรมในเดือน/ปีที่เลือก</div>');
                };
                window.paginations.activities.render();
            };
            monthSelect.addEventListener('change', renderFiltered); yearSelect.addEventListener('change', renderFiltered); renderFiltered();
        }
    } catch (error) { container.innerHTML = '<div class="col-span-full text-center py-10 text-red-500">เกิดข้อผิดพลาด</div>'; }
}

// ----------------------------------------------------
// ฟังก์ชันโหลดปฏิทินกิจกรรม (Dynamic Calendar Grid)
// ----------------------------------------------------
async function loadCalendarEvents() {
    try {
        const querySnapshot = await getDocs(collection(db, "calendar_events"));
        allCalendarEvents = [];
        let lastUpdateTs = 0;
        
        querySnapshot.forEach(doc => {
            const data = doc.data();
            allCalendarEvents.push({ id: doc.id, ...data });
            if(data.timestamp && data.timestamp.seconds > lastUpdateTs) {
                lastUpdateTs = data.timestamp.seconds;
            }
        });

        if(lastUpdateTs > 0) {
            const lastDate = new Date(lastUpdateTs * 1000);
            document.getElementById('calendar-last-update').innerText = lastDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } else {
            document.getElementById('calendar-last-update').innerText = "ยังไม่มีข้อมูล";
        }

        renderCalendarGrid();
    } catch (error) {
        console.error("Error loading calendar events:", error);
        document.getElementById('calendar-grid').innerHTML = '<div class="col-span-7 bg-white py-20 text-center text-red-500">เกิดข้อผิดพลาดในการโหลดปฏิทิน</div>';
    }
}

window.changeCalendarMonth = (dir) => {
    currentCalMonth += dir;
    if (currentCalMonth < 0) { currentCalMonth = 11; currentCalYear--; } 
    else if (currentCalMonth > 11) { currentCalMonth = 0; currentCalYear++; }
    renderCalendarGrid();
};

function renderCalendarGrid() {
    const grid = document.getElementById('calendar-grid');
    const titleEl = document.getElementById('calendar-header-title');
    
    if(!grid || !titleEl) return;

    const monthNames = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    titleEl.innerText = `${monthNames[currentCalMonth]} ${currentCalYear + 543}`;

    const firstDay = new Date(currentCalYear, currentCalMonth, 1).getDay(); // 0 (Sun) - 6 (Sat)
    const daysInMonth = new Date(currentCalYear, currentCalMonth + 1, 0).getDate();
    
    const today = new Date();
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    let html = '';
    
    // วาดช่องว่างของเดือนก่อนหน้า
    for (let i = 0; i < firstDay; i++) {
        html += `<div class="bg-slate-50 min-h-[100px] md:min-h-[140px] p-1 border-r border-b border-slate-300 last:border-r-0"></div>`;
    }

    // วาดช่องวันที่
    for (let day = 1; day <= daysInMonth; day++) {
        // หาว่ามี Event ในวันนี้หรือไม่ (format YYYY-MM-DD)
        const dateStr = `${currentCalYear}-${String(currentCalMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayEvents = allCalendarEvents.filter(e => e.date === dateStr);
        
        // ตรวจสอบวันเสาร์-อาทิตย์เพื่อทำสีตัวเลข
        const currentDateObj = new Date(currentCalYear, currentCalMonth, day);
        const dayOfWeek = currentDateObj.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const dateNumClass = isWeekend ? 'text-red-500' : 'text-slate-700';
        
        const isToday = (currentCalYear === todayYear && currentCalMonth === todayMonth && day === todayDate);
        
        let dateNumHtml = `<span class="text-sm font-bold ${dateNumClass} ml-1 mt-1 block">${day}</span>`;
        
        if (isToday) {
            dateNumHtml = `<span class="text-sm font-bold bg-mmsblue-600 text-white w-7 h-7 flex items-center justify-center rounded-full ml-1 mt-1 shadow-md">${day}</span>`;
        }

        let eventsHtml = '';
        dayEvents.forEach(e => {
            if(e.colorType === 'holiday') {
                eventsHtml += `<div class="mt-1 md:mt-2 text-center text-[10px] md:text-xs text-red-600 font-bold px-1 py-1 bg-white border border-red-300 rounded leading-tight w-full break-words">หยุด<br>${window.escapeHTML(e.title)}</div>`;
            } else if (e.colorType === 'pink') {
                eventsHtml += `<div class="mt-1 text-center text-[10px] md:text-xs text-pink-800 bg-pink-100 border border-pink-300 px-1 py-1 rounded leading-tight w-full break-words"><span class="font-bold">${window.escapeHTML(e.title)}</span>${e.detail ? `<br><span class="font-normal text-[9px] md:text-[10px]">${window.escapeHTML(e.detail)}</span>` : ''}</div>`;
            } else if (e.colorType === 'yellow') {
                eventsHtml += `<div class="mt-1 text-center text-[10px] md:text-xs text-yellow-900 bg-yellow-300 border border-yellow-400 px-1 py-1 rounded leading-tight w-full break-words"><span class="font-bold">${window.escapeHTML(e.title)}</span>${e.detail ? `<br><span class="font-normal text-[9px] md:text-[10px]">${window.escapeHTML(e.detail)}</span>` : ''}</div>`;
            } else {
                // Default Blue
                eventsHtml += `<div class="mt-1 text-center text-[10px] md:text-xs text-sky-800 bg-sky-100 border border-sky-300 px-1 py-1 rounded leading-tight w-full break-words"><span class="font-bold">${window.escapeHTML(e.title)}</span>${e.detail ? `<br><span class="font-normal text-[9px] md:text-[10px]">${window.escapeHTML(e.detail)}</span>` : ''}</div>`;
            }
        });

        html += `
        <div class="bg-white min-h-[100px] md:min-h-[140px] p-1 flex flex-col border-r border-b border-slate-300 last:border-r-0 relative ${isToday ? 'bg-blue-50/30' : ''}">
            ${dateNumHtml}
            <div class="flex-grow flex flex-col items-center justify-center gap-1 w-full p-1 overflow-hidden">
                ${eventsHtml}
            </div>
        </div>`;
    }

    // เติมช่องว่างตอนท้ายให้เต็มตาราง (สัปดาห์)
    const totalCells = firstDay + daysInMonth;
    const remainingCells = (7 - (totalCells % 7)) % 7;
    for (let i = 0; i < remainingCells; i++) {
        html += `<div class="bg-slate-50 min-h-[100px] md:min-h-[140px] p-1 border-r border-b border-slate-300 last:border-r-0"></div>`;
    }

    grid.innerHTML = html;
}

// ----------------------------------------------------
// ฟังก์ชันทำเนียบ (Members) และอื่นๆ
// ----------------------------------------------------
window.groupedMembersData = {};
async function loadMembers() {
    const container = document.getElementById('members-container'), selectorContainer = document.getElementById('year-selector-container'), yearSelect = document.getElementById('year-select');
    try {
        const querySnapshot = await getDocs(collection(db, "members"));
        if (querySnapshot.empty) { container.innerHTML = '<div class="text-center py-10 text-slate-500"><i class="fa-solid fa-users-slash text-4xl mb-3 block text-slate-300"></i>ยังไม่มีรายชื่อสมาชิกสภานักเรียน</div>'; selectorContainer.classList.add('hidden'); return; }
        const memArray = []; querySnapshot.forEach(doc => memArray.push({ id: doc.id, ...doc.data() }));
        window.groupedMembersData = memArray.reduce((acc, curr) => { const year = curr.year || 'ไม่ระบุ'; if (!acc[year]) acc[year] = []; acc[year].push(curr); return acc; }, {});
        const sortedYears = Object.keys(window.groupedMembersData).sort((a, b) => { if (a === 'ไม่ระบุ') return 1; if (b === 'ไม่ระบุ') return -1; return parseInt(b) - parseInt(a); });
        yearSelect.innerHTML = ''; sortedYears.forEach(year => { const option = document.createElement('option'); option.value = year; option.textContent = `ปีการศึกษา ${year}`; yearSelect.appendChild(option); });
        selectorContainer.classList.remove('hidden');
        window.renderMembersByYear = (selectedYear) => {
            const membersInYear = window.groupedMembersData[selectedYear].sort((a, b) => (a.timestamp?.seconds || 0) - (b.timestamp?.seconds || 0));
            let membersHtml = '<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">';
            membersInYear.forEach(data => { membersHtml += `<div class="text-center bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition group"><div class="w-28 h-28 mx-auto rounded-full bg-slate-200 mb-4 overflow-hidden relative border-4 border-white shadow-md flex items-center justify-center">${data.imageUrl ? `<img src="${data.imageUrl}" class="w-full h-full object-cover">` : `<div class="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-mmsblue-100 to-mmsblue-300 group-hover:from-mmsblue-200 group-hover:to-mmsblue-400 transition"><i class="fa-solid fa-user text-4xl text-white"></i></div>`}</div><h4 class="font-bold text-slate-800 text-lg mb-1">${data.name}</h4><p class="text-sm font-medium text-mmsblue-600 bg-mmsblue-50 py-1 px-3 rounded-full inline-block">${data.role}</p></div>`; });
            membersHtml += '</div>';
            container.innerHTML = `<div class="fade-in-content mb-12"><div class="flex items-center gap-4 mb-8"><div class="h-px bg-slate-200 flex-1"></div><h3 class="text-2xl font-bold text-slate-700 bg-white px-4 border-2 border-slate-100 rounded-full py-1 shadow-sm"><i class="fa-solid fa-graduation-cap text-mmsblue-500 mr-2"></i> ทำเนียบปี ${selectedYear}</h3><div class="h-px bg-slate-200 flex-1"></div></div>${membersHtml}</div>`;
        };
        yearSelect.addEventListener('change', e => window.renderMembersByYear(e.target.value));
        if (sortedYears.length > 0) { yearSelect.value = sortedYears[0]; window.renderMembersByYear(sortedYears[0]); }
    } catch (error) { container.innerHTML = '<div class="text-center py-10 text-red-500">เกิดข้อผิดพลาดในการโหลดข้อมูล</div>'; }
}

async function loadContact() {
    try {
        const querySnapshot = await getDocs(collection(db, "contact"));
        if (!querySnapshot.empty) {
            const data = querySnapshot.docs[0].data();
            if(data.address) document.getElementById('contact-address-text').innerHTML = data.address.replace(/\n/g, '<br>');
            if(data.phone) { document.getElementById('contact-phone-text').innerText = data.phone; document.getElementById('footer-phone-text').innerText = data.phone; }
            if(data.email) { document.getElementById('contact-email-text').innerText = data.email; document.getElementById('footer-email-text').innerText = data.email; }
            ['fb', 'ig', 'tiktok', 'yt', 'line'].forEach(key => {
                if(data[key]) {
                    document.getElementById(`contact-${key}-link`).href = data[key];
                    document.getElementById(`footer-${key}-link`).href = data[key];
                }
            });
        }
    } catch (error) {}
}

// Contact Form Handle
document.getElementById('contact-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const topicSelect = document.getElementById('cf-topic');
    let typeClass = 'bg-slate-100 text-slate-600';
    if(topicSelect.value === '1') typeClass = 'bg-teal-100 text-teal-600';
    if(topicSelect.value === '2') typeClass = 'bg-red-100 text-red-600';
    if(topicSelect.value === '3') typeClass = 'bg-blue-100 text-blue-600';

    try {
        Swal.fire({ title: 'กำลังส่งข้อความ...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });
        
        const today = new Date();
        const thDate = today.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });

        await addDoc(collection(db, "messages"), {
            name: document.getElementById('cf-name').value || 'ไม่ระบุชื่อ',
            type: topicSelect.options[topicSelect.selectedIndex].text,
            typeClass: typeClass,
            content: document.getElementById('cf-content').value,
            date: thDate, 
            timestamp: today
        });
        
        Swal.fire({ icon: 'success', title: 'ส่งข้อความสำเร็จ!', text: 'สภานักเรียนได้รับข้อความของคุณเรียบร้อยแล้ว', confirmButtonColor: '#2563eb' });
        e.target.reset();
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'เกิดข้อผิดพลาด', text: 'ไม่สามารถส่งข้อความได้ในขณะนี้', confirmButtonColor: '#2563eb' });
    }
});
