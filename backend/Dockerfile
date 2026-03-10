FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Baca.Api.sln Directory.Build.props ./
COPY Baca.Api/Baca.Api.csproj Baca.Api/
RUN dotnet restore Baca.Api/Baca.Api.csproj

COPY Baca.Api/ Baca.Api/
RUN dotnet publish Baca.Api/Baca.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libgssapi-krb5-2 \
    libasound2t64 \
    libssl3t64 \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
EXPOSE 8080
ENV ASPNETCORE_URLS=http://+:8080

COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "Baca.Api.dll"]
