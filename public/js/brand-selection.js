/* --- START OF FILE public/js/brand-selection.js --- */

// 1. Kiểm tra đăng nhập
if (!localStorage.getItem('username')) {
    window.location.href = '/';
}

// 2. Xử lý Đăng xuất
document.querySelector('.logout-button').addEventListener('click', () => { 
    localStorage.clear(); 
    sessionStorage.clear();
    window.location.href = '/'; 
});

// 3. Đồng hồ
function updateClock() { 
    const clockContainer = document.getElementById('live-clock-container'); 
    if (!clockContainer) return; 
    const now = new Date(); 
    const timeString = now.toLocaleTimeString('vi-VN'); 
    const dateString = now.toLocaleDateString('vi-VN'); 
    clockContainer.innerHTML = `<span class="clock-time">${timeString}</span><span class="clock-date">${dateString}</span>`; 
}

// 4. Modal Thông Báo
const alertModal = document.getElementById('alertModal');
const alertModalMessage = document.getElementById('alertModalMessage');
const closeAlertModalBtn = document.getElementById('closeAlertModal');
const confirmAlertModalBtn = document.getElementById('confirmAlertModal');

function showAlertModal(message) { 
    alertModalMessage.textContent = message; 
    alertModal.style.display = 'flex'; 
}
function hideAlertModal() { 
    alertModal.style.display = 'none'; 
}
closeAlertModalBtn.onclick = hideAlertModal;
confirmAlertModalBtn.onclick = hideAlertModal;

// 5. Terminal Bot Logic
const terminalMessages = [ 
    "Khởi tạo Giao thức Wukong... Hoàn tất.", 
    "Xác thực danh tính Chỉ Huy... Thành công.", 
    "Đang tải danh sách các SẢNH GAME đối tác...", 
    "Tất cả module phân tích đã được nạp.", 
    "Kết nối an toàn tới máy chủ trung tâm đã được thiết lập.", 
    "Hiệu suất hệ thống: 100%. Sẵn sàng nhận lệnh.", 
    "Vui lòng chọn một mục tiêu để bắt đầu đồng bộ hóa dữ liệu.", 
    "Dữ liệu là chìa khóa. Hãy chọn đúng cánh cửa." 
];
let lastMessageIndex = -1; 
let typingInterval;

function typeMessage(element, message) { 
    if (typingInterval) clearInterval(typingInterval); 
    let i = 0; 
    element.innerHTML = ''; 
    typingInterval = setInterval(() => { 
        if (i < message.length) { 
            element.textContent += message.charAt(i); 
            i++; 
        } else { 
            clearInterval(typingInterval); 
        } 
    }, 50); 
}

function showNextTerminalMessage() { 
    const messageEl = document.getElementById('terminal-message'); 
    if (!messageEl) return; 
    let randomIndex; 
    do { 
        randomIndex = Math.floor(Math.random() * terminalMessages.length); 
    } while (randomIndex === lastMessageIndex && terminalMessages.length > 1); 
    lastMessageIndex = randomIndex; 
    const messageToShow = terminalMessages[randomIndex]; 
    typeMessage(messageEl, messageToShow); 
}

// 6. MAIN LOGIC (On Load)
window.onload = async () => {
    updateClock();
    setInterval(updateClock, 1000);
    
    showNextTerminalMessage();
    setInterval(showNextTerminalMessage, 8000);

    const username = localStorage.getItem('username');
    if (!username) { window.location.href = '/'; return; }

    try {
        const [userRes, brandsRes] = await Promise.all([
            fetch(`/api/user-info?username=${username}`),
            fetch(`/api/brands-with-rates?username=${username}`)
        ]);

        const userData = await userRes.json();
        const brandsData = await brandsRes.json();
        
        if (userData.success) {
            document.getElementById('welcome-message').textContent = `Chào, ${userData.userInfo.username}`;
        }
        
        if (!brandsData.success) { throw new Error(brandsData.message); }
        
        const sortedGameBrands = brandsData.brands;
        const priorityBrand = brandsData.priorityBrand;
        const slider = document.getElementById('brand-slider');
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        
        // Render thẻ bài
        slider.innerHTML = sortedGameBrands.map(brand => {
            const percentageClass = brand.percentage < 70 ? 'low' : '';
            return `
            <div class="brand-card" data-brand-name="${brand.name}">
                <div class="brand-card-inner">
                     <div class="logo-background">
                        <img class="brand-logo" src="/assets/logos/${brand.logo}" alt="${brand.name}">
                    </div>
                    <div class="brand-name">${brand.name}</div>
                    <div class="brand-percentage ${percentageClass}">${brand.percentage}%</div>
                </div>
            </div>`;
        }).join('');

        const cards = document.querySelectorAll('.brand-card');
        let activeIndex = 0;

        // Logic Carousel
        function updateCarousel() {
            cards.forEach((card, i) => {
                card.classList.remove('active', 'prev', 'next', 'prev2', 'next2');
                const prev2Index = (activeIndex - 2 + cards.length) % cards.length;
                const prevIndex = (activeIndex - 1 + cards.length) % cards.length;
                const nextIndex = (activeIndex + 1) % cards.length;
                const next2Index = (activeIndex + 2) % cards.length;
                
                if (i === activeIndex) card.classList.add('active');
                else if (i === prevIndex) card.classList.add('prev');
                else if (i === nextIndex) card.classList.add('next');
                else if (i === prev2Index) card.classList.add('prev2');
                else if (i === next2Index) card.classList.add('next2');
            });
        }

        nextBtn.addEventListener('click', () => { activeIndex = (activeIndex + 1) % cards.length; updateCarousel(); });
        prevBtn.addEventListener('click', () => { activeIndex = (activeIndex - 1 + cards.length) % cards.length; updateCarousel(); });
        
        // Xử lý Click vào Sảnh
        slider.addEventListener('click', (e) => {
            const clickedCard = e.target.closest('.brand-card');
            if (!clickedCard) return;

            // Nếu click thẻ bên cạnh -> Xoay
            if (!clickedCard.classList.contains('active')) {
                if (clickedCard.classList.contains('next') || clickedCard.classList.contains('next2')) { 
                    activeIndex = (activeIndex + 1) % cards.length; 
                } else if (clickedCard.classList.contains('prev') || clickedCard.classList.contains('prev2')) { 
                    activeIndex = (activeIndex - 1 + cards.length) % cards.length; 
                }
                updateCarousel(); 
                return;
            }
            
            const brandName = clickedCard.dataset.brandName;
            
            // --- LOGIC KIỂM TRA QUYỀN (ĐÃ FIX) ---
            if (priorityBrand && brandName !== priorityBrand) {
                showAlertModal(`Sảnh ${brandName} có tỷ lệ khá thấp. Vui lòng chọn sảnh ${priorityBrand} để có trải nghiệm tốt nhất!`);
                return;
            }

            // Nếu đúng sảnh -> Hiện Modal chọn loại game
            const categoryModal = document.getElementById('categoryChoiceModal');
            const selectNohuBtn = document.getElementById('select-nohu-btn');
            const selectBancaBtn = document.getElementById('select-banca-btn');
            
            categoryModal.style.display = 'flex';

            selectNohuBtn.onclick = () => {
                sessionStorage.setItem('selectedBrand', brandName);
                window.location.href = '/dashboard.html';
            };
            selectBancaBtn.onclick = () => {
                sessionStorage.setItem('selectedBrand', brandName);
                window.location.href = '/dashboard-fish.html';
            };
        });
        
        updateCarousel();

        const categoryModal = document.getElementById('categoryChoiceModal');
        window.onclick = (event) => { 
            if (event.target == alertModal) { hideAlertModal(); }
            if (event.target == categoryModal) { categoryModal.style.display = 'none'; }
        }

    } catch (e) { 
        console.error("Lỗi khi tải dữ liệu trang chọn sảnh:", e);
    }
};

// 7. Mouse Overlay
const overlay = document.querySelector('.video-overlay');
if (overlay) {
    window.addEventListener('mousemove', (e) => {
        const { clientX, clientY } = e;
        overlay.style.setProperty('--mouse-x', `${clientX}px`);
        overlay.style.setProperty('--mouse-y', `${clientY}px`);
    });
}