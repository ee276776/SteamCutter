// index.js - Index 頁面功能

class StreamCutter {
    constructor() {
        this.currentFile = null;
        this.mediaElement = null;
        this.duration = 0;
        this.startTime = 0;
        this.endTime = 0;
        this.isDragging = false;
        this.currentHandle = null;

        this.initializeElements();
        this.bindEvents();
    }

    initializeElements() {
        // 主要區域
        this.uploadArea = document.getElementById('upload-area');
        this.fileInput = document.getElementById('file-input');
        this.uploadSection = document.getElementById('upload-section');
        this.processingSection = document.getElementById('processing-section');
        this.loadingSection = document.getElementById('loading');

        // 檔案資訊
        this.fileDetails = document.getElementById('file-details');
        this.audioPlayer = document.getElementById('audio-player');
        this.videoPlayer = document.getElementById('video-player');

        // 時間軸元素
        this.timelineTrack = document.getElementById('timeline-track');
        this.timelineProgress = document.getElementById('timeline-progress');
        this.startHandle = document.getElementById('start-handle');
        this.endHandle = document.getElementById('end-handle');
        this.startTimeInput = document.getElementById('start-time');
        this.endTimeInput = document.getElementById('end-time');
        this.totalDurationSpan = document.getElementById('total-duration');

        // 按鈕
        this.previewBtn = document.getElementById('preview-btn');
        this.cutBtn = document.getElementById('cut-btn');
        this.resetBtn = document.getElementById('reset-btn');
    }

    bindEvents() {
        // 檔案上傳事件
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));

        // 拖拽上傳
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

        // 時間軸事件
        this.initializeTimelineHandles();

        // 按鈕事件
        this.previewBtn.addEventListener('click', () => this.previewSegment());
        this.cutBtn.addEventListener('click', () => this.cutMedia());
        this.resetBtn.addEventListener('click', () => this.reset());
    }

    // 拖拽處理
    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    // 檔案處理
    processFile(file) {
        // 驗證檔案
        if (!StreamCutterUtils.validateFileType(file)) {
            StreamCutterUtils.showNotification('請選擇支援的音訊或影片檔案格式', 'error');
            return;
        }

        // 檔案大小限制 (100MB)
        if (file.size > 100 * 1024 * 1024) {
            StreamCutterUtils.showNotification('檔案大小不能超過 100MB', 'error');
            return;
        }

        this.currentFile = file;
        this.showLoading();

        // 模擬檔案上傳和處理
        setTimeout(() => {
            this.displayFileInfo(file);
            this.setupMediaPlayer(file);
            this.hideLoading();
            this.showProcessingSection();
            StreamCutterUtils.showNotification('檔案載入成功！', 'success');
        }, 1500);
    }

    displayFileInfo(file) {
        const fileSize = StreamCutterUtils.formatFileSize(file.size);
        const fileType = file.type.startsWith('audio') ? '音訊檔案' : '影片檔案';

        this.fileDetails.innerHTML = `
            <p><strong>檔案名稱:</strong> ${file.name}</p>
            <p><strong>檔案類型:</strong> ${fileType}</p>
            <p><strong>檔案大小:</strong> ${fileSize}</p>
            <p><strong>上傳時間:</strong> ${new Date().toLocaleString()}</p>
        `;
    }

    setupMediaPlayer(file) {
        const url = URL.createObjectURL(file);
        const isVideo = file.type.startsWith('video');

        if (isVideo) {
            this.mediaElement = this.videoPlayer;
            this.videoPlayer.src = url;
            this.videoPlayer.style.display = 'block';
            this.audioPlayer.style.display = 'none';
        } else {
            this.mediaElement = this.audioPlayer;
            this.audioPlayer.src = url;
            this.audioPlayer.style.display = 'block';
            this.videoPlayer.style.display = 'none';
        }

        // 當媒體載入完成時
        this.mediaElement.addEventListener('loadedmetadata', () => {
            this.duration = this.mediaElement.duration;
            this.startTime = 0;
            this.endTime = this.duration;
            this.updateTimeDisplay();
            this.updateHandlePositions();
        });

        // 播放時更新進度
        this.mediaElement.addEventListener('timeupdate', () => {
            this.updateProgress();
        });
    }

    // 時間軸拖拽功能
    initializeTimelineHandles() {
        // 開始拖拽
        const startDrag = (e, handle) => {
            this.isDragging = true;
            this.currentHandle = handle;

            document.addEventListener('mousemove', this.handleDrag.bind(this));
            document.addEventListener('mouseup', this.stopDrag.bind(this));

            e.preventDefault();
        };

        // 綁定拖拽事件
        this.startHandle.addEventListener('mousedown', (e) => startDrag(e, 'start'));
        this.endHandle.addEventListener('mousedown', (e) => startDrag(e, 'end'));

        // 點擊軌道設置位置
        this.timelineTrack.addEventListener('click', (e) => {
            if (this.isDragging) return;

            const rect = this.timelineTrack.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = Math.max(0, Math.min(1, clickX / rect.width));
            const time = percentage * this.duration;

            // 判斷點擊位置更靠近哪個控制點
            const startPos = (this.startTime / this.duration) * rect.width;
            const endPos = (this.endTime / this.duration) * rect.width;

            if (Math.abs(clickX - startPos) < Math.abs(clickX - endPos)) {
                this.startTime = Math.max(0, Math.min(time, this.endTime - 1));
            } else {
                this.endTime = Math.max(this.startTime + 1, Math.min(time, this.duration));
            }

            this.updateTimeDisplay();
            this.updateHandlePositions();
        });
    }

    handleDrag(e) {
        if (!this.isDragging || !this.currentHandle || !this.duration) return;

        const rect = this.timelineTrack.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const time = percentage * this.duration;

        if (this.currentHandle === 'start') {
            this.startTime = Math.max(0, Math.min(time, this.endTime - 1));
        } else {
            this.endTime = Math.max(this.startTime + 1, Math.min(time, this.duration));
        }

        this.updateTimeDisplay();
        this.updateHandlePositions();
    }

    stopDrag() {
        this.isDragging = false;
        this.currentHandle = null;
        document.removeEventListener('mousemove', this.handleDrag);
        document.removeEventListener('mouseup', this.stopDrag);
    }

    // 更新顯示
    updateTimeDisplay() {
        if (!this.duration) return;

        this.startTimeInput.value = StreamCutterUtils.formatTime(this.startTime);
        this.endTimeInput.value = StreamCutterUtils.formatTime(this.endTime);
        this.totalDurationSpan.textContent = StreamCutterUtils.formatTime(this.duration);
    }

    updateHandlePositions() {
        if (!this.duration) return;

        // 計算百分比，確保在 0-100% 範圍內
        const startPercentage = Math.max(0, Math.min(100, (this.startTime / this.duration) * 100));
        const endPercentage = Math.max(0, Math.min(100, (this.endTime / this.duration) * 100));

        // 因為使用了 translateX(-50%)，handle 會以中心點定位
        // 這樣可以確保 handle 不會超出 track 邊界
        this.startHandle.style.left = `${startPercentage}%`;
        this.endHandle.style.left = `${endPercentage}%`;

        // 更新選取區間的視覺效果
        this.timelineProgress.style.left = `${startPercentage}%`;
        this.timelineProgress.style.width = `${Math.max(0, endPercentage - startPercentage)}%`;
    }

    updateProgress() {
        if (!this.mediaElement || !this.duration) return;

        const currentTime = this.mediaElement.currentTime;
        const progressPercentage = (currentTime / this.duration) * 100;
        
        // 可以在這裡添加播放進度的視覺指示器
    }

    // 預覽片段
    previewSegment() {
        if (!this.mediaElement) {
            StreamCutterUtils.showNotification('請先上傳檔案', 'error');
            return;
        }

        // 設置播放範圍
        this.mediaElement.currentTime = this.startTime;
        this.mediaElement.play();

        // 在結束時間停止播放
        const checkTime = () => {
            if (this.mediaElement.currentTime >= this.endTime) {
                this.mediaElement.pause();
                StreamCutterUtils.showNotification('預覽完成', 'info');
            } else {
                requestAnimationFrame(checkTime);
            }
        };

        requestAnimationFrame(checkTime);
        StreamCutterUtils.showNotification('開始預覽選取片段', 'info');
    }

    // 切割媒體
    async cutMedia() {
        if (!this.currentFile) {
            StreamCutterUtils.showNotification('請先上傳檔案', 'error');
            return;
        }

        const duration = this.endTime - this.startTime;
        if (duration < 1) {
            StreamCutterUtils.showNotification('切割片段至少需要1秒', 'error');
            return;
        }

        this.showLoading();
        StreamCutterUtils.showNotification('正在處理檔案，請稍候...', 'info');

        try {
            // 創建 FormData 並上傳檔案
            const formData = new FormData();
            formData.append('file', this.currentFile);
            formData.append('startTime', this.startTime.toString());
            formData.append('endTime', this.endTime.toString());

            // 發送到後端處理
            const response = await fetch('/api/cut', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                // 獲取檔案名稱從 response headers 或使用預設名稱
                const contentDisposition = response.headers.get('content-disposition');
                let fileName = `cut_${this.currentFile.name}`;
                
                if (contentDisposition) {
                    const fileNameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
                    if (fileNameMatch && fileNameMatch[1]) {
                        fileName = fileNameMatch[1].replace(/['"]/g, '');
                    }
                }

                // 獲取處理後的檔案
                const blob = await response.blob();
                
                // 隱藏載入狀態（會自動顯示處理區域）
                this.hideLoading();
                
                // 創建下載連結
                const downloadUrl = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = fileName;
                link.style.display = 'none';
                document.body.appendChild(link);
                
                // 觸發下載
                link.click();
                
                // 清理
                document.body.removeChild(link);
                setTimeout(() => {
                    URL.revokeObjectURL(downloadUrl);
                }, 100);
                
                // 顯示成功訊息
                StreamCutterUtils.showNotification('檔案切割完成，正在下載！', 'success');
                
            } else {
                // 處理錯誤響應
                this.hideLoading();
                
                let errorMessage = '切割處理失敗';
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.message || errorMessage;
                } catch {
                    errorMessage = await response.text() || errorMessage;
                }
                throw new Error(errorMessage);
            }
        } catch (error) {
            console.error('切割錯誤:', error);
            StreamCutterUtils.showNotification(`切割處理失敗：${error.message}`, 'error');
            // 發生錯誤時也隱藏載入狀態（會自動顯示處理區域）
            this.hideLoading();
        }
    }

    // 重置
    reset() {
        // 清理媒體元素
        if (this.mediaElement) {
            this.mediaElement.pause();
            this.mediaElement.src = '';
        }

        // 重置變數
        this.currentFile = null;
        this.mediaElement = null;
        this.duration = 0;
        this.startTime = 0;
        this.endTime = 0;

        // 重置 UI
        this.fileInput.value = '';
        this.audioPlayer.style.display = 'none';
        this.videoPlayer.style.display = 'none';
        this.fileDetails.innerHTML = '';

        // 顯示上傳區域
        this.hideLoading();
        this.hideProcessingSection();
        this.showUploadSection();

        StreamCutterUtils.showNotification('已重置，可以上傳新檔案', 'info');
    }

    // UI 狀態管理
    showLoading() {
        this.loadingSection.style.display = 'block';
        this.uploadSection.style.display = 'none';
        this.processingSection.style.display = 'none';
    }

    hideLoading() {
        this.loadingSection.style.display = 'none';
        // 如果有檔案，顯示處理區域；否則顯示上傳區域
        if (this.currentFile) {
            this.showProcessingSection();
        } else {
            this.showUploadSection();
        }
    }

    showUploadSection() {
        this.uploadSection.style.display = 'block';
        this.processingSection.style.display = 'none';
    }

    showProcessingSection() {
        this.uploadSection.style.display = 'none';
        this.processingSection.style.display = 'block';
    }

    hideProcessingSection() {
        this.processingSection.style.display = 'none';
    }
}

// StreamCutter 工具類別
class StreamCutterUtils {
    // 驗證檔案類型
    static validateFileType(file) {
        const validAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/mp4', 'audio/ogg'];
        const validVideoTypes = ['video/mp4', 'video/avi', 'video/quicktime', 'video/x-msvideo', 'video/webm'];
        const allValidTypes = [...validAudioTypes, ...validVideoTypes];
        
        return allValidTypes.some(type => file.type === type || file.name.toLowerCase().includes(type.split('/')[1]));
    }

    // 格式化檔案大小
    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // 格式化時間 (秒轉 HH:MM:SS)
    static formatTime(seconds) {
        if (!seconds || seconds < 0) return '00:00:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        return [hours, minutes, secs]
            .map(val => val.toString().padStart(2, '0'))
            .join(':');
    }

    // 顯示通知訊息
    static showNotification(message, type = 'info') {
        // 移除現有通知
        const existingNotification = document.querySelector('.notification');
        if (existingNotification) {
            existingNotification.remove();
        }

        // 創建新通知
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">
                    ${type === 'success' ? '✓' : type === 'error' ? '✗' : type === 'warning' ? '⚠' : 'ℹ'}
                </span>
                <span class="notification-message">${message}</span>
                <button class="notification-close" onclick="this.parentElement.parentElement.remove()">×</button>
            </div>
        `;

        // 添加樣式
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : type === 'warning' ? '#fff3cd' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : type === 'warning' ? '#856404' : '#0c5460'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : type === 'warning' ? '#ffeaa7' : '#bee5eb'};
            border-radius: 8px;
            padding: 12px;
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            min-width: 300px;
        `;

        // 添加到頁面
        document.body.appendChild(notification);

        // 自動移除
        setTimeout(() => {
            if (notification.parentElement) {
                notification.style.animation = 'slideOutRight 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
}

// 頁面載入完成後初始化
document.addEventListener('DOMContentLoaded', function() {
    window.streamCutter = new StreamCutter();
    
    // 添加通知動畫樣式
    if (!document.querySelector('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
            @keyframes slideOutRight {
                from { transform: translateX(0); opacity: 1; }
                to { transform: translateX(100%); opacity: 0; }
            }
            .notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .notification-icon {
                font-weight: bold;
                font-size: 16px;
            }
            .notification-message {
                flex: 1;
            }
            .notification-close {
                background: none;
                border: none;
                font-size: 18px;
                cursor: pointer;
                opacity: 0.7;
                padding: 0;
                margin-left: 10px;
            }
            .notification-close:hover {
                opacity: 1;
            }
        `;
        document.head.appendChild(style);
    }
});