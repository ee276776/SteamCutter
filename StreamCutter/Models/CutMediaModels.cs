namespace StreamCutter.Models
{
    public class CutMediaRequest
    {
        public IFormFile File { get; set; } = null!;
        public double StartTime { get; set; }
        public double EndTime { get; set; }
    }

    public class CutMediaResult
    {
        public bool Success { get; set; }
        public string? Message { get; set; }
        public string? FilePath { get; set; }
        public string? FileName { get; set; }
    }
}
