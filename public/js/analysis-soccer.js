/* --- START OF FILE public/js/analysis-soccer.js --- */

window.onload = () => {
    const coinDisplay = document.getElementById('coin-display');
    const analyzeButton = document.getElementById('analyze-button');
    const analysisProgressContainer = document.getElementById('analysis-progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressBarText = document.getElementById('progress-bar-text');
    const progressStatusText = document.querySelector('.progress-status-text');
    const resultsGrid = document.getElementById('analysis-results-grid');
    
    // CẬP NHẬT ID MỚI
    const progressValue = document.getElementById('progress-value');
    const leagueButtons = document.querySelectorAll('.led-button');

    // Lấy dữ liệu
    const params = new URLSearchParams(window.location.search);
    // Lấy winRate từ URL (nếu có), nếu không random nhẹ để hiển thị ban đầu
    const initialWinRate = params.get('winRate') || (Math.floor(Math.random() * 15) + 70); 
    const username = localStorage.getItem('username');
    const selectedBrand = sessionStorage.getItem('selectedBrand');
    
    if (!username || !selectedBrand) {
        alert("Lỗi: Thiếu thông tin người dùng hoặc SẢNH GAME.");
        window.location.href = '/dashboard.html';
        return;
    }

    let isAnalyzing = false;
    const ANALYSIS_COST = 10;
    let progressAnimationId = null;

    // Hiệu ứng nền
    const createLightningField = (count = 6) => { const paths=["M15 0 L10 20 L18 20 L12 45 L22 45 L8 75 L16 75 L11 100","M18 0 L12 25 L20 25 L10 50 L25 50 L5 80 L15 80 L10 100","M12 0 L18 30 L10 30 L16 60 L8 60 L20 90 L14 90 L10 100"]; let html=''; for(let i=0; i < count; i++){const p=paths[Math.floor(Math.random()*paths.length)];html+=`<div class="lightning-container" style="--delay: -${Math.random()}s; --duration: ${Math.random() * 0.5 + 0.8}s;"><svg class="lightning-svg" viewBox="0 0 30 100"><path d="${p}" stroke="currentColor" stroke-width="2" fill="none"/></svg></div>`;} return html; };
    const createEnergyRain = (container) => { if (!container) return; container.innerHTML = ''; const count = 40; const colors = ['#ffd700', '#00ffff']; for (let i = 0; i < count; i++) { const p = document.createElement('div'); p.className = 'particle'; p.style.cssText = `height:${Math.random()*30+15}px;left:${Math.random()*100}%;animation-duration:${Math.random()*1.5+1}s;animation-delay:${Math.random()*3}s;color:${colors[Math.floor(Math.random()*colors.length)]};`; container.appendChild(p); } };

    async function fetchUserInfoFromServer() {
        try {
            const res = await fetch(`/api/user-info?username=${username}`);
            const data = await res.json();
            if (data.success) {
                const coinsByBrand = data.userInfo.coins_by_brand || {};
                const currentCoins = coinsByBrand[selectedBrand] || 0;
                coinDisplay.textContent = currentCoins;
                sessionStorage.setItem('currentTokenCount', currentCoins);
            }
        } catch (e) { console.error(e); }
    }

    // === 1. KHỞI TẠO GIAO DIỆN (HIỆN % BAN ĐẦU) ===
    function initializeUI() {
        const sessionToken = sessionStorage.getItem('currentTokenCount');
        if (sessionToken !== null) coinDisplay.textContent = sessionToken;
        fetchUserInfoFromServer();

        // Hiển thị % ban đầu
        progressValue.textContent = `${initialWinRate}%`;
        progressValue.classList.remove('success');
        progressValue.style.color = ''; 
        progressValue.style.textShadow = '';

        const frameLightning = document.getElementById('frame-wide-lightning');
        if (frameLightning) { 
            frameLightning.innerHTML = `<div class="lightning-field left">${createLightningField()}</div><div class="lightning-field right">${createLightningField()}</div>`; 
        }
        createEnergyRain(document.getElementById('particle-field'));
    }

    // === 2. HIỂN THỊ KẾT QUẢ (CHẠY SỐ) ===
    function displayResults(resultsArray, newCoinBalance, isResuming = false) {
        if (newCoinBalance !== null) {
            sessionStorage.setItem('currentTokenCount', newCoinBalance);
            coinDisplay.textContent = newCoinBalance;
        }

        resultsGrid.innerHTML = '';
        resultsArray.forEach((direction, index) => {
            const item = document.createElement('div');
            item.className = 'result-item';
            if (isResuming) item.style.animationDelay = '0s';
            else item.style.animationDelay = `${index * 0.08}s`;
            
            item.innerHTML = `
                <span class="turn">Lượt ${index + 1}</span>
                <span class="direction">${direction}</span>
            `;
            resultsGrid.appendChild(item);
        });

        // Highlight nút ngẫu nhiên
        leagueButtons.forEach(btn => btn.classList.remove('active-league'));
        const randomIndex = Math.floor(Math.random() * leagueButtons.length);
        leagueButtons[randomIndex].classList.add('active-league');

        // === LOGIC SỐ CHẠY ===
        // Giả lập tỷ lệ thắng tăng lên sau khi hack (ví dụ: +5% đến +15%)
        const startVal = parseInt(initialWinRate) || 70;
        const targetVal = Math.min(98, startVal + Math.floor(Math.random() * 10) + 5); 

        if (isResuming) {
            progressValue.textContent = `${targetVal}%`;
            progressValue.classList.add('success');
            return;
        }

        const duration = 2000; 
        let startTime = null;

        function animationStep(timestamp) {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const currentValue = Math.floor(startVal + (progress * (targetVal - startVal)));
            
            progressValue.textContent = `${currentValue}%`;
            
            if (progress >= 0.8) {
                progressValue.classList.add('success');
            }

            if (progress < 1) {
                progressAnimationId = requestAnimationFrame(animationStep);
            } else {
                 progressValue.textContent = `${targetVal}%`;
            }
        }
        progressAnimationId = requestAnimationFrame(animationStep);
    }

    analyzeButton.addEventListener('click', async () => {
        if (isAnalyzing) return;
        isAnalyzing = true;
        
        leagueButtons.forEach(btn => btn.classList.remove('active-league'));
        analyzeButton.disabled = true;
        analyzeButton.style.display = 'none';
        analysisProgressContainer.style.display = 'block';
        resultsGrid.innerHTML = '<p class="placeholder-text">Đang phân tích dữ liệu cú sút...</p>';
        progressStatusText.textContent = `Đang kết nối vệ tinh...`;
        
        // Không reset progressValue về 0% ở đây

        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 2;
            progressBarFill.style.width = `${progress}%`;
            progressBarText.textContent = `${Math.floor(progress)}%`;
            if (progress >= 100) clearInterval(progressInterval);
        }, 80);

        setTimeout(async () => {
            try {
                const response = await fetch('/api/analyze-special-game', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, brandName: selectedBrand, cost: ANALYSIS_COST })
                });
                const result = await response.json();

                if (result.success) {
                    const directions = ['TRÁI', 'GIỮA', 'PHẢI'];
                    const analysisResults = [];
                    for (let i = 0; i < 9; i++) {
                        analysisResults.push(directions[Math.floor(Math.random() * directions.length)]);
                    }
                    
                    // Lưu vào Session để Resume
                    const stateToSave = { results: analysisResults, newCoinBalance: result.newCoinBalance, initialWinRate: initialWinRate };
                    sessionStorage.setItem('wukongSoccerState', JSON.stringify(stateToSave));

                    displayResults(analysisResults, result.newCoinBalance, false);
                } else {
                    alert(result.message || "Lỗi.");
                    resultsGrid.innerHTML = `<p class="placeholder-text">${result.message}</p>`;
                }

            } catch (error) {
                alert('Lỗi kết nối máy chủ.');
                resultsGrid.innerHTML = '<p class="placeholder-text">Lỗi kết nối</p>';
            } finally {
                clearInterval(progressInterval);
                analysisProgressContainer.style.display = 'none';
                analyzeButton.style.display = 'block';
                analyzeButton.disabled = false;
                isAnalyzing = false;
            }
        }, 4000);
    });

    // Kiểm tra Resume
    const savedState = sessionStorage.getItem('wukongSoccerState');
    if (savedState) {
        const parsedState = JSON.parse(savedState);
        // Nếu có saved state, dùng initialWinRate từ đó để đồng bộ
        if (parsedState.initialWinRate) {
             progressValue.textContent = `${parsedState.initialWinRate}%`;
        } else {
             initializeUI();
        }
        displayResults(parsedState.results, parsedState.newCoinBalance, true);
    } else {
        initializeUI();
    }
};