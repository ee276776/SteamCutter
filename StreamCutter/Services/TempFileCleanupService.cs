using StreamCutter.Services;

namespace StreamCutter.Services
{
    public class TempFileCleanupService : BackgroundService
    {
        private readonly IServiceProvider _serviceProvider;
        private readonly ILogger<TempFileCleanupService> _logger;
        private readonly TimeSpan _cleanupInterval = TimeSpan.FromMinutes(30); // 每30分鐘清理一次

        public TempFileCleanupService(IServiceProvider serviceProvider, ILogger<TempFileCleanupService> logger)
        {
            _serviceProvider = serviceProvider;
            _logger = logger;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("暫存檔案清理服務已啟動");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var mediaService = scope.ServiceProvider.GetRequiredService<IMediaProcessingService>();
                    
                    await mediaService.CleanupTempFilesAsync();
                    
                    _logger.LogInformation("定期暫存檔案清理完成");
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "定期清理暫存檔案時發生錯誤");
                }

                await Task.Delay(_cleanupInterval, stoppingToken);
            }
        }
    }
}
