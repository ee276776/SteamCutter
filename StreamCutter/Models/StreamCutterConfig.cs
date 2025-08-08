namespace StreamCutter.Models
{
    public class StreamCutterConfig
    {
        public string FFmpegPath { get; set; } = "ffmpeg";
        public string TempDirectory { get; set; } = "temp";
        public int MaxFileSizeMB { get; set; } = 100;
        public int TimeoutMinutes { get; set; } = 10;
        public int CleanupIntervalMinutes { get; set; } = 30;
        public List<string> AllowedFileTypes { get; set; } = new();
    }
}
