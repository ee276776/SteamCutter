# Dockerfile
FROM mcr.microsoft.com/dotnet/aspnet:7.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

# 安裝 FFmpeg
RUN apt-get update && \
    apt-get install -y ffmpeg && \
    rm -rf /var/lib/apt/lists/*

# 建立暫存目錄
RUN mkdir -p /app/temp

FROM mcr.microsoft.com/dotnet/sdk:7.0 AS build
WORKDIR /src
COPY ["StreamCutter.csproj", "."]
RUN dotnet restore "./StreamCutter.csproj"
COPY . .
WORKDIR "/src/."
RUN dotnet build "StreamCutter.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "StreamCutter.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .

# 設定權限
RUN chmod 755 /app/temp

ENTRYPOINT ["dotnet", "StreamCutter.dll"]
