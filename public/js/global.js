/* --- START OF FILE public/js/global.js --- */

// 1. Đăng ký Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(registration => {
        console.log('ServiceWorker registered with scope:', registration.scope);

        // Kiểm tra xem có phiên bản SW mới không
        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          installingWorker.onstatechange = () => {
            if (installingWorker.state === 'installed') {
              if (navigator.serviceWorker.controller) {
                console.log('New content is available; please refresh.');
                // Tùy chọn: Có thể hiển thị thông báo cho user reload lại trang tại đây
              } else {
                console.log('Content is cached for offline use.');
              }
            }
          };
        };
      })
      .catch(error => {
        console.log('ServiceWorker registration failed:', error);
      });
  });
}

// 2. Hàm cập nhật hiển thị VIP (Dùng chung cho Dashboard và các trang Analysis)
async function updateVipDisplay(username) {
    if (!username) return;
    try {
        const res = await fetch(`/api/user-info?username=${username}`);
        const data = await res.json();

        if (data.success && data.vipData) {
            const { isVip, currentDeposit, threshold, progressPercent } = data.vipData;

            // Lấy các phần tử DOM
            const vipContainer = document.getElementById('vip-progress-ui');
            const vipBadgePlace = document.getElementById('vip-badge-placeholder');
            const vipFill = document.getElementById('vip-fill-bar');
            const vipCurrent = document.getElementById('vip-current-money');
            const vipTarget = document.getElementById('vip-target-money');

            // Nếu trang hiện tại không có các element này thì thoát (ví dụ trang Login/Admin)
            if (!vipBadgePlace) return;

            // Cập nhật Badge VIP/MEMBER
            if (isVip) {
                // Nếu là VIP
                vipBadgePlace.innerHTML = `<span class="vip-status-badge badge-vip">VIP</span>`;
                
                // Ẩn thanh tiến trình vì đã max cấp
                if(vipContainer) vipContainer.style.display = 'none';
            } else {
                // Nếu là Member thường
                vipBadgePlace.innerHTML = `<span class="vip-status-badge badge-normal">MEMBER</span>`;
                
                if(vipContainer) {
                    vipContainer.style.display = 'flex'; // Hiện thanh tiến trình
                    
                    // Animation thanh tiến trình
                    setTimeout(() => {
                        if(vipFill) vipFill.style.width = `${progressPercent}%`;
                    }, 100);
                    
                    // Format tiền: 1.500.000 => 1.5tr, 500.000 => 500k
                    const formatMoney = (n) => {
                        if (n >= 1000000) return (n/1000000).toFixed(1).replace('.0','') + 'tr';
                        if (n >= 1000) return (n/1000).toFixed(0) + 'k';
                        return n;
                    };
                    
                    if(vipCurrent) vipCurrent.textContent = formatMoney(currentDeposit);
                    if(vipTarget) vipTarget.textContent = formatMoney(threshold) + ' (VIP)';
                }
            }
        }
    } catch (e) {
        console.error("Lỗi cập nhật VIP:", e);
    }
}