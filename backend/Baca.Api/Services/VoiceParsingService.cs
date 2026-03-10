using System.Globalization;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Baca.Api.Data;
using Baca.Api.DTOs;
using Baca.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Baca.Api.Services;

public sealed partial class VoiceParsingService(
    BacaDbContext dbContext,
    HttpClient httpClient,
    IConfiguration configuration,
    TimeProvider timeProvider,
    ILogger<VoiceParsingService> logger) : IVoiceParsingService
{
    private const string AnthropicVersion = "2023-06-01";

    private static readonly JsonSerializerOptions SerializerOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private const string SystemPrompt =
        """
        Jsi asistent pro parsování hlasově zadaných úkolů v českém jazyce.
        Dostaneš přepis hlasového vstupu a seznam existujících uživatelů a kategorií.
        Tvým úkolem je extrahovat strukturovaná data pro vytvoření úkolu.

        Pravidla:
        - Title: stručný, akční popis úkolu (max 100 znaků). Odstraň zbytečná slova.
        - Assignee: porovnej jméno z přepisu se seznamem uživatelů. Fuzzy match
          (Honzík → Honza, Peťa → Petr). Pokud nenajdeš shodu, nech null.
        - Category: porovnej s existujícími kategoriemi. Klíčová slova:
          jídlo/vaření/kuchyň → Jídlo, lano/stan/materiál → Logistika, atd.
        - Priority: "urgentní/důležité/asap/hned" → High, "když bude čas/někdy/nice to have"
          → Low, jinak Medium.
        - DueDate: relativní výrazy ("do pátku", "příští týden", "do konce dubna")
          převeď na ISO datum. Dnešní datum dostaneš v kontextu.
        - Status: vždy "Open" pokud není řečeno jinak.
        - Description: cokoliv navíc co se nevešlo do title.

        Pro každé pole vrať confidence (0.0–1.0):
        - 1.0 = explicitně řečeno
        - 0.7–0.9 = odvozeno s vysokou jistotou
        - 0.3–0.6 = hádání, fuzzy match
        - 0.0 = nebylo zmíněno, default hodnota

        Odpověz POUZE validním JSON, bez dalšího textu.
        """;

    private const string BulkSystemPrompt =
        """
        Jsi asistent pro parsování textově zadaných úkolů v českém jazyce.
        Dostaneš textový vstup a seznam existujících uživatelů a kategorií.
        Tvým úkolem je extrahovat strukturovaná data pro vytvoření úkolů.

        Vstup může být: tabulka z Excelu, odrážkový seznam, poznámky z porady, nebo volný text.
        Vstup může obsahovat jeden nebo více úkolů — vrať JSON POLE objektů.

        Pravidla pro každý úkol:
        - Title: stručný, akční popis úkolu (max 100 znaků). Odstraň zbytečná slova.
        - Assignee: porovnej jméno z textu se seznamem uživatelů. Fuzzy match
          (Honzík → Honza, Peťa → Petr). Pokud nenajdeš shodu, nech null.
        - Category: porovnej s existujícími kategoriemi. Klíčová slova:
          jídlo/vaření/kuchyň → Jídlo, lano/stan/materiál → Logistika, atd.
        - Priority: "urgentní/důležité/asap/hned" → High, "když bude čas/někdy/nice to have"
          → Low, jinak Medium.
        - DueDate: relativní výrazy ("do pátku", "příští týden", "do konce dubna")
          převeď na ISO datum. Dnešní datum dostaneš v kontextu.
        - Status: vždy "Open" pokud není řečeno jinak.
        - Description: cokoliv navíc co se nevešlo do title.

        Pro každé pole vrať confidence (0.0–1.0):
        - 1.0 = explicitně řečeno
        - 0.7–0.9 = odvozeno s vysokou jistotou
        - 0.3–0.6 = hádání, fuzzy match
        - 0.0 = nebylo zmíněno, default hodnota

        Odpověz POUZE validním JSON POLEM objektů, bez dalšího textu.
        """;

    public async Task<VoiceParseResponse> ParseTranscriptionAsync(string transcription, CancellationToken ct = default)
    {
        LogParseStarted(transcription);

        var activeUsers = await dbContext.Users
            .AsNoTracking()
            .Where(user => user.IsActive)
            .OrderBy(user => user.Name)
            .Select(user => new LookupItem(user.Id, user.Name))
            .ToListAsync(ct);

        var categories = await dbContext.Categories
            .AsNoTracking()
            .OrderBy(category => category.SortOrder)
            .ThenBy(category => category.Name)
            .Select(category => new LookupItem(category.Id, category.Name))
            .ToListAsync(ct);

        LogContextLoaded(activeUsers.Count, categories.Count);

        var model = configuration["Anthropic:Model"] ?? configuration["Anthropic__Model"] ?? "claude-haiku-4-5-20251001";
        LogUsingModel(model);

        var payload = new AnthropicRequest(
            Model: model,
            MaxTokens: 500,
            System: SystemPrompt,
            Messages:
            [
                new AnthropicMessage(
                    "user",
                    BuildUserPrompt(transcription, activeUsers, categories))
            ]);

        var apiKey = GetAnthropicApiKey();
        LogApiKeyLoaded(apiKey.Length);

        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages")
        {
            Content = JsonContent.Create(payload, options: SerializerOptions)
        };
        request.Headers.Add("x-api-key", apiKey);
        request.Headers.Add("anthropic-version", AnthropicVersion);

        LogSendingToAnthropic();
        using var response = await httpClient.SendAsync(request, ct);
        LogAnthropicResponse((int)response.StatusCode);

        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            LogAnthropicError((int)response.StatusCode, errorBody);
            throw new InvalidOperationException(
                $"Anthropic API call failed with status {(int)response.StatusCode}: {errorBody}");
        }

        var responsePayload = await response.Content.ReadFromJsonAsync<AnthropicResponse>(SerializerOptions, ct);
        var textPayload = responsePayload?.Content
            .FirstOrDefault(block => string.Equals(block.Type, "text", StringComparison.OrdinalIgnoreCase))
            ?.Text;

        LogAnthropicRawResponse(textPayload);

        if (string.IsNullOrWhiteSpace(textPayload))
        {
            LogEmptyAnthropicResponse();
            return CreateFallbackResponse(transcription);
        }

        var parsedResponse = TryParseResponse(textPayload, transcription);
        var priorityText = parsedResponse.Priority?.ToString();
        LogParsedResult(parsedResponse.Title, parsedResponse.AssigneeName, parsedResponse.CategoryName, priorityText);
        ApplyLookupMatch(
            parsedResponse.AssigneeName,
            activeUsers,
            static (responseData, match) =>
            {
                responseData.AssigneeId = match?.Id;
                responseData.AssigneeConfidence = match is null
                    ? Math.Min(responseData.AssigneeConfidence ?? 0.3, 0.3)
                    : Math.Max(responseData.AssigneeConfidence ?? 0, match.Confidence);
            },
            parsedResponse);

        ApplyLookupMatch(
            parsedResponse.CategoryName,
            categories,
            static (responseData, match) =>
            {
                responseData.CategoryId = match?.Id;
                responseData.CategoryConfidence = match is null
                    ? Math.Min(responseData.CategoryConfidence ?? 0.3, 0.3)
                    : Math.Max(responseData.CategoryConfidence ?? 0, match.Confidence);
            },
            parsedResponse);

        parsedResponse.RawTranscription = transcription;
        parsedResponse.Status = parsedResponse.Status == 0 ? TaskItemStatus.Open : parsedResponse.Status;
        parsedResponse.Title = parsedResponse.Title?.Trim();
        if (parsedResponse.Title?.Length > 100)
        {
            parsedResponse.Title = parsedResponse.Title[..100];
        }

        return parsedResponse;
    }

    public async Task<BulkParseResponse> ParseBulkTextAsync(string text, CancellationToken ct = default)
    {
        var activeUsers = await dbContext.Users
            .AsNoTracking()
            .Where(user => user.IsActive)
            .OrderBy(user => user.Name)
            .Select(user => new LookupItem(user.Id, user.Name))
            .ToListAsync(ct);

        var categories = await dbContext.Categories
            .AsNoTracking()
            .OrderBy(category => category.SortOrder)
            .ThenBy(category => category.Name)
            .Select(category => new LookupItem(category.Id, category.Name))
            .ToListAsync(ct);

        var payload = new AnthropicRequest(
            Model: configuration["Anthropic:Model"] ?? configuration["Anthropic__Model"] ?? "claude-haiku-4-5-20251001",
            MaxTokens: 4000,
            System: BulkSystemPrompt,
            Messages:
            [
                new AnthropicMessage(
                    "user",
                    BuildBulkUserPrompt(text, activeUsers, categories))
            ]);

        var apiKey = GetAnthropicApiKey();
        using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.anthropic.com/v1/messages")
        {
            Content = JsonContent.Create(payload, options: SerializerOptions)
        };
        request.Headers.Add("x-api-key", apiKey);
        request.Headers.Add("anthropic-version", AnthropicVersion);

        using var response = await httpClient.SendAsync(request, ct);
        if (!response.IsSuccessStatusCode)
        {
            var errorBody = await response.Content.ReadAsStringAsync(ct);
            throw new InvalidOperationException(
                $"Anthropic API call failed with status {(int)response.StatusCode}: {errorBody}");
        }

        var responsePayload = await response.Content.ReadFromJsonAsync<AnthropicResponse>(SerializerOptions, ct);
        var textPayload = responsePayload?.Content
            .FirstOrDefault(block => string.Equals(block.Type, "text", StringComparison.OrdinalIgnoreCase))
            ?.Text;

        if (string.IsNullOrWhiteSpace(textPayload))
        {
            return new BulkParseResponse { Tasks = [CreateFallbackResponse(text)] };
        }

        var rawTasks = TryParseBulkResponse(textPayload, text);
        var parsedTasks = new List<VoiceParseResponse>(rawTasks.Count);

        foreach (var parsedResponse in rawTasks)
        {
            ApplyLookupMatch(
                parsedResponse.AssigneeName,
                activeUsers,
                static (responseData, match) =>
                {
                    responseData.AssigneeId = match?.Id;
                    responseData.AssigneeConfidence = match is null
                        ? Math.Min(responseData.AssigneeConfidence ?? 0.3, 0.3)
                        : Math.Max(responseData.AssigneeConfidence ?? 0, match.Confidence);
                },
                parsedResponse);

            ApplyLookupMatch(
                parsedResponse.CategoryName,
                categories,
                static (responseData, match) =>
                {
                    responseData.CategoryId = match?.Id;
                    responseData.CategoryConfidence = match is null
                        ? Math.Min(responseData.CategoryConfidence ?? 0.3, 0.3)
                        : Math.Max(responseData.CategoryConfidence ?? 0, match.Confidence);
                },
                parsedResponse);

            parsedResponse.RawTranscription = text;
            parsedResponse.Status = parsedResponse.Status == 0 ? TaskItemStatus.Open : parsedResponse.Status;
            parsedResponse.Title = parsedResponse.Title?.Trim();
            if (parsedResponse.Title?.Length > 100)
            {
                parsedResponse.Title = parsedResponse.Title[..100];
            }

            parsedTasks.Add(parsedResponse);
        }

        return new BulkParseResponse { Tasks = parsedTasks };
    }

    private string BuildUserPrompt(
        string transcription,
        IReadOnlyList<LookupItem> users,
        IReadOnlyList<LookupItem> categories)
    {
        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        return
            $$"""
              Dnešní datum: {{today}}

              Existující uživatelé:
              {{JsonSerializer.Serialize(users, SerializerOptions)}}

              Existující kategorie:
              {{JsonSerializer.Serialize(categories, SerializerOptions)}}

              Přepis hlasového vstupu:
              "{{transcription}}"
              """;
    }

    private string BuildBulkUserPrompt(
        string text,
        IReadOnlyList<LookupItem> users,
        IReadOnlyList<LookupItem> categories)
    {
        var today = DateOnly.FromDateTime(timeProvider.GetUtcNow().UtcDateTime).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
        return
            $$"""
              Dnešní datum: {{today}}

              Existující uživatelé:
              {{JsonSerializer.Serialize(users, SerializerOptions)}}

              Existující kategorie:
              {{JsonSerializer.Serialize(categories, SerializerOptions)}}

              Text ke zpracování:
              "{{text}}"
              """;
    }

    private static VoiceParseResponse TryParseResponse(string textPayload, string transcription)
    {
        var normalizedPayload = ExtractJson(textPayload);

        try
        {
            var rawResponse = JsonSerializer.Deserialize<RawVoiceParseResponse>(normalizedPayload, SerializerOptions);
            if (rawResponse is null)
            {
                return CreateFallbackResponse(transcription);
            }

            return new VoiceParseResponse
            {
                Title = rawResponse.Title,
                Description = rawResponse.Description,
                AssigneeName = rawResponse.AssigneeName,
                AssigneeConfidence = rawResponse.AssigneeConfidence,
                CategoryName = rawResponse.CategoryName,
                CategoryConfidence = rawResponse.CategoryConfidence,
                Priority = ParsePriority(rawResponse.Priority),
                PriorityConfidence = rawResponse.PriorityConfidence,
                DueDate = rawResponse.DueDate,
                DueDateConfidence = rawResponse.DueDateConfidence,
                Status = ParseStatus(rawResponse.Status),
                RawTranscription = transcription
            };
        }
        catch (JsonException)
        {
            return CreateFallbackResponse(transcription);
        }
    }

    private static List<VoiceParseResponse> TryParseBulkResponse(string textPayload, string text)
    {
        var normalizedPayload = ExtractJson(textPayload);

        try
        {
            var rawList = JsonSerializer.Deserialize<List<RawVoiceParseResponse>>(normalizedPayload, SerializerOptions);
            if (rawList is { Count: > 0 })
            {
                return rawList.ConvertAll(raw => new VoiceParseResponse
                {
                    Title = raw.Title,
                    Description = raw.Description,
                    AssigneeName = raw.AssigneeName,
                    AssigneeConfidence = raw.AssigneeConfidence,
                    CategoryName = raw.CategoryName,
                    CategoryConfidence = raw.CategoryConfidence,
                    Priority = ParsePriority(raw.Priority),
                    PriorityConfidence = raw.PriorityConfidence,
                    DueDate = raw.DueDate,
                    DueDateConfidence = raw.DueDateConfidence,
                    Status = ParseStatus(raw.Status),
                    RawTranscription = text
                });
            }
        }
        catch (JsonException)
        {
            // Array parsing failed, try single object
        }

        var singleResult = TryParseResponse(normalizedPayload, text);
        if (singleResult.Title is not null)
        {
            return [singleResult];
        }

        return [];
    }

    private static void ApplyLookupMatch(
        string? name,
        IReadOnlyList<LookupItem> candidates,
        Action<VoiceParseResponse, LookupMatch?> apply,
        VoiceParseResponse response)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            apply(response, null);
            return;
        }

        var match = FindBestMatch(name, candidates);
        apply(response, match);
    }

    private static LookupMatch? FindBestMatch(string candidateName, IReadOnlyList<LookupItem> items)
    {
        var normalizedCandidate = Normalize(candidateName);
        LookupMatch? bestMatch = null;

        foreach (var item in items)
        {
            var normalizedItem = Normalize(item.Name);
            var similarity = CalculateSimilarity(normalizedCandidate, normalizedItem);
            if (bestMatch is null || similarity > bestMatch.Confidence)
            {
                bestMatch = new LookupMatch(item.Id, similarity);
            }
        }

        return bestMatch is { Confidence: >= 0.45 } ? bestMatch : null;
    }

    private static double CalculateSimilarity(string left, string right)
    {
        if (left == right)
        {
            return 1.0;
        }

        if (left.Contains(right, StringComparison.Ordinal) || right.Contains(left, StringComparison.Ordinal))
        {
            return 0.9;
        }

        var longestCommonPrefix = 0;
        for (var index = 0; index < Math.Min(left.Length, right.Length); index++)
        {
            if (left[index] != right[index])
            {
                break;
            }

            longestCommonPrefix++;
        }

        var prefixScore = left.Length == 0 || right.Length == 0
            ? 0
            : longestCommonPrefix / (double)Math.Max(left.Length, right.Length);

        var distance = LevenshteinDistance(left, right);
        var similarity = 1 - distance / (double)Math.Max(left.Length, right.Length);
        return Math.Max(similarity, prefixScore);
    }

    private static int LevenshteinDistance(string left, string right)
    {
        var matrix = new int[left.Length + 1, right.Length + 1];

        for (var i = 0; i <= left.Length; i++)
        {
            matrix[i, 0] = i;
        }

        for (var j = 0; j <= right.Length; j++)
        {
            matrix[0, j] = j;
        }

        for (var i = 1; i <= left.Length; i++)
        {
            for (var j = 1; j <= right.Length; j++)
            {
                var cost = left[i - 1] == right[j - 1] ? 0 : 1;
                matrix[i, j] = Math.Min(
                    Math.Min(matrix[i - 1, j] + 1, matrix[i, j - 1] + 1),
                    matrix[i - 1, j - 1] + cost);
            }
        }

        return matrix[left.Length, right.Length];
    }

    private static string Normalize(string value)
    {
        var normalized = value.Trim().ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var builder = new StringBuilder(normalized.Length);

        foreach (var ch in normalized)
        {
            var category = CharUnicodeInfo.GetUnicodeCategory(ch);
            if (category != UnicodeCategory.NonSpacingMark && char.IsLetterOrDigit(ch))
            {
                builder.Append(ch);
            }
        }

        return builder.ToString();
    }

    private static string ExtractJson(string textPayload)
    {
        var trimmedPayload = textPayload.Trim();
        if (trimmedPayload.StartsWith("```", StringComparison.Ordinal))
        {
            var firstJsonChar = trimmedPayload.IndexOfAny(['{', '[']);
            var lastBrace = trimmedPayload.LastIndexOf('}');
            var lastBracket = trimmedPayload.LastIndexOf(']');
            var lastJsonChar = Math.Max(lastBrace, lastBracket);
            if (firstJsonChar >= 0 && lastJsonChar > firstJsonChar)
            {
                return trimmedPayload[firstJsonChar..(lastJsonChar + 1)];
            }
        }

        return trimmedPayload;
    }

    private static VoiceParseResponse CreateFallbackResponse(string transcription)
    {
        return new VoiceParseResponse
        {
            Status = TaskItemStatus.Open,
            RawTranscription = transcription
        };
    }

    private string GetAnthropicApiKey()
    {
        return configuration["Anthropic:ApiKey"]
            ?? configuration["Anthropic__ApiKey"]
            ?? configuration["AnthropicKey"]
            ?? throw new InvalidOperationException("Anthropic API key is not configured.");
    }

    private static Priority? ParsePriority(string? value)
    {
        return Enum.TryParse<Priority>(value, true, out var priority)
            ? priority
            : null;
    }

    private static TaskItemStatus ParseStatus(string? value)
    {
        return Enum.TryParse<TaskItemStatus>(value, true, out var status)
            ? status
            : TaskItemStatus.Open;
    }

    private sealed record LookupItem(int Id, string Name);

    private sealed record LookupMatch(int Id, double Confidence);

    private sealed record AnthropicRequest(
        [property: JsonPropertyName("model")] string Model,
        [property: JsonPropertyName("max_tokens")] int MaxTokens,
        [property: JsonPropertyName("system")] string System,
        [property: JsonPropertyName("messages")] IReadOnlyList<AnthropicMessage> Messages);

    private sealed record AnthropicMessage(
        [property: JsonPropertyName("role")] string Role,
        [property: JsonPropertyName("content")] string Content);

    private sealed class AnthropicResponse
    {
        public List<AnthropicContentBlock> Content { get; set; } = [];
    }

    private sealed class AnthropicContentBlock
    {
        public string? Type { get; set; }
        public string? Text { get; set; }
    }

    private sealed class RawVoiceParseResponse
    {
        public string? Title { get; set; }
        public string? Description { get; set; }
        public string? AssigneeName { get; set; }
        public double? AssigneeConfidence { get; set; }
        public string? CategoryName { get; set; }
        public double? CategoryConfidence { get; set; }
        public string? Priority { get; set; }
        public double? PriorityConfidence { get; set; }
        public string? DueDate { get; set; }
        public double? DueDateConfidence { get; set; }
        public string? Status { get; set; }
    }

    // LoggerMessage source-generated delegates
    [LoggerMessage(Level = LogLevel.Debug, Message = "ParseTranscriptionAsync started. Transcription='{Transcription}'")]
    private partial void LogParseStarted(string transcription);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Loaded {UserCount} users, {CategoryCount} categories for context")]
    private partial void LogContextLoaded(int userCount, int categoryCount);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Using Anthropic model: {Model}")]
    private partial void LogUsingModel(string model);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Anthropic API key loaded (length={KeyLength})")]
    private partial void LogApiKeyLoaded(int keyLength);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Sending request to Anthropic API...")]
    private partial void LogSendingToAnthropic();

    [LoggerMessage(Level = LogLevel.Debug, Message = "Anthropic API response: Status={StatusCode}")]
    private partial void LogAnthropicResponse(int statusCode);

    [LoggerMessage(Level = LogLevel.Error, Message = "Anthropic API error: Status={StatusCode}, Body={ErrorBody}")]
    private partial void LogAnthropicError(int statusCode, string errorBody);

    [LoggerMessage(Level = LogLevel.Debug, Message = "Anthropic raw response text: '{ResponseText}'")]
    private partial void LogAnthropicRawResponse(string? responseText);

    [LoggerMessage(Level = LogLevel.Warning, Message = "Anthropic returned empty text payload, using fallback response")]
    private partial void LogEmptyAnthropicResponse();

    [LoggerMessage(Level = LogLevel.Debug, Message = "Parsed: Title='{Title}', Assignee='{Assignee}', Category='{Category}', Priority={Priority}")]
    private partial void LogParsedResult(string? title, string? assignee, string? category, string? priority);
}
