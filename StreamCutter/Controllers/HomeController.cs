using Microsoft.AspNetCore.Mvc;
using StreamCutter.Models;
using StreamCutter.Services;
using System.Diagnostics;

namespace StreamCutter.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;
        private readonly IMediaProcessingService _mediaProcessingService;

        public HomeController(ILogger<HomeController> logger, IMediaProcessingService mediaProcessingService)
        {
            _logger = logger;
            _mediaProcessingService = mediaProcessingService;
        }

        public IActionResult Index()
        {
            return View();
        }

        [HttpPost]
        [Route("api/cut")]
        public async Task<IActionResult> CutMedia([FromForm] CutMediaRequest request)
        {
            try
            {
                // 基本驗證
                if (request.File == null || request.File.Length == 0)
                {
                    return BadRequest(new { message = "請選擇要上傳的檔案" });
                }

                if (request.StartTime < 0 || request.EndTime <= request.StartTime)
                {
                    return BadRequest(new { message = "無效的時間範圍" });
                }

                _logger.LogInformation($"開始處理檔案: {request.File.FileName}, 切割範圍: {request.StartTime:F2}s - {request.EndTime:F2}s");

                // 使用服務處理檔案
                var result = await _mediaProcessingService.CutMediaAsync(request);

                if (result.Success && !string.IsNullOrEmpty(result.FilePath))
                {
                    // 讀取處理後的檔案
                    var fileBytes = await System.IO.File.ReadAllBytesAsync(result.FilePath);
                    
                    // 設定 Content-Type
                    var contentType = GetContentType(result.FileName!);
                    
                    // 刪除暫存檔案
                    if (System.IO.File.Exists(result.FilePath))
                    {
                        System.IO.File.Delete(result.FilePath);
                    }

                    _logger.LogInformation($"檔案處理完成: {result.FileName}");

                    // 設定正確的 headers 供下載
                    Response.Headers["Content-Disposition"] = $"attachment; filename=\"{result.FileName}\"";
                    
                    // 返回檔案供下載
                    return File(fileBytes, contentType, result.FileName);
                }
                else
                {
                    _logger.LogError($"檔案處理失敗: {result.Message}");
                    return BadRequest(new { message = result.Message ?? "檔案處理失敗" });
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "處理檔案時發生未預期的錯誤");
                return StatusCode(500, new { message = "伺服器內部錯誤，請稍後重試" });
            }
        }

        [HttpPost]
        [Route("api/cleanup")]
        public async Task<IActionResult> CleanupTempFiles()
        {
            try
            {
                await _mediaProcessingService.CleanupTempFilesAsync();
                return Ok(new { message = "暫存檔案清理完成" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "清理暫存檔案時發生錯誤");
                return StatusCode(500, new { message = "清理暫存檔案失敗" });
            }
        }

        private string GetContentType(string fileName)
        {
            var extension = Path.GetExtension(fileName).ToLowerInvariant();
            return extension switch
            {
                ".mp3" => "audio/mpeg",
                ".wav" => "audio/wav",
                ".mp4" => "video/mp4",
                ".avi" => "video/x-msvideo",
                ".mov" => "video/quicktime",
                ".webm" => "video/webm",
                ".ogg" => "audio/ogg",
                _ => "application/octet-stream"
            };
        }

        [ResponseCache(Duration = 0, Location = ResponseCacheLocation.None, NoStore = true)]
        public IActionResult Error()
        {
            return View(new ErrorViewModel { RequestId = Activity.Current?.Id ?? HttpContext.TraceIdentifier });
        }
    }
}
