using StreamCutter.Models;

namespace StreamCutter.Services
{
    public interface IMediaProcessingService
    {
        Task<CutMediaResult> CutMediaAsync(CutMediaRequest request);
        Task CleanupTempFilesAsync();
        bool ValidateFileType(IFormFile file);
        bool ValidateFileSize(IFormFile file);
    }
}
