if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.log('ServiceWorker registration failed: ', error);
      });
  });
}

// === HÀM CẬP NHẬT VIP DISPLAY (MỚI) ===
async function updateVipDisplay(username) {
    if (!username) return;
    try {
        const res = await fetch(`/api/user-info?username=${username}`);
        const data = await res.json();
        
        if (data.success && data.vipData) {
            const { isVip, currentDeposit, threshold, progressPercent } = data.vipData;
            
            const vipContainer = document.getElementById('vip-progress-ui');
            const vipBadgePlace = document.getElementById('vip-badge-placeholder');
            const vipFill = document.getElementById('vip-fill-bar');
            const vipCurrent = document.getElementById('vip-current-money');
            
            if (!vipBadgePlace) return;

            // 1. Cập nhật Badge VIP/MEMBER
            if (isVip) {
                vipBadgePlace.innerHTML = `<span class="vip-status-badge badge-vip">VIP</span>`;
                // Ẩn thanh tiến trình nếu đã là VIP (hoặc để hiện full tùy ý)
                if(vipContainer) vipContainer.style.display = 'none';
            } else {
                vipBadgePlace.innerHTML = `<span class="vip-status-badge badge-normal">MEMBER</span>`;
                if(vipContainer) {
                    vipContainer.style.display = 'flex';
                    // Animation thanh tiến trình
                    setTimeout(() => {
                        if(vipFill) vipFill.style.width = `${progressPercent}%`;
                    }, 100);
                    
                    // Format tiền: 1.500.000 => 1.5tr
                    const formatMoney = (n) => {
                        if (n >= 1000000) return (n/1000000).toFixed(1).replace('.0','') + 'tr';
                        if (n >= 1000) return (n/1000).toFixed(0) + 'k';
                        return n;
                    };
                    
                    if(vipCurrent) vipCurrent.textContent = `${formatMoney(currentDeposit)} / ${formatMoney(threshold)}`;
                }
            }
        }
    } catch (e) {
        console.error("Lỗi cập nhật VIP:", e);
    }
}