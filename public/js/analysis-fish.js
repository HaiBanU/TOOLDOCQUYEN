/* --- START OF FILE public/js/analysis-fish.js --- */

function injectMoneyModal() {
    if (document.getElementById('moneyInputModal')) return;
    const style = document.createElement('style');
    style.innerHTML = `
        .money-input-modal { display: none; position: fixed; z-index: 10001; left: 0; top: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.9); backdrop-filter: blur(8px); justify-content: center; align-items: center; animation: fadeIn 0.3s ease-out; }
        .money-modal-content { background: linear-gradient(145deg, #1a0000, #000); border: 2px solid #d90429; box-shadow: 0 0 30px rgba(217, 4, 41, 0.4); padding: 30px 20px; border-radius: 16px; width: 90%; max-width: 380px; text-align: center; display: flex; flex-direction: column; align-items: center; }
        .money-modal-title { color: #ffd700; font-family: 'Poppins', sans-serif; font-size: 1.3em; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700;}
        .money-input-group { position: relative; margin-bottom: 25px; width: 100%; display: flex; justify-content: center; align-items: center; }
        .money-input-field { width: 100%; padding: 12px 50px 12px 20px; font-size: 1.6em; text-align: center; background: #050505; border: 1px solid #d90429; color: #00ff8c; border-radius: 8px; font-weight: bold; outline: none; box-shadow: inset 0 0 10px rgba(0,0,0,0.5); }
        .money-input-field:focus { border-color: #00ff8c; box-shadow: 0 0 15px rgba(0, 255, 140, 0.2); }
        .money-currency { position: absolute; right: 15px; top: 50%; transform: translateY(-50%); color: #666; font-weight: bold; font-size: 1em; pointer-events: none; }
        .money-btn-confirm { background: linear-gradient(90deg, #d90429, #ff3333); color: white; width: 100%; padding: 14px; border: none; border-radius: 50px; font-weight: bold; font-size: 1em; cursor: pointer; text-transform: uppercase; transition: 0.2s; box-shadow: 0 5px 15px rgba(217, 4, 41, 0.3); }
        .money-btn-confirm:active { transform: scale(0.95); }
        .money-error-msg { color: #ff3333; margin-bottom: 15px; font-size: 0.85em; display: none; animation: shake 0.3s; font-weight: bold; }
        @keyframes shake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
    `;
    document.head.appendChild(style);
    const modalHTML = `
        <div id="moneyInputModal" class="money-input-modal">
            <div class="money-modal-content">
                <div class="money-modal-title">NHẬP SỐ DƯ HIỆN TẠI</div>
                <div class="money-input-group">
                    <input type="text" id="userMoneyInput" class="money-input-field" placeholder="0" autocomplete="off" inputmode="numeric">
                    <span class="money-currency">VNĐ</span>
                </div>
                <div id="moneyError" class="money-error-msg">⚠️ Vốn phải trên 50.000 VNĐ mới có thể HACK!</div>
                <button id="confirmHackBtn" class="money-btn-confirm">BẮT ĐẦU QUÉT (10 TOKEN)</button>
                <div style="margin-top: 20px; color: #888; font-size: 0.85em; cursor: pointer; text-decoration: underline;" onclick="document.getElementById('moneyInputModal').style.display='none'">Đóng lại</div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

window.onload = () => {
    injectMoneyModal();

    // === DOM ELEMENTS ===
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

    const vipFishBtn = document.getElementById('vip-fish-feature-btn');
    const vipFishStatusText = document.getElementById('vip-fish-status-text');
    const vipFishResultModal = document.getElementById('vip-fish-result-modal');
    const closeVipFishResultBtn = document.getElementById('close-vip-fish-result');
    const vipAlertModal = document.getElementById('vip-alert-modal');
    
    const fishNormalRate = document.getElementById('fish-normal-rate');
    const fishMediumRate = document.getElementById('fish-medium-rate');
    const fishSpecialRate = document.getElementById('fish-special-rate');

    const moneyInputModal = document.getElementById('moneyInputModal');
    const userMoneyInput = document.getElementById('userMoneyInput');
    const confirmHackBtn = document.getElementById('confirmHackBtn');
    const moneyError = document.getElementById('moneyError');

    let isUserVip = false;
    let currentInputMoneyRaw = 0;

    // === PARAMS ===
    const params = new URLSearchParams(window.location.search);
    const gameName = params.get('gameName');
    const imageUrl = params.get('imageUrl');
    const initialWinRate = params.get('winRate');
    const lobbyName = decodeURIComponent(params.get('lobbyName'));
    const username = localStorage.getItem('username');
    const selectedBrand = sessionStorage.getItem('selectedBrand');

    if (!username || !gameName || !imageUrl || !lobbyName || !selectedBrand) {
        alert("Lỗi thông tin.");
        window.location.href = '/dashboard-fish.html';
        return;
    }

    let isAnalyzing = false;
    let analysisTimerId = null;
    let countdownIntervalId = null;
    let progressAnimationId = null; 
    const ACTIVE_ANALYSIS_KEY = 'IronxSlotActiveFishAnalysis';

    // === UTILS ===
    const createParticleBurstEffect = () => { const container = document.querySelector('.particle-burst'); if (!container) return; container.innerHTML = ''; const particleCount = 40; const radius = 200; for (let i = 0; i < particleCount; i++) { const particle = document.createElement('div'); particle.className = 'particle'; const angle = Math.random() * 360; const duration = Math.random() * 1.5 + 1; const delay = Math.random() * 2.5; particle.style.setProperty('--angle', `${angle}deg`); particle.style.setProperty('--duration', `${duration}s`); particle.style.setProperty('--delay', `${delay}s`); particle.style.setProperty('--radius', `${radius}px`); container.appendChild(particle); } };
    const createScrollingText = (element, text) => { if (!element) return; element.innerHTML = `<span class="scrolling-text">${text}</span>`; };
    const createEnergyRain = (container) => { if (!container) return; container.innerHTML = ''; const count = 40; const colors = ['#ffd700', '#00ffff']; for (let i = 0; i < count; i++) { const p = document.createElement('div'); p.className = 'particle'; p.style.cssText = `height:${Math.random()*30+15}px;left:${Math.random()*100}%;animation-duration:${Math.random()*1.5+1}s;animation-delay:${Math.random()*3}s;color:${colors[Math.floor(Math.random()*colors.length)]};`; container.appendChild(p); } };
    const createLightningField = (count = 6) => { const paths=["M15 0 L10 20 L18 20 L12 45 L22 45 L8 75 L16 75 L11 100","M18 0 L12 25 L20 25 L10 50 L25 50 L5 80 L15 80 L10 100","M12 0 L18 30 L10 30 L16 60 L8 60 L20 90 L14 90 L10 100","M12 0 L18 30 L10 30 L16 60 L8 60 L20 90 L14 90 L10 100"]; let html=''; for(let i=0; i < count; i++){const p=paths[Math.floor(Math.random()*paths.length)];html+=`<div class="lightning-container" style="--delay: -${Math.random()}s; --duration: ${Math.random() * 0.5 + 0.8}s;"><svg class="lightning-svg" viewBox="0 0 30 100"><path d="${p}" stroke="currentColor" stroke-width="2" fill="none"/></svg></div>`;} return html; };

    const fetchUserInfoFromServer = async () => { 
        try { 
            const res = await fetch(`/api/user-info?username=${username}`); 
            const data = await res.json(); 
            if (data.success) { 
                const coinsByBrand = data.userInfo.coins_by_brand || {}; 
                const currentCoins = coinsByBrand[selectedBrand] || 0; 
                coinDisplay.textContent = `Token: ${currentCoins}`; 
                if (data.vipData && data.vipData.isVip) {
                    isUserVip = true;
                    if(vipFishStatusText) {
                        vipFishStatusText.textContent = "KÍCH HOẠT NGAY";
                        vipFishStatusText.style.color = "#ffd700";
                    }
                }
            } 
        } catch (e) { console.error(e); } 
    };

    const cleanupSession = () => { sessionStorage.removeItem(ACTIVE_ANALYSIS_KEY); };
    const handleInsufficientTokens = (message) => { stopAllTimers(); cleanupSession(); alert(message); window.location.href = '/dashboard-fish.html'; };
    const stopAllTimers = () => { 
        if (analysisTimerId) clearInterval(analysisTimerId); 
        if (countdownIntervalId) clearInterval(countdownIntervalId); 
        if (progressAnimationId) cancelAnimationFrame(progressAnimationId); 
        analysisTimerId = null; countdownIntervalId = null; progressAnimationId = null;
    };
    const handleRecurringDeduction = async () => { try { const response = await fetch('/api/deduct-recurring-token', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, brandName: selectedBrand }) }); const result = await response.json(); if (result.success) { coinDisplay.textContent = `Token: ${result.newCoinBalance}`; progressStatusText.textContent = `Đã trừ 10 Token để duy trì hack...`; } else if (result.outOfTokens) { handleInsufficientTokens(result.message); } } catch (error) { console.error(error); } };
    
    function showBossExplosion() { const frame = document.querySelector('.analysis-content'); if(!frame) return; const overlay = document.createElement('div'); overlay.className = 'scatter-popup-overlay'; overlay.innerHTML = `<div class="sunburst-bg"></div><div class="scatter-popup-content"><img src="/assets/images/boss-icon.png" class="scatter-icon-img" alt="Boss"><div class="scatter-text-main">BOSS<br>ĐÃ NỔ</div><div class="scatter-subtext">Vui lòng HACK lại lượt mới</div></div>`; frame.appendChild(overlay); }
    function hideBossExplosion() { const overlay = document.querySelector('.scatter-popup-overlay'); if(overlay) overlay.remove(); }
    function setupVisuals() { if (moduleGameName) moduleGameName.textContent = gameName; createScrollingText(gameNameBottom, gameName); panelGameImage.src = imageUrl; document.querySelectorAll('.glitch-layer').forEach(layer => { layer.style.backgroundImage = `url(${imageUrl})`; }); const frameLightning = document.getElementById('frame-wide-lightning'); if (frameLightning) { frameLightning.innerHTML = `<div class="lightning-field left">${createLightningField()}</div><div class="lightning-field right">${createLightningField()}</div>`; } createEnergyRain(document.getElementById('particle-field')); createParticleBurstEffect(); }
    
    function initializeUI() {
        setupVisuals(); hideBossExplosion();
        const startPercent = (initialWinRate && initialWinRate !== 'null') ? initialWinRate : 0;
        progressValue.textContent = `${startPercent}%`;
        progressValue.classList.remove('success', 'end-state'); progressValue.style.color = ''; progressValue.style.textShadow = '';
        [infoBox1, infoBox2, infoBox3].forEach(box => { box.classList.remove('result-reveal', 'result-highlight'); box.querySelector('small').textContent = 'Chưa có dữ liệu'; });
        analyzeButton.style.display = 'block'; analyzeButton.disabled = false; analyzeButton.textContent = "HACK (10 TOKEN)";
        endButton.style.display = 'none'; analysisProgressContainer.style.display = 'none'; progressStatusText.textContent = ""; isAnalyzing = false;
    }

    function forceStopHack() { confirmModal.style.display = 'none'; stopAllTimers(); cleanupSession(); initializeUI(); }

    function displayResults(results, isResuming = false) {
        const targetVal = results.finalRate;
        infoBox1.innerHTML = `<span>BẮN MỒI CÁ NHỎ</span><small>${results.banMoi}</small>`;
        infoBox2.innerHTML = `<span>BẮN AUTO CÁ LỚN</span><small>${results.banAuto}</small>`;
        infoBox3.innerHTML = `<span>BẮN BOSS ĐẠN LỚN</span><small>${results.banBoss}</small>`;
        [infoBox1, infoBox2, infoBox3].forEach((box, index) => { if (isResuming) box.style.animationDelay = '0s'; else box.style.animationDelay = `${index * 0.15}s`; box.classList.add('result-reveal', 'result-highlight'); });
        analysisProgressContainer.style.display = 'none'; analyzeButton.style.display = 'block';
        if (isResuming) { progressValue.textContent = `${targetVal}%`; progressValue.classList.add('success'); return; }
        const startVal = parseInt(initialWinRate) || 0; const finalDisplayVal = targetVal; const duration = 1500; let startTime = null;
        progressValue.classList.add('success'); progressValue.style.color = '#00ff8c'; progressValue.style.textShadow = '0 0 10px #00ff8c, 0 0 20px #00b894';
        function animationStep(timestamp) { if (!startTime) startTime = timestamp; const progress = Math.min((timestamp - startTime) / duration, 1); const currentValue = Math.floor(startVal + (progress * (finalDisplayVal - startVal))); progressValue.textContent = `${currentValue}%`; if (progress < 1) { progressAnimationId = requestAnimationFrame(animationStep); } else { progressValue.textContent = `${finalDisplayVal}%`; } }
        progressAnimationId = requestAnimationFrame(animationStep);
    }

    function startResultCountdown(durationInSeconds) {
        stopAllTimers(); let timeLeft = durationInSeconds; endButton.style.display = 'flex'; 
        const updateTimer = () => { const minutes = Math.floor(timeLeft / 60); const seconds = timeLeft % 60; analyzeButton.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`; };
        analyzeButton.disabled = true; updateTimer();
        countdownIntervalId = setInterval(() => { timeLeft--; updateTimer(); if (timeLeft <= 0) { clearInterval(countdownIntervalId); if (analysisTimerId) clearInterval(analysisTimerId); cleanupSession(); progressValue.textContent = "END"; progressValue.classList.remove('success'); progressValue.classList.add('end-state'); showBossExplosion(); setTimeout(() => { hideBossExplosion(); analyzeButton.disabled = false; analyzeButton.textContent = "HACK (10 TOKEN)"; endButton.style.display = 'none'; isAnalyzing = false; }, 4000); } }, 1000);
        analysisTimerId = setInterval(handleRecurringDeduction, 60000);
    }

    function resumeAnalysis(savedState) {
        const remainingTime = Math.floor((savedState.expiresAt - Date.now()) / 1000);
        if (remainingTime > 0) { 
            setupVisuals(); 
            displayResults(savedState.results, true); 
            startResultCountdown(remainingTime); 
            progressStatusText.textContent = `Đã khôi phục phiên phân tích.`; 
        } else { 
            cleanupSession(); 
            initializeUI(); 
        }
    }

    // === MONEY INPUT LOGIC (ĐÃ SỬA ĐỂ GIỚI HẠN 20 SỐ) ===
    userMoneyInput.addEventListener('input', function(e) {
        // 1. Chỉ lấy số
        let value = e.target.value.replace(/\D/g, "");

        // 2. GIỚI HẠN 20 SỐ
        if (value.length > 20) {
            value = value.slice(0, 20);
        }

        // 3. Lưu giá trị thô
        currentInputMoneyRaw = parseInt(value) || 0;

        // 4. Format có dấu chấm
        e.target.value = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

        moneyError.style.display = 'none';
    });

    analyzeButton.onclick = (e) => {
        e.preventDefault();
        if (isAnalyzing) return;
        userMoneyInput.value = ''; currentInputMoneyRaw = 0; moneyError.style.display = 'none';
        moneyInputModal.style.display = 'flex';
        userMoneyInput.focus();
    };

    confirmHackBtn.onclick = async () => {
        if (currentInputMoneyRaw < 50000) { moneyError.style.display = 'block'; return; }
        moneyInputModal.style.display = 'none';

        if (isAnalyzing) return;
        isAnalyzing = true;
        initializeUI(); stopAllTimers(); cleanupSession();
        analyzeButton.style.display = 'none'; endButton.style.display = 'none';
        analysisProgressContainer.style.display = 'block';
        progressStatusText.textContent = `Đang phân tích mục tiêu với mức vốn ${currentInputMoneyRaw.toLocaleString('vi-VN')}đ...`;
        
        let progress = 0;
        const progressInterval = setInterval(() => { progress += 2; progressBarFill.style.width = `${progress}%`; progressBarText.textContent = `${Math.floor(progress)}%`; if (progress >= 100) clearInterval(progressInterval); }, 100);

        setTimeout(async () => {
            clearInterval(progressInterval);
            try {
                const response = await fetch('/api/analyze-game', { 
                    method: 'POST', headers: { 'Content-Type': 'application/json' }, 
                    body: JSON.stringify({ username, winRate: initialWinRate, brandName: selectedBrand, currentBalance: currentInputMoneyRaw }) 
                });
                const result = await response.json();

                if (result.success) {
                    coinDisplay.textContent = `Token: ${result.newCoinBalance}`;
                    const svResult = result.analysisResult;
                    const startRate = parseInt(initialWinRate) || 0;
                    const calculatedRate = Math.min(99, startRate + Math.floor(Math.random()*3)+2);

                    let danMoi = "1K"; let danBoss = "5K";
                    if(currentInputMoneyRaw > 5000000) { danMoi = "10K"; danBoss = "50K"; }
                    else if(currentInputMoneyRaw > 1000000) { danMoi = "5K"; danBoss = "20K"; }

                    const analysisResults = { 
                        finalRate: calculatedRate, 
                        banMoi: `${svResult.quayMoiVong} lượt (Đạn ${danMoi})`, 
                        banAuto: `${svResult.quayAutoVong} lượt`, 
                        banBoss: `${Math.floor(Math.random() * 20) + 10} lượt (Đạn ${danBoss})` 
                    };
                    
                    const randomTime = Math.floor(Math.random() * (180 - 120 + 1)) + 120;
                    const expiresAt = Date.now() + (randomTime * 1000);
                    
                    const stateToSave = { gameName, expiresAt, results: analysisResults, initialWinRate: initialWinRate };
                    sessionStorage.setItem(ACTIVE_ANALYSIS_KEY, JSON.stringify(stateToSave));
                    
                    displayResults(analysisResults, false);
                    startResultCountdown(randomTime);

                } else if (result.outOfTokens) {
                    handleInsufficientTokens(result.message);
                } else {
                    progressStatusText.textContent = result.message;
                    setTimeout(() => { initializeUI(); }, 2000);
                }
            } catch (error) {
                progressStatusText.textContent = 'Lỗi kết nối máy chủ.';
                setTimeout(() => { initializeUI(); }, 2000);
            }
        }, 5000);
    };

    if (vipFishBtn) {
        vipFishBtn.addEventListener('click', () => {
            if (isAnalyzing) return;
            if (!isUserVip) { if(vipAlertModal) vipAlertModal.style.display = 'flex'; } 
            else {
                vipFishStatusText.textContent = "ĐANG QUÉT MỤC TIÊU..."; vipFishStatusText.style.color = "#fff";
                let dots = 0; const loadingInterval = setInterval(() => { dots = (dots + 1) % 4; vipFishStatusText.textContent = "ĐANG QUÉT" + ".".repeat(dots); }, 400);
                setTimeout(() => {
                    clearInterval(loadingInterval); vipFishStatusText.textContent = "HOÀN TẤT!"; vipFishStatusText.style.color = "#00ff8c";
                    const rate1 = Math.floor(Math.random() * 21) + 10; const rate2 = Math.floor(Math.random() * 36) + 35; const rate3 = Math.floor(Math.random() * 16) + 80;
                    fishNormalRate.textContent = `${rate1}%`; fishMediumRate.textContent = `${rate2}%`; fishSpecialRate.textContent = `${rate3}%`;
                    vipFishResultModal.style.display = 'flex';
                    setTimeout(() => { vipFishStatusText.textContent = "KÍCH HOẠT LẠI"; vipFishStatusText.style.color = "#ffd700"; }, 2000);
                }, 3000);
            }
        });
    }

    if(closeVipFishResultBtn) closeVipFishResultBtn.onclick = () => vipFishResultModal.style.display = 'none';
    if(vipAlertModal) { const closeAlert = vipAlertModal.querySelector('.btn-vip-action'); if(closeAlert) closeAlert.onclick = () => vipAlertModal.style.display = 'none'; }
    window.addEventListener('click', (e) => {
        if (e.target == moneyInputModal) moneyInputModal.style.display = 'none';
        if (e.target == vipFishResultModal) vipFishResultModal.style.display = 'none';
        if (e.target == vipAlertModal) vipAlertModal.style.display = 'none';
        if (e.target == confirmModal) confirmModal.style.display = 'none';
    });
    endButton.addEventListener('click', () => { confirmModal.style.display = 'flex'; });
    confirmNoBtn.addEventListener('click', () => { confirmModal.style.display = 'none'; });
    confirmYesBtn.addEventListener('click', () => { forceStopHack(); });

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