// public/js/analysis-fish.js - PHIÊN BẢN HOÀN CHỈNH (CUSTOM MODAL)

window.onload = () => {
    // === 1. LẤY CÁC PHẦN TỬ DOM ===
    const coinDisplay = document.getElementById('coin-display');
    const panelGameImage = document.getElementById('panel-game-image');
    const progressTag = document.getElementById('progress-tag');
    const progressText = document.getElementById('progress-text');
    
    // Các nút điều khiển
    const analyzeButton = document.getElementById('analyze-button');
    const endButton = document.getElementById('end-button');
    
    // Các phần tử của Popup xác nhận (Custom Modal)
    const confirmModal = document.getElementById('custom-confirm-modal');
    const confirmYesBtn = document.getElementById('confirm-yes');
    const confirmNoBtn = document.getElementById('confirm-no');
    
    // Các phần tử hiển thị thông tin
    const gameNameBottom = document.getElementById('game-name-display-bottom');
    const moduleGameName = document.getElementById('module-game-name');
    const analysisProgressContainer = document.getElementById('analysis-progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressBarText = document.getElementById('progress-bar-text');
    const progressStatusText = document.querySelector('.progress-status-text');
    
    // 3 Ô kết quả
    const infoBox1 = document.getElementById('info-box-1');
    const infoBox2 = document.getElementById('info-box-2');
    const infoBox3 = document.getElementById('info-box-3');

    // === 2. LẤY DỮ LIỆU TỪ URL VÀ STORAGE ===
    const params = new URLSearchParams(window.location.search);
    const gameName = params.get('gameName');
    const imageUrl = params.get('imageUrl');
    const initialWinRate = params.get('winRate');
    const lobbyName = decodeURIComponent(params.get('lobbyName'));
    const username = localStorage.getItem('username');
    const selectedBrand = sessionStorage.getItem('selectedBrand');

    // Kiểm tra dữ liệu đầu vào
    if (!username || !gameName || !imageUrl || !lobbyName || !selectedBrand) {
        alert("Lỗi: Thiếu thông tin game.");
        window.location.href = '/dashboard-fish.html';
        return;
    }

    // === 3. BIẾN QUẢN LÝ TRẠNG THÁI ===
    let isAnalyzing = false;
    let analysisTimerId = null;
    let countdownIntervalId = null;
    const ACTIVE_ANALYSIS_KEY = 'wukongActiveFishAnalysis';

    // === 4. CÁC HÀM TIỆN ÍCH (Hiệu ứng & API) ===
    
    // Hiệu ứng nổ hạt
    const createParticleBurstEffect = () => { 
        const container = document.querySelector('.particle-burst'); 
        if (!container) return; 
        container.innerHTML = ''; 
        const particleCount = 40; 
        const radius = 200; 
        for (let i = 0; i < particleCount; i++) { 
            const particle = document.createElement('div'); 
            particle.className = 'particle'; 
            const angle = Math.random() * 360; 
            const duration = Math.random() * 1.5 + 1; 
            const delay = Math.random() * 2.5; 
            particle.style.setProperty('--angle', `${angle}deg`); 
            particle.style.setProperty('--duration', `${duration}s`); 
            particle.style.setProperty('--delay', `${delay}s`); 
            particle.style.setProperty('--radius', `${radius}px`); 
            container.appendChild(particle); 
        } 
    };

    // Hiệu ứng chữ chạy
    const createScrollingText = (element, text) => { 
        if (!element) return; 
        element.innerHTML = `<span class="scrolling-text">${text}</span>`; 
    };

    // Hiệu ứng mưa năng lượng
    const createEnergyRain = (container) => { 
        if (!container) return; 
        container.innerHTML = ''; 
        const count = 40; 
        const colors = ['#ffd700', '#00ffff']; 
        for (let i = 0; i < count; i++) { 
            const p = document.createElement('div'); 
            p.className = 'particle'; 
            p.style.cssText = `height:${Math.random()*30+15}px;left:${Math.random()*100}%;animation-duration:${Math.random()*1.5+1}s;animation-delay:${Math.random()*3}s;color:${colors[Math.floor(Math.random()*colors.length)]};`; 
            container.appendChild(p); 
        } 
    };

    // Lấy thông tin Token từ Server
    const fetchUserInfoFromServer = async () => {
        try {
            const res = await fetch(`/api/user-info?username=${username}`);
            const data = await res.json();
            if (data.success) {
                const coinsByBrand = data.userInfo.coins_by_brand || {};
                const currentCoins = coinsByBrand[selectedBrand] || 0;
                coinDisplay.textContent = currentCoins;
            }
        } catch (e) { console.error("Lỗi fetch user info", e); }
    };

    // Xóa session
    const cleanupSession = () => { sessionStorage.removeItem(ACTIVE_ANALYSIS_KEY); };

    // Xử lý khi hết token
    const handleInsufficientTokens = (message) => {
        stopAllTimers();
        cleanupSession();
        alert(message);
        window.location.href = '/dashboard-fish.html';
    };

    // Dừng toàn bộ bộ đếm
    const stopAllTimers = () => {
        if (analysisTimerId) clearInterval(analysisTimerId);
        if (countdownIntervalId) clearInterval(countdownIntervalId);
        analysisTimerId = null;
        countdownIntervalId = null;
    };

    // Trừ token định kỳ mỗi phút
    const handleRecurringDeduction = async () => {
         try {
            const response = await fetch('/api/deduct-recurring-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, brandName: selectedBrand })
            });
            const result = await response.json();
            if (result.success) {
                coinDisplay.textContent = result.newCoinBalance;
                progressStatusText.textContent = `Đã trừ 10 Token để duy trì hack...`;
            } else if (result.outOfTokens) {
                handleInsufficientTokens(result.message);
            }
        } catch (error) {
            console.error("Lỗi trừ tiền định kỳ", error);
        }
    };

    // === 5. HÀM KHỞI TẠO GIAO DIỆN (RESET VỀ TRẠNG THÁI ĐẦU) ===
    function initializeUI() {
        // Cập nhật ảnh và tên game
        if (moduleGameName) moduleGameName.textContent = gameName;
        createScrollingText(gameNameBottom, gameName);
        panelGameImage.src = imageUrl;
        const glitchLayers = document.querySelectorAll('.glitch-layer');
        glitchLayers.forEach(layer => { layer.style.backgroundImage = `url(${imageUrl})`; });
        
        // Khởi tạo hiệu ứng nền
        createEnergyRain(document.getElementById('particle-field'));
        createParticleBurstEffect();
        
        // Reset các chỉ số
        progressText.textContent = initialWinRate ? `${initialWinRate}%` : '0%';
        progressTag.classList.remove('result-state');
        
        // Reset các ô thông tin về "Chưa có dữ liệu"
        [infoBox1, infoBox2, infoBox3].forEach(box => {
            box.classList.remove('result-reveal', 'result-highlight');
            const smallElement = box.querySelector('small');
            if (smallElement) smallElement.textContent = 'Chưa có dữ liệu';
        });

        // Cấu hình hiển thị nút bấm
        analyzeButton.style.display = 'block';
        analyzeButton.disabled = false;
        analyzeButton.textContent = "HACK (10 TOKEN)";
        
        // Ẩn nút Kết thúc và Popup
        endButton.style.display = 'none';
        confirmModal.style.display = 'none';
        
        analysisProgressContainer.style.display = 'none';
        progressStatusText.textContent = "";
        
        isAnalyzing = false;
    }

    // === 6. HÀM HIỂN THỊ KẾT QUẢ ===
    function displayResults(results) {
        progressText.textContent = `${results.finalRate}%`;
        progressTag.classList.add('result-state');
        
        // Hiển thị dữ liệu Bắn Cá
        infoBox1.innerHTML = `<span>BẮN MỒI CÁ NHỎ</span><small>${results.banMoi} lượt bắn</small>`;
        infoBox2.innerHTML = `<span>BẮN AUTO CÁ LỚN</span><small>${results.banAuto} lượt bắn</small>`;
        infoBox3.innerHTML = `<span>BẮN BOSS ĐẠN LỚN</span><small>${results.banBoss} lượt bắn</small>`;
        
        // Hiệu ứng hiện dần các ô
        [infoBox1, infoBox2, infoBox3].forEach((box, index) => {
            box.style.animationDelay = `${index * 0.15}s`;
            box.classList.add('result-reveal', 'result-highlight');
        });
        
        analysisProgressContainer.style.display = 'none';
        analyzeButton.style.display = 'block';
    }

    // === 7. HÀM ĐẾM NGƯỢC (SAU KHI HACK XONG) ===
    function startResultCountdown(durationInSeconds) {
        stopAllTimers();
        let timeLeft = durationInSeconds;
        
        // HIỂN THỊ NÚT KẾT THÚC (dùng flex để icon cân đối)
        endButton.style.display = 'flex'; 

        const updateTimer = () => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            // Nút hack biến thành đồng hồ đếm ngược
            analyzeButton.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        };
        
        analyzeButton.disabled = true; // Không cho bấm nút Hack khi đang đếm ngược
        updateTimer();
        
        // Bộ đếm giây
        countdownIntervalId = setInterval(() => {
            timeLeft--;
            updateTimer();
            if (timeLeft <= 0) {
                resetToInitialState(); // Hết giờ tự động reset
            }
        }, 1000);
        
        // Bộ đếm trừ tiền (mỗi 60s)
        analysisTimerId = setInterval(handleRecurringDeduction, 60000);
    }

    // === 8. HÀM RESET TOÀN BỘ (DỪNG HACK) ===
    function resetToInitialState() {
        stopAllTimers();
        cleanupSession();
        initializeUI();
    }

    // Hàm khôi phục phiên làm việc nếu lỡ F5
    const resumeAnalysis = (savedState) => {
        const remainingTime = Math.floor((savedState.expiresAt - Date.now()) / 1000);
        if (remainingTime > 0) {
            displayResults(savedState.results);
            startResultCountdown(remainingTime);
            progressStatusText.textContent = `Đã khôi phục phiên. Đang duy trì...`;
        } else {
            cleanupSession();
            initializeUI();
        }
    };

    // === 9. SỰ KIỆN CLICK NÚT HACK (BẮT ĐẦU) ===
    analyzeButton.addEventListener('click', async () => {
        if (isAnalyzing) return;
        isAnalyzing = true;
        stopAllTimers();
        cleanupSession();
        document.body.classList.remove('analyzing');
        
        // Reset UI trước khi chạy
        initializeUI(); 
        
        // Ẩn nút, hiện loading
        analyzeButton.style.display = 'none';
        endButton.style.display = 'none'; 
        analysisProgressContainer.style.display = 'block';
        progressStatusText.textContent = `Đang phân tích mục tiêu Sảnh Bắn Cá...`;
        
        // Chạy thanh loading giả (Visual)
        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 2;
            progressBarFill.style.width = `${progress}%`;
            progressBarText.textContent = `${Math.floor(progress)}%`;
            if (progress >= 100) clearInterval(progressInterval);
        }, 100);

        // Sau 5 giây (giả lập thời gian hack) thì gọi API thật
        setTimeout(async () => {
            clearInterval(progressInterval);
            try {
                const response = await fetch('/api/analyze-game', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, winRate: initialWinRate, brandName: selectedBrand })
                });
                const result = await response.json();

                if (result.success) {
                    // Cập nhật tiền mới
                    coinDisplay.textContent = result.newCoinBalance;
                    
                    // Tạo kết quả ngẫu nhiên cho Bắn Cá
                    const analysisResults = {
                        finalRate: result.analysisResult,
                        banMoi: Math.floor(Math.random() * (200 - 30 + 1)) + 30, // 30-200
                        banAuto: Math.floor(Math.random() * (200 - 30 + 1)) + 30, // 30-200
                        banBoss: Math.floor(Math.random() * (30 - 10 + 1)) + 10   // 10-30
                    };

                    // Lưu session để F5 không mất
                    const expiresAt = Date.now() + 10 * 60 * 1000;
                    const stateToSave = { gameName, expiresAt, results: analysisResults };
                    sessionStorage.setItem(ACTIVE_ANALYSIS_KEY, JSON.stringify(stateToSave));
                    
                    // Hiển thị kết quả và đếm ngược
                    displayResults(analysisResults);
                    startResultCountdown(600); // 10 phút
                } else if (result.outOfTokens) {
                    handleInsufficientTokens(result.message);
                } else {
                    progressStatusText.textContent = result.message;
                    setTimeout(() => { initializeUI(); }, 2000);
                }
            } catch (error) {
                console.error(error);
                progressStatusText.textContent = 'Lỗi kết nối máy chủ.';
                setTimeout(() => { initializeUI(); }, 2000);
            }
        }, 5000);
    });

    // === 10. SỰ KIỆN CLICK NÚT KẾT THÚC (DÙNG POPUP MỚI) ===
    
    // Khi bấm nút "Dừng Hack Ngay" -> Hiện Popup
    endButton.addEventListener('click', () => {
        confirmModal.style.display = 'flex';
    });

    // Khi bấm "Hủy bỏ" -> Ẩn Popup
    confirmNoBtn.addEventListener('click', () => {
        confirmModal.style.display = 'none';
    });

    // Khi bấm "Đồng ý" -> Thực hiện Reset và Ẩn Popup
    confirmYesBtn.addEventListener('click', () => {
        confirmModal.style.display = 'none';
        resetToInitialState(); // Gọi hàm reset để dừng hack
    });

    // (Tùy chọn) Bấm ra ngoài vùng popup để đóng
    window.addEventListener('click', (e) => {
        if (e.target == confirmModal) {
            confirmModal.style.display = 'none';
        }
    });

    // === 11. CHẠY KHI TRANG VỪA LOAD ===
    (async () => {
        await fetchUserInfoFromServer();
        // Kiểm tra xem có phiên cũ đang chạy không
        const savedAnalysisJSON = sessionStorage.getItem(ACTIVE_ANALYSIS_KEY);
        if (savedAnalysisJSON) {
            const savedAnalysis = JSON.parse(savedAnalysisJSON);
            // Nếu đúng game này thì khôi phục, không thì reset
            if (savedAnalysis.gameName === gameName) {
                resumeAnalysis(savedAnalysis);
            } else { 
                initializeUI(); 
            }
        } else { 
            initializeUI(); 
        }
    })();
    
    // Cập nhật lại tiền khi quay lại tab này
    window.addEventListener('pageshow', function(event) {
        if (event.persisted) fetchUserInfoFromServer();
    });
};