// public/js/analysis-pilot.js

window.onload = () => {
    // === LẤY CÁC PHẦN TỬ DOM ===
    const coinDisplay = document.getElementById('coin-display');
    const analyzeButton = document.getElementById('analyze-button');
    const analysisProgressContainer = document.getElementById('analysis-progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressBarText = document.getElementById('progress-bar-text');
    const progressStatusText = document.querySelector('.progress-status-text');
    const pilotChartContainer = document.getElementById('pilotChartContainer');
    const chartResultOverlay = document.getElementById('chart-result-overlay');
    const chartResultText = document.getElementById('chart-result-text');
    const ctx = document.getElementById('pilotChart').getContext('2d');
    const airplaneIcon = document.getElementById('chart-airplane-icon');
    const progressText = document.getElementById('progress-text');


    // === LẤY DỮ LIỆU TỪ LOCALSTORAGE ===
    const username = localStorage.getItem('username');
    const selectedBrand = sessionStorage.getItem('selectedBrand');

    if (!username || !selectedBrand) {
        alert("Lỗi: Thiếu thông tin người dùng hoặc SẢNH GAME.");
        window.location.href = '/dashboard.html';
        return;
    }

    // === BIẾN QUẢN LÝ TRẠNG THÁI & BIỂU ĐỒ ===
    let isAnalyzing = false;
    const ANALYSIS_COST = 10;
    let pilotChart;
    let chartUpdateInterval;

    // === CÁC HÀM TIỆN ÍCH ĐỒ HỌA ===
    const createLightningField = (count = 6) => { const paths=["M15 0 L10 20 L18 20 L12 45 L22 45 L8 75 L16 75 L11 100","M18 0 L12 25 L20 25 L10 50 L25 50 L5 80 L15 80 L10 100","M12 0 L18 30 L10 30 L16 60 L8 60 L20 90 L14 90 L10 100"]; let html=''; for(let i=0; i < count; i++){const p=paths[Math.floor(Math.random()*paths.length)];html+=`<div class="lightning-container" style="--delay: -${Math.random()}s; --duration: ${Math.random() * 0.5 + 0.8}s;"><svg class="lightning-svg" viewBox="0 0 30 100"><path d="${p}" stroke="currentColor" stroke-width="2" fill="none"/></svg></div>`;} return html; };
    const createEnergyRain = (container) => { if (!container) return; container.innerHTML = ''; const count = 40; const colors = ['#ffd700', '#00ffff']; for (let i = 0; i < count; i++) { const p = document.createElement('div'); p.className = 'particle'; p.style.cssText = `height:${Math.random()*30+15}px;left:${Math.random()*100}%;animation-duration:${Math.random()*1.5+1}s;animation-delay:${Math.random()*3}s;color:${colors[Math.floor(Math.random()*colors.length)]};`; container.appendChild(p); } };


    // === HÀM LẤY THÔNG TIN TOKEN ===
    async function fetchUserInfoFromServer() {
        try {
            const res = await fetch(`/api/user-info?username=${username}`);
            const data = await res.json();
            if (data.success) {
                const coinsByBrand = data.userInfo.coins_by_brand || {};
                const currentCoins = coinsByBrand[selectedBrand] || 0;
                coinDisplay.textContent = currentCoins;
            }
        } catch (e) { console.error("Lỗi fetch user info", e); }
    }

    // === CẤU HÌNH VÀ VẼ BIỂU ĐỒ ===
    function initializeChart() {
        if (pilotChart) pilotChart.destroy();
        pilotChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array(40).fill(''),
                datasets: [{
                    data: Array(40).fill(1).map(() => 1 + Math.random() * 4),
                    borderColor: '#ffd700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    borderWidth: 3,
                    pointRadius: 0,
                    tension: 0.4,
                    fill: true,
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                animation: { duration: 200 },
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { display: false, min: 1, max: 22 } }
            }
        });
    }

    // === HÀM CẬP NHẬT BIỂU ĐỒ ===
    function startRealtimeChart() {
        if (chartUpdateInterval) clearInterval(chartUpdateInterval);
        chartUpdateInterval = setInterval(() => {
            const data = pilotChart.data.datasets[0].data;
            data.shift();
            const lastValue = data[data.length - 1] || 2;
            let newValue = lastValue + (Math.random() - 0.5) * 2;
            data.push(Math.max(1, newValue));
            
            pilotChart.update('none');
            
            // === THAY ĐỔI: Đã xóa toàn bộ code JS định vị máy bay ở đây ===

        }, 150);
    }

    // === XỬ LÝ SỰ KIỆN CLICK NÚT "HACK" ===
    analyzeButton.addEventListener('click', async () => {
        if (isAnalyzing) return;
        isAnalyzing = true;
        analyzeButton.disabled = true;
        analyzeButton.style.display = 'none';
        analysisProgressContainer.style.display = 'block';
        progressStatusText.textContent = `Đang kết nối hệ thống...`;

        let progress = 0;
        const progressInterval = setInterval(() => {
            progress += 5;
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
                    coinDisplay.textContent = result.newCoinBalance;
                    const randomMultiplier = (Math.random() * (20.05 - 1.01) + 1.01).toFixed(2);
                    chartResultText.textContent = `${randomMultiplier}x`;
                    
                    pilotChartContainer.classList.add('highlight');
                    chartResultOverlay.style.display = 'flex';

                    setTimeout(() => {
                        pilotChartContainer.classList.remove('highlight');
                        chartResultOverlay.style.display = 'none';
                    }, 4000);
                } else {
                    alert(result.message || "Có lỗi xảy ra, vui lòng thử lại.");
                }
            } catch (error) {
                alert('Lỗi kết nối máy chủ. Vui lòng thử lại.');
            } finally {
                analysisProgressContainer.style.display = 'none';
                analyzeButton.style.display = 'block';
                analyzeButton.textContent = "CHỜ 2s";
                setTimeout(() => {
                    analyzeButton.disabled = false;
                    analyzeButton.textContent = `HACK (${ANALYSIS_COST} TOKEN)`;
                    isAnalyzing = false;
                }, 2000);
            }
        }, 1600);
    });

    // === KHỞI TẠO TRANG ===
    (async () => {
        await fetchUserInfoFromServer();
        progressText.textContent = `${Math.floor(Math.random() * 6) + 90}%`;
        initializeChart();
        startRealtimeChart();
        const frameLightning = document.getElementById('frame-wide-lightning');
        if (frameLightning) { frameLightning.innerHTML = `<div class="lightning-field left">${createLightningField()}</div><div class="lightning-field right">${createLightningField()}</div>`; }
        createEnergyRain(document.getElementById('particle-field'));
    })();
};