// --- START OF FILE analysis-soccer.js (V5 - Thêm highlight kết quả) ---

window.onload = () => {
    // === LẤY CÁC PHẦN TỬ DOM CHUẨN ===
    const coinDisplay = document.getElementById('coin-display');
    const analyzeButton = document.getElementById('analyze-button');
    const analysisProgressContainer = document.getElementById('analysis-progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressBarText = document.getElementById('progress-bar-text');
    const progressStatusText = document.querySelector('.progress-status-text');
    const resultsGrid = document.getElementById('analysis-results-grid');
    const progressTag = document.getElementById('progress-tag');
    const progressRateText = document.getElementById('progress-text');
    // === THÊM MỚI: Lấy danh sách các nút giải đấu ===
    const leagueButtons = document.querySelectorAll('.led-button');

    // === LẤY DỮ LIỆU TỪ LOCALSTORAGE ===
    const username = localStorage.getItem('username');
    const selectedBrand = sessionStorage.getItem('selectedBrand');
    
    if (!username || !selectedBrand) {
        alert("Lỗi: Thiếu thông tin người dùng hoặc SẢNH GAME.");
        window.location.href = '/dashboard.html';
        return;
    }

    // === BIẾN QUẢN LÝ TRẠNG THÁI ===
    let isAnalyzing = false;
    const ANALYSIS_COST = 10;

    // === CÁC HÀM TIỆN ÍCH ĐỒ HỌA ===
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
                // Đồng bộ lại sessionStorage sau khi fetch
                sessionStorage.setItem('currentTokenCount', currentCoins);
            } else { coinDisplay.textContent = 'Lỗi'; }
        } catch (e) { coinDisplay.textContent = 'Lỗi'; }
    }

    // === HÀM HIỂN THỊ KẾT QUẢ (CẬP NHẬT) ===
    function displayResults(resultsArray, newCoinBalance) {
        // Hiển thị kết quả 9 lượt sút
        resultsGrid.innerHTML = '';
        resultsArray.forEach((direction, index) => {
            const item = document.createElement('div');
            item.className = 'result-item';
            item.style.animationDelay = `${index * 0.08}s`;
            item.innerHTML = `
                <span class="turn">Lượt ${index + 1}</span>
                <span class="direction">${direction}</span>
            `;
            resultsGrid.appendChild(item);
        });
        
        // Cập nhật tỷ lệ
        const randomRate = Math.floor(Math.random() * 6) + 90; // 90 -> 95
        progressRateText.textContent = `${randomRate}%`;
        progressTag.classList.add('result-state');

        // Làm sáng nút bấm ngẫu nhiên
        leagueButtons.forEach(btn => btn.classList.remove('active-league'));
        const randomIndex = Math.floor(Math.random() * leagueButtons.length);
        leagueButtons[randomIndex].classList.add('active-league');

        // === ĐỒNG BỘ: Đồng bộ token vào sessionStorage ===
        sessionStorage.setItem('currentTokenCount', newCoinBalance);
    }

    // === XỬ LÝ SỰ KIỆN CLICK NÚT PHÂN TÍCH (CẬP NHẬT) ===
    analyzeButton.addEventListener('click', async () => {
        if (isAnalyzing) return;
        isAnalyzing = true;
        
        leagueButtons.forEach(btn => btn.classList.remove('active-league'));

        analyzeButton.disabled = true;
        analyzeButton.style.display = 'none';
        analysisProgressContainer.style.display = 'block';
        resultsGrid.innerHTML = '<p class="placeholder-text">Đang phân tích dữ liệu cú sút...</p>';
        progressStatusText.textContent = `Đang kết nối vệ tinh...`;
        progressTag.classList.remove('result-state');
        
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
                    body: JSON.stringify({ 
                        username, 
                        brandName: selectedBrand, 
                        cost: ANALYSIS_COST 
                    })
                });
                const result = await response.json();

                if (result.success) {
                    coinDisplay.textContent = result.newCoinBalance;
                    const directions = ['TRÁI', 'GIỮA', 'PHẢI'];
                    const analysisResults = [];
                    for (let i = 0; i < 9; i++) {
                        analysisResults.push(directions[Math.floor(Math.random() * directions.length)]);
                    }
                    // Truyền newCoinBalance vào hàm displayResults
                    displayResults(analysisResults, result.newCoinBalance);
                } else {
                    alert(result.message || "Có lỗi xảy ra, vui lòng thử lại.");
                    resultsGrid.innerHTML = `<p class="placeholder-text">${result.message}</p>`;
                }

            } catch (error) {
                alert('Lỗi kết nối máy chủ. Vui lòng thử lại.');
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

    // === KHỞI TẠO TRANG ===
    function initializeUI() {
        // === ĐỒNG BỘ: Ưu tiên hiển thị token từ sessionStorage ===
        const sessionToken = sessionStorage.getItem('currentTokenCount');
        if (sessionToken !== null) {
            coinDisplay.textContent = sessionToken;
        }
        // Sau đó vẫn fetch để lấy số liệu mới nhất
        fetchUserInfoFromServer();

        const initialRate = Math.floor(Math.random() * 6) + 90;
        progressRateText.textContent = `${initialRate}%`;
        
        const frameLightning = document.getElementById('frame-wide-lightning');
        if (frameLightning) { 
            frameLightning.innerHTML = `<div class="lightning-field left">${createLightningField()}</div><div class="lightning-field right">${createLightningField()}</div>`; 
        }
        createEnergyRain(document.getElementById('particle-field'));
    }

    initializeUI();
};