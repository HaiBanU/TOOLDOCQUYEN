/* --- START OF FILE public/js/analysis-fish.js --- */

window.onload = () => {
    // === 1. LẤY CÁC PHẦN TỬ DOM ===
    const coinDisplay = document.getElementById('coin-display');
    const panelGameImage = document.getElementById('panel-game-image');
    const progressValue = document.getElementById('progress-value');
    
    const analyzeButton = document.getElementById('analyze-button');
    const endButton = document.getElementById('end-button');
    const confirmModal = document.getElementById('custom-confirm-modal');
    const confirmYesBtn = document.getElementById('confirm-yes');
    const confirmNoBtn = document.getElementById('confirm-no');
    
    const gameNameBottom = document.getElementById('game-name-display-bottom');
    const moduleGameName = document.getElementById('module-game-name');
    const analysisProgressContainer = document.getElementById('analysis-progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressBarText = document.getElementById('progress-bar-text');
    const progressStatusText = document.querySelector('.progress-status-text');
    
    const infoBox1 = document.getElementById('info-box-1');
    const infoBox2 = document.getElementById('info-box-2');
    const infoBox3 = document.getElementById('info-box-3');

    const params = new URLSearchParams(window.location.search);
    const gameName = params.get('gameName');
    const imageUrl = params.get('imageUrl');
    const initialWinRate = params.get('winRate');
    const lobbyName = decodeURIComponent(params.get('lobbyName'));
    const username = localStorage.getItem('username');
    const selectedBrand = sessionStorage.getItem('selectedBrand');

    if (!username || !gameName || !imageUrl || !lobbyName || !selectedBrand) {
        alert("Lỗi: Thiếu thông tin game.");
        window.location.href = '/dashboard-fish.html';
        return;
    }

    let isAnalyzing = false;
    let analysisTimerId = null;
    let countdownIntervalId = null;
    let progressAnimationId = null; 
    const ACTIVE_ANALYSIS_KEY = 'wukongActiveFishAnalysis';

    // === UTILS ===
    const createParticleBurstEffect = () => { const container = document.querySelector('.particle-burst'); if (!container) return; container.innerHTML = ''; const particleCount = 40; const radius = 200; for (let i = 0; i < particleCount; i++) { const particle = document.createElement('div'); particle.className = 'particle'; const angle = Math.random() * 360; const duration = Math.random() * 1.5 + 1; const delay = Math.random() * 2.5; particle.style.setProperty('--angle', `${angle}deg`); particle.style.setProperty('--duration', `${duration}s`); particle.style.setProperty('--delay', `${delay}s`); particle.style.setProperty('--radius', `${radius}px`); container.appendChild(particle); } };
    const createScrollingText = (element, text) => { if (!element) return; element.innerHTML = `<span class="scrolling-text">${text}</span>`; };
    const createEnergyRain = (container) => { if (!container) return; container.innerHTML = ''; const count = 40; const colors = ['#ffd700', '#00ffff']; for (let i = 0; i < count; i++) { const p = document.createElement('div'); p.className = 'particle'; p.style.cssText = `height:${Math.random()*30+15}px;left:${Math.random()*100}%;animation-duration:${Math.random()*1.5+1}s;animation-delay:${Math.random()*3}s;color:${colors[Math.floor(Math.random()*colors.length)]};`; container.appendChild(p); } };
    const fetchUserInfoFromServer = async () => { try { const res = await fetch(`/api/user-info?username=${username}`); const data = await res.json(); if (data.success) { const coinsByBrand = data.userInfo.coins_by_brand || {}; const currentCoins = coinsByBrand[selectedBrand] || 0; coinDisplay.textContent = currentCoins; } } catch (e) { console.error("Lỗi fetch user info", e); } };
    const cleanupSession = () => { sessionStorage.removeItem(ACTIVE_ANALYSIS_KEY); };
    const handleInsufficientTokens = (message) => { stopAllTimers(); cleanupSession(); alert(message); window.location.href = '/dashboard-fish.html'; };
    const stopAllTimers = () => { 
        if (analysisTimerId) clearInterval(analysisTimerId); 
        if (countdownIntervalId) clearInterval(countdownIntervalId); 
        if (progressAnimationId) cancelAnimationFrame(progressAnimationId); 
        analysisTimerId = null; 
        countdownIntervalId = null; 
        progressAnimationId = null;
    };
    const handleRecurringDeduction = async () => { try { const response = await fetch('/api/deduct-recurring-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, brandName: selectedBrand }) }); const result = await response.json(); if (result.success) { coinDisplay.textContent = result.newCoinBalance; progressStatusText.textContent = `Đã trừ 10 Token để duy trì hack...`; } else if (result.outOfTokens) { handleInsufficientTokens(result.message); } } catch (error) { console.error("Lỗi trừ tiền định kỳ", error); } };
    
    // === KHỞI TẠO GIAO DIỆN ===
    function initializeUI() {
        if (moduleGameName) moduleGameName.textContent = gameName;
        createScrollingText(gameNameBottom, gameName);
        panelGameImage.src = imageUrl;
        const glitchLayers = document.querySelectorAll('.glitch-layer');
        glitchLayers.forEach(layer => { layer.style.backgroundImage = `url(${imageUrl})`; });
        createEnergyRain(document.getElementById('particle-field'));
        createParticleBurstEffect();
        
        // Hiển thị % ban đầu
        const startPercent = (initialWinRate && initialWinRate !== 'null') ? initialWinRate : 0;
        progressValue.textContent = `${startPercent}%`;
        
        // Xóa class success để về màu đỏ mặc định
        progressValue.classList.remove('success');
        // Xóa inline style cũ để CSS class hoạt động
        progressValue.style.color = ''; 
        progressValue.style.textShadow = '';
        
        [infoBox1, infoBox2, infoBox3].forEach(box => { box.classList.remove('result-reveal', 'result-highlight'); const smallElement = box.querySelector('small'); if (smallElement) smallElement.textContent = 'Chưa có dữ liệu'; });
        analyzeButton.style.display = 'block';
        analyzeButton.disabled = false;
        analyzeButton.textContent = "HACK (10 TOKEN)";
        endButton.style.display = 'none';
        confirmModal.style.display = 'none';
        analysisProgressContainer.style.display = 'none';
        progressStatusText.textContent = "";
        isAnalyzing = false;
    }

    // === HÀM HIỂN THỊ KẾT QUẢ ===
    function displayResults(results, isResuming = false) {
        const targetVal = results.finalRate;

        infoBox1.innerHTML = `<span>BẮN MỒI CÁ NHỎ</span><small>${results.banMoi} lượt bắn</small>`;
        infoBox2.innerHTML = `<span>BẮN AUTO CÁ LỚN</span><small>${results.banAuto} lượt bắn</small>`;
        infoBox3.innerHTML = `<span>BẮN BOSS ĐẠN LỚN</span><small>${results.banBoss} lượt bắn</small>`;
        
        [infoBox1, infoBox2, infoBox3].forEach((box, index) => { 
            if (isResuming) box.style.animationDelay = '0s'; 
            else box.style.animationDelay = `${index * 0.15}s`;
            box.classList.add('result-reveal', 'result-highlight'); 
        });

        analysisProgressContainer.style.display = 'none';
        analyzeButton.style.display = 'block';

        if (isResuming) {
            progressValue.textContent = `${targetVal}%`;
            // Thêm class success để chữ chuyển màu xanh và đập nhanh
            progressValue.classList.add('success');
            return;
        }

        const startVal = parseInt(initialWinRate) || 0;
        const finalDisplayVal = targetVal < startVal ? startVal + 3 : targetVal;
        const duration = 2500;
        let startTime = null;

        function animationStep(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const currentValue = Math.floor(startVal + (progress * (finalDisplayVal - startVal)));
            
            progressValue.textContent = `${currentValue}%`;
            
            // Khi chạy gần xong, thêm class success
            if (progress >= 0.8) {
                progressValue.classList.add('success');
            }

            if (progress < 1) {
                progressAnimationId = requestAnimationFrame(animationStep);
            } else {
                 progressValue.textContent = `${finalDisplayVal}%`;
            }
        }
        progressAnimationId = requestAnimationFrame(animationStep);
    }

    function startResultCountdown(durationInSeconds) {
        stopAllTimers();
        let timeLeft = durationInSeconds;
        endButton.style.display = 'flex'; 
        const updateTimer = () => { const minutes = Math.floor(timeLeft / 60); const seconds = timeLeft % 60; analyzeButton.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; };
        analyzeButton.disabled = true;
        updateTimer();
        countdownIntervalId = setInterval(() => { timeLeft--; updateTimer(); if (timeLeft <= 0) { resetToInitialState(); } }, 1000);
        analysisTimerId = setInterval(handleRecurringDeduction, 60000);
    }

    function resetToInitialState() { stopAllTimers(); cleanupSession(); initializeUI(); }

    const resumeAnalysis = (savedState) => {
        const remainingTime = Math.floor((savedState.expiresAt - Date.now()) / 1000);
        if (remainingTime > 0) { 
            displayResults(savedState.results, true);
            startResultCountdown(remainingTime); 
            progressStatusText.textContent = `Đã khôi phục phiên. Đang duy trì...`; 
        } 
        else { cleanupSession(); initializeUI(); }
    };

    analyzeButton.addEventListener('click', async () => {
        if (isAnalyzing) return;
        isAnalyzing = true;
        stopAllTimers();
        cleanupSession();
        document.body.classList.remove('analyzing');
        
        analyzeButton.style.display = 'none';
        endButton.style.display = 'none'; 
        analysisProgressContainer.style.display = 'block';
        progressStatusText.textContent = `Đang phân tích mục tiêu Sảnh Bắn Cá...`;

        let progress = 0;
        const progressInterval = setInterval(() => { progress += 2; progressBarFill.style.width = `${progress}%`; progressBarText.textContent = `${Math.floor(progress)}%`; if (progress >= 100) clearInterval(progressInterval); }, 100);
        setTimeout(async () => {
            clearInterval(progressInterval);
            try {
                const response = await fetch('/api/analyze-game', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, winRate: initialWinRate, brandName: selectedBrand }) });
                const result = await response.json();
                if (result.success) {
                    coinDisplay.textContent = result.newCoinBalance;
                    const analysisResults = { finalRate: result.analysisResult, banMoi: Math.floor(Math.random() * (200 - 30 + 1)) + 30, banAuto: Math.floor(Math.random() * (200 - 30 + 1)) + 30, banBoss: Math.floor(Math.random() * (30 - 10 + 1)) + 10 };
                    const expiresAt = Date.now() + 10 * 60 * 1000;
                    const stateToSave = { gameName, expiresAt, results: analysisResults, initialWinRate: initialWinRate };
                    sessionStorage.setItem(ACTIVE_ANALYSIS_KEY, JSON.stringify(stateToSave));
                    
                    displayResults(analysisResults, false);
                    startResultCountdown(600);
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

    endButton.addEventListener('click', () => { confirmModal.style.display = 'flex'; });
    confirmNoBtn.addEventListener('click', () => { confirmModal.style.display = 'none'; });
    confirmYesBtn.addEventListener('click', () => { confirmModal.style.display = 'none'; resetToInitialState(); });
    window.addEventListener('click', (e) => { if (e.target == confirmModal) { confirmModal.style.display = 'none'; } });

    (async () => {
        await fetchUserInfoFromServer();
        const savedAnalysisJSON = sessionStorage.getItem(ACTIVE_ANALYSIS_KEY);
        if (savedAnalysisJSON) {
            const savedAnalysis = JSON.parse(savedAnalysisJSON);
            if (savedAnalysis.gameName === gameName) { resumeAnalysis(savedAnalysis); } 
            else { initializeUI(); }
        } else { initializeUI(); }
    })();
    
    window.addEventListener('pageshow', function(event) { if (event.persisted) fetchUserInfoFromServer(); });
};