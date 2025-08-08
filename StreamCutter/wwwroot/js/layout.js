// layout.js - 全域 Layout 功能

document.addEventListener('DOMContentLoaded', function () {
    console.log('StreamCutter Layout Loaded');

    // 全域工具函數
    window.StreamCutterUtils = {
        // 格式化時間顯示 (秒數轉換為 HH:MM:SS)
        formatTime: function (seconds) {
            if (isNaN(seconds) || seconds < 0) return '00:00:00';

            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);

            return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        },

        // 解析時間字串為秒數
        parseTime: function (timeString) {
            const parts = timeString.split(':').reverse();
            let seconds = 0;

            if (parts[0]) seconds += parseInt(parts[0]) || 0; // 秒
            if (parts[1]) seconds += (parseInt(parts[1]) || 0) * 60; // 分
            if (parts[2]) seconds += (parseInt(parts[2]) || 0) * 3600; // 時

            return seconds;
        },

        // 格式化檔案大小
        formatFileSize: function (bytes) {
            if (bytes === 0) return '0 Bytes';

            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));

            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        },

        // 顯示通知訊息
        showNotification: function (message, type = 'info') {
            // 移除現有通知
            const existingNotifications = document.querySelectorAll('.notification');
            existingNotifications.forEach(notification => notification.remove());

            // 創建新通知
            const notification = document.createElement('div');
            notification.className = `notification notification-${type}`;
            notification.innerHTML = `
                <div class="notification-content">
                    <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
                    <span>${message}</span>
                </div>
            `;

            // 添加樣式
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'success' ? '#4ecdc4' : type === 'error' ? '#ff6b6b' : '#667eea'};
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 10px;
                box-shadow: 0 10px 25px rgba(0,0,0,0.1);
                z-index: 1000;
                animation: slideInRight 0.3s ease-out;
                max-width: 300px;
            `;

            document.body.appendChild(notification);

            // 自動移除
            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.3s ease-in';
                setTimeout(() => notification.remove(), 300);
            }, 3000);
        },

        // 驗證檔案類型
        validateFileType: function (file) {
            const validTypes = [
                'audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/aac', 'audio/ogg',
                'video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/webm'
            ];

            return validTypes.some(type =>
                file.type === type ||
                file.type.includes(type.split('/')[1]) ||
                file.name.toLowerCase().includes(type.split('/')[1])
            );
        }
    };

    // 添加通知動畫樣式到頁面
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes slideOutRight {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(100%);
                opacity: 0;
            }
        }
        
        .notification-content {
            display: flex;
            align-items: center;
            gap: 10px;
        }
    `;
    document.head.appendChild(style);
});