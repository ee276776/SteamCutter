using Microsoft.Extensions.Options;
using StreamCutter.Models;
using System.Diagnostics;
using System.Globalization;

namespace StreamCutter.Services
{
    public class MediaProcessingService : IMediaProcessingService
    {
        private readonly StreamCutterConfig _config;
        private readonly ILogger<MediaProcessingService> _logger;
        private readonly string _tempDirectory;

        public MediaProcessingService(IOptions<StreamCutterConfig> config, ILogger<MediaProcessingService> logger)
        {
            _config = config.Value;
            _logger = logger;
            _tempDirectory = Path.IsPathRooted(_config.TempDirectory) 
                ? _config.TempDirectory 
                : Path.Combine(Directory.GetCurrentDirectory(), _config.TempDirectory);
            
            // 確保暫存目錄存在
            if (!Directory.Exists(_tempDirectory))
            {
                Directory.CreateDirectory(_tempDirectory);
                _logger.LogInformation($"建立暫存目錄: {_tempDirectory}");
            }

            // 檢查 FFmpeg 是否可用
            CheckFFmpegAvailability();
        }

        private void CheckFFmpegAvailability()
        {
            try
            {
                // 如果是完整路徑，檢查檔案是否存在
                if (Path.IsPathRooted(_config.FFmpegPath))
                {
                    if (File.Exists(_config.FFmpegPath))
                    {
                        _logger.LogInformation($"FFmpeg 路徑確認: {_config.FFmpegPath}");
                    }
                    else
                    {
                        _logger.LogWarning($"FFmpeg 路徑不存在: {_config.FFmpegPath}");
                    }
                }
                else
                {
                    // 如果是命令名稱（如 "ffmpeg"），嘗試執行版本檢查
                    try
                    {
                        var processInfo = new ProcessStartInfo
                        {
                            FileName = _config.FFmpegPath,
                            Arguments = "-version",
                            UseShellExecute = false,
                            RedirectStandardOutput = true,
                            RedirectStandardError = true,
                            CreateNoWindow = true
                        };

                        using var process = Process.Start(processInfo);
                        if (process != null)
                        {
                            process.WaitForExit(5000); // 5 秒timeout
                            if (process.ExitCode == 0)
                            {
                                _logger.LogInformation($"FFmpeg 可用，命令: {_config.FFmpegPath}");
                            }
                            else
                            {
                                _logger.LogWarning($"FFmpeg 命令執行失敗: {_config.FFmpegPath}");
                            }
                        }
                    }
                    catch
                    {
                        _logger.LogWarning($"無法執行 FFmpeg 命令: {_config.FFmpegPath}");
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"檢查 FFmpeg 可用性時發生錯誤: {_config.FFmpegPath}");
            }
        }

        public async Task<CutMediaResult> CutMediaAsync(CutMediaRequest request)
        {
            try
            {
                // 驗證檔案
                if (!ValidateFileType(request.File))
                {
                    return new CutMediaResult
                    {
                        Success = false,
                        Message = "不支援的檔案格式"
                    };
                }

                if (!ValidateFileSize(request.File))
                {
                    return new CutMediaResult
                    {
                        Success = false,
                        Message = $"檔案大小超過 {_config.MaxFileSizeMB}MB 限制"
                    };
                }

                // 驗證時間參數
                if (request.StartTime < 0 || request.EndTime <= request.StartTime)
                {
                    return new CutMediaResult
                    {
                        Success = false,
                        Message = "無效的時間範圍"
                    };
                }

                // 生成檔案名稱
                var originalFileName = Path.GetFileNameWithoutExtension(request.File.FileName);
                var fileExtension = Path.GetExtension(request.File.FileName);
                var timestamp = DateTime.Now.ToString("yyyyMMddHHmm");
                var inputFileName = $"{Guid.NewGuid()}{fileExtension}";
                var outputFileName = $"{originalFileName}_{timestamp}{fileExtension}";
                
                var inputFilePath = Path.Combine(_tempDirectory, inputFileName);
                var outputFilePath = Path.Combine(_tempDirectory, outputFileName);

                // 儲存上傳的檔案
                using (var stream = new FileStream(inputFilePath, FileMode.Create))
                {
                    await request.File.CopyToAsync(stream);
                }

                _logger.LogInformation($"檔案已儲存至: {inputFilePath}");

                // 使用 FFmpeg 切割檔案
                var success = await ExecuteFFmpegCutAsync(inputFilePath, outputFilePath, request.StartTime, request.EndTime);

                if (success && File.Exists(outputFilePath))
                {
                    // 刪除輸入檔案
                    if (File.Exists(inputFilePath))
                    {
                        File.Delete(inputFilePath);
                    }

                    return new CutMediaResult
                    {
                        Success = true,
                        Message = "檔案切割成功",
                        FilePath = outputFilePath,
                        FileName = outputFileName
                    };
                }
                else
                {
                    // 清理檔案
                    if (File.Exists(inputFilePath)) File.Delete(inputFilePath);
                    if (File.Exists(outputFilePath)) File.Delete(outputFilePath);

                    return new CutMediaResult
                    {
                        Success = false,
                        Message = "檔案切割失敗"
                    };
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "切割檔案時發生錯誤");
                return new CutMediaResult
                {
                    Success = false,
                    Message = "處理檔案時發生錯誤"
                };
            }
        }

        private async Task<bool> ExecuteFFmpegCutAsync(string inputPath, string outputPath, double startTime, double endTime)
        {
            try
            {
                var duration = endTime - startTime;
                
                // 格式化時間為 FFmpeg 格式 (HH:MM:SS.fff)
                var startTimeFormatted = TimeSpan.FromSeconds(startTime).ToString(@"hh\:mm\:ss\.fff");
                var durationFormatted = TimeSpan.FromSeconds(duration).ToString(@"hh\:mm\:ss\.fff");

                // FFmpeg 命令 - 使用 -c copy 來避免重新編碼，加快處理速度
                var arguments = $"-i \"{inputPath}\" -ss {startTimeFormatted} -t {durationFormatted} -c copy -avoid_negative_ts make_zero \"{outputPath}\"";

                _logger.LogInformation($"執行 FFmpeg: {_config.FFmpegPath}");
                _logger.LogInformation($"參數: {arguments}");

                using var process = new Process();
                process.StartInfo.FileName = _config.FFmpegPath;
                process.StartInfo.Arguments = arguments;
                process.StartInfo.UseShellExecute = false;
                process.StartInfo.RedirectStandardOutput = true;
                process.StartInfo.RedirectStandardError = true;
                process.StartInfo.CreateNoWindow = true;

                var output = new List<string>();
                var errors = new List<string>();

                process.OutputDataReceived += (sender, e) =>
                {
                    if (!string.IsNullOrEmpty(e.Data))
                    {
                        output.Add(e.Data);
                        _logger.LogDebug($"FFmpeg Output: {e.Data}");
                    }
                };

                process.ErrorDataReceived += (sender, e) =>
                {
                    if (!string.IsNullOrEmpty(e.Data))
                    {
                        errors.Add(e.Data);
                        _logger.LogDebug($"FFmpeg Error: {e.Data}");
                    }
                };

                process.Start();
                process.BeginOutputReadLine();
                process.BeginErrorReadLine();

                // 設定超時
                var timeoutTask = Task.Delay(TimeSpan.FromMinutes(_config.TimeoutMinutes));
                var processTask = process.WaitForExitAsync();

                var completedTask = await Task.WhenAny(processTask, timeoutTask);

                if (completedTask == timeoutTask)
                {
                    _logger.LogError("FFmpeg 執行超時");
                    try
                    {
                        process.Kill();
                    }
                    catch (Exception killEx)
                    {
                        _logger.LogError(killEx, "終止 FFmpeg 程序時發生錯誤");
                    }
                    return false;
                }

                if (process.ExitCode == 0)
                {
                    _logger.LogInformation("FFmpeg 執行成功");
                    _logger.LogInformation($"輸出檔案: {outputPath}");
                    
                    // 檢查輸出檔案是否存在且有內容
                    if (File.Exists(outputPath) && new FileInfo(outputPath).Length > 0)
                    {
                        return true;
                    }
                    else
                    {
                        _logger.LogError("輸出檔案不存在或為空");
                        return false;
                    }
                }
                else
                {
                    _logger.LogError($"FFmpeg 執行失敗，退出代碼: {process.ExitCode}");
                    _logger.LogError($"錯誤輸出: {string.Join(Environment.NewLine, errors)}");
                    return false;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "執行 FFmpeg 時發生錯誤");
                return false;
            }
        }

        public bool ValidateFileType(IFormFile file)
        {
            if (file == null) return false;
            
            return _config.AllowedFileTypes.Contains(file.ContentType) ||
                   _config.AllowedFileTypes.Any(type => file.FileName.ToLower().EndsWith(type.Split('/')[1]));
        }

        public bool ValidateFileSize(IFormFile file)
        {
            if (file == null) return false;
            
            var maxSizeInBytes = _config.MaxFileSizeMB * 1024 * 1024;
            return file.Length <= maxSizeInBytes;
        }

        public async Task CleanupTempFilesAsync()
        {
            await Task.Run(() =>
            {
                try
                {
                    if (!Directory.Exists(_tempDirectory)) return;

                    var files = Directory.GetFiles(_tempDirectory);
                    var cutoffTime = DateTime.Now.AddHours(-1); // 清理1小時前的檔案

                    foreach (var file in files)
                    {
                        var fileInfo = new FileInfo(file);
                        if (fileInfo.CreationTime < cutoffTime)
                        {
                            File.Delete(file);
                            _logger.LogInformation($"已清理暫存檔案: {file}");
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "清理暫存檔案時發生錯誤");
                }
            });
        }
    }
}
