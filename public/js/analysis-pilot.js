/* --- START OF FILE public/js/analysis-pilot.js --- */

window.onload = () => {
    const coinDisplay = document.getElementById('coin-display');
    const analyzeButton = document.getElementById('analyze-button'); // Nút Hack thường
    const analysisProgressContainer = document.getElementById('analysis-progress-container');
    const progressBarFill = document.getElementById('progress-bar-fill');
    const progressBarText = document.getElementById('progress-bar-text');
    const progressStatusText = document.querySelector('.progress-status-text');
    const pilotChartContainer = document.getElementById('pilotChartContainer');
    const chartResultOverlay = document.getElementById('chart-result-overlay');
    const chartResultText = document.getElementById('chart-result-text');
    const ctx = document.getElementById('pilotChart').getContext('2d');
    
    const progressValue = document.getElementById('progress-value');
    
    const infoBox1 = document.getElementById('info-box-1');
    const infoBox2 = document.getElementById('info-box-2');
    const infoBox3 = document.getElementById('info-box-3');

    // === BIẾN MỚI CHO VIP ===
    const vipSignalBox = document.getElementById('vip-signal-box');
    const vipStatusText = document.getElementById('vip-status-text');
    const vipModal = document.getElementById('vip-alert-modal');
    const closeVipModalBtn = document.getElementById('close-vip-modal');
    
    let isUserVip = false;
    let isVipAnalyzing = false; // Cờ riêng cho VIP

    const params = new URLSearchParams(window.location.search);
    const initialWinRate = params.get('winRate') || (Math.floor(Math.random() * 15) + 75);
    
    const username = localStorage.getItem('username');
    const selectedBrand = sessionStorage.getItem('selectedBrand');

    if (!username || !selectedBrand) {
        alert("Lỗi: Thiếu thông tin người dùng.");
        window.location.href = '/dashboard.html';
        return;
    }

    let isAnalyzing = false; // Cờ chung
    const ANALYSIS_COST = 10;
    let pilotChart;
    let chartUpdateInterval;
    let progressAnimationId;

    const createLightningField = (count = 6) => { const paths=["M15 0 L10 20 L18 20 L12 45 L22 45 L8 75 L16 75 L11 100","M18 0 L12 25 L20 25 L10 50 L25 50 L5 80 L15 80 L10 100","M12 0 L18 30 L10 30 L16 60 L8 60 L20 90 L14 90 L10 100"]; let html=''; for(let i=0; i < count; i++){const p=paths[Math.floor(Math.random()*paths.length)];html+=`<div class="lightning-container" style="--delay: -${Math.random()}s; --duration: ${Math.random() * 0.5 + 0.8}s;"><svg class="lightning-svg" viewBox="0 0 30 100"><path d="${p}" stroke="currentColor" stroke-width="2" fill="none"/></svg></div>`;} return html; };
    const createEnergyRain = (container) => { if (!container) return; container.innerHTML = ''; const count = 40; const colors = ['#ffd700', '#00ffff']; for (let i = 0; i < count; i++) { const p = document.createElement('div'); p.className = 'particle'; p.style.cssText = `height:${Math.random()*30+15}px;left:${Math.random()*100}%;animation-duration:${Math.random()*1.5+1}s;animation-delay:${Math.random()*3}s;color:${colors[Math.floor(Math.random()*colors.length)]};`; container.appendChild(p); } };

    // === 1. FETCH THÔNG TIN USER & CHECK VIP ===
    async function fetchUserInfoFromServer() {
        try {
            const res = await fetch(`/api/user-info?username=${username}`);
            const data = await res.json();
            if (data.success) {
                const coinsByBrand = data.userInfo.coins_by_brand || {};
                const currentCoins = coinsByBrand[selectedBrand] || 0;
                coinDisplay.textContent = `Token: ${currentCoins}`;

                if (data.vipData && data.vipData.isVip) {
                    isUserVip = true;
                    if(vipStatusText) {
                        vipStatusText.textContent = "KÍCH HOẠT NGAY";
                        vipStatusText.style.color = "#00ff8c"; // Xanh lá
                    }
                }
            }
        } catch (e) { console.error(e); }
    }

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

    function startRealtimeChart() {
        if (chartUpdateInterval) clearInterval(chartUpdateInterval);
        chartUpdateInterval = setInterval(() => {
            const data = pilotChart.data.datasets[0].data;
            data.shift();
            const lastValue = data[data.length - 1] || 2;
            let newValue = lastValue + (Math.random() - 0.5) * 2;
            data.push(Math.max(1, newValue));
            pilotChart.update('none');
        }, 150);
    }

    function runProgressAnimation(isResuming) {
        const startVal = parseInt(initialWinRate) || 75;
        const targetVal = Math.min(99, startVal + Math.floor(Math.random() * 8) + 2);

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

    // === 2. HÀM HIỂN THỊ KẾT QUẢ (DÙNG CHUNG) ===
    function showPilotResult(multiplier, resultData, isResuming, isVipResult = false) {
        // Reset trạng thái hiển thị cũ
        pilotChartContainer.classList.remove('highlight', 'vip-active-display');

        chartResultText.textContent = `${multiplier}x`;
        chartResultOverlay.style.display = 'flex';
        
        infoBox1.querySelector('small').textContent = resultData.start;
        infoBox2.querySelector('small').textContent = resultData.stop;
        infoBox3.querySelector('small').textContent = resultData.freq;

        [infoBox1, infoBox2, infoBox3].forEach((box, index) => {
            if(isResuming) box.style.animationDelay = '0s';
            else box.style.animationDelay = `${100 + index * 150}ms`;
            box.classList.add('result-reveal', 'result-highlight');
        });

        // XỬ LÝ SỰ KHÁC BIỆT GIAO DIỆN
        if(isVipResult) {
            // Nếu là VIP: Kích hoạt class Gold cho biểu đồ
            pilotChartContainer.classList.add('vip-active-display');
            if(vipStatusText) vipStatusText.innerHTML = `<span style="color:#ffd700">KẾT QUẢ: x${multiplier}</span>`;
        } else {
            // Nếu là thường: Kích hoạt class highlight xanh
            pilotChartContainer.classList.add('highlight');
        }

        if(!isResuming) {
            setTimeout(() => {
                pilotChartContainer.classList.remove('highlight', 'vip-active-display');
                chartResultOverlay.style.display = 'none';
                
                // Reset nút VIP
                if(isVipResult && vipStatusText) {
                    vipStatusText.textContent = "KÍCH HOẠT LẠI";
                    vipStatusText.style.color = "#fff";
                }
                isAnalyzing = false; 
            }, 5000); // 5 giây tắt
        }
        
        runProgressAnimation(isResuming);
    }

    // === 3. SỰ KIỆN NÚT HACK THƯỜNG ===
    analyzeButton.addEventListener('click', async () => {
        if (isAnalyzing) return;
        isAnalyzing = true;
        
        [infoBox1, infoBox2, infoBox3].forEach(box => { box.classList.remove('result-reveal', 'result-highlight'); });

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
                    coinDisplay.textContent = `Token: ${result.newCoinBalance}`;
                    
                    const randomMultiplier = (Math.random() * (20.05 - 1.01) + 1.01).toFixed(2);
                    const resultData = {
                        start: `${(Math.random() * (3.55 - 2.15) + 2.15).toFixed(2)}x - ${(Math.random() * 5 + 3).toFixed(2)}x`,
                        stop: `< ${(Math.random() * 3 + 4).toFixed(2)}x`,
                        freq: `~${Math.floor(Math.random() * 3) + 2} phiên`
                    };

                    sessionStorage.setItem('wukongPilotState', JSON.stringify({
                        multiplier: randomMultiplier,
                        data: resultData,
                        initialWinRate: initialWinRate
                    }));

                    showPilotResult(randomMultiplier, resultData, false, false); // isVip = false

                } else {
                    alert(result.message);
                }
            } catch (error) {
                alert('Lỗi kết nối máy chủ.');
            } finally {
                clearInterval(progressInterval);
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

    // === 4. SỰ KIỆN NÚT HACK VIP (MỚI) ===
    if (vipSignalBox) {
        vipSignalBox.addEventListener('click', () => {
            if (isAnalyzing) return; 

            if (!isUserVip) {
                // Chưa VIP -> Hiện Modal
                if(vipModal) vipModal.style.display = 'flex';
            } else {
                // Đã VIP -> Chạy Hack VIP
                isAnalyzing = true;
                
                vipStatusText.textContent = "ĐANG KẾT NỐI với game...";
                vipStatusText.style.color = "#ffd700";
                
                // Ẩn kết quả cũ nếu có
                chartResultOverlay.style.display = 'none';
                [infoBox1, infoBox2, infoBox3].forEach(box => {
                    box.classList.remove('result-reveal', 'result-highlight');
                    box.querySelector('small').textContent = "...";
                });

                // Hiệu ứng Loading
                let dots = 0;
                const loadingInterval = setInterval(() => {
                    dots = (dots + 1) % 4;
                    vipStatusText.textContent = "GIẢI MÃ DỮ LIỆU" + ".".repeat(dots);
                }, 400);

                setTimeout(() => {
                    clearInterval(loadingInterval);
                    
                    // Tạo kết quả VIP cao hơn (8x - 25x)
                    const vipMultiplier = (Math.random() * (25.0 - 8.0) + 8.0).toFixed(2);
                    
                    const resultData = {
                        start: `Tín hiệu mạnh: ${(parseFloat(vipMultiplier) - 5).toFixed(2)}x`,
                        stop: `< ${(parseFloat(vipMultiplier) + 2).toFixed(2)}x (An toàn)`,
                        freq: `Độ tin cậy: 99%`
                    };

                    // Hiển thị lên Màn hình chính
                    showPilotResult(vipMultiplier, resultData, false, true); // isVip = true

                }, 2500);
            }
        });
    }

    if (closeVipModalBtn) closeVipModalBtn.addEventListener('click', () => vipModal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target == vipModal) vipModal.style.display = 'none';
    });

    (async () => {
        await fetchUserInfoFromServer();
        
        const savedState = sessionStorage.getItem('wukongPilotState');
        if (savedState) {
            const parsed = JSON.parse(savedState);
            if(parsed.initialWinRate) progressValue.textContent = `${parsed.initialWinRate}%`;
            showPilotResult(parsed.multiplier, parsed.data, true, false); 
        } else {
            progressValue.textContent = `${initialWinRate}%`;
            progressValue.classList.remove('success');
            progressValue.style.color = '';
            progressValue.style.textShadow = '';
        }

        initializeChart();
        startRealtimeChart();
        const frameLightning = document.getElementById('frame-wide-lightning');
        if (frameLightning) { frameLightning.innerHTML = `<div class="lightning-field left">${createLightningField()}</div><div class="lightning-field right">${createLightningField()}</div>`; }
        createEnergyRain(document.getElementById('particle-field'));
    })();
};