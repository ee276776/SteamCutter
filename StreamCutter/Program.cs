using StreamCutter.Models;
using StreamCutter.Services;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddControllersWithViews();

// 配置 StreamCutter 設定
builder.Services.Configure<StreamCutterConfig>(
    builder.Configuration.GetSection("StreamCutter"));

// 註冊服務
builder.Services.AddScoped<IMediaProcessingService, MediaProcessingService>();
builder.Services.AddHostedService<TempFileCleanupService>();

// 配置檔案上傳大小限制
builder.Services.Configure<IISServerOptions>(options =>
{
    options.MaxRequestBodySize = 100 * 1024 * 1024; // 100MB
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Home/Error");
    // The default HSTS value is 30 days. You may want to change this for production scenarios, see https://aka.ms/aspnetcore-hsts.
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();

app.UseRouting();

app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

// 啟動時清理舊的暫存檔案
using (var scope = app.Services.CreateScope())
{
    var mediaService = scope.ServiceProvider.GetRequiredService<IMediaProcessingService>();
    await mediaService.CleanupTempFilesAsync();
}

app.Run();
